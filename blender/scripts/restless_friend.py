"""Reusable living-room/laboratory sets with deterministic pixel-character acting."""
from pathlib import Path
import argparse,json,math,sys,time,os
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser();parser.add_argument('--stills',action='store_true');parser.add_argument('--still-times');parser.add_argument('--render',action='store_true');parser.add_argument('--range');parser.add_argument('--samples',type=int);parser.add_argument('--revision',default='v1');parser.add_argument('--assets',default='episodes/restless-friend/assets/animation-registry.json')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT=ROOT/'blender/restless-friend';CFG=json.loads((OUT/'config-v1.json').read_text());FPS=CFG['fps'];D=CFG['duration'];N=round(D*FPS);EVENT=CFG['events'];RECIPE=CFG['recipe']
FR=OUT/('frames-'+args.revision);FR.mkdir(exist_ok=True);ST=OUT/('stills-'+args.revision);ST.mkdir(exist_ok=True)
ASSETS=json.loads((ROOT/args.assets).read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.render.engine='BLENDER_EEVEE';S.eevee.taa_render_samples=args.samples or CFG['samples'];S.eevee.use_raytracing=False;S.eevee.use_fast_gi=False;S.eevee.shadow_ray_count=1
S.render.resolution_x=CFG['worldWidth'];S.render.resolution_y=CFG['worldHeight'];S.render.resolution_percentage=100;S.render.fps=FPS;S.frame_start=1;S.frame_end=N;S.render.image_settings.file_format='PNG';S.render.image_settings.color_mode='RGB';S.render.image_settings.compression=12;S.render.use_motion_blur=False
S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast';S.view_settings.exposure=.15

def rgb(h):
    c=[int(h.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in c)
def material(n,c,emit=0,metal=0):
    m=bpy.data.materials.new(n);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*rgb(c),1);b.inputs['Roughness'].default_value=.72;b.inputs['Metallic'].default_value=metal;b.inputs['Emission Color'].default_value=(*rgb(c),1);b.inputs['Emission Strength'].default_value=emit;return m
M={k:material(k,c,e,metal) for k,c,e,metal in [('ink','#182D37',0,0),('teal','#557D80',0,0),('wall','#456871',0,0),('wood','#C49A65',0,0),('cream','#E5D7B7',0,0),('gold','#D9B377',.05,0),('ochre','#B39660',0,0),('sage','#879B79',0,0),('leaf','#748E73',0,0),('sky','#91ABB8',.8,0),('glass','#B5D2CE',.2,.25),('light','#EFDCAD',2,0),('copper','#AD7660',0,.15),('steel','#8FADB0',0,.35),('red','#BE7164',0,0)]}
def cube(n,loc,size,m,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(M[m] if isinstance(m,str) else m)
    if bevel:mod=o.modifiers.new('Small edge highlight','BEVEL');mod.width=bevel;mod.segments=1;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def cyl(n,loc,r,h,m,verts=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=h,location=loc);o=bpy.context.object;o.name=n;o.data.materials.append(M[m]);return o
def ico(n,loc,r,m):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,location=loc);o=bpy.context.object;o.name=n;o.data.materials.append(M[m]);return o
def line(n,pts,r,m):
    c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=0;sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
    for p,v in zip(sp.points,pts):p.co=(*v,1)
    o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);c.materials.append(M[m]);return o
def empty(n,loc):
    o=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(o);o.location=loc;return o
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def light(n,loc,target,power,color,size):
    d=bpy.data.lights.new(n,'AREA');d.energy=power;d.color=rgb(color);d.shape='DISK';d.size=size
    if hasattr(d,'use_shadow_jitter'):d.use_shadow_jitter=False
    o=bpy.data.objects.new(n,d);bpy.context.collection.objects.link(o);o.location=loc;aim(o,target);return o
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def lerp(a,b,p):return tuple(x+(y-x)*p for x,y in zip(a,b))
def plant(x,y,z=0):
    cyl('Terracotta plant pot',(x,y,z+.23),.25,.46,'copper',12)
    for j in range(7):
        a=j*2.4;tip=(x+math.cos(a)*.32,y+math.sin(a)*.28,z+.7+j*.04);line('Plant stem',[(x,y,z+.38),tip],.016,'leaf');o=ico('Angular leaf',tip,.22,'leaf');o.scale=(1,.42,.55)
