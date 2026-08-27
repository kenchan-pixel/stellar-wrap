(() => {
'use strict';

const STATUS_EVENT='OFFLINE_STATUS';
const STARTUP_TIMEOUT=9000;
const FALLBACK_SYSTEMS=[
  {id:'SOL',name:'地球近軌',p:[0,0,0],m:[42,116]},
  {id:'LUNA',name:'月環基地',p:[1.4,2.4,.5],m:[92,58]},
  {id:'VEGA',name:'織女星門',p:[5.2,3.1,1.4],m:[162,82]},
  {id:'CYG',name:'天鵝航標',p:[9.1,5.6,2.3],m:[238,43]},
  {id:'ORION',name:'獵戶前哨',p:[12.2,1.2,3.2],m:[287,104]},
  {id:'TAU',name:'金牛塵海',p:[9.5,-4.0,1.7],m:[244,177]},
  {id:'SIRIUS',name:'天狼中繼站',p:[4.4,-3.4,-.9],m:[153,176]},
  {id:'PROX',name:'比鄰星港',p:[1.5,-1.8,-2.4],m:[76,178]}
];
const MAX_LEG=6.0;
let cacheReady=false;
let uiReady=false;
let lastStatus='';
let fallbackActive=false;

function secureEnough(){
  return location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
}

function webglAvailable(){
  try{
    const canvas=document.createElement('canvas');
    return !!(canvas.getContext('webgl2')||canvas.getContext('webgl')||canvas.getContext('experimental-webgl'));
  }catch{return false}
}

function dist(a,b){return Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1],a.p[2]-b.p[2])}
function fallbackPlan(from,to){
  const graph={},byId=Object.fromEntries(FALLBACK_SYSTEMS.map(system=>[system.id,system]));
  FALLBACK_SYSTEMS.forEach(a=>{graph[a.id]=FALLBACK_SYSTEMS.filter(b=>a!==b&&dist(a,b)<=MAX_LEG+.001).map(b=>[b.id,dist(a,b)])});
  const queue=new Set(FALLBACK_SYSTEMS.map(system=>system.id)),cost={},prev={};
  FALLBACK_SYSTEMS.forEach(system=>cost[system.id]=Infinity);cost[from]=0;
  while(queue.size){
    let current=null;for(const id of queue)if(current===null||cost[id]<cost[current])current=id;
    if(current===null||!Number.isFinite(cost[current]))break;
    queue.delete(current);if(current===to)break;
    for(const[next,weight]of graph[current])if(queue.has(next)&&cost[current]+weight<cost[next]){cost[next]=cost[current]+weight;prev[next]=current}
  }
  if(!Number.isFinite(cost[to])||!byId[to])return[];
  const route=[];for(let id=to;id;id=prev[id]){route.unshift(id);if(id===from)break}
  return route[0]===from?route:[];
}

function ensureUi(){
  if(uiReady&&document.querySelector('#offlineStatus'))return true;
  const settings=document.querySelector('.settings');
  if(!settings)return false;
  const card=document.createElement('div');
  card.id='offlineStatus';
  card.className='setting wide';
  card.setAttribute('aria-label','離線啟動狀態');
  card.innerHTML='<label><span>離線啟動</span><output id="offlineState">準備中</output></label><div id="offlineNote" class="qualityNote">首次連線後會保存核心程式及固定版本 3D 引擎，之後可在沒有網絡時重新開啟。</div>';
  settings.append(card);
  uiReady=true;
  renderStatus();
  return true;
}

function renderStatus(){
  if(!ensureUi()&&!uiReady)return;
  const state=document.querySelector('#offlineState');
  const note=document.querySelector('#offlineNote');
  if(!state||!note)return;
  let label='準備中';
  let detail='首次連線後會保存核心程式及固定版本 3D 引擎，之後可在沒有網絡時重新開啟。';
  if(!('serviceWorker' in navigator)){
    label='不支援';
    detail='此瀏覽器不支援 Service Worker；仍可正常在線使用。';
  }else if(!secureEnough()){
    label='需 HTTPS';
    detail='離線快取只會在 HTTPS 或 localhost 啟用。';
  }else if(cacheReady&&navigator.onLine){
    label='已準備';
    detail='核心程式及 Three.js 已有本機快取；斷網後重新開啟會使用最近成功版本。';
  }else if(cacheReady&&!navigator.onLine){
    label='離線可用';
    detail='目前沒有網絡；正在使用已保存的核心程式與 3D 引擎。';
  }else if(!navigator.onLine){
    label='未準備';
    detail='目前離線，而且此裝置尚未完成首次快取；請先連線成功開啟一次。';
  }else if(lastStatus==='error'){
    label='未完成';
    detail='離線快取未能完成；在線航行不受影響，可稍後重新載入再試。';
  }
  state.textContent=label;
  note.textContent=detail;
}

