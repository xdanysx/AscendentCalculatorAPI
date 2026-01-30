"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSwe = getSwe;
const node_path_1 = __importDefault(require("node:path"));
const swPath = node_path_1.default.join(process.cwd(), "node_modules", "swisseph-wasm", "src", "swisseph.js");
const Mod = require(swPath);
const SwissEphClass = Mod?.default ?? Mod;
let cached = null;
let initPromise = null;
function bindFn(obj, name) {
    const fn = obj?.[name];
    return typeof fn === "function" ? fn.bind(obj) : undefined;
}
async function getSwe() {
    if (cached)
        return cached;
    if (initPromise)
        return initPromise;
    initPromise = (async () => {
        const inst = new SwissEphClass();
        // wichtig: WASM initialisieren, sonst ist Module/ccall undefined
        const init = bindFn(inst, "initSwissEph") ?? // laut Doku
            bindFn(inst, "init"); // fallback, falls andere Version
        if (!init) {
            throw new Error("swisseph-wasm: initSwissEph()/init() not found on SwissEph instance");
        }
        await init();
        cached = {
            raw: inst,
            julday: bindFn(inst, "julday") ?? bindFn(inst, "swe_julday"),
            houses: bindFn(inst, "houses") ?? bindFn(inst, "swe_houses"),
            houses_ex: bindFn(inst, "houses_ex") ?? bindFn(inst, "swe_houses_ex"),
            calc_ut: bindFn(inst, "calc_ut") ?? bindFn(inst, "swe_calc_ut"),
            close: bindFn(inst, "close")
        };
        if (typeof cached.julday !== "function") {
            throw new Error("swisseph-wasm: julday/swe_julday not found after init");
        }
        return cached;
    })();
    return initPromise;
}
//# sourceMappingURL=swe.js.map