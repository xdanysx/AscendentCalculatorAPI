"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeHouses = computeHouses;
const swe_1 = require("../lib/swe");
async function computeHouses(jdUt, lat, lon, system = "P") {
    const swe = await (0, swe_1.getSwe)();
    const res = swe.houses?.(jdUt, lat, lon, system) ??
        swe.houses_ex?.(jdUt, lat, lon, system);
    if (!res) {
        throw new Error("HOUSES_NOT_AVAILABLE");
    }
    const cusps = res.cusps ?? res[0];
    const ascmc = res.ascmc ?? res[1];
    return {
        system,
        cusps: cusps.slice(1, 13), // ignore index 0
        ascendant: ascmc[0],
        mc: ascmc[1]
    };
}
//# sourceMappingURL=houses.js.map