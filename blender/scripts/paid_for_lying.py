"""Reusable Blender sets and physical story props for Paid for Lying.

Export geometry to the deterministic HyperFrames/Three.js renderer. No video
frames or external services are needed to rebuild these assets.
"""
from pathlib import Path
import bpy
import math
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'blender/paid-for-lying'
PUB = ROOT / 'public/episodes/paid-for-lying'
OUT.mkdir(parents=True, exist_ok=True)
PUB.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def linear(v):
    return v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4

def material(name, color, metal=0, emit=0):
    c = color.lstrip('#')
    rgb = tuple(linear(int(c[i:i+2], 16)/255) for i in (0, 2, 4))
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Roughness'].default_value = .72
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Emission Color'].default_value = (*rgb, 1)
    bs.inputs['Emission Strength'].default_value = emit
    return m

M = {k: material(k, c) for k, c in {
    'teal':'#41696a', 'deep':'#284551', 'floor':'#baa07b',
    'wood':'#987653', 'woodlight':'#c7aa7c', 'ink':'#20323b',
    'cream':'#eee0b8', 'sage':'#789282', 'mutedgold':'#b7a15f',
    'paper':'#f1e8ca', 'plum':'#706179', 'silver':'#9ca9a8',
    'blue':'#536d80', 'brick':'#9a7665', 'leaf':'#677f65',
}.items()}
M['light'] = material('warm lamp emitter', '#f0cd94', emit=2)
M['screen'] = material('muted cyan screen', '#83ada9', emit=.35)

def group(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj); obj.parent = parent
    return obj

def box(name, size, pos, mat, parent, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object; obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(M[mat] if isinstance(mat, str) else mat)
    obj.parent = parent
    if bevel:
        mod = obj.modifiers.new('small softened edges', 'BEVEL'); mod.width = bevel; mod.segments = 2
        mod = obj.modifiers.new('weighted normals', 'WEIGHTED_NORMAL')
    return obj

def cyl(name, radius, depth, pos, mat, parent, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=pos)
    obj = bpy.context.object; obj.name = name; obj.parent = parent
    obj.data.materials.append(M[mat])
    return obj

def room(name, wall='teal', floor='floor'):
    root = group(name)
    box(name+'_Floor', (10, 8, .12), (0, .4, -.08), floor, root)
    for i in range(28):
        box(name+f'_FloorSeam_{i}', (.012, 8, .006), (-4.7+i*.35, .4, -.016), 'wood', root, 0)
    box(name+'_Back', (10, .15, 4.8), (0, 2.45, 2.4), wall, root)
    box(name+'_Left', (.15, 7, 4.8), (-4.7, .2, 2.4), 'deep', root)
    box(name+'_Skirting', (10, .12, .13), (0, 2.32, .08), 'woodlight', root)
    # Window frame, recess, mullion and distant city blocks.
    box(name+'_WindowRecess', (2.5, .05, 1.85), (-2.3, 2.33, 2.6), 'blue', root)
    for x in [-3.58, -2.3, -1.02]:
        box(name+'_WindowUpright', (.065, .11, 1.98), (x, 2.26, 2.6), 'woodlight', root)
    for z in [1.63, 2.6, 3.57]:
        box(name+'_WindowCross', (2.63, .11, .065), (-2.3, 2.26, z), 'woodlight', root)
    for i in range(12):
        h = .16+(i*37%9)*.045
        box(name+'_Skyline', (.15, .025, h), (-3.4+i*.19, 2.28, 1.67+h/2), 'deep', root, 0)
    return root

def shelf(root, x, name):
    for z in [.45, 1.12, 1.79, 2.46]:
        box(name+'_Shelf', (1.45, .48, .065), (x, 1.96, z), 'woodlight', root)
        for j in range(4):
            h = .28+(j%2)*.12
            box(name+f'_Stock_{z}_{j}', (.23, .25, h), (x-.48+j*.32, 1.98, z+.04+h/2), ['sage','cream','blue','plum'][j], root)
    for side in [-.73, .73]:
        box(name+'_ShelfSide', (.06, .5, 2.66), (x+side, 1.96, 1.34), 'wood', root)

home = room('Stage_Home')
box('Home_Rug', (3.8, 2, .012), (0, -.2, -.005), 'sage', home)
for x in [-1.6, 1.6]:
    box('Home_DeskLeg', (.085, .65, .76), (x, -.7, .38), 'wood', home)
box('Home_Desk', (3.5, .9, .09), (0, -.7, .82), 'woodlight', home)
shelf(home, 2.8, 'Home_Books')
box('Home_SofaSeat', (2.2, .8, .45), (-2.3, 1.35, .25), 'sage', home)
box('Home_SofaBack', (2.2, .18, .58), (-2.3, 1.71, .68), 'teal', home)
for x in [-3.45, -1.15]:
    box('Home_SofaArm', (.18, .9, .6), (x, 1.35, .43), 'deep', home)
cyl('Home_LampBase', .23, .035, (-.9, 1.5, .02), 'ink', home)
cyl('Home_LampStem', .025, 1.48, (-.9, 1.5, .77), 'silver', home)
bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=.30, radius2=.17, depth=.38, location=(-.9, 1.5, 1.68))
bpy.context.object.name = 'Home_LampShade'; bpy.context.object.parent = home
bpy.context.object.data.materials.append(M['cream'])

