"""Build local, frame-driven props for the Miko beer explainer."""
import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/episodes/beer-feels-good/blender"
ASSETS = ROOT / "episodes/beer-feels-good/assets"


def material(name, colour, transparent=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    diffuse = nodes.new("ShaderNodeBsdfDiffuse")
    diffuse.inputs["Color"].default_value = (*colour, 1)
    diffuse.inputs["Roughness"].default_value = .9
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (*colour, 1)
    emission.inputs["Strength"].default_value = .85
    toon = nodes.new("ShaderNodeMixShader")
    toon.inputs[0].default_value = .18
    mat.node_tree.links.new(emission.outputs[0], toon.inputs[1])
    mat.node_tree.links.new(diffuse.outputs[0], toon.inputs[2])
    if transparent:
        clear = nodes.new("ShaderNodeBsdfTransparent")
        mix = nodes.new("ShaderNodeMixShader")
        mix.inputs[0].default_value = 1 - transparent
        mat.node_tree.links.new(clear.outputs[0], mix.inputs[1])
        mat.node_tree.links.new(toon.outputs[0], mix.inputs[2])
        mat.node_tree.links.new(mix.outputs[0], output.inputs[0])
        mat.surface_render_method = "BLENDED"
    else:
        mat.node_tree.links.new(toon.outputs[0], output.inputs[0])
    return mat


def sphere(name, location, radius, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    if parent:
        obj.parent = parent
    return obj


def lathe(name, profile, mat, parent):
    count = 64
    vertices = [(r * math.cos(2 * math.pi * i / count), r * math.sin(2 * math.pi * i / count), z)
                for r, z in profile for i in range(count)]
    faces = []
    for row in range(len(profile) - 1):
        for i in range(count):
            j = (i + 1) % count
            faces.append((row * count + i, row * count + j, (row + 1) * count + j, (row + 1) * count + i))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


def tube(name, coords, radius, mat, parent):
    curve = bpy.data.curves.new(name + "_Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    spline = curve.splines.new("POLY")
    spline.points.add(len(coords) - 1)
    for point, co in zip(spline.points, coords):
        point.co = (*co, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    curve.materials.append(mat)
    return obj


def light(name, location, energy, colour, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = colour
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, 0)) - obj.location).to_track_quat("-Z", "Y").to_euler()


def setup(kind):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.resolution_x = 1080 if kind == "mug" else 512
    scene.render.resolution_y = scene.render.resolution_x
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.fps = 60
    scene.frame_start = 1
    scene.frame_end = 64 if kind == "mug" else 120
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    world = bpy.data.worlds.new("World_Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (.22, .24, .33, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = .55
    scene.world = world
    light("LGT_Key_Softbox", (3, -4, 6), 650, (1, .94, .84), 5)
    light("LGT_Fill_Cool", (-4, -1, 3), 280, (.69, .85, 1), 4)
    light("LGT_Rim_Soft", (1, 4, 4), 400, (1, .87, .62), 3)
    data = bpy.data.cameras.new("CAM_" + kind + "_Hero")
    camera = bpy.data.objects.new(data.name, data)
    bpy.context.collection.objects.link(camera)
    camera.location = (3.2, -7, 3.1) if kind == "mug" else (3.3, -7.2, 4.6)
    target = Vector((.1, 0, .18) if kind == "mug" else (.1, 0, 0))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    data.type = "ORTHO"
    data.ortho_scale = 4.75 if kind == "mug" else 6.5
    scene.camera = camera
    root = bpy.data.objects.new("AN_" + kind + "_Root", None)
    bpy.context.collection.objects.link(root)
    return scene, root


def mug(root):
    glass = material("MAT_Glass_PaleBlue", (.70, .90, .99), transparent=.95)
    rim = material("MAT_Glass_Rim", (.65, .88, .98))
    amber = material("MAT_Beer_Amber", (1, .49, .035))
    foam = material("MAT_Foam_Cream", (1, .985, .88))
    bubble = material("MAT_Bubble_Gold", (1, .86, .36))
    lathe("PROP_Mug_Shell", [(0, -1.25), (.76, -1.25), (.87, -1.15), (.92, 1.1), (.88, 1.15), (.82, 1.09), (.78, -1.12), (0, -1.12)], glass, root)
    lathe("PROP_Beer_Fill", [(0, -1.1), (.75, -1.1), (.81, .83), (0, .83)], amber, root)
    for z, r in [(-1.17, .81), (1.11, .89)]:
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=.045, major_segments=64, minor_segments=12, location=(0, 0, z))
        obj = bpy.context.object
        obj.name = "PROP_Mug_Rim_" + str(z)
        obj.data.materials.append(rim)
        obj.parent = root
    coords = [(1.0 + .56 * math.cos(a), 0, .02 + .76 * math.sin(a)) for a in [(-math.pi / 2 + math.pi * i / 32) for i in range(33)]]
    tube("PROP_Mug_Handle", coords, .115, rim, root)
    for i, (x, y, r) in enumerate([(-.45, -.12, .43), (0, 0, .48), (.43, .08, .43), (-.15, .39, .35), (.2, -.36, .35)]):
        obj = sphere("PROP_Foam_" + str(i), (x, y, 1.13), r, foam, root)
        obj.scale.z = .42
    for i in range(18):
        angle = i * 2.39996
        x, y = .6 * math.cos(angle), -.36 + .10 * math.sin(angle)
        radius = .028 + .014 * (i % 3)
        obj = sphere("AN_Bubble_" + str(i), (x, y - .49, -1), radius, bubble, root)
        phase = i / 18
        for frame in range(1, 65):
            obj.location.z = -1 + 1.75 * ((phase + (frame - 1) / 75) % 1)
            obj.keyframe_insert(data_path="location", frame=frame)
    for frame, angle in [(1, -.16), (64, .12)]:
        root.rotation_euler.z = angle
        root.keyframe_insert(data_path="rotation_euler", frame=frame)


def molecule(root):
    carbon = material("MAT_Carbon_Teal", (.08, .60, .66))
    oxygen = material("MAT_Oxygen_Coral", (.98, .19, .29))
    hydrogen = material("MAT_Hydrogen_Cream", (.98, .97, .87))
    bond = material("MAT_Bond_Blue", (.45, .73, .82))
    atoms = [(-.76, 0, 0), (.76, 0, 0), (1.43, 1.17, 0), (-1.15, .96, .38), (-1.12, -.78, .68), (-1.12, -.18, -1.02), (1.12, -.72, .74), (1.12, -.28, -.98), (2.34, .97, .08)]
    for i, pos in enumerate(atoms):
        sphere("ATOM_" + ("C" if i < 2 else "O" if i == 2 else "H") + str(i), pos, .47 if i < 2 else .43 if i == 2 else .26, carbon if i < 2 else oxygen if i == 2 else hydrogen, root)
    edges = [(0, 1), (1, 2), (0, 3), (0, 4), (0, 5), (1, 6), (1, 7), (2, 8)]
    for i, (a, b) in enumerate(edges):
        tube("BOND_" + str(i), [atoms[a], atoms[b]], .095, bond, root)
    for frame, angle in [(1, 0), (121, 2 * math.pi)]:
        root.rotation_euler = (.14, -.18, angle)
        root.keyframe_insert(data_path="rotation_euler", frame=frame)
    action = root.animation_data.action
    for slot in action.slots:
        for layer in action.layers:
            for strip in layer.strips:
                for fcurve in strip.channelbag(slot).fcurves:
                    for key in fcurve.keyframe_points:
                        key.interpolation = "LINEAR"


def inspect(scene, kind):
    result = {"asset": kind, "fps": scene.render.fps, "range": [scene.frame_start, scene.frame_end], "worldUp": "+Z", "characterRig": False, "rootMotion": "Stationary prop; authored rotation. Bubble particles rise in local +Z.", "samples": []}
    for frame in sorted({scene.frame_start, round((scene.frame_start + scene.frame_end) / 2), scene.frame_end}):
        scene.frame_set(frame)
        points = []
        for obj in scene.objects:
            if obj.type in {"MESH", "CURVE"}:
                for corner in obj.bound_box:
                    co = world_to_camera_view(scene, scene.camera, obj.matrix_world @ Vector(corner))
                    points.append((co.x, co.y))
        bounds = [min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)]
        result["samples"].append({"frame": frame, "cameraBounds": bounds, "insideFrame": all(.025 <= n <= .975 for n in bounds)})
    assert all(s["insideFrame"] for s in result["samples"]), result
    (ASSETS / ("blender-" + kind + "-inspection.json")).write_text(json.dumps(result, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", choices=["mug", "molecule"], required=True)
    parser.add_argument("--stills", action="store_true")
    parser.add_argument("--render", action="store_true")
    import sys
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    target = OUT / args.asset
    target.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    scene, root = setup(args.asset)
    (mug if args.asset == "mug" else molecule)(root)
    inspect(scene, args.asset)
    scene.render.filepath = str(target / "frame-")
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "blender" / ("beer-" + args.asset + ".blend")))
    if args.stills:
        for frame in [1, scene.frame_end // 2, scene.frame_end]:
            scene.frame_set(frame)
            scene.render.filepath = str(target / f"review-{frame:04}.png")
            bpy.ops.render.render(write_still=True)
    if args.render:
        scene.render.filepath = str(target / "frame-")
        bpy.ops.render.render(animation=True)


if __name__ == "__main__":
    main()
