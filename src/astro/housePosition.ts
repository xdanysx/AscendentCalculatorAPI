function normalizeLon(lon: number) {
  return (lon + 360) % 360;
}

export function houseOfLongitude(
  lon: number,
  cusps: number[]
): number {
  const L = normalizeLon(lon);

  for (let i = 0; i < 12; i++) {
    const start = normalizeLon(cusps[i]);
    const end = normalizeLon(cusps[(i + 1) % 12]);

    if (
      start < end
        ? L >= start && L < end
        : L >= start || L < end
    ) {
      return i + 1;
    }
  }

  return 12;
}