def room(origin,lab=False):
    back=4.65 if lab else 2.8
    for i in range(20):cube('Floor plank',(origin+(i-9.5)*.32,0,-.065),(.305,12,.13),'wood')
    cube('Back wall',(origin,back,3.2),(7,.16,6.5),'wall');cube('Baseboard',(origin,back-.13,.13),(7,.1,.25),'cream')
    cube('Window frame',(origin-1.55,back-.17,3.2),(1.9,.12,2.1),'wood');cube('Dusk through window',(origin-1.55,back-.26,3.2),(1.66,.05,1.87),'sky')
    for x in [-2.36,-1.55,-.74]:cube('Window mullion',(origin+x,back-.32,3.2),(.055,.08,1.94),'cream')
    cube('Window rail',(origin-1.55,back-.34,3.2),(1.71,.08,.055),'cream')
    light(f'LGT_Key_Window_{origin}',(origin-3,-1,6),(origin,0,1),1150,'#FFD6A2',4)
    light(f'LGT_Rim_Dusk_{origin}',(origin+3,2,4.5),(origin,0,1),900,'#A2CADB',3)
    light(f'LGT_Fill_{origin}',(origin,-5,3),(origin,0,1),130,'#D1E3E4',4)
    if not lab:
        cube('Woven warm rug',(origin,-.3,.008),(4.25,3.3,.025),'cream')
        for x in [-1.94,-1.78,1.78,1.94]:cube('Rug stripe',(origin+x,-.3,.028),(.055,3.1,.008),'teal')
        plant(origin+2.15,1.2);plant(origin-2.2,1.25)
def sofa(origin):
    for x in [-1.45,1.45]:
        for y in [-.15,.85]:cube('Sofa oak foot',(origin+x,y,.2),(.13,.15,.38),'wood')
    cube('Sofa base',(origin,.35,.47),(3.3,1.25,.34),'ink',.04)
    cube('Sofa seat',(origin,.20,.68),(3.2,1.12,.19),'teal',.04)
    cube('Sofa back',(origin,.94,1.18),(3.35,.25,1.25),'teal',.04)
    for x in [-1.67,1.67]:cube('Sofa arm',(origin+x,.25,.92),(.23,1.3,.7),'teal',.04)
    cube('Middle cushion seam',(origin,-.34,.69),(.018,.03,.12),'ink')
    for x in [-1.2,1.2]:cube('Cushion piping',(origin+x,.79,1.24),(.025,.025,.97),'cream')
def side_table(origin):
    x=origin;y=-1.15;cube('Side table top',(x,y,.32),(.66,.66,.08),'wood',.02)
    for dx in [-.33,.33]:
        for dy in [-.25,.25]:cube('Table leg',(x+dx*.8,y+dy,.14),(.07,.07,.28),'ink')
    cube('Pizza box base',(x,y,.41),(.64,.62,.07),'cream');lid=cube('Open pizza box lid',(x,y+.3,.68),(.64,.04,.5),'wood');lid.rotation_euler.x=.12
    cyl('Pizza crust',(x,y-.025,.465),.26,.04,'wood',24);cyl('Tomato sauce',(x,y-.025,.49),.24,.012,'red',24);cyl('Golden cheese',(x,y-.025,.50),.225,.012,'gold',24)
    for i in range(6):
        a=i*1.6;cyl('Pepperoni round',(x+math.cos(a)*.14,y+math.sin(a)*.12,.515),.038,.012,'copper',12)
    for i in range(3):
        a=i*math.pi/3;line('Pizza slice cut',[(x-.225*math.cos(a),y-.025-.225*math.sin(a),.517),(x+.225*math.cos(a),y-.025+.225*math.sin(a),.517)],.003,'wood')
    for i in range(3):o=cube('Napkin fold',(x+.16+i*.025,y-.23,.52),(.13,.13,.013),'cream');o.rotation_euler.z=-.3
