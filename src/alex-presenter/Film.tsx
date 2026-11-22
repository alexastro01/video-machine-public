import { useMemo } from "react";
import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import type { PresenterEdit } from "./schema";
import "../born-yesterday/film.css";
import "./presenter.css";
import { CommentCard } from "./CommentCard";

type Shot = PresenterEdit["shots"][number];
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const glideFrames = 12;

function cameraAt(shot: Shot, frame: number) {
  const next = shot.camera.findIndex((key) => key.frame > frame);
  if (next === 0) return shot.camera[0];
  if (next < 0) return shot.camera[shot.camera.length - 1];
  const a = shot.camera[next - 1], b = shot.camera[next];
  const t = ease((frame - a.frame) / (b.frame - a.frame));
  return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), zoom: mix(a.zoom, b.zoom, t) };
}

function Evidence({ shot, frame, fps, root, incoming, outgoing }: {
  shot: Shot; frame: number; fps: number; root: string; incoming: boolean; outgoing: number;
}) {
  const addressHeight = shot.address ? 62 : 0;
  const width = shot.width - 4, height = shot.height - addressHeight - 4;
  const camera = cameraAt(shot, frame);
  const scale = Math.max(width / shot.pixels[0], height / shot.pixels[1]) * camera.zoom;
  const w = shot.pixels[0] * scale, h = shot.pixels[1] * scale;
  const x = clamp(width * 0.5 - w * camera.x, width - w, 0);
  const y = clamp(height * 0.5 - h * camera.y, height - h, 0);
  const age = frame - shot.start;
  const number = Math.min(shot.frames, 1 + Math.floor(Math.max(0, age) * shot.rate * shot.speed / fps));
  const picture = shot.frames ? shot.file + "/" + String(number).padStart(5, "0") + ".jpg" : shot.file;
  const p = incoming ? ease(age / glideFrames) : 1;
  const dx = (shot.cutStyle === "slide" ? 1 - p : 0) * 1080 - outgoing * 1080;
  const mark = shot.mark;
  const markAge = mark ? frame - mark.frame : -1;
  const ripple = clamp(markAge / 27);
  return <div className="ap-card" style={{
    width: shot.width, height: shot.height, left: (1080 - shot.width) / 2,
    top: 505 - shot.height / 2, transform: 'translateX(' + dx + 'px)',
    clipPath: incoming && shot.cutStyle === "wipe" && p < 1 ? 'inset(0 ' + ((1-p)*100) + '% 0 0 round 39px)' : undefined,
  }}>
    {shot.address && <div className="ap-address">{shot.address}</div>}
    <div className="ap-window">
      <div className="ap-picture" style={{width: w, height: h, transform: 'translate(' + x + 'px,' + y + 'px)'}}>
        <Img src={staticFile(root + picture)} style={{width:"100%", height:"100%", display:"block"}} />
        {mark && markAge >= 0 && mark.kind === "underline" && <div className="ap-underline" style={{
          left: mark.x*w, top: mark.y*h, width: mark.width*w*ease((markAge+1)/13),
        }}/>}
        {mark && markAge >= 0 && mark.kind === "tap" && ripple < 1 && <div className="ap-tap" style={{
          left: mark.x*w, top: mark.y*h, width: mark.width*w, height: mark.width*w,
          opacity: (1 - ripple)**1.2, transform: 'translate(-50%,-50%) scale(' + (.25 + ripple*1.9) + ')',
        }}/>}
      </div>
    </div>
  </div>;
}

