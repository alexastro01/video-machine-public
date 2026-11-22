/** Seek a finite atlas action from episode time, independent of render order. */
export function atlasFrameAt(
  time: number,
  {
    start,
    frameDurationMs,
    endFrame,
    holdFrame = endFrame,
  }: {
    start: number;
    frameDurationMs: number;
    endFrame: number;
    holdFrame?: number;
  },
) {
  if (time < start) return 0;
  const index = Math.floor(((time - start) * 1000) / frameDurationMs + 1e-6);
  return index > endFrame ? holdFrame : index;
}
