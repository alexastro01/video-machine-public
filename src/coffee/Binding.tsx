import {
  Canvas,
  Moon,
  NeuralGround,
  Token,
  e,
  mix,
  smooth,
} from "./Illustration";
import { cubic } from "../beer/graphics";

export const pocketCut = e.blocked - 0.12;
export const clockCut = e.yawn - 0.045;
export const handoffEnd = e.seat + 0.22;
const lamp = { x: 832, y: 669 };
const pocketX = 595,
  footY = 990;
const cs = 1.83,
  as = 1.58;

export function Pocket({
  x,
  y,
  spread = 1,
  flatten = 0,
  opacity = 1,
}: {
  x: number;
  y: number;
  spread?: number;
  flatten?: number;
  opacity?: number;
}) {
  const h = 1 - flatten * 0.92;
  const lip = `M-133 ${-137 * h} C-111 ${-157 * h} -111 ${-113 * h} -95 ${-68 * h} C-63 ${20 * h} 60 ${20 * h} 96 ${-68 * h} C113 ${-107 * h} 108 ${-156 * h} 133 ${-137 * h}`;
  const edge = `M-1400 ${-125 * h}Q-730 ${-219 * h} -386 ${-127 * h}T-133 ${-137 * h} ${lip.slice(lip.indexOf("C"))} Q273 ${-98 * h} 401 ${-129 * h}T1400 ${-148 * h}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${spread} 1)`} opacity={opacity}>
      <g opacity={1 - smooth(flatten, 0.14, 0.71)}>
        <path d={edge + " v1380h-2800Z"} fill="#286659" />
        <path d={edge} fill="none" stroke="#91c7a5" strokeWidth={10} />
      </g>
      <path
        d={lip}
        fill="none"
        stroke="#23534b"
        strokeWidth={34}
        strokeLinecap="round"
      />
      <path
        d={lip}
        fill="none"
        stroke="#7bc6a0"
        strokeWidth={24}
        strokeLinecap="round"
      />
      <path
        d={lip}
        transform="translate(0 -5)"
        fill="none"
        stroke="#c2e1ad"
        strokeWidth={4}
        strokeLinecap="round"
      />
      {[-1, 1].map((side) => (
        <g
          key={side}
          opacity={(1 - flatten) * 0.72}
          transform={`scale(${side} 1)`}
        >
          {Array.from({ length: 10 }, (_, i) => {
            const px = 158 + i * 66,
              py = -105 * h + Math.sin(i * 0.81) * 11;
            return (
              <g
                key={i}
                transform={`translate(${px} ${py}) rotate(${Math.sin(i * 0.84) * 13})`}
              >
                <path
                  d="M-3 10q-8 22-3 37m11-37q6 17 1 34"
                  fill="none"
                  stroke="#53917b"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle r="9" fill="#9dc4a0" />
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

export function LeadAdenosine({ t }: { t: number }) {
  const intro = smooth(t, e.brain - 0.18, 0.5),
    magnify = smooth(t, e.brainWord + 0.08, 0.59);
  const scale = (1.03 + intro * 0.2) * (1 + magnify * 0.23);
  const startX = 538 + (71 + Math.sin(t * 1.3 + 6) * 3) * scale,
    startY = 791 - 42 * scale;
  const a = smooth(
    t,
    e.brainWord - 0.12,
    e.receptor + 0.03 - e.brainWord + 0.12,
  );
  const b = smooth(t, e.receptor + 0.03, handoffEnd - e.receptor - 0.03);
  const [midX, midY] = cubic(
    a,
    [startX, startY],
    [655, 684],
    [513, 617],
    [397, 748],
  );
  const [x, cy] = cubic(
    b,
    [midX, midY],
    [282, 796],
    [167, 972],
    [188.75, 1149.03],
  );
  const size = mix(mix(0.195, 1.32, a), 1.7875, b);
  return (
    <Token
      kind="adenosine"
      x={x}
      y={cy + 86 * size}
      t={t}
      size={size}
      turn={Math.sin(Math.PI * a) * -12 + Math.sin(Math.PI * b) * 8}
      limbs={smooth(t, e.receptor - 0.2, 0.58)}
      opacity={smooth(t, e.adenosine + 0.85, 0.35)}
    />
  );
}

const wireStart = [660, 773] as const,
  wireC1 = [739, 766] as const,
  wireC2 = [735, 650] as const,
  wireEnd = [800, 612] as const;
const wireShape = `M${wireStart.join(" ")}C${wireC1.join(" ")} ${wireC2.join(" ")} ${wireEnd.join(" ")}`;
export function ChairSignal({
  t,
  visible,
  active,
  at,
}: {
  t: number;
  visible: number;
  active: number;
  at: number;
}) {
  const travel = smooth(t, at + 0.03, 0.43);
  const lit = active * smooth(t, at + 0.45, 0.14);
  const [x, y] = cubic(travel, wireStart, wireC1, wireC2, wireEnd);
  return (
    <g opacity={visible}>
      <path
        d={wireShape}
        stroke="#93aba7"
        opacity=".63"
        strokeWidth="5"
        fill="none"
      />
      <path
        d={wireShape}
        pathLength="1"
        stroke="#cca8f4"
        strokeWidth="6"
        strokeDasharray="1"
        strokeDashoffset={1 - travel}
        opacity={active * 0.76}
        fill="none"
      />
      {t >= at && travel < 1 ? (
        <g transform={`translate(${x} ${y})`} opacity={active}>
          <circle r="18" fill="#d5b6ff" opacity=".29" />
          <circle r="8.3" fill="#fff1ff" />
        </g>
      ) : null}
      <SignalLamp x={815} y={591} lit={lit} scale={1} />
    </g>
  );
}

function SignalLamp({
  x,
  y,
  lit,
  scale,
  labelX = 0,
}: {
  x: number;
  y: number;
  lit: number;
  scale: number;
  labelX?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle r="70" fill="#d1b8f3" opacity={lit * 0.22} />
      <circle r="49" fill="#344f55" stroke="#87a39e" strokeWidth="4" />
      <Moon scale={0.85} color="#869b9c" />
      <g opacity={lit}>
        <circle r="49" fill="#a88acb" stroke="#e4cbff" strokeWidth="4" />
        <Moon scale={0.86} color="#fff1cc" />
      </g>
      <text
        x={labelX}
        y="-75"
        textAnchor="middle"
        fill="#e1e8e3"
        fontFamily="DM Sans"
        fontSize="29"
        fontWeight={720}
      >
        Sleep signal
      </text>
    </g>
  );
}

export function BindingCloseup({
  t,
  clear = false,
}: {
  t: number;
  clear?: boolean;
}) {
  const arrive = clear ? 1 : smooth(t, pocketCut, 0.62);
  const x = mix(568.29, pocketX, arrive),
    seatFoot = mix(1035.58, footY, arrive),
    caffeineSize = mix(1.43 * 1.23, cs, arrive);
  const vacant = smooth(t, e.clearsWord - 0.04, 0.86);
  const returns = smooth(t, e.opens + 0.05, e.again + 0.09 - e.opens - 0.05);
  const takeoff = clear ? vacant : 0;
  const [cx, cf] = cubic(
    takeoff,
    [x, seatFoot],
    [x + 16, seatFoot - 156],
    [888, seatFoot - 257],
    [1185, seatFoot - 322],
  );
  const cFade = clear ? 1 - smooth(t, e.clearsWord + 0.48, 0.45) : 1;
  const approach = smooth(t, e.blocked + 0.02, e.denied - e.blocked - 0.02);
  const rebound = smooth(t, e.denied + 0.045, 0.46);
  // The upper-left facet runs from (-65,-118) to (-23,-148) on the
  // amber shape. Bring the round ligand to that facet along its normal.
  const contactX = pocketX - 45.12 * cs,
    contactY = footY - 135.34 * cs;
  const touchX = contactX - 0.581 * 67 * as,
    touchY = contactY - 0.814 * 67 * as;
  let ax: number, ay: number, asize: number;
  if (clear) {
    [ax, ay] = cubic(
      returns,
      [259, 697],
      [307, 607],
      [526, 624],
      [pocketX, footY - 86 * 1.7],
    );
    asize = mix(as, 1.7, returns);
  } else {
    const initialX = mix(124, 245, arrive),
      initialY = mix(638, 701, arrive);
    [ax, ay] = cubic(
      approach,
      [initialX, initialY],
      [282, 642],
      [touchX - 32, touchY - 13],
      [touchX, touchY],
    );
    ax = mix(ax, 259, rebound);
    ay = mix(ay, 697, rebound) - Math.sin(Math.PI * rebound) * 29;
    asize = mix(1.43 * 1.23, as, arrive);
  }
  const compression = clear
    ? Math.sin(Math.PI * smooth(t, e.again + 0.09, 0.25))
    : 0;
  const floor = seatFoot - 14 * caffeineSize + 5;
  const wireFrom = [pocketX + 77, floor + 5] as const,
    w1 = [818, 1009] as const,
    w2 = [706, 756] as const,
    wireTo = [lamp.x - 18, lamp.y + 35] as const;
  const wire = `M${wireFrom.join(" ")}C${w1.join(" ")} ${w2.join(" ")} ${wireTo.join(" ")}`;
  const activeAt = e.again + 0.09;
  const progress = clear ? smooth(t, activeAt, 0.26) : 0;
  const [px, py] = cubic(progress, wireFrom, w1, w2, wireTo);
  const lit = clear ? smooth(t, activeAt + 0.24, 0.11) : 0;
  const closeToClock = clear ? smooth(t, e.yawn - 0.37, 0.31) : 0;
  const followWire = clear ? 0 : smooth(t, e.send - 0.09, 0.52);
  const viewScale = clear
    ? 1.17 + 0.06 * smooth(t, e.opens, 0.36)
    : 1 + 0.31 * arrive + 0.09 * followWire;
  const camera = mix(viewScale, 2.04, closeToClock);
  const aimX = mix(
    clear ? 537 : mix(540, 517, arrive) + followWire * 168,
    lamp.x,
    closeToClock,
  );
  const aimY = mix(
    clear ? 850 : mix(879, 833, arrive) - followWire * 89,
    lamp.y,
    closeToClock,
  );
  const camX = mix(540, 305, closeToClock),
    camY = mix(879, 876, closeToClock);
  const hit = clear ? 0 : Math.sin(Math.PI * smooth(t, e.denied - 0.005, 0.22));
  return (
    <Canvas>
      <NeuralGround
        t={t}
        prefix={clear ? "receptor-clear" : "receptor-block"}
      />
      <g
        transform={`translate(${camX} ${camY}) scale(${camera}) translate(${-aimX} ${-aimY})`}
      >
        <Pocket x={x} y={floor} spread={1.02} />
        <g opacity={arrive * (1 - closeToClock * 0.35)}>
          <path d={wire} fill="none" stroke="#264d50" strokeWidth="14" />
          <path
            d={wire}
            fill="none"
            stroke="#90a9a2"
            strokeWidth="5"
            opacity=".7"
          />
          {[0.24, 0.51, 0.77].map((station) => {
            const [sx, sy] = cubic(station, wireFrom, w1, w2, wireTo);
            return (
              <circle
                key={station}
                cx={sx}
                cy={sy}
                r={6.3}
                fill={progress >= station ? "#f1dbff" : "#859f99"}
                stroke="#314d4e"
                strokeWidth="2"
              />
            );
          })}
          {progress > 0 ? (
            <path
              d={wire}
              pathLength="1"
              fill="none"
              stroke="#d9b5ff"
              strokeWidth="6"
              strokeDasharray="1"
              strokeDashoffset={1 - progress}
            />
          ) : null}
          {progress > 0 && progress < 1 ? (
            <g>
              <circle cx={px} cy={py} r="20" fill="#d6b0fe" opacity=".32" />
              <circle cx={px} cy={py} r="9" fill="#fff1ff" />
            </g>
          ) : null}
        </g>
        <SignalLamp x={lamp.x} y={lamp.y} lit={lit} scale={1.16} labelX={-29} />
        <Token
          kind="caffeine"
          t={t}
          x={cx}
          y={cf}
          size={caffeineSize}
          seated={1 - arrive}
          limbs={1 - arrive}
          turn={clear ? takeoff * 26 : 0}
          opacity={cFade}
        />
        <Token
          kind="adenosine"
          t={t}
          x={ax}
          y={ay + asize * 86}
          size={asize}
          opacity={clear ? 1 : smooth(t, pocketCut + 0.06, 0.3)}
          limbs={0}
          squash={compression}
          surprise={!clear && t >= e.denied && t < e.send + 0.1}
          turn={
            clear
              ? Math.sin(Math.PI * returns) * -9
              : -11 * Math.sin(Math.PI * rebound)
          }
        />
        {hit > 0 ? (
          <g
            transform={`translate(${contactX} ${contactY})`}
            opacity={hit}
            stroke="#ffe5ae"
            strokeWidth="5"
            strokeLinecap="round"
          >
            <path d="m-7-10-11-18m20 11 3-22m7 29 14-16" />
          </g>
        ) : null}
      </g>
    </Canvas>
  );
}
