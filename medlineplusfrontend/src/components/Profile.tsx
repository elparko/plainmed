import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { PersonalInfoForm } from './PersonalInfoForm'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from './ui/theme-toggle'
import { getPersonalInfo, createPersonalInfo } from '@/lib/api'

interface PersonalInfo {
  ageRange: string;
  gender: string;
  language: string;
}

export function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const loadPersonalInfo = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      setError(null)
      try {
        console.log('Loading personal info for user:', {
          userId: user.id,
          retryCount,
        })
        const data = await getPersonalInfo(user.id)
        console.log('Loaded personal info:', data)
        const formattedData: PersonalInfo = {
          ageRange: data?.ageRange || '',
          gender: data?.gender || '',
          language: data?.language || ''
        }
        setPersonalInfo(formattedData)
        setError(null)
      } catch (error) {
        console.error('Error loading personal info:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        setError(errorMessage)
        toast.error('Error loading personal information')
        
        // Retry up to 3 times with increasing delay
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
          }, delay)
        }
      } finally {
        setLoading(false)
      }
    }

    loadPersonalInfo()
  }, [user, retryCount])

  const handleEditComplete = async (data: PersonalInfo) => {
    if (!user) return
    
    try {
      setError(null)
      // Save to database
      await createPersonalInfo({
        user_id: user.id,
        ...data
      })
      
      // Update local state
      setPersonalInfo(data)
      setIsEditing(false)
      toast.success('Personal information updated')
    } catch (error) {
      console.error('Error saving personal info:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save personal information'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-red-500">Please log in to view your profile</p>
        <Button onClick={() => navigate('/login')}>
          Go to Login
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="relative h-16 border-b flex items-center px-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-accent rounded-full transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold ml-4">Personal Information</h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Personal Information</CardTitle>
              {!isEditing && !loading && !error && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <p className="text-red-500">{error}</p>
                <Button onClick={() => setRetryCount(prev => prev + 1)}>
                  Try Again
                </Button>
              </div>
            ) : isEditing ? (
              <PersonalInfoForm 
                onNext={handleEditComplete}
                initialData={personalInfo}
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Age Range</h3>
                    <p>{personalInfo?.ageRange || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Gender</h3>
                    <p>{personalInfo?.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Preferred Language</h3>
                    <p>{personalInfo?.language || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 