function ensureFallbackStyle(){
  if(document.querySelector('#fallbackStyle'))return;
  const style=document.createElement('style');style.id='fallbackStyle';
  style.textContent='#loading.fallbackShell{display:block;overflow:auto;padding:max(18px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(22px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));text-align:left;background:radial-gradient(circle at 50% 20%,#101c37 0,#050914 42%,#02040a 78%)}.fallbackInner{width:min(100%,520px);margin:0 auto}.fallbackKicker{font-size:9px;letter-spacing:.15em;color:#a9c9f7;font-weight:850}.fallbackTitle{display:block;margin-top:6px;font-size:20px;line-height:1.18}.fallbackCopy{margin:8px 0 12px;color:rgba(226,237,255,.72);font-size:11px;line-height:1.55}.fallbackMapWrap{border:1px solid rgba(188,215,255,.18);border-radius:16px;background:rgba(6,12,26,.78);padding:8px}.fallbackMap{width:100%;height:auto;display:block}.fallbackEdge{stroke:rgba(166,202,248,.19);stroke-width:1.2}.fallbackNode circle{fill:#0b1429;stroke:#a9c9f7;stroke-width:1}.fallbackNode text{fill:#eaf3ff;font-size:8px;text-anchor:middle;paint-order:stroke;stroke:#050914;stroke-width:2px}.fallbackNode.active circle{fill:#eaf3ff;stroke:#fff}.fallbackNode.active text{font-weight:800}.fallbackControls{display:grid;gap:8px;margin-top:10px}.fallbackControls label{font-size:9px;color:rgba(226,237,255,.6)}.fallbackControls select{width:100%;min-height:44px;margin-top:5px;border:1px solid rgba(188,215,255,.22);border-radius:12px;background:#0a1223;color:#f3f8ff;padding:0 12px}.fallbackRoute{border:1px solid rgba(188,215,255,.15);border-radius:13px;padding:10px;background:rgba(255,255,255,.035);font-size:10px;line-height:1.5}.fallbackRoute strong{display:block;font-size:12px}.fallbackMeta{margin-top:4px;color:#b9d7ff;font-size:9px}.fallbackActions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}.fallbackActions button{min-height:44px;border:1px solid rgba(190,220,255,.35);border-radius:12px;background:rgba(255,255,255,.07);color:#eef6ff;font-weight:780}.fallbackFoot{margin-top:10px;font-size:9px;line-height:1.5;color:rgba(226,237,255,.5)}';
  document.head.append(style);
}

