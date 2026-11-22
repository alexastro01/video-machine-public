"""Pair native-speed excerpts by story beat, keeping both soundtracks selectable."""
import argparse
import io
from pathlib import Path
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'renders/nvidia-four-trillion'
V2 = OUT / 'nvidia-four-trillion-v2.mp4'
REF = ROOT.parent / 'job -hunting/job-scout/data/browser-runs/2026-11-15-antijobboard/This Shape Saved Roller Coasters.mp4'
V3 = OUT / 'nvidia-four-trillion-v3.mp4'
BEATS = [
    ('Opening action', 0, 0, 2.80),
    ('Making the plan', 6.85, 7.35, 3.55),
    ('What it cost', 4.05, 17.75, 2.17),
    ('Making a decision', 13.38, 22.70, 3.05),
    ('Working with a tool', 16.12, 27.04, 2.35),
    ('Explaining the mechanism', 51.95, 35.85, 4.15),
    ('Reacting to the outcome', 59.50, 50.74, 3.55),
]


def run(args):
    subprocess.run([str(arg) for arg in args], check=True)


def timecode(t):
    return f'{int(t)//60:02d}:{t%60:05.2f}'


def compare(left, right, left_title, right_title, beats, dest, first_audio):
    fonts = Path('/System/Library/Fonts/Supplemental')
    title = ImageFont.truetype(str(fonts/'Arial Bold.ttf'), 23)
    small = ImageFont.truetype(str(fonts/'Arial.ttf'), 17)
    with tempfile.TemporaryDirectory(prefix='nvidia-comparison-') as tmp:
        work = Path(tmp)
        for i, (label, l, r, duration) in enumerate(beats):
            page = Image.new('RGB', (878, 824), '#132029')
            draw = ImageDraw.Draw(page)
            for x, text, at in [(8, left_title, l), (446, right_title, r)]:
                draw.text((x, 3), text, font=title, fill='#fffdf3')
                draw.text((x, 31), f'{timecode(at)}    {label}', font=small, fill='#c6d3d2')
            slate = work / f'{i}.png'
            page.save(slate)
            filters = ('[0:v]fps=30,scale=432:768,setsar=1,setpts=PTS-STARTPTS[l];'
                       '[1:v]fps=30,scale=432:768,setsar=1,setpts=PTS-STARTPTS[r];'
                       '[2:v][l]overlay=4:54[b];[b][r]overlay=442:54,format=yuv420p[v]')
            tracks = ['0:a:0', '1:a:0'] if first_audio == 'left' else ['1:a:0', '0:a:0']
            run(['ffmpeg','-y','-v','error','-ss',l,'-i',left,'-ss',r,'-i',right,
                 '-loop','1','-framerate','30','-i',slate,'-t',duration,'-filter_complex',filters,
                 '-map','[v]','-map',tracks[0],'-map',tracks[1],'-c:v','libx264','-preset','veryfast',
                 '-crf','19','-c:a','aac','-b:a','128k','-ac','2','-ar','48000',work/f'{i}.mp4'])
        playlist=work/'cuts.txt'
        playlist.write_text(''.join(f"file '{i}.mp4'\n" for i in range(len(beats))))
        a,b=(left_title,right_title) if first_audio=='left' else (right_title,left_title)
        run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',playlist,'-map','0','-c','copy',
             '-metadata:s:a:0',f'handler_name={a}','-metadata:s:a:1',f'handler_name={b}',
             '-disposition:a:0','default','-disposition:a:1','0','-movflags','+faststart',dest])


def full_comparison():
    def duration(path):
        return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration",
            "-of","default=nk=1:nw=1",str(path)]))
    reference_length, episode_length=duration(REF),duration(V2)
    longest=max(reference_length,episode_length)
    assert reference_length>=episode_length
    fonts=Path('/System/Library/Fonts/Supplemental')
    title=ImageFont.truetype(str(fonts/'Arial Bold.ttf'),23)
    small=ImageFont.truetype(str(fonts/'Arial.ttf'),17)
    with tempfile.TemporaryDirectory(prefix="nvidia-full-comparison-") as tmp:
        base=Path(tmp)
        board=Image.new("RGB",(878,824),"#132029");d=ImageDraw.Draw(board)
        for x,label,length in [(8,"Roller coaster reference",reference_length),(446,"Nvidia v2",episode_length)]:
            d.text((x,3),label,font=title,fill="#fffdf3")
            d.text((x,31),timecode(length)+" total  ·  original speed",font=small,fill="#c6d3d2")
        board.save(base/"board.png")
        end=Image.new("RGB",(432,768),"#182630");d=ImageDraw.Draw(end)
        d.text((216,371),"Nvidia v2 ends at "+timecode(episode_length),font=small,fill="#dde4df",anchor="mm")
        end.save(base/"end.png")
        graph=(f"[0:v]fps=30,scale=432:768,setsar=1[l];[1:v]fps=30,scale=432:768,setsar=1[r];"
               f"[2:v][l]overlay=4:54[a];[a][r]overlay=442:54[b];"
               f"[b][3:v]overlay=442:54:enable='gte(t,{episode_length})',format=yuv420p[out];[1:a]apad[audio]")
        run(["ffmpeg","-y","-v","error","-i",REF,"-i",V2,"-loop",1,"-framerate",30,"-i",base/"board.png",
             "-loop",1,"-framerate",30,"-i",base/"end.png","-t",longest,"-filter_complex",graph,"-map","[out]",
             "-map","[audio]","-map","0:a:0","-c:v","libx264","-threads",3,"-preset","veryfast","-crf",20,"-c:a","aac",
             "-ar",48000,"-ac",2,"-b:a","128k","-metadata:s:a:0","handler_name=Nvidia v2",
             "-metadata:s:a:1","handler_name=Roller coaster reference","-disposition:a:0","default",
             "-disposition:a:1","0","-movflags","+faststart",OUT/"nvidia-v2-roller-coaster-full-side-by-side.mp4"])


def workbench_still():
    width,height=432,768
    font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',23)
    small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',18)
    page=Image.new('RGB',(884,830),'#14232a')
    draw=ImageDraw.Draw(page)
    for left,path,title in [(5,V2,'Nvidia v2'),(447,V3,'Nvidia v3')]:
        # Select by frame number so the two panels show the same presentation timestamp.
        frame=subprocess.check_output(['ffmpeg','-v','error','-ss','18','-i',str(path),'-vf',
            f"select='eq(n,60)',scale={width}:{height}",'-frames:v','1','-c:v','png','-f','image2pipe','-'])
        page.paste(Image.open(io.BytesIO(frame)).convert('RGB'),(left,55))
        draw.text((left+4,12),title,font=font,fill='#fffaf1')
        draw.text((left+width-5,17),'00:19.00',font=small,fill='#d0dbd8',anchor='ra')
    page.save(OUT/'table-00-19-v2-v3.jpg',quality=95,subsampling=0)


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--repair', action='store_true')
    mode.add_argument('--full', action='store_true')
    args=parser.parse_args()
    if args.full:
        full_comparison()
    elif args.repair:
        beats=[(label,t,t,d) for label,t,d in [('Diner',8.35,2.75),('The drawer',17.95,2.5),
               ('Sega call',23.15,3.65),('Following the calculation',35.8,4.5),('Market value',50.3,3.75)]]
        compare(V2,V3,'Nvidia v2','Nvidia v3',beats,OUT/'nvidia-v2-v3-placement-and-acting.mp4','right')
        workbench_still()
    else:
        compare(REF,V2,'Roller coaster reference','Nvidia v2',BEATS,OUT/'nvidia-v2-roller-coaster-side-by-side.mp4','right')
