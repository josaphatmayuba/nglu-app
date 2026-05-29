// SCRUM-229 — Phone number normalization helpers.
//
// Wraps libphonenumber-js so all entry points (onboarding link generation,
// tenant onboarding submission, tenant create/edit) produce the same canonical
// E.164 string ("+243999123456"). Handles the country-specific "0" rule:
// some plans (CD, US, FR, etc.) strip the trunk prefix; others (IT, CI) keep
// it. The library knows the rules per country, so we just feed it the raw
// input plus the chosen country code.

import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";

export interface NormalizePhoneOptions {
  /** ISO 3166-1 alpha-2 country code used when the input is missing "+XX". */
  defaultCountry?: CountryCode;
  /** When true, throw on invalid input. When false, return null. */
  strict?: boolean;
}

export class InvalidPhoneNumberError extends Error {
  constructor(input: string, reason: string) {
    super(`Invalid phone number "${input}": ${reason}`);
    this.name = "InvalidPhoneNumberError";
  }
}

/**
 * Parse a raw phone number and return its E.164 representation, or null if the
 * input is empty/invalid (and strict mode is off).
 */
export function normalizePhoneE164(
  raw: string | null | undefined,
  options: NormalizePhoneOptions = {},
): string | null {
  const { defaultCountry = "CD", strict = false } = options;
  const trimmed = (raw ?? "").toString().trim();
  if (!trimmed) {
    if (strict) throw new InvalidPhoneNumberError(trimmed, "empty");
    return null;
  }

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed) {
    if (strict) throw new InvalidPhoneNumberError(trimmed, "unparseable");
    return null;
  }
  if (!parsed.isValid()) {
    if (strict) throw new InvalidPhoneNumberError(trimmed, "invalid");
    return null;
  }
  return parsed.number; // E.164: "+243999123456"
}

/**
 * Strict variant — always returns a string, throws on invalid input.
 * Use when the phone is the primary key of a record (e.g., onboarding token).
 */
export function normalizePhoneE164Strict(
  raw: string | null | undefined,
  defaultCountry: CountryCode = "CD",
): string {
  const result = normalizePhoneE164(raw, { defaultCountry, strict: true });
  if (!result) throw new InvalidPhoneNumberError(String(raw), "empty");
  return result;
}
