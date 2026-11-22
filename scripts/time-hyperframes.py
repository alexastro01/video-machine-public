"""Build editable portrait scenes around the selected narration and native actions."""
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT / "episodes/time-speeds-up"
PUB = ROOT / "public/episodes/time-speeds-up"
PROJECT = EP / "hyperframes"
T = json.loads((EP / "timeline.json").read_text())
D = T["duration"]
ESC = html.escape

CSS = """@font-face{font-family:'DM Sans';src:url('assets/fonts/dmsans.ttf');font-weight:100 1000}
*{box-sizing:border-box}#root{position:absolute;inset:0;overflow:hidden;font-family:'DM Sans';color:#fff}
.stage,.back,.motion{position:absolute;inset:0;width:1080px;height:1920px}
.stage{transform-origin:50% 50%}.back,.motion{object-fit:cover;image-rendering:pixelated}
.ink{text-shadow:0 3px 0 #12232d;-webkit-text-stroke:2px #12232d;paint-order:stroke fill}
.caption{position:absolute;left:80px;top:1265px;width:870px;height:115px;display:flex;align-items:center;justify-content:center;text-align:center;font:900 86px/1.08 'DM Sans';letter-spacing:-1.2px;-webkit-text-stroke:11px #101920;paint-order:stroke fill;text-shadow:0 6px 0 #101920}
.caption-inner{display:block}.note{position:absolute;font-weight:750;line-height:1.18}
.notification{position:absolute;left:130px;top:245px;width:790px;padding:28px 35px;background:#f6ecd3;color:#1d343d;border:5px solid #203b47;border-radius:28px;font-size:51px;font-weight:750;line-height:1.2;box-shadow:0 12px 0 #142b35aa}
.phone{position:absolute;left:135px;top:200px;width:780px;height:1270px;border:20px solid #18252f;border-radius:65px;background:#eee3c9;box-shadow:0 18px 0 #0b182399;overflow:hidden;color:#21363e}
.phone h1{position:absolute;top:75px;left:60px;margin:0;font-size:91px;line-height:1;font-weight:850;letter-spacing:-3px}
.phone .count{position:absolute;top:178px;left:65px;font-size:37px;font-weight:750;color:#47616b;letter-spacing:.4px}
.phone .notch{position:absolute;left:275px;top:0;width:190px;height:30px;background:#18252f;border-radius:0 0 15px 15px}
.gallery-window{position:absolute;top:260px;left:35px;width:670px;height:735px;overflow:hidden}
.gallery{display:grid;grid-template-columns:repeat(3,214px);grid-auto-rows:214px;gap:14px}
.photo{position:relative;overflow:hidden;background:#8bafb2;border:3px solid #fff3dd}
.photo img.quad{position:absolute;width:200%;height:200%}.photo img.full{width:100%;height:100%;object-fit:cover;image-rendering:pixelated}
.screen-shot{background:#d3dce0;padding:22px 16px}.screen-line{height:11px;margin:13px 0;background:#8c9da5;border-radius:1px}.screen-line:nth-child(3n){width:64%}.screen-head{width:44px;height:44px;background:#b2bfbc;border:4px solid #7b9393}
.day{position:absolute;left:110px;top:220px;font-size:51px;font-weight:850;letter-spacing:1px;color:#fff4d0}
.jar{position:absolute;width:190px;height:250px;transform-origin:50% 100%}
.jar svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.jar-picture{position:absolute;left:27px;top:65px;width:136px;height:90px;overflow:hidden;background:#748d86}
.jar-picture img{width:100%;height:100%;object-fit:cover;image-rendering:pixelated}.jar-picture img.quad{position:absolute;width:200%;height:200%}
.jar-label{position:absolute;left:20px;right:20px;bottom:18px;min-height:52px;text-align:center;font-size:32px;font-weight:900;line-height:1.02;color:#2b3840;letter-spacing:-.5px}
.memory-rule{position:absolute;left:210px;top:250px;width:740px;text-align:center;font-size:51px;line-height:1.17;font-weight:850;color:#fff1c6}
.rule-small{font-size:39px;line-height:1.25;color:#d7e9dc}
.paradox{position:absolute;left:110px;top:210px;width:820px;text-align:center;font-size:48px;font-weight:850;color:#173441;line-height:1.2}
.paradox strong{display:block;font-size:64px;margin-top:25px;color:#173441}
.age{position:absolute;left:455px;top:1328px;width:250px;text-align:center;font-size:100px;font-weight:900;color:#5a341b;text-shadow:0 3px 0 #e7b776;letter-spacing:-5px;line-height:1}
.hero-stage{transform-origin:50% 50%}
""".replace("\\+", "")


