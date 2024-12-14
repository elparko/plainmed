const app = require('./handler');
const express = require('express');
const path = require('path');

// API error handling middleware
app.use('/api/*', (err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Production setup
if (process.env.NODE_ENV === 'production') {
  console.log('Running in production mode');
  
  // Serve static files
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Handle API routes first
  app.use('/api', (req, res, next) => {
    console.log('API request:', req.method, req.url);
    next();
  });
  
  // SPA catch-all route - must be last
  app.get('*', (req, res, next) => {
    if (!req.url.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    } else {
      next();
    }
  });
}

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Frontend URL:', process.env.FRONTEND_URL);
  console.log('Allowed Origins:', process.env.NODE_ENV === 'production' 
    ? [
        'https://plainmed.vercel.app',
        'https://www.plainmed.vercel.app',
        process.env.FRONTEND_URL,
      ].filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173']
  );
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app; 