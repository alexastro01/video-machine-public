import type { Caption } from "@remotion/captions";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import type { Episode } from "../engine/schema";
import { wordBounce } from "../developer/word-bounce";
import { PixelLayer, pos, pulse, smooth } from "../instagram-rpg/art";
import { JobMarketOpening } from "./Opening";
import { Location } from "./Locations";
import { Actor, Balloon, Glint, StatCard, type Level, type Player } from "./Paint";

function blocking(scene: Level, f: number, cut: number, speaking: string | undefined): Player[] {
  const left: Player = {role:"alex",cel:"alex-listen",x:93,feet:311,height:73};
  const right: Player = {role:"opus",cel:speaking==="opus" ? "opus-explain" : "opus-listen",x:177,feet:311,height:71,
    flip:speaking==="opus"};
  switch (scene.id) {
    case "castle":
      if (f>=scene.events.slam && cut>=2) right.cel="opus-point";
      right.flip=right.cel==="opus-explain";
      return [left,right];
    case "tavern":
      left.cel="alex-tug";
      if (cut===0) return [{...left,x:103,feet:253,height:96,lean:-3*pulse(f,scene.events.tug,21)},
        {...right,cel:"opus-point",flip:false}];
      return [{...left,height:77,feet:310},{...right,cel:"opus-point",flip:false}];
    case "dungeon":
      return [{...left, cel:f<scene.events.door4 ? "alex-listen" : "alex-disbelief", x:135,feet:346,height:cut===3 ? 91 : 80}];
    case "ghost":
      return [left,{...right,cel:f<scene.events.third ? "opus-point" : "opus-shrug",flip:false}];
    case "tower":
      return [{...left,cel:"alex-release",height:84,feet:305},{...right,cel:"opus-point",flip:false,feet:305}];
    case "forge":
      return [{...left,feet:361,height:73},{...right,cel:speaking ? "opus-point" : "opus-listen",feet:361,height:73,flip:false}];
    case "payoff":
      if (f>=scene.events.offer) return [{...right,cel:"opus-letter",x:135,feet:342,height:187,flip:false}];
      return [{...left,cel:"alex-sword",x:135,feet:346,height:cut===0 ? 177 : cut===1 ? 196 : 204}];
    default:return [];
  }
}

export function JobMarketFilm({ episode, captions, showCaptions, audioEnabled }: {
  episode: Episode; captions: Caption[]; showCaptions: boolean; audioEnabled: boolean;
}) {
  const frame = useCurrentFrame();
  const edit = episode.jobMarketFull;
  if (!edit || !episode.jobMarketOpening) throw new Error("Prepare the job market episode before rendering.");
  const scene = edit.scenes.filter(s=>s.start<=frame).at(-1) ?? edit.scenes[0];
  const f = frame - scene.start;
  const cuts = scene.reframes ?? [0];
  const cut = Math.max(0,cuts.filter(n=>n<=f).length-1);
  const index = captions.filter(c=>Math.round(c.startMs*episode.fps/1000)<=frame).length-1;
  const page = edit.pages.find(p=>index>=p.first && index<=p.last);
  const sectionTalks = page && (frame<=Math.ceil(captions[page.last].endMs*.06)+6 || page.last===captions.length-1);
  const speaking = sectionTalks ? page.role : undefined;
  const actors = blocking(scene,f,cut,speaking);
  const active = index>=0 && frame<Math.ceil(captions[index].endMs*.06)+2;
  const lift = active ? Math.round(wordBounce(frame,episode.fps,[{start:captions[index].startMs/1000}],3.5)) : 0;
  const actor = actors.find(a=>a.role===speaking);
  const offer=scene.events.offer;
  return <AbsoluteFill style={{background:"#131b28",overflow:"hidden"}}>
    {scene.id==="gate" ? <JobMarketOpening episode={episode} captions={captions.slice(0,episode.jobMarketOpening.starts.length)}
      showCaptions={showCaptions} audioEnabled={false} centered/> :
      <PixelLayer>
        <Location scene={scene} f={f} cut={cut}/>
        <div style={{...pos(0,0,270,480),pointerEvents:"none",background:"linear-gradient(0deg,rgba(10,16,27,.52),transparent 28%),linear-gradient(270deg,rgba(12,17,26,.20),transparent 15%)"}}/>
        {actors.map(a=><Actor key={a.role} actor={a} speaking={a===actor} lift={a===actor ? lift : 0}/>)}
        {scene.id==="payoff" && <>
          <Glint x={160} y={171} f={f} start={scene.events.raise} size={6} color="#9dfaff"/>
          <Glint x={89} y={213} f={f} start={offer+48} size={4}/>
          {f>=offer-6 && f<offer && <div style={{...pos(0,0,270,480),background:"#191b2b",
            opacity:.09*smooth(f,offer-6,offer)}}/>}
        </>}
        {showCaptions && actor && page && <Balloon actor={actor} lift={lift} page={page} captions={captions} frame={frame} index={index}/>}
        {scene.card && <StatCard card={scene.card} f={f}/>}
      </PixelLayer>}
    {audioEnabled && <Audio src={staticFile("episodes/"+episode.id+"/full/mix.wav")}/>}
  </AbsoluteFill>;
}

