"""Prepare V3's continuous chosen performance, exact captions and causal action cues."""
from pathlib import Path
import json, math, re, hashlib, wave
import numpy as np
from dialogue_media import ROOT,R,pcm,wav,run
B=ROOT/'episodes/start-the-task';P=ROOT/'public/episodes/start-the-task'
plan=json.loads((B/'plan.json').read_text());FPS=plan['fps'];TAKE=plan.get('selectedNarrationTake',1)
def save(name,value):(B/name).write_text(json.dumps(value,indent=2)+'\n')
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
source=P/f'source-narrator-v3-take-{TAKE}.mp3'
scribe=json.loads((B/f'transcript-scribe-v3-take-{TAKE}.json').read_text())['words']
independent=json.loads((B/f'transcript-independent-v3-take-{TAKE}.json').read_text())['words']
expected=[w for line in plan['lines'] for w in line['text'].split()]
assert [norm(w['text']) for w in scribe]==[norm(w) for w in expected]
assert [norm(w['word']) for w in independent]==[norm(w) for w in expected], 'Independent source transcript must match the script.'
# The selected take's first syllable has a measured silent lead. Preserve a 12ms handle.
audio=pcm(source);active=np.flatnonzero(np.abs(audio)>.01)
trim=min(scribe[0]['start'],max(0,float(active[0])/R-.012))
trim=max(0,trim-.005)
audio=audio[round(trim*R):];D=math.ceil((len(audio)/R+plan['endingHold'])*FPS)/FPS;N=round(D*R)
lines={};words=[];cursor=0
for row in plan['lines']:
    ws=[]
    for text,w in zip(row['text'].split(),scribe[cursor:cursor+len(row['text'].split())]):
        a=max(0,w['start']-trim);z=w['end']-trim;assert z>a
        ws.append({'text':text.strip("'"),'spokenText':text,'start':a,'end':z,'line':row['id']})
    cursor+=len(ws);words.extend(ws);lines[row['id']]={**row,'start':ws[0]['start'],'end':ws[-1]['end'],'words':ws}
voice=np.zeros(N);voice[:len(audio)]=audio;wav(P/'narration-raw.wav',voice)
run(['ffmpeg','-v','error','-y','-i',str(P/'narration-raw.wav'),'-af','loudnorm=I=-16:TP=-3:LRA=8,aresample=48000','-ac','2',str(P/'narration.wav')])
def cue(line,word):return next(w['start'] for w in lines[line]['words'] if norm(w['text'])==norm(word))
e={k:v['start'] for k,v in lines.items()}
e.update(cupImpact=min(.48,max(.28,cue('hook','coffees'))),zero=cue('hook','zero'),
 goalWord=cue('change','finish'),contact=cue('change','open'),file=cue('change','file'),
 type=lines['write']['start']+.12,concrete=cue('research','concretely'),
 means=cue('research','tasks'),viewerFocus=cue('next','pick'),
 result=cue('done','started'),coffeeWord=cue('coffee','coffee'),end=D)
e['graphics']=max(2.1,e['change']-.18)
e['sentenceDone']=min(lines['write']['end']+.18,lines['research']['start']-.12)
e['typeDuration']=e['sentenceDone']-e['type']
e['returnDesk']=max(lines['next']['start']+.5,lines['done']['start']-.45)
e['returnEnd']=lines['done']['start']+.08
assert e['contact']<8 and e['sentenceDone']<e['research']
shots=[{'id':v['id'],'start':0 if i==0 else v['start'],'duration':(list(lines.values())[i+1]['start'] if i+1<len(lines) else D)-(0 if i==0 else v['start'])} for i,v in enumerate(lines.values())]
captions=[]
for line in lines.values():
 for i in range(0,len(line['words']),2):
    ws=line['words'][i:i+2];captions.append({'text':' '.join(w['text'] for w in ws),'startMs':round(ws[0]['start']*1000),'endMs':round(ws[-1]['end']*1000),'timestampMs':round(ws[0]['start']*1000),'confidence':None})
save('edit.json',{'revision':3,'fps':FPS,'duration':D,'events':e,'lines':lines,'shots':shots,'ui':plan['ui']})
save('captions.json',captions);save('transcript-source.json',{'sourceTake':TAKE,'revision':3,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'alignment':'Exact selected-take Scribe timestamps, independently checked with Whisper. Continuous performance; measured leading silence removed, no internal speech cuts or speed change.','words':words})
save('audio-edits.json',[{'source':str(source.relative_to(ROOT)),'sourceStart':trim,'sourceEnd':trim+len(audio)/R,'outputStart':0,'outputEnd':len(audio)/R,'speed':1,'cutBasis':'Measured initial silence, with a quiet handle; full performance and complete final word tail retained.'}])

