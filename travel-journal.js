(() => {
'use strict';
const KEY='stellar-warp-travel-journal-v1';
const LIMIT=12;
const NAMES={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
const IDS=new Set(Object.keys(NAMES));
let previous=null,active=null,currentId='SOL',uiReady=false;

function normaliseEntry(entry){
  if(!entry||!Array.isArray(entry.route))return null;
  const route=entry.route.filter(id=>IDS.has(id));
  if(route.length<2)return null;
  const startedAt=Number(entry.startedAt),endedAt=Number(entry.endedAt),seconds=Number(entry.seconds);
  if(!Number.isFinite(startedAt)||!Number.isFinite(endedAt)||!Number.isFinite(seconds))return null;
  return{route,startedAt,endedAt,seconds:Math.max(1,Math.min(86400,Math.round(seconds)))};
}
function load(){
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||'{}');
    const entries=Array.isArray(parsed.entries)?parsed.entries.map(normaliseEntry).filter(Boolean).slice(0,LIMIT):[];
    return{entries};
  }catch{return{entries:[]}}
}
let journal=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,entries:journal.entries.slice(0,LIMIT)}))}catch{}}
function formatStamp(ms){try{return new Intl.DateTimeFormat('zh-HK',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch{return''}}
function name(id){return NAMES[id]||id}
function beginSession(state,sampleAt){return{route:Array.isArray(state.route)?[...state.route]:[],startedAt:Date.now(),activeMs:0,lastSampleAt:sampleAt}}
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
    style.textContent='.travelJournal{margin-top:9px;border:1px solid var(--line);border-radius:15px;padding:10px;background:rgba(255,255,255,.024)}.journalHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.journalTitle{font-size:11px;font-weight:780}.journalSummary{display:block;margin-top:2px;font-size:8px;color:var(--muted)}.journalToggle,.journalRevisit{border:1px solid var(--line);background:rgba(255,255,255,.045);color:var(--text);border-radius:10px;min-height:34px;padding:0 10px;font-size:9px;font-weight:740}.journalBody{display:grid;gap:6px;margin-top:8px}.travelJournal.compact .journalBody{display:none}.journalEmpty{font-size:9px;line-height:1.45;color:var(--muted);padding:4px 1px}.journalEntry{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border-top:1px solid rgba(188,215,255,.09);padding-top:7px}.journalEntry:first-child{border-top:0}.journalMain{font-size:9px;line-height:1.35;min-width:0}.journalMain strong{font-size:10px}.journalRoute{margin-top:2px;color:var(--muted);font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.journalMeta{margin-top:2px;color:#bdd7ff;font-size:7px}.journalPulse{animation:journalPulse .8s ease-out}@keyframes journalPulse{0%{box-shadow:0 0 0 0 rgba(111,220,198,.42)}100%{box-shadow:0 0 0 16px rgba(111,220,198,0)}}';
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
  const visited=new Set(['SOL']);
  for(const entry of journal.entries)for(const id of entry.route)visited.add(id);
  summary.textContent=journal.entries.length?journal.entries.length+' 次旅程 · '+visited.size+'/8 星區已記錄':'完成航程後會自動記錄';
  host.replaceChildren();
  if(!journal.entries.length){
    const empty=document.createElement('div');
    empty.className='journalEmpty';
    empty.textContent='完整抵達最終目的地後，會在此保存路線與活躍航行時間；中止航程不會寫入。';
    host.append(empty);return;
  }
  for(const entry of journal.entries.slice(0,5)){
    const destination=entry.route[entry.route.length-1],row=document.createElement('div');
    row.className='journalEntry';
    const main=document.createElement('div');main.className='journalMain';
    const title=document.createElement('strong');title.textContent=name(entry.route[0])+' → '+name(destination);
    const route=document.createElement('div');route.className='journalRoute';route.textContent=entry.route.map(name).join(' → ');
    const meta=document.createElement('div');meta.className='journalMeta';meta.textContent=formatStamp(entry.endedAt)+' · '+entry.seconds+' 秒活躍航行';
    main.append(title,route,meta);
    const revisit=document.createElement('button');revisit.type='button';revisit.className='journalRevisit';revisit.dataset.destination=destination;revisit.textContent=destination===currentId?'目前位置':'再次規劃';revisit.disabled=destination===currentId;
    row.append(main,revisit);host.append(row);
  }
}
function recordCompleted(activeSession,state){
  const route=(activeSession?.route||[]).filter(id=>IDS.has(id));
  const destination=route[route.length-1];
  if(route.length<2||state.current!==destination)return false;
  const endedAt=Date.now(),entry=normaliseEntry({route,startedAt:activeSession.startedAt,endedAt,seconds:activeSession.activeMs/1000});
  if(!entry)return false;
  journal.entries.unshift(entry);journal.entries=journal.entries.slice(0,LIMIT);save();render();
  const card=document.querySelector('#travelJournal');if(card){card.classList.remove('journalPulse');void card.offsetWidth;card.classList.add('journalPulse')}
  return true;
}
function sample(){
  ensureUi();
  const api=window.WarpSim;if(!api||typeof api.state!=='function')return;
  const sampleAt=performance.now();
  let state;try{state=api.state()}catch{return}
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
window.WarpTravelJournal={entries(){return journal.entries.map(entry=>({...entry,route:[...entry.route]}))}};
import('./exploration-survey.js').catch(()=>{});
import('./photo-mode.js').catch(()=>{});
})();
