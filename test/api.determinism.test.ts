import { it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

it("same input yields same output (deterministic)", async () => {
  const body = {
    date: "1998-07-12",
    time: "14:35",
    lat: 50.94,
    lon: 6.96,
    tz: "Europe/Berlin"
  };

  const a = await request(app).post("/v1/astro/ascendant").send(body);
  const b = await request(app).post("/v1/astro/ascendant").send(body);

  expect(a.status).toBe(200);
  expect(b.status).toBe(200);

  expect(a.body.result.ascendant.longitude).toBeCloseTo(b.body.result.ascendant.longitude, 10);
  expect(a.body.result.sun.longitude).toBeCloseTo(b.body.result.sun.longitude, 10);
  expect(a.body.result.moon.longitude).toBeCloseTo(b.body.result.moon.longitude, 10);
});
