"""Inspect the encoded film, every decoded frame and the prepared audio."""
from pathlib import Path
import argparse
import hashlib
import math
import json
import re
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
B = ROOT / 'episodes/beer-feels-good'
P = ROOT / 'public/episodes/beer-feels-good'

def inspect_landing(video, onset, fps, frame_count):
    """Measure the stationary blue-white glass base in the delivered close-up."""
    contact = math.ceil(onset * fps - 1e-7)
    first = contact - 4
    count, width, height = frame_count - first, 240, 280
    data = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-ss', f'{first / fps:.8f}', '-i', str(video),
        '-an', '-vf', 'format=rgb24,crop=240:280:104:1000', '-frames:v', str(count),
        '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-',
    ])
    frames = np.frombuffer(data, np.uint8).reshape(count, height, width, 3)
    bases = []
    for frame in frames:
        red, green, blue = frame.astype(int).transpose(2, 0, 1)
        rim = (blue > 170) & (green > 172) & (red > 150) & (blue >= red-10) & (green >= red-9)
        y, x = np.where(rim)
        bottom = int(y.max())
        band = x[y >= bottom - 8]
        bases.append([104 + float((band.min()+band.max())/2), 1000 + bottom])
    settled = np.array(bases[contact-first:])
    span = np.ptp(settled, axis=0)
    assert bases[contact-first-1][1] < settled[0,1] - 12, (bases[:6], contact)
    assert span[0] <= 5 and span[1] <= 3, (span, bases)
    return {'crop': [104,1000,width,height], 'decodedContactFrame':contact,
            'priorBaseY':bases[contact-first-1][1], 'contactBaseXY':bases[contact-first],
            'framesAfterContactMeasured':len(settled), 'centreRangePx':float(span[0]),
            'bottomRangePx':int(span[1])}

