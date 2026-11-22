from pathlib import Path
from PIL import Image,ImageDraw
import json,re
B=Path('episodes/inventions-since-2000/hyperframes');T=json.loads((B.parent/'timeline.json').read_text());candidates=[]
for folder in ['review-v1','first-pass','fixes-v1','final-fixes','last-qa']:
 for p in (B/'snapshots'/folder).glob('*.png'):
  m=re.search(r'-at-([0-9.]+)s',p.stem)
  if m:candidates.append((float(m[1]),p,p.stat().st_mtime))
O=B/'snapshots/chapters';O.mkdir(exist_ok=True)
for c in T['chapters']:
 shots=[s for s in T['shots'] if s['chapter']==c['id']];im=Image.new('RGB',(1920,((len(shots)+3)//4)*295),'#19343e');d=ImageDraw.Draw(im)
 for i,s in enumerate(shots):
  t=s['start']+s['duration']/2;at,p,_=min(candidates,key=lambda x:(abs(x[0]-t),-x[2]));f=Image.open(p);f.thumbnail((480,270));x=(i%4)*480;y=(i//4)*295;im.paste(f,(x,y));d.text((x+6,y+271),f'{s["id"]} {at:.2f}s {s["kind"]}',fill='white')
 im.save(O/(c['id']+'.jpg'),quality=90)
print('Saved',len(T['chapters']),'chapter sheets')
