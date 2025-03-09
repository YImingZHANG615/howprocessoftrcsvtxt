const fs = require('fs');
const path = require('path');
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require('@google/generative-ai');

// API密钥
const API_KEY = 'AIzaSyAeu6Pj4h-YN1AdfhxsvjpZCwrPQfoCsOw';

// 初始化Google Generative AI
const genAI = new GoogleGenerativeAI(API_KEY);
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

// 提取1.js中的问答对作为示例
function extractQAPairsFromJS(jsFilePath) {
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
    
    return pairs;
  } catch (error) {
    console.error('读取1.js文件时出错:', error);
    return [];
  }
}

// 使用Google Gemini API进行翻译
async function translateWithGemini(text, examplePairs) {
  try {
    // 构建提示，包含几个示例
    let prompt = '';
    
    // 添加最多3个示例
    for (let i = 0; i < Math.min(examplePairs.length, 3); i++) {
      prompt += `input 2: ${examplePairs[i].input}\n`;
      prompt += `output 2: ${examplePairs[i].output}\n`;
    }
    
    // 添加要翻译的文本
    prompt += `input 2: ${text}\noutput 2:`;
    
    // 调用API
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('API调用时出错:', error);
    return '翻译失败: ' + error.message;
  }
}

// 处理文件并生成输出
async function processFile(inputFilePath, outputFilePath, examplePairs) {
  try {
    // 读取输入文件
    const inputContent = fs.readFileSync(inputFilePath, 'utf8');
    const lines = inputContent.split('\n').filter(line => line.trim());
    
    let outputContent = '';
    console.log(`共找到 ${lines.length} 行需要处理`);
    
    // 对每一行进行翻译
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      console.log(`处理第 ${i+1}/${lines.length} 行: ${line.substring(0, 50)}...`);
      
      // 调用API进行翻译
      console.log(`正在调用API翻译...`);
      const translation = await translateWithGemini(line, examplePairs);
      
      // 移除文本中的换行符
      const cleanTranslation = translation.replace(/\\n/g, '').replace(/\n/g, ' ');
      
      // 添加到输出内容
      outputContent += `古文：${line}\n现代文：${cleanTranslation}\n\n`;
      
      // 每处理5行保存一次，防止数据丢失
      if (i % 5 === 0 || i === lines.length - 1) {
        fs.writeFileSync(outputFilePath, outputContent, 'utf8');
        console.log(`已保存到 ${outputFilePath} (${i+1}/${lines.length})`);
      }
      
      // 添加更长的延迟，避免API限流
      console.log('等待4秒后处理下一条...');
      await new Promise(resolve => setTimeout(resolve, 4000));
    }
    
    console.log(`处理完成，结果已保存到 ${outputFilePath}`);
  } catch (error) {
    console.error('处理文件时出错:', error);
  }
}

// 主函数
async function main() {
  const jsFilePath = path.join(__dirname, '1.js');
  const inputFilePath = path.join(__dirname, 'extracted_data.md');
  const outputFilePath = path.join(__dirname, 'translation_result.txt');
  
  console.log('开始提取问答对示例...');
  const examplePairs = extractQAPairsFromJS(jsFilePath);
  console.log(`共提取到 ${examplePairs.length} 个问答对示例`);
  
  if (examplePairs.length > 0) {
    console.log('开始处理文件...');
    await processFile(inputFilePath, outputFilePath, examplePairs);
  } else {
    console.error('未找到任何问答对示例，无法继续处理');
  }
}

// 运行主函数
main().catch(error => {
  console.error('程序运行出错:', error);
});