function showStaticFallback(reason='startup'){
  const app=document.querySelector('#app'),loading=document.querySelector('#loading');
  if(!loading||app?.classList.contains('ready')||fallbackActive)return;
  fallbackActive=true;ensureFallbackStyle();loading.classList.add('fallbackShell');loading.replaceChildren();
  const wrap=document.createElement('div');wrap.className='fallbackInner';
  const kicker=document.createElement('div');kicker.className='fallbackKicker';kicker.textContent='STATIC NAVIGATION FALLBACK';
  const title=document.createElement('strong');title.className='fallbackTitle';title.textContent=reason==='webgl'?'此裝置未能啟動 WebGL 3D':'3D 引擎未能完成啟動';
  const copy=document.createElement('p');copy.className='fallbackCopy';copy.textContent=reason==='webgl'
    ?'你仍可使用靜態星圖查看八個星區及由地球近軌出發的最短航線；3D 航程需要 WebGL。'
    :(navigator.onLine?'你仍可先查看靜態星圖及規劃最短航線，再重新嘗試啟動 3D。':'目前離線而 3D 啟動失敗；靜態星圖仍可使用。');
  const mapWrap=document.createElement('div');mapWrap.className='fallbackMapWrap';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 330 220');svg.setAttribute('class','fallbackMap');svg.setAttribute('role','img');svg.setAttribute('aria-label','八個星區的靜態航線圖');
  const pairs=[];for(let i=0;i<FALLBACK_SYSTEMS.length;i++)for(let j=i+1;j<FALLBACK_SYSTEMS.length;j++)if(dist(FALLBACK_SYSTEMS[i],FALLBACK_SYSTEMS[j])<=MAX_LEG+.001)pairs.push([FALLBACK_SYSTEMS[i],FALLBACK_SYSTEMS[j]]);
  for(const[a,b]of pairs){const line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('x1',a.m[0]);line.setAttribute('y1',a.m[1]);line.setAttribute('x2',b.m[0]);line.setAttribute('y2',b.m[1]);line.setAttribute('class','fallbackEdge');svg.append(line)}
  for(const system of FALLBACK_SYSTEMS){const group=document.createElementNS(svg.namespaceURI,'g');group.setAttribute('class','fallbackNode'+(system.id==='SOL'?' active':''));const circle=document.createElementNS(svg.namespaceURI,'circle');circle.setAttribute('cx',system.m[0]);circle.setAttribute('cy',system.m[1]);circle.setAttribute('r',system.id==='SOL'?5.5:4.2);const text=document.createElementNS(svg.namespaceURI,'text');text.setAttribute('x',system.m[0]);text.setAttribute('y',system.m[1]-8);text.textContent=system.id;group.append(circle,text);svg.append(group)}
  mapWrap.append(svg);
  const controls=document.createElement('div');controls.className='fallbackControls';
  const label=document.createElement('label');label.textContent='由地球近軌規劃目的地';
  const select=document.createElement('select');select.id='fallbackDestination';select.setAttribute('aria-label','靜態模式目的地');
  for(const system of FALLBACK_SYSTEMS.filter(system=>system.id!=='SOL')){const option=document.createElement('option');option.value=system.id;option.textContent=system.name+' · '+system.id;select.append(option)}
  label.append(select);
  const routeBox=document.createElement('div');routeBox.className='fallbackRoute';routeBox.setAttribute('aria-live','polite');
  const renderRoute=()=>{const route=fallbackPlan('SOL',select.value),byId=Object.fromEntries(FALLBACK_SYSTEMS.map(system=>[system.id,system]));let total=0;for(let i=1;i<route.length;i++)total+=dist(byId[route[i-1]],byId[route[i]]);routeBox.replaceChildren();const heading=document.createElement('strong');heading.textContent=route.map(id=>byId[id]?.name||id).join(' → ');const meta=document.createElement('div');meta.className='fallbackMeta';meta.textContent=route.length?`${route.length-1} 段 · ${total.toFixed(2)} LY · 單段上限 ${MAX_LEG.toFixed(1)} LY`:'未找到可用航線';routeBox.append(heading,meta)};
  select.addEventListener('change',renderRoute);renderRoute();controls.append(label,routeBox);
  const actions=document.createElement('div');actions.className='fallbackActions';const retry=document.createElement('button');retry.type='button';retry.textContent='重新嘗試 3D';retry.addEventListener('click',()=>location.reload());actions.append(retry);
  const foot=document.createElement('div');foot.className='fallbackFoot';foot.textContent='靜態模式只提供星圖與路線參考，不會模擬轉向、曲速、抵達或探索；重新啟動成功後會自動回到完整 3D 體驗。';
  wrap.append(kicker,title,copy,mapWrap,controls,actions,foot);loading.append(wrap);
}

function askStatus(worker){
  if(!worker)return;
  try{worker.postMessage({type:STATUS_EVENT})}catch{}
}

async function register(){
  ensureUi();
  if(!('serviceWorker' in navigator)||!secureEnough()){renderStatus();return}
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    const ready=await navigator.serviceWorker.ready;
    lastStatus='registered';
    askStatus(navigator.serviceWorker.controller||ready.active||registration.active||registration.waiting);
  }catch{
    lastStatus='error';
    renderStatus();
  }
}

function startupGuard(){
  const app=document.querySelector('#app');
  if(app?.classList.contains('ready'))return;
  showStaticFallback(navigator.onLine?'startup':'offline');
}

navigator.serviceWorker?.addEventListener?.('message',event=>{
  if(event.data?.type!==STATUS_EVENT)return;
  cacheReady=!!event.data.ready;
  lastStatus=cacheReady?'ready':'partial';
  renderStatus();
});

navigator.serviceWorker?.addEventListener?.('controllerchange',()=>{
  askStatus(navigator.serviceWorker.controller);
});
addEventListener('online',()=>{renderStatus();askStatus(navigator.serviceWorker?.controller)});
addEventListener('offline',renderStatus);

if(webglAvailable())setTimeout(startupGuard,STARTUP_TIMEOUT);
else setTimeout(()=>showStaticFallback('webgl'),0);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',register,{once:true});
else register();

window.WarpOffline={
  ready(){return cacheReady},
  refresh(){askStatus(navigator.serviceWorker?.controller)}
};
window.WarpFallback={
  active(){return fallbackActive},
  webglAvailable,
  plan(destination){return fallbackPlan('SOL',destination)}
};
})();