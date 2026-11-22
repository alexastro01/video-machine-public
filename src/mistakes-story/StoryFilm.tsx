import { Audio } from "@remotion/media";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import captions from "../../episodes/make-no-mistakes-story/captions.json";
import portraits from "../../episodes/astra-born-yesterday/assets/portraits.json";
import { Failure, NightPlate, Retry, Setup, Success } from "./Journey";
import { CatchRequest, Opening } from "./Opening";
import { Database, Gate, GPU, HardwareFinish, Stream, Tokens } from "./Stops";
import {
  arc,
  e,
  ease,
  mouth,
  phrases,
  poses,
  stageAt,
  talkingLift,
  words,
} from "./timing";
import "./story.css";

const local = (name: string) =>
  staticFile("episodes/make-no-mistakes-story/" + name);
const drawings: Record<string, string> = {
  point: "episodes/make-no-mistakes/mature/point.webp",
  gasp: "episodes/make-no-mistakes/mature/cover.webp",
  proud: "episodes/astra-born-yesterday/portraits/proud.webp",
};
const scenes = {
  setup: Setup,
  gate: Gate,
  tokens: Tokens,
  gpu: GPU,
  stream: Stream,
  database: Database,
  failure: Failure,
  retry: Retry,
  aside: Success,
};

const lips: Record<string, [number, number, number]> = {
  receive: [531, 323, 1.0],
  inspect: [487, 323, 0.89],
  send: [537, 323, 1.0],
};
const patchSources: Record<string, string> = { point: "snap", proud: "proud" };
function SpeakingMouth({ pose, level }: { pose: string; level: number }) {
  const patchId = patchSources[pose];
  if (patchId) {
    const [x, y, size] = portraits.find((p) => p.id === patchId)!.rest;
    if (level === 3) return null;
    return (
      <Img
        src={staticFile(
          "episodes/astra-born-yesterday/portraits/" +
            patchId +
            "-" +
            ["rest", "small", "mid"][level] +
            ".webp",
        )}
        style={{
          position: "absolute",
          left: x / 10.24 + "%",
          top: y / 10.24 + "%",
          width: size / 10.24 + "%",
        }}
      />
    );
  }
  if (!level || !lips[pose]) return null;
  const [x, y, w] = lips[pose];
  return (
    <svg className="mn4-mouth" viewBox="0 0 1024 1024">
      <g
        transform={`translate(${x} ${y}) scale(${w} ${[0, 0.5, 0.83, 1.13][level]})`}
      >
        <path
          d="M-17 -2 Q-7 .1 0 -.7 Q10 -1.4 17 -4 Q12 9 3 11 Q-9 14 -17 -2Z"
          fill="#874e4e"
          stroke="#945c4d"
          strokeWidth="1.6"
        />
        <path d="M-8 7 Q.5 3 10 6 Q2 14 -8 7Z" fill="#e09b8b" />
      </g>
    </svg>
  );
}

function Narrator({ f, lift }: { f: number; lift: number }) {
  const enter = ease(f, e.lid + 3, 22);
  if (enter === 0) return null;
  const pose = poses.filter((p) => f >= p.at).at(-1)?.pose ?? "send";
  const src = drawings[pose]
    ? staticFile(drawings[pose])
    : local("art/" + pose + ".webp");
  return (
    <div
      className="mn4-narrator"
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 74 - lift}px)`,
      }}
    >
      <Img className="mn4-drawing" src={src} />
      <SpeakingMouth pose={pose} level={mouth[Math.floor(f / 3)] ?? 0} />
    </div>
  );
}

function SpokenWords({ f }: { f: number }) {
  const ms = (f / 60) * 1000;
  const index = captions.findIndex((c) => c.startMs <= ms && c.endMs > ms);
  const group = phrases[index];
  if (!group) return null;
  const visible = group.filter((i) => Math.ceil(words[i].start * 60) <= f);
  const current = visible.at(-1);
  return (
    <div className="mn4-captions">
      <div>
        {visible.map((i) => (
          <span key={i} className={i === current ? "mn4-spoken" : ""}>
            {words[i].text.replace(/^\.\.\./, "…")}{" "}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StoryFilm({
  showCaptions = true,
  audioEnabled = true,
}: {
  showCaptions?: boolean;
  audioEnabled?: boolean;
}) {
  const f = useCurrentFrame();
  const stage = stageAt(f);
  const night = stage === "setup" || stage === "failure" || f >= e.success;
  const Panel = stage === "hook" ? undefined : scenes[stage];
  const plate =
    f < e.slump - 13
      ? "desk"
      : f < e.slump - 7
        ? "fall1"
        : f < e.slump
          ? "fall2"
          : "sleep";
  const concentrate =
    (f >= e.identity - 14 && f <= e.under + 13) ||
    (f >= e.free - 6 && f <= e.land + 8) ||
    (f >= e.quoteStart - 6 && f <= e.quoteEnd + 14) ||
    (f >= e.success - 6 && f <= e.slump + 10);
  const lift = concentrate ? 0 : talkingLift(f) * 0.58;
  return (
    <AbsoluteFill
      className={"mn3-film mn3-" + stage + (night ? " mn3-night" : "")}
    >
      {night && <NightPlate name={plate} drop={arc(f, e.slump, 12) * 4} />}
      {stage === "hook" && <Opening f={f} />}
      {stage === "hook" && f > e.catch + 7 && (
        <AbsoluteFill style={{ opacity: ease(f, e.catch + 7, 18) }}>
          <NightPlate name="desk" />
        </AbsoluteFill>
      )}
      {Panel && (
        <svg className="mn3-diagram" viewBox="0 0 1080 1920" aria-hidden="true">
          <HardwareFinish />
          <Panel f={f} />
        </svg>
      )}
      <Narrator f={f} lift={lift} />
      {stage === "hook" && <CatchRequest f={f} palmLift={lift} />}
      {showCaptions && <SpokenWords f={f} />}
      {audioEnabled && <Audio src={local("mix.wav")} />}
    </AbsoluteFill>
  );
}
