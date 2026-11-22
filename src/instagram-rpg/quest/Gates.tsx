import { Fragment } from "react";
import {
  Art,
  Feet,
  Shadow,
  ink,
  mix,
  out,
  pix,
  pos,
  pulse,
  smooth,
  unit,
} from "../art";
import { c, center, visible } from "./staging";

const gateY = 213;
function Sand({ f }: { f: number }) {
  const p = smooth(f, c.howLong, c.end + 2);
  const floorY = 20,
    topY = 4;
  return (
    <svg
      width={17}
      height={25}
      viewBox="0 0 17 25"
      style={pos(126.5, 105)}
      shapeRendering="crispEdges"
    >
      <path
        d="M2 2H15L14 6L10 10V13L14 18L15 22H2L3 18L7 13V10L3 6Z"
        fill="#593b2b"
      />
      <path
        d={`M${3 + 4 * p} ${topY + 5 * p}H${14 - 4 * p}L9 11H8Z`}
        fill="#ffda74"
        opacity={1 - p}
      />
      <path
        d={`M3 ${floorY}L8.5 ${floorY - 6 * p}L14 ${floorY}V21H3Z`}
        fill="#ffda74"
      />
      {p > 0.01 && p < 0.99 && (
        <path d={`M8 11h1v${4 + (Math.floor(f / 3) % 4)}H8Z`} fill="#fff2bc" />
      )}
    </svg>
  );
}
function Hourglass({ f }: { f: number }) {
  const alpha = visible(f, c.gate1 + 8, c.gate2 - 18, 22);
  if (alpha === 0) return null;
  const open = smooth(f, c.gateOpen - 1, c.gateOpen + 22);
  const gateTop = 100,
    w = 108,
    h = 113;
  const fill = smooth(f, c.howLong, c.end + 1);
  const leftEdge = "L45 47 L39 50 L35 53 L31 60 V109";
  const rightEdge = "L63 47 L69 50 L73 53 L77 60 V109";
  const doorway = `M54 44 ${leftEdge} H77 V60 L73 53 L69 50 L63 47 Z`;
  return (
    <div style={{ ...pos(0, 0, 270, 480), opacity: alpha }}>
      <Shadow x={center} y={gateY} w={90} h={10} />
      <Art
        name="gates-hourglass-open"
        x={center - w / 2}
        y={gateTop}
        w={w}
        h={h}
      />
      {open < 1 && (
        <div style={pos(center - w / 2, gateTop, w, h)}>
          <Art
            name="gates-hourglass-closed"
            w={w}
            h={h}
            style={{
              clipPath: `path(evenodd, 'M0 0H108V113H0Z ${doorway}')`,
              opacity: 1 - open,
            }}
          />
          {[leftEdge, rightEdge].map((outline, side) => (
            <Art
              key={outline}
              name="gates-hourglass-closed"
              w={w}
              h={h}
              style={{
                clipPath: `path('M54 44 ${outline} H54 Z')`,
                transform: `scaleX(${Math.cos(open * Math.PI / 2)})`,
                transformOrigin: `${side ? 77 : 31}px 78px`,
                opacity: 1 - smooth(f, c.gateOpen + 13, c.gateOpen + 22),
              }}
            />
          ))}
        </div>
      )}
      <Sand f={f} />
      {f >= c.howLong - 4 && f < c.gateOpen + 30 && (
        <div
          style={{
            ...pos(center - 34, gateY + 8, 68, 6),
            background: ink,
            border: "1px solid #65563d",
            padding: 1,
            boxSizing: "border-box",
            opacity: visible(f, c.howLong, c.gateOpen + 18, 8),
          }}
        >
          <div
            style={{
              width: 100 * fill + "%",
              height: 2,
              background: fill > 0.98 ? "#a8e8b5" : "#f5c769",
            }}
          />
        </div>
      )}
      {open > 0 &&
        open < 1 &&
        [-1, 1].map((sign) => (
          <Art
            key={sign}
            name="props-spark"
            x={center + sign * (36 + open * 10) - 4}
            y={145 - 10 * open}
            h={7 + 4 * Math.sin(Math.PI * open)}
            style={{ opacity: Math.sin(Math.PI * open) }}
          />
        ))}
    </div>
  );
}
const villagers = [
  { x: 92, y: 223, name: "props-follower-coral" },
  { x: 179, y: 228, name: "props-follower-teal" },
] as const;
function Shrine({ f }: { f: number }) {
  const alpha = visible(f, c.gate2 + 9, c.gate3 - 16, 22);
  if (alpha === 0) return null;
  const live = smooth(f, c.likes, c.likes + 15);
  const sparks = [c.likes, c.weigh + 4, c.follow + 3];
  const badges = visible(f, c.folks - 2, c.you + 4, 9);
  return (
    <div style={{ ...pos(0, 0, 270, 480), opacity: alpha }}>
      <Shadow x={center} y={gateY} w={90} h={10} />
      <Feet
        name="gates-heart-quiet"
        x={center}
        y={gateY}
        h={99}
        opacity={1 - live}
      />
      <Feet
        name="gates-heart-awake"
        x={center}
        y={gateY}
        h={99}
        opacity={live}
      />
      {villagers.map((v, i) => (
        <Fragment key={v.name}>
          <Shadow x={v.x} y={v.y} w={15} h={3} />
          <Feet
            name={v.name}
            x={v.x}
            y={v.y - 1.5 * pulse(f, c.follow + i * 5, 15)}
            h={29}
          />
          {badges > 0 && (
            <div
              style={{
                ...pos(v.x - 20, v.y - 40, 40, 10),
                fontFamily: pix,
                fontSize: 8.9,
                fontWeight: 700,
                lineHeight: "10px",
                textAlign: "center",
                background: ink,
                color: "#ffdfcc",
                borderRadius: 1,
                opacity: badges,
              }}
            >
              follower
            </div>
          )}
        </Fragment>
      ))}
      {sparks.map((beat, i) => {
        const p = unit(f, beat, beat + 33);
        if (p <= 0 || p >= 1) return null;
        const src = villagers[i % 2];
        const x =
          mix(src.x, center, p) + Math.sin(Math.PI * p) * (i % 2 ? 10 : -9);
        const y = mix(src.y - 28, 132, p) - 23 * Math.sin(Math.PI * p);
        return (
          <Feet
            key={beat}
            name="props-heart"
            x={x}
            y={y}
            h={8 + 6 * Math.sin(Math.PI * p)}
            opacity={Math.sin(Math.PI * p) ** 0.4}
          />
        );
      })}
    </div>
  );
}
export function planePosition(f: number) {
  const p = smooth(f, c.sendAction + 4, c.planeThrough + 7);
  return {
    p,
    x: mix(134, 135, p) + 25 * Math.sin(Math.PI * p),
    y: mix(217, 174, p) - 21 * Math.sin(Math.PI * p),
  };
}
function Portal({ f }: { f: number }) {
  const arrive = smooth(f, c.gate3 - 14, c.gate3 + 12);
  const alpha =
    arrive *
    (1 -
      smooth(f, c.recap - 8, c.recap + 13) +
      smooth(f, c.question - 20, c.question + 7));
  if (alpha <= 0) return null;
  const live = smooth(f, c.planeDoor, c.planeDoor + 22);
  const p = planePosition(f);
  const peeks = smooth(f, c.question + 2, c.secret + 4);
  return (
    <div style={{ ...pos(0, 0, 270, 480), opacity: Math.min(1, alpha) }}>
      <Shadow x={center} y={gateY} w={88} h={9} />
      <Feet
        name="gates-portal-quiet"
        x={center}
        y={gateY}
        h={107}
        opacity={1 - live}
      />
      <Feet
        name="gates-portal-open"
        x={center}
        y={gateY}
        h={107}
        opacity={live}
      />
      {live > 0.1 &&
        [0, 1, 2].map((i) => {
          const ring = ((((f - c.planeDoor + i * 16) % 49) + 49) % 49) / 49;
          return (
            <div
              key={i}
              style={{
                ...pos(
                  center - 16 * ring,
                  171 - 19 * ring,
                  32 * ring,
                  38 * ring,
                ),
                border: "1px solid #d4ffee",
                borderRadius: "47%",
                opacity: live * (1 - ring) * 0.55,
              }}
            />
          );
        })}
      {p.p > 0 && p.p < 1 && (
        <>
          {[2, 1].map((i) => {
            const tail = planePosition(f - i * 3);
            return (
              <Art
                key={i}
                name="props-spark"
                x={tail.x - 1}
                y={tail.y + 3}
                h={3}
                style={{ opacity: 0.6 / i }}
              />
            );
          })}
          <Feet
            name="props-plane"
            x={p.x}
            y={p.y}
            h={20 - 11 * p.p}
            transform={`rotate(${-15 - 32 * p.p}deg)`}
          />
        </>
      )}
      {f >= c.planeThrough && f < c.planeThrough + 22 && (
        <Feet
          name="props-ripple"
          x={center}
          y={183}
          h={15 + 18 * out(f, c.planeThrough, c.planeThrough + 22)}
          opacity={1 - unit(f, c.planeThrough, c.planeThrough + 22)}
        />
      )}
      {peeks > 0 && (
        <div style={{ ...pos(163, 152, 25, 47), overflow: "hidden" }}>
          <Art
            name="monsters-reels"
            x={-23 + peeks * 23}
            y={7}
            h={30}
            style={{ transform: `rotate(${peeks * 9}deg)` }}
          />
        </div>
      )}
    </div>
  );
}
export function Gates({ f }: { f: number }) {
  return (
    <>
      <Hourglass f={f} />
      <Shrine f={f} />
      <Portal f={f} />
    </>
  );
}
