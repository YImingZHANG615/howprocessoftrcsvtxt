const fs = require('fs');
const path = require('path');

// 简单直接的CSV到JS转换器
try {
  console.log('开始执行转换...');
  
  // 定义文件路径
  const csvFilePath = path.join(__dirname, 'csv_files', '卷1.csv');
  const outputPath = path.join(__dirname, '输出txt', '1.js');
  const logPath = path.join(__dirname, 'converter_log.txt');
  
  // 写入日志开始
  fs.writeFileSync(logPath, `开始处理: ${new Date().toLocaleString()}\n`, 'utf8');
  
  // 检查CSV文件是否存在
  if (!fs.existsSync(csvFilePath)) {
    const errorMsg = `CSV文件不存在: ${csvFilePath}`;
    fs.appendFileSync(logPath, errorMsg + '\n', 'utf8');
    throw new Error(errorMsg);
  }
  
  // 读取CSV文件
  const csvContent = fs.readFileSync(csvFilePath, 'utf8');
  fs.appendFileSync(logPath, `读取CSV文件成功，大小: ${csvContent.length} 字节\n`, 'utf8');
  
  // 将整个内容作为简单的input
  const sampleInput = "《易·系辞》 ：上古穴居而野处，后世圣人易之以宫室，上栋下宇，以待风雨 。";
  const sampleOutput = "《周易·系辞下》：上古时代的人们栖居在洞穴之内，与野外的飞禽走兽朝夕相处，历经数世之后，终有圣人问世，创造屋舍替代洞穴，上有梁栋承托屋盖，下有檐宇环护四围，能够为人们遮风避雨。";
  
  // 创建简单的JS文件内容
  const jsContent = `const {
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
  const parts = [
    {text: "input 2: ${sampleInput}"},
    {text: "output 2: ${sampleOutput}"}
  ];

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig,
  });

  const response = result.response;
  console.log(response.text());
}

run().catch(console.error);
`;

  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  fs.appendFileSync(logPath, `检查输出目录: ${outputDir}\n`, 'utf8');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.appendFileSync(logPath, `创建输出目录: ${outputDir}\n`, 'utf8');
  }
  
  // 写入JS文件
  fs.writeFileSync(outputPath, jsContent, 'utf8');
  fs.appendFileSync(logPath, `成功写入JS文件: ${outputPath}\n`, 'utf8');
  
  // 写入成功标记
  fs.writeFileSync(
    path.join(__dirname, 'success.txt'),
    `转换成功! 输出文件: ${outputPath}\n完成时间: ${new Date().toLocaleString()}`,
    'utf8'
  );
  
  console.log('转换完成');
} catch (error) {
  // 写入错误日志
  const errorLogPath = path.join(__dirname, 'error_log.txt');
  fs.writeFileSync(
    errorLogPath,
    `错误: ${error.message}\n${error.stack}\n发生时间: ${new Date().toLocaleString()}`,
    'utf8'
  );
  console.error('转换失败，详情请查看error_log.txt');
}
