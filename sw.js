const CACHE_PREFIX='stellar-wrap-shell-';
const CACHE_NAME=`${CACHE_PREFIX}v4`;
const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';
const CORE=[
  './',
  './index.html',
  './travel-journal.js',
  './exploration-survey.js',
  './star-atlas.js',
  './vega-survey.js',
  './photo-mode.js',
  './arrival-debrief.js',
  './offline-bootstrap.js'
];

async function openCache(){return caches.open(CACHE_NAME)}

async function cacheThree(cache){
  try{
    const response=await fetch(THREE_URL,{mode:'cors',cache:'reload'});
    if(response.ok)await cache.put(THREE_URL,response.clone());
  }catch{}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await openCache();
    await cache.addAll(CORE);
    await cacheThree(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request){
  const cache=await openCache();
  try{
    const response=await fetch(request);
    if(response&&(response.ok||response.type==='opaque'))await cache.put(request,response.clone());
    return response;
  }catch{
    return (await cache.match(request,{ignoreSearch:true}))||Response.error();
  }
}

async function cacheFirst(request){
  const cache=await openCache();
  const cached=await cache.match(request,{ignoreSearch:true});
  if(cached)return cached;
  try{
    const response=await fetch(request);
    if(response&&(response.ok||response.type==='opaque'))await cache.put(request,response.clone());
    return response;
  }catch{return Response.error()}
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const sameOrigin=url.origin===self.location.origin;
  const isThree=url.href===THREE_URL;
  if(!sameOrigin&&!isThree)return;
  if(event.request.mode==='navigate'){
    event.respondWith(networkFirst(event.request));
    return;
  }
  if(isThree){
    event.respondWith(cacheFirst(event.request));
    return;
  }
  const coreUrl=new URL(event.request.url);
  const inCore=CORE.some(path=>new URL(path,self.registration.scope).pathname===coreUrl.pathname);
  if(inCore)event.respondWith(networkFirst(event.request));
});

async function offlineStatus(){
  const cache=await openCache();
  const local=await Promise.all(CORE.map(path=>cache.match(path)));
  const three=await cache.match(THREE_URL);
  return{ready:local.every(Boolean)&&!!three,localReady:local.every(Boolean),threeReady:!!three};
}

self.addEventListener('message',event=>{
  if(event.data?.type!=='OFFLINE_STATUS')return;
  event.waitUntil((async()=>{
    const status=await offlineStatus();
    event.source?.postMessage({type:'OFFLINE_STATUS',...status});
  })());
});
