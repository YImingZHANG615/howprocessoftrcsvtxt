console.log('开始导入模块...');

try {
  const express = require('express');
  console.log('Express模块加载成功');
  
  const path = require('path');
  console.log('Path模块加载成功');
  
  const fs = require('fs');
  console.log('FS模块加载成功');
  
  const multer = require('multer');
  console.log('Multer模块加载成功');
  
  const bodyParser = require('body-parser');
  console.log('Body-parser模块加载成功');
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    console.log('GoogleGenerativeAI模块加载成功');
  } catch (e) {
    console.error('GoogleGenerativeAI模块加载失败:', e);
  }
  
  try {
    const xlsx = require('xlsx');
    console.log('XLSX模块加载成功');
  } catch (e) {
    console.error('XLSX模块加载失败:', e);
  }
  
  try {
    const { parse } = require('csv-parse/sync');
    console.log('CSV-parse模块加载成功');
  } catch (e) {
    console.error('CSV-parse模块加载失败:', e);
  }

  console.log('开始初始化应用...');

  const app = express();
  const port = 3000;

  process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
  });

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        console.log(`创建上传目录: ${uploadDir}`);
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
  });
  const upload = multer({ storage: storage });

  console.log('已配置文件上传...');

  const publicDir = path.join(__dirname, 'public');
  console.log(`静态文件目录: ${publicDir}, 目录是否存在: ${fs.existsSync(publicDir)}`);
  if (fs.existsSync(publicDir)) {
    try {
      const files = fs.readdirSync(publicDir);
      console.log(`公共目录中的文件: ${files.join(', ')}`);
    } catch (e) {
      console.error('无法读取公共目录:', e);
    }
  }
  
  app.use(express.static(publicDir));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  console.log('已配置中间件...');

  if (!fs.existsSync(path.join(__dirname, '输出txt'))) {
    console.log(`创建输出目录: ${path.join(__dirname, '输出txt')}`);
    fs.mkdirSync(path.join(__dirname, '输出txt'), { recursive: true });
  }

  app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log(`发送主页: ${indexPath}, 文件是否存在: ${fs.existsSync(indexPath)}`);
    res.sendFile(indexPath);
  });

  // 1. XLSX转CSV
  app.post('/api/xlsx-to-csv', upload.single('xlsxFile'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '请上传XLSX文件' });
      }

      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const csvData = xlsx.utils.sheet_to_csv(worksheet);
      
      const fileName = path.basename(req.file.originalname, path.extname(req.file.originalname));
      const csvFilePath = path.join(__dirname, 'csv_files', `${fileName}.csv`);
      
      const csvDir = path.dirname(csvFilePath);
      if (!fs.existsSync(csvDir)) {
        console.log(`创建CSV目录: ${csvDir}`);
        fs.mkdirSync(csvDir, { recursive: true });
      }
      
      fs.writeFileSync(csvFilePath, csvData, 'utf8');
      
      console.log(`已将XLSX文件转换为CSV，保存在 ${csvFilePath}`);
      res.json({
        success: true,
        message: `已将XLSX文件转换为CSV，保存在 ${csvFilePath}`,
        csvPath: csvFilePath
      });
    } catch (error) {
      console.error('XLSX转CSV出错:', error);
      res.status(500).json({ success: false, message: `错误: ${error.message}` });
    }
  });

  // 2. CSV转JS
  app.post('/api/csv-to-js', upload.single('csvFile'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '请上传CSV文件' });
      }

      const csvContent = fs.readFileSync(req.file.path, 'utf8');
      
      const records = parse(csvContent, {
        columns: false,
        skip_empty_lines: true
      });
      
      const pairs = [];
      for (const record of records) {
        if (record.length >= 2) {
          const input = record[0].replace(/^"|"$/g, '');
          const output = record[1].replace(/^"|"$/g, '');
          pairs.push({ input, output });
        }
      }
      
      const jsContent = generateJsContent(pairs);
      
      const outputDir = path.join(__dirname, '输出txt');
      if (!fs.existsSync(outputDir)) {
        console.log(`创建输出目录: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const jsFilePath = path.join(outputDir, '1.js');
      fs.writeFileSync(jsFilePath, jsContent, 'utf8');
      
      const logPath = path.join(__dirname, 'conversion_log.txt');
      fs.writeFileSync(logPath, `转换成功! 从CSV提取了 ${pairs.length} 对数据，并保存到: ${jsFilePath}\n`, 'utf8');
      
      console.log(`CSV文件已转换为JS，共 ${pairs.length} 对数据，保存在 ${jsFilePath}`);
      res.json({
        success: true,
        message: `CSV文件已转换为JS，共 ${pairs.length} 对数据，保存在 ${jsFilePath}`,
        jsPath: jsFilePath
      });
    } catch (error) {
      console.error('CSV转JS出错:', error);
      res.status(500).json({ success: false, message: `错误: ${error.message}` });
    }
  });

  // 3. 使用Gemini翻译
  app.post('/api/translate', async (req, res) => {
    try {
      const { text, apiKey } = req.body;
      
      if (!text) {
        return res.status(400).json({ success: false, message: '请提供需要翻译的文本' });
      }
      
      if (!apiKey) {
        return res.status(400).json({ success: false, message: '请提供API密钥' });
      }
      
      const jsFilePath = path.join(__dirname, '输出txt', '1.js');
      if (!fs.existsSync(jsFilePath)) {
        return res.status(400).json({ success: false, message: '找不到1.js文件，请先完成CSV到JS的转换' });
      }
      
      const examplePairs = extractQAPairsFromJS(jsFilePath);
      
      if (examplePairs.length === 0) {
        return res.status(400).json({ success: false, message: '从1.js文件中没有找到任何示例对' });
      }
      
      const translation = await translateWithGemini(text, examplePairs, apiKey);
      
      console.log(`已翻译文本: ${text}, 结果: ${translation}`);
      res.json({
        success: true,
        original: text,
        translation: translation
      });
    } catch (error) {
      console.error('翻译出错:', error);
      res.status(500).json({ success: false, message: `错误: ${error.message}` });
    }
  });

  // 4. 批量处理文件
  app.post('/api/batch-process', upload.single('textFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '请上传文本文件' });
      }
      
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ success: false, message: '请提供API密钥' });
      }
      
      const jsFilePath = path.join(__dirname, '输出txt', '1.js');
      if (!fs.existsSync(jsFilePath)) {
        return res.status(400).json({ success: false, message: '找不到1.js文件，请先完成CSV到JS的转换' });
      }
      
      const examplePairs = extractQAPairsFromJS(jsFilePath);
      
      if (examplePairs.length === 0) {
        return res.status(400).json({ success: false, message: '从1.js文件中没有找到任何示例对' });
      }
      
      const inputContent = fs.readFileSync(req.file.path, 'utf8');
      const lines = inputContent.split('\n').filter(line => line.trim());
      
      const linesToProcess = lines.slice(0, 3);
      
      let result = '';
      for (let i = 0; i < linesToProcess.length; i++) {
        const line = linesToProcess[i].trim();
        if (line) {
          const translation = await translateWithGemini(line, examplePairs, apiKey);
          
          result += `古文：${line}\n现代文：${translation}\n\n`;
          
          if (i < linesToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 4000));
          }
        }
      }
      
      const outputFilePath = path.join(__dirname, '输出txt', 'translation_result.txt');
      fs.writeFileSync(outputFilePath, result, 'utf8');
      
      console.log(`已处理${linesToProcess.length}/${lines.length}行文本，结果保存在 ${outputFilePath}`);
      res.json({
        success: true,
        message: `已处理${linesToProcess.length}/${lines.length}行文本，结果保存在 ${outputFilePath}`,
        sample: result,
        outputPath: outputFilePath
      });
    } catch (error) {
      console.error('批量处理出错:', error);
      res.status(500).json({ success: false, message: `错误: ${error.message}` });
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

function extractQAPairsFromJS(jsFilePath) {
  try {
    const jsContent = fs.readFileSync(jsFilePath, 'utf8');
    const pairs = [];
    
    const regex = /\{text: "input 2: ([\s\S]*?)"\},\s*\{text: "output 2: ([\s\S]*?)"\}/g;
    let match;
    
    while ((match = regex.exec(jsContent)) !== null) {
      const input = match[1].trim();
      const output = match[2].trim();
      pairs.push({ input, output });
    }
    
    return pairs;
  } catch (error) {
    console.error('提取问答对出错:', error);
    return [];
  }
}

async function translateWithGemini(text, examplePairs, apiKey) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const generationConfig = {
      temperature: 0.3,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };
    
    let prompt = '';
    
    for (let i = 0; i < Math.min(examplePairs.length, 3); i++) {
      prompt += `input 2: ${examplePairs[i].input}\n`;
      prompt += `output 2: ${examplePairs[i].output}\n`;
    }
    
    prompt += `input 2: ${text}\noutput 2:`;
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('API调用时出错:', error);
    return `翻译失败: ${error.message}`;
  }
}

try {
  app.listen(port, () => {
    console.log(`服务器已启动，访问 http://localhost:${port}`);
  });
} catch (error) {
  console.error('服务器启动失败:', error);
}
  
} catch (mainError) {
  console.error('主程序初始化失败:', mainError);
}
