"""Render the separable OpenAI request chamber for Alex's demo, using its local logo."""

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/episodes/make-no-mistakes-story/opening"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.cycles.use_adaptive_sampling = True
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"
    prefs.refresh_devices()
    metal = [device for device in prefs.devices if device.type == "METAL"]
    if metal:
        for device in prefs.devices:
            device.use = device.type == "METAL"
        scene.cycles.device = "GPU"
except (TypeError, RuntimeError):
    pass
scene.render.resolution_x = scene.render.resolution_y = 1152
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
scene.world = bpy.data.worlds.new("Studio bounce")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (
    0.32,
    0.34,
    0.43,
    1,
)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.38


def material(name, color, metal, rough, glow=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    for key, value in [
        ("Base Color", (*color, 1)),
        ("Metallic", metal),
        ("Roughness", rough),
        ("Emission Color", (*color, 1)),
        ("Emission Strength", glow),
    ]:
        shader.inputs[key].default_value = value
    return mat


black = material("Bead blasted graphite", (0.044, 0.047, 0.067), 0.82, 0.28)
dark = material("Recessed ceramic", (0.014, 0.015, 0.025), 0.50, 0.34)
titanium = material("Chamfered titanium", (0.30, 0.31, 0.40), 0.86, 0.24)
nickel = material("Machined edge", (0.63, 0.67, 0.74), 0.90, 0.20)
ivory = material("Satin silver blossom", (0.83, 0.85, 0.89), 0.66, 0.24)
gold = material("Charged champagne alloy", (0.99, 0.60, 0.15), 0.61, 0.22, 0.32)
copper = material("Champagne contact", (0.66, 0.35, 0.085), 0.85, 0.24)
light = material("Amber current", (0.98, 0.45, 0.063), 0.32, 0.24, 1.15)
groups = {n: [] for n in ("socket", "wafer", "lid", "mark")}


def finish(obj, name, group, mat, bevel=0):
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    groups[group].append(obj)
    if bevel:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        modifier = obj.modifiers.new("Machined bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 4
        obj.modifiers.new("Face normals", "WEIGHTED_NORMAL")
    return obj


def disk(name, r, z, depth, mat, group, bevel=0.035, xy=(0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=144 if r > 0.45 else 48, radius=r, depth=depth, location=(*xy, z)
    )
    ob = bpy.context.object
    for polygon in ob.data.polygons:
        if abs(polygon.normal.z) < 0.9:
            polygon.use_smooth = True
    return finish(ob, name, group, mat, bevel)


def ring(name, r, z, tube, mat, group):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=144,
        minor_segments=10,
        location=(0, 0, z),
        major_radius=r,
        minor_radius=tube,
    )
    ob = bpy.context.object
    for face in ob.data.polygons:
        face.use_smooth = True
    return finish(ob, name, group, mat)


def block(name, xyz, dimensions, mat, group, bev=0, angle=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz)
    ob = bpy.context.object
    ob.dimensions = dimensions
    ob.rotation_euler[2] = angle
    return finish(ob, name, group, mat, bev)


# The thinner middle layer carries rows of exposed contacts beneath the faceplate.
disk("Underside casting", 2.35, 0.00, 0.29, black, "socket", 0.085)
disk("Socket rim", 2.40, 0.11, 0.09, titanium, "socket", 0.033)
disk("Socket face", 2.32, 0.17, 0.09, dark, "socket")
ring("Socket lip", 2.27, 0.218, 0.018, nickel, "socket")
for i in range(48):
    theta = math.tau * i / 48
    for rad, l in [(2.04, 0.23), (1.53, 0.14)]:
        block(
            "Socket contact",
            (rad * math.cos(theta), rad * math.sin(theta), 0.222),
            (l, 0.059, 0.024),
            copper,
            "socket",
            0.008,
            theta,
        )
disk("Memory wafer", 2.10, 0.31, 0.15, black, "wafer", 0.048)
ring("Wafer edge", 2.077, 0.32, 0.026, copper, "wafer")
disk("Processor nest", 1.89, 0.388, 0.06, dark, "wafer", 0.025)
block(
    "Core package",
    (0, 0, 0.45),
    (1.64, 1.64, 0.13),
    titanium,
    "wafer",
    0.12,
    math.pi / 4,
)
block("Gold die", (0, 0, 0.528), (1, 1, 0.04), gold, "wafer", 0.04, math.pi / 4)
for side in range(4):
    a = math.pi / 2 * side
    for i in range(10):
        x, y = (i - 4.5) * 0.145, 1.34
        block(
            "Contact pin",
            (
                x * math.cos(a) - y * math.sin(a),
                x * math.sin(a) + y * math.cos(a),
                0.45,
            ),
            (0.074, 0.32, 0.065),
            copper,
            "wafer",
            0.018,
            a,
        )
disk("Lid bevel", 2.18, 0.535, 0.25, titanium, "lid", 0.083)
disk("Lid crown", 2.155, 0.64, 0.14, black, "lid", 0.052)
disk("Inset dial", 1.98, 0.707, 0.047, dark, "lid", 0.021)
ring("Polished outside edge", 2.115, 0.696, 0.016, nickel, "lid")
ring("Contact light", 2.166, 0.55, 0.021, light, "lid")
for i in range(6):
    theta = math.tau * i / 6
    x, y = 2.02 * math.cos(theta), 2.02 * math.sin(theta)
    disk("Recessed screw", 0.047, 0.715, 0.018, nickel, "lid", 0.006, (x, y))
    block(
        "Screw slot",
        (x, y, 0.727),
        (0.063, 0.012, 0.008),
        dark,
        "lid",
        0.002,
        theta + 0.8,
    )

before = set(bpy.data.objects)
bpy.ops.import_curve.svg(
    filepath=str(ROOT / "public/episodes/make-no-mistakes/blossom.svg")
)
blossom = next(o for o in set(bpy.data.objects) - before if o.type == "CURVE")
bpy.context.view_layer.update()
pts = [blossom.matrix_world @ Vector(p) for p in blossom.bound_box]
x0, x1 = min(p.x for p in pts), max(p.x for p in pts)
y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
scale = 3.58 / (x1 - x0)
blossom.data.transform(
    Matrix.Scale(scale, 4)
    @ Matrix.Translation((-(x0 + x1) / 2, -(y0 + y1) / 2, 0))
    @ blossom.matrix_world
)
blossom.matrix_world = Matrix.Identity(4)
# Triangulate the outer silhouette and its seven counters together. Blender's
# legacy SVG fill drops part of the complex blossom on conversion to solid.
import json
import subprocess
from mathutils.geometry import interpolate_bezier

rings = []
for spline in blossom.data.splines:
    points = spline.bezier_points
    coords = []
    for i, start in enumerate(points):
        end = points[(i + 1) % len(points)]
        for v in interpolate_bezier(
            start.co, start.handle_right, end.handle_left, end.co, 15
        )[:-1]:
            xy = (v.x, v.y)
            if not coords or math.dist(coords[-1], xy) > 0.002:
                coords.append(xy)
    if math.dist(coords[-1], coords[0]) < 0.002:
        coords.pop()
    rings.append(coords)


def area2(ring):
    return sum(
        x * ring[(i + 1) % len(ring)][1] - y * ring[(i + 1) % len(ring)][0]
        for i, (x, y) in enumerate(ring)
    )


rings.sort(key=lambda ring: abs(area2(ring)), reverse=True)
for i, ring in enumerate(rings):
    if (area2(ring) > 0) != (i == 0):
        ring.reverse()
script = """import {ShapeUtils,Vector2} from 'three';import fs from 'node:fs';
const rings=JSON.parse(fs.readFileSync(0,'utf8')).map(r=>r.map(p=>new Vector2(...p)));
console.log(JSON.stringify(ShapeUtils.triangulateShape(rings[0],rings.slice(1))));"""
tri = json.loads(
    subprocess.check_output(
        ["node", "--input-type=module", "-e", script],
        cwd=ROOT,
        input=json.dumps(rings).encode(),
    )
)
xy = [point for ring in rings for point in ring]
count = len(xy)
vertices = [(x, y, z) for z in (-0.065, 0.065) for x, y in xy]
faces = []
for a, b, c in tri:
    if (xy[b][0] - xy[a][0]) * (xy[c][1] - xy[a][1]) - (xy[b][1] - xy[a][1]) * (
        xy[c][0] - xy[a][0]
    ) < 0:
        b, c = c, b
    faces.extend([(a + count, b + count, c + count), (c, b, a)])
offset = 0
for ring_points in rings:
    for j in range(len(ring_points)):
        a = offset + j
        b = offset + (j + 1) % len(ring_points)
        faces.append((a, b, b + count, a + count))
    offset += len(ring_points)
bpy.data.objects.remove(blossom, do_unlink=True)
mesh = bpy.data.meshes.new("Blossom with solid face")
mesh.from_pydata(vertices, [], faces)
mesh.update()
blossom = bpy.data.objects.new("Blossom", mesh)
scene.collection.objects.link(blossom)
blossom.location.z = 0.819
finish(blossom, "OpenAI blossom", "mark", ivory, 0.018)


def point_at(ob, target):
    ob.rotation_euler = (
        (Vector(target) - ob.location).to_track_quat("-Z", "Y").to_euler()
    )


bpy.ops.object.camera_add(location=(0, -7.8, 10.2))
camera = bpy.context.object
point_at(camera, (0, 0, 0.42))
camera.data.type = "ORTHO"
camera.data.ortho_scale = 5.64
scene.camera = camera
lighting = bpy.data.collections.new("Studio lights")
scene.collection.children.link(lighting)


def area(name, xyz, energy, size, size_y, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "RECTANGLE"
    data.size = size
    data.size_y = size_y
    data.color = color
    ob = bpy.data.objects.new(name, data)
    lighting.objects.link(ob)
    ob.location = xyz
    point_at(ob, (0, 0, 0.32))


area("LGT_Key_Softbox", (-3, -3.8, 7.0), 690, 5.3, 3.0, (1, 0.94, 0.84))
area("LGT_Fill_Bounce", (3, 1.8, 4.4), 430, 3.5, 3.8, (0.67, 0.74, 1))
area("LGT_Rim_Back", (-2.1, 3.3, 2.8), 750, 4, 0.65, (0.94, 0.82, 1))
area("LGT_Rim_Front", (3.0, -3.1, 1.8), 280, 3, 0.5, (1, 0.69, 0.37))

for plate, visible in [
    ("socket", {"socket"}),
    ("wafer", {"wafer"}),
    ("lid", {"lid", "mark"}),
    ("charge", {"mark"}),
]:
    for name, objects in groups.items():
        for ob in objects:
            ob.hide_render = name not in visible
    if plate == "charge":
        blossom.data.materials[0] = gold
    scene.render.filepath = str(OUT / (plate + ".png"))
    bpy.ops.render.render(write_still=True)
