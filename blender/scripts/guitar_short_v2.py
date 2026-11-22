"""Deterministic Blender world for the 30-second magnetic-pickup episode."""
import bpy, math, json, sys, argparse
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--stills',action='store_true');p.add_argument('--range');p.add_argument('--bake',action='store_true');args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
C=json.loads((ROOT/'blender/guitar-pickup/config-v1.json').read_text());FPS=30
V=json.loads((ROOT/'episodes/guitar-pickup/visuals.json').read_text());SZ=V['stringZ'];F=V['focusEvents']
def pickup_z(z):return V['pickupBaseZ']+(z-1.1)*V['pickupZScale']
def string_motion(t):
 a=max(0,t-(C['shots'][2]['start']+.3));b=max(0,t-F['pluck'])
 return V['stringAmplitude']*((math.exp(-1.6*a)*math.sin(a*math.tau*8) if .001<a<2.5 else 0)+(math.exp(-1.4*b)*math.sin(b*math.tau*8) if .001<b<2.5 else 0))
OUT=ROOT/V['frameDir'];OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.render.engine='BLENDER_EEVEE';S.eevee.taa_render_samples=24;S.eevee.use_raytracing=False;S.eevee.use_fast_gi=False
S.eevee.shadow_ray_count=2;S.eevee.shadow_resolution_scale=1
S.render.resolution_x=540;S.render.resolution_y=960;S.render.resolution_percentage=100;S.render.fps=30;S.frame_start=1;S.frame_end=900
S.render.image_settings.file_format='PNG';S.render.image_settings.color_mode='RGB';S.render.image_settings.compression=15;S.render.use_motion_blur=False
S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast';S.view_settings.exposure=.4

