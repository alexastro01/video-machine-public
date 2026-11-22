"""Author local, editable 16:9 HyperFrames chapters from the episode shot manifest."""
from pathlib import Path
import json,shutil,re,math,struct
from inventions_graphics_v2 import CSS_V2, vector_icon, brand_icon, ride_screen
BASE=Path('episodes/inventions-since-2000');PUB=Path('public/episodes/inventions-since-2000');P=BASE/'hyperframes';T=json.loads((BASE/'timeline.json').read_text());CAP=json.loads((BASE/'captions.json').read_text())
GRAPHICS=json.loads((BASE/'graphics-v2.json').read_text())
HERO_CLIPS=json.loads((PUB/'heroes/hero-clips-v2.json').read_text()) if (PUB/'heroes/hero-clips-v2.json').exists() else {}
for folder in ['assets/art','assets/archive','assets/heroes','assets/fonts','assets/logos','assets/icons','assets/vendor','compositions']:(P/folder).mkdir(parents=True,exist_ok=True)
for category in ['art','archive','heroes','fonts','logos','icons']:
 for src in (PUB/category).glob('*'):
  if src.suffix.lower() in ['.png','.jpg','.jpeg','.mp4','.json','.svg','.woff2','.txt','.md']:shutil.copyfile(src,P/'assets'/category/src.name)
for name in ['narration','music','effects']:shutil.copyfile(PUB/(name+'.wav'),P/'assets'/(name+'.wav'))
for name in ['gsap.min.js']:shutil.copyfile(Path('experiments/hyperframes/assets/vendor')/name,P/'assets/vendor'/name)
for name in ['dmsans.ttf','dmsans-OFL.txt']:shutil.copyfile(Path('experiments/hyperframes/assets/fonts')/name,P/'assets/fonts'/name)
def esc(x):return str(x).replace('&','&amp;').replace('<','&lt;').replace('"','&quot;')
def js(x):return json.dumps(x,ensure_ascii=False)
CSS="""@font-face{font-family:'DM Sans';src:url('assets/fonts/dmsans.ttf');font-weight:100 1000}*{box-sizing:border-box}#root{position:absolute;inset:0;overflow:hidden;color:#efe6cd;font-family:'DM Sans',sans-serif;background:transparent}.stage{position:absolute;inset:0;overflow:hidden}.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;image-rendering:auto}.miko{position:absolute;transform-origin:50% 100%;z-index:4}.miko img{position:relative;z-index:1;display:block;height:100%;width:auto;image-rendering:pixelated}.native{position:relative;z-index:1;image-rendering:pixelated;background-repeat:no-repeat}.foot-shadow{position:absolute;bottom:-8px;left:15%;width:70%;height:24px;border-radius:50%;background:rgba(12,30,36,.24);z-index:0}.diagram{position:absolute;inset:0}.diagram svg{width:100%;height:100%}.ink{color:#142d37}.photo{position:absolute;object-fit:contain}.photo-frame{position:absolute;background:#17333d;border:3px solid #62888b;box-shadow:0 10px 0 rgba(9,27,34,.25);overflow:hidden}.photo-frame img{width:100%;height:100%;object-fit:cover;object-position:center 18%}.name{position:absolute;text-align:center;font-size:40px;font-weight:800;color:#f0e7d2;line-height:1.15;text-shadow:0 3px 0 #122c36}.fact-number{position:absolute;font-size:120px;font-weight:900;letter-spacing:-5px;color:#edcf96;line-height:1}.fact-unit{position:absolute;font-size:38px;font-weight:800;letter-spacing:1px}.screen{position:absolute;background:#e8e1cb;border:20px solid #162e37;box-shadow:0 14px 0 rgba(12,31,36,.3);overflow:hidden;color:#213e47}.browser-bar{height:62px;border-bottom:3px solid #96aaa7;background:#d3d9ca;display:flex;align-items:center;padding:0 28px;gap:14px}.browser-dot{width:13px;height:13px;background:#819c9b;border-radius:50%}.address{margin-left:30px;font-size:30px;color:#3f5f62}.wiki-title{font-family:Georgia,serif;font-size:68px;margin:38px 50px 22px;border-bottom:2px solid #6b8586;padding-bottom:15px}.article-line{height:13px;background:#a3af9e;margin:21px 50px}.article-line.link{background:#647f91}.phone{position:absolute;width:415px;height:730px;border:18px solid #142d37;border-radius:42px;background:#dce1d0;color:#18333e;box-shadow:0 12px 0 rgba(10,27,34,.3);overflow:hidden}.phone:before{content:'';position:absolute;width:100px;height:10px;top:10px;left:140px;background:#29454c;border-radius:8px;z-index:6}.phone-screen{position:absolute;inset:42px 10px 25px;overflow:hidden}.readable{font-size:42px;font-weight:800}.small{font-size:32px}.world-floor{position:absolute;left:0;right:0;bottom:0;height:260px;background:#28464d}.pill-label{position:absolute;font-size:34px;font-weight:800;text-align:center;line-height:1.2}.cursor{display:inline-block;width:9px;height:62px;background:#e5d9b8}.year{position:absolute;font-size:72px;font-weight:900;color:#efd5a0;letter-spacing:-2px}.dust{position:absolute;width:5px;height:5px;background:#e5d7b7;opacity:.38}.scene-shade{position:absolute;inset:0;background:linear-gradient(0deg,rgba(16,36,43,.28),transparent 36%);pointer-events:none}svg text{font-family:'DM Sans',sans-serif} .chapter-label{position:absolute;left:112px;top:72px;display:flex;align-items:center;gap:24px;text-shadow:0 4px 0 #102830;color:#f2e6ca}.chapter-rank{font-size:96px;font-weight:900;line-height:1;color:#e3c18a}.chapter-name{font-size:52px;font-weight:850}.chapter-year{font-size:31px;font-weight:650;color:#d6d9cc;margin-top:5px}.caption{position:absolute;left:200px;top:832px;width:1520px;height:132px;display:flex;align-items:center;justify-content:center;text-align:center;font:900 72px/1.1 'DM Sans';letter-spacing:-1.4px;color:#fff;-webkit-text-stroke:8px #10232d;paint-order:stroke fill;text-shadow:0 4px 0 #10232d}.caption span{display:inline-block} .end-prompt{position:absolute;left:1000px;top:280px;font-size:78px;font-weight:900;line-height:1.1;color:#f2dbab;text-shadow:0 5px 0 #14313a}"""
CSS+=CSS_V2
C={'ink':'#111217','teal':'#5b8c8e','cream':'#f5f5f7','gold':'#d8b87d','blue':'#82a7b2','green':'#92b49f','red':'#b16d63','pale':'#f0e8d6'}
def svg(body):return '<div class="diagram"><svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">'+body+'</svg></div>'
def txt(x,y,s,size=48,fill='#f5f5f7',weight=600,anchor='middle'):return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{fill}">{esc(s)}</text>'
def rect(x,y,w,h,fill,stroke=None,sw=5,rx=0):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>'
def circle(x,y,r,fill,stroke=None,sw=5):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>'
def path(d,stroke='#e1d4b5',sw=8,fill='none',extra=''):return f'<path d="{d}" stroke="{stroke}" stroke-width="{sw}" fill="{fill}" {extra}/>'
def icon(name,x,y,size=150):return vector_icon(name,x,y,size)
def brand(name,x,y,size=150,width=None,dark_background=True):return brand_icon(GRAPHICS['brandAliases'].get(name,name),x,y,size,width=width,dark=dark_background)
def car(x,y,scale=1):
 return f'<g transform="translate({x},{y}) scale({scale})">'+path('M0 155V85H62L116 25H320L390 88H470V155Z',C['ink'],10,C['teal'])+path('M98 83L135 40H213V83ZM229 40H307L357 83H229Z',C['ink'],6,C['blue'])+rect(179,3,100,22,C['gold'],C['ink'],5)+circle(95,155,42,C['ink'])+circle(377,155,42,C['ink'])+circle(95,155,20,C['cream'])+circle(377,155,20,C['cream'])+rect(16,103,35,23,C['cream'])+rect(430,104,28,20,C['red'])+'</g>'
