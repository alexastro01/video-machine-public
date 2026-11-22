"""Inspect every encoded frame and compare the delivered film with its timeline."""
from pathlib import Path
import json,subprocess,numpy as np,hashlib,sys,re
root=Path(__file__).resolve().parents[1];file=Path(sys.argv[1]).resolve();b=root/'episodes/immortal';t=json.loads((b/'timeline.json').read_text())
p=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(file)]));v=next(s for s in p['streams']if s['codec_type']=='video');a=next(s for s in p['streams']if s['codec_type']=='audio')
cmd=['ffmpeg','-v','error','-i',str(file),'-vf','scale=64:36:flags=area','-pix_fmt','rgb24','-f','rawvideo','pipe:1'];proc=subprocess.Popen(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE);count=0;minimum=999;uniform=[]
while True:
 raw=proc.stdout.read(64*36*3)
 if not raw:break
 if len(raw)!=64*36*3:raise RuntimeError('Partial decoded frame')
 image=np.frombuffer(raw,np.uint8).reshape(36,64,3);std=float(image.std(axis=(0,1)).mean());minimum=min(minimum,std)
 if std<4:uniform.append({'frame':count,'time':count/t['fps'],'spatialDeviation':std})
 count+=1
err=proc.stderr.read().decode();code=proc.wait()
if code or err:raise RuntimeError(err)
if count!=t['frames']:raise RuntimeError(f"Frame count mismatch {count}/{t['frames']}")
if uniform:raise RuntimeError(f'Uniform or blank frames: {uniform[:10]}')
if (v['width'],v['height'])!=(1920,1080):raise RuntimeError('Incorrect delivery dimensions')
if abs(float(p['format']['duration'])-t['duration'])>.05:raise RuntimeError('Duration mismatch')
log=subprocess.run(['ffmpeg','-hide_banner','-i',str(file),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True).stderr
(root/f'renders/immortal/{file.stem}-audio.log').write_text(log)
summary=log.rsplit('Summary:',1)[-1];lufs=re.search(r'I:\s*(-?[\d.]+) LUFS',summary);peak=re.search(r'Peak:\s*(-?[\d.]+) dBFS',summary)
result={'file':str(file),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'duration':float(p['format']['duration']),'fps':t['fps'],'frames':count,'width':v['width'],'height':v['height'],'videoCodec':v['codec_name'],'audioCodec':a['codec_name'],'audioSampleRate':a['sample_rate'],'pixelFormat':v['pix_fmt'],'colorSpace':v.get('color_space'),'colorRange':v.get('color_range'),'decodedWithoutErrors':True,'uniformFrames':uniform,'minimumSpatialDeviation':minimum,'integratedLufs':float(lufs.group(1))if lufs else None,'truePeakDbfs':float(peak.group(1))if peak else None,'soundVerification':'Measured and checked against exact-take transcripts; not listened to.','userApproved':False}
(root/f'renders/immortal/verification-{file.stem}.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
