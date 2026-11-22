"""Frame-derived microwave cutaway, liquid dipoles, ice lattice and shielding."""
import bpy,math,json,sys,argparse
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--stills',action='store_true');p.add_argument('--range');p.add_argument('--bake',action='store_true');p.add_argument('--audit',action='store_true');p.add_argument('--no-save',action='store_true');args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
C=json.loads((ROOT/'blender/microwave/config-v1.json').read_text());V=json.loads((ROOT/'episodes/microwave/visuals.json').read_text())
OUT=ROOT/V['frameDir'];OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.render.engine='BLENDER_EEVEE';S.eevee.taa_render_samples=24;S.eevee.use_raytracing=False;S.eevee.use_fast_gi=False;S.eevee.shadow_ray_count=2
S.render.resolution_x=540;S.render.resolution_y=960;S.render.resolution_percentage=100;S.render.fps=30;S.frame_start=1;S.frame_end=1350
S.render.image_settings.file_format='PNG';S.render.image_settings.color_mode='RGB';S.render.image_settings.compression=15;S.render.use_motion_blur=False
S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast';S.view_settings.exposure=.3
def rgb(h):
 a=[int(h.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(x/12.92 if x<.04045 else ((x+.055)/1.055)**2.4 for x in a)

def mat(n,h,metal=0,emit=0):
 m=bpy.data.materials.new(n);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*rgb(h),1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=.52 if metal else .82;b.inputs['Emission Color'].default_value=(*rgb(h),1);b.inputs['Emission Strength'].default_value=emit;return m

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

def image_material(n,file,scale=(1,1),offset=(0,0),lit=True):
 m=bpy.data.materials.new(n);m.use_nodes=True;m.surface_render_method='DITHERED';ns=m.node_tree.nodes;lk=m.node_tree.links;ns.clear();out=ns.new('ShaderNodeOutputMaterial');b=ns.new('ShaderNodeBsdfPrincipled');b.inputs['Roughness'].default_value=1;b.inputs['Specular IOR Level'].default_value=0;b.inputs['Emission Strength'].default_value=.28 if lit else .8
 tex=ns.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/file),check_existing=True);tex.interpolation='Closest';uv=ns.new('ShaderNodeTexCoord');mp=ns.new('ShaderNodeMapping');mp.inputs['Scale'].default_value=(*scale,1);mp.inputs['Location'].default_value=(*offset,0);lk.new(uv.outputs['UV'],mp.inputs['Vector']);lk.new(mp.outputs[0],tex.inputs[0]);lk.new(tex.outputs['Color'],b.inputs['Base Color']);lk.new(tex.outputs['Color'],b.inputs['Emission Color']);a=ns.new('ShaderNodeMath');a.operation='GREATER_THAN';a.inputs[1].default_value=.6;lk.new(tex.outputs['Alpha'],a.inputs[0]);tr=ns.new('ShaderNodeBsdfTransparent');mix=ns.new('ShaderNodeMixShader');lk.new(a.outputs[0],mix.inputs[0]);lk.new(tr.outputs[0],mix.inputs[1]);lk.new(b.outputs[0],mix.inputs[2]);lk.new(mix.outputs[0],out.inputs[0]);return m,mp

def plane(n,loc,w,h,m):
 me=bpy.data.meshes.new(n);me.from_pydata([(-w/2,0,0),(w/2,0,0),(w/2,0,h),(-w/2,0,h)],[],[(0,1,2,3)]);me.uv_layers.new()
 for i,v in enumerate([(0,0),(1,0),(1,1),(0,1)]):me.uv_layers.active.data[i].uv=v
 me.materials.append(m);o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.location=loc;return o

def atlas(mapping,meta,index):
 crop=meta['crop'];col=index%meta['columns'];row=index//meta['columns'];mapping.inputs['Location'].default_value=( (col*meta['cellWidth']+crop['x'])/meta['width'],1-(row*meta['cellHeight']+crop['y']+crop['height'])/meta['height'],0)

def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)

def lerp(a,b,p):return tuple(x+(y-x)*p for x,y in zip(a,b))

def face(o):o.rotation_euler.z=math.atan2(cam.location.x-o.location.x,-(cam.location.y-o.location.y))

def show(o,yes):o.hide_render=not yes;o.hide_viewport=not yes

