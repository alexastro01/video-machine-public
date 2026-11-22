from pathlib import Path
import urllib.request,json,io
import pyarrow.parquet as pq
from PIL import Image
p=Path('public/pixel/guitar-pickup/atlas');p.mkdir(parents=True,exist_ok=True)
url='https://huggingface.co/datasets/Angais/pixel-art-atlas-1.4m/resolve/main/data/train-000.parquet'
cache=Path('/tmp/guitar-pixel-atlas-train-000.parquet')
if not cache.exists():urllib.request.urlretrieve(url,cache)
t=pq.read_table(cache).to_pylist()
terms=['guitar pick','amplifier','speaker','electric guitar','cable','headphone','plug']
rows=[]
for term in terms:
 candidates=[r for r in t if term in r['subject'].lower()]
 for r in candidates[:4]:
  name=f"{r['row_id']}.png";im=Image.open(io.BytesIO(r['image']['bytes']));im.save(p/name)
  rows.append({k:r[k] for k in ['row_id','caption','subject']}|{'file':str(p/name),'source':url,'nativeSize':list(im.size)})
(p/'candidates.json').write_text(json.dumps(rows,indent=2)+'\n')
thumb=Image.new('RGB',(160*6,190*((len(rows)+5)//6)),(23,45,55))
from PIL import ImageDraw
for i,r in enumerate(rows):
 im=Image.open(r['file']).convert('RGBA').resize((128,128),Image.Resampling.NEAREST);x=(i%6)*160+16;y=(i//6)*190+8;thumb.paste(im,(x,y),im);ImageDraw.Draw(thumb).text((x,y+134),f"{r['row_id']} {r['subject']}"[:24],fill=(235,224,192))
thumb.save(p/'candidates.png')
print(json.dumps([{k:v for k,v in r.items() if k not in ['source']} for r in rows],indent=2))
