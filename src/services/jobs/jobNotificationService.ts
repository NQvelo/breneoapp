/**
 * Job Notification Service
 *
 * Checks new jobs matching user skills and creates notifications via Django API.
 */

import { fetchActiveJobs } from "@/api/jobs/jobService";
import { ApiJob } from "@/api/jobs/types";
import {
  getUserTestAnswers,
  calculateSkillScores,
} from "@/utils/skillTestUtils";
import { filterATSJobs } from "@/utils/jobFilterUtils";
import {
  createMyNotification,
  fetchNotifiedJobIds,
  markJobNotified,
} from "@/api/notifications/notificationsApi";

/**
 * Get user's top skills from test answers
 */
export const getUserSkills = async (
  userId: string | number,
): Promise<string[]> => {
  try {
    const answers = await getUserTestAnswers(userId);
    if (!answers || answers.length === 0) {
      return [];
    }

    const skillScores = calculateSkillScores(answers);
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
 */
const extractJobSkills = (job: ApiJob): string[] => {
  const skills: string[] = [];
  const textToSearch = [
    job.job_title || job.title || "",
    job.description || job.job_description || "",
    job.job_required_experience || job.required_experience || "",
    ...(Array.isArray(job.skills_required) ? job.skills_required : []),
    ...(Array.isArray(job.required_skills) ? job.required_skills : []),
    ...(Array.isArray(job.skills) ? job.skills : []),
    ...(Array.isArray(job.job_skills) ? job.job_skills : []),
    ...(typeof job.skills_required === "string"
      ? job.skills_required.split(",").map((s) => s.trim())
      : []),
    ...(typeof job.required_skills === "string"
      ? job.required_skills.split(",").map((s) => s.trim())
      : []),
    ...(typeof job.skills === "string"
      ? job.skills.split(",").map((s) => s.trim())
      : []),
    ...(typeof job.job_skills === "string"
      ? job.job_skills.split(",").map((s) => s.trim())
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

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
  };

  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    if (keywords.some((keyword) => textToSearch.includes(keyword))) {
      skills.push(skill);
    }
  }

  return skills;
};

const jobMatchesSkills = (job: ApiJob, userSkills: string[]): boolean => {
  if (userSkills.length === 0) return false;
  const jobSkills = extractJobSkills(job);
  const matchingSkills = userSkills.filter((userSkill) =>
    jobSkills.some(
      (jobSkill) =>
        jobSkill.toLowerCase().includes(userSkill.toLowerCase()) ||
        userSkill.toLowerCase().includes(jobSkill.toLowerCase()),
    ),
  );
  return matchingSkills.length > 0;
};

export const createJobNotification = async (
  _userId: string,
  job: ApiJob,
): Promise<void> => {
  try {
    const jobTitle = job.job_title || job.title || "New Job";
    const companyName =
      job.employer_name || job.company_name || job.company || "Company";
    const jobId = String(job.job_id || job.id || "");
    const companyLogo =
      job.employer_logo ||
      job.company_logo ||
      job.logo_url ||
      job.company_logo_url ||
      "";

    await createMyNotification({
      title: "New Job Match! 🎯",
      message: `${jobTitle} at ${companyName} matches your skills`,
      type: "info",
      kind: "job_match",
      metadata: {
        ...(jobId ? { job_id: jobId } : {}),
        ...(companyName ? { company_name: companyName } : {}),
        ...(companyLogo ? { company_logo: companyLogo } : {}),
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const checkForNewJobMatches = async (
  userId: string | number,
): Promise<ApiJob[]> => {
  try {
    const userSkills = await getUserSkills(userId);
    if (userSkills.length === 0) {
      return [];
    }

    const jobsResponse = await fetchActiveJobs({
      query: "",
      filters: {
        country: "",
        countries: [],
        jobTypes: [],
        isRemote: false,
        datePosted: "week",
        skills: userSkills,
      },
      page: 1,
      pageSize: 50,
    });

    const jobs = jobsResponse.jobs || [];
    const allowedATSJobs = filterATSJobs(jobs);
    const notifiedJobIds = await fetchNotifiedJobIds();
    const newMatchingJobs: ApiJob[] = [];

    for (const job of allowedATSJobs) {
      const jobId = job.job_id || job.id || "";
      if (!jobId) continue;
      if (notifiedJobIds.has(String(jobId))) continue;
      if (jobMatchesSkills(job, userSkills)) {
        newMatchingJobs.push(job);
      }
    }

    for (const job of newMatchingJobs) {
      const jobId = job.job_id || job.id || "";
      if (!jobId) continue;
      await createJobNotification(String(userId), job);
      await markJobNotified(String(jobId));
    }

    return newMatchingJobs;
  } catch (error) {
    console.error("Error checking for new job matches:", error);
    return [];
  }
};
