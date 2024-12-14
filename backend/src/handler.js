const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://plainmed.vercel.app',
        'https://www.plainmed.vercel.app',
        process.env.PRODUCTION_URL,
      ].filter(Boolean)
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  maxAge: 86400
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());

// Global middleware for API routes
app.use('/api', (req, res, next) => {
  // Log incoming requests
  console.log(`${req.method} ${req.url}`);
  
  // Set headers
  res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache'
  });
  next();
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// API Routes
app.get('/api/personal-info/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`Fetching personal info for user ${userId}`);
  
  try {
    // First try to get existing data
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('survey_type', 'personal_info')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // If no data exists, return empty response
    if (!data) {
      return res.json({
        hasCompletedForm: false,
        data: null
      });
    }

    // Return the data
    res.json({
      hasCompletedForm: !!data.response,
      data: data.response
    });
  } catch (error) {
    console.error('Error getting personal info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch personal info',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/personal-info', async (req, res) => {
  const { user_id, ageRange, gender, language } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .upsert({
        user_id,
        survey_type: 'personal_info',
        response: { ageRange, gender, language },
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.json(data.response);
  } catch (error) {
    console.error('Error saving personal info:', error);
    res.status(500).json({ 
      error: 'Failed to save personal info',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

module.exports = app; 