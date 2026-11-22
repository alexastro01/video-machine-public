import type { CSSProperties } from "react";
import { Img, staticFile } from "remotion";
import art from "../../episodes/alex-astro-the-final-round/art.json";
import { PixelActor } from "../developer/primitives";
import { wordBounce } from "../developer/word-bounce";
import {
  alexWords,
  assetRoot,
  cues,
  ease,
  interviewerWords,
  pulse,
  timeline,
} from "./timing";

type Pose =
  | "alex-talk"
  | "alex-point"
  | "alex-tie"
  | "alex-reach"
  | "opus-ready"
  | "opus-raise"
  | "opus-click"
  | "opus-catch";

function Actor({
  pose,
  x,
  eyeY,
  size,
  clip,
}: {
  pose: Pose;
  x: number;
  eyeY: number;
  size: number;
  clip?: string;
}) {
  return (
    <PixelActor
      actor={art[pose]}
      x={x}
      foot={eyeY + size}
      height={size}
      style={{
        imageRendering: "auto",
        clipPath: clip,
        transform: pose === "alex-point" ? "scaleX(-1)" : undefined,
        transformOrigin: `${(art[pose].pivotX * size) / art[pose].bodyHeight}px center`,
      }}
    />
  );
}

function Prop({
  name,
  style,
}: {
  name: "interviewer" | "sleeve" | "notepad" | "chair";
  style: CSSProperties;
}) {
  return (
    <Img
      src={staticFile(assetRoot + "/art/" + name + ".webp")}
      style={{ position: "absolute", ...style }}
    />
  );
}

function Envelope({
  x,
  y,
  angle,
  scale,
  open,
}: {
  x: number;
  y: number;
  angle: number;
  scale: number;
  open: number;
}) {
  return (
    <div
      className="fr-envelope"
      style={{
        left: x,
        top: y,
        transform: `rotate(${angle}deg) scale(${scale})`,
      }}
    >
      <div
        className="fr-envelope-sheet"
        style={{ transform: `translateY(${-open * 24}px)` }}
      />
      <div className="fr-envelope-fold" />
      <div className="fr-offer-word" style={{ opacity: open }}>
        Offer
      </div>
    </div>
  );
}

