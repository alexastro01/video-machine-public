"""Assemble the exact Part 5 performances, phone states, props and local sound."""
from pathlib import Path
import json
import numpy as np
from dialogue_media import ROOT,R,assemble,pcm,wav,run,normal
SLUG='billionaire-body-swap-5';B=ROOT/'episodes'/SLUG;P=ROOT/'public/episodes'/SLUG
plan=json.loads((B/'plan.json').read_text());spec,timeline,_=assemble(SLUG);lines={l['id']:l for l in timeline['lines']};D=timeline['duration'];N=round(D*R)
def word(line,text):return next(w['start'] for w in lines[line]['words'] if normal(w['text'])==normal(text))
opening=plan['opening']
e={k:l['start'] for k,l in lines.items()};e.update(faceUnlock=.72,balancePreview=.75,callerReveal=opening['faceInsertSeconds'],bankQuestion=lines['question']['start'],questionCaller=lines['question']['start']+opening['questionInsertSeconds'],firstType=lines['titan']['start']+.10,reject1=lines['wrong']['start'],secondType=lines['caps']['start']+.10,reject2=lines['caps']['end']-.16,lidOpen=lines['cage']['start']+.15,wheel=word('shoebox','wheel'),name=word('nibbles','Mister'),success=lines['worked']['start']-.20,vault=lines['security']['start'],vaultOpen=lines['security']['start']+.20,guard=word('payoff','Protected'),end=D)
starts=[('face-hook',0,'swap-office'),('hook-caller',e['callerReveal'],'swap-office'),('question-hook',e['bankQuestion'],'swap-office'),('question',e['questionCaller'],'swap-office'),('assistant',e['assistant'],'swap-kitchen'),('six',e['six'],'swap-office'),('titan-entry',e['titan'],'swap-office'),('wrong',e['wrong'],'swap-office'),('caps',e['caps'],'swap-office'),('business',e['business'],'swap-office'),('office',e['office'],'swap-kitchen'),('cage',e['cage'],'swap-memory'),('shoebox',e['shoebox'],'swap-memory'),('wheel',e['wheel'],'swap-memory'),('hostage',e['hostage'],'swap-office'),('nibbles',e['nibbles'],'swap-office'),('security',e['security'],'swap-vault'),('payoff',e['payoff'],'swap-vault'),('guard',e['guard'],'swap-vault')];starts.sort(key=lambda x:x[1])
desc={'face-hook':'The phone is already moving into view; its face lock resolves once.','balance-hook':'A glimpse of the fictional £8 billion account is blocked by verification.','question-hook':'The same phone asks for the first pet’s name; the financial obstacle is explicit.','question':'Adult viewer calls the former billionaire for the answer.','assistant':'Young body tries to delegate a childhood memory to his assistant.','six':'Viewer points out that she was not there when he was six.','titan-entry':'Viewer makes one finite phone-tapping gesture while trying Titan.','wrong':'The phone rejects the first answer on the spoken Wrong.','caps':'An uppercase retry changes the letters, then fails again.','business':'Viewer reacts to the huge name given to the tiny animal.','office':'Young body proudly remembers his pet’s office.','cage':'The cardboard lid starts opening on the cage question.','shoebox':'A close view reveals the shoebox, tiny hamster and wheel.','wheel':'The hamster runs briefly inside the physical wheel and settles.','hostage':'Viewer reacts to the small, personal memory blocking access.','nibbles':'The young body remembers Mister Nibbles; the answer stays hidden until it is spoken.','success':'The correct name enters and the bank accepts it.','worked':'Viewer sees that the remembered name worked.','security':'The metaphor becomes a physical vault with a tiny hamster guard.','payoff':'The open vault reveals the account balance.','guard':'Mister Nibbles gives one finite salute, recovers and holds through the ending.'}
desc['hook-caller']='Cut to the adult caller after the short face-unlock insert; no held balance screen.'
line_for={'face-hook':'hook','hook-caller':'hook','question-hook':'question','titan-entry':'titan','wheel':'shoebox','success':'nibbles','guard':'payoff'}
shots=[dict(id=id,start=t,duration=(starts[i+1][1] if i+1<len(starts) else D)-t,set=set,action='reveal',anchor=lines[line_for.get(id,id)]['text'],description=desc[id]) for i,(id,t,set) in enumerate(starts)]
for s in shots:assert s['duration']>.10,s
assets=[]
for id,a in json.loads((B/'assets/poses.json').read_text()).items():assets.append({k:a[k] for k in ['width','height','worldHeight','pivotX','footY']}|{'id':id,'url':a['file']})
for id,a in json.loads((B/'assets/animations.json').read_text()).items():
 m=a['metadata'];c=m['crop'];assets.append(dict(id=id+'-gif',url=a['file'],width=c['width'],height=c['height'],worldHeight=a['worldHeight'],pivotX=m['cellWidth']/2-c['x'],footY=c['height'],animation=m))
