const app = require('./handler');
const express = require('express');
const path = require('path');

// API routes are defined in handler.js and mounted first

// Error handling middleware for API routes
app.use('/api/*', (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle production AFTER API routes
if (process.env.NODE_ENV === 'production') {
  // Static folder
  app.use(express.static(path.join(__dirname, '../dist')));

  // Handle SPA - this must be LAST
  app.get('/*', (req, res, next) => {
    // Skip API routes
    if (req.url.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app; 