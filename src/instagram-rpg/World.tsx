import { Fragment } from "react";
import {
  Art,
  cue,
  Feet,
  gold,
  ink,
  mix,
  out,
  pix,
  pos,
  pulse,
  Shadow,
  smooth,
  snap,
  timing,
  unit,
  wordAt,
  type ArtName,
  type Role,
  type Route,
} from "./art";

export function cameraY(f: number) {
  return (
    400 -
    5 * smooth(f, 0, cue.wrong) -
    19 * smooth(f, cue.wrong, cue.one + 10) -
    322 * smooth(f, cue.one + 26, cue.stories + 15) -
    22 * smooth(f, cue.feed + 10, cue.reels + 4) -
    18 * smooth(f, cue.your, timing.frames + 5)
  );
}
export const paths: {
  route: Route;
  label: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  key: number;
  tint: string;
}[] = [
  {
    route: "feed",
    label: "FEED",
    x: 37,
    y: 249,
    sx: 30,
    sy: 299,
    key: cue.feed,
    tint: "#ff9c5f",
  },
  {
    route: "stories",
    label: "STORIES",
    x: 47,
    y: 142,
    sx: 47,
    sy: 190,
    key: cue.stories,
    tint: "#ff8586",
  },
  {
    route: "reels",
    label: "REELS",
    x: 130,
    y: 98,
    sx: 130,
    sy: 148,
    key: cue.reels,
    tint: "#ffdc67",
  },
  {
    route: "explore",
    label: "EXPLORE",
    x: 197,
    y: 132,
    sx: 197,
    sy: 181,
    key: cue.explore,
    tint: "#84e8cc",
  },
  {
    route: "search",
    label: "Search…",
    x: 210,
    y: 239,
    sx: 210,
    sy: 288,
    key: cue.reels + 18,
    tint: "#c4cabb",
  },
];

export function Terrain({ f }: { f: number }) {
  const y = cameraY(f);
  return (
    <div
      style={{
        ...pos(0, 0, 270, 480),
        overflow: "hidden",
        background: "#174944",
      }}
    >
      <Art name="road" x={-26} y={snap(389 - y)} w={320} />
      <Art
        name="crossroads"
        x={-26}
        y={snap(-y)}
        w={320}
        style={{
          maskImage: "linear-gradient(black 0%,black 84%,transparent 100%)",
        }}
      />
      <div
        style={{
          ...pos(0, 0, 270, 480),
          background:
            "linear-gradient(90deg,rgba(9,24,38,.17),transparent 30%,transparent 78%,rgba(9,24,38,.16))",
        }}
      />
      <Art
        name="gates-hourglass-closed"
        x={111}
        y={snap(42 - y)}
        h={36}
        style={{ opacity: 0.89 }}
      />
      {Array.from({ length: 11 }, (_, i) => {
        const t = (f + 18 * i) % 124;
        const x = [24, 222, 69, 250, 18, 206, 53, 234, 36, 253, 66][i];
        const wy = 96 + i * 64;
        const sy = wy - y;
        return (
          <div
            key={i}
            style={{
              ...pos(x, snap(sy), t < 45 ? 3 : 1, 1),
              background: i % 3 === 0 ? "#ffe8a2" : "#aff3cc",
              opacity: 0.6 * pulse(t, 0, 89),
            }}
          />
        );
      })}
    </div>
  );
}

