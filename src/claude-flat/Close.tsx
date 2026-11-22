import {
  bump,
  Card,
  ease,
  Icon,
  mono,
  P,
  smooth,
  Star,
  T,
  tr,
  type Shot,
} from "./art";
const nodes = [
  { x: 452, y: 161, name: "Read", kind: "file" },
  { x: 722, y: 316, name: "Act", kind: "term" },
  { x: 452, y: 466, name: "Check", kind: "check" },
  { x: 184, y: 316, name: "Repeat", kind: "cycle" },
] as const;
export function Recap({ f, edit }: Shot) {
  const q = edit.cues,
    steps = [q.stepRead, q.stepAct, q.stepCheck, q.stepRepeat],
    now = steps.filter((v) => v <= f).length - 1;
  return (
    <Card name="Claude Code is a loop" icon="cycle">
      <ellipse
        cx="452"
        cy="314"
        rx="269"
        ry="151"
        stroke="#6c7076"
        fill="none"
        strokeWidth="4"
      />
      {[
        [622, 196, 33],
        [639, 413, 138],
        [274, 431, 211],
        [258, 210, 321],
      ].map(([x, y, a]) => (
        <path
          key={a}
          d="M-10-8l12 8-12 8"
          transform={`translate(${x} ${y}) rotate(${a})`}
          fill="none"
          stroke={P.orange}
          strokeWidth="5"
          strokeLinejoin="round"
        />
      ))}
      <g transform={tr(452, 312, 1 + 0.07 * bump(f, q.loopWord, 18))}>
        <circle r="65" fill={P.dimOrange} stroke="#86604c" strokeWidth="3" />
        <Star x={0} y={0} r={41} />
      </g>
      {nodes.map(({ x, y, name, kind }, i) => {
        const active = now === i,
          lit = now >= i;
        return (
          <g key={name} transform={tr(x, y, 1 + 0.1 * bump(f, steps[i], 12))}>
            <rect
              x="-99"
              y="-40"
              width="198"
              height="83"
              rx="21"
              fill={active ? P.orange : lit ? P.dimOrange : P.inset}
              stroke={lit ? P.orange : P.edge}
              strokeWidth="3"
            />
            <Icon
              kind={kind}
              x={-61}
              y={1}
              r={14}
              color={active ? P.bg : P.orange}
            />
            <T
              x={20}
              y={15}
              size={35}
              color={active ? P.inset : P.text}
              anchor="middle"
            >
              {name}
            </T>
          </g>
        );
      })}
    </Card>
  );
}
export function Finish({ f, edit, flat }: Shot) {
  const q = edit.cues,
    u = edit.ui,
    ready = ease(f, q.working - 2, 10),
    send = smooth(f, q.send - 4, 18),
    arrival = flat.ends[flat.ends.length - 1] - 9,
    travel = smooth(f, q.send + 8, arrival - q.send - 8),
    delivered = f >= arrival;
  return (
    <Card name="~/project" icon="claude">
      <g transform={tr(40, 125)}>
        <rect
          width="828"
          height="90"
          rx="14"
          fill={P.inset}
          stroke={P.edge}
          strokeWidth="2"
        />
        <Icon kind="term" x={40} y={45} r={18} />
        <T x={85} y={64} font={mono} size={52}>
          {u.prompt}
        </T>
        <g transform={tr(0, 135)}>
          <Icon kind="file" x={17} y={-4} r={15} color={P.muted} />
          <T x={53} y={8} size={35} font={mono} color={P.muted}>
            {u.file}
          </T>
          <T x={0} y={63} size={38} color={P.red} font={mono}>
            − {u.before}
          </T>
          <g opacity={ease(f, q.sentence - 8, 18)}>
            <T x={0} y={119} font={mono} size={38} color={P.green} ls={-1.2}>
              + {u.after}
            </T>
          </g>
        </g>
        <g opacity={ready * (1 - send)} transform={tr(0, 318)}>
          <rect width="828" height="68" rx="13" fill={P.dimGreen} />
          <Icon kind="check" x={35} y={34} r={15} color={P.green} />
          <T x={73} y={47} font={mono} size={37} color={P.green}>
            {u.call} → 5
          </T>
          <T x={804} y={46} size={31} color={P.green} anchor="end">
            test passed
          </T>
        </g>
        <g opacity={send} transform={tr(0, 315)}>
          <path
            d="M93 27C283 -13 539 65 734 18"
            fill="none"
            stroke={P.muted}
            strokeWidth="3"
            strokeDasharray="7 9"
            strokeDashoffset={-0.65 * (f - q.send)}
          />
          <circle
            cx="80"
            cy="28"
            r="19"
            fill={P.raised}
            stroke={P.edge}
            strokeWidth="3"
          />
          <circle
            cx="733"
            cy="19"
            r={22 + 8 * bump(f, arrival, 14)}
            fill={delivered ? P.dimGreen : P.raised}
            stroke={delivered ? P.green : P.edge}
            strokeWidth="3"
          />
          <g
            transform={`translate(${82 + 651 * travel} ${26 - 10 * travel - 27 * Math.sin(Math.PI * travel)}) rotate(${-13 * Math.sin(travel * Math.PI)})`}
          >
            <rect
              x="-31"
              y="-23"
              width="63"
              height="46"
              rx="8"
              fill={delivered ? P.green : P.orange}
              stroke={P.inset}
              strokeWidth="3"
            />
            <Icon
              kind={delivered ? "check" : "send"}
              x={0}
              y={0}
              r={13}
              color={P.inset}
            />
          </g>
          <T x={78} y={80} size={31} color={P.muted} anchor="middle">
            You
          </T>
          <T
            x={736}
            y={80}
            size={31}
            color={delivered ? P.green : P.muted}
            anchor="middle"
          >
            Dev friend
          </T>
        </g>
      </g>
    </Card>
  );
}
