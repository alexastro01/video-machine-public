// Adapted from Remocn's MIT-licensed SimulatedCursor. See ./LICENSE.
// A waypoint's frame is the instant the tip lands. The dragged picture samples this same path.
import { Easing, interpolate, spring } from "remotion";

export type Waypoint = {
  frame: number;
  x: number;
  y: number;
  arc?: number;
  click?: boolean;
};
const ease = Easing.bezier(0.34, 0.05, 0.22, 1);
export function cursorPosition(frame: number, points: readonly Waypoint[]) {
  const next = points.findIndex((p) => p.frame > frame);
  if (next < 0) return points[points.length - 1];
  if (next === 0) return points[0];
  const from = points[next - 1],
    to = points[next];
  const p = ease((frame - from.frame) / (to.frame - from.frame));
  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y + (to.y - from.y) * p - Math.sin(Math.PI * p) * (to.arc ?? 0),
  };
}

export function SimulatedCursor({
  frame,
  fps,
  points,
  opacity,
  down = false,
}: {
  frame: number;
  fps: number;
  points: readonly Waypoint[];
  opacity: number;
  down?: boolean;
}) {
  if (opacity <= 0) return null;
  const { x, y } = cursorPosition(frame, points);
  const contact = [...points]
    .reverse()
    .find((p) => p.click && frame >= p.frame);
  const age = contact ? frame - contact.frame : Infinity;
  const p = Math.min(1, age / 23);
  const dip = Number.isFinite(age)
    ? spring({
        frame: age,
        fps,
        config: { damping: 10, stiffness: 200, mass: 0.6 },
        durationInFrames: 14,
      })
    : 0;
  const scale = down ? 0.84 : 1 - 0.19 * dip * (1 - p);
  const size = 68;
  return (
    <div
      style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity }}
    >
      {contact && p < 1 && (
        <svg
          width="130"
          height="130"
          style={{
            position: "absolute",
            left: contact.x - 65,
            top: contact.y - 65,
          }}
        >
          <circle
            cx="65"
            cy="65"
            r={interpolate(p, [0, 1], [6, 47])}
            fill="none"
            stroke="#3860b1"
            strokeWidth={5 - 2 * p}
            opacity={0.8 * (1 - p)}
          />
        </svg>
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: x - (size * 5) / 24,
          top: y - (size * 3) / 24,
          transform: `scale(${scale})`,
          transformOrigin: "20.833% 12.5%",
          filter: "drop-shadow(0 3px 2px #20293850)",
        }}
      >
        <path
          d="M5 3L5 19L9.5 14.5L12.5 21L15 20L12 13.5L18.5 13.5L5 3Z"
          fill="#26344b"
          stroke="white"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
