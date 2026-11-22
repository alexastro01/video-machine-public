import type { CSSProperties } from "react";
import type { Caption } from "@remotion/captions";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import type { Episode } from "../engine/schema";
import { wordBounce } from "../developer/word-bounce";
import { PixelLayer, mix, out, pix, pos, pulse, smooth, tiny, unit } from "../instagram-rpg/art";
import art from "../../episodes/alex-astro-job-market-hell/art.json";
import { PortraitDialogue } from "./PortraitDialogue";

type Edit = NonNullable<Episode["jobMarketOpening"]>;
type View = Edit["shots"][number]["view"];
type Hit = Edit["impacts"][number];
type Sprite = keyof typeof art.layers;
type Role = "alex" | "opus";
type Camera = { z: number; dx: number; dy: number };

const safeRight = 228;
const safeBottom = 383;
const cream = "#fff3cf";
const cameras: Record<View, Camera> = {
  gate:      { z: 1,    dx: 0,   dy: 0 },
  volley:    { z: 1.17, dx: -14, dy: -45 },
  counsel:   { z: 1.25, dx: -48, dy: -66 },
  shrug:     { z: 1.43, dx: -76, dy: -114 },
  admission: { z: 2.24, dx: -54, dy: -349 },
};
const inkEdge: CSSProperties = {
  textShadow: "1px 0 #15131c, -1px 0 #15131c, 0 -1px #15131c, 0 2px #15131c, 1px 2px #15131c",
};
const point = (c: Camera, x: number, y: number) => ({
  x: Math.round(x * c.z + c.dx), y: Math.round(y * c.z + c.dy),
});

function SpriteImage({ base, name, x, y, width, style, subject }: {
  base: string; name: Sprite; x: number; y: number; width: number; style?: CSSProperties; subject?: string;
}) {
  const [w, h] = art.layers[name];
  return <Img draggable={false} data-subject={subject} src={staticFile(base + "/art/" + name + ".png")}
    style={{ ...pos(Math.round(x), Math.round(y), Math.round(width), Math.round(width * h / w)),
      imageRendering: "pixelated", display: "block", ...style }} />;
}

function Glint({ x, y, amount, color = "#ffe6a0" }: { x: number; y: number; amount: number; color?: string }) {
  if (amount <= 0) return null;
  const reach = Math.max(1, Math.round(4 * amount));
  return <div style={{ ...pos(x, y, 2, 2), background: "#fff8de", opacity: amount,
    boxShadow: `${reach}px 0 ${color}, -${reach}px 0 ${color}, 0 ${reach}px ${color}, 0 -${reach}px ${color}` }} />;
}

function Gate({ base, cam, f, label, centered }: { base: string; cam: Camera; f: number; label: string; centered: boolean }) {
  const gate = point(cam, centered ? 135 : 94, centered ? 112 : 137);
  return <>
    {centered ? <Img src={staticFile(base + "/full/art/gate-centered.png")}
      style={{ ...pos(cam.dx, cam.dy, 270 * cam.z, 480 * cam.z), imageRendering: "pixelated" }}/>
      : <SpriteImage base={base} name="gate" x={cam.dx} y={cam.dy} width={270 * cam.z}/>}
    <div style={{ ...pos(gate.x, gate.y), transform: `translateX(-50%) scale(${cam.z})`,
      transformOrigin: "50% 0%", border: "1px solid #1b161b", borderTopColor: "#b2874d",
      color: "#f2d695", padding: "2px 4px", background: "#4f3331", font: `700 7px/1 ${pix}`,
      whiteSpace: "nowrap", boxShadow: "0 2px 0 #171722", ...inkEdge }}>{label}</div>
    <div style={{ ...pos(0, 0, 270, 480), background:
      "linear-gradient(0deg,rgba(6,12,21,.62) 0%,transparent 28%),linear-gradient(270deg,rgba(7,12,20,.38),transparent 21%)" }} />
    {[-1, 1].map((side) => {
      const p = point(cam, (centered ? 135 : 95) + 24 * side, centered ? 148 : 164);
      return <div key={side} style={{ ...pos(p.x, p.y, 1, (Math.floor(f / 6) + side + 3) % 3 + 1),
        opacity: .65, background: "#efb24f" }} />;
    })}
  </>;
}

