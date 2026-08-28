(() => {
'use strict';

const SYSTEM_NAMES={LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
const IDS=new Set(Object.keys(SYSTEM_NAMES));
const TOTAL=7;
let uiReady=false;
let visible=false;
let current=null;
let primed=false;
let known=new Map();

function safeState(system){
  let state;try{state=window.WarpSim?.state?.()}catch{return false}
  return !!state&&state.current===system&&state.exploring&&!state.flying&&!state.contextLost;
}
function readDiscoveries(){
  try{return window.WarpStarAtlas?.snapshot?.().discoveries||null}catch{return null}
}
function ensureUi(){
  if(uiReady&&document.querySelector('#discoveryDebrief'))return true;
  const actions=document.querySelector('#exploreCard .exploreActions');
  if(!actions)return false;
  if(!document.querySelector('#discoveryDebriefStyle')){
    const style=document.createElement('style');
    style.id='discoveryDebriefStyle';
    style.textContent='.discoveryDebrief{display:none;margin:8px 0 7px;padding:10px;border:1px solid rgba(105,238,210,.28);border-radius:12px;background:linear-gradient(180deg,rgba(54,157,137,.12),rgba(58,93,145,.07));box-shadow:0 8px 24px rgba(0,0,0,.14)}.discoveryDebrief.show{display:block}.discoveryDebriefKicker{font-size:7px;font-weight:820;letter-spacing:.1em;color:#8ff0dc}.discoveryDebriefTitle{display:block;margin-top:2px;font-size:10px;font-weight:840}.discoveryDebriefName{margin-top:5px;font-size:9px;line-height:1.4;color:#ddfff7}.discoveryDebriefProgress{margin-top:3px;font-size:7px;color:var(--muted)}.discoveryDebriefActions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.discoveryDebriefActions button{min-height:44px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.045);color:var(--text);font-size:8px;font-weight:780}.discoveryDebriefActions .discoveryAtlas{border-color:rgba(105,238,210,.3);background:rgba(71,180,157,.1)}.discoveryDebriefActions .discoveryNext{border-color:rgba(166,211,255,.3);background:rgba(116,171,235,.09)}@media(min-width:900px){#app .discoveryDebriefTitle{font-size:var(--ui-md)}#app .discoveryDebriefName,#app .discoveryDebriefActions button{font-size:var(--ui-sm)}#app .discoveryDebriefKicker,#app .discoveryDebriefProgress{font-size:var(--ui-xs)}#app .discoveryDebriefActions button{min-height:44px}}';
    document.head.append(style);
  }
  const card=document.createElement('section');
  card.id='discoveryDebrief';card.className='discoveryDebrief';
  card.setAttribute('role','status');card.setAttribute('aria-live','polite');card.setAttribute('aria-label','探索完成摘要');
  const kicker=document.createElement('span');kicker.className='discoveryDebriefKicker';kicker.textContent='DISCOVERY COMPLETE';
  const title=document.createElement('strong');title.id='discoveryDebriefTitle';title.className='discoveryDebriefTitle';
  const name=document.createElement('div');name.id='discoveryDebriefName';name.className='discoveryDebriefName';
  const progress=document.createElement('div');progress.id='discoveryDebriefProgress';progress.className='discoveryDebriefProgress';
  const actionRow=document.createElement('div');actionRow.className='discoveryDebriefActions';
  const atlas=document.createElement('button');atlas.id='discoveryDebriefAtlas';atlas.className='discoveryAtlas';atlas.type='button';atlas.textContent='查看星區圖鑑';
  const next=document.createElement('button');next.id='discoveryDebriefNext';next.className='discoveryNext';next.type='button';next.textContent='下一目的地';
  actionRow.append(atlas,next);card.append(kicker,title,name,progress,actionRow);actions.insertAdjacentElement('beforebegin',card);
  atlas.addEventListener('click',openAtlas);next.addEventListener('click',openNext);
  uiReady=true;return true;
}
function render(detail){
  if(!ensureUi())return false;
  const title=document.querySelector('#discoveryDebriefTitle');
  const name=document.querySelector('#discoveryDebriefName');
  const progress=document.querySelector('#discoveryDebriefProgress');
  if(!title||!name||!progress)return false;
  title.textContent='探索完成 · '+SYSTEM_NAMES[detail.system];
  name.textContent='已收錄「'+detail.discovery+'」';
  const count=Number.isFinite(detail.count)?Math.max(0,Math.min(TOTAL,Math.round(detail.count))):null;
  progress.textContent=count===null?'發現已寫入本機星區圖鑑':`${count} / ${TOTAL} 外站發現已收錄`;
  return true;
}
function show(raw){
  const system=raw?.system,discovery=typeof raw?.discovery==='string'?raw.discovery.trim():'';
  if(!IDS.has(system)||!discovery||!safeState(system)||!render({...raw,system,discovery}))return false;
  current={system,discovery,count:Number(raw.count)||null};visible=true;
  document.querySelector('#discoveryDebrief')?.classList.add('show');
  document.querySelector('#exploreCard')?.classList.remove('collapsed');
  const collapse=document.querySelector('#exploreCollapse');if(collapse)collapse.textContent='⌄';
  navigator.vibrate?.([18,30,24]);
  return true;
}
function hide(){visible=false;document.querySelector('#discoveryDebrief')?.classList.remove('show')}
function openAtlas(){
  hide();document.querySelector('#openPanel')?.click();
  const atlas=document.querySelector('#starAtlas');
  if(atlas){
    atlas.classList.remove('compact');
    const toggle=atlas.querySelector('#atlasToggle');if(toggle){toggle.textContent='收起';toggle.setAttribute('aria-expanded','true')}
    setTimeout(()=>atlas.scrollIntoView?.({block:'nearest',behavior:'smooth'}),0);
  }
}
function openNext(){hide();document.querySelector('#openPanel')?.click()}
function accept(detail){
  if(!detail?.discovery||!IDS.has(detail.system))return false;
  known.set(detail.system,detail.discovery);
  const discoveries=readDiscoveries();
  const atlasCount=discoveries?Object.entries(discoveries).filter(([system,discovery])=>IDS.has(system)&&typeof discovery==='string'&&discovery).length:0;
  return show({...detail,count:atlasCount||detail.count});
}
function sample(){
  const discoveries=readDiscoveries();if(!discoveries)return;
  const entries=Object.entries(discoveries).filter(([system,discovery])=>IDS.has(system)&&typeof discovery==='string'&&discovery);
  if(!primed){known=new Map(entries);primed=true;return}
  for(const [system,discovery] of entries){
    if(!known.has(system)){known.set(system,discovery);show({system,discovery,count:entries.length,total:TOTAL})}
    else known.set(system,discovery);
  }
  for(const system of [...known.keys()])if(!discoveries[system])known.delete(system);
}
addEventListener('stellarwarp:discovery-change',event=>accept(event.detail));
addEventListener('stellarwarp:journey-complete',hide);
document.querySelector('#space')?.addEventListener('webglcontextlost',hide);
ensureUi();sample();setInterval(sample,1000);
window.WarpDiscoveryDebrief={show,hide,visible(){return visible},entry(){return current?{...current}:null},sample};
})();
