"""Build local, editable HyperFrames scenes from an illustrated episode's plan."""
import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLUG = sys.argv[1]
EP = ROOT / "episodes" / SLUG
PUB = ROOT / "public/episodes" / SLUG
PROJECT = EP / "hyperframes"
PLAN = json.loads((EP / "edit-plan.json").read_text())
T = json.loads((EP / "timeline.json").read_text())
D = T["duration"]
ESC = html.escape

MOTION = r"""
window.ShortMotion = (() => {
  const curve = (x1,y1,x2,y2) => p => {
    const b=(a,c,t)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*c+t*t*t;
    let lo=0,hi=1,t=p;
    for(let i=0;i<18;i++){t=(lo+hi)/2;if(b(x1,x2,t)<p)lo=t;else hi=t;}
    return b(y1,y2,t);
  };
  return {curve, out:curve(.16,1,.3,1), exit:curve(.7,0,.84,0), camera:curve(.65,0,.35,1)};
})();
"""

CSS = """@font-face{font-family:'DM Sans';src:url('assets/fonts/dmsans.ttf');font-weight:100 1000;font-style:normal}
*{box-sizing:border-box}#root{position:absolute;inset:0;width:1080px;height:1920px;overflow:hidden;font-family:'DM Sans';color:#fff8e7}
.camera{position:absolute;inset:0;width:1080px;height:1920px;transform-origin:50% 50%}
.art,.action,.pose{position:absolute;inset:0;width:1080px;height:1920px;object-fit:cover;image-rendering:pixelated}
.caption{position:absolute;left:95px;top:1350px;width:815px;height:160px;display:flex;align-items:center;justify-content:center;text-align:center}
.caption-text{font-family:'DM Sans';font-size:70px;font-weight:850;line-height:1.08;letter-spacing:-.55px;color:#fff8e7;-webkit-text-stroke:8px #14232b;paint-order:stroke fill;text-shadow:0 4px 0 #14232b}
.caption-text em{font-style:normal;color:#f7d180}
.shelf-heading{position:absolute;left:95px;top:267px;width:815px;height:95px;text-align:center;font-size:76px;font-weight:850;line-height:1.12;letter-spacing:1px;color:#fff0c8;-webkit-text-stroke:5px #3b2c24;paint-order:stroke fill;text-shadow:0 4px 0 #3b2c24}
.jar{position:absolute;width:250px;height:409.09px;transform-origin:50% 100%}
.jar-inner{position:absolute;width:220px;height:360px;transform:scale(1.1363636364);transform-origin:0 0}
.jar svg{position:absolute;inset:0;width:220px;height:360px}
.jar-picture{position:absolute;left:31px;top:97px;width:158px;height:147px;overflow:hidden;border:4px solid #9d8054;background:#4c6667}
.jar-picture img{width:100%;height:100%;object-fit:cover;object-position:50% 52%;image-rendering:pixelated}
.jar-label{position:absolute;left:22px;top:269px;width:176px;height:62px;display:flex;align-items:center;justify-content:center;text-align:center;color:#22383e;font-size:43px;font-weight:900;letter-spacing:-1px;line-height:1}
.steam{position:absolute;left:410px;top:1120px;width:240px;height:180px;pointer-events:none}
.steam path{fill:none;stroke:#f5dfb2;stroke-width:7;stroke-linecap:round;opacity:.23}
"""


def resolve(source):
    kind, *values = source.split(":")
    if kind == "art":
        return f"assets/art/{values[0]}.png"
    if kind == "animation":
        return f"assets/animations/{values[0]}/{values[1]}.png"
    if kind == "reused":
        return f"assets/art/{values[0]}.png"
    raise ValueError(source)


def document(cid, duration, body, js=""):
    return (f'<template><style>{CSS}</style><div id="root" data-composition-id="{cid}" data-width="1080" data-height="1920" '
        f'data-duration="{duration}" data-layout-allow-overflow data-layout-allow-overlap>{body}</div><script>'
        f'window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});{js}'
        f'tl.to({{t:0}},{{t:{duration},duration:{duration},ease:"none"}},0);window.__timelines["{cid}"]=tl;'
        '</script></template>')


