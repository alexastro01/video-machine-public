from pathlib import Path
import json,stable_whisper,torch
# CPU alignment avoids competing with Blender's Metal renderer.
torch.set_num_threads(4)
m=stable_whisper.load_model('small.en',device='cpu')
text=Path('episodes/microwave/narration.txt').read_text()
r=m.align('public/episodes/microwave/source-take-2.mp3',text,language='en',original_split=True,fast_mode=True,verbose=False)
# The small.en alignment is retained without shortening words via waveform refinement.
r.save_as_json('episodes/microwave/forced-alignment.json')
words=[{'text':w.word.strip(),'start':w.start,'end':w.end} for s in r.segments for w in s.words]
Path('episodes/microwave/transcript-aligned.json').write_text(json.dumps({'sourceTake':2,'model':'stable-ts/Whisper-small.en forced alignment','words':words},indent=2)+'\n')
print(json.dumps({'words':len(words),'instantWords':[w for w in words if w['end']<=w['start']],'text':' '.join(w['text'] for w in words)}))
