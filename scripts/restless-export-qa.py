"""Check the actual delivery picture, audio mux, captions and replay boundary."""
from pathlib import Path
import argparse,json,math,re,subprocess
import numpy as np
from scipy.signal import correlate,correlation_lags

parser=argparse.ArgumentParser();parser.add_argument('video',type=Path);parser.add_argument('--variant');args=parser.parse_args();V=args.video
if args.variant and not re.fullmatch('[a-z0-9-]+',args.variant):raise ValueError('Invalid variant slug')
B=Path('episodes/restless-friend')/('variants/'+args.variant) if args.variant else Path('episodes/restless-friend');P=Path('public/episodes/restless-friend')/('variants/'+args.variant) if args.variant else Path('public/episodes/restless-friend');T=json.loads((B/'timeline.json').read_text());D=T['duration'];FPS=T['fps'];RATE=T.get('narrationPlaybackRate',1.2);OUT=V.parent/'checks';OUT.mkdir(exist_ok=True)
def run(cmd):return subprocess.run(cmd,check=True,capture_output=True,text=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(V)]));video=next(x for x in probe['streams'] if x['codec_type']=='video');audio=next(x for x in probe['streams'] if x['codec_type']=='audio')
assert (video['width'],video['height'],int(video['nb_frames']),video['r_frame_rate'])==(1080,1920,round(D*FPS),f'{FPS}/1')
assert abs(float(probe['format']['duration'])-D)<1/FPS+.005
run(['ffmpeg','-v','error','-i',str(V),'-f','null','-'])
p=subprocess.Popen(['ffmpeg','-v','error','-i',str(V),'-vf','fps=4,scale=180:320','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE);size=180*320*3;n=0;flat=[]
while True:
    buf=p.stdout.read(size)
    if not buf:break
    assert len(buf)==size
    picture=np.frombuffer(buf,dtype=np.uint8).reshape(320,180,3)[30:215].astype(np.int16);median=np.median(picture.reshape(-1,3),axis=0);content=np.mean(np.abs(picture-median).sum(axis=2)>28)
    if content<.001:flat.append(n/4)
    n+=1
assert p.wait()==0
intervals=[]
for t in flat:
    if intervals and abs(t-intervals[-1]['end'])<.001:intervals[-1]['end']=t+.25
    else:intervals.append({'start':t,'end':t+.25})
bad_flat=[x for x in intervals if x['end']-x['start']>.5]
black=run(['ffmpeg','-hide_banner','-nostats','-i',str(V),'-vf','blackdetect=d=0.12:pix_th=0.03:pic_th=0.98','-an','-f','null','-'])
black_events=re.findall(r'black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)',black.stderr)
silent=run(['ffmpeg','-hide_banner','-nostats','-i',str(V),'-af','silencedetect=noise=-45dB:d=1','-vn','-f','null','-'])
silent_events=[s for s in silent.stderr.splitlines() if 'silence_start' in s or 'silence_end' in s]
def pcm(file):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-vn','-ac','1','-ar','8000','-f','f32le','-']),dtype='<f4')
ref=pcm(P/'delivery-mix.wav');got=pcm(V);windows=[]
for at in np.linspace(0,max(0,D-2),10):
    start=round(at*8000);length=min(16000,len(ref)-start,len(got)-start);a=ref[start:start+length];b=got[start:start+length];a=a-a.mean();b=b-b.mean();c=correlate(b,a,mode='full',method='fft');lags=correlation_lags(len(b),len(a),mode='full');mask=np.abs(lags)<=1600;lag=int(lags[mask][np.argmax(c[mask])]);co=float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-12));windows.append({'at':at,'offsetMs':lag/8,'correlationAtZero':round(co,6)})
source=json.loads((B/'transcript-source.json').read_text())['words'];raw=json.loads((B/'caption-words-source.json').read_text());display=json.loads((B/'captions.json').read_text());maps=json.loads((B/'caption-number-map.json').read_text());cues=json.loads((B/'caption-cues.json').read_text())
def canonical(s):return re.sub(r'[^a-z0-9]','',s.lower())
assert canonical(' '.join(w['text'] for w in source))==canonical((B/'narration.txt').read_text())
assert len(source)==len(raw)==80 and len(display)==71
assert all(abs(c[k]-w[a]/RATE*1000)<=.51 for c,w in zip(raw,source) for k,a in [('startMs','start'),('endMs','end')])
assert all(c['timestampMs']==c['startMs'] for c in display)
expanded=[]
for c in display:
    group=next((m for m in maps if m['startMs']==c['startMs'] and m['endMs']==c['endMs']),None)
    expanded.extend(group['sourceWords'] if group else [c['text'].strip()])
assert canonical(' '.join(expanded))==canonical(' '.join(c['text'] for c in raw))
missing=[i for i,c in enumerate(cues) if math.ceil(c['start']*FPS-1e-8)>=math.ceil(c['end']*FPS-1e-8)]
assert not missing
covered={(w['startMs'],w['text']) for c in cues for w in c['words']}
uncovered=[w for w in display if (w['startMs'],w['text']) not in covered]
assert not uncovered, 'A caption token has no visible output state'
def still(t):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(V),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-']),dtype=np.uint8).reshape(1920,1080,3)
first=still(0);last=still(D-1/FPS-.001);loop_mae=float(np.abs(first[:1280].astype(float)-last[:1280].astype(float)).mean())
report={'file':str(V),'variant':args.variant,'narrationPlaybackRate':RATE,'duration':float(probe['format']['duration']),'dimensions':[video['width'],video['height']],'frames':int(video['nb_frames']),'decodedWithoutErrors':True,'sampledPictureFrames':n,'flatPictureIntervalsOverHalfSecond':bad_flat,'blackIntervals':black_events,'audioGapsOverOneSecond':silent_events,'audioMuxAlignment':windows,'maxAudioOffsetMs':max(abs(w['offsetMs']) for w in windows),'captionSourceWords':len(source),'captionDisplayTokens':len(display),'captionCues':len(cues),'captionCuesMissingFrames':missing,'exactSpokenSequenceRetained':True,'captionTimesMatchEditedTake':True,'captionNumeralExpansionsMatchSource':True,'firstLastPictureMeanRgbDifference':round(loop_mae,4),'audioListening':'Signal measurements only; not claimed to have been auditioned.'}
report['everyCaptionTokenVisible']=not uncovered
(OUT/(V.stem+'-export-qa.json')).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
assert not bad_flat and not black_events and not silent_events and report['maxAudioOffsetMs']<=10 and loop_mae<8
