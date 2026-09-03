(() => {
'use strict';

const STYLE_ID='journeyCorridorDepthStyle';
const ROOT_ID='journeyCorridorDepth';
const CORRIDORS=['SOL>LUNA','SOL>SIRIUS','SOL>PROX','LUNA>VEGA','LUNA>PROX','VEGA>CYG','CYG>ORION','TAU>SIRIUS','SIRIUS>PROX'];
const WARP_PHASES=new Set(['warpEntry','warp','warpExit']);
let mountObserver=null;

function ensureStyle(){
  if(document.querySelector(`#${STYLE_ID}`))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#journeyCorridorDepth{
  position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:0;
  contain:layout paint style;transform-origin:50% 48%;
  --depth-tilt:0deg;--depth-shift:0vw;--depth-skew:0deg;
  transition:opacity .24s ease,transform .42s cubic-bezier(.2,.7,.2,1)
}
#journeyCorridorDepth span{position:absolute;display:block;pointer-events:none;will-change:transform,opacity}
#journeyCorridorDepth .corridorDepthHorizon{
  left:50%;top:45%;width:clamp(28px,9vw,74px);height:clamp(28px,9vw,74px);
  border:1px solid rgba(var(--journey-alt-rgb),.48);border-radius:50%;
  transform:translate(-50%,-50%) rotate(var(--depth-tilt));
  background:radial-gradient(circle,rgba(var(--journey-alt-rgb),.12),transparent 64%);
  opacity:.48
}
#journeyCorridorDepth .corridorDepthRail{
  top:44%;bottom:-12%;width:1px;
  background:linear-gradient(180deg,rgba(var(--journey-alt-rgb),.08),rgba(var(--journey-rgb),.52) 58%,rgba(var(--journey-alt-rgb),.12));
  opacity:.58;transform-origin:50% 0
}
#journeyCorridorDepth .corridorDepthRailLeft{left:calc(50% + var(--depth-shift));transform:rotate(calc(-18deg + var(--depth-tilt))) skewX(var(--depth-skew))}
#journeyCorridorDepth .corridorDepthRailRight{right:calc(50% - var(--depth-shift));transform:rotate(calc(18deg + var(--depth-tilt))) skewX(var(--depth-skew))}
#journeyCorridorDepth .corridorDepthRungs{
  left:6%;right:6%;top:46%;bottom:-3%;
  clip-path:polygon(47% 0,53% 0,100% 100%,0 100%);
  background:repeating-linear-gradient(180deg,transparent 0 8%,rgba(var(--journey-alt-rgb),.2) 8.2% 8.55%,transparent 8.75% 16%);
  opacity:.62;transform:translateX(var(--depth-shift)) rotate(var(--depth-tilt));transform-origin:50% 0
}
#journeyCorridorDepth .corridorDepthNear{
  left:7%;right:7%;bottom:4%;height:23%;
  border-left:1px solid rgba(var(--journey-rgb),.2);border-right:1px solid rgba(var(--journey-alt-rgb),.2);
  border-bottom:1px solid rgba(var(--journey-alt-rgb),.13);
  transform:skewX(var(--depth-skew)) rotate(var(--depth-tilt));opacity:.5
}
#journeyTransit[data-corridor="SOL>LUNA"] #journeyCorridorDepth{--depth-tilt:-4deg;--depth-shift:-1.4vw;--depth-skew:-2deg}
#journeyTransit[data-corridor="SOL>SIRIUS"] #journeyCorridorDepth{--depth-tilt:5deg;--depth-shift:2.1vw;--depth-skew:5deg}
#journeyTransit[data-corridor="SOL>PROX"] #journeyCorridorDepth{--depth-tilt:-7deg;--depth-shift:2.8vw;--depth-skew:-4deg}
#journeyTransit[data-corridor="LUNA>VEGA"] #journeyCorridorDepth{--depth-tilt:2deg;--depth-shift:-2.2vw;--depth-skew:3deg}
#journeyTransit[data-corridor="LUNA>PROX"] #journeyCorridorDepth{--depth-tilt:-9deg;--depth-shift:-1vw;--depth-skew:-6deg}
#journeyTransit[data-corridor="VEGA>CYG"] #journeyCorridorDepth{--depth-tilt:8deg;--depth-shift:1.8vw;--depth-skew:2deg}
#journeyTransit[data-corridor="CYG>ORION"] #journeyCorridorDepth{--depth-tilt:-5deg;--depth-shift:3vw;--depth-skew:6deg}
#journeyTransit[data-corridor="TAU>SIRIUS"] #journeyCorridorDepth{--depth-tilt:6deg;--depth-shift:-2.8vw;--depth-skew:-3deg}
#journeyTransit[data-corridor="SIRIUS>PROX"] #journeyCorridorDepth{--depth-tilt:-3deg;--depth-shift:1.2vw;--depth-skew:4deg}
#journeyAtmosphere[data-phase="warpEntry"] #journeyCorridorDepth{opacity:.28;transform:scale(.72)}
#journeyAtmosphere[data-phase="warp"] #journeyCorridorDepth{opacity:.7;transform:scale(1)}
#journeyAtmosphere[data-phase="warpExit"] #journeyCorridorDepth{opacity:.3;transform:scale(1.18)}
#journeyAtmosphere[data-phase="decelerate"] #journeyCorridorDepth,
#journeyAtmosphere[data-phase="approach"] #journeyCorridorDepth,
#journeyAtmosphere[data-phase="observe"] #journeyCorridorDepth{opacity:0;transform:scale(1.24)}
#journeyAtmosphere[data-phase="warp"] #journeyCorridorDepth .corridorDepthRungs{animation:corridorDepthRush 1.65s linear infinite}
#journeyAtmosphere[data-phase="warp"] #journeyCorridorDepth .corridorDepthHorizon{animation:corridorDepthHorizon 2.8s ease-in-out infinite alternate}
#journeyAtmosphere[data-phase="warp"] #journeyCorridorDepth .corridorDepthNear{animation:corridorDepthNear 2.2s ease-in-out infinite alternate}
@keyframes corridorDepthRush{from{background-position:0 -15vh}to{background-position:0 22vh}}
@keyframes corridorDepthHorizon{from{opacity:.34;transform:translate(-50%,-50%) rotate(var(--depth-tilt)) scale(.88)}to{opacity:.62;transform:translate(-50%,-50%) rotate(var(--depth-tilt)) scale(1.1)}}
@keyframes corridorDepthNear{from{opacity:.34;transform:translate3d(-1.5vw,0,0) skewX(var(--depth-skew)) rotate(var(--depth-tilt))}to{opacity:.58;transform:translate3d(1.5vw,-1.5vh,0) skewX(var(--depth-skew)) rotate(var(--depth-tilt))}}
@media (max-width:520px){
  #journeyCorridorDepth .corridorDepthRungs{left:3%;right:3%;bottom:-1%}
  #journeyCorridorDepth .corridorDepthNear{left:4%;right:4%;bottom:5%;height:21%}
  #journeyCorridorDepth .corridorDepthRail{bottom:-8%}
}
@media (prefers-reduced-motion:reduce){
  #journeyCorridorDepth,#journeyCorridorDepth span{animation:none!important;transition:none!important}
  #journeyAtmosphere[data-phase="warp"] #journeyCorridorDepth{opacity:.54;transform:scale(1)}
}
`;
  document.head.append(style);
}

function mount(){
  const host=document.querySelector('#journeyTransit');
  if(!host)return false;
  if(host.querySelector(`#${ROOT_ID}`))return true;
  const root=document.createElement('div');
  root.id=ROOT_ID;
  root.setAttribute('aria-hidden','true');
  const horizon=document.createElement('span');horizon.className='corridorDepthHorizon';
  const left=document.createElement('span');left.className='corridorDepthRail corridorDepthRailLeft';
  const right=document.createElement('span');right.className='corridorDepthRail corridorDepthRailRight';
  const rungs=document.createElement('span');rungs.className='corridorDepthRungs';
  const near=document.createElement('span');near.className='corridorDepthNear';
  root.append(horizon,left,right,rungs,near);
  host.append(root);
  return true;
}

function ensureMount(){
  if(mount())return;
  if(mountObserver)return;
  mountObserver=new MutationObserver(()=>{
    if(!mount())return;
    mountObserver?.disconnect();mountObserver=null;
  });
  mountObserver.observe(document.documentElement,{childList:true,subtree:true});
}

function snapshot(){
  const atmosphere=document.querySelector('#journeyAtmosphere');
  const transit=document.querySelector('#journeyTransit');
  const root=document.querySelector(`#${ROOT_ID}`);
  const phase=atmosphere?.getAttribute('data-phase')||null;
  const corridor=transit?.getAttribute('data-corridor')||null;
  return{
    mounted:!!root,
    elements:root?.children?.length||0,
    phase,corridor,
    active:!!root&&CORRIDORS.includes(corridor)&&WARP_PHASES.has(phase)&&document.querySelector('#app')?.classList.contains('journeyAtmosphereActive')===true
  };
}

ensureStyle();ensureMount();
addEventListener('beforeunload',()=>mountObserver?.disconnect(),{once:true});
window.WarpJourneyCorridorDepth={snapshot,corridors:()=>[...CORRIDORS]};
})();
