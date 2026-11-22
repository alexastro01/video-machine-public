"""Prepare the sequel from exact selected performances, complete word edges and local sound."""
from pathlib import Path
import json,math,re,subprocess,shutil,hashlib
import numpy as np
from dialogue_media import ROOT,R,pcm,wav,run

SLUG='billionaire-body-swap-2';B=ROOT/'episodes'/SLUG;P=ROOT/'public/episodes'/SLUG
spec=json.loads((B/'plan.json').read_text());FPS=30
def save(name,value):(B/name).write_text(json.dumps(value,indent=2)+'\n')
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
def source_norm(s):
    t=norm(s)
    return {'five':'5','thousand':'000','four':'4'}.get(t,t)
def silences(file):
    result=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(file),'-af','silencedetect=noise=-39dB:d=0.025','-f','null','-'],capture_output=True,check=True)
    rows=[];start=0
    for line in result.stderr.decode().splitlines():
        a=re.search(r'silence_start: ([\d.]+)',line);z=re.search(r'silence_end: ([\d.]+)',line)
        if a:start=float(a[1])
        if z:rows.append({'start':start,'end':float(z[1])})
    return rows
chunks={};sources={}
performances=spec.get('performances') or [dict(id=role,role=role,sourceFile=f'public/episodes/{SLUG}/source-{role}-take-1.mp3',transcript=f'voices/{role}-independent.json',alignmentTranscript='voices/mum-scribe.json' if role=='mum' else f'voices/{role}-independent.json',lineIds=[l['id'] for l in spec['lines'] if l['speaker']==role]) for role in spec['voices']]
for performance in performances:
    role=performance['role'];file=ROOT/performance['sourceFile'];audio=pcm(file)
    independent=json.loads((B/performance['transcript']).read_text())
    rows=[next(l for l in spec['lines'] if l['id']==line_id) for line_id in performance['lineIds']]
    assert all(l['speaker']==role for l in rows),performance['id']
    expected=[w for l in rows for w in l['text'].split()]
    assert [source_norm(w['word']) for w in independent['words']]==[source_norm(w) for w in expected],role
    raw=json.loads((B/performance['alignmentTranscript']).read_text())['words']
    words=[{'text':w.get('text',w.get('word')),'start':w['start'],'end':w['end']} for w in raw]
    assert [source_norm(w['text']) for w in words]==[source_norm(w) for w in expected],role
    assert all(w['end']>w['start'] for w in words),role
    quiet=silences(file);sources[performance['id']]={'role':role,'source':str(file.relative_to(ROOT)),'silences':quiet,'sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'alignmentTranscript':performance['alignmentTranscript']}
    cursor=0;cuts=[0.]
    offsets=[]
    for row in rows:
        n=len(row['text'].split());offsets.append((cursor,cursor+n));cursor+=n
    for (_,a),(z,_) in zip(offsets,offsets[1:]):
        lo=words[a-1]['end'];hi=words[z]['start'];middle=(lo+hi)/2
        candidates=[(max(s['start'],lo)+min(s['end'],hi))/2 for s in quiet if min(s['end'],hi)>max(s['start'],lo)]
        assert candidates,(role,lo,hi,'No recorded quiet gap')
        cuts.append(min(candidates,key=lambda x:abs(x-middle)))
    cuts.append(len(audio)/R)
    for i,(row,(a,z)) in enumerate(zip(rows,offsets)):
        lo,hi=cuts[i:i+2];clip=audio[round(lo*R):round(hi*R)].copy()
        for w in words[a:z]:assert lo<=w['start']+.002 and hi>=w['end']-.002,(row,w,lo,hi)
        chunks[row['id']]={'audio':clip,'words':[dict(text=t,start=w['start']-lo,end=w['end']-lo) for t,w in zip(row['text'].split(),words[a:z])],'source':str(file.relative_to(ROOT)),'sourceStart':lo,'sourceEnd':hi}

cursor=0;lines=[];edits=[];pieces=[];caps=[]
for i,row in enumerate(spec['lines']):
    c=chunks[row['id']];at=round(cursor*FPS)/FPS;clip=c['audio'].copy()
    edge=min(round(.004*R),len(clip)//2);clip[:edge]*=np.linspace(0,1,edge);clip[-edge:]*=np.linspace(1,0,edge)
    clip*=min(3,.13/max(.001,float(np.sqrt(np.mean(clip*clip)))))
    end=at+len(clip)/R
    words=[dict(text=w['text'],start=round(at+max(0,w['start']),6),end=round(min(end,at+w['end']),6),line=row['id'],speaker=row['speaker']) for w in c['words']]
    line={**row,'start':at,'end':end,'duration':end-at,'words':words};lines.append(line);pieces.append((at,clip))
    for w in words:
        assert w['end']>w['start'],w
        caps.append(dict(text=w['text'],startMs=w['start']*1000,endMs=w['end']*1000,timestampMs=w['start']*1000,confidence=None))
    edits.append(dict(line=row['id'],speaker=row['speaker'],source=c['source'],sourceStart=c['sourceStart'],sourceEnd=c['sourceEnd'],outputStart=at,outputEnd=end,speed=1,trimBasis='Complete performance edges; inter-line cuts inside measured silence.'))
    gap=.13 if row['id'] not in ['trade','house','staff','plates','lawyer','pocket','coffee','washing'] else .28
    if row['id'] in ['homework','dishes','bins']:gap=max(gap,.90-(end-at))
    cursor=end+gap
D=math.ceil((lines[-1]['end']+spec['ending']['reactionHold'])*FPS)/FPS;N=round(D*R)
voice=np.zeros(N)
for at,clip in pieces:
    n=round(at*R);voice[n:n+len(clip)]+=clip
wav(P/'narration-raw.wav',voice)
run(['ffmpeg','-v','error','-y','-i',str(P/'narration-raw.wav'),'-af','loudnorm=I=-16:TP=-2.5:LRA=8,aresample=48000','-ar',str(R),'-ac','2',str(P/'narration.wav')])
byid={l['id']:l for l in lines}
e={l['id']:l['start'] for l in lines}
e.update(homeworkHit=byid['homework']['words'][0]['start']+.20,dishesHit=byid['dishes']['words'][0]['start']+.22,
         binsHit=byid['bins']['words'][0]['start']+.32,
         offer=byid['trade']['words'][2]['start']-.12,
         maths=next(w['start'] for w in byid['keep']['words'] if norm(w['text'])=='maths'),
         reaction=byid['keep']['words'][-1]['end']+.10,end=D)
if 'pocket' in byid:
    e['pocketHit']=next(w['start'] for w in byid['pocket']['words'] if norm(w['text'])=='four')+.08
    e['pocketReveal']=max(e['pocket']+1/FPS,e['pocketHit']-.24)
    e['coffeeDetail']=next(w['start'] for w in byid['coffee']['words'] if norm(w['text'])=='my')-.10
defs=[
('hook',0,'swap-kitchen','handoff','You swapped bodies','Open mid-action on the suited red-scarf viewer offering a hand to his old body at the breakfast table.'),
('refusal',e['refuse'],'swap-kitchen','recover',"He won't",'The former billionaire keeps eating and withholds the handshake.'),
('mum',e['finished'],'swap-kitchen','warn','Pancakes finished','Mum approaches with a warm smile and then points toward the chores.'),
('homework',e['homework'],'swap-kitchen','reveal','Homework','A real schoolbook lands on the breakfast table.'),
('dishes',e['dishes'],'swap-kitchen','reveal','Dishes','Used plates and a cloth land beside the kitchen counter.'),
('bins',e['bins'],'swap-porch','reveal','Bins','A wheeled bin rolls to a stop outside the house; its lid reacts once.'),
('pay',e['pay'],'swap-kitchen','wave','I pay people','The young body objects with an empty raised palm.'),
('house',e['house'],'swap-kitchen','warn','Not in this house','Mum points firmly; the chores remain in the scene.'),
('staff',e['staff'],'swap-kitchen','wave','I employ','The young body invokes his thousands of employees with an indignant raised palm.'),
('plates_reply',e['plates'],'swap-kitchen','reveal','five plates','Cut to the same five physical plates, now the only staff Mum needs him to manage.'),
('lawyer',e['lawyer'],'swap-kitchen','wave','calling my lawyer','He raises an empty palm and threatens to call his lawyer.'),
('pocket_setup',e['pocket'],'swap-kitchen','warn','With your','Mum challenges the lawyer plan and points to the available pocket money.'),
('pocket',e['pocketReveal'],'swap-kitchen','reveal','pocket money','Four pound coins drop onto the table in a stagger, exposing his available pocket money.'),
('coffee',e['coffee'],'swap-kitchen','recover','Four pounds','Hold his worried reaction over the four coins; he cannot afford his usual coffee.'),
('coffee_detail',e['coffeeDetail'],'swap-kitchen','recover','My coffee','Cut closer to his worried face as he compares the coins with the price of his usual coffee.'),
('washing',e['washing'],'swap-kitchen','warn','get washing','Mum redirects him toward the sink and dishes.'),
('offer',e['trade'],'swap-kitchen','handoff',"Deal's off",'Now the former billionaire offers his empty hand to the suited viewer. Their hands stay apart.'),
('hand',e['offer'],'swap-kitchen','handoff','Shake my hand','A wider angle shows the new hand offer and the suited viewer staying out of reach.'),
('keep',e['keep'],'swap-kitchen','recover','Keep it','The suited viewer steps back with a pleased reaction and refuses the new offer.'),
('exam',e['maths'],'swap-kitchen','reveal','maths tomorrow','A close view reveals tomorrow on the physical maths paper.'),
('reaction',e['reaction'],'swap-kitchen','recover','tomorrow','Hold the young body looking down at the homework. No swap, reset, extra line or end card.')]
shots=[]
for i,(sid,start,room,action,anchor,description) in enumerate(defs):
    start=round(start*FPS)/FPS;end=round(defs[i+1][1]*FPS)/FPS if i+1<len(defs) else D
    assert end>start,(sid,start,end)
    shots.append(dict(id=sid,start=start,duration=end-start,set=room,action=action,anchor=anchor,description=description))
timeline=dict(id=SLUG,title=spec['title'],width=1080,height=1920,fps=FPS,duration=D,events=e,lines=lines,shots=shots)
for file,value in [('timeline.json',timeline),('captions.json',caps),('transcript-source.json',{'sourceTake':{s['id']:1 for s in performances},'performances':performances,'words':[w for l in lines for w in l['words']]}),('audio-edit.json',edits),('alignment.json',sources)]:save(file,value)
(B/'narration.txt').write_text('\n\n'.join(l['text'] for l in lines)+'\n')
episode=json.loads((B/'episode.json').read_text())
episode.update(renderer='hyperframes',world='body-swap',hook='none',pixelArt='rpg',closingFade=False,fiction=True,title=spec['title'],premise='The billionaire refuses to return the viewer body, until Mum gives him the chores and schoolwork that come with it.',duration=D,fps=FPS,aspectRatio='9:16',cast=['miko','billionaire','mum'],audio={'narration':f'episodes/{SLUG}/narration.wav','music':f'episodes/{SLUG}/music.wav','effects':f'episodes/{SLUG}/effects.wav','narrationOffset':0,'narrationTrimStart':0,'narrationTail':spec['ending']['reactionHold'],'pauses':[]},scenes=[{**{k:s[k] for k in ['id','set','action','start','duration','anchor']},'label':s['description'],'timeOfDay':'evening'} for s in shots])
save('episode.json',episode)

# Preserve the series music's fixed gain over a longer local excerpt.
music_source=ROOT/spec['music']['source'];gain=spec['music'].get('gainDb',0)
run(['ffmpeg','-v','error','-y','-i',str(music_source),'-af',f'atrim=end_sample={N},volume={gain}dB,afade=t=in:d=0.005,afade=t=out:st={D-.005}:d=0.005','-ar',str(R),'-ac','2',str(P/'music.wav')])
save('music-review.json',{'source':str(music_source.relative_to(ROOT)),'provenance':spec['music']['provenance'],'mode':'One constant gain, matching the earlier series mix.','gainDb':gain,'duration':D,'ducking':False,'edgeTaperMilliseconds':5})
ledger=json.loads((ROOT/'episodes/billionaire-body-swap/assets/sfx-ledger.json').read_text())
fxdir=P/'sfx';fxdir.mkdir(exist_ok=True);fx=np.zeros(N);sounds={};used=[];events=[]
for key in ['snap','swoosh','folder','tap','plate','door','money']:
    row=next(x for x in ledger if x['id']==key);src=ROOT/row['localFile'];dst=fxdir/src.name;shutil.copy2(src,dst)
    sounds[key]=pcm(dst);used.append({**row,'localFile':str(dst.relative_to(ROOT)),'copiedFrom':str(src.relative_to(ROOT))})
def cue(name,key,at,length,peak):
    at=max(0,at);size=min(round(length*R),len(sounds[key]),N-round(at*R));assert size>0
    clip=sounds[key][:size].copy();clip*=peak/max(.001,float(np.max(np.abs(clip))))
    edge=min(round(.008*R),size//2);clip[:edge]*=np.linspace(0,1,edge);clip[-edge:]*=np.linspace(1,0,edge)
    n=round(at*R);fx[n:n+size]+=clip;events.append(dict(id=name,source=key,start=at,duration=size/R,peakGain=peak))
cue('opening-hand-movement','swoosh',0,.28,.065)
cue('withheld-hand-cut','plate',e['refuse'],.27,.045)
cue('mum-approach','swoosh',e['finished'],.24,.035)
for name,key,at,length,peak in [('book','folder',e['homeworkHit'],.35,.09),('plates','plate',e['dishesHit'],.36,.075),('bin','door',e['binsHit'],.26,.065)]:
    cue(name+'-impact',key,at,length,peak)
for sid in ['homework','dishes','bins','pay','house','staff','plates_reply','lawyer','pocket_setup','pocket','coffee','coffee_detail','washing','offer','exam','reaction']:
    cue(sid+'-cut','swoosh',next(s['start'] for s in shots if s['id']==sid),.18,.024)
cue('firm-point','tap',e['house']+.20,.12,.045)
cue('empty-hand-offer','swoosh',e['offer'],.30,.04)
cue('refusal-step','swoosh',e['keep'],.22,.035)
cue('maths-paper','folder',e['maths']+.08,.32,.055)
for i in range(4):cue(f'pound-{i+1}-impact','tap',e['pocketHit']+i*.07,.12,.055)
cue('pocket-money-chime','money',e['pocketHit']+.21,.35,.04)
wav(P/'effects.wav',fx);save('audio-events.json',events);save('assets/sfx-ledger.json',used)
run(['ffmpeg','-v','error','-y','-i',str(P/'narration.wav'),'-i',str(P/'music.wav'),'-i',str(P/'effects.wav'),'-filter_complex','[2:a]pan=stereo|c0=c0|c1=c0[f];[0:a][1:a][f]amix=inputs=3:duration=longest:normalize=0[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'delivery-mix.wav')])
print(json.dumps({'duration':D,'frames':round(D*FPS),'words':len(caps),'shots':len(shots),'events':e},indent=2))
