import { Img, staticFile } from "remotion";
import {
  artPath,
  claimAt,
  plan,
  publishedAt,
  pulse,
  ramp,
  smooth,
} from "./buildMotion";

const { cues } = plan;
export function Asterisk({ size = 39 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <g stroke="#dc9476" strokeWidth="5.5" strokeLinecap="square">
        {[0, 34, 67, 101, 135].map((a) => (
          <path key={a} d="M24 6v36" transform={`rotate(${a} 24 24)`} />
        ))}
      </g>
    </svg>
  );
}
export function Pointer({ x, y }: { x: number; y: number }) {
  return (
    <svg
      className="bf-pointer"
      style={{ left: x, top: y }}
      width="44"
      height="49"
      viewBox="0 0 44 49"
    >
      <path
        d="M6 4l30 23-13 2 7 14-7 4-7-15-10 9z"
        fill="#f8f5e9"
        stroke="#202122"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Publish({ f, done }: { f: number; done: boolean }) {
  const click = cues.publish.find((k) => f >= k - 22 && f <= k + 10);
  const glow =
    click === undefined ? 0 : Math.sin(Math.PI * ramp(f, click - 22, click));
  const contact = click === undefined ? 0 : pulse(f, click - 2, 9);
  return (
    <div
      className={`bf-publish ${done ? "bf-published" : ""}`}
      style={{
        transform: `scale(${1 - 0.066 * contact})`,
        boxShadow:
          glow > 0
            ? `0 0 0 ${5 * glow}px rgba(255,207,91,${0.7 * glow}),0 0 ${34 * glow}px rgba(255,213,116,${0.6 * glow})`
            : undefined,
      }}
    >
      {done ? "Published" : "Publish"}
      <span>{done ? "✓" : "↑"}</span>
    </div>
  );
}
function Claim({ f }: { f: number }) {
  const selected = f >= cues.selectHelp && f < cues.replaceType[0];
  const [before, after] = plan.posts.draft.split(plan.wordEdit.from);
  return selected ? (
    <>
      {before}
      <mark>{plan.wordEdit.from}</mark>
      {after}
    </>
  ) : (
    <>{claimAt(f)}</>
  );
}
export function DraftWindow({ f }: { f: number }) {
  const done = publishedAt(f);
  const back = smooth(f, cues.approach, cues.selectHelp),
    forth = smooth(f, cues.returnToPublish, cues.publish[0] - 11);
  const x = 715 - 367 * back + 367 * forth;
  const y = 347 - 136 * back + 136 * forth;
  return (
    <div className="bf-window bf-draft" style={{ top: 125 }}>
      <div className="bf-window-head">
        <Asterisk />
        <b>Claude</b>
        <span className="bf-tab">{done ? "Post" : "Draft"}</span>
      </div>
      <div className="bf-editor-text">
        <Claim f={f} />
        {!done && (
          <i
            className="bf-caret"
            style={{ opacity: Math.floor(f / 24) % 2 === 0 ? 1 : 0.25 }}
          />
        )}
      </div>
      <div className="bf-window-footer">
        <Publish f={f} done={done} />
      </div>
      <Pointer x={x} y={y} />
    </div>
  );
}
const failShake = (f: number) =>
  f < cues.failed || f > cues.failed + 16
    ? 0
    : Math.sin(((f - cues.failed) * Math.PI) / 4) *
      6 *
      (1 - ramp(f, cues.failed, cues.failed + 16));
export function BuildScreen({ f }: { f: number }) {
  const passed = f >= cues.passed,
    closed = f >= cues.closeParen,
    failed = f >= cues.failed;
  const size = passed ? 1 + 0.085 * pulse(f, cues.passed, 17) : 1;
  return (
    <div className="bf-window bf-build" style={{ top: 125 }}>
      <div className="bf-window-head">
        <span className="bf-code-icon">{"{ }"}</span>
        <b>{plan.build.file}</b>
      </div>
      <div className="bf-code-line">
        <span className="bf-lineno">1</span>
        <span>{plan.build.functionName}</span>
        <span className="bf-paren">(</span>
        {closed && <span className="bf-new-paren">)</span>}
        <i
          className="bf-code-caret"
          style={{
            opacity: closed ? 0.9 : Math.floor(f / 26) % 2 === 0 ? 1 : 0.16,
          }}
        />
      </div>
      {failed && (
        <div
          className={`bf-status ${passed ? "pass" : "fail"}`}
          style={{ transform: `translateX(${failShake(f)}px) scale(${size})` }}
        >
          <span className="bf-status-light" />
          {passed ? plan.build.passed : plan.build.failed}
        </div>
      )}
    </div>
  );
}
// The device and the large readable insert show the same editor state.
export function PhysicalScreen({ f, angle }: { f: number; angle: number }) {
  const k = angle / 4,
    built = f >= cues.failed,
    passed = f >= cues.passed,
    watching = f >= cues.playback && f < cues.draft;
  const text = claimAt(f);
  return (
    <div
      className="bf-device"
      style={{
        transform: `matrix(${1 - 0.23 * k},${-0.08 * k},0,1,${(520 - 121) * 0.23 * k},${(510 - 121) * 0.08 * k})`,
      }}
    >
      <div className="bf-device-head">
        {built ? (
          <>
            <b>{"{ }"}</b> {plan.build.file}
          </>
        ) : watching ? (
          "rough-cut.mp4"
        ) : (
          <>
            <Asterisk size={21} /> Claude
          </>
        )}
      </div>
      {built ? (
        <>
          <div className="bf-device-code">
            {plan.build.functionName}({f >= cues.closeParen ? ")" : ""}
            <i
              style={{
                opacity:
                  f >= cues.passed || Math.floor(f / 26) % 2 === 0 ? 1 : 0.15,
              }}
            />
          </div>
          <div
            className={`bf-device-status ${passed ? "pass" : "fail"}`}
            style={{ transform: `translateX(${failShake(f) * 0.4}px)` }}
          >
            {passed ? plan.build.passed : plan.build.failed}
          </div>
        </>
      ) : watching ? (
        <Img
          src={staticFile(
            artPath(
              `rough-shot-${f < cues.playback + 84 ? 1 : f < cues.playback + 145 ? 2 : 3}.jpg`,
            ),
          )}
          style={{ width: "100%", height: 199, objectFit: "cover" }}
        />
      ) : (
        <>
          <div className="bf-device-copy">
            {text}
            {!text && <i className="bf-caret" />}
          </div>
          <div className="bf-device-publish">
            {publishedAt(f) ? "Published ✓" : "Publish ↑"}
          </div>
        </>
      )}
      {f < cues.post + 17 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(118deg,#262626 10%,#373737 43%,#2c2c2c 60%,#222 85%)",
            opacity: 0.96 * (1 - smooth(f, cues.post - 11, cues.post + 17)),
          }}
        />
      )}
    </div>
  );
}
