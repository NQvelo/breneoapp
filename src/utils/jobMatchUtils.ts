/**
 * Job Matching Algorithm Utilities
 * 
 * Provides a more precise and exact percentage-based matching algorithm
 * that considers:
 * - Exact vs partial skill matches (weighted)
 * - Title matches (higher weight)
 * - Description matches (standard weight)
 * - Coverage: how many job skills are matched
 * - Relevance: how many user skills are utilized
 */

// Common tech skills keywords for extraction from job text
// Moved here from UserHome.tsx / JobsPage.tsx to ensure consistency
const skillKeywords: Record<string, string[]> = {
  javascript: ["javascript", "js", "node.js", "nodejs", "react", "vue", "angular"],
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
  "machine learning": ["machine learning", "ml", "deep learning", "neural network"],
  "data science": ["data science", "data analysis", "data analytics"],
  ai: ["artificial intelligence", "ai", "nlp", "natural language processing"],
  blockchain: ["blockchain", "ethereum", "solidity", "web3"],
  devops: ["devops", "ci/cd", "continuous integration"],
  testing: ["testing", "qa", "quality assurance", "test automation"],
  ui: ["ui", "user interface", "ux", "user experience"],
  design: ["design", "figma", "sketch", "adobe"],
};

/**
 * Extract skills from job data based on keywords in title, description and requirements
 */
export const extractJobSkills = (job: any): string[] => {
  if (!job) return [];
  
  const skills: string[] = [];
  
  // Collect all text fields to search through
  const fieldsToSearch = [
    job.title,
    job.job_title,
    job.position,
    job.description,
    job.job_description,
    job.job_required_experience,
    job.required_experience,
    ...(Array.isArray(job.required_skills) ? job.required_skills : []),
    ...(Array.isArray(job.skills) ? job.skills : []),
    ...(Array.isArray(job.job_skills) ? job.job_skills : []),
  ];

  const textToSearch = fieldsToSearch
    .filter(val => typeof val === 'string' && val.length > 0)
    .join(" ")
    .toLowerCase();

  // Check for each defined skill keyword
  Object.keys(skillKeywords).forEach((skill) => {
    const keywords = skillKeywords[skill];
    if (keywords.some((keyword) => textToSearch.includes(keyword.toLowerCase()))) {
      skills.push(skill);
    }
  });

  // Also include any skills already listed in arrays but not caught by keywords
  const explicitSkills = [
     ...(Array.isArray(job.required_skills) ? job.required_skills : []),
     ...(Array.isArray(job.skills) ? job.skills : []),
     ...(Array.isArray(job.job_skills) ? job.job_skills : []),
  ].filter(s => typeof s === 'string');
  
  explicitSkills.forEach(skill => {
    if (!skills.includes(skill.toLowerCase())) {
        skills.push(skill.toLowerCase());
    }
  });

  return [...new Set(skills)]; // Remove duplicates
};


interface MatchResult {
  exactMatches: string[];
  partialMatches: string[];
  titleMatches: string[];
  descriptionMatches: string[];
}

/**
 * Normalize a skill string for comparison
 */
const normalizeSkill = (skill: string): string => {
  return skill.toLowerCase().trim().replace(/\s+/g, " ");
};

/**
 * Check if two skills match (exact or partial)
 * Returns: 'exact' | 'partial' | null
 */
const checkSkillMatch = (
  userSkill: string,
  jobSkill: string
): "exact" | "partial" | null => {
  const normalizedUser = normalizeSkill(userSkill);
  const normalizedJob = normalizeSkill(jobSkill);

  // Exact match
  if (normalizedUser === normalizedJob) {
    return "exact";
  }

  // Partial match - one contains the other (but not too short to avoid false positives)
  const minLength = 3;
  if (normalizedUser.length >= minLength && normalizedJob.length >= minLength) {
    if (
      normalizedUser.includes(normalizedJob) ||
      normalizedJob.includes(normalizedUser)
    ) {
      // Avoid matching very short substrings (e.g., "js" matching "javascript" is okay, but "a" matching "java" is not)
      const shorter = normalizedUser.length < normalizedJob.length 
        ? normalizedUser 
        : normalizedJob;
      const longer = normalizedUser.length >= normalizedJob.length 
        ? normalizedUser 
        : normalizedJob;
      
      // If shorter is at least 3 chars or is at least 50% of longer, it's a valid partial match
      if (shorter.length >= minLength || shorter.length / longer.length >= 0.5) {
        return "partial";
      }
    }
  }

  return null;
};

/**
 * Find all matches between user skills and job skills
 */
const findMatches = (
  userSkills: string[],
  jobSkills: string[],
  jobTitle?: string
): MatchResult => {
  const normalizedUserSkills = userSkills.map(normalizeSkill);
  const normalizedJobSkills = jobSkills.map(normalizeSkill);
  const normalizedJobTitle = jobTitle ? normalizeSkill(jobTitle) : "";

  const exactMatches: string[] = [];
  const partialMatches: string[] = [];
  const titleMatches: string[] = [];
  const descriptionMatches: string[] = [];

  // Check title matches first (higher priority)
  normalizedUserSkills.forEach((userSkill) => {
    if (normalizedJobTitle) {
      // Check if user skill appears in job title
      if (normalizedJobTitle.includes(userSkill)) {
        if (!titleMatches.includes(userSkill)) {
          titleMatches.push(userSkill);
        }
      } else {
        // Check if any word in job title contains the user skill or vice versa
        const titleWords = normalizedJobTitle.split(/\s+/);
        const hasMatch = titleWords.some(
          (word) => word.includes(userSkill) || userSkill.includes(word)
        );
        if (hasMatch && !titleMatches.includes(userSkill)) {
          titleMatches.push(userSkill);
        }
      }
    }
  });

  // Check description/requirements matches
  normalizedUserSkills.forEach((userSkill) => {
    let matched = false;
    let matchType: "exact" | "partial" | null = null;

    for (const jobSkill of normalizedJobSkills) {
      const match = checkSkillMatch(userSkill, jobSkill);
      if (match) {
        matched = true;
        matchType = match;
        break; // Use the first match found
      }
    }

    if (matched && matchType) {
      if (matchType === "exact") {
        if (!exactMatches.includes(userSkill)) {
          exactMatches.push(userSkill);
        }
      } else {
        if (!partialMatches.includes(userSkill)) {
          partialMatches.push(userSkill);
        }
      }

      // Track description matches (skills that matched in job requirements)
      if (!titleMatches.includes(userSkill)) {
        if (!descriptionMatches.includes(userSkill)) {
          descriptionMatches.push(userSkill);
        }
      }
    }
  });

  return {
    exactMatches,
    partialMatches,
    titleMatches,
    descriptionMatches,
  };
};

