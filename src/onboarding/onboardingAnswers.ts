import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { profileApi } from "@/api/profile";
import { getIndustriesForPosition } from "@/services/industry/position_to_industry";

export const ONBOARDING_STORAGE_KEY = "breneo.onboarding.v1";
export const DIRECT_REGISTER_KEY = "breneo.signup.direct";

export const ONBOARDING_ROLE_CATEGORY_IDS = [
  "popular",
  "software",
  "devops",
  "data",
  "design",
  "product",
  "project",
  "marketing",
  "sales",
  "finance",
  "hr",
  "support",
  "operations",
  "healthcare",
  "education",
  "trades",
  "writing",
  "legal",
  "consulting",
] as const;

export type OnboardingRoleCategoryId =
  (typeof ONBOARDING_ROLE_CATEGORY_IDS)[number];

export const ONBOARDING_ROLE_IDS = [
  "react",
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "ios",
  "android",
  "web",
  "embedded",
  "game",
  "qa",
  "qa_auto",
  "eng_manager",
  "devops",
  "cloud",
  "sre",
  "sysadmin",
  "platform",
  "security",
  "network",
  "data_analyst",
  "data_scientist",
  "data_engineer",
  "ml",
  "ai",
  "bi",
  "product_designer",
  "ux",
  "ui",
  "graphic",
  "motion",
  "product_manager",
  "business_analyst",
  "product_owner",
  "product_ops",
  "project_manager",
  "program_manager",
  "scrum",
  "pmo",
  "digital_marketing",
  "performance",
  "content_marketing",
  "brand",
  "seo",
  "social",
  "account_executive",
  "sdr",
  "customer_success",
  "account_manager",
  "bdr",
  "accountant",
  "financial_analyst",
  "bookkeeper",
  "controller",
  "auditor",
  "recruiter",
  "hr_generalist",
  "talent",
  "people_ops",
  "support_specialist",
  "support_lead",
  "technical_support",
  "success_associate",
  "operations_manager",
  "office_manager",
  "executive_assistant",
  "admin",
  "nurse",
  "physician",
  "medical_assistant",
  "healthcare_admin",
  "pharmacist",
  "teacher",
  "tutor",
  "instructional",
  "academic",
  "mechanical",
  "electrical",
  "civil",
  "technician",
  "electrician",
  "content_writer",
  "copywriter",
  "journalist",
  "editor",
  "video",
  "lawyer",
  "paralegal",
  "compliance",
  "legal_counsel",
  "consultant",
  "strategy",
  "management_consultant",
  "analyst",
] as const;

export type OnboardingRoleId = (typeof ONBOARDING_ROLE_IDS)[number];

const ONBOARDING_ROLE_ID_SET = new Set<string>(ONBOARDING_ROLE_IDS);

export function isOnboardingRoleId(value: string): value is OnboardingRoleId {
  return ONBOARDING_ROLE_ID_SET.has(value);
}

export const ROLE_CATEGORY_SUBROLES: Record<
  OnboardingRoleCategoryId,
  readonly OnboardingRoleId[]
> = {
  popular: [
    "react",
    "frontend",
    "product_manager",
    "product_designer",
    "data_analyst",
    "devops",
    "digital_marketing",
    "account_executive",
    "recruiter",
  ],
  software: [
    "react",
    "frontend",
    "backend",
    "fullstack",
    "mobile",
    "ios",
    "android",
    "web",
    "embedded",
    "game",
    "qa",
    "qa_auto",
    "eng_manager",
  ],
  devops: [
    "devops",
    "cloud",
    "sre",
    "sysadmin",
    "platform",
    "security",
    "network",
  ],
  data: ["data_analyst", "data_scientist", "data_engineer", "ml", "ai", "bi"],
  design: ["product_designer", "ux", "ui", "graphic", "motion"],
  product: [
    "product_manager",
    "business_analyst",
    "product_owner",
    "product_ops",
  ],
  project: ["project_manager", "program_manager", "scrum", "pmo"],
  marketing: [
    "digital_marketing",
    "performance",
    "content_marketing",
    "brand",
    "seo",
    "social",
  ],
  sales: [
    "account_executive",
    "sdr",
    "customer_success",
    "account_manager",
    "bdr",
  ],
  finance: [
    "accountant",
    "financial_analyst",
    "bookkeeper",
    "controller",
    "auditor",
  ],
  hr: ["recruiter", "hr_generalist", "talent", "people_ops"],
  support: [
    "support_specialist",
    "support_lead",
    "technical_support",
    "success_associate",
  ],
  operations: [
    "operations_manager",
    "office_manager",
    "executive_assistant",
    "admin",
  ],
  healthcare: [
    "nurse",
    "physician",
    "medical_assistant",
    "healthcare_admin",
    "pharmacist",
  ],
  education: ["teacher", "tutor", "instructional", "academic"],
  trades: ["mechanical", "electrical", "civil", "technician", "electrician"],
  writing: ["content_writer", "copywriter", "journalist", "editor", "video"],
  legal: ["lawyer", "paralegal", "compliance", "legal_counsel"],
  consulting: ["consultant", "strategy", "management_consultant", "analyst"],
};

