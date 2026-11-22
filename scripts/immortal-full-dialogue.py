"""Select exact existing and newly transcribed takes for the complete film."""
from pathlib import Path
import json
from dialogue_media import assemble,ROOT
B=ROOT/'episodes/immortal';F=B/'full'
if (B/'revisions/viewer-v2/recordings.json').exists():
 import subprocess,sys
 subprocess.run([sys.executable,str(ROOT/'scripts/immortal-viewer-dialogue.py')],cwd=ROOT,check=True)
 sys.exit(0)
voices=json.loads((F/'reused-voices.json').read_text())
for job in json.loads((F/'speech-nodes.json').read_text()):
 voices[job['id']]={'take':1,'sourceFile':f"public/episodes/immortal/source-{job['id']}-take-1.mp3",'words':f"full/{job['id']}-words.json",'sourceTrimStart':0,'preserveLeadingAudio':True}
lines=json.loads((F/'dialogue-lines.json').read_text())
spec={'id':'immortal','revision':2,'fps':30,'narrationSpeed':1,'voices':voices,'lines':lines,'musicFadeSeconds':3,'captionReplacements':{}}
repair= B/'revisions/v2/dialogue-repairs.json'
if repair.exists():
 replacements=json.loads(repair.read_text())
 spec['revision']=3
 spec['lineRecordings']=replacements['lineRecordings']
 for line in lines:
  if line['id'] in replacements['afterPause']:
   line['afterPause']=replacements['afterPause'][line['id']]
(B/'dialogue.json').write_text(json.dumps(spec,indent=2)+'\n')
(B/'narration.txt').write_text('\n\n'.join(x['text']for x in lines)+'\n')
_,timeline,_=assemble('immortal')
print(json.dumps({'duration':timeline['duration'],'lines':len(timeline['lines']),'words':sum(len(x['words'])for x in timeline['lines'])}))
