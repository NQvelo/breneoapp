import type { Notification } from "./notificationsApi";
import { formatNotificationMessage, getNotificationKind } from "./notificationUtils";
import type { ApplicantCvView } from "@/api/jobs/cvViewsApi";
import {
  cvViewDisplayTitle,
  cvViewIsUnacknowledged,
  cvViewLastViewedAt,
} from "@/api/jobs/cvViewsApi";
import {
  jobIdFromApplication,
  type JobApplicationItem,
} from "@/api/jobs/jobApplicationsApi";

export type NotificationListItem =
  | { kind: "django"; notification: Notification }
  | { kind: "cv_view"; view: ApplicantCvView };

export type JobBrandInfo = {
  logo?: string;
  companyName?: string;
};

export type JobBrandLookup = Map<string, JobBrandInfo>;

const LOGO_METADATA_KEYS = [
  "company_logo",
  "company_logo_url",
  "employer_logo",
  "logo_url",
  "logo",
  "logo_upload",
] as const;

export function normalizeNotificationLogoUrl(
  imagePath: string | null | undefined,
): string | undefined {
  if (!imagePath?.trim()) return undefined;
  const trimmed = imagePath.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return `/${trimmed}`;
}

function readLogoFromRecord(record: Record<string, unknown>): string | undefined {
  for (const key of LOGO_METADATA_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return normalizeNotificationLogoUrl(value);
    }
  }
  return undefined;
}

function jobLogoFromApplication(item: JobApplicationItem): string | undefined {
  const job = item.job;
  if (!job || typeof job !== "object") return undefined;
  const candidates = [job.logo, job.logo_upload, job.company_logo];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return normalizeNotificationLogoUrl(candidate);
    }
  }
  return undefined;
}

export function buildJobBrandLookup(
  applications: JobApplicationItem[],
): JobBrandLookup {
  const lookup: JobBrandLookup = new Map();

  for (const application of applications) {
    const jobId = jobIdFromApplication(application);
    if (!jobId) continue;

    const job = application.job;
    const companyName =
      typeof job?.company_name === "string" && job.company_name.trim()
        ? job.company_name.trim()
        : undefined;

    lookup.set(jobId, {
      logo: jobLogoFromApplication(application),
      companyName,
    });
  }

  return lookup;
}

function jobIdFromNotificationItem(item: NotificationListItem): string {
  if (item.kind === "cv_view") {
    return item.view.job_id != null ? String(item.view.job_id).trim() : "";
  }

  const metadata = item.notification.metadata ?? {};
  const jobId = metadata.job_id;
  return jobId != null ? String(jobId).trim() : "";
}

export function getNotificationItemJobId(
  item: NotificationListItem,
): string {
  return jobIdFromNotificationItem(item);
}

function brandFromLookup(
  jobId: string,
  lookup?: JobBrandLookup,
): JobBrandInfo | undefined {
  if (!jobId || !lookup) return undefined;
  return lookup.get(jobId);
}

function extractCompanyFromJobMatchMessage(message: string): string | undefined {
  const formatted = formatNotificationMessage(message);
  const match = formatted.match(/ at (.+?) matches your skills$/i);
  return match?.[1]?.trim();
}

export function getNotificationItemId(item: NotificationListItem): string {
  if (item.kind === "django") {
    return `django:${item.notification.id}`;
  }
  return `cv_view:${String(item.view.id)}`;
}

export function isNotificationItemUnread(
  item: NotificationListItem,
  userId?: string | number,
): boolean {
  if (item.kind === "cv_view") {
    return cvViewIsUnacknowledged(item.view);
  }

  const userIdStr = userId != null ? String(userId) : "";
  return (
    !item.notification.is_read &&
    item.notification.recipient_id === userIdStr
  );
}

export function getNotificationItemDate(item: NotificationListItem): string {
  if (item.kind === "cv_view") {
    return cvViewLastViewedAt(item.view) || "";
  }
  return item.notification.created_at;
}

export function getNotificationItemTitle(item: NotificationListItem): string {
  if (item.kind === "cv_view") {
    return "Employer viewed your CV";
  }
  return item.notification.title;
}

export function getNotificationItemMessage(item: NotificationListItem): string {
  if (item.kind === "cv_view") {
    const viewCount =
      typeof item.view.view_count === "number" && item.view.view_count > 1
        ? ` (${item.view.view_count} views)`
        : "";
    return `${cvViewDisplayTitle(item.view)}${viewCount}`;
  }
  return formatNotificationMessage(item.notification.message);
}

export function getNotificationItemCompanyName(
  item: NotificationListItem,
  jobBrandLookup?: JobBrandLookup,
): string | undefined {
  const jobId = jobIdFromNotificationItem(item);
  const fromLookup = brandFromLookup(jobId, jobBrandLookup)?.companyName;

  if (item.kind === "cv_view") {
    const name = item.view.company_name;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
    return fromLookup;
  }

  const metadata = item.notification.metadata ?? {};
  const fromMeta =
    typeof metadata.company_name === "string"
      ? metadata.company_name.trim()
      : "";
  if (fromMeta) return fromMeta;
  if (fromLookup) return fromLookup;

  const kind = getNotificationKind(item.notification);
  if (kind === "job_match") {
    return extractCompanyFromJobMatchMessage(item.notification.message);
  }

  return undefined;
}

export function getNotificationItemLogo(
  item: NotificationListItem,
  jobBrandLookup?: JobBrandLookup,
): string | undefined {
  const jobId = jobIdFromNotificationItem(item);
  const fromLookup = brandFromLookup(jobId, jobBrandLookup)?.logo;

  if (item.kind === "cv_view") {
    return (
      readLogoFromRecord(item.view as Record<string, unknown>) ?? fromLookup
    );
  }

  const metadata = item.notification.metadata ?? {};
  return readLogoFromRecord(metadata) ?? fromLookup;
}

export function mergeNotificationListItems(
  notifications: Notification[],
  cvViews: ApplicantCvView[],
  includeCvViews: boolean,
): NotificationListItem[] {
  const items: NotificationListItem[] = [
    ...notifications.map(
      (notification) =>
        ({ kind: "django", notification }) satisfies NotificationListItem,
    ),
  ];

  if (includeCvViews) {
    for (const view of cvViews) {
      if (cvViewIsUnacknowledged(view)) {
        items.push({ kind: "cv_view", view });
      }
    }
  }

  return items.sort((a, b) => {
    const aTime = new Date(getNotificationItemDate(a)).getTime();
    const bTime = new Date(getNotificationItemDate(b)).getTime();
    return bTime - aTime;
  });
}