def ground_anchor(u,v,z):
 frame=cam_data.view_frame(scene=S)
 xs=[q.x/-q.z for q in frame];ys=[q.y/-q.z for q in frame]
 ray=cam.rotation_euler.to_quaternion()@Vector((min(xs)+(max(xs)-min(xs))*u,min(ys)+(max(ys)-min(ys))*v,-1))
 return cam.location+ray*((z-cam.location.z)/ray.z)
M={n:mat(n,h,metal,emit) for n,h,metal,emit in [('cream','#dfd8bd',0,0),('ink','#192e39',.1,0),('teal','#3a6870',.2,0),('wall','#577e85',.2,0),('wood','#bc8e58',0,0),('steel','#9eafb5',.7,0),('ice','#8fbecf',.1,0),('frost','#d7e5e4',0,.1),('soup','#c59150',0,.12),('warm','#d7a363',0,.3),('cold','#6b9fbc',0,.2),('wave','#b2e4df',.1,3.5),('light','#e8d5a3',0,2),('oxygen','#b77567',.05,0),('hydrogen','#e0ddd0',0,0)]}
world=bpy.data.worlds.new('Muted kitchen ambient');S.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(*rgb('#8caab8'),1);world.node_tree.nodes['Background'].inputs[1].default_value=.22
# Bloom only the brightest emitted waves; it never flashes the frame.
nt=bpy.data.node_groups.new('Microwave wave glow','CompositorNodeTree');S.compositing_node_group=nt;nt.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor');rl=nt.nodes.new('CompositorNodeRLayers');gl=nt.nodes.new('CompositorNodeGlare');gl.inputs['Type'].default_value='Fog Glow';gl.inputs['Threshold'].default_value=2;gl.inputs['Strength'].default_value=.15;gl.inputs['Size'].default_value=.25;out=nt.nodes.new('NodeGroupOutput');nt.links.new(rl.outputs['Image'],gl.inputs['Image']);nt.links.new(gl.outputs['Image'],out.inputs[0])

def sphere(n,loc,r,m):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=r,location=loc);o=bpy.context.object;o.name=n;o.data.materials.append(m);return o

def empty(n,loc):
 o=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(o);o.location=loc;return o

def parent(o,p):o.parent=p;return o

def ring(n,loc,r,thick,m):
 o=path(n,[(r*math.cos(j/64*math.tau),r*math.sin(j/64*math.tau),0) for j in range(65)],thick,m);o.location=loc;return o

def bowl(n,loc,r):
 # Lathed ceramic bowl, with liquid slightly below its raised rim.
 verts=[];faces=[];prof=[(r*.4,0),(r*.65,.10*r),(r*.9,.42*r),(r,.62*r),(r*.94,.65*r),(r*.84,.43*r),(r*.55,.12*r)]
 for rad,z in prof:
  for k in range(48):a=k/48*math.tau;verts.append((rad*math.cos(a),rad*math.sin(a),z))
 for j in range(len(prof)-1):
  for k in range(48):a=j*48+k;b=j*48+(k+1)%48;c=(j+1)*48+(k+1)%48;d=(j+1)*48+k;faces.append((a,b,c,d))
 me=bpy.data.meshes.new(n);me.from_pydata(verts,[],faces);me.materials.append(M['cream']);o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.location=loc
 soup=cyl(n+' soup',(loc[0],loc[1],loc[2]+r*.52),r*.86,.025,M['soup'],48)
 return o,soup

for x in [0,20,40,60,80,100]:
 light('LGT_Key_'+str(x),(x-4,-4,8),(x,0,2),1350,'#ffd5a2',5)
 light('LGT_Rim_'+str(x),(x+3,3,5),(x,0,2),1000,'#9bc9db',4)
 light('LGT_Fill_'+str(x),(x,-6,4),(x,0,2),180,'#c8dce2',5)
 cube('Stage floor '+str(x),(x,0,-.15),(16,16,.3),M['teal'])
 cube('Stage wall '+str(x),(x,4.8,3.5),(16,.2,7),M['wall'])
# Complete kitchen: tiled splashback, cabinets, counter and a closed-door cutaway.
cube('Countertop',(0,0,.9),(10,5,.25),M['cream'],.06)
for x in [-3.7,3.7]:
 cube('Kitchen cupboard',(x,1.3,2.7),(1.5,1.1,2.4),M['wood'],.05)
 cube('Cupboard inset',(x,.72,2.7),(1.24,.04,2.1),M['cream'],.02)
 cube('Cupboard handle',(x+.45,.64,2.6),(.045,.08,.4),M['ink'],.015)
