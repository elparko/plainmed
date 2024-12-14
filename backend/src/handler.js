const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://plainmed.vercel.app'
    ];
    
    // Allow any Vercel preview deployments
    const isVercelPreview = origin && 
      (origin.endsWith('.vercel.app') || 
       origin.includes('-elparkos-projects.vercel.app'));
    
    if (!origin || allowedOrigins.includes(origin) || isVercelPreview) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

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

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Medical History Search API' });
});

app.get('/api/personal-info/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`Received request for user ${userId}`);
  
  try {
    // First, check if user is initialized
    const { data: existingData, error: checkError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('survey_type', 'personal_info');

    if (checkError) {
      console.error('Error checking user:', checkError);
      throw checkError;
    }

    // If no row exists, initialize one
    if (!existingData || existingData.length === 0) {
      console.log('Initializing user survey response...');
      const { error: initError } = await supabase
        .from('survey_responses')
        .insert({
          user_id: userId,
          survey_type: 'personal_info',
          response: null
        });

      if (initError) {
        console.error('Error initializing user:', initError);
        throw initError;
      }
    }

    // Now get the data (either existing or newly initialized)
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('survey_type', 'personal_info');

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Raw data from database:', data);
    const personalInfo = data && data.length > 0 ? data[0] : null;
    console.log('Personal info response:', personalInfo?.response);

    const response = {
      hasCompletedForm: !!(personalInfo?.response),
      data: personalInfo?.response || null
    };
    console.log('Sending response:', response);

    res.json(response);
  } catch (error) {
    console.error('Error getting personal info:', error);
    res.status(500).json({ error: error.message });
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