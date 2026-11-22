import { ChairSignal, Pocket, handoffEnd } from "./Binding";
import {
  Callout,
  Canvas,
  Moon,
  Token,
  NeuralGround,
  cherryClockMatch,
  e,
  mix,
  smooth,
} from "./Illustration";

const chairX = 563,
  chairY = 1032;
const brainPath =
  "M-227 65Q-266 44-248-4q-10-66 48-87 13-50 72-50 43-44 101-23 48-34 101-5 64-8 87 35 59 4 77 53 55 26 38 72 26 46-13 75-21 37-79 31-35 29-97 11-57 18-96-1-48 9-82-13-52 12-90-32-52 2-67-66Z";

function Leaf({
  x,
  y,
  angle,
  scale,
}: {
  x: number;
  y: number;
  angle: number;
  scale: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <path
        d="M0 0C21-59 106-91 221-64 184-21 86 24 0 0Z"
        fill="#2d7762"
        stroke="#275e51"
        strokeWidth="3"
      />
      <path d="M4-1Q98-52 217-63C164-8 72 22 4-1Z" fill="#448a68" />
      <path
        d="M4-1Q101-44 217-63m-167 44 21-33m23 18 25-31m22 19 23-22m-91 31 33 9m18-25 28 6"
        fill="none"
        stroke="#95b67e"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  );
}

