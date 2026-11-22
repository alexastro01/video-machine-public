"""Build Human in the Loop from its saved performances, words and cue sheet."""
from collections import defaultdict
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess
import tempfile

import numpy as np

from dialogue_media import ROOT, R, assemble, normal, pcm, run, wav

SLUG = 'human-in-the-loop'
EP = ROOT / 'episodes' / SLUG
PUBLIC = ROOT / 'public' / 'episodes' / SLUG


def read(path):
    return json.loads(path.read_text())


def save(name, data):
    (EP / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


plan = read(EP / 'plan.json')
voices = read(EP / 'voice-provenance.json')['voices']
fps = plan['fps']
role_words = {}
sources = {}
for role, voice in voices.items():
    selected = next(t for t in voice['takes'] if t['take'] == voice['selectedTake'])
    source = ROOT / selected['source']
    alignment = read(EP / 'voices' / f'{role}-aligned.json')
    transcript = read(EP / 'voices' / f'{role}-take-{selected["take"]}.json')
    digest = sha256(source.read_bytes()).hexdigest()
    if any(d != digest for d in (selected['sha256'], alignment['sourceSha256'], transcript['sourceSha256'])):
        raise ValueError(f'{role}: source waveform differs from the selected and aligned take')
    words = alignment['words']
    if [normal(w['text']) for w in words] != [normal(w['word']) for w in transcript['words']]:
        raise ValueError(f'{role}: independent transcript and aligned script disagree')
    role_words[role], sources[role] = words, selected['source']

cursor = defaultdict(int)
recordings = {}
lines = []
for row in plan['lines']:
    role, key = row['speaker'], row['id']
    count = len(row['text'].split())
    words = role_words[role][cursor[role]:cursor[role]+count]
    cursor[role] += count
    start, end = row['sourceWindow']
    recordings[key] = dict(sourceFile=sources[role], sourceStart=start, sourceEnd=end,
                           wordTimings=words, completeTake=False)
    lines.append({k: row[k] for k in ('id', 'speaker', 'text', 'afterPause')})
if any(cursor[role] != len(words) for role, words in role_words.items()):
    raise ValueError('A selected source contains unused words')
save('dialogue.json', dict(fps=fps, narrationSpeed=1, voices={}, lineRecordings=recordings, lines=lines))
_, timeline, _ = assemble(SLUG)
lines = timeline['lines']
words = [word for line in lines for word in line['words']]
save('transcript-source.json', {'sourceTake': {r: v['selectedTake'] for r, v in voices.items()}, 'words': words})
(EP / 'narration.txt').write_text('\n'.join(line['text'] for line in lines) + '\n')

duration = timeline['duration']
episode = read(EP / 'episode.json')
episode['duration'] = duration
episode['audio']['narrationTail'] = round(duration - words[-1]['end'], 5)
episode['scenes'] = []
captions = []
for i, (line, row) in enumerate(zip(lines, plan['lines'])):
    stop = lines[i+1]['start'] if i+1 < len(lines) else duration
    episode['scenes'].append(dict(id=line['id'], label=line['id'], set='developer-ui', action='reveal',
                                  timeOfDay='evening', anchor=line['text'], start=line['start'],
                                  duration=stop-line['start'], description=row['shot']))
    pair = []
    for n, word in enumerate(line['words']):
        pair.append(word)
        if len(pair) < 2 and not word['text'].endswith(('.', '?')) and n+1 < len(line['words']):
            continue
        start = round(pair[0]['start']*1000)
        next_start = line['words'][n+1]['start'] if n+1 < len(line['words']) else line['end']
        end = round(min(next_start, pair[-1]['end']+.14)*1000)
        captions.append(dict(text=' '.join(w['text'] for w in pair), startMs=start, endMs=end,
                             timestampMs=start, confidence=None))
        pair = []
save('captions.json', captions)
save('episode.json', episode)

cues = dict(plan['fixedCues'])
for cue, (line_id, text, offset) in plan['anchors'].items():
    matches = [w for w in words if w['line'] == line_id and normal(w['text']) == normal(text)]
    if len(matches) != 1:
        raise ValueError(f'{cue}: ambiguous anchor {text}')
    cues[cue] = round((matches[0]['start'] + offset)*fps)
sequence = plan['approvalSequence']
first_click = round(words[-1]['end']*fps) + sequence['offsetFramesAfterWord']
clicks = [first_click + offset for offset in sequence['clickOffsets']]
if clicks[-1] >= timeline['frames'] or len(clicks) != len(sequence['counts']):
    raise ValueError('The last click must occur inside the edit and each click needs a counter state')
cues['human'] = first_click + sequence['finalHeadlineOffset']
save('cues.json', {'events': cues, 'clicks': clicks})

ledger = {r['id']: r for r in read(ROOT / 'episodes/full-stack-subscriber/assets/sfx-ledger.json')}
clips = {k: pcm(ROOT / ledger[k]['file']) for k in ('pop', 'tap', 'swipe', 'typing')}
effects = np.zeros(round(duration*R))
sound_events = []


def place(frame, action, sound, offset, seconds, peak):
    start = round(frame*R/fps)
    if not 0 <= start < len(effects):
        raise ValueError(f'{action}: cue outside the mix')
    length = min(round(seconds*R), len(effects)-start)
    head = round(offset*R)
    clip = clips[sound][head:head+length].copy()
    clip *= peak / np.max(np.abs(clip))
    edge = min(round(.0025*R), len(clip)//2)
    clip[:edge] *= np.linspace(0, 1, edge)
    clip[-edge:] *= np.linspace(1, 0, edge)
    effects[start:start+len(clip)] += clip
    sound_events.append(dict(frame=frame, action=action, sound=sound, source=ledger[sound]['file'],
                             sourceStart=offset, duration=len(clip)/R))


for cue, sound, head, seconds, peak in plan['foley']:
    place(cues[cue], cue, sound, head, seconds, peak)
for i in range(3):
    place(cues['done']+i*6, f'jira-{i+1}', 'pop', .010, .078, .053+i*.008)
for i, frame in enumerate(clicks):
    place(frame, 'approve', 'tap', .001, .102 if i<4 else .062, (.17,.146,.16,.137)[i%4])
save('audio-events.json', sorted(sound_events, key=lambda e:e['frame']))
wav(PUBLIC/'effects.wav', effects)
# The engine requires a music stem path. The film mixes only dialogue and Foley.
wav(PUBLIC/'music.wav', np.zeros(len(effects)))
with tempfile.TemporaryDirectory() as directory:
    premix = Path(directory)/'premix.wav'
    run(['ffmpeg','-v','error','-y','-i',str(PUBLIC/'narration.wav'),'-i',str(PUBLIC/'effects.wav'),
         '-filter_complex','amix=inputs=2:duration=first:normalize=0','-c:a','pcm_f32le',str(premix)])
    meter = subprocess.run(['ffmpeg','-hide_banner','-i',str(premix),'-af',
                            'loudnorm=I=-16:TP=-2:LRA=8:print_format=json','-f','null','-'],
                           capture_output=True,check=True).stderr.decode()
    stats = json.loads(re.search(r'\{[^{}]+\}',meter).group())
    gain = min(-16-float(stats['input_i']), -2.1-float(stats['input_tp']))
    run(['ffmpeg','-v','error','-y','-i',str(premix),'-af',f'volume={gain:.6f}dB','-ar','48000',
         '-ac','2','-c:a','pcm_s24le',str(PUBLIC/'mix.wav')])
save('audio-master.json', {'inputs':['narration.wav','effects.wav'], 'music':False, 'preGainLUFS':stats['input_i'],
                           'preGainTruePeak':stats['input_tp'], 'gainDb':gain, 'frames':timeline['frames']})
print(f'{len(words)} words, {timeline["frames"]} frames, {len(clicks)} approval clicks')
