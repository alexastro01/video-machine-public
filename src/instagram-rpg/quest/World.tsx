import { Fragment } from "react";
import {
  Art,
  Feet,
  Shadow,
  gold,
  ink,
  mix,
  out,
  pix,
  pos,
  pulse,
  smooth,
  snap,
  unit,
  type ArtName,
  type Role,
} from "../art";
import { actor, c, center, edit, roads, visible } from "./staging";

const plates: { name: ArtName; at: number }[] = [
  { name: "avenue", at: 0 },
  { name: "junction", at: c.feed - 10 },
  { name: "clock-court", at: c.gate1 },
  { name: "heart-court", at: c.gate2 },
  { name: "portal-court", at: c.gate3 },
];
export function Road({ f }: { f: number }) {
  return (
    <div
      style={{
        ...pos(0, 0, 270, 480),
        background: "#3b514b",
        overflow: "hidden",
      }}
    >
      {plates.map((p, i) => {
        const next = plates[i + 1]?.at ?? edit.frames + 60;
        if (f < p.at - 31 || f > next + 19) return null;
        const inside = i === 0 ? 1 : smooth(f, p.at - 30, p.at + 16);
        const follow = smooth(f, p.at, next);
        const y =
          -42 +
          15 * follow +
          15 * smooth(f, next - 29, next + 18) -
          14 * (1 - inside);
        return (
          <Art
            key={p.name}
            name={p.name}
            x={-45}
            y={snap(y)}
            w={360}
            h={540}
            style={{ opacity: inside }}
          />
        );
      })}
      <div
        style={{
          ...pos(0, 0, 270, 480),
          background:
            "linear-gradient(90deg,rgba(18,34,33,.12),transparent 24%,transparent 76%,rgba(18,34,33,.12))",
        }}
      />
    </div>
  );
}
export function Party({ f }: { f: number }) {
  const roles: Role[] = ["alex", "opus", "astra", "gemini"];
  return (
    <>
      {roles
        .map((role) => ({ role, ...actor(role, f) }))
        .sort((a, b) => a.y - b.y)
        .map((p) => (
          <Fragment key={p.role}>
            <Shadow x={p.x} y={p.y + 1} w={p.h * 0.43} h={4} alpha={0.26} />
            <Feet
              name={p.pose}
              clipPath={
                p.pose === "alex-quest-toss" && f >= c.sendAction + 4
                  ? "polygon(0 0,57% 0,59% 9%,73% 11%,100% 11%,100% 100%,0 100%)"
                  : undefined
              }
              x={p.x}
              y={p.y - p.hop * 2.1 - p.shift}
              h={p.h}
              transform={`scale(${1 - 0.019 * p.hop},${1 + 0.034 * p.hop})`}
            />
          </Fragment>
        ))}
    </>
  );
}

