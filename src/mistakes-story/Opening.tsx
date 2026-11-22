import { AbsoluteFill, Img, staticFile } from "remotion";
import plan from "../../episodes/make-no-mistakes-story/plan.json";
import { Courier } from "./Drawing";
import { arc, e, ease, lerp, phase } from "./timing";

const plate = (name: string) =>
  staticFile("episodes/make-no-mistakes-story/opening/" + name + ".png");
type Point = [number, number];
type Rail = [Point, Point, Point, Point];
const rails: Rail[] = [
  [
    [-70, 442],
    [172, 448],
    [135, 749],
    [454, 796],
  ],
  [
    [-90, 1032],
    [210, 1032],
    [196, 886],
    [470, 876],
  ],
  [
    [-64, 1410],
    [345, 1388],
    [226, 1010],
    [475, 927],
  ],
  [
    [1154, 425],
    [924, 450],
    [954, 720],
    [637, 785],
  ],
  [
    [1154, 995],
    [878, 989],
    [875, 845],
    [625, 860],
  ],
  [
    [1154, 1435],
    [755, 1398],
    [814, 1056],
    [607, 930],
  ],
];

function railPoint(rail: Rail, t: number): Point {
  const u = 1 - t;
  return [0, 1].map(
    (i) =>
      u ** 3 * rail[0][i] +
      3 * u * u * t * rail[1][i] +
      3 * u * t * t * rail[2][i] +
      t ** 3 * rail[3][i],
  ) as Point;
}

