import { interpolateColors } from "remotion";
import { abs, Card, colors } from "../developer/primitives";
import { FlipProp } from "./FlipProp";
import { ease, mix, motion as m, ui, unit } from "./motion";

const purple = "#654ab3";
const hairline = "#e6e7ed";
const mono = 'ui-monospace,"SFMono-Regular",Menlo,monospace';
export function Glyph({
  kind,
  size = 32,
  color = "currentColor",
}: {
  kind: "cart" | "bag" | "bell" | "arrow" | "fail" | "cube";
  size?: number;
  color?: string;
}) {
  const shapes = {
    cart: (
      <>
        <path d="M2.5 4.5h3.2l2.1 11.3h11.5l2.1-8.4H6.4" />
        <circle cx="9.5" cy="20" r="1.5" />
        <circle cx="18.4" cy="20" r="1.5" />
      </>
    ),
    bag: (
      <>
        <path d="M4.4 7.1h15.2l1.1 14H3.3z" />
        <path d="M8.2 8.7V6a3.8 3.8 0 0 1 7.6 0v2.7" />
      </>
    ),
    bell: (
      <>
        <path d="M4.1 16.7h15.8c-2.1-2.3-2.7-3.4-2.7-7.4a5.2 5.2 0 0 0-10.4 0c0 4-.6 5.2-2.7 7.4z" />
        <path d="M9.6 19.6a2.6 2.6 0 0 0 4.8 0" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h14m-6-6 6 6-6 6" />
      </>
    ),
    fail: (
      <>
        <circle cx="12" cy="12" r="9.4" />
        <path d="m8.7 8.7 6.6 6.6m0-6.6-6.6 6.6" />
      </>
    ),
    cube: (
      <>
        <path d="m12 2 9 5.2v9.6L12 22l-9-5.2V7.2zM3 7.2l9 5.3 9-5.3M12 12.5V22" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shapes[kind]}
    </svg>
  );
}