export function Encounter({ f }: { f: number }) {
  if (f > c.gate1 + 6) return null;
  const split = c.split,
    vanish = out(f, split, split + 11);
  const laugh = pulse(f, c.blame + 3, 32),
    crack = unit(f, c.whole, split);
  const floor = 219,
    size = 92 + 2 * Math.sin(f / 25);
  const hover = 3 * Math.sin(f / 25) + 3 * laugh;
  return (
    <>
      {f < split + 12 && (
        <>
          <Shadow
            x={center}
            y={floor + 2}
            w={49}
            h={7}
            alpha={0.29 * (1 - vanish)}
          />
          <Feet
            name={
              crack > 0.2
                ? "boss-acting-cracked"
                : laugh > 0.12
                  ? "boss-acting-cackle"
                  : "boss-acting-idle"
            }
            x={center + crack * 2 * Math.sin(f * 1.5)}
            y={floor - 3 - hover}
            h={size}
            opacity={1 - vanish}
            transform={`scale(${1 + 0.1 * pulse(f, split - 9, 12) + 0.14 * vanish},${1 - 0.1 * pulse(f, split - 9, 12)})`}
          />
          <div
            style={{
              ...pos(center - 39, 100, 78, 16),
              fontFamily: pix,
              background: ink,
              color: "#fff1ca",
              textAlign: "center",
              fontSize: 12.6,
              lineHeight: "15px",
              fontWeight: 700,
              opacity: (1 - vanish) * smooth(f, -5, 6),
              borderRadius: 2,
            }}
          >
            ALGORITHM
          </div>
          <div
            style={{
              ...pos(center - 27, 117, 54, 3),
              background: "#342b35",
              opacity: 1 - vanish,
              outline: "1px solid #342b35",
            }}
          >
            <div
              style={{
                width: 100 - 29 * crack + "%",
                height: 2,
                background: "#e9827a",
                borderTop: "1px solid #ffd7a1",
              }}
            />
          </div>
        </>
      )}
      {f >= split &&
        roads.map((r, i) => {
          const launched = out(f, split + i, split + 29 + i);
          const running = smooth(
            f,
            split + 22,
            Math.max(split + 52, r.frame + 17),
          );
          const depart = smooth(f, c.road, c.gate1 - 5);
          const x = mix(center + (i - 2) * 16 * launched, r.x, running);
          const y = mix(
            196 + ((i % 2) * 12 - 7) * launched - 18 * pulse(f, split + i, 28),
            r.y + 44,
            running,
          );
          const alpha = unit(f, split + i, split + i + 4) * (1 - depart);
          const h =
            (24 + 3 * (r.key === "reels" ? 1 : 0)) * (0.45 + 0.55 * launched);
          return (
            <Fragment key={r.key}>
              <Shadow x={x} y={y} w={h * 0.72} alpha={alpha * 0.22} />
              <Feet
                name={`monsters-${r.key}`}
                x={x}
                y={y - 1.7 * Math.abs(Math.sin((f + i * 8) / 7))}
                h={h}
                opacity={alpha}
              />
            </Fragment>
          );
        })}
      {f >= split &&
        f < split + 26 &&
        Array.from({ length: 9 }, (_, i) => {
          const p = out(f, split, split + 25),
            a = (Math.PI * 2 * i) / 9;
          return (
            <Feet
              key={i}
              name={i % 3 ? "props-poof" : "props-spark"}
              x={center + Math.cos(a) * 28 * p}
              y={192 + Math.sin(a) * 22 * p}
              h={4 + 15 * (1 - p)}
              opacity={1 - p}
            />
          );
        })}
      {roads.map((r) => {
        const keep = r.key === "reels" ? c.gate1 - 7 : c.your + 4;
        const alpha =
          visible(f, r.frame + 2, keep, 9) * (r.key === "search" ? 0.67 : 1);
        if (alpha <= 0) return null;
        const width = r.label.length > 5 ? 48 : r.label.length > 4 ? 39 : 30;
        return (
          <div
            key={r.key}
            style={{
              ...pos(r.x - width / 2, r.y, width, 15),
              opacity: alpha,
              fontFamily: pix,
              fontSize: 10.5,
              lineHeight: "14px",
              fontWeight: 700,
              textAlign: "center",
              color: r.key === "reels" ? gold : "#fff3da",
              background: ink,
              border: "1px solid #b79355",
              boxSizing: "border-box",
              transform: `translateY(${-1.8 * pulse(f, r.frame, 16)}px)`,
            }}
          >
            {r.label}
          </div>
        );
      })}
      {f >= c.your &&
        f < c.gate1 &&
        [0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              ...pos(center - 2, 199 - i * 14, 5, 4),
              background: gold,
              opacity: visible(f, c.your + 5 * i, c.gate1 - 10, 8) * 0.85,
              clipPath:
                "polygon(0 95%,0 60%,45% 0,60% 0,100% 60%,100% 95%,50% 53%)",
            }}
          />
        ))}
    </>
  );
}