function Cherry({ x, y, r = 32 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${r / 32})`}>
      <ellipse cy="3" rx="29" ry="34" fill="#b4493d" />
      <ellipse cx="-4" cy="-1" rx="25" ry="30" fill="#e77654" />
      <path
        d="M-15-8q1-9 11-12"
        stroke="#ffad7b"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="m1 28 4 2 5-2" fill="none" stroke="#943d32" strokeWidth="3" />
    </g>
  );
}

export function Origin({ t }: { t: number }) {
  const plant = smooth(t, e.stimulant + 0.12, 0.73);
  const opens = smooth(t, e.plants + 0.09, 0.55);
  const fruit = { x: 623, y: 951, rx: 75, ry: 82 };
  const fruitScale = 1 + opens * 0.28;
  const cherryFocus = smooth(
    t,
    e.naturally + 0.12,
    e.awake - 0.15 - e.naturally - 0.12,
  );
  const roundRadius = (fruit.rx + fruit.ry) / 2;
  const magnification = mix(1, cherryClockMatch.radius / (roundRadius * fruitScale), cherryFocus);
  const fruitWidth = fruitScale * mix(1, roundRadius / fruit.rx, cherryFocus);
  const fruitHeight = fruitScale * mix(1, roundRadius / fruit.ry, cherryFocus);
  const focusX = mix(fruit.x, cherryClockMatch.x, cherryFocus);
  const focusY = mix(fruit.y, cherryClockMatch.y, cherryFocus);
  return (
    <Canvas>
      <NeuralGround t={t} prefix="origin" warm />
      <path
        d="M-249 1318Q426 981 1179 1023v924H-249Z"
        fill="#a96b55"
        opacity=".27"
      />
      <g
        transform={`translate(${focusX} ${focusY}) scale(${magnification}) translate(${-fruit.x} ${-fruit.y})`}
      >
        <g
          transform={`translate(${-420 * (1 - plant)} ${178 * (1 - plant)}) rotate(${-18 * (1 - plant) + Math.sin(t * 1.22) * (1 - cherryFocus)} 560 903)`}
          opacity={plant}
        >
          <path
            d="M-161 1278Q227 1153 419 886t539-394"
            stroke="#714e3c"
            strokeWidth="21"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M-161 1270Q220 1152 414 886t542-397"
            stroke="#ac8257"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <Leaf x={143} y={1132} angle={-82} scale={1.17} />
          <Leaf x={236} y={1065} angle={44} scale={1.16} />
          <Leaf x={398} y={910} angle={-119} scale={1.17} />
          <Leaf x={510} y={790} angle={-78} scale={1.2} />
          <Leaf x={635} y={691} angle={32} scale={1.05} />
          <Leaf x={707} y={634} angle={-62} scale={0.88} />
          <Leaf x={775} y={588} angle={27} scale={0.72} />
          <path
            d="M364 954q19 42-15 70m40-101q35 43 13 70m39-109q64-13 97 42m-34-109q64 10 93 95m81-218q14 27 1 60m37-88q37 33 18 74m33-102q36 19 30 64"
            stroke="#725a40"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <Cherry x={349} y={1038} r={38} />
          <Cherry x={403} y={1006} r={40} />
          <Cherry x={541} y={943} r={43} />
          <Cherry x={680} y={766} r={29} />
          <Cherry x={734} y={749} r={32} />
          <Cherry x={787} y={711} r={25} />
          <g
            transform={`translate(${fruit.x} ${fruit.y}) rotate(${-17 * (1 - cherryFocus)}) scale(${fruitWidth} ${fruitHeight})`}
          >
            <ellipse rx={fruit.rx} ry={fruit.ry} fill="#bd4f3d" />
            <path
              d="M0-81q-88 3-73 101 10 58 61 62 12-39 12-163Z"
              fill="#e77752"
              transform={`translate(${-opens * 67} ${-opens * 16}) rotate(${-opens * 22})`}
            />
            <ellipse cx="2" rx={11 + opens * 47} ry="70" fill="#efc58a" />
            <path
              d="M8-54Q-16-29 1 2t-2 45"
              stroke="#a87950"
              strokeWidth={opens * 7}
              fill="none"
            />
          </g>
        </g>
      </g>
    </Canvas>
  );
}

export function CaffeineTrail({ t }: { t: number }) {
  const show = smooth(t, e.contains + 0.06, 0.35),
    named = smooth(t, e.caffeine - 0.19, 0.53);
  const plant = smooth(t, e.stimulant + 0.12, 0.73),
    split = smooth(t, e.plants + 0.09, 0.55);
  const lift = smooth(t, e.one - 0.07, 0.43);
  const size =
    mix(mix(0.11 + 0.41 * lift, 2.58, named), 0.76, plant) + 0.05 * split;
  const x = mix(mix(550, 535, named), 616, plant) + split * 58;
  const cy = mix(mix(700 - 61 * lift, 766, named), 898, plant) - split * 100;
  return (
    <Canvas>
      <Token
        kind="caffeine"
        t={t}
        x={x}
        y={cy + size * 86}
        size={size}
        limbs={smooth(t, e.one + 0.04, 0.38)}
        turn={-18 * Math.sin(Math.PI * lift) - 9 * split}
        opacity={show * (1 - smooth(t, e.naturally + 0.07, 0.34))}
      />
    </Canvas>
  );
}

export function BrainField({ t }: { t: number }) {
  const intro = smooth(t, e.brain - 0.18, 0.5),
    build = smooth(t, e.builds - 0.45, 1.7);
  const magnify = smooth(t, e.brainWord + 0.08, 0.59);
  const cells = [
    [-117, 25],
    [-163, -47],
    [-91, -81],
    [-64, 54],
    [-26, -24],
    [36, -81],
    [79, 17],
    [121, -33],
    [166, 35],
    [24, 58],
    [177, -48],
    [-4, -111],
  ];
  return (
    <Canvas>
      <NeuralGround t={t} prefix="wake" />
      <g
        transform={`translate(538 791) scale(${(1.03 + intro * 0.2) * (1 + magnify * 0.23)})`}
      >
        <path
          d="M-291 440q40-78 27-149l-28-102q-27-105-24-201 6-245 258-273 205-24 305 136 50 75 42 173l42 84q10 21-12 25l-31 6-4 68q-1 45-52 47l-74 2-9 169Z"
          fill="#83aaa2"
          opacity=".88"
        />
        <path
          d="M-289 438q44-85 27-165l-22-80"
          stroke="#acc7b5"
          strokeWidth="7"
          fill="none"
          opacity=".58"
        />
        <path
          d="M213 4q22-13 39-2M234 18q10 9 21-1"
          fill="none"
          stroke="#547e7b"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <g transform="translate(-8 -57)">
          <defs>
            <clipPath id="coffee-brain">{<path d={brainPath} />}</clipPath>
          </defs>
          <path d="M95 90q27 53 9 116l41 12q30-77 13-133Z" fill="#92739e" />
          <path d={brainPath} fill="#ad8bac" stroke="#5c597b" strokeWidth="6" />
          <g clipPath="url(#coffee-brain)" transform="translate(0 -2)">
            <path
              d="M-250 24q69-44 93 5t99 46m-90-224q23 43-9 79t19 56m62-117q-15 44 17 70t-1 63m50-164q-15 46 20 65t1 74m66-140q27 29 15 65t35 41m63-103q-47 31-34 64t52 36m55-44q-43-14-57 25t-62 46m-89-7q2-24 34-31"
              fill="none"
              stroke="#886e95"
              strokeWidth="13"
              strokeLinecap="round"
            />
            {cells.map(([x, y], i) => {
              if (i === 6) return null;
              const p = smooth(t, e.adenosine + 0.006 + i * 0.141, 0.36);
              return (
                <g
                  key={x}
                  opacity={p}
                  transform={`translate(${x + (1 - p) * 34 + Math.sin(t * 1.3 + i) * 3} ${y - (1 - p) * 19}) scale(${0.3 + p * 0.7})`}
                >
                  <circle r={14 + build * 6} fill="#ead3ff" opacity=".25" />
                  <circle r="10" fill="#d7b7fa" />
                  <Moon x={0} y={-0.5} scale={0.17} color="#78629d" />
                </g>
              );
            })}
          </g>
          <path
            d="M-236-12q10-42 47-57"
            fill="none"
            stroke="#d5b1c5"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </g>
      </g>
      <Callout
        x={679}
        y={426}
        text="Adenosine"
        color="#edddff"
        dark
        path="M679 450v55l-70 85"
        opacity={smooth(t, e.adenosine, 0.27) * (1 - magnify)}
      />
    </Canvas>
  );
}

function Chair({
  t,
  appear,
  signal,
  sit,
}: {
  t: number;
  appear: number;
  signal: number;
  sit: number;
}) {
  if (appear < 0.53) return null;
  const build = smooth(appear, 0.53, 0.47);
  const cushionDepth = 0.18 + 0.82 * build;
  const legJointY = -34 + 57 * cushionDepth;
  return (
    <g transform={`translate(${chairX} ${chairY})`}>
      <ellipse
        cy="245"
        rx={178 * build}
        ry="30"
        fill="#17393d"
        opacity={0.46 * build}
      />
      <g>
        <g strokeLinecap="round" strokeLinejoin="round">
          <g
            transform={`translate(0 ${legJointY}) scale(1 ${build}) translate(0 -23)`}
          >
            <path
              d="m-107 23-26 199m218-201 39 187"
              stroke="#725744"
              strokeWidth="22"
            />
            <path
              d="M-126 14-153 231m249-215 43 229"
              stroke="#c29462"
              strokeWidth="25"
            />
            <path
              d="m-131 212-3 21m270-8 4 22"
              stroke="#665449"
              strokeWidth="24"
            />
          </g>
          <g transform={`translate(0 -34) scale(1 ${build}) translate(0 34)`}>
            <path
              d="M-117-196-99-55m188-145 19 149"
              stroke="#bb8f5b"
              strokeWidth="18"
            />
            <path
              d="M-156-282q25-48 84-49 95-9 182 12 30 7 31 35l-1 72q-1 27-26 30-122-17-239-1-29 5-30-26Z"
              fill="#24685f"
              stroke="#163f40"
              strokeWidth="6"
            />
            <path
              d="M-155-293q6-29 47-37 107-18 217 7 32 7 33 35l-2 56q0 24-22 25-132-18-244 1-30 4-30-24Z"
              fill="#56a28a"
            />
            <path
              d="M-130-301q92-31 221-5"
              fill="none"
              stroke="#9ac6a7"
              strokeWidth="6"
            />
          </g>
          <g
            transform={`translate(0 ${-34 + sit * 7}) scale(1 ${cushionDepth}) translate(0 34)`}
          >
            <path
              d="M-158-50q16-12 40-14l202-6q24 0 43 11l45 36q16 16 4 32-7 10-29 12L-115 34q-29 1-44-12l-20-19q-16-18 2-33Z"
              fill="#1a5c56"
              stroke="#183f41"
              strokeWidth="6"
            />
            <path
              d="M-158-54q16-9 40-12l202-5q24 0 43 11l44 32q9 9-3 14l-29 7-268 12q-18-1-30-8l-16-11q-11-8-1-18Z"
              fill="#79bd9e"
            />
            <path
              d="m-129-46 208-5"
              fill="none"
              stroke="#b4d8aa"
              strokeWidth="5"
            />
          </g>
        </g>
        {signal > 0.01 ? (
          <g opacity={signal} transform="translate(0 -249)">
            <circle r="29" fill="#b7a6df" />
            <Moon scale={0.6} color="#f4e2fe" />
          </g>
        ) : null}
      </g>
      {signal > 0.01
        ? [0, 1].map((i) => {
            const p = (t * 0.79 + i * 0.5) % 1;
            return (
              <ellipse
                key={i}
                cy="242"
                rx={152 + p * 206}
                ry={24 + p * 32}
                stroke="#c6b3ed"
                strokeWidth={6 - p * 3}
                fill="none"
                opacity={signal * (1 - p) * 0.85}
              />
            );
          })
        : null}
    </g>
  );
}

function leap(
  t: number,
  start: number,
  duration: number,
  from: readonly [number, number],
  to: readonly [number, number],
  height: number,
) {
  const p = smooth(t, start, duration);
  return [
    mix(from[0], to[0], p),
    mix(from[1], to[1], p) - Math.sin(Math.PI * p) * height,
  ] as const;
}

export function Receptor({ t }: { t: number }) {
  const fold = smooth(t, e.seatSoon - 0.12, e.seat - e.seatSoon + 0.12);
  const left = [259, 1238] as const,
    right = [826, 1236] as const,
    seat = [chairX, chairY - 7] as const;
  const release = e.sleepyWord + 0.43;
  const a =
    t < release
      ? leap(t, e.sits - 0.32, e.down - e.sits + 0.32, left, seat, 145)
      : leap(t, release, 0.45, seat, left, 111);
  const c = leap(
    t,
    e.take - 0.12,
    e.occupied - e.take + 0.12,
    right,
    seat,
    175,
  );
  const seated =
    smooth(t, e.down - 0.04, 0.13) * (1 - smooth(t, release - 0.03, 0.14));
  const caffeineSeated = smooth(t, e.occupied - 0.04, 0.12);
  const adenoLand = Math.sin(Math.PI * smooth(t, e.down - 0.01, 0.25));
  const cafLand = Math.sin(Math.PI * smooth(t, e.occupied - 0.01, 0.24));
  const pulse = smooth(t, e.down, 0.12) * (1 - smooth(t, release, 0.27));
  const push =
    1.25 +
    0.14 * smooth(t, e.sits - 0.25, 0.57) -
    0.16 * smooth(t, release, 0.49);
  const label =
    (1 - smooth(t, e.sleepy - 0.5, 0.24)) * smooth(t, e.receptor - 0.08, 0.25);
  return (
    <Canvas>
      <NeuralGround t={t} prefix="receptor" />
      <g transform={`translate(540 979) scale(${push}) translate(-540 -979)`}>
        <path
          d="M-120 1186q255-84 492-13 267 81 493-10 146-56 337-7v779H-120Z"
          fill="#295956"
        />
        <path
          d="M-120 1204q255-84 492-13 267 81 493-10 146-56 337-7"
          fill="none"
          stroke="#608c7d"
          strokeWidth="5"
        />
        <path
          d="M-72 1308q338-48 574 12t646-48"
          stroke="#4c766a"
          strokeWidth="3"
          fill="none"
        />
        <ellipse
          cx="550"
          cy="1272"
          rx="427"
          ry="59"
          fill="#92ae88"
          opacity=".13"
        />
        {fold < 0.53 ? (
          <Pocket
            x={chairX}
            y={chairY - 34}
            spread={1.26}
            flatten={smooth(fold, 0, 0.53)}
          />
        ) : null}
        <ChairSignal
          t={t}
          at={e.down}
          active={pulse}
          visible={smooth(t, e.seat + 0.18, 0.38)}
        />
        <Chair
          t={t}
          appear={fold}
          signal={pulse}
          sit={Math.max(
            adenoLand,
            cafLand,
            Math.sin(Math.PI * smooth(t, e.seat - 0.09, 0.28)),
          )}
        />
        {t >= handoffEnd ? (
          <Token
            kind="adenosine"
            t={t}
            x={a[0]}
            y={a[1] + 4 * adenoLand}
            size={1.43}
            squash={adenoLand}
            seated={seated}
            turn={
              Math.sin(
                Math.PI * smooth(t, e.sits - 0.32, e.down - e.sits + 0.32),
              ) * 8
            }
          />
        ) : null}
        {t >= e.compete - 0.13 ? (
          <Token
            kind="caffeine"
            t={t}
            x={c[0]}
            y={c[1] + cafLand * 4}
            size={1.43}
            squash={cafLand}
            seated={caffeineSeated}
            turn={
              -12 *
              Math.sin(
                Math.PI * smooth(t, e.take - 0.12, e.occupied - e.take + 0.12),
              )
            }
            opacity={smooth(t, e.compete - 0.13, 0.29)}
          />
        ) : null}
      </g>
      <Callout
        x={513}
        y={508}
        text="Adenosine receptor"
        path={`M513 536v41l${mix(58, 40, fold)} ${mix(181, 63, fold)}`}
        color="#d2eccd"
        dark
        opacity={label}
      />
      <Callout
        x={200}
        y={870}
        text="Adenosine"
        path="M196 893v83"
        color="#e8d8ff"
        dark
        opacity={
          smooth(t, e.sleepy - 0.16, 0.21) *
          (1 - smooth(t, e.sits - 0.12, 0.22))
        }
      />
      <Callout
        x={883}
        y={844}
        text="Caffeine"
        path="M883 863v83"
        color="#ffe1a0"
        dark
        opacity={
          smooth(t, e.compete - 0.06, 0.21) *
          (1 - smooth(t, e.take - 0.12, 0.28))
        }
      />
    </Canvas>
  );
}