for x in range(-5,6):cube('Tile joint',(x,.69,3.1),(.013,.02,3.8),M['steel'])
for z in [1.2,2,2.8,3.6,4.4]:cube('Tile course',(0,.69,z),(10,.02,.013),M['steel'])
# Oven front is deliberately a cutaway, with a frame and sparse dark mesh.
cube('Oven base',(0,-.4,1.13),(5,3.2,.22),M['steel'],.12)
cube('Oven top',(0,-.4,3.7),(5,3.2,.20),M['steel'],.12)
cube('Oven back',(0,1.1,2.4),(5,.18,2.6),M['steel'],.05)
for x in [-2.4,2.4]:cube('Oven side',(x,-.4,2.4),(.20,3.1,2.6),M['steel'],.05)
for x in [-2.15,1.55]:cube('Closed door frame',(x,-2.01,2.38),(.19,.14,2.35),M['ink'],.03)
for z in [1.25,3.5]:cube('Closed door rail',(-.3,-2.01,z),(3.9,.14,.16),M['ink'],.03)
cube('Control fascia',(2.0,-2.02,2.4),(.65,.16,2.4),M['ink'],.05)
cube('Timer screen',(2.0,-2.12,3.15),(.46,.04,.24),M['wave'],.025)
for z in [2.7,2.35,2.0]:cube('Control button',(2,-2.13,z),(.26,.05,.15),M['teal'],.02)
cube('Door handle',(1.4,-2.20,2.4),(.12,.14,1.5),M['steel'],.03)
for i in range(25):cube('Fine door mesh',(-2.05+i*.145,-2.0,2.4),(.008,.008,2.12),M['ink'])
for i in range(15):cube('Fine mesh cross',(-.3,-2.0,1.38+i*.145),(3.55,.008,.008),M['ink'])
plate0=cyl('Kitchen turning plate',(0,-.3,1.36),1.75,.08,M['frost'],64)
food0=empty('Kitchen food rotation',(0,-.3,1.43))
ice0=parent(cube('Hook frozen ice',(-.75,0,.48),(.88,.88,.96),M['ice'],.12),food0)
for j in range(4):parent(cube('Ice white frost',(-1.1+j*.22,-.40,.83),(.10,.02,.16),M['frost'],.025),food0)
b0,s0=bowl('Hook soup',(.7,0,0),.64);parent(b0,food0);parent(s0,food0)
steam=[]
for i in range(6):steam.append(sphere('Steam puff',(0,0,0),.065+i*.008,M['frost']))
bead0=sphere('Ice melt bead',(-.95,-.75,1.7),.05,M['frost'])
# Giant cooking cavity. The magnetron itself lives in the next cutaway stage.
cube('Chamber floor',(20,0,.1),(8,7,.25),M['steel'],.08)
cube('Chamber back',(20,3.2,2.6),(8,.18,5.3),M['steel'],.08)
for x in [16.05,23.95]:cube('Chamber wall',(x,0,2.6),(.18,6.4,5.3),M['steel'],.08)
for z in [1.2,2.0,2.8,3.6,4.4]:cube('Rear shelf groove',(20,3.09,z),(7.4,.04,.025),M['teal'])
plate=cyl('Giant glass turntable',(20,0,.36),2.8,.12,M['frost'],96)
roller=ring('Roller track',(20,0,.26),2.2,.035,M['ink'])
for j in range(3):a=j*math.tau/3;sphere('Turntable roller',(20+2.2*math.cos(a),2.2*math.sin(a),.23),.12,M['ink'])
food=empty('Turntable food',(20,0,.45));bigb,bigs=bowl('Soup in chamber',(.45,.45,0),1.08);parent(bigb,food);parent(bigs,food)
for i in range(5):parent(sphere('Soup herb',(.45+math.cos(i*2.4)*.6,.45+math.sin(i*2.4)*.6,.59),.035,M['teal']),food)
bowlheat=parent(ring('Heat reaches ceramic rim',(.45,.45,.68),1.04,.021,M['warm']),food)
# Magnetron cooling fins, ceramic terminal, antenna and rectangular waveguide.
magcover=cube('Removable side panel',(40,-.4,2.3),(4.2,.18,3.5),M['steel'],.07)
cube('Magnetron base',(40,.15,1.0),(2.4,1.7,.5),M['ink'],.04)
cube('Magnetron front service ledge',(40,-1.2,.86),(2.4,1.4,.18),M['ink'],.04)
for z in [1.35,1.52,1.69,1.86,2.03]:cube('Magnetron cooling fin',(40,.15,z),(2.2,1.6,.065),M['steel'],.025)
cyl('Magnetron ceramic antenna',(40,.15,2.5),.28,.9,M['cream'],24)
cyl('Antenna tip',(40,.15,3.02),.15,.2,M['warm'],20)
for x in [38.9,41.1]:cyl('Ferrite magnet',(x,.15,1.6),.37,.7,M['ink'],24)
waveguide=path('Waveguide route',[(40,.15,3.05),(40,.15,3.6),(42,.15,3.6),(42,.15,2.2),(43.2,.15,2.2)],.28,M['teal'])
for z in [.9,3.5]:cube('Wall beyond waveguide',(43.5,.2,z),(.15,2.4,1.5),M['steel'],.025)
feedwave=path('Wave packet through waveguide',[(40,.15,3.05),(40,.15,3.6),(42,.15,3.6),(42,.15,2.2),(43.7,.15,2.2)],.07,M['wave'])
# Molecular scene: bent water, not a resonance diagram or rigid tumbling molecule.
def molecule(n,pos,scale=1):
 g=empty(n,pos)
 parent(sphere(n+' oxygen',(0,0,0),.23*scale,M['oxygen']),g)
 for sign in [-1,1]:
  h=(sign*.29*scale,0,.24*scale);parent(sphere(n+' hydrogen',h,.14*scale,M['hydrogen']),g)
  parent(path(n+' bond',[(0,0,0),h],.055*scale,M['cream']),g)
 return g
