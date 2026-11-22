"""Select quiet handles before an expendable trailing production phrase."""
from pathlib import Path
import hashlib
import json
import re
import numpy as np
from dialogue_media import ROOT, R, pcm, wav

source = ROOT / 'episodes/immortal/revisions/viewer-endings-v2'
dest = ROOT / 'episodes/immortal/revisions/viewer-tails-v2'
public = ROOT / 'public/episodes/immortal/revisions/viewer-tails-v2'
dest.mkdir(exist_ok=True)
public.mkdir(parents=True, exist_ok=True)
jobs = json.loads((source / 'speech-provenance.json').read_text())
selected, audit = [], []
for job in jobs:
    recognised = json.loads((source / 'independent-asr' / f"{job['id']}.json").read_text())
    heard = recognised['words']
    guard = next((i for i, w in enumerate(heard)
                  if re.sub(r'[^a-z]', '', w['word'].lower()) == 'end'
                  and i + 2 < len(heard)
                  and heard[i + 1]['word'].lower() == 'of'
                  and heard[i + 2]['word'].lower().startswith('recording')), None)
    real = heard[:guard] if guard is not None else heard
    samples = pcm(ROOT / job['file'])
    guard_hint = heard[guard]['start'] if guard is not None else len(samples) / R
    # The recogniser can extend the final word into the long pause. Include the
    # preceding two seconds when locating the much longer inter-sentence gap.
    lo = max(.2, real[-1]['start'] - 2)
    hi = guard_hint - .04
    window = round(.02 * R)
    first, last = int(np.ceil(lo * R / window)), int(np.floor(hi * R / window))
    quiet = []
    for frame in range(first, last):
        chunk = samples[frame * window:(frame + 1) * window]
        quiet.append(float(np.sqrt(np.mean(chunk ** 2))) <= .0032)
    # Tiny floor-noise spikes are not a new word. Join interruptions under 60 ms.
    for i in range(1, len(quiet) - 1):
        if quiet[i - 1] and not quiet[i]:
            end = next((j for j in range(i, min(i + 4, len(quiet))) if quiet[j]), None)
            if end is not None:
                quiet[i:end] = [True] * (end - i)
    runs, begin = [], None
    for i, value in enumerate(quiet + [False]):
        if value and begin is None:
            begin = i
        elif not value and begin is not None:
            if (i - begin) * .02 >= .7:
                runs.append(((first + begin) * .02, (first + i) * .02))
            begin = None
    if not runs:
        raise RuntimeError(f"{job['id']}: no sustained quiet handle before the guard")
    gap = max(runs, key=lambda x: x[1] - x[0])
    end = min(gap[0] + .22, gap[1] - .04)
    stop = round(end * R)
    tail_rms = float(np.sqrt(np.mean(samples[stop - round(.02 * R):stop] ** 2)))
    if tail_rms > .0032:
        raise RuntimeError(f"{job['id']}: final quiet handle exceeds the noise floor")
    out = public / f"source-{job['id']}.wav"
    wav(out, samples[:stop])
    entry = {k: v for k, v in job.items() if k != 'trailingGuard'}
    entry.update(file=str(out.relative_to(ROOT)), parentSource=job['file'],
                 excludedTrailingGuard=job['trailingGuard'],
                 preserveCompleteTake=True, duration=stop / R)
    selected.append(entry)
    audit.append({'id': job['id'], 'parentSource': job['file'],
                  'sourceSha256': hashlib.sha256((ROOT / job['file']).read_bytes()).hexdigest(),
                  'guardRecognised': guard is not None, 'guardHint': guard_hint,
                  'quietRun': gap, 'selectedEnd': stop / R, 'tailRms': tail_rms,
                  'nextStep': 'Independent ASR of the isolated story line before selection.'})
(dest / 'speech-provenance.json').write_text(json.dumps(selected, indent=2) + '\n')
(dest / 'isolation-audit.json').write_text(json.dumps(audit, indent=2) + '\n')
print(json.dumps({'isolatedTakes': len(selected), 'seconds': sum(x['duration'] for x in selected),
                  'maximumTailRms': max(x['tailRms'] for x in audit)}, indent=2))
