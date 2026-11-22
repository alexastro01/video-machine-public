"""Prepare a local, frame-addressed presenter edit from the episode's sound and picture plan."""
import hashlib
import json
import math
from pathlib import Path
import shutil
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image, ImageOps

from dialogue_media import ROOT, R, pcm, run, wav


def read(file):
    return json.loads(file.read_text())


def save(file, value):
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def source_frames(item):
    name, spec = item
    original = source / spec['source']
    dest = media / name
    dest.mkdir(exist_ok=True)
    settings = {**spec, 'sha256': digest(original), 'quality': 2}
    stamp = dest / 'source.json'
    if not stamp.exists() or read(stamp) != settings or not (dest / '00001.jpg').exists():
        for old in dest.glob('*.jpg'):
            old.unlink()
        run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(spec['in']),
             '-i', str(original), '-t', str(spec['out'] - spec['in']), '-an',
             '-vf', f"fps={spec['rate']},scale={spec['width']}:-2:flags=lanczos",
             '-threads', '2', '-q:v', '2', str(dest / '%05d.jpg')])
        save(stamp, settings)
    files = sorted(dest.glob('*.jpg'))
    if len(files) < math.floor((spec['out'] - spec['in']) * spec['rate']) - 1:
        raise ValueError(f'Incomplete clip {name}')
    size = Image.open(files[0]).size
    return name, {'file': f'media/{name}', 'frames': len(files), 'rate': spec['rate'], 'pixels': size}


def eye_plate(actor, openness):
    # Compress the actual illustrated iris and lash into a blink, keeping the
    # canthi fixed and extending the adjacent painted skin into the upper lid.
    original = np.asarray(actor.convert('RGBA'))
    touched = np.zeros_like(original)
    eyes = [
        [(368,264,267),(373,257,270),(381,252,276),(392,247,281),(405,242,281),(419,237,278),(430,232,273),(439,231,268),(444,232,257)],
        [(487,231,235),(492,219,247),(501,212,252),(510,206,253),(520,204,251),(529,204,248),(536,207,243),(540,213,233)]
    ]
    for points in eyes:
        px, tops, bottoms = np.array(points).T
        for x in range(px[0],px[-1]+1):
            top = int(np.interp(x, px, tops)); bottom = int(np.interp(x, px, bottoms))
            edge = min(1., (x-px[0])/4, (px[-1]-x)/4)
            y = np.arange(top, bottom+1)
            closure = 1 - edge*(1-openness)
            lid = bottom - (bottom-top)*closure
            # The skin in this drawing is flat ink. Sampling each dark lash
            # column separately leaves vertical bands when the eyelid closes.
            skin = np.array([252,176,119,255], dtype=np.uint8)
            touched[max(0,top-3):top,x,:] = skin
            for yy in y:
                if yy < lid:
                    u = (yy-top) / max(1,bottom-top)
                    col = np.array([252-4*u,176-7*u,119-5*u,255], dtype=np.uint8)
                else:
                    sy = int(np.clip(top+(yy-lid)/max(.04,closure),top,bottom))
                    col = original[sy,x,:]
                touched[yy,x,:] = col
            if openness < .16 and edge > .6:
                line = round(top + .80*(bottom-top))
                touched[line-1:bottom+3,x,:] = skin
                touched[line-1:line+2,x,:] = [56,31,23,255]
    return Image.fromarray(touched).crop((360,198,548,288))


