import React, { useState } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const AuthPage = () => {
  const [selectedRole, setSelectedRole] = useState<'student' | 'academy' | null>(null);
  const navigate = useNavigate();
  const handleRoleSelection = (role: 'student' | 'academy') => {
    setSelectedRole(role);
  };
  const handleBack = () => {
    setSelectedRole(null);
  };
  return <div className="min-h-screen bg-breneo-lightgray flex flex-col">
      {/* Simple header */}
      <header className="bg-white py-3 px-4 md:py-4 md:px-6 shadow-sm">
        <div className="container mx-auto">
          <a href="/" className="flex items-center space-x-2">
            <img src="/lovable-uploads/a27089ec-2666-4c11-a0e0-0d8ea54e1d39.png" alt="Breneo Logo" className="h-8 md:h-10" />
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center py-6 px-3 md:py-12 md:px-4">
        <div className="w-full max-w-md">
          {!selectedRole ? <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold text-foreground mb-2">
                  Welcome to Breneo
                </h1>
                <p className="text-muted-foreground">
                  Choose your account type to get started
                </p>
              </div>

              <div className="space-y-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20" onClick={() => handleRoleSelection('student')}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Student Registration</h3>
                        <p className="text-sm text-muted-foreground">
                          Join courses, learn new skills, and advance your career with our comprehensive learning platform
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 border-2 border-border rounded-full"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20" onClick={() => handleRoleSelection('academy')}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-secondary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Academy Registration</h3>
                        <p className="text-sm text-muted-foreground">
                          Create and manage courses, track student progress, and build your educational platform
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 border-2 border-border rounded-full"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div> : <div>
              <div className="mb-4">
                <button onClick={handleBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Back to role selection
                </button>
              </div>
              <AuthForm initialRole={selectedRole} initialIsSignUp={true} onRequestSignIn={() => navigate('/auth/login')} />
            </div>}
        </div>
      </main>

      {/* Simple footer */}
      <footer className="bg-white py-3 px-4 md:py-4 md:px-6 border-t">
        <div className="container mx-auto">
          <p className="text-xs md:text-sm text-gray-500 text-center">
            © {new Date().getFullYear()} Breneo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>;
};
export default AuthPage;