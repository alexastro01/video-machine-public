"""Validate the complete export's visual continuity and local master audio timing."""
from pathlib import Path
import json,re,subprocess,sys,math,argparse
import numpy as np
from scipy.signal import correlate,correlation_lags
B=Path('episodes/inventions-since-2000');T=json.loads((B/'timeline.json').read_text())
parser=argparse.ArgumentParser();parser.add_argument('video',type=Path);parser.add_argument('--speed',type=float,default=1);parser.add_argument('--master',type=Path,default=Path('public/episodes/inventions-since-2000/delivery-mix.wav'));parser.add_argument('--captions',type=Path,default=B/'captions.json');args=parser.parse_args()
assert math.isfinite(args.speed) and args.speed>0
video=args.video;D=T['duration']/args.speed;out=video.parent/'checks';out.mkdir(exist_ok=True)
# Scan the picture above the caption strip. A solid teal missing scene is not black.
p=subprocess.Popen(['ffmpeg','-v','error','-i',str(video),'-vf','fps=4,scale=320:180','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE);size=320*180*3;flat=[];n=0
while True:
 buf=p.stdout.read(size)
 if not buf:break
 if len(buf)!=size:raise ValueError('Partial decoded video frame')
 a=np.frombuffer(buf,dtype=np.uint8).reshape(180,320,3)[30:130].astype(np.int16);fraction=float(np.mean(np.sum(np.abs(a-np.array([25,52,62])),axis=2)>28))
 background=np.median(a.reshape(-1,3),axis=0);content_fraction=float(np.mean(np.sum(np.abs(a-background),axis=2)>28))
 if fraction<.001 or content_fraction<.001:flat.append(n/4)
 n+=1
if p.wait()!=0:raise ValueError('Frame scan failed')
intervals=[]
for t in flat:
 if intervals and abs(t-intervals[-1]['end'])<.001:intervals[-1]['end']=t+.25
 else:intervals.append({'start':t,'end':t+.25})
longflat=[x for x in intervals if x['end']-x['start']>.5]
# Final AAC versus the local master: checks the mux and detects accumulated offset.
def audio(file):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-vn','-ac','1','-ar','8000','-f','f32le','-']),dtype='<f4')
ref=audio(args.master);got=audio(video);windows=[]
for source_at in [1,30,70,110,150,190,230,270,310,350,390,398]:
 at=source_at/args.speed;start=round(at*8000);length=min(round(6*8000/args.speed),len(ref)-start-1,len(got)-start-1);assert length>0
 aa=ref[start:start+length];bb=got[start:start+length];aa=aa-aa.mean();bb=bb-bb.mean();corr=correlate(bb,aa,mode='full',method='fft');lags=correlation_lags(len(bb),len(aa),mode='full');mask=np.abs(lags)<=2400;lag=int(lags[mask][np.argmax(corr[mask])]);coefficient=float(np.dot(aa,bb)/(np.linalg.norm(aa)*np.linalg.norm(bb)+1e-12));windows.append({'at':at,'offsetMs':lag/8,'correlationAtZero':round(coefficient,6)})
black=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(video),'-vf','blackdetect=d=0.12:pix_th=0.03:pic_th=0.98','-an','-f','null','-'],capture_output=True,text=True,check=True)
blackevents=re.findall(r'black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)',black.stderr)
silence=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(video),'-af','silencedetect=noise=-45dB:d=1','-vn','-f','null','-'],capture_output=True,text=True,check=True)
silenceevents=[l for l in silence.stderr.splitlines() if 'silence_start' in l or 'silence_end' in l]
cap=json.loads(args.captions.read_text());words=json.loads((B/'chapter-transcripts.json').read_text());sourcewords=[w['text'] for c in words['chapters'] for w in c['words']]
assert sourcewords==[c['text'] for c in cap], 'Caption words differ from the selected takes'
sourcecaps=json.loads((B/'captions.json').read_text())
assert all(abs(c[key]-original[key]/args.speed)<=.001 for c,original in zip(cap,sourcecaps) for key in ['startMs','endMs','timestampMs'] if isinstance(original.get(key),(int,float))), 'Caption delivery times do not match the speed map'
def still(at):
 return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(at),'-i',str(video),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-']),dtype=np.uint8).reshape(1080,1920,3)
first=still(0);last=still(D-1/30-.001);loop_mae=float(np.abs(first[:810].astype(float)-last[:810].astype(float)).mean())
report={'file':str(video),'playbackSpeed':args.speed,'durationExpected':D,'audioMaster':str(args.master),'sampledFrames':n,'pictureScan':'Legacy missing-teal check plus median-background contrast on the picture above captions.','flatPictureIntervalsOverHalfSecond':longflat,'blackIntervals':blackevents,'silenceIntervalsOverOneSecond':silenceevents,'audioMuxAlignment':windows,'maxAudioOffsetMs':max(abs(x['offsetMs']) for x in windows),'captionWords':len(cap),'exactSelectedTakeWordSequence':True,'captionDeliveryTimesMatchSpeedMap':True,'firstLastPictureMeanRgbDifference':round(loop_mae,4),'captionMethod':'Exact selected-take Scribe timestamps, source trim applied per chapter and delivery speed map applied; no word matching by repeated text.','audioListening':'Not claimed. Signal measurements and visual review only.'}
(out/(video.stem+'-export-qa.json')).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if longflat or blackevents or silenceevents or max(abs(x['offsetMs']) for x in windows)>10 or loop_mae>8:raise SystemExit('Export QA requires a fix')
