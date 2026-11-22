import {
  Art,
  cue,
  gold,
  ink,
  out,
  pix,
  pos,
  pulse,
  smooth,
  snap,
  timing,
  tiny,
} from "./art";

function Minimap({ f }: { f: number }) {
  const progress = smooth(f, cue.split, timing.frames);
  const branch = smooth(f, cue.reels - 4, cue.reels + 12);
  const x = 25 + Math.sin(progress * Math.PI) * 1.5;
  const y = 42 - 22 * progress;
  return (
    <div style={pos(174, 6, 54, 48)}>
      <Art name="hud-map-frame" w={54} h={48} />
      <Art name="map" x={4.5} y={4.5} w={45} h={39} />
      <svg
        width={45}
        height={39}
        viewBox="0 0 45 39"
        style={pos(4.5, 4.5)}
        shapeRendering="crispEdges"
      >
        <g fill="none" strokeWidth="1" strokeLinejoin="miter">
          <path d="M20 36V26L22 22V15" stroke="#fff3b5" opacity=".8" />
          <path
            d="M22 22L10 19M22 22L15 12M22 22L31 12M22 22L33 22"
            stroke="#edd298"
            opacity={0.36 + progress * 0.25}
          />
          <path
            d="M22 22V13L24 10V4"
            stroke="#ffe46d"
            opacity={0.3 + branch * 0.7}
          />
        </g>
        {[4, 9, 14].map((v, i) => (
          <g key={v}>
            <rect
              x={i === 0 ? 22 : 20}
              y={v}
              width="4"
              height="3"
              fill="#26373b"
            />
            <rect
              x={i === 0 ? 23 : 21}
              y={v}
              width="2"
              height="2"
              fill={branch > 0.3 ? "#ffe58a" : "#b8af78"}
            />
          </g>
        ))}
      </svg>
      <div
        style={{
          ...pos(snap(x - 2.5), snap(y - 2.5), 6, 6),
          background: ink,
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          ...pos(snap(x - 0.5), snap(y - 0.5), 3, 3),
          background: Math.floor(f / 14) % 2 ? "#9dffeb" : "#f1ffcc",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

export function Hud({ f }: { f: number }) {
  const hit = pulse(f, 18, 20);
  const number = f < 5 ? 428 : f < 10 ? 176 : f < 14 ? 64 : f < 18 ? 28 : 12;
  const entry = out(f, 0, 15);
  const leave = smooth(f, cue.wrong - 11, cue.wrong + 9);
  const stamp = 0.91 + 0.09 * entry + 0.035 * pulse(f, 3, 18);
  const source = smooth(f, cue.feed - 6, cue.feed + 10);
  return (
    <>
      <div
        style={{
          ...pos(0, 0, 270, 76),
          background: "linear-gradient(rgba(13,25,39,.35),transparent)",
        }}
      />
      <div
        style={{
          ...pos(9, 8, 73, 35),
          transform: `translateX(${snap(Math.sin(f * 1.8) * hit)}px) scale(${1 + 0.035 * hit})`,
        }}
      >
        <div
          style={{
            ...pos(0, 0, 73, 35),
            background: "#132839",
            opacity: 0.96,
            clipPath: "polygon(4px 0,100% 0,100% 28px,66px 100%,0 100%,0 4px)",
          }}
        />
        <div style={{ ...pos(0, 0, 2, 31), background: "#ffab7b" }} />
        <div
          style={{
            ...pos(5, 5, 64, 7),
            fontFamily: tiny,
            fontSize: 5.5,
            letterSpacing: 0.15,
            color: "#c7dbd4",
          }}
        >
          REEL VIEWS
        </div>
        <div
          style={{
            ...pos(6, 12, 52, 20),
            fontFamily: pix,
            fontSize: 22,
            lineHeight: "20px",
            fontWeight: 700,
            color: number === 12 ? "#ffb38b" : "#fff1d0",
          }}
        >
          {number}
        </div>
        <svg
          width="21"
          height="12"
          viewBox="0 0 21 12"
          style={pos(46, 17)}
          shapeRendering="crispEdges"
        >
          <path
            d="M1 1h5v3h4v-1h2v4h4v2h4"
            fill="none"
            stroke="#ff927a"
            strokeWidth="1.5"
          />
          <path d="M15 10h5V6" fill="none" stroke="#ff927a" strokeWidth="1.5" />
        </svg>
      </div>
      <Minimap f={f} />
      {leave < 1 && (
        <div
          style={{
            ...pos(10, 49 - 12 * leave + (1 - entry) * 4, 217, 45),
            opacity: 1 - leave,
            transform: `scale(${stamp * (1 - 0.04 * leave)}) rotate(${-0.7 * (1 - entry)}deg)`,
          }}
        >
          <Art name="hud-title-banner" w={217} h={45} />
          <div
            style={{
              ...pos(7, 7, 203, 34),
              textAlign: "center",
              fontFamily: pix,
              fontWeight: 700,
              color: "#fcf4de",
              textShadow: "1px 2px #182037",
            }}
          >
            <div
              style={{
                fontSize: 12.3,
                lineHeight: "14px",
                letterSpacing: 0.15,
              }}
            >
              How does the Instagram
            </div>
            <div
              style={{
                fontSize: 13.3,
                lineHeight: "16px",
                whiteSpace: "nowrap",
              }}
            >
              algorithm <span style={{ color: gold }}>ACTUALLY</span> work?
            </div>
          </div>
        </div>
      )}
      {source > 0 && (
        <div
          style={{
            ...pos(85, 9, 85, 30),
            background: "rgba(14,31,43,.89)",
            opacity: source,
            padding: "3px 3px",
            boxSizing: "border-box",
            borderLeft: "1px solid #e7c678",
            fontFamily: pix,
            fontSize: 7.2,
            lineHeight: "8px",
            color: "#ffefd3",
            fontWeight: 550,
          }}
        >
          Adam Mosseri
          <br />
          “Instagram Ranking
          <br />
          Explained” · May 2023
        </div>
      )}
    </>
  );
}
