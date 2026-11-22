"""Swap the prepared music while preserving v1's picture and stem levels."""
from pathlib import Path
import argparse,hashlib,json,re,subprocess

ROOT=Path(__file__).resolve().parents[1]
B=ROOT/'episodes/profile-checks'
P=ROOT/'public/episodes/profile-checks'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--name',help='Export filename without extension; defaults to the episode music selection.')
parser.add_argument('--record',help='Episode proof filename without extension; defaults to the episode music selection.')
args=parser.parse_args()
plan=json.loads((B/'plan.json').read_text())
selection=plan.get('musicSelection',{})
delivery=plan.get('delivery',{})
args.name=args.name or delivery.get('exportName',selection.get('exportName','profile-checks-v2-mylovin'))
args.record=args.record or delivery.get('recordName',selection.get('recordName','music-remix-v2'))
for value in [args.name,args.record]:
    if not re.fullmatch('[a-z0-9-]+',value):parser.error('Names must contain only lowercase letters, digits and hyphens.')
source=ROOT/delivery.get('pictureSource','renders/profile-checks/profile-checks-v1.mp4')
output=ROOT/'renders/profile-checks'/f'{args.name}.mp4'
if source.resolve()==output.resolve():parser.error('Picture source and final export must be separate files.')
episode=json.loads((B/'episode.json').read_text())
saved=json.loads((ROOT/delivery.get('stemSnapshot','episodes/profile-checks/versions/v1-before-mylovin/preserved-stems.json')).read_text())
for name,digest in saved.items():
    assert hashlib.sha256((P/name).read_bytes()).hexdigest()==digest,name

# Remotion duplicates a mono effect stem at full level into L and R.
# Explicit pan avoids FFmpeg's automatic -3 dB mono-to-stereo conversion.
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),
    '-i',str(P/'narration.wav'),'-i',str(P/'effects.wav'),'-i',str(P/'music.wav'),
    '-filter_complex','[2:a]pan=stereo|c0=c0|c1=c0[fx];[1:a][fx][3:a]amix=inputs=3:duration=longest:normalize=0[a]',
    '-map','0:v:0','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k',
    '-ar','48000','-t',str(episode['duration']),'-movflags','+faststart',str(output)],check=True)
def video_hash(file):
    return subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-map','0:v:0',
        '-c','copy','-f','hash','-hash','sha256','-'],text=True).strip().split('=')[1]
original_hash=video_hash(source);new_hash=video_hash(output)
assert original_hash==new_hash
result={'file':str(output.relative_to(ROOT)),'sourceVideo':str(source.relative_to(ROOT)),
    'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
    'videoStreamSha256':new_hash,'videoStreamMatchesSource':True,
    'videoStreamMatchesV1':new_hash==video_hash(ROOT/'renders/profile-checks/profile-checks-v1.mp4'),
    'preservedStems':saved,'effectsStereoRouting':'Mono copied at full level to left and right, matching the source Remotion mix.',
    'music':'public/episodes/profile-checks/music.wav','musicProvenance':selection.get('provenance','episodes/profile-checks/assets/music-mylovin.json'),
    'musicGainAutomation':'none','duration':episode['duration'],'pictureReencoded':False}
(B/f'{args.record}.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
