import { arrive, e, ease, mix, progress } from "./timing";

export const lower = ["make", " no", " mistakes"];
export const upper = ["MAKE", " NO", " M", "IST", "AK", "ES"];
const reasoning = ["think", " hard", " about", " this"];
const colors = [
  "#eadffb",
  "#dcecf4",
  "#fae5cd",
  "#e1edd6",
  "#f4dfe6",
  "#e4e1f8",
];
function WordChips({
  words,
  visible = words.length,
}: {
  words: string[];
  visible?: number;
}) {
  return (
    <div className="mn-words">
      {words.map((word, i) => (
        <span
          key={i}
          className={i < visible ? "" : "mn-concealed"}
          style={{ backgroundColor: colors[i] }}
        >
          <b>{word}</b>
        </span>
      ))}
    </div>
  );
}
export function Opening({ frame }: { frame: number }) {
  const split = arrive(frame, 3, 15),
    stamp = arrive(frame, e.hookDouble - 3, 12),
    settle = Math.sin(Math.PI * progress(frame, e.hookDouble - 3, 14));
  const tease = arrive(frame, e.teaser - 9, 13);
  return (
    <div className="mn-cold-open">
      <div className="mn-input-label">
        Input tokens <span>o200k_base</span>
      </div>
      <div className="mn-pairs mn-hook-pairs">
        <div>
          <span className="mn-count">3</span>
          <WordChips words={lower} />
        </div>
        <div style={{ transform: `translateX(${(1 - split) * 12}px)` }}>
          <span className="mn-count">6</span>
          <WordChips words={upper} />
        </div>
      </div>
      <div className="mn-stamp-space">
        <div
          className="mn-stamp"
          style={{
            opacity: stamp,
            transform: `rotate(${mix(-15, -7, stamp)}deg) scale(${mix(1.32, 1, stamp) - settle * 0.05})`,
          }}
        >
          ×2
        </div>
      </div>
      <div
        className="mn-mystery"
        style={{
          opacity: tease,
          transform: `translateY(${(1 - tease) * 14}px)`,
        }}
      >
        <div>Four other words</div>
        <WordChips words={reasoning} visible={0} />
      </div>
    </div>
  );
}
export function Payoff({ f }: { f: number }) {
  const reveal = [e.think, e.hard, e.about, e.thisWord].filter(
    (t) => f >= t,
  ).length;
  const showThree = arrive(f, e.finalThree - 4, 12),
    showRoute = arrive(f, e.routeThinking, 15);
  return (
    <div className="mn-answer-compare">
      <div className="mn-pairs mn-answer-pairs">
        <div>
          <span className="mn-pair-heading">Original phrase</span>
          <WordChips words={lower} />
          <strong className="mn-answer-count" style={{ opacity: showThree }}>
            3 input tokens
          </strong>
        </div>
        <div>
          <span className="mn-pair-heading">Four other words</span>
          <WordChips words={reasoning} visible={reveal} />
          <strong className="mn-thinking" style={{ opacity: showRoute }}>
            ↳ Thinking model
          </strong>
        </div>
      </div>
      <div
        className="mn-launch-ref"
        style={{ opacity: ease(f, e.launchPost - 5, 15) }}
      >
        GPT-5 launch post <span>OpenAI · Aug 2025</span>
      </div>
    </div>
  );
}
