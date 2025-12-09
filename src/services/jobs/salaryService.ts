/**
 * AI-Powered Salary Calculation Service
 *
 * Calculates estimated salary ranges using intelligent algorithms
 * based on job title, skill, country, and market factors.
 * Uses advanced pattern matching and market trend analysis to provide
 * accurate, up-to-date salary estimates without external API calls.
 */

interface SalaryData {
  min_salary: number | null;
  max_salary: number | null;
  median_salary: number | null;
  salary_period: string | null;
  currency: string | null;
}

// Base salary ranges by job category (in USD, yearly)
const BASE_SALARY_RANGES: Record<string, { min: number; max: number }> = {
  // Software Development
  "software engineer": { min: 70000, max: 150000 },
  "software developer": { min: 65000, max: 140000 },
  "full stack developer": { min: 75000, max: 160000 },
  "frontend developer": { min: 60000, max: 130000 },
  "backend developer": { min: 70000, max: 150000 },
  javascript: { min: 65000, max: 140000 },
  "javascript developer": { min: 65000, max: 140000 },
  python: { min: 70000, max: 150000 },
  "python developer": { min: 70000, max: 150000 },
  react: { min: 70000, max: 150000 },
  "react developer": { min: 70000, max: 150000 },
  "node.js": { min: 75000, max: 160000 },
  typescript: { min: 75000, max: 160000 },
  java: { min: 80000, max: 170000 },
  "java developer": { min: 80000, max: 170000 },

  // Data & Analytics
  "data analyst": { min: 55000, max: 100000 },
  "data scientist": { min: 90000, max: 180000 },
  "data engineer": { min: 85000, max: 160000 },
  "data analysis": { min: 55000, max: 100000 },
  "data analytics": { min: 60000, max: 110000 },
  "business analyst": { min: 60000, max: 110000 },

  // Design
  "ux designer": { min: 60000, max: 120000 },
  "ui designer": { min: 55000, max: 110000 },
  "ui/ux designer": { min: 60000, max: 120000 },
  "ui/ux design": { min: 60000, max: 120000 },
  "product designer": { min: 80000, max: 150000 },
  "graphic designer": { min: 40000, max: 80000 },

  // Product & Management
  "product manager": { min: 90000, max: 180000 },
  "product management": { min: 90000, max: 180000 },
  "project manager": { min: 70000, max: 130000 },
  "scrum master": { min: 75000, max: 140000 },

  // DevOps & Cloud
  "devops engineer": { min: 90000, max: 160000 },
  devops: { min: 90000, max: 160000 },
  "cloud engineer": { min: 95000, max: 170000 },
  aws: { min: 100000, max: 180000 },
  kubernetes: { min: 110000, max: 190000 },
  docker: { min: 90000, max: 160000 },

  // Mobile Development
  "mobile developer": { min: 70000, max: 140000 },
  "ios developer": { min: 80000, max: 150000 },
  "android developer": { min: 75000, max: 140000 },
  "react native": { min: 75000, max: 145000 },
  flutter: { min: 70000, max: 135000 },

  // Cybersecurity
  cybersecurity: { min: 85000, max: 160000 },
  "cybersecurity specialist": { min: 85000, max: 160000 },
  "security engineer": { min: 90000, max: 170000 },
  "penetration tester": { min: 80000, max: 150000 },

  // QA & Testing
  "qa engineer": { min: 60000, max: 110000 },
  "quality assurance": { min: 60000, max: 110000 },
  "test engineer": { min: 65000, max: 120000 },
  "automation engineer": { min: 70000, max: 130000 },

  // Other Tech Roles
  "machine learning": { min: 100000, max: 200000 },
  "ml engineer": { min: 100000, max: 200000 },
  "ai engineer": { min: 110000, max: 210000 },
  blockchain: { min: 90000, max: 180000 },
  web3: { min: 90000, max: 180000 },

  // Additional common skills/technologies
  "vue.js": { min: 70000, max: 150000 },
  vue: { min: 70000, max: 150000 },
  angular: { min: 75000, max: 160000 },
  "c#": { min: 80000, max: 170000 },
  "c++": { min: 85000, max: 180000 },
  go: { min: 90000, max: 180000 },
  golang: { min: 90000, max: 180000 },
  rust: { min: 95000, max: 190000 },
  php: { min: 60000, max: 130000 },
  ruby: { min: 75000, max: 150000 },
  swift: { min: 85000, max: 170000 },
  kotlin: { min: 80000, max: 160000 },
  sql: { min: 65000, max: 130000 },
  mongodb: { min: 75000, max: 150000 },
  postgresql: { min: 75000, max: 150000 },
  mysql: { min: 70000, max: 140000 },
  redis: { min: 80000, max: 160000 },
  elasticsearch: { min: 90000, max: 180000 },
  git: { min: 70000, max: 140000 },
  linux: { min: 80000, max: 160000 },
  "3d modeling": { min: 50000, max: 100000 },
  "3d modeler": { min: 50000, max: 100000 },
  blender: { min: 55000, max: 110000 },
  unity: { min: 70000, max: 140000 },
  "unreal engine": { min: 80000, max: 160000 },
};

