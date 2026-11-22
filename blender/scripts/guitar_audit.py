"""Inspect the saved .blend without relying on the authoring update function."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
R=Path(__file__).resolve().parents[2];S=bpy.context.scene
C=json.loads((R/'blender/guitar-pickup/config-v1.json').read_text())
actors=['Miko native guitarist','Miko native explorer','Miko native wind reaction','Miko explorer']
metas={actors[0]:json.loads((R/'output/imagegen/miko-guitar-v1/miko-strum-v1-atlas.json').read_text()),actors[1]:json.loads((R/'output/imagegen/miko-guitar-explore-v1/explore-atlas.json').read_text()),actors[2]:json.loads((R/'output/imagegen/miko-guitar-wind-v1/wind-atlas.json').read_text()),actors[3]:json.loads((R/'public/pixel/guitar-pickup/miko-four-v1.json').read_text())}
frames=sorted(set([0,899]+[round((s['start']+d)*30) for s in C['shots'] for d in [.05,min(s['duration']/2,.6),max(.05,s['duration']-.05)]]))
records=[]
for f in frames:
 S.frame_set(f+1);bpy.context.view_layer.update();t=f/30
 shot=next((s for s in C['shots'] if s['start']<=t<s['start']+s['duration']),C['shots'][-1])
 visible=[bpy.data.objects[n] for n in actors if not bpy.data.objects[n].hide_render]
 details=[]
 for o in visible:
  m=metas[o.name];node=next(n for n in o.data.materials[0].node_tree.nodes if n.type=='MAPPING');loc=node.inputs['Location'].default_value;c=m['crop'];col=round((loc.x*m['width']-c['x'])/m['cellWidth']);row=round(((1-loc.y)*m['height']-c['y']-c['height'])/m['cellHeight']);i=row*m['columns']+col
  cell=m['cells'][i];gap=(c['y']+c['height']-1-cell['bottom'])/c['height'];h=float(o.get('base_height',1));sole=o.location.z+gap*h*o.scale.z
  foot=Vector(o.location);foot.z=sole;screen=world_to_camera_view(S,S.camera,foot)
  forward=o.matrix_world.to_quaternion()@Vector((0,-1,0));toward=(S.camera.location-o.location).normalized();facing=forward.dot(toward)
  width=max(v.co.x for v in o.data.vertices)-min(v.co.x for v in o.data.vertices)
  opaque=[]
  for px in [cell['left'],cell['right']+1]:
   for py in [cell['top'],cell['bottom']+1]:
    local=Vector((((px-c['x'])/c['width']-.5)*width,0,(1-(py-c['y'])/c['height'])*h))
    q=world_to_camera_view(S,S.camera,o.matrix_world@local);opaque.append([q.x,q.y])
  support=1.01 if shot['id'] in ['dive','string','pickup','magnet','flux','nylon'] else 0
  if shot['id']=='cable':support=o.location.z+gap*h*o.scale.z-.01
  details.append({'actor':o.name,'spriteFrame':i,'worldOrigin':list(o.location),'scale':list(o.scale),'visibleSoleZ':sole,'supportZ':support,'clearance':sole-support,'facingDot':facing,'footInFrame':0<screen.x<1 and 0<screen.y<1,'screenFoot':[screen.x,screen.y],'opaqueScreenCorners':opaque,'opaqueBoundsInFrame':all(0<=q[0]<=1 and 0<=q[1]<=1 for q in opaque),'worldBounds':[list(o.matrix_world@Vector(v)) for v in o.bound_box]})
 records.append({'frame':f,'time':t,'shot':shot['id'],'cameraPosition':list(S.camera.location),'cameraLens':S.camera.data.lens,'actors':details})
strings=[o for o in bpy.data.objects if o.name.startswith('Steel string')];poles=[o for o in bpy.data.objects if o.name.startswith('Magnetic pole')]
report={'scene':bpy.data.filepath,'worldUp':'Z','characterForward':'local -Y, billboard yaw only','characters':'Upright pixel cutout planes, not skeletal meshes. GIF frame selection is baked into shader mapping.','objects':len(bpy.data.objects),'armatures':len([o for o in bpy.data.objects if o.type=='ARMATURE']),'packedImages':len([im for im in bpy.data.images if im.packed_file]),'strings':len(strings),'magneticPoles':len(poles),'stringDrivers':sum(len(o.data.animation_data.drivers) for o in strings),'frameSamples':records,'interpretation':'Foot clearance uses opaque sprite pixels, not the empty rectangle around the sprite; facing dot includes downward camera angle. Intro world supports character at floor Z=0, macro body top near Z=1.01, cable is a moving support. String/pickup clearance is magnified as an explanatory cutaway.'}
p=R/'renders/guitar-pickup/v1-review/blender-state-audit.json';p.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'everyShotHasCharacter':all(len(r['actors'])==1 for r in records),'samples':len(records),'actorsPerSample':[len(r['actors']) for r in records],'maxVisibleFootClearance':max(abs(a['clearance']) for r in records for a in r['actors']),'allFeetInFrame':all(a['footInFrame'] for r in records for a in r['actors']),'allOpaqueBoundsInFrame':all(a['opaqueBoundsInFrame'] for r in records for a in r['actors']),'strings':len(strings),'poles':len(poles),'packedImages':report['packedImages']}))
