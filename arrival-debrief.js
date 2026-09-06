(() => {
'use strict';

const SYSTEM_NAMES={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
const EXPLORATION={
  LUNA:{target:'#lunaSurvey',label:'月環基地觀測'},
  VEGA:{target:'#vegaSurvey',label:'星門校準觀測'},
  CYG:{target:'#cygBeaconScan',label:'航標訊號三角定位'},
  ORION:{target:'#orionSpectrograph',label:'星雲光譜掃描'},
  TAU:{target:'#tauRingProfiler',label:'行星環共振掃描'},
  SIRIUS:{target:'#siriusRelayCalibration',label:'雙星中繼校準'},
  PROX:{target:'#proxAlignment',label:'星港進場校準'}
};
const IDS=new Set(Object.keys(SYSTEM_NAMES));
let uiReady=false;
let visible=false;
let currentEntry=null;
let orderObserver=null;

function normalise(entry){
  if(!entry||!Array.isArray(entry.route))return null;
  const route=entry.route.filter(id=>IDS.has(id));
  const seconds=Number(entry.seconds),rawDistance=entry.distance;
  if(route.length<2||!Number.isFinite(seconds))return null;
  let distance=null;
  if(rawDistance!==undefined&&rawDistance!==null){distance=Number(rawDistance);if(!Number.isFinite(distance)||distance<=0||distance>10000)return null;distance=Math.round(distance*10)/10}
  return{route,seconds:Math.max(1,Math.min(86400,Math.round(seconds))),...(distance===null?{}:{distance})};
}
function safeArrival(entry){
  const destination=entry?.route?.[entry.route.length-1];
  const api=window.WarpSim;
  let state;
  try{state=api?.state?.()}catch{return false}
  return !!state&&state.current===destination&&state.exploring&&!state.flying&&!state.contextLost;
}
function discoveryAt(destination){
  try{return window.WarpStarAtlas?.snapshot?.().discoveries?.[destination]||''}catch{return''}
}
function placeCard(){
  const card=document.querySelector('#arrivalDebrief');
  if(!card)return false;
  const desc=document.querySelector('#exploreDesc');
  if(desc){
    if(card.previousElementSibling!==desc)desc.insertAdjacentElement('afterend',card);
    return true;
  }
  const actions=document.querySelector('#exploreCard .exploreActions');
  if(actions){actions.insertAdjacentElement('beforebegin',card);return true}
  return false;
}
function revealArrivalSurface(card){
  try{
    const hub=window.WarpExploreHub;
    if(hub?.active?.()&&typeof hub.open==='function'){
      hub.open('overview');
      card?.scrollIntoView?.({block:'nearest'});
      return true;
    }
  }catch{}
  return false;
}
function ensureOrderObserver(){
  if(orderObserver||typeof MutationObserver!=='function')return;
  const parent=document.querySelector('#exploreDesc')?.parentElement;
  if(!parent)return;
  orderObserver=new MutationObserver(()=>placeCard());
  orderObserver.observe(parent,{childList:true});
}
function explorationHandoff(destination){
  const config=EXPLORATION[destination];
  if(!config)return{target:null,label:'自由探索',discovery:''};
  return{...config,discovery:discoveryAt(destination)};
}
function renderRouteRibbon(routeIds){
  const host=document.querySelector('#arrivalDebriefRibbon');
  if(!host)return false;
  host.replaceChildren();
  routeIds.forEach((id,index)=>{
    if(index){const leg=document.createElement('span');leg.className='arrivalDebriefLeg';leg.setAttribute('aria-hidden','true');host.append(leg)}
    const stop=document.createElement('span');stop.className='arrivalDebriefStop'+(index===routeIds.length-1?' destination':'');stop.dataset.system=id;
    const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');
    const label=document.createElement('b');label.textContent=id;
    stop.append(dot,label);host.append(stop);
  });
  host.setAttribute('aria-label','航程路線：'+routeIds.map(id=>SYSTEM_NAMES[id]).join(' 到 '));
  return true;
}
function ensureUi(){
  if(uiReady&&document.querySelector('#arrivalDebrief')){placeCard();ensureOrderObserver();return true}
  const actions=document.querySelector('#exploreCard .exploreActions');
  if(!actions)return false;
  if(!document.querySelector('#arrivalDebriefStyle')){
    const style=document.createElement('style');
    style.id='arrivalDebriefStyle';
    style.textContent='.arrivalDebrief{display:none;margin:8px 0 7px;padding:8px;min-width:0;max-width:100%;overflow:hidden;border:1px solid rgba(105,238,210,.2);border-radius:12px;background:linear-gradient(180deg,rgba(79,191,166,.075),rgba(90,150,224,.04))}.arrivalDebrief.show{display:block}.arrivalDebriefTop{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.arrivalDebriefTitle{font-size:9px;font-weight:820;letter-spacing:.03em}.arrivalDebriefBadge{font-size:7px;color:#91f1dd;white-space:nowrap}.arrivalDebriefStats{margin-top:4px;font-size:8px;line-height:1.4;color:#dceaff}.arrivalDebriefRibbon{display:flex;align-items:flex-start;gap:3px;width:100%;min-width:0;max-width:100%;margin-top:7px;padding:7px 6px;border:1px solid rgba(157,207,255,.12);border-radius:9px;background:rgba(56,113,173,.045);overflow:hidden}.arrivalDebriefStop{flex:1 1 0;min-width:0;text-align:center;color:rgba(213,231,250,.58)}.arrivalDebriefStop i{display:block;width:7px;height:7px;margin:0 auto 4px;border:1px solid rgba(169,214,255,.48);border-radius:50%;background:rgba(93,160,224,.18);box-shadow:0 0 10px rgba(95,180,232,.08)}.arrivalDebriefStop b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:6.5px;letter-spacing:.04em}.arrivalDebriefStop.destination{color:#dffbf4}.arrivalDebriefStop.destination i{border-color:rgba(116,238,210,.8);background:rgba(87,218,186,.5);box-shadow:0 0 12px rgba(88,224,193,.28)}.arrivalDebriefLeg{flex:.55 1 10px;min-width:4px;height:1px;margin-top:3px;background:linear-gradient(90deg,rgba(126,190,239,.22),rgba(100,231,202,.42))}.arrivalDebriefRoute{margin-top:4px;font-size:7px;line-height:1.4;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.arrivalDebriefObjective{margin-top:7px;padding:6px 7px;border:1px solid rgba(141,211,196,.15);border-radius:8px;background:rgba(68,155,140,.055);font-size:8px;line-height:1.4;color:#dff9f3}.arrivalDebriefObjective.done{border-color:rgba(105,238,210,.25);color:#b9f4e6}.arrivalDebriefActions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}.arrivalDebriefActions button{min-height:44px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.045);color:var(--text);font-size:8px;font-weight:760}.arrivalDebriefActions .arrivalPhoto{grid-column:1/-1;border-color:rgba(145,205,255,.34);background:linear-gradient(180deg,rgba(118,180,239,.13),rgba(79,128,193,.07))}.arrivalDebriefActions .arrivalExplore{border-color:rgba(115,229,205,.28);background:rgba(74,180,158,.08)}.arrivalDebriefActions .arrivalNext{border-color:rgba(166,211,255,.3);background:rgba(116,171,235,.09)}';
    document.head.append(style);
  }
  let card=document.querySelector('#arrivalDebrief');
  if(!card){
    card=document.createElement('section');
    card.id='arrivalDebrief';
    card.className='arrivalDebrief';
    card.setAttribute('role','status');
    card.setAttribute('aria-live','polite');
    card.setAttribute('aria-label','航程完成摘要');
    card.innerHTML='<div class="arrivalDebriefTop"><strong id="arrivalDebriefTitle" class="arrivalDebriefTitle">航程完成</strong><span class="arrivalDebriefBadge">ARRIVAL LOG</span></div><div id="arrivalDebriefStats" class="arrivalDebriefStats"></div><div id="arrivalDebriefRibbon" class="arrivalDebriefRibbon" aria-label="航程路線"></div><div id="arrivalDebriefRoute" class="arrivalDebriefRoute"></div><div id="arrivalDebriefObjective" class="arrivalDebriefObjective"></div><div class="arrivalDebriefActions"><button id="arrivalDebriefPhoto" class="arrivalPhoto" type="button">旅程留影</button><button id="arrivalDebriefExplore" class="arrivalExplore" type="button">繼續探索</button><button id="arrivalDebriefNext" class="arrivalNext" type="button">下一目的地</button></div>';
    actions.insertAdjacentElement('beforebegin',card);
    card.querySelector('#arrivalDebriefPhoto').addEventListener('click',openPhotoMode);
    card.querySelector('#arrivalDebriefExplore').addEventListener('click',openExploration);
    card.querySelector('#arrivalDebriefNext').addEventListener('click',()=>{
      hide();
      document.querySelector('#openPanel')?.click();
    });
  }
  uiReady=true;
  placeCard();
  ensureOrderObserver();
  return true;
}
function render(entry){
  if(!ensureUi())return false;
  const destination=entry.route[entry.route.length-1];
  const title=document.querySelector('#arrivalDebriefTitle');
  const stats=document.querySelector('#arrivalDebriefStats');
  const route=document.querySelector('#arrivalDebriefRoute');
  const objective=document.querySelector('#arrivalDebriefObjective');
  const explore=document.querySelector('#arrivalDebriefExplore');
  const photo=document.querySelector('#arrivalDebriefPhoto');
  if(!title||!stats||!route||!objective||!explore||!photo||!renderRouteRibbon(entry.route))return false;
  title.textContent='航程完成 · '+SYSTEM_NAMES[destination];
  const distance=Number.isFinite(entry.distance)?entry.distance.toFixed(1)+' LY':'距離未記錄';
  stats.textContent=`${entry.route.length-1} 段 · ${distance} · ${entry.seconds} 秒活躍航行`;
  route.textContent=entry.route.map(id=>SYSTEM_NAMES[id]).join(' → ');
  photo.textContent='旅程留影 · '+SYSTEM_NAMES[destination];
  const handoff=explorationHandoff(destination);
  objective.classList.toggle('done',!!handoff.discovery);
  if(!EXPLORATION[destination]){
    objective.textContent='母港自由探索 · 可環視地球近軌、地標或進入攝影模式。';
    explore.textContent='自由探索';
  }else if(handoff.discovery){
    objective.textContent=`探索完成 · 已收錄「${handoff.discovery}」`;
    explore.textContent='查看發現';
  }else{
    objective.textContent=`探索目標 · ${handoff.label}尚未完成`;
    explore.textContent='開始探索';
  }
  return true;
}
function show(raw){
  const entry=normalise(raw);
  if(!entry||!safeArrival(entry)||!render(entry))return false;
  currentEntry=entry;
  visible=true;
  placeCard();
  const card=document.querySelector('#arrivalDebrief');
  card?.classList.add('show');
  const exploreCard=document.querySelector('#exploreCard');
  exploreCard?.classList.remove('collapsed');
  revealArrivalSurface(card);
  const collapse=document.querySelector('#exploreCollapse');
  if(collapse)collapse.textContent='⌄';
  return true;
}
function openPhotoMode(){
  if(!currentEntry||!safeArrival(currentEntry))return false;
  const api=window.WarpPhotoMode;
  if(typeof api?.enter!=='function')return false;
  api.enter();
  if(api.active?.()){hide();return true}
  return false;
}
function openExploration(){
  const destination=currentEntry?.route?.[currentEntry.route.length-1];
  const handoff=explorationHandoff(destination);
  hide();
  const target=handoff.target?document.querySelector(handoff.target):null;
  const fallback=document.querySelector('#landmarkGuide')||document.querySelector('#exploreDesc');
  (target||fallback)?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
function hide(){
  visible=false;
  document.querySelector('#arrivalDebrief')?.classList.remove('show');
}
function onJourneyComplete(event){show(event.detail)}
addEventListener('stellarwarp:journey-complete',onJourneyComplete);
addEventListener('stellarwarp:discovery-change',()=>{if(visible&&currentEntry)render(currentEntry)});
document.querySelector('#space')?.addEventListener('webglcontextlost',hide);
ensureUi();
window.WarpArrivalDebrief={
  show(entry){return show(entry)},
  hide,
  visible(){return visible},
  entry(){return currentEntry?{...currentEntry,route:[...currentEntry.route]}:null}
};
import('./discovery-debrief.js').catch(()=>{});
})();