electronic = room('Stage_Electronics', 'deep', 'silver')
corner = room('Stage_Corner', 'teal', 'floor')
for root, name, counter_color in [(electronic,'Electronics','silver'), (corner,'Corner','wood')]:
    for x in [-2.8, 2.8]:
        shelf(root, x, name)
    box(name+'_Counter', (3.2, .88, .83), (0, -.1, .42), counter_color, root, .025)
    box(name+'_CounterTop', (3.35, 1.02, .09), (0, -.1, .89), 'woodlight' if name=='Corner' else 'cream', root)
    for x in [-1.2, 0, 1.2]:
        box(name+'_CounterPanel', (.015, .018, .64), (x, -.555, .43), 'deep', root, 0)
    box(name+'_RegisterBase', (.63, .50, .12), (.66, .02, 1.0), 'ink', root)
    drawer = box(name+'_CashDrawer', (.58, .46, .075), (.66, -.05, 1.015), 'silver', root)
    box(name+'_RegisterPost', (.07, .08, .25), (.66, .10, 1.2), 'silver', root)
    screen = box(name+'_RegisterScreen', (.70, .065, .42), (.66, .10, 1.49), 'ink', root)
    screen.rotation_euler.x = -.12
    box(name+'_RegisterGlass', (.60, .014, .32), (.66, .058, 1.49), 'screen', root)
    if name == 'Electronics':
        box('Electronics_Terminal', (.31, .18, .13), (-.42, -.21, 1.0), 'ink', root)
        box('Electronics_TerminalGlass', (.23, .10, .012), (-.42, -.23, 1.072), 'screen', root)
        for j in range(3):
            for k in range(3):
                box('Electronics_Key', (.04, .018, .008), (-.49+k*.06, -.18+j*.025, 1.075), 'cream', root, 0)
    else:
        drawer.keyframe_insert(data_path='location', frame=1)
        drawer.location.y -= .35; drawer.keyframe_insert(data_path='location', frame=10)
        drawer.keyframe_insert(data_path='location', frame=20)
        drawer.location.y += .35; drawer.keyframe_insert(data_path='location', frame=30)
        if drawer.animation_data and drawer.animation_data.action:
            drawer.animation_data.action.name = 'AN_Paid_CashDrawer_Once'
        bpy.context.scene.frame_set(1)
    for x in [-1.5, 1.5]:
        box(name+'_CeilingLamp', (.9, .2, .06), (x, .6, 4.0), 'light', root)

street = group('Stage_Street')
box('Street_Pavement', (30, 5, .16), (0, -.15, -.1), 'floor', street)
box('Street_Road', (30, 4, .12), (0, -4.2, -.15), 'deep', street)
for i in range(24):
    box('Street_PavingJoint', (.018, 5, .006), (-12+i, -.15, -.012), 'wood', street, 0)
for i in range(7):
    x = -10+i*3.8
    box('Street_Shop', (3.6, .3, 5), (x, 2.1, 2.5), ['teal','brick','blue'][i%3], street)
    box('Street_ShopGlass', (2.65, .04, 2.5), (x, 1.91, 1.65), 'deep', street)
    box('Street_Lintel', (3.05, .3, .14), (x, 1.78, 3.0), 'woodlight', street)
    for dx in [-1.4, 1.4]:
        box('Street_Frame', (.10, .18, 2.8), (x+dx, 1.82, 1.6), 'woodlight', street)
    box('Street_WindowUpper', (2.35, .04, .9), (x, 1.91, 4.0), 'screen', street)
    box('Street_Awning', (3.15, .85, .10), (x, 1.3, 3.12), 'sage', street)

