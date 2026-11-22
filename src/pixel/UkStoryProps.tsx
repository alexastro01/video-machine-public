import { Img, staticFile } from "remotion";
import { smooth } from "./timeline";
export function TrainIllustration({ time }: { time: number }) {
  const move = smooth(time / 2.5),
    shake = time > 2.3 && time < 2.8 ? Math.sin(time * 70) * 6 : 0;
  return (
    <Img
      src={staticFile("pixel/uk-scenes/train-v1.png")}
      style={{
        position: "absolute",
        width: 860,
        height: 860,
        objectFit: "contain",
        left: 110 + move * 38 + shake,
        top: 570 + move * 65,
        imageRendering: "pixelated",
        transform: `scale(${0.88 + move * 0.12})`,
        filter: "drop-shadow(8px 16px 5px #10273870)",
      }}
    />
  );
}
export function CoinIllustration({
  breaking,
  progress,
}: {
  breaking: boolean;
  progress: number;
}) {
  const size = 660,
    cell = size / 8;
  return (
    <div
      style={{
        position: "absolute",
        left: 210,
        top: 450,
        width: size,
        height: size,
        transform: `scale(${breaking ? 1 : 1 + progress * 0.045})`,
        filter: "drop-shadow(8px 12px 5px #10273860)",
      }}
    >
      {Array.from({ length: 64 }, (_, i) => {
        const x = i % 8,
          y = Math.floor(i / 8),
          seed = ((i * 37) % 101) / 101,
          f = breaking ? smooth((progress - seed * 0.25) / 0.7) : 0;
        return (
          <div
            key={`coin-${x}-${y}`}
            style={{
              position: "absolute",
              width: cell + 0.5,
              height: cell + 0.5,
              left: x * cell,
              top: y * cell,
              overflow: "hidden",
              opacity: 1 - smooth((f - 0.65) / 0.35),
              transform: `translate(${(x < 4 ? -1 : 1) * f * (20 + seed * 60)}px,${f * f * (180 + seed * 160)}px) rotate(${f * (x < 4 ? -8 : 8)}deg)`,
            }}
          >
            <Img
              src={staticFile("pixel/uk-scenes/coin-v1.png")}
              style={{
                position: "absolute",
                left: -x * cell,
                top: -y * cell,
                width: size,
                height: size,
                imageRendering: "pixelated",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
