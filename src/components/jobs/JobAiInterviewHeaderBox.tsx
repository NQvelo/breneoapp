import React from "react";
import { cn } from "@/lib/utils";

export const AI_INTERVIEW_ILLUSTRATION_LIGHT =
  "/lovable-uploads/ai%20interview%20illustration%20light%20mode.png";
export const AI_INTERVIEW_ILLUSTRATION_DARK =
  "/lovable-uploads/ai%20interview%20illustration%20dark%20mode.png";

export function buildAiInterviewStartPath(
  jobTitle: string,
  jobId?: string | number | null,
  role?: string | null,
  mode?: "text" | "video" | null,
): string {
  const params = new URLSearchParams({
    return: window.location.pathname + window.location.search,
  });
  if (mode === "text") params.set("mode", "text");
  const slug = role?.trim() ?? "";
  if (slug) {
    params.set("role", slug);
    return `/interviews?${params.toString()}`;
  }
  if (jobId != null && String(jobId).trim() !== "") {
    params.set("job_id", String(jobId));
    return `/interviews?${params.toString()}`;
  }
  if (jobTitle.trim()) {
    params.set("position", jobTitle.trim());
  }
  return `/interviews?${params.toString()}`;
}

export function JobAiInterviewIllustration({
  className,
}: {
  className?: string;
}) {
  return (
    <>
      <img
        src={AI_INTERVIEW_ILLUSTRATION_LIGHT}
        alt=""
        className={cn("block h-auto w-full dark:hidden", className)}
        draggable={false}
      />
      <img
        src={AI_INTERVIEW_ILLUSTRATION_DARK}
        alt=""
        className={cn("hidden h-auto w-full dark:block", className)}
        draggable={false}
      />
    </>
  );
}