ledger=json.loads((B/'assets/sfx-ledger.json').read_text());sounds={r['id']:pcm(ROOT/r['file']) for r in ledger};fx=np.zeros(N);motion=[]
def action(name,t,d,key,gain):
    t=max(0,t);s=round(t*R);n=min(round(d*R),len(sounds[key]),N-s);assert n>0
    a=sounds[key][:n].copy();a*=gain/max(.001,float(np.max(np.abs(a))))
    edge=min(round(.006*R),n//2);a[:edge]*=np.linspace(0,1,edge);a[-edge:]*=np.linspace(1,0,edge)
    fx[s:s+n]+=a;motion.append({'id':name,'start':t,'duration':d,'sound':key,'peakGain':gain})
action('cup-already-falling',0,.2,'swipe',.055)
action('third-cup-contact',e['cupImpact'],.18,'tap',.10)
action('zero-refuses-to-change',e['zero'],.20,'pop',.055)
action('reaction-hand-contact',.72,.12,'tap',.025)
action('reaction-recovers',1.08,.25,'swipe',.018)
action('goal-travels-into-graphics',e['graphics'],.50,'swipe',.055)
action('goal-is-replaced',e['goalWord'],.30,'typing',.035)
action('pointer-approaches',e['contact']-.30,.30,'swipe',.035)
action('pointer-contacts',e['contact'],.12,'tap',.095)
action('folder-opens-at-contact',e['contact']+.04,.36,'swipe',.05)
action('page-comes-forward',e['file'],.45,'swipe',.045)
for i in range(12):action('first-sentence-key-'+str(i),e['type']+i*e['typeDuration']/12,.07,'typing',.028)
action('actual-first-work',e['sentenceDone'],.25,'pop',.045)
action('research-path-from-goal',e['research']+.15,.50,'swipe',.026)
action('concrete-first-move',e['means'],.40,'swipe',.03)
action('path-reaches-existing-work',e['concrete']-.12,.35,'pop',.03)
action('viewer-field-focus',e['viewerFocus'],.20,'tap',.05)
action('same-page-returns',e['returnDesk'],.55,'swipe',.045)
action('you-started-check',e['result'],.40,'done',.04)
for i in range(6):action('continuing-sentence-key-'+str(i),e['result']+.18+i*.95/6,.07,'typing',.025)
action('coffee-callback-reframe',e['coffeeWord'],.35,'swipe',.025)
wav(P/'effects-mono.wav',fx)
run(['ffmpeg','-v','error','-y','-i',str(P/'effects-mono.wav'),'-af','pan=stereo|c0=c0|c1=c0',str(P/'effects.wav')])
save('motion-audio-cues.json',motion)

# Keep the exact V2 song, its source offset and its fixed level. Trim only to V3's duration.
music_source=B/'revisions/v2-before-editorial/music.wav'
music=np.frombuffer(run(['ffmpeg','-v','error','-i',str(music_source),'-f','f32le','-ar',str(R),'-ac','2','-']),'<f4').copy().reshape(-1,2)[:N]
assert len(music)==N
tail=round(.24*R);music[-tail:]*=np.linspace(1,0,tail)[:,None]
with wave.open(str(P/'music.wav'),'wb') as f:
 f.setnchannels(2);f.setsampwidth(2);f.setframerate(R);f.writeframes((np.clip(music,-.98,.98)*32767).astype('<i2').tobytes())
save('music-review.json',{'source':plan['musicSelection']['sourceFile'],'preparedSource':str(music_source.relative_to(ROOT)),'provenance':plan['musicSelection']['provenance'],'sameSongAndFixedLevelAsV2':True,'continuous':True,'duration':D,'channels':2,'gainAutomation':'V2 level preserved; 240ms final edge on the settled picture.','minimumHalfSecondRms':min(float(np.sqrt(np.mean(music[i:i+R//2]**2))) for i in range(0,N-R//2,R//4))})
episode=json.loads((B/'episode.json').read_text());episode.update(duration=D,fps=FPS,renderer='remotion',world='start-task',audio={'narration':'episodes/start-the-task/narration.wav','music':'episodes/start-the-task/music.wav','effects':'episodes/start-the-task/effects.wav','narrationOffset':0,'narrationTrimStart':0,'narrationTail':D-lines['coffee']['end'],'pauses':[]},scenes=[{**s,'set':'study-desk' if s['id'] in ['hook','done','coffee'] else 'study-graphics','action':'reveal','anchor':lines[s['id']]['text'],'label':s['id'],'timeOfDay':'evening'} for s in shots])
save('episode.json',episode);plan['measuredDurationSeconds']=D;save('plan.json',plan)
print(json.dumps({'duration':D,'frames':round(D*FPS),'words':len(words),'firstFileAction':e['contact'],'firstSentenceComplete':e['sentenceDone'],'events':e},indent=2))
