"""One Blender worker; render only the four selected hero clips."""
import subprocess,json
from pathlib import Path
root=Path.cwd();dest=root/'public/episodes/inventions-since-2000/heroes';dest.mkdir(exist_ok=True)
for name in ['bedroom','map','dna','phone']:
 out=root/'blender/inventions-since-2000'/name;log=out/'render-v1.log'
 with log.open('w') as f:subprocess.run(['/Applications/Blender.app/Contents/MacOS/Blender','--background','--factory-startup','--python','blender/scripts/inventions_heroes_v1.py','--','--shot',name,'--render'],stdout=f,stderr=subprocess.STDOUT,check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-framerate','30','-i',str(out/'frames-v1/%04d.png'),'-c:v','libx264','-crf','16','-preset','fast','-pix_fmt','yuv420p','-g','30','-keyint_min','30','-movflags','+faststart','-an',str(dest/(name+'-v1.mp4'))],check=True)
 print(json.dumps({'shot':name,'saved':str(dest/(name+'-v1.mp4'))}),flush=True)
