import { mix, out, pix, pos, pulse, smooth, unit } from "../instagram-rpg/art";
import { Background, Chain, Glint, Joke, Plaque, Sprite, type Level } from "./Paint";

type Shot = { scene: Level; f: number; cut: number };
const edge = { textShadow:"0 1px #241b26,1px 0 #241b26,-1px 0 #241b26,0 -1px #241b26" };

function Castle({ scene, f, cut }: Shot) {
  const slam = scene.events.slam;
  const open = f < slam-10 ? mix(.19,1,smooth(f,0,93)) : 1-smooth(f,slam-10,slam);
  const hinge = 151;
  const front = Math.round(mix(108,208,open));
  const drop = out(f,slam-17,slam-1);
  const bannerY = Math.round(78-(1-drop)*48);
  const scale = [1,1.08,1.18,1.12][cut];
  return <Background map="castle" scale={scale} pivot={147} f={f} shake={f>=slam && f<slam+9 ? 1 : 0}>
    <Sprite name="bridge" subject="drawbridge" x={135} y={Math.min(hinge,front)} w={42+open*8} h={Math.max(3,Math.abs(hinge-front))}
      style={{filter:`brightness(${.92+.17*open})`}}/>
    {[-1,1].map(side=><Chain key={side} x1={135+22*side} y1={112} x2={135+(20+open*5)*side} y2={front+2}/>)}
    {drop>0 && <div style={{...pos(91,74,88,63),overflow:"hidden"}}>
      <div style={{...pos(0,bannerY-74,88,54)}}>
        <Sprite name="banner" x={44} y={0} w={81} h={54}/>
        <Plaque text={scene.sign?.split(" ")[0] ?? ""} x={44} y={10} w={59} size={11}/>
        <Plaque text={scene.sign?.split(" ")[1] ?? ""} x={44} y={21} w={59} size={11}/>
      </div>
    </div>}
    {[-1,1].map(side=><Glint key={side} x={135+22*side} y={119} f={f} start={slam} size={7}/>)}
    {f>=slam && f<slam+16 && [-1,1].map(side=><div key={side} style={{...pos(135+side*(23+out(f,slam,slam+16)*8),147-out(f,slam,slam+16)*6,3,2),
      background:"#e4c991",opacity:1-unit(f,slam,slam+16)}}/>)}
  </Background>;
}

function Tavern({ scene, f, cut }: Shot) {
  const e = scene.events;
  const high = cut===0;
  const x = high ? 150 : 135;
  const top = high ? 109 : 105;
  const rollEnd = Math.round(mix(169,high ? 224 : 218,smooth(f,e.tug,e.door)));
  const spill = smooth(f,e.door-41,e.door+10);
  const far = Math.round(mix(129,24,spill));
  const tailW = Math.max(1,133-far);
  const labels = scene.labels ?? [];
  return <>
    <Background map="tavern" scale={[1.03,1.12,1.06,1.12,1.06][cut]} pivot={130} f={f}/>
    <Plaque text={scene.sign ?? ""} y={77} w={104} size={12} style={{background:"#543124",border:"1px solid #ceb178",
      boxSizing:"border-box",padding:"2px 0",color:"#fff0be",...edge}}/>
    {spill>0 && <div style={{...pos(far,202,tailW,20),background:"#e8c388",borderTop:"2px solid #a37645",
      borderBottom:"2px solid #92643f",transform:"skewY(4deg)",transformOrigin:"100% 50%",
      backgroundImage:"repeating-linear-gradient(95deg,transparent 0px,transparent 19px,#c69d65 20px,transparent 21px)" }}/>}
    {spill>0 && <Sprite name="roller" x={far+6} y={199} w={26} h={8} style={{transform:"rotate(93deg)"}}/>}
    <div style={{...pos(x-51,top,102,Math.max(1,rollEnd-top)),boxSizing:"border-box",overflow:"hidden",
      borderLeft:"2px solid #9d6e44",borderRight:"2px solid #8e6341",background:"#f0cf93",
      boxShadow:"inset 2px 0 #ffe2a8,inset -3px 0 #d5a76a,2px 2px #423037"}}>
      {labels.map((line,i)=>{
        const age = f-(e.tug+i*15);
        if(age<0)return null;
        return <div key={line} style={{...pos(2,9+i*22,94),font:`700 10.9px/12px ${pix}`,textAlign:"center",
          color:age<16 ? "#8a3e2a" : "#513426", paddingBottom:3, borderBottom:"1px dotted #bd905b"}}>{line}</div>;
      })}
    </div>
    <Sprite name="roller" subject="quest roll" x={x} y={rollEnd-5+Math.round(pulse(f,e.tail,18)*2)} w={110} h={12}/>
    <Glint x={x+36} y={rollEnd-4} f={f} start={e.roll} />
    <Glint x={37} y={205} f={f} start={e.door}/>
    {f>=e.tail-3 && f<e.tail+44 && Array.from({length:4},(_,i)=>{
      const travel=((f-e.tail+3+i*13)%44)/44;
      return <div key={i} style={{...pos(37+Math.round(85*(1-travel)),207,4,1),background:"#8f663f",opacity:.75}}/>;
    })}
  </>;
}

