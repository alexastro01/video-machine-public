"""Prepare reference composites and finite-action prompts, without API calls."""
from pathlib import Path
from PIL import Image
import json

OUT=Path('output/imagegen/immortal-sample-v1')
B=Path('episodes/immortal')
poses=json.loads((B/'assets/poses-v1.json').read_text())
canvas=Image.new('RGB',(1024,576),'#FF00FF')
for key,height,cx in [('witch-present',510,270),('norbert-476-neutral',455,755)]:
    image=Image.open(Path('public')/poses[key]['file']).convert('RGBA')
    if key.startswith('witch'): image=image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    image=image.resize((round(image.width*height/image.height),height),Image.Resampling.NEAREST)
    canvas.paste(image,(round(cx-image.width/2),550-height),image)
if not (OUT/'rock-handoff-pair-reference.png').exists():
    canvas.save(OUT/'rock-handoff-pair-reference.png')

requests=[
 {'id':'norbert-talk','pose':'norbert-modern-talk','reference':'norbert-modern-talk-reference.png','motion':'He speaks one short hopeful excuse: a few distinct natural mouth openings, a small raised eyebrow, then a hopeful closed-mouth smile. His open hand makes one small questioning gesture and settles. Feet and torso stay planted, no bobbing or repeated waves. Finish the action once.'},
 {'id':'officer-talk','pose':'officer-talk','reference':'officer-talk-reference.png','motion':'The officer gives a short dry professional answer. Her mouth moves naturally, one eyebrow lifts briefly, and the indicated hand settles. Her cap and hair do not change. Feet and torso remain steady. One finite speaking action then a closed-mouth hold, no repeated gestures.'},
 {'id':'norbert-harvest','pose':'norbert-476-harvest','reference':'norbert-476-harvest-reference.png','motion':'One purposeful harvest action: his hands grip the leaves of one small purple-and-ivory turnip below his knees, he braces once, pulls upward, the turnip comes free, and he settles holding the harvested root. Keep his feet planted and pelvis steady. No rhythmic up-and-down bouncing. Draw the recognisable turnip and a few loose dirt crumbs, but no ground or other scenery.'},
 {'id':'marcus-basket','pose':'marcus-basket','reference':'marcus-basket-reference.png','motion':'He holds one believable wicker basket at waist height with both hands. One purple-and-white turnip drops a short distance into it; he absorbs its weight with a small forearm movement, looks up toward a messenger on his right and reacts with raised eyebrows and a short speaking mouth. Torso and feet planted. One action, then settle. No repeated bouncing.'},
 {'id':'norbert-run','pose':'norbert-476-run','reference':'norbert-476-run-reference.png','frameMs':100,'playback':'A short run cycle used only while travelling toward the door, then stop.','motion':'A clean running cycle in place toward the right. Coordinated feet and opposite arms, slight forward lean, anxious eyes, the red scarf follows the running motion. Keep his head size and facial identity fixed. No travelling within the image and no camera move. End in a pose that joins the first running pose so this can be used for a brief continuous run.'},
 {'id':'witch-contract','pose':'witch-present','reference':'witch-present-reference.png','motion':'The familiar witch offers one rolled parchment scroll forward from her waist, begins speaking with a playful knowing face, opens her empty hand in explanation and settles. Keep the parchment roll shape stable and hands in natural contact with it. One gesture, not repeated, feet steady. Do not draw a table or readable writing.'},
 {'id':'norbert-sign','pose':'norbert-476-seated','reference':'norbert-476-seated-reference.png','motion':'Seated upright on an invisible chair, he brings a small quill pen to the height of an invisible table in front of his waist, makes one brief confident signature with his writing hand, lifts the quill and looks up with a pleased smile. Keep the torso and feet steady and writing wrist at the same table height. No bouncing, no loop, no table, paper or scenery drawn.'},
 {'id':'rock-handoff-pair','reference':'rock-handoff-pair-reference.png','worldHeight':3.15,'size':'1024x576','motion':'Preserve BOTH exact characters and outfits: the witch on the left and the red-scarf late-antique traveller on the right. One clear rock handoff. The witch initially holds one small ordinary featureless grey stone, extends her hand toward his waiting palm, places it into his hand, releases her fingers and withdraws her hand. He looks down at the stone, surprised, and she gives a small knowing smile. Their hands make visible physical contact with the same stone. Their feet stay planted and body sizes remain stable. The stone has no face, eyes, mouth or glow. One finite action followed by a settled hold. No other objects, ground, shadows, text or background scenery.'},
 {'id':'hut-camera-arc','background':True,'reference':'witch-hut-interior.png','size':'1024x576','worldHeight':6.8,'motion':None}
]
saved=json.loads((B/'assets/gif-requests.json').read_text()) if (B/'assets/gif-requests.json').exists() else []
selected={r['id']:r for r in saved}
requests=[{**r,**selected.get(r['id'],{})} for r in requests]
requests += [r for r in saved if r['id'] not in {q['id'] for q in requests}]
for request in requests:
    request.setdefault('output',f'output/imagegen/immortal-sample-v1/{request["id"]}/{request["id"]}.gif')
    if request.get('motion'):
        prefix='Native animated GIF. Match the exact reference identity, outfit, proportions, pixel contours and shading. '
        if request['id']=='rock-handoff-pair': prefix='Native animated GIF of the two exact characters in the reference. '
        suffix=' Entire flat pure magenta #FF00FF background. Complete full silhouettes with generous margins. Crisp detailed pixel art, stable faces, no text, labels, floor, shadows, extra figures or camera motion. '
        prompt=B/f'prompts/{request["id"]}.txt'
        if not prompt.exists():prompt.write_text(prefix+request['motion']+suffix+'\n')
(B/'assets/gif-requests.json').write_text(json.dumps(requests,indent=2)+'\n')
print(json.dumps({'characterPerformances':8,'cameraTest':1}))
