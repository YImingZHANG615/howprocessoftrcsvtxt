import pandas as pd
import re
import os

# 打印当前工作目录和文件列表，帮助调试
print(f"当前工作目录: {os.getcwd()}")
print("目录中的文件:")
for file in os.listdir('.'):
    print(f"- {file}")

# 读取Excel文件
file_path = '营造法式.xlsx'
try:
    # 获取所有工作表名称
    excel_file = pd.ExcelFile(file_path)
    sheet_names = excel_file.sheet_names
    
    # 处理每个工作表
    all_formatted_text = []
    
    for sheet_name in sheet_names:
        print(f"处理工作表: {sheet_name}")
        
        # 不使用标题行读取Excel文件
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        
        # 检查DataFrame是否有数据
        if df.empty:
            print(f"工作表 {sheet_name} 为空。")
            continue
        
        # 打印DataFrame的形状，帮助调试
        print(f"DataFrame形状: {df.shape}")
        
        # 处理第一列的每一行
        for row_idx in range(len(df)):
            cell = df.iloc[row_idx, 0]  # 获取第一列(列索引0)的数据
            
            if pd.isna(cell):
                continue
            
            cell_str = str(cell).strip()
            if not cell_str:
                continue
                
            # 打印前几行的内容，帮助调试
            if row_idx < 3:
                print(f"处理第{row_idx}行:")
                print(cell_str[:100] + "..." if len(cell_str) > 100 else cell_str)
            
            # 规范化所有空白（将换行符和多个空格替换为单个空格）
            cell_str = re.sub(r'\s+', ' ', cell_str)
            
            # 将分号和其他可能用作句子分隔符的标点符号替换为句号，以确保一致的句子断句
            cell_str = re.sub(r'[;；]', '。', cell_str)
            
            # 处理文本，只在句号处断句
            parts = []
            current = ""
            for char in cell_str:
                current += char
                if char in ['。', '.']:
                    parts.append(current.strip())
                    current = ""
            
            # 添加没有句号的剩余文本
            if current.strip():
                parts.append(current.strip())
            
            # 用换行符连接所有部分
            cell_text = '\n'.join(parts)
            
            if cell_text:
                all_formatted_text.append(cell_text)
    
    # 创建markdown内容，每个单元格的内容之间有一个空行
    md_content = '\n\n'.join(all_formatted_text)
    
    # 使用UTF-8-SIG编码（带BOM）写入markdown文件，这样Windows系统能够正确识别UTF-8编码
    with open('extracted_data.md', 'w', encoding='utf-8-sig') as md_file:
        md_file.write(md_content)
    
    # 检查生成的markdown文件的前几行，确保A1单元格的内容被正确包含
    try:
        with open('extracted_data.md', 'r', encoding='utf-8-sig') as md_file:
            first_lines = md_file.readlines()[:5]
            print("\n生成的markdown文件的前几行:")
            for line in first_lines:
                print(line.strip())
    except Exception as e:
        print(f"读取生成的markdown文件时发生错误: {str(e)}")
    
    print(f"成功创建 extracted_data.md，包含来自 {len(all_formatted_text)} 个单元格的内容。")
    
except Exception as e:
    print(f"发生错误: {str(e)}")
