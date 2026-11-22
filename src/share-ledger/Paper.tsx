import { useId } from "react";
import plan from "../../episodes/norbert-explains-billionaire-income-tax/opening.json";

export const paper = plan.paper;
export const ink = "#244b46";

const rimPoints = Array.from({ length: 120 }, (_, i) => {
  const a = (i * Math.PI) / 60;
  const r = 66 + Math.cos(a * 24) * 3.4;
  return [Math.cos(a) * r, Math.sin(a) * r].join(",");
}).join(" ");

/** One embossed seal travels with the paper across the camera change. */
export function ShareSeal({
  x,
  y,
  scale = 1,
}: {
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="m-40 38-11 57 23-12 12 13 11-45m27-7 11 52 12-17 22 9-20-57"
        fill="#b5753c"
        stroke="#815735"
        strokeWidth="2.5"
      />
      <polygon points={rimPoints} fill="#987142" transform="translate(0 4)" />
      <polygon
        points={rimPoints}
        fill="#e8bb66"
        stroke="#9f753c"
        strokeWidth="2.5"
      />
      <circle r="57" fill="#f0ca79" stroke="#ac813e" strokeWidth="2" />
      {Array.from({ length: 32 }, (_, i) => (
        <path
          key={i}
          d="M0-54q5 5 0 9"
          transform={`rotate(${i * 11.25})`}
          fill="none"
          stroke="#a4773c"
          strokeWidth="1.4"
        />
      ))}
      <circle r="40" fill="#dfaa53" stroke="#ac793a" strokeWidth="2.2" />
      <circle r="36" fill="none" stroke="#f9db95" strokeWidth="2" />
      <g
        stroke="#705438"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 24V-10m0 19Q-11-1-21-4m22 4q5-13 17-17" fill="none" />
        <path
          d="M-1 4q-20 5-25-18 24-2 25 18Zm3-14q3-21 25-20-4 22-25 20Z"
          fill="#f9d88c"
        />
        <path d="M-14 26q15-4 29-1" fill="none" />
      </g>
    </g>
  );
}

/** Fine printed waves and corner flourishes distinguish a certificate from a screen. */
export function SecurityPaper({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const pattern = useId();
  return (
    <g>
      <defs>
        <pattern
          id={pattern}
          width="47"
          height="17"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-13)"
        >
          <path
            d="M-24 9Q-12-3 0 9T24 9T48 9T72 9"
            stroke="#799783"
            opacity=".24"
            strokeWidth="1.3"
            fill="none"
          />
        </pattern>
      </defs>
      <rect
        x="4"
        y="10"
        width={width}
        height={height}
        rx="9"
        fill="#142e2a"
        opacity=".3"
      />
      <rect
        width={width}
        height={height}
        rx="8"
        fill="#f6e9bd"
        stroke="#486d5a"
        strokeWidth="5"
      />
      <rect
        x="12"
        y="12"
        width={width - 24}
        height={height - 24}
        rx="4"
        fill={`url(#${pattern})`}
      />
      <rect
        x="20"
        y="19"
        width={width - 40}
        height={height - 38}
        rx="5"
        stroke="#59816b"
        strokeWidth="4"
        fill="none"
      />
      <rect
        x="28"
        y="27"
        width={width - 56}
        height={height - 54}
        rx="4"
        stroke="#87a384"
        strokeWidth="1.8"
        fill="none"
      />
      {[
        [32, 32, 1, 1],
        [width - 32, 32, -1, 1],
        [32, height - 32, 1, -1],
        [width - 32, height - 32, -1, -1],
      ].map(([x, y, sx, sy]) => (
        <g
          key={`${x}-${y}`}
          transform={`translate(${x} ${y}) scale(${sx} ${sy})`}
          fill="none"
          stroke="#6f967a"
        >
          <path
            d="M0 45Q-1 10 29 9q24 1 21-9M0 21q5-21 24-19"
            strokeWidth="3"
          />
          <path
            d="M8 27q5-21 23-16-4 14-23 16Z"
            fill="#9cad87"
            strokeWidth="1"
          />
        </g>
      ))}
    </g>
  );
}

export function HousePicture() {
  return (
    <g transform="translate(821 635) rotate(8)">
      <path d="m-99 78 204-3 38 133-55 10-19-85-138 1Z" fill="#865f4d" />
      <rect x="-122" y="-131" width="248" height="269" rx="4" fill="#855f46" />
      <rect
        x="-124"
        y="-138"
        width="246"
        height="269"
        rx="3"
        fill="#fff0cb"
        stroke="#caac84"
        strokeWidth="4"
      />
      <rect x="-111" y="-125" width="221" height="221" fill="#b2d2c3" />
      <circle cx="63" cy="-87" r="19" fill="#ffe3a3" />
      <path
        d="M-111 25q35-35 79-12t82-12q28-17 60-12v107h-221Z"
        fill="#7da28b"
      />
      <path
        d="M-84 76v-87l74-55 72 48v94Z"
        fill="#edc093"
        stroke="#675d50"
        strokeWidth="3"
      />
      <path
        d="m-94-14 84-65 86 57-7 11-79-50-75 58Z"
        fill="#a45e4f"
        stroke="#74564b"
        strokeWidth="3"
      />
      <path d="M25-61v-38h18v50" fill="#b47b64" />
      <path
        d="M0 77V34q0-22-20-22t-19 22v43Z"
        fill="#326971"
        stroke="#45646a"
        strokeWidth="3"
      />
      <circle cx="-10" cy="46" r="3" fill="#fbd576" />
      <g fill="#527e81" stroke="#fff0c3" strokeWidth="4">
        <path d="M-68 12h20v27h-20Zm87 0h22v27H19Z" />
      </g>
      <path d="m-40 78-13 18H6L0 78Z" fill="#e9d6ae" />
      <path d="M-24-142h61l-1 22-60 6Z" fill="#d4ae6c" opacity=".85" />
    </g>
  );
}
