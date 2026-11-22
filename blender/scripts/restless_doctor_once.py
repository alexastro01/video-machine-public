"""Revise only the saved doctor's texture clock; preserve the keyed world."""
from pathlib import Path
import json,math,time
import bpy

ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'blender/restless-friend'
T=json.loads((ROOT/'episodes/restless-friend/timeline.json').read_text());FPS=T['fps']
registry=json.loads((ROOT/'episodes/restless-friend/assets/animation-registry-v3.json').read_text())
asset=registry['supportAnimations']['ada'];play=asset['playback'];meta=json.loads((ROOT/asset['metadata']).read_text())
S=bpy.context.scene;actor=bpy.data.objects['CHR_ada'];nodes=actor.data.materials[0].node_tree
mapping=next(n for n in nodes.nodes if n.bl_idname=='ShaderNodeMapping')
nodes.animation_data_clear();history=[];crop=meta['crop'];anchor=T['events'][play['anchorEvent']]
lab=next(s for s in T['shots'] if s['id']=='experiment')
for f in range(round(T['duration']*FPS)):
    S.frame_set(f+1);elapsed=f/FPS-anchor
    index=next((c['frame'] for c in reversed(play['cues']) if elapsed>=c['at']),0)
    col=index%meta['columns'];row=index//meta['columns']
    mapping.inputs['Location'].default_value=((col*meta['cellWidth']+crop['x'])/meta['width'],1-(row*meta['cellHeight']+crop['y']+crop['height'])/meta['height'],0)
    mapping.inputs['Location'].keyframe_insert('default_value')
    pad=crop['y']+crop['height']-1-meta['cells'][index]['bottom'];actor.location.z=.02-pad/crop['height']*2.12;actor.keyframe_insert('location',index=2)
    if lab['start']<=f/FPS<lab['start']+lab['duration']:history.append({'outputFrame':f,'time':f/FPS,'nativeFrame':index})
for action in [nodes.animation_data.action]:
    for layer in action.layers:
        for strip in layer.strips:
            if not hasattr(strip,'channelbags'):continue
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points:key.interpolation='CONSTANT'
assert all(a['nativeFrame']<=b['nativeFrame'] for a,b in zip(history,history[1:]))
assert history[0]['nativeFrame']==0 and history[-1]['nativeFrame']==11
audit={'sourceBlend':'restless-friend-v3.blend','outputBlend':'restless-friend-v4.blend','actor':'CHR_ada','singlePass':True,'nativeFrameRestarts':0,'anchor':anchor,'penStrokeTimes':[anchor+x for x in play['writingStrokes']],'firstSettledAt':anchor+play['cues'][-1]['at'],'frames':history}
(OUT/'doctor-once-audit-v4.json').write_text(json.dumps(audit,indent=2)+'\n')
S.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'restless-friend-v4.blend'))
S.render.threads_mode='FIXED';S.render.threads=4
for t in [4.6,5.75,6.3,7.8,9.3]:
    S.frame_set(round(t*FPS)+1);p=OUT/'stills-v4'/f'{t:06.2f}.png';p.parent.mkdir(exist_ok=True);S.render.filepath=str(p);bpy.ops.render.render(write_still=True)
frames=OUT/'frames-v4'
for row in history:
    file=frames/f'{row["outputFrame"]:05}.png'
    if file.exists():continue
    S.frame_set(row['outputFrame']+1);S.render.filepath=str(file);bpy.ops.render.render(write_still=True)
print(json.dumps({'singlePass':True,'sourceFrameRestarts':0,'changedFrames':len(history),'complete':True}))
