"""Selected 16:9 hero shots; deterministic animation from frame numbers."""
import bpy, math, json, sys, argparse
import fcntl
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--shot',choices=['bedroom','map','dna','phone'],required=True);p.add_argument('--stills',action='store_true');p.add_argument('--render',action='store_true');p.add_argument('--range');p.add_argument('--revision',default='v1');p.add_argument('--width',type=int,default=960);p.add_argument('--samples',type=int,default=24);a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
D={'bedroom':8,'map':9,'dna':10,'phone':8}[a.shot];FPS=30;N=D*FPS
OUT=ROOT/'blender/inventions-since-2000'/a.shot
if a.revision!='v1':OUT=OUT/a.revision
OUT.mkdir(parents=True,exist_ok=True);FR=OUT/('frames-'+a.revision);FR.mkdir(exist_ok=True)
render_lock=(OUT/'.render.lock').open('a');fcntl.flock(render_lock,fcntl.LOCK_EX)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.render.engine='BLENDER_EEVEE';S.eevee.taa_render_samples=a.samples;S.eevee.use_raytracing=False;S.eevee.use_fast_gi=False;S.eevee.shadow_ray_count=1;S.render.resolution_x=a.width;S.render.resolution_y=round(a.width*9/16);S.render.resolution_percentage=100;S.render.fps=FPS;S.frame_start=1;S.frame_end=N;S.render.image_settings.file_format='PNG';S.render.image_settings.color_mode='RGB';S.render.image_settings.compression=15;S.render.use_motion_blur=False;S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast';S.view_settings.exposure=.15

def rgb(h):
 c=[int(h.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)];return tuple(v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in c)
def mat(n,c,emit=0,metal=0):
 m=bpy.data.materials.new(n);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*rgb(c),1);b.inputs['Roughness'].default_value=.72;b.inputs['Metallic'].default_value=metal;b.inputs['Emission Color'].default_value=(*rgb(c),1);b.inputs['Emission Strength'].default_value=emit;return m
def cube(n,pos,dim,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=n;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);return o
def ball(n,pos,r,m):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,location=pos);o=bpy.context.object;o.name=n;o.data.materials.append(m);return o
def line(n,pts,r,m):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=0;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for d,v in zip(s.points,pts):d.co=(*v,1)
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);c.materials.append(m);return o
def empty(n,pos=(0,0,0)):
 o=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(o);o.location=pos;return o
def parent(o,g):o.parent=g;return o
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
def light(n,pos,target,power,c,size):
 d=bpy.data.lights.new(n,'AREA');d.energy=power;d.color=rgb(c);d.shape='DISK';d.size=size;o=bpy.data.objects.new(n,d);bpy.context.collection.objects.link(o);o.location=pos;aim(o,target);return o
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def lerp(a,b,p):return tuple(x+(y-x)*p for x,y in zip(a,b))
def text(n,body,pos,size,m):
 d=bpy.data.curves.new(n,'FONT');d.body=body;d.align_x='CENTER';d.align_y='CENTER';d.size=size;d.extrude=.004;o=bpy.data.objects.new(n,d);bpy.context.collection.objects.link(o);d.materials.append(m);o.location=pos;return o
