"""Deja-vu cafe: one layout, two rooms, a wireframe reveal and a seamless loop.

Builds the golden-hour cafe and a forgotten room that shares its exact layout
slots, wireframe copies of both, voxel smoke, wand sparks and the two pixel
characters as upright native-GIF atlas planes. All motion is keyed from
blender/deja-vu/config-v1.json (derived from the selected dialogue take).

blender --background --factory-startup --python blender/scripts/deja_vu.py -- [--stills] [--still-times a,b] [--render] [--range a:b] [--samples N] [--revision v1]
"""
from pathlib import Path
import argparse, json, math, sys, time
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser()
ap.add_argument("--stills", action="store_true"); ap.add_argument("--still-times")
ap.add_argument("--render", action="store_true"); ap.add_argument("--range")
ap.add_argument("--samples", type=int); ap.add_argument("--revision", default="v1")
ap.add_argument("--percent", type=int, default=100)
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
OUT = ROOT / "blender/deja-vu"
CFG = json.loads((OUT / "config-v1.json").read_text())
FPS = CFG["fps"]; N = CFG["frames"]; EV = CFG["events"]; SHOTS = CFG["shots"]
FR = OUT / f"frames-{args.revision}"; FR.mkdir(parents=True, exist_ok=True)
ST = OUT / f"stills-{args.revision}"; ST.mkdir(parents=True, exist_ok=True)
ART = "public/episodes/deja-vu/art"

bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
S = bpy.context.scene
S.render.engine = "BLENDER_EEVEE"; S.eevee.taa_render_samples = args.samples or CFG["samples"]
S.eevee.use_raytracing = False; S.eevee.use_fast_gi = False; S.eevee.shadow_ray_count = 1
S.render.resolution_x = CFG["worldWidth"]; S.render.resolution_y = CFG["worldHeight"]
S.render.resolution_percentage = args.percent; S.render.fps = FPS; S.frame_start = 1; S.frame_end = N
S.render.image_settings.file_format = "PNG"; S.render.image_settings.color_mode = "RGB"
S.render.image_settings.compression = 12; S.render.use_motion_blur = False
S.view_settings.view_transform = "AgX"; S.view_settings.look = "AgX - Medium High Contrast"; S.view_settings.exposure = 0.1


def rgb(h):
    c = [int(h.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


def material(n, c, emit=0, rough=.7, metal=0):
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb(c), 1); b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal; b.inputs["Emission Color"].default_value = (*rgb(c), 1)
    b.inputs["Emission Strength"].default_value = emit; return m


def glow(n, c, strength, alpha=1.0):
    """Unlit emissive material, optionally see-through (wire, smoke, shafts)."""
    m = bpy.data.materials.new(n); m.use_nodes = True; ns = m.node_tree.nodes; ns.clear(); lk = m.node_tree.links
    em = ns.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*rgb(c), 1); em.inputs["Strength"].default_value = strength
    out = ns.new("ShaderNodeOutputMaterial")
    if alpha < 1:
        m.surface_render_method = "BLENDED"
        tr = ns.new("ShaderNodeBsdfTransparent"); mix = ns.new("ShaderNodeMixShader"); mix.inputs[0].default_value = alpha
        lk.new(tr.outputs[0], mix.inputs[1]); lk.new(em.outputs[0], mix.inputs[2]); lk.new(mix.outputs[0], out.inputs[0])
    else:
        lk.new(em.outputs[0], out.inputs[0])
    m["emission"] = em.name
    return m


PAL = {"floor": "#B9824F", "floorDark": "#9C6A3F", "wall": "#E2B98A", "wallLow": "#3F6E72", "trim": "#F2DDB8",
       "wood": "#C98C55", "darkwood": "#7A4A2E", "teal": "#3E8A8C", "tealDark": "#2C5F66", "cream": "#F1E3C4",
       "brass": "#E0B260", "ink": "#1D2B33", "steel": "#9FB6B8", "leaf": "#6F9B5A", "pot": "#C7704A",
       "cup": "#F6EEDC", "pastry": "#E3A65A", "berry": "#B4505A", "board": "#263238"}
M = {k: material(k, v) for k, v in PAL.items()}
M["sky"] = glow("Golden hour sky", "#FFC27A", 3.2)
M["street"] = glow("Warm street beyond door", "#FFC27A", 1.5)
M["bulb"] = glow("Pendant bulb", "#FFE2A8", 9)
M["shaft"] = glow("Light shaft", "#FFC98A", 1.4, alpha=.07)
M["chalk"] = glow("Chalk scribble", "#E9E4D6", .6)
WIRE_CAFE = glow("Cafe wire", "#58E6F0", 4.5)
WIRE_GHOST = glow("Ghost wire", "#C59BFF", 4.0)
GHOST_FILL = glow("Ghost fill", "#9A7BDB", 1.0, alpha=.07)
SMOKE = glow("Green smoke voxel", "#38E85A", 1.7)
SPARK = glow("Wand spark", "#B9FF9A", 9)
DUSTM = glow("Dust mote", "#FFD995", 6)

cafe, ghost, ghost_detail = [], [], []  # objects that belong to each room


