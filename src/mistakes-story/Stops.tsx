import { Capsule, Chips, Courier, Label } from "./Drawing";
import {
  arc,
  e,
  ease,
  lerp,
  palette as c,
  phase,
  requestId,
  screen,
  st,
} from "./timing";

export function HardwareFinish() {
  return (
    <defs>
      <linearGradient
        id="mn4-case"
        x1="0"
        x2=".86"
        y1="0"
        y2="1"
        gradientUnits="objectBoundingBox"
      >
        <stop stopColor="#665b70" />
        <stop offset=".26" stopColor="#413b4d" />
        <stop offset=".7" stopColor="#302b3c" />
        <stop offset="1" stopColor="#514558" />
      </linearGradient>
      <linearGradient id="mn4-edge" x2=".8" y2="1">
        <stop stopColor="#e3d6d4" />
        <stop offset=".31" stopColor="#9b8fa4" />
        <stop offset=".58" stopColor="#665d72" />
        <stop offset="1" stopColor="#a398ac" />
      </linearGradient>
      <linearGradient id="mn4-dark" x2="0" y2="1">
        <stop stopColor="#201c28" />
        <stop offset="1" stopColor="#302737" />
      </linearGradient>
      <linearGradient id="mn4-gold" x2=".88" y2="1">
        <stop stopColor="#fff2bf" />
        <stop offset=".55" stopColor="#f1c676" />
        <stop offset="1" stopColor="#d79947" />
      </linearGradient>
    </defs>
  );
}

function Screws({ points }: { points: number[][] }) {
  return (
    <g>
      {points.map(([x, y]) => (
        <g key={x + "-" + y} transform={`translate(${x} ${y})`}>
          <circle r="8" fill="#211d2a" stroke="#968999" strokeWidth="2" />
          <path d="m-3 3 6-6" stroke="#a499a9" strokeWidth="1.6" />
        </g>
      ))}
    </g>
  );
}

