"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bodyLongitude = bodyLongitude;
const swe_1 = require("../lib/swe");
const BODY_ID = {
    sun: 0,
    moon: 1,
    mercury: 2,
    venus: 3,
    mars: 4,
    jupiter: 5,
    saturn: 6,
    uranus: 7,
    neptune: 8,
    pluto: 9
};
// meist: SEFLG_SWIEPH = 2
const FLAGS = 2;
const isArrayLike = (x) => Array.isArray(x) || ArrayBuffer.isView(x);
async function bodyLongitude(jdUt, body) {
    const swe = await (0, swe_1.getSwe)();
    if (typeof swe.calc_ut !== "function") {
        return {
            lon: null,
            issues: [{
                    code: "SWE_CALC_UT_MISSING",
                    severity: "error",
                    message: "calc_ut not available."
                }]
        };
    }
    const out = swe.calc_ut(jdUt, BODY_ID[body], FLAGS);
    const data = out?.data ?? out?.xx ?? out?.result ?? out;
    let lon = null;
    if (typeof data === "object" && data && typeof data.longitude === "number")
        lon = data.longitude;
    else if (isArrayLike(data) && typeof data[0] === "number")
        lon = data[0];
    if (typeof lon !== "number" || !Number.isFinite(lon)) {
        return {
            lon: null,
            issues: [{
                    code: "BODY_LONGITUDE_NOT_COMPUTED",
                    severity: "error",
                    message: `Longitude not computed for ${body}.`
                }]
        };
    }
    lon = ((lon % 360) + 360) % 360;
    return { lon, issues: [] };
}
//# sourceMappingURL=bodies.js.map