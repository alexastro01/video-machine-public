"""Prepare four-pose cast sheets with protected interior colour and no chroma fringe."""
from pathlib import Path
import json,hashlib,importlib.util
import numpy as np
from scipy import ndimage
from PIL import Image,ImageChops,ImageFilter,ImageDraw
ROOT=Path(__file__).resolve().parents[1];B=ROOT/'episodes/billionaire-body-swap-3';P=ROOT/'public/episodes/billionaire-body-swap-3/art';P.mkdir(parents=True,exist_ok=True)
module=importlib.util.spec_from_file_location('chroma',Path.home()/'.codex/skills/.system/imagegen/scripts/remove_chroma_key.py');chroma=importlib.util.module_from_spec(module);module.loader.exec_module(chroma)
keys={'adult':['ask','call','wave','listen'],'young':['puzzled','ask','call','caught'],'teacher':['point','pencil','phone','stare'],'assistant':['contract','lawyer','take','listen']}
poses={};ledger=[];preview=Image.new('RGB',(4*240,4*390),'#edf0f2');draw=ImageDraw.Draw(preview)
for row,job in enumerate(json.loads((B/'assets/image-jobs.json').read_text())):
    source=ROOT/job['output'];raw=Image.open(source).convert('RGBA');assert raw.size==(2048,2048),raw.size
    clean=raw.copy();chroma._apply_alpha_to_image(clean,key=(255,0,255),tolerance=55,spill_cleanup=True,soft_matte=True,transparent_threshold=28,opaque_threshold=150)
    channels=ImageChops.difference(raw.convert('RGB'),Image.new('RGB',raw.size,(255,0,255))).split();difference=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2]);inside=difference.point(lambda v:255 if v>100 else 0).filter(ImageFilter.MinFilter(5));clean.paste(raw,(0,0),inside)
    for i,key in enumerate(keys[job['id']]):
        cell=clean.crop(((i%2)*1024,(i//2)*1024,(i%2+1)*1024,(i//2+1)*1024));rgba=np.array(cell);labels,n=ndimage.label(rgba[:,:,3]>150,np.ones((3,3)));sizes=np.bincount(labels.ravel());sizes[0]=0;subject=labels==int(sizes.argmax());keep=ndimage.binary_dilation(subject,iterations=3);rgba[:,:,3]*=keep
        yy,xx=np.where(rgba[:,:,3]>60);box=(max(0,int(xx.min())-5),max(0,int(yy.min())-5),min(1024,int(xx.max())+6),min(1024,int(yy.max())+6));assert min(int(xx.min()),int(yy.min()),1023-int(xx.max()),1023-int(yy.max()))>8,(job['id'],key,box)
        sprite=Image.fromarray(rgba).crop(box);id=job['id']+'-'+key;file=P/f'{id}.png';sprite.save(file)
        foot=sprite.getchannel('A').crop((0,round(sprite.height*.88),sprite.width,sprite.height)).getbbox()
        poses[id]={'file':str(file.relative_to(ROOT/'public')),'width':sprite.width,'height':sprite.height,'pivotX':(foot[0]+foot[2])/2,'footY':sprite.height-5,'worldHeight':1.86 if job['id']=='adult' else 1.78 if job['id']=='young' else 2.35,'sourceCell':i,'sourceCrop':list(box),'source':str(source.relative_to(ROOT))}
        small=sprite.copy();small.thumbnail((230,345),Image.Resampling.NEAREST);x=i*240+(240-small.width)//2;y=row*390+10;preview.paste(small,(x,y),small);draw.text((i*240+7,row*390+366),id,fill='#192b34')
    ledger.append({**job,'provider':'OpenAI API using the imagegen skill CLI','model':'gpt-image-2','quality':'high','size':[2048,2048],'images':1,'poses':4,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'reportedCost':None})
(B/'assets/poses.json').write_text(json.dumps(poses,indent=2)+'\n');(B/'assets/image-ledger.json').write_text(json.dumps(ledger,indent=2)+'\n');preview.save(ROOT/'output/imagegen/billionaire-swap-3/poses-review.jpg',quality=95);print(json.dumps({'poses':len(poses),'allFullBodiesHaveMargins':True}))
