"""Reusable Blender-authored desk room. Exported GLB uses metres, Y up."""
from pathlib import Path
import bpy, math
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'blender/ok-message'; PUB=ROOT/'public/episodes/ok-message'
OUT.mkdir(parents=True,exist_ok=True);PUB.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,rough=.72,metal=0,emission=0):
    c=tuple(int(color[i:i+2],16)/255 for i in (1,3,5))
    c=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
    n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
    n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=emission
    return m
M={k:material(k,v) for k,v in dict(wall='#668b8b',floor='#c7b393',wood='#b99367',trim='#e7ddc7',ink='#253843',leaf='#638178',rug='#537c7a',city='#577f91',sky='#9fbfcd',curtain='#a1aaa1',paper='#e5dfcf').items()}
M['brass']=material('brushed brass','#bda672',.35,.45)
M['light']=material('warm lamp','#ffe2ae',.4,0,3)
M['screen']=material('phone glass','#d6e4e4',.2,.2)
def box(name,size,pos,mat,bevel=.02):
    x,y,z=pos;sx,sy,sz=size
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name;o.dimensions=(sx,sz,sy)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(M[mat])
    if bevel:
        b=o.modifiers.new('edge highlight','BEVEL');b.width=bevel;b.segments=3;o.modifiers.new('weighted normal','WEIGHTED_NORMAL')
    return o
def cyl(name,r,h,pos,mat,vertices=32):
    x,y,z=pos;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=(x,-z,y));o=bpy.context.object;o.name=name;o.data.materials.append(M[mat]);o.modifiers.new('weighted normal','WEIGHTED_NORMAL');return o
box('Continuous_floor',(20,.15,24),(0,-.095,1),'floor')
for i in range(-9,10):box('Floor_plank_seam',(.009,.003,24),(i*.58,-.017,1),'wood',0)
box('Back_wall_lower',(20,1.15,.18),(0,.55,-2.5),'wall')
box('Back_wall_upper',(20,3,.18),(0,4.4,-2.5),'wall')
box('Back_wall_left',(7.6,2,.18),(-6.2,2.05,-2.5),'wall')
box('Back_wall_right',(10.1,2,.18),(4.95,2.05,-2.5),'wall')
box('Side_wall',( .15,8,24),(-4,3,1),'wall')
box('Baseboard',(20,.12,.12),(0,.05,-2.34),'trim')
box('Window_sky',(2.45,2.1,.08),(-1.24,2.08,-3.2),'sky')
for i in range(9):
    h=.28+(i*7%9)*.08
    box('Distant_roof',(.22,h,.12),(-2.3+i*.27,1.12+h/2,-3.1),'city',0)
for x in [-2.49,-1.24,.01]:box('Window_mullion',(.065,1.97,.13),(x,2.09,-2.36),'trim')
for y in [1.12,3.08]:box('Window_sill',(2.65,.075,.28),(-1.24,y,-2.33),'trim')
box('Window_crossbar',(2.5,.045,.12),(-1.24,2.12,-2.34),'trim')
for i in range(5):box('Curtain_fold',(.09,2.25,.12),(-2.69+i*.09,2.13,-2.17),'curtain',.04)
box('Woven_rug',(4.1,.025,3.1),(.02,.005,.3),'rug',.04)
box('Desk_top',(3.45,.12,1.34),(.1,.94,.47),'wood',.045)
for x in [-1.3,1.5]:
    for z in [-.02,.97]:box('Desk_leg',(.085,.9,.085),(x,.45,z),'ink')
box('Desk_edge_inlay',(3.35,.025,.025),(.1,.947,1.15),'brass',.005)
box('Phone_body',(.34,.045,.66),(.12,1.023,.76),'ink',.045)
box('Phone_glass',(.29,.008,.57),(.12,1.05,.76),'screen',.025)
box('Phone_camera',(.08,.008,.025),(.12,1.056,.53),'ink',.008)
cyl('Lamp_foot',.18,.035,(1.34,1.022,.11),'brass')
cyl('Lamp_stem',.022,.58,(1.34,1.31,.11),'brass')
bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.23,radius2=.12,depth=.28,location=(1.34,-.11,1.62));bpy.context.object.name='Lamp_shade';bpy.context.object.data.materials.append(M['trim'])
cyl('Lamp_diffuser',.18,.012,(1.34,1.485,.11),'light')
box('Wall_shelf',(1.1,.07,.23),(1.06,2.34,-2.28),'wood')
for i in range(6):box('Shelf_book',(.095,.28+(i%3)*.05,.15),(.63+i*.12,2.53,-2.27),'trim' if i%2 else 'ink')
cyl('Plant_pot',.28,.44,(1.95,.22,-1.7),'trim')
for i in range(7):
    a=i*2.4;x=1.95+math.cos(a)*.20;z=-1.7+math.sin(a)*.18
    o=box('Plant_leaf',(.13,.55,.07),(x,.76+(i%3)*.13,z),'leaf',.05);o.rotation_euler.y=math.sin(a)*.5
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'room-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(PUB/'room-v1.glb'),export_format='GLB',export_yup=True,export_apply=True)
print('Exported original desk room GLB')
