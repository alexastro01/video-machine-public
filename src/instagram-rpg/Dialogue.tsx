import glass from "../../episodes/alex-astro-instagram-algorithm-rpg/dialogue-style.json";
import type { CSSProperties } from "react";
import {
  Art,
  cue,
  gold,
  ink,
  out,
  pix,
  pos,
  pulse,
  smooth,
  timing,
  wordAt,
  type ArtName,
} from "./art";
import { actorAt } from "./World";

type Page = (typeof timing.pages)[number];
function currentPage(list: Page[], f: number) {
  return list.find((p) => p.start <= f && p.end > f) ?? list[list.length - 1];
}
const pixelBalloon =
  "polygon(4px 0,calc(100% - 4px) 0,calc(100% - 4px) 2px,100% 2px,100% calc(100% - 2px),calc(100% - 4px) calc(100% - 2px),calc(100% - 4px) 100%,4px 100%,4px calc(100% - 2px),0 calc(100% - 2px),0 2px,4px 2px)";
function Words({ f, page, panel }: { f: number; page: Page; panel: boolean }) {
  const active = wordAt(f);
  return (
    <>
      {timing.words.slice(page.first, page.last + 1).map((word, offset) => {
        const i = page.first + offset;
        const rhymed = timing.rhymes.includes(i);
        const bounce = pulse(
          f,
          timing.starts[i],
          Math.min(
            14,
            (timing.starts[i + 1] ?? timing.frames) - timing.starts[i],
          ),
        );
        const lit = i <= active;
        const style: CSSProperties = {
          display: "inline-block",
          transformOrigin: "50% 80%",
          transform: `translateY(${-(panel ? 3 : 1) * bounce}px) scale(${1 + (rhymed ? 0.105 : 0.027) * bounce})`,
          color:
            rhymed && lit
              ? gold
              : panel
                ? lit
                  ? "#fff8e7"
                  : "#d4d2ce"
                : "#fff9e8",
        };
        return (
          <span key={i}>
            <span style={style}>{word}</span>
            {offset < page.last - page.first ? " " : ""}
          </span>
        );
      })}
    </>
  );
}
export function FieldCaptions({ f }: { f: number }) {
  const a = actorAt(f < cue.wrong ? "alex" : "opus", f, false);
  const page = currentPage(timing.pages, f);
  const tail = pulse(f, page.start, 9) * 0.8;
  const cy = Math.round(a.y - a.h - 10 - a.wordHop * 1.2);
  return (
    <div
      style={{
        ...pos(Math.round(a.x), cy),
        whiteSpace: "nowrap",
        transform: `translate(-50%,-100%) translateY(${-tail}px)`,
        textAlign: "center",
        fontFamily: pix,
        fontSize: 16.8,
        lineHeight: "19px",
        fontWeight: 700,
        letterSpacing: -0.24,
      }}
    >
      <div
        style={{
          background: ink,
          clipPath: pixelBalloon,
          padding: "2px 5px 3px",
          boxShadow: "inset 0 1px #5b6b70",
          textShadow: "1px 1px #1f2437",
        }}
      >
        <Words page={page} f={f} panel={false} />
      </div>
      <div
        style={{
          ...pos(0, 0),
          left: "calc(50% - 3px)",
          top: "100%",
          width: 7,
          height: 4,
          background: ink,
          clipPath: "polygon(0 0,100% 0,52% 100%)",
        }}
      />
    </div>
  );
}

