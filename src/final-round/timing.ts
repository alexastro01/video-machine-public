import timeline from "../../episodes/alex-astro-the-final-round/dialogue-timeline.json";
import cues from "../../episodes/alex-astro-the-final-round/cues.json";

export { timeline, cues };
export const progress = (frame: number, start: number, length: number) =>
  Math.min(1, Math.max(0, (frame - start) / length));
export const ease = (frame: number, start: number, length: number) => {
  const t = progress(frame, start, length);
  return t * t * (3 - 2 * t);
};
export const pulse = (frame: number, start: number, length: number) =>
  Math.sin(Math.PI * progress(frame, start, length));
export const alexWords = timeline.lines
  .filter((l) => l.speaker === "alex")
  .flatMap((l) => l.words);
export const interviewerWords = timeline.lines
  .filter((l) => l.speaker === "interviewer")
  .flatMap((l) => l.words);
export const assetRoot = "episodes/alex-astro-the-final-round";
