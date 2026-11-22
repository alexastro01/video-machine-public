"""Prepare Part 4 from exact cast takes, physical beats and local sound effects."""
from pathlib import Path
import json,math
import numpy as np
from dialogue_media import ROOT,R,assemble,pcm,wav,run,normal
SLUG='billionaire-body-swap-4';B=ROOT/'episodes'/SLUG;P=ROOT/'public/episodes'/SLUG
plan=json.loads((B/'plan.json').read_text());spec,timeline,_=assemble(SLUG)
lines={l['id']:l for l in timeline['lines']};D=timeline['duration'];N=round(D*R)
def word(line,text):return next(w['start'] for w in lines[line]['words'] if normal(w['text'])==normal(text))
e={k:l['start'] for k,l in lines.items()}
e.update(school=word('hook',"He's"),reportHit=.22,reportOpen=lines['internship']['start']-.18,allocation=word('partner','partner'),salary=word('familiar','pocket'),result=word('last','last'),managerPhone=word('manager','phone'),expense=word('trip','expense'),reaction=lines['worked']['start']+1.65,end=D)
starts=[('billionaire-hook',0,'swap-classroom'),('school-hook',e['school'],'swap-classroom')]
starts += [(l['id'],l['start'],'swap-classroom') for l in timeline['lines'][1:]]
starts += [('salary',e['salary'],'swap-classroom'),('result',e['result'],'swap-classroom'),('manager-phone',e['managerPhone'],'swap-classroom'),('expense',e['expense'],'swap-classroom'),('reaction',e['reaction'],'swap-classroom')]
starts.sort(key=lambda x:x[1]);descriptions={
'billionaire-hook':'Open on the former billionaire in your young body, already facing a falling school report at parents’ evening.',
'school-hook':'Pull back on He’s to reveal Mum beside the former billionaire. The report has landed and the situation is clear.',
'lawyer':'Young body tries to delegate parents’ evening to a lawyer.',
'stay':'Mum’s firm seated stop gesture ends the escape attempt before seven seconds.',
'internship':'The teacher opens the report and explains the first employer-like complaint.',
'talent':'A finite defensive open-palm gesture accompanies the young body’s business excuse.',
'partner':'A school project card allocates all the work to one partner.',
'exposure':'Young body defends the unpaid arrangement.',
'familiar':'Mum recognises an ordinary family habit rather than the body swap.',
'salary':'Four pocket-money coins land as Mum recalls his new salary vocabulary.',
'fire':'Teacher reads the sports-teacher complaint from the report.',
'why':'Mum asks for a reason, with open questioning eyes.',
'performance':'Young body blames the teacher’s performance.',
'last':'Mum starts correcting him.',
'result':'A results card places his avatar last in his own team.',
'exactly':'He accepts the evidence as proof of his own excuse.',
'manager':'Teacher introduces the confiscated-phone complaint.',
'manager-phone':'The report becomes a simple headteacher contact screen on the manager line.',
'procedure':'Young body treats the complaint as standard business practice.',
'trip':'Teacher introduces the final school-trip complaint with the expense still hidden.',
'expense':'The report’s receipt turns toward us, revealing a fictional £45 expense claim.',
'worked':'Mum leans forward with genuine hope: Did it work?',
'reaction':'Teacher is surprised and the young body is caught out. Let both reactions settle.',
'cta':'The former billionaire gestures toward the viewer while their question builds in a clear comment bubble above him.'}
anchor={s:lines[s]['text'] if s in lines else lines['familiar' if s=='salary' else 'last' if s=='result' else 'manager' if s=='manager-phone' else 'trip' if s=='expense' else 'worked' if s=='reaction' else 'hook']['text'] for s,_,_ in starts}
shots=[dict(id=id,start=t,duration=(starts[i+1][1] if i+1<len(starts) else D)-t,set=set,action='reveal',anchor=anchor[id],description=descriptions[id]) for i,(id,t,set) in enumerate(starts)]
for s in shots:assert s['duration']>.10,s
assets=[]
for id,a in json.loads((B/'assets/poses.json').read_text()).items():assets.append({k:a[k] for k in ['width','height','worldHeight','pivotX','footY']}|{'id':id,'url':a['file']})
for id,a in json.loads((B/'assets/animations.json').read_text()).items():
 m=a['metadata'];c=m['crop'];assets.append(dict(id=id+'-gif',url=a['file'],width=c['width'],height=c['height'],worldHeight=a['worldHeight'],pivotX=m['cellWidth']/2-c['x'],footY=c['height'],animation=m))
