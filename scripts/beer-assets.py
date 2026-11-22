"""Package inspected model outputs for deterministic Remotion playback."""
from pathlib import Path
import hashlib
import json
import shutil
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
B = ROOT / 'episodes/beer-feels-good'
P = ROOT / 'public/episodes/beer-feels-good/art'
G = ROOT / 'output/imagegen/beer-feels-good'


def foot_pivot(image):
    alpha = np.asarray(image.getchannel('A')) > 166
    ys, xs = np.where(alpha)
    bottom = int(ys.max())
    foot_x = np.where(alpha[max(0, bottom - 28):bottom + 1])[1]
    return float(np.median(foot_x)), bottom


def mug_base(frame):
    pixels = np.asarray(Image.open(frame).convert('RGBA')).astype(int)
    red, green, blue, alpha = pixels.transpose(2, 0, 1)
    # The glass rim is pale blue. Its base is the lowest group of those pixels
    # on the mug side of the shot, even while the hand covers the handle.
    region = np.arange(pixels.shape[1]) < pixels.shape[1] * .41
    rim = region & (alpha > 180) & (blue > 167) & (red > 158) & (green > 165)
    y, x = np.where(rim & (blue >= red - 5) & (green >= red - 8))
    bottom = int(y.max())
    band = x[y >= bottom - 8]
    return {'x': float((band.min() + band.max()) / 2), 'y': bottom}


def package_performances():
    performances = {}
    for name in ['waking', 'setdown']:
        folder = G / name
        stem = f'miko-{name}-v2a'
        data = json.loads((folder / f'{stem}-atlas.json').read_text())
        atlas = P / f'{stem}-atlas.png'
        shutil.copy2(folder / f'{stem}-atlas.png', atlas)
        record = {
            'atlas': str(atlas.relative_to(ROOT / 'public')),
            'cellSize': data['cellWidth'], 'columns': data['columns'], 'rows': data['rows'],
            'frames': data['frameCount'], 'frameMs': data['frameDurationMs'],
            'sourceGif': str((folder / f'{stem}.gif').relative_to(ROOT)),
            'alphaGif': str((folder / f'{stem}-transparent.gif').relative_to(ROOT)),
            'provenance': str((folder / f'{stem}.provenance.json').relative_to(ROOT)),
            'request': str((folder / f'{stem}.request.json').relative_to(ROOT)),
            'atlasSha256': hashlib.sha256(atlas.read_bytes()).hexdigest(),
            'edgeFrames': data['clipping'], 'topMargin': data['minimumTopMargin'],
            'bottomMargin': data['minimumBottomMargin'],
        }
        if name == 'waking':
            assert not data['clipping']
            record['staging'] = 'The complete bed stays in view while Miko wakes.'
        else:
            bases = [mug_base(f) for f in sorted((folder / 'frames').glob('frame-*.png'))]
            assert len(bases) == data['frameCount']
            bottom = max(v['y'] for v in bases)
            contact = next(i for i, v in enumerate(bases) if v['y'] >= bottom - 1)
            assert all(abs(v['y'] - bottom) <= 1 for v in bases[contact:])
            record.update(contactCell=contact, mugContact=bases[contact], mugBases=bases)
            record['staging'] = 'The counter masks the cropped hips. The complete mug and holding hand are visible at contact.'
        performances[name] = record
    (B / 'assets/performances-v2.json').write_text(json.dumps(performances, indent=2) + '\n')


def main():
    sheet = Image.open(P / 'miko-vector-poses-alpha.png').convert('RGBA')
    poses = {}
    for name, (col, row) in {'sip': (0,0), 'relaxed': (1,0), 'worried': (0,1), 'wobble': (1,1)}.items():
        cell = sheet.crop((col*1024, row*1024, (col+1)*1024, (row+1)*1024))
        file = P / f'miko-{name}.png'
        cell.save(file)
        pivot, bottom = foot_pivot(cell)
        bounds = cell.getchannel('A').getbbox()
        assert bounds and bounds[0] > 2 and bounds[1] > 2 and bounds[2] < 1022 and bounds[3] < 1022
        poses[name] = {'file': str(file.relative_to(ROOT/'public')), 'width': 1024, 'height': 1024, 'bounds': list(bounds), 'pivotX': pivot, 'footY': bottom, 'bodyHeight': bottom-bounds[1]+1}
    animations = {}
    for name in ['sip', 'relax', 'wobble']:
        folder = G / name
        stem = f'miko-{name}-v1'
        metadata = json.loads((folder / f'{stem}-atlas.json').read_text())
        assert not metadata['clipping'], (name, metadata['clipping'])
        atlas = P / f'miko-{name}-atlas.png'
        shutil.copy2(folder / f'{stem}-atlas.png', atlas)
        for suffix in ['.gif', '-transparent.gif', '.provenance.json', '.request.json']:
            source = folder / f'{stem}{suffix}'
            if source.exists():
                shutil.copy2(source, P / f'miko-{name}{suffix}')
        pivots = []
        for i, cell in enumerate(metadata['cells']):
            frame = Image.open(folder / 'frames' / f'frame-{i+1:02}.png').convert('RGBA')
            pivot, bottom = foot_pivot(frame)
            pivots.append(pivot)
            cell['footY'] = bottom
        metadata['pivotX'] = float(np.median(pivots))
        metadata['bodyHeight'] = float(np.median([c['bottom']-c['top']+1 for c in metadata['cells']]))
        metadata['file'] = str(atlas.relative_to(ROOT/'public'))
        metadata['sha256'] = hashlib.sha256(atlas.read_bytes()).hexdigest()
        animations[name] = metadata
    result = {'style': 'OpenAI-generated flat cartoon Miko, episode-specific', 'poses': poses, 'animations': animations, 'motion': 'Native generated frames, preserved at 100ms each; finite playback and a final pose hold. Horizontal pivot remains fixed; each frame uses its measured shoe baseline.'}
    (B/'assets/miko-layout.json').write_text(json.dumps(result,indent=2)+'\n')
    package_performances()
    print(json.dumps({'poses': list(poses), 'animations': {k: {'frames': v['frameCount'], 'bodyHeight': v['bodyHeight'], 'clipping': v['clipping']} for k,v in animations.items()}},indent=2))


if __name__ == '__main__':
    main()