export function Interview({
  frame,
  detail = false,
}: {
  frame: number;
  detail?: boolean;
}) {
  const { fps } = timeline;
  const salary = ease(frame, cues.salaryMove, 41);
  const scale = 1 + 0.12 * salary;
  const roll = 1 - ease(frame, -6, 52);
  const seatSettle = pulse(frame, 38, 18);
  const alexLift = wordBounce(frame, fps, alexWords) / scale;
  const interviewerLift = wordBounce(frame, fps, interviewerWords) / scale;
  const readyToAnswer = pulse(frame, cues.raise - 15, 21);
  const reach = ease(frame, cues.reach, 14);
  const alexX =
    344 +
    readyToAnswer * 8 +
    reach * 9 -
    61 * ease(frame, cues.offerPass - 4, 23);
  const alexY = 1277 - alexLift - readyToAnswer * 8 + reach * 40;
  const opusX = 822 + roll * 337 - seatSettle * 5;
  const opusY = 1293 - seatSettle * 4 + pulse(frame, cues.catch - 6, 14) * 6;
  const alexPose: Pose =
    frame >= cues.reach
      ? "alex-reach"
      : frame >= cues.tie
        ? "alex-tie"
        : frame >= cues.point && frame < cues.salaryMove
          ? "alex-point"
          : "alex-talk";
  const opusPose: Pose =
    frame >= cues.catch - 3
      ? "opus-catch"
      : frame >= cues.fixClick - 6 && frame < cues.fixClick + 14
        ? "opus-click"
        : frame >= cues.raise
          ? "opus-raise"
          : "opus-ready";
  const lift = ease(frame, cues.offerOut - 4, 16);
  const fromPad = ease(frame, cues.offerOut, 22);
  const slide = ease(
    frame,
    cues.offerOut + 18,
    cues.catch - cues.offerOut - 18,
  );
  const settle = pulse(frame, cues.catch, 10);
  const envelopeX = 52 + fromPad * 167 + slide * 399 + settle * 4;
  const envelopeY = 1609 - fromPad * 3 + slide * 5;
  const sleevePush =
    ease(frame, cues.offerOut - 13, 18) *
    (1 - ease(frame, cues.offerOut + 41, 22));
  const notepadLift = pulse(frame, cues.offerOut - 9, 32);
  const actorStyle = {
    transform: `translateY(${-salary * 175}px) scale(${scale})`,
    transformOrigin: "540px 1460px",
  };
  return (
    <div className="fr-stage" style={detail ? undefined : actorStyle}>
      <Prop
        name="chair"
        style={{
          left: 172,
          top: 1311,
          width: 274,
          height: 403,
          transform: "rotate(-3deg)",
        }}
      />
      <Prop
        name="chair"
        style={{
          left: opusX - 104,
          top: 1320,
          width: 274,
          height: 403,
          transform: `rotate(${roll * 5 + seatSettle * 1.4}deg)`,
        }}
      />
      <Actor pose={alexPose} x={alexX} eyeY={alexY} size={332} />
      <Actor pose={opusPose} x={opusX} eyeY={opusY} size={350} />
      <Prop
        name="interviewer"
        style={{
          left: -123 + salary * 33,
          top: 1199 - interviewerLift,
          width: 302,
          transform: "rotate(-2deg)",
          transformOrigin: "bottom center",
        }}
      />
      <div className="fr-table" />
      <div className="fr-table-lip" />
      <Envelope
        x={envelopeX}
        y={envelopeY}
        angle={-8 + fromPad * 12 - slide * 6}
        scale={0.83 + 0.22 * fromPad}
        open={lift}
      />
      <Prop
        name="notepad"
        style={{
          left: 25,
          top: 1541 - notepadLift * 11,
          width: 242,
          height: 189,
          transform: `rotate(${-8 - notepadLift * 3}deg)`,
          filter: "drop-shadow(1px 8px 4px #4b3c2e34)",
        }}
      />
      <Prop
        name="sleeve"
        style={{
          width: 285,
          left: -186 + salary * 6 + sleevePush * 155,
          top: 1499 + sleevePush * 31,
          transform: `rotate(${8 + sleevePush * 6}deg)`,
          transformOrigin: "left center",
        }}
      />
      {alexPose === "alex-reach" && (
        <Actor
          pose={alexPose}
          x={alexX}
          eyeY={alexY}
          size={332}
          clip="polygon(55% 53%, 69% 58%, 78% 67%, 100% 67%, 100% 89%, 71% 89%, 56% 77%)"
        />
      )}
      {opusPose === "opus-catch" && (
        <Actor
          pose={opusPose}
          x={opusX}
          eyeY={opusY}
          size={350}
          clip="polygon(0 55%, 37% 55%, 37% 71%, 31% 77%, 25% 80%, 24% 100%, 0 100%)"
        />
      )}
    </div>
  );
}

/** A cut-in on the very same performance, framed on the tie, then the moving envelope. */
export function TableDetail({ frame }: { frame: number }) {
  if (frame < cues.salaryMove) return null;
  const show = ease(frame, cues.salaryMove, 18);
  const draw = ease(frame, cues.offerOut - 8, 29);
  const follow = ease(
    frame,
    cues.offerOut + 10,
    cues.catch - cues.offerOut - 10,
  );
  const x = 337 - 24 * draw + 369 * follow;
  const y = 1435 + 182 * draw + 20 * follow;
  const zoom = 1.52 + 0.18 * draw;
  return (
    <div
      className="fr-detail"
      style={{
        opacity: show,
        transform: `translateY(${(1 - show) * 36}px) rotate(${-2.5 + show * 0.9}deg) scale(${0.88 + 0.12 * show})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 1080,
          height: 1920,
          transformOrigin: "top left",
          transform: `translate(${422 - x * zoom}px,${226 - y * zoom}px) scale(${zoom})`,
        }}
      >
        <Interview frame={frame} detail />
      </div>
    </div>
  );
}
