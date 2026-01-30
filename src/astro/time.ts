import { DateTime } from "luxon";
import tzLookup from "@photostructure/tz-lookup";
import type { AstroIssue, AstroNormalizedTime } from "./types";

function toJulianDayUT(dtUtc: DateTime): number {
  // Meeus: JD = unixDays + 2440587.5
  // unixDays = unixMillis / 86400000
  return dtUtc.toMillis() / 86400000 + 2440587.5;
}

function isValidTZ(tz: string) {
  return DateTime.now().setZone(tz).isValid;
}

function safeTzLookup(lat: number, lon: number): string | null {
  try {
    return tzLookup(lat, lon);
  } catch {
    return null;
  }
}

export function normalizeAstroTime(input: {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm or HH:mm:ss
  lat: number;
  lon: number;
  tz?: string;
  utcOffsetMinutes?: number;
}): { normalized: AstroNormalizedTime; issues: AstroIssue[] } {
  const issues: AstroIssue[] = [];

  // 1) Resolve timezone (validate provided tz, otherwise derive from coords)
  let tz: string;

  const providedTz = input.tz?.trim();
  if (providedTz) {
    if (!isValidTZ(providedTz)) {
      issues.push({
        code: "INVALID_TIMEZONE",
        severity: "error",
        message: `Invalid IANA timezone: "${providedTz}".`
      });

      // Fallback to keep function deterministic
      const fallback = safeTzLookup(input.lat, input.lon) ?? "UTC";
      issues.push({
        code: "TZ_FALLBACK_USED",
        severity: "warning",
        message: `Falling back to tz="${fallback}".`
      });

      tz = fallback;
    } else {
      tz = providedTz;
    }
  } else {
    const guessed = safeTzLookup(input.lat, input.lon);
    tz = guessed ?? "UTC";

    issues.push({
      code: guessed ? "TZ_GUESSED_FROM_COORDS" : "TZ_LOOKUP_FAILED",
      severity: guessed ? "warning" : "warning",
      message: guessed
        ? `Timezone not provided. Derived tz="${tz}" from lat/lon.`
        : `Timezone not provided and tz lookup failed. Falling back to tz="UTC".`
    });
  }

  // 2) Build local datetime in resolved timezone
  const isoLocal = `${input.date}T${input.time}`;
  const local = DateTime.fromISO(isoLocal, { zone: tz });

  if (!local.isValid) {
    // invalid local time (can happen in DST gaps)
    issues.push({
      code: "INVALID_LOCAL_DATETIME",
      severity: "error",
      message: `Local datetime "${isoLocal}" is invalid for timezone "${tz}".`
    });

    // Deterministic fallback (caller should treat error as fatal)
    const fallbackUtc = DateTime.utc();
    const jdUt = toJulianDayUT(fallbackUtc);

    return {
      normalized: {
        tz,
        localIso: isoLocal,
        utcIso: fallbackUtc.toISO()!,
        utcOffsetMinutes: 0,
        jdUt
      },
      issues
    };
  }

  // 3) Optional: utcOffsetMinutes override for ambiguous/historical edge cases
  if (typeof input.utcOffsetMinutes === "number") {
    const offset = input.utcOffsetMinutes;

    // Create a fixed-offset DateTime for the same wall-clock time
    // Note: Luxon supports fixed offsets via "UTC+X" / "UTC-X"
    const hours = Math.trunc(offset / 60);
    const zone = `UTC${hours >= 0 ? "+" : ""}${hours}`;

    const fixed = DateTime.fromISO(isoLocal, { zone });

    if (fixed.isValid) {
      issues.push({
        code: "UTC_OFFSET_OVERRIDE_USED",
        severity: "warning",
        message: `utcOffsetMinutes override used (${offset}).`
      });

      const utc = fixed.toUTC();
      const jdUt = toJulianDayUT(utc);

      return {
        normalized: {
          tz,
          localIso: local.toISO()!,
          utcIso: utc.toISO()!,
          utcOffsetMinutes: offset,
          jdUt
        },
        issues
      };
    } else {
      issues.push({
        code: "UTC_OFFSET_OVERRIDE_INVALID",
        severity: "warning",
        message:
          "utcOffsetMinutes provided but could not be applied. Falling back to tz-based conversion."
      });
    }
  }

  // 4) Default path: convert local -> UTC -> JD
  const utc = local.toUTC();
  const jdUt = toJulianDayUT(utc);

  return {
    normalized: {
      tz,
      localIso: local.toISO()!,
      utcIso: utc.toISO()!,
      utcOffsetMinutes: local.offset,
      jdUt
    },
    issues
  };
}
