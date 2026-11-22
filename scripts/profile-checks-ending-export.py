"""Join the saved opening with the revised ending, then mix the local audio stems."""
from pathlib import Path
import hashlib,json,subprocess,sys

ROOT=Path(__file__).resolve().parents[1]
B=ROOT/'episodes/profile-checks'
plan=json.loads((B/'plan.json').read_text())
delivery=plan['delivery']
episode=json.loads((B/'episode.json').read_text())
prefix=ROOT/delivery['prefixSource']
tail=ROOT/delivery['tailSource']
output=ROOT/delivery['pictureSource']
frames=round(episode['duration']*episode['fps'])
prefix_frames=delivery['prefixFrames']
def video(file):
    data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(file)]))
    return next(s for s in data['streams'] if s['codec_type']=='video')
for file in [prefix,tail]:
    stream=video(file)
    assert (stream['width'],stream['height'])==(1080,1920),str(file)
    a,b=map(int,stream['avg_frame_rate'].split('/'))
    assert a/b==episode['fps'],str(file)
assert int(video(tail)['nb_frames'])==frames-prefix_frames,'Ending frame count differs from its planned range.'
assert prefix!=output and tail!=output,'The picture output must be a separate file.'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',
    '-i',str(prefix),'-i',str(tail),
    '-filter_complex',f'[0:v]trim=end_frame={prefix_frames},setpts=PTS-STARTPTS[p];[1:v]setpts=PTS-STARTPTS[q];[p][q]concat=n=2:v=1:a=0[v]',
    '-map','[v]','-an','-c:v','libx264','-preset','fast','-crf','12',
    '-pix_fmt','yuv420p','-r',str(episode['fps']),'-fps_mode','cfr','-frames:v',str(frames),
    '-video_track_timescale','60000','-color_primaries','bt709','-color_trc','bt709',
    '-colorspace','bt709','-color_range','tv','-movflags','+faststart',str(output)],check=True)
assert int(video(output)['nb_frames'])==frames
record={'file':str(output.relative_to(ROOT)),'frames':frames,'fps':episode['fps'],
    'prefix':{'source':str(prefix.relative_to(ROOT)),'sourceFrames':[0,prefix_frames-1]},
    'ending':{'source':str(tail.relative_to(ROOT)),'outputFrames':[prefix_frames,frames-1],
              'sourceRemotionFrames':[prefix_frames,frames-1]},
    'pictureReencoded':True,'encoding':{'codec':'libx264','crf':12,'preset':'fast'},
    'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}
(B/f"{delivery.get('assemblyRecord','ending-assembly-v4')}.json").write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
subprocess.run([sys.executable,str(ROOT/'scripts/profile-checks-remix.py')],check=True)
