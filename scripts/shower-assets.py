"""Prepare measured, keyed Miko poses from the saved four-pose API artwork."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
B = ROOT / 'episodes/shower-singing'
P = ROOT / 'public/episodes/shower-singing'
src = ROOT / 'output/imagegen/shower-singing-v1/miko-shower-four.png'
raw = np.asarray(Image.open(src).convert('RGBA')).copy()
rgb = raw[:, :, :3].astype(float)
key = ((rgb[:, :, 0] - rgb[:, :, 1] > 35) &
       (rgb[:, :, 2] - rgb[:, :, 1] > 35) &
       (rgb[:, :, 0] > 60) & (rgb[:, :, 2] > 60))
raw[:, :, 3] = np.where(key, 0, 255)
im = Image.fromarray(raw)
poses = {}
preview = Image.new('RGB', (1600, 900), '#f8f8fa')
for i, name in enumerate(['sing', 'rest', 'surprised', 'deadpan']):
    x, y = i % 2 * 1024, i // 2 * 1024
    cell = np.asarray(im.crop((x, y, x + 1024, y + 1024))).copy()
    labels, _ = ndimage.label(cell[:, :, 3] > 128, np.ones((3, 3)))
    counts = np.bincount(labels.ravel()); counts[0] = 0
    keep = labels == int(counts.argmax())
    ys, xs = np.where(keep)
    bounds = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    if min(bounds[0], bounds[1], 1024-bounds[2], 1024-bounds[3]) < 8:
        raise RuntimeError(f'Clipped pose {name}: {bounds}')
    cell[:, :, 3][~ndimage.binary_dilation(keep, iterations=1)] = 0
    box = [bounds[0]-4, bounds[1]-4, bounds[2]+4, bounds[3]+4]
    sprite = Image.fromarray(cell).crop(box)
    pixels = np.asarray(sprite)
    foot_region = pixels[:, :, 3] > 128
    foot_region[:round(sprite.height * .86)] = False
    fy, fx = np.where(foot_region)
    file = P / 'art' / f'miko-{name}.png'
    file.parent.mkdir(parents=True, exist_ok=True); sprite.save(file)
    poses[name] = {
        'file': str(file.relative_to(ROOT / 'public')),
        'width': sprite.width, 'height': sprite.height,
        'pivotX': round(float(fx.mean()), 3),
        'footY': int(fy.max()) + 1, 'sourceCell': i,
        'sourceBounds': bounds, 'crop': box,
        'approvedForUse': True,
    }
    small = sprite.copy(); small.thumbnail((380, 820), Image.Resampling.NEAREST)
    preview.paste(small, (i*400+(400-small.width)//2, 40), small)
(B/'assets/miko.json').write_text(json.dumps(poses, indent=2)+'\n')
preview.save(P/'art/miko-review.jpg', quality=94)
ledger = {
    'provider': 'OpenAI Image API via bundled imagegen CLI',
    'model': 'gpt-image-2', 'quality': 'high', 'size': [2048, 2048],
    'sourceFile': str(src.relative_to(ROOT)),
    'sha256': hashlib.sha256(src.read_bytes()).hexdigest(),
    'referenceFile': 'public/episodes/paid-for-lying/art/miko-proud.png',
    'promptFile': 'episodes/shower-singing/art-prompt.txt',
    'processing': 'Hard chroma key and connected-component crops; no colour spill replacement or upscaling.',
    'motion': 'Image poses selected from the video frame and vocal timing; not native generated video or GIF.',
    'reportedCost': None,
}
(B/'assets/image-ledger.json').write_text(json.dumps(ledger, indent=2)+'\n')
print(json.dumps(poses, indent=2))
