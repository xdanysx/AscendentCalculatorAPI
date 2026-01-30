import path from "node:path";

const swPath = path.join(process.cwd(), "node_modules", "swisseph-wasm", "src", "swisseph.js");
const Mod = require(swPath);
const SwissEphClass = Mod?.default ?? Mod;

let cached: any | null = null;
let initPromise: Promise<any> | null = null;

function bindFn(obj: any, name: string) {
  const fn = obj?.[name];
  return typeof fn === "function" ? fn.bind(obj) : undefined;
}

export async function getSwe() {
  if (cached) return cached;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const inst = new SwissEphClass();

    // wichtig: WASM initialisieren, sonst ist Module/ccall undefined
    const init =
      bindFn(inst, "initSwissEph") ?? // laut Doku
      bindFn(inst, "init");          // fallback, falls andere Version

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
