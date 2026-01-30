export type IssueSeverity = "warning" | "error";

export type AstroIssue = {
  code: string;
  severity: IssueSeverity;
  message: string;
};

export type AstroNormalizedTime = {
  tz: string;
  localIso: string;   // local datetime in ISO
  utcIso: string;     // UTC datetime in ISO
  utcOffsetMinutes: number;
  jdUt: number;       // Julian Day (UT)
};

export type Element = "fire" | "earth" | "air" | "water";

export type ZodiacSign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer"
  | "Leo" | "Virgo" | "Libra" | "Scorpio"
  | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

export type ElementResult = {
  sun: Element;
  moon: Element;
  ascendant: Element;
  counts: Record<Element, number>;
  dominant: Element;
  triple: Element | null;
  label: string;
};

export const SIGN_TO_ELEMENT: Record<ZodiacSign, Element> = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",

  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",

  Gemini: "air",
  Libra: "air",
  Aquarius: "air",

  Cancer: "water",
  Scorpio: "water",
  Pisces: "water"
};
