import type { CSSProperties } from "react";
import type { Caption } from "@remotion/captions";
import { Img, staticFile } from "remotion";
import type { Episode } from "../engine/schema";
import { mix, out, pix, pos, pulse, tiny } from "../instagram-rpg/art";
import stock from "../../episodes/alex-astro-job-market-hell/art.json";
import atlas from "../../episodes/alex-astro-job-market-hell/full/art.json";

type Full = NonNullable<Episode["jobMarketFull"]>;
export type Level = Full["scenes"][number];
export type Page = Full["pages"][number];
export type Role = Page["role"];
type NewArt = keyof typeof atlas.layers;
type StockArt = keyof typeof stock.layers;
export type Cel = NewArt | StockArt;

const base = "episodes/alex-astro-job-market-hell/";
const ink = "#191c2a";
const cream = "#fff2c9";
export const centered = 135;
export const safeRight = 228;
const isNew = (name: Cel): name is NewArt => Object.prototype.hasOwnProperty.call(atlas.layers, name);
export const dimensions = (name: Cel) => isNew(name) ? atlas.layers[name] : stock.layers[name as StockArt];

export function Sprite({ name, x, y, w, h, style, subject }: {
  name: Cel; x: number; y: number; w?: number; h?: number; style?: CSSProperties; subject?: string;
}) {
  const [nw, nh] = dimensions(name);
  const width = w ?? (h === undefined ? nw : h * nw / nh);
  const height = h ?? width * nh / nw;
  const src = base + (isNew(name) ? "full/art/" : "art/") + name + ".png";
  return <Img src={staticFile(src)} draggable={false} data-subject={subject}
    style={{ ...pos(Math.round(x - width / 2), Math.round(y), Math.round(width), Math.round(height)),
      display: "block", imageRendering: "pixelated", ...style }}/>;
}

export function Glint({ x, y, f, start, span = 18, size = 4, color = "#ffe09a" }: {
  x: number; y: number; f: number; start: number; span?: number; size?: number; color?: string;
}) {
  const t = pulse(f, start, span);
  if (t < .02) return null;
  const a = Math.max(1, Math.round(t * size));
  return <div style={{ ...pos(Math.round(x)-1, Math.round(y)-1, 3, 3), background: "#fff9da", opacity: Math.min(1,t*2),
    boxShadow: `${a}px 0 ${color},-${a}px 0 ${color},0 ${a}px ${color},0 -${a}px ${color}` }}/>;
}

export function Plaque({ text, x = centered, y, w, size = 10, color = cream, style }: {
  text: string; x?: number; y: number; w: number; size?: number; color?: string; style?: CSSProperties;
}) {
  return <div data-game-label={text} style={{ ...pos(x-w/2,y,w), color, textAlign:"center",
    whiteSpace:"nowrap", font:`700 ${size}px/1.1 ${pix}`, textShadow:"0 1px #251c28", ...style }}>{text}</div>;
}

export function StatCard({ card, f }: { card: NonNullable<Level["card"]>; f: number }) {
  if (f < card.from) return null;
  const lift = Math.round(4 * (1-out(f,card.from,card.from+6)));
  return <div data-stat-card data-centered style={{ ...pos(42,325 + lift,186,50), display:"flex", flexDirection:"column", alignItems:"center",
    justifyContent:"center", boxSizing:"border-box", border:"2px solid #152335", background:"#182d3b",
    boxShadow:"inset 0 0 0 1px #a7c5ba,inset 0 0 0 3px #304858,0 2px #101a26", color:"#fff4d2" }}>
    <div style={{ textAlign:"center", font:`700 10.7px/11.4px ${pix}`, letterSpacing:-.1 }}>
      {card.lines.map(line=><div key={line}>{line}</div>)}
    </div>
    <div style={{ marginTop:3, paddingTop:2, width:"86%", borderTop:"1px solid #48636a", textAlign:"center",
      color:"#b8dace", font:`600 8.4px/9px ${pix}`, whiteSpace:"nowrap" }}>{card.source}</div>
  </div>;
}