def jar(index, data):
    x = data["x"]-125
    picture = resolve(data["picture"])
    label = ESC(data["label"])
    return (f'<div id="jar-{index}" class="jar" style="left:{x}px;top:775px">'
        '<div class="jar-inner"><svg viewBox="0 0 220 360" aria-hidden="true">'
        '<path d="M46 27H174V50H185V65H196V328H184V343H36V328H24V65H35V50H46Z" fill="#caab69" fill-opacity=".3" stroke="#18313a" stroke-width="7"/>'
        '<path d="M44 15H176V46H44Z" fill="#aa814b" stroke="#273a3c" stroke-width="7"/>'
        '<path d="M52 19H167V27H52Z" fill="#f3d596"/><path d="M36 69H45V319H36M177 76H185V317H177" fill="#e8eccb" opacity=".5"/>'
        '<path d="M21 261H199V337H21Z" fill="#f1dfb7" stroke="#8a785a" stroke-width="3"/>'
        '</svg>'+f'<div class="jar-picture"><img src="{picture}" alt="{label} memory"></div>'
        f'<div class="jar-label" data-var-text="{index}-label">{label}</div></div></div>')


def build_shot(shot):
    sid, dur = shot["id"], shot["duration"]
    body = [f'<div id="camera" class="camera"><img id="background" class="art" data-var-src="{sid}-background" src="{resolve(shot["background"])}" alt="{ESC(shot["description"], quote=True)}">']
    js = []
    camera = shot.get("camera", {"scale": 1, "y": 0})
    js.append(f'tl.set("#camera",{json.dumps(camera)},0);')
    for still in shot.get("stills", []):
        body.append(f'<img id="{still["id"]}" class="clip pose" src="{resolve(still["source"])}" '
            f'data-start="{still["start"]}" data-duration="{still["duration"]}" data-track-index="0" alt="A held native pose">')
    for clip in shot.get("clips", []):
        length = min(clip["duration"], dur-clip["start"])
        if length <= 0:
            raise ValueError("Actor clip falls outside scene")
        name = clip["animation"]
        body.append(f'<video id="{clip["id"]}" class="clip action" src="assets/animations/{name}/{name}.mp4" '
            f'data-start="{clip["start"]}" data-duration="{length}" data-media-start="{clip["sourceStart"]}" '
            'data-track-index="0" muted playsinline></video>')
    if shot.get("cameraMove"):
        move = shot["cameraMove"]
        target = {k: v for k, v in move.items() if k != "at"}
        js.append(f'tl.to("#camera",{{...{json.dumps(target)},ease:ShortMotion.camera}},{move["at"]});')
    if shot["template"] == "shelf":
        body.append(f'<div id="shelf-heading" class="shelf-heading" data-var-text="{sid}-heading">{ESC(shot["heading"])}</div>')
        for i, item in enumerate(shot["jars"]):
            body.append(jar(f'{sid}-{i}', item))
            if shot.get("assemble"):
                js.append(f'tl.fromTo("#jar-{sid}-{i}",{{opacity:0,y:28,scale:.97}},{{opacity:1,y:0,scale:1,duration:.24,ease:ShortMotion.out}},{i*.06});')
    body.append('</div>')
    return document(sid, dur, ''.join(body), ''.join(js))


for directory in ["assets/art", "assets/animations", "assets/fonts", "assets/vendor", "compositions"]:
    (PROJECT / directory).mkdir(parents=True, exist_ok=True)
for name in ["dmsans.ttf", "dmsans-OFL.txt"]:
    shutil.copy2(ROOT/"public/fonts"/name, PROJECT/"assets/fonts"/name)
shutil.copy2(ROOT/"episodes/immortal/hyperframes/assets/vendor/gsap.min.js", PROJECT/"assets/vendor/gsap.min.js")
(PROJECT/"assets/motion.js").write_text(MOTION)
for source in (PUB/"art").glob("*.png"):
    shutil.copy2(source, PROJECT/"assets/art"/source.name)
for name, source in PLAN.get("reusedArt", {}).items():
    shutil.copy2(ROOT/source, PROJECT/"assets/art"/(name+".png"))
for name, metadata in json.loads((EP/"animation-assets.json").read_text()).items():
    folder = PUB/"animations"/name
    dest = PROJECT/"assets/animations"/name
    dest.mkdir(parents=True, exist_ok=True)
    for source in folder.glob("*.png"):
        if not source.name.startswith(("diagnostic", "recovered-test")):
            shutil.copy2(source, dest/source.name)
    shutil.copy2(ROOT/metadata["movie"], dest/(name+".mp4"))
for name in ["voice-friend", "voice-miko", "music", "effects"]:
    shutil.copy2(PUB/(name+".wav"), PROJECT/"assets"/(name+".wav"))