M={k:mat(k,c,e,metal) for k,c,e,metal in [('ink','#152e39',0,0),('teal','#497d83',0,0),('wood','#c09861',0,0),('cream','#e7dbb8',0,0),('gold','#e8c887',.1,0),('green','#8fafa0',0,0),('screen','#b9e1d5',2.3,0),('red','#ad453d',0,0),('metal','#8c9b9b',0,.5),('copper','#c89969',0,.25),('blue','#7ca8c2',.5,0)]}
w=bpy.data.worlds.new('Cool ambient');S.world=w;w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(*rgb('#96bac7'),1);w.node_tree.nodes['Background'].inputs[1].default_value=.20
nt=bpy.data.node_groups.new('Restrained practical glow','CompositorNodeTree');S.compositing_node_group=nt;nt.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor');rl=nt.nodes.new('CompositorNodeRLayers');gl=nt.nodes.new('CompositorNodeGlare');gl.inputs['Type'].default_value='Fog Glow';gl.inputs['Threshold'].default_value=2;gl.inputs['Strength'].default_value=.12;gl.inputs['Size'].default_value=.2;out=nt.nodes.new('NodeGroupOutput');nt.links.new(rl.outputs['Image'],gl.inputs['Image']);nt.links.new(gl.outputs['Image'],out.inputs['Image'])
cd=bpy.data.cameras.new('CAM_'+a.shot);cam=bpy.data.objects.new('CAM_'+a.shot,cd);bpy.context.collection.objects.link(cam);S.camera=cam;cd.lens=42;cd.sensor_width=36;cd.clip_start=.05;cd.clip_end=200
light('LGT_Key_Main',(-5,-4,8),(0,0,1),1600,'#ffdaa4',5);light('LGT_Rim_Back',(4,3,5),(0,0,1),1000,'#9bc9dd',4);light('LGT_Fill_Soft',(2,-6,3),(0,0,1),180,'#d9e5e5',5)
actors=[];atlas_nodes=[]
def actor(file,pos,height,atlas=None):
 im=bpy.data.images.load(str(ROOT/file),check_existing=True);m=bpy.data.materials.new('Miko clean pixel sprite');m.use_nodes=True;m.surface_render_method='DITHERED';ns=m.node_tree.nodes;ns.clear();lk=m.node_tree.links;out=ns.new('ShaderNodeOutputMaterial');bs=ns.new('ShaderNodeBsdfPrincipled');bs.inputs['Roughness'].default_value=1;bs.inputs['Specular IOR Level'].default_value=0;bs.inputs['Emission Strength'].default_value=.45;tex=ns.new('ShaderNodeTexImage');tex.image=im;tex.interpolation='Closest';lk.new(tex.outputs['Color'],bs.inputs['Base Color']);lk.new(tex.outputs['Color'],bs.inputs['Emission Color']);al=ns.new('ShaderNodeMath');al.operation='GREATER_THAN';al.inputs[1].default_value=.6;lk.new(tex.outputs['Alpha'],al.inputs[0]);tr=ns.new('ShaderNodeBsdfTransparent');mix=ns.new('ShaderNodeMixShader');lk.new(al.outputs[0],mix.inputs[0]);lk.new(tr.outputs[0],mix.inputs[1]);lk.new(bs.outputs[0],mix.inputs[2]);lk.new(mix.outputs[0],out.inputs[0]);width=height*im.size[0]/im.size[1];
 if atlas:
  meta=json.loads((ROOT/atlas).read_text());mp=ns.new('ShaderNodeMapping');uv=ns.new('ShaderNodeTexCoord');lk.new(uv.outputs['UV'],mp.inputs['Vector']);lk.new(mp.outputs[0],tex.inputs['Vector']);mp.inputs['Scale'].default_value=(meta['crop']['width']/meta['width'],meta['crop']['height']/meta['height'],1);width=height*meta['crop']['width']/meta['crop']['height'];atlas_nodes.append((mp,meta))
 if a.revision!='v1':
  # The character is illustrated ink in a lit 3D set. Keep face contrast stable.
  emission=ns.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=.9;lk.new(tex.outputs['Color'],emission.inputs['Color']);lk.new(emission.outputs[0],mix.inputs[2])
 me=bpy.data.meshes.new('Upright character quad');me.from_pydata([(-width/2,0,0),(width/2,0,0),(width/2,0,height),(-width/2,0,height)],[],[(0,1,2,3)]);me.uv_layers.new()
 for i,uv in enumerate([(0,0),(1,0),(1,1),(0,1)]):me.uv_layers.active.data[i].uv=uv
 me.materials.append(m);o=bpy.data.objects.new('CHR_Miko',me);bpy.context.collection.objects.link(o);o.location=pos;actors.append(o);return o
