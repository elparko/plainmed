from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
from typing import Optional

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SearchQuery(BaseModel):
    query: str
    n_results: int = 5
    language: str = "English"

class PersonalInfoCreate(BaseModel):
    user_id: str
    age_range: str
    gender: str
    language: str

@app.get("/personal-info/{user_id}")
async def get_personal_info(user_id: str):
    try:
        result = supabase.table("personal_info") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()
        
        return {
            "hasCompletedForm": len(result.data) > 0,
            "data": result.data[0] if result.data else None
        }
    except Exception as e:
        logger.error(f"Error getting personal info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/personal-info")
async def create_personal_info(info: PersonalInfoCreate):
    try:
        # Check if personal info already exists
        existing = supabase.table("personal_info") \
            .select("id") \
            .eq("user_id", info.user_id) \
            .execute()
        
        if existing.data:
            raise HTTPException(
                status_code=400, 
                detail="Personal information already exists for this user"
            )
        
        # Create new personal info
        result = supabase.table("personal_info") \
            .insert({
                "user_id": info.user_id,
                "age_range": info.age_range,
                "gender": info.gender,
                "language": info.language
            }) \
            .execute()
        
        return result.data[0]
    except Exception as e:
        logger.error(f"Error creating personal info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Medical History Search API"}

@app.options("/search")
async def search_options():
    return {"message": "OK"}

@app.get("/test-db-language")
async def test_db_language():
    try:
        # Get distinct languages
        languages = supabase.table("MEDLINEPLUS") \
            .select("language") \
            .execute()
        
        # Get a sample record for each language
        samples = {}
        for lang in set(record.get('language') for record in languages.data):
            if lang:  # Skip None/null values
                sample = supabase.table("MEDLINEPLUS") \
                    .select("topic_id,title,language") \
                    .eq("language", lang) \
                    .limit(1) \
                    .execute()
                samples[lang] = sample.data

        return {
            "available_languages": list(set(record.get('language') for record in languages.data)),
            "sample_by_language": samples
        }
    except Exception as e:
        logger.error(f"Database language test error: {str(e)}")
        return {
            "error": str(e)
        }

@app.post("/search")
async def search(search_query: SearchQuery):
    try:
        logger.info(f"Searching for query: {search_query.query} in language: {search_query.language}")
        
        try:
            # Execute the search query with more fields
            results = supabase.table("MEDLINEPLUS") \
                .select("""
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
                """) \
                .ilike("title", f"%{search_query.query}%") \
                .eq("language", search_query.language) \
                .limit(search_query.n_results) \
                .execute()
            
            logger.info(f"Full search results: {results.data}")
            
            if len(results.data) == 0:
                sample = supabase.table("MEDLINEPLUS") \
                    .select("*") \
                    .limit(5) \
                    .execute()
                logger.info(f"Sample of database contents: {sample.data}")
            
            return {
                "source": "supabase",
                "results": results.data
            }
            
        except Exception as supabase_error:
            logger.error(f"Supabase search error: {str(supabase_error)}")
            raise HTTPException(status_code=500, detail=str(supabase_error))

    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-supabase")
async def test_supabase():
    try:
        # Test the connection with a simple query
        result = supabase.table("MEDLINEPLUS") \
            .select("topic_id,title") \
            .limit(1) \
            .execute()
        
        return {
            "status": "success",
            "connection": "valid",
            "sample_data": result.data
        }
    except Exception as e:
        logger.error(f"Supabase connection test error: {str(e)}")
        return {
            "status": "error",
            "connection": "invalid",
            "error": str(e)
        }