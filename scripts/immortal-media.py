"""Build the sample from exact selected takes, then derive acting and shot cues."""
from pathlib import Path
import json, math, re
import numpy as np
from dialogue_media import assemble, pcm, wav, run, ROOT, R, normal

SLUG='immortal'; B=ROOT/'episodes'/SLUG; P=ROOT/'public/episodes'/SLUG
script=json.loads((B/'script-v1.json').read_text())
beats=[b for chapter in script['chapters'][:2] for b in chapter['beats']]
raw=json.loads((B/'transcripts-sample-raw.json').read_text())
voices={}
for source in raw:
    role=source['role']; t=source['transcript']
    t={k:t[k] for k in ['generation_id','language_code','text','words','word_count','spoken_duration_secs'] if k in t}
    source['transcript']=t
    skipped=0
    for w in t['words']:
        if re.fullmatch(r'\[[^]]+\]',w['text']): skipped+=1
        else: break
    file=f'{role}-words.json'
    (B/file).write_text(json.dumps({'sourceTake':1,'sourceFile':f'public/episodes/immortal/source-{role}-take-1.mp3','words':t['words']},indent=2)+'\n')
    voices[role]={'take':1,'words':file,'sourceTrimStart':0,'skipLeadingTranscriptTokens':skipped,'preserveLeadingAudio':True}
(B/'transcripts-sample-raw.json').write_text(json.dumps(raw,indent=2)+'\n')
lines=[{'id':b['id'],'speaker':b['speaker'],'text':b['text'],'afterPause': .10 if b['id'] not in ['a02','d04','d10','d13','d14'] else {'a02':.20,'d04':.20,'d10':.17,'d13':.18,'d14':.80}[b['id']]} for b in beats]
spec={'id':SLUG,'revision':1,'fps':30,'narrationSpeed':1,'voices':voices,'lines':lines,'musicFadeSeconds':2.5,'captionReplacements':{}}
(B/'dialogue.json').write_text(json.dumps(spec,indent=2)+'\n')
full=B/'narration-full-draft.txt'
if not full.exists(): full.write_text((B/'narration.txt').read_text())
(B/'narration.txt').write_text('\n\n'.join(b['text'] for b in beats)+'\n')
spec,timeline,narration=assemble(SLUG)
L={x['id']:x for x in timeline['lines']}
def word(line,token):
    return next(w['start'] for w in L[line]['words'] if normal(w['text'])==normal(token))
def start(line):return L[line]['start']
D=timeline['duration'];N=round(D*R)
planned=[
 ('scanner',0,'immortal-airport','scan','Sir','The portrait comparison is visible as a moving tray trips the scanner red.'),
 ('portrait',max(.8,word('a01','painting')-.45),'immortal-airport','reveal','From 1650','A closer angle makes the matching portrait and its date unmistakable.'),
 ('excuse',start('a02'),'immortal-airport','puzzle','Would you believe','Norbert tries the twin excuse.'),
 ('officer',start('a03'),'immortal-airport','warn','The painting is','The officer points to the museum record.'),
 ('rock-belt',start('a04'),'immortal-airport','catch','Norbert had survived','The rock travels off the conveyor into his waiting palm.'),
 ('explain',start('a05'),'immortal-airport','turn','Okay','He turns to camera; the roller motivates a rewind.'),
 ('farm-wide',start('d01'),'immortal-farm','harvest','Ravenna Italy','Establish the farm as a turnip drops into the basket.'),
 ('farm-age',word('d01','Norbert'),'immortal-farm','turn','Norbert is 22','A closer look at the young traveller before returning to work.'),
 ('farm-work',word('d01','farming'),'immortal-farm','harvest','farming with','One braced pull frees a stubborn turnip.'),
 ('messenger',start('d02'),'immortal-farm','step',"They've overthrown",'A messenger crosses the path while shouting.'),
 ('turnips',start('d03'),'immortal-farm','puzzle','Is that bad','Marcus checks the news; Norbert checks the turnips.'),
 ('cart',start('d05'),'immortal-farm','catch','The turnips survive','A harvested turnip lands in a wicker basket.'),
 ('chase',word('d05','night'),'immortal-forest','chase','That night','Norbert hears a wolf and runs toward the lit hut.'),
 ('door',word('d05','straight'),'immortal-hut','stop','straight into','He bursts into the room and stops as the door slams behind him.'),
 ('witch',start('d06'),'immortal-hut','meet',"You're terrified",'The familiar witch turns toward him with a knowing look.'),
 ('age-joke',start('d07'),'immortal-hut','puzzle',"I'm 22",'Norbert catches his breath and attempts the joke.'),
 ('age-context',start('d08'),'immortal-farm','harvest',"He isn't actually",'An older farmer handles a basket comfortably and adjusts his grip.'),
 ('wolf-door',word('d08','wolf'),'immortal-forest','warn','But the wolf','The wolf sniffs at the firmly latched door.'),
 ('contract',start('d09'),'immortal-hut','reveal','I can fix','The witch offers the scroll; the camera reveals its physical depth.'),
 ('terms',word('d09','when'),'immortal-hut','choose','when you least','Norbert listens while the witch explains the terms.'),
 ('question',word('d09','Had'),'immortal-hut','choose','Had enough','She asks the question and waits for his attention.'),
 ('signature',start('d10'),'immortal-hut','sign','I will never','Norbert signs once, much too confidently.'),
 ('healing',start('d11'),'immortal-hut','treat','No ageing','A small scratch closes in the warm lamp light.'),
 ('fees',word('d11','checks'),'immortal-hut','archive','He checks for','He raises the fine print toward the candle.'),
 ('handoff',start('d12'),'immortal-hut','handoff','For company','The witch puts the rock into his hand.'),
 ('listener',start('d14'),'immortal-hut','handoff',"It's a good",'The handoff settles while the joke lands.')
]
shots=[]
for i,(sid,at,place,action,anchor,description) in enumerate(planned):
    begin=round(at*30)/30;finish=round(planned[i+1][1]*30)/30 if i+1<len(planned) else D
    if finish<=begin:raise RuntimeError(f'Shot order failure: {sid}')
    shots.append({'id':sid,'start':begin,'duration':finish-begin,'set':place,'action':action,'anchor':anchor,'description':description})
