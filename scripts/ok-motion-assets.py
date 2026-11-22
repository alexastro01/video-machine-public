"""Key the new four-pose sender sheet and retain measured reusable silhouettes."""
from pathlib import Path
import json,importlib.util,hashlib
import numpy as np
from scipy import ndimage
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];B=ROOT/'episodes/ok-message-motion';P=ROOT/'public/episodes/ok-message-motion'
src=ROOT/'output/imagegen/ok-message-motion-v1/mia-sandwich-four.png'
spec=importlib.util.spec_from_file_location('chroma',Path.home()/'.codex/skills/.system/imagegen/scripts/remove_chroma_key.py');helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
im=Image.open(src).convert('RGBA');raw=np.asarray(im).copy()
background=(raw[:,:,0]>170)&(raw[:,:,2]>170)&(raw[:,:,1]<90)&(raw[:,:,0].astype(float)-raw[:,:,1]>85)&(raw[:,:,2].astype(float)-raw[:,:,1]>85)
helper._apply_alpha_to_image(im,key=(255,0,255),tolerance=55,spill_cleanup=True,soft_matte=True,transparent_threshold=28,opaque_threshold=150)
keyed=np.asarray(im).copy();keyed[:,:,3][background]=0;im=Image.fromarray(keyed)
poses={};preview=Image.new('RGB',(1200,720),'#f5f5f7')
for i,name in enumerate(['smile','bite','typing-unused','catch']):
    cell=im.crop((i%2*1024,i//2*1024,(i%2+1)*1024,(i//2+1)*1024))
    data=np.asarray(cell).copy();labels,_=ndimage.label(data[:,:,3]>128,np.ones((3,3)));counts=np.bincount(labels.ravel());counts[0]=0;keep=labels==int(counts.argmax());ys,xs=np.where(keep)
    box=(int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1) if len(xs) else None
    # Drop isolated key residue, retaining all sizeable opaque sprite components.
    expanded=ndimage.binary_dilation(keep,iterations=2);data[:,:,3][~expanded]=0;cell=Image.fromarray(data)
    if not box or min(box[0],box[1],1024-box[2],1024-box[3])<5:raise RuntimeError(f'Clipped Mia pose {i}: {box}')
    box=(box[0]-4,box[1]-4,box[2]+4,box[3]+4);sprite=cell.crop(box);sprite.save(P/f'mia-{name}.png')
    a=np.asarray(sprite);feet=a[:,:,3]>128;bottom=sprite.height-4
    poses[name]={'file':f'episodes/ok-message-motion/mia-{name}.png','width':sprite.width,'height':sprite.height,'pivotX':sprite.width/2,'footY':bottom,'sourceCell':i,'approvedForUse':name!='typing-unused'}
    if name!='typing-unused':
        sm=sprite.copy();sm.thumbnail((370,650),Image.Resampling.NEAREST);j=['smile','bite','catch'].index(name);preview.paste(sm,(j*400+(400-sm.width)//2,50),sm)
(B/'assets/mia.json').write_text(json.dumps(poses,indent=2)+'\n');preview.save(P/'mia-review.jpg')
(B/'assets/image-ledger.json').write_text(json.dumps([{'provider':'OpenAI Image API through bundled imagegen CLI','requestedModel':'gpt-image-2','quality':'high','sourceFile':str(src.relative_to(ROOT)),'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'reference':'public/pixel/cast/bus-girl-idle-v1.png','prompt':'episodes/ok-message-motion/mia-prompt.txt','reportedCost':None,'use':'smile, bite and catch poses only; typing pose excluded after hand review'}],indent=2)+'\n')
print('Prepared three usable sender poses; excluded the typing pose after hand review.')
