"""Reuse the established swap cast and prepare the sequel's four reaction poses."""
from pathlib import Path
import hashlib,importlib.util,json,shutil
import numpy as np
from PIL import Image,ImageChops,ImageFilter,ImageDraw
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1];B=ROOT/'episodes/billionaire-body-swap-2';P=ROOT/'public/episodes/billionaire-body-swap-2/art'
P.mkdir(parents=True,exist_ok=True)
poses={};animations={};ledger=[]
for filename,target in [('poses',poses),('animations',animations)]:
    old=json.loads((ROOT/f'episodes/billionaire-body-swap/assets/{filename}.json').read_text())
    for key,value in old.items():
        src=ROOT/'public'/value['file'];dst=P/src.name;shutil.copy2(src,dst)
        target[key]={**value,'file':str(dst.relative_to(ROOT/'public'))}
        ledger.append({'id':key,'file':str(dst.relative_to(ROOT)),'copiedFrom':str(src.relative_to(ROOT)),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest()})

module=importlib.util.spec_from_file_location('chroma',Path.home()/'.codex/skills/.system/imagegen/scripts/remove_chroma_key.py')
chroma=importlib.util.module_from_spec(module);module.loader.exec_module(chroma)
raw_path=ROOT/'output/imagegen/billionaire-swap-2/young-reactions.png'
raw=Image.open(raw_path).convert('RGBA');assert raw.size==(2048,2048),raw.size
clean=raw.copy();chroma._apply_alpha_to_image(clean,key=(255,0,255),tolerance=55,spill_cleanup=True,soft_matte=True,transparent_threshold=28,opaque_threshold=150)
diff=ImageChops.difference(raw.convert('RGB'),Image.new('RGB',raw.size,(255,0,255)))
a,b,c=diff.split();inside=ImageChops.lighter(ImageChops.lighter(a,b),c).point(lambda x:255 if x>100 else 0).filter(ImageFilter.MinFilter(5));clean.paste(raw,(0,0),inside)
preview=Image.new('RGB',(4*230,390),'#e9edf0');draw=ImageDraw.Draw(preview)
for i,key in enumerate(['young-worried','young-object','young-offer','young-defeated']):
    x=i%2*1024;y=i//2*1024;cell=clean.crop((x,y,x+1024,y+1024));alpha=np.array(cell.getchannel('A'))
    labels,_=ndimage.label(alpha>110,np.ones((3,3)));sizes=np.bincount(labels.ravel());sizes[0]=0
    yy,xx=np.where(np.isin(labels,np.flatnonzero(sizes>25)))
    box=(max(0,int(xx.min())-5),max(0,int(yy.min())-5),min(1024,int(xx.max())+6),min(1024,int(yy.max())+6))
    assert min(box[0],box[1],1024-box[2],1024-box[3])>8,(key,box)
    sprite=cell.crop(box);file=P/f'{key}.png';sprite.save(file)
    foot=sprite.getchannel('A').crop((0,round(sprite.height*.85),sprite.width,sprite.height)).getbbox()
    poses[key]={'file':str(file.relative_to(ROOT/'public')),'width':sprite.width,'height':sprite.height,'pivotX':(foot[0]+foot[2])/2,'footY':sprite.height-5,'worldHeight':2.48,'sourceCrop':list(box)}
    small=sprite.copy();small.thumbnail((220,345),Image.Resampling.NEAREST);preview.paste(small,(i*230+(230-small.width)//2,10),small);draw.text((i*230+5,365),key,fill='#15252e')
preview.save(ROOT/'output/imagegen/billionaire-swap-2/poses-review.jpg',quality=95)
ledger.append({'id':'young-reactions','source':str(raw_path.relative_to(ROOT)),'sourceSha256':hashlib.sha256(raw_path.read_bytes()).hexdigest(),'reference':'public/episodes/billionaire-body-swap/art/miko-bare.png','prompt':'episodes/billionaire-body-swap-2/asset-prompts/young-reactions.txt','provider':'OpenAI API through the bundled imagegen CLI','model':'gpt-image-2','quality':'high','size':[2048,2048],'images':1,'poses':4,'reportedCost':None})
for name,value in [('poses',poses),('animations',animations),('image-ledger',ledger)]:
    (B/f'assets/{name}.json').write_text(json.dumps(value,indent=2)+'\n')
print(json.dumps({'poses':len(poses),'animations':len(animations),'newPoseNames':['young-worried','young-object','young-offer','young-defeated']}))
