import { it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

it("GET /v1/health -> ok", async () => {
  const res = await request(app).get("/v1/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});
