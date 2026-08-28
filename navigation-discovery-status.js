(() => {
'use strict';

const SYSTEMS=[
  ['SOL','地球近軌'],['LUNA','月環基地'],['VEGA','織女星門'],['CYG','天鵝航標'],
  ['ORION','獵戶前哨'],['TAU','金牛塵海'],['SIRIUS','天狼中繼站'],['PROX','比鄰星港']
];
const IDS=new Set(SYSTEMS.map(([id])=>id));
const ID_BY_NAME=new Map(SYSTEMS.map(([id,name])=>[name,id]));
const TOTAL=7;
let observer=null;
let scheduled=false;

function readSnapshot(){
  try{return window.WarpStarAtlas?.snapshot?.()||null}catch{return null}
}
function readDiscoveries(){
  const raw=readSnapshot()?.discoveries;
  return raw&&typeof raw==='object'?raw:{};
}
function readVisited(){
  try{
    const raw=window.WarpTravelJournal?.visited?.();
    return new Set(Array.isArray(raw)?raw.filter(id=>IDS.has(id)):['SOL']);
  }catch{return new Set(['SOL'])}
}
function selectedSystem(){
  const routeName=document.querySelector('#destinationName')?.textContent?.trim();
  if(ID_BY_NAME.has(routeName))return ID_BY_NAME.get(routeName);
  const mapName=document.querySelector('#map .mapNode.selected text')?.textContent?.trim();
  return ID_BY_NAME.get(mapName)||null;
}
function ensureUi(){
  const routeLegs=document.querySelector('#routeLegs');
  const map=document.querySelector('#map');
  if(!routeLegs||!map)return false;
  if(!document.querySelector('#navDiscoveryStyle')){
    const style=document.createElement('style');
    style.id='navDiscoveryStyle';
    style.textContent='.navDiscoveryStatus{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-top:7px;padding:7px 8px;border:1px solid rgba(188,215,255,.11);border-radius:9px;background:rgba(255,255,255,.018);font-size:8px;line-height:1.35;color:var(--muted)}.navDiscoveryStatus strong{max-width:62%;font-size:8px;font-weight:760;text-align:right;color:#d9e8ff}.navDiscoveryStatus[data-state="complete"]{border-color:rgba(105,238,210,.2);background:rgba(73,190,164,.055)}.navDiscoveryStatus[data-state="complete"] strong{color:#a9f4e4}.mapNode.discovered .nodeCore{stroke:#77ead4;stroke-width:1.8}.mapNode .navDiscoveryMark{fill:#b7fff0;font-size:8px;font-weight:900;text-anchor:middle;pointer-events:none;paint-order:stroke;stroke:#050914;stroke-width:2px;stroke-linejoin:round}@media(min-width:900px){#app .navDiscoveryStatus,#app .navDiscoveryStatus strong{font-size:var(--ui-xs)}}';
    document.head.append(style);
  }
  let status=document.querySelector('#navDiscoveryStatus');
  if(!status){
    status=document.createElement('div');status.id='navDiscoveryStatus';status.className='navDiscoveryStatus';status.setAttribute('aria-live','polite');
    const progress=document.createElement('span');progress.id='navDiscoveryProgress';
    const detail=document.createElement('strong');detail.id='navDiscoveryDetail';
    status.append(progress,detail);routeLegs.insertAdjacentElement('beforebegin',status);
  }
  if(!observer){
    observer=new MutationObserver(schedule);
    observer.observe(map,{childList:true});
    map.addEventListener('click',schedule);
    document.querySelector('#openPanel')?.addEventListener('click',schedule);
  }
  return true;
}
function createSvgText(){
  return typeof document.createElementNS==='function'?document.createElementNS('http://www.w3.org/2000/svg','text'):document.createElement('text');
}
function markNodes(found){
  const map=document.querySelector('#map');if(!map)return;
  const visited=readVisited();
  for(const node of map.querySelectorAll('.mapNode')){
    const label=node.querySelector('text')?.textContent?.trim();
    const id=ID_BY_NAME.get(label);if(!id)continue;
    if(visited.has(id))node.classList.add('visited');
    const discovery=id!=='SOL'&&typeof found[id]==='string'?found[id].trim():'';
    const complete=!!discovery;
    node.classList.toggle('discovered',complete);
    node.setAttribute('data-discovery',complete?'complete':id==='SOL'?'home':'pending');
    let mark=node.querySelector('.navDiscoveryMark');
    if(complete&&!mark){
      mark=createSvgText();mark.classList.add('navDiscoveryMark');mark.setAttribute('x','8');mark.setAttribute('y','7');mark.setAttribute('aria-hidden','true');mark.textContent='✓';node.append(mark);
    }else if(!complete&&mark)mark.remove();
  }
}
function render(){
  if(!ensureUi())return false;
  const found=readDiscoveries();
  const count=Object.entries(found).filter(([id,value])=>id!=='SOL'&&IDS.has(id)&&typeof value==='string'&&value.trim()).length;
  markNodes(found);
  const progress=document.querySelector('#navDiscoveryProgress');
  const detail=document.querySelector('#navDiscoveryDetail');
  const status=document.querySelector('#navDiscoveryStatus');
  if(!progress||!detail||!status)return false;
  progress.textContent=`探索進度 ${count} / ${TOTAL} · ✓ 已發現`;
  const selected=selectedSystem();
  let state='idle',copy='點選星區查看探索狀態';
  if(selected==='SOL'){state='home';copy='母港 · 無外站發現';}
  else if(selected&&typeof found[selected]==='string'&&found[selected].trim()){state='complete';copy=`已收錄「${found[selected].trim()}」`;}
  else if(selected){state='pending';copy='尚未完成本站探索';}
  status.dataset.state=state;detail.textContent=copy;
  return true;
}
function schedule(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;render()});
}

addEventListener('stellarwarp:discovery-change',schedule);
addEventListener('stellarwarp:location-restored',schedule);
addEventListener('storage',schedule);
ensureUi();render();
window.WarpNavigationDiscovery={
  render,
  snapshot(){const found=readDiscoveries();return{selected:selectedSystem(),discoveries:{...found},visited:[...readVisited()]}}
};
})();
