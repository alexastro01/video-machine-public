import { Img, staticFile } from "remotion";
import { Canvas, clamp, mix, smooth } from "../beer/graphics";
import { Performance } from "../beer/Cast";
import performances from "../../episodes/is-coffee-actually-a-drug/assets/performances.json";
import edit from "../../episodes/is-coffee-actually-a-drug/edit.json";

export { Canvas, clamp, mix, smooth };
export const e = edit.events;
export const cupCut = (Math.round(e.cup * edit.fps) - 3) / edit.fps;
export const cherryClockMatch = { x: 365, y: 832, radius: 188 };
export const base = "episodes/is-coffee-actually-a-drug/";
export const ink = "#243e40";

export function Miko({
  action,
  frame,
  left,
  top,
  width,
}: {
  action: keyof typeof performances;
  frame: number;
  left: number;
  top: number;
  width: number;
}) {
  const art = performances[action];
  return (
    <Performance
      art={art}
      frame={Math.max(0, Math.min(art.frames - 1, Math.floor(frame)))}
      x={left}
      y={top}
      width={width}
    />
  );
}

export const Cup = ({
  t,
  x,
  y,
  width,
}: {
  t: number;
  x: number;
  y: number;
  width: number;
}) => {
  const frame = 1 + Math.min(48, Math.max(0, Math.floor(t * 30)));
  return (
    <Img
      src={staticFile(
        base + "blender/cup-" + String(frame).padStart(4, "0") + ".png",
      )}
      style={{
        position: "absolute",
        left: x - width / 2,
        top: y - width / 2,
        width,
        height: width,
      }}
    />
  );
};

export const Moon = ({
  x = 0,
  y = 0,
  scale = 1,
  color = "#fff2c9",
}: {
  x?: number;
  y?: number;
  scale?: number;
  color?: string;
}) => (
  <path
    transform={`translate(${x} ${y}) scale(${scale})`}
    d="M15-31C-10-37-34-19-34 5c0 23 22 39 45 32 9-3 17-9 22-17C8 29-12 8-4-14c4-10 10-15 19-17Z"
    fill={color}
  />
);