events={'portrait':shots[1]['start'],'excuse':start('a02'),'farm':start('d01'),'harvest':word('d01','farming'),'messenger':start('d02'),'wolf':word('d05','wolf'),'door':next(s['start'] for s in shots if s['id']=='door')+.75,'contract':start('d09'),'question':word('d09','Had'),'sign':start('d10')+.24,'heal':word('d11','wounds')-.25,'handoff':start('d12')}
timeline.update({'title':'What If You Were Immortal? · opening sample','width':1920,'height':1080,'revision':1,'events':events,'shots':shots,'captionWords':[3,6]})
(B/'timeline.json').write_text(json.dumps(timeline,indent=2)+'\n')
episode={'version':1,'id':SLUG,'number':12,'title':'What If You Were Immortal?','premise':'Opening sample: a fictional immortal is recognised from a 1650 portrait and recalls his deal with a witch in 476.','fiction':True,'renderer':'hyperframes','world':'immortal','hook':'none','pixelArt':'rpg','closingFade':False,'duration':D,'aspectRatio':'16:9','fps':30,'shadowLeadSeconds':0,'cast':['miko','witch','marcus'],'audio':{'narration':'episodes/immortal/narration.wav','music':'episodes/immortal/music.wav','effects':'episodes/immortal/effects.wav','narrationOffset':0,'narrationTail':.8,'narrationTrimStart':0,'pauses':[]},'scenes':[{**{k:s[k] for k in ['id','start','duration','set','action','anchor']},'label':s['description'],'timeOfDay':'evening'} for s in shots]}
(B/'episode.json').write_text(json.dumps(episode,indent=2)+'\n')

