"""Decode selected story frames and repaired cut boundaries from full-v2."""
from pathlib import Path
import json
import math
import subprocess
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
timeline = json.loads((root / 'episodes/immortal/timeline.json').read_text())
dest = root / 'renders/immortal/encoded-full-v2'
dest.mkdir(exist_ok=True)
shots = timeline['shots']
selected = {}

def add(frame, label):
    frame = max(0, min(timeline['frames'] - 1, frame))
    selected.setdefault(frame, []).append(label)

for i, shot in enumerate(shots):
    if i % 4 == 0:
        add(math.floor((shot['start'] + shot['duration'] / 2) * 30), shot['id'])
for chapter in timeline['chapters']:
    shot = min(shots, key=lambda s: abs(s['start'] - chapter['start']))
    add(math.floor((shot['start'] + min(.3, shot['duration'] / 2)) * 30), chapter['id'])
critical = ['portrait', 'rock-belt', 'no-more-friends', 'finished-portrait',
            'who-will-see-it', 'feather-sneeze', 'out-of-date', 'short-answer',
            'getting-close', 'tagged-photo', 'someone-laughs', 'whats-your-name',
            'got-time', 'game-continues']
for name in critical:
    shot = next(s for s in shots if s['id'] == name)
    first = round(shot['start'] * 30)
    add(first - 1, name + ': before cut')
    add(first, name + ': first frame')
    add(math.floor((shot['start'] + shot['duration'] / 2) * 30), name + ': middle')
add(0, 'opening frame')
add(timeline['frames'] - 1, 'last frame')
indices = sorted(selected)
expression = '+'.join(f'eq(n\\,{i})' for i in indices)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(root / 'renders/immortal/immortal-full-v2.mp4'),
                '-vf', f'select={expression}', '-fps_mode', 'vfr', str(dest / 'frame-%03d.png')], check=True)
frames = sorted(dest.glob('frame-*.png'))
if len(frames) != len(indices):
    raise RuntimeError('Encoded review frame count mismatch')
for page in range(math.ceil(len(frames) / 9)):
    out = Image.new('RGB', (1920, 1155), '#18232d')
    draw = ImageDraw.Draw(out)
    for j in range(9):
        i = page * 9 + j
        if i >= len(frames):
            break
        x, y = (j % 3) * 640, (j // 3) * 385
        out.paste(Image.open(frames[i]).convert('RGB').resize((640, 360)), (x, y))
        draw.text((x + 7, y + 366), f'{indices[i] / 30:.3f}s ' + '; '.join(selected[indices[i]]), fill='white')
    out.save(dest / f'encoded-review-{page + 1}.jpg', quality=94)
(dest / 'frames.json').write_text(json.dumps([
    {'frame': n, 'time': n / 30, 'labels': selected[n], 'file': str(p)}
    for n, p in zip(indices, frames)], indent=2) + '\n')
print(json.dumps({'encodedFrames': len(frames), 'sheets': math.ceil(len(frames) / 9)}))
