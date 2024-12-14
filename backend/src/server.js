const app = require('./handler');
const express = require('express');
const path = require('path');

// Create a new router for API routes
const apiRouter = express.Router();

// API error handling middleware
apiRouter.use((err, req, res, next) => {
  console.error('API Error:', err);
  
  // Ensure CORS headers are set even for errors
  const origin = req.headers.origin;
  const isVercelPreview = /^https:\/\/plainmed-.*\.vercel\.app$/.test(origin);
  const isAllowed = origin === 'https://plainmed.vercel.app' || 
                   origin === 'https://www.plainmed.vercel.app' ||
                   isVercelPreview ||
                   origin === 'http://localhost:5173' ||
                   origin === 'http://localhost:3000';

  res.set({
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://plainmed.vercel.app',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Origin'
  });

  res.status(500).json({ 
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes logger
apiRouter.use((req, res, next) => {
  console.log('API request:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    path: req.path,
    fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl
  });
  next();
});

// Production setup
console.log('Running in production mode');

// Mount API routes at /api
app.use('/api', apiRouter);

// After API routes, serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// SPA catch-all route - must be last and should not handle API routes
app.get('*', (req, res) => {
  if (!req.url.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // If we get here, it means no API route was matched
    // Ensure CORS headers are set for 404 responses
    const origin = req.headers.origin;
    const isVercelPreview = /^https:\/\/plainmed-.*\.vercel\.app$/.test(origin);
    const isAllowed = origin === 'https://plainmed.vercel.app' || 
                     origin === 'https://www.plainmed.vercel.app' ||
                     isVercelPreview ||
                     origin === 'http://localhost:5173' ||
                     origin === 'http://localhost:3000';

    res.set({
      'Access-Control-Allow-Origin': isAllowed ? origin : 'https://plainmed.vercel.app',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Origin'
    });

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
    'https://www.plainmed.vercel.app',
    'Vercel Preview URLs (*.plainmed-*.vercel.app)',
    'http://localhost:5173',
    'http://localhost:3000'
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