room(0);sofa(0);side_table(0)
shoe_objects=[];shoe_pivots=[];shins=[]
for j,x in enumerate([.52,.88]):
    pivot=empty(f'AN_HeelToePivot_{j}',(x,-.72,.026));shoe_pivots.append(pivot)
    for name,loc,size,key in [('Sole',(0,.22,.025),(.27,.48,.05),'cream'),('Sole stripe',(0,.22,.058),(.275,.47,.018),'ink'),('Upper',(0,.235,.115),(.25,.40,.10),'cream'),('Toe cap',(0,.045,.09),(.25,.14,.08),'cream'),('Heel counter',(0,.40,.14),(.245,.1,.16),'gold')]:
        o=cube(f'Voxel sneaker {j} '+name,loc,size,key,.007);o.parent=pivot;shoe_objects.append(o)
    for k in range(4):
        o=cube('Sneaker lace',(0,.12+k*.055,.177),(.19,.016,.012),'ink');o.parent=pivot;shoe_objects.append(o)
    shin=cube('Navy trouser shin',(x,-.37,.48),(.21,.24,.56),'ink',.008);shins.append(shin);shoe_objects.append(shin)
    cuff=cube('Trouser cuff',(0,.39,.225),(.255,.17,.075),'teal',.006);cuff.parent=pivot;shoe_objects.append(cuff)
cyl('Lamp base',(1.95,.6,.08),.25,.1,'ink');cyl('Lamp stem',(1.95,.6,1.6),.035,3.0,'copper',12);cyl('Lamp shade',(1.95,.6,3.05),.4,.5,'cream',8);cyl('Warm lamp bulb',(1.95,.6,2.88),.2,.04,'light',12)
light('LGT_Practical_Lamp',(1.95,.3,2.8),(.7,.2,1.3),85,'#FFE1B3',.7)
for i in range(4):cube('Shelf book',(.5+i*.21,2.56,3.12),(.16,.3,.55+.08*(i%2)),['cream','ochre','teal','gold'][i])
cube('Wall shelf',(.8,2.48,2.8),(1.55,.5,.07),'wood')
room(15,True)
crowd=[];trays=[];extra_food=[]
for row in range(4):
    y=-.25+row*1.03;cube('Research dining table',(15,y,.88),(3.55,.72,.13),'cream')
    for x in [-1.52,1.52]:cube('Table support',(15+x,y,.4),(.10,.48,.8),'steel')
    for col in range(4):
        x=15+(col-1.5)*.78;body=empty(f'VOL_{row*4+col+1:02d}',(x,y+.43,0));crowd.append(body)
        for z,dim,key in [(.46,(.35,.32,.16),'ink'),(.79,(.33,.25,.47),['sage','teal','ochre','cream'][(row+col)%4]),(1.14,(.29,.26,.3),'wood')]:
            o=cube('Volunteer body part',(0,0,z),dim,key);o.parent=body
        skin=material(f'Adult skin {row}_{col}',['#AD7957','#D1A17B','#8E624D','#BA8D6C'][(row*3+col)%4])
        head=cube('Volunteer head',(0,-.03,1.17),(.32,.28,.32),skin);head.parent=body
        hair=cube('Volunteer hair',(0,-.01,1.34),(.33,.28,.10),'ink');hair.parent=body
        for dx in [-.065,.065]:
            eye=cube('Volunteer eye',(dx,-.177,1.19),(.035,.014,.04),'ink');eye.parent=body
        for dx in [-.15,.15]:
            arm=cube('Volunteer arm',(dx,-.16,.90),(.09,.33,.09),skin);arm.parent=body
        cube('Chair back',(x,y+.73,.77),(.4,.09,.64),'teal')
        for dx in [-.14,.14]:cube('Chair leg',(x+dx,y+.53,.25),(.045,.06,.5),'steel')
        plate=cyl('Measured meal plate',(x,y-.04,.98),.22,.04,'glass',16);trays.append((plate,plate.location.copy(),row*4+col))
        cyl('Measured meal portion',(x,y-.04,1.02),.16,.07,'gold',12)
        for j in range(3):ico('Meal vegetable',(x-.11+j*.085,y+.03,1.06),.06,'sage')
        for j in range(3):
            food=cube('Extra bread portion',(x-.08+j*.035,y-.08,1.10+j*.065),(.19,.17,.06),'gold',.012);extra_food.append((food,food.scale.copy(),row*4+col))
        fruit=ico('Extra meal fruit',(x+.12,y-.12,1.12),.10,'copper');extra_food.append((fruit,fruit.scale.copy(),row*4+col))
