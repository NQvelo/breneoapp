import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ResumeMatch } from "@/api/ats";
import jobService from "@/api/jobs/jobService";
import type { ApiJob } from "@/api/jobs/types";
import { Loader2, Search } from "@/components/icons";
import { SettingsSectionCard } from "@/components/settings/SettingsSectionUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/contexts/LanguageContext";
import { stripHtmlToPlainText } from "@/utils/jobSectionDisplay";
import { formatScore } from "./cvDisplay";

export interface JobChoice {
  id: string;
  title: string;
  company: string;
  description: string;
}

export interface CvScoreInput {
  jobId?: string;
  jobTitle?: string;
  jobDescription?: string;
}

const EMPTY_FILTERS = {
  country: "",
  countries: [],
  jobTypes: [],
  isRemote: false,
  skills: [],
};

function toJobChoice(job: ApiJob): JobChoice | null {
  const id = String(job.id || job.job_id || "").trim();
  if (!id) return null;
  const title = String(job.title || job.job_title || "").trim();
  const companyValue = job.company;
  const company = String(
    job.company_name ||
      job.employer_name ||
      (typeof companyValue === "string" ? companyValue : "") ||
      "",
  ).trim();
  const description = stripHtmlToPlainText(
    String(job.description || job.job_description || ""),
  );
  return { id, title, company, description };
}

function yearsText(
  count: number | undefined,
  one: string,
  many: string,
): string {
  if (typeof count !== "number" || !Number.isFinite(count)) return "—";
  const template = count === 1 ? one : many;
  return template.replace("{count}", formatScore(count));
}

function ScoreRow({ label, value }: { label: string; value: number | undefined }) {
  const width =
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums font-medium">{formatScore(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function KeywordList({
  title,
  keywords,
  tone,
}: {
  title: string;
  keywords: string[];
  tone: "matched" | "missing";
}) {
  const t = useTranslation();
  const items = keywords.map((keyword) => keyword.trim()).filter(Boolean);
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      {items.length ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((keyword, index) => (
            <li
              key={`${keyword}-${index}`}
              className={
                tone === "matched"
                  ? "rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
              }
            >
              {keyword}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.settings.accountPage.cv.none}</p>
      )}
    </div>
  );
}

export function CvMatchPanel({
  match,
  scoring,
  error,
  onScore,
}: {
  match: ResumeMatch | null;
  scoring: boolean;
  error: string | null;
  onScore: (input: CvScoreInput) => void;
}) {
  const t = useTranslation();
  const copy = t.settings.accountPage.cv;
  const [jobQuery, setJobQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobChoice | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(jobQuery.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [jobQuery]);

  const jobsQuery = useQuery({
    queryKey: ["ats-job-search", debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    queryFn: async () => {
      const response = await jobService.fetchActiveJobs({
        query: debouncedQuery,
        filters: EMPTY_FILTERS,
        page: 1,
        pageSize: 8,
      });
      return (response.jobs ?? [])
        .map(toJobChoice)
        .filter((job): job is JobChoice => job !== null)
        .slice(0, 8);
    },
  });

  const canSubmit = Boolean(selectedJob?.id || jobDescription.trim());
  const recommendations = (match?.recommendations ?? [])
    .map((line) => line.trim())
    .filter(Boolean);

  const selectJob = (job: JobChoice) => {
    setSelectedJob(job);
    setJobTitle(job.title);
    setJobDescription((current) => current.trim() || job.description);
    setJobQuery("");
    setDebouncedQuery("");
  };

  const submit = () => {
    if (!canSubmit || scoring) return;
    onScore({
      jobId: selectedJob?.id,
      jobTitle: jobTitle.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <SettingsSectionCard title={copy.matchTitle} description={copy.matchHint}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cv-job-search">{copy.jobSearch}</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cv-job-search"
                value={jobQuery}
                onChange={(event) => setJobQuery(event.target.value)}
                placeholder={copy.jobSearchPlaceholder}
                className="pl-9"
                autoComplete="off"
              />
            </div>
            {debouncedQuery.length >= 2 ? (
              <div className="overflow-hidden rounded-2xl border border-border/70">
                {jobsQuery.isFetching ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    {copy.searching}
                  </p>
                ) : jobsQuery.isError ? (
                  <p className="px-3 py-2 text-sm text-destructive">
                    {copy.jobSearchFailed}
                  </p>
                ) : (jobsQuery.data ?? []).length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    {copy.noJobs}
                  </p>
                ) : (
                  <ul>
                    {(jobsQuery.data ?? []).map((job) => (
                      <li key={job.id}>
                        <button
                          type="button"
                          onClick={() => selectJob(job)}
                          className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted"
                        >
                          <span className="text-sm font-medium">
                            {job.title || job.id}
                          </span>
                          {job.company ? (
                            <span className="text-xs text-muted-foreground">
                              {job.company}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          {selectedJob ? (
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-muted px-3 py-2">
              <div>
                <p className="text-xs text-muted-foreground">{copy.selectedJob}</p>
                <p className="text-sm font-medium">
                  {selectedJob.title || selectedJob.id}
                </p>
                {selectedJob.company ? (
                  <p className="text-xs text-muted-foreground">{selectedJob.company}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedJob(null)}
              >
                {t.common.clear}
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="cv-job-title">{copy.jobTitle}</Label>
            <Input
              id="cv-job-title"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder={copy.jobTitlePlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cv-job-description">{copy.jobDescription}</Label>
            <Textarea
              id="cv-job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder={copy.jobDescriptionPlaceholder}
              className="min-h-32"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            onClick={submit}
            disabled={!canSubmit || scoring}
            className="w-full sm:w-auto"
          >
            {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {scoring ? copy.scoring : match ? copy.scoreAgain : copy.scoreAction}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {copy.scorePrompt}
          </p>
        </div>
      </SettingsSectionCard>

      {match ? (
        <SettingsSectionCard>
          <div className="space-y-6" aria-live="polite">
            <div>
              <p className="text-sm text-muted-foreground">{copy.overall}</p>
              <p className="text-5xl font-semibold tabular-nums tracking-tight">
                {formatScore(match.scores?.overall)}
              </p>
            </div>
            <div className="space-y-4">
              <ScoreRow
                label={copy.keywordOverlap}
                value={match.scores?.keyword_overlap}
              />
              <ScoreRow label={copy.experienceScore} value={match.scores?.experience} />
              <ScoreRow
                label={copy.semantic}
                value={match.scores?.semantic_similarity}
              />
            </div>
            <KeywordList
              title={copy.matchedKeywords}
              keywords={match.matched_keywords ?? []}
              tone="matched"
            />
            <KeywordList
              title={copy.missingKeywords}
              keywords={match.missing_keywords ?? []}
              tone="missing"
            />
            <div className="space-y-1 text-sm">
              <p>
                {copy.candidateYears}:{" "}
                {yearsText(
                  match.candidate_years_experience,
                  copy.yearsOne,
                  copy.yearsMany,
                )}
              </p>
              <p>
                {copy.requiredYears}:{" "}
                {yearsText(
                  match.required_years_experience,
                  copy.yearsOne,
                  copy.yearsMany,
                )}
              </p>
            </div>
            {recommendations.length ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{copy.recommendations}</h4>
                <ul className="space-y-2">
                  {recommendations.map((line, index) => (
                    <li key={`${index}-${line}`} className="text-sm leading-relaxed">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </SettingsSectionCard>
      ) : null}
    </div>
  );
}
