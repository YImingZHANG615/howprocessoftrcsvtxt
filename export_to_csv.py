import pandas as pd
import os
import re

def export_excel_to_csv(excel_file_path):
    """
    将Excel文件中的每个工作表导出为单独的CSV文件
    
    Args:
        excel_file_path: Excel文件的路径
    """
    # 打印当前工作目录和文件列表，帮助调试
    print(f"当前工作目录: {os.getcwd()}")
    
    # 创建一个csv文件夹，如果不存在
    csv_folder = 'csv_files'
    if not os.path.exists(csv_folder):
        os.makedirs(csv_folder)
        print(f"创建文件夹: {csv_folder}")
    
    try:
        # 获取所有工作表名称
        excel_file = pd.ExcelFile(excel_file_path)
        sheet_names = excel_file.sheet_names
        
        print(f"Excel文件 '{excel_file_path}' 包含 {len(sheet_names)} 个工作表")
        
        # 处理每个工作表
        for sheet_name in sheet_names:
            print(f"处理工作表: {sheet_name}")
            
            # 不使用标题行读取Excel文件
            df = pd.read_excel(excel_file_path, sheet_name=sheet_name, header=None)
            
            # 检查DataFrame是否有数据
            if df.empty:
                print(f"工作表 {sheet_name} 为空，跳过。")
                continue
            
            # 打印DataFrame的形状
            print(f"DataFrame形状: {df.shape}")
            
            # 创建一个安全的文件名（移除无效的文件名字符）
            safe_sheet_name = re.sub(r'[\\/*?:"<>|]', '_', sheet_name)
            csv_file_path = os.path.join(csv_folder, f"{safe_sheet_name}.csv")
            
            # 将DataFrame导出为CSV文件，使用UTF-8-SIG编码
            df.to_csv(csv_file_path, index=False, header=False, encoding='utf-8-sig')
            print(f"已创建CSV文件: {csv_file_path}")
        
        print(f"所有工作表已成功导出为CSV文件，保存在 '{csv_folder}' 文件夹中。")
        
    except Exception as e:
        print(f"发生错误: {str(e)}")

if __name__ == "__main__":
    # Excel文件路径
    excel_file_path = '营造法式.xlsx'
    
    # 导出Excel文件中的每个工作表为CSV文件
    export_excel_to_csv(excel_file_path)
