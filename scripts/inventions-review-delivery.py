"""Build reviewed logo corrections and an optional speed trial from a saved delivery."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess
from fractions import Fraction

parser = argparse.ArgumentParser()
parser.add_argument('manifest', type=Path)
parser.add_argument('--prepare', action='store_true')
parser.add_argument('--assemble', action='store_true')
parser.add_argument('--retime-only', action='store_true')
args = parser.parse_args()
cfg = json.loads(args.manifest.read_text())
base = args.manifest.parent
speed = cfg['speed']
duration = cfg['duration']
samples = round(duration * 48000)


def run(command, **kwargs):
    return subprocess.run(command, check=True, **kwargs)


def retime_word(word):
    return {**word, **{key: round(word[key] / speed, 3)
                      for key in ['startMs', 'endMs', 'timestampMs']
                      if isinstance(word.get(key), (int, float))}}


if args.prepare:
    audio_master = Path(cfg['audioMaster'])
    meta_path = Path(cfg.get('audioMetadata', str(base / f'delivery-loudness-{speed:g}x.json')))
    signature = {'sourceSha256': hashlib.sha256(Path(cfg['audioSource']).read_bytes()).hexdigest(),
                 'speed': speed, 'samples': samples}
    cached = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    if not audio_master.exists() or cached.get('signature') != signature:
        tempo = (f'atempo={speed},aresample=48000,apad=whole_len={samples},'
                 f'atrim=end_sample={samples},asetpts=PTS-STARTPTS')
        measured = run(['ffmpeg', '-hide_banner', '-nostats', '-i', cfg['audioSource'],
                        '-af', tempo + ',loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json',
                        '-f', 'null', '-'], capture_output=True, text=True)
        stats = json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}', measured.stderr, re.S)[-1])
        norm = (f'loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={stats["input_i"]}:'
                f'measured_TP={stats["input_tp"]}:measured_LRA={stats["input_lra"]}:'
                f'measured_thresh={stats["input_thresh"]}:offset={stats["target_offset"]}:linear=true')
        run(['ffmpeg', '-v', 'error', '-y', '-i', cfg['audioSource'], '-af',
             tempo + ',' + norm + f',aresample=48000,apad=whole_len={samples},atrim=end_sample={samples}',
             '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', str(audio_master)])
        meta_path.write_text(json.dumps({'signature': signature, 'analysis': stats,
            'method': 'Pitch-preserving atempo on the complete source master, followed by two-pass loudness normalization.',
            'targetLufs': -14, 'targetTruePeakDbfs': -1.5, 'duration': duration,
            'master': str(audio_master)}, indent=2) + '\n')
    folder = Path(cfg['timingFolder'])
    folder.mkdir(parents=True, exist_ok=True)
    words = [retime_word(w) for w in json.loads((base / 'captions.json').read_text())]
    (folder / 'captions.json').write_text(json.dumps(words, indent=2, ensure_ascii=False) + '\n')
    cues = [{**c, 'start': c['start']/speed, 'end': c['end']/speed,
             'words': [retime_word(w) for w in c['words']]}
            for c in json.loads((base / 'caption-cues.json').read_text())]
    (folder / 'caption-cues.json').write_text(json.dumps(cues, indent=2, ensure_ascii=False) + '\n')
    timeline = json.loads((base / 'timeline.json').read_text())
    timeline['duration'] = duration
    timeline['deliverySpeed'] = speed
    timeline['sourceTimeline'] = str(base / 'timeline.json')
    for item in timeline['shots'] + timeline['chapters']:
        for key in ['start', 'localStart', 'duration']:
            if key in item:
                item[key] /= speed
    (folder / 'timeline.json').write_text(json.dumps(timeline, indent=2, ensure_ascii=False) + '\n')
    def stamp(seconds):
        ms = round(seconds*1000)
        return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
    srt = '\n\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n' +
                       ' '.join(w['text'] for w in c['words']) for i,c in enumerate(cues)) + '\n'
    Path(cfg['speedOutput']).with_suffix('.srt').write_text(srt)
    print('Prepared pitch-preserved audio and scaled delivery timestamps.', flush=True)

if args.assemble:
    normal = Path(cfg['normalOutput'])
    fast = Path(cfg['speedOutput'])
    if normal.exists() or fast.exists():
        raise ValueError('Named delivery already exists. Use a new version instead of replacing it.')
    patches = cfg['patches']
    for patch in patches:
        info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=nb_frames,width,height,r_frame_rate', '-of', 'json', patch['file']]))['streams'][0]
        assert int(info['nb_frames']) == patch['endFrameExclusive']-patch['startFrame'], patch
        assert (info['width'],info['height'],info['r_frame_rate']) == (1920,1080,'30/1')
    count = len(patches)+1
    filters = [f'[0:v]split={count}' + ''.join(f'[src{i}]' for i in range(count))]
    pieces = []
    previous = 0
    for i, patch in enumerate(patches):
        a, b = patch['startFrame'], patch['endFrameExclusive']
        filters.append(f'[src{i}]trim=start_frame={previous}:end_frame={a},setpts=PTS-STARTPTS,format=yuv420p[p{i*2}]')
        filters.append(f'[{i+1}:v]trim=end_frame={b-a},setpts=PTS-STARTPTS,format=yuv420p[p{i*2+1}]')
        pieces += [f'[p{i*2}]', f'[p{i*2+1}]']
        previous = b
    filters.append(f'[src{len(patches)}]trim=start_frame={previous}:end_frame={cfg["sourceFrames"]},setpts=PTS-STARTPTS,format=yuv420p[last]')
    pieces.append('[last]')
    filters.append(''.join(pieces)+f'concat=n={len(pieces)}:v=1:a=0,fps={cfg["fps"]},'
                   f'tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame={cfg["sourceFrames"]},'
                   f'setpts=N/({cfg["fps"]}*TB),split=2[normal][tofast]')
    filters.append(f'[tofast]setpts=(PTS-STARTPTS)/{speed},fps={cfg["fps"]}:round=near,'
                   f'tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame={cfg["frames"]},'
                   f'setpts=N/({cfg["fps"]}*TB)[fast]')
    normal_tmp = normal.with_name(normal.stem+'.building.mp4')
    fast_tmp = fast.with_name(fast.stem+'.building.mp4')
    command = ['ffmpeg', '-v', 'error', '-y', '-i', cfg['source']]
    for patch in patches:
        command += ['-i', patch['file']]
    command += ['-i', cfg['audioMaster'], '-filter_complex', ';'.join(filters)]
    codec = ['-c:v', 'libx264', '-preset', 'fast', '-crf', '15', '-threads', '4',
             '-r', str(cfg['fps']), '-pix_fmt', 'yuv420p', '-color_range', 'tv',
             '-colorspace', 'bt709', '-color_trc', 'bt709', '-color_primaries', 'bt709']
    command += ['-map', '[normal]', '-map', '0:a:0', *codec, '-c:a', 'copy',
                '-frames:v', str(cfg['sourceFrames']), '-t', str(cfg['sourceDuration']),
                '-movflags', '+faststart', str(normal_tmp)]
    command += ['-map', '[fast]', '-map', f'{len(patches)+1}:a:0', *codec,
                '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
                '-frames:v', str(cfg['frames']), '-t', str(duration),
                '-movflags', '+faststart', str(fast_tmp)]
    run(command)
    normal_tmp.replace(normal)
    fast_tmp.replace(fast)
    cfg['assembled'] = True
    cfg['method'] = 'Frame-exact local shot replacement; normal and 1.2x outputs encoded from one shared decoded edit. Normal AAC copied; speed audio comes from the pitch-preserved local master.'
    cfg['files'] = {str(f): {'bytes': f.stat().st_size,
        'sha256': hashlib.sha256(f.read_bytes()).hexdigest()} for f in [normal, fast]}
    args.manifest.write_text(json.dumps(cfg, indent=2) + '\n')
    print('Saved normal and speed-trial deliveries.', flush=True)

if args.retime_only:
    target = Path(cfg['speedOutput'])
    if target.exists():
        raise ValueError('Named delivery already exists. Use a new version instead of replacing it.')
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=nb_frames,width,height,r_frame_rate', '-of', 'json', cfg['source']]))['streams'][0]
    assert int(info['nb_frames']) == cfg['sourceFrames']
    assert (info['width'], info['height'], info['r_frame_rate']) == (1920, 1080, '30/1')
    ratio = Fraction(str(speed))
    clock = cfg['fps'] * ratio.numerator
    video_filter = (f'settb=1/{clock},setpts=(PTS-STARTPTS)*{ratio.denominator}/{ratio.numerator},'
                    f'fps={cfg["fps"]}:round=near,tpad=stop_mode=clone:stop_duration=0.1,'
                    f'trim=end_frame={cfg["frames"]},setpts=N/({cfg["fps"]}*TB)')
    temporary = target.with_name(target.stem + '.building.mp4')
    run(['ffmpeg', '-v', 'error', '-y', '-i', cfg['source'], '-i', cfg['audioMaster'],
         '-map', '0:v:0', '-map', '1:a:0', '-vf', video_filter,
         '-c:v', 'libx264', '-preset', 'fast', '-crf', '15', '-threads', '4',
         '-r', str(cfg['fps']), '-pix_fmt', 'yuv420p', '-color_range', 'tv',
         '-colorspace', 'bt709', '-color_trc', 'bt709', '-color_primaries', 'bt709',
         '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
         '-frames:v', str(cfg['frames']), '-t', str(duration), '-movflags', '+faststart', str(temporary)])
    temporary.replace(target)
    cfg['assembled'] = True
    cfg['method'] = f'Fresh {speed:g}x delivery from the corrected normal-speed source; exact rational video clock, pitch-preserved audio and caption times scaled from the selected source take.'
    cfg['files'] = {str(target): {'bytes': target.stat().st_size,
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}}
    args.manifest.write_text(json.dumps(cfg, indent=2) + '\n')
    print('Saved speed-adjusted delivery:', target, flush=True)
