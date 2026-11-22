import { Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { Asterisk, Pointer } from "./LaptopUI";
import { artPath, land, plan, pulse, ramp, smooth } from "./buildMotion";

type Industry = (typeof plan.industries)[number];
const asset = (name: string) => staticFile(artPath(name));
const accent = {
  finance: "#9dcdc4",
  accounting: "#bbd19d",
  editing: "#c0b1e1",
};
const ink = (industry: Industry) => accent[industry.id as keyof typeof accent];

function ToolIcon({ id }: { id: string }) {
  return (
    <svg
      width="47"
      height="47"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {id === "finance" ? (
        <>
          <path d="M6 36V10m0 26h35M11 27l9-10 8 4L40 8m-8 0h8v8" />
        </>
      ) : id === "accounting" ? (
        <>
          <rect x="7" y="6" width="34" height="36" rx="4" />
          <path d="M7 16h34M22 16v25m-9-17h4m-4 8h4m10-7 3 3 5-7" />
        </>
      ) : (
        <>
          <path d="M5 19h38v18a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM5 18 3 10l37-7 2 8zM13 9l5 6m5-8 5 6m4-8 5 6" />
          <path d="m21 25 9 5-9 5z" fill="currentColor" strokeWidth="1" />
        </>
      )}
    </svg>
  );
}

function Forecast({ f, sector }: { f: number; sector: Industry }) {
  const growth = smooth(f, sector.startFrame, sector.impact - 2);
  const values = [19, 27, 24, 28, 33, 39];
  return (
    <svg
      className="industry-plot"
      viewBox="0 0 888 224"
      aria-label="Six monthly cash balances, with a forecast for April through June"
    >
      <rect
        x="482"
        y="20"
        width="374"
        height="153"
        rx="8"
        fill="#9dcdc4"
        opacity=".065"
      />
      {[0, 20, 40].map((v) => (
        <g key={v}>
          <text
            x="66"
            y={173 - v * 3.65 + 8}
            textAnchor="end"
            fill="#a7afac"
            fontSize="25"
          >
            {v ? "$" + v + "k" : "$0"}
          </text>
          <path
            d={"M82 " + (173 - v * 3.65) + "H857"}
            stroke="#57615e"
            strokeWidth="1.8"
            strokeDasharray="5 9"
          />
        </g>
      ))}
      {values.map((v, i) => {
        const revealed =
          i < 3 ? 1 : smooth(growth, (i - 3) * 0.18, (i - 3) * 0.18 + 0.64);
        const h = v * 3.65 * revealed,
          x = 102 + i * 131;
        return (
          <g key={i}>
            <rect
              x={x}
              y={173 - h}
              width="62"
              height={Math.max(0.01, h)}
              rx="5"
              fill={i < 3 ? "#778a88" : ink(sector)}
            />
            <text
              x={x + 31}
              y="210"
              textAnchor="middle"
              fill={i < 3 ? "#a6aeab" : "#d0e1db"}
              fontSize="28"
              fontWeight="580"
            >
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i]}
            </text>
          </g>
        );
      })}
      <path
        d="M466 17v158"
        stroke="#95afa5"
        strokeWidth="2"
        strokeDasharray="5 8"
      />
    </svg>
  );
}

