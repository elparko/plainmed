import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader} from './ui/card'
import { ChevronLeft, Loader2, ExternalLink} from 'lucide-react'
import { supabase } from "@/lib/supabase"
import { useAuth } from '@/contexts/AuthContext'
import { ConditionContent } from './ConditionContent'

const parseJsonField = (field: any, defaultValue: any = []) => {
  if (!field) return defaultValue;
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
};

export function ConditionDetailView() {
  const { topic_id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [condition, setCondition] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInDashboard, setIsInDashboard] = useState(false)

  const topicIdNumber = topic_id ? parseInt(topic_id, 10) : null;

  useEffect(() => {
    async function fetchCondition() {
      if (!topic_id || !topicIdNumber) {
        setError('Missing or invalid topic ID')
        setLoading(false)
        return
      }

      try {
        // Directly fetch the condition details from MEDLINEPLUS table
        const { data: fullCondition, error: conditionError } = await supabase
          .from('MEDLINEPLUS')
          .select(`
            topic_id,
            title,
            meta_desc,
            full_summary,
            aliases,
            primary_institute,
            sites
          `)
          .eq('topic_id', topicIdNumber)
          .single()

        if (conditionError) throw conditionError

        // Decode HTML entities before setting the state
        const decodedFullSummary = fullCondition.full_summary
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')

        setCondition({
          name: fullCondition.title, // Use title from MEDLINEPLUS as name
          ...fullCondition,
          full_summary: decodedFullSummary,
          aliases: parseJsonField(fullCondition.aliases),
          sites: parseJsonField(fullCondition.sites),
          primary_institute: fullCondition.primary_institute 
            ? (typeof fullCondition.primary_institute === 'string' 
              ? JSON.parse(fullCondition.primary_institute) 
              : fullCondition.primary_institute)
            : null
        })
      } catch (error) {
        console.error('Error fetching condition:', error)
        setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchCondition()
  }, [topic_id]) // Removed user?.id dependency

  useEffect(() => {
    // Check if condition exists in medical history survey response
    async function checkMedicalHistoryStatus() {
      if (!user || !topicIdNumber || !condition) return;

      try {
        const { data: surveyData, error: surveyError } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('user_id', user.id)
          .eq('survey_type', 'medical_history')
          .single();

        if (surveyError) {
          console.error('Error checking medical history:', surveyError);
          return;
        }

        // Check if condition exists in the response
        const exists = surveyData?.response?.conditions?.some(
          (c: { concept_id: string }) => c.concept_id === topicIdNumber.toString()
        );

        setIsInDashboard(!!exists);
      } catch (error) {
        console.error('Error checking medical history status:', error);
      }
    }

    checkMedicalHistoryStatus();
  }, [user, topicIdNumber, condition]);

  const addToDashboard = async () => {
    if (!user || !condition) return;

    try {
      // First get the current survey response
      const { data: surveyData, error: surveyError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('survey_type', 'medical_history')
        .single();

      const newCondition = {
        name: condition.title,
        name_es: condition.title, // Using same as name for now
        sources: "MedlinePlus",
        concept_id: topic_id,
        semantic_type: "MedlinePlus Topic"
      };

      if (surveyError?.code === 'PGRST116') {
        // Create new survey response
        const { error: insertError } = await supabase
          .from('survey_responses')
          .insert({
            user_id: user.id,
            survey_type: 'medical_history',
            response: { conditions: [newCondition] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      } else {
        if (surveyError) throw surveyError;

        // Add to existing conditions array
        const existingConditions = surveyData.response?.conditions || [];
        const updatedResponse = {
          ...surveyData.response,
          conditions: [...existingConditions, newCondition]
        };

        const { error: updateError } = await supabase
          .from('survey_responses')
          .update({
            response: updatedResponse,
            updated_at: new Date().toISOString()
          })
          .eq('id', surveyData.id);

        if (updateError) throw updateError;
      }

      setIsInDashboard(true);
    } catch (error) {
      console.error('Error adding to medical history:', error);
    }
  };

  const removeFromDashboard = async () => {
    if (!user || !condition || !topicIdNumber) return;

    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('survey_type', 'medical_history')
        .single();

      if (surveyError) throw surveyError;

      // Filter out the condition to remove
      const updatedConditions = surveyData.response.conditions.filter(
        (c: { concept_id: string }) => c.concept_id !== topic_id
      );

      const { error: updateError } = await supabase
        .from('survey_responses')
        .update({
          response: { ...surveyData.response, conditions: updatedConditions },
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyData.id);

      if (updateError) throw updateError;

      setIsInDashboard(false);
    } catch (error) {
      console.error('Error removing from medical history:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error || !condition) {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/medical-history')}
              className="p-2 hover:bg-accent rounded-full transition-colors flex items-center justify-center"
              aria-label="Back to medical history"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold ml-2 flex items-center">{condition.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <div className="h-9 flex items-center">
                <Button
                  variant={isInDashboard ? "outline" : "default"}
                  size="sm"
                  onClick={isInDashboard ? removeFromDashboard : addToDashboard}
                  className="h-9"
                >
                  {isInDashboard ? 'Remove' : 'Add to Medical History'}
                </Button>
              </div>
            )}
            <div className="w-9 h-9 flex items-center justify-center" />
          </div>
        </header>
        
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="space-y-8">
              {/* Condition details */}
              <div className="pt-4">
                {condition.name_es && (
                  <p className="mb-4">Spanish: <span className="font-medium">{condition.name_es}</span></p>
                )}

                {condition.aliases && condition.aliases.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h2 className="text-base font-semibold mb-2">Also Known As</h2>
                    <p className="text-sm leading-relaxed">
                      {condition.aliases.join(' • ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Overview Section */}
              {condition.meta_desc && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Overview</h3>
                  <ConditionContent content={condition.meta_desc} />
                </div>
              )}

              {/* Detailed Information Section */}
              {condition.full_summary && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Detailed Information</h3>
                  <ConditionContent content={condition.full_summary} />
                </div>
              )}

              {/* Additional Resources Section */}
              {(condition.primary_institute || condition.sites?.length > 0) && (
                <div className="border-t pt-6">
                  <h3 className="text-xl font-semibold mb-4">Additional Resources</h3>
                  
                  {condition.primary_institute && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-2">Primary Institute</h4>
                      <a 
                        href={condition.primary_institute.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline"
                      >
                        {condition.primary_institute.name}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </div>
                  )}

                  {condition.sites?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Related Resources</h4>
                      <ul className="space-y-2">
                        {condition.sites.map((site: any, index: number) => (
                          <li key={index}>
                            <a
                              href={site.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:underline"
                            >
                              {site.title}
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                            {site.organizations?.length > 0 && (
                              <span className="text-sm ml-2">
                                ({site.organizations.join(', ')})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/medical-history')}
            className="p-2 hover:bg-accent rounded-full transition-colors flex items-center justify-center"
            aria-label="Back to medical history"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold ml-2 flex items-center">{condition.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <div className="h-9 flex items-center">
              <Button
                variant={isInDashboard ? "outline" : "default"}
                size="sm"
                onClick={isInDashboard ? removeFromDashboard : addToDashboard}
                className="h-9"
              >
                {isInDashboard ? 'Remove' : 'Add to Medical History'}
              </Button>
            </div>
          )}
          <div className="w-9 h-9 flex items-center justify-center" />
        </div>
      </header>
      
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="space-y-8">
            {/* Condition details */}
            <div className="pt-4">
              {condition.name_es && (
                <p className="mb-4">Spanish: <span className="font-medium">{condition.name_es}</span></p>
              )}

              {condition.aliases && condition.aliases.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h2 className="text-base font-semibold mb-2">Also Known As</h2>
                  <p className="text-sm leading-relaxed">
                    {condition.aliases.join(' • ')}
                  </p>
                </div>
              )}
            </div>

            {/* Overview Section */}
            {condition.meta_desc && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Overview</h3>
                <ConditionContent content={condition.meta_desc} />
              </div>
            )}

            {/* Detailed Information Section */}
            {condition.full_summary && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Detailed Information</h3>
                <ConditionContent content={condition.full_summary} />
              </div>
            )}

            {/* Additional Resources Section */}
            {(condition.primary_institute || condition.sites?.length > 0) && (
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold mb-4">Additional Resources</h3>
                
                {condition.primary_institute && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-2">Primary Institute</h4>
                    <a 
                      href={condition.primary_institute.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline"
                    >
                      {condition.primary_institute.name}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </div>
                )}

                {condition.sites?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Related Resources</h4>
                    <ul className="space-y-2">
                      {condition.sites.map((site: any, index: number) => (
                        <li key={index}>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline"
                          >
                            {site.title}
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                          {site.organizations?.length > 0 && (
                            <span className="text-sm ml-2">
                              ({site.organizations.join(', ')})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 