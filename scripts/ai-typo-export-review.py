"""Decode the delivered short and prepare encoded frame/motion evidence."""
from pathlib import Path
import argparse,hashlib,json,math,subprocess
import numpy as np
from PIL import Image,ImageDraw
args=argparse.ArgumentParser();args.add_argument('--name',default='ai-typo-v1');args.add_argument('--version',default='v1');args=args.parse_args()
assert all('/' not in s and '\\' not in s and '..' not in s for s in [args.name,args.version])
R=Path(__file__).resolve().parents[1];B=R/'episodes/ai-typo';P=R/'renders/ai-typo';V=P/(args.name+'.mp4');O=P/('encoded-'+args.version);O.mkdir(exist_ok=True)
d=json.loads((B/'edit.json').read_text());e=d['events'];fps=d['fps'];frames=round(d['duration']*fps)
def run(args):return subprocess.run(args,capture_output=True,check=True).stdout
raw=run(['ffmpeg','-v','error','-i',str(V),'-vf','scale=96:170','-pix_fmt','rgb24','-f','rawvideo','-'])
a=np.frombuffer(raw,np.uint8).reshape(-1,96*170,3);std=a.std(axis=1).mean(axis=1);blank=np.flatnonzero(std<1.5).tolist()
def strip(name,times,cols=5,w=216):
 p=O/name;p.mkdir(exist_ok=True);samples=[(label,min(frames-1,max(0,round(t*fps)))) for label,t in times];seen=set();samples=[(label,f) for label,f in samples if not(f in seen or seen.add(f))];fs=sorted(f for _,f in samples);expr='+'.join(f'eq(n,{f})' for f in fs)
 run(['ffmpeg','-v','error','-y','-i',str(V),'-vf',f"select='{expr}',scale={w}:{round(w*16/9)}",'-fps_mode','vfr',str(p/'frame-%03d.png')])
 files=sorted(p.glob('frame-*.png'));assert len(files)==len(fs);lookup=dict(zip(fs,files));h=round(w*16/9);c=Image.new('RGB',(w*cols,math.ceil(len(samples)/cols)*(h+25)),'#edf0f2');draw=ImageDraw.Draw(c)
 for i,(label,f) in enumerate(samples):
  x=i%cols*w;y=i//cols*(h+25);c.paste(Image.open(lookup[f]),(x,y));draw.text((x+5,y+h+4),f'{label} {f/fps:.2f}s',fill='#20242b')
 c.save(O/(name+'.jpg'),quality=95);(p/'frames.json').write_text(json.dumps([{'label':label,'frame':f,'time':f/fps,'file':str(lookup[f].relative_to(R))} for label,f in samples],indent=2)+'\n')
strip('scenes',[(s['id'],s['start']+min(.5,s['duration']/2)) for s in d['shots']],4,270)
strip('intro',[(str(i),i*.25) for i in range(29)])
strip('file-cards',[(str(i),e['counter12']-.1+i*.09) for i in range(13)])
strip('portrait',[(str(i),e['architecture']-.1+i*.1) for i in range(13)])
for line_id in ['architecture','complete']:
 line=next(x for x in d['lines'] if x['id']==line_id)
 strip(f'portrait-{line_id}-in',[(str(i),line['start']-.1+i*.1) for i in range(13)])
 strip(f'portrait-{line_id}-out',[(str(i),line['end']-.2+i*.1) for i in range(10)])
strip('letters',[(str(i),e['letterMove']-.1+i*.07) for i in range(13)])
strip('ending',[(str(i),e['payoff']-.2+i*.12) for i in range(math.ceil((d['duration']-e['payoff']+.2)/.12))])
probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(V)]));v=next(s for s in probe['streams'] if s['codec_type']=='video');au=next(s for s in probe['streams'] if s['codec_type']=='audio')
proof={'video':str(V.relative_to(R)),'sha256':hashlib.sha256(V.read_bytes()).hexdigest(),'decodedFrames':len(a),'expectedFrames':frames,'nearUniformFrameThreshold':1.5,'minimumMeanChannelSpatialStd':float(std.min()),'nearUniformFrames':blank,'dimensions':[v['width'],v['height']],'fps':v['avg_frame_rate'],'audioCodec':au['codec_name'],'sampleRate':au['sample_rate'],'frameEvidence':str(O.relative_to(R)),'scope':'All frames decoded for missing/uniform picture. Selected encoded motion strips require visual inspection; the pixel statistic is not an aesthetic score.'}
minimum_frame=int(std.argmin());minimum_image=O/'minimum-variation.png'
run(['ffmpeg','-v','error','-y','-i',str(V),'-vf',f"select='eq(n,{minimum_frame})'",'-frames:v','1',str(minimum_image)])
proof['minimumVariationFrame']={'frame':minimum_frame,'time':minimum_frame/fps,'evidence':str(minimum_image.relative_to(R))}
proof['lowSpatialDetailReviewThreshold']=25
proof['lowSpatialDetailFramesRequiringInspection']=np.flatnonzero(std<25).tolist()
baseline=P/'preflight-shared-memory-capture/ai-typo-v1.mp4'
if args.version=='v1' and baseline.exists():
 reference=np.frombuffer(run(['ffmpeg','-v','error','-i',str(baseline),'-vf','scale=96:170','-pix_fmt','rgb24','-f','rawvideo','-']),np.uint8).reshape(-1,96*170,3)
 assert reference.shape==a.shape
 delta=np.abs(a.astype(np.float32)-reference.astype(np.float32)).mean(axis=(1,2));changed=np.flatnonzero(delta>2).tolist()
 proof['renderComparison']={'reference':str(baseline.relative_to(R)),'meanAbsoluteChannelDifferenceThreshold':2,'changedFrames':changed,'knownIncompleteReferenceFrame':88,'unexpectedChangedFrames':[f for f in changed if f!=88]}
assert len(a)==frames;assert not blank;(B/('export-review-'+args.version+'.json')).write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
