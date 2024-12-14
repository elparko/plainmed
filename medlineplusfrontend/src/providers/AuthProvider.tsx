import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type SurveyData = {
  personalInfo?: {
    ageRange: string
    gender: string
    language: string
  }
  medicalHistory?: {
    conditions: Array<{
      name: string
      concept_id: string
      semantic_type: string
      sources: string
    }>
  }
}

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  surveyData: SurveyData | null
  updateSurveyData: (data: SurveyData) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  surveyData: null,
  updateSurveyData: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null)

  const fetchSurveyData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_survey_data')
        .select('personal_info, medical_history')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (data) {
        setSurveyData({
          personalInfo: data.personal_info,
          medicalHistory: data.medical_history,
        })
      }
    } catch (error) {
      console.error('Error fetching survey data:', error)
    }
  }

  const updateSurveyData = async (newData: any) => {
    console.log('Updating survey data with:', newData);
    if (!user) {
      console.error('No user found when trying to update survey data');
      return;
    }

    try {
      // Update state first for immediate UI response
      setSurveyData(newData);
      
      const { error } = await supabase
        .from('user_survey_data')
        .upsert({
          id: user.id,
          personal_info: newData.personalInfo,
          medical_history: newData.medicalHistory,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
      
      console.log('Survey data updated to:', newData);
    } catch (error) {
      console.error('Error updating survey data:', error)
      // Revert state if database update fails
      setSurveyData(surveyData);
      throw error
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchSurveyData(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchSurveyData(session.user.id)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user, loading, surveyData, updateSurveyData }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 