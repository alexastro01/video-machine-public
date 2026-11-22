"""Assemble exact-take character dialogue, word timings and story-matched sound."""
from pathlib import Path
import json, math, re, subprocess, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
B = ROOT/'episodes/happens-for-a-reason'
P = ROOT/'public/episodes/happens-for-a-reason'
P.mkdir(parents=True, exist_ok=True)
SPEC = json.loads((B/'dialogue.json').read_text())
R = 48000
RATE = SPEC['narrationSpeed']


def run(args):
    result = subprocess.run(args, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors='replace')[-5000:])
    return result.stdout


def pcm(file):
    return np.frombuffer(run(['ffmpeg','-v','error','-i',str(file),'-f','f32le','-ac','1','-ar',str(R),'-']), '<f4').copy()


def wav(file, audio):
    with wave.open(str(file), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(R)
        f.writeframes((np.clip(audio,-.98,.98)*32767).astype('<i2').tobytes())


def normal(s):
    return re.sub('[^a-z0-9]', '', s.lower())


sources = {}
for speaker in ['miko','witch']:
    voice = SPEC.get('voices',{}).get(speaker, {'take':1, 'words':f'{speaker}-words.json'})
    source = P/f'source-{speaker}-take-{voice["take"]}.mp3'
    samples = pcm(source)
    words = json.loads((B/voice['words']).read_text())['words']
    expected = [w for line in SPEC['lines'] if line['speaker']==speaker for w in line['text'].split()]
    if len(words)!=len(expected):
        raise RuntimeError(f'{speaker}: expected {len(expected)} tokens, ASR returned {len(words)}')
    corrections=[]
    for word, text in zip(words, expected):
        if normal(word['text'])!=normal(text):
            if (normal(word['text']), normal(text))!=('faith','fate'):
                raise RuntimeError(f'{speaker}: unexpected transcript mismatch {word["text"]} / {text}')
            corrections.append({'asr':word['text'],'caption':text,'reason':'Homophone corrected to the supplied spoken script.'})
        word['text']=text
    sources[speaker]={'file':str(source.relative_to(ROOT)),'samples':samples,'words':words,'cursor':0,'corrections':corrections}

lines, edited, captions, edits = [], [], [], []
cursor=0.0
for index, line in enumerate(SPEC['lines']):
    source=sources[line['speaker']]; count=len(line['text'].split()); offset=source['cursor']
    words=source['words'][offset:offset+count]; source['cursor']+=count
    first, last=words[0]['start'],words[-1]['end']
    prior=source['words'][offset-1]['end'] if offset else 0
    next_start=source['words'][offset+count]['start'] if offset+count<len(source['words']) else len(source['samples'])/R
    lo=(prior+first)/2 if offset else 0
    hi=(last+next_start)/2
    chunk=source['samples'][round(lo*R):round(hi*R)]
    # Find actual waveform edges inside the between-utterance boundaries. Keep
    # a small pad so a late first-word timestamp cannot clip the first syllable.
    active=np.flatnonzero(np.abs(chunk)>.0032)
    if not len(active):raise RuntimeError('Silent character line')
    a=max(0,int(active[0])-round(.009*R));z=min(len(chunk),int(active[-1])+round(.045*R))
    start=lo+a/R;end=lo+z/R
    clip=P/f'line-{index:02d}-source.wav';wav(clip,chunk[a:z])
    target=P/f'line-{index:02d}.wav'
    run(['ffmpeg','-v','error','-y','-i',str(clip),'-af',f'atempo={RATE}','-ar',str(R),'-ac','1',str(target)])
    audio=pcm(target);duration=len(audio)/R
    # Normalize the two performances to a comparable dialogue level.
    rms=float(np.sqrt(np.mean(audio**2)));audio*=min(2.5,.13/max(.001,rms))
    row={**line,'start':cursor,'end':cursor+duration,'duration':duration,'words':[]}
    for word in words:
        at=cursor+max(0,(word['start']-start)/RATE)
        finish=min(cursor+duration,cursor+max(.012,(word['end']-start)/RATE))
        if finish<=at:finish=min(cursor+duration,at+.025)
        item={'text':word['text'],'start':round(at,6),'end':round(finish,6),'speaker':line['speaker'],'line':line['id']}
        row['words'].append(item)
        captions.append({'text':word['text'],'startMs':round(at*1000),'endMs':round(finish*1000),'timestampMs':round(at*1000),'confidence':None})
    lines.append(row);edited.append(audio);pause=float(line['afterPause'])
    edited.append(np.zeros(round(pause*R)))
    edits.append({'line':line['id'],'speaker':line['speaker'],'sourceStart':start,'sourceEnd':end,'outputStart':cursor,'outputEnd':cursor+duration,'speed':RATE})
    cursor+=duration+pause

D=math.ceil(cursor*30)/30
N=round(D*R)
narration=np.pad(np.concatenate(edited),(0,max(0,N-sum(len(a) for a in edited))))[:N]
wav(P/'narration-raw.wav',narration)
run(['ffmpeg','-v','error','-y','-i',str(P/'narration-raw.wav'),'-af','loudnorm=I=-16:TP=-2:LRA=8','-ar',str(R),'-ac','2',str(P/'narration.wav')])

L={line['id']:line for line in lines}
def word(line, token):
    return next(w['start'] for w in L[line]['words'] if normal(w['text'])==normal(token))
events={
    'witchAppear':L['fate']['start']-.18,
    'wand':max(L['hope']['start'],L['hope']['end']-.85),
    'bookAppear':L['hope']['end']-.15,
    'bookOpen':L['hope']['end']+.08,
    'empty':L['hope']['end']+.38,
    'brain':word('patterns','After')-.08,
    'cloud':word('patterns','faces')-.10,
    'face':word('patterns','clouds')-.12,
    'connections':word('patterns','patterns')-.08,
    'noPattern':word('patterns',"aren't")-.05,
    'bus':L['everyone']['end']+.04,
    'girlSmile':L['everyone']['end']+.09,
    'eyeRoll':L['tag']['start']+.14,
    'loop':D-.18,
}

shot_specs=[
    ('missed-bus',0,'fate-street','stop','Why does this','A bus sweeps away through rain; Miko reaches after it.'),
    ('witch',L['fate']['start']-.03,'fate-street','reveal','Because everything','Smoke gathers beside Miko and reveals the witch.'),
    ('hope',L['hope']['start']-.03,'fate-street','puzzle','Really','Miko leans toward the witch with a hopeful expression.'),
    ('empty-book',L['hope']['end']-.12,'fate-book','archive','reason','The book enters, opens and reveals two completely blank pages.'),
    ('excuse',L['empty']['start']-.03,'fate-street','puzzle','Excuse me','Close reaction to the empty book, with the witch beside it.'),
    ('answer',L['afterwards']['start']-.03,'fate-street','reveal','You write','The witch presents the empty book to Miko.'),
    ('brain',events['brain'],'fate-mind','scan','After all','The book folds inward and gives way to a glowing brain as the explanation continues.'),
    ('clouds',events['cloud'],'fate-clouds','specimen','faces','A natural cloud drifts past; a brief profile trace suggests a face, then fades.'),
    ('patterns',word('patterns','It')-.04,'fate-clouds','scan','It finds','Dots briefly connect like a constellation; the lines release back into unrelated points.'),
    ('even-me',L['even-me']['start']-.03,'fate-street','puzzle','Even me','Miko questions the explanation, looking directly toward the witch.'),
    ('everyone',L['everyone']['start']-.03,'fate-street','reveal','Even people','The witch gives a calm answer and a knowing glance.'),
    ('bus',events['bus'],'fate-bus','meet','Okay','Warm bus interior; the girl turns and smiles before Miko draws his conclusion.'),
    ('eye-roll',L['tag']['start']-.03,'fate-bus','turn','Tag someone','The witch rolls her eyes through the window; a passing bus wipe returns to the opening.'),
]
shots=[]
for i,(sid,start,set_name,action,anchor,description) in enumerate(shot_specs):
    start=max(0,round(start*30)/30)
    finish=max(start+1/30,round(shot_specs[i+1][1]*30)/30) if i+1<len(shot_specs) else D
    shots.append({'id':sid,'start':start,'duration':finish-start,'set':set_name,'action':action,'anchor':anchor,'description':description})

timeline={'id':'happens-for-a-reason','title':'Does Everything Really Happen for a Reason?',
    'width':1080,'height':1920,'fps':30,'duration':D,'frames':round(D*30),'narrationSpeed':RATE,
    'revision':SPEC.get('revision',1),'openingQuestion':SPEC.get('openingQuestion',False),
    'events':events,'lines':lines,'shots':shots}
for file,data in [('timeline.json',timeline),('captions.json',captions),('audio-edit.json',edits),('transcript-source.json',{'sourceTake':{s:v['take'] for s,v in SPEC.get('voices',{}).items()},'words':[w for l in lines for w in l['words']]})]:
    (B/file).write_text(json.dumps(data,indent=2)+'\n')
episode={'version':1,'renderer':'hyperframes','hook':'none','world':'fate','pixelArt':'rpg','closingFade':False,
    'id':'happens-for-a-reason','title':timeline['title'],'number':9,'shadowLeadSeconds':0,
    'premise':'A soaked Miko asks a witch why he missed a bus, then assigns a reason after a happy coincidence.','fiction':True,
    'duration':D,'aspectRatio':'9:16','fps':30,'cast':['miko','witch','bus-girl'],
    'audio':{'narration':'episodes/happens-for-a-reason/narration.wav','music':'episodes/happens-for-a-reason/music.wav','effects':'episodes/happens-for-a-reason/effects.wav','narrationOffset':0,'narrationTail':.18,'narrationTrimStart':0,'pauses':[]},
    'scenes':[{**{k:s[k] for k in ['id','set','action','start','duration','anchor']},'label':s['description'],'timeOfDay':'evening'} for s in shots]}
(B/'episode.json').write_text(json.dumps(episode,indent=2)+'\n')
(B/'audio-corrections.json').write_text(json.dumps({s:v['corrections'] for s,v in sources.items()},indent=2)+'\n')

fx=np.zeros(N);effects=[]
def put(file,at,gain=1,limit=None,offset=0,fade=.02):
    audio=pcm(file)[round(offset*R):]
    if limit is not None:audio=audio[:round(limit*R)]
    if len(audio):
        rms=max(.001,float(np.sqrt(np.mean(audio**2))));audio=audio*(.12/rms)*gain
        ramp=min(round(fade*R),len(audio)//2)
        if ramp:audio[:ramp]*=np.linspace(0,1,ramp);audio[-ramp:]*=np.linspace(1,0,ramp)
    start=round(at*R);lo=max(0,start);hi=min(N,start+len(audio))
    if hi>lo:fx[lo:hi]+=audio[lo-start:hi-start]
    effects.append({'file':str(Path(file).relative_to(ROOT)),'at':at,'duration':max(0,(hi-lo)/R),'gain':gain})

sfx=P/'sfx'
for name in ['bus','rain','magic']:
    if not (sfx/f'{name}.mp3').exists():raise RuntimeError(f'Missing generated {name} sound')
rain=pcm(sfx/'rain.mp3')
stride=max(1,len(rain)-round(.15*R))
for at in np.arange(0,D,len(rain)/R-.15):put(sfx/'rain.mp3',float(at),.13,limit=min(len(rain)/R,D-at),fade=.15)
put(sfx/'bus.mp3',0,.70,limit=2.35)
put(sfx/'magic.mp3',events['witchAppear'],.55,limit=.85)
put(sfx/'magic.mp3',events['bookAppear']-.08,.32,limit=.55,offset=.55)
book=ROOT/'public/episodes/inventions-since-2000/sfx/book.mp3'
put(book,events['bookOpen'],.45,limit=.62)
put(sfx/'magic.mp3',events['brain'],.42,limit=.8,offset=.2)
put(sfx/'magic.mp3',events['face'],.16,limit=.25,offset=.7)
put(book,events['noPattern'],.13,limit=.15,offset=.5)
put(sfx/'bus.mp3',events['bus']-.1,.23,limit=.65,offset=.2)
put(sfx/'magic.mp3',events['loop']-.1,.22,limit=.26,offset=.4)
for shot in shots[1:]:
    if shot['id'] not in ['empty-book','brain','bus','witch']:
        put(book,shot['start'],.10,limit=.10,offset=.2)
wav(P/'effects-raw.wav',fx)
run(['ffmpeg','-v','error','-y','-i',str(P/'effects-raw.wav'),'-i',str(P/'narration.wav'),'-filter_complex',f'[0:a][1:a]sidechaincompress=threshold=.10:ratio=2:attack=3:release=90,apad=whole_len={N},atrim=end_sample={N}[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'effects.wav')])
music=ROOT/'public/episodes/brain-upload/source-music.mp3'
music_fade=min(float(SPEC.get('musicFadeSeconds',2.2)),D)
music_start=float(SPEC.get('musicStartSeconds',2))
selected_music=P/'music-selected.wav'
# Finish normalization and resampling in a saved 48 kHz stage before ducking.
# A single mixed-rate graph previously ended the signal early, then padded zeros.
run(['ffmpeg','-v','error','-y','-i',str(music),'-af',f'atrim=start={music_start}:duration={D},asetpts=PTS-STARTPTS,loudnorm=I=-27:TP=-6:LRA=7,aresample=48000,afade=t=in:d=0.06,afade=t=out:st={D-music_fade}:d={music_fade}:curve=qsin','-ar',str(R),'-ac','2',str(selected_music)])
run(['ffmpeg','-v','error','-y','-i',str(selected_music),'-i',str(P/'narration.wav'),'-filter_complex',f'[0:a][1:a]sidechaincompress=threshold=.10:ratio=2.5:attack=6:release=160,apad=whole_len={N},atrim=end_sample={N}[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'music.wav')])
run(['ffmpeg','-v','error','-y','-i',str(P/'narration.wav'),'-i',str(P/'music.wav'),'-i',str(P/'effects.wav'),'-filter_complex','[0:a][1:a][2:a]amix=inputs=3:normalize=0,alimiter=limit=.84:level=false[o]','-map','[o]','-ar',str(R),'-ac','2',str(P/'delivery-mix.wav')])
(B/'audio-events.json').write_text(json.dumps(effects,indent=2)+'\n')
(B/'audio-sources.json').write_text(json.dumps({'voices':{**{s:v['name'] for s,v in SPEC.get('voices',{}).items()},'sourceTakes':{s:v['take'] for s,v in SPEC.get('voices',{}).items()},'playbackRate':RATE},'music':{'file':str(music.relative_to(ROOT)),'provider':'Saved ElevenLabs channel score','sourceStartSeconds':music_start,'fadeOutSeconds':music_fade,'fadeCurve':'qsin'},'sfx':{'generated':['bus','rain','magic'],'reusedBook':str(book.relative_to(ROOT))},'soundReview':'Measured and aligned, not auditioned.'},indent=2)+'\n')
print(json.dumps({'duration':D,'frames':round(D*30),'words':len(captions),'shots':len(shots),'effects':len(effects)},indent=2))
