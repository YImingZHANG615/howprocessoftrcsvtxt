import pandas as pd
import os

# 打印当前工作目录
print(f"当前工作目录: {os.getcwd()}")

# 列出目录中的文件
print("目录中的文件:")
for file in os.listdir('.'):
    print(f"- {file}")

# 读取Excel文件
file_path = '营造法式.xlsx'
try:
    # 获取所有工作表名称
    excel_file = pd.ExcelFile(file_path)
    sheet_names = excel_file.sheet_names
    print(f"\n工作表名称: {sheet_names}")
    
    # 处理第一个工作表
    sheet_name = sheet_names[0]
    print(f"\n处理工作表: {sheet_name}")
    
    # 不使用标题行读取Excel文件
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
    
    # 打印DataFrame的形状
    print(f"DataFrame形状: {df.shape}")
    
    # 打印列名
    print(f"列名: {df.columns.tolist()}")
    
    # 打印每个单元格的内容类型
    print("\n单元格内容类型:")
    for row_idx in range(min(5, len(df))):
        for col_idx in range(min(2, len(df.columns))):
            cell_value = df.iloc[row_idx, col_idx]
            cell_type = type(cell_value).__name__
            print(f"  行{row_idx}, 列{col_idx}: {cell_type}")
    
    # 尝试直接读取A1单元格
    print("\n尝试直接读取A1单元格:")
    a1_value = df.iloc[0, 0]
    print(f"A1单元格值类型: {type(a1_value).__name__}")
    print(f"A1单元格值: {str(a1_value)[:200]}..." if len(str(a1_value)) > 200 else str(a1_value))
    
    # 尝试读取B1单元格
    print("\n尝试直接读取B1单元格:")
    b1_value = df.iloc[0, 1]
    print(f"B1单元格值类型: {type(b1_value).__name__}")
    print(f"B1单元格值: {str(b1_value)[:200]}..." if len(str(b1_value)) > 200 else str(b1_value))
    
    # 尝试读取A2单元格
    print("\n尝试直接读取A2单元格:")
    a2_value = df.iloc[1, 0]
    print(f"A2单元格值类型: {type(a2_value).__name__}")
    print(f"A2单元格值: {str(a2_value)[:200]}..." if len(str(a2_value)) > 200 else str(a2_value))
    
except Exception as e:
    print(f"发生错误: {str(e)}")
