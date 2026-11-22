import {
  AbsoluteFill,
  Audio,
  Img,
  staticFile,
  useCurrentFrame,
} from "remotion";
import plan from "../../episodes/alex-astro-the-final-round/plan.json";
import captions from "../../episodes/alex-astro-the-final-round/captions.json";
import { Checkout } from "./Checkout";
import { Interview, TableDetail } from "./Interview";
import { assetRoot, progress, timeline } from "./timing";
import "./film.css";

function SpokenCaption({ frame }: { frame: number }) {
  const clock = (frame * 1000) / timeline.fps;
  const i = captions.findIndex(
    (c) => clock >= c.startMs - 8 && clock < c.endMs,
  );
  if (i < 0) return null;
  const spec = plan.lines[i];
  const line = timeline.lines[i];
  let offset = 0;
  return (
    <div className="fr-caption" aria-label={line.text}>
      {spec.rows.map((count, row) => {
        const first = offset;
        offset += count;
        return (
          <div className="fr-caption-row" key={row}>
            {line.words.slice(first, offset).map((w, j) => {
              const index = first + j;
              const onset = Math.round(w.start * timeline.fps);
              const isAccent = spec.accent.includes(index);
              return (
                <span
                  key={index}
                  className={isAccent ? "fr-em" : ""}
                  style={{
                    marginRight: j < count - 1 ? ".18em" : 0,
                    visibility: frame >= onset ? "visible" : "hidden",
                    transform: `translateY(${(1 - progress(frame, onset, 5)) * 5}px)`,
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function FinalRoundFilm({
  showCaptions,
  audioEnabled,
}: {
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill className="fr-film">
      <Img
        src={staticFile(assetRoot + "/art/paper.jpg")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      <div className="fr-wall" />
      <Checkout frame={frame} />
      <TableDetail frame={frame} />
      <Interview frame={frame} />
      {showCaptions && <SpokenCaption frame={frame} />}
      {audioEnabled && <Audio src={staticFile(assetRoot + "/mix.wav")} />}
    </AbsoluteFill>
  );
}
