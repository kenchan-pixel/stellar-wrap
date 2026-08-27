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
  const landmark=document.querySelector('#landmarkGuide');
  if(landmark){landmark.insertAdjacentElement('beforebegin',card);return true}
  const desc=document.querySelector('#exploreDesc');
  if(desc){desc.insertAdjacentElement('afterend',card);return true}
  const actions=document.querySelector('#exploreCard .exploreActions');
  if(actions){actions.insertAdjacentElement('beforebegin',card);return true}
  return false;
}
function explorationHandoff(destination){
  const config=EXPLORATION[destination];
  if(!config)return{target:null,label:'自由探索',discovery:''};
  return{...config,discovery:discoveryAt(destination)};
}
function ensureUi(){
  if(uiReady&&document.querySelector('#arrivalDebrief'))return true;
  const actions=document.querySelector('#exploreCard .exploreActions');
  if(!actions)return false;
  if(!document.querySelector('#arrivalDebriefStyle')){
    const style=document.createElement('style');
    style.id='arrivalDebriefStyle';
    style.textContent='.arrivalDebrief{display:none;margin:8px 0 7px;padding:8px;border:1px solid rgba(105,238,210,.2);border-radius:12px;background:linear-gradient(180deg,rgba(79,191,166,.075),rgba(90,150,224,.04))}.arrivalDebrief.show{display:block}.arrivalDebriefTop{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.arrivalDebriefTitle{font-size:9px;font-weight:820;letter-spacing:.03em}.arrivalDebriefBadge{font-size:7px;color:#91f1dd;white-space:nowrap}.arrivalDebriefStats{margin-top:4px;font-size:8px;line-height:1.4;color:#dceaff}.arrivalDebriefRoute{margin-top:3px;font-size:7px;line-height:1.4;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.arrivalDebriefObjective{margin-top:7px;padding:6px 7px;border:1px solid rgba(141,211,196,.15);border-radius:8px;background:rgba(68,155,140,.055);font-size:8px;line-height:1.4;color:#dff9f3}.arrivalDebriefObjective.done{border-color:rgba(105,238,210,.25);color:#b9f4e6}.arrivalDebriefActions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}.arrivalDebriefActions button{min-height:44px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.045);color:var(--text);font-size:8px;font-weight:760}.arrivalDebriefActions .arrivalExplore{border-color:rgba(115,229,205,.28);background:rgba(74,180,158,.08)}.arrivalDebriefActions .arrivalNext{border-color:rgba(166,211,255,.3);background:rgba(116,171,235,.09)}';
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
    card.innerHTML='<div class="arrivalDebriefTop"><strong id="arrivalDebriefTitle" class="arrivalDebriefTitle">航程完成</strong><span class="arrivalDebriefBadge">ARRIVAL LOG</span></div><div id="arrivalDebriefStats" class="arrivalDebriefStats"></div><div id="arrivalDebriefRoute" class="arrivalDebriefRoute"></div><div id="arrivalDebriefObjective" class="arrivalDebriefObjective"></div><div class="arrivalDebriefActions"><button id="arrivalDebriefExplore" class="arrivalExplore" type="button">繼續探索</button><button id="arrivalDebriefNext" class="arrivalNext" type="button">下一目的地</button></div>';
    actions.insertAdjacentElement('beforebegin',card);
    card.querySelector('#arrivalDebriefExplore').addEventListener('click',openExploration);
    card.querySelector('#arrivalDebriefNext').addEventListener('click',()=>{
      hide();
      document.querySelector('#openPanel')?.click();
    });
  }
  uiReady=true;
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
  if(!title||!stats||!route||!objective||!explore)return false;
  title.textContent='航程完成 · '+SYSTEM_NAMES[destination];
  const distance=Number.isFinite(entry.distance)?entry.distance.toFixed(1)+' LY':'距離未記錄';
  stats.textContent=`${entry.route.length-1} 段 · ${distance} · ${entry.seconds} 秒活躍航行`;
  route.textContent=entry.route.map(id=>SYSTEM_NAMES[id]).join(' → ');
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
  const collapse=document.querySelector('#exploreCollapse');
  if(collapse)collapse.textContent='⌄';
  return true;
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
})();