export function subrolesForCategories(
  categories: readonly string[],
): OnboardingRoleId[] {
  const seen = new Set<OnboardingRoleId>();
  const roles: OnboardingRoleId[] = [];
  for (const category of categories) {
    const subroles =
      ROLE_CATEGORY_SUBROLES[category as OnboardingRoleCategoryId];
    if (!subroles) continue;
    for (const role of subroles) {
      if (seen.has(role)) continue;
      seen.add(role);
      roles.push(role);
    }
  }
  return roles;
}

export type OnboardingIntent = "jobs" | "interviews" | "learning" | "cv";
export type OnboardingSituation =
  | "first_job"
  | "change"
  | "growth"
  | "income"
  | "balance";
export type OnboardingExperience = "starting" | "some" | "mid" | "senior";
export type OnboardingHelp = "jobs" | "interviews" | "courses" | "atoms";
export type OnboardingLocation = "georgia" | "europe" | "asia";

export const ONBOARDING_LOCATIONS: OnboardingLocation[] = [
  "georgia",
  "europe",
  "asia",
];

export interface OnboardingDraft {
  step: number;
  intent: OnboardingIntent | null;
  situation: OnboardingSituation | null;
  roleCategories: OnboardingRoleCategoryId[];
  roles: OnboardingRoleId[];
  location: OnboardingLocation[];
  experience: OnboardingExperience | null;
  help: OnboardingHelp[];
  summary: string;
  completed: boolean;
}

export const EMPTY_ONBOARDING_DRAFT: OnboardingDraft = {
  step: 0,
  intent: null,
  situation: null,
  roleCategories: [],
  roles: [],
  location: [],
  experience: null,
  help: [],
  summary: "",
  completed: false,
};

const ROLE_SEARCH_KEYWORDS: Record<OnboardingRoleId, string[]> = {
  react: ["React"],
  frontend: ["Frontend"],
  backend: ["Backend"],
  fullstack: ["Full Stack", "Fullstack"],
  mobile: ["Mobile Engineer"],
  ios: ["iOS"],
  android: ["Android"],
  web: ["Web Developer"],
  embedded: ["Embedded"],
  game: ["Game Developer"],
  qa: ["QA"],
  qa_auto: ["Test Automation", "SDET"],
  eng_manager: ["Engineering Manager"],
  devops: ["DevOps"],
  cloud: ["Cloud Engineer"],
  sre: ["Site Reliability", "SRE"],
  sysadmin: ["Systems Administrator"],
  platform: ["Platform Engineer"],
  security: ["Security Engineer"],
  network: ["Network Engineer"],
  data_analyst: ["Data Analyst"],
  data_scientist: ["Data Scientist"],
  data_engineer: ["Data Engineer"],
  ml: ["Machine Learning"],
  ai: ["AI Engineer"],
  bi: ["Business Intelligence"],
  product_designer: ["Product Designer"],
  ux: ["UX Designer"],
  ui: ["UI Designer"],
  graphic: ["Graphic Designer"],
  motion: ["Motion Designer"],
  product_manager: ["Product Manager"],
  business_analyst: ["Business Analyst"],
  product_owner: ["Product Owner"],
  product_ops: ["Product Operations"],
  project_manager: ["Project Manager"],
  program_manager: ["Program Manager"],
  scrum: ["Scrum Master"],
  pmo: ["PMO"],
  digital_marketing: ["Digital Marketing"],
  performance: ["Performance Marketing"],
  content_marketing: ["Content Marketing"],
  brand: ["Brand Manager"],
  seo: ["SEO"],
  social: ["Social Media"],
  account_executive: ["Account Executive"],
  sdr: ["Sales Development"],
  customer_success: ["Customer Success"],
  account_manager: ["Account Manager"],
  bdr: ["Business Development"],
  accountant: ["Accountant"],
  financial_analyst: ["Financial Analyst"],
  bookkeeper: ["Bookkeeper"],
  controller: ["Controller"],
  auditor: ["Auditor"],
  recruiter: ["Recruiter"],
  hr_generalist: ["HR Generalist"],
  talent: ["Talent Acquisition"],
  people_ops: ["People Operations"],
  support_specialist: ["Customer Support"],
  support_lead: ["Support Lead"],
  technical_support: ["Technical Support"],
  success_associate: ["Customer Success"],
  operations_manager: ["Operations Manager"],
  office_manager: ["Office Manager"],
  executive_assistant: ["Executive Assistant"],
  admin: ["Administrative Assistant"],
  nurse: ["Nurse"],
  physician: ["Physician"],
  medical_assistant: ["Medical Assistant"],
  healthcare_admin: ["Healthcare Administrator"],
  pharmacist: ["Pharmacist"],
  teacher: ["Teacher"],
  tutor: ["Tutor"],
  instructional: ["Instructional Designer"],
  academic: ["Academic Coordinator"],
  mechanical: ["Mechanical Engineer"],
  electrical: ["Electrical Engineer"],
  civil: ["Civil Engineer"],
  technician: ["Technician"],
  electrician: ["Electrician"],
  content_writer: ["Content Writer"],
  copywriter: ["Copywriter"],
  journalist: ["Journalist"],
  editor: ["Editor"],
  video: ["Video Producer"],
  lawyer: ["Lawyer"],
  paralegal: ["Paralegal"],
  compliance: ["Compliance"],
  legal_counsel: ["Legal Counsel"],
  consultant: ["Consultant"],
  strategy: ["Strategy Consultant"],
  management_consultant: ["Management Consultant"],
  analyst: ["Business Consultant"],
};