const cameraBoss = (f: number, portraits: boolean) => {
  const pan = 400 - cameraY(f);
  return {
    x: 128 + 2 * Math.sin(f / 46),
    y: (portraits ? 209 : 231) + pan * 0.13,
  };
};
export function Monsters({ f, portraits }: { f: number; portraits: boolean }) {
  const c = cue.split;
  const boss = cameraBoss(f, portraits);
  const dead = out(f, c + 1, c + 13);
  const tremble = unit(f, cue.whole, c);
  const laugh = pulse(f, cue.algorithm + 3, 32);
  const h = (portraits ? 84 : 98) + 3 * Math.sin(f / 18) + 3 * laugh;
  const crouch = pulse(f, c - 11, 13);
  const cracked = f >= cue.whole;
  const name = cracked
    ? "boss-acting-cracked"
    : laugh > 0.12
      ? "boss-acting-cackle"
      : "boss-acting-idle";
  const bossX = boss.x + 3 * tremble * Math.sin(f * 1.4);
  const shake = pulse(f, c, 21);
  const start = cameraBoss(c, portraits);
  const launchY = start.y - 28;
  const hpWidth =
    58 *
    (1 - 0.12 * pulse(f, cue.algorithm, 26) - 0.17 * unit(f, cue.whole, c + 5));
  return (
    <>
      {f < c + 14 && (
        <>
          <Shadow
            x={boss.x}
            y={boss.y}
            w={43}
            h={9}
            alpha={0.32 * (1 - dead)}
          />
          <Feet
            name={name}
            x={bossX}
            y={boss.y - 4 - laugh * 3}
            h={h}
            opacity={1 - dead}
            transform={`scale(${1 + 0.12 * crouch + 0.28 * dead},${1 - 0.17 * crouch + 0.12 * dead}) rotate(${-2 * laugh}deg)`}
          />
          <div style={{ ...pos(0, 0, 270, 480), opacity: 1 - dead }}>
            <div
              style={{
                ...pos(snap(boss.x - 39), snap(boss.y - h - 30), 78, 13),
                background: ink,
                color: "#fff4cd",
                fontFamily: pix,
                fontSize: 11.8,
                lineHeight: "13px",
                fontWeight: 700,
                letterSpacing: 0.35,
                textAlign: "center",
                clipPath:
                  "polygon(4% 0,96% 0,100% 25%,100% 78%,96% 100%,4% 100%,0 78%,0 25%)",
              }}
            >
              ALGORITHM
            </div>
            <Art
              name="hud-health-frame"
              x={snap(boss.x - 34)}
              y={snap(boss.y - h - 16)}
              w={68}
              h={8}
            />
            <div
              style={{
                ...pos(snap(boss.x - 29), snap(boss.y - h - 14), hpWidth, 3),
                background: cracked ? "#f8a654" : "#e35264",
                borderTop: "1px solid #ffa890",
              }}
            />
          </div>
        </>
      )}
      {f >= c &&
        paths.map(({ route, x, y, sx, sy, key }, i) => {
          const progress = smooth(f, c + i * 2, c + 37 + i * 2);
          const settle = smooth(f, c + 32 + i * 2, key + 29);
          const destinations = [
            [-48, 11],
            [-23, -13],
            [0, -27],
            [27, -13],
            [45, 11],
          ];
          const dx = destinations[i][0],
            dy = destinations[i][1];
          const lift = 18 * Math.sin(Math.PI * progress);
          const endX = mix(x, sx, smooth(f, key + 12, key + 41));
          const endY =
            mix(y + 28, sy, smooth(f, key + 12, key + 41)) - cameraY(f);
          const cx = mix(start.x + dx * progress, endX, settle);
          const cy = mix(launchY + dy * progress - lift, endY, settle);
          const jogging =
            2.1 * Math.abs(Math.sin((f + i * 7) / 5)) * (1 - 0.65 * settle);
          const size = mix(12, 29, progress) * (route === "reels" ? 1.1 : 1);
          const alpha = route === "search" ? 0.8 : 1;
          return (
            <Fragment key={route}>
              <Shadow
                x={cx}
                y={cy + 1}
                w={size * 0.75}
                h={4}
                alpha={0.21 * progress}
              />
              <Feet
                name={`monsters-${route}`}
                x={cx}
                y={cy - jogging}
                h={size}
                opacity={alpha * unit(f, c + i * 2, c + 5 + i * 2)}
                transform={`rotate(${(i - 2) * 7 * (1 - progress)}deg)`}
              />
            </Fragment>
          );
        })}
      {f >= c && f < c + 37 && (
        <>
          {Array.from({ length: 8 }, (_, i) => {
            const a = ((i + 0.15) * Math.PI) / 4,
              p = out(f, c + (i % 3), c + 26 + (i % 3)),
              r = (15 + 6 * (i % 3)) * p;
            return (
              <Feet
                key={i}
                name={i % 3 === 0 ? "props-spark" : "props-poof"}
                x={start.x + Math.cos(a) * r}
                y={launchY + Math.sin(a) * r + 4}
                h={Math.max(1, 17 * (1 - p) + 3)}
                opacity={(1 - unit(f, c + 5, c + 32)) * 0.97}
              />
            );
          })}
          <div
            style={{
              ...pos(start.x - 22, launchY - 22, 44, 44),
              opacity: shake * 0.7,
              border: "1px solid #fff0ba",
              transform: `scale(${0.4 + 2 * shake}) rotate(45deg)`,
            }}
          />
        </>
      )}
    </>
  );
}

