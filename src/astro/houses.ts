import { getSwe } from "../lib/swe";

export type HouseSystem = "P" | "K" | "W" | "R" | "C";

export interface HousesResult {
  system: HouseSystem;
  cusps: number[]; // 1..12
  ascendant: number;
  mc: number;
}

export async function computeHouses(
  jdUt: number,
  lat: number,
  lon: number,
  system: HouseSystem = "P"
): Promise<HousesResult> {
  const swe = await getSwe();

  const res =
    swe.houses?.(jdUt, lat, lon, system) ??
    swe.houses_ex?.(jdUt, lat, lon, system);

  if (!res) {
    throw new Error("HOUSES_NOT_AVAILABLE");
  }

  const cusps: number[] =
    res.cusps ?? res[0];

  const ascmc: number[] =
    res.ascmc ?? res[1];

  return {
    system,
    cusps: cusps.slice(1, 13), // ignore index 0
    ascendant: ascmc[0],
    mc: ascmc[1]
  };
}