def add(o, group):
    group.append(o); return o


def cube(n, loc, size, m, group=None, bevel=0.0, rot=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.name = n
    o.dimensions = size; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.rotation_euler.z = rot; o.data.materials.append(M[m] if isinstance(m, str) else m)
    if bevel:
        mod = o.modifiers.new("Bevel", "BEVEL"); mod.width = bevel; mod.segments = 1
    if group is not None: group.append(o)
    return o


def cyl(n, loc, r, h, m, group=None, verts=16, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc)
    o = bpy.context.object; o.name = n; o.data.materials.append(M[m] if isinstance(m, str) else m)
    if group is not None: group.append(o)
    return o


def empty(n, loc):
    o = bpy.data.objects.new(n, None); bpy.context.collection.objects.link(o); o.location = loc; return o


def aim(o, p): o.rotation_euler = (Vector(p) - o.location).to_track_quat("-Z", "Y").to_euler()


def smooth(x): x = max(0., min(1., x)); return x * x * (3 - 2 * x)


def lerp(a, b, p): return tuple(x + (y - x) * p for x, y in zip(a, b))


# ---------------------------------------------------------------- the room
X0, X1, YB, YF = -3.6, 3.6, 4.0, -4.5  # walls: left, right, back; floor runs to front
WIN = (-0.7, 2.3, 1.05, 2.0)  # window centre x, width, sill z, height
DOOR = (0.25, 1.05, 2.2)       # door centre y on the left wall, width, height
MARK = (-0.8, -0.8)            # where Miko stops (loop seam)
WITCH = (0.55, -0.62)


def shell(group, wall_mat, low_mat, floor_mat, floor_alt, name):
    for i in range(24):
        cube(f"{name} floor plank", (X0 + .15 + i * .3, (YB + YF) / 2, -.06), (.29, YB - YF, .12),
             floor_mat if i % 2 else floor_alt, group)
    wx, ww, wz, wh = WIN
    # back wall in pieces around the window opening
    cube(f"{name} back wall left", ((X0 + wx - ww / 2) / 2, YB + .08, 2.0), (wx - ww / 2 - X0, .16, 4.0), wall_mat, group)
    cube(f"{name} back wall right", ((wx + ww / 2 + X1) / 2, YB + .08, 2.0), (X1 - wx - ww / 2, .16, 4.0), wall_mat, group)
    cube(f"{name} back wall under window", (wx, YB + .08, wz / 2), (ww, .16, wz), low_mat, group)
    cube(f"{name} back wall over window", (wx, YB + .08, (wz + wh + 4.0) / 2), (ww, .16, 4.0 - wz - wh), wall_mat, group)
    cube(f"{name} wainscot", (0, YB - .02, .45), (X1 - X0, .05, .9), low_mat, group)
    # left wall with the door opening
    dy, dw, dh = DOOR
    cube(f"{name} left wall front", (X0 - .08, (YF + dy - dw / 2) / 2, 2.0), (.16, dy - dw / 2 - YF, 4.0), wall_mat, group)
    cube(f"{name} left wall back", (X0 - .08, (dy + dw / 2 + YB) / 2, 2.0), (.16, YB - dy - dw / 2, 4.0), wall_mat, group)
    cube(f"{name} left wall over door", (X0 - .08, dy, (dh + 4.0) / 2), (.16, dw, 4.0 - dh), wall_mat, group)
    cube(f"{name} right wall", (X1 + .08, (YB + YF) / 2, 2.0), (.16, YB - YF, 4.0), wall_mat, group)
    cube(f"{name} left wainscot front", (X0 + .02, (YF + dy - dw / 2) / 2, .45), (.05, dy - dw / 2 - YF, .9), low_mat, group)
    cube(f"{name} left wainscot back", (X0 + .02, (dy + dw / 2 + YB) / 2, .45), (.05, YB - dy - dw / 2, .9), low_mat, group)
    cube(f"{name} right wainscot", (X1 - .02, (YB + YF) / 2, .45), (.05, YB - YF, .9), low_mat, group)
    # window frame and mullions (shared layout slot)
    for z in (wz, wz + wh):
        cube(f"{name} window rail", (wx, YB - .02, z), (ww + .12, .14, .08), "trim" if name == "Cafe" else "darkwood", group)
    for k in range(4):
        cube(f"{name} window mullion", (wx - ww / 2 + k * ww / 3, YB - .02, wz + wh / 2), (.07, .12, wh), "trim" if name == "Cafe" else "darkwood", group)
    cube(f"{name} window transom", (wx, YB - .02, wz + wh * .62), (ww, .1, .05), "trim" if name == "Cafe" else "darkwood", group)
    # door frame (shared layout slot)
    for y in (dy - dw / 2, dy + dw / 2):
        cube(f"{name} door jamb", (X0 + .02, y, dh / 2), (.12, .08, dh), "darkwood", group)
    cube(f"{name} door head", (X0 + .02, dy, dh), (.12, dw + .16, .1), "darkwood", group)


shell(cafe, "wall", "tealDark", "floor", "floorDark", "Cafe")
cube("Cafe ceiling", (0, (YB + YF) / 2, 3.75), (X1 - X0 + .4, YB - YF, .1), "darkwood", cafe)
for k in range(6): cube("Ceiling beam", (0, YB - .4 - k * 1.45, 3.62), (X1 - X0 + .3, .2, .2), "wood", cafe)
sky = cube("Golden sky beyond window", (WIN[0], YB + .5, WIN[2] + WIN[3] / 2), (WIN[1] + .6, .05, WIN[3] + .4), "sky", cafe)
for k in range(5):  # distant rooftops silhouetted in the window
    cube("Distant rooftop", (WIN[0] - 1.1 + k * .55, YB + .42, WIN[2] + .18 + (k % 3) * .12), (.5, .04, .36 + (k % 3) * .24), "tealDark", cafe)
street = cube("Golden street beyond door", (X0 - .6, DOOR[0], 1.3), (.05, 2.2, 2.6), "street", cafe)
hinge = empty("Door hinge", (X0 + .02, DOOR[0] + DOOR[1] / 2 - .02, 0))
door = cube("Cafe door", (0, -DOOR[1] / 2 + .02, DOOR[2] / 2), (.06, DOOR[1] - .06, DOOR[2] - .06), "teal", cafe, bevel=.01)
door.parent = hinge
knob = cyl("Door knob", (.05, -DOOR[1] + .2, 1.05), .04, .06, "brass", cafe, 8); knob.rotation_euler.y = math.pi / 2; knob.parent = hinge
dwin = cube("Door glass", (0, -DOOR[1] / 2 + .02, 1.6), (.08, .5, .6), "street", cafe); dwin.parent = hinge

# --- layout slot A: counter (cafe) / kitchen dresser (ghost)
cube("Cafe counter body", (2.45, 3.25, .55), (2.1, .8, 1.1), "teal", cafe, .02)
cube("Cafe counter top", (2.45, 3.2, 1.13), (2.25, .95, .07), "wood", cafe, .01)
cube("Espresso machine", (2.0, 3.35, 1.42), (.7, .5, .52), "steel", cafe, .02)
cube("Espresso group head", (2.0, 3.06, 1.33), (.42, .12, .1), "ink", cafe)
for k in range(3): cyl("Stacked cup", (2.75 + k * .17, 3.15, 1.21), .065, .1, "cup", cafe, 10)
cyl("Pastry dome", (3.15, 3.1, 1.32), .26, .3, "steel", cafe, 12, .12)
for k in range(3): cyl("Croissant", (3.08 + k * .07, 3.1, 1.2), .07, .05, "pastry", cafe, 8)
cube("Menu board", (2.45, YB - .04, 2.55), (1.7, .06, .95), "board", cafe, .01)
for k in range(5): cube("Chalk menu line", (2.25 + (k % 2) * .1, YB - .08, 2.85 - k * .14), (1.0 - (k % 3) * .2, .02, .035), "chalk", cafe)
# --- layout slot B/C: two round tables with chairs
TABLES = [(-2.25, 1.75), (1.35, 1.05)]
for tx, ty in TABLES:
    cyl("Cafe table top", (tx, ty, .76), .55, .05, "wood", cafe, 16)
    cyl("Cafe table post", (tx, ty, .38), .05, .72, "ink", cafe, 8)
    cyl("Cafe table foot", (tx, ty, .03), .28, .05, "ink", cafe, 12)
    cyl("Coffee cup", (tx + .15, ty - .1, .83), .06, .1, "cup", cafe, 10)
    for side in (-1, 1):
        cx = tx + side * .82
        cube("Chair seat", (cx, ty, .46), (.45, .45, .06), "teal", cafe, .01)
        cube("Chair back", (cx + side * .2, ty, .78), (.06, .45, .6), "teal", cafe, .01)
        for dx in (-.18, .18):
            for dy in (-.18, .18): cube("Chair leg", (cx + dx, ty + dy, .22), (.05, .05, .44), "ink", cafe)
    # --- layout slot D/E: pendant lamps
    cyl("Pendant cord", (tx, ty, 3.25), .01, 1.5, "ink", cafe, 6)
    cyl("Pendant shade", (tx, ty, 2.45), .32, .26, "brass", cafe, 12, .1)
    cyl("Pendant bulb", (tx, ty, 2.3), .1, .08, "bulb", cafe, 10)
# --- layout slot F: plant (cafe) / coat stand (ghost)
cyl("Plant pot", (-3.05, 3.4, .3), .3, .6, "pot", cafe, 12, .24)
for k in range(9):
    a = k * 2.3
    o = cube("Plant leaf", (-3.05 + math.cos(a) * .3, 3.4 + math.sin(a) * .25, .95 + k * .12), (.42, .14, .06), "leaf", cafe)
    o.rotation_euler = (0, .5, a)
# --- layout slot G: wall shelf with cups (cafe) / picture frames (ghost)
cube("Cafe wall shelf", (-2.5, YB - .14, 2.3), (1.5, .28, .06), "wood", cafe)
for k in range(5): cyl("Shelf cup", (-3.05 + k * .28, YB - .14, 2.39), .07, .12, ["cup", "teal", "cup", "pot", "cup"][k], cafe, 10)

# lights (cafe)
sun = bpy.data.lights.new("Golden hour sun", "SUN"); sun.energy = 3.4; sun.color = rgb("#FFB46B"); sun.angle = .05
sun_o = bpy.data.objects.new("LGT_Sun", sun); bpy.context.collection.objects.link(sun_o); sun_o.rotation_euler = (math.radians(-62), 0, math.radians(195))


def area(n, loc, target, power, color, size):
    d = bpy.data.lights.new(n, "AREA"); d.energy = power; d.color = rgb(color); d.shape = "DISK"; d.size = size
    o = bpy.data.objects.new(n, d); bpy.context.collection.objects.link(o); o.location = loc; aim(o, target); return o


cafe_lights = [sun_o,
               area("LGT_Window_Bounce", (WIN[0], YB - .4, 2.0), (0, -1, .8), 700, "#FFB36E", 2.4),
               area("LGT_Cool_Fill", (0, -6, 3.0), (0, 0, 1), 380, "#7FB6C8", 6),
               area("LGT_Teal_Shadow_Side", (3.2, -1, 2.5), (-1, 1, .5), 160, "#5BA4A8", 3)]
for tx, ty in TABLES:
    p = bpy.data.lights.new("Pendant", "POINT"); p.energy = 90; p.color = rgb("#FFC98A"); p.shadow_soft_size = .3
    o = bpy.data.objects.new("LGT_Pendant", p); bpy.context.collection.objects.link(o); o.location = (tx, ty, 2.2); cafe_lights.append(o)
# fake light shafts from the window toward the floor
for k in range(3):
    o = cube("Light shaft", (WIN[0] - .6 + k * .6, 2.2, 1.55), (.35, 4.0, .02), "shaft", cafe)
    o.rotation_euler = (math.radians(-28), 0, math.radians(8 - k * 6))

# ---------------------------------------------------------------- the forgotten room (same layout slots)
GM = GHOST_FILL
ghost_shell = []
shell(ghost_shell, GM, GM, GM, GM, "Ghost")
ghost += ghost_shell
# slot A: tall kitchen dresser with plates where the counter is
add(cube("Ghost dresser base", (2.45, 3.25, .55), (2.1, .8, 1.1), GM), ghost)
add(cube("Ghost dresser top", (2.45, 3.45, 2.0), (2.0, .4, 1.6), GM), ghost)
for k in range(4): add(cyl("Ghost plate", (1.75 + k * .45, 3.3, 2.15), .17, .03, GM, None, 12), ghost_detail)
add(cube("Ghost old radio", (2.0, 3.25, 1.35), (.6, .4, .45), GM), ghost_detail)
# slots B/C: dining table with cloth, armchair
add(cyl("Ghost dining table", TABLES[0] + (.76,), .55, .05, GM, None, 16), ghost)
add(cyl("Ghost tablecloth", TABLES[0] + (.55,), .62, .42, GM, None, 16, .58), ghost_detail)
add(cyl("Ghost vase", (TABLES[0][0], TABLES[0][1], .95), .08, .3, GM, None, 8, .04), ghost_detail)
for side in (-1, 1):
    add(cube("Ghost dining chair", (TABLES[0][0] + side * .82, TABLES[0][1], .5), (.45, .45, .1), GM), ghost)
    add(cube("Ghost dining chair back", (TABLES[0][0] + side * 1.02, TABLES[0][1], .85), (.06, .45, .8), GM), ghost)
tx, ty = TABLES[1]
add(cube("Ghost armchair seat", (tx, ty, .45), (1.0, .9, .4), GM), ghost)
add(cube("Ghost armchair back", (tx, ty + .4, .95), (1.0, .2, .9), GM), ghost)
for side in (-1, 1): add(cube("Ghost armchair arm", (tx + side * .5, ty, .7), (.18, .9, .45), GM), ghost)
add(cube("Ghost knitted throw", (tx - .1, ty + .1, .69), (.6, .5, .06), GM), ghost_detail)
for tx, ty in TABLES:
    add(cyl("Ghost fringe lampshade", (tx, ty, 2.45), .38, .34, GM, None, 12, .2), ghost)
    add(cyl("Ghost lamp cord", (tx, ty, 3.25), .01, 1.5, GM, None, 6), ghost)
# slot F: coat stand / grandfather clock where the plant is
add(cube("Ghost grandfather clock", (-3.05, 3.4, 1.1), (.5, .4, 2.2), GM), ghost)
add(cyl("Ghost clock face", (-3.05, 3.18, 1.85), .17, .03, GM, None, 12), ghost_detail)
# slot G: picture frames where the cafe shelf is
for k in range(3): add(cube("Ghost picture frame", (-3.0 + k * .5, YB - .06, 2.35 + (k % 2) * .15), (.36, .04, .44), GM), ghost_detail)
add(cube("Ghost curtain left", (WIN[0] - WIN[1] / 2 + .2, YB - .15, WIN[2] + WIN[3] / 2 + .1), (.45, .06, WIN[3] + .4), GM), ghost_detail)
add(cube("Ghost curtain right", (WIN[0] + WIN[1] / 2 - .2, YB - .15, WIN[2] + WIN[3] / 2 + .1), (.45, .06, WIN[3] + .4), GM), ghost_detail)
add(cube("Ghost rug", (0, .6, .02), (3.2, 2.4, .02), GM), ghost_detail)


def wire_copy(o, mat, name):
    c = o.copy(); c.data = o.data.copy(); c.name = name + " " + o.name; bpy.context.collection.objects.link(c)
    for m in list(c.modifiers): c.modifiers.remove(m)
    c.data.materials.clear(); c.data.materials.append(mat)
    w = c.modifiers.new("Wire", "WIREFRAME"); w.thickness = .022; w.use_replace = True; w.use_even_offset = True
    return c


skip_wire = {"Golden sky beyond window", "Golden street beyond door", "Light shaft", "Chalk menu line", "Distant rooftop"}
cafe_wire = [(o, wire_copy(o, WIRE_CAFE, "WIRE")) for o in cafe if o.name.split(".")[0] not in skip_wire]
ghost_wire = [(o, wire_copy(o, WIRE_GHOST, "GWIRE")) for o in ghost + ghost_detail]

# ---------------------------------------------------------------- atmosphere
world = bpy.data.worlds.new("Dusk ambient"); S.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (*rgb("#1A2C3A"), 1); bg.inputs[1].default_value = .35
nt = bpy.data.node_groups.new("Glow", "CompositorNodeTree"); S.compositing_node_group = nt
nt.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
rl = nt.nodes.new("CompositorNodeRLayers"); gl = nt.nodes.new("CompositorNodeGlare")
gl.inputs["Type"].default_value = "Fog Glow"; gl.inputs["Threshold"].default_value = 1.2
gl.inputs["Strength"].default_value = .22; gl.inputs["Size"].default_value = .45
go = nt.nodes.new("NodeGroupOutput"); nt.links.new(rl.outputs["Image"], gl.inputs["Image"]); nt.links.new(gl.outputs["Image"], go.inputs[0])

dust = []
for j in range(46):
    p = Vector((-2.6 + ((j * 17) % 41) / 41 * 4.6, -1.8 + ((j * 11) % 37) / 37 * 5.2, .3 + ((j * 7) % 29) / 29 * 2.6))
    o = cube("Dust mote", p, (.022, .022, .022), DUSTM); dust.append((o, p, j))
smoke = []
for j in range(54):
    a = j * 2.399; e = ((j * 37) % 100) / 100
    d = Vector((math.cos(a) * (.4 + .6 * e), math.sin(a) * .35 - .15, .1 + ((j * 13) % 23) / 23 * 1.9))
    o = cube("Green smoke voxel", (WITCH[0], WITCH[1], 0), (1, 1, 1), SMOKE); o.scale = (.001,) * 3; smoke.append((o, d, j))
sparks = []
for j in range(26):
    o = cube("Wand spark", (0, 0, 0), (1, 1, 1), SPARK); o.scale = (.001,) * 3; sparks.append((o, j))

# ---------------------------------------------------------------- camera and characters
cd = bpy.data.cameras.new("CAM"); cd.sensor_fit = "VERTICAL"; cd.sensor_height = 32; cd.clip_start = .05; cd.clip_end = 80
cam = bpy.data.objects.new("CAM", cd); bpy.context.collection.objects.link(cam); S.camera = cam
actors = {}
K = {"miko": 1.8 / 475, "witch": 2.0 / 480}  # world units per source pixel (common across each cast member's GIFs)


def actor(name, who, pos, mirror=False):
    meta = json.loads((ROOT / f"{ART}/{name}-atlas.json").read_text())
    im = bpy.data.images.load(str(ROOT / f"{ART}/{name}-atlas.png"), check_existing=True)
    m = bpy.data.materials.new(name + " pixels"); m.use_nodes = True; m.surface_render_method = "DITHERED"
    ns = m.node_tree.nodes; ns.clear(); lk = m.node_tree.links
    tex = ns.new("ShaderNodeTexImage"); tex.image = im; tex.interpolation = "Closest"; tex.extension = "CLIP"
    uv = ns.new("ShaderNodeTexCoord"); mp = ns.new("ShaderNodeMapping"); lk.new(uv.outputs["UV"], mp.inputs["Vector"]); lk.new(mp.outputs[0], tex.inputs[0])
    em = ns.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = .98; lk.new(tex.outputs["Color"], em.inputs["Color"])
    al = ns.new("ShaderNodeMath"); al.operation = "GREATER_THAN"; al.inputs[1].default_value = .5; lk.new(tex.outputs["Alpha"], al.inputs[0])
    tr = ns.new("ShaderNodeBsdfTransparent"); mix = ns.new("ShaderNodeMixShader"); lk.new(al.outputs[0], mix.inputs[0])
    lk.new(tr.outputs[0], mix.inputs[1]); lk.new(em.outputs[0], mix.inputs[2]); out = ns.new("ShaderNodeOutputMaterial"); lk.new(mix.outputs[0], out.inputs[0])
    c = meta["crop"]; mp.inputs["Scale"].default_value = (c["width"] / meta["width"], c["height"] / meta["height"], 1)
    h = c["height"] * K[who]; w = c["width"] * K[who]
    me = bpy.data.meshes.new(name + " quad"); me.from_pydata([(-w / 2, 0, 0), (w / 2, 0, 0), (w / 2, 0, h), (-w / 2, 0, h)], [], [(0, 1, 2, 3)]); me.uv_layers.new()
    for i, v in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): me.uv_layers.active.data[i].uv = v
    me.materials.append(m); o = bpy.data.objects.new("CHR_" + name, me); bpy.context.collection.objects.link(o)
    o.location = (*pos, 0); o.scale.x = -1 if mirror else 1
    actors[name] = {"o": o, "meta": meta, "map": mp, "h": h, "w": w, "who": who, "mirror": mirror}


