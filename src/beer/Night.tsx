import { AbsoluteFill } from "remotion";
import edit from "../../episodes/beer-feels-good/edit.json";
import plates from "../../episodes/beer-feels-good/assets/performances-v2.json";
import { Finish, temple } from "./AtTheBar";
import { Molecule, Performance, performanceFrame } from "./Cast";
import {
  Background,
  Brain,
  Canvas,
  Star,
  clamp,
  mix,
  smooth,
} from "./graphics";
import { Aperture } from "./Stage";

const e = edit.events;
const head = { x: 381, y: 650 };

function Bedroom({ t, arrive }: { t: number; arrive: number }) {
  return (
    <AbsoluteFill style={{ opacity: arrive }}>
      <Canvas>
        <defs>
          <linearGradient id="beer-bedroom" x2=".2" y2="1">
            <stop stopColor="#131831" />
            <stop offset=".65" stopColor="#323151" />
            <stop offset="1" stopColor="#48405a" />
          </linearGradient>
          <linearGradient id="beer-window" x2="0" y2="1">
            <stop stopColor="#151738" />
            <stop offset="1" stopColor="#575176" />
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#beer-bedroom)" />
        <path
          d="M597 778V369a186 186 0 0 1 372 0v409Z"
          fill="url(#beer-window)"
          stroke="#646084"
          strokeWidth="16"
        />
        <path
          d="M610 730v-95l24 0v-51l50-4v77h43v-31h44v51h34V575h50v61h48v-39h51v133z"
          fill="#373652"
        />
        <path
          d="M856 310a69 69 0 1 1-84-75 62 62 0 0 0 84 75Z"
          fill="#f1dbaa"
        />
        <Star x={681} y={409} size={11} fill="#c8c7e5" />
        <Star x={894} y={475} size={8} fill="#c8c7e5" />
        <path d="M782 191V770M605 505H960" stroke="#615d7d" strokeWidth="12" />
        <path
          d="M605 780h363"
          stroke="#8b8093"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M970 762 605 767 62 1486l782-33Z"
          fill="#a69bb7"
          opacity=".075"
        />
        <path d="M0 1215Q429 1197 1080 1232v688H0Z" fill="#2e2b45" />
        <ellipse
          cx="545"
          cy="1276"
          rx={437}
          ry="51"
          fill="#171930"
          opacity=".68"
        />
      </Canvas>
      <Performance
        art={plates.waking}
        frame={performanceFrame(t, e.sleep + 0.1, plates.waking)}
        x={52}
        y={327 + 170 * (1 - arrive)}
        width={982}
      />
    </AbsoluteFill>
  );
}

