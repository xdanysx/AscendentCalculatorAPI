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
const path_1 = __importDefault(require("path"));
const chart_1 = require("./astro/chart");
const openapi_1 = require("./openapi");
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
v1.post("/astro/chart", async (req, res) => {
    const out = await (0, chart_1.computeChart)(req.body);
    if (!out.ok)
        return res.status(out.status).json({ error: out.error, details: out.details });
    return res.json(out.body);
});
exports.app.use("/v1", v1);
// Static demo hosting
const publicDir = path_1.default.join(process.cwd(), "public");
exports.app.use(express_1.default.static(publicDir));
// Root: Demo
exports.app.get("/", (_req, res) => res.redirect("/demo.html"));
// Optional: API info
exports.app.get("/api", (_req, res) => {
    res.json({
        ok: true,
        service: "ascendentcalculatorapi",
        docs: "/docs",
        health: "/v1/health",
        chart: "/v1/astro/chart",
        ascendant: "/v1/astro/ascendant"
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