def actor_rig():
    dest = media / 'alex'
    dest.mkdir(exist_ok=True)
    base = source / 'alex'
    actor = Image.open(base / 'alex.webp').convert('RGBA')
    stamp = dest / 'rig.json'
    signature = {'source': digest(base / 'alex.webp'), 'version': 3}
    if stamp.exists() and read(stamp) == signature and (dest / 'pose-16.webp').exists():
        return
    for position in ('rest','small','mid'):
        shutil.copyfile(base / f'alex-{position}.webp', dest / f'{position}.webp')
    for name, openness in [('half',.54),('shut',.08)]:
        eye_plate(actor, openness).save(dest / f'blink-{name}.webp', lossless=True)
    xs = [0,600,650,695,746,804,864,924,980,1024]
    ys = [0,390,494,560,610,680,760,835,907,976,1024]
    def remap(x, y, lift):
        hand = max(0, min(1,(x-642)/366))
        shoulder = max(0,min(1,(y-485)/165))
        return x, y+lift*hand**1.2*shoulder
    for idx in range(17):
        lift = (idx-8)*3.0
        mesh = [
            ((x0,y0,x1,y1),tuple(v for x,y in [(x0,y0),(x0,y1),(x1,y1),(x1,y0)] for v in remap(x,y,lift)))
            for x0,x1 in zip(xs,xs[1:]) for y0,y1 in zip(ys,ys[1:])
        ]
        pose = actor.transform(actor.size,Image.Transform.MESH,mesh,Image.Resampling.BICUBIC)
        pose.save(dest / f'pose-{idx:02d}.webp',lossless=True,method=2)
    save(stamp,signature)


