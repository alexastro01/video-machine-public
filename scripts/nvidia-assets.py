"""Prepare generated cartoon poses for scene compositing; preserve source RGB."""
from pathlib import Path
import hashlib
import json
import shutil
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/episodes/nvidia-four-trillion/art"
OUT.mkdir(parents=True, exist_ok=True)
(ROOT / "episodes/nvidia-four-trillion/assets").mkdir(exist_ok=True)
base_names = ["neutral", "worried", "point", "seated", "receive", "relieved"]
profiles=[("miko",3,base_names,"miko-cartoon-sheet-v1","miko-cartoon-sheet"),("jensen",4,base_names+["modern-neutral","modern-receive"],"jensen-cartoon-sheet-v1","jensen-cartoon-sheet"),("jensen",2,["phone-concerned","phone-relief","work-prepare","work-contact"],"jensen-action-sheet-v1","jensen-action-sheet")]
for actor, columns, names, sheet, prompt in profiles:
    src = ROOT / f"output/imagegen/nvidia-four-trillion/{sheet}.png"
    image = np.array(Image.open(src).convert("RGBA"))
    height, width = image.shape[:2]
    cw, ch = width // columns, height // 2
    poses = {}
    for index, name in enumerate(names):
        cell = image[index // columns * ch:(index // columns + 1) * ch, index % columns * cw:(index % columns + 1) * cw].copy()
        rgb = cell[:, :, :3].astype(float)
        key = ((rgb[:, :, 0] > 140) & (rgb[:, :, 2] > 140) & (rgb[:, :, 1] < 110)) | ((rgb[:,:,0]-rgb[:,:,1]>20)&(rgb[:,:,2]-rgb[:,:,1]>20)&(np.minimum(rgb[:,:,0],rgb[:,:,2])>50))
        cell[:, :, 3] = np.where(key, 0, 255)
        yy, xx = np.where(~key)
        top, bottom, left, right = int(yy.min()), int(yy.max()), int(xx.min()), int(xx.max())
        head = (rgb[:, :, 0] > 160) & (rgb[:, :, 1] > 115) & (rgb[:, :, 2] < 190) & ~key
        head[int(top + (bottom - top) * .48):] = False
        _, hx = np.where(head)
        anchor_x = float(np.median(hx)) if len(hx) else float((left + right) / 2)
        filename = OUT / f"{actor}-{name}.png"
        Image.fromarray(cell).save(filename)
        poses[name] = {"file": str(filename.relative_to(ROOT / "public")), "width": cw, "height": ch, "anchorX": anchor_x, "footY": bottom, "bounds": [left, top, right, bottom]}
    refs = ["public/episodes/paid-for-lying/art/miko-talk.png", "output/rea/coaster-detail-06.jpg"] if actor=="miko" else ["episodes/nvidia-four-trillion/references/jensen-official-headshot.jpg", "output/imagegen/nvidia-four-trillion/miko-cartoon-sheet-v1.png"]
    meta = {"style": "flat-cartoon-"+actor, "source": str(src.relative_to(ROOT)), "sourceSHA256": hashlib.sha256(src.read_bytes()).hexdigest(), "provider": "OpenAI Image API", "model": "gpt-image-2", "prompt": f"episodes/nvidia-four-trillion/asset-prompts/{prompt}.txt", "references": refs, "processing": "Split the regular cells and derive alpha from the magenta matte, including contaminated boundary pixels. Source character RGB is unchanged.", "pixelsPerWorldUnit": 168, "poses": poses, "userApproved": False}
    if sheet=="jensen-action-sheet-v1":
        base=json.loads((ROOT / "episodes/nvidia-four-trillion/assets/jensen.json").read_text())
        base["supplements"]=[{k:meta[k] for k in ("source","sourceSHA256","provider","model","prompt")}]
        base["supplements"][0]["references"]=["output/imagegen/nvidia-four-trillion/jensen-cartoon-sheet-v1.png"]
        base["poses"].update(poses)
        meta=base
    (ROOT / f"episodes/nvidia-four-trillion/assets/{actor}.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps({"actor":actor,"preparedPoses":list(poses),"sourceSize":[width,height]}))
font = ROOT / "public/episodes/nvidia-four-trillion/fonts"
font.mkdir(exist_ok=True)
for name in ("InterVariable.woff2", "Inter-OFL.txt"):
    shutil.copy2(ROOT / "public/episodes/start-the-task/fonts" / name, font / name)
