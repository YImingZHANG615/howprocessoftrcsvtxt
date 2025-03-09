import os
import re
import json

def main():
    """将CSV文件转换为1.js文件"""
    # 设置文件路径
    csv_path = os.path.join(os.path.dirname(__file__), 'csv_files', '卷1.csv')
    output_path = os.path.join(os.path.dirname(__file__), '输出txt', '1.js')
    log_path = os.path.join(os.path.dirname(__file__), 'conversion_log.txt')
    
    # 记录开始处理
    with open(log_path, 'w', encoding='utf-8') as log_file:
        log_file.write(f"开始处理CSV文件: {csv_path}\n")
    
    try:
        # 读取CSV文件
        with open(csv_path, 'r', encoding='utf-8') as f:
            csv_content = f.read()
        
        append_log(log_path, f"成功读取CSV文件，大小: {len(csv_content)} 字节")
        
        # 解析CSV内容
        append_log(log_path, "开始解析CSV内容...")
        segments = csv_content.split('","')
        append_log(log_path, f"文件被分割成 {len(segments)} 个段落")
        
        pairs = []
        for i in range(0, len(segments) - 1, 2):
            # 清理input (去掉开头的引号)
            input_text = segments[i].replace('"', '', 1) if i == 0 else segments[i]
            input_text = input_text.strip()
            
            # 清理output
            output_text = segments[i + 1].strip()
            if i + 2 >= len(segments):
                # 最后一个段落可能含有结束引号
                output_text = output_text.rstrip('"')
            
            # 如果两者都非空，添加到pairs
            if input_text and output_text:
                pairs.append({"input": input_text, "output": output_text})
        
        append_log(log_path, f"成功提取 {len(pairs)} 对数据")
        
        # 生成1.js文件内容
        js_content = generate_js_content(pairs)
        
        # 写入到输出文件
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(js_content)
        
        append_log(log_path, f"成功写入JS文件: {output_path}")
        
        # 写入成功标记
        with open(os.path.join(os.path.dirname(__file__), 'success.txt'), 'w', encoding='utf-8') as f:
            f.write(f"转换成功! 从CSV提取了 {len(pairs)} 对数据，并保存到: {output_path}")
        
        return True
    except Exception as e:
        # 记录错误
        error_msg = f"错误: {str(e)}"
        append_log(log_path, error_msg)
        
        with open(os.path.join(os.path.dirname(__file__), 'error.txt'), 'w', encoding='utf-8') as f:
            f.write(error_msg)
        
        return False

def append_log(log_path, message):
    """向日志文件追加消息"""
    with open(log_path, 'a', encoding='utf-8') as log_file:
        log_file.write(f"{message}\n")

def process_text_for_js(text):
    """处理文本以适合JavaScript字符串"""
    if not text:
        return ''
    return text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')

def generate_js_content(pairs):
    """根据数据生成1.js文件内容"""
    content = """const {
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
"""
    
    # 添加所有input-output对
    for i, pair in enumerate(pairs):
        input_text = process_text_for_js(pair["input"])
        output_text = process_text_for_js(pair["output"])
        
        content += f'    {{text: "input 2: {input_text}"}},\n'
        content += f'    {{text: "output 2: {output_text}"}}'
        
        # 如果不是最后一对，添加逗号
        if i < len(pairs) - 1:
            content += ',\n'
        else:
            content += '\n'
    
    content += """  ];

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig,
  });

  const response = result.response;
  console.log(response.text());
}

run().catch(console.error);
"""
    
    return content

# 执行主函数
if __name__ == "__main__":
    main()