def document(cid, duration, body, js=""):
    return (f'<template><style>{CSS}</style><div id="root" data-composition-id="{cid}" data-width="1080" data-height="1920" '
            f'data-duration="{duration}" data-layout-allow-overflow data-layout-allow-overlap>{body}</div><script>'
            f'window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});{js}'
            f'tl.to({{t:0}},{{t:{duration},duration:{duration},ease:"none"}},0);window.__timelines["{cid}"]=tl;'
            '</script></template>')


def quad_image(index):
    return (f'<img class="quad" src="assets/art/child-memories.png" '
            f'style="left:{-(index % 2) * 100}%;top:{-(index // 2) * 100}%" alt="Childhood memory">')


def jar(name, x, bottom, label, art=None, quad=None, empty=False, width=190):
    picture = quad_image(quad) if quad is not None else (f'<img src="assets/art/{art}.png" alt="A distinct memory">' if art else '')
    picture = f'<div class="jar-picture">{picture}</div>' if picture else ''
    label_html = '<br>'.join(ESC(x) for x in label.split('|'))
    fill = '#8aaea4' if empty else '#dfb85b'
    return (f'<div id="{name}" class="jar" style="left:{x-width/2}px;top:{bottom-width*250/190}px;width:{width}px;height:{width*250/190}px">'
            f'<div style="position:absolute;width:190px;height:250px;transform:scale({width/190});transform-origin:0 0">'
            '<svg viewBox="0 0 190 250" aria-hidden="true"><path d="M46 14H144V35H154V47H165V225H154V237H36V225H25V47H36V35H46Z" '
            f'fill="{fill}" fill-opacity="{.18 if empty else .87}" stroke="#172d34" stroke-width="8"/>'
            '<path d="M43 10H147V32H43Z" fill="#927142" stroke="#172d34" stroke-width="7"/>'
            '<path d="M38 48H47V214H38M148 57H154V208H148" fill="#e9f0c2" opacity=".6"/>'
            '<path d="M24 158H166V234H24Z" fill="#ebd9aa" stroke="#6a735a" stroke-width="3"/>'
            '</svg>'+picture+f'<div class="jar-label">{label_html}</div></div></div>')


def gallery(year):
    cards = []
    count = 15 if year == 2008 else 11
    for i in range(count):
        if year == 2008:
            cards.append('<div class="photo">'+quad_image(i % 4)+'</div>')
        elif i in {2, 8}:
            a = 'birthday' if i == 2 else 'bedroom'
            cards.append(f'<div class="photo"><img class="full" src="assets/art/{a}.png" alt="A personal photo"></div>')
        else:
            cards.append('<div class="photo screen-shot"><div class="screen-head"></div>'+('<div class="screen-line"></div>'*4)+'</div>')
    return ('<div class="phone" data-layout-allow-overflow><div class="notch"></div>'
            f'<h1>{year}</h1><div class="count">'+('247 PHOTOS' if year == 2008 else '11 PHOTOS · MOSTLY SCREENSHOTS')+
            '</div><div class="gallery-window"><div id="gallery" class="gallery">'+''.join(cards)+'</div></div></div>')


