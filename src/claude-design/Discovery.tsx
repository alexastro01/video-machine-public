import type { SceneProps } from "./schema";
import {
  Badge,
  C,
  Chip,
  ease,
  FrameBox,
  Glyph,
  k,
  mono,
  pulse,
  Star,
  T,
  tr,
} from "./art";

export function Opening({ f, edit }: { f: number; edit: SceneProps["edit"] }) {
  const q = edit.cues;
  if (f >= q.model + 8) return null;
  const tilt = ease(f, 0, 17);
  const separation = ease(f, 8, 39);
  const gap = 20 + 79 * separation;
  const rise = 1 - ease(f, q.model - 3, 11);
  const names = ["Context", "Loop", "Permissions", "Memory"];
  const accents = [C.clay, C.gold, C.green, "#a4bed9"];
  return (
    <g opacity={rise} transform={tr(0, (1 - rise) * -44)}>
      <ellipse
        cx="436"
        cy="1240"
        rx={274 + separation * 44}
        ry="33"
        fill="#050a07"
        opacity=".32"
      />
      {[3, 2, 1, 0].map((i) => {
        const y = 912 + (i - 1.5) * gap + 55 * (1 - separation);
        const x = 453 - 31 * separation + 66 * (1 - tilt);
        const show = ease(f, 19 + 4 * i, 12);
        return (
          <g key={i}>
            <Chip
              x={x}
              y={y}
              w={475 + 123 * tilt}
              d={365 - 201 * tilt}
              h={33}
              lid={i === 0}
              accent={accents[i]}
              mark
            />
            <g opacity={show}>
              <path
                d={"M" + (x + 229) + " " + (y + 27) + "l42 -14h48"}
                stroke={accents[i]}
                fill="none"
                strokeWidth="2.5"
              />
              <circle cx={x + 228} cy={y + 27} r="4" fill={accents[i]} />
              <T
                x={x + 329}
                y={y + 22}
                size={33}
                color={C.paper}
                font={mono}
                weight={600}
              >
                {names[i]}
              </T>
            </g>
          </g>
        );
      })}
      <g transform={tr(0, 15 * (1 - ease(f, 1, 18)))}>
        <FrameBox x={99} y={1250} w={882} h={201} fill="#171e19" edge="#89927c">
          <Star x={42} y={40} size={21} />
          <T x={81} y={55} size={40}>
            Claude Code
          </T>
          <path d="M24 76h834" stroke="#596054" strokeWidth="2" />
          <Glyph x={51} y={132} kind="term" size={28} color={C.clay} />
          <T x={91} y={149} size={44} font={mono} color={C.light}>
            {edit.ui.prompt.slice(
              0,
              Math.ceil(
                edit.ui.prompt.length * k(f, q.type, q.bug - q.type + 5),
              ),
            )}
          </T>
          {f < q.bug + 10 && (
            <rect
              x={
                95 +
                26.5 *
                  Math.ceil(
                    edit.ui.prompt.length * k(f, q.type, q.bug - q.type + 5),
                  )
              }
              y="112"
              width="5"
              height="43"
              fill={C.gold}
              opacity={0.52 + 0.45 * Math.cos(f / 12)}
            />
          )}
          <g transform={tr(608, 105, 1 + 0.05 * pulse(f, q.fixed, 12))}>
            <Badge
              x={0}
              y={0}
              w={226}
              text={f >= q.fixed ? "test passed" : "test failed"}
              good={f >= q.fixed}
            />
          </g>
        </FrameBox>
      </g>
    </g>
  );
}
export function Model({ f, edit }: { f: number; edit: SceneProps["edit"] }) {
  const q = edit.cues;
  if (f < q.model || f >= q.context) return null;
  const enter = ease(f, q.model, 13),
    showFile = ease(f, q.files - 5, 14),
    term = ease(f, q.runNothing - 5, 13),
    txt = ease(f, q.text - 10, 12);
  return (
    <g opacity={enter} transform={tr(0, (1 - enter) * 27)}>
      <g transform={tr(269, 818)}>
        <rect
          x="-143"
          y="-110"
          width="286"
          height="231"
          rx="24"
          fill="#37291f"
          stroke="#b17c57"
          strokeWidth="3"
        />
        <Star size={83} />
        <T x={0} y={190} size={43} anchor="middle">
          Claude model
        </T>
      </g>
      <path
        d="M418 816h86m61 0h73"
        stroke="#77816e"
        strokeWidth="4"
        strokeDasharray="9 11"
      />
      <g opacity={showFile}>
        <path
          d="M523 799l28 32m0-32-28 32"
          stroke={C.clay}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <g transform={tr(790, 818)}>
        <rect
          x="-131"
          y="-105"
          width="263"
          height="182"
          rx="13"
          fill="#26342a"
          stroke="#83977d"
          strokeWidth="4"
        />
        <path
          d="M-131 77h262l39 37h-340Z"
          fill="#53624e"
          stroke="#899982"
          strokeWidth="3"
        />
        <g opacity={0.24 + 0.76 * showFile}>
          <Glyph kind="file" x={-47} y={-9} size={54} color={C.paper} />
        </g>
        <g opacity={0.24 + 0.76 * term}>
          <Glyph kind="term" x={43} y={-7} size={49} color={C.gold} />
        </g>
        <T x={0} y={190} size={43} anchor="middle">
          Your machine
        </T>
      </g>
      <FrameBox x={115} y={1121} w={850} h={192} fill="#1d2821" edge="#63715f">
        <T x={36} y={56} size={30} font={mono} color={C.dim}>
          Model output
        </T>
        <g opacity={0.3 + 0.7 * txt}>
          <Glyph kind="term" x={52} y={132} size={30} color={C.clay} />
          <T x={92} y={148} font={mono} size={42} color={C.paper}>
            {f < q.runNothing ? "…" : "“Run the test.”"}
          </T>
        </g>
      </FrameBox>
    </g>
  );
}
export function Context({ f, edit }: { f: number; edit: SceneProps["edit"] }) {
  const q = edit.cues,
    p = edit.ui;
  if (f < q.context || f >= q.loop) return null;
  const stages = [q.grep, q.glob, q.open];
  const high = stages.filter((s) => f >= s).length - 1;
  const en = ease(f, q.context, 14),
    open = ease(f, q.open, 13);
  const muted = "#777d6d";
  const stroke = "#a7ab95";
  return (
    <g opacity={en} transform={tr(0, (1 - en) * 32)}>
      <FrameBox x={82} y={650} w={916} h={566} fill="#fcf8e9" edge="#868d79">
        <Glyph x={58} y={52} kind="term" size={39} color="#934a32" />
        <T x={111} y={68} size={44} color={C.ink} font={mono} weight={650}>
          ~/project
        </T>
        <path d="M0 101h916M359 101v465" stroke={stroke} strokeWidth="2.3" />
        {["Grep", "Glob", "Read"].map((name, i) => {
          const reveal = ease(f, stages[i], 10);
          const on = i === high;
          return (
            <g key={name} transform={tr(25, 144 + i * 121)}>
              <rect
                width="306"
                height="88"
                rx="10"
                fill={on ? "#e8d3b4" : i < high ? "#e5e9d9" : "#eeeada"}
                stroke={on ? "#a36b49" : "#c0c3ae"}
                strokeWidth={on ? 3 : 1.5}
              />
              <Glyph
                kind={i === 0 ? "find" : i === 1 ? "file" : "note"}
                x={45}
                y={44}
                size={36}
                color={on ? "#89462e" : muted}
              />
              <T x={80} y={59} size={40} font={mono} color={on ? C.ink : muted}>
                {name}
              </T>
              <g opacity={reveal}>
                <Glyph kind="check" x={273} y={44} size={24} color="#487554" />
              </g>
            </g>
          );
        })}
        <g transform={tr(395, 160)}>
          <T x={0} y={0} size={27} font={mono} color={muted}>
            {high < 0
              ? "Files"
              : high === 0
                ? "Search results"
                : high === 1
                  ? "File match"
                  : "Source"}
          </T>
          {high < 0 ? (
            <g>
              {["src/", "  math.js", "test/", "  math.test.js"].map((n, i) => (
                <T
                  key={n}
                  x={n.startsWith(" ") ? 49 : 0}
                  y={85 + 65 * i}
                  font={mono}
                  size={38}
                  color={i % 2 === 0 ? "#64745e" : C.ink}
                >
                  {n.trim()}
                </T>
              ))}
            </g>
          ) : high === 0 ? (
            <g>
              <T x={0} y={80} size={36} font={mono} color="#8d462d">
                {p.search}
              </T>
              <path
                d="M0 114h477"
                stroke={stroke}
                strokeDasharray="5 8"
                strokeWidth="2"
              />
              <T x={0} y={191} size={40} font={mono} color={C.ink}>
                {p.file}
              </T>
              <T x={0} y={254} size={32} font={mono} color={muted}>
                1 match
              </T>
            </g>
          ) : high === 1 ? (
            <g>
              <T x={0} y={79} size={36} font={mono} color="#8d462d">
                {p.glob}
              </T>
              <Glyph x={22} y={190} kind="file" size={37} color="#587054" />
              <T x={56} y={205} size={40} font={mono} color={C.ink}>
                {p.file}
              </T>
            </g>
          ) : (
            <g opacity={open}>
              <T x={0} y={78} size={40} font={mono} color={C.ink}>
                {p.file}
              </T>
              <path d="M0 110h477" stroke={stroke} strokeWidth="2" />
              <T x={0} y={182} size={32} font={mono} color="#587054">
                function add(a, b) {"{"}
              </T>
              <rect
                x="-8"
                y="205"
                width="453"
                height="63"
                rx="5"
                fill="#f1d3bd"
              />
              <T x={18} y={250} size={36} font={mono} color="#8b402b">
                {p.before}
              </T>
              <T x={0} y={321} size={33} font={mono} color="#587054">
                {"}"}
              </T>
            </g>
          )}
        </g>
      </FrameBox>
      <g transform={tr(120, 1292)}>
        <circle cx="18" cy="1" r="7" fill="#a1573c" />
        <T x={47} y={15} size={32} font={mono} color="#575e4f">
          {high < 0
            ? edit.ui.prompt
            : high === 2
              ? "Read  →  " + p.file
              : ["Grep", "Glob"][high] + "  →  project/"}
        </T>
      </g>
    </g>
  );
}
