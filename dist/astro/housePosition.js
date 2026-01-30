"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.houseOfLongitude = houseOfLongitude;
function normalizeLon(lon) {
    return (lon + 360) % 360;
}
function houseOfLongitude(lon, cusps) {
    const L = normalizeLon(lon);
    for (let i = 0; i < 12; i++) {
        const start = normalizeLon(cusps[i]);
        const end = normalizeLon(cusps[(i + 1) % 12]);
        if (start < end
            ? L >= start && L < end
            : L >= start || L < end) {
            return i + 1;
        }
    }
    return 12;
}
//# sourceMappingURL=housePosition.js.map