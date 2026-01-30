import { DateTime } from "luxon";
import tzLookup from "tz-lookup";
import { z } from "zod";
import { getSwe } from "../lib/swe";

export const AscRequestSchema = z.object({
  date: z.string(),      // "1998-07-12"
  time: z.string(),      // "14:35"
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  tz: z.string().optional(),        // optional, sonst aus coords
  houseSystem: z.string().optional() // default "P"
});

export type AscRequest = z.infer<typeof AscRequestSchema>;

export async function computeAscendant(input: AscRequest) {
  const swe = await getSwe();

  if (typeof swe.julday !== "function") {
    return {
      result: null,
      issues: [{
        code: "SWE_JULDAY_MISSING",
        severity: "error",
        message: "SwissEph wrapper does not expose swe_julday/julday."
      }]
    };
  }


  const tz = input.tz ?? tzLookup(input.lat, input.lon);
  const local = DateTime.fromISO(`${input.date}T${input.time}`, { zone: tz });
  if (!local.isValid) {
    return {
      result: null,
      issues: [{ code: "INVALID_DATETIME", severity: "error", message: "Invalid date/time." }]
    };
  }

  const utc = local.toUTC();

  const year = utc.year;
  const month = utc.month;
  const day = utc.day;

  const hourDecimal =
    utc.hour + utc.minute / 60 + utc.second / 3600 + utc.millisecond / 3_600_000;

  const jdUt = swe.julday(year, month, day, hourDecimal);

  // House system (Placidus default)
  const hsys = (input.houseSystem ?? "P").toUpperCase();

  const housesResult =
  (swe as any).houses?.(jdUt, input.lat, input.lon, hsys) ??
  (swe as any).houses_ex?.(jdUt, input.lat, input.lon, hsys);

  if (!housesResult) {
    return {
      result: null,
      issues: [{
        code: "HOUSES_NOT_AVAILABLE",
        severity: "error",
        message: "House calculation method not found in wrapper."
      }]
    };
  }

  // Robust extraction (accept Array + TypedArray)
let asc: number | null = null;

const isNumArrayLike = (x: any): x is { length: number; [i: number]: number } => {
  if (!x) return false;
  // Array or TypedArray (Float64Array etc.)
  return Array.isArray(x) || ArrayBuffer.isView(x);
};

const firstNumber = (x: any): number | null => {
  if (!isNumArrayLike(x)) return null;
  const v = x[0];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

const pickAscFromObject = (obj: any): number | null => {
  if (!obj || typeof obj !== "object") return null;

  // sometimes nested: { result: { ascmc: ... } }
  if (obj.result && typeof obj.result === "object") {
    const nested = pickAscFromObject(obj.result);
    if (typeof nested === "number") return nested;
  }

  // Case A: { ascmc: ArrayLike }
  const a = obj.ascmc ?? obj.ascMc ?? obj.ASCmc ?? obj.asc_mc;
  const n0 = firstNumber(a);
  if (typeof n0 === "number") return n0;

  // Case B: { ascmc: { ascendant: number } }
  if (a && typeof a === "object") {
    const cand = a.ascendant ?? a.asc ?? a.ASC;
    if (typeof cand === "number" && Number.isFinite(cand)) return cand;
  }

  // Case C: { ascendant: number }
  const cand2 = obj.ascendant ?? obj.asc ?? obj.ASC;
  if (typeof cand2 === "number" && Number.isFinite(cand2)) return cand2;

  return null;
};

asc = pickAscFromObject(housesResult);

// Case D: [cusps, ascmc] (also TypedArrays possible)
if (asc === null && Array.isArray(housesResult)) {
  asc = firstNumber(housesResult[1]);
}

if (typeof asc !== "number") {
  return {
    result: null,
    issues: [{
      code: "ASC_NOT_COMPUTED",
      severity: "error",
      message: "Ascendant could not be computed from houses result."
    }]
  };
}



  return {
    normalized: {
      tz,
      localIso: local.toISO(),
      utcIso: utc.toISO(),
      jdUt
    },
    result: {
      ascendantLongitude: asc,
      houseSystem: hsys
    },
    issues: input.tz ? [] : [{
      code: "TZ_GUESSED_FROM_COORDS",
      severity: "warning",
      message: `Timezone not provided. Derived tz="${tz}" from lat/lon.`
    }]
  };
}
