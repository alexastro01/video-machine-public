import { AbsoluteFill } from "remotion";
import { CafeRoom } from "../coffee/Cafe";
import { Miko } from "../coffee/Illustration";
import { Canvas, mix, smooth } from "../beer/graphics";
import edit from "../../episodes/norbert-explains-billionaire-income-tax/edit.json";
import { HousePicture, SecurityPaper, ink, paper } from "./Paper";

const e = edit.events;
export const deskSeal = { x: 253, y: 961 };
const cameraPivot = { x: 560, y: 1060 };

export function deskZoom(t: number) {
  return (
    1 + 0.025 * smooth(t, 0, 2.4) + 0.17 * smooth(t, e.receipt - 0.2, 0.72)
  );
}

export function projectedSeal(t: number) {
  const k = deskZoom(t);
  return {
    x: cameraPivot.x + (deskSeal.x - cameraPivot.x) * k,
    y: cameraPivot.y + (deskSeal.y - cameraPivot.y) * k,
    scale: k,
  };
}

function DeskSurface() {
  return (
    <g>
      <defs>
        <linearGradient id="ledger-wood" x2=".2" y2="1">
          <stop stopColor="#d39a70" />
          <stop offset=".69" stopColor="#ba805e" />
          <stop offset="1" stopColor="#9f674e" />
        </linearGradient>
      </defs>
      <path d="m-90 853 227-44 1052 5v854H-90Z" fill="url(#ledger-wood)" />
      <path
        d="M-30 873q465-15 1150-8M-20 1600q422-19 1153-24"
        fill="none"
        stroke="#926f54"
        strokeWidth="3"
        opacity=".53"
      />
      <path
        d="m-25 916 256-103h134L-18 982Zm-22 94 483-196h34L-26 1042Z"
        fill="#f7cc96"
        opacity=".46"
      />
      <path
        d="M60 828q-15 0-17 22L8 1367q-2 22 22 24l1012 6q20 0 17-22l-54-518q-2-22-25-22Z"
        fill="#7b6550"
        opacity=".33"
      />
      <path
        d="M67 819q-20 0-22 20l-35 516q-2 22 22 24l1006 6q21 0 18-22l-54-518q-2-20-23-20Z"
        fill="#537a65"
        stroke="#46644e"
        strokeWidth="5"
      />
      <path
        d="M69 834 27 1364l1013 5-53-527Z"
        fill="none"
        stroke="#b1b08a"
        strokeWidth="2.4"
        strokeDasharray="8 6"
        opacity=".82"
      />
      <path d="M-5 1624q447-14 1100-25v34q-615 7-1100 25Z" fill="#e0a17a" />
      <path d="M-5 1653q513-13 1095-25v309H-5Z" fill="#a26a53" />
      <path
        d="M-5 1670q490-12 1095-25"
        fill="none"
        stroke="#875643"
        strokeWidth="5"
      />
      <path
        d="M118 1750q406-8 842-14l-3 142q-450 6-830 12Z"
        fill="none"
        stroke="#8f614d"
        strokeWidth="6"
      />
      <path
        d="M468 1784q65 23 142-2"
        fill="none"
        stroke="#795841"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M471 1779q62 18 135-2"
        fill="none"
        stroke="#d3ad71"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </g>
  );
}

