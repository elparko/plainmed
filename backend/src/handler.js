const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();

// Production CORS configuration
const allowedOrigins = [
  'https://plainmed.vercel.app',
  'https://www.plainmed.vercel.app',
  /^https:\/\/plainmed-.*\.vercel\.app$/,  // Allow all Vercel preview deployments
  'http://localhost:5173',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if the origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('Origin not allowed by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Origin'],
  optionsSuccessStatus: 200
};

// Apply middleware
router.use(cors(corsOptions));
router.use(express.json());

// Request logging middleware
router.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  console.log('Origin:', req.headers.origin);
  console.log('Headers:', req.headers);
  next();
});

// Global middleware for API routes
router.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if the origin is allowed
  const isAllowed = allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }
    return allowedOrigin === origin;
  });

  // Set CORS headers based on the origin
  res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://plainmed.vercel.app',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Origin'
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  next();
});

// Initialize Supabase client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase.from('MEDLINEPLUS').select('count').limit(1);
    if (error) throw error;
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testDatabaseConnection();

// Root endpoint
router.get('/', (req, res) => {
  return res.json({ message: "Medical History Search API" });
});

// Search endpoint
router.get('/search', async (req, res) => {
  try {
    const { query, language = 'English', n_results = 5 } = req.query;
    console.log('Search request:', { query, language, n_results });

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

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
      .limit(Number(n_results));

    if (error) {
      console.error('Supabase search error:', error);
      throw error;
    }

    console.log(`Found ${data.length} results`);
    return res.json({
      source: 'supabase',
      results: data
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Failed to perform search',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Personal info endpoints
router.get('/personal-info/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`Fetching personal info for user ${userId}`);
  
  try {
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

    return res.json({
      hasCompletedForm: !!data,
      data: data ? data.response : null
    });
  } catch (error) {
    console.error('Error getting personal info:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch personal info',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/personal-info', async (req, res) => {
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

    return res.json(data.response);
  } catch (error) {
    console.error('Error saving personal info:', error);
    return res.status(500).json({ 
      error: 'Failed to save personal info',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Test endpoints
router.get('/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('MEDLINEPLUS')
      .select('topic_id,title')
      .limit(1);

    if (error) throw error;

    return res.json({
      status: 'success',
      connection: 'valid',
      sample_data: data
    });
  } catch (error) {
    console.error('Test DB error:', error);
    return res.status(500).json({
      status: 'error',
      connection: 'invalid',
      error: error.message
    });
  }
});

// Options endpoint for CORS preflight
router.options('/search', (req, res) => {
  return res.json({ message: 'OK' });
});

// Create an Express app to handle the router
const app = express();
app.use('/', router);

// 404 handler for API routes
app.use('*', (req, res) => {
  console.log('API 404:', req.method, req.originalUrl);
  return res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = app; 