import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto"; 
import swaggerUi from "swagger-ui-express";
import path from "path"

import { buildOpenApi } from "./openapi";
import { bodyLongitude, type Body } from "./astro/bodies";
import { AstroRequestSchema } from "./astro/schema";
import { normalizeAstroTime } from "./astro/time";
import { computeAscendant } from "./astro/ascendant";
import { zodiacFromEclipticLongitude } from "./astro/zodiac";
import { computeElements } from "./astro/elements";

export const app = express();

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

app.set("trust proxy", 1);
app.use(helmet());

// Static demo hosting
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

// Optional: Root direkt zur Demo
app.get("/", (_req, res) => res.redirect("/demo.html"));


const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigins.length ? corsOrigins : true }));
app.use(express.json({ limit: "256kb" }));
// request id + minimal logging
app.use((req, res, next) => {
  const requestId = req.header("x-request-id") ?? crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms) id=${requestId}`);
  });

  next();
});
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN ?? 120);

app.use(rateLimit({
  windowMs: 60_000,
  max: RATE_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false
}));


const v1 = express.Router();

v1.get("/health", (_req, res) => {
  res.json({ ok: true });
});

async function handleChart(req: express.Request, res: express.Response) {
   const parsed = AstroRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
  }

  const input = parsed.data;

  // 1) Time normalize
  const t = normalizeAstroTime(input);
  if (t.issues.some(i => i.severity === "error")) {
    return res.status(400).json({ error: "INVALID_DATETIME", details: t.issues });
  }

  // 2) Ascendant
  const a = await computeAscendant({
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
  const sun = await bodyLongitude(jdUt, "sun");
  const moon = await bodyLongitude(jdUt, "moon");


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

  const planetBodies: Body[] = ["mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];

  const planetResults = await Promise.all(
    planetBodies.map(async (b) => ({ body: b, ...(await bodyLongitude(jdUt, b)) }))
  );

  const planetIssues = planetResults.flatMap(p => (p as any).issues ?? []);
  const issuesAll = [...issues, ...planetIssues];

  if (issuesAll.some(i => i.severity === "error")) {
    return res.status(400).json({ error: "CALC_FAILED", details: issuesAll });
  }

  const planets = Object.fromEntries(
    planetResults.map(p => {
      if (typeof p.lon !== "number") return [p.body, null];
      const z = zodiacFromEclipticLongitude(p.lon);
      return [p.body, { longitude: p.lon, sign: z.sign, degreeInSign: z.degreeInSign }];
    })
  );


  const zAsc = zodiacFromEclipticLongitude(ascLon);
  const zSun = zodiacFromEclipticLongitude(sun.lon);
  const zMoon = zodiacFromEclipticLongitude(moon.lon);
  const elements = computeElements({
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

app.use("/v1", v1);
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "ascendentcalculatorapi",
    docs: "/docs",
    health: "/v1/health"
  });
});
const openapi = buildOpenApi();
app.get("/openapi.json", (_req, res) => res.json(openapi));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("UNHANDLED_ERROR", (req as any).requestId, err);
  res.status(500).json({
    error: "INTERNAL_ERROR",
    requestId: (req as any).requestId
  });
});
