"""Build the landscape episode from the chosen local narration and exact-take words."""
import json,re,subprocess,math,wave
from pathlib import Path
BASE=Path('episodes/inventions-since-2000');PUB=Path('public/episodes/inventions-since-2000')
script=json.loads((BASE/'script-production.json').read_text());sel=json.loads((BASE/'voice-selections.json').read_text());trans=json.loads((BASE/'chapter-transcripts.json').read_text());recipe=json.loads((BASE/'shot-recipe.json').read_text())
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
def probe(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(p)]))
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
def anchor(words,phrase):
 target=[norm(s) for s in phrase.split()];have=[norm(w['text']) for w in words]
 found=[i for i in range(len(have)-len(target)+1) if have[i:i+len(target)]==target]
 if len(found)!=1:raise ValueError(f'Anchor must occur once: {phrase!r}: {found}')
 return words[found[0]]['start']
chapters=[];captions=[];scenes=[];offset=0;parts=[]
(PUB/'chapters').mkdir(exist_ok=True)
for c in script['chapters']:
 source=next(x for x in sel['chapters'] if x['id']==c['id']);t=next(x for x in trans['chapters'] if x['id']==c['id']);words=t['words'];duration=probe(source['file']);trim=max(0,min(.3,words[0]['start']));voice=duration-trim;gap=.24 if c['id']!='outro' else .65;frames=math.ceil((voice+gap)*30);length=frames/30
 fixed=[]
 for w in words:
  start=max(0,min(voice-.015,w['start']-trim));end=max(start+.01,min(voice,w['end']-trim));fixed.append({'text':w['text'],'start':start,'end':end})
 for i in range(len(fixed)-1):fixed[i]['end']=min(fixed[i]['end'],fixed[i+1]['start'])
 for w in fixed:
  if w['end']<=w['start']:raise ValueError('Zero duration word '+str(w))
  captions.append({'text':w['text'],'startMs':round((offset+w['start'])*1000),'endMs':round((offset+w['end'])*1000),'timestampMs':round((offset+w['start'])*1000),'confidence':1})
 out=PUB/'chapters'/(c['id']+'.wav')
 subprocess.run(['ffmpeg','-v','error','-y','-i',source['file'],'-af',f'atrim=start={trim},asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=9,apad','-t',str(length),'-ar','48000','-ac','1',str(out)],check=True)
 # Loudnorm/resampling can leave a short output tail. Pad each chapter to its exact sample count before concatenation.
 with wave.open(str(out),'rb') as w:
  params=w.getparams();pcm=w.readframes(w.getnframes())
 target=round(length*48000);actual=len(pcm)//2
 if abs(target-actual)>4800:raise ValueError(f'Unexpected chapter sample difference: {c["id"]} {actual} vs {target}')
 pcm=(pcm+b'\x00\x00'*max(0,target-actual))[:target*2]
 with wave.open(str(out),'wb') as w:w.setparams(params);w.writeframes(pcm)
 parts.append(out.resolve());items=recipe[c['id']];cuts=[anchor(fixed,r['anchor']) for r in items];cuts[0]=0
 for i,r in enumerate(items):
  start=round(cuts[i]*30)/30;end=round(cuts[i+1]*30)/30 if i+1<len(cuts) else length
  if end<=start:raise ValueError('Shot out of order '+str(r))
  scenes.append({**r,'id':c['id']+'-'+str(i+1).zfill(2),'chapter':c['id'],'start':round(offset+start,6),'localStart':start,'duration':round(end-start,6),'chapterRank':c.get('rank'),'chapterTitle':c['title'],'chapterYear':c.get('year')})
 chapters.append({**c,'start':round(offset,6),'duration':length,'sourceTrim':trim,'sourceFile':source['file'],'sourceTake':source['sourceTake'],'voiceDuration':voice,'playbackSpeed':1,'wav':str(out)})
 offset+=length
(BASE/'narration-concat.txt').write_text(''.join("file '"+str(p)+"'\n" for p in parts))
with wave.open(str(PUB/'narration.wav'),'wb') as master:
 master.setnchannels(1);master.setsampwidth(2);master.setframerate(48000)
 for part in parts:
  with wave.open(str(part),'rb') as w:master.writeframes(w.readframes(w.getnframes()))
episode={'version':1,'renderer':'hyperframes','hook':'none','world':'inventions','pixelArt':'rpg','closingFade':False,'id':'inventions-since-2000','title':script['title'],'number':8,'shadowLeadSeconds':0,'premise':'Eight selected digital and scientific milestones, with Miko acting out everyday changes. Miniaturisation and voxel worlds are illustrative fiction.','fiction':True,'duration':round(offset,6),'aspectRatio':'16:9','fps':30,'cast':['miko','nova'],'audio':{'narration':'episodes/inventions-since-2000/narration.wav','music':'episodes/inventions-since-2000/music.wav','effects':'episodes/inventions-since-2000/effects.wav','narrationOffset':0,'narrationTail':0,'narrationTrimStart':0,'pauses':[]},'scenes':[{'id':s['id'],'set':'inventions-'+s.get('set','desk'),'action':s.get('action','reveal'),'start':s['start'],'duration':s['duration'],'anchor':s['anchor'],'label':s.get('description',s['kind']),'timeOfDay':'evening','focus':[]} for s in scenes]}
write(BASE/'episode.json',episode);write(BASE/'captions.json',captions);write(BASE/'timeline.json',{'fps':30,'width':1920,'height':1080,'duration':round(offset,6),'chapters':chapters,'shots':scenes});write(BASE/'transcript-source.json',{'sourceTake':0,'source':'Chapter-assembled exact selected takes, natural 1.0x playback','words':[{'text':c['text'],'start':c['startMs']/1000,'end':c['endMs']/1000} for c in captions]})
print(json.dumps({'seconds':round(offset,3),'frames':round(offset*30),'chapters':len(chapters),'shots':len(scenes),'words':len(captions),'shortestShot':min(s['duration'] for s in scenes)},indent=2))