def phone_markup(id,inside,x=300,y=165,w=415,h=730):return f'<div id="{id}" class="phone" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"><div class="phone-screen">{inside}</div></div>'
def map_svg(traffic=False,devices=False):
 b=rect(150,145,1620,680,'#9db6a1',C['ink'],9)
 for col in range(7):
  for row in range(3):b+=rect(190+col*225,180+row*213,150,138,'#c5cbb0' if (col+row)%3 else '#b7bfa5')
 for y in [350,560,770]:b+=path(f'M160 {y}H1760',C['teal'],42)
 for x in [370,820,1270,1720]:b+=path(f'M{x} 150V815',C['teal'],42)
 b+=path('M370 770V560H1270V350H1720',C['gold'] if not traffic else C['red'],15)
 b+=circle(370,770,18,C['pale'],C['ink'],7)+vector_icon('map',1648,245,144,C['ink'])
 if devices:
  for i in range(18):b+=f'<g class="device-dot">'+circle(370+(i%6)*180,350+(i//6)*210,13,C['gold'],C['ink'],4)+'</g>'
 return b

def build(s):
 sid=s['id'];dur=s['duration'];parts=[];moves=[];bg=s.get('bg');kind=s['kind']
 def elname(n):return sid+'-'+n
 def move(n,fromv,tov,at=0):moves.append(f"tl.fromTo('#{elname(n)}',{js(fromv)},{js(tov)},{at});")
 def setv(n,v,at=0):moves.append(f"tl.set('#{elname(n)}',{js(v)},{at});")
 def prop(n,html,style=''):
  style=style or 'inset:0;'
  if '<div class="diagram">' in html:style+='width:1920px;height:1080px;'
  if not style:style='inset:0;'
  parts.append(f'<div id="{elname(n)}" style="position:absolute;{style}">{html}</div>')
 def background(name):
  parts.append(f'<img id="{elname("bg")}" class="bg" src="assets/art/{name}.png" alt="">')
  if kind!='cell-dive':move('bg',{'scale':1.02},{'scale':1.055 if s.get('close') else 1,'duration':dur,'ease':'none'})
 def miko(pose=None,x=None,height=560,bottom=965,mirror=False,native=None):
  if x is None:x=470 if bg in ['library','cell'] else 1340
  p=pose or s.get('pose','home-3');name=elname('miko')
  if native:
   meta=json.loads((PUB/'art'/f'{native}-atlas.json').read_text());crop=meta['crop'];k=height/crop['height'];width=crop['width']*k
   style=f'width:{width}px;height:{height}px;background-image:url(assets/art/{native}-atlas.png);background-size:{meta["width"]*k}px {meta["height"]*k}px;'
   content=f'<div class="native" id="{elname("native")}" style="{style}"></div>'
   for i in range(meta['frameCount']):
    col=i%meta['columns'];row=i//meta['columns'];pos=f'-{(col*meta["cellWidth"]+crop["x"])*k}px -{(row*meta["cellHeight"]+crop["y"])*k}px';setv('native',{'backgroundPosition':pos},min(i*meta['frameDurationMs']/1000,max(0,dur-.025)))
  else:
   content=f'<img src="assets/art/miko-{p}.png" alt="Miko" style="'+('transform:scaleX(-1)' if mirror else '')+'">';pw,ph=struct.unpack('>II',(PUB/'art'/('miko-'+p+'.png')).read_bytes()[16:24]);width=height*pw/ph
  parts.append(f'<div id="{name}" class="miko" style="left:{x-width/2}px;top:{bottom-height}px;height:{height}px;width:{width}px"><div class="foot-shadow"></div>{content}</div>')
  move('miko',{'x':-15},{'x':0,'duration':.28,'ease':'power2.out'})
 def large_number(number,unit='',x=1030,y=350):
  prop('number',esc(number),'left:'+str(x)+'px;top:'+str(y)+'px;font-size:144px;font-weight:600;letter-spacing:-6px;color:#f5f5f7;line-height:1')
  prop('unit',esc(unit),'left:'+str(x)+'px;top:'+str(y+170)+'px;font-size:64px;font-weight:500;letter-spacing:-.8px;color:#d2d2d7;')
  move('number',{'y':18,'opacity':.4},{'y':0,'opacity':1,'duration':.25,'ease':'power2.out'})
 def photo(name,x,y,w,h,label=None):
  meta=json.loads((PUB/'archive'/(name+'.json')).read_text());file=Path(meta['file']).name
  parts.append(f'<div id="{elname(name)}" class="photo-frame" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"><img src="assets/archive/{file}" alt="{esc(name)}" style="object-fit:{"contain" if name in ["iphone-original","larry-sanger","doudna","charpentier","garrett-camp"] else "cover"}"></div>')
  move(name,{'scale':1.025},{'scale':1,'duration':min(dur,4),'ease':'power1.out'})
  if label:parts.append(f'<div class="name" style="left:{x-40}px;top:{y+h+15}px;width:{w+80}px">{esc(label)}</div>')
 def screen(html,x=620,y=170,w=1100,h=600):parts.append(f'<div id="{elname("screen")}" class="screen" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px">{html}</div>')
 def wiki(edit=False):
  bar='<div class="browser-bar"><i class="browser-dot"></i><i class="browser-dot"></i><i class="browser-dot"></i><span class="address">wikipedia.org</span></div>'
  body=bar+'<div class="wiki-title">Wikipedia</div><div style="display:flex;gap:30px;padding:0 50px"><img src="assets/logos/wikipedia.svg" style="width:130px;height:140px;object-fit:contain" alt="Wikipedia"><div style="flex:1">'+''.join(f'<div class="article-line'+(' link' if i in [1,4] else '')+f'" style="margin-left:0;width:{90-i%3*12}%" id="{elname("article-"+str(i))}"></div>' for i in range(6))+'</div></div>'
  screen(body,660 if bg else 350,180,1100,590)
  if edit:
   prop('edit-cursor','',f'left:1060px;top:550px;width:8px;height:30px;background:{C["ink"]};')
   move('article-3',{'scaleX':.45},{'scaleX':1,'transformOrigin':'0 50%','duration':min(dur*.55,1.4),'ease':'steps(14)'},.25)
  else:
   for i in range(6):move('article-'+str(i),{'scaleX':0},{'scaleX':1,'transformOrigin':'0 50%','duration':.28,'ease':'power2.out'},.1+i*.085)
 def dust():
  for i in range(14):
   x=(i*137+67)%1920;y=(i*193+50)%970
   parts.append(f'<i id="{elname("dust"+str(i))}" class="dust" style="left:{x}px;top:{y}px"></i>')
   move('dust'+str(i),{'x':0,'y':0},{'x':-14-i%4*6,'y':-25-i%5*11,'duration':dur,'ease':'none'})
 if bg:background(bg)
 if kind in ['hero','bedroom-loop']:
  h=s.get('hero','bedroom');offset=s.get('offset',0);maxlen={'bedroom':8,'map':9,'dna':10,'phone':8}[h];media=min(dur,maxlen-offset)
  source_clip=next((c for c in HERO_CLIPS.get(h,[]) if c['sourceStart']<=offset<c['sourceStart']+c['duration']-.01),None)
  revision='v2' if source_clip or (PUB/'heroes'/f'{h}-v2.mp4').exists() else 'v1';hero_dir=Path(f'blender/inventions-since-2000/{h}')/('v2' if revision=='v2' else '')
  source_file=source_clip['file'] if source_clip else f'{h}-{revision}.mp4';local_offset=offset-source_clip['sourceStart'] if source_clip else offset
  if source_clip:media=min(dur,source_clip['duration']-local_offset)
  parts.append(f'<video id="{elname("hero")}" class="clip bg" src="assets/heroes/{source_file}" data-start="0" data-duration="{media}" data-media-start="{local_offset}" data-track-index="0" muted playsinline></video>')
  # Hold a genuine end frame if the spoken beat exceeds the selected hero source.
  if dur>media+.03:
   frame={'bedroom':240,'map':270,'dna':300,'phone':240}[h];src=hero_dir/f'still-{frame:04}.png';target=P/'assets/heroes'/f'{h}-end.png';shutil.copyfile(src,target);parts.append(f'<img id="{elname("hold")}" class="clip bg" src="assets/heroes/{h}-end.png" data-start="{media-.034}" data-duration="{dur-media+.034}" data-track-index="1" alt="">')
  if kind=='bedroom-loop':
   shutil.copyfile(hero_dir/'still-0001.png',P/'assets/heroes/bedroom-first.png');parts.append(f'<img id="{elname("match")}" class="bg" src="assets/heroes/bedroom-first.png" alt="">');move('match',{'opacity':0},{'opacity':1,'duration':min(.4,dur/2),'ease':'power1.inOut'},max(0,dur-.5))
 elif kind=='book':
  miko('learning-0',x=780,height=650,native='book')
 elif kind in ['photo','photo-pair']:
  if not bg:parts.append(svg(rect(0,0,1920,1080,C['ink'])))
  if kind=='photo-pair':
   for i,name in enumerate(s['photos']):photo(name,300+i*760,135,560,610,s['names'][i])
  else:
   if s['photos'][0]=='encyclopedia':photo(s['photos'][0],180,150,1020,620);large_number(s.get('number',''),s.get('unit',''),1300,330)
   elif s['photos'][0]=='iphone-original':photo(s['photos'][0],420,135,620,650);large_number(s.get('number',''),s.get('unit',''),1170,360)
   else:photo(s['photos'][0],220,120,1480,690)
 elif kind in ['wiki-build','wiki-edit','wiki-read','wiki-check']:
  if kind=='wiki-check':parts.append(svg(rect(0,0,1920,1080,C['ink'])))
  wiki(kind=='wiki-edit')
  if kind!='wiki-check':miko(s.get('pose','learning-2'),x=410,height=540)
  else:
   prop('verified-answer',svg(rect(650,510,640,180,'#f5f5f7')+txt(950,625,GRAPHICS['wiki-check']['checkedEquation'],80,C['ink'],600)));move('verified-answer',{'opacity':0},{'opacity':1,'duration':.2},GRAPHICS['wiki-check']['revealAt'])
   prop('check',svg(path('M1320 620L1390 690L1545 510',C['green'],24)));move('check',{'opacity':0},{'opacity':1,'duration':.2},.5)
 elif kind=='volunteers':
  b=rect(0,0,1920,1080,C['ink'])
  for i in range(48):
   x=170+(i%12)*140;y=220+(i//12)*145
   b+=f'<g class="volunteer">'+circle(x,y,24,C['gold'] if i%3 else C['blue'])+rect(x-28,y+30,56,53,C['teal'])+rect(x-42,y+73,84,12,C['cream'])+'</g>'
  parts.append(svg(b));moves.append("tl.fromTo('.volunteer',{opacity:.25},{opacity:1,stagger:.025,duration:.14},0);")
 elif kind=='counter':
  if not bg:parts.append(svg(rect(0,0,1920,1080,C['ink'])))
  if s.get('pose'):miko(x=350,height=560)
  comp=sid+'-count';source=(P/'compositions/components/count-up.html').read_text();source=source.replace('count-up',comp).replace('data-duration="3"',f'data-duration="{dur}"').replace('34cqh','62cqh');source=re.sub(r'<script src="https:[^"]+"></script>','',source);(P/'compositions'/(comp+'.html')).write_text(source)
  values={'start':0,'end':s['number'],'suffix':s.get('suffix',''),'prefix':'','accent':'green','glow':False,'exit':'none'}
  x=610 if s.get('pose') else 370
  parts.append(f'<div id="{comp}" class="clip" data-composition-id="{comp}" data-composition-src="compositions/{comp}.html" data-start="0" data-duration="{dur}" data-width="1160" data-height="320" data-variable-values=\'{js(values)}\' style="position:absolute;left:{x}px;top:270px;width:1160px;height:320px;--brand:#f5f5f7;--fg:#f5f5f7;--font-display:Inter"></div>')
  parts.append(f'<div class="pill-label" style="left:{x}px;top:615px;width:1160px;font-size:64px;line-height:1.15">{esc(s["label"]).replace(" · ","<br>" ) if len(s["label"])>35 else esc(s["label"])}</div>')
 elif kind in ['school','rabbit-hole']:
  miko(x=1370,height=580,native='scroll' if kind=='rabbit-hole' and (PUB/'art/scroll-atlas.json').exists() else None)
  if kind=='school':
   prop('notebook',svg(path('M220 210H650L780 280L910 210H1330V730H930L780 795L630 730H220Z',C['ink'],12,C['cream'])+path('M780 280V795',C['teal'],9)+''.join(path(f'M280 {330+i*65}H640M900 {330+i*65}H1250',C['teal'],9) for i in range(5))));move('notebook',{'rotationY':-8,'scale':.95},{'rotationY':0,'scale':1,'duration':.7,'ease':'power2.out'})
  else:
   screen('<div class="browser-bar"><span class="address">wikipedia.org</span></div><div class="wiki-title">One more article…</div>'+''.join(f'<div class="article-line link" style="width:{80-i*5}%"></div>' for i in range(6)),230,175,950,600);move('screen',{'y':25},{'y':-20,'duration':dur,'ease':'none'});prop('clock','03:00','left:1450px;top:180px;font-size:72px;font-weight:800;color:#efd5a0')
 elif kind in ['hail','taxi-pass','street','delivery','destination','daily','camera','science-care','phone-pocket']:
  pose=s.get('pose');x=490 if kind in ['hail','taxi-pass'] else 1330
  miko(pose,x=x,height=620 if kind=='camera' else 560,native='scroll' if kind=='daily' and (PUB/'art/scroll-atlas.json').exists() else None)
  if kind in ['hail','taxi-pass','street']:
   prop('car',svg(car(0,630,2.7)),'inset:0;z-index:3;');move('car',{'x':-1400 if kind=='taxi-pass' else 1550},{'x':2500 if kind=='taxi-pass' else 700,'duration':min(dur,1.3 if kind=='taxi-pass' else 2.5),'ease':'power1.inOut'})
  if s.get('year'):large_number(s['year'],'',1030,210)
  if kind=='delivery':
   prop('bags',svg(rect(320,440,350,330,C['cream'],C['ink'],12)+path('M410 450V380Q495 280 580 380V450',C['ink'],16)+rect(730,530,310,240,C['gold'],C['ink'],12)));move('bags',{'x':-50},{'x':0,'duration':.35,'ease':'power3.out'})
  if kind=='destination':parts.append(svg(path('M340 510L490 650L760 330',C['green'],36)))
  if kind=='daily':
   for i,n in enumerate(['wiki','map','video','chat']):prop('app'+str(i),svg(brand(n,260+(i%2)*300,220+(i//2)*280,190,dark_background=GRAPHICS.get('dailyLogoVariants',{}).get(n)!='black')),'inset:0;');move('app'+str(i),{'scale':.8,'opacity':.3},{'scale':1,'opacity':1,'duration':.25,'ease':'power2.out'},i*.15)
  if kind=='phone-pocket':prop('device',svg(icon('phone',580,180,450)));move('device',{'y':140,'scale':.7},{'y':0,'scale':1,'duration':.7,'ease':'power3.out'})
  if kind=='science-care':parts.append(svg(icon('dna',550,170,320)))
 elif kind in ['ride-phone','fare']:
  miko('travel-1',x=1360,height=600,native='scroll' if (PUB/'art/scroll-atlas.json').exists() else None)
  body=ride_screen(GRAPHICS[kind]['button'],GRAPHICS[kind]['logo'])
  parts.append(phone_markup(elname('phone'),body,350,130,490,740));move('phone',{'y':30},{'y':0,'duration':.35,'ease':'power2.out'})
 elif kind in ['ride-map','location','traffic','traffic-data']:
  parts.append(svg(rect(0,0,1920,1080,C['ink'])+map_svg(kind=='traffic',kind=='traffic-data')))
  if kind=='location':
   prop('pin',svg(icon('map',885,360,180)));move('pin',{'scale':.5,'opacity':.4},{'scale':1,'opacity':1,'duration':.4,'ease':'power2.out'})
   for i in range(3):prop('ring'+str(i),svg(circle(977,445,50,C['ink'],C['gold'],6)),'inset:0;');move('ring'+str(i),{'scale':.3,'opacity':.8},{'scale':1.8,'opacity':0,'transformOrigin':'977px 445px','duration':1.5,'ease':'power1.out'},i*.3)
  else:
   topcar='<svg viewBox="0 0 96 170" width="48" height="85">'+rect(10,8,76,154,C['ink'],C['cream'],5,12)+rect(20,42,56,85,C['teal'])+rect(24,30,48,20,C['blue'])+rect(24,132,48,16,C['blue'])+'</svg>';prop('moving-car',topcar,'left:346px;top:727.5px;width:48px;height:85px;')
   if kind=='traffic':
    setv('moving-car',{'x':220,'y':-210,'rotation':90});moves.append(f"tl.to('#{elname('moving-car')}',{{x:430,duration:{dur*.9},ease:'none'}},0);")
   else:
    move('moving-car',{'x':0,'y':0,'rotation':0},{'y':-210,'duration':dur*.12,'ease':'none'});setv('moving-car',{'rotation':90},dur*.12);moves.append(f"tl.to('#{elname('moving-car')}',{{x:900,duration:{dur*.49},ease:'none'}},{dur*.12});");setv('moving-car',{'rotation':0},dur*.61);moves.append(f"tl.to('#{elname('moving-car')}',{{y:-420,duration:{dur*.12},ease:'none'}},{dur*.61});");setv('moving-car',{'rotation':90},dur*.73);moves.append(f"tl.to('#{elname('moving-car')}',{{x:1350,duration:{dur*.25},ease:'none'}},{dur*.73});")
   if kind=='traffic-data':moves.append("tl.fromTo('.device-dot',{opacity:.25},{opacity:1,stagger:.055,duration:.12},0);")
 elif kind=='fleet':
  b=rect(0,0,1920,1080,C['ink'])+brand('uber',810,95,65,width=300)
  for i in range(8):b+=f'<g class="fleet-car" transform="translate({175+(i%4)*440},{235+(i//4)*310})">'+icon('car',0,0,280)+(circle(140,-25,24,C['gold'])+rect(113,1,54,52,C['blue']) if s.get('owners') else '')+'</g>'
  parts.append(svg(b));moves.append("tl.fromTo('.fleet-car',{opacity:.25},{opacity:1,stagger:.08,duration:.2},0);")
 elif kind=='map-paper':
  miko('travel-2',x=980,height=760,bottom=1110)
  if s.get('close'):move('miko',{'scale':.98},{'scale':1.08,'duration':dur,'ease':'none'})
 elif kind in ['zoo-player','video-wall','watching','uploads']:
  if kind=='zoo-player':
   parts.append('<div class="screen" style="left:300px;top:120px;width:1320px;height:700px;background:#1b343b"><img src="assets/art/zoo.png" style="width:100%;height:88%;object-fit:cover;image-rendering:auto"><div style="height:12%;font-size:34px;padding:12px 28px;color:#eee3c7">Me at the zoo · 23 APR 2005</div></div>');prop('play',svg(icon('video',875,360,180)));move('play',{'scale':1.15,'opacity':.2},{'scale':1,'opacity':1,'duration':.25})
  elif kind=='uploads':
   b=rect(0,0,1920,1080,C['ink'])
   for i in range(35):b+=f'<g class="upload-tile">'+rect(120+(i%7)*245,140+(i//7)*137,210,112,C['teal'] if i%3 else C['blue'],C['cream'],3)+f'<image href="assets/art/{["zoo","creator-workshop","cell","san-francisco"][i%4]}.png" x="{123+(i%7)*245}" y="{143+(i//7)*137}" width="204" height="106" preserveAspectRatio="xMidYMid slice"/>'+icon('video',195+(i%7)*245,158+(i//7)*137,70)+'</g>'
   parts.append(svg(b));prop('counter-field',svg(rect(520,245,880,400,C['ink'],None,rx=24)+txt(960,445,GRAPHICS['uploads']['quantity'],170,C['cream'],600)+txt(960,565,GRAPHICS['uploads']['unit'],64,C['cream'],500)));move('counter-field',{'y':18,'opacity':0},{'y':0,'opacity':1,'duration':.25,'ease':'power2.out'});moves.append("tl.fromTo('.upload-tile',{opacity:.15},{opacity:.7,stagger:.025,duration:.18},0);")
  else:
   b=rect(0,0,1920,1080,C['ink'])
   for i in range(12):
    x=130+(i%4)*430;y=150+(i//4)*225;b+=f'<g class="video-tile">'+rect(x,y,390,205,C['teal'],C['cream'],3)+f'<image href="assets/art/{["car-interior","zoo","cell","san-francisco"][i%4]}.png" x="{x+3}" y="{y+3}" width="384" height="199" preserveAspectRatio="xMidYMid slice"/>'+icon('video',x+150,y+58,90)+'</g>'
   parts.append(svg(b));moves.append("tl.fromTo('.video-tile',{scale:.85,opacity:.2},{scale:1,opacity:1,stagger:.045,duration:.2,transformOrigin:'50% 50%'},0);")
   if kind=='watching':miko('create-3',x=1460,height=600)
 elif kind=='acquisition':
  parts.append(svg(rect(0,0,1920,1080,C['ink'])+brand('google',410,220,160)+brand('youtube',1220,220,160)+path('M710 300H1170',C['teal'],5)+path('M1120 268L1170 300L1120 332',C['teal'],5)+txt(490,445,'Google',48)+txt(1300,445,'YouTube',48)+txt(960,645,'$1.65 billion',142,C['cream'],600)+txt(960,740,'2006',46,C['blue'],500)))
 elif kind=='cooking':
  miko('home-1',x=1380,height=560);prop('pot',svg(rect(390,430,640,300,C['teal'],C['ink'],12,35)+rect(350,415,720,35,C['cream'],C['ink'],8)+path('M500 400Q450 320 500 240M700 400Q650 320 700 240M900 400Q850 320 900 240',C['cream'],12)));move('pot',{'y':8},{'y':0,'duration':.3,'ease':'power2.out'})
 elif kind=='bike':
  b=circle(120,220,80,'none',C['cream'],12)+circle(550,220,80,'none',C['cream'],12)+path('M120 220L235 75L350 220H120L300 85H480L550 220M235 75L215 35H170M480 85L460 40H505',C['teal'],13)+circle(350,220,16,C['ink'])
  prop('bicycle',f'<svg viewBox="0 0 700 330" style="width:1100px;height:520px">{b}</svg>','left:300px;top:420px;');miko('create-2',x=1300,height=430,bottom=950)
 elif kind=='exam':
  miko('learning-2',x=1350,height=570);prop('paper',svg(rect(280,190,780,600,C['cream'],C['ink'],10)+txt(670,370,'3 + 4 = ?',80,C['ink'])+txt(670,560,'7',130,C['teal'])+path('M780 610L830 660L940 520',C['teal'],18)))
 elif kind in ['feed','feed-signals']:
  if not bg:parts.append(svg(rect(0,0,1920,1080,C['ink'])))
  if kind=='feed':miko('travel-1',x=1310,height=600,native='scroll' if (PUB/'art/scroll-atlas.json').exists() else None)
  content='<div id="'+elname('feedstack')+'" style="position:absolute;inset:0">'+''.join(f'<div style="position:absolute;left:0;top:{i*669}px;width:100%;height:669px;overflow:hidden;background:#284b51"><img src="assets/art/'+['zoo','creator-workshop','san-francisco','cell'][i%4]+'.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:'+('28%' if i==0 else '50%')+' 50%;image-rendering:auto"><img src="assets/art/miko-'+['create-0','create-2','travel-3','science-0'][i%4]+'.png" style="position:absolute;bottom:12px;left:50%;height:72%;width:auto;transform:translateX(-50%);image-rendering:pixelated" alt=""></div>' for i in range(4))+'</div>'
  parts.append(phone_markup(elname('phone'),content,350,100,510,760));move('feedstack',{'y':0},{'y':-669,'duration':.32,'ease':'power3.inOut'},min(.8,dur*.25))
  if dur>3:moves.append(f"tl.to('#{elname('feedstack')}',{{y:-1338,duration:.32,ease:'power3.inOut'}},{dur*.65});")
  if kind=='feed-signals':
   for i,label in enumerate(['WATCH','SKIP','SHARE']):prop('signal'+str(i),label,f'left:1090px;top:{290+i*150}px;font-size:65px;font-weight:900;color:#e3ca98');move('signal'+str(i),{'x':35,'opacity':0},{'x':0,'opacity':1,'duration':.2},i*.5)
 elif kind in ['two-apps','app-merge','shorts','three-devices','phones','app-store']:
  if not bg:parts.append(svg(rect(0,0,1920,1080,C['ink'])))
  if kind=='two-apps':
   b=brand('tiktok',380,280,250)+txt(505,650,'Douyin · 2016',50)+brand('tiktok',1240,280,250)+txt(1365,650,'TikTok · 2017',50);parts.append(svg(b))
  elif kind=='app-merge':
   prop('left',svg(icon('music',350,300,250)+txt(475,630,'musical.ly',50)));prop('right',svg(brand('tiktok',1250,300,250)+txt(1375,630,'TikTok',50)));move('left',{'x':0},{'x':430,'opacity':0,'duration':.8,'ease':'power2.inOut'},.3);move('right',{'x':0},{'x':-430,'duration':.8,'ease':'power2.inOut'},.3)
  elif kind=='shorts':parts.append(svg(txt(960,230,'2020',86,C['cream'],600)+brand('instagram',380,330,240)+txt(500,675,'Reels',60)+brand('shorts',1250,330,240)+txt(1370,675,'Shorts beta',60)))
  elif kind=='three-devices':
   for i,(n,label) in enumerate([('music','iPod'),('phone','Phone'),('chat','Internet')]):prop('feature'+str(i),svg(icon(n,330+i*520,280,220)+txt(440+i*520,640,label,60)));move('feature'+str(i),{'y':35,'opacity':.3},{'y':0,'opacity':1,'duration':.25},i*.22)
  elif kind=='phones':parts.append(svg(icon('phone',360,180,480)+brand('apple',550,345,100)+txt(600,780,'iPhone',55)+icon('phone',1130,180,480)+brand('android',1320,345,100)+txt(1370,780,'Android',55)))
  else:
   b=icon('phone',600,150,550)+txt(1360,390,s.get('year','2008'),110,C['gold'])
   for i,n in enumerate(['car','map','video','music']):
    if s.get('year')=='2008':b+=f'<g class="new-app">'+icon(n,730+(i%2)*150,300+(i//2)*160,100)+'</g>'
   if s.get('year')=='2007':b+=path('M740 350L1030 650M1030 350L740 650',C['red'],18)
   parts.append(svg(b))
   if s.get('year')=='2008':moves.append("tl.fromTo('.new-app',{opacity:0},{opacity:1,stagger:.12,duration:.15},0);")
 elif kind in ['audience','reach']:
  b=rect(0,0,1920,1080,C['ink'])+icon('video',255,360,260)+txt(385,720,'NEW CREATOR',40)
  for i in range(12):
   x=870+(i%4)*230;y=240+(i//4)*205;b+=f'<g class="viewer">'+path(f'M570 495L{x} {y+15}',C['teal'],5)+circle(x,y,32,C['gold'])+rect(x-39,y+40,78,67,C['blue'])+'</g>'
  parts.append(svg(b));moves.append("tl.fromTo('.viewer',{opacity:.12},{opacity:1,stagger:.055,duration:.16},.2);")
 elif kind=='repair':
  parts.append(svg(rect(0,0,1920,1080,C['ink'])))
  left=path('M280 390H860M280 650H860',C['cream'],18)+''.join(path(f'M{340+i*100} 390V650',C['gold'] if i%2 else C['teal'],12) for i in range(6))
  right=path('M1060 390H1640M1060 650H1640',C['cream'],18)+''.join(path(f'M{1120+i*100} 390V650',C['gold'] if i%2 else C['teal'],12) for i in range(6))
  prop('repair-left',svg(left));prop('repair-right',svg(right));move('repair-right',{'x':0},{'x':-200,'duration':min(.65,dur*.65),'ease':'power2.inOut'},.15)
  prop('repair-join',svg(circle(860,390,23,C['gold'])+circle(860,650,23,C['gold'])),'inset:0;opacity:0;');move('repair-join',{'opacity':0},{'opacity':1,'duration':.18},min(.8,dur*.75))
 elif kind in ['cell-dive','genome','dna-typo']:
  if kind=='cell-dive':miko('science-1',x=400,height=500);move('bg',{'scale':1},{'scale':1.18,'duration':dur,'ease':'power2.inOut'})
  else:
   if not bg:parts.append(svg(rect(0,0,1920,1080,C['ink'])))
   if kind=='genome':miko('science-0',x=350,height=520);large_number('3 BILLION','DNA LETTERS',740,245)
   b=''
   for i,ch in enumerate('ACGTACGTACGT'):
    x=(650+i*90) if kind=='genome' else (280+i*115);ww=74 if kind=='genome' else 94;b+=rect(x,560,ww,130,C['gold'] if i==6 else C['teal'],C['cream'],3)+txt(x+ww/2,648,('T' if kind=='dna-typo' and i==6 else ch),66,C['ink'])
   prop('sequence',svg(b))
   if kind=='dna-typo':prop('mutation',svg(path('M1000 400V525',C['red'],15)+path('M960 490L1000 530L1040 490',C['red'],15)));move('mutation',{'y':-15},{'y':0,'duration':.3,'ease':'power2.out'})
   if kind=='repair':move('sequence',{'scaleX':.96},{'scaleX':1,'duration':.5,'ease':'power2.out'},.3)
 elif kind=='bacteria':
  parts.append(f'<img id="{elname("bacteria")}" src="assets/art/science-item-2.png" style="position:absolute;left:400px;top:190px;width:1100px;height:600px;object-fit:contain;image-rendering:pixelated" alt="Bacterium and virus">');move('bacteria',{'scale':.91},{'scale':1,'duration':dur,'ease':'power1.out'})
 elif kind=='nobel':
  photo('doudna',260,185,440,560);photo('charpentier',1220,185,440,560);parts.append(svg(circle(960,430,175,C['gold'],C['cream'],9)+txt(960,420,'NOBEL',54,C['ink'])+txt(960,500,'2020',80,C['ink'])))
 elif kind in ['medicine','stem-cells','blood-flow','not-inherited']:
  parts.append(svg(rect(0,0,1920,1080,C['ink'])))
  if kind=='medicine':parts.append(svg(rect(640,230,640,490,C['cream'],C['teal'],12)+rect(860,330,200,60,C['teal'])+rect(930,260,60,200,C['teal'])+txt(960,600,'2023',100,C['ink'])+txt(960,675,'CRISPR TREATMENT',34,C['ink'])))
  elif kind=='not-inherited':
   b=circle(580,300,58,C['gold'],C['cream'],5)+rect(510,380,140,240,C['teal'],C['cream'],5,20)+rect(515,620,45,135,C['teal'])+rect(600,620,45,135,C['teal'])+circle(1360,430,40,C['gold'],C['cream'],5)+rect(1310,490,100,170,C['blue'],C['cream'],5,15)+rect(1314,660,32,95,C['blue'])+rect(1380,660,32,95,C['blue'])+path('M700 500H1230',C['cream'],9)+icon('dna',830,380,160)+path('M1080 440L1190 550M1190 440L1080 550',C['red'],18)+txt(580,815,'PATIENT',48)+txt(1360,815,'CHILD',48)+txt(960,275,'EDITED DNA',48);parts.append(svg(b))
  else:
   b=path('M150 300C620 200 1300 800 1770 620',C['red'],160)
   if kind=='stem-cells':b+=txt(960,220,'FETAL HAEMOGLOBIN',54,C['cream'])
   parts.append(svg(b))
   for i in range(7):
    x=220+i*230;y=300+math.sin(i*.8)*180
    prop('blood'+str(i),f'<img src="assets/art/science-item-{0 if i%3 or kind=="stem-cells" else 1}.png" style="width:150px;height:150px;object-fit:contain;image-rendering:pixelated" alt="Red blood cell">',f'left:{x}px;top:{y}px;');move('blood'+str(i),{'x':-60,'y':0},{'x':40,'y':40,'duration':dur,'ease':'none'})
 elif kind in ['chat','chat-response','chat-tease','ai-uses','fact-check','transformer','paper','research-to-chat']:
  if not bg:parts.append(svg(rect(0,0,1920,1080,C['ink'])))
  if kind in ['chat','chat-tease','ai-uses']:
   if s.get('pose')=='home-2':
    parts.append(svg(rect(1440,610,55,240,C['teal'],C['ink'],7)+rect(1260,830,240,35,C['wood'] if 'wood' in C else '#b8a078',C['ink'],7)+rect(1280,865,25,140,C['ink'])+rect(1450,865,25,140,C['ink'])+path('M910 685L1340 750L1300 825L910 745Z',C['ink'],7,C['gold'])+path('M1132 730L1300 780L1295 806L1118 756Z',C['ink'],5,C['teal'])+path('M1152 735L1139 762M1180 744L1167 770M1208 752L1195 778M1236 761L1223 787M1264 769L1251 796',C['cream'],3)+rect(1305,816,25,175,C['ink'])))
   if s.get('pose'):miko(s['pose'],x=1320,height=600,bottom=1000,mirror=True)
   screen('<div style="padding:44px 50px;font-size:43px;font-weight:500;line-height:1.5;color:#f5f5f7"><div style="display:flex;gap:22px;align-items:center;margin-bottom:32px;font-size:32px;color:#d2d2d7">'+('<img src="assets/logos/chatgpt-on-dark.svg" style="width:44px;height:44px" alt="">ChatGPT' if kind!='chat-tease' else '')+'</div><div id="'+elname('typed')+'">'+('How does a microwave work?' if kind!='chat-tease' else 'What happens next?')+'</div><span class="cursor" id="'+elname('cursor')+'"></span></div>',200,225,950,450)
   setv('screen',{'background':'#18191e'})
   move('typed',{'clipPath':'inset(0 100% 0 0)'},{'clipPath':'inset(0 0% 0 0)','duration':min(1.8,dur*.55),'ease':'steps(24)'},.15)
   move('cursor',{'opacity':1},{'opacity':.25,'duration':.5,'repeat':max(0,int(dur)-1),'yoyo':True,'ease':'none'})
   # The chapter year and narration captions already carry the release date.
   if kind=='ai-uses':
    for i,label in enumerate(['CODE','EMAIL','HOMEWORK']):prop('use'+str(i),label,f'left:{285+i*270}px;top:560px;font-size:32px;font-weight:800;color:#e7ddbf');move('use'+str(i),{'opacity':0,'y':10},{'opacity':1,'y':0,'duration':.2},i*.35)
  elif kind=='chat-response':
   screen('<div style="padding:32px 50px;font-size:35px;font-weight:600;display:flex;align-items:center;gap:20px"><img src="assets/logos/chatgpt.svg" style="width:42px;height:42px" alt="">ChatGPT</div>',270,150,1380,650)
   for i,(typ,text_) in enumerate([('sent','How does a microwave work?'),('recv','Microwaves heat water.')]):
    comp=sid+'-message-'+str(i);source=(P/'compositions/components/chat-message.html').read_text().replace('chat-message',comp);source=re.sub(r'<script src="https:[^"]+"></script>','',source);source=source.replace('tl.set("#cm-slot", { autoAlpha: 0 }, 0.001);','').replace('id="cm-slot"','id="cm-slot" style="opacity:0;visibility:hidden"');source=source.replace('background: #000;','background: transparent;').replace('background: #0a80f8;','background: #416c6e;').replace('background: #242428;','background: #d9dec9;').replace('color: #fff;','color: #17343d;');source=source.replace('</style>','.cm-bubble{font:700 64px/1.18 "DM Sans";max-width:96%;padding:22px 28px;border-radius:16px}.cm-slot{left:3%;right:3%;bottom:12px}.cm-pop{width:100%}</style>');(P/'compositions'/(comp+'.html')).write_text(source)
    source=source.replace('"DM Sans"','Inter').replace('700 64px','500 64px').replace('background: #416c6e;','background: #e3e3e8;').replace('background: #d9dec9;','background: #ffffff;').replace('color: #17343d;','color: #1d1d1f;');(P/'compositions'/(comp+'.html')).write_text(source)
    vals={'type':typ,'text':text_,'tail':'off','delivered':'off'};start=.1+i*.45;parts.append(f'<div id="{comp}" class="clip" data-composition-id="{comp}" data-composition-src="compositions/{comp}.html" data-start="{start}" data-duration="{max(.1,dur-start)}" data-width="1160" data-height="200" data-variable-values=\'{js(vals)}\' style="position:absolute;left:350px;top:{290+i*210}px;width:1160px;height:200px;"></div>')
  elif kind=='fact-check':
   prop('wrong',svg(txt(960,570,GRAPHICS['fact-check']['wrongAnswer'],210,C['red'],600)));parts.append(svg(txt(960,300,GRAPHICS['fact-check']['equation'],100)));prop('wrong-cross',svg(path('M1170 435L1270 535M1270 435L1170 535',C['red'],18)),'inset:0;opacity:0;');move('wrong-cross',{'opacity':0,'scale':.9},{'opacity':1,'scale':1,'duration':.16,'ease':'power2.out'},min(GRAPHICS['fact-check']['crossAt'],dur*.75))
  elif kind=='transformer':
   parts.append(svg(txt(960,425,'GPT',240)+txt(960,640,'TRANSFORMER',85,C['gold'])+path('M1090 455V515',C['gold'],12)))
  elif kind=='paper':
   prop('paper',svg(rect(350,110,1220,700,C['cream'],C['teal'],7)+txt(960,320,'Attention Is All You Need',65,C['ink'])+txt(960,420,'Vaswani et al.',42,C['teal'])+txt(960,560,'2017',120,C['ink'])));move('paper',{'rotation':-2,'y':20},{'rotation':0,'y':0,'duration':.4,'ease':'power2.out'})
  else:parts.append(svg(txt(530,390,'2017',110,C['cream'],600)+txt(530,510,'Transformer',50)+path('M800 430H1190',C['teal'],5)+path('M1130 390L1190 430L1130 470',C['teal'],5)+brand('chatgpt',1330,300,240)+txt(1450,690,'2022',90,C['cream'],600)))
 elif kind in ['invention-montage','future']:
  if not bg:
   if kind=='future':background('bedroom')
   else:parts.append(svg(rect(0,0,1920,1080,C['ink'])))
  if kind=='future':miko('home-3',x=500,height=620);prop('future','2050?','left:1030px;top:280px;font-size:180px;font-weight:900;color:#edce96;letter-spacing:-6px');prop('finish','YOUR PICK: ______','left:1010px;top:500px;font-size:42px;font-weight:850;')
  else:
   for i,n in enumerate(['wiki','car','map','video','music','dna','phone','chat']):prop('invention'+str(i),svg(icon(n,280+(i%4)*380,195+(i//4)*300,220) if n=='dna' else brand(n,280+(i%4)*380,195+(i//4)*300,220)),'inset:0;');move('invention'+str(i),{'y':30,'opacity':0},{'y':0,'opacity':1,'duration':.16,'ease':'power2.out'},i*.11)
 else:raise ValueError('Unimplemented shot '+kind)
 if bg and kind not in ['hero']:parts.append('<div class="scene-shade"></div>');dust()
 # All timelines have a fixed full-duration clock; no wall-clock or callback animation.
 moves.append(f'tl.to({{t:0}},{{t:{dur},duration:{dur},ease:"none"}},0);')
 return ''.join(parts),'\n'.join(moves)

story=['# Inventions since 2000 storyboard','','The user selected the supplied script at natural pace, approximately 6–7 minutes. Each numbered chapter is an editorial selection. Archive, illustration and Blender are deliberately mixed.','']
for s in T['shots']:
 markup,animation=build(s);timing='' if s['kind'] in ['hero','bedroom-loop'] else f'data-start="0" data-duration="{s["duration"]}" data-track-index="0"';stageclass='stage' if not timing else 'clip stage';content=f'<template><style>{CSS}</style><div id="root" data-composition-id="{s["id"]}" data-width="1920" data-height="1080" data-duration="{s["duration"]}"><div id="{s["id"]}-stage" class="{stageclass}" {timing}>{markup}</div></div><script>window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});{animation}window.__timelines[{js(s["id"])}]=tl;</script></template>'
 (P/'compositions'/(s['id']+'.html')).write_text(content)
 story.append(f'- {s["start"]:.2f}–{s["start"]+s["duration"]:.2f}s · {s["chapter"]} · {s["kind"]}: {s.get("description",s["anchor"])}.')
# One caption track; each cue contains one or two sequential words. Never search by text.
cues=[];i=0
while i<len(CAP):
 group=[CAP[i]];i+=1
 if i<len(CAP) and not re.search(r'[.!?…]$',group[-1]['text']) and CAP[i]['startMs']-group[-1]['endMs']<160:
  group.append(CAP[i]);i+=1
 cues.append({'start':group[0]['startMs']/1000,'end':group[-1]['endMs']/1000,'words':group})
cc=[];cm=[]
for i,c in enumerate(cues):
 plain=' '.join(w['text'].upper() for w in c['words']);words=' '.join('<span style="color:'+('#e6cb8d' if re.search(r'^(wikipedia|uber|maps|youtube|tiktok|crispr|iphone|chatgpt|million|billion|[0-9])',w['text'],re.I) else '#d99d91' if re.search(r'^(wrong|disease|pain)',w['text'],re.I) else '#ffffff')+'">'+esc(w['text'].upper())+'</span>' for w in c['words']);size=72 if len(plain)<24 else 64
 cc.append(f'<div id="caption-{i}" class="clip caption" data-start="{c["start"]}" data-duration="{c["end"]-c["start"]}" data-track-index="2" data-layout-allow-caption-zone style="font-size:{size}px"><span id="caption-inner-{i}">{words}</span></div>');cm.append(f"tl.fromTo('#caption-inner-{i}',{{scale:.96}},{{scale:1,duration:.07,ease:'power2.out'}},{c['start']});")
(P/'compositions/captions.html').write_text(f'<template><style>{CSS}</style><div id="root" data-composition-id="captions" data-width="1920" data-height="1080" data-layout-allow-overlap>{"".join(cc)}</div><script>const tl=gsap.timeline({{paused:true}});{"".join(cm)}window.__timelines.captions=tl;</script></template>')
# Source labels belong to the story, not an opening title card.
badges=[]
for c in T['chapters']:
 if not c.get('rank'):continue
 badges.append(f'<div id="chapter-{c["id"]}" class="clip chapter-label" data-start="{c["start"]}" data-duration="2.8" data-track-index="1" data-layout-allow-overlap><span class="chapter-rank">{c["rank"]}</span><div><div class="chapter-name">{esc(c["title"])}</div><div class="chapter-year">{c["year"]}</div></div></div>')
(P/'compositions/navigation.html').write_text(f'<template><style>{CSS}</style><div id="root" data-composition-id="navigation" data-width="1920" data-height="1080" data-layout-allow-overlap>{"".join(badges)}</div><script>const tl=gsap.timeline({{paused:true}});tl.to({{t:0}},{{t:{T["duration"]},duration:{T["duration"]},ease:"none"}});window.__timelines.navigation=tl;</script></template>')
hosts=''.join(f'<div id="{s["id"]}" class="clip" data-composition-id="{s["id"]}" data-composition-src="compositions/{s["id"]}.html" data-start="{s["start"]}" data-duration="{s["duration"]}" data-track-index="0" data-track-kind="graphics" data-width="1920" data-height="1080" style="position:absolute;inset:0;z-index:1"></div>' for s in T['shots'])
for name,track,kind in [('navigation',1,'graphics'),('captions',2,'captions')]:hosts+=f'<div id="{name}" class="clip" data-composition-id="{name}" data-composition-src="compositions/{name}.html" data-start="0" data-duration="{T["duration"]}" data-track-index="{track}" data-track-kind="{kind}" data-width="1920" data-height="1080" data-layout-allow-overlap style="position:absolute;inset:0;z-index:{10+track}"></div>'
for i,name in enumerate(['narration','music','effects']):hosts+=f'<audio id="{name}" class="clip" src="assets/{name}.wav" data-start="0" data-duration="{T["duration"]}" data-track-index="{i+3}" data-volume="1"></audio>'
(P/'index.html').write_text(f'<!doctype html><html lang="en" data-resolution="landscape" data-composition-variables=\'{js([dict(id="episodeTitle",type="string",label="Editor title",default="Every Invention Since 2000 That Changed Your Life")])}\'><head><meta charset="UTF-8"><meta name="viewport" content="width=1920,height=1080"><script src="assets/vendor/gsap.min.js"></script><style>{CSS}html,body{{margin:0;width:1920px;height:1080px;overflow:hidden;background:#19343e}}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="{T["duration"]}" data-fps="30" data-width="1920" data-height="1080">{hosts}</div><script>window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});tl.to({{t:0}},{{t:{T["duration"]},duration:{T["duration"]},ease:"none"}});window.__timelines.main=tl;</script></body></html>')
(P/'STORYBOARD.md').write_text('\n'.join(story)+'\n');(P/'meta.json').write_text(json.dumps({'id':'inventions-since-2000-v2','name':T['chapters'][0].get('filmTitle','Every Invention Since 2000 That Changed Your Life')},indent=2)+'\n');(BASE/'caption-cues.json').write_text(json.dumps(cues,indent=2,ensure_ascii=False)+'\n')
# Variants are generated from the original vectors during authoring, then saved locally.
for src in (PUB/'logos').glob('*.svg'):shutil.copyfile(src,P/'assets/logos'/src.name)
print(json.dumps({'project':str(P),'seconds':T['duration'],'shots':len(T['shots']),'captionCues':len(cues),'resolution':[1920,1080]}))
