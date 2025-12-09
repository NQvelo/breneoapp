/**
 * Job Notification Service
 * 
 * Service for checking new jobs matching user skills and creating notifications
 */

import { supabase } from "@/integrations/supabase/client";
import { fetchActiveJobs } from "@/api/jobs/jobService";
import { ApiJob } from "@/api/jobs/types";
import { getUserTestAnswers, calculateSkillScores } from "@/utils/skillTestUtils";
import { filterATSJobs } from "@/utils/jobFilterUtils";
import { numericIdToUuid } from "@/lib/utils";

interface JobNotification {
  job_id: string;
  user_id: string;
  notified_at: string;
}

/**
 * Get user's top skills from test answers
 */
export const getUserSkills = async (userId: string | number): Promise<string[]> => {
  try {
    const answers = await getUserTestAnswers(userId);
    if (!answers || answers.length === 0) {
      return [];
    }

    const skillScores = calculateSkillScores(answers);
    // Get top 5 skills
    const topSkills = Object.entries(skillScores)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([skill]) => skill);

    return topSkills;
  } catch (error) {
    console.error("Error fetching user skills:", error);
    return [];
  }
};

/**
 * Extract skills from a job posting
 * Uses the same skill extraction logic as JobsPage for consistency
 */
const extractJobSkills = (job: ApiJob): string[] => {
  const skills: string[] = [];
  const textToSearch = [
    job.job_title || job.title || "",
    job.description || job.job_description || "",
    job.job_required_experience || job.required_experience || "",
    // Handle skills arrays
    ...(Array.isArray(job.required_skills) ? job.required_skills : []),
    ...(Array.isArray(job.skills) ? job.skills : []),
    ...(Array.isArray(job.job_skills) ? job.job_skills : []),
    // Handle skills as strings (comma-separated)
    ...(typeof job.required_skills === "string" ? job.required_skills.split(",").map(s => s.trim()) : []),
    ...(typeof job.skills === "string" ? job.skills.split(",").map(s => s.trim()) : []),
    ...(typeof job.job_skills === "string" ? job.job_skills.split(",").map(s => s.trim()) : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Common tech skills keywords - matching JobsPage logic
  const skillKeywords: Record<string, string[]> = {
    javascript: [
      "javascript",
      "js",
      "node.js",
      "nodejs",
      "react",
      "vue",
      "angular",
    ],
    python: ["python", "django", "flask", "fastapi"],
    java: ["java", "spring", "spring boot"],
    "c++": ["c++", "cpp", "c plus plus"],
    "c#": ["c#", "csharp", "dotnet", ".net"],
    go: ["go", "golang"],
    rust: ["rust"],
    php: ["php", "laravel", "symfony"],
    ruby: ["ruby", "rails"],
    swift: ["swift", "ios"],
    kotlin: ["kotlin", "android"],
    typescript: ["typescript", "ts"],
    html: ["html", "html5"],
    css: ["css", "css3", "sass", "scss", "tailwind"],
    sql: ["sql", "mysql", "postgresql", "mongodb", "database"],
    react: ["react", "reactjs", "react.js"],
    vue: ["vue", "vuejs", "vue.js"],
    angular: ["angular", "angularjs"],
    "node.js": ["node.js", "nodejs", "node"],
    express: ["express", "express.js"],
    django: ["django"],
    flask: ["flask"],
    spring: ["spring", "spring boot"],
    laravel: ["laravel"],
    rails: ["rails", "ruby on rails"],
    git: ["git", "github", "gitlab"],
    docker: ["docker", "containerization"],
    kubernetes: ["kubernetes", "k8s"],
    aws: ["aws", "amazon web services"],
    azure: ["azure", "microsoft azure"],
    gcp: ["gcp", "google cloud", "google cloud platform"],
    linux: ["linux", "unix"],
    "machine learning": [
      "machine learning",
      "ml",
      "deep learning",
      "neural network",
    ],
    "data science": ["data science", "data analysis", "data analytics"],
    ai: ["artificial intelligence", "ai", "nlp", "natural language processing"],
    blockchain: ["blockchain", "ethereum", "solidity", "web3"],
    devops: ["devops", "ci/cd", "continuous integration"],
    testing: ["testing", "qa", "quality assurance", "test automation"],
    ui: ["ui", "user interface", "ux", "user experience"],
    design: ["design", "figma", "sketch", "adobe"],
    // Add skill test skill mappings
    developer: ["developer", "development", "programming", "coding", "software engineer", "software developer"],
    designer: ["designer", "design", "ui", "ux", "graphic designer", "visual designer"],
    marketer: ["marketer", "marketing", "digital marketing", "social media", "content marketing"],
    analyst: ["analyst", "analysis", "data analyst", "business analyst", "data analytics"],
    teacher: ["teacher", "teaching", "education", "instructor", "trainer"],
    "project manager": ["project manager", "pm", "project management", "scrum master", "product manager"],
  };

  // Check for each skill
  Object.keys(skillKeywords).forEach((skill) => {
    const keywords = skillKeywords[skill];
    if (keywords.some((keyword) => textToSearch.includes(keyword))) {
      skills.push(skill);
    }
  });

  return [...new Set(skills)]; // Remove duplicates
};

/**
 * Check if a job matches user skills
 * Uses improved matching algorithm that extracts job skills and compares with user skills
 */
export const jobMatchesSkills = (job: ApiJob, userSkills: string[]): boolean => {
  if (userSkills.length === 0) return false;

  // Extract skills from job posting
  const jobSkills = extractJobSkills(job);
  
  // If no skills found in job, use text-based matching as fallback
  if (jobSkills.length === 0) {
    // Build comprehensive job text from all relevant fields
    const jobText = [
      job.job_title || job.title || "",
      job.description || job.job_description || "",
      job.employer_name || job.company_name || job.company || "",
      job.job_required_experience || job.required_experience || job.experience || "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    // Normalize skills for better matching (handle common variations)
    const normalizeSkill = (skill: string): string[] => {
      const normalized = skill.toLowerCase().trim();
      const variations = [normalized];
      
      // Add common variations
      if (normalized.includes("developer")) {
        variations.push("development", "programming", "coding", "software");
      }
      if (normalized.includes("designer")) {
        variations.push("design", "ui", "ux", "graphic");
      }
      if (normalized.includes("marketer")) {
        variations.push("marketing", "digital marketing", "social media");
      }
      if (normalized.includes("analyst")) {
        variations.push("analysis", "data", "analytics");
      }
      if (normalized.includes("manager")) {
        variations.push("management", "lead", "coordinate");
      }
      
      return variations;
    };

    // Check if any user skill (or its variations) appears in the job text
    return userSkills.some((skill) => {
      const skillVariations = normalizeSkill(skill);
      return skillVariations.some((variation) => {
        // Exact match or word boundary match for better accuracy
        const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(jobText);
      });
    });
  }

  // Normalize skills for comparison (lowercase, remove spaces)
  const normalizeSkill = (skill: string) =>
    skill.toLowerCase().trim().replace(/\s+/g, " ");

  const normalizedUserSkills = userSkills.map(normalizeSkill);
  const normalizedJobSkills = jobSkills.map(normalizeSkill);

  // Find matching skills
  const matchingSkills = normalizedUserSkills.filter((userSkill) =>
    normalizedJobSkills.some((jobSkill) => {
      // Exact match
      if (userSkill === jobSkill) return true;
      // Partial match (one skill contains the other)
      if (userSkill.includes(jobSkill) || jobSkill.includes(userSkill))
        return true;
      return false;
    })
  );

  // Job matches if at least one skill matches
  return matchingSkills.length > 0;
};

/**
 * Get notified job IDs for a user
 */
export const getNotifiedJobIds = async (userId: string): Promise<Set<string>> => {
  try {
    const { data, error } = await supabase
      .from("job_notifications")
      .select("job_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching notified jobs:", error);
      return new Set();
    }

    return new Set((data || []).map((n) => n.job_id));
  } catch (error) {
    console.error("Error fetching notified jobs:", error);
    return new Set();
  }
};

/**
 * Mark a job as notified for a user
 */
export const markJobAsNotified = async (
  userId: string,
  jobId: string
): Promise<void> => {
  try {
    const { error } = await supabase.from("job_notifications").insert({
      user_id: userId,
      job_id: jobId,
      notified_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error marking job as notified:", error);
    }
  } catch (error) {
    console.error("Error marking job as notified:", error);
  }
};

/**
 * Create a notification in the database
 */
export const createJobNotification = async (
  userId: string,
  job: ApiJob
): Promise<void> => {
  try {
    const jobTitle = job.job_title || job.title || "New Job";
    const companyName = job.employer_name || job.company_name || job.company || "Company";
    
    const { error } = await supabase.from("notifications").insert({
      title: "New Job Match! 🎯",
      message: `${jobTitle} at ${companyName} matches your skills`,
      type: "info",
      recipient_id: userId,
      is_read: false,
    });

    if (error) {
      console.error("Error creating notification:", error);
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

/**
 * Check for new jobs matching user skills
 */
export const checkForNewJobMatches = async (
  userId: string | number
): Promise<ApiJob[]> => {
  try {
    // Get user skills
    const userSkills = await getUserSkills(userId);
    if (userSkills.length === 0) {
      console.log("No user skills found, skipping job check");
      return [];
    }

    console.log("Checking for jobs matching skills:", userSkills);

    // Fetch recent jobs (last 7 days)
    const jobsResponse = await fetchActiveJobs({
      query: "",
      filters: {
        country: "",
        countries: [],
        jobTypes: [],
        isRemote: false,
        datePosted: "week", // Check jobs from last week
        skills: userSkills,
      },
      page: 1,
      pageSize: 50, // Check up to 50 jobs
    });

    const jobs = jobsResponse.jobs || [];
    console.log(`Found ${jobs.length} jobs to check`);

    // Filter to only allowed ATS platforms first
    const allowedATSJobs = filterATSJobs(jobs);
    console.log(`Filtered to ${allowedATSJobs.length} jobs from allowed ATS platforms`);

    // Get already notified job IDs
    const userIdStr = String(userId);
    const notifiedJobIds = await getNotifiedJobIds(numericIdToUuid(userIdStr));

    // Filter for new matching jobs
    const newMatchingJobs: ApiJob[] = [];

    for (const job of allowedATSJobs) {
      const jobId = job.job_id || job.id || "";
      if (!jobId) continue;

      // Skip if already notified
      if (notifiedJobIds.has(jobId)) {
        continue;
      }

      // Check if job matches user skills
      if (jobMatchesSkills(job, userSkills)) {
        newMatchingJobs.push(job);
      }
    }

    console.log(`Found ${newMatchingJobs.length} new matching jobs`);

    // Create notifications for new matching jobs
    for (const job of newMatchingJobs) {
      const jobId = job.job_id || job.id || "";
      if (!jobId) continue;

      // Create notification in database
      await createJobNotification(numericIdToUuid(userIdStr), job);

      // Mark as notified
      await markJobAsNotified(numericIdToUuid(userIdStr), jobId);
    }

    return newMatchingJobs;
  } catch (error) {
    console.error("Error checking for new job matches:", error);
    return [];
  }
};

