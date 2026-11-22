import edit from "../../episodes/norbert-explains-billionaire-income-tax/edit.json";
import { Canvas, smooth } from "../beer/graphics";
import { ink, paper, SecurityPaper } from "./Paper";

const e = edit.events;
export const certificateSeal = { x: 307, y: 955, scale: 1.18 };

function EngravedBackdrop() {
  return (
    <g>
      <defs>
        <radialGradient id="ledger-teal" cx=".48" cy=".45" r=".82">
          <stop stopColor="#568b76" />
          <stop offset=".50" stopColor="#346c60" />
          <stop offset="1" stopColor="#173e3c" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#ledger-teal)" />
      {[
        [50, 64, -26],
        [1084, 1788, -45],
      ].map(([x, y, r]) => (
        <g
          key={y}
          transform={`translate(${x} ${y}) rotate(${r})`}
          fill="none"
          stroke="#b8d0a8"
          opacity=".12"
          strokeWidth="2"
        >
          {Array.from({ length: 17 }, (_, i) => (
            <ellipse
              key={i}
              rx={255 + i * 13}
              ry={105 + i * 8}
              transform={`rotate(${i * 2})`}
            />
          ))}
        </g>
      ))}
      <path
        d="M0 1673q236-181 530-83t550-77v407H0Z"
        fill="#204f47"
        opacity=".48"
      />
      <path
        d="M0 1690q257-172 532-86t548-74"
        fill="none"
        stroke="#a2b991"
        opacity=".19"
        strokeWidth="2"
      />
    </g>
  );
}

function PriceTag({
  x,
  y,
  tilt,
  value,
  warm,
}: {
  x: number;
  y: number;
  tilt: number;
  value: string;
  warm?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <ellipse cy="176" rx="115" ry="10" fill="#143d36" opacity=".18" />
      <path
        d="M-10 11q-14-19 0-44t18-8q4 15-9 41"
        fill="none"
        stroke="#d4be85"
        strokeWidth="5"
      />
      <path
        d="m-98 23 69-26 31 6 34-5 77 29 3 113q0 11-13 12l-194 4q-16 0-15-14Z"
        fill="#153d36"
        opacity=".3"
        transform="translate(6 9)"
      />
      <path
        d="m-98 23 69-26 31 6 34-5 77 29 3 113q0 11-13 12l-194 4q-16 0-15-14Z"
        fill={warm ? "#f6d18b" : "#e2e3c4"}
        stroke="#425f50"
        strokeWidth="4"
      />
      <path
        d="M-89 34q86-13 187-5M-90 131l185-4"
        fill="none"
        stroke={warm ? "#c3985f" : "#92a38b"}
        strokeWidth="2"
      />
      <circle cy="12" r="8" fill="#52705a" stroke="#c8ad72" strokeWidth="3" />
      <text
        x="4"
        y="112"
        textAnchor="middle"
        fill={ink}
        fontFamily="Fraunces"
        fontWeight="650"
        fontSize="86"
      >
        {value}
      </text>
    </g>
  );
}

function HoldingHand({ squeeze, thumb }: { squeeze: number; thumb: boolean }) {
  if (thumb)
    return (
      <g
        transform={`translate(${squeeze * 4} ${-squeeze * 9})`}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M116 1094q-6-34 16-64l57-77q10-13 25-5 12 7 8 22l-30 64 14-8q14-5 20 5 8 11-3 26l-38 53q-24 36-51 30"
          fill="#ebb87f"
          stroke="#765d48"
          strokeWidth="4"
        />
        <path
          d="m192 961q11-13 21-6 7 5 4 13l-8 15q-12 3-20-6Z"
          fill="#f4ce9f"
          stroke="#c28f67"
          strokeWidth="2"
        />
        <path
          d="m147 1084 27-30m-21 42 16-13"
          fill="none"
          stroke="#bd8d66"
          strokeWidth="3"
        />
      </g>
    );
  return (
    <g strokeLinejoin="round">
      <path
        d="M-50 1326 69 1210l78-109q18-29 47-32l104-18 17 21q-37 70-91 108-46 35-70 96L57 1402Z"
        fill="#dba674"
        stroke="#695c49"
        strokeWidth="5"
      />
      <path
        d="M-43 1330 76 1205q39 0 91 69l-108 121-100 53Z"
        fill="#385966"
        stroke="#294650"
        strokeWidth="7"
      />
      <path
        d="m56 1226 18-21q54 17 94 68l-20 22q-42-50-92-69Z"
        fill="#63808a"
        stroke="#365363"
        strokeWidth="3"
      />
      <path
        d="m-21 1372 59-66m-43 82 31-20"
        stroke="#839397"
        strokeWidth="4"
        fill="none"
      />
    </g>
  );
}

