const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Move CORS configuration before other middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://plainmed.vercel.app'
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Global middleware to ensure JSON responses for API routes
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

// Debug logging middleware
const debugLog = (req, msg) => {
  console.log(`[${req.method}] ${req.path} - ${msg}`);
};

// At the top of your routes
if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      // Only send detailed error messages in development
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  });
}

// Add this function at the top of the file, after the Supabase initialization
async function performSearch(query, language, n_results) {
  console.log(`Searching for query: ${query} in language: ${language}`);

  try {
    const { data, error } = await supabase
      .from('MEDLINEPLUS')
      .select(`
        topic_id,
        title,
        title_es,
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

    return {
      source: 'supabase',
      results: data || []
    };
  } catch (error) {
    console.error('Supabase search error:', error);
    throw error;
  }
}

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Medical History Search API' });
});

app.get('/api/personal-info/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`Fetching personal info for user ${userId}`);
  
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('survey_type', 'personal_info')
      .single();

    if (error) throw error;

    const response = {
      hasCompletedForm: !!data?.response,
      data: data?.response || null
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting personal info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch personal info',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/personal-info', async (req, res) => {
  try {
    const { user_id, ...personalInfo } = req.body;

    // Update or insert personal info in survey_responses
    const { data, error } = await supabase
      .from('survey_responses')
      .upsert({
        user_id,
        survey_type: 'personal_info',
        response: personalInfo
      }, {
        onConflict: 'user_id,survey_type'
      });

    if (error) throw error;

    res.json(personalInfo);
  } catch (error) {
    console.error('Error creating personal info:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { query, language = 'English', n_results = 5 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const results = await performSearch(query, language, parseInt(n_results));
    
    // Explicitly set content type
    res.contentType('application/json');
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    // Ensure error response is also JSON
    res.contentType('application/json');
    res.status(500).json({ 
      error: 'Failed to perform search',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Debug route to check environment variables
app.get('/api/debug/env', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_KEY,
  });
});

// Export for Vercel
module.exports = app; 