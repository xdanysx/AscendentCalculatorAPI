"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AscRequestSchema = void 0;
exports.computeAscendant = computeAscendant;
const luxon_1 = require("luxon");
const tz_lookup_1 = __importDefault(require("tz-lookup"));
const zod_1 = require("zod");
const swe_1 = require("../lib/swe");
exports.AscRequestSchema = zod_1.z.object({
    date: zod_1.z.string(), // "1998-07-12"
    time: zod_1.z.string(), // "14:35"
    lat: zod_1.z.number().min(-90).max(90),
    lon: zod_1.z.number().min(-180).max(180),
    tz: zod_1.z.string().optional(), // optional, sonst aus coords
    houseSystem: zod_1.z.string().optional() // default "P"
});
async function computeAscendant(input) {
    const swe = await (0, swe_1.getSwe)();
    if (typeof swe.julday !== "function") {
        return {
            result: null,
            issues: [{
                    code: "SWE_JULDAY_MISSING",
                    severity: "error",
                    message: "SwissEph wrapper does not expose swe_julday/julday."
                }]
        };
    }
    const tz = input.tz ?? (0, tz_lookup_1.default)(input.lat, input.lon);
    const local = luxon_1.DateTime.fromISO(`${input.date}T${input.time}`, { zone: tz });
    if (!local.isValid) {
        return {
            result: null,
            issues: [{ code: "INVALID_DATETIME", severity: "error", message: "Invalid date/time." }]
        };
    }
    const utc = local.toUTC();
    const year = utc.year;
    const month = utc.month;
    const day = utc.day;
    const hourDecimal = utc.hour + utc.minute / 60 + utc.second / 3600 + utc.millisecond / 3_600_000;
    const jdUt = swe.julday(year, month, day, hourDecimal);
    // House system (Placidus default)
    const hsys = (input.houseSystem ?? "P").toUpperCase();
    const housesResult = swe.houses?.(jdUt, input.lat, input.lon, hsys) ??
        swe.houses_ex?.(jdUt, input.lat, input.lon, hsys);
    if (!housesResult) {
        return {
            result: null,
            issues: [{
                    code: "HOUSES_NOT_AVAILABLE",
                    severity: "error",
                    message: "House calculation method not found in wrapper."
                }]
        };
    }
    // Robust extraction (accept Array + TypedArray)
    let asc = null;
    const isNumArrayLike = (x) => {
        if (!x)
            return false;
        // Array or TypedArray (Float64Array etc.)
        return Array.isArray(x) || ArrayBuffer.isView(x);
    };
    const firstNumber = (x) => {
        if (!isNumArrayLike(x))
            return null;
        const v = x[0];
        return typeof v === "number" && Number.isFinite(v) ? v : null;
    };
    const pickAscFromObject = (obj) => {
        if (!obj || typeof obj !== "object")
            return null;
        // sometimes nested: { result: { ascmc: ... } }
        if (obj.result && typeof obj.result === "object") {
            const nested = pickAscFromObject(obj.result);
            if (typeof nested === "number")
                return nested;
        }
        // Case A: { ascmc: ArrayLike }
        const a = obj.ascmc ?? obj.ascMc ?? obj.ASCmc ?? obj.asc_mc;
        const n0 = firstNumber(a);
        if (typeof n0 === "number")
            return n0;
        // Case B: { ascmc: { ascendant: number } }
        if (a && typeof a === "object") {
            const cand = a.ascendant ?? a.asc ?? a.ASC;
            if (typeof cand === "number" && Number.isFinite(cand))
                return cand;
        }
        // Case C: { ascendant: number }
        const cand2 = obj.ascendant ?? obj.asc ?? obj.ASC;
        if (typeof cand2 === "number" && Number.isFinite(cand2))
            return cand2;
        return null;
    };
    asc = pickAscFromObject(housesResult);
    // Case D: [cusps, ascmc] (also TypedArrays possible)
    if (asc === null && Array.isArray(housesResult)) {
        asc = firstNumber(housesResult[1]);
    }
    if (typeof asc !== "number") {
        return {
            result: null,
            issues: [{
                    code: "ASC_NOT_COMPUTED",
                    severity: "error",
                    message: "Ascendant could not be computed from houses result."
                }]
        };
    }
    return {
        normalized: {
            tz,
            localIso: local.toISO(),
            utcIso: utc.toISO(),
            jdUt
        },
        result: {
            ascendantLongitude: asc,
            houseSystem: hsys
        },
        issues: input.tz ? [] : [{
                code: "TZ_GUESSED_FROM_COORDS",
                severity: "warning",
                message: `Timezone not provided. Derived tz="${tz}" from lat/lon.`
            }]
    };
}
//# sourceMappingURL=ascendant.js.map