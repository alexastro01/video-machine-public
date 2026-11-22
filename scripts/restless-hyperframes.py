"""Editable local HyperFrames assembly: native world footage, data and captions."""
from pathlib import Path
import argparse,json,shutil,html,math

parser=argparse.ArgumentParser();parser.add_argument('--variant');args=parser.parse_args()
if args.variant and not all(c.islower() or c.isdigit() or c=='-' for c in args.variant):raise ValueError('Invalid variant slug')
BASE=Path('episodes/restless-friend');B=BASE/'variants'/args.variant if args.variant else BASE;P=B/'hyperframes';PUB=Path('public/episodes/restless-friend')/('variants/'+args.variant) if args.variant else Path('public/episodes/restless-friend');T=json.loads((B/'timeline.json').read_text());D=T['duration'];E=T['events'];C=json.loads((B/'captions.json').read_text());DATA=json.loads((B/'shot-recipe.json').read_text())['data']
variant=json.loads((B/'variant.json').read_text()) if args.variant else {};voice=variant.get('voice','Amara selected take 2');rate=variant.get('narrationPlaybackRate',1.2)
requested_world=json.loads((B/'visuals.json').read_text()).get('worldFile','world-v1.mp4') if (B/'visuals.json').exists() else 'world-v1.mp4'
doctor_motion='The scientist writes one note after the scientist narration, then glances up and holds; no repeating writing cycle.' if (B/'visuals.json').exists() and json.loads((B/'visuals.json').read_text()).get('assetRevision',1)>=3 else 'The scientist uses the native writing action.'
world_asset=requested_world if (P/'assets'/requested_world).exists() else ('world-v1.mp4' if (P/'assets/world-v1.mp4').exists() else 'world-staging-v1.mp4')
for sub in ['assets','assets/fonts','assets/vendor','compositions']:(P/sub).mkdir(parents=True,exist_ok=True)
for name in ['narration','music','effects']:shutil.copyfile(PUB/(name+'.wav'),P/'assets'/(name+'.wav'))
for src,dest in [('experiments/hyperframes/assets/vendor/gsap.min.js','assets/vendor/gsap.min.js'),('experiments/hyperframes/assets/fonts/dmsans.ttf','assets/fonts/dmsans.ttf'),('experiments/hyperframes/assets/fonts/dmsans-OFL.txt','assets/fonts/dmsans-OFL.txt'),('public/episodes/inventions-since-2000/fonts/InterVariable.woff2','assets/fonts/InterVariable.woff2'),('public/episodes/inventions-since-2000/fonts/Inter-OFL.txt','assets/fonts/Inter-OFL.txt')]:shutil.copyfile(src,P/dest)
CSS="""@font-face{font-family:'DM Sans';src:url('assets/fonts/dmsans.ttf');font-weight:100 1000}@font-face{font-family:'Inter';src:url('assets/fonts/InterVariable.woff2');font-weight:100 900}*{box-sizing:border-box}#root{position:absolute;inset:0;overflow:hidden;font-family:'Inter',sans-serif;color:#f4eddc}video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.number{font-variant-numeric:tabular-nums;letter-spacing:-5px;font-weight:850}.caption{position:absolute;left:108px;top:1320px;width:864px;height:150px;display:flex;align-items:center;justify-content:center;text-align:center;font:900 84px/1.08 'DM Sans';letter-spacing:-1.6px;color:white;-webkit-text-stroke:10px #111c23;paint-order:stroke fill;text-shadow:0 5px 0 #111c23}.caption span{display:inline-block}.label{font-weight:750;font-size:54px;text-align:center;letter-spacing:-1px}.unit{font-weight:650;font-size:48px;text-align:center;color:#d8ddd2}"""
def doc(id,content,script='',extra=''):
    return f'<template><style>{CSS}{extra}</style><div id="root" data-composition-id="{id}" data-width="1080" data-height="1920">{content}</div><script>const tl=gsap.timeline({{paused:true}});{script}window.__timelines["{id}"]=tl;</script></template>'
def timed(id,start,duration,markup,cls='',style=''):
    return f'<div id="{id}" class="clip {cls}" data-start="{start:.6f}" data-duration="{duration:.6f}" data-track-index="1" style="{style}">{markup}</div>'
