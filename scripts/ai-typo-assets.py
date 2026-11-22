"""Save source pixels and measure actor pivots for the Alex/Opus film."""
from pathlib import Path
import hashlib, json, shutil
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[1];B=R/'episodes/ai-typo';P=R/'public/episodes/ai-typo'
actors={}
for pose in ['coffee','explain','frustrated']:
 src=R/f'output/imagegen/ai-typo/{pose}-source.png';dest=P/f'art/alex-{pose}.png';shutil.copy2(src,dest)
for family,poses in [('alex',['coffee','explain','frustrated']),('opus',['present','proud','think'])]:
 for pose in poses:
  id=f'{family}-{pose}';filename=f'{id}-shirt-v2.png' if family=='opus' else f'{id}.png';p=P/'art'/filename;im=Image.open(p).convert('RGBA');a=np.array(im)
  mask=a[:,:,3]>160 if family=='alex' else (a[:,:,:3].min(axis=2)<225)
  ys,xs=np.nonzero(mask);bounds=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
  l,t,r,b=bounds
  shoe_y,shoe_x=np.nonzero(mask & (np.arange(im.height)[:,None]>b-(b-t)*.09));pivot=(float(shoe_x.min())+float(shoe_x.max()))/2
  assert l>10 and t>10 and r<im.width-10 and b<im.height-10,(id,bounds)
  actors[id]={'id':id,'url':str(p.relative_to(R/'public')),'width':im.width,'height':im.height,'bounds':bounds,'pivotX':pivot,'footY':b,'bodyHeight':b-t,'background':'transparent' if family=='alex' else 'white assistant panel','sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
(B/'assets/actors.json').write_text(json.dumps(actors,indent=2)+'\n')
fonts=P/'fonts';fonts.mkdir(exist_ok=True)
for f in ['InterVariable.woff2','Inter-OFL.txt']:shutil.copy2(R/'public/episodes/start-the-task/fonts'/f,fonts/f)
print(json.dumps({'actors':list(actors),'allSourceEdgesClear':True}))
