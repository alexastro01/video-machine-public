"""Download explicitly selected Commons files, retaining author and license."""
import urllib.request,urllib.parse,json,re,html,time
from pathlib import Path
root=Path('public/episodes/inventions-since-2000/archive')
def strip(s):return re.sub('<[^>]+>','',html.unescape(s or '')).strip()
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'NorbertExplains/1.0 (educational documentary research)'}),timeout=45) as r:return r.read(),r.headers.get('Content-Type','')
chosen={
 'steve-jobs-iphone':'File:Steve Jobs presents iPhone (cropped 3-2).jpg',
 'garrett-camp':'File:Garrett Camp 2018 Headshot Cameron Harris Flickr.jpg',
 'iphone-original':'File:IPhone 1st Gen.svg',
 'charpentier':'File:Emmanuelle Charpentier.jpg',
 'encyclopedia':'File:Encyclopaedia Britannica 15 with 2002.jpg'
}
records=[]
for slug,title in chosen.items():
 try:
  q={'action':'query','format':'json','titles':title,'prop':'imageinfo','iiprop':'url|extmetadata|size','iiurlwidth':1600}
  b,_=get('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(q));p=next(iter(json.loads(b)['query']['pages'].values()));i=p['imageinfo'][0];m=i.get('extmetadata',{});lic=strip(m.get('LicenseShortName',{}).get('value'))
  if not any(x in lic.lower() for x in ['cc by','public domain','cc0']):raise ValueError('License requires review: '+lic)
  url=i.get('thumburl') or i['url'];b,ct=get(url);ext='.png' if 'png' in ct else '.jpg';out=root/(slug+ext);out.write_bytes(b)
  r={'id':slug,'file':str(out),'title':title,'sourcePage':i['descriptionurl'],'downloadUrl':url,'artist':strip(m.get('Artist',{}).get('value')),'credit':strip(m.get('Credit',{}).get('value')),'license':lic,'licenseUrl':strip(m.get('LicenseUrl',{}).get('value')),'description':strip(m.get('ImageDescription',{}).get('value'))[:1000],'transformations':'Editorial crop, scale and framing only.'}
  (root/(slug+'.json')).write_text(json.dumps(r,indent=2)+'\n');records.append({'id':slug,'saved':str(out),'license':lic})
 except Exception as e:records.append({'id':slug,'error':str(e)[:160]})
 time.sleep(1.5)
print(json.dumps(records,indent=2))
