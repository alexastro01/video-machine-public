"""Read the baked file independently of the frame-authoring function."""
import bpy,json
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
R=Path(__file__).resolve().parents[2];S=bpy.context.scene;C=json.loads((R/'blender/microwave/config-v1.json').read_text())
files={'Miko four clean poses':'public/pixel/microwave/miko-four-v1.json','Miko native door brace':'output/imagegen/miko-microwave-v1/brace-atlas.json','Miko native exploration':'output/imagegen/miko-guitar-explore-v1/explore-atlas.json','Miko native turntable balance':'output/imagegen/miko-guitar-wind-v1/wind-atlas.json'}
metas={n:json.loads((R/f).read_text()) for n,f in files.items()};frames=sorted(set([0,1349]+[round((s['start']+d)*30) for s in C['shots'] for d in [.05,s['duration']/2,max(.05,s['duration']-.05)]]));rows=[]
for frame in frames:
 S.frame_set(frame+1);bpy.context.view_layer.update();t=frame/30;shot=next((s for s in C['shots'] if s['start']<=t<s['start']+s['duration']),C['shots'][-1]);actors=[]
 for name,m in metas.items():
  o=bpy.data.objects[name]
  if o.hide_render:continue
  c=m['crop'];node=next(n for n in o.data.materials[0].node_tree.nodes if n.type=='MAPPING');loc=node.inputs['Location'].default_value;col=round((loc.x*m['width']-c['x'])/m['cellWidth']);row=round(((1-loc.y)*m['height']-c['y']-c['height'])/m['cellHeight']);idx=row*m['columns']+col;cell=m['cells'][idx];h=o['base_height'];width=max(v.co.x for v in o.data.vertices)-min(v.co.x for v in o.data.vertices);pts=[]
  for px in [cell['left'],cell['right']+1]:
   for py in [cell['top'],cell['bottom']+1]:
    q=world_to_camera_view(S,S.camera,o.matrix_world@Vector((((px-c['x'])/c['width']-.5)*width,0,(1-(py-c['y'])/c['height'])*h)));pts.append([q.x,q.y])
  sole=o.location.z+(c['y']+c['height']-1-cell['bottom'])/c['height']*h*o.scale.z
  support=1.025 if shot['id'] in ['hook','closer','loop'] else 2.0625 if shot['id'] in ['magnetron','feed'] else .42 if shot['id'] in ['dive','soup','hotspots','ride'] else 0
  actors.append({'name':name,'spriteFrame':idx,'location':list(o.location),'opaqueCorners':pts,'boundsInFrame':all(0<=q[0]<=1 and 0<=q[1]<=1 for q in pts),'visibleSole':sole,'support':support,'clearance':sole-support})
 expected=0 if shot['id'] in ['ice','water','field','follow','heat','light'] or (shot['id']=='defrost' and t-shot['start']>2.2) or (shot['id']=='magnetron' and t-shot['start']<.65) else 1
 rows.append({'frame':frame,'seconds':t,'shot':shot['id'],'actors':actors,'expectedActors':expected,'liquidRotations':[bpy.data.objects['Liquid dipole '+str(i)].rotation_euler.y for i in range(9)],'iceRotations':[bpy.data.objects['Ice dipole '+str(i)].rotation_euler.y for i in range(9)]})
report={'scene':bpy.data.filepath,'samples':rows,'objects':len(bpy.data.objects),'packedImages':len([x for x in bpy.data.images if x.packed_file]),'armatures':len([x for x in bpy.data.objects if x.type=='ARMATURE']),'characterType':'Upright lit pixel planes; native GIF UV frames baked as node animation. Z is up.'}
(R/'blender/microwave/saved-state-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'samples':len(rows),'expectedVisibility':all(len(r['actors'])==r['expectedActors'] for r in rows),'allOpaqueBoundsInFrame':all(a['boundsInFrame'] for r in rows for a in r['actors']),'maxFootClearance':max(abs(a['clearance']) for r in rows for a in r['actors']),'packedImages':report['packedImages'],'liquidMaxAngle':max(abs(v) for r in rows for v in r['liquidRotations']),'iceMaxAngle':max(abs(v) for r in rows for v in r['iceRotations'])}))
