import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Link2,
  Briefcase,
  Pencil,
  PiggyBank,
  Clock,
  Loader2,
} from "lucide-react";
import { validateHttpUrl } from "@/api/employer/publishJob";
import { hasDistinctStructuredSections } from "@/utils/jobSectionsDedup";
import {
  JobDescriptionParagraphs,
  JobSectionBulletList,
} from "@/components/jobs/JobSectionContent";
import { EmployerJobSkillsPicker } from "@/components/employer/EmployerJobSkillsPicker";

export interface EmployerJobFormPreviewProps {
  companyName: string;
  companyLogo?: string | null;
  companyWebsite?: string | null;

  title: string;
  /** Full text the employer wrote — shown when AI has no distinct sections. */
  manualDescription: string;
  responsibilities: string[];
  qualifications: string[];
  useDescriptionOnly: boolean;

  selectedSkills: string[];
  onSelectedSkillsChange: (skills: string[]) => void;
  skillsRequireManual: boolean;

  previewExtracting?: boolean;

  workModeLabel: string;
  employmentType: string;
  applyUrl: string;

  previewLocationLine: string;
  previewSalaryLine: string;

  isEdit: boolean;
  responsibilitiesLabel: string;
  qualificationsLabel: string;
  skillsLabel?: string;
  skillsHint?: string;

  onExitPreview: () => void;
  onPublish: () => void;
  publishing: boolean;
  publishLabel: string;
}

export function EmployerJobFormPreview(p: EmployerJobFormPreviewProps) {
  const applyValid = validateHttpUrl(p.applyUrl);
  const canOpenApply =
    applyValid.ok === true && Boolean(applyValid.url?.trim());

  const showStructuredSections = hasDistinctStructuredSections({
    useDescriptionOnly: p.useDescriptionOnly,
    responsibilities: p.responsibilities,
    qualifications: p.qualifications,
  });

  return (
    <div
      id="preview"
      className="w-full max-w-7xl mx-auto pt-0 sm:pt-4 pb-40 sm:pb-32 md:pb-24 md:px-6 lg:px-8 space-y-4 scroll-mt-4"
    >
      <Card className="bg-transparent border-0 shadow-none h-full">
        <CardContent className="p-1 sm:p-6 space-y-2">
          <div>
            <div className="relative flex flex-col md:flex-row md:items-start gap-6 bg-white dark:bg-card rounded-3xl p-6 shadow-none border-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 sm:top-6 sm:right-6 shrink-0"
                onClick={p.onExitPreview}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <div className="flex-1 min-w-0 space-y-3 pr-2 sm:pr-24">
                <div className="flex items-center gap-4 mb-1">
                  {p.companyLogo ? (
                    <img
                      src={p.companyLogo}
                      alt={p.companyName || "Company logo"}
                      className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                    />
                  ) : null}
                  <div className="flex flex-col min-w-0 flex-1 gap-2">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                      {p.companyName}
                    </p>
                    <h1 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
                      {p.title.trim() || "Untitled position"}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">{p.previewLocationLine}</span>
                </div>

                <div className="flex flex-col gap-2 md:gap-3 mb-2 text-sm md:text-base font-medium text-gray-700 dark:text-gray-200">
                  <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                    <PiggyBank className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                    <span className="break-words">{p.previewSalaryLine}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                    <span className="break-words">{p.employmentType}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                    <Briefcase className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                    <span className="break-words">{p.workModeLabel}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link2 className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">Application URL</span>
                  </div>
                  <p className="text-sm break-all text-gray-700 dark:text-gray-300">
                    {p.applyUrl.trim() || "—"}
                  </p>
                </div>
              </div>

              {canOpenApply && applyValid.ok ? (
                <div className="flex flex-row items-start gap-2 md:pt-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(applyValid.url, "_blank")}
                  >
                    Apply Now
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-white dark:bg-card rounded-3xl p-6 shadow-none border-0 mt-6 space-y-[4.5rem]">
            {p.previewExtracting ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-breneo-blue" />
                <p className="text-sm font-medium text-foreground">
                  Analyzing job description…
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Extracting responsibilities, qualifications, and skills for
                  preview and candidate matching.
                </p>
              </div>
            ) : showStructuredSections ? (
              <>
                <div>
                  <h2 className="text-lg font-semibold mb-4">
                    {p.responsibilitiesLabel}
                  </h2>
                  <JobSectionBulletList items={p.responsibilities} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-4">
                    {p.qualificationsLabel}
                  </h2>
                  <JobSectionBulletList items={p.qualifications} />
                  {!p.previewExtracting ? (
                    <div className="mt-7 rounded-xl border border-dashed border-gray-300 dark:border-[#444444] p-4">
                      <EmployerJobSkillsPicker
                        selectedSkills={p.selectedSkills}
                        onSelectedSkillsChange={p.onSelectedSkillsChange}
                        required={p.skillsRequireManual}
                        label={p.skillsLabel ?? "Required skills"}
                        hint={
                          p.skillsHint ??
                          "Search and add skills for candidate matching. Pre-filled skills can be edited."
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </>
            ) : p.manualDescription.trim() ? (
              <div>
                <h2 className="text-lg font-semibold mb-4">Description</h2>
                <JobDescriptionParagraphs text={p.manualDescription} />
              </div>
            ) : null}

            {!p.previewExtracting && !showStructuredSections ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-[#444444] p-4">
                <EmployerJobSkillsPicker
                  selectedSkills={p.selectedSkills}
                  onSelectedSkillsChange={p.onSelectedSkillsChange}
                  required={p.skillsRequireManual}
                  label={p.skillsLabel ?? "Required skills"}
                  hint={
                    p.skillsHint ??
                    "Search and add skills for candidate matching. Pre-filled skills can be edited."
                  }
                />
              </div>
            ) : null}
          </div>

          <Card className="rounded-3xl border border-border/80 mt-8 bg-muted/30">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">
                  {p.isEdit ? "Save changes" : "Ready to publish?"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {p.isEdit
                    ? "Updates apply when you save."
                    : "Candidates will see this listing after you publish."}
                </p>
              </div>
              <Button
                type="button"
                disabled={p.publishing || p.previewExtracting}
                onClick={p.onPublish}
              >
                {p.publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {p.publishLabel}
                  </>
                ) : p.isEdit ? (
                  "Save changes"
                ) : (
                  "Publish job"
                )}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
