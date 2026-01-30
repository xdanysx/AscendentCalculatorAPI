import { it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

it("ascendant endpoint returns valid ranges", async () => {
  const res = await request(app)
    .post("/v1/astro/chart")
    .send({
      date: "1998-07-12",
      time: "14:35",
      lat: 50.94,
      lon: 6.96,
      tz: "Europe/Berlin"
    });

  expect(res.status).toBe(200);

  const a = res.body.result.ascendant;
  expect(typeof a.longitude).toBe("number");
  expect(a.longitude).toBeGreaterThanOrEqual(0);
  expect(a.longitude).toBeLessThan(360);

  expect(typeof a.degreeInSign).toBe("number");
  expect(a.degreeInSign).toBeGreaterThanOrEqual(0);
  expect(a.degreeInSign).toBeLessThan(30);

  const signs = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
  ];
  expect(signs).toContain(a.sign);
});
