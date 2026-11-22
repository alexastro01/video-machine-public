"""Build two reusable, warm/cool sets and physical story props for swap Part 3."""
from pathlib import Path
import bpy,math,json
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'blender/billionaire-body-swap-3';PUB=ROOT/'public/episodes/billionaire-body-swap-3'
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
classroom=room('Stage_Classroom','wall');window(classroom,-2.6,2.5);window(classroom,2.6,2.5)
box('Maths_Board',(2.75,.10,1.5),(0,3.10,2.5),'board',classroom,.025)
for x in [-1.42,1.42]:box('Board_Edge',(.07,.15,1.6),(x,3.04,2.5),'wood',classroom)
for z in [1.71,3.29]:box('Board_Rail',(2.9,.15,.06),(0,3.04,z),'wood',classroom)
desk(classroom,'StudentDesk',-.45,-.30,1.8)
for x in [-2.6,1.9]:desk(classroom,'BackgroundDesk',x,1.9,1.35)
box('BookShelf',(1.1,.35,1.55),(3.55,2.6,.79),'wood',classroom)
for i in range(9):box('LibraryBook',(.08,.33,.35),(3.13+i*.1,2.58,1.40),'dark' if i%2 else 'plant',classroom,.005)
office=room('Stage_Office','office')
for x in [-3,-1,1,3]:window(office,x,1.9)
desk(office,'BoardroomDesk',-.45,-.30,2.1)
for x in [-2.7,2.7]:
    cyl('Office_Planter',.28,.45,(x,2.6,.22),'dark',office)
    for i in range(5):
        o=box('Plant_Leaf',(.12,.07,.66),(x+(i-2)*.10,2.6,.80+(i%2)*.13),'plant',office,.05);o.rotation_euler.y=(i-2)*.23
props=group('Prop_Templates');paper=group('Prop_Paper',props);box('Paper_Body',(.88,1.10,.009),(0,0,0),'paper',paper,.005)
pencil=group('Prop_Pencil',props);cyl('Pencil_Wood',.025,.58,(0,0,0),'pencil',pencil,6)
bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=.025,radius2=0,depth=.095,location=(0,0,.3375));o=bpy.context.object;o.name='Pencil_Tip';o.parent=pencil;o.data.materials.append(M['graphite'])
phone=group('Prop_Phone',props);box('Phone_Case',(.39,.052,.74),(0,0,0),'black',phone,.04);box('Phone_Screen',(.34,.006,.64),(0,-.030,0),'board',phone,.018)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1080;scene.render.resolution_y=1920;scene.render.fps=30
lights=bpy.data.collections.new('COL_Lights');scene.collection.children.link(lights)
for name,loc,power,color in [('LGT_Key_Windows',(-3,-4,6),800,(1,.82,.60)),('LGT_Rim_CoolWindow',(3,2,4),500,(.59,.79,1))]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.size=5;o=bpy.data.objects.new(name,data);lights.objects.link(o);o.location=loc
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'billionaire-swap-3.blend'))
bpy.ops.export_scene.gltf(filepath=str(PUB/'swap-stage-3.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_apply=True)
(OUT/'asset-plan.json').write_text(json.dumps({'sets':['Stage_Classroom','Stage_Office'],'props':['Prop_Paper','Prop_Pencil','Prop_Phone'],'delivery':[1080,1920,30],'lighting':'Warm window key and cool window rim. Runtime preserves this separation.'},indent=2)+'\n')
print('Saved Part 3 Blender sets and local GLB.')
