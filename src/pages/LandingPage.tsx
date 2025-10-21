import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const LandingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-breneo-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white py-4 px-3 md:px-6 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img
              src="lovable-uploads/breneo_logo.png"
              alt="Breneo Logo"
              className="h-10"
            />
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <a
              href="#features"
              className="text-gray-600 hover:text-breneo-navy transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-gray-600 hover:text-breneo-navy transition-colors"
            >
              How It Works
            </a>
            <Button asChild variant="ghost">
              <Link to="/auth/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-breneo-blue hover:bg-breneo-blue/90">
              <Link to="/auth/login">Get Started</Link>
            </Button>
          </div>
          <div className="md:hidden">
            <Button variant="ghost" size="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-white to-breneo-blue/5 py-16 md:py-24 flex-grow">
        <div className="container mx-auto px-3 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-breneo-navy mb-6">
                Unlock Your Career Potential with AI-Powered Learning
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Breneo helps you assess your skills, discover personalized job
                matches, and follow custom learning paths designed just for you.
              </p>
              <div className="space-x-4">
                <Button
                  asChild
                  className="bg-breneo-blue hover:bg-breneo-blue/90 text-white px-6 py-2.5"
                >
                  <Link to="/auth/login">Start Your Journey</Link>
                </Button>
                <Button variant="outline">Learn More</Button>
              </div>
              <div className="mt-8 flex items-center space-x-2 text-sm text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
                <span>No credit card required</span>
              </div>
            </div>
            <div className="hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80"
                alt="People collaborating"
                className="rounded-lg shadow-lg w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-3 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-breneo-navy mb-4">
              Key Features
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Breneo combines AI-powered assessment, personalized learning
              paths, and targeted job matching to help you succeed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
              <div className="w-12 h-12 bg-breneo-blue/10 rounded-lg flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#19B5FE"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">
                AI Skill Assessment
              </h3>
              <p className="text-gray-600">
                Our adaptive tests evaluate your real skills and strengths,
                providing accurate results that evolve with you.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
              <div className="w-12 h-12 bg-breneo-blue/10 rounded-lg flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#19B5FE"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Job Matching</h3>
              <p className="text-gray-600">
                Get job recommendations that align with your skills,
                preferences, and career goals.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
              <div className="w-12 h-12 bg-breneo-blue/10 rounded-lg flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#19B5FE"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Personalized Learning
              </h3>
              <p className="text-gray-600">
                Follow tailored learning paths designed to help you acquire the
                skills you need for your ideal career.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="container mx-auto px-3 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-breneo-navy mb-4">
              How It Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              A simple process to unlock your potential and find the right
              career path.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-8 md:left-12 w-1 bg-breneo-blue/20"></div>

              <div className="grid grid-cols-1 gap-12">
                <div className="flex gap-6 items-start">
                  <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-breneo-blue rounded-full text-white font-bold text-xl shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Create Your Profile
                    </h3>
                    <p className="text-gray-600">
                      Sign up and complete your profile by selecting your areas
                      of interest and background information.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-breneo-blue rounded-full text-white font-bold text-xl shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Take the Skill Test
                    </h3>
                    <p className="text-gray-600">
                      Complete our adaptive assessment that learns about your
                      unique skills and strengths to provide an accurate
                      profile.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-breneo-blue rounded-full text-white font-bold text-xl shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Explore Opportunities
                    </h3>
                    <p className="text-gray-600">
                      Browse personalized job matches and learning paths based
                      on your assessment results.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-breneo-blue rounded-full text-white font-bold text-xl shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Grow Your Skills
                    </h3>
                    <p className="text-gray-600">
                      Enroll in recommended courses, track your progress, and
                      continually update your profile as you grow.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button asChild className="bg-breneo-blue hover:bg-breneo-blue/90">
              <Link to="/auth/login">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-3 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-breneo-navy mb-4">
              What Our Users Say
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover how Breneo has helped professionals advance their
              careers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-breneo-accent rounded-full mr-4"></div>
                <div>
                  <h4 className="font-medium">Alex Johnson</h4>
                  <p className="text-sm text-gray-500">UX Designer</p>
                </div>
              </div>
              <p className="text-gray-600">
                "Breneo's skill assessment was eye-opening. It helped me
                identify strengths I didn't realize I had and guided me to the
                perfect UX design role."
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-breneo-accent rounded-full mr-4"></div>
                <div>
                  <h4 className="font-medium">Maria Garcia</h4>
                  <p className="text-sm text-gray-500">Marketing Specialist</p>
                </div>
              </div>
              <p className="text-gray-600">
                "The personalized learning path was exactly what I needed. I
                gained relevant skills quickly and landed a job that was a
                perfect match for my abilities."
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-breneo-accent rounded-full mr-4"></div>
                <div>
                  <h4 className="font-medium">David Chen</h4>
                  <p className="text-sm text-gray-500">Frontend Developer</p>
                </div>
              </div>
              <p className="text-gray-600">
                "Breneo matched me with job opportunities I wouldn't have found
                otherwise. The skill test was spot-on in identifying what I'm
                good at."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-breneo-blue/5">
        <div className="container mx-auto px-3 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-breneo-navy mb-4">
              Ready to Accelerate Your Career?
            </h2>
            <p className="text-gray-600 mb-8">
              Join thousands of professionals who are discovering their true
              potential with Breneo's AI-powered platform.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-breneo-blue hover:bg-breneo-blue/90"
            >
              <Link to="/auth/login">Start Your Free Assessment</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-breneo-navy text-white py-12">
        <div className="container mx-auto px-3 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img
                src="lovable-uploads/breneo_logo.png"
                alt="Breneo Logo"
                className="h-10 mb-4"
              />
              <p className="text-gray-300 text-sm">
                Empowering careers through AI-powered skill assessment and
                personalized learning.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Press
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Testimonials
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Partners
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-300 text-sm">
              © {new Date().getFullYear()} Breneo. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <span className="sr-only">Facebook</span>
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <span className="sr-only">Twitter</span>
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <span className="sr-only">LinkedIn</span>
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
