import type { Caption } from "@remotion/captions";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { wordBounce } from "../developer/word-bounce";
import type { Episode } from "../engine/schema";
import { PixelLayer, mix, pix, pos, pulse, smooth, unit } from "../instagram-rpg/art";
import { Actor, Balloon, Glint, Sprite, type Player } from "../job-market/Paint";
import { PortraitDialogue } from "../job-market/PortraitDialogue";
import dialogueLayout from "../../episodes/alex-astro-remote-job/dialogue-layout.json";

const trophyAsset = "episodes/alex-astro-cs-enrollment/full/art/trophy.png";

function Application({ frame, contact }: { frame: number; contact: number }) {
  const fall = unit(frame, contact - 12, contact) ** 1.45;
  const settle = smooth(frame, contact, contact + 17);
  const x = mix(192, 179, fall) - 4 * settle;
  const y = mix(188, 280, fall) - 4 * pulse(frame, contact, 13);
  return <>
    <Sprite name="letter" x={91} y={308} w={19} style={{ transform: "rotate(19deg)", opacity: .72 }} />
    <Sprite name="letter" x={162} y={318} w={14} style={{ transform: "rotate(-17deg)", opacity: .67 }} />
    <div style={{ ...pos(162, 297, 37, 4), background: "#171a22", opacity: .42 * fall }} />
    <Sprite name="letter" x={x} y={y} w={34}
      style={{ transform: "rotate(" + mix(-34, 8, fall) + "deg)" }} subject="application" />
    <Glint x={192} y={298} f={frame} start={contact} span={11} size={4} />
    <Glint x={165} y={294} f={frame} start={contact + 2} span={9} size={2} />
  </>;
}

function Trophy({ frame, contact }: { frame: number; contact: number }) {
  const age = frame - contact;
  if (age < -13) return null;
  const fall = unit(age, -13, 0) ** 1.5;
  const bounce = 3 * pulse(age, 0, 10);
  const size = 47;
  const x = 196;
  const bottom = Math.round(mix(172, 253, fall) - bounce);
  return <>
    <div style={{ ...pos(x - 11, 251, 22, 4), background: "#242027", opacity: .53 * fall }} />
    <Img src={staticFile(trophyAsset)} data-subject="trophy"
      style={{ ...pos(x - size / 2, bottom - size, size, size), imageRendering: "pixelated",
        transform: "rotate(" + Math.round(mix(-16, 0, fall)) + "deg)", transformOrigin: "50% 100%" }} />
    <Glint x={176} y={222} f={frame} start={contact} span={17} size={5} />
    <Glint x={213} y={211} f={frame} start={contact + 4} span={18} size={5} />
    <Glint x={206} y={234} f={frame} start={contact + 12} span={18} size={3} />
  </>;
}

function Prototype({ frame, ready }: { frame: number; ready: number }) {
  const complete = frame >= ready;
  const scan = Math.floor(frame / 8) % 3;
  return <div style={{ ...pos(126, 128, 18, 12), overflow: "hidden",
    background: complete ? "#bde58c" : "#6ca365", boxShadow: "0 0 9px #abd97c60" }}>
    {complete
      ? <div data-subject="completed-demo" style={{ ...pos(4, 2, 11, 8), background: "#235847",
        clipPath: "polygon(0 45%,17% 28%,40% 58%,83% 0,100% 17%,40% 100%)" }} />
      : [0, 1, 2].map(line => <div key={line} style={{ ...pos(2, 2 + line * 3, 7 + (line + scan) % 3 * 3, 1),
        background: "#214e44", opacity: line === scan ? 1 : .68 }} />)}
  </div>;
}

export function RemoteJobOpening({ episode, captions, showCaptions, audioEnabled }: {
  episode: Episode; captions: Caption[]; showCaptions: boolean; audioEnabled: boolean;
}) {
  const frame = useCurrentFrame();
  const edit = episode.remoteJobOpening;
  if (!edit) throw new Error("Prepare the remote job opening before rendering.");

  const hall = frame >= edit.hallFrame;
  const portrait = !hall || frame >= edit.portraits[1].frame;
  const wordIndex = edit.starts.filter(start => start <= frame).length - 1;
  const word = captions[wordIndex];
  const speaking = word && frame < edit.ends[wordIndex];
  const lift = speaking ? Math.round(wordBounce(frame, episode.fps, [{ start: word.startMs / 1000 }], 3)) : 0;
  const page = edit.pages.find(([first, last]) => first <= wordIndex && wordIndex <= last);

  const flinch = pulse(frame, edit.letterFrame, 20);
  const celebrate = pulse(frame, edit.awardFrame - 3, 35);
  const won = frame >= edit.awardFrame && frame < edit.awardFrame + 29;
  const actor: Player = hall
    ? { role: "alex", cel: won ? "alex-release" : "alex-listen", x: 128, feet: 281, height: 110, lean: 3 * celebrate }
    : { role: "alex", cel: frame < edit.letterFrame + 24 ? "alex-guard" : "alex-listen",
      x: 135 - 3 * flinch, feet: 297, height: 111, lean: -6 * flinch };
  const zoom = hall ? 1 + .085 * smooth(frame, edit.portraits[1].frame, edit.demoFrame + 37) : 1;

  return <AbsoluteFill style={{ background: "#111821", overflow: "hidden" }}>
    <PixelLayer>
      <div style={{ ...pos(0, 0, 270, 480), transform: "scale(" + zoom + ")", transformOrigin: "135px 180px" }}>
        {hall
          ? <Img src={staticFile("episodes/" + episode.id + "/art/hackathon-hall.png")}
            style={{ ...pos(0, 0, 270, 480), imageRendering: "pixelated" }} />
          : <Sprite name="gate-centered" x={135} y={0} w={270} />}
        {hall && <Prototype frame={frame} ready={edit.demoFrame} />}
        <Actor actor={actor} lift={lift + Math.round(6 * celebrate)} speaking={Boolean(speaking)} />
        {hall ? <Trophy frame={frame} contact={edit.awardFrame} />
          : <Application frame={frame} contact={edit.letterFrame} />}
      </div>
      {!hall && <div data-opening-title style={{
        ...pos(36, 23, 198),
        color: "#fff2cb",
        fontFamily: pix,
        fontWeight: 700,
        fontSize: 24,
        lineHeight: "23px",
        textAlign: "center",
        textWrap: "balance",
        textShadow: "2px 0 #291d29, -2px 0 #291d29, 0 -2px #291d29, 0 2px #291d29, 1px 3px #291d29",
      }}>{episode.title}</div>}
      {showCaptions && !portrait && page && <Balloon actor={actor} lift={lift + Math.round(6 * celebrate)}
        page={{ first: page[0], last: page[1], role: "alex" }} captions={captions} frame={frame} index={wordIndex} />}
    </PixelLayer>
    {portrait && <PortraitDialogue edit={edit} captions={captions} base="episodes/alex-astro-job-market-hell" frame={frame}
      index={wordIndex} lift={lift} showCaptions={showCaptions} layout={dialogueLayout} />}
    {audioEnabled && <Audio src={staticFile("episodes/" + episode.id + "/mix.wav")} />}
  </AbsoluteFill>;
}
