(() => {
'use strict';
if(window.WarpRouteScenicPreview)return;

const STYLE_ID='routeScenicPreviewStyle';
let root=null,track=null,summary=null,observer=null,routeHost=null,scheduled=false;
let lastSnapshot={visible:false,cards:0,key:'',corridors:[]};

function source(){
  try{
    const api=window.WarpJourneyAtmosphere;
    if(!api||typeof api.corridors!=='function'||typeof api.profiles!=='function')return null;
    return{corridors:api.corridors(),profiles:api.profiles()};
  }catch{return null}
}
function state(){
  try{return window.WarpSim?.state?.()||null}catch{return null}
}
function corridorFor(corridors,from,to){
  const direct=`${from}>${to}`,reverse=`${to}>${from}`;
  if(corridors[direct])return{id:direct,profile:corridors[direct],reverse:false};
  if(corridors[reverse])return{id:reverse,profile:corridors[reverse],reverse:true};
  return null;
}
function ensureStyle(){
  if(document.querySelector(`#${STYLE_ID}`))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#routeScenicPreview{display:none;margin-top:8px;padding:9px;border:1px solid rgba(171,207,255,.14);border-radius:13px;background:linear-gradient(145deg,rgba(106,164,255,.055),rgba(112,91,190,.035));overflow:hidden}
#routeScenicPreview.show{display:block}
.routeScenicHead{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}
.routeScenicHead strong{font-size:9px;color:#e2efff;letter-spacing:.04em}
.routeScenicHead span{font-size:7px;color:rgba(205,224,255,.5);white-space:nowrap}
.routeScenicTrack{display:flex;gap:6px;margin-top:7px;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x proximity;padding-bottom:2px}
.routeScenicTrack::-webkit-scrollbar{height:3px}.routeScenicTrack::-webkit-scrollbar-thumb{background:rgba(171,207,255,.18);border-radius:99px}
.routeScenicCard{flex:0 0 min(68vw,220px);min-width:0;min-height:72px;padding:8px 9px;border:1px solid rgba(170,205,255,.11);border-radius:10px;background:rgba(4,10,22,.48);scroll-snap-align:start}
.routeScenicCard[data-reverse="true"]{border-color:rgba(190,176,255,.13)}
.routeScenicStep{font-size:6.5px;letter-spacing:.13em;color:rgba(164,204,255,.58);font-weight:800}
.routeScenicTitle{margin-top:3px;font-size:9px;font-weight:800;color:#f0f6ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.routeScenicSignature{margin-top:4px;font-size:7px;line-height:1.4;color:rgba(218,232,255,.58)}
.routeScenicDestination{margin-top:5px;font-size:6.5px;color:#a9d2ff}
@media(min-width:700px){.routeScenicCard{flex-basis:205px}}
@media(prefers-reduced-motion:reduce){.routeScenicTrack{scroll-behavior:auto}}
`;
  document.head.append(style);
}
function ensureUi(){
  const host=document.querySelector('#routeLegs');
  if(!host)return false;
  ensureStyle();
  if(!root){
    root=document.createElement('section');
    root.id='routeScenicPreview';
    root.setAttribute('aria-label','航道景觀預覽');
    const head=document.createElement('div');head.className='routeScenicHead';
    const title=document.createElement('strong');title.textContent='航道景觀預覽';
    summary=document.createElement('span');summary.textContent='未選擇航線';
    head.append(title,summary);
    track=document.createElement('div');track.className='routeScenicTrack';
    root.append(head,track);
    host.insertAdjacentElement('afterend',root);
  }else if(root.previousElementSibling!==host){
    host.insertAdjacentElement('afterend',root);
  }
  if(routeHost!==host){
    observer?.disconnect();
    routeHost=host;
    observer=new MutationObserver(schedule);
    observer.observe(routeHost,{childList:true});
  }
  return true;
}
function clear(){
  track?.replaceChildren();
  root?.classList.remove('show');
  if(summary)summary.textContent='未選擇航線';
  lastSnapshot={visible:false,cards:0,key:'',corridors:[]};
  return false;
}
function render(){
  if(!ensureUi())return clear();
  const s=state(),src=source(),route=Array.isArray(s?.route)?s.route.filter(Boolean):[];
  if(!src||route.length<2)return clear();
  const key=route.join('>'),cards=[];
  for(let i=0;i<route.length-1;i++){
    const from=route[i],to=route[i+1],resolved=corridorFor(src.corridors,from,to),destination=src.profiles[to];
    const profile=resolved?.profile||destination;
    if(!profile)continue;
    cards.push({from,to,id:resolved?.id||null,reverse:!!resolved?.reverse,name:profile.name||destination?.corridor||'深空航道',signature:profile.signature||destination?.signature||'',destination:destination?.name||to});
  }
  if(!cards.length)return clear();
  track.replaceChildren();
  cards.forEach((item,index)=>{
    const card=document.createElement('article');card.className='routeScenicCard';card.dataset.reverse=String(item.reverse);if(item.id)card.dataset.corridor=item.id;
    const step=document.createElement('div');step.className='routeScenicStep';step.textContent=`航段 ${String(index+1).padStart(2,'0')}`;
    const title=document.createElement('div');title.className='routeScenicTitle';title.textContent=item.name;
    const signature=document.createElement('div');signature.className='routeScenicSignature';signature.textContent=item.signature;
    const destination=document.createElement('div');destination.className='routeScenicDestination';destination.textContent=`→ ${item.destination}`;
    card.append(step,title,signature,destination);track.append(card);
  });
  summary.textContent=`${cards.length} 段 · ${new Set(cards.map(card=>card.id||card.name)).size} 個識別航道`;
  root.classList.add('show');
  lastSnapshot={visible:true,cards:cards.length,key,corridors:cards.map(card=>({id:card.id,name:card.name,reverse:card.reverse,from:card.from,to:card.to}))};
  return true;
}
function schedule(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;render()});
}
function init(){
  ensureUi();render();
  window.addEventListener('load',schedule,{once:true});
}
window.WarpRouteScenicPreview={
  render,
  snapshot(){return{...lastSnapshot,corridors:lastSnapshot.corridors.map(item=>({...item}))}}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();