import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Card, CardHeader, CardContent } from "./ui/card";

const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-accent rounded-full transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold ml-2">About plainhealth.app</h1>
        </div>
        <div className="flex items-center">
          <div className="w-9 h-9" />
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold">Our Mission</h2>
            </CardHeader>
            <CardContent>
              <p>
                plainhealth.app aims to simplify the way people manage and understand their health information. 
                We believe in making healthcare information accessible, understandable, and actionable for everyone.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold">What We Offer</h2>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li>• Personal health information management in one secure place</li>
                <li>• Easy-to-understand medical information curated by healthcare professionals</li>
                <li>• Simple and intuitive interface for managing your medical history</li>
                <li>• Privacy-focused design with secure data storage</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold">Privacy & Security</h2>
            </CardHeader>
            <CardContent>
              <p>
                Your privacy is our top priority. We employ industry-standard security measures to protect 
                your personal health information. All data is encrypted and stored securely, and we never 
                share your information without your explicit consent.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default About; 