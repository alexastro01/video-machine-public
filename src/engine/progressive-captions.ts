import type { Caption } from "@remotion/captions";
type TimedWord = { text: string; start: number; end: number };

/** Keep a short caption chunk, revealing its words at their recorded onsets. */
export function progressiveCaptionCues(
  captions: Caption[],
  words: TimedWord[],
): Caption[] {
  const output: Caption[] = [];
  let cursor = 0;
  for (const caption of captions) {
    const text = caption.text.trim().split(/\s+/);
    const group = words.slice(cursor, cursor + text.length);
    if (group.length !== text.length)
      throw new Error("Caption and word counts differ");
    for (let i = 0; i < group.length; i++) {
      const startMs = Math.max(
        caption.startMs,
        Math.round(group[i].start * 1000),
      );
      const endMs =
        i + 1 < group.length
          ? Math.min(caption.endMs, Math.round(group[i + 1].start * 1000))
          : caption.endMs;
      if (endMs <= startMs) continue;
      output.push({
        ...caption,
        text: text.slice(0, i + 1).join(" "),
        startMs,
        endMs,
        timestampMs: startMs,
      });
    }
    cursor += text.length;
  }
  if (cursor !== words.length) throw new Error("Uncaptioned words remain");
  return output;
}