hosts = []
for shot in T["shots"]:
    sid = shot["id"]
    (PROJECT/"compositions"/(sid+".html")).write_text(build_shot(shot))
    hosts.append(f'<div id="shot-{sid}" class="clip" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" '
        f'data-start="{shot["start"]}" data-duration="{shot["duration"]}" data-width="1080" data-height="1920" '
        'data-track-index="0" data-track-kind="graphics" data-layout-allow-overlap style="position:absolute;inset:0;z-index:1"></div>')

caps, js = [], []
pages = json.loads((EP/"caption-phrases.json").read_text())
emphasis = set(PLAN["typography"]["emphasis"])
for i, page in enumerate(pages):
    if not page["visualText"]:
        continue
    text = ESC(page["visualText"].upper()).replace('|', '<br>')
    for word in emphasis:
        text = re.sub(r'\b'+word+r'\b', f'<em>{word}</em>', text)
    start = page["visualStart"]
    duration = page["end"]-start
    if duration <= 0:
        raise ValueError("Nonpositive visual caption")
    extra = '' if page["captionTop"] is None else f' style="top:{page["captionTop"]}px;height:100px"'
    caps.append(f'<div id="cap-{i}" class="clip caption" data-start="{start}" data-duration="{duration}" data-track-index="1"{extra}>'
        f'<span id="text-{i}" class="caption-text" data-var-text="caption-{i}">{text}</span></div>')
    if not page["immediate"]:
        incoming = min(PLAN["motion"]["textIn"], duration*.35)
        js.append(f'tl.fromTo("#text-{i}",{{opacity:0,y:12}},{{opacity:1,y:0,duration:{incoming},ease:ShortMotion.out}},{start});')
    # A cut already provides an exit; a phrase on the same frame leaves in 150ms.
    cut = any(abs(page["end"]-s["start"]) < .08 for s in T["shots"])
    if not cut and page["end"] < D-.1 and duration > .7:
        outgoing = min(PLAN["motion"]["exit"], duration*.18)
        js.append(f'tl.to("#text-{i}",{{opacity:0,y:-9,duration:{outgoing},ease:ShortMotion.exit}},{page["end"]-outgoing});')
(PROJECT/"compositions/captions.html").write_text(document("captions", D, ''.join(caps), ''.join(js)))
hosts.append(f'<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" '
    f'data-duration="{D}" data-width="1080" data-height="1920" data-track-index="1" data-track-kind="captions" data-layout-allow-overlap style="position:absolute;inset:0;z-index:20"></div>')
audio = ''.join(f'<audio id="{name}" class="clip" src="assets/{name}.wav" data-start="0" data-duration="{D}" data-track-index="{i+2}" data-volume="1"></audio>'
                for i, name in enumerate(["voice-friend", "voice-miko", "music", "effects"]))
(PROJECT/"index.html").write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">'
    '<script src="assets/vendor/gsap.min.js"></script><script src="assets/motion.js"></script>'
    f'<style>html,body{{margin:0;width:1080px;height:1920px;overflow:hidden;background:#172d36}}{CSS}</style></head><body>'
    f'<div id="root" data-composition-id="main" data-width="1080" data-height="1920" data-start="0" data-duration="{D}" data-fps="30">'+''.join(hosts)+audio+'</div>'
    f'<script>window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});tl.to({{t:0}},{{t:{D},duration:{D},ease:"none"}});window.__timelines.main=tl;</script></body></html>')
(PROJECT/"meta.json").write_text(json.dumps({"id": SLUG, "name": PLAN["title"]}, indent=2)+"\n")
(PROJECT/"package.json").write_text(json.dumps({"name": SLUG+"-hyperframes", "type":"module", "private":True,
    "scripts":{"dev":"npx --yes hyperframes@0.9.26 preview", "check":"npx --yes hyperframes@0.9.26 check", "render":"npx --yes hyperframes@0.9.26 render"}}, indent=2)+"\n")
shutil.copy2(EP/"edit-plan.json", PROJECT/"edit-plan.json")
board = f'# {PLAN["title"]}\n\n{D}s, 1080×1920, 30 fps. A fictional two-voice story.\n\n'
board += '\n'.join(f'- {s["start"]:.3f}–{s["start"]+s["duration"]:.3f}s · {s["id"]}: {s["description"]}' for s in T["shots"])+"\n"
for target in [EP/"STORYBOARD.md", PROJECT/"STORYBOARD.md"]:
    target.write_text(board)
print(json.dumps({"project": str(PROJECT.relative_to(ROOT)), "duration": D, "shots": len(T["shots"]), "captionPhrases": len(caps)}))