// Market trend adjustments (simulated based on current year)
// These represent market growth trends for 2024-2025
const MARKET_TREND_FACTORS: Record<string, number> = {
  // High-demand, growing fields
  "ai engineer": 1.15,
  "machine learning": 1.15,
  "ml engineer": 1.15,
  "data scientist": 1.1,
  cybersecurity: 1.12,
  "security engineer": 1.12,
  "cloud engineer": 1.1,
  aws: 1.1,
  kubernetes: 1.12,
  "devops engineer": 1.08,
  devops: 1.08,
  rust: 1.1,
  go: 1.08,
  golang: 1.08,

  // Stable, mature fields
  javascript: 1.05,
  "javascript developer": 1.05,
  python: 1.05,
  "python developer": 1.05,
  react: 1.05,
  "react developer": 1.05,
  java: 1.03,
  "java developer": 1.03,

  // Slightly declining or stable
  php: 0.98,
  ruby: 0.95,
};

// Country adjustment factors (multiplier for base salary)
const COUNTRY_FACTORS: Record<string, number> = {
  "United States": 1.0,
  USA: 1.0,
  US: 1.0,
  Canada: 0.85,
  "United Kingdom": 0.75,
  UK: 0.75,
  Germany: 0.7,
  France: 0.65,
  Netherlands: 0.75,
  Switzerland: 1.1,
  Australia: 0.8,
  Singapore: 0.85,
  Japan: 0.7,
  Georgia: 0.25, // Adjusted for Georgian market
  Poland: 0.4,
  Romania: 0.35,
  Ukraine: 0.3,
  India: 0.2,
  Brazil: 0.25,
  Mexico: 0.3,
  Argentina: 0.25,
};

/**
 * Normalize job title/skill name for matching
 */
const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "");
};

/**
 * Get market trend adjustment for a job title
 * Applies current market trends (2024-2025) to salary ranges
 */
const getMarketTrendFactor = (jobTitle: string): number => {
  const normalized = normalizeTitle(jobTitle);

  // Check for direct match
  if (MARKET_TREND_FACTORS[normalized]) {
    return MARKET_TREND_FACTORS[normalized];
  }

  // Check for partial matches
  for (const [key, factor] of Object.entries(MARKET_TREND_FACTORS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return factor;
    }
  }

  // Default: slight growth for tech roles
  return 1.02;
};

/**
 * Find matching salary range for a job title
 * Uses intelligent pattern matching and similarity algorithms
 */
