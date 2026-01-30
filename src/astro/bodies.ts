import { getSwe } from "../lib/swe";

export type Body =
  | "sun" | "moon"
  | "mercury" | "venus" | "mars" | "jupiter" | "saturn"
  | "uranus" | "neptune" | "pluto";

const BODY_ID: Record<Body, number> = {
  sun: 0,
  moon: 1,
  mercury: 2,
  venus: 3,
  mars: 4,
  jupiter: 5,
  saturn: 6,
  uranus: 7,
  neptune: 8,
  pluto: 9
};

// meist: SEFLG_SWIEPH = 2
const FLAGS = 2;

const isArrayLike = (x: any): x is { length: number; [i: number]: number } =>
  Array.isArray(x) || ArrayBuffer.isView(x);

export async function bodyLongitude(jdUt: number, body: Body) {
  const swe = await getSwe();
  if (typeof (swe as any).calc_ut !== "function") {
    return {
      lon: null as number | null,
      issues: [{
        code: "SWE_CALC_UT_MISSING",
        severity: "error",
        message: "calc_ut not available."
      }]
    };
  }

  const out = (swe as any).calc_ut(jdUt, BODY_ID[body], FLAGS);
  const data = out?.data ?? out?.xx ?? out?.result ?? out;

  let lon: number | null = null;
  if (typeof data === "object" && data && typeof (data as any).longitude === "number") lon = (data as any).longitude;
  else if (isArrayLike(data) && typeof data[0] === "number") lon = data[0];

  if (typeof lon !== "number" || !Number.isFinite(lon)) {
    return {
      lon: null,
      issues: [{
        code: "BODY_LONGITUDE_NOT_COMPUTED",
        severity: "error",
        message: `Longitude not computed for ${body}.`
      }]
    };
  }

  lon = ((lon % 360) + 360) % 360;
  return { lon, issues: [] as any[] };
}
