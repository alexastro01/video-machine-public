"""Decode the delivered Part 5 and prepare scene and motion review evidence."""
from pathlib import Path
import subprocess,json,hashlib,math,argparse
from PIL import Image,ImageDraw
import numpy as np
parser=argparse.ArgumentParser();parser.add_argument('--name',default='billionaire-body-swap-5-v2');parser.add_argument('--version',default='v2');args=parser.parse_args()
assert all('/' not in s and '\\' not in s and '..' not in s for s in [args.name,args.version])
R=Path(__file__).resolve().parents[1];B=R/'episodes/billionaire-body-swap-5';P=R/'renders/billionaire-body-swap-5';video=P/(args.name+'.mp4');O=P/('encoded-'+args.version);O.mkdir(exist_ok=True);d=json.loads((B/'edit.json').read_text());e=d['events'];fps=d['fps'];frames=round(d['duration']*fps)
def run(args):return subprocess.run(args,check=True,capture_output=True).stdout
raw=run(['ffmpeg','-v','error','-i',str(video),'-vf','scale=96:170','-pix_fmt','rgb24','-f','rawvideo','-'])
x=np.frombuffer(raw,dtype=np.uint8).reshape(-1,170*96,3);std=x.std(axis=1).mean(axis=1);near=np.flatnonzero(std<1.5).tolist()
probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]));vs=next(s for s in probe['streams'] if s['codec_type']=='video');au=next(s for s in probe['streams'] if s['codec_type']=='audio')
def strip(name,samples,columns=4,width=216):
 folder=O/name;folder.mkdir(exist_ok=True);samples=[(label,min(frames-1,max(0,round(t*fps)))) for label,t in samples];seen=set();samples=[(name,f) for name,f in samples if not(f in seen or seen.add(f))];fs=sorted(f for _,f in samples);expression='+'.join(f'eq(n,{f})' for f in fs)
 run(['ffmpeg','-v','error','-y','-i',str(video),'-vf',f"select='{expression}',scale={width}:{round(width*16/9)}",'-fps_mode','vfr',str(folder/'frame-%03d.png')])
 files=list(sorted(folder.glob('frame-*.png')));assert len(files)==len(fs),(name,len(files),len(fs));byframe=dict(zip(fs,files));h=round(width*16/9);canvas=Image.new('RGB',(columns*width,math.ceil(len(samples)/columns)*(h+25)),'#edf0f2');draw=ImageDraw.Draw(canvas)
 for i,(label,f) in enumerate(samples):
  im=Image.open(byframe[f]);x=i%columns*width;y=i//columns*(h+25);canvas.paste(im,(x,y));draw.text((x+5,y+h+4),f'{label} {f/fps:.2f}s',fill='#182b35')
 canvas.save(O/(name+'.jpg'),quality=95);(folder/'frames.json').write_text(json.dumps([{'label':label,'frame':f,'time':f/fps,'file':str(byframe[f].relative_to(R))} for label,f in samples],indent=2)+'\n')
strip('scene-review',[(s['id'],s['start']+min(.5,s['duration']/2)) for s in d['shots']],4)
strip('intro-motion',[(str(i),i*.25) for i in range(30)],5,216)
strip('typing-motion',[(str(i),e['firstType']-.1+i*.1) for i in range(20)],5,216)
strip('lid-motion',[(str(i),e['lidOpen']-.08+i*.07) for i in range(14)],4,216)
strip('wheel-motion',[(str(i),e['wheel']-.05+i*.1) for i in range(18)],5,216)
strip('vault-motion',[(str(i),e['vaultOpen']-.08+i*.07) for i in range(14)],4,216)
strip('ending-motion',[(str(i),e['guard']-.05+i*.1) for i in range(34)],5,216)
proof={'video':str(video.relative_to(R)),'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'decodedFrames':len(x),'expectedFrames':frames,'nearUniformFrameThreshold':1.5,'minimumMeanChannelSpatialStd':float(std.min()),'nearUniformFrames':near,'dimensions':[vs['width'],vs['height']],'fps':vs['avg_frame_rate'],'audioCodec':au['codec_name'],'sampleRate':au['sample_rate'],'encodedFrameEvidence':str(O.relative_to(R)),'scope':'Every frame decoded for missing/uniform picture; selected encoded scene and motion strips prepared for visual inspection. This metric is not an aesthetic quality score.'}
assert len(x)==frames;assert not near;(B/('export-review-'+args.version+'.json')).write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