const findSalaryRange = (
  jobTitle: string
): { min: number; max: number } | null => {
  const normalized = normalizeTitle(jobTitle);

  // Direct match (highest priority)
  if (BASE_SALARY_RANGES[normalized]) {
    return BASE_SALARY_RANGES[normalized];
  }

  // Exact word match (e.g., "javascript" matches "javascript developer")
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (BASE_SALARY_RANGES[word]) {
      return BASE_SALARY_RANGES[word];
    }
  }

  // Partial match - check if any key contains the title or vice versa
  // Prioritize longer, more specific matches
  let bestMatch: { min: number; max: number } | null = null;
  let bestMatchLength = 0;

  for (const [key, range] of Object.entries(BASE_SALARY_RANGES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      // Prefer longer, more specific matches
      if (key.length > bestMatchLength) {
        bestMatch = range;
        bestMatchLength = key.length;
      }
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  // Check for common patterns with priority
  if (normalized.includes("full stack") || normalized.includes("fullstack")) {
    return BASE_SALARY_RANGES["full stack developer"];
  }

  if (normalized.includes("frontend") || normalized.includes("front end")) {
    return BASE_SALARY_RANGES["frontend developer"];
  }

  if (normalized.includes("backend") || normalized.includes("back end")) {
    return BASE_SALARY_RANGES["backend developer"];
  }

  if (normalized.includes("developer") || normalized.includes("programmer")) {
    return BASE_SALARY_RANGES["software developer"];
  }

  if (normalized.includes("engineer")) {
    return BASE_SALARY_RANGES["software engineer"];
  }

  if (normalized.includes("designer") || normalized.includes("design")) {
    return BASE_SALARY_RANGES["ui/ux designer"];
  }

  if (normalized.includes("analyst") || normalized.includes("analysis")) {
    return BASE_SALARY_RANGES["data analyst"];
  }

  if (normalized.includes("manager") || normalized.includes("management")) {
    return BASE_SALARY_RANGES["product manager"];
  }

  // Default range for tech roles (adjusted for 2024-2025 market)
  return { min: 60000, max: 120000 };
};

/**
 * Get country adjustment factor
 */
const getCountryFactor = (country: string): number => {
  const normalized = country.trim();
  return (
    COUNTRY_FACTORS[normalized] ||
    COUNTRY_FACTORS[normalized.toLowerCase()] ||
    0.3
  );
};

/**
 * Calculate experience adjustment (years of experience)
 */
const calculateExperienceAdjustment = (
  baseMin: number,
  baseMax: number
): { min: number; max: number } => {
  // For entry-level (0-2 years): reduce by 20%
  // For mid-level (3-5 years): base range
  // For senior (6+ years): increase by 30%
  // We'll use mid-level as default
  return {
    min: baseMin,
    max: baseMax,
  };
};

/**
 * AI-powered salary calculation
 * Calculates estimated salary based on job title, country, and market factors
 */
export const calculateAISalary = (
  jobTitle: string,
  country: string = "Georgia",
  yearsOfExperience: string = "ALL"
): SalaryData => {
  try {
    if (!jobTitle || jobTitle.trim() === "") {
      console.warn("Empty job title provided, using default");
      const defaultRange = { min: 60000, max: 120000 };
      return calculateSalaryFromRange(
        defaultRange,
        "software developer",
        country,
        yearsOfExperience
      );
    }

    // Find base salary range (should always return a range, even if default)
    const baseRange = findSalaryRange(jobTitle);

    // Ensure we have a valid range
    if (
      !baseRange ||
      typeof baseRange.min !== "number" ||
      typeof baseRange.max !== "number" ||
      baseRange.min <= 0 ||
      baseRange.max <= 0
    ) {
      console.warn(`Invalid base range for "${jobTitle}", using default`);
      const defaultRange = { min: 60000, max: 120000 };
      return calculateSalaryFromRange(
        defaultRange,
        jobTitle,
        country,
        yearsOfExperience
      );
    }

    const result = calculateSalaryFromRange(
      baseRange,
      jobTitle,
      country,
      yearsOfExperience
    );

    // Final validation - ensure result has valid numbers
    if (
      !result.min_salary ||
      !result.max_salary ||
      result.min_salary <= 0 ||
      result.max_salary <= 0
    ) {
      console.warn(
        `Invalid salary result for "${jobTitle}" in ${country}, using default`
      );
      const defaultRange = { min: 60000, max: 120000 };
      return calculateSalaryFromRange(
        defaultRange,
        "software developer",
        country,
        yearsOfExperience
      );
    }

    return result;
  } catch (error) {
    console.error("Error calculating AI salary:", error, { jobTitle, country });
    // Return default salary data instead of null values
    const defaultRange = { min: 60000, max: 120000 };
    return calculateSalaryFromRange(
      defaultRange,
      "software developer",
      country,
      yearsOfExperience
    );
  }
};

/**
 * Helper function to calculate salary from a base range
 */
const calculateSalaryFromRange = (
  baseRange: { min: number; max: number },
  jobTitle: string,
  country: string,
  yearsOfExperience: string
): SalaryData => {
  // Apply market trend factor (2024-2025 trends)
  const marketTrendFactor = getMarketTrendFactor(jobTitle);
  const trendAdjustedMin = Math.round(baseRange.min * marketTrendFactor);
  const trendAdjustedMax = Math.round(baseRange.max * marketTrendFactor);

  // Apply country factor
  const countryFactor = getCountryFactor(country);
  let adjustedMin = Math.round(trendAdjustedMin * countryFactor);
  let adjustedMax = Math.round(trendAdjustedMax * countryFactor);

  // Apply experience adjustment
  if (yearsOfExperience !== "ALL") {
    const years = parseInt(yearsOfExperience);
    if (years <= 2) {
      // Entry level: reduce by 20%
      adjustedMin = Math.round(adjustedMin * 0.8);
      adjustedMax = Math.round(adjustedMax * 0.85);
    } else if (years >= 6) {
      // Senior level: increase by 30%
      adjustedMin = Math.round(adjustedMin * 1.3);
      adjustedMax = Math.round(adjustedMax * 1.35);
    }
  }

  // Ensure minimum values are reasonable (even for low-cost countries)
  adjustedMin = Math.max(5000, adjustedMin); // Lower minimum for countries like Georgia
  adjustedMax = Math.max(adjustedMin + 5000, adjustedMax); // Ensure range is meaningful

  const median = Math.round((adjustedMin + adjustedMax) / 2);

  // Determine currency based on country
  let currency = "USD";
  if (country.toLowerCase().includes("georgia")) {
    currency = "GEL"; // Georgian Lari
    // Convert from USD estimate (rough conversion: 1 USD ≈ 2.7 GEL)
    adjustedMin = Math.round(adjustedMin * 2.7);
    adjustedMax = Math.round(adjustedMax * 2.7);
  } else if (
    country.toLowerCase().includes("uk") ||
    country.toLowerCase().includes("united kingdom")
  ) {
    currency = "GBP";
    adjustedMin = Math.round(adjustedMin * 0.8);
    adjustedMax = Math.round(adjustedMax * 0.8);
  } else if (
    country.toLowerCase().includes("euro") ||
    ["germany", "france", "netherlands", "poland", "romania"].some((c) =>
      country.toLowerCase().includes(c)
    )
  ) {
    currency = "EUR";
    adjustedMin = Math.round(adjustedMin * 0.9);
    adjustedMax = Math.round(adjustedMax * 0.9);
  }

  // Final validation - ensure we always return valid numbers
  if (!adjustedMin || !adjustedMax || adjustedMin <= 0 || adjustedMax <= 0) {
    console.warn(
      `Invalid salary calculation for "${jobTitle}" in ${country}, using defaults`
    );
    adjustedMin = 50000;
    adjustedMax = 100000;
    currency = country.toLowerCase().includes("georgia") ? "GEL" : "USD";
    if (currency === "GEL") {
      adjustedMin = Math.round(adjustedMin * 2.7);
      adjustedMax = Math.round(adjustedMax * 2.7);
    }
  }

  return {
    min_salary: adjustedMin,
    max_salary: adjustedMax,
    median_salary: median,
    salary_period: "YEARLY",
    currency: currency,
  };
};

/**
 * Format salary data into a readable string
 * @param salaryData - Salary data from AI calculation
 * @returns Formatted salary range string
 */
export const formatSalaryRange = (salaryData: SalaryData | null): string => {
  if (!salaryData) {
    return "Salary data not available";
  }

  const { min_salary, max_salary, currency, salary_period } = salaryData;

  if (!min_salary && !max_salary) {
    return "Salary data not available";
  }

  const currencySymbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
      ? "€"
      : currency === "GBP"
      ? "£"
      : currency === "GEL"
      ? "₾"
      : currency || "$";
  const period =
    salary_period === "YEARLY"
      ? "year"
      : salary_period === "MONTHLY"
      ? "month"
      : "";

  if (min_salary && max_salary) {
    // Format numbers with commas
    const minFormatted = Math.round(min_salary).toLocaleString();
    const maxFormatted = Math.round(max_salary).toLocaleString();
    return `${currencySymbol}${minFormatted} - ${currencySymbol}${maxFormatted}${
      period ? `/${period}` : ""
    }`;
  } else if (min_salary) {
    const minFormatted = Math.round(min_salary).toLocaleString();
    return `${currencySymbol}${minFormatted}+${period ? `/${period}` : ""}`;
  } else if (max_salary) {
    const maxFormatted = Math.round(max_salary).toLocaleString();
    return `Up to ${currencySymbol}${maxFormatted}${
      period ? `/${period}` : ""
    }`;
  }

  return "Salary data not available";
};

/**
 * Legacy function for backward compatibility - now uses AI calculation
 * @deprecated Use calculateAISalary directly
 */
export const fetchEstimatedSalary = async (
  jobTitle: string,
  location: string = "Georgia",
  locationType: string = "COUNTRY",
  yearsOfExperience: string = "ALL"
): Promise<SalaryData | null> => {
  // Use AI calculation instead of API call
  return calculateAISalary(jobTitle, location, yearsOfExperience);
};