const ROLE_TITLES: Record<OnboardingRoleId, string> = {
  react: "React Developer",
  frontend: "Frontend Engineer",
  backend: "Backend Engineer",
  fullstack: "Full Stack Engineer",
  mobile: "Mobile Engineer",
  ios: "iOS Developer",
  android: "Android Developer",
  web: "Web Developer",
  embedded: "Embedded Software Engineer",
  game: "Game Developer",
  qa: "QA Engineer",
  qa_auto: "Test Automation Engineer",
  eng_manager: "Engineering Manager",
  devops: "DevOps Engineer",
  cloud: "Cloud Engineer",
  sre: "Site Reliability Engineer",
  sysadmin: "Systems Administrator",
  platform: "Platform Engineer",
  security: "Security Engineer",
  network: "Network Engineer",
  data_analyst: "Data Analyst",
  data_scientist: "Data Scientist",
  data_engineer: "Data Engineer",
  ml: "Machine Learning Engineer",
  ai: "AI Engineer",
  bi: "Business Intelligence Analyst",
  product_designer: "Product Designer",
  ux: "UX Designer",
  ui: "UI Designer",
  graphic: "Graphic Designer",
  motion: "Motion Designer",
  product_manager: "Product Manager",
  business_analyst: "Business Analyst",
  product_owner: "Product Owner",
  product_ops: "Product Operations",
  project_manager: "Project Manager",
  program_manager: "Program Manager",
  scrum: "Scrum Master",
  pmo: "PMO Analyst",
  digital_marketing: "Digital Marketing Specialist",
  performance: "Performance Marketing Manager",
  content_marketing: "Content Marketing Manager",
  brand: "Brand Manager",
  seo: "SEO Specialist",
  social: "Social Media Manager",
  account_executive: "Account Executive",
  sdr: "Sales Development Representative",
  customer_success: "Customer Success Manager",
  account_manager: "Account Manager",
  bdr: "Business Development Representative",
  accountant: "Accountant",
  financial_analyst: "Financial Analyst",
  bookkeeper: "Bookkeeper",
  controller: "Financial Controller",
  auditor: "Auditor",
  recruiter: "Recruiter",
  hr_generalist: "HR Generalist",
  talent: "Talent Acquisition Specialist",
  people_ops: "People Operations",
  support_specialist: "Customer Support Specialist",
  support_lead: "Customer Support Lead",
  technical_support: "Technical Support Specialist",
  success_associate: "Customer Success Associate",
  operations_manager: "Operations Manager",
  office_manager: "Office Manager",
  executive_assistant: "Executive Assistant",
  admin: "Administrative Assistant",
  nurse: "Nurse",
  physician: "Physician",
  medical_assistant: "Medical Assistant",
  healthcare_admin: "Healthcare Administrator",
  pharmacist: "Pharmacist",
  teacher: "Teacher",
  tutor: "Tutor",
  instructional: "Instructional Designer",
  academic: "Academic Coordinator",
  mechanical: "Mechanical Engineer",
  electrical: "Electrical Engineer",
  civil: "Civil Engineer",
  technician: "Technician",
  electrician: "Electrician",
  content_writer: "Content Writer",
  copywriter: "Copywriter",
  journalist: "Journalist",
  editor: "Editor",
  video: "Video Producer",
  lawyer: "Lawyer",
  paralegal: "Paralegal",
  compliance: "Compliance Specialist",
  legal_counsel: "Legal Counsel",
  consultant: "Consultant",
  strategy: "Strategy Consultant",
  management_consultant: "Management Consultant",
  analyst: "Business Consultant",
};

