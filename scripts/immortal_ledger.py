"""Atomic episode accounting shared by media jobs; never stores credentials."""
from pathlib import Path
import json,fcntl,datetime
BASE=Path(__file__).resolve().parents[1]/'episodes/immortal'
def change(fn):
 with (BASE/'.spend-ledger.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  p=BASE/'spend-ledger.json';d=json.loads(p.read_text());fn(d)
  d['reportedSpend']=round(sum(x.get('reportedUsd',0)for x in d['transactions']),8)
  d['usageCalculatedSpend']=round(sum(x.get('calculatedUsd',0)for x in d['transactions']),8)
  d['reserved']=round(sum(x.get('conservativeBudgetHoldUsd',0)for x in d['transactions']),8)
  d['accountedBudgetUsd']=round(d['reportedSpend']+d['usageCalculatedSpend']+d['reserved']+d.get('unpricedTranscriptionHoldUsd',0),8)
  d['remainingUnallocatedUsd']=round(d['cap']-d['accountedBudgetUsd'],8)
  if d['remainingUnallocatedUsd']<0:raise RuntimeError('Episode budget cap would be exceeded')
  q=p.with_suffix('.tmp');q.write_text(json.dumps(d,indent=2)+'\n');q.replace(p)
  fcntl.flock(lock,fcntl.LOCK_UN)
  return d

def reserve_image(job):
 def op(d):
  key='film-image-'+job['id']
  if key not in {x['id']for x in d['transactions']}:d['transactions'].append({'id':key,'asset':job['id'],'provider':'OpenAI API','model':'gpt-image-2','quality':job['quality'],'size':job['size'],'status':'requested','actualCostKnown':False,'conservativeBudgetHoldUsd':job['holdUsd'],'file':job['output'],'promptFile':job['promptFile'],'reference':job['reference'],'costNote':'Conservative still-image hold. Bundled CLI does not save returned usage; not a reported charge.'})
 return change(op)

def mark_image(id,status,error=None):
 def op(d):
  for x in d['transactions']:
   if x['id']=='film-image-'+id:x.update({'status':status,'error':error,'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
 return change(op)
