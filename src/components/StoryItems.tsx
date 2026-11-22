import { Img, staticFile, useVideoConfig } from "remotion";
import type { Episode } from "../engine/schema";
import { smooth } from "../pixel/timeline";

/** Narration-aligned illustrations stay separate from physical period props. */
export function StoryItems({
  episode,
  time,
}: {
  episode: Episode;
  time: number;
}) {
  const { width, height } = useVideoConfig();
  return (
    <>
      {(episode.storyItems ?? []).map((item) => {
        const local = time - item.start;
        if (local < 0 || local >= item.duration) return null;
        const enter = smooth(local / 0.14);
        const leave = smooth((item.duration - local) / 0.14);
        const size = (width * item.size) / 100;
        return (
          <div
            key={`${item.file}-${item.start}`}
            style={{
              position: "absolute",
              left: (width * item.x) / 100,
              top: (height * item.y) / 100,
              width: size,
              height: size,
              pointerEvents: "none",
              opacity: enter * leave,
              transform: `translate(-50%, -50%) scale(${0.86 + enter * 0.14})`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "5%",
                borderRadius: "50%",
                background: "#263b49cb",
                border: "5px solid #6b7a78",
              }}
            />
            <Img
              src={staticFile(item.file)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                imageRendering: "pixelated",
              }}
            />
            {item.unavailable && (
              <div
                style={{
                  position: "absolute",
                  width: "95%",
                  height: 12,
                  left: "2.5%",
                  top: "48%",
                  background: "#b7615b",
                  boxShadow: "0 3px 0 #273442",
                  transform: "rotate(-45deg)",
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
