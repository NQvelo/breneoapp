import { ApiJob } from "@/api/jobs";

/**
 * Tech-related keywords to identify tech jobs
 */
const TECH_KEYWORDS = [
  // Programming languages
  "javascript",
  "typescript",
  "python",
  "java",
  "c++",
  "c#",
  "go",
  "rust",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "scala",
  "r",
  "dart",
  "perl",

  // Frameworks & Libraries
  "react",
  "angular",
  "vue",
  "node.js",
  "nodejs",
  "express",
  "django",
  "flask",
  "spring",
  "laravel",
  "rails",
  "next.js",
  "nuxt",
  "svelte",

  // Web technologies
  "html",
  "css",
  "sass",
  "scss",
  "tailwind",
  "bootstrap",
  "webpack",
  "vite",

  // Databases
  "sql",
  "mysql",
  "postgresql",
  "mongodb",
  "redis",
  "cassandra",
  "elasticsearch",
  "database",
  "dba",

  // Cloud & DevOps
  "aws",
  "azure",
  "gcp",
  "google cloud",
  "docker",
  "kubernetes",
  "k8s",
  "terraform",
  "ansible",
  "jenkins",
  "ci/cd",
  "devops",
  "sre",
  "cloud",

  // Tech roles
  "software engineer",
  "software developer",
  "programmer",
  "developer",
  "programming",
  "coding",
  "coder",
  "full stack",
  "fullstack",
  "frontend",
  "front-end",
  "backend",
  "back-end",
  "web developer",
  "mobile developer",
  "ios developer",
  "android developer",
  "react native",
  "flutter",

  // Specialized tech roles
  "data scientist",
  "data engineer",
  "data analyst",
  "machine learning",
  "ml engineer",
  "ai engineer",
  "artificial intelligence",
  "deep learning",
  "neural network",
  "computer vision",
  "nlp",
  "natural language processing",

  // Security
  "cybersecurity",
  "security engineer",
  "penetration testing",
  "ethical hacker",
  "information security",

  // QA & Testing
  "qa engineer",
  "test engineer",
  "automation engineer",
  "sdet",
  "quality assurance",
  "testing",
  "test automation",

  // Infrastructure & Systems
  "system administrator",
  "sysadmin",
  "network engineer",
  "infrastructure engineer",
  "site reliability",

  // Product & Design (tech-related)
  "product manager",
  "technical product manager",
  "ux designer",
  "ui designer",
  "product designer",
  "interaction designer",

  // Other tech terms
  "api",
  "rest api",
  "graphql",
  "microservices",
  "agile",
  "scrum",
  "git",
  "github",
  "gitlab",
  "bitbucket",
  "jira",
  "confluence",
  "code review",
  "version control",

  // Tech companies (common tech company names)
  "tech",
  "technology",
  "software",
  "saas",
  "platform",
  "startup",
  "fintech",
  "edtech",
  "healthtech",
];

/**
 * Non-tech keywords that indicate non-tech jobs (to exclude)
 */
const NON_TECH_KEYWORDS = [
  "sales",
  "marketing",
  "accountant",
  "accounting",
  "finance",
  "banking",
  "insurance",
  "real estate",
  "retail",
  "cashier",
  "waiter",
  "waitress",
  "chef",
  "cook",
  "nurse",
  "doctor",
  "physician",
  "teacher",
  "instructor",
  "tutor",
  "lawyer",
  "attorney",
  "legal",
  "driver",
  "delivery",
  "warehouse",
  "factory",
  "manufacturing",
  "construction",
  "plumber",
  "electrician",
  "mechanic",
  "barber",
  "hairdresser",
  "beauty",
  "fitness",
  "trainer",
  "coach",
  "therapist",
  "counselor",
  "social worker",
  "customer service",
  "call center",
  "receptionist",
  "administrative",
  "secretary",
  "reception",
  "cleaning",
  "janitor",
  "maintenance",
  "security guard",
  "guard",
  "officer",
];

/**
 * Check if a job is tech-related based on its title, description, and company
 */
export const isTechJob = (job: ApiJob): boolean => {
  // Extract text to search
  const textToSearch = [
    job.job_title || job.title || "",
    job.description || "",
    job.job_description || "",
    job.job_required_experience || job.required_experience || "",
    job.employer_name || job.company_name || "",
    typeof job.company === "string" ? job.company : "",
  ]
    .join(" ")
    .toLowerCase();

  // Check for non-tech keywords first (exclude these)
  const hasNonTechKeyword = NON_TECH_KEYWORDS.some((keyword) =>
    textToSearch.includes(keyword.toLowerCase())
  );

  if (hasNonTechKeyword) {
    // If it has non-tech keywords, check if it's still tech-related
    // Some jobs might have both (e.g., "Technical Sales")
    const hasStrongTechKeyword = TECH_KEYWORDS.some((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      const titleLength = (job.job_title || job.title || "").length;
      const descLength =
        typeof job.description === "string" ? job.description.length : 0;
      const jobDescLength =
        typeof job.job_description === "string"
          ? job.job_description.length
          : 0;
      return (
        textToSearch.includes(lowerKeyword) &&
        // Ensure tech keyword appears in title or description, not just company name
        textToSearch.indexOf(lowerKeyword) <
          titleLength + descLength + jobDescLength
      );
    });

    // If it has strong tech keywords in title/description, it's still tech
    if (hasStrongTechKeyword) {
      return true;
    }

    // Otherwise, exclude non-tech jobs
    return false;
  }

  // Check for tech keywords
  const hasTechKeyword = TECH_KEYWORDS.some((keyword) =>
    textToSearch.includes(keyword.toLowerCase())
  );

  return hasTechKeyword;
};