STORY=[]
for shot in T['shots']:
    sid=shot['id'];start=shot['start'];duration=shot['duration'];body=f'<video id="{sid}-world" class="clip" src="assets/{world_asset}" data-start="0" data-duration="{duration:.8f}" data-media-start="{start:.8f}" data-track-index="0" muted playsinline></video>';js=f'tl.to({{clock:0}},{{clock:{duration},duration:{duration},ease:"none"}});'
    if sid=='experiment':
        for key,text,at in [('year','1999',E['year']),('volunteers','16 PEOPLE',E['volunteers']),('calories','+1,000',E['calories']),('weeks','8 WEEKS',E['weeks'])]:
            local=max(0,at-start);until=E['calories']-start if key in ['year','volunteers'] else duration
            if key=='year':until=E['volunteers']-start
            y=270 if key!='weeks' else 550;size=148 if key=='calories' else 78
            markup=f'<span id="study-{key}-inner" style="display:inline-block">{text}</span>'
            if key=='calories':markup+='<div style="font:650 47px Inter;letter-spacing:-1px;margin-top:6px">EXTRA kcal/day</div>'
            body+=timed('study-'+key,local,max(.1,until-local),markup,'number',f'position:absolute;left:108px;top:{y}px;width:864px;text-align:center;font-size:{size}px;color:#172e37')
            js+=f'tl.fromTo("#study-{key}-inner",{{scale:.86,y:20}},{{scale:1,y:0,duration:.16,ease:"power2.out"}},{local});'
    elif sid=='fat-chart':
        low,high=DATA['fatGainKg'];height=660;lh=height*low/high;baseline=1130;lo=E['lowFat']-start;hi=E['highFat']-start
        body+=f'<svg id="fat-data" width="1080" height="1920" viewBox="0 0 1080 1920" style="position:absolute;inset:0" aria-label="Body fat gained ranged from 0.36 to 4.23 kilograms"><rect width="1080" height="1920" fill="#182d37"/><path d="M 205 {baseline} H 910" stroke="#a4b7b1" stroke-width="5"/><rect x="260" y="{baseline-lh}" width="190" height="{lh}" fill="#35515b"/><rect x="670" y="{baseline-height}" width="190" height="{height}" fill="#35515b"/><rect id="fat-low" x="260" y="{baseline-lh}" width="190" height="{lh}" fill="#a3b99b"/><rect id="fat-high" x="670" y="{baseline-height}" width="190" height="{height}" fill="#c88375"/></svg>'
        body+=timed('fat-low-label',lo,duration-lo,'0.36','number','position:absolute;left:195px;top:890px;width:320px;font-size:140px;text-align:center;color:#b4c8a9')
        body+=timed('fat-high-label',hi,duration-hi,'4.23','number','position:absolute;left:607px;top:260px;width:320px;font-size:140px;text-align:center;color:#dc9b8d')
        body+='<div class="unit" style="position:absolute;left:198px;top:1180px;width:730px">kg OF FAT GAINED</div>'
        js+=f'tl.fromTo("#fat-low",{{attr:{{y:{baseline},height:0}}}},{{attr:{{y:{baseline-lh},height:{lh}}},duration:.45,ease:"power3.out"}},{lo});tl.fromTo("#fat-high",{{attr:{{y:{baseline},height:0}}}},{{attr:{{y:{baseline-height},height:{height}}},duration:.55,ease:"power3.out"}},{hi});'
    elif sid=='reveal':
        at=E['neat']-start;body+=timed('neat-name',at,min(1.5,duration-at),'<span id="neat-name-inner">NEAT</span>','number','position:absolute;left:108px;top:320px;width:864px;text-align:center;font-size:142px;color:#edcf96');js+=f'tl.fromTo("#neat-name-inner",{{scale:.90}},{{scale:1,duration:.18,ease:"power2.out"}},{at});'
    elif sid=='maximum':
        finish=E['qualifier']-start;count_start=E['maximum']-start
        body+=timed('maximum-data',0,finish,'<div style="font:750 43px Inter;letter-spacing:1px;color:#172e37">ONE PARTICIPANT</div><div style="font:850 165px Inter;letter-spacing:-7px;color:#172e37;margin-top:7px">+<span id="neat-counter">0</span></div><div style="font:650 49px Inter;letter-spacing:-1px;color:#10202a;margin-top:-6px">kcal/day</div>','','position:absolute;left:108px;top:200px;width:864px;text-align:center')
        js+=f'const counter={{v:0}};tl.to(counter,{{v:{DATA["maximumNeatIncreaseKcalPerDay"]},duration:.5,ease:"power2.out",onUpdate:()=>{{document.getElementById("neat-counter").textContent=Math.round(counter.v)}}}},{count_start});'
    (P/'compositions'/(sid+'.html')).write_text(doc(sid,body,js))
    STORY.append(f'- {start:.3f}–{start+duration:.3f}s, frames {round(start*30)}–{round((start+duration)*30)-1}: {sid}, {shot["action"]}. Narration anchor: “{shot["anchor"]}”.')
