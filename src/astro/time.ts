import { DateTime } from "luxon";
import tzLookup from "@photostructure/tz-lookup";
import type { AstroIssue, AstroNormalizedTime } from "./types";

function toJulianDayUT(dtUtc: DateTime): number {
  // Meeus: JD = unixDays + 2440587.5
  // unixDays = unixMillis / 86400000
  return dtUtc.toMillis() / 86400000 + 2440587.5;
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

  const tz =
    input.tz?.trim() ||
    (() => {
      const guessed = tzLookup(input.lat, input.lon);
      issues.push({
        code: "TZ_GUESSED_FROM_COORDS",
        severity: "warning",
        message: `Timezone not provided. Derived tz="${guessed}" from lat/lon.`
      });
      return guessed;
    })();

  // Build local datetime
  const isoLocal = `${input.date}T${input.time}`;

  let local = DateTime.fromISO(isoLocal, { zone: tz });

  if (!local.isValid) {
    // invalid local time (can happen in DST gaps)
    issues.push({
      code: "INVALID_LOCAL_DATETIME",
      severity: "error",
      message: `Local datetime "${isoLocal}" is invalid for timezone "${tz}".`
    });

    // Return something deterministic, but mark error
    // Use "now" UTC as fallback only to avoid crashes; caller should treat error as fatal
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

  // Optional override for weird inputs:
  if (typeof input.utcOffsetMinutes === "number") {
    // Recreate local time with fixed offset
    // This is useful if user knows exact offset (historical edge-cases, ambiguous DST)
    const offset = input.utcOffsetMinutes;
    const fixed = DateTime.fromISO(isoLocal, { zone: `UTC${offset >= 0 ? "+" : ""}${(offset / 60).toFixed(0)}` });
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
        message: "utcOffsetMinutes provided but could not be applied. Falling back to tz-based conversion."
      });
    }
  }

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
