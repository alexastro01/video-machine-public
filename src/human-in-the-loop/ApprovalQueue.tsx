import plan from "../../episodes/human-in-the-loop/plan.json";
import { SimulatedCursor } from "../developer/remocn/SimulatedCursor";
import {
  buttonPosition,
  clamp,
  clickIndex,
  clicks,
  e,
  enter,
  fps,
  pointer,
} from "./motion";
import { Icon } from "./Profile";

const counts = plan.approvalSequence.counts;
const ui = plan.ui;
function ButtonFace({
  index,
  age,
  leaving = false,
}: {
  index: number;
  age: number;
  leaving?: boolean;
}) {
  const position = buttonPosition(index);
  const opening = Math.min(
    13,
    index === 0
      ? 13
      : (clicks[index] ?? clicks[index - 1] + 6) - clicks[index - 1],
  );
  const p = enter(age, 0, leaving ? Math.min(10, opening) : opening);
  const opacity = leaving ? 1 - p : p;
  if (opacity <= 0) return null;
  return (
    <div
      className="hl-approve"
      style={{
        left: position.x,
        top: position.y,
        opacity,
        transform: leaving
          ? `translate(${-25 * p}px,${-28 * p}px) scale(${1 - 0.075 * p})`
          : `translate(${(1 - p) * 12}px,${(1 - p) * 14}px) scale(${0.955 + 0.045 * p})`,
      }}
    >
      <Icon name="check" size={45} />
      {(!leaving || age === 0) && ui.button}
    </div>
  );
}
export function ApprovalQueue({ frame }: { frame: number }) {
  const show = enter(frame, e.queue - 6, 18);
  if (show === 0) return null;
  const index = clickIndex(frame),
    age = frame - (index < 0 ? e.button : clicks[index]);
  const count = index < 0 ? 0 : counts[index];
  const deck = enter(frame, e.button - 5, 13);
  const finalFocus = enter(frame, e.human + 5, 17);
  const next = index + 1;
  const bounce =
    index < 0
      ? 0
      : Math.sin(Math.PI * clamp(age / 12)) *
        (count === 1 || count === 12 || count === 340 ? 0.04 : 0.019);
  return (
    <>
      <div
        className="hl-queue hl-surface"
        style={{
          opacity: show,
          left: 80 + 205 * finalFocus,
          right: 80 + 205 * finalFocus,
          top: 571 + 34 * finalFocus,
          height: 236 - 62 * finalFocus,
          transform: `translateY(${(1 - show) * 12}px)`,
        }}
      >
        <div
          className="hl-counter"
          style={{
            opacity: 1 - finalFocus,
            transform: `translateY(${-10 * finalFocus}px)`,
          }}
        >
          <div className="hl-counter-label">{ui.counter}</div>
          <div
            className="hl-number"
            style={{ transform: `scale(${1 + bounce})` }}
          >
            {count}
          </div>
        </div>
      </div>
      <div
        className="hl-button-stack"
        style={{ transform: `translateX(${-170 * finalFocus}px)` }}
      >
        {deck > 0 && (
          <div className="hl-button-stack" style={{ opacity: deck }}>
            {[2, 1].map((n) => (
              <div
                key={n}
                className="hl-back-button"
                style={{
                  left: 533 + 8 * n,
                  top: 643 + 11 * n,
                  opacity: 1 - n * 0.17,
                }}
              />
            ))}
            {index >= 0 && <ButtonFace index={index} age={age} leaving />}
            <ButtonFace index={next} age={age} />
          </div>
        )}
        <SimulatedCursor
          frame={frame}
          fps={fps}
          points={pointer}
          opacity={enter(frame, e.button + 1, 13)}
        />
      </div>
    </>
  );
}