# Group into two-word pages but reveal only the words already being spoken.
pages=[];group=[]
for w in C:
    if group and (len(group)==2 or w['startMs']-group[-1]['endMs']>280):pages.append(group);group=[]
    group.append(w)
    if w['text'].strip().endswith(('.', '?','!','…')):pages.append(group);group=[]
if group:pages.append(group)
cues=[]
for page in pages:
    for j,w in enumerate(page):
        end=page[j+1]['startMs'] if j+1<len(page) else page[-1]['endMs'];cues.append({'start':w['startMs']/1000,'end':end/1000,'words':page[:j+1]})
# A short prefix can fall completely between output frames. Its word must
# remain in the next progressive state; never drop a spoken token to fix it.
all_cues=cues;cues=[c for c in all_cues if math.ceil(c['start']*T['fps']-1e-8)<math.ceil(c['end']*T['fps']-1e-8)]
covered={(w['startMs'],w['text']) for c in cues for w in c['words']}
assert all((w['startMs'],w['text']) in covered for w in C), 'A spoken token has no visible caption frame'
(B/'caption-frame-coverage.json').write_text(json.dumps({'displayTokens':len(C),'visibleProgressiveStates':len(cues),'everyDisplayTokenVisible':True,'subframePrefixStates':[c for c in all_cues if c not in cues],'method':'An unsampled prefix is represented by its next progressive state after both words have begun. Source word timestamps are unchanged.'},indent=2)+'\n')
def tone(word):
    if word.strip().startswith(('4.23','not')):return '#e5a092'
    if word.strip().startswith(('0.36','NEAT','movement','lean')):return '#c1d4ae'
    if word.strip().startswith(('1999','16','1,000','8','692','Fidgeting','Pacing','Standing')):return '#edcf96'
    return '#ffffff'
cc=[];js=[]
for i,c in enumerate(cues):
    text=' '.join(f'<span style="color:{tone(w["text"])}">{html.escape(w["text"].strip().upper())}</span>' for w in c['words']);cc.append(timed(f'caption-{i}',c['start'],c['end']-c['start'],f'<span id="caption-inner-{i}">{text}</span>','caption'));js.append(f'tl.fromTo("#caption-inner-{i}",{{scale:.96}},{{scale:1,duration:.06,ease:"power2.out"}},{c["start"]});')
