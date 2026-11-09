import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { jobService, type ApiJob } from "@/api/jobs";
import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { ArrowLeft, Briefcase, Clock } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import {
  resolveJobEmploymentType,
  resolveJobWorkArrangement,
} from "@/utils/jobEmploymentDisplay";
import { formatJobSalaryDisplay } from "@/utils/jobSalaryFormat";
import { getLocalizedPath } from "@/utils/localeUtils";
import { cn } from "@/lib/utils";
import {
  jobMatchesOnboardingLocation,
  loadOnboardingDraft,
  locationSearchCountries,
  ROLE_CATEGORY_SUBROLES,
  roleSearchKeywords,
  saveOnboardingDraft,
  subrolesForCategories,
  type OnboardingDraft,
  type OnboardingExperience,
  type OnboardingHelp,
  type OnboardingIntent,
  type OnboardingLocation,
  type OnboardingRoleCategoryId,
  type OnboardingRoleId,
  type OnboardingSituation,
  ONBOARDING_ROLE_CATEGORY_IDS,
} from "@/onboarding/onboardingAnswers";

const STEP_COUNT = 10;
const SEARCH_STEP = STEP_COUNT - 1;

type PreviewJob = {
  id: string;
  title: string;
  company: string;
  logo?: string;
  employmentType: string;
  workArrangement: string;
  salary: string;
};

function textField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function locationOf(job: ApiJob): string {
  const direct = textField(job.location);
  if (direct) return direct;
  const parts = [
    job.job_city,
    job.city,
    job.job_state,
    job.state,
    job.job_country,
    job.country,
  ]
    .map(textField)
    .filter(Boolean);
  return [...new Set(parts)].join(", ");
}

function logoOf(job: ApiJob): string | undefined {
  const candidates = [
    job.company_logo,
    job.employer_logo,
    job.logo_url,
    job.logo_upload,
  ];
  for (const candidate of candidates) {
    const logo = textField(candidate);
    if (!logo) continue;
    if (logo.startsWith("//")) return `https:${logo}`;
    if (
      logo.startsWith("http://") ||
      logo.startsWith("https://") ||
      logo.startsWith("data:") ||
      logo.startsWith("/")
    ) {
      return logo;
    }
  }
  return undefined;
}

function countryOf(job: ApiJob): string {
  const extra = job as { location_country?: unknown };
  return textField(job.job_country || job.country || extra.location_country);
}

function toPreviewJob(job: ApiJob): PreviewJob {
  const title = textField(job.job_title || job.title);
  const company = textField(job.company_name || job.employer_name || job.company);
  return {
    id: String(job.job_id || job.id || `${title}-${company}`),
    title,
    company,
    logo: logoOf(job),
    employmentType: resolveJobEmploymentType(job),
    workArrangement: resolveJobWorkArrangement(job),
    salary: formatJobSalaryDisplay(job),
  };
}

