"""Inspect the actual encoded short and save a reproducible frame review."""
from pathlib import Path
import argparse,subprocess,json,hashlib,io,re
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
B=ROOT/'episodes/profile-checks'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--name',default='profile-checks-v1')
parser.add_argument('--record',default='export-review')
args=parser.parse_args()
for value in [args.name,args.record]:
    if not re.fullmatch('[a-z0-9-]+',value):parser.error('Unsafe output name.')
video=ROOT/'renders/profile-checks'/f'{args.name}.mp4'
out=ROOT/'renders/profile-checks'/f'review-{args.name.removeprefix("profile-checks-")}-final'
out.mkdir(exist_ok=True)
edit=json.loads((B/'edit.json').read_text());e=edit['events']
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
v=next(x for x in probe['streams'] if x['codec_type']=='video')
assert (v['width'],v['height'],v['avg_frame_rate'])==(1080,1920,'60/1')
assert int(v['nb_frames'])==round(edit['duration']*60)

# Decode every frame. These checks locate empty frames, not storytelling quality.
W,H=160,284
proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(video),'-an','-vf',f'scale={W}:{H}',
    '-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
count=0;previous=None;minimum_dark=(1,None);maximum_difference=(0,None);black=[];empty=[]
while True:
    data=proc.stdout.read(W*H*3)
    if not data:break
    assert len(data)==W*H*3
    frame=np.frombuffer(data,dtype=np.uint8).reshape(H,W,3)
    dark=float((frame.min(axis=2)<190).mean())
    if dark<minimum_dark[0]:minimum_dark=(dark,count)
    if frame.mean()<4:black.append(count)
    if dark<.001:empty.append(count)
    if previous is not None:
        difference=float(np.abs(frame.astype(np.float32)-previous).mean()/255)
        if difference>maximum_difference[0]:maximum_difference=(difference,count)
    previous=frame.astype(np.float32);count+=1
assert proc.wait()==0,proc.stderr.read().decode()
assert count==round(edit['duration']*60)
assert not black and not empty,(black,empty)

times={'first':0,'counter':e['counterTap']+.16,'disclosure':e['disclose']+.35,
 'close':e['closePress']+.18,'compressed':e['closePress']+.51,'receipt':e['notice']+.45,
 'draft':e['draft1']+.67,'erase':e['delete1']+.11,'research':e['draft2']+.45,
 'typing':e['typing']+.63,'plane':e['plane']+.3,'incoming':e['incoming']+.21,
 'screenshot':e['number']-.2,'reveal':e['number']+.45,'pair':e['mutual']+.7,
 'last':edit['duration']-1/60}
def image_at(time,width=None):
    args=['ffmpeg','-v','error','-ss',str(time),'-i',str(video),'-frames:v','1']
    if width:args+=['-vf',f'scale={width}:-1']
    return subprocess.check_output(args+['-f','image2pipe','-vcodec','png','-'])
sheet=Image.new('RGB',(1080,2040),'#e7e9ee');draw=ImageDraw.Draw(sheet)
for i,(name,time) in enumerate(times.items()):
    data=image_at(time);(out/f'{name}.png').write_bytes(data)
    im=Image.open(io.BytesIO(data)).convert('RGB').resize((270,480))
    x=(i%4)*270;y=(i//4)*510;sheet.paste(im,(x,y+30))
    draw.text((x+8,y+8),f'{name} {time:.2f}s',fill='black')
sheet.save(out/'contact-sheet.jpg',quality=94)

for name,start,duration in [('counter',.66,.42),('close',e['closePress']-.08,1.6),
                           ('reveal',e['number']-.16,.64),('pair',e['mutual']-.05,.6),
                           ('ending',e['loop'],edit['duration']-e['loop']-1/60)]:
    sheet=Image.new('RGB',(1080,520),'#eceef2');draw=ImageDraw.Draw(sheet)
    for i in range(8):
        time=start+duration*i/7
        im=Image.open(io.BytesIO(image_at(time,270))).convert('RGB').crop((0,50,270,290))
        x=(i%4)*270;y=(i//4)*260;sheet.paste(im,(x,y+20))
        draw.text((x+8,y+4),f'{time:.3f}s',fill='black')
    sheet.save(out/f'motion-{name}.jpg',quality=94)
result={'file':str(video.relative_to(ROOT)),'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),
 'framesDecoded':count,'duration':float(probe['format']['duration']),
 'width':v['width'],'height':v['height'],'fps':v['avg_frame_rate'],
 'allBlackFrames':black,'nearEmptyFrames':empty,'minimumDarkPixelFraction':minimum_dark,
 'maximumMeanFrameDifference':maximum_difference,'reviewFrames':times,
 'reviewDirectory':str(out.relative_to(ROOT)),
 'limits':'Frame occupancy locates technical blanks. Sequential frame sheets support motion inspection; these metrics do not establish audience retention or auditory quality.'}
(B/f'{args.record}.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='reviewFrames'},indent=2))