function Wave({ t, arrive }: { t: number; arrive: number }) {
  const tear = smooth(t, e.sleep + 0.05, 0.26);
  const fade = 1 - smooth(t, e.anxiety + 0.1, 0.48);
  const middle = mix(978, 702, arrive);
  const amplitude = mix(44, 25, arrive);
  const path = (a: number, b: number, offset: number) =>
    Array.from({ length: 64 }, (_, i) => {
      const u = mix(a, b, i / 63);
      const x = 142 + u * 796 + offset;
      const y =
        middle +
        amplitude *
          Math.sin(u * 5.45 * Math.PI - (t - e.wears) * 1.75) *
          Math.sin(Math.PI * u);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  const width = mix(1, 0.83, arrive);
  return (
    <Canvas>
      <g
        transform={`translate(${540 * (1 - width)} ${-268 * arrive}) scale(${width} 1)`}
        opacity={fade}
      >
        <path
          d={path(0, 0.5 - tear * 0.048, -tear * 17)}
          fill="none"
          stroke="#b4bddf"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d={path(0.5 + tear * 0.048, 1, tear * 17)}
          fill="none"
          stroke="#b4bddf"
          strokeWidth="13"
          strokeLinecap="round"
        />
        {tear > 0 ? (
          <path
            d={path(0.5 + tear * 0.048, 1, tear * 17)}
            fill="none"
            stroke="#ee8f9e"
            strokeWidth="13"
            opacity={tear}
            strokeLinecap="round"
          />
        ) : null}
      </g>
    </Canvas>
  );
}

export function Night({ t }: { t: number }) {
  const room = smooth(t, e.off - 0.13, 1.76);
  const dim = smooth(t, e.wears + 0.12, 1.77);
  const intoPillow = smooth(t, e.off - 0.19, 1.14);
  const sleepX = mix(540, 371, intoPillow),
    sleepY = mix(579, 650 + 170 * (1 - room), intoPillow);
  const inset = smooth(t, e.recap - 0.24, 0.37);
  return (
    <AbsoluteFill>
      <Background t={t} mood="night" />
      <Bedroom t={t} arrive={room} />
      <Canvas>
        <g opacity={1 - smooth(t, e.off + 0.64, 0.67)}>
          <Brain
            x={sleepX}
            y={sleepY}
            size={mix(1.37, 0.49, intoPillow)}
            glow={1 - dim}
          />
          {Array.from({ length: 10 }, (_, i) => {
            const a = i * 2.39996,
              phase = clamp(dim * 1.27 - (i % 4) * 0.085);
            const r = mix(87 + (i % 3) * 33, 263 + (i % 4) * 25, phase);
            return (
              <circle
                key={i}
                cx={540 + r * Math.cos(a)}
                cy={576 + 0.69 * r * Math.sin(a) - 42 * phase}
                r={mix(14, 7, phase)}
                fill={i % 2 ? "#62d4c6" : "#f8d26c"}
                opacity={1 - phase}
              />
            );
          })}
        </g>
      </Canvas>
      <Wave t={t} arrive={room} />
      <Canvas>
        <g opacity={inset * 0.85}>
          <Brain x={head.x} y={head.y - 90} size={0.35} glow={0.7} />
        </g>
      </Canvas>
    </AbsoluteFill>
  );
}

export function Conclusion({ t }: { t: number }) {
  const expand = smooth(t, e.recap - 0.08, 0.37);
  const resolve = smooth(t, e.confidence - 0.66, 0.82);
  const resting = smooth(t, e.temporary, 1.36);
  const fade = 1 - smooth(t, e.confidence + 0.03, 0.38);
  const bx = mix(535, temple.x, resolve),
    by = mix(728, temple.y, resolve),
    scale = mix(1.55, 0.55, resolve);
  return (
    <AbsoluteFill>
      {expand < 1 ? <Night t={t} /> : null}
      <Aperture x={head.x} y={head.y - 90} p={expand} rim="#c884bb">
        <Finish t={t} />
        {fade > 0 ? (
          <>
            <AbsoluteFill style={{ opacity: 1 - resolve }}>
              <Background t={t} />
            </AbsoluteFill>
            <Canvas>
              <g opacity={fade}>
                <Brain x={bx} y={by} size={scale} glow={0.58 * (1 - resting)} />
                <g transform={`translate(${bx} ${by}) scale(${scale})`}>
                  {Array.from({ length: 10 }, (_, i) => {
                    const a = i * 2.39996,
                      rr = 42 + (i % 4) * 39;
                    const pulse = (1 + Math.sin(t * 8 + i * 1.51)) / 2;
                    return (
                      <g
                        key={i}
                        transform={`translate(${rr * Math.cos(a)} ${rr * 0.73 * Math.sin(a)})`}
                        opacity={(1 - resting * 0.88) * (0.35 + 0.55 * pulse)}
                      >
                        <circle
                          r={13 + 13 * pulse}
                          fill="#ffe379"
                          opacity=".37"
                        />
                        <circle r="8" fill="#fff2b3" />
                      </g>
                    );
                  })}
                </g>
              </g>
            </Canvas>
            <Molecule
              t={t}
              x={mix(335, 846, resting)}
              y={mix(962, 415, resting)}
              size={mix(320, 158, resting)}
              opacity={0.96 * (1 - resting)}
            />
          </>
        ) : null}
      </Aperture>
    </AbsoluteFill>
  );
}
