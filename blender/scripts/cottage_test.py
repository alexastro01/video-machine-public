"""Build a packed, frame-driven cottage scene for the England 1500 test.

Run with Blender's Python, not system Python. No network or credentials used.
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument("--config", default="blender/survive-1500/cottage-test-v1.json")
parser.add_argument("--stills", action="store_true")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
config = json.loads((ROOT / args.config).read_text())
RNG = random.Random(1500)


def rgb(value):
    value = value.lstrip("#")
    values = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v < 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in values)


def material(name, color, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb(color), 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb(color), 1)
    bsdf.inputs["Roughness"].default_value = 0.93
    bsdf.inputs["Specular IOR Level"].default_value = 0.15
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*rgb(color), 1)
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


def cube(name, location, scale, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Small worn edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
    return obj


def beam(name, a, b, width, depth, mat):
    a, b = Vector(a), Vector(b)
    obj = cube(name, (a + b) / 2, (width, depth, (b - a).length), mat, 0.008)
    obj.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    return obj


def cylinder(name, location, radius, depth, mat, vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(name, location, point, energy, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = rgb(color)
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim(obj, point)
    return obj


def patches(name, pieces, materials):
    verts, faces = [], []
    for x, y, z, w, h, angle in pieces:
        c, s, n = math.cos(angle), math.sin(angle), len(verts)
        verts.extend((x + u * c - v * s, y + u * s + v * c, z)
                     for u, v in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)])
        faces.append((n, n + 1, n + 2, n + 3))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for mat in materials:
        mesh.materials.append(mat)
    for face in mesh.polygons:
        face.material_index = RNG.randrange(len(materials))
    return obj


def basket(name, x, y, size=0.45):
    cylinder(name + " base", (x, y, size * 0.35), size, size * 0.7, M["wicker"], 14)
    for i in range(14):
        a = i * math.tau / 14
        beam(name + " stave", (x + math.cos(a) * size, y + math.sin(a) * size, 0.05),
             (x + math.cos(a) * size * 1.07, y + math.sin(a) * size * 1.07, size * 0.82), 0.035, 0.035, M["wood_light"])
    for z in [0.08, 0.2, 0.32]:
        bpy.ops.mesh.primitive_torus_add(major_segments=14, minor_segments=4, location=(x, y, z),
                                       major_radius=size, minor_radius=0.026)
        bpy.context.object.data.materials.append(M["wood_dark"])


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = config["render"]["samples"]
scene.eevee.use_raytracing = False
scene.eevee.use_fast_gi = False
scene.eevee.fast_gi_quality = 0.5
scene.eevee.fast_gi_ray_count = 2
scene.eevee.shadow_ray_count = 4
scene.eevee.shadow_resolution_scale = 1
scene.eevee.volumetric_samples = 32
scene.eevee.volumetric_tile_size = "8"
scene.render.resolution_x = config["render"]["width"]
scene.render.resolution_y = config["render"]["height"]
scene.render.resolution_percentage = 100
scene.render.fps = config["fps"]
scene.frame_start, scene.frame_end = 1, config["frames"]
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.compression = 30
scene.render.film_transparent = False
scene.render.use_motion_blur = False
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.5
world = bpy.data.worlds.new("Dawn blue ambient")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (*rgb("#91b3ce"), 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35

M = {name: material(name, color) for name, color in {
    "wood": "#925d38", "wood_light": "#bb8550", "wood_dark": "#493725",
    "plaster": "#c8c8bb", "plaster_light": "#e0d9c0", "floor": "#b07a48",
    "stone": "#77858a", "stone_dark": "#4e6572", "stone_light": "#a2a795",
    "straw": "#daad53", "straw_light": "#e6c374", "straw_dark": "#a77839",
    "iron": "#273f4a", "linen": "#c1bd9b", "linen_shadow": "#8e9d91",
    "wicker": "#a57542", "pottery": "#af7747", "leaves": "#617664",
    "garden": "#718873", "roof": "#627c86", "sky": "#9fbcc4",
}.items()}

# The setting is geometry, including the window opening, exterior and hearth.
cube("Packed-earth cottage floor", (0, 0, -0.12), (7, 10, 0.24), M["floor"])
floor_pieces = [(RNG.uniform(-3.4, 3.4), RNG.uniform(-4.5, 4.5), 0.006,
                 RNG.uniform(0.02, 0.12), RNG.uniform(0.02, 0.055), 0)
                for _ in range(950)]
patches("Square flecks in the dirt", floor_pieces, [M["straw_dark"], M["wood_light"], M["stone_light"]])
for x, width in [(-3.025, 0.55), (-0.725, 0.45), (2.0, 2.0)]:
    cube("Limewashed rear wall", (x, 2.65, 2.0), (width, 0.22, 4.0), M["plaster"])
cube("Rear wall below window", (-1.85, 2.65, 0.7), (1.8, 0.22, 1.4), M["plaster"])
cube("Rear wall above window", (-1.85, 2.65, 3.65), (1.8, 0.22, 0.7), M["plaster"])
cube("Rear wall over doorway", (0.25, 2.65, 3.55), (1.55, 0.22, 0.9), M["plaster_light"])
for y, length in [(-2.25, 2.5), (2.0, 1.4)]:
    cube("Left wall beside window", (-3.2, y, 2), (0.22, length, 4), M["plaster"])
cube("Window lower wall", (-3.2, 0, 0.62), (0.22, 2.1, 1.24), M["plaster"])
cube("Window upper wall", (-3.2, 0, 3.8), (0.22, 2.1, 0.6), M["plaster"])
cube("Right rear wall", (3.2, 1.7, 2), (0.22, 2.0, 4), M["plaster"])
for x in [-3.15, -1.8, -0.57, 1.05, 3.1]:
    cube("Rear timber post", (x, 2.49, 2), (0.18, 0.23, 4), M["wood_dark"], 0.012)
for z in [0.2, 1.2, 3.15, 4.0]:
    cube("Rear horizontal timber", (0, 2.47, z), (6.35, 0.22, 0.14), M["wood"], 0.01)
for x in [-2.7, 1.8]:
    beam("Diagonal wall brace", (x - 0.65, 2.4, 1.25), (x + 0.65, 2.4, 3.05), 0.12, 0.13, M["wood_dark"])
for y in [-2.5, -0.8, 1.1, 2.55]:
    cube("Cross-room ceiling beam", (0, y, 4), (6.4, 0.17, 0.2), M["wood_dark"], 0.01)
    for side in [-1, 1]:
        beam("Pitched roof rafter", (side * 3.25, y, 4), (0, y, 5.05), 0.14, 0.14, M["wood"])
cube("Ceiling ridge", (0, 0, 5.0), (0.2, 7.0, 0.22), M["wood_dark"])
for x in [-2.5, -1.2, 0.2, 1.6, 2.7]:
    cube("Roof inner board", (x, 0.1, 4.25 + (3 - abs(x)) * 0.27), (0.9, 6.0, 0.08), M["wood" if x < 0 else "wood_dark"])

# Diamond-like window bars cast a real patterned shadow.
for y in [-1.05, 1.05]:
    cube("Window side frame", (-3.05, y, 2.35), (0.26, 0.15, 2.25), M["wood_dark"], 0.01)
for z in [1.25, 2.35, 3.45]:
    cube("Window sill / transom", (-3.05, 0, z), (0.32, 2.25, 0.12), M["wood"], 0.01)
for y in [-0.7, 0, 0.7]:
    cube("Window mullion", (-3.05, y, 2.35), (0.12, 0.055, 2.2), M["iron"])
for y in [-0.7, 0, 0.7]:
    for z in [1.55, 2.15, 2.75]:
        beam("Leaded window diamond", (-3.03, y - 0.31, z), (-3.03, y + 0.31, z + 0.58), 0.025, 0.025, M["iron"])
        beam("Leaded window diamond", (-3.03, y + 0.31, z), (-3.03, y - 0.31, z + 0.58), 0.025, 0.025, M["iron"])
for x in [-2.8, -0.9]:
    cube("Visible rear window frame", (x, 2.45, 2.35), (0.12, 0.24, 2.05), M["wood_dark"], 0.01)
for z in [1.35, 2.35, 3.35]:
    cube("Rear window sill and transom", (-1.85, 2.45, z), (2.05, 0.28, 0.12), M["wood"], 0.01)
for x in [-2.45, -1.85, -1.25]:
    cube("Rear window upright", (x, 2.43, 2.35), (0.045, 0.08, 1.95), M["iron"])
    for z in [1.5, 2.05, 2.6]:
        beam("Rear window diamond", (x - 0.25, 2.42, z), (x + 0.25, 2.42, z + 0.5), 0.023, 0.023, M["iron"])
        beam("Rear window diamond", (x + 0.25, 2.42, z), (x - 0.25, 2.42, z + 0.5), 0.023, 0.023, M["iron"])

# A slightly open wooden door leads into a small modeled village courtyard.
door = bpy.data.objects.new("Door hinge", None)
bpy.context.collection.objects.link(door)
door.location = (-0.48, 2.43, 0)
door.rotation_euler.z = math.radians(-46)
for i in range(6):
    obj = cube("Door oak plank", (0, 0, 0), (0.225, 0.1, 2.75), M["wood_light" if i % 2 else "wood"], 0.008)
    obj.parent = door
    obj.location = (0.12 + i * 0.23, 0, 1.38)
for z in [0.4, 2.1]:
    obj = cube("Door iron strap", (0, 0, 0), (1.15, 0.04, 0.08), M["iron"])
    obj.parent = door
    obj.location = (0.65, -0.075, z)
cube("Stone threshold", (0.25, 2.35, 0.055), (1.75, 0.65, 0.11), M["stone_light"], 0.02)
cube("Village garden", (0, 6.2, -0.09), (11, 9, 0.16), M["garden"])
for x, y in [(-1.7, 6.5), (1.7, 7.3), (-4, 6.0)]:
    cube("Distant village house", (x, y, 1.05), (1.5, 1.3, 2.1), M["plaster_light"])
    for sx in [-0.42, 0.42]:
        roof = cube("Village roof slope", (x + sx, y, 2.3), (1.0, 1.7, 0.15), M["roof"])
        roof.rotation_euler.y = sx * 1.3
    cube("Village house timber", (x, y - 0.67, 1.1), (0.08, 0.05, 2.15), M["wood_dark"])

# Cold hearth: no fire is available before the narration's flint strike.
cube("Hearth dark recess", (2.05, 2.39, 0.82), (1.65, 0.18, 1.55), M["iron"])
cube("Hearth stone base", (2.05, 2.05, 0.1), (2.05, 1.0, 0.2), M["stone"], 0.025)
for x in [1.16, 2.94]:
    for row in range(4):
        cube("Hearth jamb stone", (x, 2.1, 0.23 + row * 0.32), (0.33, 0.55, 0.29), M["stone" if row % 2 else "stone_light"], 0.025)
for i in range(7):
    obj = cube("Hearth arch stone", (1.15 + i * 0.3, 2.1, 1.52 + 0.25 * math.sin(i * math.pi / 6)),
               (0.32, 0.55, 0.3), M["stone" if i % 2 else "stone_light"], 0.018)
cube("Hearth mantel", (2.05, 2.04, 1.94), (2.35, 0.7, 0.15), M["wood_dark"], 0.015)
for i in range(5):
    beam("Unlit hearth logs", (1.65, 1.8 + i * 0.08, 0.22), (2.43, 2.0 + i * 0.04, 0.3), 0.1, 0.1, M["wood_dark"])
cylinder("Iron cooking pot", (2.05, 1.99, 0.62), 0.25, 0.3, M["iron"], 12)
beam("Pot hanging hook", (2.05, 2.0, 0.76), (2.05, 2.0, 1.7), 0.025, 0.025, M["iron"])

# Furniture and foreground props ground the character in the room.
cube("Straw bed frame", (-2.15, 0.25, 0.26), (1.2, 2.2, 0.24), M["wood_dark"], 0.02)
cube("Straw mattress", (-2.15, 0.25, 0.46), (1.16, 2.1, 0.24), M["straw"], 0.04)
for i in range(8):
    cube("Linen blanket folds", (-2.15, -0.55 + i * 0.19, 0.61 + (i % 3) * 0.018), (1.22, 0.2, 0.08), M["linen" if i % 3 else "linen_shadow"], 0.012)
cube("Linen pillow", (-2.15, 1.0, 0.67), (0.85, 0.4, 0.15), M["linen"], 0.06)
for x in [-2.65, -1.65]:
    for y in [-0.65, 1.1]:
        cube("Bed leg", (x, y, 0.2), (0.09, 0.09, 0.4), M["wood"])
for y in [-0.4, -0.12, 0.16]:
    cube("Oak table plank", (1.9, y, 0.82), (1.35, 0.27, 0.12), M["wood_light"], 0.01)
for x in [1.35, 2.45]:
    for y in [-0.38, 0.16]:
        cube("Table leg", (x, y, 0.4), (0.12, 0.12, 0.8), M["wood_dark"], 0.01)
cylinder("Clay mug", (1.9, -0.1, 1.03), 0.1, 0.25, M["pottery"])
cylinder("Clay jug", (2.4, 1.95, 2.2), 0.16, 0.35, M["pottery"])
basket("Bedside basket", -2.45, -1.5, 0.37)
basket("Foreground wood basket", 2.2, -2.1, 0.46)
for i in range(5):
    beam("Basket firewood", (2.0 + i * 0.08, -2.15, 0.24), (2.15 + i * 0.08, -2.15, 0.88), 0.065, 0.08, M["wood_light"])
straw = [(RNG.uniform(-1.65, 0.2), RNG.uniform(-1.4, 0.4), 0.02 + i * 0.00002,
          RNG.uniform(0.08, 0.35), 0.012, RNG.uniform(-math.pi, math.pi)) for i in range(180)]
patches("Miko's straw pallet", straw, [M["straw"], M["straw_light"], M["straw_dark"]])
tinder = [(-0.3 + RNG.uniform(-0.2, 0.2), -0.9 + RNG.uniform(-0.13, 0.13), 0.04 + i * 0.001,
           RNG.uniform(0.1, 0.25), 0.014, RNG.uniform(0, math.tau)) for i in range(30)]
patches("Dry tinder below the flint", tinder, [M["straw"], M["straw_light"]])

area("Warm window key", (-2.8, 4.0, 4.5), (-0.3, -1.0, 0.3), 1350, "#ffda99", 1.8)
area("Cool doorway fill", (0.5, 4.0, 3.2), (0, 0, 1), 450, "#9ebed3", 2.0)
area("Soft cool camera fill", (2.5, -4.0, 3.0), (-0.5, 0, 1.3), 420, "#a4c7d9", 4)
sun_data = bpy.data.lights.new("Dawn sun through window", "SUN")
sun_data.energy = 2.2
sun_data.color = rgb("#ffd49a")
sun_data.angle = 0.055
sun = bpy.data.objects.new("Dawn sun through window", sun_data)
bpy.context.collection.objects.link(sun)
sun.location = (-4, 5, 5)
aim(sun, (0, -2, 0))

fog_mat = bpy.data.materials.new("Thin dusty cottage air")
fog_mat.use_nodes = True
fog_mat.node_tree.nodes.clear()
out = fog_mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
volume = fog_mat.node_tree.nodes.new("ShaderNodeVolumePrincipled")
volume.inputs["Density"].default_value = 0.003
volume.inputs["Color"].default_value = (*rgb("#c6c2a5"), 1)
volume.inputs["Anisotropy"].default_value = 0.3
fog_mat.node_tree.links.new(volume.outputs["Volume"], out.inputs["Volume"])
cube("Bounded light-shaft volume", (0, 0, 2.1), (6.4, 6.2, 4.2), fog_mat)


def gif_actor(name, settings):
    stem = settings["asset"]
    folder = ROOT / "output" / "imagegen" / stem
    meta = json.loads((folder / (stem + "-atlas.json")).read_text())
    mat = bpy.data.materials.new(name + " pixel GIF cutout")
    mat.use_nodes = True
    mat.surface_render_method = "DITHERED"
    mat.use_transparent_shadow = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 1
    bsdf.inputs["Specular IOR Level"].default_value = 0
    bsdf.inputs["Emission Strength"].default_value = 0.24
    image = nodes.new("ShaderNodeTexImage")
    image.image = bpy.data.images.load(str(folder / (stem + "-atlas.png")), check_existing=True)
    image.interpolation = "Closest"
    uv = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (meta["crop"]["width"] / meta["width"], meta["crop"]["height"] / meta["height"], 1)
    links.new(uv.outputs["UV"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], image.inputs["Vector"])
    links.new(image.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(image.outputs["Color"], bsdf.inputs["Emission Color"])
    alpha = nodes.new("ShaderNodeMath")
    alpha.operation = "GREATER_THAN"
    alpha.inputs[1].default_value = 0.65
    links.new(image.outputs["Alpha"], alpha.inputs[0])
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    mix = nodes.new("ShaderNodeMixShader")
    links.new(alpha.outputs[0], mix.inputs[0])
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(bsdf.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], output.inputs["Surface"])
    h = settings["height"]
    w = h * meta["crop"]["width"] / meta["crop"]["height"]
    mesh = bpy.data.meshes.new(name + " upright pixel plane")
    mesh.from_pydata([(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)], [], [(0, 1, 2, 3)])
    mesh.uv_layers.new()
    for i, uv_value in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]):
        mesh.uv_layers.active.data[i].uv = uv_value
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj["native_gif_source"] = str(folder / (stem + ".gif"))
    obj["frame_duration_ms"] = meta["frameDurationMs"]
    return {"obj": obj, "meta": meta, "mapping": mapping, "settings": settings}


actors = {name: gif_actor("Miko " + name, settings) for name, settings in config["animations"].items()}
camera_data = bpy.data.cameras.new("Portrait story camera")
camera_data.sensor_fit = "VERTICAL"
camera_data.sensor_height = 36
camera_data.clip_start, camera_data.clip_end = 0.1, 100
camera = bpy.data.objects.new("Portrait story camera", camera_data)
bpy.context.collection.objects.link(camera)
scene.camera = camera

dust_mat = material("Warm dust glints", "#e5cfa1", 0.7)
dust = [cube("Drifting dust", (0, 0, 0), (0.009, 0.009, 0.009), dust_mat) for _ in range(32)]
spark_mat = material("Flint spark glow", "#ffd780", 4)
sparks = [cube("First flint spark", (0, 0, 0), (0.023, 0.023, 0.023), spark_mat) for _ in range(9)]

for frame in range(1, config["frames"] + 1):
    time = (frame - 1) / config["fps"]
    shot = next(s for s in config["shots"] if s["start"] <= time < s["end"])
    local = time - shot["start"]
    activity = shot["activity"]
    if activity == "wake":
        push = 0.16 * min(1, local / 0.4) + local * 0.018
        camera.location = (0.15 - local * 0.025, -5.65 + push, 2.55)
        target, lens = (-0.5, -0.3, 1.38), 42
        active, start = "wake", config["animations"]["wake"]["start"]
    elif activity == "strike":
        camera.location = (0.23 + local * 0.045, -5.85 + local * 0.07, 2.55)
        target, lens = (-0.45, -0.25, 1.36), 43
        active, start = "strike", config["animations"]["strike"]["start"]
    else:
        camera.location = (0.55 + local * 0.045, -7.0 + local * 0.035, 2.8)
        target, lens = (-0.25, 0.0, 1.5), 42
        active, start = "shiver", shot["start"] + 0.15
    camera_data.lens = lens
    camera_data.keyframe_insert("lens", frame=frame)
    aim(camera, target)
    camera.keyframe_insert("location", frame=frame)
    camera.keyframe_insert("rotation_euler", frame=frame)
    for name, actor in actors.items():
        obj, meta, settings = actor["obj"], actor["meta"], actor["settings"]
        obj.hide_render = name != active
        obj.hide_viewport = name != active
        obj.keyframe_insert("hide_render", frame=frame)
        obj.keyframe_insert("hide_viewport", frame=frame)
        index = max(0, min(meta["frameCount"] - 1, math.floor((time - start) * 1000 / meta["frameDurationMs"] + 0.00001))) if name == active else 0
        cell, crop, first = meta["cells"][index], meta["crop"], meta["cells"][0]
        h = settings["height"]
        pivot = ((first["left"] + first["right"]) / 2 - crop["x"] - crop["width"] / 2) * h / crop["height"]
        foot_padding = (crop["y"] + crop["height"] - 1 - cell["bottom"]) * h / crop["height"]
        obj.location = (-0.55 - pivot, -0.6, h / 2 - foot_padding + 0.035)
        obj.rotation_euler.z = math.atan2(camera.location.x + 0.55, -(camera.location.y + 0.6))
        obj.keyframe_insert("location", frame=frame)
        obj.keyframe_insert("rotation_euler", frame=frame)
        actor["mapping"].inputs["Location"].default_value = ((cell["originX"] + crop["x"]) / meta["width"], 1 - (cell["originY"] + crop["y"] + crop["height"]) / meta["height"], 0)
        actor["mapping"].inputs["Location"].keyframe_insert("default_value", frame=frame)
    for i, obj in enumerate(dust):
        obj.location = (-2.7 + (i * 0.731 % 5.4) + math.sin(time * 0.4 + i) * 0.04,
                        -2 + (i * 0.49 % 4.3), 0.35 + (i * 0.373 % 3.5) + math.sin(time * 0.5 + i) * 0.05)
        obj.keyframe_insert("location", frame=frame)
    elapsed = time - config["sparkAt"]
    for i, obj in enumerate(sparks):
        obj.hide_render = not (0 <= elapsed <= 0.28)
        obj.keyframe_insert("hide_render", frame=frame)
        obj.location = (-0.55 + elapsed * (0.8 + (i % 3) * 0.4), -0.67 + elapsed * math.sin(i) * 0.5,
                        0.68 + elapsed * (0.5 + (i % 4) * 0.35) - elapsed * elapsed * 6)
        obj.keyframe_insert("location", frame=frame)

frames_folder = ROOT / config["framesFolder"]
frames_folder.mkdir(parents=True, exist_ok=True)
scene.render.filepath = str(frames_folder / "") + "/"
scene["episode"] = config["episode"]
scene["scope"] = config["scope"]
scene["seed"] = 1500
scene["native_gif_playback"] = "Baked UV cells from 12-frame native GIF sources; 100ms per cell."
scene.frame_set(1)
bpy.ops.file.pack_all()
blend_file = ROOT / config["sceneFile"]
blend_file.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend_file))
report = {"blender": bpy.app.version_string, "engine": scene.render.engine, "resolution": [scene.render.resolution_x, scene.render.resolution_y],
          "samples": scene.eevee.taa_render_samples, "frames": config["frames"], "objects": len(scene.objects),
          "mesh_faces": sum(len(obj.data.polygons) for obj in scene.objects if obj.type == "MESH"),
          "packed_images": len([image for image in bpy.data.images if image.packed_file]), "blend": str(blend_file)}
(ROOT / "renders/survive-1500/blender-test-v1/scene-build.json").write_text(json.dumps(report, indent=2) + "\n")
print("COTTAGE_BUILD:" + json.dumps(report), flush=True)
if args.stills:
    folder = ROOT / "renders/survive-1500/blender-test-v1/stills"
    folder.mkdir(parents=True, exist_ok=True)
    for frame in [1, 50, 100, 200, 293]:
        scene.frame_set(frame)
        scene.render.filepath = str(folder / ("world-%04d.png" % frame))
        bpy.ops.render.render(write_still=True)
        print("COTTAGE_STILL:" + str(frame), flush=True)
