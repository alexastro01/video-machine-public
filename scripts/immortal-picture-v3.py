"""Render the reviewed v3 picture intervals and assemble them with v2 audio."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parents[1]
base = root / 'episodes/immortal/revisions/v3'
plan = json.loads((base / 'picture-patches.json').read_text())
parser = argparse.ArgumentParser()
parser.add_argument('--render', action='store_true')
parser.add_argument('--assemble', action='store_true')
args = parser.parse_args()

def run(command, log):
    with log.open('w') as stream:
        subprocess.run(command, cwd=root, stdout=stream, stderr=subprocess.STDOUT, check=True)

def frame_count(file):
    result = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                                      '-show_entries', 'stream=nb_frames', '-of', 'csv=p=0', str(file)], text=True)
    return int(result.strip())

if args.render:
    for patch in plan['ranges']:
        out = root / patch['file']
        print(json.dumps({'stage': 'render', 'id': patch['id'], 'frames': patch['frames']}), flush=True)
        if not out.exists():
            name = 'immortal-v3-' + patch['id']
            run(['npm', 'run', 'render', '--', 'immortal', '--landscape', '--name=' + name,
                 f"--range={patch['startFrame']}:{patch['endFrameExclusive'] - 1}"],
                root / f"renders/immortal/v3-{patch['id']}-render.log")
        if frame_count(out) != patch['frames']:
            raise RuntimeError('Incorrect patch frame count: ' + patch['id'])
        print(json.dumps({'stage': 'rendered', 'id': patch['id']}), flush=True)

if args.assemble:
    source = root / plan['source']
    work = root / 'renders/immortal/v3-assembly'
    work.mkdir(exist_ok=True)
    parts, cursor = [], 0
    for patch in plan['ranges']:
        if cursor < patch['startFrame']:
            parts.append({'file': source, 'start': cursor, 'frames': patch['startFrame'] - cursor,
                          'kind': 'preserved picture'})
        parts.append({'file': root / patch['file'], 'start': 0, 'frames': patch['frames'],
                      'kind': patch['id']})
        cursor = patch['endFrameExclusive']
    if cursor < plan['frames']:
        parts.append({'file': source, 'start': cursor, 'frames': plan['frames'] - cursor,
                      'kind': 'preserved picture'})
    encoded = []
    for i, part in enumerate(parts):
        file = work / f'part-{i + 1:02d}.mp4'
        # Integer-second seeks and frame-count trims keep patch boundaries exact.
        seek = max(0, part['start'] // 30 - 1) if part['file'] == source else 0
        offset = part['start'] - seek * 30
        command = ['ffmpeg', '-v', 'error', '-y']
        if seek:
            command.extend(['-ss', str(seek)])
        command.extend(['-i', str(part['file']), '-an', '-vf',
                        f"trim=start_frame={offset}:end_frame={offset + part['frames']},setpts=PTS-STARTPTS,setsar=1",
                        '-frames:v', str(part['frames']), '-r', '30', '-c:v', 'libx264',
                        '-preset', 'fast', '-crf', '16', '-profile:v', 'high', '-level:v', '4.1',
                        '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', '-pix_fmt', 'yuv420p',
                        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
                        '-color_range', 'tv', '-video_track_timescale', '15360', str(file)])
        print(json.dumps({'stage': 'encode part', 'part': i + 1, 'of': len(parts), 'kind': part['kind']}), flush=True)
        if not (file.exists() and file.stat().st_mtime >= part['file'].stat().st_mtime
                and frame_count(file) == part['frames']):
            run(command, work / f'part-{i + 1:02d}.log')
        if frame_count(file) != part['frames']:
            raise RuntimeError('Incorrect assembled part frame count')
        encoded.append(file)
    concat = work / 'parts.ffconcat'
    concat.write_text('ffconcat version 1.0\n' + ''.join(
        "file '" + str(file).replace("'", "'\\''") + f"'\nduration {part['frames'] / 30:.9f}\n"
        for file, part in zip(encoded, parts)))
    output = root / plan['output']
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat),
         '-i', str(source), '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy',
         '-movflags', '+faststart', str(output)], work / 'mux.log')
    if frame_count(output) != plan['frames']:
        raise RuntimeError('Final frame count changed')
    def audio_hash(file):
        return subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(file), '-map', '0:a:0',
                                        '-c:a', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], text=True).strip()
    before, after = audio_hash(source), audio_hash(output)
    if before != after:
        raise RuntimeError('Approved audio stream changed')
    result = {'file': str(output), 'frames': frame_count(output), 'replacedFrames': sum(p['frames'] for p in plan['ranges']),
              'audioStreamUnchanged': True, 'audioStreamHash': after,
              'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}
    (base / 'assembly-verification.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result), flush=True)
