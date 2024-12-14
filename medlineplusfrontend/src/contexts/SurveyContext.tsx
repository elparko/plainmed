import { createContext, useContext, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export type SurveyType = 'personal_info' | 'medical_history'

interface SurveyContextType {
  saveSurveyResponse: (type: SurveyType, data: any) => Promise<boolean>
  getSurveyResponse: (type: SurveyType) => Promise<any>
  loading: boolean
  error: string | null
}

const SurveyContext = createContext<SurveyContextType>({
  saveSurveyResponse: async () => false,
  getSurveyResponse: async () => null,
  loading: false,
  error: null,
})

export function SurveyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSurveyResponse = useCallback(async (surveyType: SurveyType) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('response')
        .eq('user_id', user.id)
        .eq('survey_type', surveyType)
        .single();

      if (error) throw error;
      return data?.response || null;
    } catch (error: any) {
      console.error('Error fetching survey response:', error);
      return null;
    }
  }, [user]);

  const saveSurveyResponse = async (type: SurveyType, data: any) => {
    if (!user) {
      toast.error('You must be logged in to save survey responses')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Check if response exists
      const { data: existing, error: checkError } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('user_id', user.id)
        .eq('survey_type', type)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // Not found error is ok
        throw checkError
      }

      if (existing) {
        // Update existing response
        const { error: updateError } = await supabase
          .from('survey_responses')
          .update({ 
            response: data,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        // Insert new response
        const { error: insertError } = await supabase
          .from('survey_responses')
          .insert([
            {
              user_id: user.id,
              survey_type: type,
              response: data
            }
          ])

        if (insertError) throw insertError
      }

      toast.success('Survey response saved successfully')
      return true
    } catch (error: any) {
      console.error('Error saving survey response:', error)
      setError('Failed to save survey response')
      toast.error('Failed to save survey response')
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <SurveyContext.Provider value={{
      saveSurveyResponse,
      getSurveyResponse,
      loading,
      error,
    }}>
      {children}
    </SurveyContext.Provider>
  )
}

export const useSurvey = () => useContext(SurveyContext) 