function Mug({ modern }: { modern: number }) {
  return (
    <svg width="118" height="110" viewBox="0 0 120 112" aria-hidden="true">
      <defs>
        <linearGradient id="mug-ceramic">
          <stop stopColor="#222b3d" />
          <stop offset=".25" stopColor="#586074" />
          <stop offset=".55" stopColor="#343949" />
          <stop offset="1" stopColor="#181e2b" />
        </linearGradient>
      </defs>
      <ellipse cx="61" cy="94" rx="41" ry="6" fill="#15162c" opacity=".11" />
      <path
        d="M83 37h9c20 0 20 31 0 34h-9"
        fill="none"
        stroke="#343a4a"
        strokeWidth="8"
      />
      <path
        d="M23 31h62l-2 48c-.4 10-12 15-28 15-18 0-30-6-30-15z"
        fill="url(#mug-ceramic)"
      />
      <ellipse cx="54" cy="31" rx="31" ry="9" fill="#7e8594" />
      <ellipse cx="54" cy="31.5" rx="26" ry="5.8" fill="#25212a" />
      <path
        d="M32 45l1 26"
        fill="none"
        stroke="#c2c8dc"
        opacity=".43"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M47 56h17m-11 7h6"
        stroke="#e7d2a8"
        opacity={modern * 0.9}
        strokeWidth="2.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CheckoutPanel({ t, opacity }: { t: number; opacity: number }) {
  if (opacity <= 0) return null;
  const redesign = ease(t, m.redesign, 0.86),
    restage = ease(t, m.redesign + 0.16, 0.65);
  const firstFail =
    ease(t, m.firstError, 0.11) * (1 - ease(t, m.redesign, 0.16));
  const secondFail = ease(t, m.secondError, 0.11);
  const failed = Math.max(firstFail, secondFail);
  const focus =
    ease(t, m.payFlip - 0.12, 0.2) * (1 - ease(t, m.secondError - 0.03, 0.26));
  const shakeTime = Math.max(0, t - m.secondError);
  const shake = 7 * Math.sin(shakeTime * 68) * Math.exp(-shakeTime * 14);
  const tint = interpolateColors(redesign, [0, 1], ["#edf0f5", "#f0eafa"]);
  return (
    <div
      style={{ ...abs, inset: 0, opacity, transform: `translateX(${shake}px)` }}
    >
      <Card
        style={{
          left: 77,
          top: 123,
          width: 926,
          height: 572,
          boxSizing: "border-box",
          overflow: "hidden",
          borderColor: interpolateColors(
            redesign,
            [0, 1],
            [hairline, "#d6cee6"],
          ),
        }}
      >
        <div
          style={{
            ...abs,
            left: 0,
            top: 0,
            right: 0,
            height: 98,
            background: interpolateColors(
              redesign,
              [0, 1],
              ["#ffffff", "#4b416c"],
            ),
            borderBottom: `2px solid ${hairline}`,
          }}
        />
        <div
          style={{
            ...abs,
            left: 34,
            top: 26,
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: interpolateColors(redesign, [0, 1], [colors.ink, "#ffffff"]),
            fontWeight: 700,
            fontSize: 36,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 44,
              height: 44,
              color: interpolateColors(
                redesign,
                [0, 1],
                ["#566375", "#eee6ff"],
              ),
            }}
          >
            <div style={{ ...abs, inset: 0, opacity: 1 - redesign }}>
              <Glyph kind="cart" size={43} />
            </div>
            <div
              style={{
                ...abs,
                inset: 0,
                opacity: redesign,
                transform: `scale(${0.75 + 0.25 * redesign})`,
              }}
            >
              <Glyph kind="bag" size={43} />
            </div>
          </div>
          <div style={{ position: "relative", width: 240, height: 46 }}>
            <span style={{ ...abs, opacity: 1 - ease(redesign, 0, 0.36) }}>
              Checkout
            </span>
            <span style={{ ...abs, opacity: ease(redesign, 0.45, 0.55) }}>
              {ui.newCart}
            </span>
          </div>
        </div>
        <div
          style={{
            ...abs,
            right: 31,
            top: 26,
            height: 48,
            display: "flex",
            gap: 18,
            alignItems: "center",
            fontSize: 26,
            fontWeight: 590,
            color: interpolateColors(redesign, [0, 1], ["#6b707c", "#eee7ff"]),
          }}
        >
          1 item
          {redesign < 1 && (
            <span
              style={{
                display: "grid",
                placeItems: "center",
                background: "#eef0f4",
                border: "1px solid #e1e4eb",
                borderRadius: 9,
                width: 56,
                height: 42,
                fontFamily: mono,
                fontSize: 23,
                color: "#4b566a",
                opacity: 1 - redesign,
              }}
            >
              {"</>"}
            </span>
          )}
        </div>
        <div
          style={{
            ...abs,
            left: 34,
            right: 34,
            top: 131,
            height: 153,
            borderRadius: 20,
            background: interpolateColors(
              redesign,
              [0, 1],
              ["#f8f9fb", "#f8f5fc"],
            ),
            opacity: 1 - 0.75 * focus,
          }}
        >
          <div
            style={{
              ...abs,
              left: mix(13, 699, restage),
              top: 12,
              width: 135,
              height: 129,
              borderRadius: mix(16, 62, redesign),
              background: tint,
              display: "grid",
              placeItems: "center",
              transform: `rotate(${-3 * restage}deg)`,
            }}
          >
            <Mug modern={redesign} />
          </div>
          <div
            style={{
              ...abs,
              left: mix(173, 32, restage),
              opacity: 1 - 0.9 * Math.sin(Math.PI * restage) ** 4,
              top: 31,
              fontWeight: 720,
              fontSize: 36,
              letterSpacing: -1,
            }}
          >
            {ui.product}
          </div>
          <div
            style={{
              ...abs,
              left: mix(174, 33, restage),
              opacity: 1 - 0.9 * Math.sin(Math.PI * restage) ** 4,
              top: 82,
              fontSize: 25,
              fontWeight: 530,
              color: "#717582",
            }}
          >
            Qty 1
          </div>
          <div
            style={{
              ...abs,
              left: mix(733, 142, restage),
              opacity: 1 - 0.97 * Math.sin(Math.PI * restage) ** 2,
              top: mix(51, 82, restage),
              fontSize: mix(33, 25, restage),
              fontWeight: 680,
              letterSpacing: -0.9,
            }}
          >
            {ui.price}
          </div>
        </div>
        <div
          style={{
            ...abs,
            left: 43,
            right: 43,
            top: 312,
            borderTop: `2px ${redesign > 0.5 ? "dashed" : "solid"} ${hairline}`,
            paddingTop: 18,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            opacity: 1 - 0.78 * focus,
          }}
        >
          <span style={{ fontWeight: 650, fontSize: 30 }}>Total</span>
          <span style={{ fontSize: 43, fontWeight: 780, letterSpacing: -1.5 }}>
            {ui.price}
          </span>
        </div>
      </Card>
      <FlipProp
        type="button"
        t={t}
        start={m.payFlip}
        floor={616}
        width={mix(680, 620, redesign)}
        failed={failed}
        modern={redesign}
      />
      {failed > 0 && redesign < 0.5 && (
        <div
          style={{
            ...abs,
            left: 0,
            right: 0,
            top: 642,
            display: "flex",
            gap: 11,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 27,
            fontWeight: 650,
            color: "#aa3b50",
            opacity: failed,
            transform: `translateY(${(1 - failed) * 5}px)`,
          }}
        >
          <Glyph kind="fail" size={29} />
          {ui.failed}
        </div>
      )}
    </div>
  );
}

export function LaunchPanel({
  t,
  second = false,
}: {
  t: number;
  second?: boolean;
}) {
  const start = second ? m.anotherAlert : m.alert;
  const arrival = ease(t, start, second ? 0.16 : 0.26),
    exit = second ? 0 : ease(t, m.demo - 0.18, 0.27);
  if (arrival === 0 || exit === 1) return null;
  const chart = second ? 0 : ease(t, m.chart, 0.52);
  const x = mix(273, 77, chart) + (1 - arrival) * 136;
  const y = mix(156, 123, chart) - exit * 32;
  const w = mix(720, 926, chart),
    h = mix(154, 572, chart);
  const buttonX = mix(904, 823, chart),
    buttonY = mix(236, 207, chart);
  const pressedAt = second ? m.finalClick : m.tryButton;
  const click =
    ease(t, pressedAt, 0.024) * (1 - ease(t, pressedAt + (second ? 0.09 : 0.07), 0.11));
  const label = second ? ui.nextModel : ui.model;
  const completed = ease(t, m.chart + 0.5, 0.76);
  return (
    <Card
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        overflow: "hidden",
        boxSizing: "border-box",
        borderColor: "#d5cde6",
        opacity: arrival * (1 - exit),
        boxShadow: "0 20px 58px #2f264325,0 3px 7px #25233709",
      }}
    >
      <div
        style={{
          ...abs,
          left: mix(24, 31, chart),
          top: mix(32, 31, chart),
          background: "#eee9fa",
          border: "2px solid #e9e1f6",
          width: 79,
          height: 79,
          borderRadius: 22,
          display: "grid",
          placeItems: "center",
          color: purple,
        }}
      >
        <Glyph kind="bell" size={45} />
      </div>
      <div
        style={{
          ...abs,
          left: mix(121, 137, chart),
          top: mix(31, 30, chart),
          fontSize: 21,
          fontWeight: 720,
          letterSpacing: 2.1,
          color: "#775e9f",
        }}
      >
        {ui.notification}
      </div>
      <div
        style={{
          ...abs,
          left: mix(120, 136, chart),
          top: mix(63, 61, chart),
          fontSize: second ? 36 : 43,
          fontWeight: 760,
          letterSpacing: -1.5,
          color: "#29252f",
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...abs,
          left: buttonX - mix(273, 77, chart) - 60,
          top: buttonY - mix(156, 123, chart) - 32,
          width: 120,
          height: 64,
          borderRadius: 36,
          display: "grid",
          placeItems: "center",
          background: click > 0.4 ? "#444180" : "#5550a7",
          color: "white",
          fontSize: 32,
          fontWeight: 670,
          transform: `scale(${1 - 0.085 * click})`,
        }}
      >
        {!second && t >= m.tryButton + 0.12 ? (
          <svg
            width="43"
            height="43"
            viewBox="0 0 44 44"
            fill="none"
            style={{ transform: `rotate(${(t - m.tryButton) * 250}deg)` }}
          >
            <circle cx="22" cy="22" r="14" stroke="#ffffff55" strokeWidth="4" />
            <path
              d="M22 8a14 14 0 0 1 14 14"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          ui.try
        )}
      </div>
      {chart > 0 && (
        <div
          style={{
            ...abs,
            top: 148,
            left: 36,
            right: 36,
            borderTop: `2px solid ${hairline}`,
            paddingTop: 20,
            opacity: ease(t, m.chart + 0.23, 0.28),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{ fontSize: 36, letterSpacing: -1.1, fontWeight: 740 }}
            >
              {ui.chart}
            </span>
            <span style={{ fontFamily: mono, fontSize: 22, color: "#656a77" }}>
              Elo
            </span>
          </div>
          <div style={{ position: "relative", marginTop: 28 }}>
            <div
              style={{
                ...abs,
                left: 249,
                right: 81,
                top: 0,
                height: 217,
                borderLeft: "2px solid #e3e3eb",
                backgroundImage:
                  "linear-gradient(to right,#eae9ef 2px,transparent 2px)",
                backgroundSize: `${(100 * 50) / (ui.scoreCeiling - ui.scoreFloor)}% 100%`,
              }}
            />
            {ui.scores.map((s, i) => {
              const fraction =
                (s.score - ui.scoreFloor) / (ui.scoreCeiling - ui.scoreFloor);
              const progress = i
                ? ease(t, m.chart + 0.23 + i * 0.045, 0.23)
                : ease(t, m.chart + 0.36, 0.48);
              return (
                <div
                  key={s.name}
                  style={{
                    position: "relative",
                    height: 68,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      width: 237,
                      fontSize: 25,
                      fontWeight: i ? 560 : 740,
                      color: i ? "#656b78" : "#3c345d",
                    }}
                  >
                    {s.name}
                  </span>
                  <div style={{ height: i ? 25 : 32, flex: 1 }}>
                    <div
                      style={{
                        width: `${progress * fraction * 100}%`,
                        height: "100%",
                        background:
                          i === 0
                            ? "linear-gradient(90deg,#8b7bd0,#6353b4)"
                            : i === 1
                              ? "#bdc3d2"
                              : "#d3d6e0",
                        borderRadius: "0 8px 8px 0",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: 69,
                      fontSize: 25,
                      fontWeight: i ? 500 : 750,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      opacity: progress,
                    }}
                  >
                    {s.score.toLocaleString("en-US")}
                  </span>
                </div>
              );
            })}
            <div
              style={{
                position: "relative",
                marginLeft: 249,
                marginRight: 81,
                marginTop: 8,
                height: 27,
                color: "#7c808b",
                fontFamily: mono,
                fontSize: 18,
              }}
            >
              {[1200, 1250, 1300].map((n) => (
                <span
                  key={n}
                  style={{
                    ...abs,
                    left: `${(100 * (n - ui.scoreFloor)) / (ui.scoreCeiling - ui.scoreFloor)}%`,
                    transform: "translateX(-30%)",
                  }}
                >
                  {n.toLocaleString("en-US")}
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 21,
              fontWeight: 540,
              color: "#777587",
              opacity: completed,
            }}
          >
            Artificial Analysis
          </div>
        </div>
      )}
    </Card>
  );
}

export function CubeDemo({
  t,
  words,
}: {
  t: number;
  words: { text: string; start: number; end: number }[];
}) {
  const arrive = ease(t, m.demo - 0.08, 0.27),
    leave = ease(t, m.rebuild - 0.11, 0.23),
    show = arrive * (1 - leave);
  if (!show) return null;
  const prompt = words
    .map((w) =>
      t < w.start
        ? ""
        : w.text.slice(
            0,
            Math.max(
              1,
              Math.ceil(
                w.text.length *
                  unit((t - w.start) / Math.min(0.16, w.end - w.start)),
              ),
            ),
          ),
    )
    .filter(Boolean)
    .join(" ");
  const cube = ease(t, m.cubeAppears, 0.27);
  return (
    <div
      style={{
        ...abs,
        inset: 0,
        opacity: show,
        transform: `translateY(${(1 - arrive) * 18 - leave * 16}px)`,
      }}
    >
      <Card
        style={{
          left: 77,
          top: 123,
          width: 926,
          height: 572,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            ...abs,
            left: 33,
            top: 30,
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: purple,
            fontWeight: 720,
            fontSize: 33,
          }}
        >
          <Glyph kind="cube" size={40} />
          {ui.model}
        </div>
        <div
          style={{
            ...abs,
            left: 0,
            right: 0,
            top: 101,
            borderTop: `2px solid ${hairline}`,
          }}
        />
        <div
          style={{
            ...abs,
            left: 36,
            top: 132,
            right: 36,
            fontFamily: mono,
            fontSize: 29,
            fontWeight: 550,
            color: "#434b63",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#887caa", marginRight: 15 }}>›</span>
          {prompt}
          <span
            style={{
              height: 32,
              width: 3,
              marginLeft: 3,
              background: purple,
              opacity: t < m.cubeFlip ? 1 : 0,
            }}
          />
        </div>
        <div
          style={{
            ...abs,
            left: 34,
            right: 34,
            top: 207,
            bottom: 26,
            borderRadius: 19,
            border: "1px solid #eeedf5",
            backgroundColor: "#f8f8fc",
            backgroundImage:
              "radial-gradient(#d6d5e2 1.65px, transparent 1.65px)",
            backgroundSize: "23px 23px",
          }}
        />
        <div
          style={{
            ...abs,
            left: 113,
            right: 113,
            top: 506,
            height: 2,
            background:
              "linear-gradient(90deg,transparent,#d1cfdf 26%,#d1cfdf 74%,transparent)",
          }}
        />
      </Card>
      <FlipProp
        type="cube"
        t={t}
        start={m.cubeFlip}
        floor={631}
        width={123}
        opacity={cube}
      />
    </div>
  );
}
