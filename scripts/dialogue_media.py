"""Assemble reusable, exact-take multi-character dialogue and word timing."""
from pathlib import Path
import json, math, re, subprocess, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
R = 48000


def run(args):
    result = subprocess.run(args, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors='replace')[-5000:])
    return result.stdout


def pcm(file):
    return np.frombuffer(run(['ffmpeg', '-v', 'error', '-i', str(file), '-f', 'f32le', '-ac', '1', '-ar', str(R), '-']), '<f4').copy()


def wav(file, audio):
    # Preserve the waveform when RMS matching raises a transient above full
    # scale. The later loudness pass handles final gain and true-peak limiting.
    peak = float(np.max(np.abs(audio), initial=0))
    gain = min(1.0, .98 / max(.98, peak))
    with wave.open(str(file), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(R)
        f.writeframes((audio * gain * 32767).astype('<i2').tobytes())


def normal(text):
    return re.sub('[^a-z0-9]', '', text.lower())


def assemble(slug):
    base = ROOT / 'episodes' / slug
    public = ROOT / 'public/episodes' / slug
    public.mkdir(parents=True, exist_ok=True)
    spec = json.loads((base / 'dialogue.json').read_text())
    rate = spec.get('narrationSpeed', 1)
    if not .8 <= rate <= 1.2:
        raise RuntimeError('Dialogue speed must stay within the 20% retiming limit')
    sources = {}
    for speaker, voice in spec['voices'].items():
        file = ROOT / voice['sourceFile'] if voice.get('sourceFile') else public / f'source-{speaker}-take-{voice["take"]}.mp3'
        if not file.resolve().is_relative_to(public.resolve()):
            raise RuntimeError(f'Voice source must stay inside {public}')
        source = json.loads((base / voice['words']).read_text())
        words = [w.copy() for w in source['words'] if w.get('type', 'word') == 'word']
        skipped = words[:voice.get('skipLeadingTranscriptTokens', 0)]
        words = words[voice.get('skipLeadingTranscriptTokens', 0):]
        expected = [w for line in spec['lines'] if line['speaker'] == speaker for w in line['text'].split()]
        if len(words) != len(expected):
            raise RuntimeError(f'{speaker}: script has {len(expected)} words; transcript has {len(words)}')
        for word, text in zip(words, expected):
            if normal(word['text']) != normal(text):
                raise RuntimeError(f'{speaker}: transcript mismatch {word["text"]!r} / {text!r}')
            word['text'] = text
        sources[speaker] = {'file': str(file.relative_to(ROOT)), 'samples': pcm(file), 'words': words, 'cursor': 0, 'trim': voice.get('sourceTrimStart', 0), 'skipped': skipped, 'preserveLeadingAudio': voice.get('preserveLeadingAudio', False)}
    cursor = 0
    lines, segments, captions, edits = [], [], [], []
    for index, line in enumerate(spec['lines']):
        recording = spec.get('lineRecordings', {}).get(line['id'])
        speed = recording.get('speed', rate) if recording else rate
        if not .8 <= speed <= 1.2:
            raise RuntimeError(f'{line["id"]}: dialogue speed must stay within the 20% retiming limit')
        count, offset = len(line['text'].split()), 0
        if recording:
            source_file = recording['sourceFile']
            if line['speaker'] in sources:
                sources[line['speaker']]['cursor'] += count
        else:
            source = sources[line['speaker']]
            offset = source['cursor']
            words = source['words'][offset:offset + count]
            source['cursor'] += count
            source_file = source['file']
        if recording:
            file = ROOT / recording['sourceFile']
            if not file.resolve().is_relative_to(public.resolve()):
                raise RuntimeError(f'Line recording must stay inside {public}')
            timed_words = recording.get('wordTimings')
            if timed_words is None:
                timed_words = json.loads((base / recording['words']).read_text())['words']
            words = [w.copy() for w in timed_words if w.get('type', 'word') == 'word']
            expected = line['text'].split()
            if len(words) != count or any(normal(w['text']) != normal(t) for w, t in zip(words, expected)):
                raise RuntimeError(f'{line["id"]}: complete-take transcript does not match the spoken script')
            for word, text in zip(words, expected):
                word['text'] = text
            # A recording may be a standalone line or an aligned excerpt from a longer take.
            # Its source handles must contain every selected word boundary.
            samples = pcm(file)
            start = recording.get('sourceStart', 0)
            end = recording.get('sourceEnd', len(samples) / R)
            if not 0 <= start < end <= len(samples) / R + 1 / R:
                raise RuntimeError(f'{line["id"]}: invalid standalone recording window')
            if start > words[0]['start'] + 1 / R or end < words[-1]['end'] - 1 / R:
                raise RuntimeError(f'{line["id"]}: recording window cuts inside a spoken word')
            chunk = samples[round(start * R):round(end * R)]
            source_file = str(file.relative_to(ROOT))
        else:
            first, last = words[0]['start'], words[-1]['end']
            prior = source['words'][offset - 1]['end'] if offset else source['trim']
            next_start = source['words'][offset + count]['start'] if offset + count < len(source['words']) else len(source['samples']) / R
            lo = (prior + first) / 2 if offset else source['trim']
            hi = (last + next_start) / 2
            chunk = source['samples'][round(lo * R):round(hi * R)]
            active = np.flatnonzero(np.abs(chunk) > .0032)
            if not len(active):
                raise RuntimeError(f'Silent line: {line["id"]}')
            a, z = max(0, int(active[0]) - round(.009 * R)), min(len(chunk), int(active[-1]) + round(.045 * R))
            if offset == 0 and source['preserveLeadingAudio']:
                a = 0
            start, end = lo + a / R, lo + z / R
            chunk = chunk[a:z]
        original = public / f'line-{index:02d}-source.wav'
        target = public / f'line-{index:02d}.wav'
        wav(original, chunk)
        if speed == 1:
            # atempo is unnecessary at unity and can discard a short audio tail.
            target.write_bytes(original.read_bytes())
        else:
            audio_filter = f'atempo={speed}'
            if recording and 'speed' in recording:
                # Give atempo a silent processing tail so its last window can emit the end of the word.
                frame_count = round(len(chunk) / speed)
                audio_filter = f'apad=pad_dur=0.16,{audio_filter},apad,atrim=end_sample={frame_count}'
            run(['ffmpeg', '-v', 'error', '-y', '-i', str(original), '-af', audio_filter, '-ar', str(R), '-ac', '1', str(target)])
        audio = pcm(target)
        if recording:
            edge = min(round(.005 * R), len(audio) // 2)
            audio[:edge] *= np.linspace(0, 1, edge)
            audio[-edge:] *= np.linspace(1, 0, edge)
        seconds = len(audio) / R
        rms = float(np.sqrt(np.mean(audio ** 2)))
        audio *= min(2.5, .13 / max(.001, rms))
        row = {**line, 'start': cursor, 'end': cursor + seconds, 'duration': seconds, 'words': []}
        for word in words:
            at = cursor + max(0, (word['start'] - start) / speed)
            finish = min(cursor + seconds, cursor + max(.012, (word['end'] - start) / speed))
            if finish <= at:
                raise RuntimeError(f'Word outside trimmed performance: {word["text"]}')
            row['words'].append({'text': word['text'], 'start': round(at, 6), 'end': round(finish, 6), 'speaker': line['speaker'], 'line': line['id']})
            display = spec.get('captionReplacements', {}).get(word['text'], word['text'])
            captions.append({'text': display, 'startMs': round(at * 1000), 'endMs': round(finish * 1000), 'timestampMs': round(at * 1000), 'confidence': None})
        lines.append(row)
        segments.extend([audio, np.zeros(round(line['afterPause'] * R))])
        edits.append({'line': line['id'], 'speaker': line['speaker'], 'source': source_file, 'sourceStart': start, 'sourceEnd': end, 'outputStart': cursor, 'outputEnd': cursor + seconds, 'speed': speed, 'completeTake': recording.get('completeTake', True) if recording else False, 'skippedLeadingTranscriptTokens': source['skipped'] if not offset and not recording else []})
        cursor += seconds + line['afterPause']
    fps = spec.get('fps', 30)
    duration = math.ceil(cursor * fps) / fps
    samples = round(duration * R)
    narration = np.concatenate(segments)
    narration = np.pad(narration, (0, max(0, samples - len(narration))))[:samples]
    wav(public / 'narration-raw.wav', narration)
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(public / 'narration-raw.wav'), '-af', 'loudnorm=I=-16:TP=-2:LRA=8', '-ar', str(R), '-ac', '2', str(public / 'narration.wav')])
    result = {'id': slug, 'fps': fps, 'duration': duration, 'frames': round(duration * fps), 'narrationSpeed': rate, 'lines': lines}
    for file, data in [('dialogue-timeline.json', result), ('captions.json', captions), ('audio-edit.json', edits), ('transcript-source.json', {'sourceTake': {s: v['take'] for s, v in spec['voices'].items()}, 'words': [w for line in lines for w in line['words']]})]:
        (base / file).write_text(json.dumps(data, indent=2) + '\n')
    return spec, result, narration
