import { AbsoluteFill } from "remotion";
import edit from "../../episodes/beer-feels-good/edit.json";
import plates from "../../episodes/beer-feels-good/assets/performances-v2.json";
import { Actor, Mug, Performance, performanceFrame } from "./Cast";
import { BarWall, Coaster, Counter, Impact } from "./Stage";
import {
  Brain,
  Canvas,
  Thought,
  colours as c,
  clamp,
  mix,
  out,
  smooth,
} from "./graphics";

const e = edit.events;
export const temple = { x: 722, y: 433 };

export function Opening({ t }: { t: number }) {
  const cut = e.mugCut;
  if (t < cut) {
    const pull = smooth(t, -0.13, cut + 0.13);
    const x = mix(528, 390, pull);
    return (
      <AbsoluteFill>
        <AbsoluteFill
          style={{
            transform: `scale(${mix(1.94, 1.62, pull)})`,
            transformOrigin: "500px 1050px",
          }}
        >
          <BarWall t={t} />
        </AbsoluteFill>
        <Counter horizon={mix(1140, 1254, pull)} />
        <Canvas>
          <Coaster x={x} y={mix(1290, 1353, pull)} r={mix(318, 202.5, pull)} />
        </Canvas>
        <Mug
          frame={t * 60 + 1}
          x={x}
          bottom={mix(1284, 1202, pull)}
          size={mix(1470, 974, pull)}
        />
      </AbsoluteFill>
    );
  }
  const wider = smooth(t, cut, 0.49);
  const follow = smooth(t, e.sip + 1.0, 0.72);
  const zoom = mix(1.62, 1, wider) + 0.055 * follow;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${116 * (1 - wider)}px,${44 * (1 - wider) + 16 * follow}px) scale(${zoom})`,
        transformOrigin: "274px 1158px",
      }}
    >
      <BarWall t={t} />
      <Actor
        t={t}
        animation="sip"
        at={e.sip}
        x={770}
        foot={2160}
        height={1950}
      />
      <Counter />
      <Canvas>
        <Coaster x={274} y={1251} r={125} />
        {[0, 1, 2].map((i) => {
          const p = clamp((t - (e.sip + 1.03 + i * 0.14)) / 0.73);
          return (
            <circle
              key={i}
              cx={284 + i * 26 + p * (19 - i * 9)}
              cy={865 - 128 * p + i * 6}
              r={7 + 7 * p}
              fill="none"
              stroke="#ffe6a0"
              strokeWidth="4"
              opacity={Math.sin(p * Math.PI)}
            />
          );
        })}
      </Canvas>
    </AbsoluteFill>
  );
}

export function Calm({ t }: { t: number }) {
  const exhale = smooth(t, e.calm + 0.12, 1.02);
  const showLock = out(t, e.inhibitions - 0.18, 0.31);
  const open = smooth(t, e.loosen - 0.11, 0.29);
  const cutaway = smooth(t, e.reward - 0.56, 0.55);
  const lift = 1 + 0.07 * smooth(t, e.calm + 0.45, 2.1);
  return (
    <AbsoluteFill>
      <BarWall t={t} />
      <AbsoluteFill
        style={{ transform: `scale(${lift})`, transformOrigin: "615px 585px" }}
      >
        <Actor
          t={t}
          animation="relax"
          at={e.calm + 0.04}
          x={764}
          foot={2110}
          height={1850}
        />
        <Counter horizon={1201} />
        <Canvas>
          <g
            opacity={1 - exhale}
            transform={`translate(${-98 * exhale} ${-115 * exhale}) rotate(${-11 * exhale} 280 455)`}
          >
            <Thought x={267} y={435} size={1.04 - 0.23 * exhale} />
          </g>
          <g
            opacity={showLock * (1 - cutaway)}
            transform={`translate(266 ${702 - 27 * showLock}) scale(${0.81 + 0.19 * showLock})`}
          >
            <circle r="101" fill="#52385e" opacity=".87" />
            <g transform={`rotate(${-40 * open} -48 -4)`}>
              <path
                d="M-47 4v-42a47 47 0 0 1 94 0v37"
                stroke="#80ecce"
                strokeWidth="18"
                strokeLinecap="round"
                fill="none"
              />
            </g>
            <rect
              x="-68"
              y="-4"
              width="136"
              height="89"
              rx="21"
              fill="#3bc6a7"
            />
            <path
              d="M0 32v20"
              stroke="#237f7d"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <circle cy="29" r="10" fill="#237f7d" />
            <Impact
              x={46}
              y={-8}
              p={clamp((t - e.loosen) / 0.39)}
              size={0.63}
            />
          </g>
        </Canvas>
      </AbsoluteFill>
      <AbsoluteFill
        style={{ background: "#1a113a", opacity: cutaway * 0.54 }}
      />
      <Canvas>
        <g opacity={cutaway * 0.92}>
          <Brain x={608} y={429} size={0.52} glow={0.7} />
          <circle cx="599" cy="421" r={14 + 5 * cutaway} fill={c.yellow} />
        </g>
      </Canvas>
    </AbsoluteFill>
  );
}

function Pinch({ p, front }: { p: number; front: boolean }) {
  // The thumb and index pivot towards the same spot after the ruler clears it.
  const skin = "#ffc982",
    shade = "#eda86c",
    outline = "#bf7659";
  return front ? (
    <g>
      <path
        d="M1140 1110 944 1009C849 966 779 920 739 874 704 835 664 801 631 793 604 786 591 803 596 821 600 839 632 858 644 877 588 858 548 875 530 916 512 958 554 1024 641 1053L918 1196Z"
        fill={skin}
      />
      <path d="M1140 1102l-185-92-73 144 227 108z" fill="#43768b" />
      <path d="m954 1008-25-14-74 142 27 18z" fill="#315b76" />
      <g transform={`rotate(${p * 25} 636 915)`}>
        <path
          d="M662 947C621 975 568 960 523 933 490 913 454 889 439 861 425 836 422 813 438 802 453 792 468 805 480 823 499 848 534 853 566 861 608 870 657 890 673 913Z"
          fill={skin}
        />
        <path d="M441 811q12-7 25 9l11 15q-16 9-26-8Z" fill="#ffdda3" />
      </g>
      <path
        d="M651 906q30 17 62 13m-41 19q29 13 54 9"
        fill="none"
        stroke={shade}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </g>
  ) : (
    <g transform={`rotate(${-p * 17} 663 884)`}>
      <path
        d="M735 940C693 929 655 902 627 875 610 858 596 837 587 815L558 756C550 735 551 719 566 711 583 704 597 716 608 736L656 796C689 818 717 844 749 875Z"
        fill={shade}
      />
      <path d="M562 720q13-7 22 9l10 17q-14 8-23-7z" fill="#ffdaa2" />
      <path
        d="M608 812q11-9 22-6"
        fill="none"
        stroke={outline}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </g>
  );
}

export function Reaction({ t }: { t: number }) {
  const drop = clamp((t - e.slow) / 0.69);
  const pinch = smooth(t, e.reactions + 0.015, 0.115);
  const release = smooth(t, e.reactions + 0.33, 0.33);
  if (t >= e.judgment) {
    const push = out(t, e.judgment, 0.47);
    return (
      <AbsoluteFill>
        <BarWall t={t} />
        <AbsoluteFill
          style={{
            transform: `scale(${mix(1.08, 1.2, push)})`,
            transformOrigin: "500px 570px",
          }}
        >
          <Actor
            t={t}
            pose="worried"
            x={787}
            height={1875}
            foot={2097}
            rotate={-1.8 * push}
          />
          <Counter horizon={1228} />
        </AbsoluteFill>
        <Canvas>
          <g opacity={out(t, e.judgmentWord - 0.06, 0.2)}>
            <path
              d="M274 486q-16-24-36-33m44 10q-3-25-16-41"
              fill="none"
              stroke="#ffcd99"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
        </Canvas>
      </AbsoluteFill>
    );
  }
  const lift = smooth(t, e.cost + 0.08, 0.49);
  const dy = 1610 * (Math.max(0, t - e.slow) / 0.69) ** 2;
  const letGo = smooth(t, e.slow, 0.33);
  const rulerTop = mix(273, 232, lift);
  const releasingHand = `translate(510 ${rulerTop + 35 - letGo * 350}) rotate(${-16 * letGo})`;
  const grip = pinch * (1 - 0.64 * release);
  return (
    <AbsoluteFill>
      <Canvas>
        <defs>
          <linearGradient id="beer-drop-field" x2=".25" y2="1">
            <stop stopColor="#79485f" />
            <stop offset=".57" stopColor="#b06c74" />
            <stop offset="1" stopColor="#c88278" />
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#beer-drop-field)" />
        <circle cx="532" cy="777" r="379" fill="#ffc08a" opacity=".12" />
        <path
          d="M-5 1237Q358 1199 654 1237t526-4"
          fill="none"
          stroke="#df998c"
          strokeWidth="13"
          opacity=".39"
        />
        <Pinch p={grip} front={false} />
        <g transform={releasingHand}>
          <path
            d="M-270-338-156-311-68-155C-42-123-8-110 12-84 30-65 45-30 46-6 46 16 25 24 13 9L-14-37C-34-45-65-63-84-88L-158-152Z"
            fill="#bd8067"
          />
          <path d="M-290-374-172-392-92-205-164-164Z" fill="#55435c" />
          <path d="m-166-176 75-41 11 19-74 45z" fill="#72556e" />
        </g>
        <g
          transform={`translate(510 ${mix(273, 232, lift) + dy}) rotate(${drop * 8} 0 524)`}
        >
          <rect x="-46" y="0" width="92" height="646" rx="12" fill="#e7a94f" />
          <rect x="-45" y="0" width="82" height="637" rx="11" fill="#ffdf87" />
          <circle cy="36" r="12" fill="#a66958" />
          {Array.from({ length: 26 }, (_, i) => (
            <path
              key={i}
              d={`M-45 ${78 + i * 20}h${i % 5 === 0 ? 48 : i % 2 === 0 ? 30 : 19}`}
              stroke="#935b4e"
              strokeWidth={i % 5 === 0 ? 6 : 4}
            />
          ))}
        </g>
        <g transform={releasingHand}>
          <path
            d="M-92-125C-69-125-54-111-36-90-14-68-7-36-1-14 4 .5 2 15-8 20-23 28-32 14-39 0L-64-44-103-66Z"
            fill="#d89c7b"
          />
          <path d="M-24-4q12-7 17 4l4 13q-12 7-19-5Z" fill="#edb899" />
        </g>
        {drop > 0 && drop < 1 ? (
          <g
            opacity={Math.sin(Math.PI * drop) * 0.74}
            stroke="#ffe4b2"
            strokeWidth="8"
            strokeLinecap="round"
          >
            <path d={`M461 ${174 + dy}v73m114 -156v115`} />
          </g>
        ) : null}
        <Pinch p={grip} front />
        <Impact
          x={512}
          y={738}
          p={clamp((t - e.reactions - 0.13) / 0.31)}
          size={0.77}
        />
        <path d="M-10 1327Q495 1307 1090 1328V1920H-10Z" fill="#a86b71" />
        <path
          d="M-10 1327Q495 1307 1090 1328"
          fill="none"
          stroke="#dc9b89"
          strokeWidth="9"
        />
        <path
          d="M-10 1368q184-10 303-8m520-2q130-2 289 6"
          fill="none"
          stroke="#c48680"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </Canvas>
    </AbsoluteFill>
  );
}

export function Finish({ t }: { t: number }) {
  const art = plates.setdown;
  const at = e.land - (art.contactCell * art.frameMs) / 1000;
  const approach = smooth(t, e.balance + 0.11, e.land - e.balance - 0.11);
  const atTable = smooth(t, e.lift - 0.1, 0.78);
  const lift = 18 * Math.sin(Math.PI * smooth(t, e.confident, 0.92));
  // Lift the held mug through four native intervals, pause to aim, then play the full descent.
  const liftCell = Math.min(
    4,
    Math.max(0, Math.ceil(((e.lift - t) * 1000) / art.frameMs - 1e-7)),
  );
  const cell = t < at ? liftCell : performanceFrame(t, at, art);
  const base = art.mugBases[cell];
  const planted = cell >= art.contactCell;
  const scale = 1.4;
  const x =
    mix(151, 30, approach) + (planted ? art.mugContact.x - base.x : 0) * scale;
  const y = 212 - lift + (planted ? art.mugContact.y - base.y : 0) * scale;
  const targetX = 449;
  const bottom = 212 + art.mugContact.y * scale;
  const board = 1188;
  const mugX = x + base.x * scale;
  const shotScale = mix(1.21, 1, atTable);
  const plate = (
    <Performance
      art={art}
      frame={cell}
      x={x}
      y={y}
      width={art.cellSize * scale}
    />
  );
  return (
    <AbsoluteFill style={{ background: "#663d59" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${shotScale})`,
          transformOrigin: "690px 490px",
        }}
      >
        <BarWall t={t} />
        {plate}
        <Counter horizon={board} />
        <Canvas>
          <Coaster x={targetX} y={bottom - 3} r={107} />
          <ellipse
            cx={mugX}
            cy={bottom - 6}
            rx={mix(51, 95, approach)}
            ry={mix(13, 21, approach)}
            fill="#764d49"
            opacity={mix(0.12, 0.42, approach)}
          />
        </Canvas>
        <AbsoluteFill
          style={{
            clipPath: `polygon(0 ${board - 12}px,${x + 318 * scale}px ${board - 12}px,${x + 318 * scale}px 1500px,0 1500px)`,
          }}
        >
          {plate}
        </AbsoluteFill>
        <Canvas>
          <Impact
            x={mugX}
            y={bottom - 8}
            p={clamp((t - e.land) / 0.32)}
            colour="#ffecbc"
            size={1.2}
          />
        </Canvas>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
