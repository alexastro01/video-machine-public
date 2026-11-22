"""Align the chosen saved take to the spoken script, without direction tags."""
from pathlib import Path
import argparse,json
import stable_whisper
import torch

torch.set_num_threads(4)
parser=argparse.ArgumentParser()
parser.add_argument('--source-file',default='public/episodes/restless-friend/source-take-2.mp3')
parser.add_argument('--output-dir',default='episodes/restless-friend')
parser.add_argument('--source-take',type=int,default=2)
args=parser.parse_args()
b=Path(args.output_dir);b.mkdir(parents=True,exist_ok=True)
model=stable_whisper.load_model('small.en',device='cpu')
r=model.align(args.source_file,Path('episodes/restless-friend/narration.txt').read_text(),language='en',original_split=True,fast_mode=True,verbose=False)
r.save_as_json(str(b/'forced-alignment.json'))
words=[{'text':w.word.strip(),'start':w.start,'end':w.end} for segment in r.segments for w in segment.words]
b.joinpath('transcript-aligned.json').write_text(json.dumps({'sourceTake':args.source_take,'sourceFile':args.source_file,'model':'stable-ts/Whisper-small.en forced alignment','words':words},indent=2)+'\n')
print(json.dumps({'words':len(words),'instantWords':[w for w in words if w['end']<=w['start']],'first':words[:4],'last':words[-4:]}))
