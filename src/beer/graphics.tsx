import type { CSSProperties, ReactNode } from "react";

export const colours = {
  background: "#150729",
  purple: "#682bc1",
  violet: "#9c49eb",
  pale: "#d8b5ff",
  green: "#14d9ac",
  teal: "#128ca3",
  yellow: "#f9db42",
  pink: "#f056a9",
  red: "#ef5369",
  blue: "#6276ec",
};
export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const smooth = (t: number, at: number, duration: number) => {
  const p = clamp((t - at) / duration);
  return p * p * (3 - 2 * p);
};
export const out = (t: number, at: number, duration: number) =>
  1 - (1 - clamp((t - at) / duration)) ** 3;

export const cubic = (
  p: number,
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
  d: readonly [number, number],
) => {
  const q = 1 - p;
  return [
    q ** 3 * a[0] + 3 * q * q * p * b[0] + 3 * q * p * p * c[0] + p ** 3 * d[0],
    q ** 3 * a[1] + 3 * q * q * p * b[1] + 3 * q * p * p * c[1] + p ** 3 * d[1],
  ] as const;
};

export const Canvas = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <svg
    width={1080}
    height={1920}
    viewBox="0 0 1080 1920"
    style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}
  >
    {children}
  </svg>
);

export const Label = ({
  x,
  y,
  text,
  colour = colours.teal,
  size = 42,
  opacity = 1,
}: {
  x: number;
  y: number;
  text: string;
  colour?: string;
  size?: number;
  opacity?: number;
}) => {
  const width = Math.max(140, text.length * size * 0.58 + 58);
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <rect
        x={-width / 2}
        y={-size * 0.72}
        width={width}
        height={size * 1.45}
        rx={size * 0.72}
        fill={colour}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontFamily="DM Sans"
        fontSize={size}
        fontWeight={800}
      >
        {text}
      </text>
    </g>
  );
};

export const Star = ({
  x,
  y,
  size = 24,
  fill = "white",
  rotate = 0,
  opacity = 1,
}: {
  x: number;
  y: number;
  size?: number;
  fill?: string;
  rotate?: number;
  opacity?: number;
}) => (
  <path
    d="M0-1C.15-.2.2-.15 1 0 .2.15.15.2 0 1-.15.2-.2.15-1 0-.2-.15-.15-.2 0-1Z"
    fill={fill}
    opacity={opacity}
    transform={`translate(${x} ${y}) rotate(${rotate}) scale(${size})`}
  />
);

export const Thought = ({
  x,
  y,
  size = 1,
  opacity = 1,
  danger = false,
}: {
  x: number;
  y: number;
  size?: number;
  opacity?: number;
  danger?: boolean;
}) => (
  <g transform={`translate(${x} ${y}) scale(${size})`} opacity={opacity}>
    <path
      d="M-94 7C-141-7-124-74-77-73-69-130 17-137 46-94 105-109 142-47 108-8 113 52 30 67 1 35-32 66-89 53-94 7Z"
      fill={danger ? "#562b67" : "#c4a4e9"}
    />
    <circle cx="-47" cy="91" r="16" fill={danger ? "#562b67" : "#c4a4e9"} />
    <circle cx="-64" cy="127" r="9" fill={danger ? "#562b67" : "#c4a4e9"} />
    <path
      d="M6-73-35-12H-4L-24 29 41-35H12L30-73Z"
      fill={danger ? colours.red : "#714d9f"}
    />
  </g>
);

export const Brain = ({
  x = 540,
  y = 760,
  size = 1,
  glow = 0,
}: {
  x?: number;
  y?: number;
  size?: number;
  glow?: number;
}) => (
  <g transform={`translate(${x} ${y}) scale(${size})`}>
    <path d="M-22 150-30 223H43L36 150Z" fill="#bc42bc" />
    <path
      d="M0-155C-48-207-131-184-155-139-221-142-255-91-238-42-289-8-267 70-215 91-219 158-148 193-106 160-74 201-15 181 0 150Z"
      fill="#f18cdd"
    />
    <path
      d="M0-155C48-207 131-184 155-139 221-142 255-91 238-42 289-8 267 70 215 91 219 158 148 193 106 160 74 201 15 181 0 150Z"
      fill="#e765cf"
    />
    <path
      d="M-149-134C-137-75-199-82-190-27M-236-33C-186-32-134 14-151 63M-110 154C-82 114-126 97-89 62M-16-147C-72-122-46-72-87-60M-13 30C-60 7-56 68-44 118M147-133C131-91 193-83 189-34M236-29C176-40 130 6 155 52M107 155C73 115 126 90 88 58M15-145C66-122 48-70 89-60M12 32C61 11 55 70 44 118"
      fill="none"
      stroke="#bc48b6"
      strokeWidth={17}
      strokeLinecap="round"
    />
    <path
      d="M0-154V151"
      fill="none"
      stroke="#d253c1"
      strokeWidth={12}
      strokeLinecap="round"
    />
    <ellipse rx={240} ry={181} fill={colours.yellow} opacity={glow * 0.12} />
  </g>
);

export const Background = ({
  t,
  mood = "normal",
}: {
  t: number;
  mood?: "normal" | "warm" | "night";
}) => {
  const night = mood === "night";
  const warm = mood === "warm";
  return (
    <Canvas>
      <defs>
        <linearGradient id={`beer-bg-${mood}`} x2=".3" y2="1">
          <stop stopColor={night ? "#0b153b" : warm ? "#3c126a" : "#140529"} />
          <stop
            offset="1"
            stopColor={night ? "#171c50" : warm ? "#7e2bcc" : "#291057"}
          />
        </linearGradient>
      </defs>
      <rect width={1080} height={1920} fill={`url(#beer-bg-${mood})`} />
      {Array.from({ length: 12 }, (_, i) => {
        const x = 70 + ((i * 271) % 960) + Math.sin(t * 0.22 + i) * 18;
        const y = 140 + ((i * 307) % 1600) - ((t * (3 + (i % 4))) % 80);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={7 + (i % 4) * 5}
            fill={
              i % 3 === 0
                ? colours.yellow
                : i % 3 === 1
                  ? colours.pale
                  : colours.teal
            }
            opacity={warm ? 0.18 : 0.055}
          />
        );
      })}
    </Canvas>
  );
};

export const MiniMug = ({
  x,
  y,
  scale = 1,
  opacity = 1,
}: {
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <path
      d="M49-34C108-45 106 57 49 44"
      fill="none"
      stroke="#c2e6f4"
      strokeWidth={17}
    />
    <path d="M-56-61H57L51 81Q0 97-50 81Z" fill="#ccebf5" />
    <path d="M-43-31H44L38 68Q0 78-39 68Z" fill="#f0b72d" />
    <path
      d="M-48-47C-70-73-42-95-23-82-13-106 22-104 29-80 54-93 73-66 54-49Z"
      fill="#fff2cf"
    />
    <circle cx="-20" cy="15" r="7" fill="#ffe88a" />
    <circle cx="17" cy="43" r="5" fill="#ffe88a" />
  </g>
);
