"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGN_RULER = void 0;
exports.computeChartRuler = computeChartRuler;
exports.SIGN_RULER = {
    Aries: "mars",
    Taurus: "venus",
    Gemini: "mercury",
    Cancer: "moon",
    Leo: "sun",
    Virgo: "mercury",
    Libra: "venus",
    Scorpio: "mars",
    Sagittarius: "jupiter",
    Capricorn: "saturn",
    Aquarius: "saturn",
    Pisces: "jupiter"
};
function computeChartRuler(ascSign, planets) {
    const ruler = exports.SIGN_RULER[ascSign];
    const pos = planets[ruler];
    return {
        ruler,
        position: pos
            ? {
                sign: pos.sign,
                house: pos.house,
                longitude: pos.longitude
            }
            : null
    };
}
//# sourceMappingURL=chartRuler.js.map