export function Gate({ f }: { f: number }) {
  const scan = ease(f, e.check - 5, 18) * (1 - ease(f, e.under + 1, 13));
  const stamp = ease(f, e.identity - 1, 5);
  const quota = f >= e.secondCheck;
  const open = ease(f, e.under, 30);
  const enter = ease(f, st.gate, 42);
  const depart = ease(f, e.under + 12, 49);
  const x = lerp(96, 361, enter) + 326 * depart;
  const status =
    f < e.identity
      ? "SCAN ID"
      : !quota
        ? "ID VERIFIED"
        : f < e.under
          ? "CHECKING LIMIT"
          : "1 LEFT";
  const display = f >= e.under ? "#a9edcc" : "#f3d79e";
  const press =
    f < e.identity
      ? ease(f, e.identity - 10, 10)
      : 1 - ease(f, e.identity + 2, 10);
  return (
    <g>
      <ellipse
        cx="543"
        cy="1066"
        rx="389"
        ry="37"
        fill="#6c5c78"
        opacity=".16"
      />
      <path
        d="M120 994 210 943H895L971 996V1033L899 1058H190L120 1031Z"
        fill="url(#mn4-edge)"
        stroke="#574b61"
        strokeWidth="4"
      />
      <path d="M120 994 210 943H895L971 996 899 1020H190Z" fill="#74667d" />
      <path d="M144 1004H947" stroke="#b5a3b7" strokeWidth="3" />
      <path
        d="M239 973V501Q239 344 394 344H694Q850 344 850 501V973"
        fill="none"
        stroke="#342d3d"
        strokeWidth="116"
        strokeLinejoin="round"
      />
      <path
        d="M225 955V493Q225 335 387 335H685Q831 335 831 493V957"
        fill="none"
        stroke="url(#mn4-edge)"
        strokeWidth="103"
      />
      <path
        d="M225 955V493Q225 335 387 335H685Q831 335 831 493V957"
        fill="none"
        stroke="url(#mn4-case)"
        strokeWidth="86"
      />
      <path
        d="M263 942V498Q263 377 390 377H681Q790 377 790 498V942"
        fill="none"
        stroke={open > 0 ? "#84d3ae" : "#e3b876"}
        strokeWidth="7"
        opacity=".9"
      />
      <g transform="translate(325 278)">
        <rect
          width="418"
          height="103"
          rx="25"
          fill="#302b38"
          stroke="#a194a5"
          strokeWidth="4"
        />
        <path
          d="M28 61H100Q108 60 108 53Q106 44 98 44Q96 29 82 28Q68 22 56 31Q47 34 45 47Q29 44 27 55Z"
          fill="#f6a954"
        />
        <Label
          x={126}
          y={67}
          size={44}
          fill="#faf4e9"
          weight={700}
          spacing={-1.8}
        >
          Cloudflare
        </Label>
      </g>
      <rect
        x="353"
        y="425"
        width="373"
        height="90"
        rx="16"
        fill="#221e28"
        stroke="#736175"
        strokeWidth="4"
      />
      <circle cx="389" cy="471" r="8" fill={display} />
      <Label
        x={550}
        y={484}
        size={status.length > 10 ? 32 : 39}
        fill={display}
        anchor="middle"
        mono
      >
        {status}
      </Label>
      <g opacity={1 - open}>
        <path
          d="M241 770H494L511 782V805H240Z M834 770H582L565 782V805H834Z"
          fill="#ad8e6a"
          stroke="#64535e"
          strokeWidth="3"
          transform={`scale(1 ${1 - 0.72 * open}) translate(0 ${open * 400})`}
        />
      </g>
      <Courier
        x={x}
        y={730 - 13 * arc(f, e.under + 12, 49)}
        scale={1.58}
        f={f}
        walk={(enter > 0 && enter < 1) || (depart > 0 && depart < 1) ? 1 : 0}
        mood={open > 0.6 ? "happy" : "ready"}
      />
      <g opacity={scan} transform={`translate(0 ${(1 - scan) * 65})`}>
        <rect
          x="343"
          y="572"
          width="386"
          height="130"
          rx="21"
          fill="url(#mn4-gold)"
          stroke="#6c4f45"
          strokeWidth="5"
        />
        <rect
          x="355"
          y="584"
          width="362"
          height="106"
          rx="14"
          fill="none"
          stroke="#fdf0c3"
          strokeWidth="3"
        />
        <Label x={381} y={617} size={22} fill="#70523e" mono>
          REQUEST ID
        </Label>
        <Label x={381} y={665} size={42} fill="#342b32" mono>
          {requestId}
        </Label>
        <g opacity={stamp} transform="translate(657 643) rotate(-10)">
          <circle r="33" fill="#dae7b9" stroke="#3e7858" strokeWidth="5" />
          <path
            d="m-16 0 11 10 21-23"
            fill="none"
            stroke="#397653"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
      <g
        opacity={arc(f, e.identity - 12, 25)}
        transform={`translate(650 ${487 + press * 105})`}
      >
        <rect
          x="-20"
          y="-42"
          width="40"
          height="78"
          rx="8"
          fill="url(#mn4-edge)"
        />
        <rect
          x="-46"
          y="29"
          width="92"
          height="24"
          rx="5"
          fill="#5a4653"
          stroke="#322b3c"
          strokeWidth="3"
        />
      </g>
    </g>
  );
}

