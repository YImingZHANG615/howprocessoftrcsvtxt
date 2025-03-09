console.log('开始测试简单Express服务器...');

try {
  const express = require('express');
  console.log('Express模块加载成功');
  
  const app = express();
  const port = 3000;

  app.get('/', (req, res) => {
    res.send('服务器运行正常');
  });

  app.listen(port, () => {
    console.log(`测试服务器已启动，访问 http://localhost:${port}`);
  });
} catch (error) {
  console.error('测试服务器启动错误:', error);
}
