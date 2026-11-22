"""Prepare new era cast and finite animations, retaining the opening registries."""
from pathlib import Path
import importlib.util,json,sys
import numpy as np
from PIL import Image,ImageDraw,ImageSequence
# Existing matte/bounds functions only, without rerunning the sample pipeline.
p=Path(__file__).with_name('immortal-assets.py');namespace={'__file__':str(p)};exec(p.read_text().split('SHEETS =')[0],namespace)
clean,bounds=namespace['clean'],namespace['bounds'];ROOT=namespace['ROOT'];B=namespace['B'];OUT=ROOT/'output/imagegen/immortal-film-v2';PUB=ROOT/'public/episodes/immortal/art';OUT.mkdir(exist_ok=True)
sheets={
 'witch-alert':('witch-alert-four.png',['neutral','talk','kind','scroll'],3.15),
 'marcus-age':('marcus-age-four.png',['back','basket','old','seated'],2.8),
 'anna':('anna-four.png',['market','laugh','question','seated'],2.8),
 'norbert-medieval':('norbert-medieval-four.png',['neutral','water','write','grief'],2.8),
 'norbert-earlymodern':('norbert-earlymodern-four.png',['neutral','talk','market','portrait'],2.8),
 'norbert-industrial':('norbert-industrial-four.png',['photo','sneeze','passport','rock'],2.8),
 'gate-kid':('gate-kid-four.png',['neutral','point','seated','game'],2.2),
 'period-support':('period-support-four.png',['priest','clerk','photographer','guard'],2.85),
}
poses=json.loads((B/'assets/poses-v2.json').read_text()) if '--animations-only' in sys.argv else {}
if '--animations-only' in sys.argv:sheets={}
for name,(filename,labels,height)in sheets.items():
 source=OUT/filename
 if not source.exists():continue
 raw=Image.open(source).convert('RGBA');image=clean(raw);cw,ch=raw.width//2,raw.height//2
 regions=[(max(0,(i%2)*cw-96),max(0,(i//2)*ch-96),min(raw.width,(i%2+1)*cw+96),min(raw.height,(i//2+1)*ch+96))for i in range(4)]
 cells=[image.crop(r)for r in regions];boxes=[bounds(c)for c in cells];reference_height=boxes[0][3]-boxes[0][1]
 for i,(label,cell,box)in enumerate(zip(labels,cells,boxes)):
  if min(box[0],box[1],cell.width-box[2],cell.height-box[3])<10:raise RuntimeError(f'Clipped {name}/{label}')
  sprite=cell.crop(box);id=f'{name}-{label}';file=PUB/f'{id}.png';sprite.save(file)
  rx,ry=regions[i][:2];ref=raw.crop((rx+box[0],ry+box[1],rx+box[2],ry+box[3]));padded=Image.new('RGB',(ref.width+160,ref.height+160),'#ff00ff');padded.paste(ref.convert('RGB'),(80,80));padded.save(OUT/f'{id}-reference.png')
  feet=sprite.getchannel('A').crop((0,round(sprite.height*.86),sprite.width,sprite.height)).getbbox();pivot=(feet[0]+feet[2])/2 if feet else sprite.width/2
  poses[id]={'id':id,'file':str(file.relative_to(ROOT/'public')),'width':sprite.width,'height':sprite.height,'pivotX':pivot,'footY':sprite.height-4,'worldHeight':height*sprite.height/reference_height,'source':str(source.relative_to(ROOT)),'sourceCell':i}
(B/'assets/poses-v2.json').write_text(json.dumps(poses,indent=2)+'\n')
animations={}
requests=B/'full/gif-jobs.json'
for req in json.loads(requests.read_text())if requests.exists()else[]:
 if req.get('rejected'):continue
 file=ROOT/req['output']
 if not file.exists():continue
 id=req['id'];mp=PUB/f'{id}-atlas.json';ap=PUB/f'{id}-atlas.png'
 if mp.exists()and ap.exists()and mp.stat().st_mtime>file.stat().st_mtime:
  meta=json.loads(mp.read_text())
 else:
  gif=Image.open(file);bg=req.get('background',False);frames=[(f.copy().convert('RGBA')if bg else clean(f.copy()))for f in ImageSequence.Iterator(gif)];fw,fh=frames[0].size
  boxes=[(0,0,fw,fh)if bg else bounds(f,actors=req.get('actors',1))for f in frames]
  for i,box in enumerate(boxes):
   if not bg and min(box[0],box[1],fw-box[2],fh-box[3])<4:raise RuntimeError(f'Clipped GIF {id}, frame {i}')
  crop={'x':min(x[0]for x in boxes),'y':min(x[1]for x in boxes)};crop.update({'width':max(x[2]for x in boxes)-crop['x'],'height':max(x[3]for x in boxes)-crop['y']})
  atlas=Image.new('RGBA',(fw*4,fh*((len(frames)+3)//4)))
  for i,f in enumerate(frames):atlas.paste(f,((i%4)*fw,(i//4)*fh))
  atlas.save(ap);height=req.get('worldHeight',3.15);height=height*crop['height']/(boxes[0][3]-boxes[0][1])
  meta={'id':id,'width':atlas.width,'height':atlas.height,'cellWidth':fw,'cellHeight':fh,'columns':4,'rows':(len(frames)+3)//4,'frameCount':len(frames),'frameDurationMs':gif.info.get('duration',100),'crop':crop,'cells':[{'left':x[0],'top':x[1],'right':x[2]-1,'bottom':x[3]-1}for x in boxes],'background':bg,'worldHeight':height,'source':req['output'],'nativeAnimation':True,'playback':'finite action then hold'};mp.write_text(json.dumps(meta,indent=2)+'\n')
  review=Image.new('RGB',(6*250,((len(frames)+5)//6)*270),'#273943');draw=ImageDraw.Draw(review)
  for i,f in enumerate(frames):
   sm=f.copy();sm.thumbnail((240,240));x=(i%6)*250;y=(i//6)*270;review.paste(sm,(x,y),sm);draw.text((x+5,y+245),str(i),fill='white')
  review.save(OUT/f'{id}-review.jpg',quality=95)
 animations[id]={'file':str(ap.relative_to(ROOT/'public')),'metadata':str(mp.relative_to(ROOT/'public')),'worldHeight':meta['worldHeight']}
(B/'assets/animations-v2.json').write_text(json.dumps(animations,indent=2)+'\n')
review=Image.new('RGB',(4*340,((len(poses)+3)//4)*360),'#25333b');draw=ImageDraw.Draw(review)
for i,(name,pose)in enumerate(poses.items()):
 image=Image.open(ROOT/'public'/pose['file']);image.thumbnail((320,310),Image.Resampling.NEAREST);x=(i%4)*340+(340-image.width)//2;y=(i//4)*360;review.paste(image,(x,y),image);draw.text(((i%4)*340+10,y+320),name,fill='white')
review.save(OUT/'cast-review.jpg',quality=95)
print(json.dumps({'poses':len(poses),'animations':len(animations)}))
