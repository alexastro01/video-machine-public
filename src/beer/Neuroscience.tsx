import { AbsoluteFill } from "remotion";
import edit from "../../episodes/beer-feels-good/edit.json";
import { Molecule } from "./Cast";
import { Aperture } from "./Stage";
import {
  Background,
  Brain,
  Canvas,
  Label,
  MiniMug,
  colours as c,
  clamp,
  cubic,
  mix,
  out,
  smooth,
} from "./graphics";

const e = edit.events;
type Point = [number, number];
type Curve = [Point, Point, Point, Point];
const entrance: Curve = [
  [-220, 1190],
  [15, 1280],
  [110, 1045],
  [275, 970],
];
const vessel: Curve = [
  [275, 970],
  [635, 915],
  [376, 640],
  [623, 520],
];
const centreline = `M${entrance[0]}C${entrance[1]} ${entrance[2]} ${entrance[3]}C${vessel[1]} ${vessel[2]} ${vessel[3]}`;

function Blood({ t }: { t: number }) {
  const travel = smooth(t, e.blood - 0.12, e.brainArrival - e.blood + 0.12);
  const [x, y] = cubic(travel, ...vessel);
  const arrival = clamp((t - e.brainArrival) / 0.48);
  const dive = smooth(t, e.signals - 0.67, 0.84);
  const scale = 1 + 0.67 * dive;
  return (
    <AbsoluteFill
      style={{ transform: `scale(${scale})`, transformOrigin: "623px 520px" }}
    >
      <Canvas>
        <path
          d={centreline}
          fill="none"
          stroke="#6e2a58"
          strokeWidth="183"
          strokeLinecap="round"
        />
        <path
          d={centreline}
          fill="none"
          stroke="#ba4465"
          strokeWidth="149"
          strokeLinecap="round"
        />
        <path
          d={centreline}
          fill="none"
          stroke="#d25c72"
          strokeWidth="107"
          strokeLinecap="round"
        />
        {Array.from({ length: 12 }, (_, i) => {
          const q = (((t - e.blood) * 0.21 + i / 12 + 2) % 1) * 2;
          const curve = q < 1 ? entrance : vessel,
            p = q % 1;
          const [px, py] = cubic(p, ...curve);
          const [nx, ny] = cubic(Math.min(1, p + 0.003), ...curve);
          const a = (Math.atan2(ny - py, nx - px) * 180) / Math.PI;
          const side = ((i % 3) - 1) * 25;
          return (
            <g
              key={i}
              transform={`translate(${px} ${py}) rotate(${a}) translate(0 ${side})`}
            >
              <ellipse rx="30" ry="16" fill="#a52c51" />
              <ellipse cy="-2" rx="28" ry="13" fill="#f07883" />
              <ellipse cy="-1" rx="14" ry="5" fill="#c94768" />
            </g>
          );
        })}
        <Brain
          x={625}
          y={476}
          size={1.13}
          glow={smooth(t, e.brainArrival - 0.18, 0.35)}
        />
        <g
          opacity={
            out(t, e.blood + 0.08, 0.22) *
            (1 - smooth(t, e.brainArrival - 0.35, 0.35))
          }
        >
          <path
            d="M214 1152l45-36 20-66"
            fill="none"
            stroke="#f4b559"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <Label x={207} y={1176} text="Alcohol" colour="#95541c" size={45} />
        </g>
      </Canvas>
      <Molecule
        t={t}
        x={x}
        y={y}
        size={mix(365, 267, travel)}
        opacity={1 - smooth(t, e.signals - 0.35, 0.4)}
      />
      <Canvas>
        <circle
          cx="623"
          cy="520"
          r={50 + arrival * 146}
          fill="none"
          stroke="#ffe58c"
          strokeWidth={9 - 6 * arrival}
          opacity={arrival > 0 ? 1 - arrival : 0}
        />
      </Canvas>
    </AbsoluteFill>
  );
}

