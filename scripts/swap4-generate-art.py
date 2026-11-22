"""Run the four independent, reference-based character sheets once."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import json,subprocess
ROOT=Path(__file__).resolve().parents[1]
jobs=json.loads((ROOT/'episodes/billionaire-body-swap-4/assets/image-jobs.json').read_text())
def generate(job):
    out=ROOT/job['output'];out.parent.mkdir(parents=True,exist_ok=True)
    if out.exists():return {'id':job['id'],'status':'already_saved'}
    command=['uv','run','--no-project','--with','openai','--with','pillow','--env-file','.env.local','--','python',str(Path.home()/'.codex/skills/.system/imagegen/scripts/image_gen.py'),'edit','--image',job['reference'],'--prompt-file',job['promptFile'],'--model','gpt-image-2','--quality','high','--size','2048x2048','--background','opaque','--out',job['output']]
    r=subprocess.run(command,cwd=ROOT,capture_output=True,text=True)
    (ROOT/f"episodes/billionaire-body-swap-4/assets/{job['id']}-image-generation.log").write_text(r.stdout+r.stderr)
    return {'id':job['id'],'status':'saved' if r.returncode==0 else 'failed','file':job['output']}
with ThreadPoolExecutor(max_workers=4) as pool:
    for result in as_completed([pool.submit(generate,j) for j in jobs]):print(json.dumps(result.result()),flush=True)
