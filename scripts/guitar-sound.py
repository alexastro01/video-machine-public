"""Arrange recorded guitar notes, saved score and short noise-based movement effects."""
import json,subprocess,wave,array,math,random
from pathlib import Path
root=Path('public/episodes/guitar-pickup');e=json.loads(Path('episodes/guitar-pickup/episode.json').read_text());rate=48000;out=[0.0]*(30*rate)
def pcm(file):
 b=subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-ar',str(rate),'-ac','1','-f','s16le','pipe:1']);return [x/32768 for x in array.array('h',b)]
notes={n:pcm(root/'audio-source'/f'{n}.mp3') for n in ['E2','A2','Fs3']}
def add_note(at,n,gain,length,shift=0,thin=False):
 source=notes[n];step=2**(shift/12)
 for j in range(round(length*rate)):
  k=int(j*step)
  if k>=len(source):break
  x=source[k];idx=round(at*rate)+j
  if idx>=len(out):break
  # The first plinks are illustrative quiet, filtered versions of the recorded note.
  if thin:x=x-(source[max(0,k-18)]+source[max(0,k-36)])/2
  env=min(1,j/(rate*.005))*min(1,(length-j/rate)/.05)
  out[idx]+=x*gain*max(0,env)
rng=random.Random(932)
def air(at,length,gain):
 low=0
 for j in range(round(length*rate)):
  low=.94*low+.06*rng.uniform(-1,1);p=j/(length*rate);idx=round(at*rate)+j
  if 0<=idx<len(out):out[idx]+=low*gain*math.sin(math.pi*p)
for at in [.42,2.07]:add_note(at,'E2',.09,.35,thin=True)
for s in e['scenes'][1:]:air(s['start'],.22,.12)
start={s['id']:s['start'] for s in e['scenes']}
add_note(start['string']+.32,'E2',.26,2.5)
air(start['pickup']+.25,.6,.08)
for i in range(4):air(start['flux']+.2+i*.9,.24,.065)
air(start['nylon']+.4,.25,.07)
air(start['cable'],1.65,.19)
add_note(start['amp']+.15,'E2',.22,1.1)
add_note(start['speaker']+.15,'E2',.46,1.2)
chord=start['closer']+1.72
for i,(n,shift,g) in enumerate([('E2',0,.6),('A2',2,.45),('E2',12,.35),('Fs3',1,.30)]):add_note(chord+i*.028,n,g,2.45,shift)
air(29.7,.25,.11)
def wav(file,samples):
 with wave.open(str(file),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(array.array('h',[round(max(-.95,min(.95,x))*32767) for x in samples]).tobytes())
wav(root/'effects-raw.wav',out)
# Controlled peaks and speech-keyed ducking. No generic musical beeps or dings.
subprocess.run(['ffmpeg','-v','error','-y','-i',str(root/'effects-raw.wav'),'-i',str(root/'narration.wav'),'-filter_complex','[1:a]apad=whole_dur=30[voice];[0:a][voice]sidechaincompress=threshold=0.05:ratio=3:attack=10:release=100,alimiter=limit=0.5:level=false,apad=whole_dur=30,atrim=duration=30[out]','-map','[out]','-ar',str(rate),str(root/'effects.wav')],check=True)
# Reuse an existing licensed/generated channel score; leave room for the opening plinks.
subprocess.run(['ffmpeg','-v','error','-y','-i','public/episodes/brain-upload/source-music.mp3','-af',"loudnorm=I=-20:TP=-2:LRA=7,volume='if(lt(t,3.5),0.02,0.10)':eval=frame,afade=t=out:st=27:d=2.8",'-t','30','-ar',str(rate),'-ac','2',str(root/'music.wav')],check=True)
print('Saved 30-second music and action-effects stems')
