import type { Hand, Rig } from "./rig";
const ink = "#241f27",
  skin = "#f5b184",
  shadow = "#d98a69",
  fold = "#bd7457";
type HandDrawing = { outline: string; details: string[] };
const hands: Record<Hand, HandDrawing> = {
  point: {
    outline:
      "M-26 7Q-39 -12-35-34Q-34-45-26-48L-23-90Q-23-102-14-103Q-5-103-5-92L-4-47Q7-61 17-53Q24-54 29-44Q38-45 44-34L46-12Q44 11 25 20L18 29H-20Z",
    details: [
      "M-5-47l1 23q1 10 9 9",
      "M12-50l3 23q2 8 9 9",
      "M26-43l3 17q1 8 9 8",
      "M-32-40q12-8 23 12l9 14",
      "M-21-88l11 0",
    ],
  },
  thumb: {
    outline:
      "M-29 8Q-45-11-38-33Q-35-45-24-50Q-15-63-12-86Q-10-100-1-103Q8-105 12-96Q15-81 9-62L7-53Q24-55 34-51Q43-46 39-36Q49-30 43-19Q47-11 40-2Q42 11 26 20L14 28H-21Z",
    details: [
      "M8-51q-2 9-9 17",
      "M12-38q13-2 25 2",
      "M14-23q14-3 26 1",
      "M11-8q15-3 25 0",
      "M-31-29q13 7 15 18",
      "M-7-90q6 2 11 0",
    ],
  },
  palm: {
    outline:
      "M-27 7Q-43-15-37-35L-55-66Q-59-77-52-81Q-46-84-39-75L-22-54L-38-93Q-42-103-35-107Q-28-111-23-101L-4-68L-16-108Q-19-118-11-121Q-2-123 2-110L17-72L11-102Q9-111 16-113Q23-114 27-105L43-66Q50-52 48-38Q49-33 52-31L65-41Q78-50 85-43Q88-37 81-30L57-5Q45 9 24 17L16 29H-18Z",
    details: [
      "M-21-54l8 16",
      "M-4-67l7 18",
      "M17-71l5 17",
      "M-20-21q18-1 34 15",
      "M46-40q-15 6-20 20",
      "M-30-65l8 9",
    ],
  },
  open: {
    outline:
      "M-25 7Q-38-13-35-39L-30-95Q-32-106-24-107Q-16-109-13-96L-6-61L-6-111Q-6-123 3-123Q11-122 12-110L14-63L23-104Q26-114 33-112Q42-111 39-98L32-55L44-82Q49-92 56-89Q64-86 60-74L49-36Q45-29 46-24L61-35Q72-42 79-36Q83-30 75-22L54 0Q40 14 24 19L17 29H-20Z",
    details: [
      "M-28-40q6 10 9 15",
      "M-8-62l2 22",
      "M15-61l-2 21",
      "M32-53l-4 16",
      "M-21-17q18-5 31 7",
      "M45-25q-11 4-17 16",
    ],
  },
  fist: {
    outline:
      "M-29 5Q-43-9-38-35Q-35-47-26-47Q-23-59-11-57Q-4-65 7-60Q18-63 24-53Q36-52 38-41L42-20Q44-3 31 13L18 27H-19Z",
    details: [
      "M-26-46l-2 15q2 10 12 12",
      "M-11-55l1 22q0 9 9 11",
      "M6-57l4 22q2 8 10 8",
      "M23-51l5 17",
      "M-35-24q7-11 17-5l20 15",
    ],
  },
  cover: {
    outline:
      "M-25 13Q-39-10-36-33L-30-101Q-33-111-24-114Q-16-116-13-103L-3-66L-5-117Q-4-127 4-126Q12-126 13-114L16-66L24-107Q26-118 33-115Q41-113 39-101L33-57L46-89Q50-98 56-95Q63-92 59-80L48-40Q45-30 46-25L58-37Q69-45 77-39Q83-33 75-25L57-2Q43 13 24 21L17 32H-18Z",
    details: [
      "M-28-46q1 9 7 17",
      "M-2-68l3 20",
      "M15-65l-1 18",
      "M34-56l-7 21",
      "M-21-14q19-6 35 4",
      "M47-28q-12 4-17 16",
    ],
  },
  pinch: {
    outline:
      "M-27 7Q-40-12-34-36L-45-65Q-48-74-40-77Q-34-79-28-69L-16-52L-28-85Q-32-95-24-98Q-17-101-11-89L-1-64L-7-92Q-9-102-1-104Q7-106 10-95L18-65L31-78Q39-86 45-80L58-64Q64-54 54-51Q49-50 43-59L40-63L27-46Q25-39 31-32Q37-30 47-43Q53-48 59-44Q66-39 60-30L46-12Q35 6 23 16L16 27H-19Z",
    details: [
      "M-12-54l7 13",
      "M2-63l8 19",
      "M18-64l4 12",
      "M26-46q-9 12 0 22",
      "M-18-17q14 1 24 13",
    ],
  },
  press: {
    outline:
      "M-25-7Q-35-23-22-34Q-7-48 15-41L36-30L53-4L72 67Q75 82 64 86Q54 88 49 73L33 38L30 42Q23 50 16 42L6 27Q-1 31-8 22L-21 7Z",
    details: [
      "M13-23q13 0 20 17l12 31",
      "M-3-15q12 5 18 18l9 18",
      "M-15-4l16 21",
      "M55 68q3 8 12 6",
    ],
  },
  slam: {
    outline:
      "M-31 4Q-38-7-29-20Q-18-36-1-30Q14-25 27-10L54 14Q72 25 85 44L98 58L115 65Q127 70 125 79Q123 86 111 85L91 81Q88 91 77 89L57 84Q50 92 39 86L22 77Q15 80 8 73L-7 54Q-16 42-28 29Q-41 15-31 4Z",
    details: [
      "M-8 7q15 6 29 20l26 29q10 13 24 18l20 7",
      "M-15 20q11 10 23 22l21 23q10 13 28 19",
      "M-13 35q14 13 22 29l13 13",
      "M33 24q11 3 18 13m17 19q14 11 27 13",
      "M103 73q7 3 13 3",
    ],
  },
  write: {
    outline:
      "M-26 8Q-37-11-31-29L-21-54Q-15-65-6-59L9-50L22-58Q32-63 38-55L50-36Q54-26 45-22Q38-21 31-32L27-38L18-25Q32-18 45-15Q54-11 50-3Q48 3 37 2L28 2Q24 13 11 24H-18Z",
    details: ["M-8-52l17 13", "M19-25q-11 4-18 16", "M-24-14q12-4 22 8"],
  },
};
export function DrawHand({
  type,
  x,
  y,
  a,
  left = false,
}: {
  type: Hand;
  x: number;
  y: number;
  a: number;
  left?: boolean;
}) {
  const d = hands[type];
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${a}) scale(${left ? -1 : 1} 1)`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {type === "write" && (
        <g transform="rotate(35)">
          <path
            d="M24-119h8v116l-4 15-4-15Z"
            fill="#eca76a"
            stroke={ink}
            strokeWidth="3"
          />
          <path d="M24 -4h8l-4 15Z" fill="#d8c5a5" />
        </g>
      )}
      <path d={d.outline} fill={skin} stroke={ink} strokeWidth="5.2" />
      <path d="M-25 5q17 11 37 8l-5 9-24 2Z" fill={shadow} opacity=".7" />
      {d.details.map((path, i) => (
        <path
          key={i}
          d={path}
          stroke={fold}
          fill="none"
          strokeWidth={i === 0 ? 3 : 2.5}
        />
      ))}
    </g>
  );
}
type V = { x: number; y: number };
function unitNormal(a: V, b: V) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    d = Math.hypot(dx, dy) || 1;
  return { x: -dy / d, y: dx / d };
}
const plus = (p: V, n: V, width: number) => ({
  x: p.x + n.x * width,
  y: p.y + n.y * width,
});
const str = (p: V) => p.x + " " + p.y;
const mix = (a: V, b: V, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
function direction(a: V, b: V) {
  const normal = unitNormal(a, b);
  return { x: normal.y, y: -normal.x };
}
function contour(p: V, axis: V, normal: V, along: number, across: number) {
  return str(plus(plus(p, axis, along), normal, across));
}
export function Arm({ rig, left }: { rig: Rig; left: boolean }) {
  const [ex, ey, wx, wy, ang, hand] = left ? rig.l : rig.r;
  const shoulder = {
    x: left ? 276 : 605,
    y: (left ? 490 : 488) + rig.shoulder,
  };
  const elbow = { x: ex, y: ey };
  const wrist = { x: wx, y: wy };
  const upper = direction(shoulder, elbow),
    fore = direction(elbow, wrist);
  const n1 = unitNormal(shoulder, elbow),
    n2 = unitNormal(elbow, wrist);
  const top = (t: number, along: number, across: number) =>
    contour(mix(shoulder, elbow, t), upper, n1, along, across);
  const low = (t: number, along: number, across: number) =>
    contour(mix(elbow, wrist, t), fore, n2, along, across);
  // Two overlapping cloth cuts share an ink outline. The shoulder cap and
  // elbow keep their volume while the forearm turns through an acute angle.
  const upperCloth = `M ${top(0, -15, 58)}
    C ${top(0.22, 0, 70)} ${top(0.64, 0, 58)} ${top(1, -8, 49)}
    C ${top(1, 50, 47)} ${top(1, 60, -25)} ${top(1, 14, -43)}
    C ${top(0.72, 0, -49)} ${top(0.27, 0, -58)} ${top(0, -8, -61)}
    C ${top(0, -70, -59)} ${top(0, -74, 34)} ${top(0, -15, 58)} Z`;
  const lowerCloth = `M ${low(0, -17, 46)}
    C ${low(0.12, 0, 54)} ${low(0.47, 4, 49)} ${low(0.74, 0, 39)}
    Q ${low(0.8, 0, 1)} ${low(0.74, 0, -38)}
    C ${low(0.5, 0, -41)} ${low(0.23, 0, -48)} ${low(0, -7, -49)}
    C ${low(0, -62, -44)} ${low(0, -63, 32)} ${low(0, -17, 46)} Z`;
  const cuff = `M ${low(0.57, 0, -44)} Q ${low(0.53, 0, 3)} ${low(0.58, 0, 46)}
    Q ${low(0.68, 1, 49)} ${low(0.75, 0, 39)}
    Q ${low(0.79, 0, 3)} ${low(0.75, 0, -38)}
    Q ${low(0.67, -2, -45)} ${low(0.57, 0, -44)} Z`;
  const skinPath = `M ${low(0.62, 0, 32)} Q ${low(0.84, 0, 31)} ${low(1, 11, 21)}
    Q ${low(1, 15, 0)} ${low(1, 9, -23)}
    Q ${low(0.85, 0, -23)} ${low(0.62, 0, -32)} Z`;
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path d={skinPath} fill={skin} stroke={ink} strokeWidth="5" />
      <path
        d={`M ${low(0.69, 0, -29)} Q ${low(0.84, 0, -21)} ${low(1, 6, -19)}
        Q ${low(0.86, 0, -9)} ${low(0.7, 0, -13)} Z`}
        fill={shadow}
      />
      <g fill="#303850" stroke={ink} strokeWidth="6">
        <path d={upperCloth} />
        <path d={lowerCloth} />
      </g>
      <g fill="#303850">
        <path d={upperCloth} />
        <path d={lowerCloth} />
      </g>
      <path
        d={`M ${top(0, -29, 41)} Q ${top(0.13, 0, 61)} ${top(0.6, 0, 49)}
        Q ${top(0.41, 0, 44)} ${top(0.21, 0, 36)} Q ${top(0.1, 0, 40)} ${top(0, -29, 41)} Z`}
        fill="#424d68"
      />
      <path
        d={`M ${top(0.26, 0, -49)} Q ${top(0.66, 0, -47)} ${top(0.96, 0, -37)}
        Q ${top(0.86, 0, -20)} ${top(0.65, 0, -26)} Z`}
        fill="#262c40"
      />
      <path
        d={`M ${low(0.05, 0, -42)} Q ${low(0.3, 0, -41)} ${low(0.59, 0, -34)}
        L ${low(0.62, 0, -11)} Q ${low(0.3, 0, -18)} ${low(0.05, 0, -42)} Z`}
        fill="#232b40"
      />
      <path
        d={`M ${top(0.81, 0, 45)} Q ${top(0.93, 0, 33)} ${top(0.96, 0, 8)}
        M ${low(0.02, 0, 24)} Q ${low(0.18, 0, 35)} ${low(0.39, 0, 31)}
        M ${low(0.24, 0, -41)} Q ${low(0.31, 0, -27)} ${low(0.43, 0, -20)}`}
        fill="none"
        stroke="#222939"
        strokeWidth="4"
      />
      <path d={cuff} fill="#3d4862" stroke={ink} strokeWidth="4" />
      <path
        d={`M ${low(0.7, 0, -32)} Q ${low(0.73, 0, 4)} ${low(0.69, 0, 35)}`}
        fill="none"
        stroke="#59657c"
        strokeWidth="3"
      />
      <DrawHand type={hand} x={wx} y={wy} a={ang} left={left} />
    </g>
  );
}
