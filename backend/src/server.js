const app = require('./handler');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  // Log Supabase configuration status
  console.log('Supabase URL configured:', !!process.env.SUPABASE_URL);
  console.log('Supabase Key configured:', !!process.env.SUPABASE_KEY);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in this case, just log the error
}); 