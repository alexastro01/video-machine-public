import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { Canvas, mix } from "./graphics";

export const Aperture = ({
  p,
  x,
  y,
  rim,
  children,
}: {
  p: number;
  x: number;
  y: number;
  rim: string;
  children: ReactNode;
}) => {
  if (p <= 0) return null;
  const radius =
    p * (12 + Math.hypot(Math.max(x, 1080 - x), Math.max(y, 1920 - y)));
  return (
    <>
      <AbsoluteFill
        style={{
          clipPath: p < 1 ? `circle(${radius}px at ${x}px ${y}px)` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
      {p < 1 ? (
        <Canvas>
          <circle
            cx={x}
            cy={y}
            r={radius}
            fill="none"
            stroke={rim}
            strokeWidth={10 * (1 - p)}
            opacity={Math.sin(Math.PI * p)}
          />
        </Canvas>
      ) : null}
    </>
  );
};

export const BarWall = ({ t }: { t: number }) => (
  <Canvas>
    <defs>
      <linearGradient id="beer-taproom" x1="0" y1="0" x2=".65" y2="1">
        <stop stopColor="#251137" />
        <stop offset=".57" stopColor="#62336a" />
        <stop offset="1" stopColor="#995b72" />
      </linearGradient>
      <radialGradient id="beer-lamplight">
        <stop stopColor="#ffd183" stopOpacity=".45" />
        <stop offset="1" stopColor="#ffa265" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#beer-taproom)" />
    <path
      d="M-80 1010V490a230 230 0 0 1 460 0v520M740 1010V440a190 190 0 0 1 380 0v570"
      fill="#342245"
      stroke="#8d5474"
      strokeWidth="16"
    />
    <path
      d="M-30 706H365M173 288V1004M752 643H1090M926 259V1002"
      fill="none"
      stroke="#774765"
      strokeWidth="12"
    />
    <g fill="#bf8694" opacity=".36">
      <path d="M-20 1004V842h60v-60h53v77h43v-118h54v55h53v207ZM758 1004V837h45v-56h60v54h39v-133h51v70h62v-49h65v281Z" />
    </g>
    {[125, 913].map((x, i) => (
      <g key={x} transform={`translate(${x} ${i ? 252 : 149})`}>
        <ellipse cx="0" cy="78" rx="216" ry="192" fill="url(#beer-lamplight)" />
        <path d="M0 -320V-44" stroke="#372137" strokeWidth="8" />
        <path d="M-59 2Q-49-44 0-47 47-43 59 2Z" fill="#b77c68" />
        <ellipse cy="2" rx="59" ry="10" fill="#ffd28f" />
      </g>
    ))}
    {Array.from({ length: 10 }, (_, i) => (
      <circle
        key={i}
        cx={40 + ((i * 271) % 1035)}
        cy={500 + ((i * 157) % 440) + 4 * Math.sin(t * 0.45 + i)}
        r={4 + (i % 3) * 3}
        fill="#ffcd9b"
        opacity=".32"
      />
    ))}
    <path d="M0 1065H1080" stroke="#58324e" strokeWidth="22" />
  </Canvas>
);

export const Counter = ({ horizon = 1190 }: { horizon?: number }) => (
  <Canvas>
    <defs>
      <linearGradient id="beer-counter" x2=".16" y2="1">
        <stop stopColor="#e59968" />
        <stop offset=".39" stopColor="#c87552" />
        <stop offset="1" stopColor="#96534e" />
      </linearGradient>
    </defs>
    <path
      d={`M0 ${horizon}Q470 ${horizon - 12} 1080 ${horizon + 4}V1920H0Z`}
      fill="url(#beer-counter)"
    />
    <path
      d={`M0 ${horizon + 3}Q470 ${horizon - 9} 1080 ${horizon + 7}`}
      fill="none"
      stroke="#ffd0a0"
      strokeWidth="9"
    />
    <g
      fill="none"
      stroke="#8d4c47"
      opacity=".32"
      strokeWidth="5"
      strokeLinecap="round"
    >
      <path
        d={`M-30 ${horizon + 126}q155 -15 289 -9m556 -17q148 0 323 11M-20 ${horizon + 320}q283 -24 497 -12m109 -5q286 -15 570 -4`}
      />
    </g>
  </Canvas>
);

export const Coaster = ({
  x,
  y,
  r = 115,
}: {
  x: number;
  y: number;
  r?: number;
}) => (
  <g transform={`translate(${x} ${y}) scale(${r / 100} ${r / 246})`}>
    <ellipse cy="9" rx="102" ry="98" fill="#7b514a" opacity=".33" />
    <circle cy="4" r="100" fill="#206e71" />
    <circle r="100" fill="#47c9b4" />
    <circle r="85" fill="none" stroke="#d7f3c6" strokeWidth="6" />
    <circle r="69" fill="none" stroke="#2ca490" strokeWidth="4" />
    {Array.from({ length: 12 }, (_, i) => (
      <path
        key={i}
        d="M0-57v12"
        stroke="#d0f0bb"
        strokeWidth="5"
        strokeLinecap="round"
        transform={`rotate(${i * 30})`}
      />
    ))}
    <circle r="16" fill="#d7f3c6" />
  </g>
);

export const Impact = ({
  x,
  y,
  p,
  colour = "#ffdf93",
  size = 1,
}: {
  x: number;
  y: number;
  p: number;
  colour?: string;
  size?: number;
}) =>
  p <= 0 || p >= 1 ? null : (
    <g
      transform={`translate(${x} ${y}) scale(${size})`}
      opacity={Math.sin(Math.PI * p)}
    >
      {[-59, -29, 29, 59].map((a) => (
        <path
          key={a}
          d={`M0 ${-mix(23, 63, p)}v${-mix(26, 9, p)}`}
          transform={`rotate(${a})`}
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