function DistantLetters({ base, f, cam, close }: { base: string; f: number; cam: Camera; close: boolean }) {
  const count = close ? 5 : 13;
  return <>{Array.from({ length: count }, (_, i) => {
    const cycle = 52 + (i * 17) % 29;
    const elapsed = (f + i * 23 + 14) % cycle;
    if (elapsed > cycle - 12) return null;
    const t = elapsed / (cycle - 12);
    const worldX = 15 + ((i * 63) % 188) + 19 * t;
    const worldY = mix(8 + i % 4 * 13, 164 + ((i * 19) % 90), t * (.65 + t * .35));
    const { x, y } = point(cam, worldX, worldY);
    const w = Math.round((6 + i % 4 * 2) * cam.z);
    if (x < 3 || x + w > safeRight - 2 || y < -12 || y > safeBottom - 20) return null;
    return <div key={i} style={{ ...pos(x, y, w, w), opacity: .35 + .36 * Math.sin(Math.PI * t) }}>
      <div style={{ ...pos(0, -5, 1, 6), background: "#c1afa0", transform: "rotate(-21deg)" }}/>
      <SpriteImage base={base} name="letter" x={0} y={0} width={w}
        style={{ transform: `rotate(${i % 2 ? -16 : 13}deg)` }} />
    </div>;
  })}</>;
}

function Letter({ base, hit, f, cam }: { base: string; hit: Hit; f: number; cam: Camera }) {
  const age = f - hit.frame;
  const fallFrames = 27;
  if (age < -fallFrames) return null;
  const distance = 1 - Math.pow(unit(age, -fallFrames, 0), 1.48);
  const ground = point(cam, hit.x, hit.y);
  const x = Math.round(ground.x - 32 * cam.z * distance);
  const y = Math.round(ground.y - 200 * cam.z * distance - (age < 0 ? 0 : 4 * cam.z * pulse(age, 0, 8)));
  const width = Math.round(hit.size * cam.z * (1 + .20 * distance));
  const faded = smooth(age, 9, 34);
  if (x - width / 2 < 1 || x + width / 2 > safeRight || y > safeBottom - width * .35) return null;
  return <>
    {age > -14 && ground.y + 3 < safeBottom && <div style={{ ...pos(ground.x - width / 2, ground.y + 1, width, Math.max(2, Math.round(width / 5))),
      opacity: .44 * unit(age, -14, -2), background: "#11141f", clipPath: "polygon(10% 0,90% 0,100% 50%,88% 100%,12% 100%,0 50%)" }}/>}
    {age < -2 && <div style={{ ...pos(x - 3, y - width * .95, 2, width * .65), background: "#ead5aa",
      opacity: .55, transform: "rotate(-14deg)", boxShadow: "-3px -3px #987e70" }}/>}
    <SpriteImage base={base} name="letter" x={x - width / 2} y={y - width * .44} width={width}
      style={{ transform: `rotate(${hit.angle + Math.round(distance * 14)}deg) scaleY(${1 - .45 * smooth(age, 0, 5)})`,
        transformOrigin: "50% 65%", filter: `brightness(${1 - .31 * faded})` }} />
    {age >= 0 && age < 12 && [-1, 1].map(side => {
      const progress = out(age, 0, 11);
      return <div key={side} style={{ ...pos(Math.round(x + side * (width / 2 + 4 * progress)),
        Math.round(y - 1 - 4 * Math.sin(progress * Math.PI)), 2, 2),
        opacity: 1 - progress, background: cream, boxShadow: `${side * 2}px -3px #ffa569` }}/>;
    })}
  </>;
}

function body(role: Role, cam: Camera) {
  const feet = role === "alex" ? point(cam, 75, 311) : point(cam, 161, 303);
  const h = Math.round((role === "alex" ? 79 : 76) * cam.z);
  return { ...feet, h };
}

const partyFraming: Record<View, { span: number; alex: number; opus: number }> = {
  gate: { span: 136, alex: 108, opus: 104 },
  volley: { span: 142, alex: 115, opus: 111 },
  counsel: { span: 136, alex: 111, opus: 116 },
  shrug: { span: 142, alex: 117, opus: 123 },
  admission: { span: 140, alex: 132, opus: 118 },
};

function centeredParty(view: View, alex: Sprite, opus: Sprite) {
  const frame = partyFraming[view];
  const width = (name: Sprite, height: number) => height * art.layers[name][0] / art.layers[name][1];
  const feet = Math.round(240 + Math.max(frame.alex, frame.opus) / 2);
  // Center the two visible silhouettes as a unit, even when a finger or a sleeve extends.
  return {
    alex: { x: 135 - frame.span / 2 + width(alex, frame.alex) / 2, y: feet, h: frame.alex },
    opus: { x: 135 + frame.span / 2 - width(opus, frame.opus) / 2, y: feet - 2, h: frame.opus },
  };
}

