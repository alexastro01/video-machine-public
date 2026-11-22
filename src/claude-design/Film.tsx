import { useMemo } from "react";
import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Backdrop,
  C,
  Definitions,
  ease,
  lightLevel,
  mix,
  pulse,
  Rail,
  sans,
} from "./art";
import { Context, Model, Opening } from "./Discovery";
import { Loop, Permission } from "./Actions";
import { Compact, Memory } from "./Memory";
import { Finish, Recap } from "./Ending";
import type { Edit, SceneProps } from "./schema";

function AlexAtKeyboard({
  f,
  edit,
  episodeId,
}: SceneProps & { episodeId: string }) {
  const contact = edit.cues.no,
    appear = contact - 68,
    cut = edit.cues.memory;
  if (f < appear || f >= cut) return null;
  const enter = ease(f, appear, 18),
    leave = ease(f, cut - 12, 12);
  const pose =
    f >= contact
      ? "enter"
      : f >= contact - 6
        ? "reach-2"
        : f >= contact - 12
          ? "reach-1"
          : "lean";
  const anticipation = pulse(f, contact - 20, 18),
    impact = pulse(f, contact, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: 260,
        top: 1021,
        width: 559,
        height: 558,
        opacity: enter * (1 - leave),
        transform:
          "translateY(" +
          ((1 - enter) * 59 + 35 * leave - 4 * anticipation + 3 * impact) +
          "px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "3% -16% -6%",
          background:
            "radial-gradient(ellipse at 50% 61%,rgba(208,158,99,.30),rgba(144,144,102,.10) 49%,transparent 69%)",
        }}
      />
      <Img
        src={staticFile(
          "episodes/" + episodeId + "/actor/alex-" + pose + ".webp",
        )}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

function VoiceCaptions({
  f,
  edit,
  captions,
  fps,
}: SceneProps & { captions: Caption[]; fps: number }) {
  const pages = useMemo(() => {
    let offset = 0;
    return captions.map((caption) => {
      const words = caption.text.split(/\s+/);
      const starts = edit.wordFrames.slice(offset, offset + words.length);
      offset += words.length;
      return {
        words,
        starts,
        start: starts[0],
        end: Math.ceil((caption.endMs * fps) / 1000),
      };
    });
  }, [captions, edit.wordFrames, fps]);
  const page = pages.find((p) => p.start <= f && f < p.end);
  if (!page) return null;
  const light = lightLevel(f),
    darkText = light > 0.48;
  const active = page.starts.filter((t) => t <= f).length - 1;
  return (
    <div
      style={{
        position: "absolute",
        top: 245,
        left: 72,
        right: 72,
        display: "flex",
        height: 144,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: sans,
        fontSize: 76,
        fontWeight: 730,
        letterSpacing: -2.8,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {page.words.map((word, i) => {
        const visible = f >= page.starts[i],
          anim = ease(f, page.starts[i], 8);
        return (
          <span
            key={page.starts[i]}
            style={{
              opacity: visible ? 1 : 0,
              display: "inline-block",
              transform: "translateY(" + (1 - anim) * 6 + "px)",
              color:
                i === active
                  ? darkText
                    ? "#8c432b"
                    : "#f5bd91"
                  : mix(light, C.light, C.ink),
              textShadow: darkText ? "0 1px 1px #fff9ee" : "0 2px 2px #152018",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

export function ClaudeDesignFilm({
  episodeId,
  edit,
  captions,
  showCaptions,
  audioEnabled,
}: {
  episodeId: string;
  edit: Edit;
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920" aria-hidden>
        <Definitions />
        <Backdrop f={f} />
        <Rail f={f} edit={edit} />
        <Opening f={f} edit={edit} />
        <Model f={f} edit={edit} />
        <Context f={f} edit={edit} />
        <Loop f={f} edit={edit} />
        <Permission f={f} edit={edit} />
        <Memory f={f} edit={edit} />
        <Compact f={f} edit={edit} />
        <Recap f={f} edit={edit} />
        <Finish f={f} edit={edit} />
      </svg>
      <AlexAtKeyboard f={f} edit={edit} episodeId={episodeId} />
      {showCaptions && (
        <VoiceCaptions f={f} edit={edit} captions={captions} fps={fps} />
      )}
      {audioEnabled && (
        <Audio src={staticFile("episodes/" + episodeId + "/mix.wav")} />
      )}
    </AbsoluteFill>
  );
}
