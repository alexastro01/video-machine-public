import type { Caption } from "@remotion/captions";
import {
  AbsoluteFill,
  Audio,
  Img,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { Episode } from "../engine/schema";
import {
  PixelLayer,
  out,
  pix,
  pos,
  pulse,
  smooth,
  tiny,
  unit,
} from "../instagram-rpg/art";
import { wordBounce } from "../developer/word-bounce";
import { CampusScene } from "./Scenes";
import { PortraitDialogue } from "../job-market/PortraitDialogue";
import inventory from "../../episodes/alex-astro-cs-enrollment/art.json";
import portraits from "../../episodes/alex-astro-cs-enrollment/portraits.json";

import campusPortraits from "../../episodes/alex-astro-cs-enrollment/full/portraits.json";

const voicePoses = { ...portraits, ...campusPortraits };

type Edit = NonNullable<Episode["lectureHall"]>;
type Sprite = keyof typeof inventory.sprites;
const cream = "#fff4d9";
const ink = "#122332";

function Seated({
  base,
  name,
  x,
  feet,
  height,
}: {
  base: string;
  name: Sprite;
  x: number;
  feet: number;
  height: number;
}) {
  const art = inventory.sprites[name];
  const w = Math.round((height * art.w) / art.h);
  return (
    <Img
      src={staticFile(base + "/art/" + name + ".png")}
      data-sitting={name}
      style={{
        ...pos(
          Math.round(x - (height * art.anchorX) / art.h),
          Math.round(feet - height),
          w,
          height,
        ),
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
}

function Echo({
  frame,
  start,
  second,
}: {
  frame: number;
  start: number;
  second: boolean;
}) {
  const p = unit(frame, start, start + 28);
  if (p <= 0 || p >= 1) return null;
  const spread = Math.round(16 + p * (second ? 59 : 45));
  return (
    <svg
      aria-hidden
      viewBox="0 0 270 480"
      style={{ ...pos(0, 0, 270, 480), opacity: 0.79 * Math.sin(Math.PI * p) }}
      fill="none"
      stroke={second ? "#bbced1" : "#ffde8d"}
      strokeWidth="1"
      shapeRendering="crispEdges"
    >
      {[-1, 1].map((side) => (
        <g
          key={side}
          transform={`translate(${135 + side * spread},242) scale(${side},1)`}
        >
          <path d="M0 -7 h2 v2 h2 v3 h1 v4 h-1 v3 h-2 v2 h-2" />
          <path
            opacity=".55"
            d="M5 -11 h2 v2 h2 v3 h2 v5 h1 v3 h-1 v5 h-2 v3 h-2 v2 h-2"
          />
        </g>
      ))}
    </svg>
  );
}

function Light({ frame, why }: { frame: number; why: number }) {
  const relay = pulse(frame, 3, 8) + 0.55 * pulse(frame, why, 10);
  const drift = Math.floor(frame / 3);
  return (
    <svg
      viewBox="0 0 270 480"
      style={pos(0, 0, 270, 480)}
      shapeRendering="crispEdges"
      aria-hidden
    >
      <path
        d="M130 46 h10 l18 178 h-46 z"
        fill="#ffc75d"
        opacity={0.018 + 0.13 * relay}
      />
      <rect
        x="131"
        y="43"
        width="8"
        height="2"
        fill="#fff3af"
        opacity={0.4 + 0.5 * relay}
      />
      {Array.from({ length: 12 }, (_, i) => {
        const y =
          56 +
          ((i * 47 + Math.floor(drift * (i % 2 === 0 ? 0.55 : 0.36))) % 174);
        const dx = Math.round(
          Math.sin(i * 3.4 + drift * 0.052) * (3 + (y - 56) / 15),
        );
        return (
          <rect
            key={i}
            x={134 + dx}
            y={y}
            width={i % 4 === 1 ? 2 : 1}
            height={1}
            opacity={0.18 + (0.36 * (1 + Math.sin(i + drift * 0.13))) / 2}
            fill="#ffdc93"
          />
        );
      })}
    </svg>
  );
}

function Hall({
  edit,
  base,
  frame,
  lift,
}: {
  edit: Edit;
  base: string;
  frame: number;
  lift: number;
}) {
  const warm = frame >= edit.cutFrame;
  const echoing = frame >= edit.ends[6] + 4 && frame < edit.starts[9] - 5;
  const calling = !warm && frame >= edit.starts[9] - 5;
  const f = Math.floor(frame / 2) * 2;
  let z = 1;
  if (warm && f >= edit.starts[16])
    z = 1.16 + 0.035 * smooth(f, edit.starts[16], edit.starts[20]);
  if (!warm && f >= edit.starts[5])
    z = 1.14 + 0.045 * smooth(f, edit.starts[5], edit.starts[7]);
  if (calling) z = 1.38 + 0.055 * pulse(f, edit.starts[10], 18);
  const dx = Math.round(135 - 135 * z);
  const dy = Math.round((1 - z) * 257);
  const reaction = pulse(f, edit.starts[10], 14);
  const dadBeat =
    warm &&
    [edit.cutFrame + 5, edit.starts[14], edit.starts[17], edit.starts[20]].some(
      (start) => f >= start && f < start + 13,
    );
  const mumBeat =
    warm &&
    [
      edit.cutFrame + 13,
      edit.starts[15],
      edit.starts[18],
      edit.starts[20] + 7,
    ].some((start) => f >= start && f < start + 14);
  const active = calling
    ? "call"
    : echoing
      ? "listen"
      : warm && f >= edit.starts[14]
        ? "hope"
        : "seated";
  const feet =
    (warm ? 284 : 286) -
    Math.min(3, Math.round(lift / 5)) -
    (calling ? Math.round(reaction * 2) : 0);
  return (
    <PixelLayer>
      <div
        data-hall={warm ? "2019" : "present"}
        style={{
          ...pos(dx, dy, 270, 480),
          transform: `scale(${z})`,
          transformOrigin: "0 0",
        }}
      >
        <Img
          src={staticFile(
            base + "/art/" + (warm ? "packed-hall" : "empty-hall") + ".png",
          )}
          style={{ ...pos(0, 0, 270, 480), imageRendering: "pixelated" }}
        />
        {!warm && <Light frame={f} why={edit.starts[10]} />}
        {warm && (
          <>
            <Seated
              base={base}
              name={dadBeat ? "dad-up" : "dad-clap"}
              x={135}
              feet={225}
              height={dadBeat ? 38 : 31}
            />
            <Seated
              base={base}
              name={mumBeat ? "mum-up" : "mum-clap"}
              x={181}
              feet={285}
              height={mumBeat ? 50 : 40}
            />
          </>
        )}
        <Seated
          base={base}
          name={active}
          x={135}
          feet={feet}
          height={warm ? 46 : 49}
        />
        {!warm && (
          <>
            <Echo frame={f} start={edit.starts[7] - 2} second={false} />
            <Echo frame={f} start={edit.starts[8] - 2} second />
          </>
        )}
      </div>
    </PixelLayer>
  );
}

function EnrollmentCard({ edit, frame }: { edit: Edit; frame: number }) {
  const start = edit.starts[4];
  if (frame < start || frame >= edit.cutFrame) return null;
  const enter = out(frame, start, start + 6);
  const [before, amount, after] = edit.card.headline.split(/(−[\d.]+%)/);
  return (
    <div
      data-stat-card
      style={{
        ...pos(176, Math.round(247 + (1 - enter) * 18), 728),
        color: cream,
        textAlign: "center",
        boxSizing: "border-box",
        padding: "12px 12px 13px",
        fontFamily: pix,
        background: "rgba(16,30,39,.97)",
        border: "4px solid #c8b47e",
        outline: "4px solid #14222b",
        boxShadow: "6px 8px 0 rgba(5,12,20,.65)",
        opacity: 0.35 + 0.65 * enter,
      }}
    >
      <div
        style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 40,
          fontWeight: 820,
          lineHeight: "48px",
        }}
      >
        {before}
        <span style={{ color: "#ffe398" }}>{amount}</span>
        {after}
      </div>
      <div
        style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 31,
          fontWeight: 625,
          lineHeight: "36px",
          color: "#e1e7db",
        }}
      >
        {edit.card.scope.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <div
        style={{
          fontFamily: pix,
          fontSize: 31,
          fontWeight: 600,
          lineHeight: "34px",
          color: "#ead39c",
          marginTop: 5,
        }}
      >
        {edit.card.source}
      </div>
    </div>
  );
}

function FlashbackBanner({ edit, frame }: { edit: Edit; frame: number }) {
  const from = edit.cutFrame + 5;
  if (frame < from) return null;
  const drop = out(frame, from, from + 16);
  const shake = Math.round(pulse(frame, edit.starts[16], 14) * 4);
  return (
    <div
      data-banner
      style={{
        ...pos(163, 144 + Math.round((1 - drop) * -28) + shake, 754, 142),
        transformOrigin: "50% 0",
        transform: `scaleY(${0.12 + 0.88 * drop})`,
      }}
    >
      <svg
        width="754"
        height="142"
        viewBox="0 0 188 36"
        preserveAspectRatio="none"
        style={pos(0, 0)}
        shapeRendering="crispEdges"
        aria-hidden
      >
        <path fill="#392838" d="M1 10h186l-5 10 5 11h-28v4H28v-4H1l5-11z" />
        <path fill="#a64a3a" d="M2 9h25v19H2l5-9zm159 0h25l-5 10 5 9h-25z" />
        <path fill="#b8834a" d="M15 5h158v24H15z" />
        <path fill="#ffe6a5" d="M15 2h158v23h-6v3H21v-3h-6z" />
        <path fill="#b85b3f" d="M15 3h158v2H15zm6 19h146v2H21z" />
        <path fill="#f5c779" d="M15 5h5v17h-5zm153 0h5v17h-5z" />
      </svg>
      <div
        style={{
          ...pos(55, 23, 644, 62),
          textAlign: "center",
          fontFamily: tiny,
          fontSize: 40,
          lineHeight: "62px",
          color: "#50362f",
          whiteSpace: "nowrap",
        }}
      >
        {edit.banner}
      </div>
    </div>
  );
}

export function LectureHallFilm({
  episode,
  captions,
  showCaptions,
  audioEnabled,
}: {
  episode: Episode;
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const playhead = useCurrentFrame();
  const full = episode.lectureFull;
  const frame = full && playhead >= full.loopFrame ? 0 : playhead;
  const shot = full?.scenes.find(
    (scene) => frame >= scene.start && frame < scene.start + scene.frames,
  );
  const opening = !shot || shot.id === "empty" || shot.id === "flashback";
  const edit = episode.lectureHall;
  if (!edit)
    throw new Error(
      "Prepare the recorded lecture hall opening before rendering.",
    );
  const base = "episodes/" + episode.id;
  const next = edit.starts.findIndex((s) => s > frame);
  const index = (next === -1 ? edit.starts.length : next) - 1;
  const echo = index === 7 || index === 8;
  const lift =
    index < 0 || echo
      ? 0
      : wordBounce(frame, episode.fps, [
          { start: edit.starts[index] / episode.fps },
        ]);
  const warm = frame >= edit.cutFrame;
  return (
    <AbsoluteFill style={{ backgroundColor: ink, overflow: "hidden" }}>
      {opening ? (
        <>
          <Hall edit={edit} base={base} frame={frame} lift={lift} />
          <div
            data-hud
            style={{
              ...pos(61, 86),
              color: "#fffffa",
              fontFamily: tiny,
              fontSize: 31,
              lineHeight: "48px",
              textShadow:
                "3px 3px 0 #19202b,-2px 2px 0 #19202b,2px -2px 0 #19202b",
            }}
          >
            {warm ? edit.year : edit.counter}
          </div>
          {warm ? (
            <FlashbackBanner edit={edit} frame={frame} />
          ) : (
            <EnrollmentCard edit={edit} frame={frame} />
          )}
        </>
      ) : full && shot ? (
        <CampusScene
          base={base}
          shot={shot}
          frame={frame}
          labels={full.labels}
          lift={Math.min(3, Math.round(lift / 4))}
        />
      ) : null}
      <PortraitDialogue
        edit={edit}
        captions={captions}
        base={base}
        frame={frame}
        index={index}
        lift={lift}
        showCaptions={showCaptions}
        clearAtCut={Boolean(full)}
        poses={voicePoses}
      />
      {audioEnabled && (
        <Audio src={staticFile(base + (full ? "/full/mix.wav" : "/mix.wav"))} />
      )}
    </AbsoluteFill>
  );
}
