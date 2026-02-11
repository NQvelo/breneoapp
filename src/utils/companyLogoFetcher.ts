/**
 * Company Logo Fetcher Utility
 * 
 * Fetches company logos from the Breneo Job Aggregator API
 * Falls back to existing logo fields if API doesn't have the logo
 */

const COMPANY_API_BASE = "https://breneo-job-aggregator.up.railway.app/api/companies";

/**
 * Cache for company logos to avoid repeated API calls
 */
const logoCache = new Map<string, string | null>();

/**
 * Fetch company logo from API
 * @param companyName - The name of the company
 * @returns Promise<string | undefined> - The logo URL or undefined if not found
 */
export const fetchCompanyLogo = async (
  companyName: string
): Promise<string | undefined> => {
  if (!companyName || !companyName.trim()) {
    return undefined;
  }

  const normalizedName = companyName.trim();
  
  // Check cache first
  if (logoCache.has(normalizedName)) {
    const cachedLogo = logoCache.get(normalizedName);
    return cachedLogo === null ? undefined : cachedLogo;
  }

  try {
    const encodedCompanyName = encodeURIComponent(normalizedName);
    const companyApiUrl = `${COMPANY_API_BASE}/${encodedCompanyName}`;
    
    const response = await fetch(companyApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      // Extract logo from response
      const logoUrl = 
        data.logo || 
        data.company_logo || 
        data.logo_url ||
        data.employer_logo;
      
      if (logoUrl && typeof logoUrl === "string") {
        try {
          // Validate URL
          const url = new URL(logoUrl);
          if (url.protocol.startsWith("http")) {
            // Cache the logo
            logoCache.set(normalizedName, logoUrl);
            return logoUrl;
          }
        } catch {
          // Invalid URL, continue
        }
      }
    }
    
    // Cache null to indicate we tried but didn't find a logo
    logoCache.set(normalizedName, null);
    return undefined;
  } catch (error) {
    console.error(`Error fetching company logo for ${normalizedName}:`, error);
    // Cache null to avoid repeated failed requests
    logoCache.set(normalizedName, null);
    return undefined;
  }
};

/**
 * Get company logo with fallback
 * First tries to fetch from API, then falls back to provided logo
 * @param companyName - The name of the company
 * @param fallbackLogo - The logo from job data (if any)
 * @returns Promise<string | undefined> - The logo URL or undefined
 */
export const getCompanyLogo = async (
  companyName: string,
  fallbackLogo?: string
): Promise<string | undefined> => {
  // If we already have a valid logo, use it
  if (fallbackLogo && typeof fallbackLogo === "string") {
    try {
      const url = new URL(fallbackLogo);
      if (url.protocol.startsWith("http")) {
        return fallbackLogo;
      }
    } catch {
      // Invalid URL, try to fetch from API
    }
  }

  // Try to fetch from API
  const apiLogo = await fetchCompanyLogo(companyName);
  if (apiLogo) {
    return apiLogo;
  }

  // Return fallback if available (even if it might be invalid)
  return fallbackLogo;
};

/**
 * Clear the logo cache (useful for testing or when cache needs to be refreshed)
 */
export const clearLogoCache = () => {
  logoCache.clear();
};
