import type { ReactNode } from "react";
import { interpolateColors } from "remotion";
import type { SceneProps } from "./schema";
import "../components/Typography";

export const C = {
  night: "#141716",
  panel: "#202623",
  line: "#4b564f",
  paper: "#f4eddf",
  ink: "#202821",
  dim: "#9da499",
  clay: "#ed916e",
  light: "#fff6e7",
  green: "#a9e6ae",
  red: "#ff9a83",
  gold: "#efce82",
  deep: "#111b16",
};
export const mono = "Menlo, 'DejaVu Sans Mono', monospace";
export const sans = "'DM Sans', Arial, sans-serif";
export const k = (f: number, at: number, length: number) =>
  Math.min(1, Math.max(0, (f - at) / length));
export const ease = (f: number, at: number, length = 14) =>
  1 - (1 - k(f, at, length)) ** 3;
export const smooth = (f: number, at: number, length: number) => {
  const p = k(f, at, length);
  return p * p * (3 - 2 * p);
};
export const pulse = (f: number, at: number, length = 14) =>
  Math.sin(Math.PI * k(f, at, length));
export const tr = (x: number, y: number, scale = 1, a = 0) =>
  "translate(" + x + " " + y + ") rotate(" + a + ") scale(" + scale + ")";
export const lightLevel = (f: number) =>
  Math.max(
    ease(f, 540, 12) - ease(f, 960, 12),
    ease(f, 1800, 12) - ease(f, 2400, 12),
  );
export const mix = (n: number, a: string, b: string) =>
  interpolateColors(n, [0, 1], [a, b]);
