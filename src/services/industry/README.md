# Industry Experience Match

Deterministic logic to compute **Industry Experience Match %** between a user and a job.

## Data

- **Job**: `industryTags` stored as comma-separated string (e.g. `"FinTech, Banking, Payments"`).
- **User**: Industry years derived from **work experience** via `COMPANY_INDUSTRY_MAP` (unknown companies are skipped). Cached in `UserIndustryProfile.industryYearsJson`.

## Modules

| File | Purpose |
|------|--------|
| `industry_taxonomy.ts` | `parseIndustryTags(tagsString)`, `INDUSTRY_SYNONYMS`, `INDUSTRY_RELATED` |
| `company_industry_map.ts` | `normalizeCompanyName`, `getIndustriesForCompany`, extendable map |
| `userIndustryProfile.ts` | `computeYearsForRow`, `buildIndustryYearsFromWorkExperience`, cache types |
| `computeIndustryMatch.ts` | `computeIndustryMatch(jobIndustryTags, userIndustryYears)` → percent, reasons, matchedExact, matchedRelated, missing |
| `types.ts` | `IndustryMatchApi` for API response shape |

## Backend API contract

When returning **job detail** or **job list**, include:

```ts
match.industry = {
  percent: number | null,   // null when job has no industryTags → frontend shows "N/A"
  reasons: string[],
  matchedExact: [{ tag: string, years: number }],
  matchedRelated: [{ jobTag: string, matchedVia: string, years: number }],
  missing: string[]
}
```

If `percent` is `null`, frontend should display "—" or "N/A" and **not penalize overall match**.

## Query strategy (backend)

- **Job list (e.g. 20 jobs)**: 1 query jobs (with `industryTags`), 1 query `UserIndustryProfile` for the user; compute 20 matches in memory.
- **Job detail**: Same — load user's `UserIndustryProfile` once, parse `job.industryTags`, run `computeIndustryMatch(parseIndustryTags(job.industryTags), profile.industryYearsJson)`.

## Updating the cache (Django)

The frontend **does not** use Supabase for this; the table lives in **Django**. When the user adds/edits/deletes work experience, the frontend:

1. Saves work experience via existing Django API.
2. Recomputes `industry_years_json` from the new list (using `company_industry_map`).
3. Calls **`PUT /api/me/industry-profile/`** with body: `{ industry_years_json: Record<string, number>, updated_at: string }`.

**Django must implement:**

- **Model** (e.g. in your `users` or `profile` app): one row per user, e.g. `UserIndustryProfile(user_id FK, industry_years_json JSONField, updated_at DateTime)`.
- **Endpoint** `PUT /api/me/industry-profile/`: auth required; create or update the row for the authenticated user with the request body. If `industry_years_json` is empty `{}`, still save it (user has no known-industry experience).

Then when returning job detail/list, Django can read `UserIndustryProfile` for the user and compute `match.industry` as in the API contract above.

## DB (Supabase migration optional)

A Supabase migration exists for reference; this app uses **Django** for the industry profile table. In Django, create an equivalent model and the PUT endpoint above.

## Tests

```bash
npx vitest run src/services/industry/__tests__/
```

Covers: parseIndustryTags, computeYearsForRow (including endDate null), exact/related/missing scoring, years boost cap, and integration (e.g. user with fintech 2.5 yrs vs job "FinTech, Banking, Healthcare").
