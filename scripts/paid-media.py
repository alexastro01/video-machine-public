"""Exact-take dialogue, the fixed deadline, progressive captions and local sound."""
from pathlib import Path
import json, math, re
import numpy as np
from dialogue_media import ROOT, R, pcm, wav, run

SLUG='paid-for-lying'; B=ROOT/'episodes'/SLUG; P=ROOT/'public/episodes'/SLUG
spec=json.loads((B/'dialogue.json').read_text())
normalize=lambda s: re.sub('[^a-z0-9]','',s.lower()).replace('10','ten').replace('5','five')
sources={}; chunks={}; lines={}; edits=[]
for speaker,voice in spec['voices'].items():
    source=P/voice['source']; raw=json.loads((B/'voices'/voice['words']).read_text())
    words=[{**w,'text':w.get('word',w.get('text',''))} for w in raw['words']]
    expected=[w for line in spec['lines'] if line['speaker']==speaker for w in line['text'].split()]
    if len(words)!=len(expected) or any(normalize(w['text'])!=normalize(t) for w,t in zip(words,expected)):
        raise RuntimeError(f'{speaker}: selected take differs from script: {raw["text"]}')
    samples=pcm(source);cursor=0
    for line in [l for l in spec['lines'] if l['speaker']==speaker]:
        count=len(line['text'].split()); selected=words[cursor:cursor+count]
        first,last=selected[0]['start'],selected[-1]['end']
        prior=words[cursor-1]['end'] if cursor else 0
        later=words[cursor+count]['start'] if cursor+count<len(words) else len(samples)/R
        start=0 if cursor==0 else max(prior,(prior+first)/2)
        finish=len(samples)/R if cursor+count==len(words) else min(later,(last+later)/2)
        # Keep both transcript boundaries and audible low-level syllables. Only
        # remove long quiet handles; amplitude alone never defines a word cut.
        start=min(start,max(0,first-.075))
        finish=max(finish,min(len(samples)/R,last+.075))
        audio=samples[round(start*R):round(finish*R)].copy()
        relative=[{'text':text,'start':max(0,w['start']-start),'end':min(len(audio)/R,max(w['end']-start,w['start']-start+.018))}
                  for w,text in zip(selected,line['text'].split())]
        chunks[line['id']]={'audio':audio,'words':relative,'duration':len(audio)/R,'sourceStart':start,'sourceEnd':finish,'source':str(source.relative_to(ROOT)),'rate':1.0}
        cursor+=count

# Fit all three proofs and their cash arrivals inside seven seconds. Only the
# opening takes may receive a measured small speed adjustment, never the film.
opening=['premise','mondays','exams','debt']
total=sum(chunks[k]['duration'] for k in opening)
rate=max(1,total/5.95)
if rate>1.2: raise RuntimeError(f'Opening needs a clearer faster performance: {rate:.3f}x')
if rate>1.005:
    for key in opening:
        c=chunks[key];tmp=P/f'{key}-before-speed.wav';target=P/f'{key}-opening-speed.wav'
        wav(tmp,c['audio']);run(['ffmpeg','-v','error','-y','-i',str(tmp),'-af',f'atempo={rate}','-ar',str(R),str(target)])
        c['audio']=pcm(target);c['duration']=len(c['audio'])/R;c['rate']=rate
        for word in c['words']:word['start']/=rate;word['end']/=rate

def place(key,at):
    c=chunks[key];line=next(x for x in spec['lines'] if x['id']==key)
    at=round(at*30)/30
    row={**line,'start':at,'end':at+c['duration'],'duration':c['duration'],
         'words':[{**w,'start':round(at+w['start'],6),'end':round(min(at+c['duration'],at+w['end']),6),'speaker':line['speaker'],'line':key} for w in c['words']]}
    lines[key]=row;return row['end']

cursor=0
for key in opening:cursor=place(key,cursor)+.10
cash3=lines['debt']['words'][-1]['end']+.025
if cash3+.48>7:raise RuntimeError('Third payout cannot finish inside opening seven seconds')
cursor=place('rule',7.0)+.32
cursor=place('buy',cursor)+.18
cursor=place('card',cursor)+.40
cursor=place('rush',cursor)

