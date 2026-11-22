"""Deterministic action Foley and a speech-ducked saved channel score."""
from pathlib import Path
import json,math,re,subprocess,wave
import numpy as np

B=Path('episodes/restless-friend');P=Path('public/episodes/restless-friend');T=json.loads((B/'timeline.json').read_text());D=T['duration'];R=48000;N=round(D*R);E=T['events'];rng=np.random.default_rng(89299);mix=np.zeros(N,dtype=np.float64);events=[]
def put(t,a,name):
    start=round(t*R);lo=max(0,start);hi=min(N,start+len(a))
    if hi>lo:mix[lo:hi]+=a[lo-start:hi-start]
    events.append({'at':round(t,6),'kind':name,'duration':round(len(a)/R,5)})
def tone(t,d,f,g,name,fall=6):
    q=np.arange(round(d*R))/R;env=np.minimum(1,q/.003)*np.exp(-fall*q/d);put(t,g*np.sin(2*np.pi*f*q)*env,name)
def noise(t,d,g,name,cut=.8):
    n=round(d*R);a=rng.normal(0,1,n);w=max(1,int(cut*25));a=np.convolve(a,np.ones(w)/w,mode='same');q=np.linspace(0,1,n);put(t,a*g*np.sin(np.pi*q)**.8,name)
def tap(t,g=.085):
    tone(t,.055,165,g,'shoe heel contact',8);noise(t,.045,g*.5,'dry shoe detail',.4)
def whoosh(t,g=.14):noise(t,.17,g,'cut whoosh',.88)
def plate(t,g=.06):
    for f,a in [(1380,1),(2260,.4),(3320,.2)]:tone(t,.18,f,g*a,'ceramic contact',8)
# First frame: an impact beneath the first word, bite, fork and cheese movement.
tone(0,.18,82,.15,'opening low hit',5);noise(.02,.075,.11,'bite crunch',.16)
noise(.20,.10,.075,'pizza crust crunch',.10);plate(.37,.035)
q=np.arange(round(.19*R))/R;put(.40,np.sin(2*np.pi*(260*q+400*q*q))*.023*np.sin(np.pi*q/.19),'cheese pull')
for t in [.68,.77,.86]:noise(t,.025,.045,'crumb drop',.28)
for s in T['shots'][1:]:whoosh(s['start'],.13)
for t in [E['pace'],E['stand'],T['shots'][4]['start']+.5]:whoosh(t,.10)
for t in [1.65,2.25]:tap(t,.035)
tone(T['shots'][1]['start'],.07,740,.045,'freeze click',8)
plate(E['scientist']+.15,.05)
for j in range(4):plate(E['calories']+j*.14,.035)
noise(E['weeks'],.16,.10,'calendar paper flip',.35)
for at in [E['lowFat'],E['highFat']]:
    for j in range(3):tone(at+j*.12,.055,520+j*95,.025,'bar rise tick',9)
tone(E['highFat']+.55,.13,155,.075,'tall bar landing',6)
whoosh(E['neat']-.08,.10)
# Heel cycles are intentional fidgeting; torso and hips stay supported.
for start,end in [(T['shots'][4]['start'],E['pace']),(T['shots'][7]['start'],T['shots'][8]['start'])]:
    for t in np.arange(start+.40,end,.60):tap(float(t),.065)
for t in T['shots'][4]['start']+.4+np.arange(40)*.6:
    if E['notOnlyTap']<=t<T['shots'][7]['start']:tap(float(t),.065)
for start,end in [(E['pace'],E['stand']),(E['qualifier'],E['notOnlyTap'])]:
    for t in np.arange(start+.08,end,.55):tap(float(t),.060)
noise(E['stand']+.08,.28,.08,'bench scrape',.65)
visuals=json.loads((B/'visuals.json').read_text())
if visuals.get('assetRevision',1)>=3:
    playback=json.loads((B/'assets/animation-registry-v3.json').read_text())['supportAnimations']['ada']['playback']
    for at in playback['writingStrokes']:noise(E[playback['anchorEvent']]+at,.065,.022,'pen writing stroke',.15)
