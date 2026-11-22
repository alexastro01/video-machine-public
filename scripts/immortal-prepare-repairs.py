"""Validate independent transcripts, then fit only the surrounding silence."""
from pathlib import Path
from functools import lru_cache
import json
import re
import sys
import numpy as np
from dialogue_media import ROOT, R, pcm

revision = next((x.split('=', 1)[1] for x in sys.argv[1:] if x.startswith('--revision=')), 'v2')
if not re.fullmatch(r'[a-z0-9-]+', revision):
    raise RuntimeError('Invalid revision name')
base = ROOT / 'episodes/immortal/revisions' / revision
jobs = json.loads((base / "speech-provenance.json").read_text())

def canonical(text):
    value = re.sub("[^a-z0-9]", "", text.lower())
    value = value.replace('ageing', 'aging').replace('neighbours', 'neighbors').replace('thesecond', 'ii').replace('thethird', 'iii').replace('endofrecordings', 'endofrecording')
    aliases = {
        'onethousandfivehundredandseventytwo': '1572',
        'onethousandfivehundredandfifty': '1550',
        'fifteenhundredandseventytwo': '1572', 'fifteenhundredandfifty': '1550',
        'fourhundredandseventysix': '476', 'fourhundredseventysix': '476',
        'fivehundredandthirtyone': '531', 'fivehundredthirtyone': '531',
        'fifteenthirtyeight': '1538', 'sixteenfifty': '1650',
        'eighteenthirtynine': '1839', 'nineteentwenty': '1920',
        'twothousandandtwentysix': '2026', 'twentytwentysix': '2026',
        'twentytwo': '22',
        'tenyears': '10years',
    }
    for phrase in sorted(aliases, key=len, reverse=True):
        value = value.replace(phrase, aliases[phrase])
    return value

def align(expected, heard):
    @lru_cache(None)
    def solve(i, j):
        if i == len(expected) and j == len(heard):
            return []
        for count in range(1, min(6, len(expected) - i) + 1):
            left = canonical(" ".join(expected[i:i + count]))
            for words in range(1, min(6, len(heard) - j) + 1):
                if left != canonical(" ".join(w["word"] for w in heard[j:j + words])):
                    continue
                tail = solve(i + count, j + words)
                if tail is not None:
                    return [(i, j, count, words)] + tail
        return None
    return solve(0, 0)

pauses = {
    "f03": .28, "f04": .32, "f05": .24,
    "s01": .35, "s02": .28, "s03": .45, "s04": .28, "s05": .35,
    "s06": .25, "s07": .38, "s08": .45, "s09": .22,
    "r01": .28, "r02": .32, "r03": .32, "r04": .4, "r05": .5,
    "r06": .35, "r07": .38,
    "e01": .5, "e02": .28, "e03": .4, "e04": .4, "e05": .3,
    "e06": .32, "e07": .4, "e08": .45, "e09": .7, "e10": .45,
    "e11": .65, "e12": .45, "e13": .4, "e14": .5, "e15": 2.6,
}
recordings = {}
audit = []
for job in jobs:
    raw = json.loads((base / "independent-asr" / f"{job['id']}.json").read_text())
    expected, heard = job["text"].split(), raw["words"]
    if job.get("trailingGuard"):
        raise RuntimeError("Isolate guarded takes and independently transcribe the isolated lines first")
    groups = align(expected, heard)
    if groups is None:
        raise RuntimeError(f"{job['id']}: recognised content differs: {raw['text']!r}")
    merged = []
    for i, j, count, recognised in groups:
        if heard[j + recognised - 1]['end'] <= heard[j]['start'] and merged:
            pi, pj, pc, pr = merged.pop()
            i, j, count, recognised = pi, pj, pc + count, pr + recognised
        merged.append((i, j, count, recognised))
    groups = merged
    samples = pcm(ROOT / job["file"])
    duration = len(samples) / R
    words = []
    for i, j, count, recognised in groups:
        start = max(0, heard[j]["start"])
        end = min(duration, heard[j + recognised - 1]["end"])
        if end <= start:
            raise RuntimeError(f"{job['id']}: empty word interval")
        weights = [len(canonical(x)) for x in expected[i:i + count]]
        total = sum(weights)
        cursor = start
        for text, weight in zip(expected[i:i + count], weights):
            finish = cursor + (end - start) * weight / total
            words.append({"text": text, "type": "word", "start": cursor, "end": finish})
            cursor = finish
    lo, hi = max(0, words[0]["start"] - .16), min(duration, words[-1]["end"] + .24)
    if job.get("preserveCompleteTake"):
        lo, hi = 0, duration
    lo, hi = round(lo * R) / R, round(hi * R) / R
    file = f"{job['id']}-words.json"
    (base / file).write_text(json.dumps({
        "sourceFile": job["file"], "sourceSha256": raw["sourceSha256"],
        "recognisedText": raw["text"], "model": raw["model"],
        "wordTimingBasis": "Independent ASR; joined spellings, number phrases and zero-duration tokens share their recognised phrase span.",
        "excludedTrailingGuard": job.get("excludedTrailingGuard"),
        "words": words,
    }, indent=2) + "\n")
    recordings[job["id"]] = {"sourceFile": job["file"], "words": f"revisions/{revision}/{file}", "sourceStart": lo, "sourceEnd": hi}
    audit.append({"id": job["id"], "completeSpokenContentVerified": True,
                  "fullSourceSeconds": duration, "usedStart": lo, "usedEnd": hi,
                  "firstWord": words[0]["start"], "lastWordEnd": words[-1]["end"],
                  "excludedTrailingGuard": job.get("excludedTrailingGuard"),
                  "selectedTailRms": float(np.sqrt(np.mean(samples[round((hi - .02) * R):round(hi * R)] ** 2))),
                  "afterPause": pauses.get(job["id"], .26), "words": len(words)})
(base / "dialogue-repairs.json").write_text(json.dumps({"lineRecordings": recordings, "afterPause": pauses}, indent=2) + "\n")
(base / "complete-take-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
if revision == 'viewer-v2':
    reused = json.loads((base / 'reused-recordings.json').read_text())
    reused.update(recordings)
    for folder in ['viewer-tails-v2', 'v3']:
        protected = base.parent / folder / 'dialogue-repairs.json'
        if protected.exists():
            reused.update(json.loads(protected.read_text())['lineRecordings'])
    if len(reused) != 97:
        raise RuntimeError('The viewer film requires 97 complete line selections')
    (base / 'recordings.json').write_text(json.dumps(reused, indent=2) + '\n')
print(json.dumps({"completeTakes": len(audit), "words": sum(x["words"] for x in audit), "sourceSeconds": sum(x["fullSourceSeconds"] for x in audit), "usedSeconds": sum(x["usedEnd"] - x["usedStart"] for x in audit)}, indent=2))
