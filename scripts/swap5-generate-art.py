"""Generate two reference-directed four-pose sheets once each."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import subprocess,json
ROOT=Path(__file__).resolve().parents[1];B=ROOT/'episodes/billionaire-body-swap-5';jobs=json.loads((B/'assets/image-jobs.json').read_text())
def generate(j):
 out=ROOT/j['output'];out.parent.mkdir(parents=True,exist_ok=True)
 if out.exists():return {'id':j['id'],'status':'already_saved'}
 args=['uv','run','--no-project','--with','openai','--with','pillow','--env-file','.env.local','--','python',str(Path.home()/'.codex/skills/.system/imagegen/scripts/image_gen.py'),j['mode']]
 if j.get('reference'):args+=['--image',j['reference']]
 args+=['--prompt-file',j['promptFile'],'--model','gpt-image-2','--quality','high','--size','2048x2048','--background','opaque','--out',j['output']]
 r=subprocess.run(args,cwd=ROOT,capture_output=True,text=True);(B/f"assets/{j['id']}-image-generation.log").write_text(r.stdout+r.stderr);return {'id':j['id'],'status':'saved' if r.returncode==0 else 'failed'}
with ThreadPoolExecutor(max_workers=2) as pool:
 for f in as_completed([pool.submit(generate,j) for j in jobs]):print(json.dumps(f.result()),flush=True)
