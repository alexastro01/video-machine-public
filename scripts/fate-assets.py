"""Prepare local character art without synthesizing or looping character motion."""
from pathlib import Path
import importlib.util
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageChops, ImageFilter, ImageSequence, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/imagegen/happens-for-a-reason-v1'
PUB = ROOT / 'public/episodes/happens-for-a-reason/art'
PUB.mkdir(parents=True, exist_ok=True)
HELPER = Path.home() / '.codex/skills/.system/imagegen/scripts/remove_chroma_key.py'
spec = importlib.util.spec_from_file_location('chroma', HELPER)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def clean(raw):
    source = raw.convert('RGBA')
    image = source.copy()
    helper._apply_alpha_to_image(image, key=(255, 0, 255), tolerance=55,
        spill_cleanup=True, soft_matte=True, transparent_threshold=28,
        opaque_threshold=150)
    diff = ImageChops.difference(source.convert('RGB'), Image.new('RGB', source.size, (255, 0, 255)))
    r, g, b = diff.split()
    distance = ImageChops.lighter(ImageChops.lighter(r, g), b)
    mask = distance.point(lambda p: 255 if p > 100 else 0).filter(ImageFilter.MinFilter(5))
    image.paste(source, (0, 0), mask)
    return image


def bodies(image, count=1):
    labels, n = ndimage.label(np.asarray(image.getchannel('A')) > 180, np.ones((3, 3)))
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    ids = np.argsort(sizes)[-count:]
    result = []
    for value in ids:
        ys, xs = np.where(labels == value)
        result.append({'left': int(xs.min()), 'right': int(xs.max()),
            'top': int(ys.min()), 'bottom': int(ys.max()), 'pixels': int(sizes[value])})
    return result


def save_json(file, value):
    file.write_text(json.dumps(value, indent=2) + '\n')


source = OUT / 'miko-rain-four-magenta.png'
if source.exists() and (not (PUB/'miko-four-v1.json').exists() or source.stat().st_mtime>(PUB/'miko-four-v1.json').stat().st_mtime):
    raw = clean(Image.open(source))
    components = sorted(bodies(raw, 4), key=lambda b: b['top'] + b['bottom'])
    components = sorted(components[:2], key=lambda b: b['left']) + sorted(components[2:], key=lambda b: b['left'])
    atlas = Image.new('RGBA', (2048, 2048))
    cells, poses = [], {}
    names = ['wet', 'hopeful', 'baffled', 'seated']
    for i, (name, box) in enumerate(zip(names, components)):
        left, top = max(0, box['left']-4), max(0, box['top']-4)
        right, bottom = min(raw.width, box['right']+5), min(raw.height, box['bottom']+5)
        sprite = raw.crop((left, top, right, bottom))
        if sprite.width > 960 or sprite.height > 960:
            raise RuntimeError('Character does not fit a 1024px cell without rescaling')
        # Lower-body centre is independent of the reach, scarf and empty hands.
        feet = sprite.getchannel('A').point(lambda a: 255 if a > 180 else 0)
        feet = feet.crop((0, round(sprite.height*.87), sprite.width, sprite.height)).getbbox()
        x, y = round(512-(feet[0]+feet[2])/2), 980-sprite.height
        if x < 12 or y < 12 or x + sprite.width > 1012:
            raise RuntimeError(f'Unsafe cell margin for {name}')
        origin = ((i % 2)*1024, (i//2)*1024)
        atlas.paste(sprite, (origin[0]+x, origin[1]+y))
        cell = {'left': x+4, 'top': y+4, 'right': x+sprite.width-5,
            'bottom': y+sprite.height-5, 'originX': origin[0], 'originY': origin[1],
            'pixels': box['pixels']}
        cells.append(cell)
        sprite.save(PUB / f'miko-{name}-v1.png')
        poses[name] = {'file': f'episodes/happens-for-a-reason/art/miko-{name}-v1.png',
            'width': sprite.width, 'height': sprite.height, 'footY': sprite.height-4,
            'pivotX': 512-x, 'index': i}
    atlas.save(PUB/'miko-four-v1.png')
    save_json(PUB/'miko-four-v1.json', {'width': 2048, 'height': 2048,
        'columns': 2, 'rows': 2, 'cellWidth': 1024, 'cellHeight': 1024,
        'cells': cells, 'individualPoses': poses, 'rescaled': False})

animations = {}
for name, source_dir in [('witch-cast', 'witch-cast-768'), ('girl-smile', 'girl-smile-768'), ('miko-wet', 'miko-wet-768'), ('witch-eye-roll', 'witch-eye-roll-768')]:
    source = OUT / source_dir / f'{name}.gif'
    if not source.exists():
        continue
    existing=PUB/f'{name}-atlas.json'
    if existing.exists() and (PUB/f'{name}-atlas.png').exists() and source.stat().st_mtime<existing.stat().st_mtime:
        animations[name]={'atlas':f'episodes/happens-for-a-reason/art/{name}-atlas.png','metadata':f'episodes/happens-for-a-reason/art/{name}-atlas.json',**json.loads(existing.read_text())}
        continue
    gif = Image.open(source)
    frames, cells = [], []
    for index, frame in enumerate(ImageSequence.Iterator(gif)):
        image = clean(frame)
        box = bodies(image)[0]
        if min(box['left'], box['top'], image.width-1-box['right'], image.height-1-box['bottom']) < 8:
            raise RuntimeError(f'{name}: source frame {index} touches the border')
        frames.append(image)
        cells.append(box)
    width, height = frames[0].size
    cols = 4
    rows = (len(frames)+3)//4
    atlas = Image.new('RGBA', (width*cols, height*rows))
    for index, frame in enumerate(frames):
        atlas.paste(frame, ((index%cols)*width, (index//cols)*height))
    crop = {'x': max(0, min(c['left'] for c in cells)-4),
        'y': max(0, min(c['top'] for c in cells)-4)}
    crop['width'] = min(width, max(c['right'] for c in cells)+5)-crop['x']
    crop['height'] = min(height, max(c['bottom'] for c in cells)+5)-crop['y']
    metadata = {'width': atlas.width, 'height': atlas.height,
        'cellWidth': width, 'cellHeight': height, 'columns': cols, 'rows': rows,
        'frameCount': len(frames), 'frameDurationMs': gif.info.get('duration', 100),
        'crop': crop, 'cells': cells, 'nativeAnimation': True,
        'playback': 'once, then hold; no repeated character cycle'}
    atlas.save(PUB/f'{name}-atlas.png')
    save_json(PUB/f'{name}-atlas.json', metadata)
    sheet = Image.new('RGB', (6*210, ((len(frames)+5)//6)*210), '#EDE0C6')
    for index, frame in enumerate(frames):
        small = frame.copy()
        small.thumbnail((200, 200), Image.Resampling.NEAREST)
        sheet.paste(small, ((index%6)*210, (index//6)*210), small)
    sheet.save(OUT/f'{name}-review.png')
    animations[name] = {'atlas': f'episodes/happens-for-a-reason/art/{name}-atlas.png',
        'metadata': f'episodes/happens-for-a-reason/art/{name}-atlas.json', **metadata}

save_json(ROOT/'episodes/happens-for-a-reason/assets/animations-v1.json', animations)
print(json.dumps({'mikoPoses': (PUB/'miko-four-v1.json').exists(),
    'animations': {name: a['frameCount'] for name, a in animations.items()}}, indent=2))
