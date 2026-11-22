"""Decode delivery-size frames around the story's contacts, transitions and ending."""
from pathlib import Path
import json,subprocess,math
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1];p=root/'renders/immortal/encoded-full-v1';p.mkdir(exist_ok=True)
times=[0,1.8,3,6.5,11,15.1,18.5,23.5,45.1,46.2,47.8,65.2,77.4,80.6,84.6,88,119.2,122.5,128.2,154,170.9,199.2,224.8,236,245.8,259.3,267,290,300,303,319,340.4,354,368.4,373.5,377,390.6,396.1,400.2,404.2,411.5,426,428.7,428.83,429.2]
indices=[math.floor(t*30+1e-5)for t in times];expression='+'.join(f'eq(n\\,{i})'for i in indices)
subprocess.run(['ffmpeg','-v','error','-y','-i',str(root/'renders/immortal/immortal-full-v1.mp4'),'-vf',f'select={expression}','-fps_mode','vfr',str(p/'frame-%03d.png')],check=True)
frames=sorted(p.glob('frame-*.png'))
if len(frames)!=len(times):raise RuntimeError(f'Expected{len(times)}frames,got{len(frames)}')
for page in range((len(frames)+8)//9):
 out=Image.new('RGB',(1920,3*385),'#263842');d=ImageDraw.Draw(out)
 for j in range(9):
  i=page*9+j
  if i>=len(frames):break
  im=Image.open(frames[i]);im.thumbnail((640,360));x=(j%3)*640;y=(j//3)*385;out.paste(im,(x,y));d.text((x+8,y+365),f'{i+1}. {times[i]:.2f}s',fill='white')
 out.save(p/f'encoded-review-{page+1}.jpg',quality=95)
(p/'frames.json').write_text(json.dumps([{'time':t,'frame':f,'file':str(path)}for t,f,path in zip(times,indices,frames)],indent=2)+'\n');print({'decodedReviewFrames':len(frames),'sheets':(len(frames)+8)//9})