const doorArt = ["door-blue","door-wood","door-iron","door-skull"] as const;
function Dungeon({ scene, f, cut }: Shot) {
  const labels = scene.labels ?? [];
  const colors = ["#86dbe4","#ffd083","#c1b1ff","#ff9a86"];
  return <>
    <Background map="dungeon" scale={[1,1.07,1.12,1.06][cut]} pivot={161} f={f}/>
    {doorArt.map((name,i)=>{
      const x = i%2 ? 178 : 92;
      const y = i<2 ? 43 : 136;
      const lit = scene.events["door"+(i+1)];
      const active = f>=lit;
      const flash = pulse(f,lit,15);
      return <div key={name} style={{...pos(x-40,y,80,89)}}>
        {active && <div style={{...pos(5,62,70,13),background:colors[i],opacity:.13+.16*flash,
          clipPath:"polygon(12% 0,84% 0,100% 90%,0 90%)"}}/>}
        <Sprite subject={name} name={name} x={40} y={0} h={66} style={{filter:active ?
          `brightness(${1.04+.62*flash}) drop-shadow(0 -1px ${colors[i]})` : "brightness(.47) saturate(.6)"}}/>
        <Plaque text={labels[i]} x={40} y={68} w={77} size={i===3 ? 9.4 : 10.3} color={active ? "#fff0cf" : "#b9afbb"}
          style={{background:active ? "#342738" : "#25212e",borderTop:`1px solid ${active ? colors[i] : "#55465c"}`,padding:"2px 0"}}/>
        <Glint x={40} y={27} f={f} start={lit} span={22} size={7} color={colors[i]}/>
      </div>;
    })}
  </>;
}

function GhostTown({ scene, f, cut }: Shot) {
  const gates=[scene.events.first,scene.events.second,scene.events.third];
  return <>
    <Background map="ghost-town" scale={[1.02,1.1,1.05,1.12][cut]} pivot={160} f={f}/>
    {[0,1,2].map(i=>{
      const x=135+(i-1)*52;
      const y=[148,127,148][i];
      const start=gates[i];
      const gone=smooth(f,start+17,i===2 ? scene.events.depart+62 : start+127);
      const flick = Math.round(Math.sin((f+i*17)/9)*2);
      const drift = Math.round((i-1)*10*gone+Math.sin(f/12+i)*gone*4);
      return <div key={i}>
        <Sprite name="signpost" x={x} y={y+13} h={52} style={{filter:"brightness(.71) saturate(.47)"}}/>
        {gone<1 && <Sprite subject="ghost posting" name="posting" x={x+drift} y={y+4-64*gone+flick*gone}
          h={40} style={{opacity:mix(.90,.02,gone),filter:`brightness(${1+.35*gone})`,transform:`rotate(${(i-1)*7+gone*11}deg)`}}/>}
        <Glint x={x+8} y={y+9} f={f} start={start} color="#a5ffff"/>
        {f>=start && f<start+71 && [0,1,2].map(k=><div key={k} style={{...pos(x-12+k*9,y+4-((f-start+k*13)%40),2,2),
          opacity:.65*(1-unit(f,start,start+71)),background:"#b3e6e3"}}/>)}
      </div>;
    })}
  </>;
}

