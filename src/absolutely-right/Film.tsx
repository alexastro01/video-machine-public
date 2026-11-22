import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Desk, Opus } from "./Cast";
import {
  clamp,
  ease,
  edit,
  latestDing,
  pulse,
  timeline,
  visibleWords,
} from "./timing";
import "./film.css";

type SymbolName = "file" | "chat" | "commit" | "return" | "chevron";
const paths: Record<SymbolName, string> = {
  file: "M8 3h8l5 5v13H5V3h3Zm7 0v6h6M9 12l-2 2 2 2m6-4 2 2-2 2",
  chat: "M4 4h16a1 1 0 0 1 1 1v12H9l-5 4V5a1 1 0 0 1 1-1",
  commit: "M2 12h5m10 0h5 M17 12a5 5 0 1 1-10 0a5 5 0 1 1 10 0",
  return: "M20 5v8a3 3 0 0 1-3 3H5m5-5-5 5 5 5",
  chevron: "M8 7l6 5-6 5",
};
function Symbol({ name, size = 32 }: { name: SymbolName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function Counter({ frame }: { frame: number }) {
  const event = latestDing(frame);
  const value = event?.count ?? 0;
  const age = event ? frame - event.frame : 500;
  const crowded = value >= 6 && value < 27;
  const strike = 1 - ease(age, 0, crowded ? 5 : 16);
  const wave = ease(age, 0, 24);
  return (
    <div className="ar-counter">
      <div className="ar-counter-words">{edit.counterLabel}</div>
      <div
        className="ar-count"
        style={{ color: value === 0 ? "#e8b781" : "#ffb877" }}
      >
        <span className="ar-times">×</span>
        <div
          className="ar-number"
          style={{
            transform: `translateY(${-strike * (crowded ? 2 : 5)}px) scale(${1 + strike * (crowded ? 0.045 : 0.115)})`,
          }}
        >
          {value}
        </div>
        {age < 24 && !crowded && (
          <i
            className="ar-echo"
            style={{
              opacity: (1 - wave) * 0.75,
              transform: `scale(${0.65 + wave * 0.68})`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function Test({ frame, count }: { frame: number; count: number }) {
  const pass = count === 1 || count >= 3;
  const indent = count >= 4;
  const tab = indent && count % 2 === 0 && count < 28;
  const change = latestDing(frame);
  const after = change ? frame - change.frame : 1000;
  const codeHit = change && change.count <= 27 ? 1 - ease(after, 0, 13) : 0;
  const sigil = pass ? "+" : "−";
  return (
    <div className={`ar-test ${pass ? "ar-pass" : "ar-fail"}`}>
      <div className="ar-code-line ar-context">
        <span className="ar-line-no">11</span>
        <span>
          <b>const</b> {edit.function.slice(6)}
        </span>
      </div>
      <div className="ar-code-line ar-active-line">
        <span className="ar-line-no">12</span>
        <div className="ar-source-line">
          <span
            className="ar-indent"
            style={{
              width: tab ? 68 : 48,
              color: indent ? "#e2b982" : "transparent",
            }}
          >
            {tab ? "⇥" : "····"}
          </span>
          <span className="ar-keyword">return</span>
          <span>&nbsp;a&nbsp;</span>
          <span
            className="ar-op"
            style={{
              transform: `scale(${1 + codeHit * 0.19})`,
              backgroundColor: `rgba(230,220,190,${codeHit * 0.13})`,
            }}
          >
            {sigil === "−" ? "-" : sigil}
          </span>
          <span>&nbsp;b;</span>
        </div>
        <div className="ar-badge">
          <strong>{pass ? "✓" : "×"}</strong>
          {pass ? "PASS" : "FAIL"}
        </div>
      </div>
      <div className="ar-code-line ar-context">
        <span className="ar-line-no">13</span>
        <span>{"};"}</span>
      </div>
      <div className="ar-result">
        <div>
          <Symbol name="chevron" size={27} />
          <span>{edit.assertion}</span>
          <span className="ar-output-arrow">→</span>
          <b>{pass ? "5" : "−1"}</b>
        </div>
        <small>{indent ? (tab ? "tab" : "4 spaces") : "expected 5"}</small>
      </div>
    </div>
  );
}

function Send({ frame, realFrame }: { frame: number; realFrame: number }) {
  const { keyFrames, enter } = edit.typing;
  const typed = keyFrames.filter((f) => f <= frame).length;
  const sent = frame >= enter;
  const commit = timeline.commitFrame;
  const receipt = ease(frame, commit, 15);
  const [summary, color, check] = edit.commit.split('"');
  // Keep the literal message and the caret in place for all 60 frames after Enter.
  const blink =
    realFrame >= enter
      ? Math.floor((realFrame - enter) / 18) % 2 === 0
      : typed === 0 ||
        realFrame - (keyFrames[typed - 1] ?? 0) < 20 ||
        Math.floor(realFrame / 19) % 2 === 0;
  return (
    <div className="ar-compose">
      <div className="ar-from">Alex</div>
      <div className={`ar-composer ${sent ? "ar-sent" : ""}`}>
        <div className="ar-message-text">
          {edit.input.slice(0, typed)}
          <i style={{ opacity: blink ? 1 : 0 }} />
        </div>
        <span
          aria-label="Enter"
          className="ar-return"
          style={{
            transform: `translateY(${pulse(frame, enter - 4, 7) * 2}px)`,
          }}
        >
          <Symbol name="return" size={32} />
        </span>
      </div>
      {frame >= commit && (
        <div
          className="ar-receipt"
          style={{
            transform: `translateX(${(1 - receipt) * 390}px)`,
            opacity: clamp((frame - commit + 1) / 7),
          }}
        >
          <div className="ar-receipt-label">
            <Symbol name="commit" size={30} />
            commit
          </div>
          <div className="ar-commit-code">
            <span>{summary.slice(0, 4)}</span>
            {summary.slice(4)}
            <em>"{color}"</em>
            <span className="ar-check-emoji">{check}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const rapidHistory = [
  ...[3, 4].map((i) => ({
    count: i + 1,
    start: edit.exchanges[i].alex,
    frame: timeline.dings[i].frame,
    prompt: edit.exchanges[i].text,
  })),
  ...timeline.montage,
];
function History({ frame }: { frame: number }) {
  const index = Math.max(
    0,
    rapidHistory.filter((r) => r.start <= frame).length - 1,
  );
  const current = rapidHistory[index];
  const speed =
    index > 1 ? Math.min(5, Math.max(2, current.frame - current.start + 1)) : 7;
  const position = index - 1 + ease(frame, current.start, speed);
  return (
    <div className="ar-history">
      {rapidHistory
        .slice(Math.max(0, index - 5), index + 1)
        .map((row, offset) => {
          const i = Math.max(0, index - 5) + offset;
          const y = 256 + (i - position) * 86;
          return (
            <div
              className="ar-history-row"
              key={row.count}
              style={{
                transform: `translateY(${y}px)`,
                opacity: Math.max(0.27, 1 - (position - i) * 0.18),
              }}
            >
              <div className="ar-history-prompt">{row.prompt}</div>
              <div
                className="ar-history-answer"
                style={{ opacity: frame >= row.frame ? 1 : 0 }}
              >
                <i /> {edit.reply}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function Chat({
  frame,
  count,
  captions,
}: {
  frame: number;
  count: number;
  captions: boolean;
}) {
  const composing = frame >= edit.typing.start;
  const alex = timeline.lines
    .filter((l) => l.speaker === "alex" && l.frame <= frame)
    .at(-1);
  const opus = timeline.lines
    .filter((l) => l.speaker === "opus" && l.frame <= frame)
    .at(-1);
  const currentReply =
    opus &&
    ((composing && opus.frame === edit.typing.reply) ||
      (!composing && alex && opus.frame > alex.frame))
      ? opus
      : undefined;
  const prompt = composing ? "" : visibleWords(alex, frame, captions);
  const response = visibleWords(currentReply, frame, captions);
  const scroll =
    ease(frame, edit.montage.first - 3, 7) *
    (1 - ease(frame, edit.exchanges[5].alex - 1, 7));
  const last = frame >= edit.typing.reply;
  const replyVisible = response.length > 0;
  const typing = prompt && alex && frame < alex.end;
  return (
    <div className="ar-chat">
      <Opus frame={frame} count={count} />
      <div className="ar-dialogue" style={{ opacity: 1 - scroll }}>
        {prompt && (
          <div className="ar-prompt-wrap">
            <div className="ar-sender">Alex</div>
            <div className="ar-prompt">
              {prompt}
              {typing && <span className="ar-mini-caret" />}
            </div>
          </div>
        )}
        {replyVisible ? (
          <div className={`ar-response ${last ? "ar-final-response" : ""}`}>
            <i />
            {response}
          </div>
        ) : (
          <div className={`ar-dots ${composing ? "ar-waiting" : ""}`}>
            {[0, 1, 2].map((i) => (
              <i
                key={i}
                style={{
                  opacity: 0.3 + 0.5 * pulse((frame + 38 - i * 6) % 45, 0, 25),
                }}
              />
            ))}
          </div>
        )}
      </div>
      {scroll > 0 && (
        <div
          className="ar-log-wrap"
          style={{
            opacity: scroll,
            transform: `translateY(${(1 - scroll) * 18}px)`,
          }}
        >
          <History frame={frame} />
        </div>
      )}
    </div>
  );
}

export function AbsolutelyRightFilm({
  showCaptions,
  audioEnabled,
}: {
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const realFrame = useCurrentFrame();
  const [hold, endHold] = timeline.freeze;
  const frame = realFrame >= hold && realFrame < endHold ? hold : realFrame;
  const count = latestDing(frame)?.count ?? 0;
  const focus = ease(frame, edit.typing.start - 3, 17);
  return (
    <AbsoluteFill className="ar-film">
      <Desk frame={frame} realFrame={realFrame} />
      <div className="ar-top-texture" />
      <Counter frame={frame} />
      <div className="ar-window">
        <div className="ar-toolbar">
          <div className="ar-file-tab">
            <Symbol name={focus > 0.5 ? "chat" : "file"} />
            <b>{focus > 0.5 ? "Chat" : edit.file}</b>
          </div>
          <div className="ar-window-lights">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="ar-workspace">
          {focus < 1 && (
            <div
              style={{
                opacity: 1 - focus,
                transform: `translateY(${-focus * 30}px)`,
              }}
            >
              <Test frame={frame} count={count} />
            </div>
          )}
          {focus > 0 && (
            <div
              className="ar-compose-layer"
              style={{
                opacity: focus,
                transform: `translateY(${(1 - focus) * 35}px)`,
              }}
            >
              <Send frame={frame} realFrame={realFrame} />
            </div>
          )}
        </div>
        <Chat frame={frame} count={count} captions={showCaptions} />
      </div>
      {audioEnabled && (
        <Audio src={staticFile("episodes/absolutely-right/mix.wav")} />
      )}
    </AbsoluteFill>
  );
}
