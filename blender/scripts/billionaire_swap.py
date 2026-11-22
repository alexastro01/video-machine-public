"""Original reusable low-poly sets, luxury vehicles and props for the swap film."""
from pathlib import Path
import bpy,math
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'blender/billionaire-body-swap';PUB=ROOT/'public/episodes/billionaire-body-swap'
OUT.mkdir(parents=True,exist_ok=True);PUB.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def mat(name,hex,metal=0,rough=.72,emit=0):
    c=hex.lstrip('#');rgb=tuple(lin(int(c[i:i+2],16)/255) for i in (0,2,4));m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*rgb,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;b.inputs['Emission Color'].default_value=(*rgb,1);b.inputs['Emission Strength'].default_value=emit;return m
M={k:mat(k,v) for k,v in dict(teal='#41696a',deep='#263f4d',floor='#b8a07c',wood='#a07850',gold='#c3a96c',cream='#ece3c9',sage='#7e9380',brick='#ab8a70',leaf='#647f67',blue='#567686',silver='#a8b4b3',ink='#223039',paper='#f3e9d2',plum='#776d83').items()}
M['paint']=mat('pearl vehicle paint','#d4cdae',.32,.25);M['glass']=mat('blue black vehicle glass','#314d5d',.35,.18);M['tire']=mat('rubber','#202b2e',0,.9);M['alloy']=mat('brushed alloy','#9dacab',.72,.3);M['light']=mat('warm practical light','#f0d49d',0,.3,2);M['coldlight']=mat('cool practical light','#b5d3d9',0,.3,1.8)
M['tarmac']=mat('warm slate apron','#53636a',0,.9)
def group(name,p=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=p;return o
def box(name,size,pos,material,parent,bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.parent=parent;o.data.materials.append(M[material]);
    if bevel:m=o.modifiers.new('softened edges','BEVEL');m.width=bevel;m.segments=3;o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return o
def cyl(name,r,d,pos,material,parent,vertices=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d,location=pos);o=bpy.context.object;o.name=name;o.parent=parent;o.data.materials.append(M[material]);o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
def ell(name,scale,pos,material,parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=pos);o=bpy.context.object;o.name=name;o.scale=scale;o.parent=parent;o.data.materials.append(M[material]);
    for p in o.data.polygons:p.use_smooth=True
    return o
def mesh(name,verts,faces,material,parent):
    m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(M[material]);return o
def profile(name,points,width,material,parent):
    verts=[(x,y,z) for y in [-width/2,width/2] for x,z in points];n=len(points);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];o=mesh(name,verts,faces,material,parent);m=o.modifiers.new('profile edge highlights','BEVEL');m.width=.045;m.segments=3;o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
def tree(parent,x,y):
    cyl('Tree_Trunk',.10,1.4,(x,y,.7),'wood',parent);ell('Tree_Crown',(.72,.55,.85),(x,y,1.75),'leaf',parent);box('Planter',(1.05,.95,.45),(x,y,.2),'deep',parent,.05)
def floor(parent,size=(12,12),material='floor',seams=True):
    depth=max(60,size[1])
    box('Floor',(size[0],depth,.12),(0,1,-.08),material,parent)
    if seams:
        for i in range(15):box('Floor_Seam',(.012,depth,.004),(-5.5+i*.8,1,-.014),'wood',parent,0)
def room(name,wall='teal',floor_mat='floor'):
    r=group(name);floor(r,(12,10),floor_mat);box(name+'_Back',(12,.15,4.8),(0,3.2,2.4),wall,r);box(name+'_Trim',(12,.08,.1),(0,3.08,.12),'gold',r);return r
def windows(r,name,width=7.5):
    box(name+'_Sky',(width,.04,2.9),(0,3.09,2.75),'blue',r)
    for x in [-width/2+i*width/5 for i in range(6)]:box(name+'_Mullion',(.065,.11,3.05),(x,3.01,2.75),'gold',r)
    for z in [1.22,4.28]:box(name+'_Sill',(width+.12,.12,.065),(0,3.0,z),'gold',r)
    for i in range(22):
        h=.4+((i*7)%9)*.11;box(name+'_City',(.22,.025,h),(-width/2+.15+i*(width-.3)/22,3.055,1.26+h/2),'deep',r,0)

plaza=room('Stage_Plaza','deep','silver');windows(plaza,'Lobby');tree(plaza,-2.2,.7);tree(plaza,2.2,.7)
box('Lobby_Entry',(2.3,.12,3.05),(0,3.0,1.6),'glass',plaza)
for x in [-1.2,1.2]:box('Lobby_GoldFrame',(.08,.18,3.2),(x,2.9,1.6),'gold',plaza)
for x in [-.10,.1]:box('Lobby_Pull',(.025,.08,.48),(x,2.78,1.45),'alloy',plaza)
for x in [-3.5,3.5]:box('Lobby_Light',(.08,.08,2.6),(x,2.9,2.6),'light',plaza)

garage=room('Stage_Garage','deep','silver');windows(garage,'Garage');
for x in [-3.3,0,3.3]:box('Garage_Strip',(.05,3.5,.025),(x,.4,4.15),'light',garage)
car=group('Hero_Car',garage)
profile('Car_LowerBody',[(-2.25,.36),(-2.10,.61),(-1.3,.73),(-.55,.72),(.60,.72),(1.45,.61),(2.25,.48),(2.20,.25),(-2.1,.25)],1.78,'paint',car)
profile('Car_UpperCabin',[(-1.0,.69),(-.55,1.13),(.64,1.11),(1.24,.69)],1.34,'paint',car)
for side in [-1,1]:
    y=side*.682;mesh('Car_SideGlass',[(-.91,y,.73),(-.50,y,1.06),(.58,y,1.045),(1.12,y,.73)],[(0,1,2,3)],'glass',car)
    box('Car_Sill',(3.65,.045,.07),(0,side*.91,.3),'deep',car)
    box('Car_Mirror',(.22,.18,.10),(.84,side*.91,.8),'paint',car,.03)
mesh('Car_Windscreen',[(.65,-.65,1.09),(.65,.65,1.09),(1.21,.65,.73),(1.21,-.65,.73)],[(0,1,2,3)],'glass',car)
mesh('Car_RearGlass',[(-.57,-.65,1.10),(-.57,.65,1.10),(-.95,.65,.75),(-.95,-.65,.75)],[(0,1,2,3)],'glass',car)
for side in [-1,1]:
    for x in [-1.43,1.43]:
        o=cyl('Car_Wheel',.33,.19,(x,side*.88,.34),'tire',car,24);o.rotation_euler.x=math.pi/2
        o=cyl('Car_Alloy',.23,.205,(x,side*.88,.34),'alloy',car,12);o.rotation_euler.x=math.pi/2
    box('Car_Headlamp',(.12,.53,.075),(2.16,side*.5,.49),'coldlight',car,.025)
    box('Car_TailLamp',(.09,.52,.06),(-2.17,side*.51,.52),'gold',car)
box('Car_Grille',(.06,1.15,.12),(2.23,0,.34),'ink',car)
box('Car_Spoiler',( .18,1.8,.065),(-1.91,0,.83),'deep',car)
for y in [-.60,.60]:box('Car_SpoilerLeg',(.07,.06,.18),(-1.91,y,.72),'ink',car)
car.rotation_euler.z=-.13

jetstage=group('Stage_Jet');floor(jetstage,(60,60),'tarmac',seams=False)
box('Private_Hangar',(21,.25,6),(0,18,3),'deep',jetstage)
box('Hangar_Door',(15,.12,4.8),(0,17.82,2.4),'teal',jetstage)
for x in [-7.5,0,7.5]:box('Hangar_DoorFrame',(.10,.18,5),(x,17.7,2.5),'silver',jetstage)
for i in range(12):box('Apron_Marking',(.12,1.3,.012),(-3.7,-10+i*2,0),'cream',jetstage,0)
jet=group('Private_Jet',jetstage)
ell('Jet_Fuselage',(.7,5.9,.72),(0,0,1.65),'cream',jet)
ell('Jet_Nose',(.63,1.2,.56),(0,-4.8,1.63),'cream',jet)
for side in [-1,1]:
    for i in range(10):
        cy=-3.4+i*.60
        cx=side*(.7*math.sqrt(1-(cy/5.9)**2-((1.95-1.65)/.72)**2)+.015)
        points=[(cx,cy,1.95)]
        for j in range(24):
            a=j*math.tau/24;y=cy+math.sin(a)*.15;z=1.95+math.cos(a)*.18
            x=side*(.7*math.sqrt(max(.01,1-(y/5.9)**2-((z-1.65)/.72)**2))+.015)
            points.append((x,y,z))
        mesh('Jet_Window',points,[(0,j+1,(j+1)%24+1) for j in range(24)],'glass',jet)
    verts=[(side*.4,-.9,1.25),(side*5.2,1.6,1.02),(side*5.4,2.2,1.06),(side*.6,1.45,1.30)]
    o=mesh('Jet_Wing',verts,[(0,1,2,3)],'cream',jet);m=o.modifiers.new('wing thickness','SOLIDIFY');m.thickness=.09
    box('Jet_Winglet',(.10,.65,.75),(side*5.3,1.95,1.4),'cream',jet,.035)
    ell('Jet_Engine',(.40,1.02,.40),(side*1.02,3.5,1.68),'paint',jet)
    o=cyl('Jet_EngineIntake',.30,.065,(side*1.02,2.49,1.68),'ink',jet,24);o.rotation_euler.x=math.pi/2
    o=cyl('Jet_EngineRim',.34,.04,(side*1.02,2.47,1.68),'alloy',jet,24);o.rotation_euler.x=math.pi/2
    o=cyl('Jet_EngineInset',.28,.045,(side*1.02,2.44,1.68),'ink',jet,24);o.rotation_euler.x=math.pi/2
    mesh('Jet_Tailplane',[(side*.25,3.7,2.0),(side*2.3,4.75,2.05),(side*2.3,5.15,2.05),(side*.2,4.8,2.02)],[(0,1,2,3)],'cream',jet)
mesh('Jet_Tail',[(0,3.5,1.9),(0,4.45,3.85),(0,5.2,3.85),(0,5.25,1.9)],[(0,1,2,3)],'cream',jet)
mesh('Jet_CockpitGlass',[(-.48,-4.8,2.04),(-.42,-5.3,1.98),(.42,-5.3,1.98),(.48,-4.8,2.04),(.42,-4.45,2.19),(-.42,-4.45,2.19)],[(0,1,2,3,4,5)],'glass',jet)
for x,y in [(-.7,.6),(.7,.6),(0,-3.8)]:
    cyl('Jet_GearLeg',.055,.70,(x,y,.63),'alloy',jet)
    o=cyl('Jet_Tire',.23,.19,(x,y,.23),'tire',jet);o.rotation_euler.y=math.pi/2
for i in range(5):box('Jet_Stair',(.9,.28,.18),(-1.35,-2.0+i*.25,.10+i*.19),'silver',jet)
jet.rotation_euler.z=-.20

office=room('Stage_Office','blue','deep');windows(office,'Office',9)
box('Office_Rug',(4.5,2.8,.02),(0,-.2,0),'teal',office)
box('Office_Desk',(3.3,1.0,.10),(0,-.55,.86),'wood',office,.035)
for x in [-1.3,1.3]:box('Office_DeskLeg',(.15,.8,.85),(x,-.55,.42),'ink',office)
box('Office_ChairSeat',(.8,.65,.12),(-.62,.55,.55),'ink',office)
box('Office_ChairBack',(.82,.15,1.2),(-.62,.85,1.15),'ink',office,.08)
for x in [-2.1,2.1]:tree(office,x,1.3)
for x in [-3,3]:box('Office_Pendant',(.06,.4,1.1),(x,1,3.7),'coldlight',office)

home=group('Stage_Porch');floor(home,(12,10),'floor')
box('House_Left',(5.5,.28,4.6),(-2.35,.25,2.3),'brick',home)
box('House_Right',(3.8,.28,4.6),(3.8,.25,2.3),'brick',home)
box('House_Header',(1.65,.28,1.6),(1.275,.25,3.6),'brick',home)
for x in [.43,2.02]:box('Door_Trim',(.10,.33,2.92),(x,.06,1.46),'cream',home)
box('Door_Lintel',(1.7,.33,.10),(1.23,.06,2.94),'cream',home)
door=group('Door_Hinge',home);door.location=(.5,.03,0)
box('Door_Panel',(1.45,.13,2.85),(.725,0,1.425),'teal',door,.025)
for z in [.58,1.5,2.3]:box('Door_Inset',(1.16,.025,.62),(.725,-.078,z),'deep',door)
o=cyl('Door_Handle',.055,.14,(1.25,-.16,1.32),'gold',door);o.rotation_euler.x=math.pi/2
box('Welcome_Mat',(1.9,1.0,.018),(1.15,-.72,.015),'sage',home)
tree(home,-2.05,-.2)
box('Porch_LightMount',(.3,.2,.42),(-.08,.03,2.34),'ink',home)
box('Porch_LightGlass',(.21,.04,.27),(-.08,-.09,2.34),'light',home)
box('Inside_Back',(10,.12,4.0),(0,3.2,2),'sage',home)
box('Inside_Table',(1.7,.9,.08),(1.08,2.3,.73),'wood',home)

kitchen=room('Stage_Kitchen','sage','floor')
for x in [-2.7,-1.8,1.9,2.8]:
    box('Kitchen_LowerCabinet',(.85,.70,.83),(x,2.3,.42),'teal',kitchen)
    box('Kitchen_CabinetDoor',(.73,.035,.67),(x,1.93,.42),'sage',kitchen)
    box('Kitchen_Counter',(.90,.82,.065),(x,2.3,.87),'cream',kitchen)
    box('Kitchen_Handle',(.22,.06,.025),(x,1.89,.64),'gold',kitchen)
    box('Kitchen_UpperCabinet',(.86,.43,.9),(x,2.64,2.25),'teal',kitchen)
box('Kitchen_Window',(2.65,.055,1.45),(0,3.08,2.45),'blue',kitchen)
for x in [-1.38,0,1.38]:box('Kitchen_WindowFrame',(.06,.13,1.58),(x,2.99,2.45),'cream',kitchen)
for z in [1.67,3.23]:box('Kitchen_WindowSill',(2.8,.14,.06),(0,2.98,z),'cream',kitchen)
box('Kitchen_SunGlass',(1.22,.02,.065),(-.69,2.96,2.45),'gold',kitchen)
box('Breakfast_Table',(1.9,1.05,.09),(.62,-.05,.77),'wood',kitchen,.03)
for x in [-.13,1.37]:
    for y in [-.40,.30]:box('Breakfast_TableLeg',(.07,.07,.73),(x,y,.365),'gold',kitchen)
chair=group('Breakfast_Chair',kitchen)
box('Chair_Seat',(.70,.65,.09),(.72,.69,.54),'teal',chair)
for x in [.42,1.02]:
    for y in [.42,.98]:box('Chair_Leg',(.055,.055,.55),(x,y,.27),'wood',chair)
box('Chair_Back',(.72,.07,.77),(.72,1.0,1.00),'teal',chair,.035)
pan=cyl('Kitchen_Pan',.26,.035,(-2.7,2.15,.92),'ink',kitchen);box('Pan_Handle',(.40,.065,.025),(-2.32,2.15,.94),'ink',kitchen)
cyl('Kitchen_Pancake',.20,.035,(-2.7,2.15,.95),'gold',kitchen)
for x in [-1.05,1.05]:box('Kitchen_Shelf',(.85,.35,.06),(x,2.91,1.45),'wood',kitchen)

props=group('Prop_Templates')
phone=group('Prop_Phone',props);box('Phone_Body',(.69,.075,1.30),(0,0,0),'ink',phone,.055);box('Phone_Glass',(.61,.018,1.12),(0,-.05,0),'glass',phone,.025);box('Phone_Speaker',(.18,.012,.018),(0,-.065,.59),'silver',phone,.005)
folder=group('Prop_Folder',props);box('Folder_Cover',(.9,.62,.07),(0,0,0),'plum',folder,.015);box('Folder_Paper',(.83,.55,.06),(0,0,.03),'paper',folder,.005);box('Folder_Clip',(.26,.06,.03),(0,.22,.08),'gold',folder,.008)
box('Balance_Desk',(2.9,.9,.09),(0,-.7,.88),'wood',props)

lights=group('COL_Lights')
for name,color,power,pos,size in [('LGT_Warm',(1,.79,.56),750,(-3,-4,6),5),('LGT_Cool',(.55,.78,1),300,(4,-1,4),4),('LGT_Rim',(1,.87,.65),450,(2,3,5),3)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.parent=lights;o.location=pos;o.rotation_euler=(Vector((0,0,1.2))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.25,-7.8,2.5));cam=bpy.context.object;cam.name='CAM_Swap_Review';cam.data.lens=35;cam.rotation_euler=(Vector((0,0,1.4))-cam.location).to_track_quat('-Z','Y').to_euler();sc=bpy.context.scene;sc.camera=cam;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.render.resolution_x=540;sc.render.resolution_y=960;sc.render.resolution_percentage=100;sc.render.fps=30
for r in [garage,jetstage,office,home,kitchen,props]:r.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'billionaire-swap-v1.blend'))
for r in [plaza,garage,jetstage,office,home,kitchen,props]:r.hide_render=False
bpy.ops.export_scene.gltf(filepath=str(PUB/'swap-stage-v1.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_apply=True)
print('Saved original vehicle geometry, reusable sets, Blender source and GLB.')
