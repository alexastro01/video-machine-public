"""Reuse approved character pixels and measure the two CV-photo frames."""
from pathlib import Path
import hashlib,json,shutil,urllib.request,re
from PIL import Image
import numpy as np

ROOT=Path(__file__).resolve().parents[1];B=ROOT/'episodes/full-stack-subscriber';P=ROOT/'public/episodes/full-stack-subscriber'
(B/'assets').mkdir(exist_ok=True);(P/'art').mkdir(exist_ok=True);(P/'fonts').mkdir(exist_ok=True);(P/'icons').mkdir(exist_ok=True)
actors=json.loads((ROOT/'episodes/ai-typo/assets/actors.json').read_text())
for source in json.loads((ROOT/'channel/developer/assets/astra-gemini-v1.json').read_text())['assets']:
 actors[source['id']]={k:source[k] for k in ['id','url','width','height','bounds','pivotX','footY','bodyHeight','background','sha256']}
for name in ['neutral','nod']:
 source=ROOT/f'output/imagegen/full-stack-subscriber/alex-cv-{name}-v1.png';dest=P/f'art/alex-cv-{name}.png';shutil.copy2(source,dest)
 im=Image.open(dest).convert('RGB');a=np.asarray(im);ys,xs=np.where(a.min(axis=2)<205);bounds=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
 actors[f'alex-cv-{name}']={'id':f'alex-cv-{name}','url':str(dest.relative_to(ROOT/'public')),'width':im.width,'height':im.height,'bounds':bounds,'pivotX':1024,'footY':bounds[3],'bodyHeight':bounds[3]-bounds[1],'kind':'portrait','background':'white','sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
(B/'assets/actors.json').write_text(json.dumps(actors,indent=2)+'\n')
for file in ['InterVariable.woff2','Inter-OFL.txt']:shutil.copy2(ROOT/'public/episodes/ai-typo/fonts'/file,P/'fonts'/file)
icons=json.loads((ROOT/'episodes/ai-typo/assets/icons.json').read_text())
for name in ['clock','mail','credit-card','circle-alert','user-round','chevron-right','external-link']:
 url=f'https://raw.githubusercontent.com/lucide-icons/lucide/0.468.0/icons/{name}.svg';data=urllib.request.urlopen(url,timeout=40).read().decode();(P/'icons'/f'{name}.svg').write_text(data);inner=re.sub(r'^.*?<svg[^>]*>|</svg>\s*$','',data,flags=re.S).strip();assert '<script' not in inner;icons[name]=inner
shutil.copy2(ROOT/'public/episodes/ai-typo/icons/LICENSE.txt',P/'icons/LICENSE.txt')
(B/'assets/icons.json').write_text(json.dumps(icons,indent=2)+'\n');(B/'assets/icon-provenance.json').write_text(json.dumps({'library':'Lucide','source':'https://github.com/lucide-icons/lucide','newIconRef':'0.468.0','licenseFile':str((P/'icons/LICENSE.txt').relative_to(ROOT)),'icons':list(icons)},indent=2)+'\n')
rows=[]
for pose in ['neutral','nod']:
 source=ROOT/f'output/imagegen/full-stack-subscriber/alex-cv-{pose}-v1.png';rows.append({'id':'alex-cv-'+pose,'provider':'OpenAI API via installed imagegen CLI','model':'gpt-image-2','quality':'high','requestedSize':[2048,2048],'file':str(source.relative_to(ROOT)),'promptFile':f'episodes/full-stack-subscriber/asset-prompts/alex-cv-{pose}-v1.txt','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'reportedCost':None})
(B/'assets/cv-image-provenance.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps({'actors':list(actors),'icons':len(icons),'cvPhotoFrames':2}))
