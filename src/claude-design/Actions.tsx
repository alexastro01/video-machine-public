import type { SceneProps } from "./schema";
import {
  Badge,
  C,
  ease,
  FrameBox,
  Glyph,
  mono,
  pulse,
  smooth,
  Star,
  T,
  tr,
} from "./art";

const arc = (p: number, back: boolean) => {
  const t = Math.PI * p;
  return {
    x: back ? 756 - 432 * p : 324 + 432 * p,
    y: back ? 859 + 61 * Math.sin(t) : 811 - 71 * Math.sin(t),
  };
};
function MovingArrow({
  p,
  back,
  color,
}: {
  p: number;
  back: boolean;
  color: string;
}) {
  const v = arc(p, back),
    ahead = arc(Math.min(0.999, p + 0.008), back),
    behind = arc(Math.max(0, p - 0.008), back);
  const angle =
    (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
  return (
    <g transform={tr(v.x, v.y, 1, angle)}>
      <path
        d="M-26 -13H2v-10l28 23-28 23V13h-28Z"
        fill={color}
        stroke="#21271f"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </g>
  );
}
function EndPoint({ x, model, on }: { x: number; model: boolean; on: number }) {
  return (
    <g transform={tr(x, 834, 1 + on * 0.035)}>
      <path
        d="M-100 -82h174l26 25v118l-22 22h-154l-24-22Z"
        fill="#111914"
        stroke={model ? "#d99b77" : "#8baf98"}
        strokeWidth="3.3"
      />
      <path
        d="M-87 -65h149l23 22v93l-14 15h-133l-25-16Z"
        fill={model ? "#473326" : "#2d4233"}
      />
      {model ? (
        <Star size={46} />
      ) : (
        <Glyph kind="term" x={0} y={0} size={64} color={C.green} />
      )}
      <T x={0} y={135} size={36} anchor="middle">
        {model ? "Claude" : "Computer"}
      </T>
    </g>
  );
}
export function Loop({ f, edit }: { f: number; edit: SceneProps["edit"] }) {
  const q = edit.cues,
    u = edit.ui;
  if (f < q.loop || f >= q.permissions) return null;
  const arrivals = [q.red1, q.red2, q.green];
  const level = arrivals.filter((t) => f >= t).length - 1;
  const editTimes = [q.cmd, q.back + 6, q.again + 9];
  const version = Math.max(0, editTimes.filter((at) => at <= f).length - 1);
  const line = [u.before, u.attempt, u.after][version];
  const times = [
    [q.askRun, q.red1 - 4, false],
    [q.error - 3, q.back + 4, true],
    [q.back + 6, q.red2, false],
    [q.red2 + 2, q.again + 8, true],
    [q.again + 9, q.green, false],
    [q.green + 3, q.permissions - 12, true],
  ] as const;
  const leg = times.find(([s, e]) => f >= s && f <= e);
  const v = leg ? smooth(f, leg[0], Math.max(leg[1] - leg[0], 1)) : 0;
  const good = level === 2;
  const active = level >= 0 ? pulse(f, arrivals[level], 16) : 0;
  return (
    <g
      opacity={ease(f, q.loop, 13)}
      transform={tr(0, (1 - ease(f, q.loop, 13)) * 35)}
    >
      <path
        d="M321 811 Q540 672 759 811"
        stroke="#9b9077"
        strokeWidth="4"
        fill="none"
      />
      <path
        d="M759 859 Q540 978 321 859"
        stroke="#7a9880"
        strokeWidth="3"
        fill="none"
        strokeDasharray="9 8"
      />
      <path
        d="M733 787l23 23-29 2m-381 61-23-15 24-5"
        stroke="#c3cbb5"
        fill="none"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <T x={540} y={693} size={31} font={mono} color={C.gold} anchor="middle">
        tool call
      </T>
      <T x={540} y={987} size={30} font={mono} color={C.green} anchor="middle">
        tool result
      </T>
      <EndPoint x={211} model on={leg && leg[2] ? Math.sin(Math.PI * v) : 0} />
      <EndPoint x={869} model={false} on={active} />
      {leg && (
        <MovingArrow
          p={v}
          back={leg[2]}
          color={leg[2] ? (good ? C.green : C.red) : C.gold}
        />
      )}
      <FrameBox x={90} y={1073} w={900} h={367} fill="#1a221c" edge="#7e8978">
        <Glyph x={46} y={48} kind="term" size={35} color={C.gold} />
        <T x={87} y={63} size={40} font={mono}>
          npm test
        </T>
        {arrivals.map((at, i) => (
          <g key={at}>
            <circle
              cx={744 + 52 * i}
              cy={45}
              r="15"
              fill={f >= at ? (i === 2 ? C.green : C.red) : "#374238"}
            />
            {f >= at && (
              <Glyph
                kind={i === 2 ? "check" : "cross"}
                x={744 + 52 * i}
                y={45}
                size={17}
                color={C.deep}
              />
            )}
          </g>
        ))}
        <path d="M24 91h851" stroke="#596657" strokeWidth="2" />
        <T x={37} y={159} size={45} font={mono} color={C.light}>
          {u.call}
        </T>
        <T x={41} y={224} size={27} color={C.dim} font={mono}>
          expected
        </T>
        <T x={317} y={224} size={27} color={C.dim} font={mono}>
          received
        </T>
        <T x={40} y={320} size={80} font={mono} color={C.light}>
          {u.expected}
        </T>
        <g transform={tr(317, 320, 1 + 0.085 * active)}>
          <T
            x={0}
            y={0}
            size={79}
            font={mono}
            color={level < 0 ? C.dim : good ? C.green : C.red}
          >
            {level < 0 ? "…" : u.outputs[level]}
          </T>
        </g>
        {level >= 0 ? (
          <g transform={tr(686, 245, 1 + 0.08 * active, -3)}>
            <Badge
              x={0}
              y={0}
              w={166}
              text={good ? "PASS" : "FAIL"}
              good={good}
            />
          </g>
        ) : null}
      </FrameBox>
      <g
        opacity={ease(f, q.cmd, 11)}
        transform={tr(0, 7 * (1 - ease(f, editTimes[version], 9)))}
      >
        <Glyph kind="file" x={115} y={1488} size={31} color={C.dim} />
        <T x={148} y={1499} size={30} font={mono} color={C.dim}>
          {version ? "Edit" : "Read"} · {u.file}
        </T>
        <T
          x={107}
          y={1560}
          size={40}
          font={mono}
          color={version ? C.green : C.paper}
        >
          {line}
        </T>
      </g>
    </g>
  );
}
export function Permission({
  f,
  edit,
}: {
  f: number;
  edit: SceneProps["edit"];
}) {
  const q = edit.cues,
    u = edit.ui;
  if (f < q.permissions || f >= q.memory) return null;
  const arrived = ease(f, q.permissions, 15),
    dialog = ease(f, q.risky - 18, 16),
    denied = f >= q.no;
  const j = pulse(f, q.no, 8);
  return (
    <g opacity={arrived} transform={tr(j * 2, (1 - arrived) * 33 + j * 4)}>
      <FrameBox x={91} y={640} w={898} h={392} fill="#26251f" edge="#b19c79">
        <Glyph kind="lock" x={51} y={49} size={37} color={C.gold} />
        <T x={93} y={63} size={39}>
          Tool permission
        </T>
        <T x={849} y={61} size={26} color="#c5beaa" font={mono} anchor="end">
          Default mode
        </T>
        <path d="M26 94h844" stroke="#716a54" strokeWidth="2" />
        <T x={42} y={166} size={28} font={mono} color="#b2b4a7">
          Bash
        </T>
        <T x={42} y={240} size={55} font={mono} color={C.light}>
          {u.permission.slice(
            0,
            Math.max(6, Math.ceil(u.permission.length * dialog)),
          )}
        </T>
        <g opacity={0.3 + 0.7 * dialog}>
          <rect
            x="38"
            y="278"
            width="346"
            height="75"
            rx="11"
            fill="#33372d"
            stroke="#7a816b"
            strokeWidth="2"
          />
          <T x={211} y={329} size={38} color="#c9cbb8" anchor="middle">
            Allow
          </T>
          <g transform={tr(0, j * 5)}>
            <rect
              x="414"
              y="278"
              width="439"
              height="75"
              rx="11"
              fill={denied ? "#b4dfab" : "#f0ad83"}
              stroke={denied ? "#c9eac2" : "#ffd2aa"}
              strokeWidth="2"
            />
            {denied && (
              <Glyph kind="check" x={594} y={317} size={26} color={C.ink} />
            )}
            <T
              x={denied ? 664 : 634}
              y={330}
              size={41}
              color={C.ink}
              anchor="middle"
              weight={820}
            >
              No
            </T>
          </g>
        </g>
      </FrameBox>
      <g
        opacity={ease(f, q.permissions + 5, 12) * (1 - ease(f, q.no - 56, 17))}
      >
        <Glyph kind="term" x={144} y={1152} size={32} color={C.clay} />
        <T x={186} y={1166} size={34} font={mono} color="#c5cab9">
          Awaiting permission
        </T>
        <path d="M99 1210h872" stroke="#526053" strokeDasharray="5 9" />
      </g>
      {denied && (
        <g opacity={ease(f, q.no, 8)}>
          <T
            x={540}
            y={1590}
            size={33}
            color={C.green}
            font={mono}
            anchor="middle"
          >
            Command denied
          </T>
        </g>
      )}
    </g>
  );
}