export function Tokens({ f }: { f: number }) {
  const unfold = ease(f, e.chop - 3, 23);
  const upper = f >= e.caps;
  const change = ease(f, e.caps, 16);
  const count = upper ? 6 : 3;
  return (
    <g>
      <ellipse
        cx="542"
        cy="989"
        rx="351"
        ry="29"
        fill="#725f6c"
        opacity=".13"
      />
      <g transform={`translate(0 ${(1 - unfold) * 36})`}>
        <path
          d="M139 522 184 477H910Q950 479 950 518V858Q949 902 907 911H189Q143 906 138 868Z"
          fill="#bf8a53"
          stroke="#614852"
          strokeWidth="5"
        />
        <rect
          x="132"
          y="492"
          width="804"
          height="391"
          rx="36"
          fill="url(#mn4-gold)"
          stroke="#584253"
          strokeWidth="6"
        />
        <path
          d="M151 520 512 698Q540 713 568 697L917 521"
          fill="none"
          stroke="#cb965d"
          strokeWidth="6"
        />
        <g opacity={unfold} transform={`translate(0 ${(1 - unfold) * 75})`}>
          <rect
            x="163"
            y="495"
            width="742"
            height="329"
            rx="21"
            fill="#fff8e9"
            stroke="#dfc6a4"
            strokeWidth="4"
          />
          <Label x={535} y={589} size={51} fill="#483348" mono anchor="middle">
            {upper ? "MAKE NO MISTAKES" : "make no mistakes"}
          </Label>
          <path
            d="M202 630H867"
            stroke="#dfcdb4"
            strokeWidth="3"
            strokeDasharray="7 8"
          />
          {upper ? (
            <g opacity={0.4 + 0.6 * change}>
              <Chips
                x={217}
                y={676}
                pieces={screen.inCaps}
                widths={[108, 77, 54, 82, 72, 67]}
                scale={1.28}
              />
            </g>
          ) : (
            <Chips
              x={283}
              y={676}
              pieces={screen.asTyped}
              widths={[107, 78, 172]}
              scale={1.35}
            />
          )}
        </g>
        <g opacity={1 - unfold}>
          <Label x={535} y={748} size={54} fill="#443144" mono anchor="middle">
            {screen.asTyped.join("")}
          </Label>
        </g>
      </g>
      <g
        transform={`translate(${lerp(406, 425, unfold)} ${lerp(330, 226, unfold)})`}
      >
        <Courier f={f} x={0} y={0} scale={1.22} shadow={false} />
      </g>
      <g opacity={ease(f, e.three - 8, 12)}>
        <Label
          x={540}
          y={1020}
          size={75}
          anchor="middle"
          fill={upper ? "#694783" : "#43354a"}
          spacing={-3}
        >
          {count} tokens
        </Label>
        <g opacity={ease(f, e.double - 4, 12)}>
          <Label x={540} y={1093} size={42} fill="#786044" anchor="middle">
            ×2 input for this phrase
          </Label>
        </g>
      </g>
    </g>
  );
}