def build_shot(s):
    sid, dur = s['id'], s['duration']
    animation = s.get('animation')
    base = f'assets/art/{s["art"]}.png'
    body, js = [], []
    if animation:
        base = f'assets/animations/{animation}/last.png'
    if sid == 'kid-returns':
        base = 'assets/animations/roof-child-arrives/hold.png'
    if sid == 'candle':
        base = 'assets/animations/birthday-blow/first.png'
    if sid == 'candle-stays':
        base = 'assets/animations/birthday-blow/first.png'
    body.append(f'<div id="stage" class="stage"><img id="background" class="back" data-var-src="background" src="{base}" alt="{ESC(s["description"],quote=True)}">')
    if animation:
        native_duration = 1.0 if animation == 'roof-child-arrives' else 1.2 if animation == 'birthday-blow' else 1.68 if animation == 'phone-set-down' else 2.4
        starts = [0, 1.2, 2.4] if animation == 'birthday-blow' else [0]
        for i, start in enumerate(starts):
            length = min(dur - start, native_duration)
            if length <= 0:
                continue
            body.append(f'<video id="action-{i}" class="clip motion" src="assets/animations/{animation}/{animation}.mp4" '
                        f'data-start="{start}" data-duration="{length}" data-media-start="0" data-track-index="0" muted playsinline></video>')
    if sid in {'candle', 'candle-stays'}:
        a = 2.6 if sid == 'candle' else 0
        body.append(f'<div id="age-clip" class="clip age" data-start="{a}" data-duration="{dur-a}" data-track-index="1"><span id="age-number" data-var-text="birthdayAge" style="display:inline-block">26</span></div>')
        js.append('tl.set("#stage",{scale:1.14,y:-120},0);')
        if sid == 'candle':
            js.append('tl.fromTo("#stage",{scale:1.14,y:-120},{scale:1.17,y:-145,duration:.3,ease:"power2.out"},0);')
        else:
            js.append(f'tl.to("#age-number",{{opacity:0,duration:.2,ease:"sine.inOut"}},{dur-.25});')
    elif sid == 'text':
        body.append('<div id="message" class="notification"><div style="font-size:33px;margin-bottom:10px;color:#597079">A FRIEND</div>What did you do<br>this year? ☺</div>')
        js.append('tl.fromTo("#message",{y:-20,opacity:0},{y:0,opacity:1,duration:.22,ease:"power2.out"},.05);')
    elif sid in {'camera-2008', 'camera-2026'}:
        body.append(gallery(2008 if sid == 'camera-2008' else 2026))
        if sid == 'camera-2008':
            js.append(f'tl.fromTo("#gallery",{{y:0}},{{y:-280,duration:{dur-.3},ease:"sine.inOut"}},.15);')
        else:
            js.append('tl.fromTo("#gallery",{y:0},{y:-90,duration:1.3,ease:"sine.out"},.2);')
    elif sid == 'cant-name-one':
        js.append(f'tl.fromTo("#stage",{{scale:1.04,y:0}},{{scale:1.13,y:12,duration:{dur},ease:"sine.inOut"}},0);')
    elif sid.startswith('same-'):
        # Dedicated inserts keep the named prop large without cropping a face.
        if sid == 'same-scroll':
            body.append('<svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;inset:0" aria-hidden="true">'
                        '<defs><clipPath id="screen-mask"><rect x="365" y="503" width="330" height="679" rx="5"/></clipPath></defs>'
                        '<g clip-path="url(#screen-mask)"><g id="feed">')
            for k in range(5):
                yy=510+k*185
                body.append(f'<rect x="374" y="{yy}" width="310" height="174" fill="#c5d1cd"/><rect x="387" y="{yy+12}" width="284" height="83" fill="#879fa3"/>'
                            f'<rect x="388" y="{yy+110}" width="225" height="8" fill="#526a75"/><rect x="388" y="{yy+130}" width="263" height="8" fill="#738b92"/>')
            body.append('</g></g></svg>')
            js.append('tl.fromTo("#feed",{y:0},{y:-175,duration:1.15,ease:"sine.inOut"},.1);')
        js.append(f'tl.fromTo("#stage",{{scale:1.015}},{{scale:1.045,duration:{dur},ease:"sine.inOut"}},0);')
    elif sid == 'child-memories':
        body.append('<div class="memory-rule ink">NEW MOMENTS<br><span class="rule-small">more to remember</span></div>')
        for i, (x, bottom, label, q) in enumerate([(500,715,'FIRST|SWIM',0),(705,715,'FIRST|BIKE',1),(910,715,'BEE|STING',2),
                                                  (535,1030,'PARTY',3),(740,1030,'PLAY',0),(940,1030,'FIRSTS',1)]):
            name=f'jar-{i}'
            body.append(jar(name,x,bottom,label,quad=q,width=180))
            js.append(f'tl.fromTo("#{name}",{{y:-70,opacity:0,rotation:{-5+i*2}}},{{y:0,opacity:1,rotation:0,duration:.36,ease:"power2.out"}},{.12+i*.28});')
    elif sid == 'adult-memory':
        body.append(jar('work',740,710,'WORK',art='routine-desk',width=230))
        js.append('tl.fromTo("#work",{y:-75},{y:0,duration:.35,ease:"power2.out"},.05);')
    elif sid == 'small-piece':
        body = ['<div style="position:absolute;inset:0;background:#17363f"></div>',
                '<svg width="1080" height="1920" viewBox="0 0 1080 1920" style="position:absolute;inset:0" role="img" aria-label="One year is 20 percent of life at age 5 and 2 percent at age 50; one theory">'
                '<text id="age-label" x="540" y="350" text-anchor="middle" fill="#f1e7cc" font-size="74" font-weight="800">AGE 5</text>'
                '<circle cx="540" cy="720" r="290" fill="#476671" stroke="#91a7a7" stroke-width="4"/>'
                '<path id="share" fill="#e8ba61"/>'
                '<circle cx="540" cy="720" r="198" fill="#17363f"/>'
                '<text id="share-number" x="540" y="765" text-anchor="middle" fill="#ffda8a" font-size="135" font-weight="850">20%</text>'
                '<text x="540" y="1100" text-anchor="middle" fill="#f1e7cc" font-size="51" font-weight="700">1 YEAR OF YOUR LIFE</text>'
                '<text x="540" y="1190" text-anchor="middle" fill="#c6d7d4" font-size="46" font-weight="650">One theory</text>'
                '<text x="540" y="1245" text-anchor="middle" fill="#b3c6c2" font-size="40">Paul Janet · 1877</text></svg>']
        # Adapted from the installed chart-story component's exact-share arc.
        js.append('const ratio={age:5};const draw=()=>{const age=Math.round(ratio.age),p=1/ratio.age,a=p*Math.PI*2;'
                  'const x=540+290*Math.sin(a),y=720-290*Math.cos(a);document.getElementById("share").setAttribute("d",`M540 720 L540 430 A290 290 0 0 1 ${x} ${y} Z`);'
                  'document.getElementById("age-label").textContent="AGE "+age;document.getElementById("share-number").textContent=(age===5?"20":age===50?"2":Math.round(p*100))+"%";};'
                  'draw();tl.to(ratio,{age:50,duration:1.15,ease:"power1.inOut",onUpdate:draw},1.9);')
    elif sid == 'try-something':
        js.append('tl.fromTo("#stage",{scale:1.09,y:10},{scale:1.02,y:0,duration:1.7,ease:"sine.inOut"},0);')
    elif sid == 'one-new-thing':
        body.append('<div class="memory-rule ink">ONE NEW THING<br><span class="rule-small">every day</span></div>')
        for i,(x,bottom) in enumerate([(500,710),(705,710),(910,710),(600,1020),(815,1020)]):
            body.append(jar(f'empty-{i}',x,bottom,'',empty=True,width=180))
            js.append(f'tl.fromTo("#empty-{i}",{{opacity:0}},{{opacity:1,duration:.35}},{.1+i*.13});')
    elif sid.startswith('day-'):
        day=int(sid[-1]);body.append(f'<div class="day ink">DAY {day}</div>')
        # A memory jar collects the same moment while its actual action settles.
        body.append(jar('new-memory',855,1210,'',art=s['art'],width=165))
        cue=max(.9,dur-.65)
        js.append(f'tl.fromTo("#new-memory",{{y:-80,opacity:0,rotation:-6}},{{y:0,opacity:1,rotation:0,duration:.32,ease:"power2.out"}},{cue});')
        if not animation:
            js.append(f'tl.fromTo("#background",{{scale:1.015}},{{scale:1.045,duration:{dur},ease:"sine.inOut"}},0);')
    elif sid == 'week-shelf':
        for i,(x,bottom,art,label) in enumerate([(500,710,'route','NEW|ROUTE'),(705,710,'food','NEW|FOOD'),(910,710,'lake','COLD|LAKE'),
                                                (600,1020,'grandma','CALL'),(815,1020,'roof','SUNRISE')]):
            body.append(jar(f'week-{i}',x,bottom,label,art=art,width=180))
            js.append(f'tl.fromTo("#week-{i}",{{y:-25,opacity:0}},{{y:0,opacity:1,duration:.3,ease:"power2.out"}},{i*.18});')
    elif sid == 'holiday-paradox':
        body.append('<div class="paradox">THE HOLIDAY PARADOX<strong>Fast now.<br>Longer in memory.</strong></div>')
        js.append(f'tl.fromTo("#background",{{scale:1}},{{scale:1.025,duration:{dur},ease:"sine.inOut"}},0);')
    body.append('</div>') if sid != 'small-piece' else None
    return document(sid,dur,''.join(body),''.join(js))


