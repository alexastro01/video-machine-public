"""Build exact-take speech, an honest wet/dry vocal comparison and its visual clock."""
from pathlib import Path
import json, math, re, hashlib, shutil, subprocess
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from dialogue_media import ROOT, R, pcm, wav, run

B = ROOT/'episodes/shower-singing'
P = ROOT/'public/episodes/shower-singing'
plan = json.loads((B/'plan.json').read_text())
FPS = plan['fps']
source_lines = plan.get('sourceLines', plan['lines'])

def save(name, value):
    file = B/name; file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(value, indent=2)+'\n')

def normal(text):
    return re.sub('[^a-z]', '', text.lower())

def silences(file):
    result = subprocess.run(['ffmpeg','-hide_banner','-i',str(file),'-af',
        'silencedetect=noise=-40dB:d=0.06','-f','null','-'], capture_output=True, check=True)
    items=[]; start=None
    for line in result.stderr.decode().splitlines():
        a=re.search(r'silence_start: ([\d.]+)',line)
        z=re.search(r'silence_end: ([\d.]+)',line)
        if a: start=float(a.group(1))
        if z and start is not None: items.append({'start':start,'end':float(z.group(1))});start=None
    return items

source_file = P/'source-narrator-take-1.mp3'
source = pcm(source_file)
words = [dict(w) for w in json.loads((B/'transcript-narrator.json').read_text())['words']]
expected = [w for line in source_lines for w in line['text'].split()]
if [normal(w['word']) for w in words] != [normal(w) for w in expected]:
    raise RuntimeError('The selected narrator take does not match the script')
quiet = silences(source_file); boundaries=[]; corrections=[]; cursor=0
for i,line in enumerate(source_lines):
    if i:
        prior,first=words[cursor-1],words[cursor]
        target=(prior['end']+first['start'])/2
        options=[q for q in quiet if q['end']-q['start']>=.16 and
            q['start']>=prior['start'] and q['end']<=first['end']+.18 and
            abs((q['start']+q['end'])/2-target)<.8]
        if not options: raise RuntimeError('No measured pause before '+line['id'])
        q=min(options,key=lambda q:abs((q['start']+q['end'])/2-target))
        boundaries.append(q)
        corrections.append({'text':first['word'],'asrStart':first['start'],
            'alignedStart':q['end'],'basis':'measured recorded pause'})
        first['start']=q['end'];first['end']=max(first['end'],first['start']+.025)
    cursor+=len(line['text'].split())

# One original sung performance, with no pitch or timing change between conditions.
vocal_file = P/'source-vocal-take-1.mp3'
v = pcm(vocal_file)
active=np.flatnonzero(np.abs(v)>.005)
v_start=max(0,int(active[0])-.04*R)/R
v_end=min(len(v),int(active[-1])+.08*R)/R
v=v[round(v_start*R):round(v_end*R)]
v *= .12/max(.001,float(np.sqrt(np.mean(v*v))))
decay=plan['demonstration']['decaySeconds']
n=round(decay*R);t=np.arange(n)/R;rng=np.random.default_rng(70419)
diffuse=sosfilt(butter(2,6000,fs=R,output='sos'),rng.normal(0,1,n))
ir=diffuse*np.exp(-6.907755*t/decay)*.023
ir[:round(.012*R)]*=np.linspace(0,1,round(.012*R))
ir[0]=1
for delay,gain in [(0.009,.36),(0.017,.30),(0.026,.24),(0.039,.19),(0.058,.14)]:
    ir[round(delay*R)]+=gain
wet=fftconvolve(v,ir)
wet=wet[:len(v)+round(.56*R)]
wet*=float(np.sqrt(np.mean(v*v)))/max(.001,float(np.sqrt(np.mean(wet[:len(v)]**2))))
fade=round(.05*R);wet[-fade:]*=np.linspace(1,0,fade)
wav(P/'vocal-dry.wav',v);wav(P/'vocal-wet.wav',wet);wav(P/'room-impulse.wav',ir/max(1,np.max(np.abs(ir))))

