document.addEventListener('DOMContentLoaded', function() {
    // 获取状态和进度条元素
    const statusArea = document.getElementById('status-area');
    const progressBarContainer = document.getElementById('progress-bar-container');
    const progressBar = document.getElementById('progress-bar');
    
    // 检查API密钥
    const apiKey = localStorage.getItem('gemini-api-key');
    if (apiKey) {
        document.getElementById('api-key').value = apiKey;
    } else {
        setStatus('请在"设置"中设置您的Gemini API密钥');
    }

    // 1. XLSX转CSV
    document.getElementById('xlsx-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('xlsx-file');
        
        if (!fileInput.files.length) {
            setStatus('请选择XLSX文件');
            return;
        }
        
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('xlsxFile', file);
        
        setStatus('正在转换XLSX文件...');
        showProgress(true, 10);
        
        try {
            const response = await fetch('/api/xlsx-to-csv', {
                method: 'POST',
                body: formData
            });
            
            showProgress(true, 90);
            
            const result = await response.json();
            
            if (result.success) {
                setStatus('XLSX转换成功');
                document.getElementById('xlsx-result').style.display = 'block';
                document.getElementById('xlsx-result-message').textContent = result.message;
            } else {
                setStatus(`转换失败: ${result.message}`);
            }
        } catch (error) {
            setStatus(`发生错误: ${error.message}`);
        } finally {
            showProgress(true, 100);
            setTimeout(() => showProgress(false), 1000);
        }
    });

    // 2. CSV转JS
    document.getElementById('csv-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('csv-file');
        
        if (!fileInput.files.length) {
            setStatus('请选择CSV文件');
            return;
        }
        
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('csvFile', file);
        
        setStatus('正在转换CSV文件...');
        showProgress(true, 10);
        
        try {
            const response = await fetch('/api/csv-to-js', {
                method: 'POST',
                body: formData
            });
            
            showProgress(true, 90);
            
            const result = await response.json();
            
            if (result.success) {
                setStatus('CSV转换成功');
                document.getElementById('csv-result').style.display = 'block';
                document.getElementById('csv-result-message').textContent = result.message;
            } else {
                setStatus(`转换失败: ${result.message}`);
            }
        } catch (error) {
            setStatus(`发生错误: ${error.message}`);
        } finally {
            showProgress(true, 100);
            setTimeout(() => showProgress(false), 1000);
        }
    });

    // 3. Gemini翻译
    document.getElementById('translate-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const apiKey = document.getElementById('api-key').value;
        if (!apiKey) {
            setStatus('请先在"设置"中设置API密钥');
            return;
        }
        
        const text = document.getElementById('translate-text').value;
        if (!text.trim()) {
            setStatus('请输入要翻译的文本');
            return;
        }
        
        setStatus('正在使用Gemini API翻译...');
        showProgress(true, 10);
        
        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    apiKey: apiKey
                })
            });
            
            showProgress(true, 90);
            
            const result = await response.json();
            
            if (result.success) {
                setStatus('翻译成功');
                document.getElementById('translate-result').style.display = 'block';
                document.getElementById('translate-original').textContent = result.original;
                document.getElementById('translate-output').textContent = result.translation;
            } else {
                setStatus(`翻译失败: ${result.message}`);
            }
        } catch (error) {
            setStatus(`发生错误: ${error.message}`);
        } finally {
            showProgress(true, 100);
            setTimeout(() => showProgress(false), 1000);
        }
    });

    // 4. 批量处理
    document.getElementById('batch-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const apiKey = document.getElementById('api-key').value;
        if (!apiKey) {
            setStatus('请先在"设置"中设置API密钥');
            return;
        }
        
        const fileInput = document.getElementById('batch-file');
        
        if (!fileInput.files.length) {
            setStatus('请选择文本文件');
            return;
        }
        
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('textFile', file);
        formData.append('apiKey', apiKey);
        
        setStatus('正在批量处理文本...');
        showProgress(true, 10);
        
        try {
            const response = await fetch('/api/batch-process', {
                method: 'POST',
                body: formData
            });
            
            showProgress(true, 90);
            
            const result = await response.json();
            
            if (result.success) {
                setStatus('批量处理成功');
                document.getElementById('batch-result').style.display = 'block';
                document.getElementById('batch-result-message').textContent = result.message;
                document.getElementById('batch-sample').innerHTML = result.sample.replace(/\n/g, '<br>');
            } else {
                setStatus(`处理失败: ${result.message}`);
            }
        } catch (error) {
            setStatus(`发生错误: ${error.message}`);
        } finally {
            showProgress(true, 100);
            setTimeout(() => showProgress(false), 1000);
        }
    });

    // 5. 保存设置
    document.getElementById('settings-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const apiKey = document.getElementById('api-key').value;
        
        if (!apiKey) {
            setStatus('请输入API密钥');
            return;
        }
        
        localStorage.setItem('gemini-api-key', apiKey);
        setStatus('设置已保存');
    });

    // 设置状态信息
    function setStatus(message) {
        statusArea.textContent = message;
    }

    // 显示/隐藏进度条
    function showProgress(show, percent = 0) {
        if (show) {
            progressBarContainer.style.display = 'block';
            progressBar.style.width = `${percent}%`;
            progressBar.setAttribute('aria-valuenow', percent);
        } else {
            progressBarContainer.style.display = 'none';
        }
    }
});