const EXPERIENCE_YEARS: Record<OnboardingExperience, number> = {
  starting: 0,
  some: 1,
  mid: 3,
  senior: 6,
};

const EUROPE_PLACES = [
  "albania",
  "andorra",
  "austria",
  "belgium",
  "bosnia",
  "bulgaria",
  "croatia",
  "cyprus",
  "czech",
  "denmark",
  "estonia",
  "finland",
  "france",
  "germany",
  "greece",
  "hungary",
  "iceland",
  "ireland",
  "italy",
  "kosovo",
  "latvia",
  "liechtenstein",
  "lithuania",
  "luxembourg",
  "malta",
  "moldova",
  "monaco",
  "montenegro",
  "netherlands",
  "norway",
  "poland",
  "portugal",
  "romania",
  "serbia",
  "slovakia",
  "slovenia",
  "spain",
  "sweden",
  "switzerland",
  "ukraine",
  "united kingdom",
  "uk",
  "england",
  "scotland",
  "wales",
  "britain",
];

const ASIA_PLACES = [
  "afghanistan",
  "azerbaijan",
  "bahrain",
  "bangladesh",
  "cambodia",
  "china",
  "hong kong",
  "india",
  "indonesia",
  "israel",
  "japan",
  "jordan",
  "kazakhstan",
  "korea",
  "kuwait",
  "kyrgyzstan",
  "laos",
  "lebanon",
  "malaysia",
  "maldives",
  "mongolia",
  "myanmar",
  "nepal",
  "oman",
  "pakistan",
  "philippines",
  "qatar",
  "saudi",
  "singapore",
  "sri lanka",
  "taiwan",
  "tajikistan",
  "thailand",
  "turkey",
  "türkiye",
  "uae",
  "emirates",
  "uzbekistan",
  "vietnam",
];

const GEORGIA_PLACES = [
  "georgia",
  "საქართველო",
  "tbilisi",
  "თბილისი",
  "batumi",
  "ბათუმი",
  "kutaisi",
  "ქუთაისი",
  "rustavi",
  "რუსთავი",
  "zugdidi",
  "ზუგდიდი",
];

const SEARCH_COUNTRIES: Record<OnboardingLocation, string[]> = {
  georgia: ["Georgia"],
  europe: [
    "Germany",
    "France",
    "United Kingdom",
    "Netherlands",
    "Poland",
    "Spain",
    "Italy",
    "Sweden",
    "Ireland",
    "Portugal",
    "Austria",
    "Belgium",
    "Switzerland",
    "Czech Republic",
    "Romania",
    "Denmark",
    "Norway",
    "Finland",
    "Ukraine",
  ],
  asia: [
    "India",
    "Singapore",
    "Japan",
    "China",
    "United Arab Emirates",
    "South Korea",
    "Vietnam",
    "Philippines",
    "Indonesia",
    "Malaysia",
    "Thailand",
    "Hong Kong",
    "Taiwan",
    "Israel",
    "Turkey",
    "Kazakhstan",
  ],
};

function isOnboardingLocation(value: unknown): value is OnboardingLocation {
  return value === "georgia" || value === "europe" || value === "asia";
}

function savedLocations(value: unknown): OnboardingLocation[] {
  if (Array.isArray(value)) return value.filter(isOnboardingLocation);
  if (isOnboardingLocation(value)) return [value];
  return [];
}