molecules=[];bases=[]
for row in range(3):
 for col in range(3):
  v=Vector((60+(col-1)*1.22,.12*((col+row)%2),1.1+row*1.25));bases.append(v);molecules.append(molecule('Liquid dipole '+str(row*3+col),v,1.1))
hero=molecules[4]
# Story-essential charges remain attached to the same ends of the hero water.
charges=[]
for text,pos in [('+',(0,-.04,.51)),('−',(0,-.04,-.42))]:
 d=bpy.data.curves.new('Partial charge','FONT');d.body=text;d.align_x='CENTER';d.size=.36;d.extrude=.002;o=bpy.data.objects.new('Dipole charge '+text,d);bpy.context.collection.objects.link(o);d.materials.append(M['light']);o.rotation_euler.x=math.pi/2;o.location=pos;o.parent=hero;charges.append(o)
waterwaves=[]
for i in range(4):waterwaves.append(path('Electric field ripple '+str(i),[(57.4+j*.065,.6,1+i*.85+math.sin(j*.25)*.14) for j in range(81)],.022,M['wave']))
arrows=[]
for x in [58,60,62]:
 for z in [1.2,3.6]:
  a=empty('Field direction',(x,.6,z));parent(path('Field arrow shaft',[(0,0,-.35),(0,0,.35)],.026,M['wave']),a)
  parent(path('Arrow head',[(-.12,0,.17),(0,0,.35),(.12,0,.17)],.026,M['wave']),a);arrows.append(a)
# Ice lattice repeats the exact same molecule design, locked in a grid.
ice_mols=[];ice_bases=[];links=[]
for row in range(3):
 for col in range(3):
  v=Vector((80+(col-1)*1.12,0,1.1+row*1.12));ice_bases.append(v);ice_mols.append(molecule('Ice dipole '+str(row*3+col),v,.9))
  if col<2:links.append(path('Hydrogen-bond lattice',[v,Vector((v.x+1.12,v.y,v.z))],.018,M['frost']))
  if row<2:links.append(path('Hydrogen-bond lattice',[v,Vector((v.x,v.y,v.z+1.12))],.018,M['frost']))
outline=[]
for y in [-.5,.5]:
 outline.append(path('Ice crystal frame',[(78.3,y,.5),(81.7,y,.5),(81.7,y,3.8),(78.3,y,3.8),(78.3,y,.5)],.045,M['ice']))
for x in [78.3,81.7]:
 for z in [.5,3.8]:outline.append(path('Crystal depth edge',[(x,-.5,z),(x,.5,z)],.045,M['ice']))
