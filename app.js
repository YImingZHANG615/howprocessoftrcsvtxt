const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const { parse } = require('csv-parse/sync');

// 保持对window对象的全局引用，避免JavaScript对象被垃圾回收时，window被关闭
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // 加载应用的index.html
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 打开开发者工具
  // mainWindow.webContents.openDevTools();

  // 当window被关闭时，触发下面的事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.on('ready', createWindow);

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 处理xlsx文件
ipcMain.handle('convert-xlsx-to-csv', async (event, filePath, outputDir) => {
  try {
    // 读取XLSX文件
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为CSV
    const csvData = xlsx.utils.sheet_to_csv(worksheet);
    
    // 获取文件名（不带扩展名）
    const fileName = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(outputDir, `${fileName}.csv`);
    
    // 写入CSV文件
    fs.writeFileSync(outputPath, csvData, 'utf8');
    
    return { success: true, outputPath };
  } catch (error) {
    console.error('转换XLSX到CSV出错:', error);
    return { success: false, error: error.message };
  }
});

// 将CSV转换为1.js
ipcMain.handle('convert-csv-to-js', async (event, csvFilePath, outputDir) => {
  try {
    // 读取CSV文件内容
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    // 解析CSV
    const records = parse(csvContent, {
      columns: false,
      skip_empty_lines: true
    });
    
    // 提取输入-输出对
    const pairs = [];
    for (const record of records) {
      if (record.length >= 2) {
        const input = record[0].replace(/^"|"$/g, '');
        const output = record[1].replace(/^"|"$/g, '');
        pairs.push({ input, output });
      }
    }
    
    // 生成JS文件内容
    const jsContent = generateJsContent(pairs);
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 写入1.js文件
    const outputPath = path.join(outputDir, '1.js');
    fs.writeFileSync(outputPath, jsContent, 'utf8');
    
    // 生成日志文件
    const logPath = path.join(outputDir, 'conversion_log.txt');
    fs.writeFileSync(logPath, `转换成功! 从CSV提取了 ${pairs.length} 对数据，并保存到: ${outputPath}\n`, 'utf8');
    
    return { success: true, pairsCount: pairs.length, outputPath };
  } catch (error) {
    console.error('转换CSV到JS出错:', error);
    return { success: false, error: error.message };
  }
});

function generateJsContent(pairs) {
  const jsHeader = `const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

const generationConfig = {
  temperature: 0.3,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function run() {
  const parts = [\n`;

  let pairsContent = '';
  for (let i = 0; i < pairs.length; i++) {
    pairsContent += `    {text: "input 2: ${pairs[i].input}"},\n`;
    pairsContent += `    {text: "output 2: ${pairs[i].output}"},\n`;
  }

  const jsFooter = `  ];

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig,
  });

  const response = result.response;
  console.log(response.text());
}

run().catch(console.error);`;

  return jsHeader + pairsContent + jsFooter;
}

// 使用Google Gemini API进行翻译
ipcMain.handle('translate-with-gemini', async (event, inputText, apiKey, examplePairs) => {
  try {
    // 初始化Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const generationConfig = {
      temperature: 0.3,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };
    
    // 构建提示，包含示例
    let prompt = '';
    
    // 添加最多3个示例
    for (let i = 0; i < Math.min(examplePairs.length, 3); i++) {
      prompt += `input 2: ${examplePairs[i].input}\n`;
      prompt += `output 2: ${examplePairs[i].output}\n`;
    }
    
    // 添加要翻译的文本
    prompt += `input 2: ${inputText}\noutput 2:`;
    
    // 调用API
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const response = result.response;
    return { success: true, translation: response.text() };
  } catch (error) {
    console.error('API调用时出错:', error);
    return { success: false, error: error.message };
  }
});

// 从1.js提取示例对
ipcMain.handle('extract-examples-from-js', async (event, jsFilePath) => {
  try {
    const jsContent = fs.readFileSync(jsFilePath, 'utf8');
    const pairs = [];
    
    // 使用正则表达式匹配input和output对
    const regex = /\{text: "input 2: ([\s\S]*?)"\},\s*\{text: "output 2: ([\s\S]*?)"\}/g;
    let match;
    
    while ((match = regex.exec(jsContent)) !== null) {
      const input = match[1].trim();
      const output = match[2].trim();
      pairs.push({ input, output });
    }
    
    return { success: true, pairs };
  } catch (error) {
    console.error('读取JS文件时出错:', error);
    return { success: false, error: error.message };
  }
});

// 批量处理文件
ipcMain.handle('process-text-file', async (event, inputFilePath, outputFilePath, examplePairs, apiKey) => {
  try {
    // 读取输入文件
    const inputContent = fs.readFileSync(inputFilePath, 'utf8');
    const lines = inputContent.split('\n').filter(line => line.trim());
    
    let outputContent = '';
    let processedCount = 0;
    
    // 初始化Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const generationConfig = {
      temperature: 0.3,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };
    
    // 对每一行进行翻译
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // 构建提示，包含示例
      let prompt = '';
      
      // 添加最多3个示例
      for (let j = 0; j < Math.min(examplePairs.length, 3); j++) {
        prompt += `input 2: ${examplePairs[j].input}\n`;
        prompt += `output 2: ${examplePairs[j].output}\n`;
      }
      
      // 添加要翻译的文本
      prompt += `input 2: ${line}\noutput 2:`;
      
      // 调用API
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });
      
      const response = result.response;
      const translation = response.text();
      
      // 移除文本中的换行符
      const cleanTranslation = translation.replace(/\\n/g, '').replace(/\n/g, ' ');
      
      // 添加到输出内容
      outputContent += `古文：${line}\n现代文：${cleanTranslation}\n\n`;
      
      // 每处理5行保存一次，防止数据丢失
      if (i % 5 === 0 || i === lines.length - 1) {
        fs.writeFileSync(outputFilePath, outputContent, 'utf8');
        mainWindow.webContents.send('process-update', { 
          current: i + 1, 
          total: lines.length,
          outputPath: outputFilePath 
        });
      }
      
      processedCount++;
      
      // 添加延迟，避免API限流
      await new Promise(resolve => setTimeout(resolve, 4000));
    }
    
    return { success: true, processedCount, outputPath: outputFilePath };
  } catch (error) {
    console.error('处理文件时出错:', error);
    return { success: false, error: error.message };
  }
});

// 选择文件
ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options.filters || []
  });
  
  if (result.canceled) {
    return { canceled: true };
  } else {
    return { canceled: false, filePath: result.filePaths[0] };
  }
});

// 选择目录
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (result.canceled) {
    return { canceled: true };
  } else {
    return { canceled: false, directoryPath: result.filePaths[0] };
  }
});