parts=[];routes=[];dots=[];dust=[]
if a.shot=='bedroom':
 for i in range(17):cube('Floor board',(i*.48-4,0,-.08),(.465,8,.15),M['wood'])
 cube('Back wall',(0,3.3,2.6),(9,.18,5.4),M['teal']);cube('Window recess',(-2.5,3.18,3.15),(2.4,.07,2.7),M['cream']);cube('Warm dawn',(-2.5,3.10,3.15),(2.1,.06,2.4),M['screen'])
 for x in [-3.55,-2.5,-1.45]:cube('Window mullion',(x,2.99,3.15),(.08,.12,2.5),M['wood'])
 for z in [1.95,3.15,4.35]:cube('Window rail',(-2.5,2.99,z),(2.2,.12,.08),M['wood'])
 cube('Bed frame',(-1.4,.5,.38),(2.4,3.5,.48),M['ink']);cube('Mattress',(-1.4,.5,.74),(2.35,3.4,.33),M['cream']);cube('Folded blanket',(-1.4,-.05,.96),(2.34,2.2,.18),M['teal']);cube('Headboard',(-1.4,2.2,.92),(2.5,.18,1.55),M['wood']);cube('Pillow',(-1.4,1.8,1.0),(1.65,.7,.2),M['cream'])
 cube('Bedside drawer',(1.0,.0,.55),(1.05,.9,1.1),M['wood']);cube('Drawer face',(1,-.475,.53),(.91,.04,.72),M['cream']);cube('Drawer pull',(1,-.53,.57),(.24,.1,.045),M['ink']);phone=empty('Phone vibration',(1,-.05,1.14));parent(cube('Phone body',(0,0,0),(.40,.73,.07),M['ink']),phone);parent(cube('Phone lit screen',(0,0,.04),(.34,.63,.015),M['screen']),phone)
 miko=actor('public/episodes/inventions-since-2000/art/wake-atlas.png' if a.revision!='v1' else 'output/imagegen/miko-inventions-wake-v1/wake-atlas.png',(-.68,-.65,.38),1.85,'public/episodes/inventions-since-2000/art/wake-atlas.json' if a.revision!='v1' else 'output/imagegen/miko-inventions-wake-v1/wake-atlas.json')
 for i in range(18):
  q=ball('Dust in window shaft',(-3+(i%6)*.7,-1+(i//6)*1.0,1+(i%7)*.42),.012,M['gold']);dust.append((q,q.location.copy()))
 for x in [2.6,3.2]:cube('Book on shelf',(x,2.95,1.9),(.3,.4,.6),M['wood'])
 cube('Wall shelf',(2.9,2.9,1.55),(2.1,.6,.1),M['ink'])
elif a.shot=='map':
 cube('Map plinth',(0,0,-.22),(15,11,.4),M['ink']);cube('Map ground',(0,0,0),(14,10,.1),M['green'])
 for x in range(-6,7,2):cube('North south road',(x,0,.08),(.55,10,.07),M['teal'])
 for y in range(-4,5,2):cube('East west road',(0,y,.09),(14,.55,.07),M['teal'])
 for x in range(-6,7,2):
  for y in range(-4,5,2):
   if (x,y) in [(-4,-2),(-2,-2),(0,-2),(2,-2),(2,0),(2,2)]:continue
   for j in range(2):
    h=.4+((x*7+y*3+j*5)%13)*.12;cube('Voxel city building',(x+.65,y+.65+j*.43,h/2+.12),(.55,.34,h),M['cream'] if (x+y+j)%3 else M['wood'])
 route=[(-4,-2,.18),(-2,-2,.18),(0,-2,.18),(2,-2,.18),(2,0,.18),(2,2,.18)]
 line('Suggested route',route,.055,M['screen'])
 for i in range(28):
  o=cube('Aggregated traffic device',(0,0,.23),(.13,.25,.12),M['gold']);dots.append(o)
 pin=empty('Destination marker',(2,2,.2));parent(line('Marker stem',[(0,0,0),(0,0,1.4)],.035,M['gold']),pin);parent(ball('Destination pin',(0,0,1.45),.22,M['gold']),pin)
 # Map is an explanatory city model; no flattened sprite under the overhead camera.
elif a.shot=='dna':
 cube('Microscopic stage',(0,0,-2.8),(18,10,.25),M['ink']);segments=[];cutlinks=[]
 dna_group=empty('DNA lower portion');upper=empty('DNA upper portion');upper.parent=dna_group
 for i in range(17):
  z=(i-8)*.32;t=i*.48;x=math.cos(t)*1.1;y=math.sin(t)*1.1;group=upper if i>8 else dna_group
  for sign in [-1,1]:parent(ball('DNA backbone',(sign*x,sign*y,z),.13,M['copper'] if sign==1 else M['teal']),group)
  rung=parent(line('DNA paired bases',[(-x,-y,z),(x,y,z)],.06,M['gold']),group);segments.append(rung)
  if i<16:
   t2=(i+1)*.48
   for sign in [-1,1]:
    o=parent(line('DNA backbone link',[(sign*x,sign*y,z),(sign*math.cos(t2)*1.1,sign*math.sin(t2)*1.1,z+.32)],.065,M['teal'] if sign==-1 else M['copper']),group)
    if i==8:cutlinks.append(o)
 cas=empty('Cas9 guided cutter',(-3.3,-.4,0));parent(ball('Cas9 protein body',(0,0,0),.63,M['teal']),cas)
 for pos,r in [((-.35,.1,.25),.34),((.32,.1,.2),.32),((0,.15,-.35),.31)]:parent(ball('Cas9 protein lobe',pos,r,M['teal']),cas)
 parent(line('Guide RNA',[(-1.5,0,0),(-.8,0,.1),(0,0,0),(.8,0,.05)],.045,M['screen']),cas)
 # Miko stays in the surrounding cell shots; this macro isolates the guide and cut.
 for i in range(35):
  q=ball('Molecular depth particle',((i%7-3)*1.2,2+(i%3),-3+(i//7)*1.4),.025,M['blue']);dust.append((q,q.location.copy()))
else:
 cube('Desk surface',(0,0,-.2),(16,10,.4),M['wood']);cube('Night wall',(0,4,3),(18,.2,7),M['teal']);g=empty('Phone assembly',(0,0,2.2));parent(cube('Phone case',(0,0,0),(2.3,.21,4.1),M['ink']),g);parent(cube('Phone glass',(0,-.13,.13),(2.12,.035,3.53),M['ink']),g);parent(cube('Phone home button',(0,-.15,-1.78),(.27,.035,.27),M['metal']),g);parent(cube('Phone speaker',(0,-.15,1.91),(.48,.03,.055),M['metal']),g)
 for i,(label,ma) in enumerate([('CAM',M['cream']),('MP3',M['gold']),('MAP',M['green']),('WEB',M['blue'])]):
  x=(-.52 if i%2==0 else .52);z=(.7 if i<2 else -.5);parent(cube('Feature app tile '+label,(x,-.16,z),(.83,.035,.86),ma),g);o=text('App '+label,label,(x,-.187,z),.16,M['ink']);o.rotation_euler.x=math.pi/2;parent(o,g)
 specs=[('Camera',(-4,0,2.8),M['cream']),('Music player',(-3,-.2,.6),M['gold']),('Folded map',(3.7,0,2.7),M['green']),('Browser',(3.3,-.3,.5),M['blue'])]
 for n,pos,m in specs:
  q=empty(n+' transforms',pos);body=parent(cube(n+' body',(0,0,0),(.95,.3,.72),m),q)
  if n=='Camera':
   parent(ball('Camera lens',(0,-.22,0),.23,M['ink']),q);parent(cube('Camera viewfinder',(.32,-.18,.20),(.14,.04,.12),M['teal']),q)
  elif n=='Music player':
   parent(cube('Player screen',(0,-.18,.13),(.65,.02,.25),M['ink']),q);parent(ball('Player click wheel',(0,-.19,-.18),.14,M['cream']),q)
  elif n=='Folded map':
   for j in range(3):parent(cube('Map paper fold',(j*.29-.29,-.03,(j%2)*.06),(.28,.08,.68),M['cream']),q)
   parent(line('Map route',[(-.35,-.12,-.2),(0,-.12,0),(.35,-.12,.2)],.025,M['teal']),q)
  else:
   for z in [-.18,0,.18]:parent(cube('Browser text rule',(0,-.18,z),(.68,.025,.045),M['cream']),q)
  parts.append((q,Vector(pos)))
 miko=actor('public/episodes/inventions-since-2000/art/miko-home-3.png',(-2.7,-1.6,.03),1.65)

def update(frame):
 t=(frame-1)/FPS;p=t/D
 if a.shot=='bedroom':
  cam.location=lerp((4.7,-6.4,3.7),(6.2,-8.8,5.0),smooth(p));aim(cam,(-.12,.0,1.25));phone.rotation_euler.z=.045*math.sin(t*45)*max(0,1-t/1.0);phone.location.x=1+.018*math.sin(t*45)*max(0,1-t/1.0)
 elif a.shot=='map':
  cam.location=lerp((5.5,-9,7),(1.2,-4.8,12.5),smooth(p));aim(cam,(0,0,.2));cd.lens=38
  for i,o in enumerate(dots):
   k=((t*.35+i*.19)%5);j=int(k);f=k-j;o.location=Vector(route[j]).lerp(Vector(route[j+1]),f)+Vector((0,0,.08));o.rotation_euler.z=math.pi/2 if j<3 else 0
 elif a.shot=='dna':
  cam.location=lerp((6.7,-11,3.8),(4.0,-7.8,1.5),smooth(p));aim(cam,(0,0,0));dna_group.rotation_euler.z=.12*math.sin(t*.35);cas.location.x=-3.3+2.35*smooth((t-1)/3);cas.location.z=.1*math.sin(t*1.5);cas.scale=(1,1,1)
  cut=smooth((t-5.0)/.6)
  upper.location.z=1.12*cut;cas.location.x-=1.25*cut
  for o in cutlinks:o.hide_render=cut>.4;o.hide_viewport=cut>.4
 else:
  cam.location=lerp((6,-11,5.2),(4.2,-9.8,4.5),smooth(p));aim(cam,(0,0,2.1));cd.lens=38;g.rotation_euler.z=.08*math.sin(t*.5);g.rotation_euler.x=math.radians(8)
  for i,(o,start) in enumerate(parts):
   q=smooth((t-(1.0+i*.6))/2.2);o.location=start.lerp(Vector((0,0,2.2)),q);o.scale=(max(.001,1-q),)*3;o.rotation_euler.z=(.1 if i%2 else -.1)*q
 for mp,meta in atlas_nodes:
  index=min(meta['frameCount']-1,int(t*1000/meta['frameDurationMs']));crop=meta['crop'];col=index%meta['columns'];row=index//meta['columns'];mp.inputs['Location'].default_value=((col*meta['cellWidth']+crop['x'])/meta['width'],1-(row*meta['cellHeight']+crop['y']+crop['height'])/meta['height'],0)
 for o,base in dust:o.location=base+Vector((math.sin(t*.5+base.x)*.025,0,((t*.035+base.z)%1)*.08))
 for o in actors:o.rotation_euler.z=math.atan2(cam.location.x-o.location.x,-(cam.location.y-o.location.y))
 return t

# Save actual keyed motion so the .blend is useful without this Python process.
for f in range(1,N+1):
 update(f)
 for o in [cam,*actors,*[v[0] for v in dust],*[v[0] for v in parts],*dots]+([phone] if a.shot=='bedroom' else [dna_group,upper,cas,*cutlinks] if a.shot=='dna' else [g] if a.shot=='phone' else []):
  o.keyframe_insert(data_path='location',frame=f);o.keyframe_insert(data_path='rotation_euler',frame=f);o.keyframe_insert(data_path='scale',frame=f);o.keyframe_insert(data_path='hide_render',frame=f);o.keyframe_insert(data_path='hide_viewport',frame=f)
for f in range(1,N+1):
 update(f)
 for mp,meta in atlas_nodes:mp.inputs['Location'].keyframe_insert(data_path='default_value',frame=f)
S.frame_set(1);update(1);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(a.shot+'-'+a.revision+'.blend')))
manifest={'shot':a.shot,'duration':D,'fps':FPS,'frames':N,'worldResolution':[S.render.resolution_x,S.render.resolution_y],'deliveryResolution':[1920,1080],'samples':a.samples,'blendFile':str((OUT/(a.shot+'-'+a.revision+'.blend')).relative_to(ROOT)),'framesFolder':str(FR.relative_to(ROOT)),'animation':'Baked keyframes sampled from integer frame / 30; upright camera-facing Miko sprites.'};(OUT/('manifest-'+a.revision+'.json')).write_text(json.dumps(manifest,indent=2)+'\n')
frames=[1,N//2,N] if a.stills else range(1,N+1) if a.render else []
if a.range:
 lo,hi=map(int,a.range.split(':'));frames=range(lo,hi+1)
rendered=0
for f in frames:
 target=(OUT if a.stills else FR)/(f'still-{f:04}.png' if a.stills else f'{f:04}.png')
 if a.revision!='v1' and target.exists() and target.stat().st_size>=8:
  with target.open('rb') as existing:
   existing.seek(-8,2)
   if existing.read()==b'IEND\xaeB`\x82':continue
 S.frame_set(f);update(f);S.render.filepath=str(target);bpy.ops.render.render(write_still=True);rendered+=1
print(json.dumps({'shot':a.shot,'saved':str(OUT),'rendered':rendered,'requested':len(frames)}))
