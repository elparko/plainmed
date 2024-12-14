import React from 'react';
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/components/theme-provider';
import LogoBlack from "@/assets/logo_black.png";
import LogoWhite from "@/assets/logo_white.png";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative pb-48">
      <header className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-accent rounded-full transition-colors"
            aria-label="Back to home page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold ml-2">Dashboard</h1>
        </div>
        <div className="flex items-center">
          {/* Empty div to maintain layout - theme toggle from Layout will appear here */}
          <div className="w-9 h-9" /> {/* Same size as theme toggle button */}
        </div>
      </header>
      
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Medical History Card */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Medical History</h2>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">View and update your medical history</p>
              <Button 
                variant="outline"
                onClick={() => navigate('/medical-history')}
              >
                View History
              </Button>
            </CardContent>
          </Card>

          {/* Personal Information Card */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Personal Information</h2>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">Manage your personal details</p>
              <Button 
                variant="outline"
                onClick={() => navigate('/profile')}
              >
                Update Info
              </Button>
            </CardContent>
          </Card>

          {/* About Project Card */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">About Project</h2>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">Learn more about plainhealth.app and its features</p>
              <Button 
                variant="outline"
                onClick={() => navigate('/about')}
              >
                Learn More
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Logo section - positioned at bottom */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <img 
            src={theme === 'dark' ? LogoWhite : LogoBlack}
            alt="PlainHealth Logo"
            className="w-32 h-32 object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 