def main():
    for folder in ['assets/art','assets/fonts','assets/vendor','assets/animations','compositions']:
        (PROJECT / folder).mkdir(parents=True,exist_ok=True)
    for name in ['dmsans.ttf','dmsans-OFL.txt']:
        shutil.copy2(ROOT/'public/fonts'/name,PROJECT/'assets/fonts'/name)
    gsap=ROOT/'episodes/immortal/hyperframes/assets/vendor/gsap.min.js'
    shutil.copy2(gsap,PROJECT/'assets/vendor/gsap.min.js')
    for img in (PUB/'art').glob('*.png'):
        shutil.copy2(img,PROJECT/'assets/art'/img.name)
    for job in json.loads((EP/'gif-jobs.json').read_text()):
        name=job['id'];dest=PROJECT/'assets/animations'/name;dest.mkdir(exist_ok=True)
        for file in [name+'.mp4','first.png','last.png'] + (['hold.png'] if name == 'roof-child-arrives' else []):
            shutil.copy2((ROOT/job['output']).parent/file,dest/file)
    for name in ['narration','music','effects']:
        shutil.copy2(PUB/(name+'.wav'),PROJECT/'assets'/(name+'.wav'))
    hosts=[]
    for s in T['shots']:
        sid=s['id'];(PROJECT/'compositions'/(sid+'.html')).write_text(build_shot(s))
        hosts.append(f'<div id="shot-{sid}" class="clip" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" '
                     f'data-start="{s["start"]}" data-duration="{s["duration"]}" data-track-index="0" data-track-kind="graphics" '
                     f'data-width="1080" data-height="1920" data-layout-allow-overlap style="position:absolute;inset:0;z-index:1"></div>')
    pages=json.loads((EP/'caption-phrases.json').read_text());caps=[];js=[]
    for i,c in enumerate(pages):
        text=c['text'].upper();text=re.sub(r'\bONE\b','1',text);text=re.sub(r'\bTHREE\b','3',text)
        gold=any(x in text for x in ['NEW','LONGER','SAVING','SUNRISE','WEEK'])
        placement=' style="top:1120px"' if c['start']<4.4 else ''
        caps.append(f'<div id="cap-{i}" class="clip caption" data-start="{c["start"]}" data-duration="{c["end"]-c["start"]}" '
                    f'data-track-index="1"{placement}><span id="cap-inner-{i}" class="caption-inner" style="color:{"#ffda8a" if gold else "#fffdf4"}">{ESC(text)}</span></div>')
        js.append(f'tl.fromTo("#cap-inner-{i}",{{scale:.98}},{{scale:1,duration:.1,ease:"power2.out"}},{c["start"]});')
    (PROJECT/'compositions/captions.html').write_text(document('captions',D,''.join(caps),''.join(js)))
    hosts.append(f'<div id="captions-host" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" '
                 f'data-start="0" data-duration="{D}" data-track-index="1" data-track-kind="captions" data-width="1080" data-height="1920" '
                 'data-layout-allow-overlap style="position:absolute;inset:0;z-index:10"></div>')
    audio=''.join(f'<audio id="{n}" class="clip" src="assets/{n}.wav" data-start="0" data-duration="{D}" data-track-index="{i+2}" data-volume="1"></audio>' for i,n in enumerate(['narration','music','effects']))
    (PROJECT/'index.html').write_text(f'<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1080,height=1920"><script src="assets/vendor/gsap.min.js"></script>'
       f'<style>html,body{{margin:0;width:1080px;height:1920px;overflow:hidden;background:#17313d}}{CSS}</style></head><body><div id="root" '
       f'data-composition-id="main" data-width="1080" data-height="1920" data-duration="{D}" data-start="0" data-fps="30">'+''.join(hosts)+audio+'</div>'
       f'<script>window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});tl.to({{t:0}},{{t:{D},duration:{D},ease:"none"}});window.__timelines.main=tl;</script></body></html>')
    (PROJECT/'meta.json').write_text(json.dumps({'id':'time-speeds-up-v1','name':'Why Does Time Speed Up as You Get Older?'},indent=2)+'\n')
    (PROJECT/'package.json').write_text(json.dumps({'name':'time-speeds-up-hyperframes','private':True,'type':'module',
        'scripts':{'dev':'npx --yes hyperframes@0.9.26 preview','check':'npx --yes hyperframes@0.9.26 check','render':'npx --yes hyperframes@0.9.26 render'}},indent=2)+'\n')
    board='# Why Does Time Speed Up as You Get Older?\n\n55.2 seconds, 1080×1920, 30 fps. Quiet nostalgic lo-fi. Norbert remembers fewer distinct moments, then makes a week worth recalling.\n\n'
    board+='\n'.join(f'- {s["start"]:.3f}–{s["start"]+s["duration"]:.3f}s · {s["id"]}: {s["description"]}' for s in T['shots'])+'\n'
    (PROJECT/'STORYBOARD.md').write_text(board)
    (EP/'STORYBOARD.md').write_text(board)
    print(json.dumps({'project':str(PROJECT.relative_to(ROOT)),'shots':len(T['shots']),'captionPhrases':len(pages),'duration':D}))


if __name__=='__main__':
    main()
