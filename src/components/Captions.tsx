import type { Caption } from "@remotion/captions";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { palette as p } from "../engine/motion";
type Page = { words: Caption[]; start: number; end: number };
export function captionPages(captions: Caption[]): Page[] {
  const pages: Page[] = [];
  let words: Caption[] = [];
  const flush = () => {
    if (words.length)
      pages.push({
        words,
        start: words[0].startMs,
        end: words.at(-1)!.endMs + 180,
      });
    words = [];
  };
  for (const word of captions) {
    const previous = words.at(-1);
    const closesSentence = /[.!?]$/.test(word.text.trim());
    if (
      (words.length >= 5 && !(words.length < 7 && closesSentence)) ||
      (previous && word.startMs - previous.endMs > 650)
    )
      flush();
    words.push(word);
    if (/[.!?]$/.test(word.text.trim())) flush();
  }
  flush();
  return pages;
}
export const Captions = ({
  pages,
  portrait,
  hookDuration = 0,
}: {
  pages: Page[];
  portrait: boolean;
  hookDuration?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = (frame / fps) * 1000;
  const page = pages.find((p) => now >= p.start && now < p.end);
  const hook = now < hookDuration * 1000;
  if (!page) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: hook ? undefined : portrait ? 210 : 82,
        top: hook ? (portrait ? 340 : 120) : undefined,
        left: portrait ? 70 : 180,
        right: portrait ? 70 : 180,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: p.ink,
          padding: "18px 32px 22px",
          borderRadius: 14,
          textAlign: "center",
          fontFamily: "DM Sans",
          fontWeight: 700,
          fontSize: hook ? (portrait ? 70 : 64) : portrait ? 50 : 48,
          textTransform: hook ? "uppercase" : undefined,
          lineHeight: 1.35,
          boxShadow: "0 5px 0 #00000018",
        }}
      >
        {page.words.map((w) => (
          <span
            key={w.startMs}
            style={{
              color: now >= w.startMs && now < w.endMs ? "#F1BA68" : p.paper,
            }}
          >
            {w.text}
          </span>
        ))}
      </div>
    </div>
  );
};
