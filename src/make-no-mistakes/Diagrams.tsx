import type { ReactNode } from "react";
import { arrive, e, ease, lines, mix, request, type Step } from "./timing";

import { lower, upper } from "./PromptWords";

const ink = "#282331",
  muted = "#6a6279",
  purple = "#7051ad",
  lilac = "#efeafb";
const green = "#177554",
  mint = "#e3f3e9",
  red = "#ad3d53",
  rose = "#fbe8ec";
const border = "#e1dce9",
  dark = "#332d41";
const mono = '"SFMono-Regular", Menlo, monospace';

function Text({
  x,
  y,
  children,
  size = 30,
  color = ink,
  bold = 600,
  align = "start",
  code = false,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
  bold?: number;
  align?: "start" | "middle" | "end";
  code?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      fontWeight={bold}
      textAnchor={align}
      fontFamily={code ? mono : undefined}
      letterSpacing={code ? -0.8 : -0.9}
    >
      {children}
    </text>
  );
}
function Box({
  x,
  y,
  w,
  h,
  r = 18,
  fill = "white",
  stroke = border,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  fill?: string;
  stroke?: string;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={2}
    />
  );
}
function Ticket({
  x,
  y,
  label = request.id,
  scale = 1,
  kind = "purple",
}: {
  x: number;
  y: number;
  label?: string;
  scale?: number;
  kind?: "purple" | "grey" | "red";
}) {
  const fg = kind === "red" ? red : kind === "grey" ? muted : purple;
  const bg = kind === "red" ? rose : kind === "grey" ? "#f1eff4" : lilac;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M12 0H143Q155 0 155 12V15C144 17 144 31 155 33V38Q155 50 143 50H12Q0 50 0 38V33C11 31 11 17 0 15V12Q0 0 12 0Z"
        fill={bg}
        stroke={fg}
        strokeWidth={2.2}
      />
      <path d="M25 5v40" stroke={fg} strokeDasharray="3 4" opacity={0.45} />
      <Text x={86} y={33} size={21} bold={660} color={fg} align="middle" code>
        {label}
      </Text>
    </g>
  );
}
function Check({ x, y, done }: { x: number; y: number; done: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle
        r={18}
        fill={done > 0 ? mint : "#f3f0f5"}
        stroke={done > 0 ? "#9ed6b8" : border}
        strokeWidth={2}
      />
      {done > 0 ? (
        <path
          d="m-8 0 5 5 11-12"
          fill="none"
          stroke={green}
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - done}
        />
      ) : (
        <circle r={4} fill="#b9b1c1" />
      )}
    </g>
  );
}
export function StepIcon({
  id,
  stroke = "currentColor",
}: {
  id: Step;
  stroke?: string;
}) {
  const path = {
    front: "M5 20V5h11v15 M3 20h16 M12 12h1 M17 9h5m-2-2 2 2-2 2",
    token: "M3 6h8v12H3z M14 6h7v12h-7z M6 10h2m9 0h1",
    gpu: "M6 6h12v12H6z M9 9h6v6H9z M8 3v3m4-3v3m4-3v3M8 18v3m4-3v3m4-3v3M3 8h3m-3 4h3m-3 4h3m12-8h3m-3 4h3m-3 4h3",
    stream: "M3 6h10m-10 6h16m-16 6h10m3-13 5 7-5 7",
    database:
      "M3.5 6c0-4 17-4 17 0s-17 4-17 0v11.5c0 4 17 4 17 0V6 M3.5 12c0 4 17 4 17 0",
  }[id];
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={path}
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
function Door({ f, showDaily = true }: { f: number; showDaily?: boolean }) {
  const travel = ease(f, e.hit, 28),
    passed = arrive(f, e.secondCheck + 4, 16),
    denied = arrive(f, e.ban, 12);
  return (
    <>
      <Text x={32} y={50} size={24} color={muted}>
        Incoming request
      </Text>
      <Text x={571} y={50} size={24} color={muted}>
        Access checks
      </Text>
      <path
        d="M115 150H320M450 150H525Q543 150 543 130V108H583M543 150V202H583"
        className="mn-wire"
      />
      <Ticket x={mix(31, 218, travel)} y={121} scale={0.94} />
      <g transform="translate(295 105)">
        <rect width="200" height="94" rx="23" fill={dark} />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(17 ${15 + i * 22})`}>
            <rect width="166" height="15" rx="5" fill="#51475e" />
            <circle
              cx="12"
              cy="7.5"
              r="3.5"
              fill={i === 1 && travel > 0.6 ? "#b3f4c7" : "#aa99cd"}
            />
            <path
              d="M33 7h86"
              stroke="#716383"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
      <Text x={395} y={239} size={28} align="middle">
        Cloudflare
      </Text>
      {["Identity", "Rate limit"].map((label, i) => (
        <g key={label}>
          <Box x={568} y={76 + i * 89} w={289} h={66} fill="#fcfbfe" />
          <Check
            x={604}
            y={109 + i * 89}
            done={arrive(f, i ? e.secondCheck : e.check, 8)}
          />
          <Text x={640} y={120 + i * 89} size={29}>
            {label}
          </Text>
        </g>
      ))}
      <g opacity={passed}>
        <path d="M719 236v27h-59" className="mn-wire" />
        <Text x={638} y={275} size={24} color={green} align="end">
          login-01 admitted
        </Text>
      </g>
      <g
        opacity={
          showDaily
            ? arrive(f, e.counter, 10) * (1 - ease(f, e.ban - 10, 10))
            : 0
        }
      >
        <Text x={32} y={333} size={36} bold={780} color={purple}>
          {f >= e.counter + 26
            ? "Over 2.5 billion"
            : (2.5 * ease(f, e.counter, 26)).toFixed(1) + " billion"}{" "}
          messages a day
        </Text>
        <Text x={34} y={375} size={25} color={muted}>
          OpenAI, 2025
        </Text>
      </g>
      <g opacity={denied} transform={`translate(0 ${(1 - denied) * 12})`}>
        <Box x={30} y={311} w={828} h={81} fill={rose} stroke="#edc6ce" />
        <Ticket x={49} y={329} scale={0.86} kind="red" label="login-02" />
        <Text x={207} y={360} size={26} color={red}>
          Over quota
        </Text>
        <Text x={833} y={360} align="end" size={30} color={red}>
          Limit reached
        </Text>
      </g>
    </>
  );
}
function TokenRow({
  tokens,
  y,
  split,
  label,
  count,
}: {
  tokens: string[];
  y: number;
  split: number;
  label: string;
  count: boolean;
}) {
  const isCaps = tokens.length === 6;
  const widths = isCaps ? [121, 100, 65, 90, 78, 75] : [133, 105, 209];
  let x = 29;
  const colors = [
    "#eadffb",
    "#daebf5",
    "#fae5cd",
    "#e3eed7",
    "#f6dfe6",
    "#e2e0f8",
  ];
  return (
    <g>
      <Text x={30} y={y - 16} size={24} color={muted}>
        {label}
      </Text>
      {split < 1 && (
        <g opacity={1 - split}>
          <Box x={29} y={y} w={isCaps ? 530 : 450} h={76} fill="#f5f1fa" />
          <Text x={48} y={y + 50} code size={34}>
            {tokens.join("")}
          </Text>
        </g>
      )}
      {tokens.map((t, i) => {
        const left = x;
        x += widths[i] + 12 * split;
        return (
          <g key={i} opacity={split}>
            <rect
              x={left}
              y={y}
              width={widths[i] + (1 - split) * 2}
              height={76}
              rx={4 + 10 * split}
              fill={colors[i]}
              stroke="#ffffff"
              strokeWidth={2 * split}
            />
            <Text
              x={left + widths[i] / 2}
              y={y + 50}
              code
              size={32}
              align="middle"
              bold={650}
            >
              {t.trim()}
            </Text>
          </g>
        );
      })}
      {count && (
        <g opacity={split}>
          <Text
            x={861}
            y={y + 52}
            size={49}
            bold={770}
            color={purple}
            align="end"
          >
            {tokens.length}
          </Text>
        </g>
      )}
    </g>
  );
}
function Tokens({ f }: { f: number }) {
  const simple = arrive(f, e.three, 16),
    caps = arrive(f, e.upper, 13),
    split = arrive(f, e.six, 15);
  return (
    <>
      <TokenRow
        tokens={lower}
        y={80}
        split={simple}
        count
        label="Typed phrase"
      />
      <g opacity={caps}>
        <TokenRow
          tokens={upper}
          y={240}
          split={split}
          count
          label="Same phrase in caps"
        />
      </g>
      <g opacity={arrive(f, e.six + 13, 15)}>
        <path d="M30 345h826" stroke={border} strokeWidth="2" />
        <Text x={32} y={389} size={27} color={muted}>
          Input tokens for these three words
        </Text>
        <Text x={859} y={389} size={31} bold={740} color={purple} align="end">
          2×
        </Text>
      </g>
    </>
  );
}
function Gpu({ f }: { f: number }) {
  const clear = arrive(f, e.free, 8),
    move = ease(f, e.batch, 24);
  const visible =
    f < e.predict
      ? 0
      : f < e.single
        ? 1
        : Math.min(3, 2 + Math.floor((f - e.single) / 18));
  return (
    <>
      <Text x={30} y={47} size={25} color={muted}>
        Waiting
      </Text>
      <Text x={335} y={47} size={25} color={muted}>
        GPU batch
      </Text>
      <path d="M130 135h230" className="mn-wire" />
      <path d="m272 127 9 8-9 8" fill="none" stroke="#9787ad" strokeWidth="3" />
      <Box x={27} y={72} w={216} h={139} fill="#faf8fd" />
      <Box x={321} y={68} w={535} h={150} fill={dark} stroke={dark} />
      {[0, 1, 2].map((v) => (
        <g key={v}>
          <rect
            x={340 + v * 169}
            y={91}
            width={153}
            height={87}
            rx={12}
            fill={v === 0 && clear > 0.9 ? "#47434f" : "#494253"}
            stroke={v === 0 && clear > 0.9 ? "#b0d4be" : "#6d627b"}
            strokeWidth={2}
          />
          <circle
            cx={355 + v * 169}
            cy={195}
            r={4}
            fill={v === 0 && move > 0.95 ? "#bfe9ca" : "#b9abcf"}
          />
          <path
            d={`M${368 + v * 169} 195h74`}
            stroke="#6b627a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {v > 0 && (
            <Text
              x={416 + v * 169}
              y={145}
              align="middle"
              size={24}
              code
              color="#e5dfed"
            >
              job-{17 + v}
            </Text>
          )}
        </g>
      ))}
      <g opacity={1 - clear}>
        <Text x={417} y={145} align="middle" size={24} code color="#e5dfed">
          job-17
        </Text>
      </g>
      <Ticket x={mix(57, 345, move)} y={mix(106, 111, move)} scale={0.93} />
      <Text x={134} y={251} size={23} align="middle" color={muted}>
        {move > 0.99 ? "Queue clear" : "1 request"}
      </Text>
      <Text
        x={585}
        y={251}
        size={23}
        align="middle"
        color={move > 0.99 ? green : muted}
      >
        {move > 0.99
          ? "login-01 is running"
          : clear > 0.9
            ? "Slot available"
            : "All slots busy"}
      </Text>
      <path d="M30 286h825" stroke={border} strokeWidth="2" />
      <Text x={31} y={330} size={24} color={muted}>
        Next tokens
      </Text>
      {request.replyTokens.slice(0, visible).map((s, i) => (
        <g key={i} transform={`translate(${30 + i * 139} 346)`}>
          <Box x={0} y={0} w={126} h={53} r={12} fill={lilac} />
          <Text x={63} y={36} align="middle" code size={25} color={purple}>
            {s.trim()}
          </Text>
        </g>
      ))}
    </>
  );
}
const streamChunks = ["Check", " the form", " action."];
function Stream({ f }: { f: number }) {
  const starts = [e.ship, e.ready, e.type - 15];
  const times = starts.map((t) => ease(f, t, 22));
  const got = times.filter((p) => p >= 1).length;
  return (
    <>
      <Text x={30} y={50} size={25} color={muted}>
        From Astra
      </Text>
      <Text x={845} y={50} align="end" size={25} color={muted}>
        To Alex
      </Text>
      <rect x={45} y={82} width="112" height="99" rx="25" fill={dark} />
      <path d="m101 101 6 19 21 9-21 7-6 20-8-20-20-7 21-9z" fill="#e1c7ff" />
      <path d="M161 134H753" className="mn-wire" />
      <path
        d="m730 125 11 9-11 9"
        stroke={purple}
        strokeWidth="4"
        fill="none"
      />
      <rect
        x="752"
        y="88"
        width="91"
        height="78"
        rx="18"
        fill={lilac}
        stroke="#b7a3d7"
        strokeWidth="3"
      />
      <path
        d="M774 116h47m-47 14h26"
        stroke={purple}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {times.map((p, i) =>
        p > 0 && p < 1 ? (
          <g
            key={i}
            transform={`translate(${mix(170, 718, p)} ${105 - Math.sin(p * Math.PI) * 13})`}
          >
            <Box
              x={-34}
              y={0}
              w={73}
              h={52}
              r={12}
              fill="#dcccf4"
              stroke="#a98acb"
            />
            <Text x={1} y={35} size={25} align="middle" color={purple} code>
              {i + 1}
            </Text>
          </g>
        ) : null,
      )}
      <Box x={30} y={225} w={823} h={160} r={24} fill="#f7f5fb" />
      <Text x={56} y={270} size={23} color={muted}>
        Astra’s reply
      </Text>
      <Text x={55} y={338} size={47} bold={640}>
        {streamChunks.slice(0, got).join("")}
        <tspan fill={purple} opacity={got === 3 ? 0 : 0.9}>
          ▍
        </tspan>
      </Text>
    </>
  );
}
function Cylinder({
  x,
  y,
  s = 1,
  sweat = false,
}: {
  x: number;
  y: number;
  s?: number;
  sweat?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M0 29V154c0 36 176 36 176 0V29"
        fill="#9d84c4"
        stroke="#76589a"
        strokeWidth="2.5"
      />
      <path
        d="M0 70c0 36 176 36 176 0M0 112c0 36 176 36 176 0"
        fill="none"
        stroke="#d1b8e6"
        strokeWidth="5"
      />
      <ellipse
        cx="88"
        cy="29"
        rx="88"
        ry="26"
        fill="#d3bde9"
        stroke="#80629e"
        strokeWidth="2.5"
      />
      <ellipse
        cx="88"
        cy="27"
        rx="61"
        ry="13"
        fill="none"
        stroke="#b99bce"
        strokeWidth="2"
      />
      {[56, 98, 140].map((v) => (
        <g key={v}>
          <circle cx="25" cy={v} r="4.2" fill="#e2f6dc" />
          <path
            d={`M40 ${v + 1}l18 3`}
            stroke="#775d95"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      ))}
      {sweat && (
        <path
          d="M148 51c-3 13-14 20-14 32a14 14 0 0 0 28 0c0-10-9-19-14-32Z"
          fill="#ade2ff"
          stroke="#6a92af"
          strokeWidth="3"
        />
      )}
    </g>
  );
}
function Database({ f }: { f: number }) {
  const pg = arrive(f, e.pg - 5, 18),
    copies = arrive(f, e.copies, 18),
    pooler = arrive(f, e.pooler, 17),
    sign = arrive(f, e.sign, 12);
  const slide = ease(f, e.write, 28),
    m = arrive(f, e.five, 15);
  return (
    <>
      <g opacity={1 - pg}>
        <Box x={44} y={102} w={799} h={179} r={24} fill="#f7f5fb" />
        <Ticket x={82} y={143} />
        <Text x={276} y={163} size={35}>
          Alex’s conversation
        </Text>
        <Text x={277} y={215} size={28} color={f >= e.saved ? green : muted}>
          {f >= e.saved ? "Saved to chat history" : "Saving…"}
        </Text>
        <Check x={785} y={191} done={arrive(f, e.saved, 10)} />
      </g>
      <g opacity={pg}>
        <Text x={31} y={41} size={23} color={muted}>
          PostgreSQL deployment · January 2026
        </Text>
        <g opacity={1 - copies}>
          <path d="M163 163h198" className="mn-wire" />
          <Ticket x={mix(30, 245, slide)} y={133} scale={0.91} />
        </g>
        <g transform={`translate(${mix(325, 81, copies)} 67)`}>
          <Cylinder x={0} y={0} s={1.02} sweat={f >= lines.homework} />
          <Text x={88} y={229} align="middle" size={27}>
            Primary writer
          </Text>
          {sign > 0 && (
            <g
              transform={`translate(${-30 + (1 - sign) * 104} ${80 - (1 - sign) * 128}) rotate(${-8 + (1 - sign) * 15} 120 30) scale(${1 + (1 - sign) * 0.35})`}
            >
              <rect
                width="242"
                height="59"
                rx="6"
                fill="#fff0b3"
                stroke="#593f35"
                strokeWidth="4"
              />
              <text
                x="121"
                y="38"
                fill="#613e2f"
                fontSize="26"
                fontWeight="880"
                textAnchor="middle"
                letterSpacing="1"
              >
                DO NOT TOUCH
              </text>
            </g>
          )}
        </g>
        <g opacity={copies}>
          <path
            d="M274 154H322q30 0 30-23V99H480M352 154h128m-128 0v36q0 23 30 23h98"
            className="mn-wire"
          />
          {[76, 134, 192].map((v, i) => (
            <g key={v} opacity={arrive(f, e.copies + i * 7, 12)}>
              <Cylinder x={480} y={v} s={0.3} />
              <path d={`M550 ${v + 31}h36`} stroke={border} strokeWidth="3" />
            </g>
          ))}
          <Text x={611} y={147} size={47} bold={740} color={purple}>
            Nearly 50
          </Text>
          <Text x={611} y={184} size={27}>
            read replicas
          </Text>
        </g>
        <g opacity={pooler}>
          <Box x={28} y={323} w={831} h={73} fill="#f7f5fb" />
          <Text x={49} y={369} size={29}>
            PgBouncer
          </Text>
          <Text x={265} y={367} size={23} color={muted}>
            Connection setup
          </Text>
          <Text x={613} y={369} size={32} align="middle" color={muted}>
            50 ms
          </Text>
          <Text x={688} y={367} size={31} color={purple}>
            →
          </Text>
          <g opacity={m}>
            <Text
              x={834}
              y={370}
              size={37}
              align="end"
              color={green}
              bold={760}
            >
              5 ms
            </Text>
          </g>
        </g>
      </g>
    </>
  );
}
export function Diagram({
  step,
  frame,
  snapshot = false,
}: {
  step: Step;
  frame: number;
  snapshot?: boolean;
}) {
  const snap = {
    front: e.secondCheck + 65,
    token: e.six + 30,
    gpu: e.single + 65,
    stream: e.type + 45,
    database: e.five + 40,
  };
  const f = snapshot ? snap[step] : frame;
  const content = {
    front: <Door f={f} showDaily={!snapshot} />,
    token: <Tokens f={f} />,
    gpu: <Gpu f={f} />,
    stream: <Stream f={f} />,
    database: <Database f={f} />,
  };
  return (
    <svg
      viewBox="0 0 890 417"
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      {content[step]}
    </svg>
  );
}
export function Incident({ f }: { f: number }) {
  const show = arrive(f, e.signup, 12),
    bar = ease(f, e.spike, Math.max(18, e.ten - e.spike));
  return (
    <svg width="100%" height="100%" viewBox="0 0 890 417">
      <Text x={32} y={46} size={25} color={muted}>
        PostgreSQL write traffic
      </Text>
      <Text x={31} y={129} size={31}>
        Before launch
      </Text>
      <rect x="317" y="99" width="40" height="40" rx="7" fill="#cbc3d4" />
      <Text x={372} y={130} size={32} color={muted}>
        1×
      </Text>
      <Text x={31} y={221} size={31}>
        At launch
      </Text>
      <rect
        x="317"
        y="190"
        width={Math.max(4, 40 + 360 * bar)}
        height="42"
        rx="7"
        fill="#c75369"
      />
      <Text x={374 + 360 * bar} y={222} size={41} color={red} bold={770}>
        {bar > 0.95 ? ">10×" : ""}
      </Text>
      <path d="M30 273h827" stroke={border} strokeWidth="2" />
      <g opacity={arrive(f, e.incident, 15)}>
        <Text x={32} y={330} size={38} bold={730}>
          1 SEV-0
        </Text>
        <Text x={32} y={370} size={23} color={muted}>
          in the reported year
        </Text>
      </g>
      <g opacity={show}>
        <Text x={444} y={330} size={38} bold={730} color={red}>
          100M+ sign-ups
        </Text>
        <Text x={444} y={370} size={23} color={muted}>
          in one week
        </Text>
      </g>
    </svg>
  );
}
export const previewFrames = [
  e.previewFront,
  e.previewTokens,
  e.previewGpu,
  Math.round((e.previewGpu + e.previewDb) / 2),
  e.previewDb,
];
