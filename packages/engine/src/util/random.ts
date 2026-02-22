export function nextSeed(seed: number): number {
  return (1664525 * seed + 1013904223) >>> 0;
}

export function nextRandomBit(seed: number): { seed: number; bit: 0 | 1 } {
  const n = nextSeed(seed);
  return { seed: n, bit: (n & 1) as 0 | 1 };
}
