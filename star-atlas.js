(() => {
'use strict';

const SYSTEMS=[
  {id:'SOL',name:'地球近軌',tag:'類地近軌',landmark:'地球 · 月球 · 軌道環'},
  {id:'LUNA',name:'月環基地',tag:'地月基地',landmark:'月面 · 遠方地球 · 環站'},
  {id:'VEGA',name:'織女星門',tag:'A 型主星',landmark:'藍白主星 · 雙層星門'},
  {id:'CYG',name:'天鵝航標',tag:'藍紫雙星',landmark:'雙星 · 航標陣列'},
  {id:'ORION',name:'獵戶前哨',tag:'紅超巨星前哨',landmark:'紅巨星 · 岩質前哨'},
  {id:'TAU',name:'金牛塵海',tag:'環狀氣態巨星',landmark:'巨型行星環 · 粉紫塵海'},
  {id:'SIRIUS',name:'天狼中繼站',tag:'藍白雙星',landmark:'雙星 · 中繼環站'},
  {id:'PROX',name:'比鄰星港',tag:'紅矮星港',landmark:'熔岩行星 · 外圍星港'}
];
const IDS=new Set(SYSTEMS.map(system=>system.id));
const JOURNAL_KEY='stellar-warp-travel-journal-v1';
const SURVEY_KEY='stellar-warp-luna-survey-v1';
let uiReady=false;
let lastSignature='';

function readState(){
  try{return window.WarpSim?.state?.()||null}catch{return null}
}
function readEntries(){
  try{return window.WarpTravelJournal?.entries?.()||[]}catch{return[]}
}
function readDiscoveries(){
  const discoveries=new Map();
  try{
    if(window.WarpLunaSurvey?.progress?.().discovery)discoveries.set('LUNA','地月視差層');
  }catch{}
  return discoveries;
}
function formatStamp(ms){
  if(!Number.isFinite(ms)||ms<=0)return'';
  try{return new Intl.DateTimeFormat('zh-HK',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch{return''}
}
function buildModel(){
  const state=readState();
  const visited=new Set(['SOL']);
  const stats=Object.fromEntries(SYSTEMS.map(system=>[system.id,{journeys:0,last:0}]));
  for(const entry of readEntries()){
    if(!Array.isArray(entry?.route))continue;
    const seen=new Set();
    const endedAt=Number(entry.endedAt);
    for(const id of entry.route){
      if(!IDS.has(id))continue;
      visited.add(id);
      if(seen.has(id))continue;
      seen.add(id);
      stats[id].journeys++;
      if(Number.isFinite(endedAt))stats[id].last=Math.max(stats[id].last,endedAt);
    }
  }
  if(IDS.has(state?.current))visited.add(state.current);
  const discoveries=readDiscoveries();
  return{state,visited,stats,discoveries};
}
function ensureUi(){
  if(uiReady&&document.querySelector('#starAtlas'))return true;
  const journal=document.querySelector('#travelJournal');
  if(!journal)return false;
  if(!document.querySelector('#starAtlasStyle')){
    const style=document.createElement('style');
    style.id='starAtlasStyle';
    style.textContent='.starAtlas{margin-top:9px;border:1px solid var(--line);border-radius:15px;padding:10px;background:rgba(255,255,255,.024)}.atlasHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.atlasTitle{font-size:11px;font-weight:790}.atlasSummary{display:block;margin-top:2px;font-size:8px;color:var(--muted)}.atlasToggle,.atlasPlan{border:1px solid var(--line);background:rgba(255,255,255,.045);color:var(--text);border-radius:10px;min-height:34px;padding:0 9px;font-size:8px;font-weight:750}.atlasProgress{height:3px;margin-top:8px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.07)}.atlasProgress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7fb7ff,#76ead3);transition:width .25s}.atlasBody{margin-top:8px}.starAtlas.compact .atlasBody{display:none}.atlasComplete{display:none;margin-bottom:7px;padding:7px 8px;border:1px solid rgba(104,235,207,.25);border-radius:9px;background:rgba(73,190,164,.08);font-size:8px;line-height:1.4;color:#ddfff7}.atlasComplete.show{display:block}.atlasGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.atlasCard{min-width:0;padding:8px;border:1px solid rgba(188,215,255,.1);border-radius:11px;background:rgba(255,255,255,.018);opacity:.62}.atlasCard.visited{opacity:1;border-color:rgba(132,213,195,.19);background:rgba(83,174,158,.035)}.atlasCard.current{border-color:rgba(165,207,255,.42);box-shadow:inset 0 0 0 1px rgba(148,196,255,.08)}.atlasCardTop{display:flex;align-items:baseline;justify-content:space-between;gap:5px}.atlasCardTop strong{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.atlasId{font-size:7px;color:#a8c7f3}.atlasTag{margin-top:3px;font-size:7px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.atlasLandmark{margin-top:3px;font-size:7px;color:#d5e7ff;line-height:1.35;min-height:19px}.atlasMeta{margin-top:4px;font-size:7px;color:#9fc6ff;line-height:1.35}.atlasDiscovery{margin-top:5px;padding:4px 5px;border-radius:7px;background:rgba(72,192,165,.09);color:#a9f4e4;font-size:7px}.atlasPlan{width:100%;margin-top:6px}.atlasPlan:disabled{opacity:.46}@media(max-width:360px){.atlasGrid{grid-template-columns:1fr}}';
    document.head.append(style);
  }
  let card=document.querySelector('#starAtlas');
  if(!card){
    card=document.createElement('section');
    card.id='starAtlas';
    card.className='starAtlas compact';
    card.setAttribute('aria-label','星區圖鑑');
    card.innerHTML='<div class="atlasHead"><div><div class="atlasTitle">星區圖鑑</div><span id="atlasSummary" class="atlasSummary" aria-live="polite">1 / 8 星區</span></div><button id="atlasToggle" class="atlasToggle" type="button" aria-expanded="false">展開</button></div><div class="atlasProgress" aria-hidden="true"><i id="atlasProgressFill"></i></div><div class="atlasBody"><div id="atlasComplete" class="atlasComplete" role="status">全星區巡航完成 · 8 個星區均已有航行紀錄。</div><div id="atlasGrid" class="atlasGrid"></div></div>';
    journal.insertAdjacentElement('afterend',card);
    card.querySelector('#atlasToggle').addEventListener('click',()=>{
      const compact=card.classList.toggle('compact');
      const toggle=card.querySelector('#atlasToggle');
      toggle.textContent=compact?'展開':'收起';
      toggle.setAttribute('aria-expanded',compact?'false':'true');
    });
    card.querySelector('#atlasGrid').addEventListener('click',event=>{
      const button=event.target.closest('[data-destination]');
      const destination=button?.dataset.destination;
      const state=readState();
      if(!destination||!IDS.has(destination)||!state||state.flying||state.contextLost||destination===state.current)return;
      try{window.WarpSim.select(destination)}catch{return}
      render(true);
    });
  }
  uiReady=true;
  return true;
}
function signatureOf(model){
  return JSON.stringify({
    current:model.state?.current||'',flying:!!model.state?.flying,contextLost:!!model.state?.contextLost,
    visited:[...model.visited].sort(),
    stats:SYSTEMS.map(system=>[system.id,model.stats[system.id].journeys,model.stats[system.id].last]),
    discoveries:[...model.discoveries.entries()]
  });
}
function render(force=false){
  if(!ensureUi())return;
  const model=buildModel();
  const signature=signatureOf(model);
  if(!force&&signature===lastSignature)return;
  lastSignature=signature;
  const summary=document.querySelector('#atlasSummary');
  const progress=document.querySelector('#atlasProgressFill');
  const complete=document.querySelector('#atlasComplete');
  const grid=document.querySelector('#atlasGrid');
  if(!summary||!progress||!complete||!grid)return;
  const discoveryCount=model.discoveries.size;
  summary.textContent=`${model.visited.size} / ${SYSTEMS.length} 星區${discoveryCount?` · ${discoveryCount} 個發現`:''}`;
  progress.style.width=(model.visited.size/SYSTEMS.length*100).toFixed(1)+'%';
  complete.classList.toggle('show',model.visited.size===SYSTEMS.length);
  grid.replaceChildren();
  for(const system of SYSTEMS){
    const visited=model.visited.has(system.id),current=model.state?.current===system.id,stat=model.stats[system.id],discovery=model.discoveries.get(system.id)||'';
    const row=document.createElement('article');
    row.className='atlasCard'+(visited?' visited':'')+(current?' current':'');
    const top=document.createElement('div');top.className='atlasCardTop';
    const title=document.createElement('strong');title.textContent=system.name;
    const id=document.createElement('span');id.className='atlasId';id.textContent=system.id;
    top.append(title,id);
    const tag=document.createElement('div');tag.className='atlasTag';tag.textContent=system.tag;
    const landmark=document.createElement('div');landmark.className='atlasLandmark';landmark.textContent=system.landmark;
    const meta=document.createElement('div');meta.className='atlasMeta';
    if(current)meta.textContent='目前位置'+(stat.journeys?` · ${stat.journeys} 次旅程涉及`:'');
    else if(visited)meta.textContent=(stat.journeys?`${stat.journeys} 次旅程涉及`:'已到訪')+(stat.last?` · 最近 ${formatStamp(stat.last)}`:'');
    else meta.textContent='尚未到訪';
    row.append(top,tag,landmark,meta);
    if(discovery){const badge=document.createElement('div');badge.className='atlasDiscovery';badge.textContent='發現 · '+discovery;row.append(badge)}
    const plan=document.createElement('button');plan.type='button';plan.className='atlasPlan';plan.dataset.destination=system.id;
    const blocked=model.state?.flying||model.state?.contextLost;
    plan.disabled=current||blocked;
    plan.textContent=current?'目前位置':blocked?'航行中':'規劃前往';
    row.append(plan);grid.append(row);
  }
}
function sample(){render(false)}
addEventListener('stellarwarp:journey-complete',()=>render(true));
addEventListener('storage',event=>{if(event.key===JOURNAL_KEY||event.key===SURVEY_KEY)render(true)});
setInterval(sample,1000);
ensureUi();render(true);
window.WarpStarAtlas={
  snapshot(){const model=buildModel();return{visited:[...model.visited],discoveries:Object.fromEntries(model.discoveries),systems:SYSTEMS.map(system=>({...system,journeys:model.stats[system.id].journeys,last:model.stats[system.id].last}))}},
  render(){render(true)}
};
})();
