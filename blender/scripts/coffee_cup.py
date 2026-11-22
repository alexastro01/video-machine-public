"""Animate the jade-banded ceramic cup seen in Miko's coffee short."""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from beer_explainer import lathe, light, tube

root = Path(__file__).resolve().parents[2]
slug = "is-coffee-actually-a-drug"
frames = root / "public" / "episodes" / slug / "blender"
project = root / "blender" / slug
frames.mkdir(parents=True, exist_ok=True)
project.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
scene.render.fps = 30
scene.frame_start, scene.frame_end = 1, 49
scene.render.threads_mode = "FIXED"
scene.render.threads = 4
scene.eevee.taa_render_samples = 12
world = bpy.data.worlds.new("Morning sky through the cafe window")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.64, 0.72, 0.72, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.42
scene.world = world
light("Window / warm key", (-3.5, -4, 6), 590, (1, 0.85, 0.64), 4)
light("Counter / cool bounce", (4, -1, 3), 270, (0.67, 0.86, 1), 3.2)
light("Second window / rim", (1.5, 4, 4.5), 450, (1, 0.93, 0.76), 2.8)


def glaze(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


cream = glaze("Ivory porcelain", (0.87, 0.81, 0.58), 0.31)
jade = glaze("Jade glaze", (0.028, 0.245, 0.137), 0.34)
coffee = glaze("Black filter coffee", (0.023, 0.006, 0.002), 0.26)
coffee.node_tree.nodes["Principled BSDF"].inputs[
    "Specular IOR Level"
].default_value = 0.19
# Limit the large window reflection so the liquid retains the dark value in
# Miko's drawing. The colored meniscus and moving crema carry the highlights.
nodes = coffee.node_tree.nodes
coffee_glow = nodes.new("ShaderNodeEmission")
coffee_glow.inputs["Color"].default_value = (0.024, 0.008, 0.003, 1)
coffee_mix = nodes.new("ShaderNodeMixShader")
coffee_mix.inputs[0].default_value = 0.23
coffee.node_tree.links.new(coffee_glow.outputs[0], coffee_mix.inputs[1])
coffee.node_tree.links.new(nodes["Principled BSDF"].outputs[0], coffee_mix.inputs[2])
coffee.node_tree.links.new(
    coffee_mix.outputs[0], nodes["Material Output"].inputs["Surface"]
)
crema = glaze("Light reflected from crema", (0.50, 0.245, 0.067), 0.43)
saucer = glaze("Warm ivory saucer", (0.72, 0.63, 0.42), 0.32)
lathe(
    "Porcelain cup, rolled lip and fully modeled interior",
    [
        (0, 0.10),
        (0.49, 0.10),
        (0.56, 0.14),
        (0.62, 0.20),
        (0.76, 0.47),
        (0.83, 0.79),
        (0.86, 1.12),
        (0.85, 1.16),
        (0.81, 1.17),
        (0.782, 1.13),
        (0.76, 0.81),
        (0.68, 0.53),
        (0.53, 0.27),
        (0.47, 0.23),
        (0, 0.23),
    ],
    cream,
    None,
)
lathe(
    "One green band",
    [(0.596, 0.156), (0.623, 0.198), (0.765, 0.469), (0.783, 0.555)],
    jade,
    None,
)
lathe(
    "Short foot", [(0, 0.07), (0.49, 0.07), (0.505, 0.09), (0.50, 0.135)], cream, None
)
lathe(
    "Shallow saucer",
    [
        (0, 0.023),
        (0.63, 0.022),
        (1.05, 0.046),
        (1.24, 0.105),
        (1.26, 0.14),
        (1.23, 0.151),
        (1.03, 0.102),
        (0.57, 0.069),
        (0, 0.069),
    ],
    saucer,
    None,
)
# Reverse the usual right-facing presentation to match the drawn handle.
arc = [
    (-0.72 - 0.465 * math.cos(a) - 0.078 * math.sin(a), 0, 0.69 + 0.34 * math.sin(a))
    for a in [-math.pi / 2 + math.pi * i / 48 for i in range(49)]
]
tube("Left handle", arc, 0.094, cream, None)
lathe(
    "Coffee surface with subtle meniscus",
    [(0.795, 1.098), (0.79, 1.09), (0.764, 1.076), (0, 1.076)],
    coffee,
    None,
)
swirl = bpy.data.objects.new("Current in coffee", None)
bpy.context.collection.objects.link(swirl)
for n, (r0, start, sweep) in enumerate(
    [(0.724, 0.3, 1.25), (0.701, 0.5, 0.64), (0.65, 2.8, 0.85), (0.42, 4.6, 1.1)]
):
    pts = []
    for i in range(45):
        u = i / 44
        a = start + sweep * u
        r = r0 + 0.025 * math.sin(math.pi * u)
        pts.append((r * math.cos(a), r * math.sin(a), 1.081))
    tube(f"Broken crema arc {n}", pts, 0.007 if n == 3 else 0.010, crema, swirl)
data = bpy.data.cameras.new("Orthographic coffee close-up")
cam = bpy.data.objects.new("Dolly from rim to table", data)
bpy.context.collection.objects.link(cam)
scene.camera = cam
data.type = "ORTHO"
data.ortho_scale = 3.04
target = Vector((-0.045, 0, 0.51))
for frame, z, angle, spin in [
    (1, 4.95, -0.20, -0.30),
    (20, 4.16, -0.13, -0.05),
    (49, 3.08, 0.075, 0.36),
]:
    cam.location = (math.sin(angle) * 6.5, -math.cos(angle) * 6.5, z)
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.keyframe_insert(data_path="location", frame=frame)
    cam.keyframe_insert(data_path="rotation_euler", frame=frame)
    swirl.rotation_euler.z = spin
    swirl.keyframe_insert(data_path="rotation_euler", frame=frame)
scene.frame_set(1)
scene.render.filepath = str(frames / "cup-")
bpy.ops.wm.save_as_mainfile(filepath=str(project / "morning-cup.blend"))
bpy.ops.render.render(animation=True)
