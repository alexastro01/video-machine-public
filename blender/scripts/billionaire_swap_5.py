"""Build two reusable, warm/cool sets and physical story props for swap Part 5."""
from pathlib import Path
import bpy,math,json
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'blender/billionaire-body-swap-5';PUB=ROOT/'public/episodes/billionaire-body-swap-5'
OUT.mkdir(parents=True,exist_ok=True);PUB.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name,hex,rough=.7,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');c=[int(hex[i:i+2],16)/255 for i in (1,3,5)];c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c];p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
M={k:mat(k,c) for k,c in {'wall':'#78918d','wood':'#c7a271','floor':'#bba981','dark':'#263f4c','board':'#354f4a','trim':'#d7ba82','paper':'#f5efdf','black':'#24313b','pencil':'#d9b457','graphite':'#30434c','sky':'#9dbcc7','plant':'#597e6a','soil':'#756d59','office':'#355969'}.items()}
def group(name,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o
def box(name,size,loc,material,parent,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.parent=parent;o.data.materials.append(M[material])
    if bevel:
        m=o.modifiers.new('Soft physical edge','BEVEL');m.width=bevel;m.segments=3;o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
    return o
def cyl(name,radius,depth,loc,material,parent,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.parent=parent;o.data.materials.append(M[material]);m=o.modifiers.new('Edge highlight','BEVEL');m.width=.008;m.segments=2;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
def room(name,wall):
    g=group(name);box(name+'_Floor',(10,18,.14),(0,0,-.08),'floor',g)
    box(name+'_Back',(10,.16,4.2),(0,3.3,2.1),wall,g)
    box(name+'_Skirting',(10,.10,.13),(0,3.17,.1),'trim',g)
    for x in range(-6,7):box(name+'_Plank',(.009,18,.003),(x*.6,0,-.006),'wood',g,0)
    return g
def window(g,x,w=2.0):
    box('Window_Sky',(w,.035,2.3),(x,3.195,2.65),'sky',g)
    for dx in [-w/2,0,w/2]:box('Window_Frame',(.055,.12,2.43),(x+dx,3.13,2.65),'trim',g)
    for z in [1.48,2.65,3.82]:box('Window_Sill',(w+.1,.15,.06),(x,3.12,z),'trim',g)
def desk(g,name,x,y,width=1.8):
    box(name+'_Top',(width,.9,.075),(x,y,.82),'wood',g,.035)
    for dx in [-width/2+.1,width/2-.1]:
        for dy in [-.34,.34]:box(name+'_Leg',(.07,.07,.80),(x+dx,y+dy,.40),'dark',g)

M.update(cardboard=mat('Shoebox warm cardboard','#b79569'),steel=mat('Vault brushed steel','#738a92',.38,.65),brass=mat('Vault warm brass','#bc9b61',.35,.65))
office=room('Stage_Office','office')
for x in [-3,-1,1,3]:window(office,x,1.9)
desk(office,'BoardroomDesk',0,-.30,2.15)
for x in [-2.7,2.7]:
 cyl('Office_Planter',.28,.45,(x,2.6,.22),'dark',office)
 for i in range(5):
  o=box('Plant_Leaf',(.12,.07,.66),(x+(i-2)*.1,2.6,.8+(i%2)*.13),'plant',office,.05);o.rotation_euler.y=(i-2)*.23
kitchen=room('Stage_Kitchen','wall');window(kitchen,-1.5,2.5)
for x in [-1.9,-.8,.3,1.4,2.5]:
 box('Kitchen_Cabinet',(1.04,.72,.93),(x,2.65,.49),'plant',kitchen,.025)
 box('Cabinet_Panel',(.96,.035,.82),(x,2.27,.49),'wall',kitchen,.02)
 box('Cupboard_Handle',(.26,.07,.025),(x,2.22,.69),'dark',kitchen,.008)
box('Kitchen_Counter',(5.5,.85,.07),(.3,2.60,.99),'paper',kitchen,.03)
box('Fridge',(.88,.75,1.94),(-3.25,2.6,.97),'sky',kitchen,.06)
box('Fridge_Handle',(.04,.07,.50),(-2.94,2.19,1.24),'dark',kitchen,.015)
for z in [2.0,2.65]:
 box('Kitchen_Shelf',(1.65,.35,.065),(1.65,3.02,z),'wood',kitchen)
 for i in range(3):cyl('Shelf_Cup',.10,.19,(1.2+i*.38,2.96,z+.13),'paper' if i%2 else 'sky',kitchen)
desk(kitchen,'KitchenTable',0,-.30,2.15)
memory=room('Stage_Memory','office')
props=group('Prop_Templates')
phone=group('Prop_Phone',props);box('Phone_Case',(.48,.064,.92),(0,0,0),'black',phone,.048);box('Phone_Screen',(.42,.006,.82),(0,-.037,0),'board',phone,.026)
shoe=group('Prop_Shoebox',memory)
box('Shoebox_Floor',(1.6,.88,.045),(0,0,.10),'cardboard',shoe,.01)
for x in [-.78,.78]:box('Shoebox_Side',(.04,.88,.45),(x,0,.33),'cardboard',shoe,.008)
box('Shoebox_Back',(1.56,.04,.45),(0,.42,.33),'cardboard',shoe,.008)
box('Shoebox_Front',(1.56,.04,.24),(0,-.42,.22),'cardboard',shoe,.008)
lid=group('Shoebox_Lid',shoe);lid.location=(0,.44,.56)
box('Box_Lid',(1.67,.93,.045),(0,-.44,0),'wood',lid,.018)
wheel=group('Hamster_Wheel',shoe);wheel.location=(.34,0,.32)
bpy.ops.mesh.primitive_torus_add(major_radius=.19,minor_radius=.018,major_segments=48,minor_segments=8,location=(0,0,0));o=bpy.context.object;o.name='Wheel_Rim';o.parent=wheel;o.rotation_euler.x=math.pi/2;o.data.materials.append(M['brass'])
for i in range(4):
 o=box('Wheel_Spoke',(.018,.018,.38),(0,0,0),'brass',wheel,.004);o.rotation_euler.y=i*math.pi/4
stand=box('Wheel_Stand',(.12,.30,.05),(.34,.05,.14),'dark',shoe,.01)
box('Wheel_Support',(.045,.045,.20),(.34,.10,.24),'dark',shoe,.008)
vault=room('Stage_Vault','office')
box('Vault_Back',(1.98,.38,2.36),(0,.18,1.20),'dark',vault,.07)
box('Vault_Inside',(1.64,.025,2.05),(0,-.025,1.20),'board',vault,.03)
for x in [-.94,.94]:box('Vault_Side',(.10,.30,2.30),(x,-.08,1.20),'steel',vault,.025)
for z in [.07,2.34]:box('Vault_Lintel',(1.96,.30,.12),(0,-.08,z),'steel',vault,.025)
door=group('Vault_Door',vault);door.location=(-.87,-.23,1.20)
box('Safe_Door',(1.74,.14,2.08),(.87,0,0),'steel',door,.05)
box('Safe_DoorPanel',(1.56,.025,1.88),(.87,-.082,0),'office',door,.03)
handle=group('Vault_Handle',door);handle.location=(.87,-.11,0)
bpy.ops.mesh.primitive_torus_add(major_radius=.22,minor_radius=.025,major_segments=32,minor_segments=8,location=(0,0,0));o=bpy.context.object;o.name='Handle_Rim';o.parent=handle;o.rotation_euler.x=math.pi/2;o.data.materials.append(M['brass'])
for i in range(3):
 o=box('Handle_Spoke',(.025,.025,.43),(0,0,0),'brass',handle,.004);o.rotation_euler.y=i*math.pi/3
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1080;scene.render.resolution_y=1920;scene.render.fps=30
lights=bpy.data.collections.new('COL_Lights');scene.collection.children.link(lights)
for name,loc,power,color in [('LGT_Key_Main',(-3,-4,6),800,(1,.82,.60)),('LGT_Rim_CoolWindow',(3,2,4),500,(.59,.79,1))]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.size=5;o=bpy.data.objects.new(name,data);lights.objects.link(o);o.location=loc
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'billionaire-swap-5.blend'))
bpy.ops.export_scene.gltf(filepath=str(PUB/'swap-stage-5.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_apply=True)
(OUT/'asset-plan.json').write_text(json.dumps({'sets':['Stage_Office','Stage_Kitchen','Stage_Memory','Stage_Vault'],'props':['Prop_Phone','Prop_Shoebox','Shoebox_Lid','Hamster_Wheel','Vault_Door','Vault_Handle'],'delivery':[1080,1920,30],'animation':'Finite lid, wheel, safe handle and door motions are driven by runtime frame numbers.'},indent=2)+'\n')
print('Saved Part 5 Blender sets, phone, shoebox, wheel and vault.')
