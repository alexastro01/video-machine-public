"""Local cutouts, fixed pivots and finite native-animation atlases for the swap."""
from pathlib import Path
import hashlib, importlib.util, json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageChops, ImageFilter, ImageDraw, ImageSequence

ROOT=Path(__file__).resolve().parents[1];SLUG='billionaire-body-swap'
B=ROOT/'episodes'/SLUG;RAW=ROOT/'output/imagegen/billionaire-swap-v1';P=ROOT/'public/episodes'/SLUG/'art'
P.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('chroma',Path.home()/'.codex/skills/.system/imagegen/scripts/remove_chroma_key.py')
chroma=importlib.util.module_from_spec(spec);spec.loader.exec_module(chroma)

def clean(raw):
    source=raw.convert('RGBA');out=source.copy()
    chroma._apply_alpha_to_image(out,key=(255,0,255),tolerance=55,spill_cleanup=True,soft_matte=True,transparent_threshold=28,opaque_threshold=150)
    diff=ImageChops.difference(source.convert('RGB'),Image.new('RGB',source.size,(255,0,255)))
    a,b,c=diff.split();inside=ImageChops.lighter(ImageChops.lighter(a,b),c).point(lambda x:255 if x>100 else 0).filter(ImageFilter.MinFilter(5))
    out.paste(source,(0,0),inside);return out

def bounds(im):
    lab,_=ndimage.label(np.asarray(im.getchannel('A'))>110,np.ones((3,3)))
    sizes=np.bincount(lab.ravel());sizes[0]=0
    yy,xx=np.where(np.isin(lab,np.flatnonzero(sizes>25)))
    return (max(0,int(xx.min())-5),max(0,int(yy.min())-5),min(im.width,int(xx.max())+6),min(im.height,int(yy.max())+6))

def metadata(im,height):
    foot=im.getchannel('A').crop((0,round(im.height*.85),im.width,im.height)).getbbox()
    return dict(width=im.width,height=im.height,pivotX=(foot[0]+foot[2])/2 if foot else im.width/2,footY=im.height-5,worldHeight=height)

def review(frames,file):
    im=Image.new('RGB',(6*180,((len(frames)+5)//6)*240),'#25333e');d=ImageDraw.Draw(im)
    for i,f in enumerate(frames):
        sm=f.copy();sm.thumbnail((172,210),Image.Resampling.NEAREST);x=(i%6)*180;y=(i//6)*240
        im.paste(sm,(x+(180-sm.width)//2,y),sm);d.text((x+6,y+216),str(i),fill='white')
    im.save(file,quality=94)

poses={};ledger=[]
for char,names,heights in [
    ('rich',['before','wow','talk','reach'],[2.55]*4),
    ('miko',['bare','seated','talk','bite'],[2.48,1.78,1.78,1.78]),
    ('mum',['door','question','point','serve'],[2.35]*4),
]:
    f=RAW/f'{char}-four-magenta.png';raw=Image.open(f).convert('RGBA');im=clean(raw)
    if im.size!=(2048,2048):raise RuntimeError(f'Wrong sheet {char}: {im.size}')
    cells=[]
    for i,(name,h) in enumerate(zip(names,heights)):
        x=(i%2)*1024;y=(i//2)*1024;cell=im.crop((x,y,x+1024,y+1024));box=bounds(cell)
        if min(box[0],box[1],1024-box[2],1024-box[3])<8:raise RuntimeError(f'Clipped {char}-{name}')
        sprite=cell.crop(box);sid=f'{char}-{name}';sprite.save(P/f'{sid}.png');cells.append(sprite)
        ref=Image.new('RGBA',(sprite.width+48,sprite.height+48),'#ff00ff');ref.paste(raw.crop((x+box[0],y+box[1],x+box[2],y+box[3])),(24,24));ref.save(RAW/f'{sid}-reference.png')
        poses[sid]={'file':f'episodes/{SLUG}/art/{sid}.png',**metadata(sprite,h),'sourceCrop':list(box)}
    review(cells,RAW/f'{char}-review.jpg')
    ledger.append({'source':str(f.relative_to(ROOT)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'provider':'OpenAI Image API through bundled imagegen CLI','model':'gpt-image-2','quality':'high','prompt':f'episodes/{SLUG}/asset-prompts/{char}-four.txt','reportedCost':None})

pair=RAW/'handshake-pair-magenta.png'
if pair.exists():
    im=clean(Image.open(pair));im=im.crop(bounds(im));im.save(P/'handshake-pair.png');poses['handshake-pair']={'file':f'episodes/{SLUG}/art/handshake-pair.png',**metadata(im,2.55)}

animations={}
for name,height in [('handshake',2.55),('scarf-transfer',2.55),('rich-talk',2.55),('rich-reach',2.55),('miko-pancakes',1.78),('mum-question',2.35),('mum-point',2.35)]:
    f=RAW/name/f'{name}.gif'
    if not f.exists():continue
    gif=Image.open(f);frames=[clean(x.copy()) for x in ImageSequence.Iterator(gif)];boxes=[]
    for i,im in enumerate(frames):
        bb=im.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
        if not bb or min(bb[0],bb[1],im.width-bb[2],im.height-bb[3])<3:raise RuntimeError(f'Clipped {name} frame {i}')
        boxes.append(dict(left=bb[0],top=bb[1],right=bb[2]-1,bottom=bb[3]-1))
    w,h=frames[0].size;cols=4;atlas=Image.new('RGBA',(w*cols,h*((len(frames)+cols-1)//cols)))
    for i,im in enumerate(frames):atlas.paste(im,((i%cols)*w,(i//cols)*h))
    crop=dict(x=max(0,min(x['left'] for x in boxes)-4),y=max(0,min(x['top'] for x in boxes)-4))
    crop.update(width=min(w,max(x['right'] for x in boxes)+5)-crop['x'],height=min(h,max(x['bottom'] for x in boxes)+5)-crop['y'])
    meta=dict(width=atlas.width,height=atlas.height,cellWidth=w,cellHeight=h,columns=cols,frameCount=len(frames),frameDurationMs=gif.info.get('duration',100),crop=crop,cells=boxes,nativeAnimation=True)
    atlas.save(P/f'{name}-atlas.png');(P/f'{name}-atlas.json').write_text(json.dumps(meta,indent=2)+'\n');review(frames,RAW/f'{name}-review.jpg')
    animations[name]={'file':f'episodes/{SLUG}/art/{name}-atlas.png','metadata':meta,'worldHeight':height,'sourceGif':str(f.relative_to(ROOT))}
(B/'assets/poses.json').write_text(json.dumps(poses,indent=2)+'\n');(B/'assets/animations.json').write_text(json.dumps(animations,indent=2)+'\n');(B/'assets/image-ledger.json').write_text(json.dumps(ledger,indent=2)+'\n')
print(json.dumps({'poses':len(poses),'animations':list(animations)}))
