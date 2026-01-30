import { ZodiacSign } from "./types";

export type Planet =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn";

export const SIGN_RULER: Record<ZodiacSign, Planet> = {
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

export function computeChartRuler(
  ascSign: ZodiacSign,
  planets: Record<string, any>
) {
  const ruler = SIGN_RULER[ascSign];
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