(P/'compositions/captions.html').write_text(doc('captions',''.join(cc),''.join(js)))
(B/'caption-cues.json').write_text(json.dumps(cues,indent=2)+'\n')
hosts=''.join(f'<div id="{s["id"]}" class="clip" data-composition-id="{s["id"]}" data-composition-src="compositions/{s["id"]}.html" data-start="{s["start"]:.8f}" data-duration="{s["duration"]:.8f}" data-track-index="0" data-track-kind="graphics" data-width="1080" data-height="1920" style="position:absolute;inset:0;z-index:1"></div>' for s in T['shots'])
hosts+=f'<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{D}" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920" data-layout-allow-overlap style="position:absolute;inset:0;z-index:10"></div>'
audio=''.join(f'<audio id="{n}" class="clip" src="assets/{n}.wav" data-start="0" data-duration="{D}" data-track-index="{i+3}" data-volume="1"></audio>' for i,n in enumerate(['narration','music','effects']))
(P/'index.html').write_text(f'<!doctype html><html lang="en" data-resolution="portrait"><head><meta charset="UTF-8"><meta name="viewport" content="width=1080,height=1920"><script src="assets/vendor/gsap.min.js"></script><style>{CSS}html,body{{margin:0;width:1080px;height:1920px;overflow:hidden;background:#456871}}</style></head><body><div id="root" data-composition-id="main" data-width="1080" data-height="1920" data-start="0" data-duration="{D}" data-fps="30">{hosts}{audio}</div><script>window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});tl.to({{t:0}},{{t:{D},duration:{D},ease:"none"}});window.__timelines.main=tl;</script></body></html>')
(P/'meta.json').write_text(json.dumps({'id':'restless-friend-'+(args.variant or 'v2'),'name':T['title']},indent=2)+'\n')
(P/'package.json').write_text(json.dumps({'name':'restless-friend-hyperframes','private':True,'type':'module','scripts':{k:f'npx --yes hyperframes@0.9.23 {v}' for k,v in {'dev':'preview','check':'check','render':'render','publish':'publish'}.items()}},indent=2)+'\n')
(P/'STORYBOARD.md').write_text('# The restless friend\n\n'+B.joinpath('visual-brief.md').read_text()+'\n\n'+'\n'.join(STORY)+'\n')
(P/'SPEC.md').write_text(f'''# Restless friend specification

GOAL: Reveal that everyday movement can help explain variation in fat gain, through two friends and the 1999 study.
OUTPUT: HyperFrames + Blender Eevee, 1080×1920, 30 fps, {D}s / {round(D*30)} frames.
LOOK: Muted teal #557D80, warm timber #C49A65, cream #E5D7B7; Miko's red scarf is the strongest costume colour. Local DM Sans 900 captions, 84px, 10px black outline, centre near 72%; Inter Variable data labels at 43–165px. Native delivery-resolution world, 24 samples, warm window/lamp key and cool rim. No pixelated upscale on the world.
OBJECTS: Sofa, held pizza slice, salad, measured food plates, 16 adult volunteers, writing clipboard scientist, two proportional fat-gain bars, native pixel-art legs and sneakers, phone and bench. Four poses per sheet plus a repaired full-head standing Miko, seven native 12-frame 10fps GIF actions. Standing source frame 11 is excluded because it touches the top border.
MOTION: First frame is already mid-bite. Hand/food contact, a stationary support shoe beside the fidgeting foot, finite reactions, real phone walk and stand-up action. {doctor_motion} Camera cuts and a motivated 0.5s move to the foot. Changes of angle during the 6.3s lab and 7.3s maximum beats keep each read under four seconds. No whole-character bounce to show fidgeting.
DATA: 16 people, +1,000 kcal/day for 8 weeks; fat-gain endpoints 0.36 and 4.23 kg. +692 kcal/day is the largest individual's NEAT increase, not a leg-tap promise. Caption numerals preserve the exact spoken number intervals.
SOUND: {voice}; exact {rate}× pitch-preserving narration playback. Cut, bite, fork, plate, paper, chart, heel, step, bench and pen effects. Saved ElevenLabs channel score, speech-ducked. Separate editable stems and a delivery master measured after encoding.
SHOTS: STORYBOARD.md, ../timeline.json and ../shot-recipe.json.
BANNED: Branding, title cards, top banners, decorative callouts, caption boxes, flashy white wipes, held empty scenes, arbitrary calorie promises, claims that genes/metabolism are irrelevant, portrait sprites at steep camera angles, body/prop intersections, coarse enlarged world renders.
QA: Check the opening action and captions, all 16 volunteers, plate contact, chart ratio and units, complete sneaker silhouettes and native heel motion, phone stride and stand-up, +692 qualifier and hair clearance, Miko's imitation and final loop. Inspect start/mid/end and actual encoded motion. Measure audio; do not claim it was auditioned.
''')
print(json.dumps({'project':str(P),'duration':D,'storyShots':len(T['shots']),'captionCues':len(cues),'worldAsset':world_asset,'worldReady':P.joinpath('assets',requested_world).exists()},indent=2))
