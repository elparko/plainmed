import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card"
import { ThemeProvider, useTheme } from "./components/theme-provider"
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from "react-router-dom"
import { Survey } from "./pages/Survey"
import { supabase } from "@/lib/supabase"
import Auth from "@/components/Auth"
import Dashboard from "@/components/Dashboard"
import { Button } from "./components/ui/button"
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SurveyProvider } from "@/contexts/SurveyContext"
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Profile } from '@/components/Profile'
import { MedicalHistoryView } from '@/components/MedicalHistoryView'
import { ConditionDetailView } from './components/ConditionDetailView'
import { Layout } from "@/components/Layout"
import About from "@/components/About"
import LogoBlack from "./assets/logo_black.png"
import LogoWhite from "./assets/logo_white.png"

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <Routes>
      <Route path="/" element={<Home handleLogout={handleLogout} />} />
      <Route 
        path="/login" 
        element={
          user ? <Navigate to="/" replace /> : <Auth />
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          user ? <Dashboard /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/survey" 
        element={
          user ? <Survey /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/profile" 
        element={
          user ? <Profile /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/medical-history" 
        element={
          user ? <MedicalHistoryView /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/:topic_id/:title" 
        element={
          user ? <ConditionDetailView /> : <Navigate to="/login" replace />
        } 
      />
      <Route path="/about" element={<About />} />
    </Routes>
  )
}

function Home({ handleLogout }: { handleLogout: () => Promise<void> }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img 
            src={theme === 'dark' ? LogoWhite : LogoBlack} 
            alt="PlainHealth Logo" 
            className="h-8 w-8 object-contain"
          />
          <h1 className="text-xl font-semibold text-foreground">
            plainhealth.app
          </h1>
        </div>
        <div className="flex items-center gap-3 mr-14">
          {user ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate('/about')}>
                About
              </Button>
              <Button size="sm" variant="outline" onClick={handleLogout}>
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => navigate('/about')}>
                About
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            </>
          )}
        </div>
      </header>
      
      <main className="container mx-auto px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          <section className="text-center space-y-6">
            <div className="flex flex-col items-center mb-8">
              <img 
                src={theme === 'dark' ? LogoWhite : LogoBlack}
                alt="PlainHealth Logo"
                className="w-32 h-32 object-contain"
              />
            </div>
            <h2 className="text-4xl font-bold">Your Personal Health Information Assistant</h2>
            <p className="text-xl">
              Access reliable medical information, track your health history, and get personalized resources
              all in one place.
            </p>
            <div className="flex justify-center gap-4">
              {user ? (
                <Button size="lg" onClick={() => navigate('/survey')}>
                  Get Started
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={() => navigate('/login')}>
                    Get Started
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/login', { state: { isSignUp: true }})}>
                    Create Account
                  </Button>
                </>
              )}
            </div>
          </section>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personalized Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Get health information tailored to your medical history and preferences.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reliable Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Access trusted medical resources curated by healthcare professionals.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Easy to Use</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Simple interface designed to help you find what you need quickly.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Layout>
        <AuthProvider>
          <SurveyProvider>
            <LanguageProvider>
              <Router>
                <Toaster />
                <AppRoutes />
              </Router>
            </LanguageProvider>
          </SurveyProvider>
        </AuthProvider>
      </Layout>
    </ThemeProvider>
  )
}

export default App 