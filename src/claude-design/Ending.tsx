import {
  Badge,
  C,
  ease,
  FrameBox,
  Glyph,
  k,
  mono,
  pulse,
  smooth,
  Star,
  T,
  tr,
} from "./art";
import type { SceneProps } from "./schema";

const points = [
  { x: 540, y: 678, name: "Read", icon: "file" },
  { x: 825, y: 976, name: "Act", icon: "term" },
  { x: 540, y: 1290, name: "Check", icon: "check" },
  { x: 255, y: 976, name: "Repeat", icon: "loop" },
] as const;

export function Recap({ f, edit }: SceneProps) {
  const q = edit.cues;
  if (f < q.recap || f >= q.payoff) return null;
  const enter = ease(f, q.recap, 15);
  const starts = [q.stepRead, q.stepAct, q.stepCheck, q.stepRepeat];
  const current = starts.filter((v) => v <= f).length - 1;
  return (
    <g opacity={enter} transform={tr(0, (1 - enter) * 27)}>
      <ellipse
        cx="540"
        cy="989"
        rx="285"
        ry="307"
        stroke="#6c806a"
        fill="none"
        strokeWidth="7"
      />
      <ellipse
        cx="540"
        cy="989"
        rx="253"
        ry="274"
        stroke="#65735e"
        fill="none"
        strokeWidth="2"
        strokeDasharray="5 11"
      />
      {[
        [755, 786, 48],
        [763, 1184, 140],
        [328, 1194, 224],
        [315, 794, 314],
      ].map(([x, y, a]) => (
        <path
          key={a}
          d="M-9 -10l14 10-14 10"
          transform={tr(x, y, 1, a)}
          fill="none"
          stroke={C.gold}
          strokeWidth="5"
          strokeLinejoin="round"
        />
      ))}
      <g transform={tr(540, 976, 1 + 0.05 * pulse(f, q.loopWord, 22))}>
        <path
          d="M-94 -73l66-38h96l38 46v110l-49 49h-94l-57-49z"
          fill="url(#pcb)"
          stroke="#8ea085"
          strokeWidth="3"
        />
        <Star size={56} />
        <T x={0} y={155} size={36} anchor="middle" color={C.paper}>
          Claude Code
        </T>
      </g>
      {points.map(({ x, y, name, icon }, i) => {
        const hit = f >= starts[i],
          selected = current === i;
        return (
          <g
            key={name}
            transform={tr(x, y, 1 + 0.07 * pulse(f, starts[i], 14))}
          >
            <rect
              x="-114"
              y="-66"
              width="228"
              height="135"
              rx="26"
              stroke={selected ? "#ffd5a8" : hit ? "#a1b293" : "#8b9784"}
              strokeWidth={selected ? 5 : 3}
              fill={selected ? "#916047" : hit ? "#334a36" : "#28332a"}
            />
            <Glyph
              kind={icon}
              x={0}
              y={-19}
              size={38}
              color={selected ? "#ffdbb5" : hit ? C.green : C.dim}
            />
            <T x={0} y={47} size={44} anchor="middle" color={C.light}>
              {name}
            </T>
          </g>
        );
      })}
    </g>
  );
}

export function Finish({ f, edit }: SceneProps) {
  const q = edit.cues,
    u = edit.ui;
  if (f < q.payoff) return null;
  const enter = ease(f, q.payoff, 14),
    typed = ease(f, q.payoff + 1, 24),
    green = ease(f, q.working - 5, 14);
  const attach = ease(f, q.send + 3, 19),
    travel = smooth(f, q.friend, 45);
  const dest = ease(f, q.friend + 32, 15);
  return (
    <g opacity={enter} transform={tr(0, (1 - enter) * 21 - 44 * attach)}>
      <FrameBox x={96} y={640} w={888} h={608} fill="#1c251e" edge="#84917e">
        <Star x={53} y={54} size={26} />
        <T x={106} y={69} size={43}>
          Claude Code
        </T>
        <path d="M27 101h834" stroke="#63705f" strokeWidth="2" />
        <Glyph x={56} y={163} kind="term" size={37} />
        <T x={101} y={182} font={mono} size={50} color={C.light}>
          {u.prompt.slice(0, Math.ceil(typed * u.prompt.length))}
        </T>
        <g opacity={ease(f, q.sentence - 9, 18)}>
          <path
            d="M29 234h834"
            stroke="#63705f"
            strokeWidth="2"
            strokeDasharray="7 8"
          />
          <Glyph kind="file" x={56} y={294} size={36} color={C.dim} />
          <T x={99} y={311} size={39} font={mono} color={C.paper}>
            {u.file}
          </T>
          <T x={42} y={389} size={37} font={mono} color={C.red}>
            − {u.before}
          </T>
          <g opacity={green}>
            <T x={42} y={450} size={37} font={mono} color={C.green}>
              + {u.after}
            </T>
          </g>
        </g>
        <g opacity={green} transform={tr(0, (1 - green) * 12)}>
          <T x={43} y={555} size={41} font={mono} color={C.light}>
            {u.call} → {u.expected}
          </T>
          <Badge x={623} y={504} w={224} text="test passed" good />
        </g>
      </FrameBox>
      <g opacity={attach} transform={tr(0, 27 * (1 - attach))}>
        <path
          d="M191 1421 C408 1359 623 1460 836 1376"
          fill="none"
          stroke="#73866f"
          strokeWidth="3"
          strokeDasharray="7 10"
        />
        <g
          transform={tr(
            189 + 643 * travel,
            1420 - 48 * travel - 83 * Math.sin(Math.PI * travel),
            1 - 0.22 * travel,
            -12 + 9 * travel,
          )}
        >
          <path
            d="M-58 -38h91l23 22v66H-58z"
            fill="#253d2d"
            stroke="#9cc298"
            strokeWidth="3"
          />
          <path
            d="M33 -38v22h23"
            fill="none"
            stroke="#9cc298"
            strokeWidth="2.5"
          />
          <Glyph
            x={-1}
            y={7}
            kind={dest > 0.55 ? "check" : "send"}
            size={46}
            color={C.green}
          />
        </g>
        <T x={177} y={1533} size={32} font={mono} color={C.dim} anchor="middle">
          You
        </T>
        <T
          x={846}
          y={1533}
          size={32}
          font={mono}
          color={dest > 0.3 ? C.green : C.dim}
          anchor="middle"
        >
          Dev friend
        </T>
        <circle
          cx="840"
          cy="1376"
          r={69 + 19 * k(f, q.friend + 35, 26)}
          stroke={C.green}
          fill="none"
          strokeWidth="3"
          opacity={pulse(f, q.friend + 35, 26)}
        />
      </g>
    </g>
  );
}
