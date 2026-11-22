"""Fetch source photographs and their license metadata from Wikimedia Commons."""
import urllib.request,urllib.parse,json,re,html,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path('public/episodes/inventions-since-2000/archive');root.mkdir(parents=True,exist_ok=True)
queries={
'jimmy-wales':'Jimmy Wales portrait',
'larry-sanger':'Larry Sanger portrait',
'encyclopedia':'Encyclopaedia Britannica volumes books',
'garrett-camp':'Garrett Camp portrait',
'streetview-car':'Google Street View car',
'steve-jobs-iphone':'Steve Jobs presents iPhone 2007',
'iphone-original':'iPhone 1st generation front',
'doudna':'Jennifer Doudna portrait',
'charpentier':'Emmanuelle Charpentier portrait',
'sickle-cells':'sickle cell red blood cells microscope',
'paper-map':'paper road map folded',
'youtube-camera':'video camera camcorder 2005'
}
def strip(s):return re.sub('<[^>]+>','',html.unescape(s or '')).strip()
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'NorbertExplainsVideoEditor/1.0 (editorial image research)'}),timeout=35) as r:return r.read(),r.headers.get('Content-Type','')
def run(item):
 slug,query=item;record=root/(slug+'.json')
 if record.exists():return json.loads(record.read_text())
 q={'action':'query','format':'json','generator':'search','gsrsearch':query+' filetype:bitmap','gsrnamespace':6,'gsrlimit':6,'prop':'imageinfo','iiprop':'url|extmetadata|size','iiurlwidth':1600}
 try:
  b,_=get('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(q));data=json.loads(b);candidates=[]
  for p in data.get('query',{}).get('pages',{}).values():
   i=p.get('imageinfo',[{}])[0];m=i.get('extmetadata',{});lic=strip(m.get('LicenseShortName',{}).get('value',''))
   if i.get('width',0)<450 or i.get('height',0)<300:continue
   if not any(k in lic.lower() for k in ['cc by','cc0','public domain','pd','attribution']):continue
   candidates.append((p,i,m,lic))
  if not candidates:return {'id':slug,'error':'No suitably sized freely licensed photograph found','query':query}
  p,i,m,lic=candidates[0];url=i.get('thumburl') or i['url'];b,ct=get(url);ext='.png' if 'png' in ct else '.webp' if 'webp' in ct else '.jpg';file=root/(slug+ext);file.write_bytes(b)
  x={'id':slug,'file':str(file),'query':query,'title':p['title'],'sourcePage':i.get('descriptionurl') or 'https://commons.wikimedia.org/wiki/'+urllib.parse.quote(p['title'].replace(' ','_')),'downloadUrl':url,'artist':strip(m.get('Artist',{}).get('value','')),'credit':strip(m.get('Credit',{}).get('value','')),'license':lic,'licenseUrl':strip(m.get('LicenseUrl',{}).get('value','')),'description':strip(m.get('ImageDescription',{}).get('value',''))[:800],'transformations':'Resize for delivery; editorial crop or camera movement only.'};record.write_text(json.dumps(x,indent=2)+'\n');return x
 except Exception as e:return {'id':slug,'error':str(e)[:180]}
with ThreadPoolExecutor(max_workers=3) as pool:out=list(pool.map(run,queries.items()))
Path('episodes/inventions-since-2000/archive-assets.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps([{'id':x['id'],'license':x.get('license'),'file':x.get('file'),'error':x.get('error')} for x in out],indent=2))
