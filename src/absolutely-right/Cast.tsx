import { Img, staticFile } from "remotion";
import patches from "../../episodes/absolutely-right/art/patches.json";
import { currentLine, edit, ease, onsets, pulse, timeline } from "./timing";

const art = (name: string) =>
  staticFile("episodes/absolutely-right/art/" + name);
const rectangles: Record<
  string,
  { x: number; y: number; w: number; h: number }
> = patches;

function Patch({ name, opacity = 1 }: { name: string; opacity?: number }) {
  const rect = rectangles[name];
  if (!rect || opacity <= 0.01) return null;
  return (
    <Img
      src={art(name + ".png")}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        opacity,
      }}
    />
  );
}

export function Opus({ frame, count }: { frame: number; count: number }) {
  const line = currentLine(frame);
  const speaking = line?.speaker === "opus" ? line : undefined;
  const montage = frame >= edit.montage.first && frame < edit.montage.stop;
  const beam =
    (frame >= edit.exchanges[5].opus + 2 && frame < edit.typing.start) ||
    frame >= edit.typing.reply + 2;
  const pose = beam ? "beam" : "opus";
  const meter = speaking?.mouth[frame - speaking.frame] ?? (montage ? 0.42 : 0);
  const shape = meter < 0.16 ? "rest" : meter < 0.58 ? "mid" : "";
  const lift = onsets(speaking, frame);
  const greeting = beam
    ? pulse(
        frame,
        count < 29 && frame < edit.typing.start
          ? edit.exchanges[5].opus
          : edit.typing.reply,
        20,
      )
    : 0;
  const firstWord = speaking
    ? ease(frame, speaking.frame, 6) * (1 - ease(frame, speaking.end - 4, 10))
    : 0;
  return (
    <div className="ar-opus-column">
      <div
        className="ar-opus-light"
        style={{ opacity: 0.39 + 0.38 * firstWord + (montage ? 0.15 : 0) }}
      />
      <div className="ar-opus-name">
        <span />
        Opus 5.5
      </div>
      <div className="ar-opus-lens">
        <div
          className="ar-opus-motion"
          style={{
            transform: `translateY(${-7 * lift - 6 * greeting}px) rotate(${-0.55 * lift}deg)`,
            filter: `brightness(${speaking || montage ? 1.03 : 0.86})`,
          }}
        >
          <div
            className="ar-opus-source"
            style={{ transform: `scale(${beam ? 0.6 : 0.615})` }}
          >
            <Img src={art(pose + ".webp")} width={630} />
            {shape && <Patch name={pose + "-" + shape} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Desk({
  frame,
  realFrame,
}: {
  frame: number;
  realFrame: number;
}) {
  const enter = edit.typing.enter;
  const firstLook = timeline.dings[1].frame + 7;
  const squint = edit.exchanges[2].alex + 4;
  const lean = timeline.dings[27].frame + 12;
  const reach = edit.typing.reach.filter((cel) => cel.frame <= frame).at(-1);
  const pose =
    reach?.pose ??
    (frame >= lean
      ? "lean"
      : frame >= squint
        ? "squint"
        : frame >= firstLook
          ? "look"
          : "type");
  const line = currentLine(frame);
  const speaking = line?.speaker === "alex" ? line : undefined;
  const meter = speaking?.mouth[frame - speaking.frame] ?? 0;
  const mouth = meter > 0.6 ? "open" : meter > 0.18 ? "mid" : "";
  const lift = onsets(speaking, frame);
  const accent =
    pulse(frame, firstLook - 6, 16) +
    0.65 * pulse(frame, squint - 5, 14) +
    pulse(frame, lean - 7, 18);
  const keyIndex =
    timeline.keyFrames.filter((strike) => strike <= frame + 4).length - 1;
  const strike = timeline.keyFrames[keyIndex] ?? -100;
  const hand = keyIndex % 2 ? "right" : "left";
  const handUp =
    pulse(frame, strike - 4, 4) + 0.68 * pulse(frame, strike + 1, 6);
  const wait = realFrame >= enter && realFrame < edit.typing.reply;
  const suspense = ease(frame, edit.typing.start, 110);
  // Keep the keyboard's front edge anchored as his shoulders react.
  const bodyScale =
    1 + (lift * 5 - accent * 5 + Math.sin(frame / 55) * 1.2) / 700;
  return (
    <>
      <div className="ar-room">
        <Img src={art("room.webp")} />
      </div>
      <div className="ar-room-seam" />
      <div className="ar-desk-shadow" />
      <div className="ar-alex-placement">
        <div
          className="ar-alex-gaze"
          style={{
            transform: `scale(${0.794 + suspense * 0.013})`,
          }}
        >
          <div
            className="ar-alex-cel"
            style={{
              transform: `scaleY(${bodyScale}) skewX(${accent * 0.32 - lift * 0.16}deg)`,
            }}
          >
            <Img src={art("alex-" + pose + ".webp")} width={842} height={900} />
            {mouth && <Patch name={`alex-${pose}-${mouth}`} />}
            {!wait && (pose === "type" || pose === "lean") && (
              <Patch name={`alex-${pose}-${hand}`} opacity={handUp} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
