import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

type SurveyData = {
  personalInfo: {
    name: string
    age: number
    gender: string
  }
  medicalHistory: {
    conditions: string[]
    allergies: string[]
  }
  currentSymptoms: string[]
}

type SurveyContextType = {
  surveyData: SurveyData
  updateSurveyData: (step: keyof SurveyData, data: any) => void
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  saveSurveyData: () => Promise<void>
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined)

export const useSurveyContext = () => {
  const context = useContext(SurveyContext)
  if (!context) {
    throw new Error('useSurveyContext must be used within a SurveyProvider')
  }
  return context
}

export const SurveyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [surveyData, setSurveyData] = useState<SurveyData>({
    personalInfo: { name: '', age: 0, gender: '' },
    medicalHistory: { conditions: [], allergies: [] },
    currentSymptoms: [],
  })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const updateSurveyData = (step: keyof SurveyData, data: any) => {
    setSurveyData(prev => ({ ...prev, [step]: data }))
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const saveSurveyData = async () => {
    if (!user) throw new Error('User must be authenticated to save survey data')
    
    const { error } = await supabase
      .from('survey_responses')
      .upsert({
        user_id: user.id,
        survey_data: surveyData,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
  }

  return (
    <SurveyContext.Provider value={{ 
      surveyData, 
      updateSurveyData, 
      user,
      loading,
      signIn,
      signUp,
      signOut,
      saveSurveyData
    }}>
      {children}
    </SurveyContext.Provider>
  )
}

