import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSectionCard } from "@/components/settings/SettingsSectionUi";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { profileApi } from "@/api/profile";
import { parseResumePdf } from "@/services/resume/resumeImportService";
import { refreshUserIndustryProfile } from "@/services/industry/refreshUserIndustryProfile";

const normalizeSkillName = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const toEducationKey = (entry: {
  school_name?: string;
  major?: string;
  start_date?: string;
  end_date?: string | null;
}) =>
  [
    (entry.school_name || "").trim().toLowerCase(),
    (entry.major || "").trim().toLowerCase(),
    (entry.start_date || "").trim(),
    (entry.end_date || "").trim(),
  ].join("|");

const toWorkKey = (entry: {
  company?: string;
  job_title?: string;
  start_date?: string;
  end_date?: string | null;
}) =>
  [
    (entry.company || "").trim().toLowerCase(),
    (entry.job_title || "").trim().toLowerCase(),
    (entry.start_date || "").trim(),
    (entry.end_date || "").trim(),
  ].join("|");

/**
 * Self-contained card that lets the user update their profile information by
 * uploading a PDF resume. Parses the CV and fills profile summary, education,
 * work experience, and skills. Gated behind an active subscription.
 */
export function ResumeImportCard() {
  const { user } = useAuth();
  const t = useTranslation();
  const { subscriptionInfo, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const isPremium = subscriptionInfo?.is_active === true;

  const triggerUpload = () => {
    if (subscriptionLoading) return;
    if (!isPremium) {
      navigate("/settings?section=subscription&upgrade=true");
      return;
    }
    inputRef.current?.click();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isPremium) {
      navigate("/settings?section=subscription&upgrade=true");
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Please upload a PDF CV file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("CV file size must be 10MB or less.");
      return;
    }

    setImporting(true);
    setProgress(3);
    try {
      const parsed = await parseResumePdf(file, (percent) => {
        setProgress((prev) => Math.max(prev, percent));
      });
      setProgress((prev) => Math.max(prev, 92));

      const [existingEducations, existingWork, existingSkills] =
        await Promise.all([
          profileApi.getEducations().catch(() => []),
          profileApi.getWorkExperiences().catch(() => []),
          profileApi.getMySkills().catch(() => []),
        ]);

      let createdEducationCount = 0;
      let createdWorkCount = 0;
      let createdSkillCount = 0;
      let aboutMeUpdated = false;

      if (parsed.aboutMe?.trim()) {
        await profileApi.updateProfile({ about_me: parsed.aboutMe.trim() });
        aboutMeUpdated = true;
      }

      const existingEducationKeys = new Set(
        (Array.isArray(existingEducations) ? existingEducations : []).map((e) =>
          toEducationKey(e),
        ),
      );
      for (const education of parsed.educations) {
        const key = toEducationKey(education);
        if (existingEducationKeys.has(key)) continue;
        await profileApi.createEducation(education);
        existingEducationKeys.add(key);
        createdEducationCount += 1;
      }

      const existingWorkKeys = new Set(
        (Array.isArray(existingWork) ? existingWork : []).map((w) =>
          toWorkKey(w),
        ),
      );
      for (const work of parsed.workExperiences) {
        const key = toWorkKey(work);
        if (existingWorkKeys.has(key)) continue;
        await profileApi.createWorkExperience(work);
        existingWorkKeys.add(key);
        createdWorkCount += 1;
      }

      const existingSkillNames = new Set(
        (Array.isArray(existingSkills) ? existingSkills : []).map((s) =>
          normalizeSkillName(s.skill_name).toLowerCase(),
        ),
      );
      for (const skill of parsed.skills) {
        const normalized = normalizeSkillName(skill).toLowerCase();
        if (!normalized || existingSkillNames.has(normalized)) continue;
        await profileApi.addSkill(skill);
        existingSkillNames.add(normalized);
        createdSkillCount += 1;
      }

      const freshWork = await profileApi.getWorkExperiences().catch(() => []);
      if (user?.id) {
        try {
          await refreshUserIndustryProfile(
            String(user.id),
            Array.isArray(freshWork) ? freshWork : [],
          );
        } catch (err) {
          console.error(
            "[Industry profile] refresh after CV import failed:",
            err,
          );
        }
      }

      const insertedTotal =
        createdEducationCount + createdWorkCount + createdSkillCount;
      if (!insertedTotal && !aboutMeUpdated) {
        toast.info("CV parsed, but no new profile data was found to import.");
      } else {
        toast.success(
          `Profile updated: ${createdEducationCount} education, ${createdWorkCount} work experience, ${createdSkillCount} skills${aboutMeUpdated ? ", about me updated" : ""}.`,
        );
      }
      setProgress(100);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to parse and import CV.";
      toast.error(message);
    } finally {
      setTimeout(() => {
        setImporting(false);
        setProgress(0);
      }, 600);
    }
  };

  return (
    <SettingsSectionCard contentClassName="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t.settings.accountPage.resumeDescription}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleUpload}
        disabled={importing}
      />

      <Button
        type="button"
        variant="outline"
        onClick={triggerUpload}
        disabled={importing || subscriptionLoading}
        className="h-11 w-full rounded-full sm:w-auto"
      >
        {importing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileUp className="mr-2 h-4 w-4" />
        )}
        {importing
          ? t.settings.accountPage.uploadingResume
          : t.settings.accountPage.uploadResume}
      </Button>

      {!isPremium && !subscriptionLoading && (
        <p className="text-xs font-semibold text-breneo-blue">
          {t.settings.accountPage.premiumFeature}
        </p>
      )}

      {importing && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
      )}
    </SettingsSectionCard>
  );
}

export default ResumeImportCard;
