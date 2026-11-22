import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Episode } from "../engine/schema";
import { PixelStage } from "./PixelStage";
import {
  UkCamera,
  UkLights,
  Particles,
  Pilot,
  Runway,
  IrelandMap,
  TradeNetwork,
  Crown,
} from "./UkGeometry";
import { TrainIllustration, CoinIllustration } from "./UkStoryProps";
import { ukState } from "./uk-state";
import { smooth } from "./timeline";
import { SceneryCamera } from "./UkScenery";
import { UkGifMiko } from "./UkGifMiko";
type State = ReturnType<typeof ukState>;
const fill = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
  imageRendering: "pixelated" as const,
};
function Backplate({ name, scale = 1.015 }: { name: string; scale?: number }) {
  return (
    <Img
      src={staticFile(`pixel/uk-scenes/${name}-v1.png`)}
      style={{ ...fill, position: "absolute", transform: `scale(${scale})` }}
    />
  );
}
function Cockpit({ state, portrait }: { state: State; portrait: boolean }) {
  const close = state.view === "runway",
    t = state.visualTime;
  return (
    <AbsoluteFill style={{ background: state.closing ? "#465b6a" : "#b9b29a" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(#8d9f9d,#d8b98b 40%,#172f43 65%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "linear-gradient(#324759,#5b707d 45%,#162b3e 65%)",
          opacity: state.closing ? 1 - state.loopBlend : 0,
        }}
      />
      <AbsoluteFill
        style={{
          transform: `translateY(${close ? -200 : -290}px) scale(${close ? 1.25 : 1})`,
        }}
      >
        <PixelStage
          portrait={portrait}
          background="transparent"
          transparent
          orthographic={false}
        >
          <SceneryCamera
            view="runway"
            progress={state.vanish}
            zoom={close ? 1.15 : 1}
          />
          <UkLights scenery warmth={state.closing ? state.loopBlend : 1} />
          <Runway progress={state.vanish} time={t} />
        </PixelStage>
      </AbsoluteFill>
      {!close && (
        <>
          <Backplate name="cockpit-frame" scale={1} />
          <PixelStage
            portrait={portrait}
            background="transparent"
            transparent
            orthographic
          >
            <UkCamera />
            <UkLights />
            <Pilot
              time={t}
              alarmed={state.vanish > 0.23 && !state.final}
              animation={state.pilotAnimation}
            />
            <Particles time={t} />
          </PixelStage>
          <div
            style={{
              position: "absolute",
              top: "55.5%",
              right: "24%",
              width: 34,
              height: 20,
              background: "#b75d52",
              opacity: 0.5 + 0.2 * Math.sin(t * 15),
              boxShadow: "0 0 22px #b75d5255",
            }}
          />
        </>
      )}
    </AbsoluteFill>
  );
}
function RealmFlags({
  time,
  compact = false,
}: {
  time: number;
  compact?: boolean;
}) {
  const flags = [
    "ag",
    "au",
    "bs",
    "bz",
    "ca",
    "gd",
    "jm",
    "nz",
    "pg",
    "kn",
    "lc",
    "vc",
    "sb",
    "tv",
  ];
  return (
    <>
      {flags.map((code, i) => (
        <div
          key={code}
          style={{
            position: "absolute",
            left: 102 + (i % 7) * 138,
            top: i < 7 ? 400 : compact ? 520 : 1050,
            width: 95,
            height: 72,
            transform: `perspective(500px) rotateY(${Math.sin(time * 2 + i) * 12}deg) rotate(${Math.sin(time * 1.5 + i) * 2}deg)`,
            border: "5px solid #344a59",
            boxShadow: "5px 8px 0 #10243370",
            filter: "saturate(.32) brightness(.85)",
          }}
        >
          <Img
            src={staticFile(`pixel/realm-flags/${code}.svg`)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ))}
    </>
  );
}
function Subjects({
  state,
  gifMiko = false,
}: {
  state: State;
  gifMiko?: boolean;
}) {
  switch (state.view) {
    case "coast":
      return gifMiko ? null : (
        <Pilot time={state.visualTime} standing alarmed />
      );
    case "network":
    case "network-close":
      return (
        <TradeNetwork
          progress={Math.min(1, Math.max(0, (state.sceneTime - 4) / 5.7))}
        />
      );
    case "throne":
    case "crown":
      return <Crown progress={state.sceneTime / 4.16} />;
    default:
      return null;
  }
}
const setSettings: Partial<
  Record<
    State["view"],
    {
      background: string;
      zoom: number;
      scale: number;
      network?: boolean;
      flags?: boolean;
    }
  >
> = {
  coast: { background: "calais", zoom: 1, scale: 1.015 },
  train: { background: "tunnel", zoom: 1, scale: 1.015 },
  rails: { background: "tunnel", zoom: 1.12, scale: 1.1 },
  coin: { background: "trading", zoom: 1, scale: 1.015 },
  "coin-break": { background: "trading", zoom: 1, scale: 1.015 },
  network: { background: "trading", zoom: 1, scale: 1.015, network: true },
  "network-close": {
    background: "trading",
    zoom: 1.12,
    scale: 1.015,
    network: true,
  },
  throne: { background: "throne", zoom: 1, scale: 1.015, flags: true },
  crown: { background: "throne", zoom: 1.12, scale: 1.04, flags: true },
};
function StoryProps({ state }: { state: State }) {
  if (state.view === "throne" || state.view === "crown")
    return (
      <Img
        src={staticFile("pixel/uk-scenes/crown-v1.png")}
        style={{
          position: "absolute",
          left: 380,
          top: 610,
          width: 320,
          height: 320,
          imageRendering: "pixelated",
          opacity: 1 - smooth((state.sceneTime / 4.16 - 0.35) / 0.45),
        }}
      />
    );
  if (state.view === "train")
    return <TrainIllustration time={state.sceneTime} />;
  if (state.view === "coin" || state.view === "coin-break")
    return (
      <CoinIllustration
        breaking={state.view === "coin-break"}
        progress={state.progress}
      />
    );
  return null;
}
function WorldScene({
  state,
  portrait,
  episode,
}: {
  state: State;
  portrait: boolean;
  episode: Episode;
}) {
  const settings = setSettings[state.view];
  if (!settings) throw new Error("Missing UK scene settings: " + state.view);
  const pan =
    state.shot.cut === "whip" ? (1 - smooth(state.local / 0.18)) * 120 : 0;
  const gifCue = episode.ukEdit?.mikoGifs?.find(
    (cue) => cue.view === state.view,
  );
  return (
    <AbsoluteFill style={{ transform: "translateX(" + pan + "px)" }}>
      <Backplate name={settings.background} scale={settings.scale} />
      {settings.network && <AbsoluteFill style={{ background: "#172e46ee" }} />}
      {gifCue && <StoryProps state={state} />}
      <PixelStage
        portrait={portrait}
        background="transparent"
        transparent
        orthographic
      >
        <UkCamera zoom={settings.zoom} />
        <UkLights cold />
        <Subjects state={state} gifMiko={Boolean(gifCue)} />
        {gifCue && (
          <UkGifMiko cue={gifCue} local={state.local} time={state.visualTime} />
        )}
        <Particles time={state.visualTime} mist />
      </PixelStage>
      {!gifCue && <StoryProps state={state} />}
      {settings.flags && (
        <RealmFlags time={state.visualTime} compact={Boolean(gifCue)} />
      )}
    </AbsoluteFill>
  );
}
function VisualSet({
  state,
  portrait,
  episode,
}: {
  state: State;
  portrait: boolean;
  episode: Episode;
}) {
  if (["cockpit", "runway", "closer"].includes(state.view))
    return <Cockpit state={state} portrait={portrait} />;
  if (state.view === "sea")
    return (
      <AbsoluteFill>
        <Backplate name="sea" scale={1.02 + state.progress * 0.01} />
      </AbsoluteFill>
    );
  if (state.view === "ireland")
    return (
      <AbsoluteFill style={{ background: "#152c40" }}>
        <PixelStage portrait={portrait} background="#152c40" orthographic>
          <SceneryCamera view="ireland" progress={state.progress} />
          <UkLights scenery cold />
          <IrelandMap
            progress={0.15 + state.progress * 0.95}
            time={state.visualTime}
          />
          <Particles time={state.visualTime} mist />
        </PixelStage>
      </AbsoluteFill>
    );
  return <WorldScene state={state} portrait={portrait} episode={episode} />;
}
function Transition({ state }: { state: State }) {
  const { shot, local } = state;
  if (local > 0.18 || shot.cut === "quiet" || shot.start === 0) return null;
  const p = smooth(local / 0.18);
  if (shot.cut === "blocks")
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (i % 6) * 190 - 30,
              top:
                Math.floor(i / 6) * 410 -
                (p * 1.8 + ((i * 7) % 5) * 0.06) * 2600,
              width: 205,
              height: 440,
              background: i % 2 ? "#425b61" : "#718071",
              border: "5px solid #243c4b",
            }}
          />
        ))}
      </AbsoluteFill>
    );
  if (shot.cut === "whip")
    return (
      <AbsoluteFill
        style={{
          background: "#52666a",
          opacity: Math.sin(p * Math.PI) * 0.16,
          pointerEvents: "none",
        }}
      />
    );
  return null;
}
export function UkWorld({
  episode,
  portrait,
}: {
  episode: Episode;
  portrait: boolean;
}) {
  const { fps } = useVideoConfig(),
    time = useCurrentFrame() / fps,
    state = ukState(episode, time);
  return (
    <AbsoluteFill style={{ background: "#152a3e", overflow: "hidden" }}>
      <VisualSet state={state} portrait={portrait} episode={episode} />
      <Transition state={state} />
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 150px 20px #11283b45",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}
