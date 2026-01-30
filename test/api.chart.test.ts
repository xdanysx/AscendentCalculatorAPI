import { it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

function expectBody(x: any) {
  expect(typeof x.longitude).toBe("number");
  expect(x.longitude).toBeGreaterThanOrEqual(0);
  expect(x.longitude).toBeLessThan(360);
  expect(SIGNS).toContain(x.sign);
  expect(typeof x.degreeInSign).toBe("number");
  expect(x.degreeInSign).toBeGreaterThanOrEqual(0);
  expect(x.degreeInSign).toBeLessThan(30);
}

it("POST /v1/astro/chart returns chart", async () => {
  const res = await request(app).post("/v1/astro/chart").send({
    date: "1998-07-12",
    time: "14:35",
    lat: 50.94,
    lon: 6.96,
    tz: "Europe/Berlin"
  });

  expect(res.status).toBe(200);

  expectBody(res.body.result.ascendant);
  expectBody(res.body.result.sun);
  expectBody(res.body.result.moon);

  expect(res.body.result.planets).toBeTruthy();
  expectBody(res.body.result.planets.mercury);

  expect(res.body.result.elements).toBeTruthy();
  expect(["air","water","fire","earth"]).toContain(res.body.result.elements.dominant);
});
