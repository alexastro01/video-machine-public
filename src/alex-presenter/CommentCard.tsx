import { Img, staticFile } from "remotion";
import type { PresenterEdit } from "./schema";
import "./comment.css";

type Comment = NonNullable<PresenterEdit["commentEnding"]>;
const limit = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const t = limit(value); return t * t * (3 - 2 * t); };
const blend = (a: number, b: number, t: number) => a + (b - a) * t;

function Arrow({ down = false }: { down?: boolean }) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d={down ? "M16 5v17m-7-7 7 7 7-7M5 23v4h22v-4" : "M16 25V7m-8 8 8-8 8 8"}
      stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function CommentCard({ cue, frame, root }: { cue: Comment; frame: number; root: string }) {
  const age = frame - cue.start;
  const arrive = ease(age / 10);
  const posted = ease((frame - cue.postFrame) / 12);
  const submitDip = Math.max(0, 1 - Math.abs(frame - cue.postFrame) / 5);
  const reveal = ease((frame - cue.fileFrame) / 13);
  const reply = ease((frame - cue.fileFrame + 5) / 12);
  const letters = cue.typingFrames.filter((at) => at <= frame).length;
  const word = cue.keyword.slice(0, letters);
  const inputShade = (a: number, b: number) => Math.round(blend(a,b,posted));
  return <div className="ap-card ap-comment" style={{ transform: 'translateX(' + (1080*(1-arrive)) + 'px)' }}>
    <div className="ap-comment-header">
      <svg viewBox="0 0 44 42" fill="none" aria-hidden="true">
        <path d="M9 5h24a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H20l-9 7v-7H9a6 6 0 0 1-6-6V11a6 6 0 0 1 6-6Z" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round"/>
      </svg>
      <span>Comments</span>
    </div>
    <div className="ap-comment-you" style={{opacity:posted}}>You</div>
    <div className="ap-comment-input" style={{
      left:blend(44,572,posted), top:blend(216,153,posted), width:blend(820,288,posted), height:blend(124,100,posted),
      borderRadius:blend(34,45,posted), borderColor:'rgba(151,128,199,' + (.66*(1-posted)) + ')',
      backgroundColor:'rgb('+inputShade(252,233)+','+inputShade(250,224)+','+inputShade(255,249)+')',
      boxShadow:'0 0 0 '+ (5*(1-posted)) +'px rgba(140,107,200,.08)',
    }}>
      <div className="ap-comment-type" style={{fontSize:blend(65,59,posted),color:letters ? "#292238" : "#797180"}}>
        {word || <span className="ap-comment-placeholder">Add a comment…</span>}
        {letters>0 && <span className="ap-comment-caret" style={{opacity:1-posted}}/>}
      </div>
      <div className="ap-comment-send" style={{
        opacity:1-ease((frame-cue.postFrame+1)/6), transform:'scale('+(1-.18*submitDip)+')',
        backgroundColor:letters ? '#7760a6' : '#dcd5e9',
      }}><Arrow/></div>
    </div>
    <div className="ap-comment-reply" style={{opacity:reply,transform:'translateY('+((1-reply)*13)+'px)'}}>
      <div className="ap-comment-avatar"><Img src={staticFile(root+"media/alex/pose-08.webp")} /></div>
      <span>{cue.speaker}</span>
    </div>
    <div className="ap-comment-file" style={{opacity:reveal,transform:'translateY('+((1-reveal)*32)+'px) scale('+(.975+reveal*.025)+')'}}>
      <div className="ap-comment-covers">
        <Img className="ap-comment-back" src={staticFile(root+cue.backThumbnail)}/>
        <Img className="ap-comment-front" src={staticFile(root+cue.thumbnail)}/>
      </div>
      <div className="ap-comment-filename"><strong>{cue.fileTitle}</strong><span>{cue.fileDetail}</span></div>
      <div className="ap-comment-download"><Arrow down/></div>
    </div>
  </div>;
}
