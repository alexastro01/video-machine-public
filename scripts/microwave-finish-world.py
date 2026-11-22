"""Wait for disjoint world workers, then encode and review the complete local media."""
from pathlib import Path
import subprocess,json,time,struct
root=Path('blender/microwave/frames-v1');project='episodes/microwave/hyperframes';out=Path(project)/'assets/world-v1.mp4'
def complete():
 for i in range(1350):
  p=root/f'{i:04d}.png'
  if not p.exists():return False
  try:
   with p.open('rb') as f:
    h=f.read(24);f.seek(-12,2);tail=f.read(12)
   if struct.unpack('>II',h[16:24])!=(540,960) or tail[4:8]!=b'IEND':return False
  except (OSError,struct.error):return False
 return True
while not complete():time.sleep(5)
print('All 1350 complete world PNGs are ready.',flush=True)
subprocess.run(['ffmpeg','-v','error','-y','-framerate','30','-i',str(root/'%04d.png'),'-vf','scale=1080:1920:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p,setsar=1','-frames:v','1350','-an','-c:v','libx264','-preset','fast','-crf','16','-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-movflags','+faststart',str(out)],check=True)
print('Encoded complete 45-second world.',flush=True)
cli=['npx','--yes','hyperframes@0.9.23']
with open('blender/microwave/preview.log','w') as f:subprocess.run(cli+['preview',project,'--background','--port','3106','--json'],stdout=f,stderr=subprocess.STDOUT,check=True)
with open('blender/microwave/hyperframes-check.json','w') as f:subprocess.run(cli+['check',project,'--json'],stdout=f,check=True)
print('Full HyperFrames check passed.',flush=True)
with open('blender/microwave/snapshot-review.json','w') as f:subprocess.run(cli+['snapshot',project,'--review','--output','renders/microwave/v1-review/hyperframes','--json'],stdout=f,check=True)
print('Beat, cut and phone review sheets are ready.',flush=True)
