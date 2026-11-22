from pathlib import Path
import subprocess,json
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1];b=R/'renders/immortal';old=b/'earlier/immortal-full-v1-before-door-fix.mp4';new=b/'immortal-full-v1.mp4'
def audiohash(file):return subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-c:a','pcm_s16le','-f','hash','-hash','sha256','-'],text=True).strip()
a,z=audiohash(old),audiohash(new)
if a!=z:raise RuntimeError('Decoded audio changed while replacing picture')
p=b/'encoded-village-final';p.mkdir(exist_ok=True);frames=[4465,4466,4620,4684,4685,4686];expr='+'.join(f'eq(n\\,{x})'for x in frames)
subprocess.run(['ffmpeg','-v','error','-y','-i',str(new),'-vf',f'select={expr}','-fps_mode','vfr',str(p/'frame-%02d.png')],check=True)
out=Image.new('RGB',(1920,2*385),'#263842');d=ImageDraw.Draw(out)
for i,f in enumerate(sorted(p.glob('frame-*.png'))):
 im=Image.open(f);im.thumbnail((640,360));x=(i%3)*640;y=(i//3)*385;out.paste(im,(x,y));d.text((x+8,y+365),f'{frames[i]/30:.3f}s / frame{frames[i]}',fill='white')
out.save(p/'boundary-check.jpg',quality=95)
report={'framesReplaced':220,'decodedAudioHashUnchanged':True,'audioPcmSha256':a,'reviewFrames':frames};(b/'splice-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
