"""Purpose-built motor, switch, steam, molecular and bell effects; saved channel score."""
import json,subprocess,wave,array,math,random
from pathlib import Path
root=Path('public/episodes/microwave');e=json.loads(Path('episodes/microwave/episode.json').read_text());rate=48000;duration=e['duration'];out=[0.0]*round(duration*rate);rng=random.Random(626)
at={s['id']:s['start'] for s in e['scenes']}
def noise(t,length,gain,lowpass=.92):
 low=0
 for j in range(round(length*rate)):
  low=lowpass*low+(1-lowpass)*rng.uniform(-1,1);p=j/(length*rate);k=round(t*rate)+j
  if 0<=k<len(out):out[k]+=low*gain*math.sin(math.pi*p)**.7
def tone(t,length,freq,gain,decay=3):
 for j in range(round(length*rate)):
  q=j/rate;k=round(t*rate)+j
  if 0<=k<len(out):out[k]+=gain*min(1,q/.003)*math.exp(-decay*q/length)*math.sin(math.tau*freq*q)
# Opening: relay, motor rise, simmer, tiny ice crack. Each visible event has a cue.
noise(0,.08,.32,.2);tone(0,.13,180,.12,4)
for sec in [0,1.6]:noise(sec,1.4,.055,.9)
tone(.08,2.0,100,.025,0);tone(.08,2.0,200,.012,0)
noise(at['ice']+.1,.10,.16,.1);tone(at['ice']+.16,.20,1850,.035,6)
for shot in e['scenes'][1:]:noise(shot['start'],.16,.13,.86)
noise(at['dive'],.65,.28,.91)
noise(at['magnetron']+.15,.5,.14,.75);tone(at['magnetron']+.45,.15,180,.06,5)
noise(at['feed']+.1,1.15,.20,.94)
for sec in [at['water']+.18,at['field']+.1,at['follow']+.15]:tone(sec,.18,600,.055,5)
for i in range(7):
 tone(at['heat']+.15+i*.29,.14,480+i*62,.035,6);noise(at['heat']+.15+i*.29,.045,.04,.4)
noise(at['soup']+.2,1.6,.06,.8)
for i in range(3):tone(at['lattice']+.2+i*.23,.18,1250+i*80,.04,6)
for i in [0,2.6]:
 noise(at['defrost']+i,.055,.2,.1);tone(at['defrost']+i,.65,100,.025,1)
for i in [0,.45,1.05]:tone(at['door']+.12+i,.12,1650,.035,5)
noise(at['door']+.2,.75,.13,.93);tone(at['light']+.35,.30,2200,.025,5)
noise(at['ride'],2.8,.035,.96)
# Mechanical bell: non-harmonic decays, rather than an arbitrary musical cue.
for f,g in [(1180,.15),(1875,.065),(3190,.025)]:tone(at['closer'],1.1,f,g,6)
noise(44.82,.16,.12,.87)
def wav(file,samples):
 with wave.open(str(file),'wb') as f:
  f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(array.array('h',[round(max(-.92,min(.92,x))*32767) for x in samples]).tobytes())
wav(root/'effects-raw.wav',out)
subprocess.run(['ffmpeg','-v','error','-y','-i',str(root/'effects-raw.wav'),'-i',str(root/'narration.wav'),'-filter_complex',f'[1:a]apad=whole_dur={duration}[voice];[0:a][voice]sidechaincompress=threshold=0.07:ratio=2:attack=8:release=90,alimiter=limit=0.45:level=false,atrim=duration={duration}[out]','-map','[out]','-ar',str(rate),str(root/'effects.wav')],check=True)
# Reuse the saved ElevenLabs channel score with a present but speech-ducked bed.
subprocess.run(['ffmpeg','-v','error','-y','-i','public/episodes/brain-upload/source-music.mp3','-i',str(root/'narration.wav'),'-filter_complex',f"[0:a]loudnorm=I=-20:TP=-2:LRA=7,volume=0.145,afade=t=in:d=0.2,afade=t=out:st=43.8:d=1.2[m];[1:a]apad=whole_dur={duration}[v];[m][v]sidechaincompress=threshold=0.045:ratio=2:attack=10:release=160,atrim=duration={duration}[out]",'-map','[out]','-ar',str(rate),'-ac','2',str(root/'music.wav')],check=True)
Path('episodes/microwave/audio-sources.json').write_text(json.dumps({'music':{'file':'public/episodes/brain-upload/source-music.mp3','provenance':'episodes/brain-upload/music-source.json','musicGain':.145},'effects':{'type':'Original deterministic synthesis','seed':626,'events':['relay click','turntable motor','steam','ice crack','scale whoosh','cover slide','wave sweep','molecular ticks','mesh tap','mechanical bell'],'notFieldRecordings':True},'voice':{'provider':'ElevenLabs','take':2,'speed':1.2}},indent=2)+'\n')
print('Saved 45-second music and action effects')
