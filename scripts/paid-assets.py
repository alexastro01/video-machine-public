"""Prepare the paid-for-lying cast and preserve the generated source artwork."""
from pathlib import Path
import hashlib
import importlib.util
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'output/imagegen/paid-for-lying-v1'
PUB = ROOT / 'public/episodes/paid-for-lying/art'
BASE = ROOT / 'episodes/paid-for-lying'
PUB.mkdir(parents=True, exist_ok=True)
(BASE / 'assets').mkdir(exist_ok=True)
spec = importlib.util.spec_from_file_location('chroma', Path.home() / '.codex/skills/.system/imagegen/scripts/remove_chroma_key.py')
chroma = importlib.util.module_from_spec(spec)
spec.loader.exec_module(chroma)

def clean(source):
    source = source.convert('RGBA')
    image = source.copy()
    chroma._apply_alpha_to_image(image, key=(255, 0, 255), tolerance=55,
                                spill_cleanup=True, soft_matte=True,
                                transparent_threshold=28, opaque_threshold=150)
    diff = ImageChops.difference(source.convert('RGB'), Image.new('RGB', source.size, (255, 0, 255)))
    r, g, b = diff.split()
    distance = ImageChops.lighter(ImageChops.lighter(r, g), b)
    interior = distance.point(lambda x: 255 if x > 100 else 0).filter(ImageFilter.MinFilter(5))
    image.paste(source, (0, 0), interior)
    return image

def hand_point(image):
    a = np.asarray(image.convert('RGBA')).astype(float)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mask = (r > 120) & (g > 75) & (b < r*.82) & (r > g*1.04) & (g > b*1.08) & (a[:, :, 3] > 100)
    labels, _ = ndimage.label(mask, np.ones((3, 3)))
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    bounds = image.getchannel('A').point(lambda x: 255 if x > 128 else 0).getbbox()
    candidates = []
    for label in np.flatnonzero(sizes > 100):
        yy, xx = np.where(labels == label)
        if bounds[1]+(bounds[3]-bounds[1])*.36 < yy.mean() < bounds[1]+(bounds[3]-bounds[1])*.77:
            candidates.append([float(xx.mean()), float(yy.mean())])
    return max(candidates, key=lambda p:p[0]) if candidates else [image.width*.75, image.height*.57]

