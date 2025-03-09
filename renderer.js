// 导入electron模块
const { ipcRenderer } = require('electron');

// 导航按钮
const navButtons = {
    xlsx: document.getElementById('nav-xlsx'),
    csv: document.getElementById('nav-csv'),
    gemini: document.getElementById('nav-gemini'),
    batch: document.getElementById('nav-batch'),
    settings: document.getElementById('nav-settings')
};

// 面板
const panels = {
    xlsx: document.getElementById('panel-xlsx'),
    csv: document.getElementById('panel-csv'),
    gemini: document.getElementById('panel-gemini'),
    batch: document.getElementById('panel-batch'),
    settings: document.getElementById('panel-settings')
};

// XLSX相关元素
const xlsxFilePath = document.getElementById('xlsx-file-path');
const xlsxOutputDir = document.getElementById('xlsx-output-dir');
const selectXlsxFile = document.getElementById('select-xlsx-file');
const selectXlsxOutputDir = document.getElementById('select-xlsx-output-dir');
const convertXlsx = document.getElementById('convert-xlsx');

// CSV相关元素
const csvFilePath = document.getElementById('csv-file-path');
const csvOutputDir = document.getElementById('csv-output-dir');
const selectCsvFile = document.getElementById('select-csv-file');
const selectCsvOutputDir = document.getElementById('select-csv-output-dir');
const convertCsv = document.getElementById('convert-csv');

// Gemini翻译相关元素
const jsExampleFilePath = document.getElementById('js-example-file-path');
const selectJsExampleFile = document.getElementById('select-js-example-file');
const translationInput = document.getElementById('translation-input');
const translateText = document.getElementById('translate-text');
const translationOutput = document.getElementById('translation-output');

// 批量处理相关元素
const jsExampleFilePathBatch = document.getElementById('js-example-file-path-batch');
const selectJsExampleFileBatch = document.getElementById('select-js-example-file-batch');
const inputTextFilePath = document.getElementById('input-text-file-path');
const selectInputTextFile = document.getElementById('select-input-text-file');
const outputTextFilePath = document.getElementById('output-text-file-path');
const selectOutputTextFile = document.getElementById('select-output-text-file');
const processBatch = document.getElementById('process-batch');

// 设置相关元素
const apiKey = document.getElementById('api-key');
const delayTime = document.getElementById('delay-time');
const saveSettings = document.getElementById('save-settings');

// 状态信息元素
const statusArea = document.getElementById('status-area');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');

// 存储示例对
let examplePairs = [];

// 导航切换
Object.keys(navButtons).forEach(key => {
    navButtons[key].addEventListener('click', () => {
        // 移除所有激活状态
        Object.values(navButtons).forEach(btn => btn.classList.remove('active'));
        Object.values(panels).forEach(panel => panel.classList.remove('active'));
        
        // 激活选中项
        navButtons[key].classList.add('active');
        panels[key].classList.add('active');
    });
});

// 选择XLSX文件
selectXlsxFile.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-file', {
        filters: [
            { name: 'Excel文件', extensions: ['xlsx', 'xls'] }
        ]
    });
    
    if (!result.canceled) {
        xlsxFilePath.value = result.filePath;
        updateXlsxConvertButton();
    }
});

// 选择XLSX输出目录
selectXlsxOutputDir.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-directory');
    
    if (!result.canceled) {
        xlsxOutputDir.value = result.directoryPath;
        updateXlsxConvertButton();
    }
});

// 更新XLSX转换按钮状态
function updateXlsxConvertButton() {
    convertXlsx.disabled = !xlsxFilePath.value || !xlsxOutputDir.value;
}

// 转换XLSX到CSV
convertXlsx.addEventListener('click', async () => {
    try {
        setStatus('正在转换XLSX到CSV...');
        showProgress(true, 0);
        
        const result = await ipcRenderer.invoke(
            'convert-xlsx-to-csv', 
            xlsxFilePath.value, 
            xlsxOutputDir.value
        );
        
        showProgress(true, 100);
        
        if (result.success) {
            setStatus(`转换成功！文件已保存到: ${result.outputPath}`);
        } else {
            setStatus(`转换失败: ${result.error}`);
        }
    } catch (error) {
        setStatus(`发生错误: ${error.message}`);
    } finally {
        setTimeout(() => showProgress(false), 2000);
    }
});

// 选择CSV文件
selectCsvFile.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-file', {
        filters: [
            { name: 'CSV文件', extensions: ['csv'] }
        ]
    });
    
    if (!result.canceled) {
        csvFilePath.value = result.filePath;
        updateCsvConvertButton();
    }
});

// 选择CSV输出目录
selectCsvOutputDir.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-directory');
    
    if (!result.canceled) {
        csvOutputDir.value = result.directoryPath;
        updateCsvConvertButton();
    }
});

// 更新CSV转换按钮状态
function updateCsvConvertButton() {
    convertCsv.disabled = !csvFilePath.value || !csvOutputDir.value;
}

// 转换CSV到JS
convertCsv.addEventListener('click', async () => {
    try {
        setStatus('正在转换CSV到JS...');
        showProgress(true, 0);
        
        const result = await ipcRenderer.invoke(
            'convert-csv-to-js', 
            csvFilePath.value, 
            csvOutputDir.value
        );
        
        showProgress(true, 100);
        
        if (result.success) {
            setStatus(`转换成功！从CSV提取了 ${result.pairsCount} 对数据，并保存到: ${result.outputPath}`);
        } else {
            setStatus(`转换失败: ${result.error}`);
        }
    } catch (error) {
        setStatus(`发生错误: ${error.message}`);
    } finally {
        setTimeout(() => showProgress(false), 2000);
    }
});

