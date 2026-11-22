"""Create the requested pitch-preserving 1.2x delivery and subtitle time map."""
from pathlib import Path
from fractions import Fraction
import hashlib
import json
import math
import subprocess
import argparse

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'episodes/shower-singing'
parser = argparse.ArgumentParser()
parser.add_argument('--source', default='renders/shower-singing/shower-singing-v1.mp4')
parser.add_argument('--output', default='renders/shower-singing/shower-singing-v2-1p2x.mp4')
args = parser.parse_args()
SOURCE = ROOT / args.source
OUTPUT = ROOT / args.output
RATE = Fraction(6, 5)
FPS = 60

if OUTPUT.exists():
    raise RuntimeError('Named export exists. Preserve it and choose a new version.')
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(SOURCE)]))
video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
source_frames = int(video['nb_frames'])
assert (video['width'], video['height'], video['r_frame_rate']) == (1080, 1920, '60/1')
frames = math.ceil(source_frames / RATE)
duration = frames / FPS
samples = round(duration * 48000)
rate = float(RATE)

def save(name, value):
    (BASE / name).write_text(json.dumps(value, indent=2) + '\n')

def stamp(ms):
    seconds, milliseconds = divmod(round(ms), 1000)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f'{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}'

original = json.loads((BASE / 'captions.json').read_text())
captions = [{**c,
    'startMs': round(c['startMs'] / rate),
    'endMs': round(c['endMs'] / rate),
    'timestampMs': round(c['timestampMs'] / rate) if c['timestampMs'] is not None else None,
} for c in original]
for c in captions:
    assert c['endMs'] > c['startMs'] >= 0
    first_frame = math.ceil(c['startMs'] * FPS / 1000)
    end_frame = min(frames, math.ceil(c['endMs'] * FPS / 1000))
    assert end_frame > first_frame, f'Caption lost to frame sampling: {c["text"]}'
save('captions-1p2x.json', captions)
(BASE / 'captions-1p2x.srt').write_text('\n\n'.join(
    f'{i+1}\n{stamp(c["startMs"])} --> {stamp(c["endMs"])}\n{c["text"]}'
    for i, c in enumerate(captions)) + '\n')
transcript = json.loads((BASE / 'transcript-source.json').read_text())
save('transcript-1p2x.json', {**transcript, 'playbackRate': rate,
    'words': [{**w, 'start': w['start'] / rate, 'end': w['end'] / rate}
              for w in transcript['words']]})
edit = json.loads((BASE / 'edit.json').read_text())
shots = [{**s, 'start': s['start'] / rate, 'duration': s['duration'] / rate}
         for s in edit['shots']]
shots[-1]['duration'] = duration - shots[-1]['start']
save('edit-1p2x.json', {
    'fps': FPS, 'duration': duration, 'playbackRate': rate,
    'events': {**{k: t / rate for k, t in edit['events'].items()}, 'end': duration},
    'shots': shots,
})

# Captions are already burned into the source picture. Retiming that entire
# picture keeps them, every action and every sound on the same source clock.
chain = (
    f'[0:v]setpts=(PTS-STARTPTS)/{rate},fps={FPS},'
    f'tpad=stop_mode=clone:stop_duration=0.05,trim=end_frame={frames},'
    f'setpts=N/({FPS}*TB),format=yuv420p[v];'
    f'[0:a]atempo={rate},aresample=48000,apad=whole_len={samples},'
    f'atrim=end_sample={samples},asetpts=N/SR/TB[a]'
)
subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-n',
    '-i', str(SOURCE), '-filter_complex', chain,
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'fast',
    '-crf', '16', '-pix_fmt', 'yuv420p', '-color_range', 'tv',
    '-colorspace', 'bt709', '-color_trc', 'bt709', '-color_primaries', 'bt709',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', str(duration),
    '-movflags', '+faststart', str(OUTPUT),
], check=True)
manifest = {
    'source': str(SOURCE.relative_to(ROOT)),
    'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'output': str(OUTPUT.relative_to(ROOT)),
    'outputSha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
    'playbackRate': rate, 'pitchPreserved': True,
    'method': 'Complete rendered picture setpts/1.2 with full-mix atempo=1.2; burned captions share the picture timebase.',
    'sourceFrames': source_frames, 'sourceDuration': source_frames / FPS,
    'frames': frames, 'duration': duration, 'fps': FPS,
    'framePaddingSeconds': duration - source_frames / FPS / rate,
    'captionFile': 'episodes/shower-singing/captions-1p2x.json',
    'subtitleFile': 'episodes/shower-singing/captions-1p2x.srt',
    'transcriptFile': 'episodes/shower-singing/transcript-1p2x.json',
    'captionChunks': len(captions), 'allCaptionChunksHaveOutputFrames': True,
    'userRequested': True, 'userApprovedExport': False,
}
save('speed-1p2x.json', manifest)
print(json.dumps(manifest, indent=2))
