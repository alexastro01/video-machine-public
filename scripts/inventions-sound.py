"""Local score edit, story foley and deterministic low-level cut accents."""
import json,subprocess,wave,math
from pathlib import Path
import numpy as np
from scipy.signal import lfilter
BASE=Path('episodes/inventions-since-2000');PUB=Path('public/episodes/inventions-since-2000');T=json.loads((BASE/'timeline.json').read_text());SR=48000;D=T['duration'];N=round(D*SR)
def read(p):
 b=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','2','-ar',str(SR),'-']);return np.frombuffer(b,dtype='<f4').reshape(-1,2).copy()
def write(p,x):
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-c:a','pcm_s16le',str(p)],input=np.asarray(x,dtype='<f4').tobytes(),check=True)
def place(dest,clip,at,gain=1):
 k=round(at*SR);end=min(len(dest),k+len(clip));
 if k<0:clip=clip[-k:];k=0
 if end>k:dest[k:end]+=clip[:end-k]*gain
music=np.zeros((N,2),np.float32);effects=np.zeros_like(music);scores={k:read(PUB/'music'/(k+'.mp3')) for k in ['curiosity','city','future']};cursors={k:0 for k in scores};events=[]
for c in T['chapters']:
 name='city' if c['id'] in ['uber','maps','youtube','tiktok'] else 'future' if c['id'] in ['crispr','chatgpt'] else 'curiosity';a=cursors[name];n=round(c['duration']*SR);source=scores[name]
 if a+n>len(source):a=0
 clip=source[a:a+n].copy();cursors[name]=a+n;fade=min(round(1.1*SR),len(clip)//3);clip[:fade]*=np.linspace(0,1,fade)[:,None];clip[-fade:]*=np.linspace(1,0,fade)[:,None];rms=np.sqrt(np.mean(clip**2));clip*=10**(-30/20)/max(rms,1e-6);place(music,clip,c['start']);events.append({'kind':'score','cue':name,'start':c['start'],'duration':c['duration'],'sourceOffset':a/SR,'targetRmsDb':-30})
# An envelope follows the actual narration, with slow recovery so music does not pump per syllable.
voice=read(PUB/'narration.wav');mono=np.mean(voice,axis=1);block=480;env=np.sqrt(np.mean(np.pad(mono,(0,(-len(mono))%block)).reshape(-1,block)**2,axis=1));speech=np.interp(np.arange(N)/SR,np.arange(len(env))*.01,(env>.012).astype(float));duck=lfilter([.001],[1,-.999],speech);music*= (1-.18*duck)[:,None]
sfx={k:read(PUB/'sfx'/(k+'.mp3')) for k in ['phone','book','city','typing','science']}
def fx(name,at,gain=.18,seconds=None):
 clip=sfx[name]
 if seconds:clip=clip[:round(seconds*SR)]
 rms=np.sqrt(np.mean(clip**2));clip=clip/max(rms,1e-5)*.07
 place(effects,clip,at,gain);events.append({'kind':'foley','cue':name,'start':at,'duration':len(clip)/SR,'gain':gain})
fx('phone',0,.7)
for c in T['chapters']:
 if c['id']=='wikipedia':fx('book',c['start'],.7)
 if c['id']=='uber':
  a=read(PUB/'sfx/city.mp3');need=round(c['duration']*SR);amb=np.tile(a,(math.ceil(need/len(a)),1))[:need];place(effects,amb,c['start'],.06)
 if c['id']=='crispr':
  a=sfx['science'];need=round(c['duration']*SR);place(effects,np.tile(a,(math.ceil(need/len(a)),1))[:need],c['start'],.035)
 if c['id']=='chatgpt':fx('typing',c['start']+.2,.5)
 if c['id']=='outro':fx('phone',c['start'],.22)
rng=np.random.default_rng(4107)
for i,s in enumerate(T['shots']):
 if i==0:continue
 dur=.16 if s['kind'] in ['hero','photo','photo-pair'] else .095;n=round(dur*SR);t=np.arange(n)/SR;noise=rng.normal(0,1,n);noise=lfilter([.09,.09,.09,.09],[1,-.58],noise);en=np.sin(np.linspace(0,math.pi,n))**2;w=noise*en*.017
 # Cut cues are airy and short, with a slightly stronger opening montage.
 gain=1.25 if s['start']<17 else .45;clip=np.column_stack([w,np.roll(w,30)])*gain;place(effects,clip,s['start']);events.append({'kind':'cut-accent','start':s['start'],'duration':dur,'peakApproxDb':-32})
 if s['kind'] in ['book','wiki-build']:fx('book',s['start'],.25,1.2)
 if s['kind'] in ['wiki-edit','chat','chat-response']:fx('typing',s['start']+.15,.25,min(2,s['duration']-.15))
 if s['kind'] in ['daily','ride-phone','fare']:fx('phone',s['start']+.1,.2,1)
# Light finite semantic hits, not wall-to-wall impacts.
for s in T['shots']:
 if s['kind'] in ['app-merge','repair','acquisition','nobel','medicine','destination']:
  n=round(.45*SR);t=np.arange(n)/SR;y=(np.sin(2*np.pi*660*t)+.35*np.sin(2*np.pi*990*t))*np.exp(-t*12)*.025;place(effects,np.column_stack([y,y]),s['start']+.32)
peak=float(np.max(np.abs(effects)))
if peak>.4:effects*=.4/peak
write(PUB/'music.wav',music);write(PUB/'effects.wav',effects);(BASE/'audio-events.json').write_text(json.dumps({'sampleRate':SR,'duration':D,'musicDucking':'18% additional attenuation during detected speech','events':events},indent=2)+'\n');print(json.dumps({'seconds':D,'events':len(events),'effectsPeakDb':20*math.log10(max(float(np.max(np.abs(effects))),1e-9))}))
