// 设置更详细的错误输出
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

try {
  console.log('运行时间:', new Date().toLocaleString());
  console.log('Node.js版本:', process.version);
  console.log('当前工作目录:', process.cwd());
  
  // 尝试加载模块
  console.log('---------- 尝试加载模块 ----------');
  
  try {
    const express = require('express');
    console.log('✓ Express加载成功');
  } catch (e) {
    console.error('✗ Express加载失败:', e);
  }
  
  try {
    const fs = require('fs');
    console.log('✓ fs模块加载成功');
  } catch (e) {
    console.error('✗ fs模块加载失败:', e);
  }
  
  try {
    const path = require('path');
    console.log('✓ path模块加载成功');
  } catch (e) {
    console.error('✗ path模块加载失败:', e);
  }
  
  // 测试文件操作
  console.log('---------- 测试文件操作 ----------');
  const fs = require('fs');
  const path = require('path');
  
  // 检查目录
  const publicDir = path.join(process.cwd(), 'public');
  console.log(`公共目录路径: ${publicDir}`);
  console.log(`公共目录是否存在: ${fs.existsSync(publicDir)}`);
  
  if (fs.existsSync(publicDir)) {
    try {
      const files = fs.readdirSync(publicDir);
      console.log(`公共目录中的文件: ${files.join(', ')}`);
    } catch (e) {
      console.error('读取公共目录失败:', e);
    }
  }
  
  // 尝试创建一个简单的 Express 服务器
  console.log('---------- 尝试创建Express服务器 ----------');
  try {
    const express = require('express');
    const app = express();
    const port = 3000;
    
    console.log('Express实例创建成功');
    
    app.get('/', (req, res) => {
      res.send('Hello World!');
    });
    
    const server = app.listen(port, () => {
      console.log(`测试服务器已启动，访问 http://localhost:${port}`);
      
      // 5秒后自动关闭服务器
      setTimeout(() => {
        server.close(() => {
          console.log('测试服务器已关闭');
        });
      }, 5000);
    });
    
    // 添加服务器错误处理
    server.on('error', (error) => {
      console.error('服务器错误:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`端口 ${port} 已被占用，请尝试使用不同的端口`);
      }
    });
  } catch (e) {
    console.error('Express服务器创建失败:', e);
  }
  
} catch (error) {
  console.error('主程序运行失败:', error);
}
