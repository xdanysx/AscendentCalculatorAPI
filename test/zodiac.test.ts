import { describe, it, expect } from "vitest";
import { zodiacFromEclipticLongitude } from "../src/astro/zodiac";

describe("zodiacFromEclipticLongitude", () => {
  it("maps 0° to Aries 0°", () => {
    const z = zodiacFromEclipticLongitude(0);
    expect(z.sign).toBe("Aries");
    expect(z.degreeInSign).toBeCloseTo(0, 10);
  });

  it("maps 29.999° to Aries", () => {
    const z = zodiacFromEclipticLongitude(29.999);
    expect(z.sign).toBe("Aries");
    expect(z.degreeInSign).toBeGreaterThanOrEqual(0);
    expect(z.degreeInSign).toBeLessThan(30);
  });

  it("maps 30° to Taurus 0°", () => {
    const z = zodiacFromEclipticLongitude(30);
    expect(z.sign).toBe("Taurus");
    expect(z.degreeInSign).toBeCloseTo(0, 10);
  });

  it("wraps 360° to 0° Aries", () => {
    const z = zodiacFromEclipticLongitude(360);
    expect(z.sign).toBe("Aries");
    expect(z.degreeInSign).toBeCloseTo(0, 10);
  });

  it("wraps negative degrees", () => {
    const z = zodiacFromEclipticLongitude(-1);
    expect(z.sign).toBe("Pisces");
    expect(z.degreeInSign).toBeGreaterThan(0);
  });
});
