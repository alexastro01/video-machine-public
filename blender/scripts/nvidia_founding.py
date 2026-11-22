"""Author the Nvidia short's reusable sets and props in Blender.

The exported GLB is animated deterministically by the Remotion composition.
Coordinates in the helpers are X right, Y up, Z toward the viewing side.
"""
from pathlib import Path
import argparse
import json
import math
import sys
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "blender/nvidia-four-trillion"
PUB = ROOT / "public/episodes/nvidia-four-trillion"
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument("--stills", action="store_true")
args = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
bpy.ops.wm.read_factory_settings(use_empty=True)


def xyz(p):
    return (p[0], -p[2], p[1])


def rgb(color):
    c = [int(color[i:i+2], 16)/255 for i in (1,3,5)]
    return tuple(x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in c)


def material(name, color, rough=.65, metal=0, emit=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*rgb(color), 1)
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb(color), 1)
    shader.inputs["Roughness"].default_value = rough
    shader.inputs["Metallic"].default_value = metal
    if emit:
        shader.inputs["Emission Color"].default_value = (*rgb(color), 1)
        shader.inputs["Emission Strength"].default_value = emit
    return mat


M = {k:material(k,c) for k,c in {
    "cream":"#ede5cf", "paper":"#f6f2e6", "wall":"#35545b", "navy":"#172a3b",
    "wood":"#af784b", "red":"#9d463f", "tile":"#344552", "black":"#121d27",
    "teal":"#3e8290", "green":"#66a82b", "chip":"#286a40", "blue":"#3584b4",
    "skin":"#edc78c", "coffee":"#382e27", "cardboard":"#c9ad7f", "gray":"#7b9299",
}.items()}
M["steel"] = material("brushed chrome", "#aebbbd", .29, .72)
M["gold"] = material("chip contact gold", "#c5a35b", .32, .65)
M["window"] = material("dusk window", "#8bbeda", .6, 0, .38)
M["light"] = material("warm practical", "#ffdf9c", .45, 0, 2)
M["led"] = material("GPU status green", "#9ce856", .5, 0, 1.6)
M["error"] = material("error red", "#f76f67", .5, 0, 1.1)
M["screen"] = material("CRT phosphor", "#97dccc", .5, 0, .7)
M['frame'] = material('graphite steel frame', '#34414a', .38, .42)
M['oak'] = material('bench cabinet oak', '#895b3f', .56)
M['lip'] = material('bench edge', '#d2aa78', .44)
M['liner'] = material('drawer felt', '#2e4345', .95)
M['diner_ivory'] = material('diner ivory tile', '#ddd3ba', .62)
M['diner_slate'] = material('diner slate tile', '#687f82', .58)
M['mat'] = material('antistatic mat', '#506e6b', .9)


def group(name, parent=None):
    obj=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(obj)
    obj.parent=parent
    return obj


