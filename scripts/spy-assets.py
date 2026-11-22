"""Prepare full-silhouette pixel cast and finite native GIF atlases for the spy skit."""
from pathlib import Path
import importlib.util,json
import numpy as np
from scipy import ndimage
from PIL import Image,ImageChops,ImageFilter,ImageDraw,ImageSequence
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/imagegen/girlfriend-spy-test-v1'
PUB=ROOT/'public/episodes/girlfriend-spy-test/art'
B=ROOT/'episodes/girlfriend-spy-test'
PUB.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('chroma',Path.home()/'.codex/skills/.system/imagegen/scripts/remove_chroma_key.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
def clean(source):
    source=source.convert('RGBA');image=source.copy()
    helper._apply_alpha_to_image(image,key=(255,0,255),tolerance=55,spill_cleanup=True,soft_matte=True,transparent_threshold=28,opaque_threshold=150)
    diff=ImageChops.difference(source.convert('RGB'),Image.new('RGB',source.size,(255,0,255)))
    r,g,b=diff.split();distance=ImageChops.lighter(ImageChops.lighter(r,g),b)
    mask=distance.point(lambda p:255 if p>100 else 0).filter(ImageFilter.MinFilter(5))
    image.paste(source,(0,0),mask)
    return image
names={'miko-clipboard':['talk','check','asset','complete'],'nerd':['leather','hoodie','relieved','surprised'],'girlfriend':['smile','gpu-love','bar','exit']}
poses={};review=Image.new('RGB',(1440,990),'#182a3e');draw=ImageDraw.Draw(review)
for row,(char,ids) in enumerate(names.items()):
    source=OUT/f'{char}-four-magenta.png'
    raw=Image.open(source).convert('RGBA');full=clean(raw)
    for i,name in enumerate(ids):
        origin=((i%2)*1024,(i//2)*1024)
        cell=full.crop((origin[0],origin[1],origin[0]+1024,origin[1]+1024))
        # Main figure plus any nearby pen/clipboard pixels. Discard isolated key noise.
        alpha=np.asarray(cell.getchannel('A'))>100
        labels,n=ndimage.label(alpha,np.ones((3,3)));sizes=np.bincount(labels.ravel());sizes[0]=0
        keep=np.isin(labels,np.flatnonzero(sizes>30));ys,xs=np.where(keep)
        box=(max(0,int(xs.min())-4),max(0,int(ys.min())-4),min(1024,int(xs.max())+5),min(1024,int(ys.max())+5))
        if min(box[0],box[1],1024-box[2],1024-box[3])<12:raise RuntimeError(f'Unsafe full silhouette margin: {char} {name} {box}')
        sprite=cell.crop(box);file=PUB/f'{char}-{name}-v1.png';sprite.save(file)
        raw.crop((origin[0]+box[0],origin[1]+box[1],origin[0]+box[2],origin[1]+box[3])).save(OUT/f'{char}-{name}-magenta.png')
        foot=sprite.getchannel('A').crop((0,round(sprite.height*.85),sprite.width,sprite.height)).getbbox()
        pivot=(foot[0]+foot[2])/2 if foot else sprite.width/2
        poses[f'{char}-{name}']={'file':str(file.relative_to(ROOT/'public')),'width':sprite.width,'height':sprite.height,'pivotX':pivot,'footY':sprite.height-4,'rawBox':box,'source':str(source.relative_to(ROOT))}
        small=sprite.copy();small.thumbnail((310,280),Image.Resampling.NEAREST)
        x=i*360+(360-small.width)//2;y=row*330+30
        review.paste(small,(x,y),small);draw.text((i*360+15,row*330+310),f'{char}: {name}',fill='#e6d5b5')
review.save(OUT/'cast-review.jpg',quality=95)
point=OUT/'miko-point-magenta.png'
if point.exists():
    image=clean(Image.open(point));box=image.getchannel('A').point(lambda a:255 if a>120 else 0).getbbox()
    if not box or min(box[0],box[1],image.width-box[2],image.height-box[3])<12:raise RuntimeError('Pointing pose touches image edge')
    sprite=image.crop((box[0]-4,box[1]-4,box[2]+4,box[3]+4));sprite.save(PUB/'miko-point-v1.png')
    feet=sprite.getchannel('A').crop((0,round(sprite.height*.85),sprite.width,sprite.height)).getbbox()
    poses['miko-point']={'file':'episodes/girlfriend-spy-test/art/miko-point-v1.png','width':sprite.width,'height':sprite.height,'pivotX':(feet[0]+feet[2])/2,'footY':sprite.height-4,'source':str(point.relative_to(ROOT))}
animations={}
for name in ['miko-talk','miko-lower','miko-complete','nerd-talk','nerd-type','girlfriend-love','girlfriend-exit']:
    folder='miko-complete-v2' if name=='miko-complete' and (OUT/'miko-complete-v2/miko-complete.gif').exists() else name
    file=OUT/folder/f'{name}.gif'
    revision_source=ROOT/'output/imagegen/girlfriend-spy-test-v2'/name/f'{name}.gif'
    if revision_source.exists():file=revision_source
    if not file.exists():continue
    existing=PUB/f'{name}-atlas.json'
    if existing.exists() and (PUB/f'{name}-atlas.png').exists() and file.stat().st_mtime < existing.stat().st_mtime:
        animations[name]={'atlas':f'episodes/girlfriend-spy-test/art/{name}-atlas.png','metadata':f'episodes/girlfriend-spy-test/art/{name}-atlas.json'}
        continue
    gif=Image.open(file);frames=[clean(f.copy().convert('RGBA')) for f in ImageSequence.Iterator(gif)]
    boxes=[]
    for i,f in enumerate(frames):
        box=f.getchannel('A').point(lambda a:255 if a>120 else 0).getbbox()
        if not box or min(box[0],box[1],f.width-box[2],f.height-box[3])<5:raise RuntimeError(f'{name}: clipped frame {i}')
        boxes.append({'left':box[0],'top':box[1],'right':box[2]-1,'bottom':box[3]-1})
    fw,fh=frames[0].size;cols=4;rows=(len(frames)+3)//4
    atlas=Image.new('RGBA',(fw*cols,fh*rows))
    for i,f in enumerate(frames):atlas.paste(f,((i%cols)*fw,(i//cols)*fh))
    crop={'x':max(0,min(b['left'] for b in boxes)-4),'y':max(0,min(b['top'] for b in boxes)-4)}
    crop['width']=min(fw,max(b['right'] for b in boxes)+5)-crop['x'];crop['height']=min(fh,max(b['bottom'] for b in boxes)+5)-crop['y']
    atlas.save(PUB/f'{name}-atlas.png')
    meta={'width':atlas.width,'height':atlas.height,'cellWidth':fw,'cellHeight':fh,'columns':cols,'rows':rows,'frameCount':len(frames),'frameDurationMs':gif.info.get('duration',100),'crop':crop,'cells':boxes,'nativeAnimation':True,'playback':'finite action, then hold; speech-mouth cues follow selected take'}
    (PUB/f'{name}-atlas.json').write_text(json.dumps(meta,indent=2)+'\n')
    animations[name]={'atlas':f'episodes/girlfriend-spy-test/art/{name}-atlas.png','metadata':f'episodes/girlfriend-spy-test/art/{name}-atlas.json'}
    sheet=Image.new('RGB',(6*190,((len(frames)+5)//6)*215),'#24343c')
    dr=ImageDraw.Draw(sheet)
    for i,f in enumerate(frames):
        sm=f.copy();sm.thumbnail((180,190),Image.Resampling.NEAREST);x=(i%6)*190;y=(i//6)*215
        sheet.paste(sm,(x,y),sm);dr.text((x+5,y+195),str(i),fill='white')
    sheet.save(OUT/f'{name}-review.jpg',quality=94)
(B/'assets/poses-v1.json').write_text(json.dumps(poses,indent=2)+'\n')
(B/'assets/animations-v1.json').write_text(json.dumps(animations,indent=2)+'\n')
print(json.dumps({'poses':len(poses),'animations':list(animations)},indent=2))
