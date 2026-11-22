"""Frame-aligned full-film edit. All story placement remains in the manifest."""
from pathlib import Path
import json,re
B=Path('episodes/immortal');T=json.loads((B/'dialogue-timeline.json').read_text());L={x['id']:x for x in T['lines']};D=T['duration']
def normal(s):return re.sub('[^a-z0-9]','',s.lower())
def start(id):return L[id]['start']
def word(id,token,n=0):return [w['start']for w in L[id]['words']if normal(w['text'])==normal(token)][n]
shots=[]
def put(id,at,place,action,anchor,description,cue=None):
 row={'id':id,'start':round(at*30)/30,'set':place,'action':action,'anchor':anchor,'description':description}
 if cue:row['stage']=cue
 shots.append(row)
def a(id,x=0,y=0,z=.5,flip=False,scale=1,**kw):return {'id':id,'x':x,'y':y,'z':z,'flip':flip,'scale':scale,**kw}
def prop(type,x=0,y=0,z=.6,**kw):return {'type':type,'x':x,'y':y,'z':z,**kw}
def scene(id,line,bg,actors=(),props=(),cam=(0,1.45,1.08),year=None,at=None,desc='',plate=None,**kw):
 cue={'background':bg,'actors':list(actors),'props':list(props),'camera':list(cam),**kw}
 if year:cue['year']=str(year)
 if plate:cue['plate']=plate
 put(id,start(line)if at is None else at,'immortal-'+kw.pop('location',{'farmhouse':'home','farmhouseReverse':'home','winter':'farm','plague':'village','parish':'office','market':'market','portraitStudio':'studio','photoStudio':'studio','border':'border','bench':'gate','airport':'airport','airportReverse':'airport','farm':'farm','farmSide':'farm','forest':'forest','hut':'hut'}.get(bg,'home')),'meet',L[line]['text'].split('.')[0]or line,desc or L[line]['text'],cue)
