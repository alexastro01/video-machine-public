export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const out = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export function nativeFrame(elapsed: number, duration: number, count: number) {
  return Math.min(
    count - 1,
    Math.max(0, Math.floor(clamp01(elapsed / duration) * count)),
  );
}
