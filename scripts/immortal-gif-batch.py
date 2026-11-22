"""Run bounded native GIF jobs once, accounting for saved usage."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import json,subprocess,argparse
from immortal_ledger import change
root=Path(__file__).resolve().parents[1];b=root/'episodes/immortal/full';a=argparse.ArgumentParser();a.add_argument('--ids');args=a.parse_args();jobs=json.loads((b/'gif-jobs.json').read_text());chosen=[j for j in jobs if not args.ids or j['id']in args.ids.split(',')]
def reserve(d):
 for j in chosen:
  key='film-gif-'+j['id']
  if key not in {x['id']for x in d['transactions']}:d['transactions'].append({'id':key,'asset':j['id'],'provider':'OpenAI API','model':'gpt-image-2.6-sunburst','status':'requested','actualCostKnown':False,'conservativeBudgetHoldUsd':j.get('holdUsd',.55),'file':j['output']})
change(reserve)
def run(j):
 file=root/j['output'];prov=file.with_suffix('.provenance.json')
 if not file.exists():
  cmd=['node','scripts/generate-native-gif.mjs','--image',j['reference'],'--prompt-file',j['promptFile'],'--out',j['output'],'--size',j['size'],'--frames',str(j['frames']),'--frame-ms',str(j['frameMs']),'--quality','medium','--env-file','.env.local']
  r=subprocess.run(cmd,cwd=root,capture_output=True,text=True);(b/f"{j['id']}-gif.log").write_text(r.stdout+r.stderr)
  if r.returncode:return j,False,r.stderr[-500:]
 usage=json.loads(prov.read_text()).get('usage')if prov.exists()else None
 def update(d):
  x=next(x for x in d['transactions']if x['id']=='film-gif-'+j['id']);x['status']='completed'
  if usage:
   # Rates recorded in the sample ledger: text input $5/M, image input $8/M, image output $30/M.
   details=usage.get('input_tokens_details',{});out=usage.get('output_tokens_details',{});cost=(details.get('text_tokens',0)*5+details.get('image_tokens',0)*8+out.get('image_tokens',usage.get('output_tokens',0))*30)/1e6
   x.update({'usage':usage,'calculatedUsd':round(cost,8),'conservativeBudgetHoldUsd':0,'costNote':'Calculated from returned token usage at the sample ledger rates; not an invoice.'})
 change(update);return j,True,'saved'
with ThreadPoolExecutor(max_workers=3)as pool:
 for f in as_completed([pool.submit(run,j)for j in chosen]):
  j,ok,note=f.result();print(json.dumps({'id':j['id'],'ok':ok,'note':note}),flush=True)
  if not ok:
   def failed(d):next(x for x in d['transactions']if x['id']=='film-gif-'+j['id']).update({'status':'failed','error':note})
   change(failed)
