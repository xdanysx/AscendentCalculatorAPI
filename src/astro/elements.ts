import { Element, ZodiacSign, ElementResult, SIGN_TO_ELEMENT } from "./types";

export function computeElements(signs: {
  sun: ZodiacSign;
  moon: ZodiacSign;
  ascendant: ZodiacSign;
}): ElementResult {
  const sun = SIGN_TO_ELEMENT[signs.sun];
  const moon = SIGN_TO_ELEMENT[signs.moon];
  const ascendant = SIGN_TO_ELEMENT[signs.ascendant];

  const counts: Record<Element, number> = {
    fire: 0,
    earth: 0,
    air: 0,
    water: 0
  };

  counts[sun]++;
  counts[moon]++;
  counts[ascendant]++;

  const dominant = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0][0] as Element;

  const triple =
    sun === moon && moon === ascendant ? sun : null;

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
