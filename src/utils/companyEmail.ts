/**
 * Reject common personal / disposable email providers so employer signup uses a company domain.
 */
const BLOCKED_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "mail.com",
  "aol.com",
  "yandex.com",
  "yandex.ru",
  "zoho.com",
  "gmx.com",
  "gmx.net",
  "fastmail.com",
  "tutanota.com",
  "hey.com",
  "inbox.com",
  "qq.com",
  "163.com",
  "126.com",
  "mail.ru",
  "bk.ru",
  "inbox.ru",
  "list.ru",
  "ukr.net",
  "i.ua",
  "bigmir.net",
  "naver.com",
  "daum.net",
  "hanmail.net",
  "rediffmail.com",
  "indiatimes.com",
  "sbcglobal.net",
  "att.net",
  "cox.net",
  "verizon.net",
  "comcast.net",
  "charter.net",
  "rocketmail.com",
  "ymail.com",
]);

export function getEmailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;
  return trimmed.slice(at + 1);
}

/** True when the address uses a company domain (not a blocked consumer host). */
export function isCompanyWorkEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  return !BLOCKED_EMAIL_DOMAINS.has(domain);
}
