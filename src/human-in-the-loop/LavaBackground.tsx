import { OffthreadVideo, staticFile } from "remotion";
import background from "../../episodes/human-in-the-loop/background-v2.json";

export function LavaBackground({ className }: { className: string }) {
  return (
    <OffthreadVideo
      src={staticFile(background.video)}
      className={className}
      style={{ objectFit: "cover" }}
      muted
      pauseWhenBuffering
    />
  );
}
