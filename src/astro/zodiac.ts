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
] as const;

export type ZodiacSign = (typeof SIGNS)[number];

export function normalizeDeg360(deg: number): number {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}

export function zodiacFromEclipticLongitude(lonDeg: number): {
  sign: ZodiacSign;
  signIndex: number;
  degreeInSign: number;
} {
  const lon = normalizeDeg360(lonDeg);
  const signIndex = Math.floor(lon / 30);
  const degreeInSign = lon - signIndex * 30;
  return { sign: SIGNS[signIndex]!, signIndex, degreeInSign };
}