def rgb(h):
 a=[int(h.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(x/12.92 if x<.04045 else ((x+.055)/1.055)**2.4 for x in a)
def mat(n,h,metal=0,emit=0):
 m=bpy.data.materials.new(n);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*rgb(h),1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=.52 if metal else .82;b.inputs['Emission Color'].default_value=(*rgb(h),1);b.inputs['Emission Strength'].default_value=emit;return m
M={n:mat(n,h,metal,emit) for n,h,metal,emit in [('gold','#c68d42',.15,0),('cream','#e4ddbd',0,0),('ink','#182a36',.15,0),('teal','#426e75',0,0),('wall','#57757d',0,0),('floor','#688883',0,0),('copper','#a9652f',.65,0),('steel','#c0cdcd',.75,0),('magnet','#618e87',.4,0),('signal','#e7c276',.1,1.5),('field','#508f9b',.1,.15),('skin','#c89068',0,0),('rubber','#263b46',0,0),('cone','#73868a',0,0)]}
world=bpy.data.worlds.new('Cool rehearsal-room ambient');S.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(*rgb('#a2bcc5'),1);world.node_tree.nodes['Background'].inputs[1].default_value=.25

def cube(n,loc,size,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel: q=o.modifiers.new('Soft manufactured edge','BEVEL');q.width=bevel;q.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o

def cyl(n,loc,r,depth,m,verts=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=n;o.data.materials.append(m);return o

def path(n,pts,r,m):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=1;c.bevel_depth=r;c.bevel_resolution=1;sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
 for a,b in zip(sp.points,pts):a.co=(*b,1)
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);c.materials.append(m);return o

def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def light(n,pos,target,power,color,size):
 d=bpy.data.lights.new(n,'AREA');d.energy=power;d.color=rgb(color);d.shape='DISK';d.size=size;o=bpy.data.objects.new(n,d);bpy.context.collection.objects.link(o);o.location=pos;aim(o,target);return o
for x in [-25,0,25,50,75]:
 light('Warm key '+str(x),(x-4,-4,8),(x,0,1),1600,'#ffd19a',5)
 light('Cool rim '+str(x),(x+3,4,6),(x,0,1),1000,'#8cc0cf',4)
 light('Soft front '+str(x),(x,-7,4),(x,0,1),240,'#d5e4e3',5)
 cube('Stage floor '+str(x),(x,0,-.15),(20,22,.3),M['floor'])
 cube('Back wall '+str(x),(x,5,3.4),(20,.2,7),M['wall'])
 for j in range(12):cube('Acoustic wall strips',(x-5+j*.9,4.84,3.0),(.055,.1,5.6),M['teal'])
 for j in range(8):cube('Floor plank seams',(x,-7+j*1.5,.006),(20,.018,.008),M['teal'])
# Rehearsal room has real hardware and small, selected native 16px wall props.
def image_material(n,file,scale=(1,1),offset=(0,0),lit=True):
 m=bpy.data.materials.new(n);m.use_nodes=True;m.surface_render_method='DITHERED';ns=m.node_tree.nodes;lk=m.node_tree.links;ns.clear();out=ns.new('ShaderNodeOutputMaterial');b=ns.new('ShaderNodeBsdfPrincipled');b.inputs['Roughness'].default_value=1;b.inputs['Specular IOR Level'].default_value=0;b.inputs['Emission Strength'].default_value=.28 if lit else .8
 tex=ns.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/file),check_existing=True);tex.interpolation='Closest';uv=ns.new('ShaderNodeTexCoord');mp=ns.new('ShaderNodeMapping');mp.inputs['Scale'].default_value=(*scale,1);mp.inputs['Location'].default_value=(*offset,0);lk.new(uv.outputs['UV'],mp.inputs['Vector']);lk.new(mp.outputs[0],tex.inputs[0]);lk.new(tex.outputs['Color'],b.inputs['Base Color']);lk.new(tex.outputs['Color'],b.inputs['Emission Color']);a=ns.new('ShaderNodeMath');a.operation='GREATER_THAN';a.inputs[1].default_value=.6;lk.new(tex.outputs['Alpha'],a.inputs[0]);tr=ns.new('ShaderNodeBsdfTransparent');mix=ns.new('ShaderNodeMixShader');lk.new(a.outputs[0],mix.inputs[0]);lk.new(tr.outputs[0],mix.inputs[1]);lk.new(b.outputs[0],mix.inputs[2]);lk.new(mix.outputs[0],out.inputs[0]);return m,mp

def plane(n,loc,w,h,m):
 me=bpy.data.meshes.new(n);me.from_pydata([(-w/2,0,0),(w/2,0,0),(w/2,0,h),(-w/2,0,h)],[],[(0,1,2,3)]);me.uv_layers.new()
 for i,v in enumerate([(0,0),(1,0),(1,1),(0,1)]):me.uv_layers.active.data[i].uv=v
 me.materials.append(m);o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.location=loc;return o
for row,x,z in [(3404,-28,1.9),(5416,-22.4,2.2),(6927,-26.8,1.0)]:
 m,_=image_material('Atlas row '+str(row),'public/pixel/guitar-pickup/atlas/'+str(row)+'.png');plane('Native 16px studio prop '+str(row),(x,4.69,z),1.0,1.0,m)
# Studio amplifier, output jack, coiled lead and warm strip lighting.
cube('Studio amplifier',(-22.7,1,1.0),(2.2,1.1,2),M['ink'],.12)
cube('Amp woven grille',(-22.7,.42,.96),(1.96,.06,1.5),M['teal'],.03)
for j in range(13):cube('Grille warp',(-23.6+j*.15,.38,.94),(.018,.025,1.4),M['steel'])
for x in [-23.3,-22.8,-22.3]:
 o=cyl('Amp control knob',(x,.36,1.82),.07,.09,M['cream'],16);o.rotation_euler.x=math.pi/2
path('Studio floor lead',[(-26.1,-.3,.05),(-24,-1,.05),(-23,-1.2,.05),(-22.7,-.1,.09)],.035,M['ink'])
lead=path('Flexible connected lead',[(-26.1,-.3,.05)]*13,.035,M['ink'])
plug=cyl('Plug with polished metal tip',(-25.05,-.5,.18),.055,.36,M['steel'],16);plug.rotation_euler=Vector((.9,0,.4)).to_track_quat('Z','Y').to_euler()
grip=cyl('Plug rubber grip',(0,0,-.22),.075,.18,M['rubber'],16);grip.parent=plug
# Continuous strat-shaped guitar body, on a real workbench.
cube('Guitar bench',(0,.7,.3),(6.7,11,.5),M['teal'],.08)
outline=[(-.5,-2.5),(-1.5,-2.15),(-1.78,-1.15),(-1.55,-.5),(-1.12,.1),(-1.43,1.0),(-1.12,2.0),(-.68,1.3),(-.5,.98),(.5,.98),(.75,1.7),(1.1,2.15),(1.43,1.42),(1.13,.35),(1.2,-.35),(1.72,-1.05),(1.5,-2.15),(.5,-2.5)]
curve=bpy.data.curves.new('Electric guitar body outline','CURVE');curve.dimensions='2D';curve.fill_mode='BOTH';curve.extrude=.16;curve.bevel_depth=.08;curve.bevel_resolution=2
sp=curve.splines.new('BEZIER');sp.bezier_points.add(len(outline)-1)
for q,xy in zip(sp.bezier_points,outline):q.co=(*xy,0);q.handle_left_type='AUTO';q.handle_right_type='AUTO'
sp.use_cyclic_u=True;body=bpy.data.objects.new('Continuous honey-gold electric guitar',curve);bpy.context.collection.objects.link(body);body.location.z=.77;curve.materials.append(M['gold'])
neck=cube('Maple neck',(0,4.35,.92),(1.23,6.9,.19),M['cream'],.06)
cube('Dark fingerboard',(0,4.2,1.04),(1.08,6.5,.07),M['ink'],.025)
for i in range(18):cube('Metal fret',(0,1.0+i*.36,1.085),(1.04,.025,.015),M['steel'])
cube('Headstock',(.15,8.3,1.0),(1.55,1.8,.25),M['gold'],.17)
for i in range(6):cyl('Tuning key',(-.7,7.6+i*.25,1.05),.10,.08,M['steel'],12)
cube('Cream pickguard',(0,-.05,.98),(2.85,2.9,.055),M['cream'],.15)
for x,y in [(1,-1),(1.2,-.6),(1.25,-.2)]:cyl('Volume and tone knob',(x,y,1.07),.12,.15,M['ink'],18)
cube('Bridge',(0,-1.65,1.11),(1.35,.4,.18),M['steel'],.035)
# Compact single-coil with a physically modest string clearance:
# The real magnified single-coil: 6 magnet rods and exposed copper windings.
coil=cube('Pickup lower bobbin',(0,.15,1.1),(1.58,.75,.18),M['ink'],.08)
cover=cube('Removable pickup top',(0,.15,1.52),(1.58,.75,.09),M['cream'],.08)
poles=[]
for i in range(6):poles.append(cyl('Magnetic pole '+str(i),(-.5+i*.2,.15,1.35),.074,.52,M['magnet'],20))
for j in range(18):
 z=1.14+j*.020
 pts=[]
 for k in range(65):
  a=k/64*math.tau;cx=.46 if math.cos(a)>=0 else -.46
  pts.append((cx+math.cos(a)*.26,.15+math.sin(a)*.255,z))
 path('Copper winding '+str(j),pts,.007,M['copper'])
# Compress the exposed pickup vertically into the body's shallow housing.
for o in [coil,cover]+poles+[q for q in bpy.data.objects if q.name.startswith('Copper winding')]:
 o.location.z=pickup_z(o.location.z);o.scale.z*=V['pickupZScale']
bridge=bpy.data.objects['Bridge'];bridge.location.z=1.07
strings=[]
for i in range(6):
 x=-.5+i*.2;pts=[(x,-1.63+j*9.5/48,SZ) for j in range(49)]
 strings.append(path('Steel string '+str(i),pts,.012 if i==0 else .008,M['steel']))
 if i==0:
  for j,pt in enumerate(strings[-1].data.splines[0].points):
   d=pt.driver_add('co',0).driver;f1=round((C['shots'][2]['start']+.3)*30)+1;f2=round(F['pluck']*30)+1
   d.expression=f'{x} + {V["stringAmplitude"]}*sin({j}/48*pi)*((exp(-.05333*(frame-{f1}))*sin((frame-{f1})*1.6755) if {f1}<frame<{f1+75} else 0)+(exp(-.04667*(frame-{f2}))*sin((frame-{f2})*1.6755) if {f2}<frame<{f2+75} else 0))'
# Big finger draws the string aside, then releases it.
finger=cube('Guitarist fingertip',(-.5,.15,2.5),(.27,.42,.8),M['skin'],.13)
# Anchored field paths reveal once; no rhythmic scaling of the pickup or field.
M['fluxGlow']=mat('Cool field highlight','#397f91',.1,0)
M['copperGlow']=mat('Warm moving coil highlight','#c88b39',.1,0)
M['capGlow']=mat('Pole cap highlight','#9ac1c4',.3,0)
fields=[]
for i in range(5):
 pts=[];theta=(i-2)*math.pi/5
 for j in range(65):
  a=j/64*math.tau;r=.14+i*.028
  pts.append((-.5+math.cos(a)*r*math.sin(theta),.15+math.cos(a)*r*math.cos(theta),1.11+.13*math.sin(a)))
 fields.append(path('Magnetic flux loop '+str(i),pts,.0055,M['fluxGlow']))
highlight=path('Active steel segment',[(-.5,-.55,SZ+.003),(-.5,.75,SZ+.003)],.013,M['copperGlow'])
nylon=path('Nonmagnetic nylon test strand',[(-.5,-1.6+j*3.2/24,SZ) for j in range(25)],.014,M['cream'])
for j,pt in enumerate(nylon.data.splines[0].points):pt.driver_add('co',0).driver.expression=f'-.5 + .012*sin({j}/24*pi)*sin((frame-1)/30*2*pi*5)'
caps=[cyl('Lit pole cap '+str(i),(-.5+i*.2,.15,V['poleTopZ']+.002),.075,.005,M['capGlow'],24) for i in range(6)]
trace_pts=[]
for turn in range(18):
 for j in range(65):
  a=j/64*math.tau;cx=.46 if math.cos(a)>=0 else -.46
  trace_pts.append((cx+math.cos(a)*.268,.15+math.sin(a)*.263,pickup_z(1.14+(turn+j/64)*.020)))
trace=path('Current follows copper winding',trace_pts,.0037,M['copperGlow'])
accent_magnet=light('LGT_Accent_Magnet',(-.8,-.35,1.8),(-.5,.15,1.1),0,'#afd6df',.45)
accent_string=light('LGT_Accent_String',(.3,.0,1.8),(-.5,.15,SZ),0,'#d4e4e6',.4)
accent_coil=light('LGT_Accent_Copper',(.2,-.6,1.4),(0,.15,1.07),0,'#efc284',.65)
# Alternating-signal visualization follows the copper, not a random spark cloud.
packets=[]
for i in range(12):
 o=cube('Coil signal block '+str(i),(0,0,0),(.045,.045,.045),M['signal'],.008);packets.append(o)
# Macro cable: a continuous supported route; Miko rides its signal metaphorically.
ride_points=[(25+math.sin(j/80*math.tau)*1.3,-3+j/80*8,1.1+.35*math.sin(j/80*math.pi)) for j in range(81)]
path('Cable outer jacket',ride_points,.14,M['ink']);path('Visible cable signal',[(x,y,z+.14) for x,y,z in ride_points],.027,M['signal'])
for j in range(7):cube('Cable support',(25+math.sin(j/6*math.tau)*1.3,-3+j/6*8,.5),(.18,.18,1.0),M['teal'],.03)
# Open amplifier cutaway with a signal growing inside it.
cube('Amplifier cabinet cutaway',(50,1,1.5),(4.1,1.5,3),M['ink'],.12)
cube('Copper circuit board',(50,.15,1.15),(3.5,.12,1.7),M['teal'],.04)
for x in [49.2,50,50.8]:
 tube=cyl('Amplifier valve',(x,-.08,1.4),.22,.9,M['copper'],24)
 cyl('Warm valve cap',(x,-.08,1.9),.18,.16,M['signal'],24)
for i in range(7):cube('Circuit resistor',(48.7+i*.42,-.0,.65),(.2,.18,.08),M['cream'],.015)
amp_wave=path('Boosted waveform',[(48.1+j*.03,-.55,1.1+math.sin(j*.30)*(.04+j/120*.45)) for j in range(121)],.035,M['signal'])
# Speaker cone is an annular lathe with a proper rim, dustcap and enclosure.
cube('Speaker cabinet',(75,.5,1.8),(4.0,1.3,3.6),M['ink'],.16)
for x in [73.1,76.9]:cube('Speaker side trim',(x,-.2,1.8),(.10,.15,3.2),M['teal'],.025)
verts=[];faces=[];profile=[(0,-.69),(.2,-.68),(.38,-.62),(.58,-.48),(.95,-.32),(1.20,-.24),(1.28,-.30),(1.34,-.24)]
for r,y in profile:
 for k in range(64):a=k/64*math.tau;verts.append((r*math.cos(a),y,r*math.sin(a)))
for i in range(len(profile)-1):
 for k in range(64):a=i*64+k;b=i*64+(k+1)%64;c=(i+1)*64+(k+1)%64;d=(i+1)*64+k;faces.append((a,b,c,d))
me=bpy.data.meshes.new('Lathed speaker cone');me.from_pydata(verts,[],faces);me.materials.append(M['cone']);speaker=bpy.data.objects.new('Moving loudspeaker diaphragm',me);bpy.context.collection.objects.link(speaker);speaker.location=(75,0,1.85)
for poly in me.polygons:poly.use_smooth=True
rings=[]
for i in range(5):
 o=path('Sound compression wave '+str(i),[(math.cos(j/64*math.tau),0,math.sin(j/64*math.tau)) for j in range(65)],.018,M['field']);rings.append(o)
# Shared native-GIF guitarist and generated explorer sheet, upright with fixed pivots.
gifmeta=json.loads((ROOT/'output/imagegen/miko-guitar-v1/miko-strum-v1-atlas.json').read_text());sheet=json.loads((ROOT/'public/pixel/guitar-pickup/miko-four-v1.json').read_text())
def actor(n,file,meta,height):
 crop=meta['crop'];m,mp=image_material(n,file,(crop['width']/meta['width'],crop['height']/meta['height']));o=plane(n,(0,0,0),height*crop['width']/crop['height'],height,m);o['base_height']=height;return o,mp,meta
G,GMP,GM=actor('Miko native guitarist','output/imagegen/miko-guitar-v1/miko-strum-v1-atlas.png',gifmeta,3.4)
E,EMP,EM=actor('Miko explorer','public/pixel/guitar-pickup/miko-four-v1.png',sheet,1)
# Nylon replaces the active steel strand in the same pickup position.
walkmeta=json.loads((ROOT/'output/imagegen/miko-guitar-explore-v1/explore-atlas.json').read_text())
windmeta=json.loads((ROOT/'output/imagegen/miko-guitar-wind-v1/wind-atlas.json').read_text())
W,WMP,WM=actor('Miko native explorer','output/imagegen/miko-guitar-explore-v1/explore-atlas.png',walkmeta,1)
R,RMP,RM=actor('Miko native wind reaction','output/imagegen/miko-guitar-wind-v1/wind-atlas.png',windmeta,1)

def atlas(mapping,meta,index):
 crop=meta['crop'];col=index%meta['columns'];row=index//meta['columns'];mapping.inputs['Location'].default_value=( (col*meta['cellWidth']+crop['x'])/meta['width'],1-(row*meta['cellHeight']+crop['y']+crop['height'])/meta['height'],0)
cam_data=bpy.data.cameras.new('CAM_GuitarNarrative');cam=bpy.data.objects.new('CAM_GuitarNarrative',cam_data);bpy.context.collection.objects.link(cam);S.camera=cam;cam_data.lens=47;cam_data.clip_start=.025;cam_data.clip_end=200

def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def lerp(a,b,p):return tuple(x+(y-x)*p for x,y in zip(a,b))
def face(o):o.rotation_euler.z=math.atan2(cam.location.x-o.location.x,-(cam.location.y-o.location.y))
def show(o,yes):o.hide_render=not yes;o.hide_viewport=not yes
def ground_anchor(u,v,z):
 frame=cam_data.view_frame(scene=S)
 xs=[q.x/-q.z for q in frame];ys=[q.y/-q.z for q in frame]
 ray=cam.rotation_euler.to_quaternion()@Vector((min(xs)+(max(xs)-min(xs))*u,min(ys)+(max(ys)-min(ys))*v,-1))
 return cam.location+ray*((z-cam.location.z)/ray.z)


def update(t):
 shot=next((s for s in C['shots'] if s['start']<=t<s['start']+s['duration']),C['shots'][-1]);name=shot['id'];u=t-shot['start'];p=u/shot['duration']
 for o in [G,E,W,R]:show(o,False)
 show(finger,name=='string');show(nylon,name=='nylon')
 detail=next((q for q in reversed(V['cameraBeats']) if t>=q['at']),None) if V['pickupReviewInterval'][0]<=t<V['pickupReviewInterval'][1] else None
 for o in caps:show(o,detail is not None)
 show(trace,detail is not None and t>=15.2)
 for o in fields:show(o,name in ['magnet','flux','nylon'] and t>=F['fieldReveal'])
 show(highlight,name in ['magnet','flux'] and t<F['coilDetail'])
 for o in strings:show(o,name!='nylon')
 for o in packets:show(o,name=='cable')
 for o in rings:show(o,name=='speaker')
 show(cover,name in ['hook','dive','string','pickup','closer'])
 cover.location=(-2*smooth((u-.3)/.5),.15,pickup_z(1.52)+smooth(u/.3)*.55) if name=='pickup' else (0,.15,pickup_z(1.52))
 if name=='pickup' and u>.85:show(cover,False)
 if name in ['hook','closer']:
  end=t>=29.8;tt=0 if end else u
  cam_phase=smooth(tt/1.2)*(1-smooth((t-29.4)/.4)) if name=='closer' else smooth(tt/1.2)
  cam.location=lerp((-24.8,-7.7,3.25),(-24.8,-8.1,3.4),cam_phase);aim(cam,(-24.8,0,1.65));cam_data.lens=47
  G.location=(-25,0,0);G.scale=(1,1,1);show(G,True);face(G)
  local=(tt if tt<1.65 else tt-1.65) if name=='hook' else max(0,tt-1.3)
  frame=min(11,int(local*10)) if name=='hook' else (min(11,int(local*10)) if local<1.2 else 11)
  if end:frame=0
  atlas(GMP,GM,frame)
  # The connected bend is visible through the chord and matches the first frame.
  connect=smooth((u-.1)/.55) if name=='closer' else 0
  detach=smooth(tt/.28) if name=='hook' else 1-connect
  jack=G.location+G.rotation_euler.to_matrix()@Vector((-.50,-.065,.67))
  plug.location=jack-Vector((.16,0,.08))+Vector((-.65*detach,-.18*detach,-.25*detach))
  end=plug.location-Vector((.22,0,.10));floor=Vector((-26.1,-.3,.05));bend=(end+floor)/2+Vector((-.25,-.10,-.22))
  for j,pt in enumerate(lead.data.splines[0].points):
   q=j/12;pt.co=(*((1-q)**2*end+2*q*(1-q)*bend+q*q*floor),1)
 elif name=='dive':
  cam.location=lerp((5.5,-8.0,7),(2.3,-3.3,2.65),smooth(p));aim(cam,(0,.4,1.05));cam_data.lens=44
  E.location=(.45,-1.1,1.015);E.scale=(.64,.64,.64);show(E,True);atlas(EMP,EM,1);face(E)
 elif name in ['string','pickup','magnet','flux','nylon']:
  poses={'string':((2.3,-3.9,2.8),(-.1,.3,1.32)), 'pickup':((2.0,-3.15,2.45),(0,.05,1.28)), 'magnet':((1.9,-3.1,2.3),(0,.15,1.35)), 'flux':((1.6,-2.8,2.35),(0,.15,1.4)), 'nylon':((1.7,-3.1,2.15),(0,-.05,1.35))}
  pos,target=poses[name]
  if name=='flux' and u>2.45:pos,target=(2.2,-2.0,2.8),(0,.2,1.38)
  cam.location=pos;cam.location.y+=smooth(p)*.12;target=(target[0],target[1]-.35,target[2]-.19);aim(cam,target);cam_data.lens=39
  E.location=(-.52+(.12*smooth(u/.8) if name in ['pickup','magnet'] else 0),-.82,.99);E.scale=(.64,.64,.64);show(E,True);atlas(EMP,EM,2 if name=='nylon' else 1);face(E)
  finger.location=(-.5+.025*smooth(u/.24),.12,SZ+1.0-.6*math.sin(min(1,u/.6)*math.pi)+max(0,u-.6)*3)
  show(finger,name=='string' and u<1.0)
  if name=='nylon':
   E.location=(-.52,-.82,.99);nylon.location=(-.52,-.32,-.31+.018*math.sin(t*12));nylon.scale=(.35,1,1)
 elif name=='cable':
  q=smooth(p);i=min(79,int(q*79));pos=Vector(ride_points[i]);E.location=pos+Vector((0,0,.15));E.scale=(.85,.85,.85);show(E,True);atlas(EMP,EM,3)
  cam.location=pos+Vector((2.8,-3.4,2.2));aim(cam,pos+Vector((0,.6,.4)));face(E);cam_data.lens=42
 elif name=='amp':
  cam.location=(52.5,-5.3,3.2);aim(cam,(50,0,1.4));cam_data.lens=42
  E.location=(49.1,-.75,.25);E.scale=(.95,.95,.95);show(E,True);atlas(EMP,EM,1);face(E)
 elif name=='speaker':
  cam.location=(76.8,-6.5,3.1);aim(cam,(75,-.2,1.65));cam_data.lens=43
  E.location=(74.1,-.7,.04);E.scale=(.85,.85,.85);show(E,True);atlas(EMP,EM,3);face(E)
 if detail:
  cam.location=detail['position'];aim(cam,detail['target']);cam_data.lens=detail['lens']
 if name in ['string','pickup','magnet','flux','nylon']:
  E.location=ground_anchor(.20,.32,1.015) if name in ['magnet','flux'] else Vector((.25,-1.1,1.015));face(E)
  if name=='nylon':
   E.location=V['nylonCharacterPosition'];face(E);nylon.location=(0,0,0);nylon.scale=(1,1,1)
 if name=='amp':E.location=ground_anchor(.22,.25,0);face(E)
 if name=='speaker':E.location=ground_anchor(.20,.24,.002);face(E)
 if name in ['dive','pickup']:
  show(E,False);show(W,True);W.location=E.location;W.scale=E.scale;W.rotation_euler=E.rotation_euler
  action_start=next(q['start'] for q in C['shots'] if q['id']==('dive' if name=='dive' else 'pickup'))
  age=t-action_start;atlas(WMP,WM,min(11,max(0,int(age*10))))
  W.location.x+=.07*smooth(age/.9)
 if name in ['string','cable','speaker']:
  show(E,False);show(R,True);R.location=E.location;R.scale=E.scale;R.rotation_euler=E.rotation_euler;atlas(RMP,RM,min(11,int(u*10)))
 for obj,meta,mp in [(G,GM,GMP),(W,WM,WMP),(R,RM,RMP)]:
  if not obj.hide_render:
   loc=mp.inputs['Location'].default_value;crop=meta['crop'];col=round((loc.x*meta['width']-crop['x'])/meta['cellWidth']);row=round(((1-loc.y)*meta['height']-crop['y']-crop['height'])/meta['cellHeight']);idx=max(0,min(meta['frameCount']-1,row*meta['columns']+col))
   gap=(crop['y']+crop['height']-1-meta['cells'][idx]['bottom'])/crop['height']
   obj.location.z-=gap*obj['base_height']*obj.scale.z
 if detail:
  for o in [E,W,R]:show(o,False)
  if detail['character']:
   E.location=ground_anchor(.23,.30,1.015);E.scale=(.44,.44,.44);atlas(EMP,EM,1);face(E);show(E,True)
 amp_wave.data.bevel_factor_end=smooth(u/.65) if name=='amp' else 1
 # Only the first string moves, laterally, in two damped plucks.
 disp=string_motion(t)
 for i,o in enumerate(strings):
  for j,pt in enumerate(o.data.splines[0].points):pt.co.x=-.5+i*.2+(disp*math.sin(j/48*math.pi) if i==0 else 0)
 highlight.location.x=disp*.56
 # Lighting hands attention to the narrated subject; no full-frame flashes.
 active=detail is not None
 magnet_on=smooth((t-F['magnetCaps'])/.45) if active else 0
 steel_on=smooth((t-F['magnetiseString'])/.45) if active else 0
 field_on=smooth((t-F['fieldReveal'])/.65) if name in ['magnet','flux','nylon'] else 0
 flow=smooth((t-F['currentTrace'])/1.4) if active else 0
 for i,o in enumerate(caps):o.scale=(1,1,max(.01,smooth((t-F['magnetCaps']-i*.075)/.22)))
 for i,o in enumerate(fields):
  o.location=(0,0,0);o.scale=(1,1,1);o.data.bevel_factor_end=smooth((t-F['fieldReveal']-i*.065)/.6)
 trace.data.bevel_factor_end=max(.001,flow);trace.data.bevel_factor_start=max(0,flow-.12)
 highlight.data.bevel_factor_end=max(.001,steel_on)
 M['capGlow'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.5*magnet_on
 M['fluxGlow'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=(.9*(1-.75*flow) if name!='nylon' else .6)*field_on
 M['copperGlow'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=1.0*(max(steel_on*.55,flow) if active else 0)
 accent_magnet.data.energy=V['lighting']['magnetAccentWatts']*magnet_on*(1-.6*flow)
 accent_string.data.energy=V['lighting']['stringAccentWatts']*steel_on*(1-flow)
 accent_coil.data.energy=V['lighting']['coilAccentWatts']*flow
 look=smooth((t-V['pickupReviewInterval'][0])/.2)*(1-smooth((t-V['pickupReviewInterval'][1])/.4))
 bpy.data.lights['Warm key 0'].energy=1600+(V['lighting']['macroKeyWatts']-1600)*look
 bpy.data.lights['Soft front 0'].energy=240+(V['lighting']['macroFillWatts']-240)*look
 bpy.data.lights['Cool rim 0'].energy=1000+(V['lighting']['macroRimWatts']-1000)*look
 for i,o in enumerate(packets):
  a=(t*2.8+i/12)*math.tau;o.location=(.5*math.cos(a),.15+.27*math.sin(a),1.40);v=.45+.55*abs(math.cos(t*math.tau*3));o.scale=(v,v,v)
 speaker.location.y=.07*math.sin(t*math.tau*3.2) if name=='speaker' else 0
 for i,o in enumerate(rings):
  q=((u*1.2+i/5)%1);o.location=(75,-.45-q*3.8,1.85);o.scale=(.45+q*1.7,1,.45+q*1.7)
 return shot

# Each frame is independently reproducible, including random access and cut boundaries.
animated=[G,E,W,R,cam,cover,finger,nylon,speaker,plug,highlight]+strings+fields+packets+rings+caps+[trace]
if args.bake:
 for frame in range(900):
  t=frame/30;S.frame_set(frame+1);update(t)
  for o in animated:
   for k in ['location','rotation_euler','scale','hide_render','hide_viewport']:o.keyframe_insert(k,frame=frame+1)
  for mp in [GMP,EMP,WMP,RMP]:mp.inputs['Location'].keyframe_insert('default_value',frame=frame+1)
  for pt in lead.data.splines[0].points:pt.keyframe_insert('co',frame=frame+1)
  for o in fields+[trace,highlight]:o.data.keyframe_insert('bevel_factor_end',frame=frame+1)
  trace.data.keyframe_insert('bevel_factor_start',frame=frame+1)
  for name in ['capGlow','fluxGlow','copperGlow']:M[name].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].keyframe_insert('default_value',frame=frame+1)
  for o in [accent_magnet,accent_string,accent_coil]:o.data.keyframe_insert('energy',frame=frame+1)
  for name in ['Warm key 0','Soft front 0','Cool rim 0']:bpy.data.lights[name].keyframe_insert('energy',frame=frame+1)
  cam_data.keyframe_insert('lens',frame=frame+1)
  amp_wave.data.keyframe_insert('bevel_factor_end',frame=frame+1)
 for a in bpy.data.actions:
  try:
   for f in a.fcurves:
    for k in f.keyframe_points:k.interpolation='CONSTANT' if f.data_path=='hide_render' else 'LINEAR'
  except AttributeError:pass
for image in bpy.data.images:
 if image.filepath:image.pack()
update(0);S.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/V['blendFile']))
if args.stills:
 for sec in [.2,1.5,4.1,6.2,9.5,12.3,15.2,17.0,19.5,21.7,23.5,24.8,27.5,29.9667]:
  S.frame_set(round(sec*30)+1);update(sec);S.render.filepath=str(OUT/f'check-{round(sec*30):04d}.png');bpy.ops.render.render(write_still=True)
elif args.range:
 frames=[]
 for chunk in args.range.split(','):
  first,last=map(int,chunk.split(':'));frames.extend(range(first,last+1))
 for frame in frames:
  file=OUT/f'{frame:04d}.png'
  if file.exists():continue
  S.frame_set(frame+1);update(frame/30);S.render.filepath=str(file);bpy.ops.render.render(write_still=True)
print(json.dumps({'blend':V['blendFile'],'objects':len(bpy.data.objects),'packedImages':len([im for im in bpy.data.images if im.packed_file]),'resolution':[540,960],'samples':24}))
