const app = require('./handler');
const express = require('express');
const path = require('path');
const cors = require('cors');

// Enable CORS with appropriate configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://plainmed.vercel.app'
    : 'http://localhost:5173',
  credentials: true
}));

// Set content type for API routes
app.use('/api', (req, res, next) => {
  res.type('application/json');
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Handle production
if (process.env.NODE_ENV === 'production') {
  // Static folder
  app.use(express.static(path.join(__dirname, '../dist')));

  // Handle SPA
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app; 