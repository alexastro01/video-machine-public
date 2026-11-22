"""Align the spy checklist's acting, shots, captions and sound to selected dialogue."""
from pathlib import Path
import json,math
import numpy as np
from dialogue_media import ROOT,R,assemble,pcm,wav,run,normal
SLUG='girlfriend-spy-test';B=ROOT/'episodes'/SLUG;P=ROOT/'public/episodes'/SLUG
spec,timeline,narration=assemble(SLUG)
L={l['id']:l for l in timeline['lines']}
def word(line,token,last=False):
    matches=[w for w in L[line]['words'] if normal(w['text'])==normal(token)]
    if not matches:raise RuntimeError(f'Missing spoken event {line}/{token}')
    return matches[-1 if last else 0]['start']
def end(line):return L[line]['end']
D=timeline['duration'];N=round(D*R)
visuals=json.loads((B/'visual-plan.json').read_text())
def resolve(cue):
    offset=cue.get('offset',0)
    if 'absolute' in cue:return cue['absolute']+offset
    if 'durationOffset' in cue:return D+cue['durationOffset']+offset
    if 'event' in cue:return events[cue['event']]+offset
    if 'word' in cue:return word(cue['line'],cue['word'],cue.get('last',False))+offset
    return L[cue['line']][cue.get('edge','start')]+offset
events={}
for name,cue in visuals['events'].items():events[name]=resolve(cue)
shots=[(s['id'],resolve(s['at']),s['set'],s['action'],s['anchor'],s['description']) for s in visuals['shots']]
rows=[]
for i,(sid,start,set_name,action,anchor,description) in enumerate(shots):
    at=max(0,round(start*30)/30)
    to=round(shots[i+1][1]*30)/30 if i+1<len(shots) else D
    if to<=at:raise RuntimeError(f'Invalid shot {sid}')
    rows.append({'id':sid,'start':at,'duration':to-at,'set':set_name,'action':action,'anchor':anchor,'description':description})
