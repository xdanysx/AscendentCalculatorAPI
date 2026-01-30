import request from "supertest";
import { app } from "../src/app";
import { it, expect } from "vitest";

it("400 on invalid body", async () => {
  const res = await request(app)
    .post("/v1/astro/ascendant")
    .send({ date: "x", time: 123 });

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error");
});

it("400 on invalid lat/lon range", async () => {
  const res = await request(app)
    .post("/v1/astro/ascendant")
    .send({
      date: "1998-07-12",
      time: "14:35",
      lat: 999,
      lon: 6.96,
      tz: "Europe/Berlin"
    });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe("INVALID_BODY");
});
