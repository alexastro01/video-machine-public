import type { Caption } from "@remotion/captions";
import { Img, staticFile } from "remotion";
import type { Episode } from "../engine/schema";
import { out, pos, pulse } from "../instagram-rpg/art";
import glass from "../../episodes/alex-astro-instagram-algorithm-rpg/dialogue-style.json";
import rig from "../../episodes/alex-astro-job-market-hell/portraits.json";

type Edit = NonNullable<Episode["jobMarketOpening"] | Episode["lectureHall"] | Episode["remoteJobOpening"]>;
type Cue = NonNullable<Edit["portraits"]>[number];
type Pose = {width: number; height: number; mouth: {x: number; y: number; width: number; height: number}};
type PortraitRig = Record<string, Pose>;
type DialogueLayout = {
  portraitLeft: number; portraitTop: number; portraitHeight: number;
  panelTop: number; panelTint: string;
  captionGap: number; captionTop: number; captionRight: number;
};
const panelTop = 1236;
const portraitTop = 1092;
const portraitBottom = 1528;
const captionLeft = 285;
const captionBottom = 1508;

function TalkingPortrait({ base, cue, mouth, pose, left, top, height, width, bottomCrop }: {
  base: string; cue: Cue; mouth: number; pose: Pose; left: number; top: number;
  height: number; width: number; bottomCrop?: number;
}) {
  const path = base + "/portraits/" + cue.pose;
  const scale = height / pose.height;
  const patch = pose.mouth;
  return <div data-overlay-portrait={cue.role} data-mouth={mouth} data-pose={cue.pose} style={{
    ...pos(left, top, width, bottomCrop === undefined ? height : bottomCrop - top),
    ...(bottomCrop === undefined ? {} : {
      overflow: "hidden", maskImage: "linear-gradient(to bottom, black 0%, black 94%, transparent 100%)",
    }),
  }}>
    <Img src={staticFile(path + ".png")}
      style={{ ...pos(0, 0, bottomCrop === undefined ? undefined : width, height), display: "block" }}/>
    {(["rest", "mid"] as const).map((cel, i) => <Img key={cel} src={staticFile(path + "-" + cel + ".png")}
      style={{ ...pos(patch.x * scale, patch.y * scale, patch.width * scale, patch.height * scale),
        opacity: mouth === i ? 1 : 0 }} />)}
  </div>;
}

export function PortraitDialogue({ edit, captions, base, frame, index, lift, showCaptions, clearAtCut = false, poses = rig, layout }: {
  edit: Edit; captions: Caption[]; base: string; frame: number; index: number; lift: number; showCaptions: boolean; clearAtCut?: boolean; poses?: PortraitRig;
  layout?: DialogueLayout;
}) {
  if (!edit.portraits || !edit.mouth) return null;
  const cue = edit.portraits.filter(c => c.frame <= frame).at(-1) ?? edit.portraits[0];
  const page = edit.pages.find(([first, last]) => first <= index && index <= last) ?? edit.pages[0];
  const visible = index >= 0 && (page[1] === captions.length - 1 || frame < edit.ends[page[1]] + 6) && (!clearAtCut || edit.ends[page[1]] >= cue.frame);
  const pose = poses[cue.pose];
  const height = layout?.portraitHeight ?? 686;
  const scaledWidth = pose.width * height / pose.height;
  const width = layout ? scaledWidth : Math.round(scaledWidth);
  const settle = cue.frame === 0 ? 1 : out(frame, cue.frame, cue.frame + 5);
  const left = layout?.portraitLeft ?? (9 - (cue.pose === "portrait-two" ? 4 : 15) * (1 - settle));
  const top = layout?.portraitTop ?? (portraitTop - lift * 1.65);
  const captionX = layout ? left + width + layout.captionGap : captionLeft;
  const captionPosition = layout
    ? pos(captionX, layout.captionTop, layout.captionRight - captionX)
    : { position: "absolute" as const, left: captionLeft, bottom: 1920 - captionBottom, width: 606 };
  const blurTop = layout?.panelTop ?? panelTop;
  const blurBottom = layout ? 1920 : 1548;
  const panel = pos(0, blurTop, 1080, blurBottom - blurTop);
  const mask = layout
    ? `linear-gradient(transparent,black ${glass.edgeFeather}px,black 100%)`
    : `linear-gradient(transparent,black ${glass.edgeFeather}px,black 87%,transparent 100%)`;
  return <div style={{ ...pos(0, 0, 1080, 1920), pointerEvents: "none", overflow: "hidden" }}>
    <div data-dialogue-blur style={{ ...panel, maskImage: mask,
      backdropFilter: `grayscale(1) blur(${glass.blurRadius}px)`, opacity: glass.blend }}/>
    <div data-dialogue-shade style={{ ...panel, maskImage: mask, background: layout?.panelTint ?? glass.shade }}/>
    <TalkingPortrait base={base} cue={cue} mouth={edit.mouth[frame] ?? 0} pose={pose}
      left={left} top={top} width={width} height={height} bottomCrop={layout ? undefined : portraitBottom}/>
    {!layout && <div style={{ ...pos(captionLeft - 51, 1294, 265, portraitBottom - 1294),
      background: "linear-gradient(90deg, transparent, rgba(35,34,33,.83) 20%, rgba(35,34,33,.83) 73%, transparent)",
      maskImage: "linear-gradient(transparent,black 24%,black 94%,transparent)" }}/>}
    <div data-caption-column style={{ ...captionPosition,
      fontFamily: '"DM Sans", Arial, sans-serif',
      textShadow: layout ? "0 2px 5px #131820, 0 0 4px #131820" : "0 2px 5px rgba(25,24,22,.55)" }}>
      <div style={{ fontWeight: 650, fontSize: 31, lineHeight: "38px", color: "#e3dfd7", marginBottom: 3 }}>
        {{alex: "Alex", opus: "Opus", aunt: "Aunt"}[cue.role]}
      </div>
      {showCaptions && <div data-overlay-caption={cue.role} style={{ color: "#fff9e9", fontWeight: 735,
        fontSize: 60, lineHeight: "63px", letterSpacing: -1.25, textWrap: layout ? "balance" : undefined,
        visibility: visible ? "visible" : "hidden" }}>
      {captions.slice(page[0], page[1] + 1).map((word, i) => {
        const n = page[0] + i;
        return <span key={word.startMs} style={{ opacity: n <= index ? 1 : 0 }}>
          {i ? " " : ""}<span style={{ color: n === index ? "#ffe8a8" : "#fff9e9",
            display: "inline-block", transform: n === index ? `translateY(${-2 * pulse(frame, edit.starts[n], 8)}px)` : undefined,
          }}>{word.text.trim()}</span>
        </span>;
      })}
      </div>}
    </div>
  </div>;
}
