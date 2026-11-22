import type { ReactNode } from "react";
import type { Edit } from "../claude-design/schema";
import type { FlatEdit } from "./schema";
import "../components/Typography";

export type Shot = { f: number; edit: Edit; flat: FlatEdit };
export const P = {
  bg: "#191b20",
  panel: "#22252c",
  raised: "#2d3037",
  inset: "#191c22",
  edge: "#565a61",
  soft: "#3c414a",
  text: "#f8f4ee",
  muted: "#b5b6ba",
  orange: "#ffac75",
  dimOrange: "#4a342c",
  red: "#ff8687",
  green: "#88dfac",
  dimGreen: "#243d33",
  blue: "#a2c8fa",
};
export const sans = "'DM Sans',Arial,sans-serif",
  mono = "Menlo,monospace";
export const between = (x: number, a: number, b: number) =>
  Math.max(a, Math.min(b, x));
export const unit = (f: number, at: number, span: number) =>
  between((f - at) / Math.max(1, span), 0, 1);
export const ease = (f: number, at: number, span = 12) =>
  1 - (1 - unit(f, at, span)) ** 3;
export const smooth = (f: number, at: number, span = 16) => {
  const t = unit(f, at, span);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const bump = (f: number, at: number, span = 14) =>
  Math.sin(Math.PI * unit(f, at, span));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const tr = (x: number, y: number, s = 1) =>
  "translate(" + x + " " + y + ") scale(" + s + ")";
export function T({
  x,
  y,
  children,
  size = 42,
  color = P.text,
  weight = 680,
  font = sans,
  anchor = "start",
  ls = 0,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  font?: string;
  anchor?: "start" | "middle" | "end";
  ls?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fontFamily={font}
      fontSize={size}
      fontWeight={weight}
      fill={color}
      textAnchor={anchor}
      letterSpacing={ls}
    >
      {children}
    </text>
  );
}
export function Star({
  x,
  y,
  r = 24,
  color = P.orange,
}: {
  x: number;
  y: number;
  r?: number;
  color?: string;
}) {
  return (
    <g transform={tr(x, y, r / 34)} fill={color}>
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          transform={"rotate(" + (i * 30 + (i % 2 ? 2 : -2)) + ")"}
          d={"M-3 4l-2 -" + (32 + (i % 3) * 2) + " 7 -3 2 35Z"}
        />
      ))}
    </g>
  );
}
const glyphs = {
  term: "M-17 -13l13 13-13 13m20 0h16",
  file: "M-12 -19H5l10 10v28h-27zM5 -19v11h10M-6 1h14M-6 8h11",
  search: "M10 9l11 11M12 -5a13 13 0 1 1-26 0 13 13 0 1 1 26 0",
  check: "M-17 0l11 11 23-24",
  x: "M-11 -11l22 22m0-22-22 22",
  lock: "M-13 -2h26v20h-26zM-8 -3v-8a8 8 0 01 16 0v8M0 6v5",
  note: "M-15 -18h29v24L2 18h-17zM2 18V6h12M-8 -8h15M-8 -1h10",
  send: "M-20 -3l40-15-13 37-9-14-18-8zM-2 5l20-21",
  cycle:
    "M-17 -3a17 17 0 0129-10l4 5m-1-10 2 12-12-2M17 3a17 17 0 01-29 10l-4-5m1 10-2-12 12 2",
  code: "M-10 -11l-11 11 11 11M10 -11l11 11-11 11M4 -17l-8 34",
  arrow: "M-18 0h34M3 -12l14 12-14 12",
  pc: "M-19 -15h38v26h-38zM-25 16h50",
} as const;
export function Icon({
  kind,
  x,
  y,
  r = 30,
  color = P.orange,
}: {
  kind: keyof typeof glyphs;
  x: number;
  y: number;
  r?: number;
  color?: string;
}) {
  return (
    <path
      d={glyphs[kind]}
      transform={tr(x, y, r / 22)}
      stroke={color}
      strokeWidth="2.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}
export function Card({
  name,
  icon = "term",
  children,
}: {
  name: string;
  icon?: keyof typeof glyphs | "claude";
  children: ReactNode;
}) {
  return (
    <g>
      <rect
        x="1.5"
        y="1.5"
        width="900"
        height="523"
        rx="28"
        fill={P.panel}
        stroke={P.edge}
        strokeWidth="3"
      />
      <path d="M2 87h899" stroke={P.soft} strokeWidth="3" />
      {icon === "claude" ? (
        <Star x={49} y={44} r={23} />
      ) : (
        <Icon x={49} y={44} r={21} kind={icon} />
      )}
      <T x={92} y={58} size={39} weight={730} ls={-1}>
        {name}
      </T>
      <g fill="#777b82">
        {[785, 811, 837].map((x) => (
          <circle key={x} cx={x} cy={43} r="5" />
        ))}
      </g>
      <g transform="translate(0 -6)">{children}</g>
    </g>
  );
}
export function Burst({
  f,
  at,
  x,
  y,
  color = P.green,
  span = 23,
  r = 110,
}: {
  f: number;
  at: number;
  x: number;
  y: number;
  color?: string;
  span?: number;
  r?: number;
}) {
  const t = unit(f, at, span);
  if (t <= 0 || t >= 1) return null;
  return (
    <g transform={tr(x, y)} opacity={1 - t}>
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          transform={"rotate(" + (i * 40 + 8) + ")"}
          d={"M0 " + -r * (0.41 + t * 0.57) + "v" + -r * 0.16 * (1 - t * 0.45)}
          stroke={color}
          strokeWidth={5 - 2 * t}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}
