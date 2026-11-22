"""Render and encode native 1080p hero sources, one Blender job at a time."""
from pathlib import Path
import argparse
import json
import subprocess
import os
import time

ROOT = Path(__file__).resolve().parents[1]
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
parser = argparse.ArgumentParser()
parser.add_argument('shots', nargs='+', choices=['bedroom', 'phone', 'map', 'dna'])
parser.add_argument('--wait-for-pid', type=int)
args = parser.parse_args()
if args.wait_for_pid:
    while True:
        try:
            os.kill(args.wait_for_pid, 0)
        except ProcessLookupError:
            break
        time.sleep(2)
registry_path = ROOT / 'public/episodes/inventions-since-2000/heroes/hero-clips-v2.json'
registry = json.loads(registry_path.read_text()) if registry_path.exists() else {}
for shot in args.shots:
    folder = ROOT / 'blender/inventions-since-2000' / shot / 'v2'
    count = {'bedroom': 240, 'phone': 240, 'map': 270, 'dna': 300}[shot]
    command = [BLENDER, '--background', '--factory-startup', '--python',
               'blender/scripts/inventions_heroes_v1.py', '--', '--shot', shot,
               '--revision', 'v2', '--width', '1920', '--samples', '48']
    ranges = {'map': [(1, 108)], 'dna': [(1, 76), (151, 199)]}.get(shot, [(1, count)])
    if not all((folder / f'still-{i:04}.png').exists() for i in [1, count//2, count]):
        with (ROOT / f'renders/inventions-since-2000/{shot}-v2-stills.log').open('w') as log:
            subprocess.run(command + ['--stills'], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, check=True)
    for start, end in ranges:
        missing = [i for i in range(start, end + 1) if not (folder / 'frames-v2' / f'{i:04}.png').exists()]
        if missing:
            with (ROOT / f'renders/inventions-since-2000/{shot}-v2-render.log').open('a') as log:
                subprocess.run(command + ['--range', f'{min(missing)}:{max(missing)}'], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, check=True)
    manifest_path = folder / 'manifest-v2.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['renderedFrameRanges'] = ranges
    manifest['renderOnlyVisibleRanges'] = shot in ['map', 'dna']
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    registry[shot] = []
    for index, (start, end) in enumerate(ranges):
        stem = shot + ('-guide' if index == 0 else '-cut') if shot == 'dna' else shot
        target = ROOT / f'public/episodes/inventions-since-2000/heroes/{stem}-v2.mp4'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '30',
                        '-start_number', str(start), '-i', str(folder / 'frames-v2/%04d.png'),
                        '-frames:v', str(end-start+1), '-vf',
                        'scale=1920:1080:out_color_matrix=bt709:out_range=tv,format=yuv420p',
                        '-c:v', 'libx264', '-crf', '16', '-preset', 'fast',
                        '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                        '-color_trc', 'bt709', '-movflags', '+faststart', str(target)], check=True)
        registry[shot].append({'file': target.name, 'sourceStart': (start-1)/30,
                               'duration': (end-start+1)/30, 'frames': end-start+1,
                               'sourceResolution': [1920, 1080], 'samples': 48})
    registry_path.write_text(json.dumps(registry, indent=2) + '\n')
    print(json.dumps({'shot': shot, 'clips': registry[shot]}), flush=True)
