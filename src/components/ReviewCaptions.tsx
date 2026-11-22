import type { Caption } from "@remotion/captions";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Episode } from "../engine/schema";
import { smooth } from "../pixel/timeline";

const digits: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  fourteen: "14",
  fourth: "4th",
  "thirty-eight": "38",
  "sixty-four": "64",
};
export function reviewCaptionPages(captions: Caption[]) {
  const words: Caption[] = [];
  for (let i = 0; i < captions.length; i++) {
    const w = captions[i],
      plain = w.text
        .trim()
        .toLowerCase()
        .replace(/[.,!?]/g, "");
    if (
      plain === "fifteen" &&
      /^hundred/i.test(captions[i + 1]?.text.trim() ?? "")
    ) {
      const next = captions[++i];
      words.push({
        ...w,
        text: "1500" + (next.text.trim().match(/[.,!?]+$/)?.[0] ?? ""),
        endMs: next.endMs,
      });
    } else
      words.push({
        ...w,
        text: w.text
          .trim()
          .replace(/[a-z-]+/i, (s) => digits[s.toLowerCase()] ?? s),
      });
  }
  const pages: { words: Caption[]; start: number; end: number }[] = [];
  let chunk: Caption[] = [];
  const flush = () => {
    if (chunk.length)
      pages.push({
        words: chunk,
        start: chunk[0].startMs,
        end: chunk.at(-1)!.endMs + 100,
      });
    chunk = [];
  };
  for (const [index, word] of words.entries()) {
    if (
      /^(10|14|38)$/.test(word.text) &&
      /^(minutes|countries|percent)/i.test(words[index + 1]?.text ?? "")
    )
      flush();
    if (
      chunk.length === 2 ||
      (chunk.length && word.startMs - chunk.at(-1)!.endMs > 280)
    )
      flush();
    chunk.push(word);
    if (/[.!?:]$/.test(word.text)) flush();
  }
  flush();
  return pages.map((p, i) => ({
    ...p,
    end: Math.min(p.end, pages[i + 1]?.start ?? Infinity),
  }));
}
export function reviewCaptionAt(
  captions: Caption[],
  nowMs: number,
  progressive = false,
) {
  return reviewCaptionCues(captions, progressive).find(
    (p) => nowMs >= p.start && nowMs < p.end,
  );
}
export function reviewCaptionCues(captions: Caption[], progressive = false) {
  const pages = reviewCaptionPages(captions);
  if (!progressive) return pages;
  return pages.flatMap((page) =>
    page.words.map((word, i) => ({
      words: page.words.slice(0, i + 1),
      start: word.startMs,
      end: page.words[i + 1]?.startMs ?? page.end,
    })),
  );
}
export function captionTone(text: string) {
  if (/^(gone|crash|38|percent|dark|disappears|brakes|king)/i.test(text))
    return "#e36b63";
  if (/^(UK|Heathrow|pound)/i.test(text)) return "#b1cb84";
  if (
    /^(no|matches|vagrant|stocks|cut|germ|agony|operation|anaesthetics|doesn't|haven't)/i.test(
      text,
    )
  )
    return "#f0635d";
  if (
    /^(England|1500|fire|flint|steel|tinder|Shakespeare|64|bread|pottage|3|week|straw)/i.test(
      text,
    )
  )
    return "#f8cf78";
  return "#ffffff";
}
export function captionVerticalPercent(episode: Episode, time: number) {
  if (episode.ukEdit?.style === "story-v6") {
    const scene = episode.scenes.find(
      (s) => time >= s.start && time < s.start + s.duration,
    );
    return scene?.id === "pints" ? 76 : 72;
  }
  if (episode.ukEdit) return 72;
  if (episode.reviewEdit?.scenery !== "pixel-village-v1") return 50;
  const shot = episode.reviewEdit.shots.find(
    (s) => time >= s.start && time < s.start + s.duration,
  );
  return shot?.activity === "eat" ? 76 : 70;
}
export function ReviewCaptions({
  captions,
  episode,
  portrait,
  verticalPercent,
}: {
  captions: Caption[];
  episode: Episode;
  portrait: boolean;
  verticalPercent?: number;
}) {
  const { fps } = useVideoConfig(),
    time = useCurrentFrame() / fps,
    edit = episode.ukEdit ?? episode.reviewEdit!;
  const immersive =
    !!episode.ukEdit || episode.reviewEdit?.scenery === "pixel-village-v1";
  if (time >= edit.quietStart && time < edit.quietStart + edit.quietDuration)
    return null;
  const story = episode.ukEdit?.style === "story-v6";
  const now = time * 1000,
    page = reviewCaptionAt(captions, now, story);
  const prompt =
    !story &&
    (time >= episode.duration - 0.45 ||
      (time >= edit.commentStart + 1.2 && time < edit.commentStart + 2.5));
  if (!page && !prompt) return null;
  const age = page ? (now - page.start) / 1000 : 1,
    scale =
      0.82 +
      smooth(age / 0.09) * 0.18 +
      Math.sin(Math.min(1, age / 0.2) * Math.PI) * 0.07;
  return (
    <div
      style={{
        position: "absolute",
        top: `${verticalPercent ?? captionVerticalPercent(episode, time)}%`,
        left: "50%",
        transform: `translate(-50%,-50%) scale(${scale})`,
        width: portrait ? 960 : 1400,
        textAlign: "center",
        fontFamily: "DM Sans",
        fontSize: portrait ? (immersive ? 84 : 92) : 76,
        fontWeight: 900,
        lineHeight: 1.08,
        letterSpacing: -2,
        color: "white",
        WebkitTextStroke: "10px #10151e",
        paintOrder: "stroke fill",
        textShadow: "0 5px 0 #10151e",
        pointerEvents: "none",
      }}
    >
      {prompt ? (
        <span style={{ color: "#f8cf78" }}>
          {episode.ukEdit ? "WHICH COUNTRY NEXT?" : "ONLY WITH..."}
        </span>
      ) : (
        page?.words.map((w, i) => (
          <span key={w.startMs} style={{ color: captionTone(w.text) }}>
            {i ? " " : ""}
            {w.text.toUpperCase()}
          </span>
        ))
      )}
    </div>
  );
}
