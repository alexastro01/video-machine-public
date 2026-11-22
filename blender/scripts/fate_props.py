"""Prepare licensed source meshes for the fate short and retain a Blender library."""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "public/episodes/happens-for-a-reason/models"
OUT = ROOT / "blender/happens-for-a-reason"
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
library = []
measurements = {}


def select(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


for name, width in [("brain", 1.75), ("cloud", 2.55), ("book", 1.92)]:
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(BASE / f"{name}-source.glb"))
    imported = list(set(scene.objects) - before)
    meshes = [obj for obj in imported if obj.type == "MESH"]
    for obj in meshes:
        transform = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        obj.data.transform(transform)
    for obj in imported:
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    points = [v.co.copy() for obj in meshes for v in obj.data.vertices]
    lo = Vector(tuple(min(v[i] for v in points) for i in range(3)))
    hi = Vector(tuple(max(v[i] for v in points) for i in range(3)))
    center = (lo + hi) / 2
    scale = width / (hi.x - lo.x)
    transform = Matrix.Diagonal((scale, scale, scale, 1)) @ Matrix.Translation(-center)
    if name == "book":
        transform = Matrix.Rotation(math.radians(78), 4, "X") @ transform
    for obj in meshes:
        obj.data.transform(transform)
        obj.name = f"PROP_{name.title()}"
        obj["source"] = "Poly Pizza; source and license in assets/models-v2.json"
        for material in obj.data.materials:
            if not material or not material.use_nodes:
                continue
            bsdf = material.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Roughness"].default_value = 0.73
                bsdf.inputs["Metallic"].default_value = 0
                if name == "brain":
                    bsdf.inputs["Base Color"].default_value = (0.52, 0.23, 0.28, 1)
                elif name == "cloud":
                    bsdf.inputs["Base Color"].default_value = (0.75, 0.82, 0.87, 1)
                elif name == "book" and "beige" in material.name.lower():
                    bsdf.inputs["Base Color"].default_value = (0.9, 0.83, 0.67, 1)
        if name in ["brain", "cloud"]:
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.0003)
            bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
            bm.to_mesh(obj.data)
            bm.free()
            if obj.data.has_custom_normals:
                select([obj])
                bpy.ops.mesh.customdata_custom_splitnormals_clear()
            for poly in obj.data.polygons:
                poly.use_smooth = True
        if name == "cloud":
            select([obj])
            modifier = obj.modifiers.new("Cloud_Continuous_Surface", "REMESH")
            modifier.mode = "VOXEL"
            modifier.voxel_size = 0.035
            bpy.ops.object.modifier_apply(modifier=modifier.name)
            modifier = obj.modifiers.new("Cloud_Softness", "SMOOTH")
            modifier.factor = 0.7
            modifier.iterations = 4
            bpy.ops.object.modifier_apply(modifier=modifier.name)
            modifier = obj.modifiers.new("Cloud_Final_Surface", "SUBSURF")
            modifier.levels = 1
            bpy.ops.object.modifier_apply(modifier=modifier.name)
            for poly in obj.data.polygons:
                poly.use_smooth = True
        if name == "brain":
            # The archived low-poly cortex contains open fissures. A smaller
            # interior volume closes those gaps while retaining its outer folds.
            bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24)
            core = bpy.context.object
            core.scale = (0.68, 0.53, 0.54)
            core.location.z = 0.08
            select([core])
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            core.data.materials.append(obj.data.materials[0])
            select([obj, core])
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.join()
            modifier = obj.modifiers.new("Brain_Closed_Volume", "REMESH")
            modifier.mode = "VOXEL"
            modifier.voxel_size = 0.015
            bpy.ops.object.modifier_apply(modifier=modifier.name)
            modifier = obj.modifiers.new("Brain_Soft_Folds", "SMOOTH")
            modifier.factor = 0.35
            modifier.iterations = 2
            bpy.ops.object.modifier_apply(modifier=modifier.name)
            for poly in obj.data.polygons:
                poly.use_smooth = True
    if name == "book":
        original = meshes
        meshes = []
        for direction, label in [(1, "Left"), (-1, "Right")]:
            for obj in original:
                half = obj.copy()
                half.data = obj.data.copy()
                scene.collection.objects.link(half)
                half.name = f"Book_{label}"
                bm = bmesh.new()
                bm.from_mesh(half.data)
                bmesh.ops.bisect_plane(
                    bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
                    dist=0.00001, plane_co=(0, 0, 0), plane_no=(direction, 0, 0),
                    clear_outer=True, clear_inner=False,
                )
                bm.to_mesh(half.data)
                bm.free()
                half.data.update()
                meshes.append(half)
        for obj in original:
            bpy.data.objects.remove(obj, do_unlink=True)
    select(meshes)
    bpy.ops.export_scene.gltf(
        filepath=str(BASE / f"{name}-v2.glb"), export_format="GLB",
        use_selection=True, export_yup=True, export_animations=False,
        export_extras=True, export_copyright=(
            "Brain by Poly by Google, CC BY 3.0; recolored and normalized"
            if name == "brain" else "Quaternius, CC0 1.0; normalized for this scene"
        ),
    )
    points = [v.co.copy() for obj in meshes for v in obj.data.vertices]
    measurements[name] = {
        "boundsBlender": [[min(v[i] for v in points) for i in range(3)],
                          [max(v[i] for v in points) for i in range(3)]],
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "polygons": sum(len(obj.data.polygons) for obj in meshes),
        "objects": [obj.name for obj in meshes],
    }
    collection = bpy.data.collections.new(f"COL_{name.title()}")
    scene.collection.children.link(collection)
    for obj in meshes:
        for prior in list(obj.users_collection):
            prior.objects.unlink(obj)
        collection.objects.link(obj)
        obj.location.x += {"brain": -3.3, "cloud": 0, "book": 3.3}[name]
    library.extend(meshes)

# A reusable asset library, not an animation render. The video uses the GLBs.
scene["asset_provenance"] = "episodes/happens-for-a-reason/assets/models-v2.json"
select(library)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "fate-props-v2.blend"))
(OUT / "model-measurements-v2.json").write_text(json.dumps(measurements, indent=2) + "\n")
print(json.dumps(measurements, indent=2))
