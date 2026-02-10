/**
 * Industry experience matching: taxonomy, company map, user profile, and match computation.
 */

export {
  parseIndustryTags,
  capitalizeIndustryTag,
  INDUSTRY_SYNONYMS,
  INDUSTRY_RELATED,
} from "./industry_taxonomy";

export {
  normalizeCompanyName,
  getIndustriesForCompany,
  COMPANY_INDUSTRY_MAP,
} from "./company_industry_map";

export {
  buildIndustryYearsFromWorkExperience,
  computeYearsForRow,
  getUserIndustryYears,
} from "./userIndustryProfile";
export type {
  WorkExperienceRow,
  UserIndustryProfile,
} from "./userIndustryProfile";

export { refreshUserIndustryProfile } from "./refreshUserIndustryProfile";
export type { WorkExperienceEntryLike } from "./refreshUserIndustryProfile";

export { computeIndustryMatch } from "./computeIndustryMatch";
export type {
  IndustryMatchResult,
  MatchedExact,
  MatchedRelated,
} from "./computeIndustryMatch";

export type { IndustryMatchApi } from "./types";
