import { describe, expect, it } from "vitest";
import type { ICountry } from "country-state-city";
import {
  normalizeJobCountryForApi,
  resolveCountryFromStoredValue,
} from "@/utils/jobLocationFields";

const sampleCountries: ICountry[] = [
  {
    name: "United States",
    isoCode: "US",
    flag: "🇺🇸",
    phonecode: "1",
    currency: "USD",
    latitude: "38",
    longitude: "-97",
  },
  {
    name: "Georgia",
    isoCode: "GE",
    flag: "🇬🇪",
    phonecode: "995",
    currency: "GEL",
    latitude: "42",
    longitude: "43.5",
  },
];

describe("resolveCountryFromStoredValue", () => {
  it("matches full country name", () => {
    expect(resolveCountryFromStoredValue(sampleCountries, "United States")).toEqual({
      name: "United States",
      isoCode: "US",
    });
  });

  it("matches ISO-2 code from API", () => {
    expect(resolveCountryFromStoredValue(sampleCountries, "GE")).toEqual({
      name: "Georgia",
      isoCode: "GE",
    });
  });

  it("matches USA alias", () => {
    expect(resolveCountryFromStoredValue(sampleCountries, "USA")?.isoCode).toBe(
      "US",
    );
  });
});

describe("normalizeJobCountryForApi", () => {
  it("returns canonical name for ISO input", () => {
    expect(normalizeJobCountryForApi(sampleCountries, "US", "")).toBe(
      "United States",
    );
  });

  it("falls back to trimmed raw value when unknown", () => {
    expect(normalizeJobCountryForApi(sampleCountries, "Atlantis", "")).toBe(
      "Atlantis",
    );
  });

  it("uses selected ISO when display fields are empty", () => {
    expect(
      normalizeJobCountryForApi(sampleCountries, "", "", "GE"),
    ).toBe("Georgia");
  });
});