export function GPU({ f }: { f: number }) {
  const remove = ease(f, e.free, 12);
  const flight = ease(f, e.enter, e.land - e.enter);
  const active = flight === 1;
  const x = lerp(68, 361, flight),
    y = lerp(751, 524, flight) - arc(f, e.enter, e.land - e.enter) * 100;
  return (
    <g>
      <ellipse
        cx="568"
        cy="1023"
        rx="370"
        ry="40"
        fill="#6c5b78"
        opacity=".18"
      />
      <path
        d="M180 414 239 357H913L965 401V928L900 983H211Z"
        fill="url(#mn4-edge)"
        stroke="#54485f"
        strokeWidth="6"
      />
      <path d="M185 416 238 370H904L942 404 899 442Z" fill="#a294ac" />
      <rect
        x="174"
        y="406"
        width="731"
        height="565"
        rx="33"
        fill="url(#mn4-case)"
        stroke="#4e435b"
        strokeWidth="6"
      />
      <path d="M200 433H875" stroke="#afa1b7" strokeWidth="3" />
      <Label x={237} y={486} size={45} fill="#f3e8df" weight={780} spacing={-2}>
        GPU
      </Label>
      <Label x={843} y={479} size={25} fill="#c3b6c7" anchor="end" mono>
        batch
      </Label>
      <rect
        x="227"
        y="513"
        width="624"
        height="192"
        rx="17"
        fill="#1c1a24"
        stroke={remove > 0 ? "#eac57e" : "#97859e"}
        strokeWidth="6"
      />
      <rect
        x="242"
        y="528"
        width="594"
        height="162"
        rx="11"
        fill="url(#mn4-dark)"
        stroke="#635365"
        strokeWidth="2"
      />
      <circle
        cx="798"
        cy="608"
        r="12"
        fill={active ? "#99dcbd" : remove > 0 ? "#ecc784" : "#83a699"}
      />
      <g opacity={1 - remove} transform={`translate(${remove * 90} 0)`}>
        <Label x={298} y={624} size={51} fill="#e7dce8" mono>
          job-17
        </Label>
        <Label x={716} y={621} size={29} fill="#c1afc5" anchor="end">
          running
        </Label>
      </g>
      <g opacity={remove * (1 - ease(f, e.enter, 14))}>
        <Label x={529} y={626} size={40} fill="#d8bc89" anchor="middle">
          Slot open
        </Label>
      </g>
      {[749, 842].map((yy, i) => (
        <g key={yy} opacity=".54">
          <rect
            x="233"
            y={yy}
            width="613"
            height="66"
            rx="11"
            fill="#312b3a"
            stroke="#76697c"
            strokeWidth="2"
          />
          <Label x={271} y={yy + 44} size={27} fill="#a79bae" mono>
            job-{18 + i}
          </Label>
          <path
            d={`M655 ${yy + 33}h111`}
            stroke="#8d8092"
            strokeWidth="6"
            strokeDasharray="3 9"
          />
          <circle cx="797" cy={yy + 34} r="6" fill="#98b3a5" />
        </g>
      ))}
      <Screws
        points={[
          [204, 451],
          [876, 451],
          [204, 930],
          [877, 930],
        ]}
      />
      <Courier
        x={x}
        y={y}
        scale={lerp(1.54, 1.05, flight)}
        f={f}
        walk={flight > 0 && flight < 1 ? 1 : 0}
        shadow={!active}
        mood={active ? "happy" : "ready"}
      />
      {active && (
        <Label x={748} y={622} size={32} fill="#b2dfc8" anchor="end">
          running
        </Label>
      )}
      <g opacity={ease(f, e.write, 15)}>
        <rect
          x="183"
          y="1012"
          width="715"
          height="107"
          rx="18"
          fill="#e5dce7"
          stroke="#c7b8ce"
          strokeWidth="3"
        />
        <Label x={222} y={1080} size={46} mono>
          {screen.replyTokens
            .slice(
              0,
              Math.min(4, Math.floor(Math.max(0, f - e.write) / 13) + 1),
            )
            .join("")}
        </Label>
      </g>
    </g>
  );
}

