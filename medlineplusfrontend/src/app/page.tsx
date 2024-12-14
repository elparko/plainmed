'use client'

import { useAuth } from '@/contexts/AuthContext'
import Auth from '@/components/Auth'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const { user, loading } = useAuth()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Welcome to MedlinePlus</h1>
        <p className="text-xl">Logged in as: {user.email}</p>
        <div className="space-x-4">
          <button
            onClick={() => window.location.href = '/medical-history'}
            className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
          >
            Medical History Form
          </button>
          <button
            onClick={handleSignOut}
            className="px-6 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
          >
            Sign Out
          </button>
        </div>
      </div>
    </main>
  )
}