for n in ["miko-freeze", "miko-walk", "miko-really"]: actor(n, "miko", MARK)
for n in ["witch-tease", "witch-cast"]: actor(n, "witch", WITCH, mirror=True)


def place(name, index, pos):
    a = actors[name]; o = a["o"]; meta = a["meta"]; c = meta["crop"]; index = max(0, min(meta["frameCount"] - 1, int(index)))
    col = index % meta["columns"]; row = index // meta["columns"]
    a["map"].inputs["Location"].default_value = ((col * meta["cellWidth"] + c["x"]) / meta["width"],
                                                 1 - (row * meta["cellHeight"] + c["y"] + c["height"]) / meta["height"], 0)
    a["map"].inputs["Location"].keyframe_insert("default_value")
    pad = c["y"] + c["height"] - 1 - meta["cells"][index]["bottom"]  # planted soles
    o.location = (pos[0], pos[1], -pad * K[a["who"]] + .005)
    o.rotation_euler.z = math.atan2(cam.location.x - o.location.x, -(cam.location.y - o.location.y))
    o.keyframe_insert("location"); o.keyframe_insert("rotation_euler")


def wand_tip(name, index):
    """World position of the wand tip for the cast pose (measured in the source cell)."""
    a = actors[name]; c = a["meta"]["crop"]; u, v = 476, 210  # tip pixel in frames 7-11 of witch-cast
    x = ((u - c["x"]) / c["width"] - .5) * a["w"] * (-1 if a["mirror"] else 1)
    z = (c["y"] + c["height"] - v) * K[a["who"]]
    o = a["o"]; yaw = o.rotation_euler.z
    return Vector((o.location.x + x * math.cos(yaw), o.location.y + x * math.sin(yaw), z))


