"""Prepare the review-loop dialogue, finite handoffs and local audio master."""
from pathlib import Path
import hashlib, json, math, re, shutil, subprocess
import numpy as np
from dialogue_media import ROOT, R, assemble, pcm, wav, run, normal

S='ai-review-loop'; B=ROOT/'episodes'/S; P=ROOT/'public/episodes'/S
plan=json.loads((B/'plan.json').read_text())
spec,timeline,original_narration=assemble(S)
lines={line['id']:line for line in timeline['lines']}; D=timeline['duration']; N=round(D*R)
def word(line,text): return next(w['start'] for w in lines[line]['words'] if normal(w['text'])==normal(text))
e={key:line['start'] for key,line in lines.items()}
e.update(
 opusEdit=word('opus_first','complicated'),
 glance=word('gemini_first','simple'),
 geminiEdit=word('gemini_first','needs'),
 modules=[word('gemini_first',w) for w in plan['motion']['moduleWords']],
 astraEdit=word('astra_first','clean'),
 hoverStart=lines['astra_first']['words'][-1]['end']-.12,
 hoverOver=lines['again']['words'][0]['start']-.10,
 hoverLeave=word('again','review'),
 loopStart=word('simplify',"Let's"),
 loopEnd=lines['compare']['start']-.30,
 diffReveal=lines['compare']['words'][-1]['end']+.18,
 hoursNumber=word('hours','three'),end=D)
fast=[]
for line,role,travel in [('simplify','opus',.46),('rebuild','gemini',.36),('restart','astra',.28)]:
 at=lines[line]['words'][0]['start']
 fast.append({'at':at,'duration':travel,'contact':at+travel,'role':role})
e['fastHandoffs']=fast

