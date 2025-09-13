import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SkillBasedJobFilter } from '@/components/skills/SkillBasedJobFilter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateSkillScores } from '@/utils/skillTestUtils';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  url: string;
  created_at: string;
  company_logo?: string;
  remote?: boolean;
}

const fetchJobs = async (searchTerm: string = '') => {
  const baseUrl = 'https://remotive.com/api/remote-jobs';
  const params = new URLSearchParams();
  
  if (searchTerm) {
    params.append('search', searchTerm);
  }
  params.append('limit', '20');
  
  const response = await fetch(`${baseUrl}?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch jobs');
  }
  
  const data = await response.json();
  return data.jobs || [];
};

const JobsPage = () => {
  const { user } = useAuth();
  const [userSkillScores, setUserSkillScores] = useState<Record<string, number>>({});
  const [totalUserAnswers, setTotalUserAnswers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch user's skill scores
  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!user) return;

      try {
        const { data: answers, error } = await supabase
          .from('usertestanswers')
          .select('*')
          .eq('userid', user.id);

        if (error || !answers || answers.length === 0) {
          return;
        }

        const skillScores = calculateSkillScores(answers);
        setUserSkillScores(skillScores);
        setTotalUserAnswers(answers.length);
      } catch (error) {
        console.error('Error fetching user skills:', error);
      }
    };

    fetchUserSkills();
  }, [user]);

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['jobs', debouncedSearchTerm],
    queryFn: () => fetchJobs(debouncedSearchTerm),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate job match percentage based on user's skills
  const calculateJobMatch = (jobTitle: string, jobDescription: string) => {
    if (Object.keys(userSkillScores).length === 0 || totalUserAnswers === 0) {
      return 0; // No test results available
    }

    const jobText = `${jobTitle} ${jobDescription}`.toLowerCase();
    let matchingSkills = 0;
    let totalUserSkillWeight = 0;

    Object.entries(userSkillScores).forEach(([skill, score]) => {
      const skillWeight = (score as number) / totalUserAnswers;
      totalUserSkillWeight += skillWeight;
      
      if (jobText.includes(skill.toLowerCase())) {
        matchingSkills += skillWeight;
      }
    });

    if (totalUserSkillWeight === 0) return 0;
    
    const matchPercentage = Math.round((matchingSkills / totalUserSkillWeight) * 100);
    return Math.min(matchPercentage, 95); // Cap at 95% to be realistic
  };

  // Transform and filter jobs
  const transformedJobs = jobs.map((job: any) => {
    const matchPercentage = calculateJobMatch(job.title, job.description || '');
    
    return {
      id: job.id,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location || 'Remote',
      type: job.job_type || 'Full-time',
      description: job.description?.substring(0, 200) + '...' || 'No description available',
      url: job.url,
      remote: true,
      postedAt: new Date(job.publication_date).toLocaleDateString(),
      match: matchPercentage,
      requirements: ['Remote work', 'Flexible hours', 'Competitive salary'],
      company_logo: job.company_logo
    };
  });

  // Enhanced filtering with skill-based matching and sorting by match percentage
  const filteredJobs = transformedJobs
    .filter((job: any) => {
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(job.type);
      const matchesLocation = selectedLocation === 'all' || job.location.toLowerCase().includes(selectedLocation.toLowerCase());
      const matchesRemote = !remoteOnly || job.remote;
      
      // Skill-based filtering - check if job title or description contains selected skills
      const matchesSkills = selectedSkills.length === 0 || 
        selectedSkills.some(skill => 
          job.title.toLowerCase().includes(skill.toLowerCase()) ||
          job.description.toLowerCase().includes(skill.toLowerCase())
        );
      
      return matchesType && matchesLocation && matchesRemote && matchesSkills;
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => b.match - a.match); // Sort by match percentage from highest to lowest

  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTypes([]);
    setSelectedLocation('all');
    setRemoteOnly(false);
    setSelectedSkills([]);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-breneo-navy mb-6">Live Job Offers</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-3">
            <Input
              placeholder="Search remote jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-[24px]"
            />
          </div>
          <div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="rounded-[24px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent className="rounded-[24px]">
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="usa">USA</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
                <SelectItem value="worldwide">Worldwide</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Filters sidebar */}
          <div className="space-y-6">
            <Card className="rounded-[24px]">
              <CardContent className="p-5">
                {/* Skill-based filtering */}
                <SkillBasedJobFilter 
                  selectedSkills={selectedSkills}
                  onSkillsChange={setSelectedSkills}
                />
                
                <Separator className="my-4" />
                
                <h3 className="font-medium mb-3">Job Type</h3>
                <div className="space-y-2">
                  {['Full-time', 'Part-time', 'Contract', 'Freelance'].map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`job-type-${type}`} 
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => handleTypeToggle(type)}
                      />
                      <label htmlFor={`job-type-${type}`} className="text-sm">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-4" />
                
                <h3 className="font-medium mb-3">Remote Options</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remote-only" 
                    checked={remoteOnly}
                    onCheckedChange={(checked) => setRemoteOnly(checked as boolean)}
                  />
                  <label htmlFor="remote-only" className="text-sm">
                    Remote only
                  </label>
                </div>
                
                <Separator className="my-4" />
                
                <Button 
                  variant="outline" 
                  className="w-full rounded-[24px]"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Job listings */}
          <div className="md:col-span-3">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="rounded-[24px]">
                    <CardContent className="p-5">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-gray-50 rounded-[24px] border">
                <p className="text-red-500 mb-4">Failed to load jobs. Please try again.</p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="rounded-[24px]"
                >
                  Retry
                </Button>
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className="space-y-4">
                {selectedSkills.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-[24px] p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      Showing jobs filtered by your skills: <strong>{selectedSkills.join(', ')}</strong>
                    </p>
                  </div>
                )}
               
                {filteredJobs.map((job: any) => (
                  <Card key={job.id} className="overflow-hidden rounded-[24px]">
                    <CardContent className="p-0">
                      <div className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              {job.company_logo && (
                                <img 
                                  src={job.company_logo} 
                                  alt={`${job.company} logo`}
                                  className="w-12 h-12 rounded-[24px] object-contain"
                                />
                              )}
                              <div className="flex-1">
                                <h3 className="font-medium text-lg">{job.title}</h3>
                                <p className="text-gray-500">{job.company} • {job.location}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-[24px]">
                                    {job.type}
                                  </span>
                                  {job.remote && (
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-[24px]">
                                      Remote
                                    </span>
                                  )}
                                  <span className="text-gray-500 text-xs">
                                    Posted {job.postedAt}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right md:text-center">
                            <div className="bg-breneo-blue/10 text-breneo-blue inline-flex px-3 py-1 rounded-[24px] text-sm font-medium">
                              {job.match}% Match
                            </div>
                          </div>
                        </div>
                        
                        <p className="mt-4 text-gray-700" dangerouslySetInnerHTML={{ __html: job.description }} />
                        
                        <div className="mt-3">
                          <h4 className="text-sm font-medium mb-1">Benefits:</h4>
                          <ul className="text-sm text-gray-700 list-disc pl-5">
                            {job.requirements.map((req: string, index: number) => (
                              <li key={index}>{req}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="mt-5 flex justify-end">
                          <Button 
                            className="bg-breneo-blue hover:bg-breneo-blue/90 rounded-[24px]"
                            onClick={() => window.open(job.url, '_blank')}
                          >
                            Apply Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-[24px] border">
                <p className="text-gray-500 mb-4">No jobs found matching your criteria</p>
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="rounded-[24px]"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default JobsPage;