def word(key,token):
    return next(w['start'] for w in lines[key]['words'] if normalize(w['text'])==normalize(token))
ten=word('rush','ten'); deadline=ten+10.0
place('change',cursor+.20)
lastCash=deadline-.78
thanksStart=lastCash-.025-chunks['thanks']['duration']
place('thanks',thanksStart)
place('compliment',thanksStart-.18-chunks['compliment']['duration'])
transfer=lines['change']['words'][-1]['end']-.04
empty=transfer+14*.075+.42
reliefStart=max(empty+.12,lines['compliment']['start']-chunks['relief']['duration']-.35)
place('relief',reliefStart)
if lines['relief']['end']+.12>lines['compliment']['start']:
    raise RuntimeError('Relief and compliment need a complete dialogue handoff')
place('wait',lastCash+.10)
place('mum',max(deadline+.32,lines['wait']['end']+.22))
D=math.ceil((lines['mum']['end']+1.10)*30)/30;N=round(D*R)
narration=np.zeros(N);captions=[]
ordered=sorted(lines.values(),key=lambda x:x['start'])
for i,line in enumerate(ordered):
    c=chunks[line['id']];audio=c['audio'].copy()
    if i and line['start']<ordered[i-1]['end']+.04:raise RuntimeError(f'Overlapping dialogue: {line["id"]}')
    edge=min(round(.004*R),len(audio)//2)
    if edge:audio[:edge]*=np.linspace(0,1,edge);audio[-edge:]*=np.linspace(1,0,edge)
    rms=float(np.sqrt(np.mean(audio**2)));audio*=min(3,.13/max(.001,rms))
    at=round(line['start']*R);narration[at:at+len(audio)]+=audio
    for w in line['words']:
        text=w['text'];text=re.sub(r'\bfive\b','5',text,flags=re.I);text=re.sub(r'\bten\b','10',text,flags=re.I)
        captions.append({'text':text,'startMs':round(w['start']*1000),'endMs':round(w['end']*1000),'timestampMs':round(w['start']*1000),'confidence':None})
    edits.append({'line':line['id'],'source':c['source'],'sourceStart':c['sourceStart'],'sourceEnd':c['sourceEnd'],'outputStart':line['start'],'outputEnd':line['end'],'playbackRate':c['rate'],'trimBasis':'word boundaries with surrounding quiet handles; no amplitude-only word trimming'})
wav(P/'narration-raw.wav',narration)
run(['ffmpeg','-v','error','-y','-i',str(P/'narration-raw.wav'),'-af','loudnorm=I=-16:TP=-2:LRA=8,aresample=48000','-ar',str(R),'-ac','2',str(P/'narration.wav')])
events={
    'mondays':lines['mondays']['start'],'exams':lines['exams']['start'],'debt':lines['debt']['start'],
    **{f'cash{i+1}':lines[k]['words'][-1]['end']+.025 for i,k in enumerate(['mondays','exams','debt'])},
    'rule':7.0,'leave':word('rule','Leave'),'buy':lines['buy']['start'],
    'card':lines['card']['start'],'run':lines['rush']['start'],
    'arrival':word('rush','cash')-.30,'tenSeconds':ten,'deadline':deadline,
    'change':lines['change']['start'],'transfer':transfer,'empty':empty,'relief':lines['relief']['start'],
    'compliment':lines['compliment']['start'],'thanks':lines['thanks']['start'],
    'lastCash':lastCash,'phone':deadline+.55,'mum':lines['mum']['start'],
}
definitions=[
('promise',0,'liar-home','reveal','You get paid','Miko and a moving hero banknote establish the money premise.'),
('mondays',events['mondays'],'liar-home','catch','I love Mondays','First false boast; first five notes arrive on the desk.'),
('exams',events['exams'],'liar-home','catch','I passed my exams','Second payout stacks on the first; the failed paper is exposed.'),
('debt',events['debt'],'liar-home','catch','I have no debt','Third payout grows the same pile beside an overdue bill.'),
('clock',7,'liar-home','warn','But spend','A close view brings the same phone countdown into focus.'),
('catch',events['leave'],'liar-home','warn','Leave any','Miko looks between the cash and the approaching consequence.'),
('buy',events['buy'],'liar-electronics','trade',"I'll take it",'He puts cash next to a handheld console at the electronics till.'),
('card',events['card'],'liar-electronics','stop','Card only','The clerk gestures to the card terminal; Miko has unusable cash.'),
('run',events['run'],'liar-street','chase','By the time','Miko runs right with a grounded stride and the same money in his bag.'),
('arrival',events['arrival'],'liar-shop','handoff','cash','He reaches a second till as the remaining time becomes 10 seconds.'),
('ten-clock',math.ceil(ten*30)/30,'liar-shop','warn','ten','A readable close view of 00:10 establishes the final real-time countdown.'),
('change',events['change'],'liar-shop','handoff','Keep the change','The drawer opens and all fifteen original notes move into it.'),
('relief',events['relief'],'liar-shop','recover',"That's all",'Empty hands, a receipt and the relief line establish apparent success.'),
('compliment',events['compliment'],'liar-shop','meet','Nice scarf','The friendly cashier speaks; Miko glances at the lopsided haircut.'),
('thanks',events['thanks'],'liar-shop','wave','Thanks','His automatic false compliment creates a new obligation.'),
('last-note',lastCash,'liar-shop','catch','Love your haircut','The familiar cash hit returns; he tries to pass the new note forward.'),
('expiry',deadline,'liar-shop','stop','No, wait','Zero arrives before the handoff; the banknote remains in his hand.'),
('phone',deadline+.17,'liar-shop','warn','You FAILED','The phone changes from the spent clock to an incoming call from Mum.'),
('reaction',lines['mum']['start']+.65,'liar-shop','recover','your exams','Mum exposes the failed exam; the cashier touches their haircut.'),
]
shots=[]
for i,(sid,at,set_name,action,anchor,description) in enumerate(definitions):
    start=round(at*30)/30;end=round(definitions[i+1][1]*30)/30 if i+1<len(definitions) else D
    if end<=start:raise RuntimeError(f'Empty shot {sid}')
    shots.append({'id':sid,'start':start,'duration':end-start,'set':set_name,'action':action,'anchor':anchor,'description':description})
plan={'id':SLUG,'title':'What If You Got Paid for Lying?','width':1080,'height':1920,'fps':30,'duration':D,'events':events,'lines':ordered,'shots':shots,'openingPayoutsComplete':cash3+.48,'openingPlaybackRate':rate}
(B/'timeline.json').write_text(json.dumps(plan,indent=2)+'\n')
(B/'captions.json').write_text(json.dumps(captions,indent=2)+'\n')
(B/'transcript-source.json').write_text(json.dumps({'sourceTake':1,'words':[w for l in ordered for w in l['words']]},indent=2)+'\n')
(B/'audio-edit.json').write_text(json.dumps(edits,indent=2)+'\n')
(B/'narration.txt').write_text('\n\n'.join(l['text'] for l in ordered)+'\n')
episode=json.loads((B/'episode.json').read_text())
episode.update({'renderer':'hyperframes','world':'lying-money','hook':'none','pixelArt':'rpg','closingFade':False,'title':plan['title'],'premise':'Miko earns cash by lying, races a fixed five-minute deadline, and gives one last false compliment before time expires.','fiction':True,'duration':D,'fps':30,'aspectRatio':'9:16','shadowLeadSeconds':0,'cast':['miko','cashier'],'audio':{'narration':f'episodes/{SLUG}/narration.wav','music':f'episodes/{SLUG}/music.wav','effects':f'episodes/{SLUG}/effects.wav','narrationOffset':0,'narrationTail':1.1,'narrationTrimStart':0,'pauses':[]},'scenes':[{**{k:s[k] for k in ['id','set','action','start','duration','anchor']},'label':s['description'],'timeOfDay':'evening'} for s in shots]})
(B/'episode.json').write_text(json.dumps(episode,indent=2)+'\n')

# Original generated spy score, reused with a smooth overlap if the new film
# extends beyond it. The last seconds resolve beneath the final reaction.
music_source=ROOT/spec['music']['source'];src=pcm(music_source)
if len(src)<N:
    cross=round(1.2*R); extension=np.concatenate([src[:-cross],src[-cross:]*np.linspace(1,0,cross)+src[:cross]*np.linspace(0,1,cross),src[cross:]])
    while len(extension)<N:extension=np.concatenate([extension,src])
    src=extension
wav(P/'music-source-edit.wav',src[:N])
run(['ffmpeg','-v','error','-y','-i',str(P/'music-source-edit.wav'),'-af',f'loudnorm=I={spec["music"]["lufs"]}:TP=-6:LRA=7,aresample=48000,afade=t=in:d=0.025,afade=t=out:st={D-2.2}:d=2.2:curve=qsin','-ar',str(R),'-ac','2',str(P/'music.wav')])
fx=np.zeros(N);ledger=[]
def put(file,at,gain=.8,length=None,offset=0):
    a=pcm(file)[round(offset*R):]
    if length:a=a[:round(length*R)]
    if not len(a):return
    a*=.10/max(.001,float(np.sqrt(np.mean(a*a))))*gain
    edge=min(round(.009*R),len(a)//2);a[:edge]*=np.linspace(0,1,edge);a[-edge:]*=np.linspace(1,0,edge)
    start=round(at*R);lo=max(0,start);hi=min(N,start+len(a))
    if hi>lo:fx[lo:hi]+=a[lo-start:hi-start]
    ledger.append({'file':str(file.relative_to(ROOT)),'start':at,'duration':max(0,(hi-lo)/R),'gain':gain,'sourceOffset':offset})
cash=P/'sfx/cash.mp3';paper=ROOT/'public/episodes/girlfriend-spy-test/sfx/clipboard.mp3';sweep=ROOT/'public/episodes/girlfriend-spy-test/sfx/exit.mp3'
put(sweep,0,.18,.18)
for i,k in enumerate(['cash1','cash2','cash3','lastCash']):
    put(cash,events[k],.78 if i<3 else .94,.85)
    put(paper,events[k]+.06,.22,.25,.55)
for shot in shots[1:]:
    if shot['id'] not in ['last-note','expiry','phone','reaction']:put(paper,shot['start'],.09,.06,.9)
put(paper,events['card']+.35,.30,.12,.9)
for i in range(6):put(paper,events['run']+i*.32,.22,.065,.85)
put(paper,transfer,.32,.30,.55)
put(cash,empty+.16,.25,.38)
put(paper,events['lastCash']+.26,.25,.15,.8)
put(ROOT/'public/episodes/girlfriend-spy-test/sfx/alarm.mp3',deadline,.35,.30,.1)
put(ROOT/'public/episodes/inventions-since-2000/sfx/phone.mp3',events['phone'],.46,.45)
wav(P/'effects-raw.wav',fx)
run(['ffmpeg','-v','error','-y','-i',str(P/'effects-raw.wav'),'-i',str(P/'narration.wav'),'-filter_complex',f'[0:a][1:a]sidechaincompress=threshold=.10:ratio=2.6:attack=2:release=75,apad=whole_len={N},atrim=end_sample={N}[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'effects.wav')])
run(['ffmpeg','-v','error','-y','-i',str(P/'narration.wav'),'-i',str(P/'music.wav'),'-i',str(P/'effects.wav'),'-filter_complex','[0:a][1:a][2:a]amix=inputs=3:normalize=0,alimiter=limit=.86:level=false[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'delivery-mix.wav')])
(B/'audio-events.json').write_text(json.dumps(ledger,indent=2)+'\n')
(B/'audio-sources.json').write_text(json.dumps({'voices':spec['voices'],'music':spec['music'],'openingPlaybackRate':rate,'globalNarrationSpeed':1,'review':'Exact take transcriptions, waveform handles and levels checked; not auditioned.'},indent=2)+'\n')
print(json.dumps({'duration':D,'frames':round(D*30),'openingPayoutsComplete':cash3+.48,'openingPlaybackRate':rate,'lines':len(ordered),'words':len(captions),'events':events},indent=2))