edit=dict(id=plan['id'],title=plan['title'],width=1080,height=1920,fps=30,duration=D,events=e,lines=list(lines.values()),shots=shots,assets=assets,model=f'episodes/{SLUG}/swap-stage-4.glb',ui=plan['ui'])
(B/'edit.json').write_text(json.dumps(edit,indent=2,ensure_ascii=False)+'\n')
# Two-word progressive captions reveal their second word at its actual spoken onset.
captions=[]
for l in timeline['lines']:
 chunk=[]
 for w in l['words']:
  chunk.append(w)
  if len(chunk)==2 or w['text'].rstrip().endswith(('.', '!', '?')) or w is l['words'][-1]:
   captions.append(dict(text=' '.join(x['text'] for x in chunk),startMs=round(chunk[0]['start']*1000),endMs=round(chunk[-1]['end']*1000),timestampMs=round(chunk[0]['start']*1000),confidence=None));chunk=[]
(B/'captions.json').write_text(json.dumps(captions,indent=2)+'\n')
ledger=json.loads((ROOT/'episodes/billionaire-body-swap-2/assets/sfx-ledger.json').read_text());sounds={r['id']:pcm(ROOT/r['localFile']) for r in ledger};fx=np.zeros(N);events=[]
def sound(id,key,t,d=.20,gain=.055):
 t=max(0,t);start=round(t*R);n=min(round(d*R),len(sounds[key]),N-start);a=sounds[key][:n].copy();a*=gain/max(.001,float(np.max(np.abs(a))));edge=min(round(.005*R),n//2);a[:edge]*=np.linspace(0,1,edge);a[-edge:]*=np.linspace(1,0,edge);fx[start:start+n]+=a;events.append(dict(id=id,sound=key,start=t,duration=n/R,peakGain=gain))
sound('opening-report-fall','swoosh',0,.22,.04);sound('report-impact','folder',e['reportHit'],.25,.08)
for s in shots[1:]:sound(s['id']+'-cut','swoosh',s['start'],.15,.025 if s['id']!='reaction' else .018)
sound('report-open','folder',e['reportOpen'],.55,.055)
sound('defensive-palm','swoosh',e['talent']+.3,.3,.024)
for i in range(3):
 sound('project-paper-move-'+str(i),'swoosh',e['allocation']+.05+i*.15,.30,.018)
 sound('project-paper-land-'+str(i),'tap',e['allocation']+.53+i*.15,.12,.045)
for i in range(4):sound('salary-coin-'+str(i),'tap',e['salary']+.44+i*.13,.12,.055)
sound('result-last-place','tap',e['result']+.52,.14,.065)
sound('manager-phone-reveal','snap',e['managerPhone']+.12,.12,.04)
sound('expense-receipt-turn','folder',e['expense'],.35,.065)
sound('hopeful-lean','swoosh',e['worked']+.12,.35,.022)
sound('viewer-question-card','swoosh',e['cta'],.24,.025)
sound('viewer-question-palm','swoosh',e['cta']+.3,.3,.018)
for i,w in enumerate(lines['cta']['words']):sound('viewer-question-word-'+str(i),'snap' if normal(w['text'])=='break' else 'tap',w['start'],.08,.022 if normal(w['text'])=='break' else .012)
wav(P/'effects-mono.wav',fx);run(['ffmpeg','-v','error','-y','-i',str(P/'effects-mono.wav'),'-af','pan=stereo|c0=c0|c1=c0',str(P/'effects.wav')]);(B/'audio-events.json').write_text(json.dumps(events,indent=2)+'\n');(B/'assets/sfx-ledger.json').write_text(json.dumps(ledger,indent=2)+'\n')
run(['ffmpeg','-v','error','-y','-i',str(ROOT/plan['music']['source']),'-t',str(D),'-af',f"volume={plan['music']['gainDb']}dB,afade=t=in:d=0.005,afade=t=out:st={D-.08}:d=0.08",'-ar',str(R),'-ac','2',str(P/'music.wav')])
ep=json.loads((ROOT/'episodes/billionaire-body-swap-3/episode.json').read_text());ep.update(id=SLUG,title=plan['title'],world='swap4',number=26,premise='The former billionaire faces your parents’ evening and treats school like his company. Mum has one unexpected question about his expense claim. Viewers suggest what part of their own life would break him next.',duration=D,fps=30,cast=['miko','billionaire','teacher','mum'],audio=dict(narration=f'episodes/{SLUG}/narration.wav',music=f'episodes/{SLUG}/music.wav',effects=f'episodes/{SLUG}/effects.wav',narrationOffset=0,narrationTrimStart=0,narrationTail=D-lines['cta']['words'][-1]['end'],pauses=[]),scenes=[{**s,'label':s['id'],'timeOfDay':'evening'} for s in shots]);(B/'episode.json').write_text(json.dumps(ep,indent=2,ensure_ascii=False)+'\n')
plan['measuredDurationSeconds']=D;plan['lines']=spec['lines'];(B/'plan.json').write_text(json.dumps(plan,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(dict(duration=D,frames=round(D*30),words=sum(len(l['words']) for l in lines.values()),shots=len(shots),events=e)))
