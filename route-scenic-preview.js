(() => {
'use strict';
if(window.WarpRouteScenicPreview)return;

const STYLE_ID='routeScenicPreviewStyle';
let root=null,track=null,summary=null,nav=null,startButton=null,arrivalButton=null,observer=null,routeHost=null,scheduled=false;
let lastSnapshot={visible:false,cards:0,key:'',corridors:[],arrival:null};

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
.routeScenicArrivalCard{flex:0 0 min(78vw,250px);min-height:132px;padding:7px 8px 8px;border:1px solid rgba(207,226,255,.22);border-radius:11px;background:linear-gradient(150deg,rgba(95,158,255,.1),rgba(136,102,213,.05));scroll-snap-align:start;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.025)}
.routeScenicArrivalVisual{position:relative;height:62px;border-radius:8px;overflow:hidden;isolation:isolate;background:radial-gradient(circle at 50% 42%,rgba(177,215,255,.12),transparent 38%),linear-gradient(150deg,#071126,#02050e 72%);box-shadow:inset 0 0 0 1px rgba(216,232,255,.1)}
.routeScenicArrivalVisual::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle at 8% 18%,rgba(255,255,255,.65) 0 1px,transparent 1.3px),radial-gradient(circle at 82% 16%,rgba(203,226,255,.5) 0 1px,transparent 1.3px),radial-gradient(circle at 55% 82%,rgba(255,255,255,.45) 0 1px,transparent 1.2px);opacity:.62}
.routeScenicArrivalVisual .routeScenicFar,.routeScenicArrivalVisual .routeScenicMid,.routeScenicArrivalVisual .routeScenicNear{position:absolute;display:block;pointer-events:none}
.routeScenicArrivalVisual .routeScenicFar{inset:5px 8px 7px}.routeScenicArrivalVisual .routeScenicMid{inset:9px 17px 8px 28px}.routeScenicArrivalVisual .routeScenicNear{inset:27px 8px 5px 48%}
.routeScenicArrivalLabel{position:absolute;left:7px;bottom:5px;z-index:4;font-size:5.8px;letter-spacing:.12em;color:rgba(237,246,255,.78);text-shadow:0 1px 5px #02040b}
.routeScenicArrivalVisual[data-destination="SOL"] .routeScenicFar{border:1px solid rgba(111,190,255,.45);border-radius:50%;transform:rotate(15deg)}
.routeScenicArrivalVisual[data-destination="SOL"] .routeScenicMid{border-radius:50%;background:radial-gradient(circle at 62% 52%,#7fc4ff 0 18%,#173b78 20% 31%,rgba(60,140,230,.12) 39%,transparent 52%)}
.routeScenicArrivalVisual[data-destination="SOL"] .routeScenicNear{border-radius:50%;background:radial-gradient(circle at 70% 46%,rgba(229,235,235,.84) 0 12%,transparent 14%)}
.routeScenicArrivalVisual[data-destination="LUNA"] .routeScenicFar{border-radius:50%;background:radial-gradient(circle at 37% 52%,rgba(212,215,218,.82) 0 28%,rgba(94,99,109,.45) 29% 34%,transparent 38%)}
.routeScenicArrivalVisual[data-destination="LUNA"] .routeScenicMid{border:1px solid rgba(206,231,255,.42);border-left-color:transparent;border-radius:50%;transform:rotate(19deg)}
.routeScenicArrivalVisual[data-destination="LUNA"] .routeScenicNear{border-radius:50%;background:radial-gradient(circle at 75% 38%,rgba(91,172,255,.72) 0 10%,transparent 13%)}
.routeScenicArrivalVisual[data-destination="VEGA"] .routeScenicFar{background:radial-gradient(circle at 22% 40%,rgba(218,243,255,.85) 0 9%,rgba(104,199,255,.12) 21%,transparent 36%)}
.routeScenicArrivalVisual[data-destination="VEGA"] .routeScenicMid{border:2px solid rgba(128,214,255,.48);border-radius:50%;box-shadow:0 0 0 5px rgba(192,236,255,.12)}
.routeScenicArrivalVisual[data-destination="VEGA"] .routeScenicNear{border:1px solid rgba(224,247,255,.5);border-radius:50%;transform:rotate(-12deg)}
.routeScenicArrivalVisual[data-destination="CYG"] .routeScenicFar{background:radial-gradient(circle at 28% 42%,rgba(155,204,255,.85) 0 9%,rgba(91,164,255,.12) 18%,transparent 28%),radial-gradient(circle at 72% 55%,rgba(204,172,255,.8) 0 8%,rgba(152,108,255,.12) 17%,transparent 28%)}
.routeScenicArrivalVisual[data-destination="CYG"] .routeScenicMid{border:1px solid rgba(176,206,255,.38);border-radius:50%;transform:rotate(27deg)}
.routeScenicArrivalVisual[data-destination="CYG"] .routeScenicNear{background:linear-gradient(115deg,transparent 38%,rgba(135,205,255,.38) 40% 43%,transparent 45%)}
.routeScenicArrivalVisual[data-destination="ORION"] .routeScenicFar{background:radial-gradient(circle at 72% 38%,rgba(255,126,76,.9) 0 17%,rgba(255,96,49,.18) 29%,transparent 43%),radial-gradient(ellipse at 24% 72%,rgba(214,90,73,.2),transparent 48%)}
.routeScenicArrivalVisual[data-destination="ORION"] .routeScenicMid{background:linear-gradient(151deg,transparent 23%,rgba(255,174,110,.18) 31%,transparent 42% 60%,rgba(174,91,255,.12) 68%,transparent 76%)}
.routeScenicArrivalVisual[data-destination="ORION"] .routeScenicNear{border-radius:58% 42% 50% 50%;background:linear-gradient(160deg,rgba(125,72,56,.72),rgba(48,29,28,.2));border-top:1px solid rgba(255,177,125,.35)}
.routeScenicArrivalVisual[data-destination="TAU"] .routeScenicFar{border-radius:50%;background:radial-gradient(circle at 48% 48%,rgba(205,97,187,.82) 0 24%,rgba(115,66,158,.22) 30%,transparent 39%)}
.routeScenicArrivalVisual[data-destination="TAU"] .routeScenicMid{border:2px solid rgba(245,171,222,.48);border-top-color:rgba(180,120,233,.2);border-radius:50%;transform:rotate(18deg) scaleX(1.18)}
.routeScenicArrivalVisual[data-destination="TAU"] .routeScenicNear{background:radial-gradient(ellipse at 50% 70%,rgba(238,108,199,.22),transparent 64%);border-radius:50%}
.routeScenicArrivalVisual[data-destination="SIRIUS"] .routeScenicFar{background:radial-gradient(circle at 25% 40%,rgba(198,246,255,.9) 0 11%,rgba(100,215,255,.14) 21%,transparent 31%),radial-gradient(circle at 72% 54%,rgba(245,252,255,.82) 0 7%,transparent 15%)}
.routeScenicArrivalVisual[data-destination="SIRIUS"] .routeScenicMid{border:1px solid rgba(153,239,255,.45);border-radius:50%;transform:rotate(-18deg)}
.routeScenicArrivalVisual[data-destination="SIRIUS"] .routeScenicNear{border:1px solid rgba(222,250,255,.32);border-left-color:transparent;border-radius:50%}
.routeScenicArrivalVisual[data-destination="PROX"] .routeScenicFar{background:radial-gradient(circle at 23% 38%,rgba(255,99,69,.88) 0 13%,rgba(255,82,48,.16) 25%,transparent 38%)}
.routeScenicArrivalVisual[data-destination="PROX"] .routeScenicMid{border-radius:50%;background:radial-gradient(circle at 62% 57%,rgba(255,112,63,.74) 0 18%,rgba(106,38,30,.42) 20% 29%,transparent 33%)}
.routeScenicArrivalVisual[data-destination="PROX"] .routeScenicNear{border:1px solid rgba(255,173,130,.42);border-right-color:transparent;border-radius:50%;transform:rotate(14deg)}
.routeScenicStep{margin-top:6px;font-size:6.5px;letter-spacing:.13em;color:rgba(164,204,255,.58);font-weight:800}
.routeScenicTitle{margin-top:3px;font-size:9px;font-weight:800;color:#f0f6ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.routeScenicSignature{margin-top:4px;font-size:7px;line-height:1.4;color:rgba(218,232,255,.58)}
.routeScenicDestination{margin-top:5px;font-size:6.5px;color:#a9d2ff}
.routeScenicArrivalCard .routeScenicStep{color:rgba(207,225,255,.72)}.routeScenicArrivalCard .routeScenicDestination{color:#c8e2ff}
.routeScenicNav{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
.routeScenicNav button{min-height:44px;border:1px solid rgba(176,211,255,.18);border-radius:10px;background:rgba(111,164,255,.07);color:#dcecff;font:inherit;font-size:7.5px;font-weight:760;letter-spacing:.035em;touch-action:manipulation}
.routeScenicNav button:last-child{border-color:rgba(206,218,255,.26);background:linear-gradient(145deg,rgba(107,171,255,.14),rgba(133,103,218,.08));color:#f0f5ff}
.routeScenicNav button:focus-visible{outline:2px solid rgba(180,218,255,.72);outline-offset:2px}
.routeScenicNav button:disabled{opacity:.38}
@media(min-width:700px){.routeScenicCard{flex-basis:218px}.routeScenicArrivalCard{flex-basis:236px}}
@media(prefers-reduced-motion:reduce){.routeScenicTrack{scroll-behavior:auto}}
`;
  document.head.append(style);
}
function scrollToEdge(edge){
  if(!track||!root?.classList.contains('show'))return false;
  const left=edge==='arrival'?Math.max(0,track.scrollWidth-track.clientWidth):0;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  track.scrollTo({left,behavior:reduced?'auto':'smooth'});
  return true;
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
    nav=document.createElement('div');nav.className='routeScenicNav';nav.setAttribute('aria-label','航道預覽導覽');
    startButton=document.createElement('button');startButton.type='button';startButton.dataset.routeScenicJump='start';startButton.textContent='起點景觀';startButton.addEventListener('click',()=>scrollToEdge('start'));
    arrivalButton=document.createElement('button');arrivalButton.type='button';arrivalButton.dataset.routeScenicJump='arrival';arrivalButton.textContent='看抵達構圖';arrivalButton.addEventListener('click',()=>scrollToEdge('arrival'));
    nav.append(startButton,arrivalButton);
    root.append(head,track,nav);
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
  if(startButton)startButton.disabled=true;
  if(arrivalButton){arrivalButton.disabled=true;arrivalButton.removeAttribute('aria-label')}
  lastSnapshot={visible:false,cards:0,key:'',corridors:[],arrival:null};
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
function makeArrivalCard(id,profile){
  if(!id||!profile)return null;
  const card=document.createElement('article');card.className='routeScenicArrivalCard';card.dataset.destination=id;
  const visual=document.createElement('div');visual.className='routeScenicArrivalVisual';visual.dataset.destination=id;visual.setAttribute('aria-hidden','true');
  const far=document.createElement('span');far.className='routeScenicFar';const mid=document.createElement('span');mid.className='routeScenicMid';const near=document.createElement('span');near.className='routeScenicNear';const label=document.createElement('span');label.className='routeScenicArrivalLabel';label.textContent=`ARRIVAL · ${id}`;visual.append(far,mid,near,label);
  const step=document.createElement('div');step.className='routeScenicStep';step.textContent='抵達構圖';
  const title=document.createElement('div');title.className='routeScenicTitle';title.textContent=profile.name||id;
  const signature=document.createElement('div');signature.className='routeScenicSignature';signature.textContent=profile.signature||profile.corridor||'目的地近場景觀';
  const destination=document.createElement('div');destination.className='routeScenicDestination';destination.textContent='曲速脫離 → 連續減速 → 到站探索';
  card.append(visual,step,title,signature,destination);
  return card;
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
  const arrivalId=route[route.length-1],arrivalProfile=src.profiles[arrivalId],arrivalCard=makeArrivalCard(arrivalId,arrivalProfile);
  if(arrivalCard)track.append(arrivalCard);
  summary.textContent=arrivalProfile?`${cards.length} 段 · 抵達 ${arrivalProfile.name}`:`${cards.length} 段 · ${new Set(cards.map(card=>card.id||card.name)).size} 個識別航道`;
  if(startButton)startButton.disabled=false;
  if(arrivalButton){arrivalButton.disabled=!arrivalCard;if(arrivalProfile)arrivalButton.setAttribute('aria-label',`查看${arrivalProfile.name||arrivalId}抵達構圖`)}
  root.classList.add('show');
  lastSnapshot={visible:true,cards:cards.length,key,corridors:cards.map(card=>({id:card.id,name:card.name,reverse:card.reverse,from:card.from,to:card.to})),arrival:arrivalProfile?{id:arrivalId,name:arrivalProfile.name||arrivalId,signature:arrivalProfile.signature||''}:null};
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
  snapshot(){return{...lastSnapshot,corridors:lastSnapshot.corridors.map(item=>({...item})),arrival:lastSnapshot.arrival?{...lastSnapshot.arrival}:null}}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();