export function Signs({ f }: { f: number }) {
  const cam = cameraY(f);
  const reveal = smooth(f, cue.feed - 26, cue.feed + 3);
  return (
    <>
      {paths.map(({ route, label, x, y, key, tint }) => {
        const selected =
          route === "reels" ? smooth(f, cue.reels - 3, cue.reels + 7) : 0;
        const hit = pulse(f, key - 2, 20);
        const opacity =
          reveal * smooth(y - cam, 40, 58) * (route === "search" ? 0.72 : 1);
        const width = label.length > 5 ? 50 : label.length > 4 ? 45 : 36;
        const yy = snap(y - cam);
        return (
          <div
            key={route}
            style={{
              ...pos(x - width / 2, yy, width, 16),
              opacity,
              transform: `translateY(${-2 * hit}px) scale(${1 + 0.1 * hit})`,
              transformOrigin: "50% 100%",
            }}
          >
            <div
              style={{
                ...pos(width / 2 - 2, 8, 3, 11),
                background: "#714f35",
                borderRight: "1px solid #bd9462",
              }}
            />
            <Art name="hud-road-label" x={0} y={0} w={width} h={15} />
            <div
              style={{
                ...pos(1, 1, width - 2, 13),
                fontFamily: pix,
                color: selected > 0.1 ? gold : hit > 0.1 ? tint : "#fff1cd",
                fontSize: label === "EXPLORE" ? 9.5 : 10.4,
                fontWeight: 700,
                letterSpacing: 0.05,
                textAlign: "center",
                lineHeight: "12.5px",
              }}
            >
              {label}
            </div>
            {selected > 0.1 && (
              <div
                style={{
                  ...pos(-4, 6, 5, 4),
                  background: gold,
                  clipPath:
                    "polygon(0 0,40% 0,40% 20%,70% 20%,100% 50%,70% 80%,40% 80%,40% 100%,0 100%)",
                  transform: `translateX(${snap(Math.sin(f / 9))}px)`,
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function RouteLights({ f }: { f: number }) {
  if (f < cue.reels) return null;
  const y = cameraY(f);
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const alpha = unit(f, cue.reels + i * 6, cue.reels + i * 6 + 10);
        const glint = 0.55 + 0.45 * Math.sin(f / 16 - i * 0.7);
        return (
          <div
            key={i}
            style={{
              ...pos(128 + (i % 2), snap(241 - y - i * 15), 5, 3),
              background: "#ffec9a",
              opacity: alpha * (0.45 + 0.4 * glint),
              clipPath:
                "polygon(0 100%,0 65%,40% 0,60% 0,100% 65%,100% 100%,50% 45%)",
            }}
          />
        );
      })}
    </>
  );
}

export function actorAt(role: Role, f: number, portraits: boolean) {
  const move = smooth(f, cue.wrong - 6, cue.wrong + 35);
  const walk = smooth(f, cue.your - 4, cue.road + 12);
  const afterSplit = smooth(f, cue.split + 5, cue.each);
  const word = wordAt(f);
  const active =
    (word < 9 && role === "alex") || (word >= 9 && role === "opus");
  const end = timing.starts[word + 1] ?? timing.frames;
  const wordHop = active
    ? pulse(f, timing.starts[word], Math.min(14, end - timing.starts[word]))
    : 0;
  const compact = portraits ? 1 : 0;
  const actors = {
    alex: { x: 103, y: 328 - compact * 53, h: 62, id: 0 },
    opus: { x: 146, y: 334 - compact * 51, h: 62, id: 1 },
    astra: { x: 72, y: 356 - compact * 68, h: 54, id: 2 },
    gemini: { x: 175, y: 359 - compact * 69, h: 55, id: 3 },
  };
  const a = actors[role];
  const isOpus = role === "opus";
  const crosses = f >= cue.feed - 22 && f < cue.explore + 15;
  const walkPhase =
    f < cue.feed - 22 ? (f - cue.wrong + 5) / 7 : (f - cue.your) / 7.5;
  const stride =
    walk > 0.015 ||
    (crosses && !isOpus) ||
    (isOpus && move > 0.01 && move < 0.99);
  const gait = stride ? Math.sin(walkPhase * Math.PI * 0.5 + a.id * 0.7) : 0;
  const approach = { alex: 4, opus: 0, astra: 15, gemini: -13 };
  const depart = { alex: 10, opus: -1, astra: 13, gemini: -14 };
  const x =
    a.x +
    (isOpus ? -14 * move : 0) +
    approach[role] * afterSplit +
    depart[role] * walk +
    gait * 0.9;
  const advance = isOpus
    ? -28 * move + 10 * afterSplit
    : role === "alex"
      ? 7 * afterSplit
      : 0;
  const y = a.y + advance - walk * (isOpus ? 7 : 9) - Math.abs(gait) * 1.8;
  let pose: "act" | "front" | "side" | "back" | "walk-l" | "walk-r" = "back";
  if (stride) pose = gait > 0 ? "walk-l" : "walk-r";
  else if (isOpus)
    pose =
      f < cue.wrong - 6
        ? "side"
        : f < cue.one + 6
          ? "act"
          : f < cue.whole
            ? "front"
            : f < cue.stories
              ? "act"
              : f < cue.each
                ? "side"
                : "front";
  else if (role === "alex")
    pose = f < cue.wrong ? "act" : f < cue.whole ? "side" : "back";
  else if (role === "astra")
    pose = f < cue.wrong ? "side" : f < cue.family ? "front" : "back";
  else pose = f < cue.wrong ? "front" : f < cue.whole ? "side" : "back";
  return {
    role,
    x,
    y,
    h: a.h - (portraits ? 7 : 0) - 2 * walk,
    pose: `${role}-${pose}` as ArtName,
    wordHop,
    walk: stride,
    gait,
  };
}
export function Party({ f, portraits }: { f: number; portraits: boolean }) {
  const actors = (["alex", "opus", "astra", "gemini"] as const)
    .map((role) => actorAt(role, f, portraits))
    .sort((a, b) => a.y - b.y);
  return (
    <>
      {actors.map((a) => (
        <Fragment key={a.role}>
          <Shadow x={a.x} y={a.y + 1.6} w={a.h * 0.49 - a.wordHop * 2} h={5} />
          <Feet
            name={a.pose}
            x={a.x}
            y={a.y - a.wordHop * 2.7}
            h={a.h}
            transform={`scale(${1 - 0.023 * a.wordHop},${1 + 0.038 * a.wordHop}) rotate(${a.gait * 1.1}deg)`}
          />
        </Fragment>
      ))}
    </>
  );
}
