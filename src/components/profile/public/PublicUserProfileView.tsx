import React from "react";
import { Loader2, Mail, MapPin, Phone } from "lucide-react";
import { JobMatchIndicator } from "@/components/jobs/JobMatchIndicator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { cn } from "@/lib/utils";
import type { PublicUserProfile } from "@/api/profile/publicUserProfileTypes";
import { formatProfileDateRange } from "@/utils/profileDateFormat";
import {
  formatSocialUrlLabel,
  getSocialIcon,
  type SocialPlatform,
} from "@/components/profile/public/socialIcons";

interface PublicUserProfileViewProps {
  profile: PublicUserProfile;
  matchPercentage?: number | null;
  matchLoading?: boolean;
}

/** Light: grey section cards on white modal; dark: #242424 cards on #181818 modal. */
const profileSectionCardClass =
  "border-0 rounded-3xl bg-breneo-lightgray dark:bg-[#242424]";

function displayName(profile: PublicUserProfile): string {
  return `${profile.first_name} ${profile.last_name}`.trim() || "Applicant";
}

function avatarFallback(profile: PublicUserProfile): string {
  const letter =
    profile.first_name?.charAt(0) || profile.last_name?.charAt(0) || "U";
  return letter.toUpperCase();
}

function locationLabel(profile: PublicUserProfile): string | null {
  const parts = [profile.city, profile.country_region].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function industryLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PublicUserProfileView({
  profile,
  matchPercentage = null,
  matchLoading = false,
}: PublicUserProfileViewProps) {
  const name = displayName(profile);
  const location = locationLabel(profile);
  const socialEntries = (
    Object.entries(profile.social_links) as [SocialPlatform, string | null][]
  ).filter(([, url]) => url?.trim());

  const industryYears = profile.industry_profile?.industry_years_json ?? {};
  const industryEntries = Object.entries(industryYears).filter(
    ([, years]) => typeof years === "number" && years > 0,
  );

  const recommendedRole = profile.career?.final_role?.trim() || null;
  const showMatch =
    matchLoading || (matchPercentage != null && matchPercentage >= 0);
  const showRecommendedRole =
    Boolean(recommendedRole) || industryEntries.length > 0;

  return (
    <div className="space-y-4 pb-6">
      <Card className={profileSectionCardClass}>
        <CardContent className="px-6 py-6">
          <div className="flex flex-row items-center gap-4 mb-4">
            <div className="flex-shrink-0 w-14 h-14">
              <OptimizedAvatar
                src={profile.profile_image}
                alt={name}
                fallback={avatarFallback(profile)}
                size="lg"
                className="rounded-full w-14 h-14"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {name}
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {location ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                <MapPin className="h-4 w-4 text-gray-500" />
                {location}
              </span>
            ) : null}
            {profile.email ? (
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 hover:underline"
              >
                <Mail className="h-4 w-4 text-gray-500" />
                {profile.email}
              </a>
            ) : null}
            {profile.phone_number ? (
              <a
                href={`tel:${profile.phone_number}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 hover:underline"
              >
                <Phone className="h-4 w-4 text-gray-500" />
                {profile.phone_number}
              </a>
            ) : null}
            {socialEntries.map(([platform, url]) => (
              <a
                key={platform}
                href={url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 hover:underline"
              >
                {getSocialIcon(platform, "h-4 w-4 text-gray-500")}
                {formatSocialUrlLabel(url!)}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {showMatch || showRecommendedRole ? (
        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
          {showMatch ? (
            <ProfileSection className="sm:w-auto shrink-0">
              <div className="flex justify-center items-center min-h-[4.5rem]">
                {matchLoading ? (
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                ) : (
                  <JobMatchIndicator
                    matchPercentage={matchPercentage ?? undefined}
                    size={56}
                    labelPosition="below"
                  />
                )}
              </div>
            </ProfileSection>
          ) : null}
          {showRecommendedRole ? (
            <ProfileSection className="flex-1 min-w-0">
              <div className="space-y-4">
                {recommendedRole ? (
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-semibold">Recommended role:</span>{" "}
                    {recommendedRole}
                  </p>
                ) : null}
                {industryEntries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {industryEntries.map(([key, years]) => (
                      <Badge
                        key={key}
                        variant="outline"
                        className="rounded-[10px] px-3 py-1.5 text-xs"
                      >
                        {industryLabel(key)}: {years}{" "}
                        {years === 1 ? "yr" : "yrs"}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </ProfileSection>
          ) : null}
        </div>
      ) : null}

      <ProfileSection title="About Me">
        {profile.about_me?.trim() ? (
          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
            {profile.about_me}
          </p>
        ) : (
          <p className="text-sm text-gray-500 italic">No bio provided.</p>
        )}
      </ProfileSection>

      <ProfileSection title="Education">
        {profile.educations.length === 0 ? (
          <p className="text-sm text-gray-500">No education listed.</p>
        ) : (
          <Timeline>
            {profile.educations.map((entry, index) => (
              <TimelineItem
                key={entry.id}
                showLine={index < profile.educations.length - 1}
                date={formatProfileDateRange(
                  entry.start_date,
                  entry.end_date,
                  entry.is_current,
                )}
                title={entry.school_name}
                subtitle={[entry.degree_type, entry.major]
                  .filter(Boolean)
                  .join(" in ")}
              />
            ))}
          </Timeline>
        )}
      </ProfileSection>

      <ProfileSection title="Work experience">
        {profile.work_experiences.length === 0 ? (
          <p className="text-sm text-gray-500">No work experience listed.</p>
        ) : (
          <Timeline>
            {profile.work_experiences.map((entry, index) => (
              <TimelineItem
                key={entry.id}
                showLine={index < profile.work_experiences.length - 1}
                date={formatProfileDateRange(
                  entry.start_date,
                  entry.end_date,
                  entry.is_current,
                )}
                title={entry.company}
                subtitle={entry.job_title}
                meta={[entry.job_type, entry.location]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </Timeline>
        )}
      </ProfileSection>

      <ProfileSection title="Skills">
        {profile.skills.length === 0 ? (
          <p className="text-sm text-gray-500">No skills listed.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <Badge
                key={s.id}
                variant="outline"
                className="capitalize px-3 py-1.5 text-xs rounded-[10px] bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700"
              >
                {s.skill_name}
              </Badge>
            ))}
          </div>
        )}
      </ProfileSection>
    </div>
  );
}

function ProfileSection({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn(profileSectionCardClass, className)}>
      {title ? (
        <CardHeader className="p-4 pb-3 border-b-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </CardHeader>
      ) : null}
      <CardContent className={title ? "px-6 pb-6" : "p-6"}>
        {children}
      </CardContent>
    </Card>
  );
}

function Timeline({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

function TimelineItem({
  date,
  title,
  subtitle,
  meta,
  showLine,
}: {
  date: string;
  title: string;
  subtitle?: string;
  meta?: string;
  showLine: boolean;
}) {
  return (
    <div className="flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full bg-[#36B0E3] shrink-0" />
        {showLine ? (
          <div className="w-px flex-1 min-h-[2rem] bg-[#36B0E3]/30 mt-1" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        {date ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            {date}
          </p>
        ) : null}
        <p className="font-bold text-gray-900 dark:text-gray-100">{title}</p>
        {subtitle ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>
        ) : null}
        {meta ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {meta}
          </p>
        ) : null}
      </div>
    </div>
  );
}
