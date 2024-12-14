import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DOMPurify from 'dompurify'

import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from "@/lib/supabase"

interface Condition {
  topic_id: string           // Changed from number since it's used as a string in URLs
  title: string             // text in DB
  language: string          // text in DB
  date_created: string      // text in DB
  url: string              // text in DB
  meta_desc: string        // text in DB
  full_summary: string     // text in DB
  aliases: string[]        // jsonb in DB
  mesh_headings: string[]  // jsonb in DB
  groups: string[]         // jsonb in DB
  language_mapped_topics: {  // jsonb in DB
    [lang: string]: string  // e.g., { "es": "Spanish title" }
  }
  other_languages: {        // jsonb in DB
    [lang: string]: string  // e.g., { "es": "url_to_spanish_version" }
  }
  see_references: string[]  // jsonb in DB
  primary_institute: {      // jsonb in DB
    name: string
    url: string
  }
  sites: {                  // jsonb in DB
    name: string
    url: string
  }[]
}

interface SurveyCondition {
  name: string;
  name_es?: string;
  concept_id: string;
  semantic_type: string;
  sources: string;
  url?: string;
  meta_desc?: string;
  full_summary?: string;
  aliases?: string[];
  mesh_headings?: string[];
  groups?: string[];
  primary_institute?: {
    name: string;
    url: string;
  };
}

function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
}

export function MedicalHistoryView() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) {
      setIsLoading(false);
      return;
    }

    async function fetchUserConditions() {
      if (!user?.id) {
        setError("User not authenticated");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const userId = user.id;
        console.log('Fetching conditions for user:', userId);
        
        const { data: surveyData, error: surveyError } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('user_id', userId)
          .eq('survey_type', 'medical_history')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (surveyError && surveyError.code !== 'PGRST116') {
          throw surveyError;
        }

        if (!surveyData) {
          console.log('No medical history found');
          setConditions([]);
          return;
        }

        console.log('Survey response:', surveyData);

        if (!surveyData?.response?.conditions || !surveyData.response.conditions.length) {
          console.log('No conditions found in survey response');
          setConditions([]);
          return;
        }

        const formattedConditions = surveyData.response.conditions.map((c: SurveyCondition) => ({
          topic_id: c.concept_id,
          title: c.name,
          language: 'en',
          date_created: new Date().toISOString(),
          url: c.url || '',
          meta_desc: c.meta_desc || `Information about ${c.name}`,
          full_summary: c.full_summary || '',
          aliases: c.aliases || [],
          mesh_headings: c.mesh_headings || [],
          groups: c.groups || [],
          language_mapped_topics: {},
          other_languages: {},
          see_references: [],
          primary_institute: c.primary_institute || {
            name: 'MedlinePlus',
            url: ''
          },
          sites: []
        }));

        setConditions(formattedConditions);
        
      } catch (error) {
        console.error('Error in fetchUserConditions:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserConditions();
  }, [user?.id, loading]);

  const removeCondition = async (topicId: string) => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }
    
    setIsLoading(true);
    try {
      // Get the current survey response
      const { data: surveyData, error: surveyError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('survey_type', 'medical_history')
        .single();

      if (surveyError) throw surveyError;

      // Filter out the condition to remove
      const updatedConditions = surveyData.response.conditions.filter(
        (c: { concept_id: string }) => c.concept_id !== topicId
      );

      // Update the survey response
      const { error: updateError } = await supabase
        .from('survey_responses')
        .update({
          response: { ...surveyData.response, conditions: updatedConditions },
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyData.id);

      if (updateError) throw updateError;

      // Update local state
      setConditions(conditions.filter(c => c.topic_id !== topicId));
    } catch (error) {
      console.error('Error removing condition:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove condition');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="relative h-16 border-b flex items-center px-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-accent rounded-full transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold ml-4">Medical History</h1>
        </header>
        <div className="container mx-auto p-6 max-w-4xl">
          <Card>
            <CardContent>
              <div className="text-center py-8 text-red-500">
                <p>{error}</p>
                <Button 
                  variant="link" 
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="relative h-16 border-b flex items-center px-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-accent rounded-full transition-colors"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold ml-4">Medical History</h1>
      </header>

      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Current Medical Conditions</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => navigate('/survey', { state: { skipPersonalInfo: true }})}
              >
                Update Conditions
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : conditions.length === 0 ? (
              <div className="text-center py-8">
                <p>No medical conditions have been added yet.</p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/survey')}
                  className="mt-2"
                >
                  Take the health survey to add conditions
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {conditions.map((condition) => (
                  <Card 
                    key={condition.topic_id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/${condition.topic_id}/${encodeURIComponent(condition.title.toLowerCase().replace(/\s+/g, '-'))}`)}
                  >
                    <CardHeader className="bg-muted/50">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{condition.title}</h3>
                          {condition.aliases && condition.aliases.length > 0 && (
                            <p className="text-sm mt-1">
                              Also known as: {condition.aliases.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCondition(condition.topic_id);
                            }}
                          >
                            Remove
                          </Button>
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {condition.meta_desc && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Overview</h4>
                          <div 
                            className="prose prose-sm max-w-none line-clamp-3 prose-p:text-foreground"
                            dangerouslySetInnerHTML={{ 
                              __html: sanitizeHtml(condition.meta_desc) 
                            }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 