function pickTopJobs(jobs: ApiJob[], keywords: string[]): PreviewJob[] {
  const lowered = keywords.map((word) => word.toLowerCase());
  const scored = jobs
    .map((job) => {
      const preview = toPreviewJob(job);
      const haystack = preview.title.toLowerCase();
      const score = lowered.reduce(
        (total, word) => total + (haystack.includes(word) ? 1 : 0),
        0,
      );
      return { ...preview, score };
    })
    .filter((job) => job.title && job.score > 0);

  scored.sort((left, right) => right.score - left.score);
  const seen = new Set<string>();
  const top: PreviewJob[] = [];
  for (const job of scored) {
    const key = `${job.title}|${job.company}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    top.push({
      id: job.id,
      title: job.title,
      company: job.company,
      logo: job.logo,
      employmentType: job.employmentType,
      workArrangement: job.workArrangement,
      salary: job.salary,
    });
    if (top.length === 5) break;
  }
  return top;
}

async function fetchMatchingJobs(
  keywords: string[],
  countries: string[],
): Promise<ApiJob[]> {
  if (keywords.length === 0) return [];
  const result = await jobService.fetchActiveJobs({
    query: "",
    page: 1,
    pageSize: 40,
    sort: "newest",
    filters: {
      country: "",
      countries: [],
      jobTypes: [],
      isRemote: false,
      skills: keywords,
      ...(countries.length > 0 ? { locationCountry: countries } : {}),
    },
  });
  return result.jobs;
}

function roleMatches(
  jobs: ApiJob[],
  role: string,
  choices: readonly OnboardingLocation[],
): PreviewJob[] {
  const keywords = roleSearchKeywords([role]);
  const scoped =
    choices.length > 0
      ? jobs.filter((job) =>
          choices.some((choice) =>
            jobMatchesOnboardingLocation(countryOf(job), locationOf(job), choice),
          ),
        )
      : jobs;
  return pickTopJobs(scoped, keywords);
}

function mergeRoleJobs(lists: PreviewJob[][]): PreviewJob[] {
  const merged: PreviewJob[] = [];
  const seen = new Set<string>();
  const longest = lists.reduce((count, list) => Math.max(count, list.length), 0);
  for (let index = 0; index < longest && merged.length < 5; index += 1) {
    for (const list of lists) {
      const job = list[index];
      if (!job) continue;
      const key = `${job.title}|${job.company}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(job);
      if (merged.length === 5) break;
    }
  }
  return merged;
}

async function loadJobsForRoles(
  roles: readonly string[],
  choices: readonly OnboardingLocation[],
): Promise<PreviewJob[]> {
  const keywords = roleSearchKeywords(roles);
  const countries = locationSearchCountries(choices);
  const regionalJobs = await fetchMatchingJobs(keywords, countries).catch(
    () => [],
  );
  const regional = mergeRoleJobs(
    roles.map((role) => roleMatches(regionalJobs, role, choices)),
  );
  if (regional.length > 0 || countries.length === 0) return regional;
  const allJobs = await fetchMatchingJobs(keywords, []).catch(() => []);
  return mergeRoleJobs(roles.map((role) => roleMatches(allJobs, role, [])));
}

const INTENTS: OnboardingIntent[] = ["jobs", "interviews", "learning", "cv"];
const SITUATIONS: OnboardingSituation[] = [
  "first_job",
  "change",
  "growth",
  "income",
  "balance",
];
const LOCATIONS: OnboardingLocation[] = ["georgia", "europe", "asia"];
const EXPERIENCES: OnboardingExperience[] = [
  "starting",
  "some",
  "mid",
  "senior",
];
const HELPS: OnboardingHelp[] = ["jobs", "interviews", "courses", "atoms"];

const hoverLoop = { duration: 1.1, repeat: Infinity, ease: "easeInOut" as const };

function IntentArt({ id }: { id: OnboardingIntent }) {
  const common = "h-16 w-16 shrink-0";
  if (id === "jobs") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden>
        <rect x="8" y="14" width="48" height="36" rx="8" className="fill-breneo-blue/15" />
        <path d="M24 14v-2a8 8 0 0 1 16 0v2" className="stroke-breneo-blue" strokeWidth="3" fill="none" />
        <motion.circle
          cx="32"
          cy="34"
          r="6"
          className="fill-breneo-blue"
          style={{ originX: "32px", originY: "34px" }}
          variants={{
            rest: { scale: 1 },
            hover: { scale: [1, 1.16, 1], transition: hoverLoop },
          }}
        />
      </svg>
    );
  }
  if (id === "interviews") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden>
        <rect x="6" y="12" width="28" height="36" rx="8" className="fill-breneo-blue/15" />
        <motion.rect
          x="30"
          y="18"
          width="28"
          height="28"
          rx="14"
          className="fill-breneo-blue"
          variants={{
            rest: { y: 0 },
            hover: { y: [0, -4, 0], transition: hoverLoop },
          }}
        />
      </svg>
    );
  }
  if (id === "learning") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden>
        <path d="M8 26 32 14l24 12-24 12L8 26Z" className="fill-breneo-blue/20" />
        <motion.path
          d="M20 32v10c4 4 20 4 24 0V32"
          className="stroke-breneo-blue"
          strokeWidth="3"
          fill="none"
          variants={{
            rest: { pathLength: 1 },
            hover: {
              pathLength: [0, 1],
              transition: { duration: 1.2, repeat: Infinity, repeatDelay: 0.35 },
            },
          }}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={common} aria-hidden>
      <rect x="14" y="8" width="36" height="48" rx="6" className="fill-breneo-blue/15" />
      <motion.path
        d="M22 22h20M22 32h16M22 42h12"
        className="stroke-breneo-blue"
        strokeWidth="3"
        strokeLinecap="round"
        variants={{
          rest: { pathLength: 1 },
          hover: {
            pathLength: [0, 1],
            transition: { duration: 1.2, repeat: Infinity, repeatDelay: 0.25 },
          },
        }}
      />
    </svg>
  );
}

