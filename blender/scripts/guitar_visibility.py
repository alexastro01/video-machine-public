import bpy
S=bpy.context.scene
count=0
for o in bpy.data.objects:
 if not o.animation_data or not o.animation_data.action:continue
 a=o.animation_data.action;bag=a.layers[0].strips[0].channelbag(o.animation_data.action_slot)
 render=next((f for f in bag.fcurves if f.data_path=='hide_render'),None)
 if not render:continue
 vp=next((f for f in bag.fcurves if f.data_path=='hide_viewport'),None)
 if vp:bag.fcurves.remove(vp)
 vp=bag.fcurves.new(data_path='hide_viewport');vp.keyframe_points.add(len(render.keyframe_points))
 for dest,src in zip(vp.keyframe_points,render.keyframe_points):dest.co=src.co;dest.interpolation='CONSTANT';src.interpolation='CONSTANT'
 vp.update();o.hide_viewport=False;count+=1
S.frame_set(2);S.frame_set(1);bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print('Copied render visibility to animated viewport visibility on',count,'objects')
for frame in [1,150,250,450,600,750,850]:
 S.frame_set(frame);bpy.context.view_layer.update();print(frame,[(o.name,o.hide_render,o.hide_viewport) for o in bpy.data.objects if o.name.startswith('Miko')])