function TaxReceipt({ t }: { t: number }) {
  const draw = smooth(t, e.zero - 0.05, 0.52);
  const pencil =
    smooth(t, e.zero - 0.37, 0.32) * (1 - smooth(t, e.zero + 0.63, 0.43));
  const point = (p: number) => {
    const a = -0.74 * Math.PI + p * 2.05 * Math.PI;
    return [793 + 107 * Math.cos(a), 1221 + 52 * Math.sin(a) - 5 * Math.cos(a)];
  };
  const ring = Array.from({ length: 71 }, (_, i) =>
    point(i / 70).join(","),
  ).join(" ");
  const [tipX, tipY] = point(draw);
  return (
    <g>
      <path d="m153 1121 797-5-10 201-785 18Z" fill="#2b3c30" opacity=".3" />
      <path
        d="m146 1112 804-8-12 203-21-5-14 7-15-6-15 7-17-5-17 6-22-5-15 7-20-4-15 5-25-4-13 5-24-4-12 5-30-4-12 5-26-4-15 5-463 7Z"
        fill="#fff5db"
        stroke="#b6a487"
        strokeWidth="2.6"
      />
      <path
        d="m177 1147 742-8m-738 139 739-9"
        fill="none"
        stroke="#c4b9a2"
        strokeWidth="2.3"
        strokeDasharray="5 5"
      />
      <text x="208" y="1206" fontSize="51" fontWeight="750" fill={ink}>
        {paper.taxLabel}
      </text>
      <text x="210" y="1255" fontSize="42" fontWeight="550" fill="#516756">
        {paper.taxScope}
      </text>
      <text
        x="791"
        y="1255"
        textAnchor="middle"
        fontFamily="Fraunces"
        fontSize="105"
        fontWeight="650"
        fill={ink}
      >
        {paper.taxAmount}
      </text>
      <polyline
        points={ring}
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset={1 - draw}
        opacity={draw > 0 ? 0.94 : 0}
        fill="none"
        stroke="#ad604c"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {pencil > 0 && (
        <g
          transform={`translate(${tipX + (1 - pencil) * 370} ${tipY - (1 - pencil) * 180}) rotate(53)`}
        >
          <path
            d="M0 0-11-29v-168q13-7 23 0v168Z"
            fill="#e3ae51"
            stroke="#775c42"
            strokeWidth="3"
          />
          <path d="M-11-28 0 0l12-29-6-4-6 5-7-6Z" fill="#ecd0a4" />
          <path d="m-4-9 4 9 4-10Z" fill="#4c4440" />
          <path d="m5-34 3-159" fill="none" stroke="#f6ce75" strokeWidth="6" />
          <path d="M-11-186v-13q10-7 23 0v13Z" fill="#b76353" />
          <path d="M-11-183h23v8h-23Z" fill="#829387" />
        </g>
      )}
    </g>
  );
}

export function Desk({ t }: { t: number }) {
  const scale = deskZoom(t);
  const roll = smooth(t, e.rise - 0.14, e.billion - e.rise + 0.14);
  const pageFrame = (t - e.page + 0.36) * 10;
  return (
    <AbsoluteFill
      style={{
        transformOrigin: `${cameraPivot.x}px ${cameraPivot.y}px`,
        transform: `scale(${scale})`,
      }}
    >
      <CafeRoom t={t} day={0.19 + 0.07 * smooth(t, 0, e.gain)} />
      <Miko action="focus" frame={pageFrame} left={39} top={47} width={774} />
      <Canvas>
        <DeskSurface />
        <HousePicture />
        <g transform="translate(87 793)">
          <SecurityPaper width={903} height={326} />
          <path d="M292 67v189" stroke="#95a187" strokeWidth="2.5" />
          <g opacity={1 - smooth(t, e.diagram - 0.25, 0.16)}>
            <text
              x="567"
              y="96"
              textAnchor="middle"
              fontWeight="720"
              fontSize="49"
              fill={ink}
            >
              {paper.valueLabel}
            </text>
            <svg
              x="320"
              y="115"
              width="506"
              height="141"
              viewBox="0 0 506 141"
              overflow="hidden"
            >
              <g
                transform={`translate(0 ${-150 * roll})`}
                fontFamily="Fraunces"
                fontSize="140"
                fontWeight="670"
                fill={ink}
                textAnchor="middle"
              >
                <text x="254" y="116">
                  {paper.formerValue}
                </text>
                <text x="254" y="266">
                  {paper.newValue}
                </text>
              </g>
            </svg>
            <path
              d="M392 271h363"
              fill="none"
              stroke="#a5aa83"
              strokeWidth="2"
            />
            <path
              d="M559 271h46"
              stroke="#b78e4d"
              strokeWidth={mix(3, 6, roll)}
              strokeLinecap="round"
            />
          </g>
        </g>
        <TaxReceipt t={t} />
      </Canvas>
    </AbsoluteFill>
  );
}
