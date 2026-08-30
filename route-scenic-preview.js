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
.routeScenicTrack{display:flex;gap:7px;margin-top:7px;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x proximity;padding-bottom:2px}
.routeScenicTrack::-webkit-scrollbar{height:3px}.routeScenicTrack::-webkit-scrollbar-thumb{background:rgba(171,207,255,.18);border-radius:99px}
.routeScenicCard{flex:0 0 min(72vw,232px);min-width:0;min-height:132px;padding:7px 8px 8px;border:1px solid rgba(170,205,255,.11);border-radius:11px;background:rgba(4,10,22,.5);scroll-snap-align:start;overflow:hidden}
.routeScenicCard[data-reverse="true"]{border-color:rgba(190,176,255,.14)}
.routeScenicVisual{position:relative;height:62px;border-radius:8px;overflow:hidden;isolation:isolate;background:radial-gradient(circle at 50% 32%,rgba(154,202,255,.12),transparent 36%),linear-gradient(150deg,#071126,#030713 70%);box-shadow:inset 0 0 0 1px rgba(202,225,255,.08)}
.routeScenicVisual::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle at 12% 20%,rgba(255,255,255,.72) 0 1px,transparent 1.4px),radial-gradient(circle at 77% 28%,rgba(203,226,255,.58) 0 1px,transparent 1.3px),radial-gradient(circle at 42% 74%,rgba(255,255,255,.52) 0 1px,transparent 1.3px),radial-gradient(circle at 91% 78%,rgba(180,210,255,.44) 0 1px,transparent 1.2px);opacity:.65}
.routeScenicLayer{position:absolute;display:block;pointer-events:none}
.routeScenicFar{inset:6px 9px 12px 8px}.routeScenicMid{inset:11px 17px 8px 26px}.routeScenicNear{inset:31px 8px 6px 44%}
.routeScenicVector{position:absolute;left:7px;bottom:5px;z-index:4;font-size:5.8px;letter-spacing:.09em;color:rgba(226,239,255,.72);text-shadow:0 1px 5px #02040b}
.routeScenicCard[data-corridor="SOL>LUNA"] .routeScenicFar{border:1px solid rgba(147,207,255,.46);border-left-color:transparent;border-radius:50%;transform:rotate(16deg)}
.routeScenicCard[data-corridor="SOL>LUNA"] .routeScenicMid{background:radial-gradient(circle at 68% 45%,rgba(228,240,255,.78) 0 12%,rgba(113,177,255,.12) 29%,transparent 48%);border-radius:50%}
.routeScenicCard[data-corridor="SOL>LUNA"] .routeScenicNear{border:1px solid rgba(191,220,255,.27);border-right-color:transparent;border-radius:50%}
.routeScenicCard[data-corridor="SOL>SIRIUS"] .routeScenicFar{background:linear-gradient(142deg,transparent 0 25%,rgba(196,239,255,.28) 26% 28%,transparent 29% 52%,rgba(112,202,255,.2) 53% 55%,transparent 56%)}
.routeScenicCard[data-corridor="SOL>SIRIUS"] .routeScenicMid{border-top:1px solid rgba(222,248,255,.55);border-bottom:1px solid rgba(113,208,255,.22);transform:rotate(-17deg)}
.routeScenicCard[data-corridor="SOL>SIRIUS"] .routeScenicNear{background:linear-gradient(115deg,transparent 20%,rgba(215,247,255,.42) 22% 25%,transparent 27%);transform:rotate(18deg)}
.routeScenicCard[data-corridor="SOL>PROX"] .routeScenicFar{border:1px solid rgba(255,103,76,.42);border-bottom-color:transparent;border-radius:50%;transform:rotate(-18deg)}
.routeScenicCard[data-corridor="SOL>PROX"] .routeScenicMid{border:1px solid rgba(255,186,111,.28);border-top-color:transparent;border-radius:50%;transform:rotate(28deg)}
.routeScenicCard[data-corridor="SOL>PROX"] .routeScenicNear{background:radial-gradient(ellipse at center,rgba(255,74,48,.28),transparent 64%);border-radius:50%}
.routeScenicCard[data-corridor="LUNA>VEGA"] .routeScenicFar{background:radial-gradient(circle,transparent 0 42%,rgba(199,240,255,.32) 43% 46%,transparent 47% 61%,rgba(91,194,255,.22) 62% 65%,transparent 66%)}
.routeScenicCard[data-corridor="LUNA>VEGA"] .routeScenicMid{background:radial-gradient(circle,transparent 0 37%,rgba(130,215,255,.38) 38% 42%,transparent 43%);border-radius:50%}
.routeScenicCard[data-corridor="LUNA>VEGA"] .routeScenicNear{border-top:1px solid rgba(215,245,255,.44);border-bottom:1px solid rgba(91,194,255,.25);transform:rotate(-18deg)}
.routeScenicCard[data-corridor="LUNA>PROX"] .routeScenicFar{border-radius:58% 42% 65% 35%;background:radial-gradient(circle at 25% 30%,rgba(214,225,242,.25) 0 5%,transparent 8%),radial-gradient(circle at 65% 58%,rgba(129,137,157,.2) 0 8%,transparent 12%),linear-gradient(145deg,rgba(103,114,139,.16),transparent 72%)}
.routeScenicCard[data-corridor="LUNA>PROX"] .routeScenicMid{border-radius:37% 63% 43% 57%;background:radial-gradient(circle at 72% 24%,rgba(255,111,75,.22) 0 6%,transparent 9%),linear-gradient(40deg,rgba(255,92,62,.12),rgba(92,100,119,.08),transparent 75%)}
.routeScenicCard[data-corridor="LUNA>PROX"] .routeScenicNear{border-radius:63% 37% 54% 46%;background:radial-gradient(circle at 68% 34%,rgba(255,159,93,.18),rgba(71,78,93,.1) 42%,transparent 66%)}
.routeScenicCard[data-corridor="VEGA>CYG"] .routeScenicFar{background:linear-gradient(11deg,transparent 0 38%,rgba(122,211,255,.44) 40% 42%,transparent 44%),linear-gradient(21deg,transparent 0 56%,rgba(201,176,255,.34) 58% 60%,transparent 62%)}
.routeScenicCard[data-corridor="VEGA>CYG"] .routeScenicMid{border:1px solid rgba(154,208,255,.26);border-left-color:transparent;border-radius:50%;transform:rotate(-12deg)}
.routeScenicCard[data-corridor="VEGA>CYG"] .routeScenicNear{background:radial-gradient(circle at 78% 42%,rgba(185,150,255,.34) 0 8%,transparent 11%),radial-gradient(circle at 45% 64%,rgba(85,190,255,.28) 0 7%,transparent 10%)}
.routeScenicCard[data-corridor="CYG>ORION"] .routeScenicFar{background:radial-gradient(ellipse at 18% 28%,rgba(151,121,255,.32),transparent 46%),radial-gradient(ellipse at 78% 65%,rgba(255,103,75,.28),transparent 48%)}
.routeScenicCard[data-corridor="CYG>ORION"] .routeScenicMid{background:linear-gradient(150deg,transparent 22%,rgba(212,136,255,.17) 28%,transparent 36% 54%,rgba(255,135,95,.2) 60%,transparent 68%);filter:blur(.2px)}
.routeScenicCard[data-corridor="CYG>ORION"] .routeScenicNear{border-top:1px solid rgba(255,170,122,.36);transform:rotate(-22deg)}
.routeScenicCard[data-corridor="TAU>SIRIUS"] .routeScenicFar{background:radial-gradient(ellipse at 32% 55%,rgba(236,104,198,.28),transparent 50%),radial-gradient(ellipse at 77% 33%,rgba(165,127,255,.2),transparent 42%)}
.routeScenicCard[data-corridor="TAU>SIRIUS"] .routeScenicMid{background:linear-gradient(132deg,transparent 0 42%,rgba(218,244,255,.38) 44% 47%,transparent 49%);transform:rotate(9deg)}
.routeScenicCard[data-corridor="TAU>SIRIUS"] .routeScenicNear{border-left:1px solid rgba(154,221,255,.36);border-top:1px solid rgba(230,248,255,.27);transform:skew(-17deg) rotate(-14deg)}
.routeScenicCard[data-corridor="SIRIUS>PROX"] .routeScenicFar{border:1px solid rgba(153,220,255,.3);border-right-color:transparent;border-radius:50%;transform:rotate(24deg)}
.routeScenicCard[data-corridor="SIRIUS>PROX"] .routeScenicMid{background:radial-gradient(ellipse at 75% 45%,rgba(255,95,66,.25),transparent 48%),linear-gradient(120deg,rgba(188,233,255,.14),transparent 52%)}
.routeScenicCard[data-corridor="SIRIUS>PROX"] .routeScenicNear{background:linear-gradient(125deg,transparent 32%,rgba(255,179,110,.32) 34% 37%,transparent 39%);transform:rotate(13deg)}
.routeScenicStep{margin-top:6px;font-size:6.5px;letter-spacing:.13em;color:rgba(164,204,255,.58);font-weight:800}
.routeScenicTitle{margin-top:3px;font-size:9px;font-weight:800;color:#f0f6ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.routeScenicSignature{margin-top:4px;font-size:7px;line-height:1.4;color:rgba(218,232,255,.58)}
.routeScenicDestination{margin-top:5px;font-size:6.5px;color:#a9d2ff}
@media(min-width:700px){.routeScenicCard{flex-basis:218px}}
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
function makeVisual(item){
  const visual=document.createElement('div');visual.className='routeScenicVisual';visual.setAttribute('aria-hidden','true');
  const far=document.createElement('span');far.className='routeScenicLayer routeScenicFar';
  const mid=document.createElement('span');mid.className='routeScenicLayer routeScenicMid';
  const near=document.createElement('span');near.className='routeScenicLayer routeScenicNear';
  const vector=document.createElement('span');vector.className='routeScenicVector';vector.textContent=`${item.from} → ${item.to}`;
  visual.append(far,mid,near,vector);
  return visual;
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
    const visual=makeVisual(item);
    const step=document.createElement('div');step.className='routeScenicStep';step.textContent=`航段 ${String(index+1).padStart(2,'0')}`;
    const title=document.createElement('div');title.className='routeScenicTitle';title.textContent=item.name;
    const signature=document.createElement('div');signature.className='routeScenicSignature';signature.textContent=item.signature;
    const destination=document.createElement('div');destination.className='routeScenicDestination';destination.textContent=`→ ${item.destination}`;
    card.append(visual,step,title,signature,destination);track.append(card);
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