export function Token({
  kind,
  x,
  y,
  size = 1,
  t,
  turn = 0,
  squash = 0,
  opacity = 1,
  surprise = false,
  seated = 0,
  limbs = 1,
}: {
  kind: "caffeine" | "adenosine";
  x: number;
  y: number;
  t: number;
  size?: number;
  turn?: number;
  squash?: number;
  opacity?: number;
  surprise?: boolean;
  seated?: number;
  limbs?: number;
}) {
  const sun = kind === "caffeine";
  const dark = sun ? "#743b2c" : "#423661";
  const line = sun ? "#c16c31" : "#75639d";
  const boot = sun ? "#8a4732" : "#625681";
  const blink = (t + (sun ? 1.1 : 0.2)) % 3.43 > 3.28;
  const shape =
    "M-73-97Q-74-110-65-118l42-30q10-7 23-6l44 7q13 2 19 13l25 40q7 11 1 23L70-35q-7 12-21 14L0-14q-13 1-22-7l-40-34q-10-9-10-22Z";
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${turn}) scale(${size * (1 + squash * 0.12)} ${size * (1 - squash * 0.15)})`}
      opacity={opacity}
    >
      <g
        fill="none"
        stroke={boot}
        strokeWidth="10"
        strokeLinecap="round"
        opacity={limbs}
      >
        <path
          d={`M-31-30q${-3 - seated * 27} ${7 + seated * 3} ${-5 - seated * 16} 22h-14M31-29q${3 + seated * 25} ${8 + seated * 4} ${5 + seated * 17} 21h13`}
        />
        <path
          d={
            surprise
              ? "M-64-83q-17-22-24-17m151 17q17-25 24-20"
              : "M-65-82q-14 9-15 19m147-19q14 6 15 16"
          }
        />
      </g>
      {sun ? (
        <>
          <path d={shape} fill="#d78840" />
          <path
            d={shape}
            transform="translate(-2 -5) scale(.98)"
            fill="#ffc968"
            stroke={line}
            strokeWidth="3"
          />
          <path d="m9-136-26 43h18l-8 23 34-45H8l10-21Z" fill="#a45a2f" />
        </>
      ) : (
        <>
          <circle cy="-86" r="68" fill="#8770b0" />
          <circle
            cx="-2"
            cy="-91"
            r="66"
            fill="#c8b0f6"
            stroke={line}
            strokeWidth="3"
          />
          <Moon x={-4} y={-119} scale={0.51} color="#765caa" />
          <path
            d="M-53-102q8-27 31-36"
            fill="none"
            stroke="#ede0ff"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      )}
      <g stroke={dark} strokeLinecap="round" strokeWidth="5" fill="none">
        {blink ? (
          <path d="M-29-67q5 4 11 0m30 0q5 4 11 0" />
        ) : sun || surprise ? (
          <g fill={dark} stroke="none">
            <ellipse cx="-24" cy="-68" rx="4.8" ry={surprise ? 8 : 6.5} />
            <ellipse cx="20" cy="-68" rx="4.8" ry={surprise ? 8 : 6.5} />
          </g>
        ) : (
          <path d="M-31-70q7 8 15 1m28 0q7 7 15-1" />
        )}
        {surprise ? (
          <ellipse cy="-49" rx="5" ry="6" />
        ) : (
          <path d={sun ? "M-8-53q7 9 15-1" : "M-6-51q6 4 12-1"} />
        )}
      </g>
    </g>
  );
}

export const Callout = ({
  x,
  y,
  text,
  path,
  color = "#e9eff0",
  dark = false,
  align = "middle",
  opacity = 1,
}: {
  x: number;
  y: number;
  text: string;
  path?: string;
  color?: string;
  dark?: boolean;
  align?: "start" | "middle" | "end";
  opacity?: number;
}) => (
  <g opacity={opacity}>
    {path ? (
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.8"
        strokeDasharray="5 7"
        strokeLinecap="round"
      />
    ) : null}
    <text
      x={x}
      y={y}
      textAnchor={align}
      fill={color}
      fontFamily="DM Sans"
      fontSize="40"
      fontWeight={750}
      stroke={dark ? "#143c40" : "none"}
      strokeWidth={4}
      paintOrder="stroke fill"
    >
      {text}
    </text>
  </g>
);

export function Steam({
  x,
  y,
  t,
  size = 1,
}: {
  x: number;
  y: number;
  t: number;
  size?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${size})`}
      fill="none"
      strokeLinecap="round"
    >
      {[0, 1, 2].map((i) => {
        const p = (t * 0.48 + i / 3) % 1;
        const drift = Math.sin(p * Math.PI * 2 + i) * 14;
        return (
          <path
            key={i}
            opacity={Math.sin(Math.PI * p) * 0.53}
            stroke="#fff1c9"
            strokeWidth={7 - 3 * p}
            d={`M${(i - 1) * 39 + drift} ${-p * 118}q-25-29-3-57t4-46`}
          />
        );
      })}
    </g>
  );
}

export function NeuralGround({
  t,
  prefix,
  warm = false,
}: {
  t: number;
  prefix: string;
  warm?: boolean;
}) {
  const line = warm ? "#bf8666" : "#598985";
  return (
    <g>
      <defs>
        <radialGradient id={prefix + "-light"} cx=".53" cy=".42" r=".77">
          <stop stopColor={warm ? "#f6d9a0" : "#426c71"} />
          <stop offset=".67" stopColor={warm ? "#cd9274" : "#22474e"} />
          <stop offset="1" stopColor={warm ? "#a86f62" : "#142e37"} />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill={`url(#${prefix}-light)`} />
      {[
        [20, 308, 1.1, 22],
        [1064, 404, 1.26, 167],
        [-5, 1373, 0.96, -24],
        [1113, 1530, 1.34, 192],
      ].map(([x, y, s, r], i) => (
        <g
          key={i}
          transform={`translate(${x} ${y + Math.sin(t * 0.27 + i) * 8}) rotate(${r}) scale(${s})`}
          opacity={warm ? 0.16 : 0.25}
        >
          <path
            d="M-195-109Q-50 8 64 3t138 62m-162-62q84-70 96-148M84 6q51 25 105 28l81-18M81 5q57-6 98-49"
            stroke={line}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="64" cy="3" r="12" fill={line} />
        </g>
      ))}
    </g>
  );
}