def box(name, size, pos, mat, parent, bevel=.018):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(pos))
    obj=bpy.context.object
    obj.name=name
    obj.dimensions=(size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.parent=parent
    obj.data.materials.append(M[mat])
    if bevel:
        mod=obj.modifiers.new("Authored edge bevel", "BEVEL")
        mod.width=bevel
        mod.segments=2
        obj.modifiers.new("Face normals", "WEIGHTED_NORMAL")
    return obj


def cylinder(name, radius, height, pos, mat, parent, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=height,location=xyz(pos))
    obj=bpy.context.object
    obj.name=name
    obj.parent=parent
    obj.data.materials.append(M[mat])
    return obj


def sphere(name, radius, pos, mat, parent, scale=(1,1,1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=radius,location=xyz(pos))
    obj=bpy.context.object
    obj.name=name
    obj.parent=parent
    obj.scale=(scale[0],scale[2],scale[1])
    obj.data.materials.append(M[mat])
    for poly in obj.data.polygons:poly.use_smooth=True
    return obj


def label(name, body, pos, size, mat, parent):
    data=bpy.data.curves.new(name,"FONT")
    data.body=body
    data.align_x="CENTER"
    data.align_y="CENTER"
    data.size=size
    data.extrude=.0008
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    obj.location=xyz(pos)
    obj.rotation_euler.x=math.pi/2
    obj.parent=parent
    obj.data.materials.append(M[mat])
    return obj


def room(name, floor, wall):
    root=group(name)
    box(name+"_Floor",(13,.14,15),(0,-.09,0),floor,root,.01)
    box(name+"_Rear",(13,5.2,.18),(0,2.5,-3.2),wall,root)
    box(name+"_Left",(.17,5.2,15),(-5.2,2.5,-.3),wall,root)
    box(name+"_Right",(.17,5.2,15),(5.2,2.5,-.3),wall,root)
    return root


def desk(parent, x=0, z=0, width=3.5, height=1.0, depth=1.25):
    box("Desk_top",(width,.10,depth),(x,height,z),"wood",parent,.035)
    box("Desk_edge",(width-.02,.07,.035),(x,height-.012,z+depth/2-.014),"lip",parent,.006)
    for dx in [-width/2+.16,width/2-.16]:
        for dz in [-depth/2+.13,depth/2-.13]:
            box("Desk_leg",(.11,height,.11),(x+dx,height/2,z+dz),"frame",parent)
            box("Desk_foot",(.14,.035,.14),(x+dx,.015,z+dz),"black",parent,.008)
        box('Desk_side_rail',(.07,.09,depth-.21),(x+dx,height-.11,z),'frame',parent)
    box('Desk_rear_rail',(width-.23,.09,.07),(x,height-.11,z-depth/2+.13),'frame',parent)


def cup(parent,x,y,z,saucer_parent=None):
    cylinder("Cup_saucer",.18,.025,(x,y,z),"cream",saucer_parent if saucer_parent is not None else parent)
    cylinder("Cup_body",.12,.19,(x,y+.1,z),"paper",parent)
    cylinder("Cup_coffee",.102,.006,(x,y+.199,z),"coffee",parent)
    bpy.ops.mesh.primitive_torus_add(major_radius=.065,minor_radius=.014,major_segments=18,minor_segments=8,location=xyz((x+.13,y+.11,z)))
    obj=bpy.context.object
    obj.name="Cup_handle"
    obj.rotation_euler.x=math.pi/2
    obj.parent=parent
    obj.data.materials.append(M["cream"])


diner=room("Stage_Diner","tile","teal")
for i in range(-5,6):
    for j in range(-5,6):
        box("Diner_checker",(.66,.012,.66),(i*.67,.003,j*.67),"diner_ivory" if (i+j)%2 else "diner_slate",diner,0)
box("Diner_lower_panel",(10,1.25,.08),(0,.62,-3.08),"wood",diner)
for x in [-3.6,-1.8,0,1.8,3.6]:
    box("Diner_window",(1.55,1.95,.04),(x,2.66,-3.08),"window",diner,.025)
    for dx in [-.80,.80]:box("Window_post",(.055,2.05,.08),(x+dx,2.66,-3.02),"steel",diner)
    box("Window_rail",(1.66,.055,.08),(x,2.3,-3.02),"cream",diner)
for side in [-1,1]:
    box("Booth_seat",(1.15,.28,2.15),(side*1.5,.60,-.5),"red",diner,.11)
    box("Booth_back",(.16,1.1,2.15),(side*2.0,1.13,-.5),"red",diner,.07)
    box('Booth_plinth',(.96,.49,1.92),(side*1.5,.24,-.50),'oak',diner,.04)
    for z in [-1.45,-.75,-.05,.55]:box("Booth_piping",(.025,1.0,.02),(side*1.905,1.2,z),"cream",diner,.006)
desk(diner,0,-.48,2.7,1.02)
for x,z in [(.68,-.30),(.26,-.80)]:cup(diner,x,1.086,z)
# The actor's seated drawing places the underside of his hip 0.62 above his shoes.
stool=group('Support_JensenStool',diner)
for z,r,h,mat in [(.037,.245,.065,'frame'),(.29,.06,.51,'steel'),(.55,.22,.05,'steel'),(.605,.325,.096,'red')]:
    cylinder('Stool_pedestal',r,h,(-.05,z,.38),mat,stool,40)
cup_on_table=group('Prop_DinerCup',diner)
cup(cup_on_table,.06,1.086,-.04,saucer_parent=diner)
label("Diner_calendar","1993",(2.7,2.7,-3.01),.34,"paper",diner)
for x in [-1.9,1.9]:
    cylinder("Hanging_shade",.35,.20,(x,3.4,-.35),"cream",diner)
    cylinder("Lamp_diffuser",.29,.018,(x,3.29,-.35),"light",diner)
    cylinder("Lamp_cable",.015,1.0,(x,4,-.35),"black",diner)


workshop=room("Stage_Workshop","wood","wall")
for z in [-2,-1,0,1,2,3,4]:box("Workshop_floor_seam",(10,.004,.013),(0,-.014,z),"black",workshop,0)
box("Workshop_window",(2.7,1.7,.045),(-2.35,2.75,-3.08),"window",workshop)
for x in [-3.7,-2.8,-1.9,-1]:box("Window_mullion",(.045,1.83,.08),(x,2.75,-3.025),"cream",workshop)
for y in [1.87,2.75,3.63]:box("Window_sill",(2.8,.055,.10),(-2.35,y,-3.02),"cream",workshop)
desk(workshop,0,-.10,3.60,1.03,1.62)
box("Tool_pegboard",(2.0,1.3,.10),(2.65,2.6,-3.04),"wood",workshop)
for ix in range(7):
    for iy in range(4):sphere("Peg_hole",.015,(1.88+ix*.25,2.18+iy*.27,-2.97),"black",workshop)
for x in [2.05,2.5,3.05]:
    box("Hanging_tool",(.06,.48,.07),(x,2.58,-2.90),"steel",workshop)
    box("Tool_grip",(.09,.18,.08),(x,2.40,-2.88),"red",workshop,.03)
for y in [1.8,2.6]:
    box("Parts_shelf",(1.5,.07,.43),(3.25,y,-2.7),"wood",workshop)
    for i in range(3):box("Shelf_parts_box",(.34,.27,.32),(2.8+i*.44,y+.18,-2.7),"cardboard",workshop)
monitor=group("Prop_Monitor",workshop)
box("CRT_shell",(1.20,1.03,.65),(.88,1.79,-.47),"cream",monitor,.09)
box("CRT_bezel",(1.07,.84,.07),(.88,1.81,-.10),"black",monitor,.06)
box("CRT_glass",(.91,.67,.015),(.88,1.83,-.055),"screen",monitor,.05)
box("CRT_stand",(.47,.22,.44),(.88,1.185,-.48),"cream",monitor,.03)
for i in range(3):cylinder("CRT_knob",.045,.035,(1.35,1.40,-.015),"gray",monitor)
box("Keyboard",(.92,.05,.38),(.99,1.105,.33),"cream",workshop)
for i in range(10):
    for j in range(3):box("Keyboard_key",(.065,.025,.07),(.62+i*.08,1.141,.23+j*.083),"gray",workshop,.006)
box("Tower_case",(.63,1.2,.74),(-1.30,.64,-1.80),"cream",workshop,.05)
for y in [1.05,.89]:box("Floppy_slot",(.42,.045,.01),(-1.3,y,-1.419),"black",workshop,.002)
for x in [-1.53,-1.42,-1.31,-1.20,-1.09]:box("Tower_vent",(.025,.30,.012),(x,.52,-1.42),"black",workshop,.001)
box("Phone_base",(.46,.12,.44),(-1.48,1.14,.23),"black",workshop,.06)
phone=group("Prop_PhoneReceiver",workshop)
phone.location=xyz((-1.48,1.245,.23))
box("Phone_receiver",(.52,.10,.14),(0,0,0),"black",phone,.04)
label("Sega_contact","SEGA",(-1.48,1.144,.455),.070,"screen",workshop)
box('Test_mat',(1.45,.047,.86),(-.27,1.103,-.04),'mat',workshop,.018)
cab=group('Support_DrawerCabinet',workshop)
cx=-.18
box('Cabinet_toe_kick',(1.42,.10,1.15),(cx,.042,-.02),'frame',cab,.012)
box('Cabinet_bottom',(1.52,.07,1.40),(cx,.115,-.015),'oak',cab)
box('Cabinet_back',(1.52,.87,.07),(cx,.56,-.69),'oak',cab)
for side in [-1,1]:
    x=cx+side*.736
    box('Cabinet_cheek',(.077,.88,1.39),(x,.55,-.02),'oak',cab,.019)
    box('Fixed_steel_runner',(.025,.038,1.15),(cx+side*.685,.799,.01),'steel',cab,.005)
box('Cabinet_drawer_floor',(1.42,.044,1.32),(cx,.691,-.012),'frame',cab,.006)
for y in [.27,.532]:
    box('Lower_drawer_front',(1.412,.248,.065),(cx,y,.660),'oak',cab,.014)
    box('Lower_pull_shadow',(.31,.041,.019),(cx,y+.036,.701),'frame',cab,.005)
    box('Lower_pull',(.29,.025,.035),(cx,y+.046,.711),'steel',cab,.005)
drawer=group("Prop_Drawer",workshop)
for side in [-1,1]:
    box('Cash_drawer_side',(.044,.15,1.15),(cx+side*.648,.818,.058),'lip',drawer,.008)
    box('Moving_runner',(.033,.029,.93),(cx+side*.673,.798,-.01),'steel',drawer,.004)
box('Cash_drawer_bottom',(1.31,.033,1.17),(cx,.753,.05),'liner',drawer,.005)
for dx in [-.214,.214]:
    box('Till_divider',(.024,.075,1.07),(cx+dx,.80,.064),'lip',drawer,.006)
box('Cash_drawer_back',(1.31,.14,.041),(cx,.816,-.516),'wood',drawer,.006)
box('Cash_drawer_front',(1.413,.244,.064),(cx,.852,.660),'wood',drawer,.015)
for dx in [-.17,.17]:box('Drawer_handle_standoff',(.032,.052,.075),(cx+dx,.86,.716),'frame',drawer,.006)
box('Cash_drawer_pull',(.375,.048,.047),(cx,.86,.752),'steel',drawer,.011)
contract=group("Prop_Contract",workshop)
box("Contract_paper",(.44,.012,.44),(-1.18,1.09,-.43),"paper",contract,.006)
for i in range(5):box("Contract_line",(.28,.004,.012),(-1.18,1.098,-.58+i*.065),"gray",contract,.001)
x=1.54
cylinder("Desk_lamp_base",.17,.04,(x,1.10,-.65),"steel",workshop)
cylinder("Desk_lamp_stem",.018,.67,(x,1.45,-.65),"steel",workshop)
cylinder("Desk_lamp_shade",.22,.17,(x,1.84,-.65),"black",workshop)
cylinder("Desk_lamp_light",.18,.012,(x,1.75,-.65),"light",workshop)


def pcb(name,parent,label_text):
    root=group(name,parent)
    box("PCB_board",(1.35,.065,.78),(0,0,0),"chip",root,.026)
    core=group("Prop_RivaCore",root) if name=="Prop_RivaChip" else root
    box("PCB_processor",(.54,.12,.43),(0,.075,-.06),"black",core,.018)
    box("PCB_die",(.28,.024,.23),(0,.148,-.06),"teal",core,.005)
    for i in range(13):box("PCB_gold_contact",(.064,.012,.14),(-.57+i*.095,.04,.31),"gold",root,.004)
    for column,x in enumerate([-.47,.47]):
        for row,z in enumerate([-.24,-.05,.15]):
            parent=group(f"Prop_RivaMemory_{column*3+row}",root) if name=="Prop_RivaChip" else root
            box("PCB_memory",(.18,.055,.13),(x,.063,z),"navy",parent,.007)
    for i in range(8):box("PCB_trace",(.012,.004,.30),(-.24+i*.07,.039,-.11),"gold",root,.001)
    for x in [-.62,.62]:
        for z in [-.31,.31]:cylinder("PCB_mount",.025,.08,(x,.025,z),"steel",root)
    box('Board_label_plate',(.82,.119,.025),(0,.055,.395),'chip',root,.006)
    label("PCB_product",label_text,(0,.059,.411),.10,"cream",root)
    return root


early=pcb("Prop_EarlyChip",workshop,"NVIDIA")
early.location=xyz((-.27,1.155,-.04))
riva=pcb("Prop_RivaChip",workshop,"RIVA 128")
riva.location=xyz((-.27,1.155,-.04))
shipping=group("Prop_Shipping",workshop)
# The loaded cart moves as one rigid stack. Four rotating castors carry it across the floor.
box('Cart_deck',(1.45,.084,.94),(2.48,.244,.90),'frame',shipping,.028)
for idx,(xx,zz) in enumerate([(1.92,.56),(3.04,.56),(1.92,1.24),(3.04,1.24)]):
    wheel=group(f'Prop_CartWheel_{idx}',shipping)
    wheel.location=xyz((xx,.097,zz))
    tire=cylinder('Cart_tire',.095,.07,(0,0,0),'black',wheel,32)
    tire.rotation_euler.x=math.pi/2
    hub=cylinder('Cart_hub',.042,.082,(0,0,0),'steel',wheel,20)
    hub.rotation_euler.x=math.pi/2
    box('Hub_mark',(.035,.012,.006),(.015,0,.043),'cream',wheel,.001)
    box('Caster_yoke',(.045,.112,.085),(xx,.166,zz),'steel',shipping,.007)
for zz in [.55,1.25]:
    cylinder('Cart_handle_post',.035,1.02,(3.153,.785,zz),'steel',shipping)
box('Cart_grip',(.083,.084,.78),(3.153,1.30,.90),'frame',shipping,.028)
for i in range(6):
    carton=group(f"Prop_Shipping_{i}",shipping)
    x=2.15+(i%2)*.65;y=.496+(i//2)*.430;z=.9
    box("Shipping_carton",(.59,.42,.70),(x,y,z),"cardboard",carton,.02)
    box("Carton_tape",(.10,.01,.71),(x,y+.215,z),"cream",carton,.001)
    label("Carton_product","RIVA 128",(x,y,z+.357),.066,"black",carton)

compute=room("Stage_Compute","paper","cream")
box("Compute_pedestal",(4.4,.20,2.5),(0,.84,-.1),"cream",compute,.08)
box("Compute_pedestal_base",(2.5,.72,1.1),(.25,.36,-.25),"cream",compute,.06)
box('Chip_test_socket',(2.70,.119,1.61),(-.20,.999,-.30),'mat',compute,.025)
box('Parallel_lane_carrier',(2.10,.04,1.54),(1.04,1.139,-.16),'cream',compute,.018)
for xx in [.22,1.85]:
    for zz in [-.76,.43]:cylinder('Lane_standoff',.045,.20,(xx,1.03,zz),'steel',compute)
large_chip=pcb("Prop_ComputeChip",compute,"CUDA")
large_chip.location=xyz((-.2,1.12,-.30))
large_chip.scale=(1.9,1.9,1.9)
for i in range(8):
    box("Parallel_lane",(3.2,.018,.024),(.55,1.17,-.82+i*.19),"gold",compute,.005)
box("Network_display",(2.4,1.8,.16),(1.0,2.55,-1.7),"navy",compute,.05)
box('Display_foot',(.72,.07,.45),(1,.028,-1.85),'frame',compute,.025)
box('Display_post',(.105,1.83,.12),(1,.93,-1.81),'frame',compute)
label("Cuda_plate","CUDA",(-.65,1.0,1.17),.15,"chip",compute)

servers=room("Stage_Servers","navy","black")
for z in range(-3,5):
    box("Server_floor_joint",(10,.008,.018),(0,.002,z),"gray",servers,.001)
for x in [-1.25,1.25]:box("Aisle_light",(.045,.016,10),(x,.012,-.4),"led",servers,.006)
for side in [-1,1]:
    for row in range(5):
        x=side*2.30;z=1-row*1.15
        inside=x-side*.59
        box("Server_cabinet",(1.15,3.15,.93),(x,1.59,z),"navy",servers,.04)
        for level in range(9):
            y=.26+level*.31
            box("GPU_bay",(.045,.25,.85),(inside,y,z),"black",servers,.018)
            box("GPU_status_plate",(.018,.10,.15),(inside-side*.035,y,z+.335),"black",servers,.004)
            for dz in [-.30,-.15,0,.15]:box("GPU_vent",(.015,.085,.075),(inside-side*.04,y,z+dz),"gray",servers,.004)
        box("Cabinet_top",(.02,.045,.85),(inside-side*.04,3.02,z),"green",servers,.006)
box("Market_board",(2.95,2.12,.18),(0,3.21,-2.35),"navy",servers,.09)
for x in [-.93,.93]:box('Market_wall_mount',(.11,.73,.73),(x,3.21,-2.76),'frame',servers)
market=group('Prop_MarketLegend',servers)
label("Market_brand","NVIDIA",(0,3.88,-2.245),.32,"led",market)
label("Market_date","JULY 2025",(0,3.51,-2.245),.16,"cream",market)
amount=group("Prop_MarketValue",servers)
label("Market_amount","$4 TRILLION",(0,3.06,-2.24),.33,"paper",amount)
label("Market_context","MARKET VALUE",(0,2.63,-2.24),.145,"gray",market)
box("Cuda_terminal",(.85,.63,.10),(.76,1.58,.25),"black",servers,.035)
label("Terminal_label","CUDA",(.76,1.65,.31),.14,"led",servers)
for i in range(3):box("Terminal_code",(.50,.012,.01),(.76,1.49+i*.055,.31),"gray",servers,.002)
server_chip=pcb("Prop_ServerChip",servers,"NVIDIA")
server_chip.location=xyz((-.15,1.10,.25))
box("GPU_display_plinth",(2.28,1.0,1.08),(.04,.50,.25),"navy",servers,.05)
box('GPU_socket',(1.36,.071,.80),(-.15,1.035,.25),'mat',servers,.016)
box('Terminal_foot',(.43,.035,.26),(.81,1.018,.17),'gray',servers,.01)
box('Terminal_arm',(.071,.32,.07),(.81,1.19,.20),'frame',servers,.012)
box("Plinth_edge_light",(1.72,.024,.03),(-.15,1.012,.79),"led",servers,.006)

# Keep dynamic roots intact; combine static meshes by parent and material.
for obj in list(bpy.data.objects):
    if obj.type=="FONT":
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target="MESH")
for parent in [diner,workshop,compute,servers,early,riva,shipping,large_chip,server_chip,drawer,contract,monitor,phone,amount]:
    children=[o for o in parent.children if o.type=="MESH"]
    bins={}
    for obj in children:
        key=obj.data.materials[0].name if obj.data.materials else "empty"
        bins.setdefault(key,[]).append(obj)
    for key,objects in bins.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        objects[0].name=parent.name+"_"+key.replace(" ","_")

scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=24
scene.render.resolution_x=720
scene.render.resolution_y=1280
scene.render.resolution_percentage=100
scene.render.fps=60
if scene.world is None:
    scene.world=bpy.data.worlds.new("Nvidia set environment")
scene.world.color=(.10,.10,.10)
scene["production_note"]="Original editable Nvidia story sets. The film's deterministic cameras, actors and prop choreography live in src/nvidia/ and episodes/nvidia-four-trillion/edit.json."

def area(name,position,target,energy,color,size):
    data=bpy.data.lights.new(name,"AREA")
    data.energy=energy
    data.color=rgb(color)
    data.size=size
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    obj.location=xyz(position)
    obj.rotation_euler=(Vector(xyz(target))-obj.location).to_track_quat("-Z","Y").to_euler()
    return obj

area("LGT_Key_Window",(-3.5,5,4),(0,1,0),900,"#ffe0b0",4)
area("LGT_Rim_Cool",(3.5,3.8,-2),(0,1,0),600,"#a7c9ef",3)
area("LGT_Fill_Front",(0,3,6),(0,1,0),180,"#d5ebef",4)
camera_data=bpy.data.cameras.new("CAM_Calibration_Workshop")
camera=bpy.data.objects.new("CAM_Calibration_Workshop",camera_data)
bpy.context.collection.objects.link(camera)
camera.location=xyz((3.5,3.4,7.7))
camera.rotation_euler=(Vector(xyz((0,1.45,0)))-camera.location).to_track_quat("-Z","Y").to_euler()
camera_data.lens=43
camera_data.sensor_fit="VERTICAL"
scene.camera=camera
for image in bpy.data.images:
    if image.source=="FILE":image.pack()

# Export every root, including those hidden for the .blend's opening view.
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.export_scene.gltf(filepath=str(PUB/"nvidia-sets-v3.glb"),export_format="GLB",export_yup=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
for root in [diner,compute,servers]:
    for obj in [root,*root.children_recursive]:obj.hide_render=True;obj.hide_set(True)
for obj in [riva,*riva.children_recursive,shipping,*shipping.children_recursive]:obj.hide_render=True;obj.hide_set(True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"nvidia-sets-v3.blend"))
if args.stills:
    scene.render.filepath=str(OUT/"workshop-model-review.png")
    bpy.ops.render.render(write_still=True)
manifest={"blend":"blender/nvidia-four-trillion/nvidia-sets-v3.blend","model":"episodes/nvidia-four-trillion/nvidia-sets-v3.glb","sets":["Stage_Diner","Stage_Workshop","Stage_Compute","Stage_Servers"],"dynamicRoots":["Prop_EarlyChip","Prop_RivaChip","Prop_PhoneReceiver","Prop_Drawer","Prop_Contract","Prop_Shipping","Prop_ComputeChip","Prop_MarketValue","Prop_ServerChip"],"authoring":"Blender, original procedural geometry; animated in Remotion","userApproved":False}
manifest['dynamicRoots']+=['Prop_DinerCup','Prop_MarketLegend']
manifest['supports']=['Support_DrawerCabinet','Support_JensenStool','Display_post','Terminal_arm','Test_mat']
manifest["dynamicChildren"]=[f"Prop_CartWheel_{i}" for i in range(4)]+["Prop_RivaCore"]+[f"Prop_RivaMemory_{i}" for i in range(6)]+[f"Prop_Shipping_{i}" for i in range(6)]
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print(json.dumps(manifest),flush=True)