function Actor({ base, role, mark, lift, active, pose, two, ageTwo }: {
  base: string; role: Role; mark: ReturnType<typeof body>; lift: number; active: boolean; pose: Sprite; two: boolean; ageTwo: number;
}) {
  const { x, y, h } = mark;
  const [nw, nh] = art.layers[pose];
  const w = h * nw / nh;
  const top = y - h - lift;
  return <>
    <div style={{ ...pos(Math.round(x - w * .41), Math.round(y - h * .048), Math.round(w * .82), Math.round(h * .08)),
      background: "#101822", opacity: .60 - lift * .022,
      clipPath: "polygon(10% 0,85% 0,100% 35%,100% 65%,86% 100%,12% 100%,0 65%,0 32%)" }} />
    <SpriteImage base={base} name={pose} subject={role} x={x - w / 2} y={top} width={w} style={{
      transform: pose === "opus-explain" ? "scaleX(-1)" : undefined,
      filter: active ? "brightness(1.07)" : "brightness(.91)",
    }}/>
    {role === "alex" && two && <>
      <Glint x={Math.round(x + w * .50)} y={Math.round(top + h * .25)} amount={pulse(ageTwo, 0, 16)} />
      <Glint x={Math.round(x + w * .59)} y={Math.round(top + h * .20)} amount={pulse(ageTwo, 4, 13) * .76} />
    </>}
  </>;
}

function Headline({ f, edit, overlay, centered }: { f: number; edit: Edit; overlay: boolean; centered: boolean }) {
  const impact = edit.titleImpactFrame;
  if (f > 115) return null;
  const enter = out(f, 0, impact);
  const leave = smooth(f, 108, 115);
  const zoom = (1.12 - .12 * enter) + .033 * pulse(f, impact, 6);
  const sizes = [13, 30, 29, 16];
  const colors = [cream, "#fff3cb", "#ff8968", cream];
  return <div data-hero-title style={{ ...pos(centered ? 30.5 : 10, (overlay ? 39 : 23) - 5 * (1 - enter) - 8 * leave, 209),
    textAlign: "center", opacity: 1 - leave,
    transform: centered ? `scale(${.967 * Math.min(zoom, 1.025)}, ${zoom})` : `scale(${zoom})`, transformOrigin: "50% 60%",
    fontFamily: pix, fontWeight: 700, color: cream, whiteSpace: "nowrap",
    textShadow: "2px 0 #291d29,-2px 0 #291d29,0 -2px #291d29,0 2px #291d29,0 4px #291d29,2px 4px #291d29" }}>
    {edit.titleLines.map((line, i) => <div key={line} style={{ color: colors[i], fontSize: sizes[i],
      lineHeight: i === 0 ? "16px" : i === 3 ? "19px" : "26px", letterSpacing: i === 0 ? 1 : -.5 }}>{line}</div>)}
  </div>;
}

function Counter({ edit, f, y, centered }: { edit: Edit; f: number; y: number; centered: boolean }) {
  const firstHold = 15, period = 8;
  const ticks = Math.max(0, Math.floor((f - firstHold) / period) + 1);
  const count = edit.startCount + ticks;
  const roll = f < firstHold ? 1 : out((f - firstHold) % period, 0, 3);
  return <div data-joke-counter style={{ ...pos(centered ? 42 : 21, y, centered ? 186 : undefined), justifyContent: centered ? "center" : undefined, display: "flex", gap: 6, alignItems: "center",
    color: "white", fontFamily: tiny, fontSize: 8.4, lineHeight: "13px", whiteSpace: "nowrap", ...inkEdge }}>
    <span>{edit.counterLabel}</span>
    <div style={{ height: 14, position: "relative", overflow: "hidden", width: centered ? 28 : 34, fontSize: 9.3 }}>
      <div style={{ transform: `translateY(${Math.round(-14 * roll)}px)`, lineHeight: "14px" }}>
        <div>{count - 1}</div><div>{count}</div>
      </div>
    </div>
  </div>;
}

function FieldCaption({ words, edit, index, frame, role, cam, lift }: {
  words: Caption[]; edit: Edit; index: number; frame: number; role: Role; cam: Camera; lift: number;
}) {
  const page = edit.pages.find(([first, last]) => first <= index && index <= last);
  if (!page || frame >= edit.ends[page[1]] + 6) return null;
  const { x, y, h } = body(role, cam);
  const bottom = Math.round(y - h - 6 - lift * .5);
  return <>
    <div data-field-caption style={{ ...pos(0, bottom),
      transform: `translate(clamp(6px, calc(${x}px - 50%), calc(${safeRight}px - 100%)), -100%)`,
      color: "#fff8e8", background: "#18232a", borderTop: `1px solid ${role === "alex" ? "#6a9aab" : "#b6947c"}`,
      padding: "1px 5px 3px", fontFamily: pix, fontWeight: 700, fontSize: 15.3, lineHeight: "17px",
      whiteSpace: "nowrap", boxShadow: "0 2px #0e141c" }}>
      {words.slice(page[0], index + 1).map((w, j) => <span key={w.startMs} style={{
        color: page[0] + j === index ? "#ffe4a2" : "#fff8e8",
      }}>{j ? " " : ""}{w.text.trim()}</span>)}
    </div>
    <div style={{ ...pos(x - 2, bottom, 5, 4), background: "#18232a", clipPath: "polygon(0 0,100% 0,50% 100%)" }} />
  </>;
}

