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

  useEffect(() => {
    const loadPersonalInfo = async () => {
      if (!user) return
      setError(null)
      try {
        const data = await getPersonalInfo(user.id)
        console.log('Loaded personal info:', data)
        const formattedData: PersonalInfo = {
          ageRange: data?.ageRange || '',
          gender: data?.gender || '',
          language: data?.language || ''
        }
        setPersonalInfo(formattedData)
      } catch (error) {
        console.error('Error loading personal info:', error)
        setError('Unable to load personal information. Please try again later.')
        toast.error('Error loading personal information')
      } finally {
        setLoading(false)
      }
    }

    loadPersonalInfo()
  }, [user])

  const handleEditComplete = async (data: PersonalInfo) => {
    if (!user) return
    
    try {
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
      toast.error('Failed to save personal information')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
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
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
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