cube('Lab scale',(16.8,-1.4,.95),(.55,.45,.12),'steel');cube('Scale display',(16.8,-1.62,1.04),(.25,.035,.11),'glass');cube('Scale table',(16.8,-1.4,.77),(.85,.65,.12),'wood')
room(30,True);cube('Comparison board',(30,1.25,1.98),(4.8,.12,3.95),'ink');cube('Chart floor',(30,-.5,-.015),(8,5,.06),'ink')
room(45);plant(47.1,.5)
cube('Hall bench',(45.75,.55,.63),(1.2,.9,.18),'teal');cube('Hall bench back',(45.75,.92,1.02),(1.2,.12,.8),'teal')
for x in [45.25,46.25]:cube('Bench leg',(x,.55,.3),(.10,.66,.6),'wood')
cube('Small hall console',(43.4,.6,.86),(.6,1.1,1.65),'wood');cube('Console front',(43.4,-.0,.86),(.5,.04,1.48),'cream')
for i in range(4):cube('Wall coat peg',(44.4+i*.28,2.5,2.6),(.07,.22,.09),'wood')
world=bpy.data.worlds.new('Cool soft room ambient');S.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(*rgb('#A0B7BE'),1);world.node_tree.nodes['Background'].inputs[1].default_value=.20
nt=bpy.data.node_groups.new('Practical light glow','CompositorNodeTree');S.compositing_node_group=nt;nt.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor');rl=nt.nodes.new('CompositorNodeRLayers');gl=nt.nodes.new('CompositorNodeGlare');gl.inputs['Type'].default_value='Fog Glow';gl.inputs['Threshold'].default_value=2;gl.inputs['Strength'].default_value=.08;gl.inputs['Size'].default_value=.2;out=nt.nodes.new('NodeGroupOutput');nt.links.new(rl.outputs['Image'],gl.inputs['Image']);nt.links.new(gl.outputs['Image'],out.inputs[0])
cd=bpy.data.cameras.new('CAM_Story');cd.sensor_fit='VERTICAL';cd.sensor_height=32;cd.clip_start=.05;cd.clip_end=150;cam=bpy.data.objects.new('CAM_Story',cd);bpy.context.collection.objects.link(cam);S.camera=cam
actors={}
def actor(name,file,position,height,metadata=None):
    im=bpy.data.images.load(str(ROOT/file),check_existing=True);m=bpy.data.materials.new(name+' illustrated pixels');m.use_nodes=True;m.surface_render_method='DITHERED';ns=m.node_tree.nodes;ns.clear();lk=m.node_tree.links
    tex=ns.new('ShaderNodeTexImage');tex.image=im;tex.interpolation='Closest';tex.extension='CLIP';uv=ns.new('ShaderNodeTexCoord');mp=ns.new('ShaderNodeMapping');lk.new(uv.outputs['UV'],mp.inputs['Vector']);lk.new(mp.outputs[0],tex.inputs[0])
    em=ns.new('ShaderNodeEmission');em.inputs['Strength'].default_value=.95;lk.new(tex.outputs['Color'],em.inputs['Color']);alpha=ns.new('ShaderNodeMath');alpha.operation='GREATER_THAN';alpha.inputs[1].default_value=.5;lk.new(tex.outputs['Alpha'],alpha.inputs[0]);tr=ns.new('ShaderNodeBsdfTransparent');mix=ns.new('ShaderNodeMixShader');lk.new(alpha.outputs[0],mix.inputs[0]);lk.new(tr.outputs[0],mix.inputs[1]);lk.new(em.outputs[0],mix.inputs[2]);out=ns.new('ShaderNodeOutputMaterial');lk.new(mix.outputs[0],out.inputs[0])
    meta=json.loads((ROOT/metadata).read_text()) if metadata else None
    if meta:crop=meta['crop'];mp.inputs['Scale'].default_value=(crop['width']/meta['width'],crop['height']/meta['height'],1);width=height*crop['width']/crop['height']
    else:width=height*im.size[0]/im.size[1]
    me=bpy.data.meshes.new(name+' upright quad');me.from_pydata([(-width/2,0,0),(width/2,0,0),(width/2,0,height),(-width/2,0,height)],[],[(0,1,2,3)]);me.uv_layers.new()
    for i,v in enumerate([(0,0),(1,0),(1,1),(0,1)]):me.uv_layers.active.data[i].uv=v
    me.materials.append(m);o=bpy.data.objects.new('CHR_'+name,me);bpy.context.collection.objects.link(o);o.location=position
    actors[name]={'object':o,'base':Vector(position),'height':height,'mapping':mp,'meta':meta,'imageHeight':im.size[1]};return o