/**
 * Filter an array of jobs to only include tech-related jobs
 */
export const filterTechJobs = (jobs: ApiJob[]): ApiJob[] => {
  return jobs.filter(isTechJob);
};

/**
 * Allowed ATS (Applicant Tracking System) and career site domains
 * Jobs must come from these platforms or official company career sites
 */
const ALLOWED_ATS_DOMAINS = [
  "ashby",
  "bamboohr",
  "breezy",
  "breezyhr",
  "careerplug",
  "comeet",
  "cornerstoneondemand",
  "csod",
  "dayforce",
  "eightfold",
  "freshteam",
  "gohire",
  "greenhouse",
  "hirehive",
  "hiringthing",
  "icims",
  "jazzhr",
  "jobvite",
  "join.com",
  "lever",
  "lever.co",
  "oraclecloud",
  "oracle",
  "paycom",
  "paylocity",
  "personio",
  "phenompeople",
  "phenom",
  "pinpoint",
  "polymer",
  "recooty",
  "recruitee",
  "rippling",
  "smartrecruiters",
  "successfactors",
  "taleo",
  "teamtailor",
  "trakstar",
  "workable",
  "workday",
  "ziprecruiter",
  "zohorecruit",
  "zoho",
];

/**
 * Extract all possible URLs from a job object
 */
const extractJobUrls = (job: ApiJob): string[] => {
  const urls: string[] = [];

  // Collect all possible URL fields
  const urlFields = [
    job.job_apply_link,
    job.apply_link,
    job.url,
    job.apply_url,
    job.applyUrl,
    job.applyLink,
    job.application_url,
    job.application_link,
    job.link,
    job.company_url,
    job.website_url,
    job.jobUrl,
  ];

  urlFields.forEach((url) => {
    if (url && typeof url === "string" && url.trim()) {
      urls.push(url.trim().toLowerCase());
    }
  });

  return urls;
};

/**
 * Check if a URL belongs to an allowed ATS or career site
 */
const isAllowedATS = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;

  try {
    // Parse the URL to extract the domain
    let domain = "";

    // Handle URLs with and without protocol
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const urlObj = new URL(url);
      domain = urlObj.hostname.toLowerCase();
    } else {
      // If no protocol, try to extract domain from the string
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^/\s]+)/);
      if (match) {
        domain = match[1].toLowerCase();
      } else {
        domain = url.toLowerCase();
      }
    }

    // Remove www. prefix if present
    domain = domain.replace(/^www\./, "");

    // Check if domain contains any allowed ATS keyword
    const matchesATS = ALLOWED_ATS_DOMAINS.some((atsDomain) => {
      // Check if domain contains the ATS name
      return domain.includes(atsDomain.toLowerCase());
    });

    if (matchesATS) {
      return true;
    }

    // Also check for official career sites (common patterns)
    // These are typically: company.com/careers, company.com/jobs, careers.company.com, jobs.company.com
    const careerSitePatterns = [
      /\/careers?/i,
      /\/jobs?/i,
      /careers?\./i,
      /jobs?\./i,
      /\/apply/i,
      /\/openings/i,
      /\/positions/i,
    ];

    // If URL matches career site patterns, allow it (likely official company career page)
    const matchesCareerPattern = careerSitePatterns.some((pattern) =>
      url.match(pattern)
    );

    return matchesCareerPattern;
  } catch (error) {
    // If URL parsing fails, check if URL string contains any ATS keyword
    const urlLower = url.toLowerCase();
    return ALLOWED_ATS_DOMAINS.some((atsDomain) =>
      urlLower.includes(atsDomain.toLowerCase())
    );
  }
};

/**
 * Check if a job comes from an allowed ATS or career site
 */
export const isAllowedATSJob = (job: ApiJob): boolean => {
  const urls = extractJobUrls(job);

  // If no URLs found, we can't verify - exclude for safety
  if (urls.length === 0) {
    return false;
  }

  // Check if any URL matches an allowed ATS
  return urls.some((url) => isAllowedATS(url));
};

/**
 * Filter an array of jobs to only include jobs from allowed ATS platforms and career sites
 */
export const filterATSJobs = (jobs: ApiJob[]): ApiJob[] => {
  return jobs.filter(isAllowedATSJob);
};

/**
 * Combined filter: tech jobs from allowed ATS platforms
 */
export const filterTechATSJobs = (jobs: ApiJob[]): ApiJob[] => {
  return jobs.filter((job) => isTechJob(job) && isAllowedATSJob(job));
};
