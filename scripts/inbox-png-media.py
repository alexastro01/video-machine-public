"""Edit Inbox.png from its four local performances and their verified timings."""
from collections import defaultdict
from hashlib import sha256
import json
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np

from dialogue_media import ROOT, R, assemble, normal, pcm, run, wav

SLUG = 'inbox-dot-png'
EP = ROOT / 'episodes' / SLUG
PUBLIC = ROOT / 'public' / 'episodes' / SLUG


def load(file):
    return json.loads(file.read_text())


def save(name, value):
    (EP / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


plan = load(EP / 'plan.json')
voices = load(EP / 'voice-provenance.json')['voices']
source_words = {}
source_paths = {}
for role, voice in voices.items():
    selected = next(t for t in voice['takes'] if t['take'] == voice['selectedTake'])
    aligned = load(EP / 'voices' / f'{role}-aligned.json')
    independent = load(EP / 'voices' / f'{role}-take-{selected["take"]}.json')
    source = ROOT / selected['source']
    digest = sha256(source.read_bytes()).hexdigest()
    if any(check != digest for check in (aligned['sourceSha256'], independent['sourceSha256'], selected['sourceSha256'])):
        raise ValueError(f'{role}: the selected waveform changed')
    if [normal(w['word']) for w in independent['words']] != [normal(w['text']) for w in aligned['words']]:
        raise ValueError(f'{role}: alignment and independent transcript disagree')
    source_paths[role] = selected['source']
    source_words[role] = aligned['words']

position = defaultdict(int)
recordings = {}
lines = []
for item in plan['lines']:
    role, key = item['speaker'], item['id']
    n = len(item['text'].split())
    words = source_words[role][position[role]:position[role] + n]
    position[role] += n
    if [normal(w['text']) for w in words] != [normal(w) for w in item['text'].split()]:
        raise ValueError(f'Unexpected source text for {key}')
    start, end = item['sourceWindow']
    recordings[key] = dict(sourceFile=source_paths[role], sourceStart=start, sourceEnd=end,
                           wordTimings=words, completeTake=False)
    lines.append({k: item[k] for k in ('id', 'speaker', 'text', 'afterPause')})
for role, words in source_words.items():
    if position[role] != len(words):
        raise ValueError(f'Unused words in {role} recording')
save('dialogue.json', dict(fps=plan['fps'], narrationSpeed=1, voices={}, lineRecordings=recordings, lines=lines))
_, timeline, _ = assemble(SLUG)
lines = timeline['lines']
words = [w for line in lines for w in line['words']]
save('transcript-source.json', {'sourceTake': {r: v['selectedTake'] for r, v in voices.items()}, 'words': words})
(EP / 'narration.txt').write_text('\n'.join(line['text'] for line in lines) + '\n')
seconds = timeline['duration']
episode = load(EP / 'episode.json')
episode.update(duration=seconds, fps=plan['fps'], premise=plan['premise'])
episode['audio']['narrationTail'] = round(seconds - words[-1]['end'], 6)
episode['scenes'] = []
for i, (item, line) in enumerate(zip(plan['lines'], lines)):
    stop = lines[i + 1]['start'] if i + 1 < len(lines) else seconds
    episode['scenes'].append(dict(id=line['id'], label=line['id'], start=line['start'], duration=stop-line['start'],
                                  set='developer-ui', action='reveal', timeOfDay='day', anchor=line['text'], description=item['shot']))
save('episode.json', episode)

captions = []
for line in lines:
    pair = []
    for i, word in enumerate(line['words']):
        pair.append(word)
        if len(pair) < 2 and not word['text'].endswith(('.', '?', '!', ',')) and i + 1 < len(line['words']):
            continue
        onset = round(pair[0]['start'] * 1000)
        # Keep the spoken pair legible through small gaps between words.
        next_start = line['words'][i + 1]['start'] if i + 1 < len(line['words']) else line['end']
        until = min(next_start, pair[-1]['end'] + .13)
        captions.append(dict(text=' '.join(w['text'] for w in pair), startMs=onset, endMs=round(until*1000), timestampMs=onset, confidence=None))
        pair = []
save('captions.json', captions)

cues = {}
for key, (line_id, anchor, offset) in plan['cues'].items():
    matching = [w for w in words if w['line'] == line_id and normal(w['text']) == normal(anchor)]
    if len(matching) != 1:
        raise ValueError(f'{key}: ambiguous anchor {anchor}')
    cues[key] = round((matching[0]['start'] + offset) * plan['fps'])
save('cues.json', cues)

length = round(seconds * R)
effects = np.zeros(length)
ledger = load(ROOT / 'episodes/full-stack-subscriber/assets/sfx-ledger.json')
samples = {}
for entry in ledger:
    if entry['id'] in {cue['sound'] for cue in plan['foley']}:
        clip = pcm(ROOT / entry['file'])
        audible = np.flatnonzero(np.abs(clip) > np.abs(clip).max() * .025)
        samples[entry['id']] = clip[max(0, audible[0] - round(.002 * R)):]
events = []
for item in plan['foley']:
    frame = cues[item['at']] + round(item.get('offset', 0) * plan['fps'])
    start = round(frame * R / plan['fps'])
    clip = samples[item['sound']][:min(length-start, round(item['length'] * R))].copy()
    clip *= item['peak'] / max(.001, np.abs(clip).max())
    edge = min(round(.007*R), len(clip)//2)
    clip[:edge] *= np.linspace(0, 1, edge)
    clip[-edge:] *= np.linspace(1, 0, edge)
    effects[start:start+len(clip)] += clip
    events.append({'frame': frame, 'at': frame / plan['fps'], 'source': item['sound'], 'event': item['at']})
save('audio-events.json', events)
wav(PUBLIC / 'effects.wav', effects)
bed = pcm(ROOT / plan['music']['source'])
if len(bed) < length:
    raise ValueError('Music source must cover the episode')
bed = bed[:length].copy()
bed *= plan['music']['rms'] / np.sqrt(np.mean(bed**2))
bed[:round(.05*R)] *= np.linspace(0, 1, round(.05*R))
bed[-round(.18*R):] *= np.linspace(1, 0, round(.18*R))
wav(PUBLIC / 'music.wav', bed)
with tempfile.TemporaryDirectory() as directory:
    premix = Path(directory) / 'mix.wav'
    inputs = [arg for name in ('narration', 'music', 'effects') for arg in ('-i', str(PUBLIC / (name+'.wav')))]
    run(['ffmpeg','-v','error','-y',*inputs,'-filter_complex','amix=inputs=3:duration=first:normalize=0','-c:a','pcm_f32le',str(premix)])
    measured = subprocess.run(['ffmpeg','-hide_banner','-i',str(premix),'-af','loudnorm=I=-17:TP=-2:LRA=8:print_format=json','-f','null','-'],capture_output=True,check=True)
    stats = json.loads(re.search(r'\{[^{}]+\}',measured.stderr.decode()).group())
    gain = min(-17-float(stats['input_i']), -2.1-float(stats['input_tp']))
    run(['ffmpeg','-v','error','-y','-i',str(premix),'-af',f'volume={gain:.6f}dB','-ac','2','-c:a','pcm_s16le',str(PUBLIC/'mix.wav')])
save('audio-master.json', {'integratedBeforeGain': stats['input_i'], 'peakBeforeGain': stats['input_tp'], 'gainDb': gain, 'sourceMusic': plan['music'], 'master': 'mix.wav'})
print(f'{len(words)} words, {timeline["frames"]} frames, {len(events)} sound cues')