for key,registry in ASSETS['animations'].items():
    pos=(.70,-.43,.02) if key.startswith('kai') else (-.72,-.46,.02)
    if key in ['kai-walk','kai-stand']:pos=(45.55,-.35,.02)
    height=2.35 if key in ['kai-walk','kai-stand'] else (1.80 if key.startswith('kai') else 1.76)
    actor(key,registry['atlas'],pos,height,registry['metadata'])
actor('miko-still','public/episodes/restless-friend/art/miko-salad-four-0.png',(-.72,-.46,.02),1.76)
actor('miko-standing',ASSETS.get('staticOverrides',{}).get('miko-standing','public/episodes/restless-friend/art/miko-salad-four-2.png'),(44.35,-.35,.02),2.15)
ada_motion=ASSETS.get('supportAnimations',{}).get('ada')
actor('ada',ada_motion['atlas'] if ada_motion else 'public/episodes/restless-friend/art/scientist-four-0.png',(13.62,-1.05,.02),2.12,ada_motion['metadata'] if ada_motion else None)
actor('ada-chart','public/episodes/restless-friend/art/scientist-four-3.png',(28.75,-.38,.02),1.68)
dust=[]
for origin in [0,15,45]:
    for j in range(16):
        p=(origin-2.2+((j*17)%29)/29*4.3,-.5+((j*11)%23)/23*3.0,.4+((j*7)%19)/19*3.2);o=ico('Dust mote',p,.009,'gold');dust.append((o,Vector(p),j))
def show(actor_name,yes):
    o=actors[actor_name]['object'];o.hide_render=not yes;o.hide_viewport=not yes;o.keyframe_insert('hide_render');o.keyframe_insert('hide_viewport')
def set_actor(name,index=0,x=None):
    a=actors[name];o=a['object'];o.location=a['base'];meta=a['meta']
    if x is not None:o.location.x=x
    if meta:
        max_frame=ASSETS['animations'].get(name,{}).get('maxUsableFrame',meta['frameCount']-1)
        index=max(0,min(max_frame,int(index)));c=meta['crop'];col=index%meta['columns'];row=index//meta['columns'];a['mapping'].inputs['Location'].default_value=((col*meta['cellWidth']+c['x'])/meta['width'],1-(row*meta['cellHeight']+c['y']+c['height'])/meta['height'],0);a['mapping'].inputs['Location'].keyframe_insert('default_value');pad=c['y']+c['height']-1-meta['cells'][index]['bottom'];o.location.z-=pad/c['height']*a['height']
    else:o.location.z-=8/a['imageHeight']*a['height']
    o.rotation_euler.z=math.atan2(cam.location.x-o.location.x,-(cam.location.y-o.location.y));o.keyframe_insert('location');o.keyframe_insert('rotation_euler')
def action_frame(elapsed,cycle=False):return int(max(0,elapsed)*10)%12 if cycle else min(11,int(max(0,elapsed)*10))
def support_frame(name,t,local):
    playback=ASSETS.get('supportAnimations',{}).get(name,{}).get('playback')
    if not playback:return action_frame(local,True)
    elapsed=t-EVENT[playback['anchorEvent']]
    return next((c['frame'] for c in reversed(playback['cues']) if elapsed>=c['at']),0)
