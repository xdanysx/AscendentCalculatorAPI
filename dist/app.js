"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const openapi_1 = require("./openapi");
const bodies_1 = require("./astro/bodies");
const schema_1 = require("./astro/schema");
const time_1 = require("./astro/time");
const ascendant_1 = require("./astro/ascendant");
const zodiac_1 = require("./astro/zodiac");
const elements_1 = require("./astro/elements");
exports.app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
exports.app.set("trust proxy", 1);
exports.app.use((0, helmet_1.default)());
const corsOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
exports.app.use((0, cors_1.default)({ origin: corsOrigins.length ? corsOrigins : true }));
exports.app.use(express_1.default.json({ limit: "256kb" }));
// request id + minimal logging
exports.app.use((req, res, next) => {
    const requestId = req.header("x-request-id") ?? node_crypto_1.default.randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    const start = Date.now();
    res.on("finish", () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms) id=${requestId}`);
    });
    next();
});
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN ?? 120);
exports.app.use((0, express_rate_limit_1.default)({
    windowMs: 60_000,
    max: RATE_LIMIT_PER_MIN,
    standardHeaders: true,
    legacyHeaders: false
}));
const v1 = express_1.default.Router();
v1.get("/health", (_req, res) => {
    res.json({ ok: true });
});
async function handleChart(req, res) {
    const parsed = schema_1.AstroRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    }
    const input = parsed.data;
    // 1) Time normalize
    const t = (0, time_1.normalizeAstroTime)(input);
    if (t.issues.some(i => i.severity === "error")) {
        return res.status(400).json({ error: "INVALID_DATETIME", details: t.issues });
    }
    // 2) Ascendant
    const a = await (0, ascendant_1.computeAscendant)({
        ...input,
        tz: input.tz ?? t.normalized.tz
    });
    const baseIssues = [...t.issues, ...(a.issues ?? [])];
    if (baseIssues.some(i => i.severity === "error")) {
        return res.status(400).json({ error: "CALC_FAILED", details: baseIssues });
    }
    const ascLon = a.result?.ascendantLongitude;
    if (typeof ascLon !== "number") {
        return res.status(400).json({
            error: "CALC_FAILED",
            details: [
                ...baseIssues,
                { code: "ASC_NOT_AVAILABLE", severity: "error", message: "Ascendant longitude missing." }
            ]
        });
    }
    const jdUt = a.normalized?.jdUt;
    if (typeof jdUt !== "number") {
        return res.status(400).json({
            error: "CALC_FAILED",
            details: [
                ...baseIssues,
                { code: "JDUT_MISSING", severity: "error", message: "jdUt missing." }
            ]
        });
    }
    // 3) Sun/Moon
    const sun = await (0, bodies_1.bodyLongitude)(jdUt, "sun");
    const moon = await (0, bodies_1.bodyLongitude)(jdUt, "moon");
    const issues = [...baseIssues, ...sun.issues, ...moon.issues];
    if (issues.some(i => i.severity === "error")) {
        return res.status(400).json({ error: "CALC_FAILED", details: issues });
    }
    if (typeof sun.lon !== "number" || typeof moon.lon !== "number") {
        return res.status(400).json({
            error: "CALC_FAILED",
            details: [
                ...issues,
                { code: "SUN_MOON_NOT_AVAILABLE", severity: "error", message: "Sun/Moon longitude missing." }
            ]
        });
    }
    const planetBodies = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
    const planetResults = await Promise.all(planetBodies.map(async (b) => ({ body: b, ...(await (0, bodies_1.bodyLongitude)(jdUt, b)) })));
    const planetIssues = planetResults.flatMap(p => p.issues ?? []);
    const issuesAll = [...issues, ...planetIssues];
    if (issuesAll.some(i => i.severity === "error")) {
        return res.status(400).json({ error: "CALC_FAILED", details: issuesAll });
    }
    const planets = Object.fromEntries(planetResults.map(p => {
        if (typeof p.lon !== "number")
            return [p.body, null];
        const z = (0, zodiac_1.zodiacFromEclipticLongitude)(p.lon);
        return [p.body, { longitude: p.lon, sign: z.sign, degreeInSign: z.degreeInSign }];
    }));
    const zAsc = (0, zodiac_1.zodiacFromEclipticLongitude)(ascLon);
    const zSun = (0, zodiac_1.zodiacFromEclipticLongitude)(sun.lon);
    const zMoon = (0, zodiac_1.zodiacFromEclipticLongitude)(moon.lon);
    const elements = (0, elements_1.computeElements)({
        sun: zSun.sign,
        moon: zMoon.sign,
        ascendant: zAsc.sign
    });
    return res.json({
        input,
        normalized: { time: t.normalized },
        result: {
            ascendant: { longitude: ascLon, sign: zAsc.sign, degreeInSign: zAsc.degreeInSign },
            sun: { longitude: sun.lon, sign: zSun.sign, degreeInSign: zSun.degreeInSign },
            moon: { longitude: moon.lon, sign: zMoon.sign, degreeInSign: zMoon.degreeInSign },
            elements,
            planets,
        },
        issues
    });
}
v1.post("/astro/chart", handleChart);
exports.app.use("/v1", v1);
exports.app.get("/", (_req, res) => {
    res.json({
        ok: true,
        service: "ascendentcalculatorapi",
        docs: "/docs",
        health: "/v1/health"
    });
});
const openapi = (0, openapi_1.buildOpenApi)();
exports.app.get("/openapi.json", (_req, res) => res.json(openapi));
exports.app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapi));
exports.app.use((err, req, res, _next) => {
    console.error("UNHANDLED_ERROR", req.requestId, err);
    res.status(500).json({
        error: "INTERNAL_ERROR",
        requestId: req.requestId
    });
});
//# sourceMappingURL=app.js.map