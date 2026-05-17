/** Applicant identity fields returned by the job-aggregator (aliases included). */
export interface JobApplicationUserFields {
  external_user_id?: string | number;
  external_user_email?: string;
  external_user_name?: string;
  external_user_surname?: string;
  user_id?: string | number;
  user_email?: string;
  user_name?: string;
  user_surname?: string;
  email?: string;
  name?: string;
  surname?: string;
  last_name?: string;
  lastName?: string;
}

function readStr(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value != null && String(value).trim()) return String(value).trim();
  return "";
}

export function applicationUserEmail(item: JobApplicationUserFields): string {
  return (
    readStr(item.external_user_email) ||
    readStr(item.user_email) ||
    readStr(item.email) ||
    ""
  );
}

export function applicationUserDisplayName(
  item: JobApplicationUserFields,
): string {
  const given =
    readStr(item.external_user_name) ||
    readStr(item.user_name) ||
    readStr(item.name) ||
    "";
  const family =
    readStr(item.external_user_surname) ||
    readStr(item.user_surname) ||
    readStr(item.surname) ||
    readStr(item.last_name) ||
    readStr(item.lastName) ||
    "";
  return `${given} ${family}`.trim();
}
