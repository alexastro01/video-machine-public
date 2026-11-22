import { Audio } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Episode } from "../engine/schema";
import { LavaBackground } from "../human-in-the-loop/LavaBackground";
import { BuildCaption, BuildCast } from "./BuildCast";
import { BuildScreen, DraftWindow } from "./LaptopUI";
import { IndustryDesk, PublishedPost, RoughCut } from "./IndustryDesk";
import { plan, smooth } from "./buildMotion";
import "./build.css";
import "./industry.css";

loadFont({
  family: "Rip Inter",
  url: staticFile("episodes/ai-review-loop/fonts/InterVariable.woff2"),
  weight: "100 900",
});

export function RipFilm({
  episode,
  showCaptions,
  audioEnabled,
}: {
  episode: Episode;
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const scene = episode.scenes.find(
    (s) =>
      f >= Math.round(s.start * 60) &&
      f < Math.round((s.start + s.duration) * 60),
  );
  const sector = plan.industries.find((s) => scene?.id === s.id);
  const draft = f >= plan.cues.draft && f < plan.cues.failed;
  const openDraft = smooth(f, plan.cues.draft, plan.cues.draft + 9);
  return (
    <AbsoluteFill style={{ background: "#19191a", overflow: "hidden" }}>
      <div
        className="bf-film"
        style={{
          transform: `translate(-50%,-50%) scale(${Math.min(width / 1080, height / 1920)})`,
        }}
      >
        <LavaBackground className="bf-lava" />
        {sector && <IndustryDesk f={f} sector={sector} />}
        {scene?.id === "post" && <PublishedPost f={f} />}
        {scene?.id === "playback" && <RoughCut f={f} />}
        {draft && (
          <div
            className="bf-ui-layer"
            style={{
              opacity: openDraft,
              transform: `translateY(${(1 - openDraft) * 14}px)`,
            }}
          >
            <DraftWindow f={f} />
          </div>
        )}
        {f >= plan.cues.failed && <BuildScreen f={f} />}
        <BuildCast f={f} />
        {showCaptions && <BuildCaption f={f} />}
      </div>
      {audioEnabled && <Audio src={staticFile("episodes/rip/mix.wav")} />}
    </AbsoluteFill>
  );
}
