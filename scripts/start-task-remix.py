"""Export a replacement score without re-rendering the reviewed picture."""
from pathlib import Path
import argparse, hashlib, json, re, subprocess

ROOT = Path(__file__).resolve().parents[1]
B = ROOT / 'episodes/start-the-task'
P = ROOT / 'public/episodes/start-the-task'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--name', default='start-the-task-v2-new-music')
parser.add_argument('--record', default='music-remix-v2')
args = parser.parse_args()
for value in [args.name, args.record]:
    if not re.fullmatch('[a-z0-9-]+', value):
        parser.error('Use lowercase letters, digits and hyphens in names.')

source = ROOT / 'renders/start-the-task/start-the-task-v1.mp4'
output = ROOT / 'renders/start-the-task' / (args.name + '.mp4')
if source == output:
    parser.error('Preserve the previous export with a separate output name.')
plan = json.loads((B / 'plan.json').read_text())
episode = json.loads((B / 'episode.json').read_text())
saved = json.loads((B / 'revisions/v1-before-new-song/preserved-media.json').read_text())
for file, digest in saved.items():
    assert hashlib.sha256((ROOT / file).read_bytes()).hexdigest() == digest, file

# All three prepared stems are stereo. Preserve their existing routing and levels.
subprocess.run([
    'ffmpeg', '-v', 'error', '-y', '-i', str(source),
    '-i', str(P / 'narration.wav'), '-i', str(P / 'effects.wav'),
    '-i', str(P / 'music.wav'), '-filter_complex',
    '[1:a][2:a][3:a]amix=inputs=3:duration=longest:normalize=0[a]',
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac',
    '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', str(episode['duration']),
    '-movflags', '+faststart', str(output),
], check=True)

def video_hash(file):
    return subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(file), '-map', '0:v:0',
        '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-',
    ], text=True).strip().split('=')[1]

picture_hash = video_hash(source)
assert picture_hash == video_hash(output)
report = {
    'file': str(output.relative_to(ROOT)),
    'sourceVideo': str(source.relative_to(ROOT)),
    'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'videoStreamSha256': picture_hash,
    'videoStreamMatchesV1': True,
    'pictureReencoded': False,
    'preservedMedia': saved,
    'musicSelection': plan['musicSelection'],
    'musicReview': json.loads((B / 'music-review.json').read_text()),
    'duration': episode['duration'],
    'userApproval': 'pending',
}
(B / (args.record + '.json')).write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['file', 'sha256', 'videoStreamMatchesV1', 'pictureReencoded']}, indent=2))