export function Cutaway({ t }: { t: number }) {
  const drop = smooth(t, e.double - 0.25, 0.38);
  const settle = Math.max(t - e.double - 0.13, 0);
  const swing = Math.sin(settle * 12) * Math.exp(-settle * 4) * 5;
  const slip = smooth(t, e.own - 0.1, e.sold - e.own + 0.1);
  const squeeze =
    smooth(t, e.share - 0.23, 0.23) *
    (1 - 0.45 * smooth(t, e.share + 0.05, 0.23));
  return (
    <Canvas>
      <EngravedBackdrop />
      <g fontFamily="DM Sans">
        <text
          x="540"
          y="390"
          fill="#f6edcb"
          textAnchor="middle"
          fontWeight="680"
          fontSize="59"
        >
          {paper.priceLabel}
        </text>
        <path
          d="M108 473Q514 419 975 468"
          fill="none"
          stroke="#224d42"
          strokeWidth="11"
        />
        <path
          d="M108 468Q514 414 975 463"
          fill="none"
          stroke="#b4af7b"
          strokeWidth="5"
        />
        <circle cx="111" cy="468" r="10" fill="#ccae70" />
        <circle cx="975" cy="463" r="10" fill="#ccae70" />
        <PriceTag x={323} y={492} tilt={-5} value={paper.oldPrice} />
        <g opacity={drop}>
          <path
            d="M493 561q40 4 89-1m-20-15 21 15-22 16"
            fill="none"
            stroke="#efdaa9"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <PriceTag
            x={755}
            y={492 - (1 - drop) * 96}
            tilt={4 + (1 - drop) * 12 + swing}
            value={paper.newPrice}
            warm
          />
        </g>
        <ellipse
          cx="546"
          cy="1170"
          rx="430"
          ry="36"
          fill="#214e43"
          opacity=".55"
        />
        <HoldingHand squeeze={squeeze} thumb={false} />
        <g opacity={slip} transform={`translate(0 ${(slip - 1) * 218})`}>
          <path
            d="m360 1086 561 2-9 225-22-4-17 7-21-5-18 5-16-5-16 7-23-5-16 6-19-6-15 5-23-5-20 6-22-5-18 5-15-5-22 5-17-5-20 6-207-2Z"
            fill="#fff0cc"
            stroke="#acaa88"
            strokeWidth="3"
          />
          <path
            d="m378 1166 516 2m-513 111 506 1"
            fill="none"
            stroke="#b9b19a"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
          <text x="398" y="1241" fill={ink} fontSize="50" fontWeight="700">
            {paper.soldLabel}
          </text>
          <text
            x="811"
            y="1251"
            fill={ink}
            textAnchor="middle"
            fontFamily="Fraunces"
            fontSize="90"
            fontWeight="670"
          >
            {paper.soldCount}
          </text>
        </g>
        <path
          d="m133 789 799-7 49 337-825 27-39-27Z"
          fill="#264f43"
          stroke="#184438"
          strokeWidth="5"
        />
        <g transform="translate(122 780)">
          <SecurityPaper width={837} height={342} />
          <path d="M310 65v208" stroke="#92a082" strokeWidth="2" />
          <g opacity={smooth(t, e.diagram + 0.08, 0.15)}>
            <text
              x="565"
              y="168"
              textAnchor="middle"
              fill={ink}
              fontFamily="Fraunces"
              fontSize="80"
              fontWeight="620"
            >
              {paper.quantity}
            </text>
            <text
              x="563"
              y="234"
              textAnchor="middle"
              fill={ink}
              fontSize="56"
              fontWeight="630"
            >
              {paper.unit}
            </text>
          </g>
        </g>
        <HoldingHand squeeze={squeeze} thumb />
      </g>
    </Canvas>
  );
}