export type Player = { role: Role; cel: Cel; x: number; feet: number; height: number; flip?: boolean; lean?: number };
export function Actor({ actor, lift, speaking }: { actor: Player; lift: number; speaking: boolean }) {
  const { role, cel, x, feet, height, flip, lean } = actor;
  const [w,h] = dimensions(cel);
  const size = height * w/h;
  const shadowW = Math.min(size * .68, height * .42);
  return <>
    <div style={{ ...pos(Math.round(x-shadowW/2),feet-3,Math.round(shadowW),5), background:"#101926", opacity:.54,
      clipPath:"polygon(12% 0,88% 0,100% 40%,100% 70%,85% 100%,15% 100%,0 70%,0 40%)" }}/>
    <Sprite subject={role} name={cel} x={x} y={feet-height-lift} h={height}
      style={{ transform:`scaleX(${flip ? -1 : 1}) rotate(${lean ?? 0}deg)`, transformOrigin:"50% 98%",
        filter:speaking ? "brightness(1.12) drop-shadow(0 -1px #f2d38f)" : "brightness(.98)" }}/>
  </>;
}

export function Balloon({ actor, lift, page, captions, frame, index }: {
  actor: Player; lift: number; page: Page; captions: Caption[]; frame: number; index: number;
}) {
  if (index < page.first || index > page.last) return null;
  const last = Math.ceil(captions[page.last].endMs * .06);
  if (page.last !== captions.length - 1 && frame > last + 6) return null;
  const visible = captions.slice(page.first,index+1);
  const actorX = actor.x + (actor.cel === "alex-sword" ? -9 : actor.cel === "opus-letter" ? 8 : 0);
  const bottom = Math.round(actor.feet - actor.height - lift - 7);
  const accent = actor.role === "alex" ? "#81501a" : "#705379";
  return <>
    <div data-field-caption={actor.role} style={{ position:"absolute", left:0, bottom:480-bottom,
      transform:`translateX(clamp(8px, calc(${actorX}px - 50%), calc(${safeRight}px - 100%)))`,
      width:"max-content", maxWidth:163, textAlign:"center", boxSizing:"border-box", padding:"3px 6px 4px",
      border:`1px solid ${ink}`, background:"#fff1ce", boxShadow:"inset 0 -2px #d9be91,0 2px #1c2231",
      color:ink, font:`700 14px/14.3px ${pix}` }}>
      {visible.map((word,k)=><span key={word.startMs} style={{color:page.first+k===index ? accent : ink}}>
        {k>0 ? " " : ""}{word.text.trim()}</span>)}
    </div>
    <div style={{...pos(actorX-3,bottom+1,6,5),background:ink,clipPath:"polygon(0 0,100% 0,50% 100%)"}}/>
    <div style={{...pos(actorX-2,bottom,4,3),background:"#d9be91",clipPath:"polygon(0 0,100% 0,50% 100%)"}}/>
  </>;
}

export function Background({ map, scale, pivot, f, shake = 0, children }: {
  map: NewArt; scale: number; pivot: number; f: number; shake?: number; children?: React.ReactNode;
}) {
  const x = shake ? [0,2,-2,1,-1,0][f % 6] * shake : 0;
  return <div style={{ ...pos(0,0,270,480), transform:`translate(${x}px,0) scale(${scale})`, transformOrigin:`135px ${pivot}px` }}>
    <Sprite name={map} x={135} y={0} w={270}/>
    {children}
  </div>;
}

export function Joke({ text, y, amount = 1 }: { text: string; y: number; amount?: number }) {
  return <div data-joke-number data-centered style={{ ...pos(42,y,186), color:"white", font:`400 10px/13px ${tiny}`,
    textAlign:"center", whiteSpace:"nowrap", opacity:amount, textShadow:"1px 1px #1b1c27,0 2px #222030,-1px 0 #1b1c27" }}>{text}</div>;
}

export function Chain({ x1, y1, x2, y2 }: {x1:number;y1:number;x2:number;y2:number}) {
  const n = Math.max(2,Math.ceil(Math.hypot(x2-x1,y2-y1)/4));
  return <>{Array.from({length:n},(_,i)=><div key={i} style={{...pos(Math.round(mix(x1,x2,i/(n-1))),Math.round(mix(y1,y2,i/(n-1))),2,2),
    background:i%2 ? "#bb975d" : "#6d6654",boxShadow:"0 1px #2c3038"}}/>)}</>;
}

