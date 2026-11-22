import { Img, staticFile } from "remotion";
import { Capsule, Check, Chips, Courier, Label } from "./Drawing";
import {
  screen,
  requestId,
  promptTask,
  promptEnding,
  arc,
  e,
  ease,
  lerp,
  palette as c,
  phase,
  st,
} from "./timing";

const plum = "#271e34",
  bone = "#fff4de",
  lilac = "#cbb9db";
const asset = (name: string) =>
  staticFile("episodes/make-no-mistakes-story/art/" + name + ".webp");

function Clock({ later = false }: { later?: boolean }) {
  return (
    <g>
      <circle cx="94" cy="155" r="12" fill="#edbf70" />
      <Label x={122} y={178} size={66} fill={bone} weight={720} spacing={-3}>
        {later ? screen.laterClock : screen.firstClock}
      </Label>
      <g transform="translate(745 96) rotate(3 130 45)">
        <rect width="268" height="111" rx="11" fill="#f4d391" />
        <path d="M23 11 H114" stroke="#d9af6e" strokeWidth="4" />
        <Label x={22} y={46} size={24} fill="#74553e" weight={650}>
          DEMO
        </Label>
        <Label x={22} y={88} size={40} fill="#3c2b37" weight={790}>
          {screen.demo}
        </Label>
      </g>
    </g>
  );
}
export function NightPlate({
  name,
  zoom = 1,
  drop = 0,
}: {
  name: string;
  zoom?: number;
  drop?: number;
}) {
  return (
    <div className="mn3-night-plate">
      <Img
        src={asset(name)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translateY(${drop}px) scale(${zoom})`,
          transformOrigin: "62% 53%",
        }}
      />
    </div>
  );
}
function Console({
  y = 848,
  title,
  children,
  highlight = false,
}: {
  y?: number;
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <g transform={`translate(65 ${y})`}>
      <rect
        x="0"
        y="7"
        width="950"
        height="285"
        rx="30"
        fill="#0d0b17"
        opacity=".4"
      />
      <rect
        width="950"
        height="285"
        rx="30"
        fill={highlight ? "#392631" : "#30283d"}
        stroke={highlight ? "#99606d" : "#766682"}
        strokeWidth="3"
      />
      <circle cx="35" cy="46" r="6" fill={highlight ? "#f99aa2" : "#c8afd7"} />
      <Label x={55} y={55} size={25} fill="#d6c7dc" mono>
        {title}
      </Label>
      <path
        d="M30 80H919"
        stroke={highlight ? "#68464f" : "#58465f"}
        strokeWidth="2"
      />
      {children}
    </g>
  );
}
export function Setup({ f }: { f: number }) {
  const a = promptTask,
    b = promptEnding;
  const n = Math.floor(phase(f, st.setup + 11, 74) * (a.length + b.length));
  const released = ease(f, e.send, 22),
    travel = ease(f, e.send + 16, 110);
  return (
    <>
      <Clock />
      <g opacity={1 - ease(f, e.send - 12, 14)}>
        <path
          d="M250 715l-26 34"
          fill="none"
          stroke="#dea6a7"
          strokeWidth="3"
        />
        <rect
          x="63"
          y="624"
          width="350"
          height="94"
          rx="17"
          fill="#3e2833"
          stroke="#aa7880"
          strokeWidth="3"
        />
        <circle cx="95" cy="672" r="9" fill="#f4a3a1" />
        <Label x={118} y={686} size={37} weight={610} fill="#ffe1d9">
          {screen.loginError}
        </Label>
      </g>
      <g opacity={1 - released}>
        <Console title="Alex / new message">
          <Label x={37} y={146} size={45} fill={bone} weight={600}>
            {a.slice(0, n)}
          </Label>
          <Label x={37} y={211} size={45} fill={bone} weight={600}>
            {b.slice(0, Math.max(0, n - a.length))}
            {n < a.length + b.length && n >= a.length ? "▏" : ""}
          </Label>
          <Capsule
            x={752}
            y={174}
            w={146}
            h={61}
            size={27}
            text="Enter ↵"
            bg="#e3c6ef"
            fg={plum}
          />
        </Console>
      </g>
      {released > 0 && (
        <g opacity={released}>
          <path
            d="M78 1059C426 1146 722 1002 1060 1042"
            stroke="#a995ae"
            strokeWidth="3"
            fill="none"
            strokeDasharray="9 13"
            opacity=".5"
          />
          <Courier
            f={f}
            x={lerp(116, 775, travel)}
            y={944 - 52 * arc(f, e.send + 16, 110)}
            scale={1.17}
            gear={ease(f, e.send + 7, 22)}
            walk={travel > 0 && travel < 1 ? 1 : 0}
            night
          />
        </g>
      )}
    </>
  );
}
export function Failure({ f }: { f: number }) {
  const failed = f >= e.broken,
    chips = ease(f, e.threeMore - 9, 18);
  return (
    <>
      <Clock later />
      <Console title={requestId + " / first attempt"} highlight={failed}>
        <Label x={37} y={139} size={31} fill="#e8deed" mono>
          {screen.firstEdit}
        </Label>
        <g
          opacity={failed ? 1 : 0}
          transform={`translate(${Math.sin((f - e.broken) * 1.4) * (1 - phase(f, e.broken, 12)) * 8} 0)`}
        >
          <rect x="34" y="168" width="876" height="83" rx="14" fill="#6c3948" />
          <Label x={59} y={223} size={39} fill="#ffe8df" weight={680}>
            {screen.error}
          </Label>
        </g>
        {!failed && (
          <>
            <Label x={38} y={224} size={32} fill={lilac}>
              {f < e.refresh ? "Pasted into form" : "Refreshing…"}
            </Label>
            <Capsule
              x={704}
              y={174}
              w={188}
              h={60}
              size={29}
              text="Refresh ↻"
              bg={f < e.refresh ? "#584561" : "#ddbedf"}
              fg={f < e.refresh ? "#f6e9f6" : plum}
            />
          </>
        )}
      </Console>
      <g opacity={chips}>
        <Chips
          x={77}
          y={1148}
          scale={0.95}
          pieces={screen.asTyped}
          widths={[112, 79, 173]}
          night
        />
        <Label x={498} y={1195} size={29} fill={lilac}>
          3 more tokens
        </Label>
      </g>
    </>
  );
}
function RetryPath({ f }: { f: number }) {
  const moving = ease(f, e.route - 7, Math.max(25, e.think - e.route + 20));
  const x = lerp(192, 824, moving),
    trackY = 733 - 129 * ease(x, 365, 317);
  return (
    <g>
      <path
        d="M117 733 H412 Q467 733 491 779 T591 826 H897"
        stroke="#b5a5c5"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="9 13"
      />
      <path
        d="M117 733 H365 C528 733 519 604 682 604 H927"
        fill="none"
        stroke="#d8cfdf"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M117 733 H365 C528 733 519 604 682 604 H927"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset={1 - moving}
        fill="none"
        stroke="#5fb99c"
        strokeWidth="25"
        opacity=".26"
        strokeLinecap="round"
      />
      <path
        d="M117 733 H365 C528 733 519 604 682 604 H927"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset={1 - moving}
        fill="none"
        stroke="#337d69"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <Courier
        x={x - 109}
        y={trackY - 155}
        scale={1.05}
        f={f}
        walk={moving > 0 && moving < 1 ? 1 : 0}
      />
      <Label x={905} y={810} size={26} anchor="end" fill={c.sub}>
        Standard
      </Label>
      <Label
        x={953}
        y={667}
        size={34}
        anchor="end"
        fill={moving > 0 ? c.green : c.sub}
        weight={710}
      >
        Thinking model
      </Label>
    </g>
  );
}
export function Retry({ f }: { f: number }) {
  const starts = [e.quoteStart, e.quoteHard, e.quoteAbout, e.quoteEnd];
  const count = starts.filter((at) => f >= at).length;
  const done = ease(f, e.think - 2, 10);
  const rise = ease(f, e.quoteEnd + 5, 24);
  if (f >= e.success) return <Success f={f} />;
  return (
    <>
      <g transform={"translate(0 " + (1 - rise) * 226 + ")"}>
        <rect
          x="109"
          y="237"
          width="862"
          height="251"
          rx="31"
          fill="#fffaf0"
          stroke="#cdbfae"
          strokeWidth="4"
        />
        <Label
          x={540}
          y={323}
          size={54}
          weight={750}
          anchor="middle"
          spacing={-2}
        >
          {promptTask}
        </Label>
        {count === 0 ? (
          <g>
            <Label
              x={540}
              y={427}
              size={51}
              fill="#856576"
              anchor="middle"
              mono
            >
              {promptEnding}
            </Label>
            <path
              d="M269 408H817"
              stroke="#b36168"
              strokeWidth="6"
              strokeLinecap="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - ease(f, e.quoteStart - 13, 12)}
            />
          </g>
        ) : (
          <Chips
            x={198}
            y={361}
            scale={1.31}
            pieces={screen.thinking}
            widths={[130, 112, 139, 112]}
            visible={count}
          />
        )}
        <Label x={540} y={475} size={23} fill={c.sub} anchor="middle">
          GPT-5 launch post · OpenAI, August 2025
        </Label>
      </g>
      <g opacity={ease(f, e.quoteEnd + 13, 18)} transform="translate(0 130)">
        <RetryPath f={f} />
      </g>
      <g opacity={done} transform={`translate(0 ${(1 - done) * 12})`}>
        <rect x="74" y="969" width="930" height="213" rx="24" fill="#342a42" />
        <Label x={107} y={1023} size={24} fill="#cfbfd9" mono>
          login form / field name
        </Label>
        <Label x={107} y={1118} size={48} fill="#e5afba" mono>
          {screen.oldField}
        </Label>
        <Label x={464} y={1114} size={43} fill="#e9d9f1">
          →
        </Label>
        <Label x={549} y={1118} size={48} fill="#b1e2ce" mono>
          {screen.newField}
        </Label>
      </g>
    </>
  );
}
export function Success({ f }: { f: number }) {
  return (
    <>
      <Clock later />
      <g transform={`translate(70 ${888 + arc(f, e.success, 15) * -6})`}>
        <rect
          width="940"
          height="165"
          rx="28"
          fill="#d8efdf"
          stroke="#99c4ad"
          strokeWidth="3"
        />
        <circle cx="77" cy="84" r="33" fill="#33816a" />
        <Check x={77} y={84} color="#fffaf0" scale={1.17} />
        <Label x={143} y={77} size={31} fill="#31614f" weight={580}>
          Login successful
        </Label>
        <Label x={143} y={129} size={47} fill="#254c3f" weight={755}>
          Welcome back, Alex.
        </Label>
      </g>
      <Courier x={789} y={1087} f={f} scale={0.76} mood="happy" night />
    </>
  );
}
