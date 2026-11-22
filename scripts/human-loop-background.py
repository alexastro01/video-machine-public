"""Prepare the slow charcoal wax loop from the OpenAI animation's silhouettes."""
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageSequence
from scipy.ndimage import distance_transform_edt, gaussian_filter

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'episodes/human-in-the-loop/background-v2.json').read_text())


def source_shapes(path):
    with Image.open(path) as source:
        pictures = [np.asarray(frame.convert('L'), dtype=np.float32) for frame in ImageSequence.Iterator(source)]
    dark, light = np.percentile(np.stack(pictures), [15, 90])
    result = []
    for picture in pictures:
        inside = gaussian_filter(picture, 3) > (dark + light) / 2
        # A zero crossing is a wax boundary. Interpolating distance moves that boundary
        # through space without dissolving between two visible outlines.
        distance = distance_transform_edt(inside) - distance_transform_edt(~inside)
        result.append(np.clip(gaussian_filter(distance, 2), -90, 90).astype(np.float32))
    return result


def smooth_field(fields, position):
    index = int(position)
    u = position - index
    weights = ((1-u)**3, 3*u**3-6*u*u+4, -3*u**3+3*u*u+3*u+1, u**3)
    field = np.zeros_like(fields[0])
    for offset, weight in zip((-1, 0, 1, 2), weights):
        sample = fields[min(len(fields)-1, max(0, index+offset))]
        field += sample * np.float32(weight/6)
    return field


def smoothstep(value):
    value = np.clip(value, 0, 1)
    return value*value*(3-2*value)


def make_movie(fields, file):
    fps, seconds = CONFIG['fps'], CONFIG['cycleSeconds']
    height, width = fields[0].shape
    y, x = np.mgrid[-1:1:complex(height), -1:1:complex(width)].astype(np.float32)
    base = 20.8 + 1.1 * np.exp(-1.3*(x*x + .5*y*y))
    # The sub-code-value dither is fixed on the image plane across the entire loop.
    bayer = np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]], np.float32)
    dither = np.tile((bayer+.5)/16-.5, ((height+3)//4, (width+3)//4))[:height,:width] * .70
    args = ['ffmpeg','-v','error','-y','-f','rawvideo','-pixel_format','gray','-video_size',f'{width}x{height}',
            '-framerate',str(fps),'-i','pipe:0','-an','-vf',
            'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p,lutyuv=u=128:v=128',
            '-c:v','libx264','-preset','veryfast','-crf','7','-g','30','-keyint_min','30','-sc_threshold','0',
            '-pix_fmt','yuv420p','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709',
            '-color_range','tv','-movflags','+faststart',str(file)]
    with subprocess.Popen(args, stdin=subprocess.PIPE) as writer:
        for frame in range(seconds*fps):
            phase = 2*np.pi*(CONFIG['startPhase']+frame/(seconds*fps))
            position = .5*(1-np.cos(phase))*(len(fields)-1)
            field = smooth_field(fields, position)
            edge = smoothstep(.5 + field/CONFIG['waxEdgePixels'])
            body = smoothstep((field+4)/52)
            luminance = base + 11.8*edge + 2.6*body + dither
            writer.stdin.write(np.rint(luminance).astype(np.uint8).tobytes())
        writer.stdin.close()
        if writer.wait():
            raise RuntimeError('Wax video encoding failed')


def main():
    fields = source_shapes(ROOT/CONFIG['source'])
    video = ROOT/'public'/CONFIG['video']
    gif = ROOT/CONFIG['gif']
    with tempfile.TemporaryDirectory(dir=video.parent) as directory:
        temp = Path(directory)
        movie = temp/'lava.mp4'
        make_movie(fields, movie)
        palette = temp/'grays.png'
        Image.fromarray(np.arange(256,dtype=np.uint8).reshape(16,16)).convert('RGB').save(palette)
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(movie),'-i',str(palette),'-filter_complex',
                        f'[0:v]fps={CONFIG["gifFps"]}[motion];[motion][1:v]paletteuse=dither=none',
                        '-loop','0',str(temp/'lava.gif')],check=True)
        movie.replace(video)
        (temp/'lava.gif').replace(gif)
    print(f'{len(fields)} source poses, {CONFIG["cycleSeconds"]} seconds, {video.name} and {gif.name}')


if __name__ == '__main__':
    main()
