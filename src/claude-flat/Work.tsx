import {
  bump,
  Burst,
  Card,
  ease,
  Icon,
  mono,
  P,
  smooth,
  Star,
  T,
  tr,
  unit,
  type Shot,
} from "./art";
export function Tests({ f, edit }: Shot) {
  const q = edit.cues,
    u = edit.ui,
    runs = [q.red1, q.red2, q.green],
    version = f >= q.again + 6 ? 2 : f >= q.back + 5 ? 1 : 0;
  const index = runs.filter((t) => f >= t).length - 1,
    pass = index === 2,
    dash = 1.4 * f;
  const journeys = [
    [q.askRun, q.red1 - 4, 0],
    [q.error - 2, q.back + 2, 1],
    [q.back + 4, q.red2 - 1, 0],
    [q.red2 + 2, q.again + 5, 1],
    [q.again + 6, q.green - 1, 0],
    [q.green, q.permissions - 4, 1],
  ];
  const lane = journeys.find(([s, e]) => s <= f && e >= f);
  const pulse = index >= 0 ? bump(f, runs[index], 14) : 0;
  return (
    <Card name="Agent loop" icon="cycle">
      <g transform={tr(39, 118)}>
        <rect
          width="160"
          height="126"
          rx="18"
          fill={P.inset}
          stroke={P.edge}
          strokeWidth="2.5"
        />
        <Star x={81} y={42} r={25} />
        <T x={80} y={101} anchor="middle" size={30}>
          Claude
        </T>
        <rect
          x="662"
          width="164"
          height="126"
          rx="18"
          fill={P.inset}
          stroke={P.edge}
          strokeWidth="2.5"
        />
        <Icon kind="pc" x={742} y={42} r={25} color={P.blue} />
        <T x={744} y={101} anchor="middle" size={30}>
          Computer
        </T>
        <path
          d="M177 48 Q411 -14 644 48l-15-13m15 13-20 4"
          fill="none"
          stroke={P.orange}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M643 83Q412 144 178 83"
          fill="none"
          stroke={P.muted}
          strokeWidth="3"
          strokeDasharray="8 9"
          strokeDashoffset={-dash}
        />
        <path
          d="M197 81l-19 2 14 12"
          fill="none"
          stroke={P.muted}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <T
          x={412}
          y={14}
          size={26}
          font={mono}
          color={P.orange}
          anchor="middle"
        >
          tool call
        </T>
        <T
          x={412}
          y={148}
          size={26}
          font={mono}
          color={P.muted}
          anchor="middle"
        >
          tool result
        </T>
        {lane &&
          (() => {
            const [s, e, back] = lane,
              t = smooth(f, s, e - s),
              x = back ? 642 - 466 * t : 177 + 466 * t,
              y = back
                ? 82 + 30 * Math.sin(t * Math.PI)
                : 48 - 30 * Math.sin(t * Math.PI);
            return (
              <g transform={tr(x, y)}>
                <circle
                  r="15"
                  fill={back ? (pass ? P.green : P.red) : P.orange}
                />
                <path
                  d={back ? "M4-5l-5 5 5 5" : "M-3-5l5 5-5 5"}
                  fill="none"
                  stroke={P.bg}
                  strokeWidth="3.6"
                />
              </g>
            );
          })()}
      </g>
      <rect
        x="39"
        y="287"
        width="828"
        height="153"
        rx="16"
        fill={P.inset}
        stroke={index < 0 ? P.soft : pass ? "#4f956c" : "#956266"}
        strokeWidth="3"
      />
      <T x={63} y={337} size={37} font={mono} color={P.text}>
        $ npm test
      </T>
      {runs.map((at, i) => (
        <g key={at}>
          <circle
            cx={735 + i * 48}
            cy="322"
            r="14"
            fill={f < at ? P.soft : i === 2 ? P.green : P.red}
          />
          {f >= at && (
            <Icon
              kind={i === 2 ? "check" : "x"}
              x={735 + i * 48}
              y={322}
              r={8}
              color={P.bg}
            />
          )}
        </g>
      ))}
      <T x={64} y={401} size={36} font={mono} color={P.muted}>
        expected 5
      </T>
      <T x={349} y={401} size={36} font={mono} color={P.muted}>
        got
      </T>
      <g transform={`translate(444 408) scale(${1 + 0.13 * pulse})`}>
        <T
          x={0}
          y={0}
          size={63}
          weight={830}
          font={mono}
          color={index < 0 ? P.muted : pass ? P.green : P.red}
        >
          {index < 0 ? "…" : u.outputs[index]}
        </T>
      </g>
      {index >= 0 && (
        <g>
          <rect
            x="664"
            y="355"
            width="168"
            height="59"
            rx="13"
            fill={pass ? P.dimGreen : "#4c3035"}
          />
          <T
            x={747}
            y={396}
            anchor="middle"
            size={35}
            weight={820}
            color={pass ? P.green : P.red}
          >
            {pass ? "PASS ✓" : "FAIL ×"}
          </T>
        </g>
      )}
      <g opacity={ease(f, q.cmd - 9, 10)}>
        <Icon kind="code" x={60} y={493} r={15} color={P.muted} />
        <T
          x={96}
          y={508}
          size={39}
          font={mono}
          ls={-1.3}
          color={version ? P.orange : P.text}
        >
          {[u.before, u.attempt, u.after][version]}
        </T>
      </g>
      <Burst f={f} at={q.green} x={749} y={383} r={73} span={26} />
    </Card>
  );
}
export function Permission({ f, edit }: Shot) {
  const q = edit.cues,
    current = f >= q.no,
    a = ease(f, q.permissions + 5, 18),
    show = ease(f, q.risky - 24, 16);
  const hit = bump(f, q.no, 7);
  return (
    <Card name="Tool permission" icon="lock">
      <g transform={tr(40, 133)}>
        <rect width="827" height="70" rx="11" fill={P.inset} />
        <Icon x={34} y={35} kind="term" r={15} />
        <T x={73} y={49} size={32} font={mono} color={P.muted}>
          Bash
        </T>
        <T x={794} y={46} size={28} color={P.muted} anchor="end">
          Default mode
        </T>
        <g opacity={a}>
          <T x={-2} y={177} size={79} font={mono} weight={750} ls={-3}>
            {f < q.risky - 24
              ? "Allow"
              : edit.ui.permission.slice(
                  0,
                  5 + Math.ceil(show * (edit.ui.permission.length - 5)),
                )}
          </T>
          {show < 1 && (
            <path
              d={`M${235 + 330 * show} 120v61`}
              stroke={P.orange}
              strokeWidth="5"
            />
          )}
        </g>
        <g transform={tr(0, 218)}>
          <rect
            width="307"
            height="95"
            rx="16"
            stroke={P.edge}
            strokeWidth="3"
            fill={P.raised}
          />
          <T x={155} y={63} anchor="middle" size={43} color={P.muted}>
            Allow
          </T>
          <g transform={tr(338, 6 * hit)}>
            <rect
              width="489"
              height="95"
              rx="16"
              fill={current ? P.green : P.orange}
            />
            <T
              x={245}
              y={64}
              size={50}
              anchor="middle"
              weight={840}
              color={P.inset}
            >
              {current ? "No ✓" : "No"}
            </T>
          </g>
        </g>
        <g transform={tr(0, 362)}>
          <circle cx="12" cy="-9" r="8" fill={current ? P.green : P.orange} />
          <T
            x={38}
            y={4}
            font={mono}
            size={34}
            color={current ? P.green : P.muted}
          >
            {current ? "Command denied" : "Awaiting permission"}
          </T>
        </g>
      </g>
    </Card>
  );
}
function typed(text: string, f: number, at: number, span: number) {
  return text.slice(0, Math.ceil(text.length * unit(f, at, span)));
}
export function Notes({ f, edit }: Shot) {
  const q = edit.cues,
    incoming = smooth(f, q.itsNote - 2, 21),
    op = ease(f, q.fresh - 5, 13);
  const x = 40,
    w = 825 - 435 * incoming;
  return (
    <Card name="New session" icon="note">
      <g transform={tr(x, 125)}>
        <rect
          width={w}
          height="377"
          rx="17"
          fill={P.inset}
          stroke="#776751"
          strokeWidth="2.5"
        />
        <Icon kind="file" x={35} y={45} r={16} />
        <T x={70} y={59} font={mono} size={42} weight={760}>
          CLAUDE.md
        </T>
        <path d={`M22 86h${w - 46}`} stroke={P.soft} strokeWidth="2" />
        <T x={24} y={143} size={31} font={mono} color={P.muted}>
          {typed("# Tests", f, q.memory + 10, 22)}
        </T>
        <T x={24} y={211} size={38} font={mono} color={P.text}>
          {typed(edit.ui.projectNote, f, q.fresh, 31)}
        </T>
        <T x={24} y={275} size={34} font={mono} color={P.text}>
          {typed("Check failures.", f, q.yourNote - 23, 29)}
        </T>
        <g opacity={op}>
          <T x={24} y={341} color={P.orange} size={29}>
            Project instructions
          </T>
        </g>
      </g>
      {incoming > 0 && (
        <g
          opacity={ease(f, q.itsNote - 2, 7)}
          transform={tr(978 - 523 * incoming, 125 + 9 * (1 - incoming))}
        >
          <rect
            width="411"
            height="377"
            rx="17"
            fill="#292d35"
            stroke={P.edge}
            strokeWidth="3"
          />
          <Star x={36} y={45} r={19} />
          <T x={72} y={58} size={41} weight={750}>
            auto memory
          </T>
          <path d="M23 86h363" stroke={P.edge} strokeWidth="2" />
          <T x={24} y={147} size={38} color={P.orange} font={mono}>
            MEMORY.md
          </T>
          <T x={24} y={218} size={36} font={mono}>
            {typed("Inputs can", f, q.itsNote + 9, 18)}
          </T>
          <T x={24} y={271} size={36} font={mono}>
            {typed("be strings.", f, q.itsNote + 23, 23)}
          </T>
          <T x={24} y={341} color={P.muted} size={29}>
            Written by Claude
          </T>
        </g>
      )}
    </Card>
  );
}
export function History({ f, edit }: Shot) {
  const q = edit.cues,
    rows = [
      "fix this bug",
      "Read  src/math.js",
      "Edit  return line",
      "npm test   →   5",
    ],
    fold = smooth(f, q.summarize - 1, 24),
    next = ease(f, q.keep, 14);
  return (
    <Card name="Conversation" icon="cycle">
      {rows.map((row, i) => {
        const revealed = ease(f, q.history - 5 + i * 6, 15),
          y = 114 + i * 84 * (1 - fold) + 38 * fold;
        return (
          <g
            key={row}
            opacity={revealed * (1 - ease(f, q.summarize + 12 + i * 2, 11))}
            transform={tr(40, y + (1 - revealed) * 18)}
          >
            <rect
              width="827"
              height="70"
              rx="11"
              fill={i === 0 ? P.dimOrange : P.inset}
              stroke={i === 0 ? "#825b44" : P.soft}
              strokeWidth="2"
            />
            <Icon
              x={37}
              y={35}
              r={15}
              kind={
                i === 0 ? "term" : i === 1 ? "file" : i === 2 ? "code" : "check"
              }
              color={i === 0 ? P.orange : P.muted}
            />
            <T x={79} y={49} size={36} font={mono}>
              {row}
            </T>
          </g>
        );
      })}
      <g
        opacity={ease(f, q.summarize + 10, 14)}
        transform={tr(39, 145 + 26 * (1 - fold))}
      >
        <rect
          width="827"
          height="167"
          rx="15"
          fill={P.dimOrange}
          stroke={P.orange}
          strokeWidth="3"
        />
        <Icon kind="note" x={39} y={45} r={17} />
        <T x={76} y={57} size={32} color={P.orange}>
          Summary
        </T>
        <T x={32} y={125} size={46} weight={720}>
          Fixed add(). Test passes.
        </T>
      </g>
      <g opacity={next} transform={tr(40, 406 + 20 * (1 - next))}>
        <Icon kind="term" x={26} y={12} r={18} />
        <T x={68} y={27} size={43} font={mono}>
          Next turn
        </T>
        <path d="M340-9v46" stroke={P.orange} strokeWidth="6" />
      </g>
    </Card>
  );
}
