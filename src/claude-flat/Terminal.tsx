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
  unit,
  type Shot,
} from "./art";
export function Opening({ f, edit }: Shot) {
  const q = edit.cues,
    u = edit.ui,
    shrink = smooth(f, 62, 24),
    typed = Math.ceil(
      unit(f, q.type - 3, q.bug - q.type + 8) * u.prompt.length,
    );
  const fixed = f >= q.fixed,
    pulse = bump(f, q.fixed, 17);
  return (
    <Card name="~/project" icon="claude">
      <g
        transform={`translate(${42 + 2 * shrink} ${145 - 13 * shrink}) scale(${1 - 0.31 * shrink})`}
      >
        <T x={0} y={35} size={61} weight={640} color={P.muted} ls={-2}>
          Let's design
        </T>
        <T x={-3} y={146} size={112} weight={850} ls={-5.4}>
          Claude Code.
        </T>
      </g>
      <g transform={tr(38, 327 - 49 * shrink)}>
        <rect
          width="828"
          height="115"
          rx="18"
          fill={P.inset}
          stroke={f >= q.type ? P.orange : P.edge}
          strokeWidth="3"
        />
        <Icon kind="term" x={51} y={57} r={24} />
        <T x={99} y={80} font={mono} size={65} weight={690} ls={-2}>
          {u.prompt.slice(0, typed)}
        </T>
        <path
          d={`M${104 + 37.2 * typed} 30v54`}
          stroke={P.orange}
          strokeWidth="6"
          opacity={0.66 + 0.34 * Math.cos(f * 0.14)}
        />
      </g>
      <g
        transform={`translate(41 ${488 - 12 * shrink}) scale(${1 + 0.08 * pulse})`}
      >
        <rect
          y="-43"
          width={fixed ? 239 : 321}
          height="65"
          rx="15"
          fill={fixed ? P.dimGreen : "#392b30"}
          stroke={fixed ? P.green : "#93595f"}
          strokeWidth="2.5"
        />
        <T x={21} y={4} size={40} color={fixed ? P.green : P.red} weight={800}>
          {fixed ? "fixed ✓" : "1 failing test"}
        </T>
      </g>
    </Card>
  );
}
export function Model({ f, edit }: Shot) {
  const q = edit.cues,
    p = ease(f, q.model + 9, 17),
    n = ease(f, q.files - 6, 10);
  return (
    <Card name="Model access" icon="pc">
      <g transform={tr(41, 146)}>
        <rect
          width="298"
          height="232"
          rx="18"
          fill={P.inset}
          stroke={P.edge}
          strokeWidth="3"
        />
        <Star x={149} y={83} r={52} />
        <T x={149} y={190} size={43} anchor="middle">
          Claude model
        </T>
        <path
          d="M306 109h207"
          stroke="#8c8a84"
          strokeWidth="4"
          strokeDasharray="10 10"
        />
        <g transform={tr(408, 108, 1 + 0.16 * bump(f, q.files, 16))}>
          <circle r="36" fill="#3c2930" stroke={P.red} strokeWidth="3" />
          <Icon kind="x" x={0} y={0} r={14} color={P.red} />
        </g>
        <rect
          x="527"
          width="299"
          height="232"
          rx="18"
          fill={P.inset}
          stroke={P.edge}
          strokeWidth="3"
        />
        <Icon kind="pc" x={674} y={89} r={57} color={P.blue} />
        <T x={675} y={190} size={43} anchor="middle">
          Your files
        </T>
      </g>
      <g opacity={p}>
        <path d="M42 417h824" stroke={P.soft} strokeWidth="2" />
        <Icon kind="term" x={65} y={475} r={19} />
        <T x={107} y={492} size={39} color={P.muted} font={mono}>
          {n > 0.1 ? "Local tools required" : "Model output"}
        </T>
      </g>
    </Card>
  );
}
export function Counter({ f, flat }: Shot) {
  const factor = ease(f, flat.counter, 35),
    number = Math.min(80, Math.floor(80 * factor + 0.03));
  return (
    <Card name="Anthropic engineering" icon="claude">
      <g transform={tr(39, 125)}>
        <T x={-3} y={138} size={173} ls={-11} weight={860} color={P.orange}>
          {number}%{f >= flat.counter + 34 ? "+" : ""}
        </T>
        <path
          d="M6 168h808"
          stroke={P.soft}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d={`M6 168h${Math.max(0.1, 808 * factor)}`}
          stroke={P.orange}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <T x={2} y={240} size={52} weight={690} ls={-1.9}>
          of Anthropic’s merged code
        </T>
        <T x={2} y={304} size={52} weight={690} ls={-1.9}>
          is written by Claude.
        </T>
        <T x={2} y={374} size={30} color={P.muted} weight={520}>
          Source: Anthropic
        </T>
        <T x={810} y={374} size={28} font={mono} color={P.muted} anchor="end">
          May 2026
        </T>
      </g>
    </Card>
  );
}
export function Context({ f, edit }: Shot) {
  const q = edit.cues,
    u = edit.ui,
    ops = [q.grep, q.glob, q.open];
  const now = ops.filter((s) => f >= s).length - 1;
  const scanning = unit(f, q.context + 7, q.grep - q.context - 6);
  return (
    <Card name="~/project" icon="search">
      {["Grep", "Glob", "Read"].map((word, i) => {
        const hit = ops[i],
          v = ease(f, hit, 11),
          sel = now === i;
        return (
          <g
            key={word}
            transform={`translate(${39 + i * 278} ${124 + 14 * (1 - v)})`}
          >
            <rect
              width="256"
              height="91"
              rx="15"
              fill={sel ? P.dimOrange : P.inset}
              stroke={sel ? P.orange : P.soft}
              strokeWidth={sel ? 3.5 : 2.5}
              opacity={0.75 + 0.25 * v}
            />
            {v > 0 ? (
              <g transform={tr(31, 49, 1 + 0.17 * bump(f, hit, 13))}>
                <Icon
                  kind={i === 0 ? "search" : i === 1 ? "file" : "note"}
                  x={0}
                  y={0}
                  r={17}
                />
                <T
                  x={34}
                  y={14}
                  font={mono}
                  size={43}
                  weight={710}
                  color={sel ? P.text : P.muted}
                >
                  {word}
                </T>
                <Icon kind="check" x={187} y={-1} r={12} color={P.orange} />
              </g>
            ) : (
              <g opacity=".69">
                <path
                  d="M27 51h44m15 0h24m16 0h11"
                  stroke={P.edge}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>
        );
      })}
      <rect
        x="39"
        y="250"
        width="828"
        height="253"
        rx="17"
        fill={P.inset}
        stroke={P.soft}
        strokeWidth="2.5"
      />
      {now < 0 ? (
        <g>
          <Icon kind="search" x={78} y={301} r={18} />
          <T x={117} y={315} size={38} font={mono}>
            {u.search}
          </T>
          <T x={65} y={395} size={40} color={P.muted} font={mono}>
            src/
          </T>
          <T x={235} y={395} size={40} font={mono}>
            math.js
          </T>
          <T x={65} y={461} size={37} color={P.muted} font={mono}>
            test/
          </T>
          <T x={235} y={461} size={37} color={P.muted} font={mono}>
            math.test.js
          </T>
          <path
            d={`M64 ${349 + 124 * scanning}h766`}
            stroke={P.orange}
            strokeOpacity=".62"
            strokeWidth="3"
          />
        </g>
      ) : (
        <g>
          <Icon kind="file" x={77} y={296} r={17} color={P.orange} />
          <T x={114} y={312} size={42} font={mono}>
            {u.file}
          </T>
          <path d="M61 340h780" stroke={P.soft} strokeWidth="2" />
          {now === 0 ? (
            <g>
              <T x={68} y={409} size={45} font={mono} color={P.orange}>
                {u.search}
              </T>
              <T x={70} y={468} size={34} color={P.muted}>
                1 matching line
              </T>
            </g>
          ) : now === 1 ? (
            <g>
              <T x={68} y={413} size={45} font={mono} color={P.orange}>
                {u.glob}
              </T>
              <T x={70} y={469} size={34} color={P.muted}>
                1 matching file
              </T>
            </g>
          ) : (
            <g>
              <T x={67} y={397} size={38} font={mono} color={P.muted}>
                function add(a, b) {"{"}
              </T>
              <rect
                x="64"
                y="413"
                width={Math.max(2, 735 * ease(f, q.open, 17))}
                height="65"
                rx="8"
                fill={P.dimOrange}
              />
              <path
                d="M66 417v57"
                stroke={P.orange}
                strokeWidth={4 + 3 * bump(f, q.read, 13)}
              />
              <T x={87} y={459} size={42} font={mono} color={P.orange}>
                {u.before}
              </T>
            </g>
          )}
        </g>
      )}
    </Card>
  );
}
