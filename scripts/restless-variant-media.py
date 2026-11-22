"""Retarget the saved world and action Foley to a narration take's own anchors."""
from pathlib import Path
import argparse,json,math,os,re,subprocess
import numpy as np

parser=argparse.ArgumentParser()
parser.add_argument('--variant',required=True)
parser.add_argument('--stage',choices=['audio','world','all'],default='all')
args=parser.parse_args()
if not re.fullmatch('[a-z0-9-]+',args.variant):raise ValueError('Invalid variant slug')
BASE=Path('episodes/restless-friend');B=BASE/'variants'/args.variant
P=Path('public/episodes/restless-friend/variants')/args.variant;P.mkdir(parents=True,exist_ok=True)
original=json.loads((BASE/'timeline.json').read_text());T=json.loads((B/'timeline.json').read_text());D=T['duration'];FPS=T['fps'];R=48000;N=round(D*R)
visuals=json.loads((B/'visuals.json').read_text());source_frames=visuals.get('sourceWorld','blender/restless-friend/frames-v3')
source_shots={s['id']:s['start'] for s in original['shots']};target_shots={s['id']:s['start'] for s in T['shots']}
nodes=[{'name':'start','source':0.,'target':0.}]
for name in ['question','experiment','fat-chart','reveal','movement','maximum','payoff','loop']:
    nodes.append({'name':'shot:'+name,'source':source_shots[name],'target':target_shots[name]})
for name in ['calories','pace','stand','qualifier','notOnlyTap','feet']:
    nodes.append({'name':'event:'+name,'source':original['events'][name],'target':T['events'][name]})
nodes.append({'name':'end','source':original['duration'],'target':D});nodes.sort(key=lambda n:n['source'])
assert all(a['source']<b['source'] and a['target']<b['target'] for a,b in zip(nodes,nodes[1:]))
(B/'world-time-map.json').write_text(json.dumps({'method':'Monotonic linear mapping between camera/action anchors; no optical flow or invented frames. New narration is a single continuous 1.1x take.','sourceFrames':source_frames,'nodes':nodes},indent=2)+'\n')

def run(cmd):
    x=subprocess.run(cmd,capture_output=True,text=True)
    if x.returncode:raise RuntimeError(x.stderr[-6000:])
    return x

