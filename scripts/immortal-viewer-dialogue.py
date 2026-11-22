"""Assemble the viewer-led film from complete new takes and preserved selections."""
import json
from dialogue_media import ROOT, assemble

base = ROOT / 'episodes/immortal'
script = json.loads((base / 'script-v3.json').read_text())
recordings = json.loads((base / 'revisions/viewer-v2/recordings.json').read_text())
beats = [b for c in script['chapters'] for b in c['beats']]
pauses = {'m05': .55, 'm06': .55, 'm07': .45, 'b05': .6, 'b06': .45,
          'b07': .6, 't11': .75, 't12': .4, 't13': .4,
          'e01': .45, 'e03': .35, 'e04': .35, 'e09': .7,
          'e10': .4, 'e11': .6, 'e12': .4, 'e14': .35, 'e15': 3.6}
lines = []
for i, beat in enumerate(beats):
    next_role = beats[i + 1]['speaker'] if i + 1 < len(beats) else ''
    pause = .18 if next_role == beat['speaker'] else .26
    lines.append({'id': beat['id'], 'speaker': beat['speaker'],
                  'character': beat['speaker'], 'text': beat['text'],
                  'chapter': next(c['id'] for c in script['chapters'] if beat in c['beats']),
                  'afterPause': pauses.get(beat['id'], pause)})
spec = {'id': 'immortal', 'revision': 3, 'fps': 30, 'narrationSpeed': 1,
        'voices': {}, 'lineRecordings': recordings, 'lines': lines,
        'musicFadeSeconds': 3, 'captionReplacements': {}}
(base / 'dialogue.json').write_text(json.dumps(spec, indent=2) + '\n')
(base / 'narration.txt').write_text('\n\n'.join(x['text'] for x in lines) + '\n')
_, timeline, _ = assemble('immortal')
print(json.dumps({'perspective': 'viewer', 'lines': len(lines),
                  'words': sum(len(x['words']) for x in timeline['lines']),
                  'duration': timeline['duration']}))
