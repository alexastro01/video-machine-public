"""Original Blender study set and reusable task prop. Coordinates use metres/Y up."""
from pathlib import Path
import bpy, math
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'blender/start-the-task'; PUB=ROOT/'public/episodes/start-the-task'
OUT.mkdir(parents=True,exist_ok=True);PUB.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,rough=.65,metal=0,emission=0):
    c=tuple(int(color[i:i+2],16)/255 for i in (1,3,5))
    c=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
    n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
    n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=emission
    return m
M={k:material(k,v) for k,v in dict(wall='#587977',floor='#c4ab88',wood='#bd9468',trim='#e5ddca',ink='#263a45',leaf='#6c8272',rug='#788e89',city='#6c92a4',sky='#b8d4dc',paper='#f6f3e9',coffee='#4e3930',blue='#347ab4',cloth='#bfd3d1').items()}
M['brass']=material('soft brass','#bda672',.32,.5)
M['light']=material('lamp glow','#ffe6bc',.4,0,4)
def box(name,size,pos,mat,bevel=.025,parent=None):
    x,y,z=pos;sx,sy,sz=size
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name;o.dimensions=(sx,sz,sy)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(M[mat])
    if bevel:
        b=o.modifiers.new('soft edge','BEVEL');b.width=bevel;b.segments=3;o.modifiers.new('weighted normal','WEIGHTED_NORMAL')
    if parent:o.parent=parent
    return o
def cyl(name,r,h,pos,mat,parent=None):
    x,y,z=pos;bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=r,depth=h,location=(x,-z,y));o=bpy.context.object;o.name=name;o.data.materials.append(M[mat]);o.modifiers.new('weighted normal','WEIGHTED_NORMAL')
    if parent:o.parent=parent
    return o
box('Floor',(14,.12,18),(0,-.07,0),'floor')
for i in range(-12,13):box('Plank_seam',(.006,.002,18),(i*.44,-.008,0),'wood',0)
box('Back_wall',(14,6,.13),(0,2.95,-2.4),'wall')
box('Baseboard',(14,.12,.07),(0,.055,-2.29),'trim')
box('Window',(1.65,1.65,.05),(-.96,2.52,-2.30),'sky')
for i in range(6):box('Distant_city',(.22,.19+(i%3)*.13,.04),(-1.6+i*.26,1.87+(i%3)*.065,-2.255),'city',.01)
for x in [-1.82,-.96,-.10]:box('Window_vertical',(.055,1.75,.10),(x,2.52,-2.22),'trim')
for y in [1.65,2.50,3.39]:box('Window_horizontal',(1.8,.055,.10),(-.96,y,-2.22),'trim')
box('Rug',(3.9,.02,3.3),(0,.005,.35),'rug',.08)
box('Desk_top',(2.7,.13,1.24),(0,.965,.50),'wood',.045)
box('Desk_front_lip',(2.66,.10,.065),(0,.91,1.10),'wood',.018)
for x in [-1.17,1.17]:
    for z in [.02,.97]:box('Desk_leg',(.10,.90,.10),(x,.45,z),'ink')
box('Desk_brass_line',(2.55,.014,.015),(0,1.006,1.132),'brass',.004)
box('Shelf',(1.06,.065,.25),(1.03,2.62,-2.20),'wood')
for i in range(6):box('Shelf_book',(.12,.26+(i%3)*.035,.17),(.65+i*.14,2.78,-2.2),'ink' if i%2 else 'paper',.01)
cyl('Lamp_base',.15,.035,(1.06,1.05,.20),'brass')
cyl('Lamp_stem',.017,.49,(1.06,1.29,.20),'brass')
bpy.ops.mesh.primitive_cone_add(vertices=40,radius1=.20,radius2=.10,depth=.23,location=(1.06,-.20,1.61));bpy.context.object.name='Lamp_shade';bpy.context.object.data.materials.append(M['trim'])
cyl('Lamp_diffuser',.15,.015,(1.06,1.495,.20),'light')
cyl('Plant_pot',.23,.35,(1.74,.18,-1.45),'paper')
for i in range(8):
    a=i*2.4;o=box('Plant_leaf',(.10,.43,.055),(1.74+math.cos(a)*.17,.61+(i%3)*.09,-1.45+math.sin(a)*.16),'leaf',.04);o.rotation_euler.y=math.sin(a)*.6
box('Blank_page',(.48,.008,.60),(-.35,1.035,.55),'paper',.015)
box('Pencil',(.025,.025,.38),(-.78,1.05,.64),'brass',.01)
box('Cleaning_cloth',(.36,.014,.25),(.35,1.043,.77),'cloth',.04)
for i in range(3):
    group=bpy.data.objects.new(f'Coffee_{i+1}',None);bpy.context.collection.objects.link(group)
    cyl('Cup_shell',.12,.22,(0,.11,0),'paper',group)
    cyl('Cup_coffee',.101,.006,(0,.224,0),'coffee',group)
    bpy.ops.mesh.primitive_torus_add(major_segments=28,minor_segments=12,location=(.13,0,.11),rotation=(math.pi/2,0,0),major_radius=.064,minor_radius=.016)
    o=bpy.context.object;o.name='Cup_handle';o.data.materials.append(M['paper']);o.parent=group
    group.location=(20+i*2,0,0)
box('Task_Block',(2.30,.82,.24),(0,2.65,0),'blue',.075)
bpy.context.scene['authoring']='Original study set; dynamic coffee groups and task block are positioned by Remotion frames.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'study-room-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(PUB/'study-room-v1.glb'),export_format='GLB',export_yup=True,export_apply=True)
print('Saved original study room, task block and three independent coffee props.')
