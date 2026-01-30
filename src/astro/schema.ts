// src/astro/schema.ts
import { z } from "zod";

export const AstroRequestSchema = z
  .object({
    // ISO date, e.g. "1998-07-12"
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),

    // local time at the location, e.g. "14:35" or "14:35:20"
    time: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/, "time must be HH:mm or HH:mm:ss"),

    // location
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),

    // optional overrides:
    // If not provided, we will derive timezone from lat/lon via tz-lookup.
    tz: z.string().min(1).optional(), // e.g. "Europe/Berlin"

    // If not provided, we compute it from tz + local date/time (DST aware)
    // But allow override for edge-cases.
    utcOffsetMinutes: z.number().int().min(-18 * 60).max(18 * 60).optional(),

    // house system (we'll start with Placidus "P"; keep it optional for later expansion)
    houseSystem: z.enum(["P", "W", "K"]).optional() // Placidus, Whole Sign, Koch
  })
  .strict();

export type AstroRequest = z.infer<typeof AstroRequestSchema>;
