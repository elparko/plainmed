const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://plainmed.vercel.app'
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());

// Ensure JSON responses for all API routes
app.use('/api', (req, res, next) => {
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
    let { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('survey_type', 'personal_info')
      .single();

    // If no data exists, create an initial record
    if (!data && !error) {
      const { data: newData, error: insertError } = await supabase
        .from('survey_responses')
        .insert({
          user_id: userId,
          survey_type: 'personal_info',
          response: null
        })
        .single();

      if (insertError) throw insertError;
      data = newData;
    } else if (error) {
      throw error;
    }

    res.json({
      hasCompletedForm: !!data?.response,
      data: data?.response || null
    });
  } catch (error) {
    console.error('Error getting personal info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch personal info',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Keep other routes...

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

module.exports = app; 