# Deterministic ambience and action accents, backed by our saved generated Foley.
fx=np.zeros(N);ledger=[];rng=np.random.default_rng(476)
def add(audio,at,gain=1,fade=.012):
    a=audio.copy()*gain;f=min(round(fade*R),len(a)//2)
    if f:a[:f]*=np.linspace(0,1,f);a[-f:]*=np.linspace(1,0,f)
    lo=round(at*R);hi=min(N,lo+len(a))
    if lo<0:a=a[-lo:];lo=0
    if hi>lo:fx[lo:hi]+=a[:hi-lo]
def noise(seconds,gain=.03):
    a=rng.normal(0,1,round(seconds*R));return np.convolve(a,np.ones(24)/24,mode='same')*gain
def tone(at,hz,seconds,gain=.045):
    x=np.arange(round(seconds*R))/R;a=(np.sin(2*np.pi*hz*x)+.18*np.sin(4*np.pi*hz*x))*np.minimum(1,x/.006)*np.exp(-x*17)*gain
    add(a,at);ledger.append({'synth':'damped tone','at':at,'frequency':hz,'duration':seconds})
def foley(file,at,seconds,gain=.18,offset=0):
    a=pcm(file)[round(offset*R):round((offset+seconds)*R)]
    if len(a):a*=.1/max(.001,float(np.sqrt(np.mean(a*a))))
    add(a,at,gain);ledger.append({'file':str(file.relative_to(ROOT)),'at':at,'duration':seconds,'gain':gain,'sourceOffset':offset})
add(noise(D,.006),0)
for at in [0,.28]:tone(at,660,.11,.065)
tone(events['portrait']+.04,220,.2,.033)
paper=ROOT/'public/episodes/girlfriend-spy-test/sfx/clipboard.mp3'
exit_sound=ROOT/'public/episodes/girlfriend-spy-test/sfx/exit.mp3'
magic=ROOT/'public/episodes/happens-for-a-reason/sfx/magic.mp3'
foley(paper,events['portrait'],.22,.18,.7)
foley(exit_sound,events['farm']-.16,.35,.25,.05)
for at in [events['farm']+.3,events['harvest']+1.1,start('d05')+.55]:
    add(noise(.15,.15)*np.exp(-np.arange(round(.15*R))/R*18),at)
    tone(at,110,.15,.045)
for at in np.arange(events['wolf'],events['door'],.24):
    tone(float(at),85,.09,.042);add(noise(.045,.13),float(at))
wolf_foley=P/'source-sfx-wolf.mp3'
door_foley=P/'source-sfx-door.mp3'
if wolf_foley.exists():
    foley(wolf_foley,events['wolf']-.15,2,.42)
    wolf_shot=next(s for s in shots if s['id']=='wolf-door')
    foley(wolf_foley,wolf_shot['start']+.15,1.8,.28)
if door_foley.exists():foley(door_foley,events['door']-.25,1.2,.65)
else:foley(exit_sound,events['door'],.45,.48,.7)
foley(paper,events['contract']+.3,.7,.28,.1)
foley(paper,events['sign'],.72,.30,.7)
foley(magic,events['heal'],.7,.15,.25)
tone(events['handoff']+.8,280,.09,.03)
for s in shots[1:]:
    if s['id'] not in ['door','portrait','farm-wide']:foley(paper,s['start'],.06,.045,.9)
wav(P/'effects-raw.wav',fx)
run(['ffmpeg','-v','error','-y','-i',str(P/'effects-raw.wav'),'-i',str(P/'narration.wav'),'-filter_complex',f'[0:a][1:a]sidechaincompress=threshold=.12:ratio=2:attack=3:release=100,apad=whole_len={N},atrim=end_sample={N}[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'effects.wav')])
score=P/'source-music-take-1.mp3'
run(['ffmpeg','-v','error','-y','-i',str(score),'-af',f'atrim=duration={D},asetpts=PTS-STARTPTS,loudnorm=I=-27:TP=-6:LRA=7,aresample=48000,apad=whole_len={N},atrim=end_sample={N},afade=t=in:d=0.05,afade=t=out:st={D-2.5}:d=2.5:curve=qsin','-ar',str(R),'-ac','2',str(P/'music-selected.wav')])
run(['ffmpeg','-v','error','-y','-i',str(P/'music-selected.wav'),'-i',str(P/'narration.wav'),'-filter_complex',f'[0:a][1:a]sidechaincompress=threshold=.08:ratio=3.5:attack=6:release=180,apad=whole_len={N},atrim=end_sample={N}[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'music.wav')])
run(['ffmpeg','-v','error','-y','-i',str(P/'narration.wav'),'-i',str(P/'music.wav'),'-i',str(P/'effects.wav'),'-filter_complex','[0:a][1:a][2:a]amix=inputs=3:normalize=0,alimiter=limit=.86:level=false[o]','-map','[o]','-ar','48000','-ac','2',str(P/'delivery-mix.wav')])
(B/'audio-events.json').write_text(json.dumps(ledger,indent=2)+'\n')
print(json.dumps({'duration':D,'frames':round(D*30),'shots':len(shots),'words':sum(len(x['words']) for x in timeline['lines']),'events':events},indent=2))
