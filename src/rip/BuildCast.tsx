import { Img, staticFile } from "remotion";
import {
  artPath,
  clamp01,
  lineAt,
  plan,
  pulse,
  smooth,
  timeline,
} from "./buildMotion";
import { PhysicalScreen } from "./LaptopUI";

const { cues } = plan;
const asset = (name: string) => staticFile(artPath(name));
const normalized = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const blinkFrames = [145, 328, 493, 678, 866, 1082, 1245, 1465, 1655];
const keySections = [cues.draftType, cues.replaceType];
const shotFreeze = (f: number) =>
  f >= 1770 || (f >= cues.failed && f < cues.failed + 38);
function bodyState(f: number) {
  const freeze = shotFreeze(f);
  const line = lineAt(f);
  const word = line?.words.filter((w) => w.start * 60 <= f).at(-1);
  const stressed =
    word && line?.strong.some((s) => normalized(s) === normalized(word.text));
  const kick =
    word && !freeze
      ? pulse(f, word.start * 60, 9) *
        (stressed ? (line?.id === "cool" ? 0.052 : 0.036) : 0.012)
      : 0;
  const breath = freeze ? 0 : Math.sin(f / 36) * 0.0044;
  const recoil = Math.max(
    ...plan.industries.map((s) => pulse(f, s.impact, 11)),
  );
  const look = 1.7 * pulse(f, plan.industries[2].impact - 8, 22);
  const x =
    59 +
    48 * smooth(f, cues.draft - 18, cues.draft + 12) +
    28 * smooth(f, 1438, 1470);
  const y =
    691 + 3 * Math.cos((freeze ? 1770 : f) / 37) - 4 * kick * 70 + 5 * recoil;
  // She turns the same laptop in her hands for the post reveal, then tips
  // the keys toward Alex. Every pose is sampled from a single two-arm cel.
  const angle = Math.round(
    3 * (1 - smooth(f, cues.post - 10, cues.post + 20)) +
      2 * smooth(f, cues.playback + 10, cues.playback + 40) -
      2 * smooth(f, cues.draft - 12, cues.draft + 21) +
      2 * smooth(f, 1438, 1474) -
      2 * smooth(f, 1580, 1624),
  );
  const typing = keySections.find(([a, b]) => f >= a && f <= b);
  const typingPulse = typing
    ? (Math.cos(((f - typing[0]) * Math.PI) / 2) + 1) / 2
    : 0;
  const clickPulse = Math.max(
    0,
    ...[...cues.publish, cues.openCut, cues.playback + 16, cues.selectHelp].map(
      (k) => pulse(f, k - 3, 9),
    ),
  );
  const press = Math.round(2 * Math.max(typingPulse, clickPulse));
  let tilt =
    0.32 * Math.sin(f / 93) +
    look +
    1.2 * pulse(f, cues.post - 7, 39) +
    1.8 * smooth(f, 1430, 1475) -
    1.8 * smooth(f, 1698, 1758);
  if (freeze) tilt = 0;
  return { x, y, scale: 0.966, angle, press, kick, breath, tilt };
}
function Face({ f }: { f: number }) {
  const line = lineAt(f),
    freeze = shotFreeze(f);
  const volume = line?.mouth[f - line.frame] ?? 0;
  const blink =
    !freeze && blinkFrames.some((start) => f >= start && f < start + 8);
  const wince =
    f >= plan.industries[1].impact && f < plan.industries[1].impact + 24;
  const smug =
    (f >= plan.industries[2].impact + 9 && f < cues.post - 6) ||
    (f >= cues.playback + 24 && f < cues.failed - 9);
  const eye = blink ? "blink" : wince ? "wince" : smug ? "smug" : undefined;
  const gaze =
    f >= cues.failed + 12
      ? "down"
      : f >= plan.industries[2].impact - 18 && f < plan.industries[2].impact + 6
        ? "right"
        : (f >= cues.publish[0] && f < cues.failed + 12) ||
            (f >= cues.post - 9 && f < cues.post + 75) ||
            (f >= cues.playback - 6 && f < cues.playback + 21)
          ? "left"
          : undefined;
  const mouth =
    volume > 0.37
      ? volume > 0.76
        ? "wince"
        : "talk"
      : smug
        ? "smug"
        : undefined;
  return (
    <>
      {eye ? (
        <Img className="bf-eyes" src={asset(eye + "-eyes.png")} />
      ) : gaze ? (
        <Img className="bf-eyes" src={asset("gaze-" + gaze + ".png")} />
      ) : null}
      {mouth && <Img className="bf-mouth" src={asset(mouth + "-mouth.png")} />}
    </>
  );
}
function Alex({
  f,
  pointX,
  pointY,
  hand = false,
}: {
  f: number;
  pointX: number;
  pointY: number;
  hand?: boolean;
}) {
  if (f < cues.leanIn || f >= cues.alexGone) return null;
  const arrive = smooth(f, cues.leanIn, cues.contact - 1),
    leave = smooth(f, cues.leanOut, cues.alexGone);
  const visible = arrive * (1 - leave);
  const reaching =
    smooth(f, cues.contact - 1, cues.contact + 8) *
    (1 - smooth(f, cues.enter + 3, cues.enter + 14));
  const typing = f >= cues.contact && f <= cues.enter;
  const accent = typing
    ? Math.pow((1 + Math.cos(((f - cues.enter) * Math.PI) / 4)) / 2, 2)
    : 0;
  const reach = clamp01(reaching * (0.71 + 0.29 * accent));
  const idx = Math.round(reach * 4);
  const names = ["lean", "reach-1", "reach-2", "reach-3", "enter"];
  const scale = 0.78;
  return (
    <div
      className="bf-alex"
      style={{
        left: pointX - 692 * scale - (1 - visible) * 640,
        top:
          pointY -
          792 * scale +
          (1 - visible) * 48 +
          (typing ? 2.5 * accent : 0),
        width: 842,
        height: 900,
        transformOrigin: "0 0",
        transform: `scale(${scale}) rotate(${-4 * (1 - visible)}deg)`,
      }}
    >
      {!hand && (
        <svg
          width="842"
          height="1210"
          viewBox="0 0 842 1210"
          style={{ position: "absolute", inset: 0 }}
        >
          <path
            d="M-120 828Q110 762 322 785L423 823Q328 1006 191 1210H-120Z"
            fill="#181b25"
            stroke="#15151c"
            strokeWidth="7"
          />
          <path d="M318 852Q243 1007 151 1131l27-114 51-132z" fill="#252734" />
          <path
            d="M146 633Q284 642 469 678l29 23q-29 87-95 158-129 40-231 13L-74 985V832q126-97 220-199z"
            fill="#242941"
            stroke="#161721"
            strokeWidth="8"
            strokeLinejoin="round"
          />
          <path d="M272 664l177 28q-37 81-83 144-78 15-135 6z" fill="#343549" />
          <path
            d="M456 680q-28 85-86 165"
            stroke="#9293a2"
            fill="none"
            strokeWidth="4"
          />
          <path d="M117 807q55-15 104-46l-53 49 91-13-132 49z" fill="#1b2034" />
          <path
            d="M-58 940q132-87 230-77 132 27 231-14"
            stroke="#171924"
            fill="none"
            strokeWidth="8"
          />
        </svg>
      )}
      <Img
        src={asset("alex-" + (hand ? "hand-" : "") + names[idx] + ".webp")}
        style={{ position: "absolute", inset: 0, width: 842, height: 900 }}
      />
    </div>
  );
}
export function BuildCast({ f }: { f: number }) {
  const state = bodyState(f),
    { x, y, scale, angle, press, kick, breath, tilt } = state;
  const dark = smooth(f, cues.draft, cues.replaceType[0]) * 0.18;
  const rad = (tilt * Math.PI) / 180,
    pivotX = 1024 * 0.52,
    pivotY = 1536 * 0.88;
  const dx = 375 - pivotX,
    dy = 1001 - pivotY;
  const keyX =
    x +
    pivotX +
    scale * (1 - kick * 0.45) * (dx * Math.cos(rad) - dy * Math.sin(rad));
  const keyY =
    y +
    pivotY +
    scale * (1 + kick + breath) * (dx * Math.sin(rad) + dy * Math.cos(rad));
  return (
    <>
      <Alex f={f} pointX={keyX} pointY={keyY} />
      <div
        className="bf-actor"
        style={{
          left: x,
          top: y,
          transform: `scale(${scale * (1 - kick * 0.45)},${scale * (1 + kick + breath)}) rotate(${tilt}deg)`,
        }}
      >
        <div
          className="bf-figure"
          style={{
            filter: dark
              ? `contrast(${1 + dark * 1.25}) brightness(${1 - dark * 0.12})`
              : undefined,
          }}
        >
          <Img src={asset("opus-source.webp")} className="bf-opus-body" />
          <Img
            src={asset(`pose-${angle}-${press}.webp`)}
            className="bf-laptop-pose"
          />
          <Face f={f} />
        </div>
        <PhysicalScreen f={f} angle={angle} />
      </div>
      <Alex f={f} pointX={keyX} pointY={keyY} hand />
    </>
  );
}
export function BuildCaption({ f }: { f: number }) {
  const line = timeline.lines.find(
    (l) =>
      f >= l.words[0].start * 60 &&
      f < Math.min(1920, l.words[l.words.length - 1].end * 60 + 8),
  );
  if (!line) return null;
  const spec = plan.lines.find((l) => l.id === line.id)!;
  let cursor = 0;
  for (const size of spec.groups) {
    const part = line.words.slice(cursor, cursor + size);
    const end = Math.min(
      line.words[cursor + size]?.start ?? 32,
      part[part.length - 1].end + 0.13,
    );
    if (f >= part[0].start * 60 && f < end * 60) {
      const active = part.filter((w) => w.start * 60 <= f).at(-1);
      const state = bodyState(f);
      return (
        <div
          className="bf-caption"
          style={{
            left: Math.min(690, state.x + state.scale * 593),
            top: state.y + 119 * state.scale - 80,
          }}
        >
          {part
            .filter((w) => w.start * 60 <= f)
            .map((w) => {
              const stress = spec.strong.some(
                (s) => normalized(s) === normalized(w.text),
              );
              const on = w === active;
              const bounce = pulse(f, w.start * 60, 11);
              return (
                <span
                  key={w.start}
                  style={{
                    color: on ? "#ffe25c" : "#fffdf6",
                    transform: `translateY(${-bounce * (stress ? 6 : 3)}px) scale(${1 + (stress ? 0.095 : 0.048) * bounce})`,
                  }}
                >
                  {w.text}
                </span>
              );
            })}
        </div>
      );
    }
    cursor += size;
  }
  return null;
}