edit=dict(id=SLUG,title=plan['title'],width=1080,height=1920,fps=30,duration=D,events=e,lines=list(lines.values()),shots=shots,assets=assets,model=f'episodes/{SLUG}/swap-stage-5.glb',ui=plan['ui']);(B/'edit.json').write_text(json.dumps(edit,indent=2,ensure_ascii=False)+'\n')
captions=[]
for l in timeline['lines']:
 pending=[]
 for index,w in enumerate(l['words']):
  pending.append(w)
  if len(pending)==2 or w['text'].endswith(('.', '?', '!')) or index==len(l['words'])-1:
   captions.append(dict(text=' '.join(spec.get('captionReplacements',{}).get(q['text'],q['text']) for q in pending),startMs=round(pending[0]['start']*1000),endMs=round(pending[-1]['end']*1000),timestampMs=round(pending[0]['start']*1000),confidence=None))
   pending=[]
(B/'captions.json').write_text(json.dumps(captions,indent=2)+'\n')
ledger=json.loads((B/'assets/sfx-ledger.json').read_text());sounds={r['id']:pcm(ROOT/r['localFile']) for r in ledger};fx=np.zeros(N);events=[]
def sound(id,key,t,d=.2,gain=.045,speed=1):
 t=max(0,t);a=sounds[key]
 if speed!=1:a=np.interp(np.arange(0,len(a),speed),np.arange(len(a)),a)
 start=round(t*R);n=min(round(d*R),len(a),N-start);a=a[:n].copy();a*=gain/max(.001,float(np.max(np.abs(a))));edge=min(round(.005*R),n//2);a[:edge]*=np.linspace(0,1,edge);a[-edge:]*=np.linspace(1,0,edge);fx[start:start+n]+=a;events.append(dict(id=id,sound=key,start=t,duration=n/R,peakGain=gain,playbackSpeed=speed))
sound('phone-arrives','swoosh',0,.25,.05);sound('face-unlocks','beep',e['faceUnlock'],.24,.045);sound('money-preview','money',e['balancePreview'],.35,.042);sound('security-prompt','snap',e['bankQuestion'],.15,.055)
for s in shots:
 if s['id'] not in ['face-hook','question-hook']:sound(s['id']+'-cut','swoosh',s['start'],.14,.022)
sound('call-connects','tap',e['question']+.1,.12,.04);sound('first-typing','typing',e['firstType']+.25,.65,.028);sound('first-wrong','beep',e['reject1'],.28,.05,.72);sound('caps-typing','typing',e['secondType'],.48,.025);sound('second-wrong','beep',e['reject2'],.24,.045,.72)
sound('shoebox-lid-opens','folder',e['lidOpen'],.50,.055);sound('wheel-start','plate',e['wheel']+.12,1.45,.027);sound('remembered-name','tap',e['name'],.12,.04);sound('correct-answer','beep',e['success']+.22,.28,.05,1.12);sound('vault-handle','metal',e['vaultOpen'],.3,.035);sound('vault-door','folder',e['vaultOpen']+.12,.65,.05);sound('small-salute','swoosh',e['guard']+.2,.28,.026)
wav(P/'effects-mono.wav',fx);run(['ffmpeg','-v','error','-y','-i',str(P/'effects-mono.wav'),'-af','pan=stereo|c0=c0|c1=c0',str(P/'effects.wav')]);(B/'audio-events.json').write_text(json.dumps(events,indent=2)+'\n')
run(['ffmpeg','-v','error','-y','-i',str(ROOT/plan['music']['source']),'-t',str(D),'-af',f"volume={plan['music']['gainDb']}dB,afade=t=in:d=0.005,afade=t=out:st={D-.08}:d=0.08",'-ar',str(R),'-ac','2',str(P/'music.wav')])
ep=json.loads((ROOT/'episodes/billionaire-body-swap-4/episode.json').read_text());ep.update(id=SLUG,title=plan['title'],world='swap5',number=27,premise='Your new face unlocks the billionaire’s phone, but the fictional bank asks for a childhood pet’s name.',duration=D,cast=['miko','billionaire'],audio=dict(narration=f'episodes/{SLUG}/narration.wav',music=f'episodes/{SLUG}/music.wav',effects=f'episodes/{SLUG}/effects.wav',narrationOffset=0,narrationTrimStart=0,narrationTail=D-lines['payoff']['words'][-1]['end'],pauses=[]),scenes=[{**s,'label':s['id'],'timeOfDay':'evening'} for s in shots]);(B/'episode.json').write_text(json.dumps(ep,indent=2,ensure_ascii=False)+'\n');plan['measuredDurationSeconds']=D;(B/'plan.json').write_text(json.dumps(plan,indent=2,ensure_ascii=False)+'\n');print(json.dumps({'duration':D,'frames':round(D*30),'words':sum(len(l['words']) for l in lines.values()),'shots':len(shots),'events':e}))
