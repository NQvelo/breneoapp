export type SettingsSection =
  | "account"
  | "notifications"
  | "privacy"
  | "subscription"
  | "accessibility";

export const VALID_SETTINGS_SECTIONS: SettingsSection[] = [
  "account",
  "notifications",
  "privacy",
  "subscription",
  "accessibility",
];

export function isValidSettingsSection(
  section: string | null,
): section is SettingsSection {
  return (
    section !== null &&
    VALID_SETTINGS_SECTIONS.includes(section as SettingsSection)
  );
}

export function isSettingsPath(pathname: string): boolean {
  return (
    pathname.startsWith("/settings") ||
    pathname.startsWith("/employer/settings") ||
    pathname.startsWith("/academy/settings")
  );
}

export function getSettingsSectionLabel(
  section: SettingsSection,
  t: { settings: { sections: Record<SettingsSection, string> } },
): string {
  return t.settings.sections[section];
}
