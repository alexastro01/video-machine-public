"""Chapter-aware local mix with sparse emotional holds and story-driven Foley."""
from pathlib import Path
import json,math
import numpy as np
from dialogue_media import ROOT,R,pcm,wav,run
B=ROOT/'episodes/immortal';P=ROOT/'public/episodes/immortal';T=json.loads((B/'timeline.json').read_text());D=T['duration'];N=round(D*R);L={x['id']:x for x in T['lines']};S={x['id']:x for x in T['shots']};rng=np.random.default_rng(476);fx=np.zeros(N);score=np.zeros(N);events=[]
def place(dest,a,at,gain=1,fade=.015):
 a=a.copy()*gain;f=min(round(fade*R),len(a)//2)
 if f:a[:f]*=np.linspace(0,1,f);a[-f:]*=np.linspace(1,0,f)
 lo=round(at*R)
 if lo<0:a=a[-lo:];lo=0
 hi=min(N,lo+len(a))
 if hi>lo:dest[lo:hi]+=a[:hi-lo]
def noise(seconds,gain=.03,smooth=24):
 x=rng.normal(0,1,round(seconds*R));return np.convolve(x,np.ones(smooth)/smooth,mode='same')*gain
def tone(at,hz=.0,seconds=.12,gain=.045):
 x=np.arange(round(seconds*R))/R;a=(np.sin(2*np.pi*hz*x)+.18*np.sin(2*np.pi*hz*2.62*x))*np.minimum(1,x/.006)*np.exp(-x*17)*gain;place(fx,a,at);events.append({'synth':'damped contact','at':round(at,3),'hz':hz,'gain':gain})
cache={}
def sample(file,at,seconds,gain=.2,offset=0):
 f=Path(file)
 if not f.is_absolute():f=ROOT/f
 if str(f)not in cache:cache[str(f)]=pcm(f)
 a=cache[str(f)][round(offset*R):round((offset+seconds)*R)].copy()
 if not len(a):return
 a*=.1/max(.001,float(np.sqrt(np.mean(a*a))));place(fx,a,at,gain);events.append({'file':str(f.relative_to(ROOT)),'at':round(at,3),'duration':seconds,'gain':gain,'sourceOffset':offset})
def at(id):return S[id]['start']
paper='public/episodes/girlfriend-spy-test/sfx/clipboard.mp3';book='public/episodes/inventions-since-2000/sfx/book.mp3';exit='public/episodes/girlfriend-spy-test/sfx/exit.mp3';magic='public/episodes/happens-for-a-reason/sfx/magic.mp3'
# Continuous quiet space is distinct by location, never an empty audio hole.
place(fx,noise(D,.003,48),0)
for lo,hi,kind in [(0,at('farm-wide'),'airport'),(at('farm-wide'),at('chase'),'wind'),(at('marcus-gone'),at('no-more-friends'),'room'),(at('plague-water'),at('parish-1538'),'wind'),(at('amsterdam-1650'),at('portrait-for-me'),'canal'),(at('airport-return'),D,'airport')]:
 a=noise(hi-lo,.009 if kind=='wind'else .0045,90);place(fx,a,lo,fade=.3);events.append({'ambience':kind,'start':lo,'end':hi})
for t in [0,.28]:tone(t,660,.11,.065)
sample(paper,at('portrait'),.22,.18,.7);sample(exit,at('farm-wide')-.12,.35,.25,.05)
for sid in ['farm-wide','farm-work','cart']:
 t=at(sid)+.45;place(fx,noise(.15,.14)*np.exp(-np.arange(round(.15*R))/R*18),t);tone(t,110,.15,.045)
for t in np.arange(at('chase'),at('door')+.55,.24):tone(float(t),85,.09,.035);place(fx,noise(.045,.1),float(t))
sample(P/'source-sfx-wolf.mp3',at('chase'),2,.38);sample(P/'source-sfx-door.mp3',at('door')+.45,1.1,.6)
sample(P/'source-sfx-wolf.mp3',at('wolf-door')+.1,1.6,.22)
sample(paper,at('contract')+.3,.7,.28,.1);sample(paper,at('signature')+.24,.7,.3,.7);sample(magic,T['events']['heal'],.65,.14,.25);tone(at('handoff')+.8,280,.09,.03)
# Every meaningful prop and movement has a quiet, specific contact cue.
for sid in ['help-basket','old-marcus','no-more-friends','same-chair','kid-makes-room','norbert-sits']:
 sample(paper,at(sid)+.2,.25,.11,.45);tone(at(sid)+.28,75,.12,.015)
# A muted ceramic tap lands only when the second cup reaches the table.
tone(at('second-cup')+1.2,1450,.18,.024);tone(at('second-cup')+1.205,2210,.15,.008)
for sid in ['new-village','slips-away','cannot-go-back','new-name','before-passports','witch-in-queue']:
 for t in np.arange(at(sid)+.1,min(at(sid)+2.1,at(sid)+S[sid]['duration']),.43):
  place(fx,noise(.04,.045),float(t));tone(float(t),100,.08,.012)
for sid in ['burial-list','register-closes','parish-1538','register-entries','norbertus','norbert-the-second','norbertson','passport-standard','same-face-photo','auto-renews']:
 sample(book,at(sid)+.08,.55,.18,.1)
for sid in ['name-date-parents','surname','date-of-birth']:
 sample(paper,at(sid)+.03,.2,.13,.8)
for sid in ['next-mistake','finished-portrait','museum-portrait','plate-result']:
 sample(paper,at(sid),.24,.1,.35)
for sid in ['anna-wins','he-can-come','next-week']:
 sample(paper,at(sid)+.15,.12,.06,.7)
sample(paper,at('packs-before-dawn')+.6,.3,.16,.1)
sample(paper,at('camera-detail')+.3,.35,.13,.5)
# A photographic shutter would be anachronistic for the1839 exposure. Use quiet wood and cloth instead.
sample(paper,at('hold-still')+.1,.22,.1,.5);sample(paper,at('feather-sneeze')+1.6,.18,.09,.3)
for i,sid in enumerate(['cameras-coming','everybodys-camera','tagged-photo','family-tree']):
 tone(at(sid)+.08,480+i*65,.09,.016);sample(paper,at(sid)+.06,.12,.08,.8)
for sid in ['passport-return','explain-this']:tone(at(sid)+.06,660,.1,.04)
sample(paper,at('cap-reveal')+.3,.3,.16,.1)
for t in [at('rock-paper-scissors')+.35,at('rock-paper-scissors')+.75,at('rock-paper-scissors')+1.15]:sample(paper,t,.1,.08,.9)
tone(at('game-continues')+.82,930,.09,.014)
# A tiny cloth/paper swish links brisk cuts, omitted from held emotional shots.
quiet={'bedside-marcus','bedside-norbert','marcus-gone','second-cup','nobody-follows','witch-waits','ten-years','remembers-marcus','stopped-living','making-friends','got-time','game-continues'}
for s in T['shots'][1:]:
 if s['id']not in quiet:sample(paper,s['start'],.055,.026,.95)
# Four local cues share the requested motif. The finale is fitted as a complete cue, preserving its resolved tail.
segments=[('opening','source-music-take-1.mp3',0,at('forever-cuts')+1,False),('grief','source-music-grief.mp3',at('forever-cuts')-1,at('parish-1538')+1,False),('centuries','source-music-centuries.mp3',at('parish-1538')-1,at('everybodys-camera')+1,False),('choice','source-music-choice.mp3',at('everybodys-camera')-1,D,True)]
mp=[]
for name,file,lo,hi,fit in segments:
 a=pcm(P/file);length=hi-lo;speed=(len(a)/R)/length if fit else 1
 if fit:
  temp=P/'score-choice-fit.wav';run(['ffmpeg','-v','error','-y','-i',str(P/file),'-af',f'atempo={speed}','-ar',str(R),'-ac','1',str(temp)]);a=pcm(temp)
 if len(a)<round(length*R):
  overlap=round(1.5*R)
  while len(a)<round(length*R):
   original=pcm(P/file);blend=a[-overlap:]*np.linspace(1,0,overlap)+original[:overlap]*np.linspace(0,1,overlap);a=np.concatenate([a[:-overlap],blend,original[overlap:]])
 a=a[:round(length*R)];a*=.047/max(.001,float(np.sqrt(np.mean(a*a))));place(score,a,lo,fade=1.8)
 mp.append({'cue':name,'source':f'public/episodes/immortal/{file}','start':lo,'end':hi,'musicPlaybackRate':speed})
# Shape the holds without cutting out ambience or emotional delivery.
env=np.ones(N)
for lo,hi,gain in [(at('bedside-marcus')-.8,at('no-more-friends'),.48),(at('witch-waits')-.2,at('not-yet-1348'),.25),(at('ten-years'),at('packs-before-dawn'),.62),(at('stopped-living')-.3,at('and-now'),.4)]:
 i=max(0,round(lo*R));j=min(N,round(hi*R));fade=min(round(.45*R),(j-i)//2);env[i:j]=gain
 if fade:env[i:i+fade]=np.linspace(1,gain,fade);env[j-fade:j]=np.linspace(gain,1,fade)
score*=env;score[-round(3*R):]*=np.sin(np.linspace(np.pi/2,0,round(3*R)))**2
wav(P/'music-selected.wav',score);wav(P/'effects-raw.wav',fx)
for source,name,ratio,threshold in [('music-selected.wav','music.wav',3.5,.08),('effects-raw.wav','effects.wav',2,.12)]:
 run(['ffmpeg','-v','error','-y','-i',str(P/source),'-i',str(P/'narration.wav'),'-filter_complex',f'[0:a][1:a]sidechaincompress=threshold={threshold}:ratio={ratio}:attack=5:release=180,apad=whole_len={N},atrim=end_sample={N}[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/name)])
run(['ffmpeg','-v','error','-y','-i',str(P/'narration.wav'),'-i',str(P/'music.wav'),'-i',str(P/'effects.wav'),'-filter_complex','[0:a][1:a][2:a]amix=inputs=3:normalize=0,alimiter=limit=.86:level=false[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'delivery-mix.wav')])
(B/'audio-events.json').write_text(json.dumps(events,indent=2)+'\n');(B/'full/music-edit.json').write_text(json.dumps(mp,indent=2)+'\n');print({'duration':D,'events':len(events),'musicCues':len(mp)})
