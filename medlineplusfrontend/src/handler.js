const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*'],
  maxAge: 3600
}));
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Add this near the top of your file
const debugLog = (req, msg) => {
  console.log(`[${req.method}] ${req.path} - ${msg}`);
};

// Routes
app.get('/api/personal-info/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('personal_info')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    res.json({
      hasCompletedForm: data.length > 0,
      data: data.length > 0 ? data[0] : null
    });
  } catch (error) {
    console.error('Error getting personal info:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/personal-info', async (req, res) => {
  try {
    const { user_id, age_range, gender, language } = req.body;

    // Check if personal info already exists
    const { data: existing } = await supabase
      .from('personal_info')
      .select('id')
      .eq('user_id', user_id);

    if (existing && existing.length > 0) {
      return res.status(400).json({
        error: 'Personal information already exists for this user'
      });
    }

    // Create new personal info
    const { data, error } = await supabase
      .from('personal_info')
      .insert([{
        user_id,
        age_range,
        gender,
        language
      }]);

    if (error) throw error;

    res.json(data[0]);
  } catch (error) {
    console.error('Error creating personal info:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api', (req, res) => {
  res.json({ message: 'Medical History Search API' });
});

app.post('/api/search', async (req, res) => {
  try {
    const { query, n_results = 5, language = 'English' } = req.body;
    console.log(`Searching for query: ${query} in language: ${language}`);

    const { data, error } = await supabase
      .from('MEDLINEPLUS')
      .select(`
        topic_id,
        title,
        language,
        url,
        meta_desc,
        full_summary,
        aliases,
        mesh_headings,
        groups,
        primary_institute,
        date_created
      `)
      .ilike('title', `%${query}%`)
      .eq('language', language)
      .limit(n_results);

    if (error) throw error;

    if (data.length === 0) {
      const { data: sample } = await supabase
        .from('MEDLINEPLUS')
        .select('*')
        .limit(5);
      console.log('Sample of database contents:', sample);
    }

    res.json({
      source: 'supabase',
      results: data
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test-db-language', async (req, res) => {
  try {
    // Get distinct languages
    const { data: languages, error: langError } = await supabase
      .from('MEDLINEPLUS')
      .select('language');

    if (langError) throw langError;

    // Get a sample record for each language
    const samples = {};
    const uniqueLanguages = [...new Set(languages.map(record => record.language))];

    for (const lang of uniqueLanguages) {
      if (lang) {
        const { data: sample } = await supabase
          .from('MEDLINEPLUS')
          .select('topic_id,title,language')
          .eq('language', lang)
          .limit(1);

        samples[lang] = sample;
      }
    }

    res.json({
      available_languages: uniqueLanguages.filter(Boolean),
      sample_by_language: samples
    });
  } catch (error) {
    console.error('Database language test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('MEDLINEPLUS')
      .select('topic_id,title')
      .limit(1);

    if (error) throw error;

    res.json({
      status: 'success',
      connection: 'valid',
      sample_data: data
    });
  } catch (error) {
    console.error('Supabase connection test error:', error);
    res.status(500).json({
      status: 'error',
      connection: 'invalid',
      error: error.message
    });
  }
});

app.post('/api/initialize-user', async (req, res) => {
  debugLog(req, 'Initializing user');
  try {
    const { user_id, email } = req.body;

    // Initialize survey responses
    const { error: surveyError } = await supabase
      .from('survey_responses')
      .insert([
        {
          user_id,
          survey_type: 'personal_info',
          response: null
        },
        {
          user_id,
          survey_type: 'medical_history',
          response: null
        }
      ]);

    if (surveyError) throw surveyError;

    res.json({ success: true });
  } catch (error) {
    debugLog(req, `Error: ${error.message}`);
    console.error('Error initializing user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this route to check environment variables
app.get('/api/debug/env', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_KEY,
  });
});

// Export for Vercel
module.exports = app; 