export function T({
  x,
  y,
  children,
  size = 42,
  color = C.light,
  font = sans,
  weight = 600,
  anchor = "start",
  spacing = 0,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
  font?: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={color}
      fontSize={size}
      fontFamily={font}
      fontWeight={weight}
      letterSpacing={spacing}
    >
      {children}
    </text>
  );
}
export function Star({
  x = 0,
  y = 0,
  size = 40,
  color = C.clay,
}: {
  x?: number;
  y?: number;
  size?: number;
  color?: string;
}) {
  return (
    <g transform={tr(x, y, size / 43)} fill={color}>
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          transform={"rotate(" + (i * 30 + (i % 2 ? 2 : -2)) + ")"}
          d={"M-4 4 L-5 " + (-34 - (i % 3) * 4) + " L3 -42 L4 2Z"}
        />
      ))}
    </g>
  );
}
export function Glyph({
  kind,
  x,
  y,
  size = 42,
  color = C.clay,
}: {
  kind:
    | "term"
    | "file"
    | "find"
    | "check"
    | "cross"
    | "lock"
    | "loop"
    | "note"
    | "send";
  x: number;
  y: number;
  size?: number;
  color?: string;
}) {
  const paths = {
    term: "M-17 -12L-4 0l-13 12m21 0h14",
    file: "M-13 -19h17l10 10v28h-27zM4 -18v10h9M-7 1h14M-7 8h11",
    find: "M8 7l13 13M11 -4a14 14 0 1 1-28 0 14 14 0 1 1 28 0",
    check: "M-16 0l10 11 22-25",
    cross: "M-12 -12l24 24m0-24-24 24",
    lock: "M-13 -2h26v21h-26zM-8 -4v-7a8 8 0 0 1 16 0v7M0 5v6",
    loop: "M-16 -5a17 17 0 0 1 30-5l4 7m-1-12 2 13-12-3M16 5a17 17 0 0 1-30 5l-4-7m1 12-2-13 12 3",
    note: "M-14 -18h28v26l-11 11h-17zM3 18V8h10M-8 -8h16M-8 0h12",
    send: "M-20 -3l40-15-12 37-10-14-18-8zM-2 5l20-21",
  };
  return (
    <path
      d={paths[kind]}
      transform={tr(x, y, size / 42)}
      fill="none"
      stroke={color}
      strokeWidth="3.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
export function Definitions() {
  return (
    <defs>
      <linearGradient id="lidMetal" x2=".18" y2="1">
        <stop stopColor="#ffe0b4" />
        <stop offset=".45" stopColor="#f9ab82" />
        <stop offset="1" stopColor="#d37854" />
      </linearGradient>
      <linearGradient id="pcb" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#5a6d5a" />
        <stop offset=".55" stopColor="#34473b" />
        <stop offset="1" stopColor="#25382e" />
      </linearGradient>
      <linearGradient id="paperStock" x2=".8" y2="1">
        <stop stopColor="#fff9e9" />
        <stop offset="1" stopColor="#ddd1b7" />
      </linearGradient>
      <pattern
        id="darkGrid"
        width="54"
        height="54"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M54 0H0v54"
          fill="none"
          stroke="#9eac9b"
          strokeOpacity=".105"
          strokeWidth="1.3"
        />
      </pattern>
      <pattern
        id="lightGrid"
        width="54"
        height="54"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M54 0H0v54"
          fill="none"
          stroke="#787c68"
          strokeOpacity=".15"
          strokeWidth="1.1"
        />
      </pattern>
      <radialGradient id="darkBG">
        <stop stopColor="#2f3831" />
        <stop offset=".75" stopColor="#1d231f" />
        <stop offset="1" stopColor="#121614" />
      </radialGradient>
      <radialGradient id="lightBG">
        <stop stopColor="#fffaf0" />
        <stop offset="1" stopColor="#e9e2d2" />
      </radialGradient>
    </defs>
  );
}
export function Backdrop({ f }: { f: number }) {
  const light = lightLevel(f);
  return (
    <g>
      <rect width="1080" height="1920" fill="url(#darkBG)" />
      <rect width="1080" height="1920" fill="url(#darkGrid)" />
      <g opacity={light}>
        <rect width="1080" height="1920" fill="url(#lightBG)" />
        <rect width="1080" height="1920" fill="url(#lightGrid)" />
      </g>
    </g>
  );
}
export function FrameBox({
  x,
  y,
  w,
  h,
  fill = C.panel,
  edge = C.line,
  children,
  rad = 20,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  edge?: string;
  rad?: number;
  children?: ReactNode;
}) {
  return (
    <g transform={tr(x, y)}>
      <rect y="9" width={w} height={h} rx={rad} fill="#101912" opacity=".2" />
      <rect
        width={w}
        height={h}
        rx={rad}
        fill={fill}
        stroke={edge}
        strokeWidth="2.8"
      />
      {children}
    </g>
  );
}
export function Badge({
  x,
  y,
  w,
  text,
  good,
}: {
  x: number;
  y: number;
  w: number;
  text: string;
  good: boolean;
}) {
  return (
    <g transform={tr(x, y)}>
      <rect
        width={w}
        height="55"
        rx="9"
        fill={good ? "#284833" : "#4c302b"}
        stroke={good ? "#557b58" : "#795147"}
        strokeWidth="2"
      />
      <Glyph
        x={28}
        y={27}
        size={20}
        kind={good ? "check" : "cross"}
        color={good ? C.green : C.red}
      />
      <T x={48} y={37} size={27} color={good ? C.green : C.red} font={mono}>
        {text}
      </T>
    </g>
  );
}
export function Rail({ f, edit }: { f: number; edit: SceneProps["edit"] }) {
  const q = edit.cues,
    start = edit.cues.context;
  if (f < start || f >= edit.cues.payoff) return null;
  const available = [q.context, q.loop, q.permissions, q.memory];
  const light = lightLevel(f),
    ink = mix(light, C.paper, C.ink),
    muted = mix(light, "#879287", "#686f61");
  const names = ["CONTEXT", "LOOP", "PERMISSIONS", "MEMORY"],
    centers = [159, 396, 638, 898];
  const active = f >= q.recap ? -1 : available.filter((x) => x <= f).length - 1;
  return (
    <g opacity={ease(f, start, 13)}>
      <path d="M159 454H898" stroke={muted} strokeWidth="2.5" />
      {names.map((name, i) => {
        const selected = active === i || active === -1;
        return (
          <g key={name}>
            <circle
              cx={centers[i]}
              cy="454"
              r={selected ? 9 : 6}
              fill={
                selected
                  ? C.clay
                  : i < active
                    ? "#969b79"
                    : mix(light, "#3c463e", "#c7c8b7")
              }
              stroke={selected ? ink : muted}
              strokeWidth="2"
            />
            <T
              x={centers[i]}
              y={502}
              font={mono}
              size={selected ? 27 : 25}
              color={selected ? ink : muted}
              anchor="middle"
              weight={selected ? 800 : 450}
            >
              {name}
            </T>
          </g>
        );
      })}
    </g>
  );
}
export function Chip({
  x,
  y,
  w = 580,
  d = 158,
  h = 36,
  lid = false,
  accent = C.clay,
  mark = false,
}: {
  x: number;
  y: number;
  w?: number;
  d?: number;
  h?: number;
  lid?: boolean;
  accent?: string;
  mark?: boolean;
}) {
  const a = [-w * 0.5, -d * 0.06],
    b = [w * 0.12, -d * 0.55],
    c = [w * 0.5, d * 0.03],
    e = [-w * 0.12, d * 0.56];
  const pt = (p: number[], dy = 0) => p[0] + "," + (p[1] + dy);
  return (
    <g transform={tr(x, y)} strokeLinejoin="round">
      <polygon
        points={[pt(a), pt(e), pt(e, h), pt(a, h)].join(" ")}
        fill={lid ? "#a76143" : "#2d3c31"}
        stroke="#111b15"
        strokeWidth="3"
      />
      <polygon
        points={[pt(e), pt(c), pt(c, h), pt(e, h)].join(" ")}
        fill={lid ? "#c07951" : "#485a46"}
        stroke="#111b15"
        strokeWidth="3"
      />
      <polygon
        points={[a, b, c, e].map((p) => pt(p)).join(" ")}
        fill={lid ? "url(#lidMetal)" : "url(#pcb)"}
        stroke={lid ? "#ffe1b6" : "#9ba790"}
        strokeWidth="3"
      />
      {!lid && (
        <g fill="none" stroke={accent} strokeWidth="2" opacity=".82">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={
                "M" +
                (-w * 0.37 + i * 20) +
                " " +
                (-d * 0.05 + i * 2) +
                "l78 -17 27 13 94-19"
              }
            />
          ))}
          <path d="M-62 -12l95-19 39 19-91 19Z" fill="#1c2b21" />
        </g>
      )}
      {lid && (
        <g
          transform={
            "matrix(1," +
            (-0.19 * d) / 164 +
            ",.78," +
            (0.45 * d) / 164 +
            ",0,0)"
          }
        >
          <Star size={62} color="#5a3224" />
        </g>
      )}
      {Array.from({ length: 12 }, (_, i) => {
        const t = (i + 1) / 14;
        return (
          <path
            key={i}
            d={
              "M" +
              (e[0] + (c[0] - e[0]) * t) +
              " " +
              (e[1] + (c[1] - e[1]) * t + 8) +
              "v" +
              h * 0.34
            }
            stroke={lid ? "#8c543e" : "#b29e6f"}
            strokeWidth="3"
          />
        );
      })}
      {mark && (
        <ellipse
          cx={-w * 0.36}
          cy={d * 0.15 + h * 0.5}
          rx="7.5"
          ry="4.5"
          fill={accent}
        />
      )}
    </g>
  );
}