function SignalBay({
  t,
  y,
  calming,
}: {
  t: number;
  y: number;
  calming: boolean;
}) {
  const shift = smooth(t, calming ? e.boost - 0.38 : e.dampen, 0.61);
  const strength = calming ? mix(0.26, 1, shift) : mix(0.87, 0.16, shift);
  const focus = calming
    ? 1 - 0.4 * smooth(t, e.dampen - 0.13, 0.48)
    : 0.42 + 0.58 * smooth(t, e.dampen - 0.19, 0.48);
  const origin = calming ? e.boost : e.dampen;
  const paint = calming ? "#25dcb3" : "#ffdc69";
  const core = calming ? "#148b89" : "#5558a9";
  const lip = calming ? "#4ce5be" : "#8794ef";
  const [startX, startY]: Point = [416, -13],
    [endX, endY]: Point = [676, 4];
  return (
    <g transform={`translate(0 ${y})`} opacity={focus}>
      <Label
        x={510}
        y={-157}
        size={45}
        colour={calming ? "#097e74" : "#494788"}
        text={calming ? "GABA" : "Glutamate"}
      />
      <path
        d="M-60-91C95-91 167-81 226-111 302-147 384-113 411-65 438-21 420 37 370 59 295 94 278 135 202 118 136 102 98 61-60 87Z"
        fill={core}
      />
      <path
        d="M-35-57C132-49 175-45 243-80 316-115 369-72 378-51"
        fill="none"
        stroke={lip}
        opacity=".66"
        strokeWidth="15"
        strokeLinecap="round"
      />
      {[0, 1, 2, 3].map((i) => (
        <g
          key={i}
          transform={`translate(${269 + i * 31} ${-12 + Math.sin(i * 1.8) * 24})`}
        >
          <circle r="19" fill="#142447" opacity=".36" />
          <circle cx="3" cy="-2" r="9" fill={paint} opacity=".85" />
        </g>
      ))}
      <path
        d="M1170-142C1025-118 941-135 867-145 791-160 720-120 704-67 689-21 737-10 717 27 685 86 748 138 827 136 901 130 952 83 1170 110Z"
        fill={core}
      />
      <path
        d="M1118-98C972-93 905-114 842-109 796-104 765-80 755-56"
        fill="none"
        stroke={lip}
        opacity=".60"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M651-31Q710 2 653 38"
        fill="none"
        stroke={paint}
        strokeWidth="19"
        strokeLinecap="round"
      />
      {Array.from({ length: 5 }, (_, i) => {
        const phase = ((t - origin) * 0.93 + i / 5 + 12) % 1;
        const p = clamp(phase / 0.71);
        const [x, y1] = cubic(
          p,
          [startX, startY],
          [476, -49],
          [597, 46],
          [endX, endY],
        );
        const weight = clamp(strength * 5 - i + 0.65);
        const hit = clamp((phase - 0.71) / 0.29);
        return (
          <g key={i} opacity={weight}>
            {p < 1 ? (
              <circle cx={x} cy={y1} r={12 + 5 * strength} fill={paint} />
            ) : (
              <ellipse
                cx={endX + hit * 58}
                cy={endY}
                rx={17 + hit * 55}
                ry={20 + hit * 47}
                fill="none"
                stroke={paint}
                strokeWidth={9 - 6 * hit}
                opacity={1 - hit}
              />
            )}
          </g>
        );
      })}
      <path
        d="M750 8q44-33 90 0t93 0 97 0"
        fill="none"
        stroke={paint}
        strokeWidth={5 + 7 * strength}
        opacity={strength * 0.7}
        strokeLinecap="round"
      />
    </g>
  );
}

function Signals({ t, dive }: { t: number; dive: number }) {
  const focus = smooth(t, e.dampen - 0.18, 0.7);
  return (
    <AbsoluteFill>
      <Background t={t} />
      <Canvas>
        <g
          transform={`translate(623 520) rotate(${-6 * (1 - dive)}) scale(${mix(0.29, 1, dive)}) translate(-623 -520) translate(0 ${mix(43, -29, focus)})`}
        >
          <SignalBay t={t} calming y={570} />
          <SignalBay t={t} calming={false} y={1090} />
        </g>
      </Canvas>
    </AbsoluteFill>
  );
}

export function Circulation({ t }: { t: number }) {
  const drill = smooth(t, e.signals - 0.43, 0.59);
  return (
    <AbsoluteFill>
      <Background t={t} />
      {drill < 1 ? <Blood t={t} /> : null}
      <Aperture x={623} y={520} p={drill} rim="#e875c7">
        <Signals t={t} dive={drill} />
      </Aperture>
    </AbsoluteFill>
  );
}

const cells: Point[] = [
  [168, 690],
  [436, 448],
  [821, 578],
  [799, 1049],
  [330, 1118],
];
// Each front leaves its upstream cell after that cell receives the signal.
const branches = [
  [0, 1, 0, 0.49],
  [1, 2, 0.52, 0.49],
  [1, 4, 0.57, 0.64],
  [2, 3, 1.04, 0.5],
  [4, 3, 1.25, 0.52],
  [0, 4, 1.49, 0.52],
];
const nodeArrival = [0, 0.49, 1.01, 1.54, 1.21];
function between(a: Point, b: Point, p: number): Point {
  return [mix(a[0], b[0], p), mix(a[1], b[1], p)];
}