# Opening, retaining the approved scanner/catch staging.
for row in [
 ('scanner',0,'immortal-airport','scan','Sir','A moving tray trips the scanner while the matching faces appear on the monitor.'),
 ('portrait',max(.8,word('a01','painting')-.45),'immortal-airport','reveal','From 1650','The same face in a1650 painting fills the unframed comparison panel.'),
 ('excuse',start('a02'),'immortal-airport','puzzle','Would you believe','Norbert tries the twin excuse.'),
 ('officer',start('a03'),'immortal-airport','warn','The painting is','The officer points to the museum record.'),
 ('rock-belt',start('a04'),'immortal-airport','catch',"You've survived",'Your passport moves through security while the officer checks the impossible portrait match.'),
 ('explain',start('a05'),'immortal-airport','turn','Okay','He turns toward us and takes us back a long time.'),
 ('farm-wide',start('d01'),'immortal-farm','harvest','Italy The year','A stubborn turnip comes free in the warm Ravenna field.'),
 ('farm-work',word('d01','farming'),'immortal-farm','harvest','farming with','Marcus takes the basket as Norbert finishes one harvest action.'),
 ('messenger',start('d02'),'immortal-farm','step',"They've overthrown",'A messenger interrupts their work.'),
 ('turnips',start('d03'),'immortal-farm','puzzle','Is that bad','Marcus asks whether the news is bad for them.'),
 ('cart',start('d05'),'immortal-farm','catch','The empire is falling','Imperial news matters less than the approaching wolf.'),
 ('chase',word('d05','night'),'immortal-forest','chase','That night','Norbert runs right toward the lit hut, facing his direction of travel.'),
 ('door',word('d05','straight'),'immortal-hut','stop','straight into','He enters from the right and runs left, then stops.'),
 ('witch',start('d06'),'immortal-hut','meet',"You're terrified",'The witch greets him with naturally open eyes in a still room.'),
 ('age-joke',start('d07'),'immortal-hut','puzzle',"I'm 22",'Norbert catches his breath.'),
 ('age-context',start('d08'),'immortal-farm','harvest',"He isn't actually",'An older farmer works comfortably in the field.'),
 ('wolf-door',word('d08','wolf'),'immortal-forest','warn','But the wolf','The wolf sniffs at a securely closed door.'),
 ('contract',start('d09'),'immortal-hut','reveal','I can fix','The witch offers her parchment once.'),
 ('terms',word('d09','when'),'immortal-hut','choose','when you least','Norbert listens in the stable wide room.'),
 ('question',word('d09','Had'),'immortal-hut','choose','Had enough','Open-eyed attentive close-up for the recurring question.'),
 ('signature',start('d10'),'immortal-hut','sign','I will never','The nib contacts the same physical paper while he signs.'),
]:put(*row)
scene('pact-consequence','d11','signing',plate='signing-scene',plateFrame=7,cam=(0,1.35,1),location='hut',desc='Your signed pact remains in your hands as we hear that without it you would have died centuries ago.')
scene('pact-no-age','d11','hut',[a('norbert-476-neutral',1.5),a('witch-alert-neutral',-1.4,flip=True)],cam=(0,1.55,1.1),at=word('d11','Now'),desc='He remains young; the witch watches the bargain take effect in the still room.')
put('healing',word('d11','And')-.1,'immortal-hut','treat','And wounds heal','A small hand scratch closes exactly as healing is named.')
put('fees',word('d11','check'),'immortal-hut','archive','You check for','He studies the same signed sheet in candlelight.')
scene('handoff','d12','hut',[a('witch-alert-talk',-1.35,flip=True),a('norbert-476-neutral',1.45)],cam=(0,1.55,1.12),desc='The witch explains that healing does not prevent pain.')
scene('pain-reaction','d13','hut',[a('norbert-medieval-talk',1.1)],cam=(1.1,1.7,1.36),desc='You look at the healed hand and question the missing detail.')
scene('listener','d14','hut',[a('witch-alert-talk',-.8,flip=True)],cam=(-.8,1.75,1.35),desc='She reminds you about the wolf still outside.')
# Marcus ages in the same location while Norbert remains22.
scene('forever-cuts','m01','farmSide',[a('norbert-476-neutral',-1),a('marcus-neutral',1.4,flip=True)],cam=(-.3,1.4,1.12),desc='Norbert checks his healed hand; Marcus keeps harvesting.')
scene('winters-pass','m01','winter',[a('norbert-476-neutral',-1),a('marcus-age-back',1.4,flip=True)],cam=(0,1.45,1.08),at=word('m01','Winters'),desc='The identical field now lies under snow; Norbert is unchanged.')
scene('bad-back','m01','farmSide',[a('norbert-476-neutral',-1.5),a('marcus-aching-back',1,flip=True)],cam=(.5,1.5,1.25),at=word('m01','Marcus'),desc='Marcus tries to straighten up and presses his lower back.')
scene('skincare','m02','farmSide',[a('marcus-age-back',.7,flip=True),a('norbert-476-neutral',-1.5)],cam=(.6,1.7,1.38))
scene('turnip-answer','m03','farmSide',[a('norbert-476-neutral',-1)],cam=(-.9,1.7,1.4),desc='Your turnip answer plays against the already-painted crop field, with no floating prop.')
scene('help-basket','m04','farmSide',[a('norbert-476-neutral',-1.3),a('marcus-age-basket',1.25,flip=True)],cam=(0,1.45,1.1),desc='The basket already held in Marcus’s artwork is now too heavy for him alone.')
scene('old-marcus','m04','farmhouse',[a('marcus-age-old',1.3,flip=True),a('norbert-476-neutral',-1.5)],props=[prop('chair',1.3)],cam=(0,1.55,1.12),at=word('m04','Then',1),desc='Marcus waits indoors with a walking stick, missing from the field.')
scene('bedside-marcus','m05','bedside',cam=(0,1.35,1),plate='bedside-motion',desc='Marcus and Norbert hold hands at the bedside; Marcus speaks quietly.')
scene('bedside-norbert','m06','bedside',cam=(0,1.35,1),plate='bedside-motion',plateFrame=7,desc='Norbert stays with him rather than cutting away from the reply.')
scene('marcus-gone','m07','twoCups',plate='two-cups-motion',plateFrame=0,cam=(0,1.35,1),year=531,desc='The empty breakfast place remains beside unchanged young Norbert.')
scene('second-cup','m07','twoCups',cam=(0,1.35,1),at=word('m07','set'),plate='two-cups-motion',desc='Norbert sets the second cup down, sees the empty place and stops.')
scene('no-more-friends','m08','farmhouseReverse',[a('viewer-medieval-grief',-.4)],props=[prop('chair',-.4),prop('travelBag',1.2)],cam=(-.2,1.5,1.22),desc='He closes himself off, sitting alone beside a packed bag.')
scene('new-village','m09','plague',[a('norbert-medieval-neutral',-2.3,endX=.1,walk=True)],cam=(0,1.45,1.08),desc='He walks into another village, same face in new clothes.')
scene('new-job','m09','parish',[a('norbert-medieval-write',-.8)],props=[prop('desk',.6),prop('book',.6,1.45)],cam=(0,1.45,1.1),at=word('m09','New',1),desc='A different job at another desk, at another desk.')
scene('same-chair','m09','twoCups',plate='two-cups-motion',plateFrame=7,cam=(0,1.35,1),at=word('m09','Same'),desc='The same empty chair and untouched cup follow him in memory.')
scene('haystack-witch','m10','farmSide',[a('witch-alert-talk',1.1,flip=True),a('norbert-476-neutral',-1.4)],cam=(0,1.6,1.17),desc='The witch reappears in the field, fully visible, and asks once.')
scene('nope','m11','farmSide',[a('norbert-476-neutral',-.8)],cam=(-.8,1.8,1.45))
scene('continent-coughs','m12','plague',[a('norbert-medieval-water',-.7),a('period-support-priest',2,flip=True)],cam=(0,1.45,1.06),year=1348,desc='A bucket enters a quieter, shuttered street.')
# Black Death: useful actions, without gore or a plague-doctor anachronism.
scene('plague-water','b01','plague',[a('norbert-medieval-water',-2,endX=-.3,walk=True)],props=[],cam=(0,1.45,1.08),desc='He carries water through the deserted lane to a neighbour\'s door.')
scene('no-fever','b01','plague',[a('norbert-medieval-neutral',-.5)],cam=(-.5,1.8,1.42),at=word('b01','You',1),desc='He checks his forehead; no fever arrives.')
scene('priest-accuses','b02','plague',[a('period-support-priest',1.1,flip=True),a('norbert-medieval-neutral',-1.4)],cam=(.35,1.65,1.25))
scene('technically-yes','b03','plague',[a('norbert-medieval-talk',-.7)],cam=(-.7,1.7,1.45))
scene('burial-list','b04','parish',[a('norbert-medieval-write',-.6)],props=[prop('desk',.5),prop('ledger',.5,1.46,text='J. Smith')],cam=(0,1.45,1.1),desc='He writes his name on a burial list, not on a decorative label.')
scene('coat-stretcher','b04','plague',props=[prop('stretcher',.3),prop('coat',-1.85,.08,z=.9)],cam=(0,1.2,1.1),at=word('b04','leave'),desc='A coat lies next to a fully covered stretcher, with no body details visible.')
scene('slips-away','b04','plague',[a('norbert-medieval-neutral',-.7,endX=3.8,walk=True)],cam=(.5,1.45,1.08),at=word('b04','slip'),desc='He quietly leaves through a side lane.')
scene('nobody-follows','b05','plague',[a('norbert-medieval-neutral',1.3,flip=True)],props=[prop('bucket',-2.4)],cam=(.25,1.4,1.08),desc='He waits by the lane entrance; the doorway remains empty.',hold=True)
scene('witch-waits','b06','plague',[a('witch-alert-kind',-1.35),a('norbert-medieval-neutral',1.3,flip=True)],cam=(.15,1.55,1.14),desc='The witch asks softly; you look away during the deliberate pause.',hold=True)
scene('not-yet-1348','b07','plague',[a('norbert-medieval-talk',.7,flip=True)],props=[],cam=(.7,1.65,1.42))
scene('cannot-go-back','b08','plague',[a('norbert-medieval-neutral',1.3,endX=3.7,walk=True)],cam=(.6,1.45,1.06),desc='He chooses the road away from the empty village.')
scene('register-closes','b08','parish',props=[prop('ledger',0,1.46,text='1538'),prop('desk',0)],cam=(.4,1.65,2.1),at=word('b08','And'),desc='An official book closes the escape route into the next era.',tilt=12)
# Paperwork comedy: readable in-world names, separate desk and face shots.
scene('parish-1538','p01','parish',[a('period-support-clerk',1.5,flip=True),a('norbert-medieval-neutral',-1.6)],props=[prop('desk',.5),prop('ledger',.5,1.46,text='1538')],year=1538,desc='A clerk opens the parish register and waits with a pen.')
scene('register-entries','p01','parish',props=[prop('ledger',0,1.46,text='1538'),prop('desk',0)],cam=(.45,1.65,2.1),at=word('p01','baptisms'),desc='The close register page and its dated entries make the new paper trail visible.',tilt=12)
scene('past-in-a-book','p01','parish',[a('norbert-medieval-neutral',-.8)],props=[prop('ledger',1.6,1.46),prop('desk',1.6)],cam=(-.2,1.6,1.3),at=word('p01','Now'),desc='His unchanged face meets the waiting register.')
scene('name-date-parents','p02','parish',[a('period-support-clerk',.8,flip=True)],props=[prop('desk',.6),prop('ledger',.5,1.46)],cam=(.6,1.65,1.36))
scene('tuesday-yes','p03','parish',[a('norbert-medieval-talk',-.7)],cam=(-.7,1.7,1.4))
scene('surname','p04','parish',[a('period-support-clerk',.8,flip=True)],props=[prop('desk',.5)],cam=(.7,1.7,1.4))
scene('norbertus','p05','parish',props=[prop('ledger',0,1.46,text='John Smith'),prop('desk',0)],cam=(.45,1.65,2.1),tilt=12)
scene('norbert-the-second','p05','parish',props=[prop('ledger',0,1.46,text='John Smith II'),prop('desk',0)],cam=(.45,1.65,2.1),at=word('p05','Then'),desc='Another page reveals a painfully similar identity.',tilt=12)
scene('norbertson','p06','parish',[a('period-support-clerk',1.1,flip=True)],props=[prop('desk',.35),prop('ledger',.1,1.46,text='John Smith III')],cam=(.4,1.65,1.3))
scene('family-tradition','p07','parish',[a('norbert-medieval-talk',-.65)],cam=(-.65,1.7,1.4))
scene('new-name','p08','parish',[a('norbert-medieval-neutral',-1.3,endX=-3.8,walk=True)],props=[prop('desk',1.25),prop('ledger',1.1,1.46,text='John Smith III')],cam=(0,1.45,1.1))
scene('next-mistake','p08','portraitStudio',props=[prop('easel',.7),prop('blankCanvas',.7,1.9)],cam=(.3,1.55,1.2),at=word('p08','Unfortunately'),desc='An empty canvas waits in the next studio.')
# Anna makes ordinary future plans feel risky.
scene('amsterdam-1650','t01','market',[a('viewer-1650-talk',-1.5),a('anna-market',1.1,flip=True)],props=[],year=1650,desc='They bargain over a real turnip in the warm canal market.')
scene('anna-wins','t01','market',[a('anna-laugh',.9,flip=True),a('viewer-1650-talk',-1.2)],at=word('t01','She'),cam=(0,1.55,1.15),desc='Anna wins the argument; you laugh before remembering your rule.')
scene('stay-a-while','t02','market',[a('anna-talk',.8,flip=True),a('viewer-1650-talk',-1.3)],cam=(.5,1.65,1.3))
scene('through-a-lot','t03','market',[a('viewer-1650-talk',-.7)],props=[],cam=(-.7,1.7,1.4))
scene('he-can-come','t04','market',[a('anna-laugh',.7,flip=True)],cam=(.7,1.7,1.4))
scene('next-week','t05','market',[a('viewer-1650-talk',-1),a('anna-laugh',1.2,flip=True)],props=[prop('marketStall',1.4),prop('basket',1.3,.9)],cam=(0,1.45,1.08),desc='She shows him the next market day; he stays instead of leaving.')
scene('portrait-for-me','t06','portraitStudio',[a('anna-talk',1.25,flip=True),a('viewer-1650-talk',-1.4)],props=[prop('easel',.2),prop('blankCanvas',.2,1.9)],cam=(0,1.55,1.12))
scene('dont-move','t07','portraitStudio',[a('period-support-photographer',-1.8),a('viewer-1650-talk',1.5)],props=[prop('easel',-.2),prop('canvasBack',-.2,1.9)],cam=(0,1.6,1.12),desc='Painter studies his seated subject across a stable easel.')
scene('how-long','t08','portraitStudio',[a('viewer-1650-talk',.8)],cam=(.8,1.7,1.4))
scene('painter-yes','t09','portraitStudio',[a('period-support-photographer',-.7)],props=[prop('palette',-.1,1.3)],cam=(-.6,1.7,1.4))
scene('finished-portrait','t10','portraitStudio',props=[prop('easel',0),prop('portrait',0,1.95)],cam=(0,1.8,1.2),desc='The exact1650 portrait from the airport is finished.')
scene('ten-years','t11','portraitStudio',[a('anna-talk',.7,flip=True),a('viewer-1650-talk',-1.3,frame=0)],cam=(.3,1.7,1.32),desc='Anna asks whether you will stay. You cannot give her an answer.',hold=True)
scene('remembers-marcus','t12','twoCups',plate='two-cups-motion',plateFrame=7,cam=(0,1.35,1),desc='The exact earlier empty breakfast place returns as his memory of Marcus.')
scene('packs-before-dawn','t12','portraitStudio',[a('viewer-1650-talk',-.6,endX=-4.4,walk=True,frame=0)],props=[prop('easel',1.3),prop('portrait',1.3,1.9)],cam=(0,1.55,1.08),at=word('t12','That'),desc='You leave before dawn. Your portrait stays behind as you leave.')
scene('who-will-see-it','t13','portraitStudio',props=[prop('easel',1.3),prop('portrait',1.3,1.9)],cam=(0,1.55,1.08),desc='You finish the line from offscreen. The portrait remains after you leave.')
scene('museum-portrait','t14','portraitStudio',props=[prop('museumPortrait',0,1.9)],cam=(0,1.85,1.2),desc='The surviving painting appears at museum viewing height.')
# Photography: correct1839 camera, no flash and no later bellows.
scene('daguerre-1839','f01','photoStudio',[a('period-support-photographer',-1.8),a('norbert-industrial-photo',1.5)],props=[prop('camera1839',-.35),prop('smallTable',2.8)],year=1839,desc='A sliding-box camera points at the unchanged face.')
scene('camera-detail','f01','photoStudio',props=[prop('camera1839',0,yaw=-.5)],cam=(0,1.45,1.5),at=word('f01','A'),desc='The brass lens and ground-glass back move into focus.')
scene('comforting-detail','f01','photoStudio',[a('norbert-industrial-photo',.3)],props=[],cam=(.3,1.7,1.35),at=word('f01','You'))
scene('hold-still','f02','photoStudio',[a('period-support-photographer',-1.2)],props=[prop('camera1839',.8)],cam=(0,1.55,1.22))
scene('feather-sneeze','f03','photoStudio',[a('viewer-industrial-talk',.8,frame=0,reaction={'id':'norbert-industrial-sneeze','at':word('f03','sneeze')-start('f03'),'duration':.55})],props=[prop('camera1839',-1.5,yaw=.95),prop('feather',.75,2.12,z=.85,cue=word('f03','sneeze')-start('f03'))],cam=(0,1.6,1.17),desc='A feather brushes your nose; one quick covered sneeze and a brief recoil blur the exposure.')
scene('plate-result','f03','photoStudio',props=[prop('photoPlate',0,1.6)],cam=(0,1.6,1.4),at=word('f03','Everything'),desc='Your face is blurred on the plate while the chair and studio remain sharp.')
scene('do-it-again','f04','photoStudio',[a('norbert-industrial-sneeze',.5)],props=[prop('photoPlate',-1.5,1.45)],cam=(.1,1.7,1.3))
scene('cameras-coming','f05','photoStudio',props=[prop('camera1839',-2),prop('cameraBox',.2),prop('phone',2,1.6)],cam=(0,1.5,1.12),desc='Three camera generations enter one after another; the escape will not last.')
# Passport format changes, then the old question returns in a queue.
scene('before-passports','s01','border',[a('norbert-industrial-passport',-2,endX=.7,walk=True)],props=[prop('travelBag',1.8)],year='BEFORE 1914',desc='You cross freely before a desk blocks the way.')
scene('passport-standard','s01','border',[a('period-support-guard',1.6,flip=True),a('norbert-industrial-passport',-1.5)],props=[prop('desk',.55),prop('passport',.5,1.48)],cam=(0,1.45,1.08),at=word('s01','In'),year=1920,desc='The new standard booklet lands on the official\'s desk.')
scene('papers','s02','border',[a('period-support-guard',1.1,flip=True)],props=[prop('desk',.7)],cam=(.8,1.7,1.35))
scene('out-of-date','s03','border',[a('norbert-industrial-passport',-.7)],cam=(-.7,1.7,1.35))
scene('date-of-birth','s04','border',[a('period-support-guard',1.1,flip=True)],props=[prop('desk',.7),prop('passport',.55,1.48,text='DATE OF BIRTH')],cam=(.5,1.65,1.3))
scene('short-answer','s05','border',[a('norbert-industrial-passport',-.7)],cam=(-.7,1.7,1.4))
scene('witch-in-queue','s06','border',[a('witch-alert-neutral',-.9,endX=-.4,walk=True),a('norbert-industrial-passport',1.4,flip=True)],cam=(0,1.55,1.12))
scene('had-enough-1920','s07','border',[a('witch-alert-talk',-.5)],cam=(-.5,1.8,1.42))
scene('getting-close','s08','border',[a('norbert-industrial-passport',.7,flip=True)],cam=(.7,1.7,1.4))
scene('same-face-photo','s09','border',props=[prop('passport',0,1.5,text='J. Smith'),prop('desk',0)],cam=(0,1.6,2.6),tilt=15,desc='The printed photograph keeps the question alive.')
# Modern recognition closes around him before the exact return to the hook.
scene('everybodys-camera','r01','airportReverse',[a('norbert-modern-neutral',-.8)],props=[prop('phone',-2,1.8),prop('phone',1.8,1.9),prop('phone',.5,3.1)],cam=(0,1.55,1.12),year=2026,desc='A holiday clip, group photo and family-tree match close in on the same face.')
scene('tagged-photo','r01','airportReverse',props=[prop('socialPhoto',0,1.7)],cam=(0,1.7,1.3),at=word('r01','tagged'),desc='A group image tags his face across the centuries.')
scene('family-tree','r01','airportReverse',props=[prop('familyTree',0,1.8)],cam=(0,1.8,1.25),at=word('r01','familytree'),desc='The family-tree branches connect the same portrait to itself.')
scene('own-ancestor','r02','airportReverse',[a('norbert-talk',0,flip=True)],props=[prop('phone',1.8,1.65)],cam=(0,1.65,1.3))
scene('airport-return','r03','airport',props=[],cam=(.2,1.55,1.26),desc='The exact original scanner and portrait monitor return at the checkpoint.')
scene('passport-return','r03','airport',props=[prop('desk',0),prop('passport',0,1.48,text='J. Smith')],cam=(0,1.6,2.3),tilt=15,at=word('r03','passport'),desc='Your passport and unchanged face return to the desk.')
scene('explain-this','r04','airport',[a('officer-talk',.6)],cam=(.6,1.8,1.45))
scene('had-enough-airport','r05','airportReverse',[a('norbert-talk',-.5)],cam=(-.5,1.7,1.42))
scene('cap-reveal','r06','airport',[a('officer-cap-reveal-v3',.5)],cam=(.5,1.8,1.42),desc='The officer removes her cap, revealing the familiar grey forelock.')
scene('fifteen-fifty','r07','airport',[a('officer-cap-reveal-v3',.5,frame=11)],cam=(.5,1.8,1.42),desc='The same witch finally receives the answer she has waited for.')
# The choice is a small, physical decision to sit beside somebody.
scene('so-yes','e01','bench',[a('witch-alert-talk',-1.4),a('norbert-modern-neutral',1.4,flip=True)],cam=(0,1.55,1.14))
scene('kid-interrupts','e02','bench',[a('gate-kid-talk',.7)],cam=(.7,1.3,1.4))
scene('your-age','e03','bench',[a('norbert-talk',-.8)],props=[],cam=(-.65,1.65,1.4),desc='You tell the child your impossible age; the child takes it in stride.')
scene('im-nine','e04','bench',[a('gate-kid-talk',.6)],cam=(.6,1.3,1.4))
scene('kid-makes-room','e05','benchInvitation',plate='bench-invitation-motion',cam=(0,1.35,1),desc='The boy pats an empty place. Norbert starts away, hesitates and looks back.')
scene('norbert-sits','e05','benchGame',plate='viewer-bench-game-motion',plateFrame=0,cam=(0,1.35,1),at=word('e05','Then'),desc='He takes the offered place and turns toward the boy.')
scene('rock-paper-scissors','e06','benchGame',plate='viewer-bench-game-motion',cam=(0,1.35,1),desc='Two different hands show clear rock and scissors, not repetitive writing motions.')
scene('training','e07','benchGame',plate='viewer-bench-game-motion',plateFrame=4,cam=(0,1.35,1))
scene('someone-laughs','e08','benchGame',plate='viewer-bench-game-motion',plateFrame=5,cam=(0,1.35,1),desc='The boy laughs at your winning throw. You laugh with him and stay.')
scene('stopped-living','e09','benchConfession',plate='viewer-bench-confession-motion',cam=(0,1.35,1),desc='A quiet serious seated admission, naturally open eyes and no camera drift.',hold=True)
scene('and-now','e10','bench',[a('witch-alert-kind',.6)],cam=(.6,1.8,1.4))
scene('making-friends','e11','benchGame',plate='viewer-bench-game-motion',plateFrame=7,cam=(0,1.35,1),desc='His answer is grounded in the child still sitting beside him.',hold=True)
scene('auto-renews','e12','bench',[a('witch-alert-scroll',.7)],props=[],cam=(.4,1.75,1.35),desc='The witch taps the contract once and leaves them to the game.')
scene('plans-tomorrow','e13','benchGame',plate='viewer-bench-game-motion',plateFrame=7,cam=(0,1.35,1),desc='Tomorrow matters again; a boarding screen glows in the distant terminal.')
scene('whats-your-name','e14','benchGame',plate='viewer-bench-game-motion',plateFrame=7,cam=(0,1.35,1),desc='Still seated beside you, the boy asks for another round.')
scene('got-time','e15','benchGame',plate='viewer-bench-game-motion',plateFrame=7,cam=(0,1.35,1),desc='You accept another round instead of planning your escape.')
scene('game-continues','e15','benchGame',plate='viewer-bench-game-motion',cam=(0,1.35,1),at=L['e15']['end']+.2,desc='You stay for another round. The warm music resolves.',hold=True)
for i,s in enumerate(shots):
 end=shots[i+1]['start']if i+1<len(shots)else D
 if end<=s['start']:raise RuntimeError(f"Non-increasing shot {s['id']}: {s['start']} ->{end}")
 s['duration']=round((end-s['start'])*30)/30
