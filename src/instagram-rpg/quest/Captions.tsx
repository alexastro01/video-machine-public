import glass from "../../../episodes/alex-astro-instagram-algorithm-rpg/dialogue-style.json";
import { Art, gold, ink, out, pos, pulse, smooth } from "../art";
import {
  actor,
  c,
  edit,
  fieldFont,
  speaking,
  wordBounce,
  wordIndex,
} from "./staging";

type Line = (typeof edit.pages)[number];
function getPage(pages: Line[], f: number) {
  return (
    pages.find((p) => p.start <= f && f < p.end) ?? pages[pages.length - 1]
  );
}
function Words({
  page,
  f,
  portrait = false,
}: {
  page: Line;
  f: number;
  portrait?: boolean;
}) {
  const active = wordIndex(f);
  return (
    <>
      {edit.words.slice(page.first, page.last + 1).map((w, index) => {
        const i = page.first + index,
          rhyme = edit.rhymes.includes(i),
          hit = pulse(
            f,
            edit.starts[i],
            Math.min(13, (edit.starts[i + 1] ?? edit.frames) - edit.starts[i]),
          );
        return (
          <span key={i}>
            <span
              style={{
                display: "inline-block",
                color:
                  rhyme && i <= active
                    ? gold
                    : portrait && i > active
                      ? "#d9d8d1"
                      : "#fffaf0",
                transform: rhyme
                  ? `translateY(${-hit * (portrait ? 3 : 1)}px) scale(${1 + hit * 0.083})`
                  : undefined,
                transformOrigin: "50% 85%",
              }}
            >
              {w}
            </span>
            {i < page.last ? " " : ""}
          </span>
        );
      })}
    </>
  );
}
export function FieldLine({ f }: { f: number }) {
  if (f >= c.question) return null;
  const page = getPage(edit.pages, f),
    a = actor(speaking(f), f);
  const fontsize =
    page.text.length >= 19 ? 15.5 : page.text.length >= 16 ? 16.2 : 17;
  const x = Math.round(a.x);
  const y = Math.round(a.y - a.h - 7 - 0.9 * wordBounce(f));
  return (
    <>
      <div
        style={{
          ...pos(0, y),
          transform: `translate(clamp(12px, calc(${x}px - 50%), calc(228px - 100%)), -100%)`,
          textAlign: "center",
          whiteSpace: "nowrap",
          fontFamily: fieldFont,
          fontWeight: 790,
          fontSize: fontsize,
          letterSpacing: -0.43,
          lineHeight: "20px",
          color: "#fffaf0",
          padding: "2px 6px 3px",
          background: "#172528",
          borderRadius: 2,
          boxShadow: "0 1px 0 rgba(240,226,179,.6)",
        }}
      >
        <Words page={page} f={f} />
      </div>
      <div
        style={{
          ...pos(x - 3, y, 6, 4),
          background: ink,
          clipPath: "polygon(0 0,100% 0,50% 100%)",
        }}
      />
    </>
  );
}
export function Payoff({
  f,
  showCaptions,
}: {
  f: number;
  showCaptions: boolean;
}) {
  if (f < c.question - 9) return null;
  const enter = smooth(f, c.question - 9, c.question + 6);
  const isAlex = f < c.reply;
  const page = getPage(edit.portraitPages, Math.max(c.question, f));
  const b = wordBounce(f);
  const clear = isAlex ? 1 - smooth(f, c.reply - 10, c.reply - 3) : 1;
  const transfer = isAlex
    ? smooth(f, c.reply - 11, c.reply)
    : 1 - out(f, c.reply - 1, c.reply + 10);
  const name = isAlex
    ? "alex-payoff-portrait-talk"
    : "opus-payoff-portrait-talk";
  return (
    <div style={{ ...pos(0, 0, 1080, 1920), pointerEvents: "none" }}>
      <div
        aria-hidden
        style={{
          ...pos(0, glass.panelTop, 1080, 1920 - glass.panelTop),
          maskImage: `linear-gradient(transparent,black ${glass.edgeFeather}px)`,
          backdropFilter: `grayscale(1) blur(${glass.blurRadius}px)`,
          opacity: glass.blend * enter,
        }}
      />
      <div
        aria-hidden
        style={{
          ...pos(0, glass.panelTop, 1080, 1920 - glass.panelTop),
          maskImage: `linear-gradient(transparent,black ${glass.edgeFeather}px)`,
          background: glass.shade,
          opacity: enter,
        }}
      />
      <div
        style={{
          ...pos(0, 0, 1080, 1920),
          clipPath:
            "polygon(0 1090px,426px 1090px,451px 1510px,510px 1920px,0 1920px)",
        }}
      >
        <Art
          name={name}
          x={2 - 330 * (1 - enter) - (isAlex ? 465 : 230) * transfer}
          y={1190 - 2 * b}
          h={733}
          smoothArt
          style={{
            transform: `scale(${1 + 0.005 * b})`,
            transformOrigin: "35% 80%",
          }}
        />
      </div>
      {f >= c.question && (
        <div
          style={{
            ...pos(glass.captionLeft, 1247, 310, 50),
            fontFamily: fieldFont,
            fontWeight: 650,
            fontSize: 33,
            color: "#e3dfd7",
            opacity: enter * clear,
          }}
        >
          {isAlex ? "Alex" : "Opus"}
        </div>
      )}
      {showCaptions && f >= c.question && (
        <div
          style={{
            ...pos(
              glass.captionLeft,
              glass.captionTop,
              glass.captionWidth,
              203,
            ),
            fontFamily: fieldFont,
            fontWeight: 735,
            fontSize: 52,
            lineHeight: "59px",
            letterSpacing: -1.25,
            textShadow: "0 2px 5px rgba(25,24,22,.55)",
            opacity: enter * clear,
            transform: `translateX(${6 * (1 - out(f, page.start, page.start + 6))}px)`,
          }}
        >
          <Words page={page} f={f} portrait />
        </div>
      )}
    </div>
  );
}
