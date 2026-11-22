"""Keep every spoken word while shortening only measured pauses for the short."""
from pathlib import Path
import json,re,subprocess
b=Path('episodes/restless-friend');p=Path('public/episodes/restless-friend');raw=json.loads((b/'transcript-aligned.json').read_text());w=raw['words'];src=p/'source-take-2.mp3';D=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(src)]))
assert all(x['end']>x['start'] for x in w)
silence=(b/'source-silence.log').read_text();starts=list(map(float,re.findall(r'silence_start: ([\d.]+)',silence)));ends=list(map(float,re.findall(r'silence_end: ([\d.]+)',silence)))
# Waveform onset is earlier than the aligner's first token. Preserve the complete
# initial syllable, exclude the non-spoken direction tag from captions, and keep
# the original take. The first caption begins with this retained opening.
lead=.08;w[0]['start']=lead;tail=max(.02,D-w[-1]['end']-.04);keep_pause=.12;target=36.9
candidates=[]
for a,z in zip(starts,ends):
 a=max(a+.025,lead);z=min(z-.025,D-tail)
 if z-a>keep_pause:candidates.append((a,z,z-a-keep_pause))
needed=D-lead-tail-target;cap=sum(x[2] for x in candidates)
if needed<0:target=D-lead-tail;needed=0
if needed>cap:raise ValueError(f'Cannot reach 30s without cutting speech: need {needed:.3f}s, safe capacity {cap:.3f}s')
cuts=[(0,lead)]+[((a+z)/2-c*needed/cap/2,(a+z)/2+c*needed/cap/2) for a,z,c in candidates]+[(D-tail,D)]
def remap(t):return max(0,t-sum(max(0,min(t,z)-a) for a,z in cuts))
segments=[];at=0
for a,z in cuts:
 if a>at+1e-7:segments.append((at,a))
 at=z
if at<D:segments.append((at,D))
filters=[];names=[]
for i,(a,z) in enumerate(segments):filters.append(f'[0:a]atrim=start={a}:end={z},asetpts=PTS-STARTPTS[a{i}]');names.append(f'[a{i}]')
filters.append(''.join(names)+f'concat=n={len(names)}:v=0:a=1[out]')
subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-filter_complex',';'.join(filters),'-map','[out]','-ar','48000','-ac','1',str(p/'source-edited.wav')],check=True)
words=[{**x,'start':remap(x['start']),'end':remap(x['end'])} for x in w]
assert all(x['end']>x['start'] for x in words)
(b/'transcript-source.json').write_text(json.dumps({'sourceTake':2,'sourceFile':'source-edited.wav','model':raw['model'],'words':words},indent=2)+'\n')
(b/'audio-edit.json').write_text(json.dumps({'originalFile':str(src),'editedFile':str(p/'source-edited.wav'),'originalDuration':D,'editedDuration':target,'cuts':cuts,'playbackRate':1.2,'reason':'Measured silence shortened; source take and all spoken words preserved.','firstOnsetReview':'Raw waveform rises around 0.11s, ahead of the aligner. Retain from 0.08s and place the first caption at that retained onset.','providerDirectionTagExcludedFromCaptions':True},indent=2)+'\n')
print(json.dumps({'original':D,'edited':target,'deliveryVoice':target/1.2,'silenceCut':D-target,'words':len(words),'first':words[0],'last':words[-1]}))