E={'portrait':shots[1]['start'],'excuse':start('a02'),'farm':start('d01'),'harvest':word('d01','farming'),'messenger':start('d02'),'wolf':word('d05','wolf'),'door':next(s['start']for s in shots if s['id']=='door')+.75,'contract':start('d09'),'question':word('d09','Had'),'sign':start('d10')+.24,'heal':word('d11','wounds')-.25,'handoff':start('d12')}
T.update({'title':'What Would Happen If You Became Immortal?','width':1920,'height':1080,'revision':2,'events':E,'shots':shots,'captionWords':[3,6],'chapters':[{'id':c['id'],'year':c.get('year'),'start':start(c['beats'][0]['id'])}for c in json.loads((B/'script-v3.json').read_text())['chapters']]})
if (B/'revisions/v2/dialogue-repairs.json').exists():T['revision']=3
(B/'timeline.json').write_text(json.dumps(T,indent=2)+'\n')
episode={'version':1,'id':'immortal','number':12,'title':'What Would Happen If You Became Immortal?','premise':'An immortal\'s centuries of hiding lead to an airport, a child and a choice to make friends again.','fiction':True,'renderer':'hyperframes','world':'immortal','hook':'none','pixelArt':'rpg','closingFade':False,'duration':D,'aspectRatio':'16:9','fps':30,'shadowLeadSeconds':0,'cast':['miko','witch','marcus','anna','gate-kid'],'audio':{'narration':'episodes/immortal/narration.wav','music':'episodes/immortal/music.wav','effects':'episodes/immortal/effects.wav','narrationOffset':0,'narrationTail':2.6,'narrationTrimStart':0,'pauses':[]},'scenes':[{**{k:s[k]for k in ['id','start','duration','set','action','anchor']},'label':s['description'],'timeOfDay':'evening'}for s in shots]}
(B/'episode.json').write_text(json.dumps(episode,indent=2)+'\n')
print(json.dumps({'duration':D,'shots':len(shots),'minimumShot':min(s['duration']for s in shots),'maximumShot':max(s['duration']for s in shots)}))