const poses: { name: ArtName; at: number }[] = [
  { name: "alex-portrait-first", at: 0 },
  { name: "alex-portrait-second", at: cue.algorithm },
  { name: "opus-portrait-first", at: cue.wrong },
  { name: "opus-portrait-second", at: cue.feed },
];
const panelFace = '"DM Sans", Arial, sans-serif';
export function PortraitDialogue({
  f,
  showCaptions,
}: {
  f: number;
  showCaptions: boolean;
}) {
  const page = currentPage(timing.phrases, f);
  const alex = f < cue.wrong;
  const enter = out(f, 0, 16);
  const idx = wordAt(f);
  const bump = pulse(
    f,
    timing.starts[idx],
    Math.min(
      13,
      (timing.starts[idx + 1] ?? timing.frames) - timing.starts[idx],
    ),
  );
  const nextPage = out(f, page.start, page.start + 8);
  const handoff = alex ? 1 - smooth(f, cue.wrong - 11, cue.wrong - 2) : 1;

  return (
    <div
      style={{
        ...pos(0, 0, 1080, 1920),
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        aria-hidden
        style={{
          ...pos(
            0,
            glass.panelTop + (1 - enter) * 17,
            glass.canvasWidth,
            glass.canvasHeight - glass.panelTop + 18,
          ),
          maskImage: `linear-gradient(to bottom,transparent,black ${glass.edgeFeather}px)`,
          backdropFilter: `grayscale(1) blur(${glass.blurRadius}px)`,
          WebkitBackdropFilter: `grayscale(1) blur(${glass.blurRadius}px)`,
          opacity: glass.blend,
        }}
      />
      <div
        aria-hidden
        style={{
          ...pos(
            0,
            glass.panelTop + (1 - enter) * 17,
            glass.canvasWidth,
            glass.canvasHeight - glass.panelTop + 18,
          ),
          maskImage: `linear-gradient(to bottom,transparent,black ${glass.edgeFeather}px)`,
          background: glass.shade,
        }}
      />
      {poses.map((p, i) => {
        const end = poses[i + 1]?.at ?? timing.frames + 16;
        const entrance = p.at;
        const exit = i === 1 ? end : end + 12;
        if (f < entrance || f >= exit) return null;
        const wipeIn = i === 1 || i === 3;
        const wipeOut = i === 0 || i === 2;
        const a = wipeIn ? smooth(f, p.at, p.at + 12) : 1;
        const b = wipeOut ? smooth(f, end, end + 12) : 0;
        const seam = (t: number) => -24 + 505 * t;
        const left = wipeOut && f >= end ? seam(b) : -24;
        const right = wipeIn ? seam(a) : 510;
        const arriving = i === 2 ? out(f, entrance - 1, p.at + 9) : 1;
        const leave = i === 1 ? smooth(f, end - 10, end) : 0;
        const shift =
          i === 0
            ? -13 * (1 - enter)
            : i === 2
              ? -200 * (1 - arriving)
              : 9 * (1 - a);
        const x = -17 + shift - 417 * leave;
        const clip = `polygon(${left + 20}px 1110px,${right + 20}px 1110px,${right - 20}px 1920px,${left - 20}px 1920px)`;
        return (
          <div
            key={p.name}
            style={{
              ...pos(0, 0, 1080, 1920),
              clipPath:
                "polygon(0 1090px,424px 1090px,453px 1505px,532px 1920px,0 1920px)",
            }}
          >
            <div style={{ ...pos(0, 0, 1080, 1920), clipPath: clip }}>
              <Art
                name={p.name}
                x={x}
                y={1182 - 3 * bump + 4 * (1 - arriving)}
                h={739}
                smoothArt
                style={{
                  transform: `scale(${1 + 0.006 * bump})`,
                  transformOrigin: "35% 78%",
                }}
              />
            </div>
          </div>
        );
      })}
      <div
        style={{
          ...pos(glass.captionLeft, 1247, 310, 52),
          opacity: handoff,
          fontFamily: panelFace,
          fontSize: 33,
          lineHeight: "44px",
          fontWeight: 650,
          letterSpacing: 1.1,
          color: "#e2dfd8",
          textShadow: "0 1px 4px rgba(22,22,21,.47)",
          transform: `translateY(${6 * (1 - enter)}px)`,
        }}
      >
        {alex ? "Alex" : "Opus"}
      </div>
      {showCaptions && (
        <div
          style={{
            ...pos(
              glass.captionLeft,
              glass.captionTop,
              glass.captionWidth,
              207,
            ),
            fontFamily: panelFace,
            opacity: handoff,
            fontSize: 52,
            lineHeight: "59px",
            fontWeight: 740,
            letterSpacing: -1.35,
            textShadow: "0 2px 5px rgba(28,27,25,.58)",
            transform: `translate(${(1 - nextPage) * 10}px,${(1 - nextPage) * 3}px)`,
          }}
        >
          <Words f={f} page={page} panel />
        </div>
      )}
    </div>
  );
}
