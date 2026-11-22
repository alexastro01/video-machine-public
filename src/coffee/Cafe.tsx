import { AbsoluteFill } from "remotion";
import { clockCut } from "./Binding";
import {
  Canvas,
  Cup,
  Miko,
  Moon,
  Steam,
  cherryClockMatch,
  cupCut,
  e,
  mix,
  smooth,
} from "./Illustration";

function Window({
  t,
  day,
  evening,
}: {
  t: number;
  day: number;
  evening: number;
}) {
  const sunX = 212 + day * 362,
    sunY = 715 - Math.sin(day * Math.PI) * 200;
  return (
    <g>
      <path
        d="M-54 1226V416Q-54 133 279 133h130q241 0 241 250v843Z"
        fill="#bb9d71"
      />
      <path
        d="M-42 1200V416q0-249 321-249h121q219 0 219 222v811Z"
        fill="url(#cafe-sky)"
      />
      <g clipPath="url(#cafewin)">
        <path d="M-60 750q190-184 400-34t360-83v580H-60Z" fill="#b7c4a8" />
        <g transform={`translate(${Math.sin(t * 0.18) * 5} 0)`} fill="#749c96">
          <path d="M-20 1042V884h68v-58h91v170h69V770h29v-31h21v31h54v211h61V860h101v116h55v-75h78v218Z" />
          <path
            d="M-60 1075q133-75 247-25t227-5q104-57 253-22v205H-60Z"
            fill="#588a82"
          />
        </g>
        <g transform={`translate(${sunX} ${sunY})`} fill="#fff2ac">
          <circle r="81" opacity=".18" />
          <circle r="62" opacity=".32" />
          <circle r="46" />
        </g>
        <path d="M-50 930 405 150h96L70 930Z" fill="#fffad3" opacity=".22" />
        <g fill="none" stroke="#cca77c" strokeWidth="16">
          <path d="M165 126v1100M-60 682h704M472 153v1072" />
        </g>
        <rect
          width="650"
          height="1250"
          fill="#554e83"
          opacity={evening * 0.32}
        />
      </g>
      <path d="M-45 1205h687v41H-45Z" fill="#b47856" />
    </g>
  );
}

export function CafeRoom({
  t,
  day = 0.2,
  evening = 0,
}: {
  t: number;
  day?: number;
  evening?: number;
}) {
  return (
    <Canvas>
      <defs>
        <linearGradient id="cafe-wall" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffedbb" />
          <stop offset="1" stopColor="#e6a67d" />
        </linearGradient>
        <linearGradient id="cafe-sky" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#86c6bd" />
          <stop offset=".7" stopColor="#f8df9b" />
          <stop offset="1" stopColor="#efb783" />
        </linearGradient>
        <clipPath id="cafewin">
          <path d="M-42 1200V416q0-249 321-249h121q219 0 219 222v811Z" />
        </clipPath>
      </defs>
      <rect width="1080" height="1920" fill="url(#cafe-wall)" />
      <path d="M747 0h333v1296H747Z" fill="#e8b283" />
      <path d="M776 0h304v1018H776Z" fill="#dba27a" />
      <path
        d="M811 0v1015m68-1015v1015m70-1015v1015m72-1015v1015"
        stroke="#c58c6e"
        strokeWidth="3"
      />
      <Window t={t} day={day} evening={evening} />
      <path d="M688 621h392v25H688Zm0 233h392v24H688Z" fill="#735b4c" />
      <path d="M699 615h381v9H699Zm0 232h381v10H699Z" fill="#a57c59" />
      {[759, 851, 949].map((x, i) => (
        <g transform={`translate(${x} ${612 - (i % 2) * 5})`} key={x}>
          <path
            d="M-28-66h56l-4 63h-47Z"
            fill={i === 1 ? "#ecce8e" : "#83a392"}
          />
          <path
            d="M27-52q31-7 23 16-5 14-25 13"
            fill="none"
            stroke={i === 1 ? "#ecce8e" : "#83a392"}
            strokeWidth="9"
          />
          <ellipse cy="-66" rx="28" ry="5" fill="#586e60" />
        </g>
      ))}
      <path d="M862 839v-80q0-95 84-99 67-2 68 60v119Z" fill="#547b75" />
      <path d="M895 835v-42h90v42Zm13-96h71v29h-71Z" fill="#2e5654" />
      <circle cx="948" cy="708" r="15" fill="#e2d7b2" />
      <path d="m949 708 7-7" stroke="#48605b" strokeWidth="3" />
      <path
        d="M-25 1060Q226 900 410 1070t260 73v224H-25Z"
        fill="#f8d8a2"
        opacity=".28"
      />
      <path d="M-50 1242 326 850l-177 395Z" fill="#fff9c3" opacity=".22" />
      <path
        d="M846-70v148Q846 178 824 189l-82 36q-18 10-16 22h253q2-13-18-23l-81-36q-18-9-18-39V-70"
        fill="#48635d"
      />
      <path d="M726 247q105 43 253 0Z" fill="#ffda91" />
      <rect x="0" y="1240" width="1080" height="680" fill="#b06d57" />
    </Canvas>
  );
}