function Presenter({ edit, frame, fps, root }: { edit: PresenterEdit; frame: number; fps: number; root: string }) {
  const t = frame / fps;
  let nod = 0, palm = 0;
  for (const accent of edit.accents) {
    const dt = (frame - accent) / fps;
    if (dt < -.14 || dt > .85) continue;
    nod += Math.exp(-(((dt-.10)/.18)**2));
    palm += Math.exp(-(((dt-.17)/.32)**2));
  }
  const phase = Math.sin(t*.82);
  const pose = clamp(Math.round(7 + Math.sin(t*1.24)*3 + phase*2 + palm*4),0,16);
  const bodyX = Math.sin(t*.71)*8 + Math.sin(t*.28)*3;
  const bodyY = Math.sin(t*1.9)*3.1 + nod*5.8;
  const lean = Math.sin(t*.75)*.65 + phase*.33 + nod*.34;
  const blinkFrame = edit.blinks.find((time) => frame >= time && frame < time + 9);
  const blink = blinkFrame === undefined ? undefined : frame - blinkFrame;
  const lip = ["rest","small","mid","open"][edit.mouth[Math.min(edit.mouth.length-1, Math.floor(t*30))]];
  const dir = root + "media/alex/";
  return <div className="by-portrait ap-actor" style={{
    transform: 'translateX(-50%) translate(' + bodyX + 'px,' + bodyY + 'px) rotate(' + lean + 'deg)',
  }}>
    <Img src={staticFile(dir + "pose-" + String(pose).padStart(2,"0") + ".webp")} />
    {lip && lip !== "open" && <Img src={staticFile(dir + lip + ".webp")} style={{
      left:"41.796875%",top:"27.63671875%",width:"11.81640625%",height:"11.81640625%",
    }}/>}
    {blink !== undefined && <Img src={staticFile(dir + (blink<2 || blink>=6 ? "blink-half.webp" : "blink-shut.webp"))} style={{
      left:"35.15625%",top:"19.3359375%",width:"18.359375%",height:"8.7890625%",
    }}/>}
  </div>;
}

type Props = { episodeId: string; edit: PresenterEdit; captions: Caption[]; showCaptions: boolean; audioEnabled: boolean };
export function PresenterFilm({episodeId, edit, captions, showCaptions, audioEnabled}: Props) {
  const outputFrame = useCurrentFrame(), { fps } = useVideoConfig();
  const frame = Math.round(outputFrame * (edit.sourceRate ?? 1));
  const root = "episodes/" + episodeId + "/";
  const cues = useMemo(() => progressiveCaptionCues(captions, edit.words), [captions, edit.words]);
  const ms = outputFrame * 1000 / fps;
  const active = showCaptions && cues.find((line) => line.startMs <= ms && ms < line.endMs);
  const text = active ? active.text.trim().split(/\s+/) : [];
  // End equality belongs to the new card. During a wipe, both cuts retain the
  // same size and center so the viewer can compare the underlying controls.
  const firstFuture = edit.shots.findIndex((s) => s.start > frame);
  const index = firstFuture < 0 ? edit.shots.length-1 : Math.max(0,firstFuture-1);
  const shot = edit.shots[index], prev = edit.shots[index-1];
  const transition = frame-shot.start<glideFrames && shot.cutStyle!=="cut" && Boolean(prev);
  const comment = edit.commentEnding;
  const inComment = comment !== undefined && outputFrame >= comment.start;
  const commentSlide = inComment ? ease((outputFrame - comment.start)/10) : 0;
  return <AbsoluteFill className="by-film">
    <div className="by-paper" />
    <div className="by-tone kind" style={{opacity:ease((frame-edit.warmFrame)/35)}} />
    <div className="by-print" />
    <Presenter edit={edit} frame={frame} fps={fps} root={root} />
    {transition && <Evidence key={prev.name} shot={prev} frame={frame} fps={fps} root={root}
      incoming={false} outgoing={shot.cutStyle==="slide" ? ease((frame-shot.start)/glideFrames) : 0}/>}
    {commentSlide < 1 && <Evidence key={shot.name} shot={shot} frame={frame} fps={fps} root={root} incoming={transition} outgoing={commentSlide} />}
    {inComment && <CommentCard cue={comment} frame={outputFrame} root={root} />}
    {text.length>0 && <div className="by-captions"><span>{text.slice(0,-1).join(" ")}{text.length>1 ? " " : ""}<b>{text[text.length-1]}</b></span></div>}
    {audioEnabled && <Audio src={staticFile(root + (edit.mixFile ?? "mix.wav"))} />}
  </AbsoluteFill>;
}