def cues(t, start, schedule, hold=None):
    """schedule: list of (time offset, frame). Returns the last frame whose cue has passed."""
    e = t - start; f = schedule[0][1]
    for at, fr in schedule:
        if e >= at: f = fr
    return f


def vis(o, yes):
    o.hide_render = not yes; o.hide_viewport = not yes
    o.keyframe_insert("hide_render"); o.keyframe_insert("hide_viewport")


CAMS = {
    "freeze": ((-.35, -4.55, 1.55), (-.7, .4, 1.15), 38),
    "reveal": ((-.05, -5.2, 1.6), (-.1, .5, 1.12), 33),
    "really": ((-.72, -3.35, 1.5), (-.8, -.8, 1.28), 38),
    "no": ((.62, -3.35, 1.62), (.55, -.62, 1.4), 38),
    "layout": ((.1, -6.3, 3.1), (0, 1.4, .95), 25),
    "equation": ((-2.6, -5.0, 1.35), (.6, 1.6, 1.25), 27),
    "walkin": ((1.6, -4.7, 1.6), (-1.7, .1, 1.1), 30),
}
WALK_FROM = (X0 + .35, DOOR[0])
state = {}
audit = []
for f in range(1, N + 1):
    S.frame_set(f); t = (f - 1) / FPS
    s = next((s for s in SHOTS if s["start"] <= t + 1e-6 < s["start"] + s["duration"]), SHOTS[-1]); sid = s["id"]; local = t - s["start"]
    pos, tgt, lens = CAMS[sid]
    show = {}
    # ---- characters
    if sid == "freeze":
        # source frames: 0-2 last step and stop, 3-5 freeze wide-eyed, 6 blink, 7-11 glance around
        fr = cues(t, 0, [(0, 0), (.1, 1), (.2, 2), (.3, 3), (.4, 4), (.5, 5), (1.35, 6), (1.45, 5),
                         (EV["offscreen"] - .02, 7), (EV["offscreen"] + .1, 8), (EV["offscreen"] + .2, 9), (EV["offscreen"] + .3, 10), (EV["offscreen"] + .42, 11)])
        show["miko-freeze"] = (fr, MARK)
        push = .4 * smooth(local / s["duration"]); pos = (pos[0], pos[1] + push, pos[2])
    elif sid == "reveal":
        show["miko-freeze"] = (11, MARK)
        if t >= EV["smoke"] + .12:
            show["witch-tease"] = (cues(t, EV["smoke"] + .12, [(k * .1, k) for k in range(7)]), WITCH)
        pos = (pos[0], pos[1] + .12 * smooth(local / .9), pos[2])
    elif sid == "really":
        show["miko-really"] = (cues(t, EV["really"] - .05, [(0, 2), (.06, 3), (.14, 4), (.24, 5), (.34, 6), (.44, 7)]), MARK)
        pos = (pos[0], pos[1] + .18 * smooth(local / .4), pos[2])
    elif sid == "no":
        show["witch-tease"] = (cues(t, EV["no"] - .03, [(0, 7), (.06, 8), (.14, 9), (.24, 10), (.42, 11)]), WITCH)
        show["miko-really"] = (7, MARK)
    elif sid == "layout":
        show["miko-really"] = (cues(t, s["start"], [(0, 9), (.1, 10), (.2, 11)]), MARK)
        show["witch-cast"] = (cues(t, EV["cast"], [(0, 0), (.06, 1), (.12, 2), (.18, 3), (.24, 4), (.29, 5), (.34, 6), (.39, 7), (.6, 8), (.8, 9)]), WITCH)
        q = smooth(local / s["duration"]); pos = lerp((.1, -5.4, 2.5), pos, q); tgt = lerp((0, .8, 1.05), tgt, q)
    elif sid == "equation":
        show["miko-freeze"] = (cues(t, EV["dejavu"], [(0, 5), (.3, 6), (.4, 5)]), MARK)
        show["witch-cast"] = (9, WITCH)
        q = smooth(local / s["duration"]); pos = lerp(pos, (-2.1, -4.4, 1.45), q)
    elif sid == "walkin":
        p = min(1, (t - s["start"]) / (CFG["duration"] - s["start"]))
        wp = lerp(WALK_FROM, MARK, p)
        show["miko-walk"] = (int((t - s["start"]) * 10 + 7) % 12, wp)  # phase chosen so the last frame is mid-stride, matching frame 0
        tgt = (lerp((-2.4, .1, 1.1), (-.9, -.3, 1.15), smooth(p)))
    cam.location = pos; cd.lens = lens; aim(cam, tgt)
    cam.keyframe_insert("location"); cam.keyframe_insert("rotation_euler"); cd.keyframe_insert("lens")
    for name in actors:
        on = name in show
        if state.get(name) != on or f == 1: vis(actors[name]["o"], on); state[name] = on
        if on: place(name, *show[name])
    # ---- the room state: cafe solid / wire sweep / ghost overlay / restore
    wire_on = lambda o: EV["wire"] + (o.location.x - X0) / (X1 - X0) * .55  # sweep left to right
    restore = lambda o: EV["dejavu"] + (X1 - o.location.x) / (X1 - X0) * .45  # sweep back right to left
    for solid, wire in cafe_wire:
        loc = solid.matrix_world.translation if solid.parent else solid.location
        sweep = type("P", (), {"location": loc})()
        wired = wire_on(sweep) <= t < restore(sweep) and sid in ("layout", "equation")
        for o, yes in ((solid, not wired), (wire, wired)):
            if state.get(o.name) != yes or f == 1: vis(o, yes); state[o.name] = yes
    for o in [sky, street] + [x for x in cafe if x.name.startswith(("Light shaft", "Chalk menu line", "Distant rooftop"))]:
        yes = not (sid in ("layout", "equation") and EV["wire"] + .3 <= t < EV["dejavu"] + .3)
        if state.get(o.name) != yes or f == 1: vis(o, yes); state[o.name] = yes
    for L in cafe_lights:
        on = not (sid in ("layout", "equation") and EV["wire"] + .2 <= t < EV["dejavu"] + .2)
        if state.get(L.name) != on or f == 1:
            L.hide_render = not on; L.keyframe_insert("hide_render"); state[L.name] = on
    for i, (src, gw) in enumerate(ghost_wire):
        appear = EV["room"] + (i % 11) * .03
        gone = EV["dejavu"] + (i % 7) * .05
        if src in ghost_detail:  # the memory itself: flickers out on "no memory"
            k = (i * 7) % 5
            gone = min(gone, EV["noMemory"] + .08 + k * .07)
            flick = EV["noMemory"] <= t < gone and int(t * 30 + i) % 3 == 0
        else:
            flick = False
        yes = sid in ("layout", "equation") and appear <= t < gone and not flick
        # the forgotten room's floor is wire only, so its fill never hides the cafe floor lines
        for o, on in ((src, yes and "floor plank" not in src.name), (gw, yes)):
            if state.get(o.name) != on or f == 1: vis(o, on); state[o.name] = on
    # wire colour: cyan/lilac, then both gold where the layout matches ("Familiar")
    gold = smooth((t - EV["familiar"]) / .25) * (1 - smooth((t - EV["dejavu"]) / .3))
    for mat, base in ((WIRE_CAFE, "#58E6F0"), (WIRE_GHOST, "#C59BFF")):
        em = mat.node_tree.nodes[mat["emission"]]
        em.inputs["Color"].default_value = (*lerp(rgb(base), rgb("#FFC24A"), gold), 1)
        em.inputs["Strength"].default_value = 4.5 + 2.5 * gold * (1 + .25 * math.sin(t * 9))
        em.inputs["Color"].keyframe_insert("default_value"); em.inputs["Strength"].keyframe_insert("default_value")
    fill = GHOST_FILL.node_tree.nodes[GHOST_FILL["emission"]]
    fill.inputs["Strength"].default_value = 1.2 * (1 - .7 * smooth((t - EV["noMemory"]) / .5)); fill.inputs["Strength"].keyframe_insert("default_value")
    bg.inputs[1].default_value = .35 if not (sid in ("layout", "equation") and EV["wire"] <= t < EV["dejavu"] + .3) else .08
    bg.inputs[1].keyframe_insert("default_value")
    # ---- door swings open as Miko walks back in
    hinge.rotation_euler.z = -1.35 * smooth((t - SHOTS[-1]["start"] + .25) / .45) if sid == "walkin" else 0
    hinge.keyframe_insert("rotation_euler")
    # ---- voxel smoke burst that reveals the witch
    for o, d, j in smoke:
        e = (t - EV["smoke"]) / .95
        if 0 <= e < 1 and sid in ("freeze", "reveal"):
            r = smooth(min(1, e * 2.2)); fade = 1 - smooth((e - .25) / .75)
            o.location = (WITCH[0] + d.x * (.25 + r), WITCH[1] + d.y * (.3 + r) - .15, d.z * (.55 + .5 * r) + .35 * e)
            sz = (.09 + .1 * ((j * 7) % 5) / 4) * fade * (.6 + .6 * r); o.scale = (sz, sz, sz)
        else:
            o.scale = (.001,) * 3
        o.keyframe_insert("location"); o.keyframe_insert("scale")
    # ---- wand sparks streaming from the tip into the room
    tip = wand_tip("witch-cast", 7)
    for o, j in sparks:
        e = (t - EV["cast"] - .34 - j * .018) / .7
        if 0 <= e < 1 and sid == "layout":
            a = j * 2.1
            o.location = tip + Vector((-2.6 * e + .25 * math.cos(a) * e, 1.6 * e + .3 * math.sin(a) * e, .5 * math.sin(e * math.pi) + .15 * math.sin(a)))
            sz = .045 * (1 - e) + .01; o.scale = (sz, sz, sz)
        else:
            o.scale = (.001,) * 3
        o.keyframe_insert("location"); o.keyframe_insert("scale")
    # ---- drifting dust (periodic over the whole video so the loop is seamless)
    ph = t / CFG["duration"] * math.tau
    for o, p, j in dust:
        o.location = p + Vector((.06 * math.sin(ph * 2 + j), .03 * math.cos(ph * 3 + j), .08 * math.sin(ph + j * .7)))
        o.keyframe_insert("location")
    if f == 1 or any(abs(t - x["start"]) < .5 / FPS for x in SHOTS) or f == N:
        audit.append({"frame": f - 1, "time": round(t, 3), "shot": sid, "camera": list(pos), "target": list(tgt), "lens": lens,
                      "actors": {k: v[0] for k, v in show.items()}})


