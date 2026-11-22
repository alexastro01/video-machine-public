import edit from "../../episodes/absolutely-right/edit.json";
import timeline from "../../episodes/absolutely-right/timeline.json";

export { edit, timeline };
export type Line = (typeof timeline.lines)[number];

export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (f: number, at: number, duration: number) => {
  const t = clamp((f - at) / duration);
  return t * t * (3 - 2 * t);
};
export const pulse = (f: number, at: number, frames: number) =>
  Math.sin(Math.PI * clamp((f - at) / frames));
export const currentLine = (f: number) =>
  timeline.lines.find((line) => f >= line.frame && f < line.end);
export const latestDing = (f: number) =>
  timeline.dings.filter((hit) => hit.frame <= f).at(-1);
export const onsets = (line: Line | undefined, f: number) => {
  if (!line) return 0;
  const word = line.words.filter((w) => w.start * edit.fps <= f).at(-1);
  return word ? pulse(f, Math.round(word.start * edit.fps), 14) : 0;
};
export function visibleWords(
  line: Line | undefined,
  f: number,
  captions: boolean,
) {
  if (!line || f < line.frame) return "";
  if (f >= line.end) return line.text;
  if (!captions) return "";
  return line.words
    .filter((w) => Math.round(w.start * edit.fps) <= f)
    .map((w) => w.text)
    .join(" ");
}
