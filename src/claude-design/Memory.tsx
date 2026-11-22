import type { SceneProps } from "./schema";
import { C, ease, FrameBox, Glyph, k, mono, Star, T, tr } from "./art";

function Note({
  x,
  y,
  angle,
  file,
  author,
  copy,
  actor,
  progress,
  ink,
}: {
  x: number;
  y: number;
  angle: number;
  file: string;
  author: string;
  copy: string[];
  actor: boolean;
  progress: number;
  ink: number;
}) {
  const edge = actor ? "#83927b" : "#ba9a70";
  return (
    <g
      transform={tr(
        x,
        y + 110 * (1 - progress),
        0.96 + 0.04 * progress,
        angle * progress,
      )}
      opacity={progress}
    >
      <path
        d="M0 0h319l73 73v410H0z"
        transform="translate(5 13)"
        fill="#716e58"
        opacity=".2"
      />
      <path
        d="M0 0h319l73 73v410H0z"
        fill={actor ? "#e3e9d5" : "url(#paperStock)"}
        stroke={edge}
        strokeWidth="3"
      />
      <path
        d="M319 0v73h73"
        fill={actor ? "#c1d0ad" : "#d1bb92"}
        stroke={edge}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {actor ? (
        <Star x={50} y={82} size={24} color="#976046" />
      ) : (
        <Glyph kind="note" x={50} y={82} size={39} color="#896442" />
      )}
      <T x={92} y={94} color="#565e4d" size={33}>
        {author}
      </T>
      <T x={29} y={189} size={49} font={mono} color={C.ink} weight={750}>
        {file}
      </T>
      <path d="M30 220H361" stroke={edge} strokeWidth="2.4" />
      <g opacity={ink} transform={tr(0, (1 - ink) * 9)}>
        {copy.map((line, i) => (
          <T
            key={line}
            x={32}
            y={296 + i * 56}
            size={39}
            font={mono}
            color={C.ink}
          >
            {line}
          </T>
        ))}
      </g>
      <path
        d="M32 426h229"
        stroke={edge}
        strokeWidth="2"
        strokeDasharray="4 8"
      />
    </g>
  );
}

export function Memory({ f, edit }: SceneProps) {
  const q = edit.cues,
    u = edit.ui;
  if (f < q.memory || f >= q.history) return null;
  const open = ease(f, q.memory, 14),
    left = ease(f, q.fresh - 3, 27),
    right = ease(f, q.itsNote - 33, 25);
  const lineBreak = u.agentNote.lastIndexOf(" ", 15);
  return (
    <g opacity={open}>
      <FrameBox x={111} y={617} w={858} h={133} fill="#333e31" edge="#76816c">
        <Glyph kind="term" x={58} y={66} size={41} color={C.gold} />
        <T x={116} y={85} font={mono} size={45}>
          New session
        </T>
        <rect
          x="774"
          y="47"
          width="23"
          height="40"
          rx="2"
          fill="#bad2a2"
          opacity={0.55 + 0.36 * Math.sin(f / 10)}
        />
      </FrameBox>
      <g stroke="#929b7e" strokeWidth="3" opacity={left} fill="none">
        <path d="M529 750v61H305v75m247-136v61h221v73" strokeDasharray="7 8" />
        <circle cx="541" cy="811" r="6" fill="#75836c" />
      </g>
      <Note
        x={99}
        y={859}
        angle={-3}
        file="CLAUDE.md"
        author="You"
        copy={[u.projectNote]}
        actor={false}
        progress={left}
        ink={ease(f, q.yourNote - 8, 18)}
      />
      <Note
        x={569}
        y={868}
        angle={3}
        file="MEMORY.md"
        author="Claude"
        copy={[
          u.agentNote.slice(0, lineBreak),
          u.agentNote.slice(lineBreak + 1),
        ]}
        actor
        progress={right}
        ink={ease(f, q.itsNote + 1, 16)}
      />
    </g>
  );
}

export function Compact({ f, edit }: SceneProps) {
  const q = edit.cues,
    u = edit.ui;
  if (f < q.history || f >= q.recap) return null;
  const enter = ease(f, q.history, 14),
    fold = ease(f, q.summarize, 26),
    next = ease(f, q.keep, 16);
  const rows = [
    u.prompt,
    "Grep  " + u.search,
    "Read  " + u.file,
    "npm test → 5",
  ];
  return (
    <g opacity={enter} transform={tr(0, 24 * (1 - enter))}>
      <FrameBox x={98} y={649} w={884} h={654} fill="#faf5e6" edge="#919780">
        <Glyph kind="term" x={53} y={53} size={37} color="#985132" />
        <T x={99} y={69} color={C.ink} size={44}>
          Conversation
        </T>
        <path d="M25 103h835" stroke="#b7baa7" strokeWidth="2" />
        {rows.map((row, i) => {
          const spread = ease(f, q.history + 3 + i * 4, 12);
          const rowFold = ease(f, q.summarize + i * 2, 22);
          const y =
            150 + (i * 98 + 24 * (1 - spread)) * (1 - rowFold) + 37 * rowFold;
          return (
            <g
              key={row}
              opacity={spread * (1 - k(f, q.summarize + 13 + i * 2, 10))}
              transform={tr(34, y)}
            >
              <rect
                width="816"
                height="79"
                rx="11"
                fill={i === 0 ? "#efdac4" : "#e6e8d8"}
                stroke="#b6baa2"
                strokeWidth="2"
              />
              <Glyph
                kind={
                  i === 0
                    ? "term"
                    : i === 1
                      ? "find"
                      : i === 2
                        ? "file"
                        : "check"
                }
                x={45}
                y={40}
                size={32}
                color={i === 0 ? "#985132" : "#5a7153"}
              />
              <T x={88} y={56} color={C.ink} font={mono} size={38}>
                {row}
              </T>
            </g>
          );
        })}
        <g
          opacity={ease(f, q.summarize + 11, 16)}
          transform={tr(34, 167 + 17 * (1 - fold))}
        >
          <rect
            width="816"
            height="206"
            rx="13"
            fill="#dce8cb"
            stroke="#7c926f"
            strokeWidth="3"
          />
          <Glyph kind="note" x={46} y={43} size={37} color="#54704b" />
          <T x={82} y={56} size={32} color="#496146">
            Summary
          </T>
          <T x={34} y={120} size={40} font={mono} color={C.ink}>
            Fixed add().
          </T>
          <T x={34} y={174} size={40} font={mono} color={C.ink}>
            Test passes.
          </T>
        </g>
        <g opacity={next} transform={tr(40, 457 + 20 * (1 - next))}>
          <Glyph kind="term" x={28} y={25} size={35} color="#985132" />
          <T x={67} y={38} size={40} font={mono} color={C.ink}>
            Next turn
          </T>
          <rect
            x="306"
            y="2"
            width="13"
            height="44"
            fill="#78976e"
            opacity={0.64 + 0.36 * Math.cos(f / 8)}
          />
        </g>
      </FrameBox>
    </g>
  );
}