elif visuals.get('assetRevision',1)>=2:
    lab=next(s for s in T['shots'] if s['id']=='experiment')
    for at in np.arange(lab['start'],lab['start']+lab['duration'],1.2):
        for offset in [.28,.50]:
            if at+offset<lab['start']+lab['duration']:noise(float(at+offset),.065,.022,'pen writing stroke',.15)
tone(E['maximum']+.25,.11,930,.035,'counter settle',7)
whoosh(E['qualifier'],.11);whoosh(E['notOnlyTap'],.11)
tap(E['feet']+.12,.075);plate(E['comment']+.10,.025)
with wave.open(str(P/'effects-raw.wav'),'wb') as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(R);f.writeframes((np.clip(mix,-.9,.9)*32767).astype('<i2').tobytes())
def run(a):
    result=subprocess.run(a,capture_output=True,text=True)
    if result.returncode:raise RuntimeError(result.stderr[-6000:])
    return result
run(['ffmpeg','-v','error','-y','-i',str(P/'effects-raw.wav'),'-i',str(P/'narration.wav'),'-filter_complex',f'[0:a][1:a]sidechaincompress=threshold=0.10:ratio=1.8:attack=3:release=65,apad=whole_len={N},atrim=end_sample={N}[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'effects.wav')])
music='public/episodes/brain-upload/source-music.mp3'
run(['ffmpeg','-v','error','-y','-i',music,'-i',str(P/'narration.wav'),'-filter_complex',f'[0:a]atrim=duration={D},loudnorm=I=-28:TP=-6:LRA=7,afade=t=in:d=0.06,afade=t=out:st={D-.16}:d=0.16[m];[m][1:a]sidechaincompress=threshold=.11:ratio=2:attack=8:release=150,aresample=48000,apad=whole_len={N},atrim=end_sample={N}[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'music.wav')])
run(['ffmpeg','-v','error','-y','-i',str(P/'narration.wav'),'-i',str(P/'music.wav'),'-i',str(P/'effects.wav'),'-filter_complex',f'[0:a][1:a][2:a]amix=inputs=3:normalize=0,aresample=48000,apad=whole_len={N},atrim=end_sample={N}[o]','-map','[o]','-c:a','pcm_s24le',str(P/'mix-raw.wav')])
analysis=run(['ffmpeg','-hide_banner','-nostats','-i',str(P/'mix-raw.wav'),'-af','loudnorm=I=-14:TP=-2:LRA=9:print_format=json','-f','null','-'])
stats=json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}',analysis.stderr,re.S)[-1])
normal=f'loudnorm=I=-14:TP=-2:LRA=9:measured_I={stats["input_i"]}:measured_TP={stats["input_tp"]}:measured_LRA={stats["input_lra"]}:measured_thresh={stats["input_thresh"]}:offset={stats["target_offset"]}:linear=true,aresample=48000,apad=whole_len={N},atrim=end_sample={N}'
run(['ffmpeg','-v','error','-y','-i',str(P/'mix-raw.wav'),'-af',normal,'-ar',str(R),'-ac','2','-c:a','pcm_s24le',str(P/'delivery-mix.wav')])
(B/'audio-events.json').write_text(json.dumps(events,indent=2)+'\n')
(B/'audio-sources.json').write_text(json.dumps({'music':{'file':music,'provenance':'episodes/brain-upload/music-source.json','provider':'ElevenLabs MCP','method':'Saved channel score, -28 LUFS before speech ducking'},'effects':{'method':'Original deterministic synthesis, not recordings','seed':89299,'events':len(events)},'voice':{'provider':'ElevenLabs MCP','voice':'Amara','take':2,'speed':1.2,'editMap':'audio-edit.json'},'master':{'file':str(P/'delivery-mix.wav'),'duration':D,'samples':N,'sampleRate':R,'channels':2,'targetLufs':-14,'targetTruePeakDbfs':-2,'analysis':stats}},indent=2)+'\n')
print(json.dumps({'seconds':D,'events':len(events),'master':str(P/'delivery-mix.wav'),'preMasterLufs':stats['input_i']},indent=2))