function Counter() {
  return (
    <Canvas>
      <path d="m-50 1328 260-47h1106l-211 122H-50Z" fill="#d99b74" />
      <path d="m-50 1400 1153 0v25H-50Z" fill="#eca981" />
      <path d="m-40 1421 1130 0v500H-40Z" fill="#a85f4e" />
      <path
        d="M-25 1469h1130m-1105 182h1105m-1105 183h1105"
        stroke="#954f44"
        strokeWidth="4"
      />
      <path
        d="M-35 1313 141 1280h73L-33 1343Zm156 79 379-103h38l-313 103Z"
        fill="#f4c595"
        opacity=".55"
      />
      <path
        d="m786 1360 172-13m-138 22 56-4"
        stroke="#bb815f"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </Canvas>
  );
}

const clockX = 215,
  clockY = 1207,
  clockR = 78;

function TravelClock({ hours }: { hours: number }) {
  return (
    <g transform={`translate(${clockX} ${clockY})`}>
      <ellipse cy="87" rx="89" ry="11" fill="#7c544c" opacity=".26" />
      <path
        d="m-45 53-10 32m89-33 15 33"
        fill="none"
        stroke="#6f4941"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <circle r={clockR} fill="#ac5443" />
      <circle cy="-3" r="72" fill="#d77755" />
      <circle cy="-3" r="62" fill="#ffe9bd" stroke="#7f5349" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d={i % 3 === 0 ? "M0-56v9" : "M0-56v5"}
          transform={`translate(0 -3) rotate(${i * 30})`}
          stroke="#8a6653"
          strokeWidth={i % 3 === 0 ? 4 : 2}
          strokeLinecap="round"
        />
      ))}
      <g transform="translate(0 -3)" strokeLinecap="round">
        <path
          d="M0 4V-32"
          transform={`rotate(${hours * 30})`}
          stroke="#405757"
          strokeWidth="7"
        />
        <path
          d="M0 5V-48"
          transform={`rotate(${hours * 360})`}
          stroke="#405757"
          strokeWidth="5"
        />
        <circle r="7" fill="#b46a49" />
      </g>
    </g>
  );
}

function TableProps({ hours, book }: { hours: number; book: boolean }) {
  return (
    <Canvas>
      <TravelClock hours={hours} />
      {book ? (
        <g transform="translate(831 1332) rotate(-5)">
          <ellipse
            cx="10"
            cy="10"
            rx="106"
            ry="13"
            fill="#8d6252"
            opacity=".22"
          />
          <path d="m-98-19 160-7 36 18v17L-65 18l-33-17Z" fill="#294c41" />
          <path d="m-95-12 30 15 159-7v8l-160 9-29-14Z" fill="#d9be8b" />
          <path d="m-102-18 163-9 39 17-165 10Z" fill="#47674c" />
          <path d="m31-3 15-1 10 13-9-3-4 4Z" fill="#e6aa4f" />
        </g>
      ) : null}
    </Canvas>
  );
}