/**
 * Calculate match percentage with improved precision
 * 
 * Algorithm:
 * 1. Weight exact matches higher than partial matches
 * 2. Weight title matches higher than description matches
 * 3. Calculate coverage: how many job skills are matched
 * 4. Calculate relevance: how many user skills are utilized
 * 5. Combine both metrics for a more accurate percentage
 */
export const calculateMatchPercentage = (
  userSkills: string[],
  jobSkills: string[],
  jobTitle?: string
): number => {
  if (userSkills.length === 0) {
    return 0;
  }

  if (jobSkills.length === 0 && !jobTitle) {
    return 0;
  }

  const matches = findMatches(userSkills, jobSkills, jobTitle);

  // If no matches at all
  if (
    matches.exactMatches.length === 0 &&
    matches.partialMatches.length === 0 &&
    matches.titleMatches.length === 0
  ) {
    return 0;
  }

  // Weight configuration
  const WEIGHTS = {
    exactMatch: 1.0, // Full weight for exact matches
    partialMatch: 0.6, // 60% weight for partial matches
    titleMatch: 1.2, // 20% bonus for title matches
    descriptionMatch: 1.0, // Standard weight for description matches
  };

  // Calculate weighted match score
  let weightedScore = 0;
  let maxPossibleScore = 0;

  // Process exact matches
  matches.exactMatches.forEach((skill) => {
    const isTitleMatch = matches.titleMatches.includes(skill);
    const weight = isTitleMatch
      ? WEIGHTS.exactMatch * WEIGHTS.titleMatch
      : WEIGHTS.exactMatch * WEIGHTS.descriptionMatch;
    weightedScore += weight;
    maxPossibleScore += WEIGHTS.exactMatch * WEIGHTS.titleMatch; // Max possible
  });

  // Process partial matches
  matches.partialMatches.forEach((skill) => {
    const isTitleMatch = matches.titleMatches.includes(skill);
    const weight = isTitleMatch
      ? WEIGHTS.partialMatch * WEIGHTS.titleMatch
      : WEIGHTS.partialMatch * WEIGHTS.descriptionMatch;
    weightedScore += weight;
    maxPossibleScore += WEIGHTS.partialMatch * WEIGHTS.titleMatch; // Max possible
  });

  // Calculate coverage: percentage of job skills matched
  const totalJobSkills = jobSkills.length || 1; // Avoid division by zero
  const matchedJobSkills = new Set([
    ...matches.exactMatches,
    ...matches.partialMatches,
  ]).size;
  const coverage = (matchedJobSkills / totalJobSkills) * 100;

  // Calculate relevance: percentage of user skills utilized
  const totalUserSkills = userSkills.length;
  const utilizedUserSkills = new Set([
    ...matches.exactMatches,
    ...matches.partialMatches,
  ]).size;
  const relevance = (utilizedUserSkills / totalUserSkills) * 100;

  // Calculate base match percentage from weighted score
  // Normalize to 0-100 range
  const baseMatch = maxPossibleScore > 0
    ? (weightedScore / maxPossibleScore) * 100
    : 0;

  // Combine coverage and relevance with base match
  // Coverage is more important (60%) as it shows how well the job matches user's skills
  // Relevance is less important (40%) as it shows how many user skills are used
  const combinedMatch = baseMatch * 0.5 + coverage * 0.3 + relevance * 0.2;

  // Apply title match bonus (if skills appear in title, add bonus)
  let finalMatch = combinedMatch;
  if (matches.titleMatches.length > 0) {
    const titleBonus = Math.min(
      (matches.titleMatches.length / totalUserSkills) * 15, // Up to 15% bonus
      15
    );
    finalMatch = Math.min(finalMatch + titleBonus, 100);
  }

  // Handle edge case: job has no skills but title matches
  if (jobSkills.length === 0 && matches.titleMatches.length > 0) {
    finalMatch = Math.min(
      (matches.titleMatches.length / totalUserSkills) * 100,
      75 // Cap at 75% if no job skills available
    );
  }

  // Round to 1 decimal place for precision, then to nearest integer
  return Math.round(Math.min(Math.max(finalMatch, 0), 100));
};

/**
 * Get textual label for match quality
 */
export const getMatchQualityLabel = (matchPercentage?: number): string => {
  if (matchPercentage === undefined || matchPercentage <= 0) {
    return "Bad match";
  }
  if (matchPercentage >= 95) {
    return "Excellent match";
  }
  if (matchPercentage >= 85) {
    return "Best match";
  }
  if (matchPercentage >= 70) {
    return "Good match";
  }
  if (matchPercentage >= 50) {
    return "Fair match";
  }
  return "Bad match";
};