function Network({ t, inset }: { t: number; inset: number }) {
  const clock = t - (e.activation - 0.47);
  return (
    <g>
      {branches.map(([a, b, delay, duration], i) => {
        const u = cells[a],
          v = cells[b];
        const controls: Curve = [
          u,
          [mix(u[0], v[0], 0.33) - 52, mix(u[1], v[1], 0.22)],
          [mix(u[0], v[0], 0.69) + 44, mix(u[1], v[1], 0.76)],
          v,
        ];
        const d = `M${u}C${controls[1]} ${controls[2]} ${v}`;
        const front = clamp((clock - delay) / duration);
        const [x, y] = cubic(front, ...controls);
        const left = between(u, controls[1], front);
        const mid = between(controls[1], controls[2], front);
        const drawn = `M${u}C${left} ${between(left, mid, front)} ${x} ${y}`;
        const follow = ((t - e.dopamineName) * 0.9 + i * 0.19 + 10) % 1;
        const [px, py] = cubic(follow, ...controls);
        return (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke="#20778b"
              opacity={1 - inset}
              strokeWidth="33"
              strokeLinecap="round"
            />
            <path
              d={drawn}
              fill="none"
              stroke="#fbd65c"
              strokeWidth={9 + 3 * inset}
              opacity=".8"
            />
            {front > 0 && front < 1 ? (
              <circle cx={x} cy={y} r="22" fill="#fff1a1" />
            ) : null}
            <circle
              cx={px}
              cy={py}
              r="14"
              fill="#ffe780"
              opacity={smooth(t, e.dopamineName, 0.36) * (1 - inset * 0.65)}
            />
          </g>
        );
      })}
      {cells.map(([x, y], i) => {
        const age = clock - nodeArrival[i],
          p = clamp(age / 0.59);
        const bright = out(age, 0, 0.19),
          squash = Math.sin(Math.PI * p) * (1 - p);
        const blink =
          1 -
          0.82 * Math.sin(Math.PI * smooth(t, e.dopamineName + i * 0.17, 0.18));
        return (
          <g
            key={i}
            transform={`translate(${x} ${y}) scale(${1 + 0.13 * squash} ${1 - 0.085 * squash})`}
          >
            {p > 0 && p < 1 ? (
              <circle
                r={70 + 68 * p}
                fill="none"
                stroke="#f9da71"
                strokeWidth="7"
                opacity={1 - p}
              />
            ) : null}
            <path
              d="M-60-38Q-49-79-13-64 14-87 42-59 80-55 69-22 100 5 72 27 69 66 30 58-4 87-29 59-74 69-66 32-96 4-66-16Z"
              fill="#278d9c"
              opacity={1 - inset}
              stroke={c.yellow}
              strokeWidth={9 * bright}
            />
            <circle
              r={32}
              fill="#ffe785"
              stroke="#ab567b"
              strokeWidth="5"
              opacity={inset}
            />
            <g transform={`scale(1 ${blink})`} opacity={1 - inset}>
              <ellipse cx="-20" cy="-3" rx="19" ry="24" fill="#f6efdf" />
              <ellipse cx="18" cy="-3" rx="19" ry="24" fill="#f6efdf" />
              <circle
                cx={-21 + bright * 6}
                cy={-2 + 2 * Math.sin(i)}
                r="9"
                fill="#26304c"
              />
              <circle
                cx={17 + bright * 6}
                cy={-2 + 2 * Math.sin(i)}
                r="9"
                fill="#26304c"
              />
            </g>
          </g>
        );
      })}
    </g>
  );
}

export function Reward({ t }: { t: number }) {
  const pull = smooth(t, e.learn - 0.33, 0.87);
  const orbit = smooth(t, e.again - 0.09, 1.18);
  const angle = Math.PI / 2 - 2 * Math.PI * orbit;
  const mx = 540 + 323 * Math.cos(angle),
    my = 803 + 328 * Math.sin(angle);
  const cue = smooth(t, e.learn + 0.2, 0.47);
  const scale = mix(1, 0.44, pull);
  const bump = Math.sin(Math.PI * clamp((t - (e.again + 1.09)) / 0.31));
  return (
    <AbsoluteFill>
      <Background t={t} />
      <Canvas>
        <g opacity={pull}>
          <Brain
            x={540}
            y={mix(807, 757, pull)}
            size={1.28}
            glow={0.25 + Math.sin(Math.PI * orbit) * 0.65}
          />
        </g>
        <g
          transform={`translate(540 ${mix(790, 739, pull)}) scale(${scale}) translate(-540 -790)`}
          opacity={1 - 0.06 * pull}
        >
          <Network t={t} inset={pull} />
        </g>
        <Label
          x={540}
          y={257}
          size={49}
          text="Dopamine"
          colour="#986516"
          opacity={out(t, e.dopamineName - 0.07, 0.23) * (1 - pull)}
        />
        <g opacity={cue}>
          <ellipse
            cx="540"
            cy="803"
            rx="323"
            ry="328"
            fill="none"
            stroke="#79528e"
            strokeWidth="14"
          />
          <path
            d="M540 1131A323 328 0 0 0 540 475A323 328 0 0 0 540 1131"
            fill="none"
            stroke="#ffdb5e"
            strokeWidth="16"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - orbit}
          />
          <circle cx={mx} cy={my} r="21" fill="#fff0a0" />
          <circle
            cx="540"
            cy="1140"
            r={92 + 4 * bump}
            fill="#513566"
            stroke="#eebe71"
            strokeWidth="5"
          />
          <MiniMug x={540} y={1144 - 10 * bump} scale={0.78 + 0.04 * bump} />
        </g>
      </Canvas>
    </AbsoluteFill>
  );
}
