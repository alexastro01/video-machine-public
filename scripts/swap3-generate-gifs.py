"""Generate each saved finite character action once with the established native runner."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import subprocess,json
ROOT=Path(__file__).resolve().parents[1];names=['adult-call','young-call','adult-wave']
def generate(name):
    out=ROOT/f'output/imagegen/billionaire-swap-3/{name}/{name}.gif';out.parent.mkdir(parents=True,exist_ok=True)
    if out.exists():return {'id':name,'status':'already_saved'}
    cmd=['node','scripts/generate-native-gif.mjs','--image',f'public/episodes/billionaire-body-swap-3/art/{name}.png','--prompt-file',f'episodes/billionaire-body-swap-3/asset-prompts/{name}-gif.txt','--out',str(out),'--env-file','.env.local','--frames','16','--frame-ms','100']
    r=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True);(ROOT/f'episodes/billionaire-body-swap-3/assets/{name}-gif-generation.log').write_text(r.stdout+r.stderr)
    return {'id':name,'status':'saved' if r.returncode==0 else 'failed'}
with ThreadPoolExecutor(max_workers=4) as pool:
    for task in as_completed([pool.submit(generate,n) for n in names]):print(json.dumps(task.result()),flush=True)
