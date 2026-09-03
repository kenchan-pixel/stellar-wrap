(() => {
'use strict';
const KEY='stellar-warp-travel-journal-v1';
const LIMIT=12;
const DISCOVERY_TOTAL=7;
const NAMES={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
const IDS=new Set(Object.keys(NAMES));
let previous=null,active=null,currentId='SOL',uiReady=false;
let locationRestorePending=true;

function normaliseEntry(entry){
  if(!entry||!Array.isArray(entry.route))return null;
  const route=entry.route.filter(id=>IDS.has(id));
  if(route.length<2)return null;
  const startedAt=Number(entry.startedAt),endedAt=Number(entry.endedAt),seconds=Number(entry.seconds),rawDistance=entry.distance;
  if(!Number.isFinite(startedAt)||!Number.isFinite(endedAt)||!Number.isFinite(seconds))return null;
  let distance=null;
  if(rawDistance!==undefined&&rawDistance!==null){distance=Number(rawDistance);if(!Number.isFinite(distance)||distance<=0||distance>10000)return null;distance=Math.round(distance*10)/10}
  return{route,startedAt,endedAt,seconds:Math.max(1,Math.min(86400,Math.round(seconds))),...(distance===null?{}:{distance})};
}
function normaliseRestoreEntry(entry){
  if(!entry||!Array.isArray(entry.route)||entry.route.length<2)return null;
  if(entry.route.some(id=>!IDS.has(id)))return null;
  const startedAt=Number(entry.startedAt),endedAt=Number(entry.endedAt),seconds=Number(entry.seconds);
  if(!Number.isFinite(startedAt)||!Number.isFinite(endedAt)||!Number.isFinite(seconds))return null;
  if(startedAt<0||endedAt<=startedAt||seconds<=0)return null;
  const normalised=normaliseEntry(entry);
  if(!normalised||normalised.route.length!==entry.route.length)return null;
  return normalised;
}
function normaliseVisited(raw,entries=[]){
  const visited=new Set(['SOL']);
  if(Array.isArray(raw))for(const id of raw)if(IDS.has(id))visited.add(id);
  for(const entry of entries)for(const id of entry.route)if(IDS.has(id))visited.add(id);
  return[...visited];
}
function load(){
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||'{}');
    const rawEntries=Array.isArray(parsed.entries)?parsed.entries:[];
    const entries=rawEntries.map(normaliseEntry).filter(Boolean).slice(0,LIMIT);
    const restoreEntry=rawEntries.length?normaliseRestoreEntry(rawEntries[0]):null;
    return{entries,visited:normaliseVisited(parsed.visited,entries),restoreEntry};
  }catch{return{entries:[],visited:['SOL'],restoreEntry:null}}
}
const loaded=load();
let journal={entries:loaded.entries,visited:loaded.visited};
let restoreEntry=loaded.restoreEntry;
locationRestorePending=!!restoreEntry;
let restoreVeil=null;
function ensureRestoreVeil(){
  if(!locationRestorePending)return false;
  const app=document.querySelector?.('#app');
  if(!app||typeof document.createElement!=='function')return false;
  let veil=document.querySelector?.('#locationRestoreVeil');
  if(!veil){
    veil=document.createElement('div');
    veil.id='locationRestoreVeil';
    veil.setAttribute('role','status');
    veil.setAttribute('aria-live','polite');
    veil.setAttribute('aria-label','恢復停泊位置');
    veil.textContent='恢復上次停泊點…';
    veil.style.cssText='position:absolute;z-index:19;inset:0;display:grid;place-items:center;padding:24px;background:#02040a;color:#eaf2ff;font-size:11px;line-height:1.5;text-align:center;pointer-events:auto';
    app.append(veil);
  }
  restoreVeil=veil;return true;
}
function settleLocationRestore(){
  locationRestorePending=false;restoreEntry=null;
  const veil=restoreVeil||document.querySelector?.('#locationRestoreVeil');
  veil?.remove?.();restoreVeil=null;
}
if(locationRestorePending)ensureRestoreVeil();
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:2,entries:journal.entries.slice(0,LIMIT),visited:normaliseVisited(journal.visited,journal.entries)}))}catch{}}
function formatStamp(ms){try{return new Intl.DateTimeFormat('zh-HK',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch{return''}}
function name(id){return NAMES[id]||id}
function readDiscoveries(){
  try{
    const raw=window.WarpStarAtlas?.snapshot?.().discoveries;
    return raw&&typeof raw==='object'?raw:{};
  }catch{return{}}
}
function readPlannedDistance(){
  const text=document.querySelector('#routeMeta')?.textContent||'';
  const match=text.match(/(\d+(?:\.\d+)?)\s*LY\b/i),distance=match?Number(match[1]):NaN;
  return Number.isFinite(distance)&&distance>0&&distance<10000?Math.round(distance*10)/10:null;
}
function beginSession(state,sampleAt){return{route:Array.isArray(state.route)?[...state.route]:[],startedAt:Date.now(),activeMs:0,lastSampleAt:sampleAt,distance:readPlannedDistance()}}
function resetSampleClock(){if(active)active.lastSampleAt=performance.now()}
document.addEventListener('visibilitychange',resetSampleClock);
for(const eventName of['webglcontextlost','webglcontextrestored'])document.querySelector('#space')?.addEventListener(eventName,resetSampleClock);
function ensureUi(){
  if(uiReady&&document.querySelector('#travelJournal'))return true;
  const routeCard=document.querySelector('.routeCard');
  if(!routeCard)return false;
  if(!document.querySelector('#travelJournalStyle')){
    const style=document.createElement('style');
    style.id='travelJournalStyle';
    style.textContent='.travelJournal{margin-top:9px;border:1px solid var(--line);border-radius:15px;padding:10px;background:rgba(255,255,255,.024)}.journalHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.journalTitle{font-size:11px;font-weight:780}.journalSummary{display:block;margin-top:2px;font-size:8px;color:var(--muted)}.journalToggle,.journalRevisit{border:1px solid var(--line);background:rgba(255,255,255,.045);color:var(--text);border-radius:10px;min-height:34px;padding:0 10px;font-size:9px;font-weight:740}.journalBody{display:grid;gap:6px;margin-top:8px}.travelJournal.compact .journalBody{display:none}.journalEmpty{font-size:9px;line-height:1.45;color:var(--muted);padding:4px 1px}.journalEntry{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border-top:1px solid rgba(188,215,255,.09);padding-top:7px}.journalEntry:first-child{border-top:0}.journalMain{font-size:9px;line-height:1.35;min-width:0}.journalMain strong{font-size:10px}.journalRoute{margin-top:2px;color:var(--muted);font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.journalMeta{margin-top:2px;color:#bdd7ff;font-size:7px}.journalOutcome{display:inline-flex;align-items:center;margin-top:4px;padding:3px 5px;border-radius:7px;background:rgba(255,255,255,.035);font-size:7px;color:var(--muted)}.journalOutcome.complete{background:rgba(72,192,165,.09);color:#a9f4e4}.journalOutcome.home{background:rgba(117,164,228,.07);color:#bdd7ff}.journalPulse{animation:journalPulse .8s ease-out}@keyframes journalPulse{0%{box-shadow:0 0 0 0 rgba(111,220,198,.42)}100%{box-shadow:0 0 0 16px rgba(111,220,198,0)}}';
    document.head.append(style);
  }
  let card=document.querySelector('#travelJournal');
  if(!card){
    card=document.createElement('section');
    card.id='travelJournal';
    card.className='travelJournal compact';
    card.setAttribute('aria-label','旅行日誌');
    card.innerHTML='<div class="journalHead"><div><div class="journalTitle">旅行日誌</div><span id="journalSummary" class="journalSummary" aria-live="polite">尚未記錄旅程</span></div><button id="journalToggle" class="journalToggle" type="button" aria-expanded="false">展開</button></div><div id="journalBody" class="journalBody"><div id="journalEntries"></div></div>';
    routeCard.insertAdjacentElement('afterend',card);
    card.querySelector('#journalToggle').addEventListener('click',()=>{
      const compact=card.classList.toggle('compact');
      card.querySelector('#journalToggle').textContent=compact?'展開':'收起';
      card.querySelector('#journalToggle').setAttribute('aria-expanded',compact?'false':'true');
    });
    card.querySelector('#journalEntries').addEventListener('click',event=>{
      const button=event.target.closest('[data-destination]');
      if(!button||button.disabled||!window.WarpSim)return;
      const destination=button.dataset.destination;
      if(destination&&destination!==currentId){window.WarpSim.select(destination)}
    });
  }
  uiReady=true;
  render();
  return true;
}
function render(){
  if(!ensureUi()||!uiReady)return;
  const summary=document.querySelector('#journalSummary'),host=document.querySelector('#journalEntries');
  if(!summary||!host)return;
  const visited=normaliseVisited(journal.visited,journal.entries);
  const measured=journal.entries.filter(entry=>Number.isFinite(entry.distance));
  const recordedDistance=measured.reduce((sum,entry)=>sum+entry.distance,0);
  const discoveries=readDiscoveries();
  const discoveryCount=Object.entries(discoveries).filter(([id,value])=>id!=='SOL'&&IDS.has(id)&&typeof value==='string'&&value.trim()).length;
  summary.textContent=journal.entries.length?journal.entries.length+' 次旅程 · '+visited.length+'/8 星區已記錄 · '+discoveryCount+'/'+DISCOVERY_TOTAL+' 發現'+(measured.length?' · '+recordedDistance.toFixed(1)+' LY':''):'完成航程後會自動記錄';
  host.replaceChildren();
  if(!journal.entries.length){
    const empty=document.createElement('div');
    empty.className='journalEmpty';
    empty.textContent='完整抵達最終目的地後，會在此保存路線、距離、活躍航行時間與現有探索成果；中止航程不會寫入。';
    host.append(empty);return;
  }
  for(const entry of journal.entries.slice(0,5)){
    const destination=entry.route[entry.route.length-1],row=document.createElement('div');
    row.className='journalEntry';
    const main=document.createElement('div');main.className='journalMain';
    const title=document.createElement('strong');title.textContent=name(entry.route[0])+' → '+name(destination);
    const route=document.createElement('div');route.className='journalRoute';route.textContent=entry.route.map(name).join(' → ');
    const meta=document.createElement('div');meta.className='journalMeta';meta.textContent=formatStamp(entry.endedAt)+' · '+(Number.isFinite(entry.distance)?entry.distance.toFixed(1)+' LY · ':'')+entry.seconds+' 秒活躍航行';
    const outcome=document.createElement('div');outcome.className='journalOutcome';
    const discovery=typeof discoveries[destination]==='string'?discoveries[destination].trim():'';
    if(destination==='SOL'){outcome.classList.add('home');outcome.textContent='母港紀錄 · 無外站發現'}
    else if(discovery){outcome.classList.add('complete');outcome.textContent='發現 · '+discovery}
    else outcome.textContent='探索未完成';
    main.append(title,route,meta,outcome);
    const revisit=document.createElement('button');revisit.type='button';revisit.className='journalRevisit';revisit.dataset.destination=destination;revisit.textContent=destination===currentId?'目前位置':'再次規劃';revisit.disabled=destination===currentId;
    row.append(main,revisit);host.append(row);
  }
}
function recordCompleted(activeSession,state){
  const route=(activeSession?.route||[]).filter(id=>IDS.has(id));
  const destination=route[route.length-1];
  if(route.length<2||state.current!==destination)return false;
  const endedAt=Date.now(),entry=normaliseEntry({route,startedAt:activeSession.startedAt,endedAt,seconds:activeSession.activeMs/1000,distance:activeSession.distance});
  if(!entry)return false;
  journal.entries.unshift(entry);journal.entries=journal.entries.slice(0,LIMIT);journal.visited=normaliseVisited(journal.visited,[entry]);save();render();
  const card=document.querySelector('#travelJournal');if(card){card.classList.remove('journalPulse');void card.offsetWidth;card.classList.add('journalPulse')}
  dispatchEvent(new CustomEvent('stellarwarp:journey-complete',{detail:{...entry,route:[...entry.route]}}));
  return true;
}
function restoreDockedLocation(){
  if(!locationRestorePending)return false;
  const latest=restoreEntry;
  const destination=latest?.route?.[latest.route.length-1];
  if(!IDS.has(destination)){settleLocationRestore();return false}
  const api=window.WarpSim;
  if(!api||typeof api.state!=='function'||typeof api.jumpTo!=='function'||typeof api.isRouteValid!=='function'){ensureRestoreVeil();return false}
  let state;try{state=api.state()}catch{return false}
  if(!state)return false;
  const busy=!!(state.flying||state.exploring||state.contextLost||state.selected||(Array.isArray(state.route)&&state.route.length));
  if(state.current!=='SOL'||busy){settleLocationRestore();return false}
  if(!api.isRouteValid(latest.route)){settleLocationRestore();return false}
  try{api.jumpTo(destination)}catch{settleLocationRestore();return false}
  settleLocationRestore();
  currentId=destination;
  render();
  dispatchEvent(new CustomEvent('stellarwarp:location-restored',{detail:{current:destination,visited:normaliseVisited(journal.visited,journal.entries)}}));
  return true;
}
function sample(){
  ensureUi();
  if(locationRestorePending)ensureRestoreVeil();
  const api=window.WarpSim;if(!api||typeof api.state!=='function')return;
  const sampleAt=performance.now();
  let state;try{state=api.state()}catch{return}
  if(locationRestorePending&&restoreDockedLocation()){try{state=api.state()}catch{return}}
  currentId=IDS.has(state.current)?state.current:currentId;
  if(!previous){previous=state;if(state.flying&&Array.isArray(state.route)&&state.route.length>1)active=beginSession(state,sampleAt);render();return}
  if(state.flying&&!previous.flying)active=beginSession(state,sampleAt);
  if(state.flying&&active){
    const delta=Math.max(0,sampleAt-active.lastSampleAt);
    if(!document.hidden&&!state.contextLost)active.activeMs+=Math.min(1000,delta);
    active.lastSampleAt=sampleAt;
    if(Array.isArray(state.route)&&state.route.length>1)active.route=[...state.route];
  }
  if(previous.flying&&!state.flying&&active){
    const delta=Math.max(0,sampleAt-active.lastSampleAt);
    if(!document.hidden&&!state.contextLost)active.activeMs+=Math.min(600,delta);
    recordCompleted(active,state);active=null;
  }
  if(previous.current!==state.current)render();
  previous=state;
}
setInterval(sample,500);
sample();
document.addEventListener('DOMContentLoaded',()=>{if(locationRestorePending){ensureRestoreVeil();restoreDockedLocation()}},{once:true});
addEventListener('stellarwarp:discovery-change',()=>render());
addEventListener('stellarwarp:atlas-change',()=>render());
addEventListener('storage',()=>render());
window.WarpTravelJournal={
  entries(){return journal.entries.map(entry=>({...entry,route:[...entry.route]}))},
  visited(){return normaliseVisited(journal.visited,journal.entries)},
  restorePending(){return locationRestorePending},
  restoreLocation(){return restoreDockedLocation()}
};
import('./mode-gateway.js').catch(()=>{});
import('./responsive-ui.js').catch(()=>{});
import('./exploration-survey.js').catch(()=>{});
import('./star-atlas.js').then(()=>render()).catch(()=>{});
import('./photo-mode.js').catch(()=>{});
import('./arrival-debrief.js').catch(()=>{});
import('./landmark-guide.js').catch(()=>{});
import('./cyg-beacon-scan.js').catch(()=>{});
import('./orion-spectrograph.js').catch(()=>{});
import('./offline-bootstrap.js').catch(()=>{});
})();