def inspect_ruler(video, events, fps):
    # The ruler's yellow face is distinct from both hands in this shot. Follow
    # its upper edge until it drops behind the near edge of the table.
    first = math.floor(events['slow']) * fps
    last = math.ceil((events['reactions'] + .58) * fps)
    width, height = 142, 656
    raw = subprocess.check_output([
        'ffmpeg','-v','error','-ss',str(first/fps),'-i',str(video),'-an',
        '-vf','scale=540:960,format=rgb24,crop=142:656:188:0','-frames:v',str(last-first),
        '-pix_fmt','rgb24','-f','rawvideo','-',
    ])
    frames = np.frombuffer(raw,np.uint8).reshape(last-first,height,width,3)
    tops = []
    for frame in frames:
        red, green, blue = frame.astype(int).transpose(2,0,1)
        face = (red > 230) & (green > 209) & (green < 240) & (blue > 98) & (blue < 155)
        rows = np.flatnonzero(face.sum(axis=1) >= 9)
        tops.append(int(rows[0])*2 if len(rows) else None)
    passed = next(first+i for i,y in enumerate(tops) if y is not None and y > 748)
    hidden = next(first+i for i,y in enumerate(tops) if first+i > passed and y is None)
    contact = math.ceil((events['reactions']+.13)*fps-1e-7)
    assert passed + 5 < contact and all(y is None for y in tops[hidden-first:])
    return {'firstFrameRulerClearsClosingFingers':passed,'fingersClosedFrame':contact,
            'clearanceLeadSeconds':(contact-passed)/fps,'firstFrameFullyOccluded':hidden}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', choices=['v1','v2'], default='v2')
    version = parser.parse_args().version
    video = ROOT / 'renders/beer-feels-good' / f'beer-feels-good-{version}.mp4'
    episode=json.loads((B/'episode.json').read_text())
    expected=round(episode['duration']*episode['fps'])
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
    stream=next(s for s in probe['streams'] if s['codec_type']=='video')
    assert [stream['width'],stream['height']]==[1080,1920]
    assert stream['r_frame_rate']=='60/1'
    assert int(stream['nb_frames'])==expected
    assert stream['pix_fmt']=='yuv420p'
    assert abs(float(stream['duration'])-episode['duration'])<.03
    assert any(s['codec_type']=='audio' for s in probe['streams'])

    process=subprocess.Popen(['ffmpeg','-v','error','-i',str(video),'-vf','scale=144:256','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    size=144*256*3
    frame=0;damaged=[];uniform=[];means=[];maximum_black=0
    while True:
        data=process.stdout.read(size)
        if not data:break
        assert len(data)==size
        picture=np.frombuffer(data,np.uint8).reshape(256,144,3)
        black=float(np.mean(np.max(picture,axis=2)<5))
        maximum_black=max(maximum_black,black)
        if black>.03:damaged.append({'frame':frame,'blackFraction':black})
        if float(np.std(picture.astype(np.float32)))<2.5:uniform.append(frame)
        means.append(float(np.mean(picture)))
        frame+=1
    error=process.stderr.read().decode(errors='replace');code=process.wait()
    assert code==0,error
    assert frame==expected
    assert not damaged,damaged[:12]
    assert not uniform,uniform[:12]

    audio=subprocess.run(['ffmpeg','-hide_banner','-i',str(video),'-af','loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json','-f','null','-'],capture_output=True,text=True)
    loudness=json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}',audio.stderr,re.S)[-1])
    assert float(loudness['input_tp'])<=-1.0,loudness
    words=json.loads((B/'transcript-source.json').read_text())['words']
    script=(B/'narration.txt').read_text().split()
    normal=lambda x:re.sub('[^a-z0-9]','',x.lower())
    assert [normal(w['text']) for w in words]==[normal(w) for w in script]
    assert all(w['end']>w['start']>=0 for w in words)
    assert words[-1]['end']<=episode['duration']
    layout=json.loads((B/'assets/miko-layout.json').read_text())
    assets={k:{'frameCount':v['frameCount'],'clipping':v['clipping'],'minimumTopMargin':v['minimumTopMargin'],'minimumBottomMargin':v['minimumBottomMargin']} for k,v in layout['animations'].items()}
    assert all(not a['clipping'] for a in assets.values())
    result={'status':'pass','file':str(video.relative_to(ROOT)),'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'picture':{'width':1080,'height':1920,'fps':60,'frames':frame,'duration':float(stream['duration']),'pixelFormat':stream['pix_fmt'],'colourSpace':stream.get('color_space')},'audio':{'integratedLufs':float(loudness['input_i']),'truePeakDbtp':float(loudness['input_tp']),'loudnessRange':float(loudness['input_lra']),'listened':False},'frameScan':{'decodedFrames':frame,'blackCaptureThreshold':.03,'maximumNearBlackFraction':maximum_black,'damagedCaptureFrames':damaged,'uniformFrames':uniform,'method':'Every decoded frame at 144×256. This dark-colour design contains no near-black full-frame blocks; those would indicate a damaged browser capture.'},'captionWords':len(words),'nativeActions':assets,'userApproved':False}
    encoded = json.loads((B / f'transcript-encoded-{version}.json').read_text())
    assert [normal(w['word']) for w in encoded['words']] == [normal(w) for w in script]
    states = json.loads((B / 'caption-display-states.json').read_text())['states']
    assert len(states) == len(words)
    assert all(math.ceil(c['endMs'] * episode['fps'] / 1000 - 1e-7) >
               math.ceil(c['startMs'] * episode['fps'] / 1000 - 1e-7) for c in states)
    result.update(independentlyTranscribedWords=len(encoded['words']), captionStates=len(states))
    if version == 'v2':
        performances = json.loads((B/'assets/performances-v2.json').read_text())
        edit = json.loads((B/'edit.json').read_text())
        cues = json.loads((B/'motion-audio-cues.json').read_text())
        land = edit['events']['land']
        assert land == words[-1]['start']
        assert all(next(c for c in cues if c['id'] == name)['start'] == land
                   for name in ['mug-lands-beside-coaster', 'glass-rim-at-contact'])
        for art in performances.values():
            actual = hashlib.sha256((ROOT/'public'/art['atlas']).read_bytes()).hexdigest()
            assert art['frames'] == 12 and art['frameMs'] == 100 and actual == art['atlasSha256']
        result['newPerformances'] = {k: {'nativeFrames': v['frames'], 'frameMs': v['frameMs'],
                                        'framing': v['staging']} for k,v in performances.items()}
        result['closingContact'] = {'word': words[-1]['text'], 'spokenOnsetSeconds': land,
                                    'firstDisplayedFrameZeroBased': math.ceil(land * episode['fps'] - 1e-7),
                                    'nativeContactCellZeroBased': performances['setdown']['contactCell'],
                                    'effectsStartSeconds': land}
        result['closingContact']['encodedGlass'] = inspect_landing(video, land, episode['fps'], expected)
        result['rulerDrop'] = inspect_ruler(video, edit['events'], episode['fps'])
    (B/f'export-review-{version}.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))


if __name__=='__main__':main()