function MatchChart() {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#242424]">
      <svg viewBox="0 0 320 170" className="h-auto w-full">
        <defs>
          <linearGradient
            id="breneo-chart-line"
            x1="24"
            y1="140"
            x2="300"
            y2="18"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#5D78FF" />
            <stop offset="100%" stopColor="#2EB9D1" />
          </linearGradient>
        </defs>
        {[40, 80, 120].map((y) => (
          <line
            key={y}
            x1="24"
            x2="300"
            y1={y}
            y2={y}
            className="stroke-gray-200 dark:stroke-gray-700"
            strokeDasharray="4 6"
          />
        ))}
        <motion.path
          d="M24 140 C 90 132, 140 70, 200 52 S 270 24, 300 18"
          fill="none"
          stroke="url(#breneo-chart-line)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: "easeOut" }}
        />
        <motion.path
          d="M24 140 C 110 136, 190 128, 300 116"
          fill="none"
          stroke="#16a34a"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, delay: 0.2, ease: "easeOut" }}
        />
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(135deg,#5D78FF_0%,#2EB9D1_100%)]" />
          <ChartLegend kind="profile" />
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
          <ChartLegend kind="start" />
        </span>
      </div>
    </div>
  );
}

function ChartLegend({ kind }: { kind: "profile" | "start" }) {
  const t = useTranslation();
  return (
    <span>
      {kind === "profile" ? t.onboarding.chartProfile : t.onboarding.chartStart}
    </span>
  );
}

function CompareScene({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="aspect-[4/3] w-full rounded-2xl object-cover"
    />
  );
}