def speaker_cue(line):
 # Catch soft consonants even when the word aligner starts inside the first syllable.
 start, stop = (round(line[key]*R) for key in ('start','end'))
 signal = original_narration[start:stop]
 block = R//100
 windows = signal[:len(signal)//block*block].reshape(-1,block)
 rms = np.sqrt(np.mean(windows**2,axis=1))
 audible = np.flatnonzero(rms > max(.003,rms.max()*.025))
 first, last = line['words'][0]['start'], line['words'][-1]['end']
 if len(audible):
  first = min(first,line['start']+int(audible[0])/100)
  last = max(last,min(line['end'],line['start']+(int(audible[-1])+1)/100))
 return {'line':line['id'],'speaker':line['speaker'],'start':round(first,6),'end':round(last,6)}

e['speakerCues']=[speaker_cue(line) for line in timeline['lines']]
descriptions={
 'hook':'The price formatter already turns 5 into £5.00. Alex asks Opus to help review Astra’s code.',
 'opus_first':'Opus shortens the function. Its price stays visible.',
 'gemini_request':'Alex turns to Gemini and asks her to check Opus’s fix.',
 'gemini_first':'Alex glances across as Gemini proposes a proper architecture. Three modules pile up around the same price.',
 'astra_request':'Astra enters the same open stage for the next review.',
 'astra_first':'Astra collapses the modules back into the original function.',
 'again':'Alex hovers over Merge, then pulls away as he requests another review.',
 'simplify':'The editor contracts into a file card over Opus’s hand as she says Let’s simplify.',
 'rebuild':'The same file swings to Gemini on Rebuild and she changes its contents.',
 'restart':'The third and quickest pass lands with Astra. The original code returns.',
 'compare':'Astra’s card opens into the comparison. Alex asks Any change and the blue zero answers.',
 'hours':'Alex facepalms beside the zero-change comparison.',
 'cleaner':'Opus proudly says Much cleaner and holds her reaction.'}
shots=[dict(id=l['id'],start=l['start'],duration=(timeline['lines'][i+1]['start'] if i+1<len(timeline['lines']) else D)-l['start'],set='developer-ui',action='reveal',anchor=l['text'],label=l['id'],description=descriptions[l['id']],timeOfDay='day') for i,l in enumerate(timeline['lines'])]
edit={'id':S,'duration':D,'fps':60,'width':1080,'height':1920,'events':e,'lines':list(lines.values()),'shots':shots,'actors':json.loads((B/'assets/actors.json').read_text()),'speakerColors':plan['motion']['speakerColors'],'ui':plan['ui'],'audioMaster':f'episodes/{S}/mix.wav'}
(B/'edit.json').write_text(json.dumps(edit,indent=2)+'\n')
transcript=json.loads((B/'transcript-source.json').read_text())
transcript['sourceTake']={line['id']:spec['lineRecordings'][line['id']]['sourceFile'] for line in lines.values()}
(B/'transcript-source.json').write_text(json.dumps(transcript,indent=2)+'\n')
caps=[]
for line in timeline['lines']:
 pending=[]
 for i,w in enumerate(line['words']):
  pending.append(w)
  if len(pending)==2 or w['text'].endswith(('.', '?', '!')) or i==len(line['words'])-1:
   caps.append(dict(text=' '.join(spec.get('captionReplacements',{}).get(x['text'],x['text']) for x in pending),startMs=round(pending[0]['start']*1000),endMs=round(pending[-1]['end']*1000),timestampMs=round(pending[0]['start']*1000),confidence=None));pending=[]
(B/'captions.json').write_text(json.dumps(caps,indent=2)+'\n')
ledger=json.loads((ROOT/'episodes/full-stack-subscriber/assets/sfx-ledger.json').read_text());sources={};local=[];(P/'sfx').mkdir(exist_ok=True)
for row in ledger:
 if row['id']=='cash':continue
 src=ROOT/row['file'];dest=P/'sfx'/src.name;shutil.copy2(src,dest);sources[row['id']]=pcm(dest);local.append({**row,'file':str(dest.relative_to(ROOT))})
fx=np.zeros(N);sounds=[]
def sound(id,key,at,d=.2,peak=.035):
 at=max(0,at);start=round(at*R);n=min(round(d*R),len(sources[key]),N-start)
 if n<=0:return
 a=sources[key][:n].copy();a*=peak/max(.001,float(np.abs(a).max()));edge=min(round(.006*R),n//2);a[:edge]*=np.linspace(0,1,edge);a[-edge:]*=np.linspace(1,0,edge);fx[start:start+n]+=a;sounds.append({'id':id,'sound':key,'start':at,'duration':n/R,'peakGain':peak})
sound('file-arrives','swipe',0,.36,.05)
for key in ['gemini_request','astra_request']:sound(key+'-handoff','swipe',e[key],.22,.029)
for key in ['opusEdit','astraEdit']:sound(key+'-typing','typing',e[key],.29,.027)
for i,at in enumerate(e['modules']):sound('module-'+str(i),'pop',at,.16,.045 if i==1 else .029)
sound('merge-hover','swipe',e['hoverOver'],.12,.015)
sound('merge-withdraw','swipe',e['hoverLeave'],.16,.021)
for i,h in enumerate(fast):
 sound('fast-pass-'+str(i),'swipe',h['at'],min(.19,h['duration']),.029)
 sound('fast-contact-'+str(i),'tap',h['contact'],.08,.036)
sound('time-passes','clock',e['loopStart'],e['loopEnd']-e['loopStart'],.019)
sound('comparison-settles','tap',e['compare']+.22,.14,.032)
sound('zero-changes','pop',e['diffReveal'],.22,.055)
sound('hours-count','tap',e['hoursNumber'],.12,.025)
sound('proud-settle','swipe',e['cleaner'],.15,.018)
wav(P/'effects-mono.wav',fx);run(['ffmpeg','-v','error','-y','-i',str(P/'effects-mono.wav'),'-af','pan=stereo|c0=c0|c1=c0',str(P/'effects.wav')])
(B/'assets/sfx-ledger.json').write_text(json.dumps(local,indent=2)+'\n');(B/'audio-events.json').write_text(json.dumps(sounds,indent=2)+'\n')
music=pcm(ROOT/plan['music']['source']);cross=min(round(.6*R),len(music)//4)
while len(music)<N:music=np.concatenate([music[:-cross],music[-cross:]*np.linspace(1,0,cross)+music[:cross]*np.linspace(0,1,cross),music[cross:]])
music=music[:N];music*=plan['music']['rms']/max(.001,float(np.sqrt(np.mean(music*music))));n=round(.08*R);music[:n]*=np.linspace(0,1,n);n=round(.4*R);music[-n:]*=np.linspace(1,0,n)
wav(P/'music-mono.wav',music);run(['ffmpeg','-v','error','-y','-i',str(P/'music-mono.wav'),'-af','pan=stereo|c0=c0|c1=c0',str(P/'music.wav')])
premix=P/'mix-float.wav';run(['ffmpeg','-v','error','-y','-i',str(P/'narration.wav'),'-i',str(P/'music.wav'),'-i',str(P/'effects.wav'),'-filter_complex','[0:a][1:a][2:a]amix=inputs=3:duration=first:normalize=0[a]','-map','[a]','-c:a','pcm_f32le','-ar','48000','-ac','2',str(premix)])
m=subprocess.run(['ffmpeg','-hide_banner','-i',str(premix),'-af','loudnorm=I=-17:TP=-2:LRA=8:print_format=json','-f','null','-'],capture_output=True,check=True);stats=json.loads(re.search(r'\{[\s\S]*\}',m.stderr.decode()).group());gain=min(-17-float(stats['input_i']),-2.1-float(stats['input_tp']))
run(['ffmpeg','-v','error','-y','-i',str(premix),'-af',f'volume={gain:.6f}dB','-c:a','pcm_s16le','-ar','48000','-ac','2',str(P/'mix.wav')])
raw=pcm(P/'narration-raw.wav');g=min(1,.98/max(.98,float(np.abs(original_narration).max())));err=float(np.max(np.abs(raw-original_narration*g*(32767/32768))));assert err<=1/32768+1e-7
(B/'audio-master.json').write_text(json.dumps({'premixMeasurement':stats,'mixGainDb':gain,'rawNarrationHeadroomGain':g,'maximumLinearWaveformError':err,'quantizationTolerance':1/32768+1e-7,'master':f'public/episodes/{S}/mix.wav','constantMusicGain':True,'speechSpeedByLine':{key:take.get('speed',spec['narrationSpeed']) for key,take in spec['lineRecordings'].items()},'sha256':hashlib.sha256((P/'mix.wav').read_bytes()).hexdigest()},indent=2)+'\n')
ep=json.loads((B/'episode.json').read_text());ep.update(renderer='remotion',world='review-loop',duration=D,fps=60,aspectRatio='9:16',cast=['alex','opus','astra','gemini'],premise='Three AI reviews return a developer’s code to its original state.',closingFade=False,audio={'narration':f'episodes/{S}/narration.wav','music':f'episodes/{S}/music.wav','effects':f'episodes/{S}/effects.wav','narrationOffset':0,'narrationTrimStart':0,'narrationTail':D-lines['cleaner']['words'][-1]['end'],'pauses':[]},scenes=shots)
(B/'episode.json').write_text(json.dumps(ep,indent=2)+'\n');plan['duration']=D;(B/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
(B/'narration.txt').write_text('\n\n'.join(l['text'] for l in timeline['lines'])+'\n');(B/'script.md').write_text('# The AI Review Loop\n\n'+ '\n\n'.join('**'+l['speaker'].title()+':** '+l['text'] for l in timeline['lines'])+'\n\nThe original and final code match exactly. Reveal 0 changes before Alex’s 3-hour line. The characters stand freely in the shared scene.\n')
print(json.dumps({'duration':D,'frames':round(D*60),'words':sum(len(l['words']) for l in timeline['lines']),'events':e,'sounds':len(sounds)}))
