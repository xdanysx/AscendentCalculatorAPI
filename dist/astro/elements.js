"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeElements = computeElements;
const types_1 = require("./types");
function computeElements(signs) {
    const sun = types_1.SIGN_TO_ELEMENT[signs.sun];
    const moon = types_1.SIGN_TO_ELEMENT[signs.moon];
    const ascendant = types_1.SIGN_TO_ELEMENT[signs.ascendant];
    const counts = {
        fire: 0,
        earth: 0,
        air: 0,
        water: 0
    };
    counts[sun]++;
    counts[moon]++;
    counts[ascendant]++;
    const dominant = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])[0][0];
    const triple = sun === moon && moon === ascendant ? sun : null;
    return {
        sun,
        moon,
        ascendant,
        counts,
        dominant,
        triple,
        label: triple ? `triple_${triple}` : `${dominant}_dominant`
    };
}
//# sourceMappingURL=elements.js.map