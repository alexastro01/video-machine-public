import { Img, staticFile } from "remotion";
import portraits from "../../episodes/astra-born-yesterday/assets/portraits.json";
import mouth from "../../episodes/make-no-mistakes/mouth.json";
import tracks from "../../episodes/make-no-mistakes/pose-timing.json";
import turn from "../../episodes/make-no-mistakes/assets/body-turn.json";
import { e, ease, mix, progress, stages } from "./timing";

const oldArt = (name: string) =>
  staticFile(`episodes/astra-born-yesterday/portraits/${name}.webp`);
const newArt = (name: string) =>
  staticFile(`episodes/make-no-mistakes/mature/${name}.webp`);
const adjusted: Record<string, string> = {
  point: "snap",
  cover: "doubt",
};
const landmarks = new Map(portraits.map((pose) => [pose.id, pose]));
const plates = ["rest", "small", "mid"] as const;

export function MatureAstra({
  frame,
  playback,
  short,
}: {
  frame: number;
  playback: number;
  short: boolean;
}) {
  const track = short ? tracks.short : tracks.full;
  const cue = track.filter((p) => playback >= p.at).at(-1) ?? track[0];
  const local = playback - cue.at;
  const id = cue.pose;
  const turned = id === "turn-away" || id === "puff";
  const source = adjusted[id] ?? id;
  const pose = turned ? turn : landmarks.get(source)!;
  const [eyeX, eyeY] = pose.eyes;
  const [patchX, patchY, patchWidth] = pose.rest;
  const size = 1005;
  const settling = Math.sin(Math.PI * progress(local, 0, 16));
  const nod = id === "proud" ? Math.sin(Math.PI * progress(local, 7, 30)) : 0;
  const speaking = mouth[Math.floor(frame / 2) * 2] ?? 0;
  const puffAmount = id === "puff" ? ease(frame, e.puff, 9) : 0;
  const key = turned
    ? turn.keys.filter((key) => local >= key.at).at(-1)!.cel
    : undefined;
  const base = key ? newArt(key) : adjusted[id] ? newArt(id) : oldArt(id);
  const plate = turned
    ? key === "turn-away" && speaking > 0
      ? newArt("turn-mouth-" + ["small", "mid", "open"][speaking - 1])
      : undefined
    : speaking < 3 && id !== "cover"
      ? oldArt(source + "-" + plates[speaking])
      : undefined;
  return (
    <div className="mn-mature-stage">
      <div
        className="mn-mature"
        style={{
          width: size,
          height: size,
          left:
            540 - (((eyeX - 512) * size) / 1024) * 0.71 +
            (turned ? ease(local, 0, 17) * 7 : 0),
          top:
            285 -
            (eyeY * size) / 1024 +
            Math.sin(frame / 43) * 1.8 +
            nod * 10 -
            settling * 3,
          transform: `translateX(-50%) rotate(${(id === "defense" ? -0.55 : 0.35) * settling + 1.4 * nod}deg)`,
        }}
      >
        <Img className="mn-cel" src={base} />
        {plate && (
          <Img
            src={plate}
            style={{
              position: "absolute",
              left: `${(patchX / 1024) * 100}%`,
              top: `${(patchY / 1024) * 100}%`,
              width: `${(patchWidth / 1024) * 100}%`,
              height: `${(patchWidth / 1024) * 100}%`,
            }}
          />
        )}
        {id === "puff" && (
          <Img
            className="mn-cel"
            src={newArt("puff")}
            style={{ opacity: puffAmount }}
          />
        )}
      </div>
    </div>
  );
}

export function AvatarMorph({ frame }: { frame: number }) {
  const start = stages.front - 38;
  if (frame < e.teaser - 8 || frame > stages.front + 35) return null;
  const cell = Math.max(0, Math.min(24, frame - start));
  const travel = ease(frame, stages.front - 7, 31);
  const size = mix(167, 78, travel);
  return (
    <div
      className="mn-avatar-morph"
      style={{
        left: mix(830, 912, travel),
        top: mix(718, 254, travel),
        width: size,
        height: size,
        opacity:
          Math.min(1, Math.max(0, (frame - e.teaser + 8) / 7)) *
          (1 - ease(frame, stages.front + 23, 12)),
      }}
    >
      <Img
        src={newArt("logo-avatar-morph")}
        style={{
          position: "absolute",
          width: "500%",
          height: "500%",
          maxWidth: "none",
          left: `${-(cell % 5) * 100}%`,
          top: `${-Math.floor(cell / 5) * 100}%`,
        }}
      />
    </div>
  );
}