export function JobMarketOpening({ episode, captions, showCaptions, audioEnabled, centered = true }: {
  episode: Episode; captions: Caption[]; showCaptions: boolean; audioEnabled: boolean; centered?: boolean;
}) {
  const f = useCurrentFrame();
  const edit = episode.jobMarketOpening;
  if (!edit) throw new Error("Prepare the recorded Junior Town opening before rendering.");
  const shot = edit.shots.filter(s => s.frame <= f).at(-1) ?? edit.shots[0];
  const close = shot.view === "admission";
  const overlay = Boolean(edit.portraits && edit.mouth);
  const cam = overlay && close ? { z: 1.72, dx: -17, dy: -186 } : { ...cameras[shot.view] };
  if (overlay) cam.dy -= 20;
  if (centered) cam.dx = Math.round(135 * (1 - cam.z));
  const impactAge = f - edit.titleImpactFrame;
  if (impactAge >= 0 && impactAge <= 5) cam.dy += [2, 0, -1, 0, 1, 0][impactAge];
  const castCam = overlay ? { ...cam, dy: cam.dy - 65 * cam.z } : cam;
  if (overlay && centered) {
    const framing = partyFraming[shot.view];
    castCam.z = framing.alex / 79;
    castCam.dx = Math.round(135 - 118 * castCam.z);
    castCam.dy = Math.round(240 + Math.max(framing.alex, framing.opus) / 2 - 303 * castCam.z);
  }
  const next = edit.starts.findIndex(s => s > f);
  const index = (next < 0 ? edit.starts.length : next) - 1;
  const isOpus = shot.view === "counsel" || shot.view === "shrug";
  const role = isOpus ? "opus" : "alex";
  const last = edit.starts.length - 1;
  const speaking = index >= 0 && f < edit.ends[index] + 2;
  const lift = speaking ? Math.round(wordBounce(f, episode.fps, [{ start: edit.starts[index] / episode.fps }], 3.6)) : 0;
  const two = f >= edit.starts[last];
  const alexPose = two ? "alex-two" : isOpus || close ? "alex-listen" : "alex-guard";
  const opusPose = shot.view === "shrug" ? "opus-shrug" : isOpus ? "opus-explain" : "opus-listen";
  const pair = centered && overlay ? centeredParty(shot.view, alexPose, opusPose) : undefined;
  const base = "episodes/" + episode.id;
  const drawLetters = (front: boolean) => edit.impacts.filter(h => (h.y > 311) === front).map(h => {
    const hit = overlay ? { ...h, y: h.y - Math.max(0, h.y - 291) * .72 } : h;
    return <Letter key={h.frame} base={base} cam={castCam} hit={hit} f={f} />;
  });
  return <AbsoluteFill style={{ background: "#121725", overflow: "hidden" }}>
    <PixelLayer>
      {overlay && centered && <Img src={staticFile(base + "/full/art/gate-centered.png")} style={{ ...pos(0, 0, 270, 480), imageRendering: "pixelated" }}/>}
      {overlay && !centered && <SpriteImage base={base} name="gate" x={0} y={0} width={270} />}
      <Gate base={base} cam={cam} f={f} label={edit.gateLabel} centered={centered} />
      <DistantLetters base={base} cam={cam} f={f} close={close} />
      {drawLetters(false)}
      {(!close || pair) && <Actor base={base} mark={pair?.opus ?? body("opus", castCam)} role="opus" active={isOpus}
        lift={isOpus ? lift : 0} two={false} pose={opusPose} ageTwo={0} />}
      <Actor base={base} mark={pair?.alex ?? body("alex", castCam)} role="alex" active={!isOpus} lift={isOpus ? 0 : lift}
        two={two} pose={alexPose} ageTwo={f - edit.starts[last]} />
      {drawLetters(true)}
      <Headline edit={edit} f={f} overlay={overlay} centered={centered} />
      <Counter edit={edit} f={f} centered={centered} y={overlay ? 13 : close ? 61 : 350} />
      {showCaptions && !overlay && <FieldCaption words={captions} edit={edit} index={index} role={role} frame={f} cam={cam} lift={lift}/>}
    </PixelLayer>
    {overlay && <PortraitDialogue edit={edit} captions={captions} base={base} frame={f} index={index} lift={lift} showCaptions={showCaptions}/>}
    {audioEnabled && <Audio src={staticFile(base + "/mix.wav")}/>}
  </AbsoluteFill>;
}