if args.stage in ['audio','all']:
    # Preserve transient/action correspondence to the same map as the picture.
    filters=[];names=[]
    for i,(a,b) in enumerate(zip(nodes,nodes[1:])):
        source_duration=b['source']-a['source'];samples=round(b['target']*R)-round(a['target']*R)
        ratio=source_duration/(samples/R)
        tempos=[]
        while ratio<.5:tempos.append('atempo=0.5');ratio/=.5
        while ratio>2:tempos.append('atempo=2');ratio/=2
        tempos.append(f'atempo={ratio:.12f}')
        filters.append(f'[0:a]atrim=start={a["source"]}:end={b["source"]},asetpts=PTS-STARTPTS,'+','.join(tempos)+f',aresample={R},apad=whole_len={samples},atrim=end_sample={samples}[a{i}]');names.append(f'[a{i}]')
    filters.append(''.join(names)+f'concat=n={len(names)}:v=0:a=1[out]')
    run(['ffmpeg','-v','error','-y','-i','public/episodes/restless-friend/effects-raw.wav','-filter_complex',';'.join(filters),'-map','[out]','-ar',str(R),str(P/'effects-mapped.wav')])
    run(['ffmpeg','-v','error','-y','-i',str(P/'effects-mapped.wav'),'-i',str(P/'narration.wav'),'-filter_complex',f'[0:a][1:a]sidechaincompress=threshold=.10:ratio=1.8:attack=3:release=65,apad=whole_len={N},atrim=end_sample={N}[out]','-map','[out]','-ac','2','-ar',str(R),str(P/'effects.wav')])
    run(['ffmpeg','-v','error','-y','-i','public/episodes/brain-upload/source-music.mp3','-i',str(P/'narration.wav'),'-filter_complex',f'[0:a]atrim=duration={D},loudnorm=I=-28:TP=-6:LRA=7,afade=t=in:d=0.06,afade=t=out:st={D-.16}:d=0.16[m];[m][1:a]sidechaincompress=threshold=.11:ratio=2:attack=8:release=150,aresample={R},apad=whole_len={N},atrim=end_sample={N}[out]','-map','[out]','-ac','2','-ar',str(R),str(P/'music.wav')])
    run(['ffmpeg','-v','error','-y','-i',str(P/'narration.wav'),'-i',str(P/'music.wav'),'-i',str(P/'effects.wav'),'-filter_complex',f'[0:a][1:a][2:a]amix=inputs=3:normalize=0,aresample={R},apad=whole_len={N},atrim=end_sample={N}[out]','-map','[out]','-c:a','pcm_s24le',str(P/'mix-raw.wav')])
    analysis=run(['ffmpeg','-hide_banner','-nostats','-i',str(P/'mix-raw.wav'),'-af','loudnorm=I=-14:TP=-2:LRA=9:print_format=json','-f','null','-'])
    stats=json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}',analysis.stderr,re.S)[-1])
    normal=f'loudnorm=I=-14:TP=-2:LRA=9:measured_I={stats["input_i"]}:measured_TP={stats["input_tp"]}:measured_LRA={stats["input_lra"]}:measured_thresh={stats["input_thresh"]}:offset={stats["target_offset"]}:linear=true,aresample={R},apad=whole_len={N},atrim=end_sample={N}'
    run(['ffmpeg','-v','error','-y','-i',str(P/'mix-raw.wav'),'-af',normal,'-ac','2','-ar',str(R),'-c:a','pcm_s24le',str(P/'delivery-mix.wav')])
    source_events=json.loads((BASE/'audio-events.json').read_text());sx=[n['source'] for n in nodes];tx=[n['target'] for n in nodes]
    for e in source_events:
        e['sourceAt']=e['at'];e['at']=float(np.interp(e['at'],sx,tx))
    (B/'audio-events.json').write_text(json.dumps(source_events,indent=2)+'\n')
    (B/'audio-sources.json').write_text(json.dumps({'voice':json.loads((B/'variant.json').read_text()),'music':'Saved ElevenLabs channel score; -28 LUFS before speech ducking','effects':'Original synthesized Foley including pen strokes; mapped with the picture from exact camera/action anchors','firstPassLoudnorm':stats,'master':str(P/'delivery-mix.wav'),'samples':N,'sampleRate':R},indent=2)+'\n')

if args.stage in ['world','all']:
    frames=Path(source_frames);assert all((frames/f'{i:05}.png').exists() for i in range(930)), 'Native world still rendering'
    outframes=Path('blender/restless-friend')/('variant-frames-'+args.variant);outframes.mkdir(exist_ok=True)
    target_times=np.arange(round(D*FPS))/FPS
    sample=np.interp(target_times,[n['target'] for n in nodes],[n['source'] for n in nodes])
    frame_numbers=np.minimum(929,np.maximum(0,np.floor(sample*30+1e-7).astype(int)))
    for i,source in enumerate(frame_numbers):
        dest=outframes/f'{i:05}.png'
        if not dest.exists():os.link(frames/f'{source:05}.png',dest)
    np.savetxt(B/'world-frame-map.csv',np.column_stack((np.arange(len(frame_numbers)),target_times,frame_numbers)),fmt=['%d','%.8f','%d'],delimiter=',',header='output_frame,output_time,source_frame',comments='')
    project=B/'hyperframes/assets';project.mkdir(parents=True,exist_ok=True);file=json.loads((B/'visuals.json').read_text())['worldFile']
    run(['ffmpeg','-v','error','-y','-framerate',str(FPS),'-start_number','0','-i',str(outframes/'%05d.png'),'-frames:v',str(len(frame_numbers)),'-c:v','libx264','-crf','15','-preset','fast','-threads','4','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-movflags','+faststart',str(project/file)])
print(json.dumps({'variant':args.variant,'stage':args.stage,'duration':D,'frames':round(D*FPS),'mappingNodes':len(nodes)}))
