import { Arm } from "./Hands";
import { Head, eyelid } from "./Head";
import { host, type Rig } from "./rig";
import { Burst, ease, P, T, tr, type Shot } from "./art";
function Torso({ rig }: { rig: Rig }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path
        d="M351 348Q378 383 373 446L345 475Q375 530 463 547Q518 513 552 463Q523 451 520 411L516 369Z"
        fill="#eca678"
        stroke="#292129"
        strokeWidth="6"
      />
      <path
        d="M354 358q65 76 164 57l12 46q-63-9-117-63l-36-12z"
        fill="#d08766"
      />
      <path
        d="M371 448Q413 499 477 493Q508 488 534 452L589 482L610 856Q503 894 349 855L331 485Z"
        fill="#465a83"
        stroke="#232730"
        strokeWidth="6"
      />
      <path
        d="M383 468q77 70 146-2"
        stroke="#253347"
        strokeWidth="9"
        fill="none"
      />
      <path
        d="M385 475q75 65 140-2"
        stroke="#5c7198"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M370 405Q326 401 293 432L245 473Q217 498 216 535L251 721L241 852Q283 881 378 871L392 630Q397 541 361 474Q337 443 370 405Z"
        fill="#30384f"
        stroke="#25222b"
        strokeWidth="6"
      />
      <path
        d="M528 405Q573 399 613 436L653 472Q672 498 660 552L628 699L643 850Q609 872 553 879L551 638Q545 533 561 473Q563 431 528 405Z"
        fill="#30384f"
        stroke="#25222b"
        strokeWidth="6"
      />
      <path
        d="M368 407Q313 405 283 451L266 484Q316 483 361 517L390 584Q386 506 361 476Q341 447 368 407Z"
        fill="#444e68"
        stroke="#21202a"
        strokeWidth="5.4"
      />
      <path
        d="M529 406q50-8 88 39l26 35q-43 1-75 32l-17 62q-9-63 3-101q11-35-25-67Z"
        fill="#404961"
        stroke="#25232e"
        strokeWidth="5.4"
      />
      <path
        d="M220 542q45 56 38 132l-9 44q57-46 37-106zM266 781q60 14 92-39q-10 57-97 81zM586 718q40-24 59-67q-3 47-19 80zM577 802l58-42-7 25z"
        fill="#262d43"
      />
      <path
        d="M344 474q28 58 23 163l-5 60M571 472q-15 81-8 151l6 43"
        fill="none"
        stroke="#1d2029"
        strokeWidth="10"
      />
      <g stroke="#e9e1d3" strokeWidth="5.5" fill="none">
        <path d={"M344 477q25 64 21 153l-" + (3 + rig.strain * 30) + " 55"} />
        <path d="M571 474q-16 74-7 145l5 39" />
      </g>
      <path
        d="M358 676l8 1-1 14-8 1ZM564 650l9-1 3 14-8 2Z"
        fill="#dfd9cc"
        stroke="#363641"
        strokeWidth="2"
      />
      <path
        d="M386 553q13 104-7 311M550 554q-7 115 6 307"
        fill="none"
        stroke="#999ba6"
        strokeWidth="3"
      />
      <path
        d="M273 825l62-38m253 15l36 30"
        stroke="#212730"
        strokeWidth="6"
        fill="none"
      />
      <path
        d="M409 763q44-1 84-23q-29 29-66 33m40 52q35-4 66-27"
        fill="none"
        stroke="#3a4d72"
        strokeWidth="6"
      />
    </g>
  );
}
export function Alex({ rig, f }: { rig: Rig; f: number }) {
  return (
    <g
      transform={`translate(${host.x} ${host.y + rig.breath}) scale(${host.scale * (1 - rig.strain * 0.89)} ${host.scale * (1 + rig.strain)}) rotate(${rig.lean}) translate(${-host.anchorX} ${-host.anchorY})`}
    >
      <Torso rig={rig} />
      <Arm rig={rig} left />
      <Head rig={rig} f={f} blink={eyelid(f)} />
      <Arm rig={rig} left={false} />
    </g>
  );
}
export function NoKey({ f, edit }: Shot) {
  const q = edit.cues;
  if (f < q.risky - 17 || f > q.memory + 8) return null;
  const enter = ease(f, q.risky - 17, 14),
    leave = 1 - ease(f, q.memory - 3, 11),
    hit = f >= q.no;
  const down = hit ? 6 * (1 - ease(f, q.no + 2, 8)) : 0;
  return (
    <g opacity={enter * leave}>
      <path
        d="M749 787C848 802 872 850 873 924V1334Q873 1409 809 1441"
        stroke={hit ? "#729980" : "#8d7462"}
        opacity=".72"
        strokeDasharray="5 10"
        strokeWidth="3"
        fill="none"
      />
      <g transform={tr(681, 1479 + down)}>
        <rect
          x="-2"
          y="-4"
          width="153"
          height="48"
          rx="13"
          fill={hit ? "#385143" : "#603f32"}
          stroke="#1b1c21"
          strokeWidth="5"
        />
        <rect
          x="-2"
          y="-10"
          width="153"
          height="42"
          rx="12"
          fill={hit ? P.green : P.orange}
          stroke="#26262d"
          strokeWidth="4"
        />
        <T x={72} y={19} color="#26262d" size={32} anchor="middle" weight={850}>
          No
        </T>
      </g>
      <Burst
        f={f}
        at={q.no}
        x={752}
        y={1471}
        r={82}
        color={P.orange}
        span={14}
      />
      {f >= q.no - 3 && f <= q.no + 3 && (
        <g
          fill="none"
          stroke={P.orange}
          strokeLinecap="round"
          opacity={f < q.no ? 0.65 : (1 - ease(f, q.no, 4)) * 0.6}
        >
          <path d="M755 1329q21 33 26 75" strokeWidth="5" />
          <path d="M774 1351q14 24 16 51" strokeWidth="3" />
        </g>
      )}
    </g>
  );
}
export function ReturnPacket({
  f,
  edit,
  rigTarget,
}: {
  f: number;
  edit: Shot["edit"];
  rigTarget: { x: number; y: number };
}) {
  const q = edit.cues;
  const timings = [
    [q.error - 3, q.back + 4, "−1"],
    [q.red2 + 3, q.again + 3, "“23”"],
  ] as const;
  const lane = timings.find(([a, b]) => f >= a && f <= b + 4);
  if (!lane) return null;
  const [a, b, text] = lane;
  const t = Math.max(0, Math.min(1, (f - a) / (b - a))),
    s = t * t * (3 - 2 * t);
  const sx = 708,
    sy = 684,
    ex = rigTarget.x + 7,
    ey = rigTarget.y - 35;
  const cx =
    (1 - s) ** 3 * sx +
    3 * (1 - s) ** 2 * s * 915 +
    3 * (1 - s) * s * s * 897 +
    s ** 3 * ex;
  const cy =
    (1 - s) ** 3 * sy +
    3 * (1 - s) ** 2 * s * 734 +
    3 * (1 - s) * s * s * (ey - 141) +
    s ** 3 * ey;
  return (
    <g
      opacity={1 - ease(f, b, 5)}
      transform={`translate(${cx} ${cy}) rotate(${-11 * Math.sin(s * Math.PI)})`}
    >
      <rect
        x="-45"
        y="-27"
        width="90"
        height="54"
        rx="16"
        fill={P.red}
        stroke="#2a2126"
        strokeWidth="4"
      />
      <T x={0} y={12} size={32} anchor="middle" color="#32272c" weight={850}>
        {text}
      </T>
    </g>
  );
}
