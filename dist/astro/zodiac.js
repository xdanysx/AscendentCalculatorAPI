"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDeg360 = normalizeDeg360;
exports.zodiacFromEclipticLongitude = zodiacFromEclipticLongitude;
const SIGNS = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces"
];
function normalizeDeg360(deg) {
    const x = deg % 360;
    return x < 0 ? x + 360 : x;
}
function zodiacFromEclipticLongitude(lonDeg) {
    const lon = normalizeDeg360(lonDeg);
    const signIndex = Math.floor(lon / 30);
    const degreeInSign = lon - signIndex * 30;
    return { sign: SIGNS[signIndex], signIndex, degreeInSign };
}
//# sourceMappingURL=zodiac.js.map