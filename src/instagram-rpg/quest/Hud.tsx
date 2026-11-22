import { Fragment } from "react";
import {
  Art,
  gold,
  ink,
  mix,
  out,
  pix,
  pos,
  pulse,
  smooth,
  unit,
} from "../art";
import { actor, c, center, fieldFont, visible } from "./staging";

function Source({ f, recap = false }: { f: number; recap?: boolean }) {
  const alpha = recap
    ? visible(f, c.bigThree - 4, c.question - 12, 10)
    : visible(f, c.each + 2, c.three - 3, 10);
  if (alpha <= 0) return null;
  return (
    <div
      style={{
        ...pos(47, 34, 176, 26),
        opacity: alpha,
        textAlign: "center",
        background: "rgba(24,36,37,.92)",
        borderRadius: 2,
        color: "#faf1d9",
        fontFamily: fieldFont,
        fontWeight: 585,
        fontSize: 7.9,
        lineHeight: "10px",
        boxSizing: "border-box",
        padding: "3px 3px",
      }}
    >
      {recap ? (
        <>
          Adam Mosseri
          <br />
          Instagram · January 2025
        </>
      ) : (
        <>
          Adam Mosseri · May 2023
          <br />
          Instagram Ranking Explained
        </>
      )}
    </div>
  );
}
const stops = [
  {
    x: 0.35,
    y: 0.69,
    beat: c.watchTime,
    label: "Watch time",
    icon: "gates-hourglass-open",
  },
  {
    x: 0.52,
    y: 0.49,
    beat: c.reLikes,
    label: "Likes",
    icon: "gates-heart-awake",
  },
  {
    x: 0.66,
    y: 0.27,
    beat: c.reSends,
    label: "Sends",
    icon: "gates-portal-open",
  },
] as const;
function Map({ f }: { f: number }) {
  const fork = visible(f, c.feed + 3, c.each - 14, 9);
  const villages = visible(f, c.reach + 2, c.question - 17, 13);
  const alpha = Math.max(fork, villages);
  if (alpha <= 0) return null;
  const large = smooth(f, c.recap - 9, c.recap + 14);
  const width = mix(fork > 0 ? 42 : 55, 134, large),
    x = mix(fork > 0 ? 183 : 169, center - width / 2, large),
    y = mix(32, 72, large);
  return (
    <div style={{ ...pos(0, 0, 270, 480), opacity: alpha }}>
      <div
        style={{
          ...pos(x, y, width, width),
          border: "2px solid #ac8d53",
          boxSizing: "border-box",
          background: ink,
          boxShadow: "0 2px rgba(23,30,33,.35)",
        }}
      >
        <Art name="map" x={1} y={1} w={width - 6} h={width - 6} />
        <svg
          viewBox="0 0 100 100"
          width={width - 4}
          height={width - 4}
          style={pos(0, 0)}
          shapeRendering="crispEdges"
        >
          <path
            d="M39 84V72L48 59V54L54 48V38L62 29L64 21"
            stroke="#2d3e3c"
            strokeWidth={large > 0.5 ? 3 : 5}
            fill="none"
          />
          <path
            d="M39 84V72L48 59V54L54 48V38L62 29L64 21"
            stroke="#f4d580"
            strokeDasharray="3 2"
            strokeWidth={large > 0.5 ? 1.6 : 2.7}
            fill="none"
          />
          {fork > 0 && (
            <path
              d="M47 60L28 49M48 57L64 49"
              fill="none"
              stroke="#f4d580"
              strokeWidth="2"
            />
          )}
        </svg>
        {fork > 0 && (
          <div
            style={{
              ...pos(
                width * 0.43,
                width * (0.72 - 0.15 * smooth(f, c.feed, c.reels)),
                3,
                3,
              ),
              background: "#fff6ba",
              outline: "1px solid #1d4847",
            }}
          />
        )}
        {villages > 0 &&
          [
            { x: 0.24, y: 0.66 },
            { x: 0.57, y: 0.48 },
            { x: 0.68, y: 0.29 },
          ].map((v, i) => {
            const lit = unit(f, c.lit + i * 7, c.lit + i * 7 + 8);
            const size = large > 0.65 ? 11 : 8;
            return (
              <Fragment key={i}>
                <Art
                  name="props-village-dark"
                  x={width * v.x - size / 2}
                  y={width * v.y - size / 2}
                  w={size}
                />
                <Art
                  name="props-village-lit"
                  x={width * v.x - size / 2}
                  y={width * v.y - size / 2}
                  w={size}
                  style={{ opacity: lit }}
                />
              </Fragment>
            );
          })}
        {large > 0.1 &&
          stops.map((item) => {
            const lit = smooth(f, item.beat - 2, item.beat + 9);
            const size = 19 + 2 * pulse(f, item.beat, 18);
            return (
              <div
                key={item.label}
                style={{
                  ...pos(
                    width * item.x - size * 0.5,
                    width * item.y - size * 0.5,
                    size,
                    size,
                  ),
                  opacity: large * (0.38 + 0.62 * lit),
                  background: ink,
                  border: lit > 0.2 ? "1px solid #ffdc75" : "1px solid #aaa994",
                  borderRadius: 3,
                }}
              >
                <Art name={item.icon} x={2} y={2} w={size - 3} h={size - 3} />
              </div>
            );
          })}
      </div>
      {large > 0.4 && (
        <div
          style={{
            ...pos(34, 209, 202, 17),
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 3,
          }}
        >
          {stops.map((item) => (
            <div
              key={item.label}
              style={{
                background: ink,
                color: f >= item.beat ? gold : "#d0d8ca",
                padding: "2px 4px",
                fontFamily: fieldFont,
                fontWeight: 720,
                fontSize: 9.3,
                lineHeight: "12px",
                borderRadius: 1,
                opacity: large * smooth(f, item.beat - 6, item.beat + 4),
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export function Hud({ f }: { f: number }) {
  const title =
    1 - smooth(f, Math.min(c.wrong - 30, 82), Math.min(c.wrong - 8, 111));
  const counter = 1 - smooth(f, c.me + 1, c.wrong - 5);
  const p = actor("alex", f);
  return (
    <>
      {title > 0 && (
        <div
          style={{
            ...pos(42, 35 - 4 * (1 - title), 186, 43),
            opacity: title,
            background: "rgba(19,31,34,.96)",
            clipPath:
              "polygon(3px 0,calc(100% - 3px) 0,100% 3px,100% calc(100% - 3px),calc(100% - 3px) 100%,3px 100%,0 calc(100% - 3px),0 3px)",
            fontFamily: pix,
            fontWeight: 700,
            textAlign: "center",
            color: "#fff7df",
            transform: `translateY(${3 * (1 - out(f, 0, 12))}px) scale(${0.96 + 0.04 * out(f, 0, 12) + 0.02 * pulse(f, 2, 16)})`,
          }}
        >
          <div style={{ paddingTop: 5, fontSize: 13, lineHeight: "15px" }}>
            How does the Instagram
          </div>
          <div style={{ fontSize: 12.5, lineHeight: "16px" }}>
            algorithm <span style={{ color: gold }}>ACTUALLY</span> work?
          </div>
        </div>
      )}
      {counter > 0 && (
        <div
          style={{
            ...pos(p.x + 32, p.y - p.h - 2, 54, 18),
            background: ink,
            color: "#ffce9c",
            fontFamily: fieldFont,
            fontSize: 12.3,
            lineHeight: "18px",
            fontWeight: 800,
            textAlign: "center",
            borderRadius: 2,
            opacity: counter,
            transform: `scale(${1 + 0.075 * pulse(f, 10, 16)})`,
          }}
        >
          {f < 4 ? 428 : f < 8 ? 76 : f < 12 ? 28 : 12}{" "}
          <span style={{ fontSize: 9.1, color: "#fff0dc" }}>views</span>
        </div>
      )}
      <Map f={f} />
      <Source f={f} />
      <Source f={f} recap />
    </>
  );
}