function IncomingRequests({ f, strength }: { f: number; strength: number }) {
  return (
    <svg className="mn4-layer" viewBox="0 0 1080 1920" aria-hidden="true">
      <g opacity={strength}>
        {rails.map((r, i) => {
          const d =
            "M" +
            r[0].join(" ") +
            " C" +
            r
              .slice(1)
              .map((p) => p.join(" "))
              .join(" ");
          return (
            <g key={i}>
              <path
                d={d}
                stroke="#6a5a62"
                strokeWidth="8"
                fill="none"
                opacity=".26"
              />
              <path
                d={d}
                stroke="#af9062"
                strokeWidth="1.8"
                fill="none"
                opacity=".64"
              />
              {[0, 1, 2].map((j) => {
                const t = (f / (69 + i * 2) + j / 3 + i * 0.123) % 1;
                const [x, y] = railPoint(r, t);
                const ahead = railPoint(r, Math.min(1, t + 0.016));
                const direction =
                  (Math.atan2(ahead[1] - y, ahead[0] - x) * 180) / Math.PI;
                const angle =
                  direction > 90
                    ? direction - 180
                    : direction < -90
                      ? direction + 180
                      : direction;
                const size = (1.17 - 0.42 * t) * (j === 1 ? 1 : 0.84);
                return (
                  <g
                    key={j}
                    transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}
                    opacity={(0.4 + 0.58 * t) * Math.min(1, (1 - t) / 0.1)}
                  >
                    <rect
                      x="-21"
                      y="-14"
                      width="42"
                      height="28"
                      rx="5"
                      fill="#3f3236"
                      stroke="#ecbd78"
                      strokeWidth="2.4"
                    />
                    <path
                      d="M-18 -10 0 2 18 -10"
                      fill="none"
                      stroke="#f3ca8c"
                      strokeWidth="2.6"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function Intake({ f }: { f: number }) {
  if (f >= e.billion + 12) return null;
  const ends = [12, 22, 32, 42, e.full, 77, 100, 126, e.billion];
  const paths: Rail[] = [
    [
      [-104, 961],
      [181, 1005],
      [298, 635],
      [540, 765],
    ],
    [
      [1185, 556],
      [858, 496],
      [825, 747],
      [540, 765],
    ],
    [
      [-102, 380],
      [159, 374],
      [355, 733],
      [540, 765],
    ],
    [
      [1187, 1110],
      [872, 1107],
      [861, 707],
      [540, 765],
    ],
  ];
  return (
    <svg className="mn4-layer" viewBox="0 0 1080 1920" aria-hidden="true">
      {ends.map((end, i) => {
        const duration = 38,
          t = phase(f, end - duration, duration);
        if (t <= 0 || t >= 1) return null;
        const [x, y] = railPoint(paths[i % paths.length], t);
        const size = lerp(1.03, 0.22, t * t);
        return (
          <g
            key={end}
            transform={`translate(${x} ${y}) rotate(${(i % 2 === 0 ? 1 : -1) * (1 - t) * 13}) scale(${size})`}
            opacity={Math.min(1, t * 10, (1 - t) * 11)}
          >
            <rect
              x="-50"
              y="-32"
              width="100"
              height="65"
              rx="10"
              fill="#22202a"
              opacity=".60"
              transform="translate(0 6)"
            />
            <rect
              x="-50"
              y="-32"
              width="100"
              height="65"
              rx="10"
              fill={i % 3 === 0 ? "#ffdfa0" : "#fff4da"}
              stroke="#9b6e48"
              strokeWidth="3.6"
            />
            <path
              d="m-43 -22 37 26q6 4 12 0l37-26"
              fill="none"
              stroke="#92704e"
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

export function Opening({ f }: { f: number }) {
  const fill = ease(f, e.countStart, e.full - e.countStart);
  const opened = ease(f, e.lid, 29);
  const handoff = ease(f, e.lid + 13, 36);
  const scale =
    0.83 +
    0.21 * ease(f, 0, e.full) +
    0.035 * ease(f, e.full, e.billion - e.full);
  const number = Math.round(plan.hook.countTo * fill);
  const counter = fill < 1 ? number.toLocaleString("en-US") : "2.5 BILLION";
  // The camera sees through the top of the stack. Each machined layer has its
  // own transparent Cycles plate so the core is exposed as the lid lifts away.
  const lift = -282 * opened;
  return (
    <AbsoluteFill className="mn4-opening">
      <IncomingRequests
        f={f}
        strength={(1 - handoff) * (1 - 0.42 * ease(f, e.full, 26))}
      />
      <div
        className="mn4-machine"
        style={{
          opacity: 1 - 0.97 * handoff,
          transform: `translateY(${lerp(28, -8, fill)}px) scale(${scale})`,
        }}
      >
        <div
          className="mn4-contact-shadow"
          style={{ opacity: 1 - 0.6 * opened }}
        />
        <Img
          src={plate("socket")}
          className="mn4-plate"
          style={{ transform: `translateY(${14 + opened * 90}px)` }}
        />
        <Img
          src={plate("wafer")}
          className="mn4-plate"
          style={{ transform: `translateY(${-opened * 49}px)` }}
        />
        <div
          className="mn4-plate"
          style={{ transform: `translateY(${lift}px)` }}
        >
          <Img src={plate("lid")} className="mn4-plate" />
          <Img
            src={plate("charge")}
            className="mn4-plate"
            style={{
              clipPath: `inset(${lerp(84, 6, fill)}% 0 0)`,
              opacity: fill > 0 ? 1 : 0,
            }}
          />
        </div>
        <div
          className="mn4-counter"
          style={{
            opacity: 1 - ease(f, e.lid - 6, 16),
            transform: `translateX(-50%) scale(${1 + 0.035 * arc(f, e.full, 12)})`,
          }}
        >
          <div className="mn4-count">{counter}</div>
          <div className="mn4-count-unit">messages a day</div>
        </div>
      </div>
      <Intake f={f} />
      <div
        className="mn4-credit"
        style={{ opacity: ease(f, e.full, 18) * (1 - ease(f, e.lid - 8, 16)) }}
      >
        {plan.hook.credit}
      </div>
    </AbsoluteFill>
  );
}

export function CatchRequest({ f, palmLift }: { f: number; palmLift: number }) {
  if (f < e.lid + 5) return null;
  const fly = phase(f, e.lid + 11, e.catch - e.lid - 11);
  const lateral = ease(f, e.lid + 11, e.catch - e.lid - 11);
  const size = lerp(0.55, 0.89, lateral);
  const x = lerp(540, 216, lateral);
  // The bottom of the sprite meets the upturned palm in the 'send' drawing.
  const y =
    lerp(814, 1644 - palmLift, fly * fly) - 100 * Math.sin(Math.PI * fly);
  return (
    <svg className="mn4-layer" viewBox="0 0 1080 1920" aria-hidden="true">
      <g
        opacity={ease(f, e.lid + 5, 9)}
        transform={`translate(${x} ${y}) rotate(${Math.sin(fly * Math.PI) * -13})`}
      >
        <Courier
          x={-105 * size}
          y={-146 * size}
          scale={size}
          f={f}
          mood="happy"
          shadow={false}
        />
      </g>
    </svg>
  );
}