export function Cafe({
  t,
  scene,
}: {
  t: number;
  scene: "open" | "awake" | "alert" | "end";
}) {
  let action: "sip" | "focus" | "yawn" = "sip",
    frame = 0,
    scale = 1,
    dx = 0,
    dy = 0;
  let day = 0.17,
    evening = 0,
    left = -46,
    top = 247,
    width = 1110,
    hours = 7 + 10 / 60;
  if (scene === "open") {
    frame = (t + 0.065) * 10;
    scale = 1.1 - 0.1 * smooth(t, 0, 0.56) + smooth(t, cupCut - 0.51, 0.51);
    dx = 392 * (1 - scale);
    dy = 1020 * (1 - scale);
  } else if (scene === "awake") {
    action = "focus";
    left = -9;
    top = 213;
    width = 1080;
    frame = 0;
    const pull = smooth(t, e.awake - 0.15, 0.64),
      tick = smooth(t, e.awake - 0.01, 1.03);
    scale = mix(cherryClockMatch.radius / clockR, 1.035, pull);
    dx = mix(cherryClockMatch.x, clockX, pull) - clockX * scale;
    dy = mix(cherryClockMatch.y, clockY, pull) - clockY * scale;
    day = 0.16 + 0.69 * tick;
    hours += 4.57 * tick;
  } else if (scene === "alert") {
    action = "focus";
    left = -9;
    top = 213;
    width = 1080;
    frame = (t - e.alertWord + 0.28) * 10;
    scale = 1 + 0.13 * (1 - smooth(t, e.alert, 0.46));
    dx = 521 * (1 - scale);
    dy = 692 * (1 - scale);
    day = 0.75;
    hours = 12.25;
  } else {
    action = "yawn";
    frame = (t - e.yawnWord + 0.43) * 10;
    day = 0.89;
    evening = 0.75;
    left = -44;
    top = 253;
    hours = 15.57;
    const pull = smooth(t, clockCut, 0.49);
    scale =
      mix(1.49, 1.05, pull) +
      0.042 * smooth(t, e.yawnWord - 0.23, 0.31) -
      0.035 * smooth(t, e.yawnWord + 0.41, 0.39);
    dx = mix(305, clockX - 10, pull) - clockX * scale;
    dy = mix(876, 1212, pull) - clockY * scale;
  }
  return (
    <AbsoluteFill style={{ background: "#d5a67f", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${dx}px,${dy}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        <CafeRoom t={t} day={day} evening={evening} />
        <Miko
          action={action}
          frame={frame}
          left={left}
          top={
            top +
            (scene === "open" || scene === "end" ? Math.sin(t * 2.4) * 2.8 : 0)
          }
          width={width}
        />
        <Counter />
        <TableProps hours={hours} book={scene === "open" || scene === "end"} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function CupCloseup({ t }: { t: number }) {
  const local = Math.max(0, t - cupCut);
  // The source cel's rim is centered at (292, 488) in its 768px cell.
  // Match its projected center and width before moving into the tabletop shot.
  const travel = smooth(t, cupCut, 0.59);
  const width = mix(565, 1138, travel),
    x = mix(354, 546, travel),
    y = mix(986, 878, travel);
  const push = smooth(t, e.one + 0.21, 0.76);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#c98a67" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${1 + push * 0.43}) rotate(${-0.65 * Math.sin(Math.PI * travel)}deg)`,
          transformOrigin: "542px 702px",
        }}
      >
        <Canvas>
          <defs>
            <radialGradient id="cup-table">
              <stop stopColor="#f8dbae" />
              <stop offset="1" stopColor="#c57f5b" />
            </radialGradient>
          </defs>
          <rect
            x="-180"
            y="-120"
            width="1440"
            height="2200"
            fill="url(#cup-table)"
          />
          <path
            d="M-230 770 450-200h270L-192 1110ZM-40 1190 735-122h74L-45 1302Z"
            fill="#ffe8b2"
            opacity=".56"
          />
          <path
            d="M-120 1289 1260 802m-1360 936 1400-495M-147 433 973 73"
            fill="none"
            stroke="#a96e55"
            strokeWidth="4"
            opacity=".48"
          />
          <path d="m793 1467 453-217v634l-191 133Z" fill="#829b87" />
          <path
            d="m828 1515 410-188m-392 215 416-187m-388 238 402-189"
            fill="none"
            stroke="#c6d9b5"
            strokeWidth="8"
          />
          <ellipse
            cx={x + width * 0.006}
            cy={y + width * 0.23}
            rx={width * 0.36}
            ry={width * 0.078}
            fill="#825740"
            opacity=".17"
          />
        </Canvas>
        <Cup t={local} x={x} y={y} width={width} />
        <Canvas>
          <Steam x={x} y={y - width * 0.14} t={t} size={width / 760} />
        </Canvas>
      </div>
    </AbsoluteFill>
  );
}

export function Sleep({ t }: { t: number }) {
  const frame = (t - e.sleepWord + 0.7) * 10;
  const pull = smooth(t, e.sleep + 0.045, 0.74),
    camera = mix(1.068, 1, pull);
  return (
    <AbsoluteFill style={{ background: "#263a48", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${mix(-64, 0, pull)}px,${mix(-87, 0, pull)}px) scale(${camera})`,
          transformOrigin: "0 0",
        }}
      >
        <Canvas>
          <defs>
            <linearGradient id="night-wall" x2=".7" y2="1">
              <stop stopColor="#1b3548" />
              <stop offset="1" stopColor="#526776" />
            </linearGradient>
          </defs>
          <rect width="1080" height="1920" fill="url(#night-wall)" />
          <path
            d="M-61 1013V346q0-137 147-144h97q153 0 153 133v679Z"
            fill="#738496"
          />
          <path
            d="M-41 996V350q0-124 133-128h87q139-1 139 117v657Z"
            fill="#30465e"
          />
          <Moon x={133} y={397} scale={1.48} />
          {[
            [49, 501],
            [192, 311],
            [248, 466],
            [131, 635],
            [257, 547],
            [75, 358],
          ].map(([x, y], i) => (
            <circle key={x} cx={x} cy={y} r={2 + (i % 3)} fill="#f2dcb6" />
          ))}
          <path
            d="M198 217v791M-42 673h363"
            stroke="#768799"
            strokeWidth="11"
          />
          <path
            d="M243 1097V748q0-30 35-35l730-59q34-2 37 31l42 363Z"
            fill="#79636b"
          />
          <path
            d="m284 756 718-57m-711 95 712-55"
            stroke="#9b8481"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="m-80 1370 330-342q31-30 74-32l703-54q46-5 76 29l131 275Z"
            fill="#c6c6ae"
          />
          <path
            d="M258 1084q21-83-4-161-18-39 27-34 259 29 519-42 52-8 52 33-4 76 31 141 25 43-20 47-292-2-565 54-50 9-40-38Z"
            fill="#eaddbf"
          />
        </Canvas>
        <div
          style={{
            position: "absolute",
            inset: 0,
            filter: "brightness(.92) saturate(.84)",
          }}
        >
          <Miko
            action="midnight"
            frame={frame}
            left={141}
            top={447}
            width={795}
          />
        </div>
        <Canvas>
          <path
            d="M-54 1352q179-122 349-120 166 3 305 2 250-13 546-84v777H-54Z"
            fill="#3b746e"
          />
          <path
            d="M-59 1394q215-127 371-127 210 8 340-6 253-26 475-82"
            fill="none"
            stroke="#8ab3a1"
            strokeWidth="10"
          />
          <path d="M-42 1126 36 1083h268l-41 55H-42Z" fill="#ba9b80" />
          <path d="M-42 1139h313v274H-42Z" fill="#75676a" />
          <path d="M-23 1172h265v113H-23Z" fill="#887a75" />
          <path
            d="M77 1202h65"
            stroke="#d6ae83"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <g transform="translate(139 1022) rotate(-3)">
            <ellipse cy="81" rx="115" ry="11" fill="#66716c" opacity=".43" />
            <path
              d="m-80 53-6 24m161-24 5 24"
              stroke="#614b4d"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <rect
              x="-120"
              y="-63"
              width="247"
              height="129"
              rx="29"
              fill="#a35449"
            />
            <rect
              x="-114"
              y="-65"
              width="237"
              height="118"
              rx="27"
              fill="#cc795e"
            />
            <rect
              x="-98"
              y="-47"
              width="205"
              height="82"
              rx="14"
              fill="#263e42"
            />
            <text
              x="-82"
              y="15"
              fontFamily="DM Sans"
              fontWeight={700}
              fontSize="61"
              letterSpacing="-2"
              fill="#e8d99c"
            >
              2:13
            </text>
            <text
              x="56"
              y="10"
              fontFamily="DM Sans"
              fontWeight={750}
              fontSize="24"
              fill="#e6d5a0"
            >
              AM
            </text>
          </g>
        </Canvas>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
