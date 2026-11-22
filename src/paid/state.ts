export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const ease = (value: number) => {
  const p = clamp01(value);
  return p * p * (3 - 2 * p);
};
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** A fixed deadline, with explicit time ellipses only across scene cuts. */
export function clockSeconds(t: number, e: Record<string, number>) {
  if (t >= e.tenSeconds) return Math.max(0, e.deadline - t);
  if (t >= e.arrival)
    return mix(12, 10, clamp01((t - e.arrival) / (e.tenSeconds - e.arrival)));
  if (t >= e.run)
    return mix(92, 70, clamp01((t - e.run) / (e.arrival - e.run)));
  if (t >= e.buy) return Math.max(150, 220 - (t - e.buy));
  return Math.max(0, 300 - Math.max(0, t - e.cash1));
}

export function originalNoteVisible(
  index: number,
  t: number,
  e: Record<string, number>,
) {
  const born =
    [e.cash1, e.cash2, e.cash3][Math.floor(index / 5)] + (index % 5) * 0.045;
  const spent = e.transfer + index * 0.075 + 0.42;
  return t >= born && t < spent;
}

export function newNoteVisible(t: number, e: Record<string, number>) {
  return t >= e.lastCash;
}
