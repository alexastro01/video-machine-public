"""Append a voiced comment and file-reply animation to a paced presenter cut."""
import hashlib
import json
import math
import sys
import tempfile
from pathlib import Path

import numpy as np

from dialogue_media import ROOT, R, pcm, run, wav


def read(path):
    return json.loads(path.read_text())


def write(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')


def paced_file(source, destination, rate, samples=None, fade_tail=False):
    chain = f'atempo={rate:g}'
    if samples is not None:
        chain += f',apad=whole_len={samples},atrim=end_sample={samples},asetpts=N/SR/TB'
        if fade_tail:
            fade_samples = min(round(.006*R), samples)
            chain += f',afade=t=out:ss={samples-fade_samples}:ns={fade_samples}'
    run(['ffmpeg','-v','error','-y','-i',str(source),'-af',chain,'-ar',str(R),
         '-c:a','pcm_s24le' if samples is not None else 'pcm_s16le',str(destination)])


def join_audio(first, second, out, channels):
    run(['ffmpeg','-v','error','-y','-i',str(first),'-i',str(second),'-filter_complex',
         '[0:a][1:a]concat=n=2:v=0:a=1[a]','-map','[a]','-ar',str(R),'-ac',str(channels),
         '-c:a','pcm_s24le',str(out)])


slug, variant = sys.argv[1:]
base = ROOT/'episodes'/slug
revision = base/'variants'/variant
media = ROOT/'public/episodes'/slug
out = media/variant
out.mkdir(exist_ok=True)
spec = read(revision/'closing.json')
episode = read(base/'episode.json')
edit = episode['presenterEdit']
fps, rate = episode['fps'], spec['rate']
lead = spec['pickupLeadFrames']/fps
alignment = read(revision/'pickup-words.json')
line = alignment['words']
if spec['line'].split() != [w['text'] for w in line]:
    raise ValueError('The comment script differs from the selected recording')
body_frames = round(episode['duration']*fps/rate)
join = body_frames
if 'gapAfterLastWordFrames' in spec:
    last_word_end = edit['words'][-1]['end'] / rate
    first_word_onset = lead + line[0]['start']
    join = round((last_word_end - first_word_onset)*fps + spec['gapAfterLastWordFrames'])
    if not last_word_end <= join/fps <= body_frames/fps:
        raise ValueError('The join must preserve the last spoken word and fit the source picture')
join_sec = join/fps
voiced = [dict(text=w['text'],start=round(join_sec+lead+w['start'],6),end=round(join_sec+lead+w['end'],6)) for w in line]
frames = math.ceil(voiced[-1]['end']*fps) + spec['holdAfterSpeechFrames']
duration = frames/fps
samples = round((frames-join)*R/fps)
body_samples = round(join*R/fps)
start_of = lambda i: round(voiced[i]['start']*fps)
typed = voiced[spec['keywordWord']]
if typed['text'].strip('“”"').lower()!=spec['keyword']:
    raise ValueError('Spoken and typed keywords differ')
typing = np.rint(np.linspace(typed['start']*fps,typed['end']*fps,len(spec['keyword']))).astype(int).tolist()
post = start_of(spec['postWord'])
attach = start_of(spec['attachmentWord'])
if not join < typing[0] < typing[-1] < post < attach < frames:
    raise ValueError('The comment must be complete before sending and receiving the file')
for asset in ('thumbnail','backThumbnail'):
    if not (media/spec[asset]).is_file():
        raise ValueError(f'Missing attachment thumbnail {spec[asset]}')
# Recover the exact first destination frame that samples the source caption.
def scaled_ms(ms):
    first_source = math.ceil(ms*fps/1000-1e-8)
    first_output = max(0,math.ceil((first_source-.5)/rate-1e-8))
    return first_output*1000//fps

words = [dict(text=w['text'],start=scaled_ms(round(w['start']*1000))/1000,end=scaled_ms(round(w['end']*1000))/1000) for w in edit['words']]
captions = [dict(c,startMs=scaled_ms(c['startMs']),endMs=scaled_ms(c['endMs']),timestampMs=scaled_ms(c['startMs'])) for c in read(base/'captions.json')]
captions[-1]['endMs'] = min(captions[-1]['endMs'], round(voiced[0]['start']*1000))
words.extend(voiced)
first = 0
for last in spec['captionEnds']:
    start = round(voiced[first]['start']*1000)
    if last+1 < len(voiced):
        end_ms = round(min(voiced[last]['end']+.23, voiced[last+1]['start'])*1000)
    else:
        end_ms = frames*1000//fps
    captions.append({'text':' '.join(w['text'] for w in voiced[first:last+1]),'startMs':start,'endMs':end_ms,'timestampMs':start,'confidence':None})
    first = last+1
if first != len(voiced):
    raise ValueError('Uncaptioned closing words')

with tempfile.TemporaryDirectory() as temp_dir:
    tmp=Path(temp_dir)
    pickup=out/'paced-pickup.wav'
    recording=read(revision/'voice-provenance.json')
    paced_file(out/'source-alex-comment.mp3',pickup,recording['tempo'])
    if hashlib.sha256(pickup.read_bytes()).hexdigest()!=alignment['sha256']:
        raise ValueError('Re-align the new delivery take before preparing its captions')
    speech=pcm(pickup)
    voice=np.zeros(samples,'f4')
    offset=round(lead*R)
    if offset+len(speech)>samples:
        raise ValueError('Closing hold does not contain the entire pickup')
    voice[offset:offset+len(speech)]=speech
    effects=np.zeros_like(voice)
    events=[('enter',join+5,1), *[('key',f,k) for f,k in zip(typing,[.72,.85,.7,1,.78,.91])], ('post',post,1),('attachment',attach+2,1)]
    ledger=[]
    for name,frame,level in events:
        sound=spec['sounds'][name]
        filename=Path(sound['file']).name
        local=revision/'sfx'/filename
        if not local.is_file():
            local=base/'sources/sfx'/filename
        raw=pcm(local)[round(sound['in']*R):round(sound['out']*R)].copy()
        edge=min(70,len(raw)//4)
        raw[:edge]*=np.linspace(0,1,edge)
        raw[-edge:]*=np.linspace(1,0,edge)
        at=round(((frame-join)/fps - (sound['accent']-sound['in']))*R)
        if at<0 or at+len(raw)>samples: raise ValueError(f'Uncontained sound cue {name}')
        effects[at:at+len(raw)]+=raw/np.max(np.abs(raw))*sound['peak']*level
        ledger.append({'action':name,'frame':frame,'seconds':round(frame/fps,6),'file':sound['file'],
                       'sourceIn':sound['in'],'sourceOut':sound['out'],'sourceAccent':sound['accent'],
                       'gainPeak':round(sound['peak']*level,4),'sha256':hashlib.sha256(local.read_bytes()).hexdigest()})
    for name,tail in [('narration',voice),('effects',effects),('music',np.zeros_like(voice))]:
        paced_file(media/f'{name}.wav',tmp/'body.wav',rate,body_samples,fade_tail=join < body_frames)
        wav(tmp/'tail.wav',tail)
        join_audio(tmp/'body.wav',tmp/'tail.wav',out/f'{name}.wav',1)
    wav(tmp/'premix.wav',voice+effects)
    run(['ffmpeg','-v','error','-y','-i',str(tmp/'premix.wav'),'-af',
         'pan=stereo|c0=c0|c1=c0,loudnorm=I=-16.5:TP=-2:LRA=8','-ar',str(R),'-c:a','pcm_s24le',str(tmp/'tail-mix.wav')])
    paced_file(media/'mix.wav',tmp/'body-mix.wav',rate,body_samples,fade_tail=join < body_frames)
    join_audio(tmp/'body-mix.wav',tmp/'tail-mix.wav',out/'mix.wav',2)
    source_join_frame = math.floor(join * rate + .5)
    first_pickup_mouth_tick = source_join_frame * 30 // fps
    del edit['mouth'][first_pickup_mouth_tick:]
    for tick in range(len(edit['mouth']),math.ceil(duration*rate*30)+1):
        center=round(((tick+.5)/30/rate-join_sec)*R)
        section=voice[max(0,center-640):min(len(voice),center+640)] if center+640>0 else []
        rms=np.sqrt(np.mean(section**2)) if len(section) else 0.
        edit['mouth'].append(int(np.searchsorted([.018,.061,.132],rms)))

edit['accents'] = [frame for frame in edit['accents'] if frame < source_join_frame]
edit['blinks'] = [frame for frame in edit['blinks'] if frame < source_join_frame]
edit['accents'].extend(round(start_of(i)*rate) for i in spec['accentWords'])
edit['blinks'].append(round((attach-7)*rate))
edit.update(words=words,sourceRate=rate,mixFile=f'{variant}/mix.wav',commentEnding={
    'start':join,'typingFrames':typing,'postFrame':post,'fileFrame':attach,
    **{key:spec[key] for key in ('keyword','speaker','fileTitle','fileDetail','thumbnail','backThumbnail')}})
for scene in episode['scenes']:
    scene['start']/=rate
    scene['duration']/=rate
episode['scenes'][-1]['duration']=join_sec-episode['scenes'][-1]['start']
episode['scenes'].append({'id':'comment-resources','label':'Comment and reply','set':'developer-ui','action':'tap','anchor':line[0]['text'],'start':join_sec,'duration':duration-join_sec})
episode['duration']=duration
episode['audio']={**{n:f'episodes/{slug}/{variant}/{n}.wav' for n in ('narration','music','effects')},'narrationOffset':0,'narrationTail':duration-voiced[-1]['end']}
write(revision/'episode.json',episode)
write(revision/'captions.json',captions)
write(revision/'transcript-source.json',{'rate':rate,'words':words})
write(revision/'closing-sounds.json',ledger)
(revision/'narration.txt').write_text((base/'narration.txt').read_text().rstrip()+'\n\n'+spec['line']+'\n')
print(f'{frames} final frames at {fps} fps, {duration:.2f}s with the comment at {join_sec:.2f}s')
