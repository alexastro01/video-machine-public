"""Prepare consistent full-silhouette cast and deterministic GIF atlases."""
from pathlib import Path
import argparse, importlib.util, json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
B = ROOT / 'episodes/immortal'
OUT = ROOT / 'output/imagegen/immortal-sample-v1'
PUB = ROOT / 'public/episodes/immortal/art'
PUB.mkdir(parents=True, exist_ok=True)
module = importlib.util.spec_from_file_location('chroma', Path.home()/'.codex/skills/.system/imagegen/scripts/remove_chroma_key.py')
chroma = importlib.util.module_from_spec(module)
module.loader.exec_module(chroma)

def clean(source):
    source = source.convert('RGBA')
    rgb=np.asarray(source)[:,:,:3].astype(float)
    key_fraction=np.mean((rgb[:,:,0]>210)&(rgb[:,:,1]<55)&(rgb[:,:,2]>195))
    if source.getchannel('A').getextrema()[0] < 10 and key_fraction < .02:
        return source.copy()
    image = source.copy()
    chroma._apply_alpha_to_image(image, key=(255,0,255), tolerance=55, spill_cleanup=True, soft_matte=True, transparent_threshold=28, opaque_threshold=150)
    difference = ImageChops.difference(source.convert('RGB'), Image.new('RGB', source.size, (255,0,255)))
    r,g,b = difference.split()
    distance = ImageChops.lighter(ImageChops.lighter(r,g),b)
    interior = distance.point(lambda v:255 if v>110 else 0).filter(ImageFilter.MinFilter(5))
    image.paste(source,(0,0),interior)
    return image

def bounds(image, threshold=110, actors=1):
    alpha = np.asarray(image.getchannel('A')) > threshold
    labels,_ = ndimage.label(alpha, np.ones((3,3)))
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    candidates=np.flatnonzero(sizes > 0)
    primaries=[int(v) for v in candidates[np.argsort(sizes[candidates])[-actors:]]]
    main_y,main_x=np.where(np.isin(labels,primaries))
    x0,x1,y0,y1=main_x.min(),main_x.max(),main_y.min(),main_y.max()
    allowed=primaries.copy()
    for label in np.flatnonzero(sizes>28):
        if label in primaries: continue
        yy,xx=np.where(labels==label)
        if xx.min()>=x0-28 and xx.max()<=x1+28 and yy.min()>=y0-28 and yy.max()<=y1+28:
            allowed.append(int(label))
    keep = np.isin(labels, allowed)
    ys,xs = np.where(keep)
    if not len(xs): raise RuntimeError('Empty character image')
    return (max(0,int(xs.min())-4),max(0,int(ys.min())-4),min(image.width,int(xs.max())+5),min(image.height,int(ys.max())+5))