export function Stream({ f }: { f: number }) {
  const pieces = screen.replyTokens;
  const first = e.ship + 2;
  const duration = e.type - first - 22;
  const travel = phase(f, first, duration);
  const visible = Math.min(pieces.length, Math.floor(travel * pieces.length));
  const frac = (travel * pieces.length) % 1;
  return (
    <g>
      <ellipse
        cx="545"
        cy="1035"
        rx="383"
        ry="35"
        fill="#6b6477"
        opacity=".16"
      />
      <path
        d="M160 421Q160 384 201 384H883Q924 384 924 427V921H160Z"
        fill="url(#mn4-edge)"
        stroke="#51475b"
        strokeWidth="5"
      />
      <rect x="177" y="402" width="729" height="505" rx="24" fill="#292331" />
      <rect x="198" y="450" width="687" height="427" rx="13" fill="#332b40" />
      <circle cx="542" cy="426" r="7" fill="#63586e" />
      <circle cx="246" cy="516" r="9" fill="#e7bb6f" />
      <Label x={275} y={528} size={29} fill="#d7c4d8" mono>
        {requestId} / reply
      </Label>
      <path d="M232 565H851" stroke="#66536c" strokeWidth="3" />
      <Label x={232} y={669} size={44} fill="#fff1d5" mono>
        {pieces.slice(0, Math.min(5, visible)).join("")}
        {visible < 5 ? "▏" : ""}
      </Label>
      {visible >= 5 && (
        <Label x={232} y={736} size={46} fill="#f4cc88" mono>
          {pieces.slice(5, visible).join("")}▏
        </Label>
      )}
      <path
        d="M160 905H924L1006 964Q1001 997 953 1001H127Q80 997 75 964Z"
        fill="url(#mn4-edge)"
        stroke="#574c61"
        strokeWidth="5"
      />
      <path d="M76 964H1006" stroke="#bfb2c3" strokeWidth="5" />
      <path
        d="M440 925H647L658 945H429Z"
        fill="#767080"
        stroke="#56505e"
        strokeWidth="2"
      />
      <g opacity={1 - ease(f, e.type - 23, 17)}>
        <Courier x={111} y={223} f={f} scale={1.1} shadow={false} />
      </g>
      {travel < 1 && f >= first && (
        <g
          opacity={Math.sin(Math.PI * frac)}
          transform={`translate(${lerp(320, 463, frac)} ${lerp(334, 440, frac)})`}
        >
          <rect
            width="147"
            height="59"
            x="-72"
            y="-30"
            rx="12"
            fill="#f3d599"
            stroke="#94764d"
            strokeWidth="3"
          />
          <Label x={0} y={11} size={28} mono anchor="middle">
            {pieces[visible].trim()}
          </Label>
        </g>
      )}
    </g>
  );
}
export function Database({ f }: { f: number }) {
  const reveal = ease(f, e.pg - 12, 24),
    saved = ease(f, e.save - 3, 13),
    sign = ease(f, e.tired - 3, 11);
  return (
    <>
      <g opacity={1 - reveal}>
        <path
          d="M154 697H905"
          stroke="#c4b2d4"
          strokeWidth="5"
          strokeDasharray="10 14"
        />
        <Courier
          x={lerp(129, 453, ease(f, st.database, 60))}
          y={514}
          scale={1.13}
          f={f}
          walk={f < st.database + 60 ? 1 : 0}
        />
        <g opacity={saved}>
          <Capsule
            x={325}
            y={789}
            w={443}
            h={82}
            size={35}
            text="✓  Conversation saved"
            bg={c.mint}
            fg={c.green}
          />
        </g>
      </g>
      <g opacity={reveal} transform={`translate(0 ${(1 - reveal) * 26})`}>
        <ellipse
          cx="617"
          cy="944"
          rx="243"
          ry="29"
          fill="#a797b6"
          opacity=".22"
        />
        {[2, 1, 0].map((i) => (
          <g key={i} transform={`translate(0 ${i * 85})`}>
            <path
              d="M386 506V610C386 697 848 697 848 610V506Z"
              fill={["#65596f", "#584c64", "#4a4058"][i]}
              stroke="#5d4878"
              strokeWidth="4"
            />
            <ellipse
              cx="617"
              cy="507"
              rx="231"
              ry="65"
              fill={i === 0 ? "url(#mn4-edge)" : "#9986a8"}
              stroke="#6b527f"
              strokeWidth="4"
            />
            <circle cx="772" cy="624" r="6" fill="#ddf1ce" />
            <circle cx="793" cy="621" r="6" fill="#d7c7e4" />
          </g>
        ))}
        <path
          d="M81 759 H337m-22-14 24 14-24 14"
          fill="none"
          stroke="#9b83b3"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <Courier
          x={lerp(80, 213, ease(f, e.main, e.writes - e.main))}
          y={566}
          scale={1.1}
          f={f}
          walk={f > e.main && f < e.writes ? 1 : 0}
        />
        <Label x={617} y={982} size={29} fill={c.sub} anchor="middle">
          PostgreSQL · January 2026
        </Label>
        <Label x={617} y={1050} anchor="middle" size={48}>
          One primary writer
        </Label>
        <g
          opacity={sign}
          transform={`translate(616 640) rotate(${-7 - 10 * (1 - sign)})`}
        >
          <rect
            x="-203"
            y="-46"
            width="407"
            height="85"
            rx="7"
            fill="#f3cc79"
            stroke="#423046"
            strokeWidth="4"
          />
          <Label
            x={0}
            y={13}
            size={36}
            weight={850}
            anchor="middle"
            spacing={1}
          >
            DO NOT TOUCH
          </Label>
        </g>
        <path
          d="M816 500Q788 549 812 557Q848 558 822 513Z"
          fill="#8ac7d1"
          stroke="#50798e"
          strokeWidth="3"
          opacity={sign}
        />
      </g>
    </>
  );
}
