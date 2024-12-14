const app = require('./handler');
const express = require('express');
const path = require('path');

// API error handling middleware - should be first
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

// API routes logger - should be before static files
app.use('/api', (req, res, next) => {
  console.log('API request:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    path: req.path
  });
  next();
});

// Production setup
console.log('Running in production mode');

// IMPORTANT: Handle API routes from handler.js BEFORE static files
// This ensures API routes are not intercepted by the static file handler
app.use('/api', app._router);

// After API routes, serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// SPA catch-all route - must be last and should not handle API routes
app.get('*', (req, res) => {
  if (!req.url.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // If we get here, it means no API route was matched
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment: production');
  console.log('Frontend URL: https://plainmed.vercel.app');
  console.log('API Base URL: https://plainmed.vercel.app/api');
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