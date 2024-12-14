const app = require('./handler');
const express = require('express');
const path = require('path');

// Error handling middleware for API routes
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
  
  // Important: Handle API routes BEFORE the SPA catch-all
  app.get('/api/*', (req, res) => {
    // If we get here, it means no API route was matched
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // SPA catch-all route - must be last
  app.get('*', (req, res) => {
    // Explicitly exclude API routes
    if (!req.url.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    }
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app; 