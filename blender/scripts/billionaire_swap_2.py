"""Extend the original swap set with homework, used dishes and a wheeled bin."""
from pathlib import Path
import bpy,math,json

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'blender/billionaire-body-swap-2'
PUB=ROOT/'public/episodes/billionaire-body-swap-2'
OUT.mkdir(parents=True,exist_ok=True);PUB.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/billionaire-body-swap/billionaire-swap-v1.blend'))

def material(name,color,rough=.7,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF')
    rgb=tuple(int(color[i:i+2],16)/255 for i in (1,3,5))
    rgb=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
    b.inputs['Base Color'].default_value=(*rgb,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal
    return m
M={'book':material('Sequel schoolbook blue','#4b6e83'),
   'paper':material('Sequel warm paper','#f1ead5'),
   'ceramic':material('Sequel cream ceramic','#e6dfc8',.34),
   'food':material('Sequel crumbs','#b78d4f'),
   'metal':material('Sequel steel','#9aa9ad',.48,.65),
   'bin':material('Sequel muted blue bin','#3b565e'),
   'lid':material('Sequel sage lid','#728477'),
   'rubber':material('Sequel rubber','#26343a'),
   'coin':material('Sequel muted brass coin','#bc9b55',.32,.72),
   'cloth':material('Sequel dish cloth','#748b88')}
def group(name,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o
def box(name,size,pos,mat,parent,bevel=.014):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.parent=parent;o.data.materials.append(M[mat])
    if bevel:
        mod=o.modifiers.new('Rounded edge highlights','BEVEL');mod.width=bevel;mod.segments=3
        o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
    return o
def cyl(name,radius,depth,pos,mat,parent,vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=pos)
    o=bpy.context.object;o.name=name;o.parent=parent;o.data.materials.append(M[mat])
    mod=o.modifiers.new('Ceramic edge','BEVEL');mod.width=.008;mod.segments=2
    o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');return o
def torus(name,major,minor,pos,mat,parent):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=32,minor_segments=8,location=pos)
    o=bpy.context.object;o.name=name;o.parent=parent;o.data.materials.append(M[mat])
    for f in o.data.polygons:f.use_smooth=True
    return o

templates=group('Sequel_Prop_Templates')
book=group('Prop_Homework',templates)
box('Homework_BottomCover',(1.05,.79,.032),(0,0,.018),'book',book)
box('Homework_Pages',(.99,.75,.063),(0,0,.063),'paper',book,.008)
box('Homework_Spine',(.065,.79,.10),(-.51,0,.057),'book',book)
box('Homework_BackLip',(1.05,.045,.018),(0,.39,.107),'book',book,.007)
for i in range(4):box('Homework_PageEdge',(.98,.006,.002),(.005,-.376,.042+i*.012),'ceramic',book,0)
book['surface_y_after_gltf']=.108

dishes=group('Prop_Dishes',templates)
for i in range(5):
    z=.027+i*.047
    cyl('Used_Plate',.30,.026,(0,0,z),'ceramic',dishes)
    torus('Plate_Rim',.276,.018,(0,0,z+.014),'ceramic',dishes)
for i,(x,y) in enumerate([(-.11,-.07),(.08,.03),(.13,-.10),(-.04,.14)]):
    o=box('Food_Remnant',(.055,.036,.007),(x,y,.235),'food',dishes,.005);o.rotation_euler.z=i*.8
box('Folded_Cloth',(.29,.34,.024),(.39,.02,.025),'cloth',dishes,.025)
fork=box('Dish_ForkHandle',(.025,.35,.014),(-.36,.02,.04),'metal',dishes,.006)
fork.rotation_euler.z=-.15
for x in [-.395,-.375,-.355,-.335]:box('Dish_ForkProng',(.009,.09,.012),(x,.23,.04),'metal',dishes,.003)

bin_=group('Prop_Bin',templates)
verts=[]
for z,w,d in [(.14,.49,.43),(.93,.62,.53)]:
    verts.extend([(-w/2,-d/2,z),(w/2,-d/2,z),(w/2,d/2,z),(-w/2,d/2,z)])
mesh=bpy.data.meshes.new('Tapered bin mesh');mesh.from_pydata(verts,[],[(0,1,2,3),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0),(4,7,6,5)]);mesh.update()
body=bpy.data.objects.new('Bin_Body',mesh);bpy.context.collection.objects.link(body);body.parent=bin_;body.data.materials.append(M['bin'])
mod=body.modifiers.new('Bin edge highlights','BEVEL');mod.width=.025;mod.segments=3;body.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
lid=group('Chore_BinLid',bin_);lid.location=(0,.26,.94)
box('Bin_Lid',(.69,.60,.052),(0,-.26,.025),'lid',lid,.025)
box('Bin_LidHandle',(.18,.05,.055),(0,-.46,.073),'bin',lid)
for x in [-.27,.27]:
    o=cyl('Bin_Wheel',.11,.075,(x,.16,.11),'rubber',bin_);o.rotation_euler.y=math.pi/2
box('Bin_BackHandle',(.46,.05,.055),(0,.30,.79),'rubber',bin_)

money=group('Prop_PocketMoney',templates)
for i,(x,y) in enumerate([(-.17,-.16),(.17,-.16),(-.17,.16),(.17,.16)]):
    coin=group(f'Pocket_Coin_{i+1}',money)
    coin.location=(x,y,0)
    cyl('Pound_BrassRim',.128,.024,(0,0,.016),'coin',coin,12)
    cyl('Pound_SilverCentre',.101,.026,(0,0,.016),'metal',coin,32)

# Reusable finite lid action, mirrored by the frame-driven runtime.
for frame,angle in [(1,0),(10,-.32),(18,.06),(25,0)]:
    lid.rotation_euler.x=angle;lid.keyframe_insert(data_path='rotation_euler',frame=frame)
bpy.context.scene.frame_set(1)
for o in bpy.data.objects:o.hide_render=False
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1080;scene.render.resolution_y=1920;scene.render.resolution_percentage=100;scene.render.fps=30
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'billionaire-swap-2.blend'))
bpy.ops.export_scene.gltf(filepath=str(PUB/'swap-stage-sequel.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_apply=True)
(OUT/'asset-plan.json').write_text(json.dumps({'source':'blender/billionaire-body-swap/billionaire-swap-v1.blend','props':['Prop_Homework','Prop_Dishes','Prop_Bin','Prop_PocketMoney'],'lidFrames':[1,10,18,25],'delivery':[1080,1920,30]},indent=2)+'\n')
print('Saved sequel Blender source and local GLB with three chore props.')
