import {
  ONBOARDING_ROLE_IDS,
  type OnboardingRoleId,
} from "@/onboarding/onboardingAnswers";

export interface CvInterviewSignals {
  skills: string[];
  jobTitles: string[];
}

function cvText({ skills, jobTitles }: CvInterviewSignals): string {
  return [...skills, ...jobTitles]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .join("\n");
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

/** Prepared-role slugs that match skills and job titles saved from the CV. */
export function matchInterviewRoles(
  signals: CvInterviewSignals,
): OnboardingRoleId[] {
  const text = cvText(signals);
  if (!text) return [];

  const react = has(text, /\breact(?:\.js|js)?\b/);
  const frontend = has(
    text,
    /\b(?:front[- ]?end|vue(?:\.js|js)?|angular(?:js)?|svelte|next\.?js|typescript|javascript|html5?|css3?)\b|ფრონტენდ|ფრონტ-ენდ/,
  );
  const backend = has(
    text,
    /\b(?:back[- ]?end|node(?:\.?js)?|nodejs|django|flask|fastapi|spring|express|nestjs|golang|laravel|rails|php|\.net|python|java)\b|ბექენდ|ბექ-ენდ/,
  );
  const fullstack =
    has(text, /\bfull[- ]?stack\b|ფულსტეკ|ფულ სტეკ/) || (frontend && backend);
  const devops = has(
    text,
    /\b(?:devops|kubernetes|k8s|terraform|docker|jenkins|ansible|sre|ci\/cd)\b/,
  );
  const ios = has(text, /\bios\b|\bswift(?:ui)?\b|\bobjective-?c\b/);
  const android = has(text, /\bandroid\b|\bkotlin\b|\bjetpack\b/);
  const qa = has(
    text,
    /\b(?:qa|sdet|selenium|cypress|playwright|tester)\b|quality assurance/,
  );
  const dataEngineer = has(
    text,
    /\bdata engineer\b|\b(?:spark|airflow|hadoop|snowflake|dbt|bigquery)\b|\betl\b/,
  );
  const dataAnalyst = has(text, /\bdata analyst\b/);
  const dataScientist = has(text, /\bdata scientist\b/);
  const security = has(
    text,
    /\b(?:cybersecurity|infosec|appsec|pentest|penetration)\b|security engineer|უსაფრთხოებ/,
  );

  const matched = new Set<OnboardingRoleId>();
  if (react) matched.add("react");
  if (react || frontend) matched.add("frontend");
  if (backend) matched.add("backend");
  if (fullstack || (react && backend) || (frontend && backend)) {
    matched.add("fullstack");
  }
  if (devops) matched.add("devops");
  if (ios) matched.add("ios");
  if (android) matched.add("android");
  if (qa) matched.add("qa");
  if (dataAnalyst) matched.add("data_analyst");
  if (dataScientist) matched.add("data_scientist");
  if (dataEngineer) matched.add("data_engineer");
  if (security) matched.add("security");

  return ONBOARDING_ROLE_IDS.filter((roleId) => matched.has(roleId));
}
