import { describe, it, expect } from "vitest";
import { computeElements } from "../src/astro/elements";

describe("computeElements", () => {
  it("detects triple_water", () => {
    const e = computeElements({ sun: "Cancer", moon: "Pisces", ascendant: "Scorpio" });
    expect(e.triple).toBe("water");
    expect(e.label).toBe("triple_water");
    expect(e.counts.water).toBe(3);
  });

  it("detects dominant element when not triple", () => {
    const e = computeElements({ sun: "Libra", moon: "Scorpio", ascendant: "Gemini" }); // air + water + air => air dominant
    expect(e.triple).toBeNull();
    expect(e.dominant).toBe("air");
    expect(e.counts.air).toBe(2);
    expect(e.counts.water).toBe(1);
  });

  it("counts sum to 3", () => {
    const e = computeElements({ sun: "Aries", moon: "Taurus", ascendant: "Gemini" });
    const total = e.counts.fire + e.counts.earth + e.counts.air + e.counts.water;
    expect(total).toBe(3);
  });
});
