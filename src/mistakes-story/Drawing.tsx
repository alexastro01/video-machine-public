import type { ReactNode } from "react";
import { palette as c, requestId } from "./timing";

export function Label({
  x,
  y,
  children,
  size = 32,
  fill = c.ink,
  weight = 650,
  anchor = "start",
  mono = false,
  spacing = 0,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  fill?: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  spacing?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontWeight={weight}
      fontSize={size}
      textAnchor={anchor}
      letterSpacing={spacing}
      fontFamily={
        mono
          ? "'SF Mono', Menlo, monospace"
          : "'Astra Inter', Arial, sans-serif"
      }
    >
      {children}
    </text>
  );
}
export function Capsule({
  x,
  y,
  w,
  text,
  bg = c.paper,
  fg = c.ink,
  h = 54,
  size = 27,
}: {
  x: number;
  y: number;
  w: number;
  text: string;
  bg?: string;
  fg?: string;
  h?: number;
  size?: number;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={bg} />
      <Label
        x={x + w / 2}
        y={y + h * 0.673}
        size={size}
        weight={700}
        fill={fg}
        anchor="middle"
      >
        {text}
      </Label>
    </g>
  );
}
export function Courier({
  x,
  y,
  scale = 1,
  f,
  walk = 0,
  gear = 1,
  id = true,
  mood = "ready",
  night = false,
  shadow = true,
}: {
  x: number;
  y: number;
  scale?: number;
  f: number;
  walk?: number;
  gear?: number;
  id?: boolean;
  mood?: "ready" | "worried" | "happy";
  night?: boolean;
  shadow?: boolean;
}) {
  const gait = Math.sin(f * 0.32) * walk;
  const bob = Math.abs(gait) * 4;
  const ink = "#3c2a50";
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {shadow && (
        <ellipse
          cx="106"
          cy="161"
          rx={78 - Math.abs(gait) * 5}
          ry="9"
          fill={night ? "#0c0a1b" : "#775c92"}
          opacity={night ? 0.38 : 0.14}
        />
      )}
      <g transform={`translate(0 ${-bob})`}>
        <g transform={`translate(0 ${-21 * (1 - gear)})`} opacity={gear}>
          <path
            d={`M76 106 Q78 133 ${68 + gait * 15} ${146 - gait * 7}`}
            fill="none"
            stroke={ink}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d={`M132 106 Q126 128 ${138 - gait * 15} ${146 + gait * 7}`}
            fill="none"
            stroke={ink}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d={`M${61 + gait * 15} ${147 - gait * 7} q0 -7 9 -7 q10 2 15 9 q-6 4 -24 2z M${131 - gait * 15} ${147 + gait * 7} q1 -8 10 -7 q10 2 16 10 q-4 4 -26 2z`}
            fill={ink}
          />
        </g>
        <g opacity={gear} transform={`translate(${13 * (1 - gear)} 0)`}>
          <path
            d="M22 36 Q2 33 0 55 L0 99 Q2 111 19 109 L41 102 V41Z"
            fill="#a785cb"
            stroke={ink}
            strokeWidth="4"
          />
          <rect
            x="-5"
            y="68"
            width="25"
            height="29"
            rx="7"
            fill="#d5b8e4"
            stroke={ink}
            strokeWidth="4"
          />
          <path
            d="M11 45 Q6 20 23 24 Q34 27 32 41"
            fill="none"
            stroke={ink}
            strokeWidth="4"
          />
        </g>
        <path
          d="M43 13 H179 Q198 13 198 33 V93 Q198 112 178 112 H69 L40 128 L43 110 Q20 109 20 91 V36 Q20 13 43 13Z"
          fill="#e5a54c"
          stroke={ink}
          strokeWidth="4.8"
          strokeLinejoin="round"
        />
        <path
          d="M43 19 H178 Q192 19 192 33 V86 Q192 100 178 100 H48 Q33 100 33 88 V39 Q33 24 43 19Z"
          fill="#ffe2a0"
        />
        <path
          d="M39 23 Q23 43 34 93"
          fill="none"
          stroke="#a989b8"
          strokeWidth="6"
          opacity={gear}
        />
        <ellipse
          cx="91"
          cy="44"
          rx="4.7"
          ry={mood === "happy" ? 3 : 5.5}
          fill={ink}
        />
        <ellipse
          cx="124"
          cy="44"
          rx="4.7"
          ry={mood === "happy" ? 3 : 5.5}
          fill={ink}
        />
        <path
          d={
            mood === "worried"
              ? "M100 58 Q108 51 116 58"
              : "M99 55 Q108 64 117 55"
          }
          fill="none"
          stroke={ink}
          strokeWidth="3.7"
          strokeLinecap="round"
        />
        {id && (
          <Label
            x={109}
            y={90}
            size={23}
            weight={800}
            fill={ink}
            anchor="middle"
            mono
          >
            {requestId}
          </Label>
        )}
      </g>
    </g>
  );
}
const tokenColors = [
  "#dfd3ef",
  "#cae5e9",
  "#f4d7aa",
  "#d7e7c8",
  "#efd2df",
  "#d9d6ef",
];
export function Chips({
  x,
  y,
  pieces,
  widths,
  scale = 1,
  visible = pieces.length,
  night = false,
}: {
  x: number;
  y: number;
  pieces: string[];
  widths: number[];
  scale?: number;
  visible?: number;
  night?: boolean;
}) {
  let left = 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {pieces.map((s, i) => {
        const xx = left;
        left += widths[i] + 9;
        return (
          <g key={s + i} opacity={i < visible ? 1 : 0}>
            <rect
              x={xx}
              width={widths[i]}
              height={66}
              rx={11}
              fill={tokenColors[i % 6]}
              stroke={night ? "#b6a7bc" : "#00000013"}
              strokeWidth={1.5}
            />
            <Label
              mono
              x={xx + widths[i] / 2}
              y={43}
              anchor="middle"
              size={30}
              weight={750}
            >
              {s.trim()}
            </Label>
          </g>
        );
      })}
    </g>
  );
}
export function Check({
  x,
  y,
  color = c.green,
  scale = 1,
}: {
  x: number;
  y: number;
  color?: string;
  scale?: number;
}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${scale})`}
      d="M-14 1 -4 11 17 -13"
      fill="none"
      stroke={color}
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
