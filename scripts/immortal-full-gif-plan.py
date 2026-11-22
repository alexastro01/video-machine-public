"""Plan finite character performances, conditioned on the four-pose cast."""
from pathlib import Path
from PIL import Image
import json
B=Path('episodes/immortal');O=Path('output/imagegen/immortal-film-v2');F=B/'full';poses={**json.loads((B/'assets/poses-v1.json').read_text()),**json.loads((B/'assets/poses-v2.json').read_text())}
jobs=[]
def actor(id,pose,motion,height=2.8):
 if pose not in poses:return
 ref=O/f'{pose}-reference.png'
 prompt=F/'prompts'/f'{id}.txt';prompt.write_text('Native animated GIF. Preserve the exact reference character identity, outfit, proportions, clean crisp pixel-art contours and detailed shading. '+motion+' Natural open attentive eyes except a single brief blink. One finite action with anticipation, gesture and a settled closed-mouth hold, not rhythmic bouncing. Feet and torso grounded, no camera movement, no scaling, no travelling. Complete full body with generous safety margins including hair, hands and scarf. Flat pure magenta #FF00FF background, no floor, shadows, scenery, labels or text.\n')
 jobs.append({'id':id,'reference':str(ref),'promptFile':str(prompt),'output':str(O/id/f'{id}.gif'),'size':'768x768','frames':12,'frameMs':200,'worldHeight':height,'holdUsd':.55})
actor('witch-alert-talk','witch-alert-talk','She delivers a short playful question: three different natural speaking mouth shapes, a slight raised eyebrow and one open-palm gesture that settles. Keep both eyelids fully raised in the held poses.',3.15)
actor('witch-alert-contract','witch-alert-scroll','She initially holds one rolled parchment, offers it gently forward and explains the deal. Her free hand opens once, then she waits with alert open eyes and a small knowing smile. The same scroll stays in her fingers.',3.15)
actor('witch-alert-kind','witch-alert-kind','A compassionate quiet question. Her small smile softens, the empty open hand lowers slowly, her mouth speaks once and closes. She remains attentive, both eyes open. No eye roll.',3.15)
actor('marcus-aching-back','marcus-age-back','He tries to straighten his back, pauses, presses one hand against the stiff lower back, gives a small rueful sigh, then looks toward his younger friend. One controlled action, no bouncing.')
actor('anna-talk','anna-question','She asks a sincere question. Natural clear mouth movement, eyebrows lift with hope, one small hand gesture then still attentive eye contact. Keep the braided chestnut hair and freckles.')
actor('norbert-medieval-talk','norbert-medieval-neutral','He gives a quick dry answer: one small uncertain side glance, natural mouth shapes, then closed-mouth cautious expression. His red scarf shifts a little and settles.')
actor('norbert-earlymodern-talk','norbert-earlymodern-talk','He gives a confident joke with natural mouth shapes, lifts one hand a little, then his eyes show a trace of doubt as he stops speaking. No repeated waves.')
actor('norbert-industrial-talk','norbert-industrial-rock','He looks down at the small featureless grey stone he offers in his palm, looks back up at the guard, speaks a brief apologetic answer and settles. Keep the stone ordinary and without a face.')
actor('gate-kid-talk','gate-kid-point','The curious boy looks toward a person just off-frame, asks a short question with clear speaking mouth shapes, lowers his pointing hand then gives an easy friendly grin. Full child proportions stay fixed.',2.2)
# A coherent two-person reference replaces the half-lidded handoff source.
if 'witch-alert-neutral'in poses:
 ref=O/'rock-handoff-alert-reference.png';canvas=Image.new('RGB',(1024,576),'#ff00ff')
 for key,h,cx,flip in [('witch-alert-neutral',480,260,True),('norbert-476-neutral',425,755,False)]:
  im=Image.open(Path('public')/poses[key]['file']).convert('RGBA')
  if flip:im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
  im=im.resize((round(im.width*h/im.height),h),Image.Resampling.NEAREST);canvas.paste(im,(round(cx-im.width/2),540-h),im)
 canvas.save(ref);prompt=F/'prompts/rock-handoff-alert.txt';prompt.write_text('Native animated GIF of BOTH exact reference characters. Witch left, young red-scarf traveller right, entire flat pure magenta #FF00FF background. One clear handoff: witch starts holding a single small ordinary featureless grey stone, reaches to his waiting palm, places the same stone into it, releases fingers and draws her hand back. He looks down surprised. Visible natural hand contact, correct wrists, no extra limbs or duplicated rocks. Feet stay planted. BOTH characters have natural open alert eyes in held frames, witch never half-lidded. Stable complete full silhouettes with generous margins. Crisp detailed pixel art matching the reference. One action then held ending, no loop, no scenery, no floor or text.\n')
 jobs.append({'id':'rock-handoff-alert','reference':str(ref),'promptFile':str(prompt),'output':str(O/'rock-handoff-alert/rock-handoff-alert.gif'),'size':'1024x576','frames':12,'frameMs':200,'worldHeight':3.15,'actors':2,'holdUsd':.55})
(F/'gif-jobs.json').write_text(json.dumps(jobs,indent=2)+'\n');print([x['id']for x in jobs])