shots=CFG['shots'];audit=[]
for f in range(1,N+1):
    S.frame_set(f);t=(f-1)/FPS;s=next((s for s in shots if s['start']<=t<s['start']+s['duration']),shots[-1]);sid=s['id'];local=t-s['start'];p=RECIPE['camera'][sid];pos=tuple(p['position']);target=tuple(p['target']);lens=p['lens'];visible={};clock=t
    if sid=='pizza':
        push=.32*smooth(local/.6);pos=(pos[0],pos[1]+push,pos[2]-.10*push);visible={('kai-bite' if local<1.25 else 'kai-tap'):action_frame(local if local<1.25 else local-1.25,local>=1.25),'miko-react':action_frame(local-.2)}
    elif sid=='question':
        pos=(pos[0],pos[1]+.18*smooth(local/.14),pos[2]);visible={'kai-bite':11,'miko-still':0}
    elif sid=='experiment':
        q=smooth((t-EVENT['calories'])/.35);pos=lerp(pos,(15,-8.25,5.65),q);target=lerp(target,(15,1.0,.95),q);visible={'ada':support_frame('ada',t,local) if ada_motion else 0}
    elif sid=='fat-chart':visible={'ada-chart':0}
    elif sid=='reveal':
        q=smooth(local/.5);pos=lerp((0,-7,3.4),pos,q);target=lerp((0,0,.77),target,q);lens=42+(lens-42)*q;visible={'kai-tap':action_frame(local,True)}
    elif sid=='movement':
        if t<EVENT['pace']:p=RECIPE['camera']['reveal'];pos=tuple(p['position']);target=tuple(p['target']);lens=p['lens'];visible={'kai-tap':action_frame(t-shots[4]['start'],True)}
        elif t<EVENT['stand']:
            elapsed=t-EVENT['pace'];follow=45.4-.5*elapsed;pos=(follow,pos[1],pos[2]);target=(follow,target[1],target[2]);visible={'kai-walk':action_frame(elapsed,True)}
        else:visible={'kai-stand':action_frame(t-EVENT['stand'])}
    elif sid=='maximum':
        if t<EVENT['qualifier']:visible={'kai-stand':action_frame(t-EVENT['stand']),'miko-standing':0}
        elif t<EVENT['notOnlyTap']:
            elapsed=t-EVENT['qualifier'];follow=45.4-.5*elapsed;pos=(follow,-6.7,3.4);target=(follow,0,.75);visible={'kai-walk':action_frame(elapsed,True)}
        else:p=RECIPE['camera']['reveal'];pos=tuple(p['position']);target=tuple(p['target']);lens=p['lens'];visible={'kai-tap':action_frame(t-shots[4]['start'],True)}
    elif sid=='payoff':
        visible={'miko-tap':action_frame(local,True),('kai-bite' if local<1.25 else 'kai-tap'):action_frame(local if local<1.25 else local-1.25,local>=1.25)};q=smooth((t-EVENT['feet'])/.3);target=lerp(target,(-.20,-.25,.72),q)
    elif sid=='loop':
        phase=local if local<1.1 else 0;visible={'kai-bite':action_frame(phase),'miko-react':action_frame(max(0,phase-.2))};clock=phase
    cam.location=pos;cd.lens=lens;aim(cam,target);cam.keyframe_insert('location');cam.keyframe_insert('rotation_euler');cd.keyframe_insert('lens')
    # The prototype block feet failed a first-viewer read. Keep that rig saved
    # but hidden; the final inserts use Kai's actual native pixel heel action.
    macro=False
    for o in shoe_objects:
        o.hide_render=not macro;o.hide_viewport=not macro;o.keyframe_insert('hide_render');o.keyframe_insert('hide_viewport')
    for j,pivot in enumerate(shoe_pivots):
        phase=(t-EVENT['neat'])/.6;lift=max(0,math.sin(math.tau*phase)) if j==1 else 0;pivot.rotation_euler.x=.23*lift;pivot.keyframe_insert('rotation_euler');shins[j].location.z=.48+.022*lift;shins[j].keyframe_insert('location')
    for name in actors:
        show(name,name in visible)
        if name in visible:
            x=None
            if name=='kai-walk':
                elapsed=t-(EVENT['qualifier'] if t>=EVENT['qualifier'] else EVENT['pace']);x=45.65-min(1.7,max(0,elapsed)*.5)
            set_actor(name,visible[name],x)
    for o,base,j in dust:
        o.location=base+Vector((.025*math.sin(clock*.6+j),.01*math.cos(clock*.8+j),.055*math.sin(clock*.9+j*.7)));o.keyframe_insert('location')
    for plate,base,j in trays:
        q=smooth((t-EVENT['calories']-j*.035)/.35);plate.location=base+Vector((0,0,(1-q)*.12));plate.keyframe_insert('location')
    for food,base,j in extra_food:
        q=smooth((t-EVENT['calories']-j*.04)/.3);food.scale=base*max(.001,q);food.keyframe_insert('scale')
    if f==1 or any(abs(t-x['start'])<1/FPS/2 for x in shots):audit.append({'frame':f-1,'time':t,'shot':sid,'camera':list(pos),'target':list(target),'lens':lens,'visibleActors':list(visible)})
