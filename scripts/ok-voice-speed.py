"""Build pitch-preserving 1.2x mixes and scaled subtitle manifests for both voices."""
from pathlib import Path
import json,subprocess,hashlib
ROOT=Path(__file__).resolve().parents[1];RATE=1.2
for voice,slug in [('current','ok-message-motion'),('teen','ok-message-motion-teen')]:
    b=ROOT/'episodes'/slug;p=ROOT/'public/episodes'/slug
    if not (p/'narration.wav').exists():raise RuntimeError('Prepare narration first: '+slug)
    edit=json.loads((b/'edit.json').read_text());frames=round(edit['duration']*edit['fps']/RATE);duration=frames/edit['fps']
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(p/'narration.wav'),'-i',str(p/'music.wav'),'-i',str(p/'effects.wav'),'-filter_complex',f'[0:a][1:a][2:a]amix=inputs=3:normalize=0,atempo={RATE},aresample=48000,apad=whole_dur={duration},atrim=duration={duration}[o]','-map','[o]','-ar','48000','-ac','2',str(p/'mix-1p2x.wav')],check=True)
    caps=json.loads((b/'captions.json').read_text());scaled=[{**c,'startMs':round(c['startMs']/RATE),'endMs':round(c['endMs']/RATE),'timestampMs':round(c['timestampMs']/RATE) if c['timestampMs'] is not None else None} for c in caps]
    (b/'captions-1p2x.json').write_text(json.dumps(scaled,indent=2)+'\n')
    manifest={'voice':voice,'playbackRate':RATE,'pitchPreserved':True,'sourceEpisode':slug,'sourceDuration':edit['duration'],'duration':duration,'fps':edit['fps'],'frames':frames,'mixFile':f'episodes/{slug}/mix-1p2x.wav','captionFile':f'episodes/{slug}/captions-1p2x.json','composition':'OKCurrent1p2x' if voice=='current' else 'OKTeen1p2x','sourceNarrationSha256':hashlib.sha256((p/'narration.wav').read_bytes()).hexdigest()}
    (b/'speed-1p2x.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest))
