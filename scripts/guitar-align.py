from pathlib import Path
import json,stable_whisper,torch
# CPU alignment avoids competing with Blender's Metal renderer.
torch.set_num_threads(4)
m=stable_whisper.load_model('small.en',device='cpu')
text=Path('episodes/guitar-pickup/narration.txt').read_text()
r=m.align('public/episodes/guitar-pickup/source-take-1.mp3',text,language='en',original_split=True,fast_mode=True,verbose=False)
# The small.en alignment is retained without shortening words via waveform refinement.
r.save_as_json('episodes/guitar-pickup/forced-alignment.json')
words=[{'text':w.word.strip(),'start':w.start,'end':w.end} for s in r.segments for w in s.words]
Path('episodes/guitar-pickup/transcript-aligned.json').write_text(json.dumps({'sourceTake':1,'model':'stable-ts/Whisper-small.en forced alignment','words':words},indent=2)+'\n')
print(json.dumps({'words':len(words),'instantWords':[w for w in words if w['end']<=w['start']],'text':' '.join(w['text'] for w in words)}))