for ob in list(bpy.data.objects)+list(bpy.data.cameras):
    if ob.animation_data and ob.animation_data.action:
        for layer in ob.animation_data.action.layers:
            for strip in layer.strips:
                if not hasattr(strip,'channelbags'):continue
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points:key.interpolation='CONSTANT' if curve.data_path in ['hide_render','hide_viewport'] else 'LINEAR'
for m in bpy.data.materials:
    if m.node_tree and m.node_tree.animation_data and m.node_tree.animation_data.action:
        for layer in m.node_tree.animation_data.action.layers:
            for strip in layer.strips:
                if not hasattr(strip,'channelbags'):continue
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points:key.interpolation='CONSTANT'
for im in bpy.data.images:
    if im.source=='FILE':im.pack()
S.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'restless-friend-{args.revision}.blend'))
(OUT/'staging-audit-v1.json').write_text(json.dumps({'resolution':[S.render.resolution_x,S.render.resolution_y],'samples':S.eevee.taa_render_samples,'frames':N,'actors':list(actors),'volunteers':len(crowd),'contactMethod':'Opaque soles anchored to the floor; common horizontal pivot and native GIF cadence; upright yaw-only planes.','shots':audit},indent=2)+'\n')
if args.stills:
    times=list(map(float,args.still_times.split(','))) if args.still_times else [0,.5,1.3,2.75,3.1,4.0,6.5,8.5,10.5,12.4,14.0,15.5,17.5,18.1,19.0,20.5,23.5,25.8,27.2,28.7,30.96]
    for t in times:
        S.frame_set(min(N,round(t*FPS)+1));S.render.filepath=str(ST/f'{t:06.2f}.png');bpy.ops.render.render(write_still=True)
if args.render:
    start,end=(map(int,args.range.split(':')) if args.range else (0,N-1));start_time=time.monotonic()
    chart=next(s for s in shots if s['id']=='fat-chart');chart_start=round(chart['start']*FPS);chart_end=round((chart['start']+chart['duration'])*FPS);chart_key=ST/'chart-background-v1.png'
    for frame in range(start,end+1):
        file=FR/f'{frame:05d}.png'
        if file.exists():continue
        if RECIPE.get('opaqueChart') and chart_start<=frame<chart_end:
            if not chart_key.exists():S.frame_set(chart_start+1);S.render.filepath=str(chart_key);bpy.ops.render.render(write_still=True)
            os.link(chart_key,file);continue
        S.frame_set(frame+1);S.render.filepath=str(file);bpy.ops.render.render(write_still=True)
    (OUT/f'render-time-{start}-{end}.json').write_text(json.dumps({'startFrame':start,'endFrame':end,'elapsedSeconds':time.monotonic()-start_time,'samples':S.eevee.taa_render_samples,'resolution':[S.render.resolution_x,S.render.resolution_y]},indent=2)+'\n')
