# 营造法式数据处理工具

这个项目包含一系列Python脚本，用于处理《营造法式》相关的Excel数据文件。

## 功能

- `process_excel.py`: 从Excel文件中提取第一列数据，并按照特定格式生成markdown文件
- `export_to_csv.py`: 将Excel文件中的每个工作表导出为单独的CSV文件
- `check_excel.py`: 检查Excel文件的结构和内容

## 使用方法

### 提取数据到Markdown

```bash
python process_excel.py
```

这将从`营造法式.xlsx`文件中提取第一列的数据，并生成`extracted_data.md`文件。每个句子（以句号结尾）将单独占一行，不同单元格的内容之间有一个空行。

### 导出工作表到CSV

```bash
python export_to_csv.py
```

这将把`营造法式.xlsx`文件中的每个工作表导出为单独的CSV文件，保存在`csv_files`文件夹中。

## 依赖

- Python 3.6+
- pandas
- openpyxl

## 安装依赖

```bash
pip install pandas openpyxl
```
