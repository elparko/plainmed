const app = require('./handler');
const express = require('express');
const path = require('path');

// API error handling middleware
app.use('/api/*', (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Production setup
if (process.env.NODE_ENV === 'production') {
  // Serve static files
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // SPA catch-all route - must be last
  app.get('*', (req, res, next) => {
    // Only handle non-API routes
    if (!req.url.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    } else {
      next(); // Let API routes be handled by the handler
    }
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: ${process.env.NODE_ENV === 'production' ? process.env.PRODUCTION_URL : 'http://localhost:' + PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
});

module.exports = app; 