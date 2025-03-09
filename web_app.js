const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const xlsx = require('xlsx');
const { parse } = require('csv-parse/sync');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// 确保上传目录存在
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 路由首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web_index.html'));
});

// 处理XLSX到CSV的转换
app.post('/convert-xlsx', upload.single('xlsxFile'), (req, res) => {
  try {
    const filePath = req.file.path;
    const outputDir = path.join(__dirname, 'uploads');
    
    // 读取XLSX文件
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为CSV
    const csvData = xlsx.utils.sheet_to_csv(worksheet);
    
    // 获取文件名（不带扩展名）
    const fileName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const outputPath = path.join(outputDir, `${fileName}.csv`);
    
    // 写入CSV文件
    fs.writeFileSync(outputPath, csvData, 'utf8');
    
    res.json({ 
      success: true, 
      message: `转换成功！保存至 ${fileName}.csv`, 
      filePath: `uploads/${fileName}.csv` 
    });
  } catch (error) {
    console.error('转换XLSX到CSV出错:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 将CSV转换为1.js
app.post('/convert-csv-to-js', upload.single('csvFile'), (req, res) => {
  try {
    const csvFilePath = req.file.path;
    const outputDir = path.join(__dirname, 'uploads');
    
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
    
    // 写入1.js文件
    const outputPath = path.join(outputDir, '1.js');
    fs.writeFileSync(outputPath, jsContent, 'utf8');
    
    // 生成日志文件
    const logPath = path.join(outputDir, 'conversion_log.txt');
    fs.writeFileSync(logPath, `转换成功! 从CSV提取了 ${pairs.length} 对数据，并保存到: ${outputPath}\n`, 'utf8');
    
    res.json({ 
      success: true, 
      message: `成功转换！从CSV提取了 ${pairs.length} 对数据`, 
      filePath: 'uploads/1.js' 
    });
  } catch (error) {
    console.error('转换CSV到JS出错:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 从1.js提取示例对
app.post('/extract-examples', upload.single('jsFile'), (req, res) => {
  try {
    const jsFilePath = req.file.path;
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
    
    res.json({ success: true, pairs, count: pairs.length });
  } catch (error) {
    console.error('读取JS文件时出错:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 使用Gemini API翻译文本
app.post('/translate', async (req, res) => {
  try {
    const { inputText, apiKey, examplePairs } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '请提供API密钥' });
    }
    
    if (!inputText) {
      return res.status(400).json({ success: false, error: '请提供要翻译的文本' });
    }
    
    // 解析示例对
    let examples = [];
    try {
      examples = JSON.parse(examplePairs);
    } catch (e) {
      return res.status(400).json({ success: false, error: '示例格式错误' });
    }
    
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
    for (let i = 0; i < Math.min(examples.length, 3); i++) {
      prompt += `input 2: ${examples[i].input}\n`;
      prompt += `output 2: ${examples[i].output}\n`;
    }
    
    // 添加要翻译的文本
    prompt += `input 2: ${inputText}\noutput 2:`;
    
    // 调用API
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const response = result.response;
    res.json({ success: true, translation: response.text() });
  } catch (error) {
    console.error('API调用时出错:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量处理文件
app.post('/process-batch', upload.fields([
  { name: 'jsFile', maxCount: 1 },
  { name: 'textFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { apiKey } = req.body;
    const jsFilePath = req.files.jsFile[0].path;
    const textFilePath = req.files.textFile[0].path;
    const outputPath = path.join(__dirname, 'uploads', 'translation_result.txt');
    
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '请提供API密钥' });
    }
    
    // 从JS文件提取示例对
    const jsContent = fs.readFileSync(jsFilePath, 'utf8');
    const pairs = [];
    const regex = /\{text: "input 2: ([\s\S]*?)"\},\s*\{text: "output 2: ([\s\S]*?)"\}/g;
    let match;
    
    while ((match = regex.exec(jsContent)) !== null) {
      const input = match[1].trim();
      const output = match[2].trim();
      pairs.push({ input, output });
    }
    
    if (pairs.length === 0) {
      return res.status(400).json({ success: false, error: '未找到示例对' });
    }
    
    // 读取输入文件
    const inputContent = fs.readFileSync(textFilePath, 'utf8');
    const lines = inputContent.split('\n').filter(line => line.trim());
    
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
    
    // 只翻译前三行进行测试，避免长时间等待
    const testLines = lines.slice(0, 3);
    let outputContent = '';
    
    // 对每一行进行翻译
    for (let i = 0; i < testLines.length; i++) {
      const line = testLines[i].trim();
      if (!line) continue;
      
      // 构建提示，包含示例
      let prompt = '';
      
      // 添加最多3个示例
      for (let j = 0; j < Math.min(pairs.length, 3); j++) {
        prompt += `input 2: ${pairs[j].input}\n`;
        prompt += `output 2: ${pairs[j].output}\n`;
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
    }
    
    // 写入文件
    fs.writeFileSync(outputPath, outputContent, 'utf8');
    
    res.json({ 
      success: true, 
      message: `已处理前${testLines.length}行文本（用于演示）`, 
      filePath: 'uploads/translation_result.txt' 
    });
  } catch (error) {
    console.error('处理文件时出错:', error);
    res.status(500).json({ success: false, error: error.message });
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

// 启动服务器
app.listen(port, () => {
  console.log(`服务器已启动，访问 http://localhost:${port}`);
});