lines={};segments=[];edits=[];output_words=[];caps=[];at=0.;cursor=0;demo={}
for i,line in enumerate(source_lines):
    count=len(line['text'].split());ws=words[cursor:cursor+count]
    start=0 if i==0 else boundaries[i-1]['end']-.09
    end=len(source)/R if i==len(source_lines)-1 else boundaries[i]['start']+.10
    chunk=source[round(start*R):round(end*R)].copy()
    chunk*=min(3,.12/max(.001,float(np.sqrt(np.mean(chunk*chunk)))))
    edge=round(.004*R);chunk[:edge]*=np.linspace(0,1,edge);chunk[-edge:]*=np.linspace(1,0,edge)
    at=round(at*FPS)/FPS
    row={**line,'start':at,'end':at+len(chunk)/R,'words':[]}
    for text,w in zip(line['text'].split(),ws):
        row['words'].append({'text':text,'start':round(at+max(0,w['start']-start),6),
            'end':round(at+w['end']-start,6),'line':line['id']})
    lines[line['id']]=row;output_words+=row['words'];segments.append((at,chunk))
    edits.append({'line':line['id'],'source':str(source_file.relative_to(ROOT)),
        'sourceStart':start,'sourceEnd':end,'outputStart':at,'outputEnd':row['end']})
    for j in range(0,count,2):
        group=row['words'][j:j+2]
        caps.append({'text':' '.join(w['text'] for w in group),'startMs':round(group[0]['start']*1000),
            'endMs':round(group[-1]['end']*1000),'timestampMs':round(group[0]['start']*1000),'confidence':None})
    at=row['end']+.10;cursor+=count
    if line['id']=='intro':
        at=round(at*FPS)/FPS;demo['wetStart']=at;segments.append((at,wet));at+=len(wet)/R
        demo['wetEnd']=at;at=round((at+.055)*FPS)/FPS;demo['dryStart']=at
        segments.append((at,v));at+=len(v)/R;demo['dryEnd']=at;at+=.08

if plan.get('opening',{}).get('mode') == 'singing-first':
    cut = demo['wetStart']
    segments = [(start-cut,a) for start,a in segments if start >= cut]
    lines.pop('intro')
    for row in lines.values():
        row['start'] -= cut;row['end'] -= cut
        for w in row['words']:w['start'] -= cut;w['end'] -= cut
    output_words = [w for row in lines.values() for w in row['words']]
    edits = [{**c,'outputStart':c['outputStart']-cut,'outputEnd':c['outputEnd']-cut}
             for c in edits if c['line']!='intro']
    caps = [{**c,'startMs':round(c['startMs']-cut*1000),
             'endMs':round(c['endMs']-cut*1000),'timestampMs':round(c['timestampMs']-cut*1000)}
            for c in caps if c['startMs'] >= cut*1000]
    demo = {key:value-cut for key,value in demo.items()}
    at -= cut

D=math.ceil((at+1.05)*FPS)/FPS;N=round(D*R)
narr=np.zeros(N)
for start,a in segments:
    p=round(start*R);narr[p:p+len(a)]+=a
wav(P/'narration-raw.wav',narr)
run(['ffmpeg','-v','error','-y','-i',str(P/'narration-raw.wav'),'-af',
    'loudnorm=I=-16:TP=-2.5:LRA=8,aresample=48000','-ar',str(R),'-ac','2',str(P/'narration.wav')])

def cue(line,word):
    return next(w['start'] for w in lines[line]['words'] if normal(w['text'])==normal(word))
events={**demo,**{key:row['start'] for key,row in lines.items()},
    'reflect':cue('tiles','reflect'),'reverb':cue('tail','reverb'),
    'longer':cue('fullness','longer'),'absorbHit':cue('absorb','absorb'),
    'bathroom':cue('joke','bathroom'),'loop':lines['joke']['end']+.10,'end':D}
shots=[('hook',0),('dry',demo['dryStart']),('reaction',lines['reaction']['start']),
    ('proof',lines['proof']['start']),('tiles',lines['tiles']['start']),
    ('tail',lines['tail']['start']),('fullness',lines['fullness']['start']),
    ('swap',lines['swap']['start']),('absorb',lines['absorb']['start']),
    ('same',lines['same']['start']),('joke',lines['joke']['start']),('loop',events['loop'])]
shot_rows=[{'id':key,'start':start,'duration':(shots[i+1][1] if i+1<len(shots) else D)-start}
    for i,(key,start) in enumerate(shots)]

def peaks(a, count=160):
    cuts=np.linspace(0,len(a),count+1).astype(int)
    out=np.array([np.sqrt(np.mean(a[cuts[i]:max(cuts[i]+1,cuts[i+1])]**2)) for i in range(count)])
    return np.round(out/max(.001,float(out.max())),4).tolist()
features={'dry':peaks(np.pad(v,(0,len(wet)-len(v)))),'wet':peaks(wet),
    'vocalLevels':peaks(v,round(len(v)/R*60)),'vocalDuration':len(v)/R,
    'plotDuration':len(wet)/R}
