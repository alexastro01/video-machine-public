"""Run selected still jobs through the bundled imagegen CLI, once each."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import argparse,json,subprocess,sys
from immortal_ledger import reserve_image,mark_image
root=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser();a.add_argument('--ids',required=True);a.add_argument('--workers',type=int,default=4);args=a.parse_args()
jobs=json.loads((root/'episodes/immortal/full/image-jobs.json').read_text());ids=args.ids.split(',');chosen=[next(j for j in jobs if j['id']==i)for i in ids]
for j in chosen:reserve_image(j)
def run(j):
 file=root/j['output']
 if file.exists():return j,True,'already saved'
 cli=Path.home()/'.codex/skills/.system/imagegen/scripts/image_gen.py'
 cmd=['uv','run','--no-project','--with','openai','--with','pillow','--env-file','.env.local','--','python',str(cli),'edit']
 for ref in j.get('references',[j['reference']]):cmd.extend(['--image',ref])
 cmd.extend(['--prompt-file',j['promptFile'],'--model','gpt-image-2','--quality',j['quality'],'--size',j['size'],'--background','opaque','--out',j['output']])
 result=subprocess.run(cmd,cwd=root,capture_output=True,text=True)
 log=root/'episodes/immortal/full'/f'{j["id"]}-generation.log';log.write_text(result.stdout+result.stderr)
 return j,result.returncode==0,(result.stderr[-500:] if result.returncode else 'saved')
failed=[]
with ThreadPoolExecutor(max_workers=min(4,args.workers)) as pool:
 for future in as_completed([pool.submit(run,j)for j in chosen]):
  j,ok,message=future.result();mark_image(j['id'],'completed' if ok else 'failed',None if ok else message)
  print(json.dumps({'id':j['id'],'ok':ok,'file':j['output'],'note':message}),flush=True)
  if not ok:failed.append(j['id'])
if failed:sys.exit(1)
