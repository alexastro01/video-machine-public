"""Reproducible local master mix and lossless-video audio replacement."""
from pathlib import Path
import json,subprocess,re,hashlib,sys,wave
BASE=Path('episodes/inventions-since-2000');PUB=Path('public/episodes/inventions-since-2000');T=json.loads((BASE/'timeline.json').read_text());D=T['duration'];paths=[PUB/(n+'.wav') for n in ['narration','music','effects']];signature={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths};meta=BASE/'delivery-loudness.json';mix=PUB/'delivery-mix.wav';cached=json.loads(meta.read_text()) if meta.exists() else {}
inputs=[v for p in paths for v in ['-i',str(p)]];chain='[0:a]pan=stereo|c0=c0|c1=c0[v];[v][1:a][2:a]amix=inputs=3:normalize=0:duration=longest,'
if not mix.exists() or cached.get('stemSha256')!=signature:
 args=['ffmpeg','-hide_banner','-nostats',*inputs,'-filter_complex',chain+'loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json[out]','-map','[out]','-f','null','-'];r=subprocess.run(args,capture_output=True,text=True,check=True);m=json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}',r.stderr,re.S)[-1]);norm=f'loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={m["input_i"]}:measured_TP={m["input_tp"]}:measured_LRA={m["input_lra"]}:measured_thresh={m["input_thresh"]}:offset={m["target_offset"]}:linear=true,aresample=48000,apad=whole_len={round(D*48000)},atrim=end_sample={round(D*48000)}'
 subprocess.run(['ffmpeg','-v','error','-y',*inputs,'-filter_complex',chain+norm+'[out]','-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',str(mix)],check=True)
 cached={'stemSha256':signature,'analysisBeforeMastering':m,'target':{'integratedLufs':-14,'truePeakDbfs':-1.5,'lra':9},'duration':D,'master':str(mix),'method':'Two-pass loudnorm on the local three-stem mix; no speech retiming.'};meta.write_text(json.dumps(cached,indent=2)+'\n')
if len(sys.argv)>1:
 video=Path(sys.argv[1]);out=video.with_name(video.stem+'.audio-master.mp4')
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(video),'-i',str(mix),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-t',str(D),'-movflags','+faststart',str(out)],check=True);out.replace(video);print('Mastered audio:',video)
else:print('Prepared local delivery mix:',mix)