def constant(idblock):
    ad = idblock.animation_data
    if not (ad and ad.action): return
    for layer in ad.action.layers:
        for strip in layer.strips:
            if not hasattr(strip, "channelbags"): continue
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points: key.interpolation = "CONSTANT"


for ob in list(bpy.data.objects) + list(bpy.data.cameras) + list(bpy.data.lights): constant(ob)
for m in bpy.data.materials:
    if m.node_tree: constant(m.node_tree)
constant(world.node_tree)
for im in bpy.data.images:
    if im.source == "FILE": im.pack()
S.frame_set(1); bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f"deja-vu-{args.revision}.blend"))
(OUT / f"staging-audit-{args.revision}.json").write_text(json.dumps({
    "resolution": [S.render.resolution_x, S.render.resolution_y], "samples": S.eevee.taa_render_samples, "frames": N,
    "cafeObjects": len(cafe), "ghostLayout": len(ghost), "ghostDetail": len(ghost_detail),
    "layoutSlots": ["window", "door", "counter/dresser", "table/dining table", "table/armchair", "pendants/fringe shades", "plant/clock", "shelf/picture frames"],
    "contact": "Opaque soles anchored per frame; common pixel scale per cast member; upright yaw-only planes.",
    "shots": audit}, indent=2) + "\n")
if args.stills:
    times = list(map(float, args.still_times.split(","))) if args.still_times else [0, 1.0, 2.5, 3.2, 3.6, 4.2, 4.8, 5.3, 5.8, 6.4, 7.2, 8.0, 9.0, 9.6, 10.2, 11.0, 11.96]
    for t in times:
        S.frame_set(min(N, round(t * FPS) + 1)); S.render.filepath = str(ST / f"{t:06.2f}.png"); bpy.ops.render.render(write_still=True)
if args.render:
    a, b = (map(int, args.range.split(":")) if args.range else (0, N - 1)); t0 = time.monotonic()
    for fr in range(a, b + 1):
        file = FR / f"{fr:05d}.png"
        if file.exists(): continue
        S.frame_set(fr + 1); S.render.filepath = str(file); bpy.ops.render.render(write_still=True)
    (OUT / f"render-time-{args.revision}-{a}-{b}.json").write_text(json.dumps({"start": a, "end": b, "seconds": time.monotonic() - t0,
                                                                            "samples": S.eevee.taa_render_samples}, indent=2) + "\n")