icewaves=[]
for i in range(3):icewaves.append(path('Wave passes through pure ice',[(77+j*.075,.35,.9+i*.85+math.sin(j*.30)*.16) for j in range(81)],.023,M['wave']))
melt=sphere('First melted patch',(79.2,-.62,.56),.17,M['warm'])
heatfront=path('Conduction spreads while power is off',[(78.9,-.28,.85),(78.9,-.28,1.1),(80,-.28,1.1),(80,-.28,2.22),(81.12,-.28,2.22)],.025,M['light'])
# Giant door mesh, x=101.2. Miko's hands stop on its inner side.
for y in [i*.24-2.9 for i in range(25)]:cube('Door vertical wire',(101.2,y,2.6),(.075,.045,5.5),M['steel'])
for z in [.1+i*.24 for i in range(24)]:cube('Door horizontal wire',(101.2,0,z),(.075,6,.045),M['steel'])
for y in [-3.1,3.1]:cube('Door macro frame',(101.2,y,2.7),(.24,.24,5.8),M['ink'],.05)
doorwaves=[]
for i in range(3):
 o=path('Reflected microwave front '+str(i),[(0,math.cos(j/64*math.tau)*1.5,2.7+math.sin(j/64*math.tau)*1.5) for j in range(65)],.035,M['wave']);doorwaves.append(o)
lightwave=path('Visible light crosses mesh',[(98+j*.065,.04,2.62+math.sin(j*1.5)*.028) for j in range(101)],.013,M['light'])
# Stationary heating pattern under a rotating plate. This is a field schematic.
hotspots=[]
for i in range(5):
 for j in range(5):
  x=(i-2)*.92;y=(j-2)*.92
  if x*x+y*y>6.5:continue
  o=cyl('Stationary hot spot' if (i+j)%2==0 else 'Stationary cold spot',(20+x,y,.44),.37,.018,M['warm'] if (i+j)%2==0 else M['cold'],24);hotspots.append(o)
cavitywaves=[]
for i in range(4):cavitywaves.append(path('Chamber standing wave',[(17.0+j*.075,-.4+i*.7,.92+.22*math.cos(j*.29)) for j in range(81)],.026,M['wave']))
# Pixel actors use native model GIF frames, never the browser's GIF clock.
def actor(n,file,meta,height):
 crop=meta['crop'];m,mp=image_material(n,file,(crop['width']/meta['width'],crop['height']/meta['height']));o=plane(n,(0,0,0),height*crop['width']/crop['height'],height,m);o['base_height']=height;return o,mp,meta
sheet=json.loads((ROOT/'public/pixel/microwave/miko-four-v1.json').read_text())
E,EMP,EM=actor('Miko four clean poses','public/pixel/microwave/miko-four-v1.png',sheet,1)
meta=json.loads((ROOT/'output/imagegen/miko-microwave-v1/brace-atlas.json').read_text());B,BMP,BM=actor('Miko native door brace','output/imagegen/miko-microwave-v1/brace-atlas.png',meta,1)
meta=json.loads((ROOT/'output/imagegen/miko-guitar-explore-v1/explore-atlas.json').read_text());W,WMP,WM=actor('Miko native exploration','output/imagegen/miko-guitar-explore-v1/explore-atlas.png',meta,1)
meta=json.loads((ROOT/'output/imagegen/miko-guitar-wind-v1/wind-atlas.json').read_text());R,RMP,RM=actor('Miko native turntable balance','output/imagegen/miko-guitar-wind-v1/wind-atlas.png',meta,1)
cam_data=bpy.data.cameras.new('CAM_MicrowaveNarrative');cam=bpy.data.objects.new('CAM_MicrowaveNarrative',cam_data);bpy.context.collection.objects.link(cam);S.camera=cam;cam_data.lens=43;cam_data.clip_start=.025;cam_data.clip_end=180
# Isolated dust adds depth without obscuring the explanatory mechanism.
dust=[]
for x in [0,20,40,60,80,100]:
 for i in range(12):dust.append((sphere('Drifting kitchen dust',(x,0,0),.008+.003*(i%3),M['frost']),x,i))

def put(o,mp,meta,index,pos,height):
 show(o,True);o.location=pos;o.scale=(height,height,height);atlas(mp,meta,index);face(o)
 crop=meta['crop'];cell=meta['cells'][index];gap=(crop['y']+crop['height']-1-cell['bottom'])/crop['height'];o.location.z-=gap*height

