/** Vertical lift for a speaker. Each word starts a fresh, eight-frame arc at 30 fps. */
export function wordBounce(
  frame: number,
  fps: number,
  words: readonly { start: number }[],
  height = 16,
) {
  let start = -Infinity;
  for (const word of words) {
    const onset = Math.round(word.start * fps);
    if (onset > frame) break;
    start = onset;
  }
  const phase = (frame - start) / ((fps * 8) / 30);
  return phase < 1 ? height * Math.sin(Math.PI * phase) : 0;
}