const wings = ["wing-up","wing-level","wing-down","wing-level"] as const;
function Tower({ scene, f, cut }: Shot) {
  const { release,swarm }=scene.events;
  const fly=smooth(f,release,swarm+3);
  const birdX=mix(118,145,fly)+3*Math.sin(fly*Math.PI);
  const birdY=mix(232,131,fly)-18*Math.sin(fly*Math.PI);
  const wingIndex=Math.floor(Math.max(0,f-release)/5)%4;
  const parts=[wings[wingIndex],"cover","wing-up","wing-level","cover","wing-down"] as const;
  const arrive=smooth(f,swarm-23,swarm+18);
  return <>
    <Background map="tower" scale={[1,1.12,1.06][cut]} pivot={150} f={f}/>
    {f<swarm+9 && <Sprite name={wings[wingIndex]} subject="carrier pigeon" x={birdX} y={birdY} w={27}
      style={{opacity:1-smooth(f,swarm,swarm+9)}}/>}
    {arrive>0 && Array.from({length:23},(_,i)=>{
      const t=(f+i*23)/23;
      const cos=Math.cos(t*(i%3*.09+1)),sin=Math.sin(t);
      const dx=(i%2 ? 1 : -1)*((1-arrive)*72)+cos*(24+(i%5)*8);
      const x=135+dx;
      const y=133+sin*(15+(i%4)*7)+(1-arrive)*24;
      if(x<41 || x>220)return null;
      return <Sprite key={i} name={parts[i%parts.length]} x={x} y={y} w={i%4===0 ? 16 : 10+i%3*2}
        style={{opacity:arrive*(.64+i%3*.13),transform:`scaleX(${cos<0 ? -1 : 1}) rotate(${Math.round(sin*13)}deg)`}}/>;
    })}
    {arrive>0 && <Joke text={scene.sign ?? ""} y={71} amount={arrive}/>}
    <Glint x={birdX+9} y={birdY+4} f={f} start={release} size={3}/>
  </>;
}

function Forge({ scene, f, cut }: Shot) {
  const e=scene.events, hit=e.clang;
  const closing=smooth(f,hit-30,hit-4);
  const struck=f>=hit;
  const ring=pulse(f,hit,16);
  const smith=smooth(f,hit-31,hit-12);
  const down=smooth(f,hit-12,hit);
  const lift=out(f,hit+2,hit+33);
  const angle=-12+42*smith-54*down+26*lift;
  const copperX=mix(97,125,closing), blueX=mix(177,144,closing);
  return <>
    <Background map="forge" scale={[1,1.09,1.14,1.09][cut]} pivot={165} f={f} shake={f>=hit && f<hit+7 ? .7 : 0}/>
    <Sprite name="anvil" x={135} y={186} w={114} h={59} subject="anvil"/>
    {!struck && <>
      {([["copper",copperX,e.copper,82],["azure",blueX,e.azure,55]] as const).map(([item,x,start,w],i)=><div key={item}>
        <Sprite name={item} x={x} y={165-Math.round(pulse(f,start,12)*3)} w={w*(1-.40*closing)} h={30}
          style={{filter:`brightness(${f>=start ? 1.12 : .78})`}}/>
        {closing<.77 && <Plaque text={scene.labels?.[i] ?? ""} x={x} y={178} w={w} size={i===0 ? 9.1 : 11.3}
          style={{...edge,opacity:1-closing}}/>}
        <Glint x={x+12} y={168} start={start} f={f}/>
      </div>)}
    </>}
    {f>e.copper-29 && f<hit+25 && <Sprite name="hammer" subject="hammer" x={173} y={151} w={81} h={32}
      style={{transform:`rotate(${angle}deg)`,transformOrigin:"95% 50%",opacity:smooth(f,e.copper-29,e.copper-22)*(1-lift)}}/>}
    {struck && <>
      <Sprite name="sword" subject="forged sword" x={135} y={Math.round(mix(125,63,lift))} h={Math.round(61+58*lift)}
        style={{filter:`brightness(${1.1+ring*.65}) drop-shadow(1px 0 #e1e187)`}}/>
      {f<hit+30 && <Sprite name="sparks" x={135} y={145-18*ring} w={47+50*ring} h={48+25*ring}
        style={{opacity:1-unit(f,hit,hit+30)}}/>}
      <Glint x={139} y={83} start={hit+21} f={f} size={6} color="#9affff"/>
    </>}
  </>;
}

export function Location(props: Shot) {
  switch(props.scene.id) {
    case "castle":return <Castle {...props}/>;
    case "tavern":return <Tavern {...props}/>;
    case "dungeon":return <Dungeon {...props}/>;
    case "ghost":return <GhostTown {...props}/>;
    case "tower":return <Tower {...props}/>;
    case "forge":return <Forge {...props}/>;
    case "payoff":return <Background map="forge" scale={[1.54,1.72,1.63,1.51][props.cut]} pivot={199} f={props.f}/>;
    default:return null;
  }
}

