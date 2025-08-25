import React, { useEffect } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Login | Breneo';
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', 'Log in to your Breneo account.');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}/auth/login`);
  }, []);

  return (
    <div className="min-h-screen bg-breneo-lightgray flex flex-col">
      <header className="bg-white py-3 px-4 md:py-4 md:px-6 shadow-sm">
        <div className="container mx-auto">
          <a href="/" className="flex items-center space-x-2">
            <img src="/lovable-uploads/a27089ec-2666-4c11-a0e0-0d8ea54e1d39.png" alt="Breneo Logo" className="h-8 md:h-10" />
          </a>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-6 px-3 md:py-12 md:px-4">
        <div className="w-full max-w-md">
          <AuthForm onRequestSignUp={() => navigate('/auth/signup')} />
        </div>
      </main>

      <footer className="bg-white py-3 px-4 md:py-4 md:px-6 border-t">
        <div className="container mx-auto">
          <p className="text-xs md:text-sm text-gray-500 text-center">
            © {new Date().getFullYear()} Breneo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
