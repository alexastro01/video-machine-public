"""Prepare revision assets without changing the original takes or sprite pivots."""
from pathlib import Path
import argparse
import importlib.util
import json
import urllib.request
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / 'public/episodes/inventions-since-2000'
OUT = ROOT / 'output/imagegen/inventions-v2'
HELPER = Path.home() / '.codex/skills/.system/imagegen/scripts/remove_chroma_key.py'


def clean(image):
    spec = importlib.util.spec_from_file_location('imagegen_chroma', HELPER)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    image = image.convert('RGBA')
    helper._apply_alpha_to_image(image, key=(0, 255, 0), tolerance=65,
        spill_cleanup=True, soft_matte=True, transparent_threshold=40,
        opaque_threshold=220)
    return image


def matte():
    art = PUB / 'art'
    evidence = []
    for stem in ['miko-home', 'miko-travel', 'miko-create', 'miko-learning', 'miko-science', 'science-items']:
        raw = ROOT / 'output/imagegen/inventions-v1/raw' / (stem + '-green.png')
        im = clean(Image.open(raw))
        im.save(art / (stem + '.png'))
        meta = json.loads((art / (stem + '.json')).read_text())
        for i, cell in enumerate(meta['cells']):
            # Retain v1's six-pixel padding and original inclusive bounds.
            x, y = cell['originX'], cell['originY']
            pad = 6 if stem.startswith('miko') else 0
            box = (cell['left'] - pad, cell['top'] - pad, cell['right'] + 1 + pad, cell['bottom'] + 1 + pad)
            target = art / (f'{stem}-{i}.png' if stem.startswith('miko') else f'science-item-{i}.png')
            old_size = Image.open(target).size
            pose = im.crop((x, y, x + 1024, y + 1024)).crop(box)
            assert pose.size == old_size, (target, pose.size, old_size)
            pose.save(target)
        evidence.append({'sheet': stem, 'size': im.size, 'pivots': 'unchanged'})
    for name in ['wake', 'book', 'scroll']:
        src = ROOT / f'output/imagegen/miko-inventions-{name}-v1/{name}.gif'
        meta = json.loads((art / (name + '-atlas.json')).read_text())
        atlas = Image.new('RGBA', (meta['width'], meta['height']))
        gif = Image.open(src)
        prepared = []
        dest = OUT / f'{name}-clean'
        dest.mkdir(parents=True, exist_ok=True)
        for i in range(gif.n_frames):
            gif.seek(i)
            frame = clean(gif.convert('RGBA'))
            frame.save(dest / f'frame-{i+1:02}.png')
            prepared.append(frame)
            atlas.paste(frame, ((i % meta['columns']) * meta['cellWidth'], (i // meta['columns']) * meta['cellHeight']))
        atlas.save(art / (name + '-atlas.png'))
        atlas.save(dest / (name + '-atlas.png'))
        (dest / (name + '-atlas.json')).write_text(json.dumps(meta, indent=2) + '\n')
        prepared[0].save(dest / (name + '-transparent.gif'), save_all=True, append_images=prepared[1:],
            duration=meta['frameDurationMs'], disposal=2, loop=0)
        evidence.append({'nativeMotion': name, 'frames': gif.n_frames, 'crop': meta['crop'], 'timing': 'unchanged'})
    (OUT / 'matte-provenance.json').write_text(json.dumps({'helper': str(HELPER),
        'settings': {'key': '#00ff00', 'softMatte': True, 'transparentThreshold': 40,
                     'opaqueThreshold': 220, 'despill': True, 'erosion': 0, 'feather': 0},
        'assets': evidence}, indent=2) + '\n')
    print('Cleaned 6 four-pose sheets and 36 native GIF frames; original dimensions and pivots retained.')


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'VideoMachine/1.0 asset preparation'})
    return urllib.request.urlopen(request, timeout=45).read()


def libraries():
    records = []
    icons = PUB / 'icons'
    logos = PUB / 'logos'
    fonts = PUB / 'fonts'
    for folder in [icons, logos, fonts]:
        folder.mkdir(parents=True, exist_ok=True)
    sha = json.loads(fetch('https://api.github.com/repos/lucide-icons/lucide/commits/main'))['sha']
    base = f'https://raw.githubusercontent.com/lucide-icons/lucide/{sha}'
    for name in ['book-open', 'car', 'map-pin', 'play', 'audio-lines', 'dna', 'smartphone', 'messages-square',
                 'camera', 'globe', 'flashlight', 'wallet', 'utensils', 'package', 'scissors', 'check', 'arrow-right']:
        url = base + '/icons/' + name + '.svg'
        (icons / (name + '.svg')).write_bytes(fetch(url))
        records.append({'file': 'icons/' + name + '.svg', 'source': url, 'license': 'ISC', 'library': 'Lucide'})
    (icons / 'LICENSE-Lucide.txt').write_bytes(fetch(base + '/LICENSE'))
    # Canonical brand vectors from the maintained open-source SVG Logos collection.
    sha = json.loads(fetch('https://api.github.com/repos/gilbarbara/logos/commits/main'))['sha']
    base = f'https://raw.githubusercontent.com/gilbarbara/logos/{sha}'
    simple_sha = json.loads(fetch('https://api.github.com/repos/simple-icons/simple-icons/commits/develop'))['sha']
    for local, remote in [('wikipedia', 'wikipedia-icon'), ('uber', 'uber'), ('maps', 'google-maps'),
                          ('youtube', 'youtube-icon'), ('tiktok', 'tiktok-icon'), ('apple', 'apple'),
                          ('android', 'android-icon'), ('chatgpt', 'openai-icon'), ('google', 'google-icon'),
                          ('instagram', 'instagram-icon'), ('shorts', 'youtube-shorts-icon')]:
        url = base + '/logos/' + remote + '.svg'
        try:
            blob = fetch(url)
            assert b'<svg' in blob
            (logos / (local + '.svg')).write_bytes(blob)
            records.append({'file': 'logos/' + local + '.svg', 'source': url,
                            'license': 'CC0 collection; underlying marks retain their owners', 'library': 'SVG Logos'})
        except Exception as error:
            fallback = {'wikipedia': 'wikipedia', 'uber': 'uber', 'shorts': 'youtubeshorts'}.get(local)
            if not fallback:
                raise error
            url = f'https://raw.githubusercontent.com/simple-icons/simple-icons/{simple_sha}/icons/{fallback}.svg'
            (logos / (local + '.svg')).write_bytes(fetch(url))
            records.append({'file': 'logos/' + local + '.svg', 'source': url,
                            'license': 'CC0 collection; underlying marks retain their owners', 'library': 'Simple Icons'})
    (logos / 'LICENSE-SVG-Logos.txt').write_bytes(fetch(base + '/LICENSE.txt'))
    (logos / 'LICENSE-Simple-Icons.md').write_bytes(fetch(f'https://raw.githubusercontent.com/simple-icons/simple-icons/{simple_sha}/LICENSE.md'))
    # Simple Icons centres this wide wordmark in a square. Fit its complete
    # measured artwork with padding for wide headers, without changing its paths.
    tree = ET.parse(logos / 'uber.svg')
    tree.getroot().set('viewBox', '-0.8 7.17 25.6 9.66013')
    ET.register_namespace('', 'http://www.w3.org/2000/svg')
    tree.write(logos / 'uber-wordmark.svg', encoding='unicode')
    records.append({'file': 'logos/uber-wordmark.svg', 'derivedFrom': 'logos/uber.svg',
                    'change': 'Fit viewBox around the complete wordmark with padding; paths and proportions unchanged.'})
    for local, url in [('InterVariable.woff2', 'https://rsms.me/inter/font-files/InterVariable.woff2'),
                       ('Inter-OFL.txt', 'https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt')]:
        (fonts / local).write_bytes(fetch(url))
        records.append({'file': 'fonts/' + local, 'source': url, 'license': 'SIL OFL 1.1'})
    (PUB / 'visual-library-provenance-v2.json').write_text(json.dumps(records, indent=2) + '\n')
    print('Saved', len(records), 'local library assets with sources and licenses.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--matte', action='store_true')
    parser.add_argument('--libraries', action='store_true')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if args.matte:
        matte()
    if args.libraries:
        libraries()