// 选择JS示例文件(翻译)
selectJsExampleFile.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-file', {
        filters: [
            { name: 'JavaScript文件', extensions: ['js'] }
        ]
    });
    
    if (!result.canceled) {
        jsExampleFilePath.value = result.filePath;
        await loadExamples(result.filePath);
        updateTranslateButton();
    }
});

// 更新翻译按钮状态
function updateTranslateButton() {
    translateText.disabled = !jsExampleFilePath.value || !translationInput.value || !apiKey.value || examplePairs.length === 0;
}

// 加载示例
async function loadExamples(filePath) {
    try {
        setStatus('正在从JS文件加载示例...');
        
        const result = await ipcRenderer.invoke('extract-examples-from-js', filePath);
        
        if (result.success) {
            examplePairs = result.pairs;
            setStatus(`成功加载 ${examplePairs.length} 个示例对`);
        } else {
            setStatus(`加载示例失败: ${result.error}`);
            examplePairs = [];
        }
    } catch (error) {
        setStatus(`加载示例时出错: ${error.message}`);
        examplePairs = [];
    }
}

// 翻译输入更新
translationInput.addEventListener('input', updateTranslateButton);

// 翻译文本
translateText.addEventListener('click', async () => {
    try {
        setStatus('正在使用Gemini API翻译...');
        showProgress(true, 0);
        
        const storedApiKey = apiKey.value;
        
        if (!storedApiKey) {
            setStatus('请先设置API密钥');
            return;
        }
        
        const result = await ipcRenderer.invoke(
            'translate-with-gemini', 
            translationInput.value,
            storedApiKey,
            examplePairs
        );
        
        showProgress(true, 100);
        
        if (result.success) {
            translationOutput.value = result.translation;
            setStatus('翻译成功！');
        } else {
            setStatus(`翻译失败: ${result.error}`);
        }
    } catch (error) {
        setStatus(`发生错误: ${error.message}`);
    } finally {
        setTimeout(() => showProgress(false), 2000);
    }
});

// 选择JS示例文件(批量处理)
selectJsExampleFileBatch.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-file', {
        filters: [
            { name: 'JavaScript文件', extensions: ['js'] }
        ]
    });
    
    if (!result.canceled) {
        jsExampleFilePathBatch.value = result.filePath;
        await loadExamples(result.filePath);
        updateProcessBatchButton();
    }
});

// 选择输入文本文件
selectInputTextFile.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-file', {
        filters: [
            { name: '文本文件', extensions: ['txt', 'md'] }
        ]
    });
    
    if (!result.canceled) {
        inputTextFilePath.value = result.filePath;
        
        // 如果输出路径未设置，自动设置一个默认值
        if (!outputTextFilePath.value) {
            const filePath = result.filePath;
            const lastDotIndex = filePath.lastIndexOf('.');
            const basePath = lastDotIndex !== -1 ? filePath.substring(0, lastDotIndex) : filePath;
            outputTextFilePath.value = `${basePath}_translated.txt`;
        }
        
        updateProcessBatchButton();
    }
});

// 选择输出文本文件
selectOutputTextFile.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-file', {
        filters: [
            { name: '文本文件', extensions: ['txt'] }
        ]
    });
    
    if (!result.canceled) {
        outputTextFilePath.value = result.filePath;
        updateProcessBatchButton();
    }
});

// 更新批量处理按钮状态
function updateProcessBatchButton() {
    processBatch.disabled = !jsExampleFilePathBatch.value || !inputTextFilePath.value || 
                           !outputTextFilePath.value || !apiKey.value || examplePairs.length === 0;
}

// 批量处理文件
processBatch.addEventListener('click', async () => {
    try {
        setStatus('正在批量处理文本...');
        showProgress(true, 0);
        
        const storedApiKey = apiKey.value;
        
        if (!storedApiKey) {
            setStatus('请先设置API密钥');
            return;
        }
        
        const result = await ipcRenderer.invoke(
            'process-text-file', 
            inputTextFilePath.value,
            outputTextFilePath.value,
            examplePairs,
            storedApiKey
        );
        
        if (result.success) {
            setStatus(`处理完成！共处理 ${result.processedCount} 条文本，结果已保存到: ${result.outputPath}`);
        } else {
            setStatus(`处理失败: ${result.error}`);
        }
    } catch (error) {
        setStatus(`发生错误: ${error.message}`);
    } finally {
        setTimeout(() => showProgress(false), 2000);
    }
});

// 保存设置
saveSettings.addEventListener('click', () => {
    localStorage.setItem('apiKey', apiKey.value);
    localStorage.setItem('delayTime', delayTime.value);
    setStatus('设置已保存');
    
    // 更新按钮状态
    updateTranslateButton();
    updateProcessBatchButton();
});

// 进程更新
ipcRenderer.on('process-update', (event, data) => {
    const percent = Math.round((data.current / data.total) * 100);
    showProgress(true, percent);
    setStatus(`正在处理: ${data.current}/${data.total} (${percent}%)`);
    
    if (data.current === data.total) {
        setStatus(`处理完成！结果已保存到: ${data.outputPath}`);
        setTimeout(() => showProgress(false), 2000);
    }
});

// 设置状态信息
function setStatus(message) {
    statusArea.textContent = message;
}

// 显示/隐藏进度条
function showProgress(show, percent = 0) {
    if (show) {
        progressContainer.style.display = 'block';
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent}%`;
    } else {
        progressContainer.style.display = 'none';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 从localStorage加载设置
    apiKey.value = localStorage.getItem('apiKey') || '';
    delayTime.value = localStorage.getItem('delayTime') || '4000';
    
    // 设置按钮初始状态
    updateXlsxConvertButton();
    updateCsvConvertButton();
    updateTranslateButton();
    updateProcessBatchButton();
});
