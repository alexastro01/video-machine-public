"""Prepare the native seated reaction; remove disconnected matte residue only."""
from pathlib import Path
import json, shutil, hashlib
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'output/imagegen/start-the-task/v3-seated-reaction'
public=ROOT/'public/episodes/start-the-task/art'
base=ROOT/'episodes/start-the-task/assets'
meta=json.loads((source/'miko-reaction-v3-atlas.json').read_text())
atlas=Image.new('RGBA',(meta['width'],meta['height']));cells=[];removed=0
for i in range(meta['frameCount']):
    image=Image.open(source/'frames'/f'frame-{i+1:02d}.png').convert('RGBA')
    a=np.array(image);labels,count=ndimage.label(a[:,:,3]>=166,np.ones((3,3)))
    areas=np.bincount(labels.ravel());areas[0]=0;main=labels==areas.argmax()
    keep=ndimage.binary_dilation(main,iterations=2)
    removed+=int(np.count_nonzero((a[:,:,3]>0)&~keep));a[:,:,3][~keep]=0
    image=Image.fromarray(a);x=(i%meta['columns'])*meta['cellWidth'];y=(i//meta['columns'])*meta['cellHeight']
    atlas.paste(image,(x,y));ys,xs=np.nonzero(a[:,:,3]>=166)
    cells.append({**meta['cells'][i],'left':int(xs.min()),'right':int(xs.max()),'top':int(ys.min()),'bottom':int(ys.max())})
    preview=Image.new('RGBA',image.size,'#f8f8fa');preview.alpha_composite(image)
    if i in [0,7,15]:preview.convert('RGB').save(source/f'clean-preview-{i}.jpg')
meta['cells']=cells;meta['processing']+=' Disconnected matte residue removed; subject RGB and native source timing retained.'
meta['matteResiduePixelsRemoved']=removed
file=public/'miko-reaction-v3-atlas.png';atlas.save(file)
(public/'miko-reaction-v3-atlas.json').write_text(json.dumps(meta,indent=2)+'\n')
record={'file':str(file.relative_to(ROOT/'public')),'metadata':meta,'nativeAnimation':True,'source':str((source/'miko-reaction-v3.gif').relative_to(ROOT)),'sourceSha256':hashlib.sha256((source/'miko-reaction-v3.gif').read_bytes()).hexdigest(),'generationProvenance':str((source/'miko-reaction-v3.provenance.json').relative_to(ROOT))}
(base/'miko-reaction-v3.json').write_text(json.dumps(record,indent=2)+'\n')
typing=json.loads((base/'miko-actions.json').read_text())['typing'];crops=[meta['crop'],typing['metadata']['crop']]
x=min(c['x'] for c in crops);y=min(c['y'] for c in crops);right=max(c['x']+c['width'] for c in crops);bottom=max(c['y']+c['height'] for c in crops)
(base/'miko-v3-layout.json').write_text(json.dumps({'cellWidth':512,'cellHeight':512,'horizontalPivot':256,'commonCrop':{'x':x,'y':y,'width':right-x,'height':bottom-y},'reaction':record,'typing':typing},indent=2)+'\n')
print(json.dumps({'nativeFrames':meta['frameCount'],'clippedFrames':meta['clipping'],'matteResiduePixelsRemoved':removed}))
