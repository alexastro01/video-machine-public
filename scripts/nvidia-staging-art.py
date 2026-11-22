"""Register the v3 acting keys at a common foot pivot without cutting limbs at row boundaries."""
from pathlib import Path
import hashlib
import json
import zipfile
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT / 'episodes/nvidia-four-trillion'
PUB = ROOT / 'public/episodes/nvidia-four-trillion/art'
keys = {
    'jensen': [('diner-pencil', 379), ('diner-cup', 396), ('modern-inspect', 446), ('modern-present', 449)],
    'miko': [('inspect', 376), ('trace', 414), ('follow', 430), ('look-left', 415)],
}
entries = {}
for actor, poses in keys.items():
    src = ROOT / f'output/imagegen/nvidia-four-trillion/{actor}-staging-v3.png'
    image = np.array(Image.open(src).convert('RGB'))
    r,g,b = np.moveaxis(image.astype(np.int16), 2, 0)
    keep = ~((r-g>24) & (b-g>24) & (np.minimum(r,b)>46))
    split = min(range(418, 510), key=lambda y: int(keep[y].sum()))
    records = {}
    for i,(name,height) in enumerate(poses):
        left=(i%2)*512
        y0,y1=(0,split) if i<2 else (split,1024)
        valid=keep[y0:y1,left:left+512]
        yy,xx=np.where(valid)
        box=[int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1]
        rgba=Image.fromarray(np.dstack([image[y0:y1,left:left+512], valid.astype(np.uint8)*255]))
        crop=rgba.crop(tuple(box)); ratio=height/crop.height
        crop=crop.resize((round(crop.width*ratio),height),Image.Resampling.LANCZOS)
        ix,iy=(512-crop.width)//2,468-crop.height
        cell=Image.new('RGBA',(512,512)); cell.alpha_composite(crop,(ix,iy))
        alpha=np.array(cell)[:,:,3]; sy,sx=np.where(alpha>178)
        shoe_x=np.where((alpha>178)&(np.arange(512)[:,None]>iy+.89*height))[1]
        path=PUB/f'{actor}-{name}-v3.png';cell.save(path)
        meta={'file':str(path.relative_to(ROOT/'public')),'width':512,'height':512,
              'footY':int(sy.max()),'anchorX':float((shoe_x.min()+shoe_x.max())/2),
              'bounds':[int(sx.min()),int(sy.min()),int(sx.max()),int(sy.max())]}
        # The lap notebook meets the pencil at this measured point on the generated drawing.
        if name=='diner-pencil':meta['pencilTip']=[round(ix+(290-left-box[0])*ratio,2),round(iy+(283-y0-box[1])*ratio,2)]
        if actor=='miko' and name=='inspect':
            meta['palm']=[round(ix+(337-left-box[0])*ratio,2),round(iy+(229-y0-box[1])*ratio,2)]
        records[name]=meta
    entries[actor]={'source':str(src.relative_to(ROOT)),'sourceSHA256':hashlib.sha256(src.read_bytes()).hexdigest(),
                    'provider':'OpenAI Image API','model':'gpt-image-2',
                    'prompt':f'episodes/nvidia-four-trillion/asset-prompts/{actor}-staging-v3.txt',
                    'reference':f'output/imagegen/nvidia-four-trillion/{actor}-cartoon-sheet-v1.png',
                    'rowSplit':split,'poses':records}
# Register the seated cofounders to the height of the diner booth cushion.
source=ROOT/'output/imagegen/nvidia-four-trillion/diner-founders-v3.png'
image=np.array(Image.open(source).convert('RGB'))
r,g,b=np.moveaxis(image.astype(np.int16),2,0)
alpha=~((r-g>24) & (b-g>24) & (np.minimum(r,b)>46))
guests={}
for name,left,seat_x,seat_y in [('left',0,135,603),('right',512,895,603)]:
    mask=alpha[:,left:left+512]
    yy,xx=np.where(mask)
    bounds=[int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)]
    crop=Image.fromarray(np.dstack((image[:,left:left+512],mask.astype(np.uint8)*255))).crop(tuple(bounds))
    ratio=(.74-.014)*168/(yy.max()-seat_y)
    crop=crop.resize((round(crop.width*ratio),round(crop.height*ratio)),Image.Resampling.LANCZOS)
    ix,iy=(512-crop.width)//2,468-crop.height
    cell=Image.new('RGBA',(512,512));cell.alpha_composite(crop,(ix,iy));out=PUB/f'founder-{name}-v3.png';cell.save(out)
    sy,sx=np.where(np.asarray(cell)[:,:,3]>178)
    guests[name]={'file':str(out.relative_to(ROOT/'public')),'width':512,'height':512,'footY':int(sy.max()),
        'anchorX':round(ix+(seat_x-left-bounds[0])*ratio,2),'seatY':round(iy+(seat_y-bounds[1])*ratio,2),
        'bounds':[int(sx.min()),int(sy.min()),int(sx.max()),int(sy.max())]}
entries['founders']={'source':str(source.relative_to(ROOT)),'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),
    'provider':'OpenAI Image API','model':'gpt-image-2','poses':guests,
    'prompt':'episodes/nvidia-four-trillion/asset-prompts/diner-founders-v3.txt',
    'reference':'output/imagegen/nvidia-four-trillion/jensen-staging-v3.png'}
(EP/'assets/staging-v3.json').write_text(json.dumps(entries,indent=2)+'\n')

archive=ROOT/'renders/nvidia-four-trillion/nvidia-cast-v3.zip'
archive.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as bundle:
    index={}
    for actor in ['jensen','miko','founders']:
        initial=json.loads((EP/'assets'/f'{actor}.json').read_text())['poses'] if actor!='founders' else {}
        index[actor]={}
        for pose,meta in {**initial,**entries[actor]['poses']}.items():
            name=f'{actor}/{pose}.png'
            bundle.write(ROOT/'public'/meta['file'],name)
            index[actor][pose]={**meta,'file':name}
    bundle.writestr('poses.json',json.dumps(index,indent=2)+'\n')