props = group('Prop_Templates')
phone = group('Prop_Phone', props)
box('Phone_Body', (.68, .075, 1.25), (0, 0, 0), 'ink', phone, .06)
box('Phone_Glass', (.60, .014, 1.10), (0, -.046, -.01), 'deep', phone, .04)
box('Phone_Speaker', (.17, .010, .018), (0, -.056, .565), 'silver', phone, .005)

console = group('Prop_Console', props)
box('Console_Body', (1.1, .11, .56), (0, 0, 0), 'ink', console, .055)
box('Console_Screen', (.62, .013, .40), (0, -.065, 0), 'screen', console, .015)
for x in [-.42, .42]:
    joystick = cyl('Console_Stick', .065, .025, (x, -.085, .08 if x<0 else -.08), 'silver', console)
    joystick.rotation_euler.x = math.pi/2
    box('Console_Button', (.065, .02, .065), (x, -.085, -.08 if x<0 else .09), 'cream', console)

bag = group('Prop_Bag', props)
box('Bag_Body', (.68, .34, .75), (0, 0, .375), 'woodlight', bag, .018)
for x in [-.20, .20]:
    box('Bag_HandleSide', (.035, .04, .28), (x, 0, .86), 'wood', bag)
box('Bag_HandleTop', (.43, .04, .035), (0, 0, 1.0), 'wood', bag)

note = group('Prop_Banknote', props)
box('Note_Thickness', (1.0, .012, .472), (0, 0, 0), 'paper', note, .004)
image = bpy.data.images.load(str(PUB / 'art/banknote.png')); image.pack()
m = bpy.data.materials.new('pixel banknote face'); m.use_nodes = True
bs = m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Roughness'].default_value = .9
texture = m.node_tree.nodes.new('ShaderNodeTexImage'); texture.image = image; texture.interpolation = 'Closest'
m.node_tree.links.new(texture.outputs['Color'], bs.inputs['Base Color'])
for front in [-1, 1]:
    mesh = bpy.data.meshes.new('Note_Face_Mesh')
    y = front * .007
    verts = [(-.5,y,-.236),(.5,y,-.236),(.5,y,.236),(-.5,y,.236)]
    mesh.from_pydata(verts, [], [(0,1,2,3)]); mesh.update()
    obj = bpy.data.objects.new('Note_Face', mesh); bpy.context.collection.objects.link(obj); obj.parent = note
    uv = mesh.uv_layers.new()
    for loop, coord in zip(uv.data, [(0,0),(1,0),(1,1),(0,1)]): loop.uv = coord
    obj.data.materials.append(m)

# Source-stage lighting remains editable in Blender; export geometry for the
# matching warm key/cool fill rig in the browser.
lights = group('COL_Lights')
for name, color, energy, loc, size in [
    ('LGT_Key_Window',(1,.79,.58),750,(-3,-4,6),5),
    ('LGT_Fill_Cool',(.55,.76,1),300,(4,-1,4),4),
    ('LGT_Rim_Back',(.94,.78,.54),450,(2,3,5),3),
]:
    data = bpy.data.lights.new(name, 'AREA'); data.energy=energy; data.color=color; data.shape='DISK'; data.size=size
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); obj.parent=lights; obj.location=loc
    obj.rotation_euler=(Vector((0,0,1.2))-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.4,-7.2,2.6))
camera=bpy.context.object; camera.name='CAM_Portrait_Review'; camera.data.lens=38
camera.rotation_euler=(Vector((0,0,1.5))-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.camera=camera
bpy.context.scene.render.engine='CYCLES'
bpy.context.scene.cycles.samples=32
bpy.context.scene.render.resolution_x=540; bpy.context.scene.render.resolution_y=960; bpy.context.scene.render.resolution_percentage=100
bpy.context.scene.render.fps=30; bpy.context.scene.frame_end=30
for root in [electronic, corner, street, props]: root.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'paid-for-lying-v1.blend'))
# Export all collections in one small local asset, without their source cameras,
# lights or example animation. Visibility and every transform are frame-driven.
for root in [home, electronic, corner, street, props]: root.hide_render=False
bpy.ops.export_scene.gltf(filepath=str(PUB/'paid-stage-v1.glb'), export_format='GLB',
                          export_animations=False, export_cameras=False, export_lights=False,
                          export_apply=True)
print('Saved reusable paid-for-lying Blender source and GLB geometry.')
