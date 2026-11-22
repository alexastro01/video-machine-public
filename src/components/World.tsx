import { palette as p } from "../engine/motion";
import type { Scene } from "../engine/schema";

const Building = ({
  x,
  width,
  height,
  color,
  windows = 3,
}: {
  x: number;
  width: number;
  height: number;
  color: string;
  windows?: number;
}) => (
  <g stroke={p.ink} strokeWidth="4" strokeLinejoin="round">
    <path
      d={`M${x} 690 V${690 - height} L${x + width / 2} ${660 - height} L${x + width} ${690 - height} V690Z`}
      fill={color}
    />
    {Array.from({ length: windows }, (_, i) => (
      <g key={i}>
        <rect
          x={x + 26 + (i % 2) * (width - 100)}
          y={730 - height + Math.floor(i / 2) * 100}
          width="48"
          height="62"
          rx="20"
          fill="#EDE5CF"
        />
        <path
          d={`M${x + 50 + (i % 2) * (width - 100)} ${730 - height + Math.floor(i / 2) * 100} v62`}
          strokeWidth="2"
        />
      </g>
    ))}
    <rect
      x={x + width / 2 - 28}
      y="590"
      width="56"
      height="100"
      rx="27"
      fill="#647D76"
    />
  </g>
);

export const World = ({ scene, t }: { scene: Scene; t: number }) => {
  const night = scene.timeOfDay === "evening";
  return (
    <>
      <defs>
        <pattern
          id="paper"
          width="42"
          height="42"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="3" cy="9" r="1" fill={p.ink} opacity=".15" />
          <circle cx="28" cy="31" r=".8" fill={p.ink} opacity=".1" />
        </pattern>
        <pattern
          id="paving"
          width="240"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 99H240M120 0V100"
            stroke={night ? "#70717D" : "#BEAF96"}
            strokeWidth="2"
            opacity=".22"
          />
        </pattern>
      </defs>
      <rect
        x="-1000"
        y="-1000"
        width="4000"
        height="4000"
        fill={night ? "#B7AEC9" : "#F5E8CD"}
      />
      <circle cx="1510" cy="220" r="79" fill={night ? "#F6EAD1" : "#EABF68"} />
      {night && <circle cx="1536" cy="193" r="76" fill="#B7AEC9" />}
      <g
        fill={night ? "#C8BFD8" : "#FFFAEB"}
        opacity=".85"
        transform={`translate(${-t * 2} 0)`}
      >
        <path d="M180 257Q158 223 195 213Q208 174 244 196Q283 170 304 207Q346 197 352 228Q377 257 331 263Z" />
        <path d="M1005 163Q985 136 1018 123Q1041 86 1078 116Q1121 100 1128 139Q1177 163 1137 176Z" />
      </g>
      <g opacity={night ? ".65" : "1"}>
        <g opacity={1}>
          <Building
            x={-60}
            width={250}
            height={405}
            color="#D6BFA5"
            windows={4}
          />
          <Building
            x={225}
            width={240}
            height={330}
            color="#D9C5AD"
            windows={3}
          />
        </g>
        <Building
          x={1480}
          width={255}
          height={370}
          color="#C4C5AD"
          windows={4}
        />
        <Building
          x={1770}
          width={245}
          height={440}
          color="#DAC4AE"
          windows={4}
        />
        <path d="M0 690H1920" stroke={p.ink} strokeWidth="5" />
      </g>
      <rect
        x="-1000"
        y="694"
        width="4000"
        height="2500"
        fill={night ? "#B6ACBA" : "#D9C9AB"}
      />
      <rect x="-1000" y="704" width="4000" height="2000" fill="url(#paving)" />
      {scene.set === "cafe" && (
        <g stroke={p.ink} strokeWidth="5" strokeLinejoin="round">
          <rect x="460" y="290" width="460" height="402" fill="#A9B3A0" />
          <rect
            x="495"
            y="384"
            width="390"
            height="223"
            rx="4"
            fill="#576F6C"
          />
          <path d="M440 360h500l-46-85H479Z" fill={p.coral} />
          {[0, 1, 2, 3, 4].map((n) => (
            <path
              key={n}
              d={`M${465 + n * 94} 360 l26-84 h41 l-4 84Z`}
              fill="#F2DEC1"
              stroke="none"
            />
          ))}
          <text
            x="689"
            y="469"
            fill={p.paper}
            textAnchor="middle"
            stroke="none"
            fontFamily="DM Sans"
            fontSize="50"
            fontWeight="800"
          >
            CORNER CAFÉ
          </text>
          <path d="M560 583h260" stroke="#95A69A" strokeWidth="3" />
          <ellipse cx="1230" cy="720" rx="150" ry="22" fill="#B9815D" />
          <path d="M1230 742v125m-65 0h130" />
        </g>
      )}
      {scene.set === "crossing" && (
        <g>
          <path d="M0 758 H1920 V904 H0Z" fill="#7E8585" />
          {Array.from({ length: 9 }, (_, i) => (
            <path
              key={i}
              d={`M${440 + i * 130} 778h78l-52 100h-78Z`}
              fill="#F1E4CA"
              opacity=".87"
            />
          ))}
          <path d="M1440 689V395" stroke={p.ink} strokeWidth="13" />
          <rect x="1405" y="360" width="70" height="135" rx="18" fill={p.ink} />
          <circle cx="1440" cy="395" r="18" fill={p.coral} />
          <circle cx="1440" cy="453" r="18" fill="#607770" />
        </g>
      )}
      {scene.set === "park" && (
        <g
          stroke={p.ink}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g opacity={1}>
            <path d="M440 716v-240m-66 58 66 74 51-92" fill="none" />
            <path
              d="M314 470Q270 423 328 394Q308 331 374 325Q401 270 454 313Q525 294 533 356Q599 399 543 447Q554 500 489 499Q455 541 411 497Q346 525 314 470Z"
              fill={night ? "#6F807B" : "#9AAE8B"}
            />
          </g>
          <path
            d="M1250 744h260m-242-44h221m-210-30h198M1288 750v72m187-72v72"
            stroke="#776453"
            strokeWidth="15"
          />
          <path d="M1664 724v-265" />
          <path d="M1639 457h50l-6-62h-38Z" fill="#F4D48D" />
        </g>
      )}
      <rect
        x="-1000"
        y="-1000"
        width="4000"
        height="4000"
        fill="url(#paper)"
        pointerEvents="none"
      />
    </>
  );
};
