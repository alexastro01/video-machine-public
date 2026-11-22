import { useMemo, type CSSProperties, type ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import { loadFont } from "@remotion/fonts";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import transcript from "../../episodes/make-no-mistakes/transcript-source.json";
import shortEdit from "../../episodes/make-no-mistakes/short-edit.json";
import { Diagram, Incident, StepIcon, previewFrames } from "./Diagrams";
import { MatureAstra, AvatarMorph } from "./MatureAstra";
import { Opening, Payoff } from "./PromptWords";
import {
  arrive,
  e,
  ease,
  mix,
  recapFrames,
  request,
  sceneAt,
  stages,
  stepIds,
  tabs,
  type SceneName,
  type Step,
} from "./timing";
import "./film.css";

loadFont({
  family: "Astra Inter",
  url: staticFile("episodes/ai-review-loop/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const asset = (s: string) => staticFile("episodes/make-no-mistakes/" + s);
const headings: Record<Step, string> = {
  front: "Request checks",
  token: "Token breakdown",
  gpu: "Inside the batch",
  stream: "Live reply",
  database: "Chat storage",
};
const details: Record<Step, string> = {
  front: "Gateway",
  token: "o200k_base",
  gpu: "Inference",
  stream: "Text stream",
  database: "Chat history",
};
const recapCopy = [
  "Identity and quota checked",
  "3 tokens, or 6 in caps",
  "One token at a time",
  "Reply delivered in chunks",
  "One PostgreSQL writer",
];
const lastReached = (frame: number, times: number[]) =>
  Math.max(0, times.filter((v) => v <= frame).length - 1);
function Panel({
  title,
  detail,
  children,
  style,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="mn-panel" style={style}>
      <header className="mn-panel-head">
        <h2>{title}</h2>
        {detail && <span>{detail}</span>}
      </header>
      <div className="mn-canvas">{children}</div>
    </div>
  );
}
function Rail({ active }: { active: number }) {
  return (
    <div className="mn-rail">
      <div className="mn-track" />
      {stepIds.map((step, i) => (
        <div
          className={
            "mn-station" +
            (i === active ? " is-active" : i < active ? " did-pass" : "")
          }
          key={step}
        >
          <div className="mn-station-icon">
            <StepIcon id={step} />
          </div>
          <span>{i === 2 ? "GPUs" : tabs[i].toUpperCase()}</span>
        </div>
      ))}
    </div>
  );
}
function RequestCard({ frame, scene }: { frame: number; scene: SceneName }) {
  const type = scene === "front" ? ease(frame, stages.front, 20) : 1;
  const length = Math.ceil(type * request.text.length);
  return (
    <div className="mn-request">
      <div className="mn-avatar">
        <Img src={asset("alex.webp")} />
      </div>
      <div className="mn-request-text">
        <div className="mn-sender">
          <b>Alex</b>
          <span>{request.id}</span>
        </div>
        <div className="mn-prompt">
          {request.text.slice(0, length)}
          {type < 1 && <i />}
        </div>
      </div>
    </div>
  );
}
function Capsule({
  children,
  x,
  y,
  opacity = 1,
  scale = 1,
}: {
  children: ReactNode;
  x: number;
  y: number;
  opacity?: number;
  scale?: number;
}) {
  return (
    <div
      className="mn-flying-ticket"
      style={{
        left: x,
        top: y,
        opacity,
        transform: `translate(-50%,-50%) scale(${scale})`,
      }}
    >
      {children}
    </div>
  );
}
function HandOff({ frame }: { frame: number }) {
  const catchAt = e.prompt - 8,
    sendAt = e.ship - 32;
  if (frame >= catchAt && frame < catchAt + 65) {
    const fly = ease(frame, catchAt + 2, 26),
      caught = ease(frame, catchAt + 34, 17);
    return (
      <Capsule
        x={mix(175, 493, fly)}
        y={mix(1100, 1504, fly) - Math.sin(fly * Math.PI) * 69}
        opacity={arrive(frame, catchAt, 7) * (1 - caught)}
        scale={mix(0.98, 0.69, fly)}
      >
        {request.id}
      </Capsule>
    );
  }
  if (frame >= sendAt + 30 && frame < sendAt + 88) {
    const fly = ease(frame, sendAt + 32, 37);
    return (
      <Capsule
        x={mix(295, 865, fly)}
        y={mix(1235, 880, fly) - Math.sin(fly * Math.PI) * 40}
        opacity={
          arrive(frame, sendAt + 30, 5) * (1 - ease(frame, sendAt + 62, 13))
        }
        scale={mix(0.73, 0.88, fly)}
      >
        Check
      </Capsule>
    );
  }
  return null;
}
function Recap({ frame }: { frame: number }) {
  const heights = stepIds.map((_, i) => {
    const open = ease(frame, recapFrames[i] - 3, 13),
      close = i === 4 ? 0 : ease(frame, recapFrames[i + 1] - 3, 13);
    return 75 + 88 * (open - close);
  });
  return (
    <div className="mn-recap">
      {stepIds.map((step, i) => {
        const selected = lastReached(frame, recapFrames) === i;
        const opened = (heights[i] - 75) / 88;
        return (
          <div
            key={step}
            className={"mn-recap-row" + (selected ? " chosen" : "")}
            style={{ height: heights[i] }}
          >
            <div className="mn-recap-name">
              <div className="mn-recap-icon">
                <StepIcon id={step} />
              </div>
              <div>
                <strong>{tabs[i]}</strong>
                {opened > 0.2 && (
                  <small style={{ opacity: opened }}>{recapCopy[i]}</small>
                )}
              </div>
            </div>
            <div
              className="mn-mini"
              style={{
                width: mix(149, 320, opened),
                height: mix(64, 149, opened),
              }}
            >
              <Diagram step={step} frame={frame} snapshot />
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Workbench({ frame, scene }: { frame: number; scene: SceneName }) {
  const route = scene === "route";
  const preview = lastReached(frame, previewFrames);
  const stageIndex = route
    ? preview
    : scene === "recap"
      ? lastReached(frame, recapFrames)
      : scene === "twist" || scene === "payoff"
        ? 4
        : stepIds.indexOf(scene as Step);
  let panel: ReactNode;
  if (scene === "recap") panel = <Recap frame={frame} />;
  else if (scene === "twist")
    panel = (
      <Panel title="Image generation launch" detail="2025 incident">
        <Incident f={frame} />
      </Panel>
    );
  else if (scene === "payoff")
    panel = (
      <Panel title="Does it work?" detail="GPT-5">
        <Payoff f={frame} />
      </Panel>
    );
  else if (route) {
    const entry = ease(frame, e.prompt - 4, 19);
    panel = (
      <Panel
        title={entry < 0.5 ? "Request checks" : "One prompt"}
        detail={entry < 0.5 ? "Gateway" : "Request path"}
      >
        <div className="mn-map-viewport">
          {entry < 1 && (
            <div
              className="mn-map-page"
              style={{ transform: `translateX(${-entry * 100}%)` }}
            >
              <Diagram step="front" frame={stages.route - 1} />
            </div>
          )}
          {entry > 0 && (
            <div
              className="mn-map-page"
              style={{ transform: `translateX(${(1 - entry) * 100}%)` }}
            >
              <div className="mn-route-map">
                {stepIds.map((id, i) => (
                  <div
                    key={id}
                    className={frame >= previewFrames[i] ? "mn-stop-done" : ""}
                  >
                    <div className="mn-route-icon">
                      <StepIcon id={id} />
                    </div>
                    <strong>{tabs[i]}</strong>
                  </div>
                ))}
                <span className="mn-route-id">
                  {request.id}
                  {frame >= e.saved && <b className="mn-saved">✓ Saved</b>}
                </span>
              </div>
            </div>
          )}
        </div>
      </Panel>
    );
  } else {
    const step = scene as Step;
    const db = step === "database" && frame >= e.pg;
    panel = (
      <Panel
        title={db ? "PostgreSQL" : headings[step]}
        detail={db ? "Azure" : details[step]}
      >
        <Diagram step={step} frame={frame} />
      </Panel>
    );
  }
  return (
    <>
      <Rail active={stageIndex} />
      <RequestCard frame={frame} scene={scene} />
      {panel}
    </>
  );
}
export type MistakesProps = {
  captions: Caption[];
  short?: boolean;
  showCaptions: boolean;
  audioEnabled: boolean;
};
export function MistakesFilm({
  captions,
  showCaptions,
  audioEnabled,
  short = false,
}: MistakesProps) {
  const playback = useCurrentFrame(),
    { width, height } = useVideoConfig();
  const span = short
    ? shortEdit.spans.find(
        (s) => playback >= s.at && playback < s.at + s.sourceOut - s.sourceIn,
      )
    : undefined;
  const frame = span ? span.sourceIn + playback - span.at : playback;
  const scene = sceneAt(frame);
  const subtitles = useMemo(
    () =>
      progressiveCaptionCues(
        captions,
        short ? shortEdit.words : transcript.words,
      ),
    [captions, short],
  );
  const ms = (playback * 1000) / 60;
  const caption = subtitles.find((s) => s.startMs <= ms && s.endMs > ms);
  return (
    <AbsoluteFill
      style={{
        background: "#efedf4",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="mn-film"
        style={{ transform: `scale(${Math.min(width / 1080, height / 1920)})` }}
      >
        <div className="mn-paper" />
        <div
          className="mn-paper-red"
          style={{ opacity: scene === "twist" ? 0.8 : 0 }}
        />
        {scene === "hook" ? (
          <Opening frame={frame} />
        ) : (
          <Workbench frame={frame} scene={scene} />
        )}
        <MatureAstra frame={frame} playback={playback} short={short} />
        <AvatarMorph frame={frame} />
        <HandOff frame={frame} />
        {showCaptions && caption && (
          <div className="mn-captions">
            <b>{caption.text}</b>
          </div>
        )}
        {audioEnabled && (
          <Audio src={asset(short ? "short-mix.wav" : "mix.wav")} />
        )}
      </div>
    </AbsoluteFill>
  );
}

export function MistakesShort({
  showCaptions = true,
  audioEnabled = true,
}: {
  showCaptions?: boolean;
  audioEnabled?: boolean;
}) {
  return (
    <MistakesFilm
      short
      captions={shortEdit.captions}
      showCaptions={showCaptions}
      audioEnabled={audioEnabled}
    />
  );
}