poses = {}
review = Image.new('RGB', (1440, 720), '#213642')
draw = ImageDraw.Draw(review)
for row, (character, names) in enumerate([
    ('miko', ['talk', 'proud', 'run', 'panic']),
    ('cashier', ['idle', 'talk', 'receive', 'hair']),
]):
    raw = Image.open(RAW / f'{character}-four-magenta.png').convert('RGBA')
    if raw.size != (2048, 2048):
        raise RuntimeError(f'Unexpected sheet dimensions: {character} {raw.size}')
    image = clean(raw)
    for i, name in enumerate(names):
        x, y = (i % 2) * 1024, (i // 2) * 1024
        cell = image.crop((x, y, x + 1024, y + 1024))
        labels, _ = ndimage.label(np.asarray(cell.getchannel('A')) > 100, np.ones((3, 3)))
        sizes = np.bincount(labels.ravel()); sizes[0] = 0
        yy, xx = np.where(np.isin(labels, np.flatnonzero(sizes > 30)))
        box = (max(0, int(xx.min()) - 6), max(0, int(yy.min()) - 6),
               min(1024, int(xx.max()) + 7), min(1024, int(yy.max()) + 7))
        if min(box[0], box[1], 1024 - box[2], 1024 - box[3]) < 8:
            raise RuntimeError(f'Clipped cell: {character} {name} {box}')
        sprite = cell.crop(box)
        sprite.save(PUB / f'{character}-{name}.png')
        # Native GIF references retain the original chroma and a stable padded canvas.
        pad = 24
        reference = Image.new('RGBA', (sprite.width + pad * 2, sprite.height + pad * 2), '#ff00ff')
        reference.paste(raw.crop((x + box[0], y + box[1], x + box[2], y + box[3])), (pad, pad))
        reference.save(RAW / f'{character}-{name}-reference.png')
        foot = sprite.getchannel('A').crop((0, round(sprite.height * .85), sprite.width, sprite.height)).getbbox()
        pivot = (foot[0] + foot[2]) / 2 if foot else sprite.width / 2
        poses[f'{character}-{name}'] = {
            'file': f'episodes/paid-for-lying/art/{character}-{name}.png',
            'width': sprite.width, 'height': sprite.height, 'pivotX': pivot,
            'footY': sprite.height - 6, 'worldHeight': 2.48 if character == 'miko' else 2.35,
            'sourceCell': [x, y], 'sourceCrop': list(box),
            'hand': hand_point(sprite),
        }
        sm = sprite.copy(); sm.thumbnail((310, 310), Image.Resampling.NEAREST)
        review.paste(sm, (i * 360 + (360 - sm.width) // 2, row * 360 + 8), sm)
        draw.text((i * 360 + 20, row * 360 + 336), f'{character}: {name}', fill='white')

note = clean(Image.open(RAW / 'banknote-magenta.png'))
box = note.getchannel('A').point(lambda a: 255 if a > 128 else 0).getbbox()
note = note.crop(box)
note.save(PUB / 'banknote.png')
review.save(RAW / 'cast-review.jpg', quality=94)
(BASE / 'assets/poses.json').write_text(json.dumps(poses, indent=2) + '\n')
ledger = []
for name in ['miko-four', 'cashier-four', 'banknote']:
    p = RAW / f'{name}-magenta.png'
    ledger.append({'id': name, 'provider': 'OpenAI Image API through bundled imagegen CLI',
                   'requestedModel': 'gpt-image-2', 'quality': 'high',
                   'source': str(p.relative_to(ROOT)),
                   'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
                   'prompt': f'episodes/paid-for-lying/asset-prompts/{name}.txt',
                   'reportedCost': None})
(BASE / 'assets/image-ledger.json').write_text(json.dumps(ledger, indent=2) + '\n')
print(json.dumps({'poses': len(poses), 'banknote': note.size, 'review': str(RAW / 'cast-review.jpg')}))

animations = {}
for name in ['miko-talk', 'miko-run', 'miko-panic', 'cashier-reaction']:
    file = RAW / name / f'{name}.gif'
    if not file.exists():
        continue
    gif = Image.open(file)
    frames = [clean(f.copy().convert('RGBA')) for f in ImageSequence.Iterator(gif)]
    boxes = []
    for i, frame in enumerate(frames):
        box = frame.getchannel('A').point(lambda a: 255 if a > 128 else 0).getbbox()
        if not box or min(box[0], box[1], frame.width-box[2], frame.height-box[3]) < 3:
            raise RuntimeError(f'{name}: clipped or missing silhouette, frame {i}')
        boxes.append({'left': box[0], 'top': box[1], 'right': box[2]-1, 'bottom': box[3]-1})
    fw, fh = frames[0].size
    columns = 4
    atlas = Image.new('RGBA', (fw * columns, fh * ((len(frames)+columns-1)//columns)))
    for i, frame in enumerate(frames):
        atlas.paste(frame, ((i % columns) * fw, (i // columns) * fh))
    crop = {'x': max(0, min(b['left'] for b in boxes)-4), 'y': max(0, min(b['top'] for b in boxes)-4)}
    crop['width'] = min(fw, max(b['right'] for b in boxes)+5)-crop['x']
    crop['height'] = min(fh, max(b['bottom'] for b in boxes)+5)-crop['y']
    atlas.save(PUB / f'{name}-atlas.png')
    meta = {'width': atlas.width, 'height': atlas.height, 'cellWidth': fw, 'cellHeight': fh,
            'columns': columns, 'frameCount': len(frames), 'frameDurationMs': gif.info.get('duration', 100),
            'crop': crop, 'cells': boxes, 'nativeAnimation': True, 'playback': 'finite, then deliberate hold'}
    meta['hands'] = [hand_point(f) for f in frames]
    (PUB / f'{name}-atlas.json').write_text(json.dumps(meta, indent=2)+'\n')
    sheet = Image.new('RGB', (6*180, ((len(frames)+5)//6)*230), '#213642')
    ds = ImageDraw.Draw(sheet)
    for i, frame in enumerate(frames):
        sm = frame.copy(); sm.thumbnail((170, 205), Image.Resampling.NEAREST)
        xx, yy = (i%6)*180, (i//6)*230
        sheet.paste(sm, (xx+(180-sm.width)//2, yy), sm)
        ds.text((xx+8, yy+210), str(i), fill='white')
    sheet.save(RAW / f'{name}-review.jpg', quality=94)
    animations[name] = {'file': f'episodes/paid-for-lying/art/{name}-atlas.png', 'metadata': meta,
                        'sourceGif': str(file.relative_to(ROOT))}
(BASE / 'assets/animations.json').write_text(json.dumps(animations, indent=2)+'\n')
print(json.dumps({'nativeAnimations': list(animations)}))
