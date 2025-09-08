import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Mail, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  enrolled: boolean;
  popular: boolean;
  image: string;
  description: string;
  topics: string[];
  required_skills: string[];
}

interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url: string;
  contact_email?: string; // Optional for public view
  is_verified: boolean;
  logo_url?: string;
}

const AcademyPage = () => {
  const { academyName } = useParams<{ academyName: string }>();
  const { user } = useAuth();

  // Fetch academy profile - use secure view for unauthenticated users
  const { data: academyProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['academy-profile', academyName, user?.id],
    queryFn: async () => {
      if (!academyName) return null;
      
      if (user) {
        // Authenticated users can see full profile with contact info
        const { data, error } = await supabase
          .from('academy_profiles')
          .select('*')
          .eq('academy_name', decodeURIComponent(academyName))
          .single();

        if (error) {
          console.error('Error fetching academy profile:', error);
          return null;
        }

        return data as AcademyProfile;
      } else {
        // Unauthenticated users get limited profile without contact info
        const { data, error } = await supabase
          .from('public_academy_profiles')
          .select('*')
          .eq('academy_name', decodeURIComponent(academyName))
          .single();

        if (error) {
          console.error('Error fetching public academy profile:', error);
          return null;
        }

        return data as AcademyProfile;
      }
    },
    enabled: !!academyName
  });

  // Fetch courses by academy
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['academy-courses', academyName],
    queryFn: async () => {
      if (!academyName) return [];
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('provider', decodeURIComponent(academyName))
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching academy courses:', error);
        return [];
      }

      return data?.map(course => ({
        ...course,
        topics: course.topics || [],
        required_skills: course.required_skills || []
      })) || [];
    },
    enabled: !!academyName
  });

  if (!academyName) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-red-500">Academy not found</p>
          <Link to="/courses">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link to="/courses">
            <Button variant="ghost" className="text-breneo-blue hover:text-breneo-blue/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        </div>

        {/* Academy Header */}
        {profileLoading ? (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ) : academyProfile ? (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-breneo-navy">
                    {academyProfile.academy_name}
                  </h1>
                  {academyProfile.is_verified && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Verified
                    </Badge>
                  )}
                </div>
                
                {academyProfile.description && (
                  <p className="text-gray-600 mb-4 max-w-3xl">
                    {academyProfile.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-4">
                  {academyProfile.website_url && (
                    <a
                      href={academyProfile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-breneo-blue hover:text-breneo-blue/80"
                    >
                      <Globe className="w-4 h-4" />
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  
                  {academyProfile.contact_email && (
                    <a
                      href={`mailto:${academyProfile.contact_email}`}
                      className="flex items-center gap-2 text-breneo-blue hover:text-breneo-blue/80"
                    >
                      <Mail className="w-4 h-4" />
                      Contact
                    </a>
                  )}
                </div>
              </div>
              
              {academyProfile.logo_url && (
                <div className="ml-6">
                  <img
                    src={academyProfile.logo_url}
                    alt={`${academyProfile.academy_name} logo`}
                    className="w-20 h-20 object-contain rounded"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border">
            <h1 className="text-3xl font-bold text-breneo-navy mb-3">
              {decodeURIComponent(academyName)}
            </h1>
            <p className="text-gray-600">Academy profile not found</p>
          </div>
        )}

        {/* Courses Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-breneo-navy mb-4">
            Courses by {decodeURIComponent(academyName)}
          </h2>
          <p className="text-gray-600">
            {courses?.length || 0} course{courses?.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-500">Loading courses...</div>
            </div>
          ) : courses && courses.length > 0 ? (
            courses.map(course => (
              <Card key={course.id} className="overflow-hidden">
                <div className="h-40 overflow-hidden">
                  <img 
                    src={course.image} 
                    alt={course.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg">{course.title}</h3>
                    {course.popular && (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        Popular
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-500 text-sm">{course.level}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 text-sm">{course.duration}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 text-sm">{course.category}</span>
                  </div>
                  
                  <p className="text-gray-700 text-sm mb-3">{course.description}</p>
                  
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {course.topics.slice(0, 3).map((topic, index) => (
                        <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          {topic}
                        </span>
                      ))}
                      {course.topics.length > 3 && (
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          +{course.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex flex-wrap gap-1">
                      {course.required_skills.slice(0, 2).map((skill, index) => (
                        <span key={index} className="bg-breneo-blue/10 text-breneo-blue text-xs px-2 py-1 rounded">
                          {skill}
                        </span>
                      ))}
                      {course.required_skills.length > 2 && (
                        <span className="bg-breneo-blue/10 text-breneo-blue text-xs px-2 py-1 rounded">
                          +{course.required_skills.length - 2}
                        </span>
                      )}
                    </div>
                    <Button size="sm" variant={course.enrolled ? "outline" : "default"} className={course.enrolled ? "" : "bg-breneo-blue hover:bg-breneo-blue/90"}>
                      {course.enrolled ? 'Continue' : 'Enroll'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border">
              <p className="text-gray-500 mb-4">
                No courses found for {decodeURIComponent(academyName)}
              </p>
              <Link to="/courses">
                <Button variant="outline">
                  Browse All Courses
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AcademyPage;