import { AstroRequestSchema } from "./schema";
import { normalizeAstroTime } from "./time";
import { computeAscendant } from "./ascendant";
import { bodyLongitude, type Body } from "./bodies";
import { zodiacFromEclipticLongitude } from "./zodiac";
import { computeElements } from "./elements";
import { computeHouses } from "./houses";
import { houseOfLongitude } from "./housePosition";
import { computeChartRuler } from "./chartRuler";

export async function computeChart(input: unknown) {
  const parsed = AstroRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: "INVALID_BODY", details: parsed.error.flatten() };
  }

  const req = parsed.data;

  // 1) Time normalize
  const t = normalizeAstroTime(req);
  if (t.issues.some(i => i.severity === "error")) {
    return { ok: false as const, status: 400, error: "INVALID_DATETIME", details: t.issues };
  }

  // 2) Ascendant (liefert jdUt)
  const a = await computeAscendant({ ...req, tz: req.tz ?? t.normalized.tz });
  const baseIssues = [...t.issues, ...(a.issues ?? [])];
  if (baseIssues.some(i => i.severity === "error")) {
    return { ok: false as const, status: 400, error: "CALC_FAILED", details: baseIssues };
  }

  const ascLon = a.result?.ascendantLongitude;
  const jdUt = a.normalized?.jdUt;

  if (typeof ascLon !== "number" || typeof jdUt !== "number") {
    return {
      ok: false as const,
      status: 400,
      error: "CALC_FAILED",
      details: [
        ...baseIssues,
        { code: "MISSING_OUTPUT", severity: "error", message: "ascendantLongitude/jdUt missing." }
      ]
    };
  }

  // 3) Houses + ASC/MC aus Houses (optional, aber sinnvoll)
  // House System aus Request (oder Default P)
  const houseSystem = ((req.houseSystem ?? "P").toUpperCase() as any) ?? "P";
  const houses = await computeHouses(jdUt, req.lat, req.lon, houseSystem);

  // 4) Sun/Moon
  const sun = await bodyLongitude(jdUt, "sun");
  const moon = await bodyLongitude(jdUt, "moon");
  const issues = [...baseIssues, ...sun.issues, ...moon.issues];

  if (issues.some(i => i.severity === "error")) {
    return { ok: false as const, status: 400, error: "CALC_FAILED", details: issues };
  }
  if (typeof sun.lon !== "number" || typeof moon.lon !== "number") {
    return {
      ok: false as const,
      status: 400,
      error: "CALC_FAILED",
      details: [
        ...issues,
        { code: "SUN_MOON_NOT_AVAILABLE", severity: "error", message: "Sun/Moon longitude missing." }
      ]
    };
  }

  // 5) Planets
  const planetBodies: Body[] = ["mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];
  const planetResults = await Promise.all(
    planetBodies.map(async (b) => ({ body: b, ...(await bodyLongitude(jdUt, b)) }))
  );
  const planetIssues = planetResults.flatMap(p => (p as any).issues ?? []);
  const issuesAll = [...issues, ...planetIssues];

  if (issuesAll.some(i => i.severity === "error")) {
    return { ok: false as const, status: 400, error: "CALC_FAILED", details: issuesAll };
  }

  // 6) Signs + Houses je Planet
  const planets = Object.fromEntries(
    planetResults.map(p => {
      if (typeof p.lon !== "number") return [p.body, null];
      const z = zodiacFromEclipticLongitude(p.lon);
      const house = houseOfLongitude(p.lon, houses.cusps);
      return [p.body, { longitude: p.lon, sign: z.sign, degreeInSign: z.degreeInSign, house }];
    })
  );

  const zAsc = zodiacFromEclipticLongitude(ascLon);
  const zSun = zodiacFromEclipticLongitude(sun.lon);
  const zMoon = zodiacFromEclipticLongitude(moon.lon);

  const sunHouse = houseOfLongitude(sun.lon, houses.cusps);
  const moonHouse = houseOfLongitude(moon.lon, houses.cusps);

  // 7) Elements
  const elements = computeElements({ sun: zSun.sign, moon: zMoon.sign, ascendant: zAsc.sign });

  // 8) Chart Ruler
  const chartRuler = computeChartRuler(zAsc.sign, {
    // Chart ruler braucht Venus/Mars/... Positionen
    sun: { longitude: sun.lon, sign: zSun.sign, degreeInSign: zSun.degreeInSign, house: sunHouse },
    moon: { longitude: moon.lon, sign: zMoon.sign, degreeInSign: zMoon.degreeInSign, house: moonHouse },
    ...planets
  } as any);

  return {
    ok: true as const,
    status: 200,
    body: {
      input: req,
      normalized: { time: t.normalized },
      result: {
        ascendant: {
          longitude: ascLon,
          sign: zAsc.sign,
          degreeInSign: zAsc.degreeInSign,
          house: 1
        },
        mc: {
          longitude: houses.mc,
          sign: zodiacFromEclipticLongitude(houses.mc).sign,
          degreeInSign: zodiacFromEclipticLongitude(houses.mc).degreeInSign
        },
        houses,
        sun: { longitude: sun.lon, sign: zSun.sign, degreeInSign: zSun.degreeInSign, house: sunHouse },
        moon: { longitude: moon.lon, sign: zMoon.sign, degreeInSign: zMoon.degreeInSign, house: moonHouse },
        elements,
        chartRuler,
        planets
      },
      issues: issuesAll
    }
  };
}