save('edit.json',{'fps':FPS,'duration':D,'events':events,'lines':lines,'shots':shot_rows,'demo':demo})
save('features.json',features);save('captions.json',caps);save('audio-edits.json',edits)
save('transcript-source.json',{'sourceTake':1,'words':output_words})
save('alignment.json',{'silences':quiet,'boundaries':boundaries,'adjustments':corrections})
save('demonstration.json',{'source':str(vocal_file.relative_to(ROOT)),
    'sourceSha256':hashlib.sha256(vocal_file.read_bytes()).hexdigest(),
    'sourceStart':v_start,'sourceEnd':v_end,'samePerformance':True,
    'pitchChanged':False,'timingChanged':False,'levels':'RMS-matched over the vocal interval',
    'method':'Original deterministic room impulse response convolved with the source vocal',
    'decaySettingSeconds':decay,'tailKeptSeconds':.56,'seed':70419,
    'dryFile':'episodes/shower-singing/vocal-dry.wav','wetFile':'episodes/shower-singing/vocal-wet.wav',
    'note':'This is an illustrative acoustic treatment, not a measurement of every shower.'})

# Foley reuses the user's saved local library assets.
fx=np.zeros(N);fx_events=[];ledger=[]
existing=ROOT/'public/episodes/ok-message-motion/sfx'
dest=P/'sfx';dest.mkdir(exist_ok=True)
files={}
for key in ['pop','tap','swipe']:
    src=next(existing.glob(key+'.*'));target=dest/src.name;shutil.copyfile(src,target);files[key]=target
    ledger.append({'id':key,'file':str(target.relative_to(ROOT)),
        'copiedFrom':str(src.relative_to(ROOT)),
        'originalSource':'Local SFX library, see episodes/ok-message-motion/assets/sfx-ledger.json'})
def sound(key,when,length=.14,gain=.04):
    a=pcm(files[key])[:round(length*R)];a*=gain/max(.001,float(np.max(np.abs(a))))
    edge=min(round(.008*R),len(a)//2);a[:edge]*=np.linspace(0,1,edge);a[-edge:]*=np.linspace(1,0,edge)
    start=round(when*R);count=min(len(a),N-start)
    if count>0:fx[start:start+count]+=a[:count];fx_events.append({'id':key,'start':when,'duration':count/R})
sound('pop',0,.12,.035);sound('tap',demo['dryStart'],.08,.025)
for key in ['proof','tiles','tail','swap','same']:
    sound('swipe',events[key],.22,.035)
sound('tap',events['reflect'],.09,.035);sound('pop',events['reverb'],.12,.035)
sound('tap',events['absorbHit'],.09,.018);sound('pop',events['bathroom'],.12,.04)
wav(P/'effects.wav',fx)
src_music=ROOT/'public/episodes/ok-message-motion/source-music.mp3'
shutil.copyfile(src_music,P/'source-music.mp3');music=pcm(src_music)
if len(music)<N:music=np.tile(music,math.ceil(N/len(music)))
music=music[:N];music*=.011/max(.001,float(np.sqrt(np.mean(music*music))))
env=np.ones(N);env[:round(.12*R)]*=np.linspace(0,1,round(.12*R));env[-round(.8*R):]*=np.linspace(1,0,round(.8*R))
lo=max(0,round((demo['wetStart']-.08)*R));hi=round((demo['dryEnd']+.08)*R)
env[lo:hi]=0
edge=round(.08*R)
if lo>=edge:env[lo-edge:lo]=np.linspace(1,0,edge)
env[hi:hi+edge]=np.linspace(0,1,min(edge,N-hi))
wav(P/'music.wav',music*env)
save('audio-events.json',fx_events);save('assets/sfx-ledger.json',ledger)
episode=json.loads((B/'episode.json').read_text());episode.update(
    renderer='remotion',world='shower-motion',hook='none',closingFade=False,
    duration=D,fps=FPS,aspectRatio='9:16',cast=['miko'],
    premise='A fictional Miko performance illustrates reflective shower acoustics using one real vocal take. Soft furnishings reduce the returning sound.',
    fiction=True,audio={'narration':'episodes/shower-singing/narration.wav',
        'music':'episodes/shower-singing/music.wav','effects':'episodes/shower-singing/effects.wav',
        'narrationOffset':0,'narrationTail':D-lines['joke']['end'],'narrationTrimStart':0,'pauses':[]},
    scenes=[{'id':row['id'],'start':row['start'] if i else 0,
        'duration':(list(lines.values())[i+1]['start'] if i+1<len(lines) else D)-(row['start'] if i else 0),
        'set':'shower-room','action':'reveal','anchor':row['text'],
        'label':row['id'],'timeOfDay':'day'} for i,row in enumerate(lines.values())])
save('episode.json',episode)
voice=json.loads((B/'voice-provenance.json').read_text());voice['selectedVocalTake']=1
voice['selectionBasis']='Take 1 has three sustained, distinct notes; the identical local performance is used in both conditions.'
save('voice-provenance.json',voice)
print(json.dumps({'duration':D,'frames':round(D*FPS),'words':len(output_words),'demo':demo,'events':events},indent=2))