function WhyBreneo() {
  const t = useTranslation();
  const columns = [
    {
      label: t.onboarding.withoutBreneo,
      points: t.onboarding.withoutPoints,
      src: "/lovable-uploads/onboarding-without-breneo.jpg",
    },
    {
      label: t.onboarding.withBreneo,
      points: t.onboarding.withPoints,
      src: "/lovable-uploads/onboarding-with-breneo.jpg",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {columns.map((column) => (
        <div key={column.label} className="min-w-0">
          <CompareScene src={column.src} alt={column.label} />
          <h2 className="mb-2 mt-3 text-sm font-semibold text-slate-900 dark:text-white">
            {column.label}
          </h2>
          <ul className="space-y-2">
            {column.points.map((point) => (
              <li
                key={point}
                className="text-xs leading-relaxed text-slate-600 dark:text-slate-300"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const t = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const startPath = getLocalizedPath("/start", language);

  React.useEffect(() => {
    if (location.pathname !== startPath) {
      navigate(
        { pathname: startPath, search: location.search, hash: location.hash },
        { replace: true },
      );
    }
  }, [location.hash, location.pathname, location.search, navigate, startPath]);
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    loadOnboardingDraft(),
  );
  const [previewJobs, setPreviewJobs] = useState<PreviewJob[]>([]);
  const [previewReady, setPreviewReady] = useState(false);
  const roleKey = draft.roles.join(",");
  const locationKey = draft.location.join(",");

  const update = (patch: Partial<OnboardingDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      saveOnboardingDraft(next);
      return next;
    });
  };

  const canContinue = useMemo(() => {
    if (draft.step === 0) return draft.intent != null;
    if (draft.step === 1) return draft.situation != null;
    if (draft.step === 2) return true;
    if (draft.step === 3) return true;
    if (draft.step === 4) return draft.roleCategories.length > 0;
    if (draft.step === 5) return draft.roles.length > 0;
    if (draft.step === 6) return draft.location.length > 0;
    if (draft.step === 7) return draft.experience != null;
    if (draft.step === 8) return draft.help.length > 0;
    if (draft.step === SEARCH_STEP) return previewReady;
    return false;
  }, [draft, previewReady]);

  const summary = () => {
    const intent = draft.intent ? t.onboarding.intents[draft.intent].title : "";
    const situation = draft.situation
      ? t.onboarding.situations[draft.situation]
      : "";
    const experience = draft.experience
      ? t.onboarding.experiences[draft.experience]
      : "";
    const roles = draft.roles
      .map((role) => t.onboarding.roles[role])
      .join(", ");
    const place = draft.location
      .map((item) => t.onboarding.locations[item])
      .join(", ");
    const help = draft.help.map((item) => t.onboarding.helps[item]).join(", ");
    return [
      `${t.onboarding.summaryIntent}: ${intent}`,
      `${t.onboarding.summarySituation}: ${situation}`,
      `${t.onboarding.summaryExperience}: ${experience}`,
      `${t.onboarding.summaryRoles}: ${roles}`,
      `${t.onboarding.summaryLocation}: ${place}`,
      `${t.onboarding.summaryHelp}: ${help}`,
    ].join("\n");
  };

  const next = () => {
    if (!canContinue) return;
    if (draft.step >= STEP_COUNT - 1) {
      const completed = {
        ...draft,
        summary: summary(),
        completed: true,
        step: STEP_COUNT - 1,
      };
      saveOnboardingDraft(completed);
      navigate("/auth/signup");
      return;
    }
    if (draft.step + 1 === SEARCH_STEP) {
      setPreviewReady(false);
      setPreviewJobs([]);
    }
    update({ step: draft.step + 1 });
  };

  useEffect(() => {
    if (draft.step !== SEARCH_STEP) return;
    let cancelled = false;
    const waitMs = 5000 + Math.floor(Math.random() * 5001);
    setPreviewReady(false);
    setPreviewJobs([]);
    const roles = roleKey ? roleKey.split(",") : [];
    const choices = locationKey
      ? (locationKey.split(",") as OnboardingLocation[])
      : [];
    const jobsPromise = loadJobsForRoles(roles, choices).catch(() => []);
    const timer = new Promise<void>((resolve) => {
      window.setTimeout(resolve, waitMs);
    });
    void Promise.all([timer, jobsPromise]).then(([, jobs]) => {
      if (cancelled) return;
      setPreviewJobs(jobs);
      setPreviewReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.step, locationKey, roleKey]);

  const back = () => {
    if (draft.step === 0) {
      navigate("/auth/login");
      return;
    }
    update({ step: draft.step - 1 });
  };

  const toggleCategory = (category: OnboardingRoleCategoryId) => {
    const selected = draft.roleCategories.includes(category);
    const roleCategories = selected
      ? draft.roleCategories.filter((item) => item !== category)
      : [...draft.roleCategories, category];
    const allowed = new Set(subrolesForCategories(roleCategories));
    update({
      roleCategories,
      roles: draft.roles.filter((role) => allowed.has(role)),
    });
  };

  const toggleRole = (role: OnboardingRoleId) => {
    update({
      roles: draft.roles.includes(role)
        ? draft.roles.filter((item) => item !== role)
        : [...draft.roles, role],
    });
  };

  const toggleLocation = (place: OnboardingLocation) => {
    update({
      location: draft.location.includes(place)
        ? draft.location.filter((item) => item !== place)
        : [...draft.location, place],
    });
  };

  const toggleHelp = (help: OnboardingHelp) => {
    update({
      help: draft.help.includes(help)
        ? draft.help.filter((item) => item !== help)
        : [...draft.help, help],
    });
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#eef3ff] text-slate-900 dark:bg-[#12141a] dark:text-white">
      <AuthPageHeader />
      <div
        className={cn(
          "mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col px-5 pb-6",
          draft.step === SEARCH_STEP && previewReady
            ? "overflow-hidden"
            : "overflow-y-auto",
        )}
      >
        <div className="mb-6 flex gap-2">
          {Array.from({ length: STEP_COUNT }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index <= draft.step
                  ? "bg-breneo-blue"
                  : "bg-gray-300/80 dark:bg-white/15",
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={draft.step}
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 1, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28 }}
          >
            {draft.step === 0 ? (
              <Step
                title={t.onboarding.intentTitle}
                subtitle={t.onboarding.intentSubtitle}
              >
                <div className="space-y-3">
                  {INTENTS.map((intent) => {
                    const selected = draft.intent === intent;
                    return (
                      <motion.button
                        key={intent}
                        type="button"
                        onClick={() => update({ intent })}
                        className={optionClass(selected)}
                        initial="rest"
                        animate="rest"
                        whileHover="hover"
                      >
                        <div className="min-w-0 flex-1">
                          {intent === "jobs" ? (
                            <span className="mb-1 inline-flex rounded-full bg-breneo-blue/10 px-2 py-0.5 text-xs font-semibold text-breneo-blue">
                              {t.onboarding.popular}
                            </span>
                          ) : null}
                          <span className="block text-base font-semibold">
                            {t.onboarding.intents[intent].title}
                          </span>
                          <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                            {t.onboarding.intents[intent].description}
                          </span>
                        </div>
                        <IntentArt id={intent} />
                      </motion.button>
                    );
                  })}
                </div>
              </Step>
            ) : null}

            {draft.step === 1 ? (
              <Step
                title={t.onboarding.situationTitle}
                subtitle={t.onboarding.situationSubtitle}
              >
                <div className="space-y-3">
                  {SITUATIONS.map((situation) => (
                    <RadioRow
                      key={situation}
                      selected={draft.situation === situation}
                      label={t.onboarding.situations[situation]}
                      onClick={() => update({ situation })}
                    />
                  ))}
                </div>
              </Step>
            ) : null}

            {draft.step === 2 ? (
              <Step
                title={t.onboarding.chartTitle}
                subtitle={t.onboarding.chartSubtitle}
              >
                <MatchChart />
                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {t.onboarding.chartNote}
                </p>
              </Step>
            ) : null}

            {draft.step === 3 ? (
              <Step
                title={t.onboarding.whyTitle}
                subtitle={t.onboarding.whySubtitle}
              >
                <WhyBreneo />
                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {t.onboarding.whyNote}
                </p>
              </Step>
            ) : null}

            {draft.step === 4 ? (
              <Step
                title={t.onboarding.rolesTitle}
                subtitle={t.onboarding.rolesSubtitle}
              >
                <div className="flex flex-wrap gap-2">
                  {ONBOARDING_ROLE_CATEGORY_IDS.map((category) => {
                    const selected = draft.roleCategories.includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-medium transition",
                          selected
                            ? "border-breneo-blue bg-breneo-blue text-white"
                            : "border-transparent bg-white text-foreground shadow-sm dark:bg-[#242424]",
                        )}
                      >
                        {t.onboarding.roleCategories[category]}
                      </button>
                    );
                  })}
                </div>
              </Step>
            ) : null}

            {draft.step === 5 ? (
              <Step
                title={t.onboarding.subrolesTitle}
                subtitle={t.onboarding.subrolesSubtitle}
              >
                <div className="space-y-6">
                  {draft.roleCategories.map((category) => {
                    const seen = new Set(
                      draft.roleCategories
                        .slice(0, draft.roleCategories.indexOf(category))
                        .flatMap((earlier) => ROLE_CATEGORY_SUBROLES[earlier]),
                    );
                    const subroles = ROLE_CATEGORY_SUBROLES[category].filter(
                      (role) => !seen.has(role),
                    );
                    if (subroles.length === 0) return null;
                    return (
                      <div key={category}>
                        <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-300">
                          {t.onboarding.roleCategories[category]}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          {subroles.map((role) => {
                            const selected = draft.roles.includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => toggleRole(role)}
                                className={cn(
                                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                                  selected
                                    ? "border-breneo-blue bg-breneo-blue text-white"
                                    : "border-transparent bg-white text-foreground shadow-sm dark:bg-[#242424]",
                                )}
                              >
                                {t.onboarding.roles[role]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Step>
            ) : null}

            {draft.step === 6 ? (
              <Step
                title={t.onboarding.locationTitle}
                subtitle={t.onboarding.locationSubtitle}
              >
                <div className="space-y-3">
                  {LOCATIONS.map((place) => (
                    <RadioRow
                      key={place}
                      selected={draft.location.includes(place)}
                      label={t.onboarding.locations[place]}
                      onClick={() => toggleLocation(place)}
                    />
                  ))}
                </div>
              </Step>
            ) : null}

            {draft.step === 7 ? (
              <Step
                title={t.onboarding.experienceTitle}
                subtitle={t.onboarding.experienceSubtitle}
              >
                <div className="space-y-3">
                  {EXPERIENCES.map((experience) => (
                    <RadioRow
                      key={experience}
                      selected={draft.experience === experience}
                      label={t.onboarding.experiences[experience]}
                      onClick={() => update({ experience })}
                    />
                  ))}
                </div>
              </Step>
            ) : null}

            {draft.step === 8 ? (
              <Step
                title={t.onboarding.helpTitle}
                subtitle={t.onboarding.helpSubtitle}
              >
                <div className="space-y-3">
                  {HELPS.map((help) => (
                    <RadioRow
                      key={help}
                      selected={draft.help.includes(help)}
                      label={t.onboarding.helps[help]}
                      onClick={() => toggleHelp(help)}
                    />
                  ))}
                </div>
              </Step>
            ) : null}

            {draft.step === SEARCH_STEP ? (
              previewReady ? (
                <Step
                  title={t.onboarding.jobsForYou}
                  subtitle={t.onboarding.jobsForYouSubtitle}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  {previewJobs.length > 0 ? (
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <div className="divide-y divide-gray-200 overflow-hidden rounded-3xl bg-white dark:divide-gray-700 dark:bg-[#242424]">
                      {previewJobs.map((job) => (
                        <div key={job.id} className="p-4">
                          <div className="flex items-start gap-4">
                            {job.logo ? (
                              <img
                                src={job.logo}
                                alt=""
                                className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <h3 className="mb-1 truncate text-sm font-normal text-gray-600 dark:text-gray-300">
                                {job.company}
                              </h3>
                              <h4 className="mb-2 line-clamp-2 text-base font-bold">
                                {job.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4" />
                                  <span>{job.employmentType}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Briefcase className="h-4 w-4" />
                                  <span>{job.workArrangement}</span>
                                </span>
                                {job.salary ? <span>{job.salary}</span> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {t.onboarding.noPreviewJobs}
                    </p>
                  )}
                </Step>
              ) : (
                <Step
                  title={t.onboarding.searchingJobs}
                  subtitle=""
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                    <SearchingIllustration />
                    <SearchingStatus lines={t.onboarding.searchingLines} />
                  </div>
                </Step>
              )
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-slate-200/80 bg-[#eef3ff] dark:border-white/10 dark:bg-[#12141a]">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={back}
            aria-label={t.onboarding.back}
            className="h-14 w-14 shrink-0 rounded-2xl bg-white text-slate-900 hover:bg-white/80 dark:bg-[#242424] dark:text-white dark:hover:bg-[#2c2c2c]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            className="h-auto min-h-14 flex-1 whitespace-normal rounded-2xl px-4 py-3 text-center text-sm leading-snug sm:text-base"
            disabled={!canContinue}
            onClick={next}
          >
            {draft.step === SEARCH_STEP
              ? previewReady
                ? t.onboarding.registerToSeeAll
                : t.onboarding.searchingJobs
              : t.onboarding.continue}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SearchingStatus({ lines }: { lines: readonly string[] }) {
  const sequence = useMemo(() => {
    const next = [...lines];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [next[index], next[swap]] = [next[swap], next[index]];
    }
    return next;
  }, [lines]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (sequence.length === 0) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % sequence.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [sequence]);

  const line = sequence[index] ?? "";

  return (
    <div className="relative mt-2 h-8 w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="text-base font-medium text-slate-700 dark:text-slate-200"
        >
          {line}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function SearchingIllustration() {
  const cards = [
    { x: -92, y: -58, rotate: -8, delay: 0 },
    { x: 84, y: -8, rotate: 7, delay: 0.35 },
    { x: -12, y: 62, rotate: -3, delay: 0.7 },
  ];

  return (
    <div className="relative mx-auto min-h-64 w-full max-w-[360px] flex-1" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="h-full w-full rounded-full bg-breneo-blue/20 blur-2xl"
          animate={{ scale: [0.85, 1.12, 0.85], opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="h-full w-full rounded-full border border-dashed border-breneo-blue/35"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="h-full w-full rounded-full border border-breneo-blue/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      </div>
      {cards.map((card) => (
        <div key={`${card.x}-${card.y}`} className="absolute left-1/2 top-1/2">
          <motion.div
            className="w-[7.5rem] rounded-2xl border border-white/70 bg-white p-3 shadow-[0_12px_30px_rgba(37,99,235,0.12)] dark:border-white/10 dark:bg-[#242424]"
            style={{ marginLeft: "-3.75rem", marginTop: "-1.6rem" }}
            animate={{
              x: [card.x, card.x + 6, card.x],
              y: [card.y, card.y - 12, card.y],
              rotate: [card.rotate, card.rotate + 2, card.rotate],
            }}
            transition={{
              duration: 3.6,
              repeat: Infinity,
              delay: card.delay,
              ease: "easeInOut",
            }}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-md bg-breneo-blue/20" />
              <span className="h-1.5 w-10 rounded-full bg-slate-200 dark:bg-white/15" />
            </div>
            <div className="mb-1.5 h-2 w-full rounded-full bg-slate-200 dark:bg-white/15" />
            <div className="h-2 w-2/3 rounded-full bg-slate-100 dark:bg-white/10" />
          </motion.div>
        </div>
      ))}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
      <motion.div
        animate={{ x: [-16, 28, -16], y: [-20, 18, -20], rotate: [-12, 10, -12] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 72 72" className="h-20 w-20 drop-shadow-lg">
          <circle cx="30" cy="30" r="16" className="fill-white dark:fill-[#1c1f27]" />
          <circle
            cx="30"
            cy="30"
            r="16"
            className="fill-none stroke-breneo-blue"
            strokeWidth="5"
          />
          <circle cx="30" cy="30" r="7" className="fill-breneo-blue/15" />
          <path
            d="M42 42 L58 58"
            className="stroke-breneo-blue"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h1>
      {subtitle ? (
        <p className="mb-6 mt-2 text-base text-slate-600 dark:text-slate-300">
          {subtitle}
        </p>
      ) : (
        <div className="mt-2" />
      )}
      {children}
    </div>
  );
}

function RadioRow({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(optionClass(selected), "min-h-[4.5rem] py-5")}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-breneo-blue" : "border-gray-300 dark:border-gray-600",
        )}
      >
        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-breneo-blue" /> : null}
      </span>
      <span className="text-base font-medium">{label}</span>
    </button>
  );
}

function optionClass(selected: boolean) {
  return cn(
    "flex w-full items-center gap-4 rounded-3xl border bg-white px-5 py-4 text-left shadow-sm transition dark:bg-[#242424]",
    selected
      ? "border-breneo-blue ring-2 ring-breneo-blue/20"
      : "border-transparent hover:border-breneo-blue/30",
  );
}
