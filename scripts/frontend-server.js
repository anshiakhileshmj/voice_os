
const express = require('express');
const path = require('path');
const chalk = require('chalk');

function createFrontendServer(packageDir, port = 8080) {
  const app = express();
  
  // Serve static files from the dist directory
  const distPath = path.join(packageDir, 'dist');
  app.use(express.static(distPath));
  
  // Handle React Router - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(chalk.green(`✅ Frontend server running on http://localhost:${port}`));
        resolve(server);
      }
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use`));
      } else {
        reject(err);
      }
    });
  });
}

module.exports = { createFrontendServer };
