"""Extract four whole subjects from each sheet, preserving source pixels across cell boundaries."""
from pathlib import Path
import json,hashlib,importlib.util
import numpy as np
from scipy import ndimage
from PIL import Image,ImageChops,ImageFilter,ImageDraw
ROOT=Path(__file__).resolve().parents[1];B=ROOT/'episodes/billionaire-body-swap-5';P=ROOT/'public/episodes/billionaire-body-swap-5/art';P.mkdir(parents=True,exist_ok=True)
module=importlib.util.spec_from_file_location('chroma',Path.home()/'.codex/skills/.system/imagegen/scripts/remove_chroma_key.py');chroma=importlib.util.module_from_spec(module);module.loader.exec_module(chroma)
keys={'adult':['look','tap','listen','wow'],'hamster':['plain','run','guard','salute']};poses={};ledger=[];preview=Image.new('RGB',(960,780),'#edf0f2');draw=ImageDraw.Draw(preview)
for row,job in enumerate(json.loads((B/'assets/image-jobs.json').read_text())):
 source=ROOT/job['output'];raw=Image.open(source).convert('RGBA');assert raw.size==(2048,2048)
 clean=raw.copy();chroma._apply_alpha_to_image(clean,key=(255,0,255),tolerance=55,spill_cleanup=True,soft_matte=True,transparent_threshold=28,opaque_threshold=150)
 channels=ImageChops.difference(raw.convert('RGB'),Image.new('RGB',raw.size,(255,0,255))).split();diff=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2]);inside=diff.point(lambda v:255 if v>100 else 0).filter(ImageFilter.MinFilter(5));clean.paste(raw,(0,0),inside)
 rgba=np.array(clean);labels,n=ndimage.label(rgba[:,:,3]>150,np.ones((3,3)));sizes=np.bincount(labels.ravel());sizes[0]=0;ids=np.argsort(sizes)[-4:].tolist();assert min(sizes[i] for i in ids)>10000
 centres={i:ndimage.center_of_mass(labels==i) for i in ids};by_y=sorted(ids,key=lambda i:centres[i][0]);ids=sorted(by_y[:2],key=lambda i:centres[i][1])+sorted(by_y[2:],key=lambda i:centres[i][1])
 for i,(label,key) in enumerate(zip(ids,keys[job['id']])):
  yy,xx=np.where(labels==label);box=(max(0,int(xx.min())-5),max(0,int(yy.min())-5),min(2048,int(xx.max())+6),min(2048,int(yy.max())+6));assert min(xx.min(),yy.min(),2047-xx.max(),2047-yy.max())>8
  region=rgba.copy();region[:,:,3]*=ndimage.binary_dilation(labels==label,iterations=3);sprite=Image.fromarray(region).crop(box);name=job['id']+'-'+key;file=P/f'{name}.png';sprite.save(file);foot=sprite.getchannel('A').crop((0,round(sprite.height*.88),sprite.width,sprite.height)).getbbox()
  height=(.21 if key=='run' else .65 if key in ['guard','salute'] else .55) if job['id']=='hamster' else 1.86
  poses[name]=dict(file=str(file.relative_to(ROOT/'public')),width=sprite.width,height=sprite.height,pivotX=(foot[0]+foot[2])/2,footY=sprite.height-5,worldHeight=height,sourceCell=i,sourceCrop=box,source=str(source.relative_to(ROOT)),processing='Whole connected subject isolated from the original sheet. No RGB or body shape changes; row boundaries are not used as crop edges.')
  small=sprite.copy();small.thumbnail((230,345),Image.Resampling.NEAREST);x=i*240+(240-small.width)//2;y=row*390+5;preview.paste(small,(x,y),small);draw.text((i*240+5,row*390+365),name,fill='#182b35')
 ledger.append({**job,'provider':'OpenAI API, imagegen skill CLI','model':'gpt-image-2','quality':'high','size':[2048,2048],'poses':4,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'reportedCost':None})
previous=json.loads((ROOT/'episodes/billionaire-body-swap-3/assets/poses.json').read_text())
for name in ['adult-call','young-call','young-puzzled','young-caught']:poses[name]=previous[name]
(B/'assets/poses.json').write_text(json.dumps(poses,indent=2)+'\n');(B/'assets/image-ledger.json').write_text(json.dumps(ledger,indent=2)+'\n');preview.save(ROOT/'output/imagegen/billionaire-swap-5/poses-review.jpg',quality=95)
for name in ['adult-tap','hamster-run','hamster-guard']:
 im=Image.open(ROOT/'public'/poses[name]['file']);im.thumbnail((700,700),Image.Resampling.NEAREST);ref=Image.new('RGBA',(1024,1024),(255,0,255,255));ref.alpha_composite(im,((1024-im.width)//2,870-im.height));ref.convert('RGB').save(P/(name+'-gif-reference.png'))
print(json.dumps({'poses':len(poses),'wholeBodiesRecoveredAcrossSheetRows':True,'nativeReferencesPadded':3}))
