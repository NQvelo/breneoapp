export function parseAppVersion(version: string): [number, number, number] | null {
  const parts = version.trim().split(".");
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }

  return parts.map((part) => Number(part)) as [number, number, number];
}

/** Returns positive when `left` is newer than `right`. */
export function compareAppVersions(left: string, right: string): number {
  const leftParts = parseAppVersion(left);
  const rightParts = parseAppVersion(right);

  if (!leftParts || !rightParts) return 0;

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }

  return 0;
}

export function isAppVersionNewer(
  candidate: string,
  current: string = __APP_VERSION__,
): boolean {
  return compareAppVersions(candidate, current) > 0;
}
