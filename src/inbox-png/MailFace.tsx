import type { CSSProperties } from "react";
import plan from "../../episodes/inbox-dot-png/plan.json";

export const mailSize = { width: 856, height: 480 };
const ui = plan.ui;
const pos: CSSProperties = { position: "absolute", boxSizing: "border-box" };

function Envelope() {
  return (
    <svg width="78" height="78" viewBox="0 0 78 78" fill="none">
      <defs>
        <linearGradient id="mail-blue" x2="0.35" y2="1">
          <stop stopColor="#50a9ff" />
          <stop offset="1" stopColor="#1764db" />
        </linearGradient>
      </defs>
      <rect width="78" height="78" rx="21" fill="url(#mail-blue)" />
      <rect x="16" y="23" width="46" height="33" rx="6.5" fill="#fff" />
      <path
        d="m18 26 18 14c2 2 4 2 7 0l17-14"
        stroke="#428ef1"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Gift() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <rect width="90" height="90" rx="24" fill="#ffddbd" />
      <g
        stroke="#ae552e"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M26 44h38v23H26z" fill="#ffae70" />
        <path d="M23 37h44v10H23z" fill="#fff0d9" />
        <path d="M45 37v30" />
        <path
          d="M44 37c-11 0-17-7-13-13 5-7 14 2 14 13 2-11 10-18 15-13 5 7-2 13-15 13Z"
          fill="#fff0d9"
        />
      </g>
    </svg>
  );
}

export function MailFace({
  dark = false,
  elapsed,
  frame = 0,
}: {
  dark?: boolean;
  elapsed?: number;
  frame?: number;
}) {
  const loading = elapsed !== undefined;
  const bg = dark ? "#252a36" : "#ffffff";
  const ink = dark ? "#f6f8fd" : "#222738";
  const secondary = dark ? "#b6c1d4" : "#59657b";
  const rule = dark ? "#424b5e" : "#e2e7ef";
  return (
    <div
      style={{
        ...pos,
        ...mailSize,
        inset: 0,
        borderRadius: 34,
        overflow: "hidden",
        background: bg,
        color: ink,
        border: `2px solid ${rule}`,
        fontFamily: '"Inbox Inter", Inter, Arial, sans-serif',
      }}
    >
      <div style={{ ...pos, top: 29, left: 43 }}>
        <Envelope />
      </div>
      <div
        style={{
          ...pos,
          top: 38,
          left: 144,
          fontSize: 62,
          fontWeight: 740,
          letterSpacing: -3.6,
          lineHeight: 1.1,
        }}
      >
        {ui.title}
      </div>
      {!loading && (
        <div
          style={{
            ...pos,
            right: 60,
            top: 55,
            color: dark ? "#abd0ff" : "#305fa9",
            fontSize: 29,
            fontWeight: 650,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 10,
              background: "#3889ed",
            }}
          />
          {ui.unread}
        </div>
      )}
      <div
        style={{
          ...pos,
          left: 40,
          right: 40,
          top: 135,
          borderTop: `2px solid ${rule}`,
        }}
      />
      {loading ? (
        <>
          <div
            style={{
              ...pos,
              left: 59,
              top: 161,
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              color: "#22344e",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: 146, fontWeight: 690, letterSpacing: -9 }}>
              {elapsed.toFixed(1)}
            </span>
            <span
              style={{
                fontSize: 78,
                letterSpacing: -3,
                fontWeight: 580,
                color: "#79879b",
              }}
            >
              s
            </span>
          </div>
          <div
            style={{
              ...pos,
              left: 66,
              top: 335,
              fontSize: 38,
              fontWeight: 550,
              letterSpacing: -1.2,
              color: secondary,
            }}
          >
            {ui.timerLabel}
          </div>
          <svg
            width="141"
            height="141"
            viewBox="0 0 141 141"
            style={{
              ...pos,
              right: 83,
              top: 209,
              transform: `rotate(${frame * 4.5 - 90}deg)`,
            }}
            fill="none"
          >
            <circle
              cx="70.5"
              cy="70.5"
              r="51"
              stroke="#e6eefb"
              strokeWidth="12"
            />
            <circle
              cx="70.5"
              cy="70.5"
              r="51"
              stroke="#3389eb"
              strokeWidth="12"
              strokeDasharray="86 322"
              strokeLinecap="round"
            />
          </svg>
        </>
      ) : (
        <>
          <div
            style={{
              ...pos,
              left: 39,
              right: 39,
              top: 163,
              height: 157,
              borderRadius: 24,
              border: `2px solid ${dark ? "#40516a" : "#d4e4fb"}`,
              background: dark ? "#2c394c" : "#f1f7ff",
            }}
          >
            <div style={{ ...pos, left: 25, top: 31 }}>
              <Gift />
            </div>
            <div
              style={{
                ...pos,
                left: 140,
                top: 25,
                fontSize: 31,
                fontWeight: 590,
                color: secondary,
                letterSpacing: -0.6,
              }}
            >
              {ui.sender}
            </div>
            <div
              style={{
                ...pos,
                left: 140,
                top: 70,
                fontSize: 49,
                lineHeight: 1.1,
                letterSpacing: -2.3,
                fontWeight: 745,
              }}
            >
              {ui.subject}
            </div>
          </div>
          <div
            style={{
              ...pos,
              left: 0,
              top: 348,
              right: 0,
              bottom: 0,
              borderTop: `2px solid ${rule}`,
              background: dark ? "#292f3b" : "#fafbfd",
            }}
          />
          <div
            style={{
              ...pos,
              top: 369,
              left: 165,
              width: 216,
              height: 77,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 14,
              borderRadius: 20,
              color: dark ? "#ffb8bf" : "#a74855",
              border: `2px solid ${dark ? "#684850" : "#edcfd2"}`,
              background: dark ? "#3e323c" : "#fff4f4",
              fontSize: 34,
              fontWeight: 660,
            }}
          >
            <svg
              width="35"
              height="40"
              viewBox="0 0 35 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 11h25M12 10l1-5h9l1 5M8 12l2 22h15l2-22M15 17v11m6-11v11" />
            </svg>
            {ui.trash}
          </div>
        </>
      )}
    </div>
  );
}