function Ledger({ f, sector }: { f: number; sector: Industry }) {
  const amounts = ["$240.00", "$185.50", "$96.00"];
  return (
    <div className="industry-ledger">
      <div className="ledger-row ledger-head">
        <span>Invoice</span>
        <span>Ledger</span>
        <span>Bank</span>
        <span />
      </div>
      {amounts.map((amount, i) => {
        const tick = smooth(
          f,
          sector.impact - 47 + i * 19,
          sector.impact - 39 + i * 19,
        );
        return (
          <div className="ledger-row" key={amount}>
            <span>INV-{104 + i}</span>
            <span>{amount}</span>
            <span>{amount}</span>
            <svg width="51" height="42" viewBox="0 0 51 42">
              <rect
                x="7"
                y="3"
                width="34"
                height="34"
                rx="6"
                stroke={tick > 0.5 ? "#adcc92" : "#5c6461"}
                strokeWidth="2.5"
                fill={tick > 0.5 ? "#364535" : "transparent"}
              />
              <path
                d="m14 20 7 7 14-16"
                fill="none"
                stroke="#c3e4a8"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - tick}
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function Timeline({ f, sector }: { f: number; sector: Industry }) {
  const close = smooth(f, sector.impact - 17, sector.impact);
  const gap = (1 - close) * 125;
  const playhead =
    80 +
    smooth(f, sector.startFrame, sector.impact - 18) * 280 +
    smooth(f, sector.impact, sector.impact + 75) * 255;
  return (
    <div className="industry-timeline">
      <div className="cut-ruler">
        {["00:00", "00:01", "00:02", "00:03", "00:04"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="cut-lane video-lane">
        <b>V1</b>
        <div className="cut-clips">
          {[1, 2].map((shot, i) => (
            <div
              className="film-clip"
              key={shot}
              style={{ left: i ? 282 + gap : 0, width: i ? 306 : 282 }}
            >
              {[0, 1, 2].map((x) => (
                <Img key={x} src={asset("rough-shot-" + shot + ".jpg")} />
              ))}
            </div>
          ))}
          {gap > 1 && (
            <div className="timeline-gap" style={{ left: 282, width: gap }} />
          )}
        </div>
      </div>
      <div className="cut-lane audio-lane">
        <b>A1</b>
        <svg viewBox="0 0 790 60" preserveAspectRatio="none">
          {[0, 1].map((side) => (
            <g
              key={side}
              transform={"translate(" + (side ? 282 + gap : 0) + " 0)"}
            >
              <rect
                x="0"
                y="1"
                width={side ? 306 : 282}
                height="56"
                rx="5"
                fill="#2f554b"
              />
              {Array.from({ length: 36 }, (_, i) => {
                const h =
                  4 +
                  26 *
                    Math.abs(
                      Math.sin(i * 0.76 + 0.67 * side) * Math.cos(i * 0.31),
                    );
                return (
                  <path
                    key={i}
                    d={
                      "M" +
                      (4 + i * (side ? 8.4 : 7.7)) +
                      " " +
                      (29 - h / 2) +
                      "v" +
                      h
                    }
                    stroke="#9dd1bd"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <div className="cut-playhead" style={{ left: playhead }} />
    </div>
  );
}

function Stone({ f, sector }: { f: number; sector: Industry }) {
  const t = f - sector.impact;
  if (t < -12) return null;
  const d = land(f, sector.impact, 690),
    kick = pulse(f, sector.impact, 9);
  return (
    <>
      <div
        className="industry-shadow"
        style={{
          opacity: 0.45 * smooth(t, -12, 0),
          transform:
            "translateX(-50%) scaleX(" + (0.72 + 0.3 * smooth(t, -12, 0)) + ")",
        }}
      />
      <svg
        className="industry-stone"
        viewBox="0 0 462 250"
        style={{
          transform:
            "translateY(" +
            d +
            "px) scale(" +
            (1 + 0.021 * kick) +
            "," +
            (1 - 0.035 * kick) +
            ")",
        }}
      >
        <defs>
          <linearGradient id="industry-granite" x1=".12" y1="0" x2=".66" y2="1">
            <stop stopColor="#e2dfd3" />
            <stop offset=".64" stopColor="#c5c6bd" />
            <stop offset="1" stopColor="#aaaFA8" />
          </linearGradient>
        </defs>
        <path
          d="M31 207V90h13C56 39 135 8 223 8s166 23 188 80h13v123z"
          fill="#747974"
          stroke="#282c2b"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M24 206V88h14C54 38 130 6 217 6s162 27 185 81h14v119z"
          fill="url(#industry-granite)"
          stroke="#393c39"
          strokeWidth="5.5"
          strokeLinejoin="round"
        />
        <path
          d="M38 197V100h11c14-49 89-81 168-81s157 30 174 82h12v96"
          stroke="#eae8da"
          opacity=".77"
          strokeWidth="3.3"
          fill="none"
        />
        <path
          d="m83 68 10 8-5 8 8 9m268 88-8 5 3 7-8 8"
          stroke="#8a8f89"
          strokeWidth="2.5"
          fill="none"
        />
        <text
          x="218"
          y="91"
          textAnchor="middle"
          fontSize="32"
          fontFamily="Georgia,serif"
          fontWeight="bold"
          letterSpacing="4"
          fill="#5f655e"
        >
          R.I.P.
        </text>
        <path d="M98 82h45m149 0h47" stroke="#8e938b" strokeWidth="2.4" />
        <text
          x="220"
          y="160"
          textAnchor="middle"
          fontSize={
            sector.id === "finance" ? 69 : sector.id === "accounting" ? 60 : 55
          }
          letterSpacing="-1.6"
          fontWeight="770"
          fill="#303532"
        >
          {sector.name}
        </text>
        <path
          d="M23 201h393l18 13v15H6v-15z"
          fill="#aaaea5"
          stroke="#393e39"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M23 203h392l12 8H12z" fill="#d6d6ca" />
        <path
          d="M9 227h426l13 10v10H2v-14z"
          fill="#898f86"
          stroke="#363b36"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
}

export function IndustryDesk({ f, sector }: { f: number; sector: Industry }) {
  const hit = f - sector.impact;
  const shake =
    hit >= 0 && hit < 12 ? 6 * Math.sin(hit * 0.83) * (1 - hit / 12) : 0;
  return (
    <>
      <div
        className="industry-window"
        style={{ transform: "translateY(" + shake + "px)" }}
      >
        <header className="industry-header">
          <i style={{ color: ink(sector) }}>
            <ToolIcon id={sector.id} />
          </i>
          <b>{sector.app}</b>
          <span
            className="tool-result"
            style={{ color: ink(sector), opacity: smooth(hit, -1, 4) }}
          >
            ✓ {sector.result}
          </span>
        </header>
        {sector.id === "finance" ? (
          <Forecast f={f} sector={sector} />
        ) : sector.id === "accounting" ? (
          <Ledger f={f} sector={sector} />
        ) : (
          <Timeline f={f} sector={sector} />
        )}
      </div>
      <Stone f={f} sector={sector} />
    </>
  );
}

export function PublishedPost({ f }: { f: number }) {
  const { post, openCut } = plan.cues;
  const hover = smooth(f, openCut - 42, openCut - 5);
  return (
    <div
      className="bf-window industry-article"
      style={{
        transform:
          "translateY(" + (1 - smooth(f, post, post + 12)) * 14 + "px)",
      }}
    >
      <div className="bf-window-head">
        <Asterisk />
        <b>Claude</b>
        <span className="article-status">Published ✓</span>
      </div>
      <h2>{plan.posts.article}</h2>
      {plan.industries.map((s, i) => (
        <div
          key={s.id}
          className="article-task"
          style={{
            opacity: smooth(f, post + 5 + i * 17, post + 15 + i * 17),
            background:
              i === 2 ? `rgba(185,163,211,${0.13 * hover})` : undefined,
          }}
        >
          <i style={{ color: ink(s) }}>
            <ToolIcon id={s.id} />
          </i>
          {s.task}
        </div>
      ))}
      {f > openCut - 42 && (
        <Pointer
          x={870 - 487 * hover}
          y={440 - 75 * hover + 5 * pulse(f, openCut, 9)}
        />
      )}
    </div>
  );
}

export function RoughCut({ f }: { f: number }) {
  const start = plan.cues.playback + 16;
  const playing = f >= start;
  const progress = ramp(f, start, plan.cues.draft - 1);
  return (
    <div className="bf-window industry-player">
      <div className="bf-window-head">
        <i>
          <ToolIcon id="editing" />
        </i>
        <b>rough-cut.mp4</b>
      </div>
      <div className="player-image">
        {!playing && <Img src={asset("rough-shot-1.jpg")} />}
        <Sequence from={start} layout="none">
          <OffthreadVideo
            src={asset("rough-cut.mp4")}
            muted
            pauseWhenBuffering
          />
        </Sequence>
      </div>
      <div className="player-controls">
        <span>{playing ? "Ⅱ" : "▶"}</span>
        <div>
          <i style={{ width: 100 * progress + "%" }} />
        </div>
        <b>0:0{Math.floor(progress * 3.53)}</b>
      </div>
    </div>
  );
}
