"""Decode native actions, retain source timing and remove disconnected matte residue."""
from pathlib import Path
import subprocess,json,shutil
import numpy as np
from scipy import ndimage
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];B=ROOT/'episodes/billionaire-body-swap-4';P=ROOT/'public/episodes/billionaire-body-swap-4/art';animations={}
for name in ['mum-hopeful','young-ask']:
    selected=name
    d=ROOT/f'output/imagegen/billionaire-swap-4/{selected}';src=d/f'{selected}.gif'
    if not (d/f'{selected}-atlas.json').exists():
        r=subprocess.run(['node','scripts/prepare-native-gif.mjs',str(src),'--key-color=ff00ff','--protect-interior'],cwd=ROOT,capture_output=True,text=True);(B/f'assets/{name}-gif-prepare.log').write_text(r.stdout+r.stderr);assert r.returncode==0,name
    meta=json.loads((d/f'{selected}-atlas.json').read_text());atlas=np.array(Image.open(d/f'{selected}-atlas.png').convert('RGBA'));preview=Image.new('RGB',(4*190,4*310),'#eef1f4');draw=ImageDraw.Draw(preview)
    for i,cell in enumerate(meta['cells']):
        x=cell['originX'];y=cell['originY'];region=atlas[y:y+meta['cellHeight'],x:x+meta['cellWidth']];labels,n=ndimage.label(region[:,:,3]>160,np.ones((3,3)));sizes=np.bincount(labels.ravel());sizes[0]=0;keep=ndimage.binary_dilation(labels==int(sizes.argmax()),iterations=2);region[:,:,3]*=keep
        yy,xx=np.where(region[:,:,3]>60);cell.update(left=int(xx.min()),right=int(xx.max()),top=int(yy.min()),bottom=int(yy.max()))
        image=Image.fromarray(region).crop((meta['crop']['x'],meta['crop']['y'],meta['crop']['x']+meta['crop']['width'],meta['crop']['y']+meta['crop']['height']));image.thumbnail((180,275),Image.Resampling.NEAREST);px=i%4*190+(190-image.width)//2;py=i//4*310;preview.paste(image,(px,py),image);draw.text((i%4*190+6,py+285),f'{i}: {i*.1:.1f}s',fill='black')
    meta['clipping']=[c['frame'] for c in meta['cells'] if c['top']<=1 or c['left']<=1 or c['right']>=meta['cellWidth']-2 or c['bottom']>=meta['cellHeight']-2]
    meta['minimumTopMargin']=min(c['top'] for c in meta['cells']);meta['minimumBottomMargin']=meta['cellHeight']-1-max(c['bottom'] for c in meta['cells'])
    assert meta['clipping']==[],(name,meta['clipping']);dst=P/f'{name}-atlas.png';Image.fromarray(atlas).save(dst);meta['processing']+=' Disconnected matte residue removed without changing subject RGB or motion.';meta_file=P/f'{name}-atlas.json';meta_file.write_text(json.dumps(meta,indent=2)+'\n');preview.save(d/'contact-sheet.jpg',quality=95)
    height=1.78 if name=='young-ask' else 1.86
    animations[name]={'file':str(dst.relative_to(ROOT/'public')),'metadata':meta,'nativeModelMotion':True,'worldHeight':height,'provenance':str((d/f'{selected}.provenance.json').relative_to(ROOT))}
    print(json.dumps({'id':name,'frames':meta['frameCount'],'clipping':meta['clipping']}),flush=True)
(B/'assets/animations.json').write_text(json.dumps(animations,indent=2)+'\n')

# A recovered native pose gives later deadpan replies a neutral seated silhouette.
a=animations['young-ask'];m=a['metadata'];c=m['crop'];i=m['frameCount']-1
x=i%m['columns']*m['cellWidth']+c['x'];y=i//m['columns']*m['cellHeight']+c['y']
image=Image.open(ROOT/'public'/a['file']).crop((x,y,x+c['width'],y+c['height']))
file=P/'young-rest.png';image.save(file);manifest=B/'assets/poses.json';poses=json.loads(manifest.read_text())
poses['young-rest']={'file':str(file.relative_to(ROOT/'public')),'width':c['width'],'height':c['height'],'pivotX':m['cellWidth']/2-c['x'],'footY':m['cells'][i]['bottom']+1-c['y'],'worldHeight':1.78,'source':'output/imagegen/billionaire-swap-4/young-ask/young-ask.gif','sourceFrame':i,'processing':'Final native action frame selected without changing RGB or pose.'}
manifest.write_text(json.dumps(poses,indent=2)+'\n')
