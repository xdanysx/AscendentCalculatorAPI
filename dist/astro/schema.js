"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstroRequestSchema = void 0;
// src/astro/schema.ts
const zod_1 = require("zod");
exports.AstroRequestSchema = zod_1.z
    .object({
    // ISO date, e.g. "1998-07-12"
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    // local time at the location, e.g. "14:35" or "14:35:20"
    time: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/, "time must be HH:mm or HH:mm:ss"),
    // location
    lat: zod_1.z.number().min(-90).max(90),
    lon: zod_1.z.number().min(-180).max(180),
    // optional overrides:
    // If not provided, we will derive timezone from lat/lon via tz-lookup.
    tz: zod_1.z.string().min(1).optional(), // e.g. "Europe/Berlin"
    // If not provided, we compute it from tz + local date/time (DST aware)
    // But allow override for edge-cases.
    utcOffsetMinutes: zod_1.z.number().int().min(-18 * 60).max(18 * 60).optional(),
    // house system (we'll start with Placidus "P"; keep it optional for later expansion)
    houseSystem: zod_1.z.enum(["P", "W", "K"]).optional() // Placidus, Whole Sign, Koch
})
    .strict();
//# sourceMappingURL=schema.js.map