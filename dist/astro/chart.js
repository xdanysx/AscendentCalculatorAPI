"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeChart = computeChart;
const schema_1 = require("./schema");
const time_1 = require("./time");
const ascendant_1 = require("./ascendant");
const bodies_1 = require("./bodies");
const zodiac_1 = require("./zodiac");
const elements_1 = require("./elements");
const houses_1 = require("./houses");
const housePosition_1 = require("./housePosition");
const chartRuler_1 = require("./chartRuler");
async function computeChart(input) {
    const parsed = schema_1.AstroRequestSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, status: 400, error: "INVALID_BODY", details: parsed.error.flatten() };
    }
    const req = parsed.data;
    // 1) Time normalize
    const t = (0, time_1.normalizeAstroTime)(req);
    if (t.issues.some(i => i.severity === "error")) {
        return { ok: false, status: 400, error: "INVALID_DATETIME", details: t.issues };
    }
    // 2) Ascendant (liefert jdUt)
    const a = await (0, ascendant_1.computeAscendant)({ ...req, tz: req.tz ?? t.normalized.tz });
    const baseIssues = [...t.issues, ...(a.issues ?? [])];
    if (baseIssues.some(i => i.severity === "error")) {
        return { ok: false, status: 400, error: "CALC_FAILED", details: baseIssues };
    }
    const ascLon = a.result?.ascendantLongitude;
    const jdUt = a.normalized?.jdUt;
    if (typeof ascLon !== "number" || typeof jdUt !== "number") {
        return {
            ok: false,
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
    const houseSystem = (req.houseSystem ?? "P").toUpperCase() ?? "P";
    const houses = await (0, houses_1.computeHouses)(jdUt, req.lat, req.lon, houseSystem);
    // 4) Sun/Moon
    const sun = await (0, bodies_1.bodyLongitude)(jdUt, "sun");
    const moon = await (0, bodies_1.bodyLongitude)(jdUt, "moon");
    const issues = [...baseIssues, ...sun.issues, ...moon.issues];
    if (issues.some(i => i.severity === "error")) {
        return { ok: false, status: 400, error: "CALC_FAILED", details: issues };
    }
    if (typeof sun.lon !== "number" || typeof moon.lon !== "number") {
        return {
            ok: false,
            status: 400,
            error: "CALC_FAILED",
            details: [
                ...issues,
                { code: "SUN_MOON_NOT_AVAILABLE", severity: "error", message: "Sun/Moon longitude missing." }
            ]
        };
    }
    // 5) Planets
    const planetBodies = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
    const planetResults = await Promise.all(planetBodies.map(async (b) => ({ body: b, ...(await (0, bodies_1.bodyLongitude)(jdUt, b)) })));
    const planetIssues = planetResults.flatMap(p => p.issues ?? []);
    const issuesAll = [...issues, ...planetIssues];
    if (issuesAll.some(i => i.severity === "error")) {
        return { ok: false, status: 400, error: "CALC_FAILED", details: issuesAll };
    }
    // 6) Signs + Houses je Planet
    const planets = Object.fromEntries(planetResults.map(p => {
        if (typeof p.lon !== "number")
            return [p.body, null];
        const z = (0, zodiac_1.zodiacFromEclipticLongitude)(p.lon);
        const house = (0, housePosition_1.houseOfLongitude)(p.lon, houses.cusps);
        return [p.body, { longitude: p.lon, sign: z.sign, degreeInSign: z.degreeInSign, house }];
    }));
    const zAsc = (0, zodiac_1.zodiacFromEclipticLongitude)(ascLon);
    const zSun = (0, zodiac_1.zodiacFromEclipticLongitude)(sun.lon);
    const zMoon = (0, zodiac_1.zodiacFromEclipticLongitude)(moon.lon);
    const sunHouse = (0, housePosition_1.houseOfLongitude)(sun.lon, houses.cusps);
    const moonHouse = (0, housePosition_1.houseOfLongitude)(moon.lon, houses.cusps);
    // 7) Elements
    const elements = (0, elements_1.computeElements)({ sun: zSun.sign, moon: zMoon.sign, ascendant: zAsc.sign });
    // 8) Chart Ruler
    const chartRuler = (0, chartRuler_1.computeChartRuler)(zAsc.sign, {
        // Chart ruler braucht Venus/Mars/... Positionen
        sun: { longitude: sun.lon, sign: zSun.sign, degreeInSign: zSun.degreeInSign, house: sunHouse },
        moon: { longitude: moon.lon, sign: zMoon.sign, degreeInSign: zMoon.degreeInSign, house: moonHouse },
        ...planets
    });
    return {
        ok: true,
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
                    sign: (0, zodiac_1.zodiacFromEclipticLongitude)(houses.mc).sign,
                    degreeInSign: (0, zodiac_1.zodiacFromEclipticLongitude)(houses.mc).degreeInSign
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
//# sourceMappingURL=chart.js.map