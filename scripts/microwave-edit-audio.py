"""Trim only measured inter-word silence; keep speech playback at exactly 1.2x."""
import json,re,subprocess
from pathlib import Path
root=Path('episodes/microwave'); pub=Path('public/episodes/microwave')
src=pub/'source-take-2.mp3'
raw=json.loads((root/'transcript-aligned.json').read_text());w=raw['words']
# Three zero-length aligner tokens: use provider onsets, bounded by neighbours.
fixes=[]
provider=json.loads((root/'transcript-provider.json').read_text())['words']
for i,q in enumerate(w):
 if q['end']<=q['start']:
  p=next(x for x in provider if x['text']==q['text'])
  old=dict(q);q['start']=p['start'];q['end']=max(q['start']+.04,q['end'])
  if i:w[i-1]['end']=min(w[i-1]['end'],q['start'])
  fixes.append({'from':old,'to':dict(q),'reason':'zero-length local alignment; provider onset'})
text=subprocess.run(['ffmpeg','-hide_banner','-i',str(src),'-af','silencedetect=noise=-38dB:d=0.2','-f','null','-'],capture_output=True,text=True,check=True).stderr
starts=list(map(float,re.findall(r'silence_start: ([\d.]+)',text)))
ends=list(map(float,re.findall(r'silence_end: ([\d.]+)',text)))
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(src)]))
# Keep at least 180 ms of each pause, never cut a detected speaking sample.
lead=.1;tail=.08;target=53.88
gaps=[(a,b,b-a-.18) for a,b in zip(starts,ends) if a>lead and b<duration-tail and b-a>.2]
needed=duration-lead-tail-target;capacity=sum(c for _,_,c in gaps)
assert 0<needed<capacity,(needed,capacity)
cuts=[(0,lead)]+[( (a+b)/2-c*needed/capacity/2,(a+b)/2+c*needed/capacity/2) for a,b,c in gaps]+[(duration-tail,duration)]
def remap(t):return max(0,t-sum(max(0,min(t,b)-a) for a,b in cuts))
segments=[];at=0
for a,b in cuts:
 if a>at:segments.append((at,a))
 at=b
if at<duration:segments.append((at,duration))
filters=[];names=[]
for i,(a,b) in enumerate(segments):
 filters.append(f'[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS[a{i}]');names.append(f'[a{i}]')
filters.append(''.join(names)+f'concat=n={len(names)}:v=0:a=1[out]')
subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-filter_complex',';'.join(filters),'-map','[out]','-ar','48000','-ac','1',str(pub/'source-edited.wav')],check=True)
for q in w:q['start']=remap(q['start']);q['end']=remap(q['end'])
(root/'transcript-source.json').write_text(json.dumps({'sourceTake':2,'sourceFile':'source-edited.wav','model':raw['model'],'providerOnsetRepairs':fixes,'words':w},indent=2)+'\n')
(root/'audio-edit.json').write_text(json.dumps({'originalFile':str(src),'editedFile':str(pub/'source-edited.wav'),'originalDuration':duration,'editedDuration':target,'cuts':cuts,'playbackRate':1.2,'reason':'Only measured silence shortened; no spoken words removed.'},indent=2)+'\n')
print(json.dumps({'editedSeconds':target,'deliverySpeechSeconds':target/1.2,'removedSilence':duration-target,'captionWords':len(w)}))
