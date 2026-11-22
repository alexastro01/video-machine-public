"""Measure the transparent Miko poses and the corrected two-arm Mia sheet."""
from pathlib import Path
import json, hashlib, shutil
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1]
B=ROOT/'episodes/lonely-around-people';P=ROOT/'public/episodes/lonely-around-people'
source=ROOT/'output/imagegen/lonely-around-people-v1/miko-four.png'
im=Image.open(source).convert('RGBA');w,h=im.size
poses={};preview=Image.new('RGB',(1400,850),'#f8f8fa')
for i,name in enumerate(['polite','sad','honest','relieved']):
    x=i%2*(w//2);y=i//2*(h//2)
    a=np.asarray(im.crop((x,y,x+w//2,y+h//2))).copy()
    labels,_=ndimage.label(a[:,:,3]>220,np.ones((3,3)))
    counts=np.bincount(labels.ravel());counts[0]=0;keep=labels==counts.argmax()
    ys,xs=np.where(keep);box=[int(xs.min())-4,int(ys.min())-4,int(xs.max())+5,int(ys.max())+5]
    assert box[0]>=0 and box[1]>=0 and box[2]<=w//2 and box[3]<=h//2
    a[:,:,3]=np.where(keep,255,0)
    sprite=Image.fromarray(a).crop(box);arr=np.asarray(sprite)
    feet=arr[:,:,3]>0;feet[:round(sprite.height*.87)]=False;fy,fx=np.where(feet)
    file=P/'art'/f'miko-{name}.png';file.parent.mkdir(parents=True,exist_ok=True);sprite.save(file)
    poses[name]={'file':str(file.relative_to(ROOT/'public')),'width':sprite.width,'height':sprite.height,'pivotX':round(float(fx.mean()),3),'footY':int(fy.max())+1,'sourceCell':i,'crop':box}
    small=sprite.copy();small.thumbnail((330,790),Image.Resampling.NEAREST);preview.paste(small,(i*350+(350-small.width)//2,25),small)
    if name=='sad':
        head=sprite.crop((0,0,sprite.width,round(sprite.height*.39)))
        head.save(P/'art/miko-head.png')
(B/'assets').mkdir(exist_ok=True);(B/'assets/miko.json').write_text(json.dumps(poses,indent=2)+'\n')
preview.save(P/'art/miko-review.jpg',quality=94)
mia_source=ROOT/'output/imagegen/lonely-around-people-v3/mia-two-poses.png'
mia=Image.open(mia_source).convert('RGBA');mw,mh=mia.size;selected={}
for i,name in enumerate(['smile','bite']):
    cell=np.asarray(mia.crop((i*(mw//2),0,(i+1)*(mw//2),mh))).copy()
    labels,_=ndimage.label(cell[:,:,3]>220,np.ones((3,3)))
    counts=np.bincount(labels.ravel());counts[0]=0;keep=labels==counts.argmax()
    ys,xs=np.where(keep);box=[int(xs.min())-4,int(ys.min())-4,int(xs.max())+5,int(ys.max())+5]
    assert min(box[:2])>=0 and box[2]<=mw//2 and box[3]<=mh
    cell[:,:,3]=np.where(keep,255,0);sprite=Image.fromarray(cell).crop(box)
    feet=np.asarray(sprite)[:,:,3]>0;feet[:round(sprite.height*.86)]=False;fy,fx=np.where(feet)
    target=P/'art'/f'mia-{name}.png';sprite.save(target)
    selected[name]={'file':str(target.relative_to(ROOT/'public')),'width':sprite.width,'height':sprite.height,'pivotX':round(float(fx.mean()),3),'footY':int(fy.max())+1,'sourceCell':i,'crop':box,'sourceFile':str(mia_source.relative_to(ROOT))}
(B/'assets/mia.json').write_text(json.dumps(selected,indent=2)+'\n')
head=Image.open(P/'art/mia-smile.png');head.crop((round(head.width*.15),0,round(head.width*.86),round(head.height*.4))).save(P/'art/mia-head.png')
ledger={'provider':'OpenAI built-in image_gen','mode':'reference-guided generation','sourceFile':str(source.relative_to(ROOT)),'sourceSize':[w,h],'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'reference':'public/episodes/paid-for-lying/art/miko-proud.png','promptFile':'episodes/lonely-around-people/art-prompt.txt','processing':'Preserved RGB, thresholded native alpha and kept the main connected silhouette. No colour replacement.','reusedMia':'episodes/ok-message-motion/assets/mia.json','reportedCost':None}
ledger.pop('reusedMia');ledger['mia']={'provider':'OpenAI built-in image_gen','mode':'reference-guided edit','sourceFile':str(mia_source.relative_to(ROOT)),'sourceSize':[mw,mh],'sha256':hashlib.sha256(mia_source.read_bytes()).hexdigest(),'reference':'public/episodes/lonely-around-people/art/mia-smile.png (v2)','promptFile':'episodes/lonely-around-people/mia-art-prompt-v3.txt','correction':'Two arms and two hands in each pose, no phone, one finite bite.','reportedCost':None}
(B/'assets/image-ledger.json').write_text(json.dumps(ledger,indent=2)+'\n')
print(json.dumps({k:{a:v[a] for a in ['width','height','pivotX','footY']} for k,v in poses.items()}))