timeline.update({'title':visuals['title'],'width':1080,'height':1920,'revision':spec['revision'],'openingQuestion':False,'events':events,'shots':rows})
(B/'timeline.json').write_text(json.dumps(timeline,indent=2)+'\n')
episode=json.loads((B/'episode.json').read_text())
episode.update({'renderer':'hyperframes','world':'spy-test','hook':'none','pixelArt':'rpg','closingFade':False,'title':timeline['title'],'premise':visuals['premise'],'fiction':True,'duration':D,'fps':30,'aspectRatio':'9:16','shadowLeadSeconds':0,'cast':['miko','leather-nerd','girlfriend'],'audio':{'narration':f'episodes/{SLUG}/narration.wav','music':f'episodes/{SLUG}/music.wav','effects':f'episodes/{SLUG}/effects.wav','narrationOffset':0,'narrationTail':.18,'narrationTrimStart':0,'pauses':[]},'scenes':[{**{k:s[k] for k in ['id','set','action','start','duration','anchor']},'label':s['description'],'timeOfDay':'evening'} for s in rows]})
(B/'episode.json').write_text(json.dumps(episode,indent=2)+'\n')
fx=np.zeros(N);ledger=[]
def put(file,at,gain=1,limit=None,offset=0,fade=.015):
    audio=pcm(file)[round(offset*R):]
    if limit is not None:audio=audio[:round(limit*R)]
    if len(audio):
        audio=audio*(.10/max(.001,float(np.sqrt(np.mean(audio**2)))))*gain
        ramp=min(round(fade*R),len(audio)//2)
        if ramp:audio[:ramp]*=np.linspace(0,1,ramp);audio[-ramp:]*=np.linspace(1,0,ramp)
    start=round(at*R);lo=max(0,start);hi=min(N,start+len(audio))
    if hi>lo:fx[lo:hi]+=audio[lo-start:hi-start]
    ledger.append({'file':str(Path(file).relative_to(ROOT)),'start':at,'duration':max(0,(hi-lo)/R),'gain':gain,'sourceOffset':offset})
def tone(at,hz,seconds=.12,gain=.1):
    start=round(at*R);n=round(seconds*R);x=np.arange(n)/R
    a=(np.sin(2*math.pi*hz*x)+.3*np.sin(2*math.pi*2*hz*x))*np.exp(-x*30)*gain
    stop=min(N,start+n)
    if stop>start:fx[start:stop]+=a[:stop-start]
    ledger.append({'synth':'short damped check ping','start':at,'hz':hz,'duration':seconds,'gain':gain})
sfx=P/'sfx';paper=sfx/'clipboard.mp3';alarm=sfx/'alarm.mp3';exit_sound=sfx/'exit.mp3'
put(paper,0,.65,limit=.16,offset=.9)
put(paper,.35,.23,limit=.25)
for i,name in enumerate(['leagueCheck','aiCheck','gpuCheck','taipeiCheck']):
    put(paper,events[name],.50,limit=.16)
    tone(events[name]+.04,880+i*110,.15,.055)
put(alarm,events['alarm'],.76,limit=min(1.75,L['asset']['start']-events['alarm']+.45),fade=.04)
put(paper,L['asset']['start']+.14,.25,limit=.35,offset=1.3)
put(exit_sound,events['exit'],.82,limit=1.30,fade=.025)
magic=ROOT/'public/episodes/happens-for-a-reason/sfx/magic.mp3'
put(magic,events['gpuReveal'],.16,limit=.35,offset=.4)
put(magic,events['smoke'],.23,limit=.5,offset=.2)
put(paper,events['loop']-.025,.36,limit=.14,offset=1.3)
for shot in rows[1:]:
    if shot['id'] not in ['alarm','exit']:
        put(paper,shot['start'],.035 if shot['id']=='laptop' else .10,limit=.07,offset=1.45)
# Hook cut gets a short air sweep, with no brightness flash in the image.
put(exit_sound,events['point']-.03,.29,limit=.21)
wav(P/'effects-raw.wav',fx)
run(['ffmpeg','-v','error','-y','-i',str(P/'effects-raw.wav'),'-i',str(P/'narration.wav'),'-filter_complex',f'[0:a][1:a]sidechaincompress=threshold=.12:ratio=2:attack=3:release=80,apad=whole_len={N},atrim=end_sample={N}[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'effects.wav')])
music_spec=spec.get('music',{})
music=ROOT/'public'/music_spec['file'] if music_spec.get('file') else P/'source-music.mp3'
if not music.exists():raise RuntimeError('Selected spy-comedy score has not finished downloading')
fade=spec['musicFadeSeconds']
music_start=float(music_spec.get('sourceStartSeconds',0));music_level=float(music_spec.get('lufs',-27))
run(['ffmpeg','-v','error','-y','-i',str(music),'-af',f'atrim=start={music_start}:duration={D},asetpts=PTS-STARTPTS,loudnorm=I={music_level}:TP=-6:LRA=7,aresample=48000,afade=t=in:d=0.04,afade=t=out:st={D-fade}:d={fade}:curve=qsin','-ar',str(R),'-ac','2',str(P/'music-selected.wav')])
# Briefly pull the bed back under the verdict and exit, retaining continuous sound.
relax_start=L['relax']['start'];relax_end=L['relax']['words'][0]['end']+.10
# Ease the music down before the onset and back up after the full first word.
a=relax_start-.18;b=relax_end
lead_gain=f"if(lt(t,{a}),1,if(lt(t,{a+.12}),1-.75*(t-({a}))/.12,if(lt(t,{b}),.25,if(lt(t,{b+.25}),.25+.75*(t-({b}))/.25,1))))"
run(['ffmpeg','-v','error','-y','-i',str(P/'music-selected.wav'),'-i',str(P/'narration.wav'),'-filter_complex',f"[0:a]volume=0.64:enable='between(t,{L['asset']['start']},{end('asset')})',volume='{lead_gain}':eval=frame[m];[m][1:a]sidechaincompress=threshold=.1:ratio=3.2:attack=6:release=180,apad=whole_len={N},atrim=end_sample={N}[o]",'-map','[o]','-ar',str(R),'-ac','2',str(P/'music.wav')])

run(['ffmpeg','-v','error','-y','-i',str(P/'narration.wav'),'-i',str(P/'music.wav'),'-i',str(P/'effects.wav'),'-filter_complex','[0:a][1:a][2:a]amix=inputs=3:normalize=0,alimiter=limit=.84:level=false[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'delivery-mix.wav')])
(B/'audio-events.json').write_text(json.dumps(ledger,indent=2)+'\n')
(B/'audio-sources.json').write_text(json.dumps({'voices':spec['voices'],'playbackRate':spec['narrationSpeed'],'music':{'file':str(music.relative_to(ROOT)),'title':music_spec.get('title'),'artist':music_spec.get('artist'),'sourceStartSeconds':music_start,'normalizedLufs':music_level,'fadeSeconds':fade,'fadeCurve':'qsin','relaxDuck':{'start':relax_start-.18,'end':relax_end+.25,'gain':.25,'attackSeconds':.12,'releaseSeconds':.25}},'soundReview':'Measured and aligned; not auditioned.'},indent=2)+'\n')
print(json.dumps({'duration':D,'frames':round(D*30),'shots':len(rows),'words':sum(len(l['words']) for l in timeline['lines']),'events':events},indent=2))
