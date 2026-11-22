from pathlib import Path
import re,json,shutil
from PIL import Image,ImageDraw
B=Path('episodes/inventions-since-2000/hyperframes');out=B/'snapshots/fresh-review';out.mkdir(exist_ok=True);frames=[]
for folder in ['review-v1','first-pass','fixes-v1','final-fixes','last-qa']:
 for p in (B/'snapshots'/folder).glob('*.png'):
  m=re.search(r'-at-([0-9.]+)s',p.stem)
  if m:frames.append((float(m[1]),p,p.stat().st_mtime))
def choose(t):
 near=sorted(frames,key=lambda x:(abs(x[0]-t),-x[2]));return near[0]
def sheet(name,ts,columns,width):
 cw=width;ch=round(cw*9/16)+26;im=Image.new('RGB',(cw*columns,((len(ts)+columns-1)//columns)*ch),'#19343e');d=ImageDraw.Draw(im)
 for i,t in enumerate(ts):
  at,p,_=choose(t);f=Image.open(p).convert('RGB');f.thumbnail((cw,round(cw*9/16)));x=(i%columns)*cw;y=(i//columns)*ch;im.paste(f,(x,y));d.text((x+7,y+round(cw*9/16)+5),f'{at:.2f}s',fill='#f0e4c7')
 im.save(out/name,quality=91)
sheet('overview.jpg',[.3,8,20,32,70,93,112,128,151,175,193,217,246,251,267,271,286,290,306,321,349,354,360,378,383,387,396,405],4,480)
t=json.loads((B.parent/'timeline.json').read_text());handoffs=[]
for c in t['chapters'][1:]:handoffs.extend([c['start']-.14,c['start']+.3])
sheet('handovers.jpg',handoffs,2,600)
sheet('phone.jpg',[.3,8,20,70,112,151,193,246,267,306,349,354,360,383,387,405],3,360)
backup=B.parent/'versions/v1-before-fresh-review';backup.mkdir(parents=True,exist_ok=True)
for name in ['episode.json','shot-recipe.json','timeline.json','script-production.json']:shutil.copyfile(B.parent/name,backup/name)
shutil.copyfile(B/'index.html',backup/'index.html');shutil.copyfile('scripts/inventions-hyperframes.py',backup/'inventions-hyperframes.py')
print(str(out))