def update(t):
 shot=next((s for s in C['shots'] if s['start']<=t<s['start']+s['duration']),C['shots'][-1]);n=shot['id'];u=t-shot['start'];p=u/shot['duration']
 for o in [E,B,W,R]:show(o,False)
 cam_data.lens=43
 for o in waterwaves+arrows:show(o,n in ['field','follow','heat'])
 for o in charges:show(o,n in ['water','field','follow'])
 for o in doorwaves:show(o,n=='door')
 show(lightwave,n=='light')
 show(bowlheat,n=='soup' and u>.65)
 bowlheat.data.bevel_factor_end=max(.001,smooth((u-.65)/1.4))
 for o in hotspots+cavitywaves:show(o,n in ['hotspots','ride'])
 for o in icewaves:show(o,n in ['lattice','defrost'])
 show(melt,n=='defrost');show(heatfront,n=='defrost')
 show(magcover,n=='magnetron' and u<.8)
 food0.rotation_euler.z=t*.72;food.rotation_euler.z=t*.42
 for i,o in enumerate(steam):
  a=(t*.6+i/6)%1;o.location=(.7+.09*math.sin(a*5+i),-.30+.04*math.cos(i),1.78+a*.6);o.scale=(1+a*.5,1+a*.5,1+a)
 if n in ['hook','ice','closer','loop']:
  tt=t if n in ['hook','ice'] else t-45
  if n in ['hook','closer','loop']:
   q=smooth(max(0,tt)/.9) if n=='hook' else 0
   cam.location=lerp((2.0,-10.0,4.1),(1.7,-9.3,3.9),q);aim(cam,(-.2,-.5,2.2));cam_data.lens=39
  else:cam.location=(-.15,-6.7,3.6);aim(cam,(-.6,-.2,1.9));cam_data.lens=47
  if n in ['closer','loop']:
   food0.rotation_euler.z=tt*.72
   for i,o in enumerate(steam):
    a=(tt*.6+i/6)%1;o.location=(.7+.09*math.sin(a*5+i),-.30+.04*math.cos(i),1.78+a*.6);o.scale=(1+a*.5,1+a*.5,1+a)
  if n!='ice':put(E,EMP,EM,0,(-.6,-3.2,1.03),1.8)
  bead0.location=(-.95,-.75,1.9-.25*((t*.8)%1))
 elif n=='dive':
  cam.location=lerp((24,-10,6),(22.0,-5.0,3.4),smooth(p));aim(cam,(20,0,1.4));cam_data.lens=41
  put(W,WMP,WM,min(11,int(u*10)),(21,-1.15,.43),.9)
 elif n in ['magnetron','feed']:
  cam.location=(43,-7.3,4.7) if n=='magnetron' else (44,-10,5.7);aim(cam,(40.5,.1,2.15) if n=='magnetron' else (41.3,.1,2.7));cam_data.lens=43 if n=='magnetron' else 37
  magcover.location=(40-3*smooth(u/.65),-.4,2.3)
  feedwave.location.y=-.30 if n=='feed' else 0
  feedwave.data.bevel_factor_end=max(.001,smooth(u/(1.4 if n=='feed' else 2.0)));feedwave.data.bevel_factor_start=max(0,feedwave.data.bevel_factor_end-.2)
  age=max(0,u-.65) if n=='magnetron' else u
  put(W,WMP,WM,min(11,int(age*10)),(39.6,-.45,2.065),.75)
  if n=='magnetron' and u<.65:show(W,False)
 elif n in ['water','field','follow','heat']:
  if n in ['water','follow']:cam.location=(61.1,-3.3,3.0);aim(cam,(60,0,2.34));cam_data.lens=43
  else:cam.location=(63.3,-8,4.8);aim(cam,(60,0,2.25));cam_data.lens=43
  # A local angle change in the long field beat shows a second depth plane.
  if n=='field' and u>2.3:cam.location=(60.8,-6.5,3.7);aim(cam,(60,0,2.35));cam_data.lens=46
 elif n=='soup':
  cam.location=(23.4,-5.7,3.9);aim(cam,(20.1,.25,1.15));cam_data.lens=44
  put(E,EMP,EM,1,(21,.6,.43),.8)
 elif n in ['lattice','defrost']:
  cam.location=(83.1,-8.5,4.6);aim(cam,(80,0,2.0));cam_data.lens=44
  if n=='defrost' and u>2.2:cam.location=(81.3,-5,2.6);aim(cam,(79.7,-.1,1.5));cam_data.lens=41
  if not (n=='defrost' and u>2.2):put(E,EMP,EM,0,(78.9,-1.0,.01),.9)
 elif n in ['door','light']:
  if n=='door':
   cam.location=(95,-8.0,4.1);aim(cam,(100.4,-.1,1.8));cam_data.lens=43
   put(B,BMP,BM,min(11,int(u*10)),(100.68,-1.3,.01),1.65)
  else:cam.location=(98.5,-3.8,3.0);aim(cam,(101.2,.05,2.58));cam_data.lens=47
 elif n in ['hotspots','ride']:
  cam.location=(24.7,-9.5,8.3) if n=='hotspots' else (23.7,-9,5.4);aim(cam,(20,0,.7));cam_data.lens=36
  a=.35+(t-35.9)*.42;pos=(20-2.35*math.cos(a),-2.35*math.sin(a),.43)
  put(R,RMP,RM,min(11,int(u*10)),pos,.95)
 # Keep water movement visibly lagging the field. In ice it is only a wiggle.
 for i,(o,v) in enumerate(zip(molecules,bases)):
  o.location=v;phase=t*math.tau*.72;turn=1.3*math.sin(phase-.48-i*.08)
  visible=n not in ['water','follow'] or i==4
  o.rotation_euler.y=turn if n in ['field','follow','heat'] else .12*math.sin(t*1.3+i)
  if n=='heat':
   age=u-i*.1;o.location=v+Vector((.19*math.sin(age*8+i),.025*math.cos(age*7),.13*math.sin(age*9)))
  o.scale=(1,1,1) if visible else (0,0,0)
 for i,a in enumerate(arrows):
  a.rotation_euler.y=math.pi/2 if math.sin(t*math.tau*.72)>0 else -math.pi/2
  a.scale=(1,1,1) if n in ['field','follow','heat'] else (0,0,0)
 for i,o in enumerate(waterwaves):o.location.z=.08*math.sin(t*3.5+i);o.data.bevel_factor_end=max(.001,smooth(u/.5))
 heat=smooth(u/1.4) if n in ['heat','soup'] else 0
 M['oxygen'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.9*heat
 M['oxygen'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*lerp(rgb('#b77567'),rgb('#dfae62'),heat),1)
 M['soup'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.15+.65*heat
 for i,(o,v) in enumerate(zip(ice_mols,ice_bases)):
  o.location=v;o.rotation_euler.y=.035*math.sin(t*6+i)
  if n=='defrost' and i==0:
   q=smooth((u-.7)/1.7);o.location=v+Vector((-.22*q,-.2*q,-.35*q));o.rotation_euler.y+=q*.7
 pulse=(1 if u<.8 or 2.6<u<3.2 else .08) if n=='defrost' else 1
 for i,o in enumerate(icewaves):
  o.data.bevel_factor_start=max(0,((t*.65+i/3)%1)-.33);o.data.bevel_factor_end=max(.001,(t*.65+i/3)%1)
  show(o,n=='lattice' or (n=='defrost' and pulse>.5))
 if n=='defrost':
  q=smooth((u-.65)/1.4);melt.scale=(.3+q*1.5,1,.3+q*.3)
  heatfront.scale=(1,1,1)
  heatfront.data.bevel_factor_end=max(.001,smooth((u-.9)/1.5))
 for i,o in enumerate(doorwaves):
  phase=(u*.58+i/3)%1;o.location.x=98.2+3*(1-abs(phase*2-1));o.scale=(1,.9+.05*i,.9+.05*i)
 lightwave.data.bevel_factor_end=max(.001,smooth(u/1.5));lightwave.data.bevel_factor_start=max(0,lightwave.data.bevel_factor_end-.55)
 for i,o in enumerate(cavitywaves):o.scale.z=1+.08*math.sin(t*4+i)
 for o,x,i in dust:o.location=(x-2.5+(i*.73)%5,-1.5+(i*.53)%5,.5+(i*.47+t*.035)%4)
 # Steam follows its bowl, including the loop's return phase.
 rot=food0.rotation_euler.to_matrix()
 phase=t if n not in ['closer','loop'] else t-45
 for i,o in enumerate(steam):
  show(o,n!='ice')
  a=(phase*.6+i/6)%1;v=rot@Vector((.7+.07*math.sin(a*5+i),.04*math.cos(i),.4+a*.65));o.location=food0.location+v;o.scale=(.8+a*.5,.8+a*.5,1+a)

 return shot

# Bake an editable camera and geometry action for every frame. Keep GIF UVs saved.
animated=[E,B,W,R,cam,magcover,food0,food,bead0,melt,heatfront]+charges+steam+molecules+ice_mols+arrows+waterwaves+icewaves+doorwaves+cavitywaves+[feedwave,lightwave]+hotspots+[bowlheat]+[o for o,_,_ in dust]
if args.bake:
 for f in range(1350):
  S.frame_set(f+1);update(f/30)
  for o in animated:
   for prop in ['location','rotation_euler','scale','hide_render','hide_viewport']:o.keyframe_insert(prop,frame=f+1)
  for mp in [EMP,BMP,WMP,RMP]:mp.inputs['Location'].keyframe_insert('default_value',frame=f+1)
  for o in waterwaves+icewaves+[feedwave,heatfront,lightwave,bowlheat]:
   o.data.keyframe_insert('bevel_factor_start',frame=f+1);o.data.keyframe_insert('bevel_factor_end',frame=f+1)
  for name in ['oxygen','soup']:M[name].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].keyframe_insert('default_value',frame=f+1)
  M['oxygen'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].keyframe_insert('default_value',frame=f+1)
  cam_data.keyframe_insert('lens',frame=f+1)
 for o in animated:
  if not o.animation_data or not o.animation_data.action:continue
  try:
   bag=o.animation_data.action.layers[0].strips[0].channelbag(o.animation_data.action_slot)
   for fc in bag.fcurves:
    for key in fc.keyframe_points:key.interpolation='CONSTANT' if 'hide_' in fc.data_path else 'LINEAR'
  except (AttributeError,IndexError):pass
for im in bpy.data.images:
 if im.filepath:im.pack()
S.frame_set(1);update(0)
if not args.no_save:bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/V['blendFile']))
if args.audit:
 from bpy_extras.object_utils import world_to_camera_view
 rows=[]
 for t in [0,.6,2.1,2.8,5.6,8.5,21.6,24.7,32.4,35.9,36.2,37.217,38.83,40.3,42.033,43,44.9667]:
  update(t);bpy.context.view_layer.update();vis=[]
  for o,mp,meta in [(E,EMP,EM),(B,BMP,BM),(W,WMP,WM),(R,RMP,RM)]:
   if o.hide_render:continue
   pts=[world_to_camera_view(S,cam,o.matrix_world@Vector(v)) for v in o.bound_box]
   hit=[]
   for z in [.2,.65,.85]:
    target=o.matrix_world@Vector((0,-.01,z));delta=target-cam.location
    ray=S.ray_cast(bpy.context.evaluated_depsgraph_get(),cam.location,delta.normalized(),distance=delta.length)
    hit.append(ray[4].name if ray[0] else 'none')
   vis.append({'actor':o.name,'location':list(o.location),'screenRect':[min(v.x for v in pts),min(v.y for v in pts),max(v.x for v in pts),max(v.y for v in pts)],'rayHits':hit})
  rows.append({'seconds':t,'actors':vis})
 (ROOT/'blender/microwave/actor-audit.json').write_text(json.dumps(rows,indent=2))
 print(json.dumps(rows))
if args.stills:
 for sec in [.0,.6,2.8,4.3,5.6,8.5,10.6,14.0,15.7,17.0,19.3,21.6,24.7,28.6,30.4,32.4,34.8,37.0,40,43.0,44.9667]:
  S.frame_set(round(sec*30)+1);update(sec);S.render.filepath=str(OUT/f'check-{round(sec*30):04d}.png');bpy.ops.render.render(write_still=True)
elif args.range:
 frames=[]
 for chunk in args.range.split(','):
  a,b=map(int,chunk.split(':'));frames.extend(range(a,b+1))
 for f in frames:
  file=OUT/f'{f:04d}.png'
  if file.exists():continue
  S.frame_set(f+1);update(f/30);S.render.filepath=str(file);bpy.ops.render.render(write_still=True)
print(json.dumps({'blend':V['blendFile'],'objects':len(bpy.data.objects),'frames':1350,'worldResolution':[540,960],'samples':24}))