function placePattern(places: readonly string[]): RegExp {
  const body = places
    .slice()
    .sort((left, right) => right.length - left.length)
    .map((place) => place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return new RegExp(`(?:^|[^\\p{L}])(?:${body})(?=$|[^\\p{L}])`, "iu");
}

const EUROPE_PATTERN = placePattern(EUROPE_PLACES);
const ASIA_PATTERN = placePattern(ASIA_PLACES);
const GEORGIA_PATTERN = placePattern(GEORGIA_PLACES);
const US_PATTERN = /(?:^|[^\p{L}])(?:united states|usa|u\.s\.a|u\.s\.)(?=$|[^\p{L}])/iu;

export function locationSearchCountries(
  locations: readonly OnboardingLocation[],
): string[] {
  const names = new Set<string>();
  for (const location of locations) {
    SEARCH_COUNTRIES[location]?.forEach((country) => names.add(country));
  }
  return [...names];
}

export function jobMatchesOnboardingLocation(
  country: string,
  location: string,
  choice: OnboardingLocation,
): boolean {
  const text = `${country} ${location}`.trim();
  if (!text) return false;
  if (choice === "georgia") {
    const georgianCity = /(?:^|[^\p{L}])(?:tbilisi|თბილისი|batumi|ბათუმი|kutaisi|ქუთაისი|rustavi|რუსთავი)(?=$|[^\p{L}])/iu.test(
      text,
    );
    if (georgianCity) return true;
    if (US_PATTERN.test(text)) return false;
    return GEORGIA_PATTERN.test(text);
  }
  if (choice === "europe") return EUROPE_PATTERN.test(text);
  return ASIA_PATTERN.test(text);
}

function savedIds<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] {
  if (!Array.isArray(value)) return [];
  const known = new Set<string>(allowed);
  return value.filter((item): item is T => typeof item === "string" && known.has(item));
}

export function loadOnboardingDraft(): OnboardingDraft {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return EMPTY_ONBOARDING_DRAFT;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    return {
      ...EMPTY_ONBOARDING_DRAFT,
      ...parsed,
      roleCategories: savedIds(
        parsed.roleCategories,
        ONBOARDING_ROLE_CATEGORY_IDS,
      ),
      roles: savedIds(parsed.roles, ONBOARDING_ROLE_IDS),
      location: savedLocations(parsed.location),
      help: Array.isArray(parsed.help) ? parsed.help : [],
    };
  } catch {
    return EMPTY_ONBOARDING_DRAFT;
  }
}

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(draft));
}

export function hasCompletedOnboarding(): boolean {
  return loadOnboardingDraft().completed;
}

export function roleSearchKeywords(roles: readonly string[]): string[] {
  const names = new Set<string>();
  for (const role of roles) {
    const words = ROLE_SEARCH_KEYWORDS[role as OnboardingRoleId];
    words?.forEach((word) => names.add(word));
  }
  return [...names];
}

export function skillsForRoles(roles: readonly string[]): string[] {
  const names = new Set<string>();
  for (const role of roles) {
    const skill = ROLE_SEARCH_KEYWORDS[role as OnboardingRoleId]?.[0];
    if (skill) names.add(skill);
  }
  return [...names];
}

const ONBOARDING_SEED_SKILLS = new Set(
  ONBOARDING_ROLE_IDS.map((role) =>
    ROLE_SEARCH_KEYWORDS[role]?.[0]?.trim().toLowerCase(),
  ).filter((name): name is string => Boolean(name)),
);

/** Skills written automatically from the signup quiz, not added on the profile. */
export function isOnboardingSeedSkill(name: string): boolean {
  return ONBOARDING_SEED_SKILLS.has(name.trim().toLowerCase());
}

export function industryYearsForAnswers(
  roles: readonly string[],
  experience: OnboardingExperience | null,
): Record<string, number> {
  if (!experience) return {};
  const years = EXPERIENCE_YEARS[experience];
  if (years <= 0) return {};

  const industries = new Set<string>();
  for (const role of roles) {
    const title = ROLE_TITLES[role as OnboardingRoleId];
    if (!title) continue;
    getIndustriesForPosition(title).forEach((industry) =>
      industries.add(industry),
    );
  }

  return Object.fromEntries([...industries].map((industry) => [industry, years]));
}

/** Save quiz skills and industry years. Answers stay in the browser cache and are not written to About Me. */
export async function applyOnboardingAnswers(): Promise<void> {
  const draft = loadOnboardingDraft();
  if (!draft.completed) return;

  for (const skill of skillsForRoles(draft.roles)) {
    try {
      await profileApi.addSkill(skill);
    } catch {
      // A skill that is already on the profile should not block the rest.
    }
  }

  const years = industryYearsForAnswers(draft.roles, draft.experience);
  if (Object.keys(years).length > 0) {
    const existing = await profileApi.getIndustryProfile().catch(() => ({}));
    if (Object.keys(existing).length === 0) {
      const payload = {
        industry_years_json: years,
        updated_at: new Date().toISOString(),
      };
      try {
        await apiClient.put(API_ENDPOINTS.ME.INDUSTRY_PROFILE, payload);
      } catch (error) {
        const status =
          error && typeof error === "object" && "response" in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;
        if (status === 405) {
          await apiClient.patch(API_ENDPOINTS.ME.INDUSTRY_PROFILE, payload);
        }
      }
    }
  }
}
