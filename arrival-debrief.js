(() => {
'use strict';

const SYSTEM_NAMES={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
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
function expeditionNext(){
  try{const id=window.WarpExpedition?.next?.();return IDS.has(id)?id:null}catch{return null}
}
function ensureUi(){
  if(uiReady&&document.querySelector('#arrivalDebrief'))return true;
  const actions=document.querySelector('#exploreCard .exploreActions');
  if(!actions)return false;
  if(!document.querySelector('#arrivalDebriefStyle')){
    const style=document.createElement('style');
    style.id='arrivalDebriefStyle';
    style.textContent='.arrivalDebrief{display:none;margin:8px 0 7px;padding:8px;border:1px solid rgba(105,238,210,.2);border-radius:12px;background:linear-gradient(180deg,rgba(79,191,166,.075),rgba(90,150,224,.04))}.arrivalDebrief.show{display:block}.arrivalDebriefTop{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.arrivalDebriefTitle{font-size:9px;font-weight:820;letter-spacing:.03em}.arrivalDebriefBadge{font-size:7px;color:#91f1dd;white-space:nowrap}.arrivalDebriefStats{margin-top:4px;font-size:8px;line-height:1.4;color:#dceaff}.arrivalDebriefRoute{margin-top:3px;font-size:7px;line-height:1.4;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.arrivalDebriefActions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}.arrivalDebriefActions button{min-height:34px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.045);color:var(--text);font-size:8px;font-weight:760}.arrivalDebriefActions .arrivalNext{border-color:rgba(166,211,255,.3);background:rgba(116,171,235,.09)}';
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
    card.innerHTML='<div class="arrivalDebriefTop"><strong id="arrivalDebriefTitle" class="arrivalDebriefTitle">航程完成</strong><span class="arrivalDebriefBadge">ARRIVAL LOG</span></div><div id="arrivalDebriefStats" class="arrivalDebriefStats"></div><div id="arrivalDebriefRoute" class="arrivalDebriefRoute"></div><div class="arrivalDebriefActions"><button id="arrivalDebriefExplore" type="button">繼續探索</button><button id="arrivalDebriefNext" class="arrivalNext" type="button">下一目的地</button></div>';
    actions.insertAdjacentElement('beforebegin',card);
    card.querySelector('#arrivalDebriefExplore').addEventListener('click',hide);
    card.querySelector('#arrivalDebriefNext').addEventListener('click',()=>{
      hide();
      const next=expeditionNext();
      if(next&&window.WarpExpedition?.planNext?.()){
        document.querySelector('#openPanel')?.click();
        return;
      }
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
  const nextButton=document.querySelector('#arrivalDebriefNext');
  if(!title||!stats||!route||!nextButton)return false;
  title.textContent='航程完成 · '+SYSTEM_NAMES[destination];
  const distance=Number.isFinite(entry.distance)?entry.distance.toFixed(1)+' LY':'距離未記錄';
  stats.textContent=`${entry.route.length-1} 段 · ${distance} · ${entry.seconds} 秒活躍航行`;
  route.textContent=entry.route.map(id=>SYSTEM_NAMES[id]).join(' → ');
  const next=expeditionNext();
  nextButton.textContent=next?`規劃下一站 · ${SYSTEM_NAMES[next]}`:'下一目的地';
  return true;
}
function show(raw){
  const entry=normalise(raw);
  if(!entry||!safeArrival(entry)||!render(entry))return false;
  currentEntry=entry;
  visible=true;
  const card=document.querySelector('#arrivalDebrief');
  card?.classList.add('show');
  const exploreCard=document.querySelector('#exploreCard');
  exploreCard?.classList.remove('collapsed');
  const collapse=document.querySelector('#exploreCollapse');
  if(collapse)collapse.textContent='⌄';
  return true;
}
function hide(){
  visible=false;
  document.querySelector('#arrivalDebrief')?.classList.remove('show');
}
function onJourneyComplete(event){queueMicrotask(()=>show(event.detail))}
addEventListener('stellarwarp:journey-complete',onJourneyComplete);
addEventListener('stellarwarp:expedition-progress',()=>{if(visible&&currentEntry)render(currentEntry)});
document.querySelector('#space')?.addEventListener('webglcontextlost',hide);
ensureUi();
window.WarpArrivalDebrief={
  show(entry){return show(entry)},
  hide,
  visible(){return visible},
  entry(){return currentEntry?{...currentEntry,route:[...currentEntry.route]}:null}
};
})();
