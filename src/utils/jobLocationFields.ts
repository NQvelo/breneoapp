import type { ICountry } from "country-state-city";

export type ResolvedJobCountry = {
  name: string;
  isoCode: string;
};

/** Match stored country (full name, ISO-2, or common alias) to country-state-city entry. */
export function resolveCountryFromStoredValue(
  countries: ICountry[],
  stored: string,
): ResolvedJobCountry | null {
  const trimmed = stored.trim();
  if (!trimmed || countries.length === 0) return null;

  const lower = trimmed.toLowerCase();

  const byName = countries.find((c) => c.name.toLowerCase() === lower);
  if (byName) return { name: byName.name, isoCode: byName.isoCode };

  const byIso = countries.find((c) => c.isoCode.toLowerCase() === lower);
  if (byIso) return { name: byIso.name, isoCode: byIso.isoCode };

  // United States / USA variants often appear on aggregator payloads
  if (lower === "usa" || lower === "u.s.a." || lower === "u.s.") {
    const us = countries.find((c) => c.isoCode === "US");
    if (us) return { name: us.name, isoCode: us.isoCode };
  }
  if (lower === "uk" || lower === "u.k.") {
    const gb = countries.find((c) => c.isoCode === "GB");
    if (gb) return { name: gb.name, isoCode: gb.isoCode };
  }

  return null;
}

/** Canonical display name for save/API (never bare ISO when we can resolve it). */
export function normalizeJobCountryForApi(
  countries: ICountry[],
  locationCountry: string,
  countryQuery = "",
  selectedCountryIsoCode = "",
): string {
  const raw = (locationCountry.trim() || countryQuery.trim()).trim();
  if (raw) {
    return resolveCountryFromStoredValue(countries, raw)?.name ?? raw;
  }
  const iso = selectedCountryIsoCode.trim();
  if (iso && countries.length > 0) {
    const byIso = countries.find((c) => c.isoCode === iso);
    if (byIso) return byIso.name;
  }
  return "";
}

export function normalizeJobCityForApi(
  location: string,
  cityQuery = "",
): string {
  return (location.trim() || cityQuery.trim()).trim();
}

export function applyResolvedCountryToForm(
  resolved: ResolvedJobCountry,
  setters: {
    setLocationCountry: (v: string) => void;
    setCountryQuery: (v: string) => void;
    setSelectedCountryIsoCode: (v: string) => void;
  },
): void {
  setters.setLocationCountry(resolved.name);
  setters.setCountryQuery(resolved.name);
  setters.setSelectedCountryIsoCode(resolved.isoCode);
}
