/** Public company profile route. Name is one path segment. */
export function companyPagePath(companyName: string): string {
  return `/companies/${encodeURIComponent(companyName.trim())}`;
}

export function decodeCompanyParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
