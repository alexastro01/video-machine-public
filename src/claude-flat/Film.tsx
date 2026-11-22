import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { Edit } from "../claude-design/schema";
import { Alex, NoKey, ReturnPacket } from "./Alex";
import { framePose, wristOnScreen } from "./rig";
import { Context, Counter, Model, Opening } from "./Terminal";
import { History, Notes, Permission, Tests } from "./Work";
import { Finish, Recap } from "./Close";
import type { FlatEdit } from "./schema";
import { bump, ease, lerp, P, sans, smooth, T, tr, type Shot } from "./art";
const panels = [
  Opening,
  Model,
  Counter,
  Context,
  Tests,
  Permission,
  Notes,
  History,
  Recap,
  Finish,
];
const stationNames = [
  "Terminal",
  "Model and machine",
  "Anthropic counter",
  "Grep, Glob, Read",
  "Tool and test loop",
  "Permission decision",
  "Project and auto memory",
  "Chat compaction",
  "Loop recap",
  "Send the fix",
];
const stations = [0, 1040, 2080, 3120, 4160, 5200, 6240, 7280, 8320, 9360];
const heights = [0, -14, 8, 0, 14, -7, 8, 0, 12, 0];
const moves = [0, 23, 20, 27, 27, 24, 24, 22, 25, 25];
function camera(f: number, flat: FlatEdit) {
  let x = 0,
    y = 0;
  for (let i = 1; i < stations.length; i++) {
    const cue = flat.stages[i];
    // The statistic starts counting on its labeled time. Its card is already arriving.
    const offset =
      i === 2 ? moves[i] - 2 : i === 6 ? -8 : Math.floor(moves[i] * 0.5);
    const t = smooth(f, cue - offset, moves[i]);
    x += (stations[i] - stations[i - 1]) * t;
    y += (heights[i] - heights[i - 1]) * t;
  }
  return { x, y };
}
function Desk() {
  return (
    <g>
      <path d="M0 1524H1080v396H0Z" fill="#15171b" />
      <path d="M0 1523h1080" stroke="#4e5157" strokeWidth="3" />
      <path d="M0 1540h1080" stroke="#252931" strokeWidth="2" />
      <rect
        y="1542"
        width="1080"
        height="378"
        fill="url(#desk-grid)"
        opacity=".5"
      />
    </g>
  );
}
function Rail({ f, edit, flat }: Shot) {
  const q = edit.cues,
    actual = [q.context, q.loop, q.permissions, q.memory],
    recap = [q.stepRead, q.stepAct, q.stepCheck, q.stepRepeat],
    inRecap = f >= q.recap,
    active = Math.max(0, actual.filter((at) => f >= at).length - 1);
  const widths = [190, 123, 285, 195],
    xs = [29, 244, 394, 707],
    names = ["CONTEXT", "LOOP", "PERMISSIONS", "MEMORY"];
  return (
    <g>
      {names.map((n, i) => {
        const fill = inRecap ? f >= recap[i] : active === i;
        const mark = inRecap ? recap[i] : actual[i],
          p = bump(f, mark, 16);
        const w = widths[i];
        return (
          <g key={n}>
            {i > 0 && (
              <path
                d={`M${xs[i] - 19} 169l7 6-7 6`}
                stroke="#858991"
                strokeWidth="3.2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <g
              transform={`translate(${xs[i] + w / 2} 176) scale(${1 + 0.055 * p})`}
            >
              <rect
                x={-w / 2}
                y="-33"
                width={w}
                height="66"
                rx="30"
                fill={fill ? P.orange : "#22252a"}
                stroke={fill ? P.orange : "#55595e"}
                strokeWidth="2"
              />
              <T
                x={0}
                y={14}
                size={40}
                anchor="middle"
                ls={-1.8}
                weight={790}
                color={fill ? P.bg : "#c8c8cb"}
              >
                {n}
              </T>
            </g>
          </g>
        );
      })}
      <g
        opacity={Math.max(
          ease(f, q.context, 10) - ease(f, q.loop - 7, 10),
          ease(f, q.recap, 10) - ease(f, q.payoff - 8, 10),
        )}
      >
        <T x={35} y={246} size={29} weight={550} color="#b3b4b9" ls={-0.3}>
          Source: Anthropic docs / Boris Cherny, Latent Space
        </T>
      </g>
      <path d="M35 113h860" stroke="#393b42" strokeWidth="2" opacity=".67" />
      {f < flat.counter - 14 && (
        <path d="M35 113h46" stroke={P.orange} strokeWidth="3" opacity=".7" />
      )}
    </g>
  );
}
function CaptionGroup({
  f,
  edit,
  page,
  caption,
}: {
  f: number;
  edit: Edit;
  page: FlatEdit["pages"][number];
  caption: Caption;
}) {
  const words = caption.text.trim().split(/\s+/);
  const at = edit.wordFrames[page.key];
  const accent = page.key === 70 ? P.green : P.orange;
  return (
    <div
      style={{
        position: "absolute",
        top: 816,
        left: 32,
        width: 879,
        height: 96,
        display: "flex",
        gap: 15,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: sans,
        fontSize: 70,
        fontWeight: 875,
        lineHeight: 1,
        letterSpacing: -2.8,
        whiteSpace: "nowrap",
      }}
    >
      {words.map((word, i) => {
        const j = page.first + i,
          highlight = j === page.key && f >= at;
        return (
          <span
            key={j}
            style={{
              position: "relative",
              isolation: "isolate",
              display: "inline-block",
              color: "#fffdf9",
              WebkitTextStroke: "8px #13151a",
              paintOrder: "stroke fill",
              padding: "2px 4px 5px",
              transform: `scale(${highlight ? 1 + 0.095 * bump(f, at, 12) : 1})`,
            }}
          >
            {highlight && (
              <span
                style={{
                  position: "absolute",
                  inset: "-2px -4px -1px",
                  zIndex: -1,
                  borderRadius: 12,
                  background: accent,
                  border: "3px solid #17191f",
                  transform: `scale(${lerp(0.9, 1, ease(f, at - 1, 5))})`,
                }}
              />
            )}
            {word}
          </span>
        );
      })}
    </div>
  );
}
export function FlatClaudeFilm({
  episodeId,
  edit,
  flat,
  captions,
  showCaptions,
  audioEnabled,
}: {
  episodeId: string;
  edit: Edit;
  flat: FlatEdit;
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const f = useCurrentFrame(),
    props = { f, edit, flat },
    cam = camera(f, flat),
    rig = framePose(f, flat, edit.cues.no);
  const black = f >= flat.frames - 1;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {!black && (
        <>
          <svg width="1080" height="1920" viewBox="0 0 1080 1920">
            <defs>
              <pattern
                id="flat-grid"
                width="55"
                height="55"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M55 0H0v55"
                  fill="none"
                  stroke="#3c3f45"
                  strokeWidth="1.4"
                />
              </pattern>
              <pattern
                id="desk-grid"
                width="55"
                height="55"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M55 0H0v55"
                  fill="none"
                  stroke="#303239"
                  strokeWidth="1"
                />
              </pattern>
              <clipPath id="ui-reel-viewport">
                <rect x="13" y="266" width="905" height="581" />
              </clipPath>
              <clipPath id="above-desk">
                <rect x="0" y="874" width="1080" height="650" />
              </clipPath>
            </defs>
            <rect width="1080" height="1920" fill={P.bg} />
            <rect
              width="1080"
              height="1920"
              fill="url(#flat-grid)"
              opacity=".43"
            />
            <Sequence name="Stage rail" layout="none">
              <Rail {...props} />
            </Sequence>
            <g clipPath="url(#ui-reel-viewport)">
              {panels.map((Screen, i) => {
                const dx = stations[i] - cam.x;
                const from = Math.max(0, flat.stages[i] - 31);
                const to = Math.min(
                  flat.frames - 1,
                  (flat.stages[i + 1] ?? flat.frames) + 31,
                );
                return (
                  <Sequence
                    key={i}
                    name={stationNames[i]}
                    from={from}
                    durationInFrames={to - from}
                    layout="none"
                  >
                    <g transform={tr(14 + dx, 283 + heights[i] - cam.y)}>
                      <Screen {...props} />
                    </g>
                  </Sequence>
                );
              })}
            </g>
            <Desk />
            <Sequence name="Physical No key" layout="none">
              <NoKey {...props} />
            </Sequence>
            <g clipPath="url(#above-desk)">
              <Sequence name="Alex • articulated host" layout="none">
                <Alex rig={rig} f={f} />
              </Sequence>
            </g>
            <ReturnPacket f={f} edit={edit} rigTarget={wristOnScreen(rig)} />
          </svg>
          {showCaptions && (
            <Sequence name="Voice-aligned captions" layout="none">
              {flat.pages.map((page, i) => (
                <Sequence
                  key={page.first}
                  name={captions[i].text}
                  from={page.start}
                  durationInFrames={page.end - page.start}
                  layout="none"
                >
                  <CaptionGroup
                    f={f}
                    edit={edit}
                    page={page}
                    caption={captions[i]}
                  />
                </Sequence>
              ))}
            </Sequence>
          )}
        </>
      )}
      {audioEnabled && (
        <Sequence name="Alex voice and FASTEDITOR effects">
          <Audio src={staticFile(`episodes/${episodeId}/v2/mix.wav`)} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}
