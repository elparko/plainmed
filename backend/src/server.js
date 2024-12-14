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
console.log('Running in production mode');

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Handle API routes first
app.use('/api', (req, res, next) => {
  console.log('API request:', req.method, req.url);
  console.log('Origin:', req.headers.origin);
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

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment: production');
  console.log('Frontend URL: https://plainmed.vercel.app');
  console.log('Allowed Origins:', [
    'https://plainmed.vercel.app',
    'https://www.plainmed.vercel.app'
  ]);
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