def audio_master():
    original = public / 'source-alex-take-1.mp3'
    narration = public / 'narration.wav'
    if not narration.exists() or digest(narration) != alignment['sha256']:
        run(['ffmpeg','-nostdin','-v','error','-y','-i',str(original),'-af',
             f"atempo={plan['narrationSpeed']},apad,atrim=duration={duration}",'-c:a','pcm_s16le','-ar',str(R),'-ac','1',str(narration)])
    if digest(narration) != alignment['sha256']:
        raise ValueError('Edited audio changed since the selected word alignment')
    voice = pcm(narration)
    effects = np.zeros(len(voice), np.float32)
    lib = read(ROOT / 'channel/references/fasteditor-cinematic-sfx.json')
    local = source / 'sfx'
    local.mkdir(exist_ok=True)
    sounds, cues = {}, []
    for name, spec in plan['sounds'].items():
        relative = spec['file']
        file = local / Path(relative).name
        if not file.exists():
            shutil.copyfile(Path(lib['libraryRoot']) / relative, file)
        data = pcm(file)
        active = np.flatnonzero(np.abs(data) > max(np.max(np.abs(data))*.075,.002))
        if not len(active):
            raise ValueError(f'Silent sound effect {name}')
        peak_sample = np.argmax(abs(data))
        start = spec.get('in',max(0,active[0]/R-.004))
        end = min(len(data)/R,spec.get('out',active[-1]/R+.023))
        accent = spec.get('accent',peak_sample/R)
        samples = data[round(start*R):round(end*R)].copy()
        fade=min(len(samples)//3,round(.003*R))
        if fade:
            samples[:fade]*=np.linspace(0,1,fade)
            samples[-fade:]*=np.linspace(1,0,fade)
        sounds[name]=(samples/max(np.max(abs(samples)),.001),accent-start,
                      {'libraryFile':relative,'sha256':digest(file),'sourceIn':round(start,6),'sourceOut':round(end,6),'sourceAccent':round(accent,6)})
    for cue in plan['soundCues']:
        samples, lead, provenance = sounds[cue['sound']]
        event = (frame(cue['word'])/fps) + cue.get('offset',0)
        start = round(R*(event-lead))
        if start < 0 or start+len(samples)>len(effects):
            raise ValueError(f'Effect outside edit {cue}')
        effects[start:start+len(samples)] += samples*cue['peak']
        cues.append({**cue,**provenance,'outputStart':round(start/R,6),'visualAccent':round(event,6)})
    wav(public/'effects.wav',effects)
    wav(public/'music.wav',np.zeros(len(voice),np.float32))
    # Keep the voice and interface effects centered in the stereo delivery.
    with tempfile.TemporaryDirectory() as td:
        dry = Path(td) / 'premix.wav'
        wav(dry,voice+effects)
        run(['ffmpeg','-v','error','-y','-i',str(dry),'-af',
             'pan=stereo|c0=c0|c1=c0,loudnorm=I=-16:TP=-2:LRA=8','-ar',str(R),'-c:a','pcm_s24le',str(public/'mix.wav')])
    save(base/'sound-cues.json',cues)
    mouth=[]
    for tick in range(round(duration*30)):
        center = int((tick+.5)*R/30)
        sample = voice[max(0,center-640):center+640]
        level = np.sqrt(np.mean(sample**2)) if len(sample) else 0.
        mouth.append(int(np.searchsorted([.018,.061,.132],level)))
    return mouth


def caption_groups():
    parts=[]
    first=0
    for last in plan['captionBreaks']:
        if not first<=last<len(words):
            raise ValueError('Caption group outside transcript')
        end = min(duration, words[last]['end'] + (.83 if last==len(words)-1 else .24),
                  words[last+1]['start'] if last+1<len(words) else duration)
        start = round(words[first]['start']*1000)
        parts.append(dict(text=' '.join(v['text'] for v in words[first:last+1]),startMs=start,
                          endMs=round(end*1000),timestampMs=start,confidence=None))
        first=last+1
    if first != len(words):
        raise ValueError('Transcript missing from caption groups')
    return parts


if __name__ == '__main__':
    slug = sys.argv[1]
    base = ROOT/'episodes'/slug
    public = ROOT/'public/episodes'/slug
    source = base/'sources'
    media = public/'media'
    media.mkdir(parents=True,exist_ok=True)
    plan = read(base/'plan.json')
    episode = read(base/'episode.json')
    alignment = read(base/'voices/alex-edit-aligned.json')
    words = alignment['words']
    if [w['text'] for w in words] != (base/'narration.txt').read_text().split():
        raise ValueError('Edited transcript and approved script differ')
    fps, duration = plan['fps'], plan['duration']
    def frame(word):
        return round(words[word]['start']*fps)
    with ThreadPoolExecutor(max_workers=3) as pool:
        assets = dict(pool.map(source_frames,plan['clips'].items()))
    for name,spec in plan['images'].items():
        picture=Image.open(source/spec['source']).convert('RGB')
        if 'crop' in spec:
            picture=picture.crop(tuple(spec['crop']))
        if 'padding' in spec:
            picture=ImageOps.expand(picture,border=tuple(spec['padding']),fill=picture.getpixel((picture.width-1,0)))
        file=f'media/{name}.png'
        picture.save(public/file)
        assets[name]={'file':file,'frames':0,'rate':0,'pixels':picture.size}
    actor_rig()
    mouth=audio_master()
    shots=[]
    for index,spec in enumerate(plan['shots']):
        cam=[{'frame':(frame(w) if w else 0)+round((offset[0] if offset else 0)*fps),'x':x,'y':y,'zoom':z} for w,x,y,z,*offset in spec['camera']]
        mark=spec.get('mark')
        shots.append({**assets[spec['asset']],'name':spec['asset'],'start':frame(spec['word']) if index else 0,
                      'width':spec['size'][0],'height':spec['size'][1],'speed':spec.get('speed',1),
                      'cutStyle':spec['transition'],'address':spec.get('address',''),'camera':cam,
                      **({'mark':{**mark,'frame':frame(mark['word'])}} if mark else {})})
    edit={'shots':shots,'words':words,'mouth':mouth,'accents':[frame(i) for i in plan['accentWords']],
          'blinks':[round(t*fps) for t in plan['blinks']],'warmFrame':frame(plan['warmWord'])}
    episode['presenterEdit']=edit
    for n,(id,word,action) in enumerate(plan['scenes']):
        start=frame(word)/fps if n else 0
        end=frame(plan['scenes'][n+1][1])/fps if n+1<len(plan['scenes']) else duration
        episode['scenes'][n].update(id=id,label=id,anchor=words[word]['text'],action=action,start=start,duration=end-start)
    save(base/'episode.json',episode)
    save(base/'captions.json',caption_groups())
    save(base/'transcript-source.json',{'source':alignment['source'],'sha256':alignment['sha256'],'words':words})
    print(f"{len(shots)} shots, {len(words)} timed words, {len(plan['soundCues'])} FASTEDITOR cues, {duration}s")
