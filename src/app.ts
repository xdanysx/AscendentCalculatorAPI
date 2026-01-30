import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto"; 
import swaggerUi from "swagger-ui-express";
import path from "path"

import { computeChart } from "./astro/chart";
import { buildOpenApi } from "./openapi";

export const app = express();

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

app.set("trust proxy", 1);
// 1) Ganz früh: falls irgendwo X-Frame-Options gesetzt wird, wieder entfernen
app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");
  // manche Umgebungen setzen es klein/anders; das hilft nicht immer, schadet aber nicht
  res.removeHeader("x-frame-options");
  next();
});

// 2) Danach Helmet: CSP sauber setzen + frameguard aus
app.use(
  helmet({
    frameguard: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "frame-ancestors": ["'self'", "https://dspinella.de", "https://www.dspinella.de"],
      },
    },
  })
);

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


v1.post("/astro/chart", async (req, res) => {
  const out = await computeChart(req.body);
  if (!out.ok) return res.status(out.status).json({ error: out.error, details: out.details });
  return res.json(out.body);
});

app.use("/v1", v1);
// Static demo hosting
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

// Root: Demo
app.get("/", (_req, res) => res.redirect("/demo.html"));

// Optional: API info
app.get("/api", (_req, res) => {
  res.json({
    ok: true,
    service: "ascendentcalculatorapi",
    docs: "/docs",
    health: "/v1/health",
    chart: "/v1/astro/chart",
    ascendant: "/v1/astro/ascendant"
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