SHEETS = {
    'norbert-modern': ('norbert-modern-four.png',['neutral','talk','catch','explain'],2.8),
    'norbert-476': ('norbert-476-four.png',['neutral','harvest','run','seated'],2.8),
    'marcus': ('marcus-young-four.png',['neutral','basket','question','laugh'],2.8),
    'officer': ('witch-officer-uniform.png',['neutral','talk','screen','reveal'],2.9),
    'wolf': ('wolf-four.png',['stand','sniff','run-a','run-b'],1.25),
    'support': ('late-antique-support-four.png',['messenger','messenger-run','farmer','farmer-adjust'],2.85),
    'witch': (str(ROOT/'public/pixel/cast/witch-four-v1.png'),['neutral','cast','present','eye-roll'],3.15),
}
poses = {}
for name,(filename,labels,height) in SHEETS.items():
    source = Path(filename) if Path(filename).is_absolute() else OUT/filename
    if not source.exists(): continue
    raw = Image.open(source).convert('RGBA'); image = clean(raw)
    cw,ch = raw.width//2,raw.height//2
    regions=[(max(0,(i%2)*cw-96),max(0,(i//2)*ch-96),min(raw.width,(i%2+1)*cw+96),min(raw.height,(i//2+1)*ch+96)) for i in range(4)]
    cells = [image.crop(region) for region in regions]
    boxes = [bounds(cell) for cell in cells]
    reference_height = boxes[0][3]-boxes[0][1]
    for i,(label,cell,box) in enumerate(zip(labels,cells,boxes)):
        if min(box[0],box[1],cell.width-box[2],cell.height-box[3]) < 10:
            raise RuntimeError(f'Clipped source silhouette: {name}/{label}: {box}')
        sprite = cell.crop(box)
        file = PUB/f'{name}-{label}.png'; sprite.save(file)
        rx,ry=regions[i][:2]
        original_box = (rx+box[0],ry+box[1],rx+box[2],ry+box[3])
        raw.crop(original_box).save(OUT/f'{name}-{label}-reference.png')
        feet = sprite.getchannel('A').crop((0,round(sprite.height*.86),sprite.width,sprite.height)).getbbox()
        pivot = (feet[0]+feet[2])/2 if feet else sprite.width/2
        poses[f'{name}-{label}'] = {'id':f'{name}-{label}','file':str(file.relative_to(ROOT/'public')),'width':sprite.width,'height':sprite.height,'pivotX':pivot,'footY':sprite.height-4,'worldHeight':height*sprite.height/reference_height,'source':str(source.relative_to(ROOT)),'sourceCell':i,'rawBox':box}
(B/'assets/poses-v1.json').write_text(json.dumps(poses,indent=2)+'\n')

animations = {}
requests = B/'assets/gif-requests.json'
for request in json.loads(requests.read_text()) if requests.exists() else []:
    file = ROOT/request['output']
    if not file.exists(): continue
    cached_meta=PUB/f'{request["id"]}-atlas.json'
    cached_atlas=PUB/f'{request["id"]}-atlas.png'
    if cached_meta.exists() and cached_atlas.exists() and cached_meta.stat().st_mtime>max(file.stat().st_mtime,Path(__file__).stat().st_mtime):
        meta=json.loads(cached_meta.read_text())
        animations[request['id']]={'file':str(cached_atlas.relative_to(ROOT/'public')),'metadata':str(cached_meta.relative_to(ROOT/'public')),'worldHeight':meta['worldHeight']}
        continue
    gif = Image.open(file)
    background = request.get('background',False)
    frames = [(f.copy().convert('RGBA') if background else clean(f.copy())) for f in ImageSequence.Iterator(gif)]
    fw,fh = frames[0].size
    boxes = [(0,0,fw,fh) if background else bounds(f,actors=2 if request['id']=='rock-handoff-pair' else 1) for f in frames]
    if not background:
        for i,box in enumerate(boxes):
            if min(box[0],box[1],fw-box[2],fh-box[3])<4: raise RuntimeError(f'Clipped GIF {request["id"]}, frame {i}')
    crop = {'x':min(b[0] for b in boxes),'y':min(b[1] for b in boxes)}
    crop.update({'width':max(b[2] for b in boxes)-crop['x'],'height':max(b[3] for b in boxes)-crop['y']})
    columns=4; rows=(len(frames)+3)//4
    atlas=Image.new('RGBA',(fw*columns,fh*rows))
    for i,f in enumerate(frames): atlas.paste(f,((i%columns)*fw,(i//columns)*fh))
    atlas_file=PUB/f'{request["id"]}-atlas.png';atlas.save(atlas_file)
    reference=poses.get(request.get('pose'))
    target_height=reference['worldHeight'] if reference else request.get('worldHeight',2.8)
    world_height=target_height*crop['height']/(boxes[0][3]-boxes[0][1])
    meta={'id':request['id'],'width':atlas.width,'height':atlas.height,'cellWidth':fw,'cellHeight':fh,'columns':columns,'rows':rows,'frameCount':len(frames),'frameDurationMs':gif.info.get('duration',100),'crop':crop,'cells':[{'left':b[0],'top':b[1],'right':b[2]-1,'bottom':b[3]-1} for b in boxes],'background':background,'worldHeight':world_height,'nativeAnimation':True,'source':str(file.relative_to(ROOT)),'playback':request.get('playback','finite action then hold')}
    meta_file=PUB/f'{request["id"]}-atlas.json';meta_file.write_text(json.dumps(meta,indent=2)+'\n')
    animations[request['id']]={'file':str(atlas_file.relative_to(ROOT/'public')),'metadata':str(meta_file.relative_to(ROOT/'public')),'worldHeight':world_height}
    review=Image.new('RGB',(6*220,((len(frames)+5)//6)*240),'#263641');draw=ImageDraw.Draw(review)
    for i,f in enumerate(frames):
        sm=f.copy();sm.thumbnail((210,210),Image.Resampling.NEAREST);x=(i%6)*220;y=(i//6)*240
        review.paste(sm,(x,y),sm);draw.text((x+5,y+216),str(i),fill='white')
    review.save(OUT/f'{request["id"]}-review.jpg',quality=95)
(B/'assets/animations-v1.json').write_text(json.dumps(animations,indent=2)+'\n')
review=Image.new('RGB',(4*340,((len(poses)+3)//4)*350),'#25333b');draw=ImageDraw.Draw(review)
for i,(name,pose) in enumerate(poses.items()):
    image=Image.open(ROOT/'public'/pose['file']);image.thumbnail((320,305),Image.Resampling.NEAREST);x=(i%4)*340+(340-image.width)//2;y=(i//4)*350
    review.paste(image,(x,y),image);draw.text(((i%4)*340+10,y+315),name,fill='white')
review.save(OUT/'cast-review.jpg',quality=95)
print(json.dumps({'poses':len(poses),'animations':list(animations)}))
