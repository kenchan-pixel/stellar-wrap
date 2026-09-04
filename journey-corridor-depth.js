(() => {
'use strict';

const STYLE_ID='journeyCorridorDepthStyle';
const ROOT_ID='journeyCorridorDepth';
const APPROACH_ROOT_ID='journeyApproachDepth';
const CORRIDORS=['SOL>LUNA','SOL>SIRIUS','SOL>PROX','LUNA>VEGA','LUNA>PROX','VEGA>CYG','CYG>ORION','TAU>SIRIUS','SIRIUS>PROX'];
const SYSTEMS=['SOL','LUNA','VEGA','CYG','ORION','TAU','SIRIUS','PROX'];
const WARP_PHASES=new Set(['warpEntry','warp','warpExit']);
const APPROACH_PHASES=new Set(['warpExit','decelerate','approach']);
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

#journeyApproachDepth{
  position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:0;
  contain:layout paint style;
  --approach-x:72%;--approach-y:42%;--approach-tilt:0deg;--approach-mid-tilt:0deg;--approach-near-tilt:0deg;--approach-skew:0deg;
  transition:opacity .32s ease
}
#journeyApproachDepth span{
  position:absolute;display:block;left:var(--approach-x);top:var(--approach-y);
  pointer-events:none;border-radius:50%;transform-origin:50% 50%;
  transition:transform .72s cubic-bezier(.2,.7,.2,1),opacity .42s ease
}
#journeyApproachDepth::before,#journeyApproachDepth::after{
  content:"";position:absolute;display:block;left:var(--approach-x);top:var(--approach-y);
  pointer-events:none;border-radius:50%;opacity:0;transform-origin:50% 50%;
  transition:transform .72s cubic-bezier(.2,.7,.2,1),opacity .34s ease
}
#journeyApproachDepth::before{
  width:clamp(210px,72vw,560px);height:clamp(142px,49vw,380px);
  border:1px solid rgba(var(--journey-alt-rgb),.28);border-left-color:rgba(var(--journey-rgb),.06);border-bottom-color:transparent;
  background:radial-gradient(ellipse at 50% 50%,transparent 53%,rgba(var(--journey-alt-rgb),.055) 54%,transparent 63%)
}
#journeyApproachDepth::after{
  width:clamp(136px,45vw,360px);height:clamp(92px,31vw,250px);
  border:1px solid rgba(var(--journey-rgb),.34);border-right-color:transparent;border-top-color:rgba(var(--journey-alt-rgb),.1)
}
#journeyApproachDepth .approachDepthFar{
  width:clamp(150px,48vw,390px);height:clamp(112px,36vw,292px);
  border:1px solid rgba(var(--journey-alt-rgb),.24);border-left-color:rgba(var(--journey-alt-rgb),.07);
  border-bottom-color:transparent;opacity:.34;
  background:radial-gradient(ellipse at 50% 50%,rgba(var(--journey-rgb),.035),transparent 67%)
}
#journeyApproachDepth .approachDepthMid{
  width:clamp(112px,34vw,278px);height:clamp(82px,25vw,205px);
  border:1px solid rgba(var(--journey-rgb),.34);border-right-color:transparent;
  border-top-color:rgba(var(--journey-alt-rgb),.12);opacity:.42
}
#journeyApproachDepth .approachDepthNear{
  width:clamp(76px,23vw,188px);height:clamp(56px,17vw,140px);
  border:1px solid rgba(var(--journey-alt-rgb),.46);border-left-color:transparent;
  border-bottom-color:rgba(var(--journey-rgb),.14);opacity:.5
}
#journeyAtmosphere[data-system="SOL"] #journeyApproachDepth{--approach-x:72%;--approach-y:40%;--approach-tilt:6deg;--approach-mid-tilt:-3deg;--approach-near-tilt:3deg;--approach-skew:2deg}
#journeyAtmosphere[data-system="LUNA"] #journeyApproachDepth{--approach-x:29%;--approach-y:42%;--approach-tilt:-8deg;--approach-mid-tilt:4deg;--approach-near-tilt:-4deg;--approach-skew:-3deg}
#journeyAtmosphere[data-system="VEGA"] #journeyApproachDepth{--approach-x:72%;--approach-y:39%;--approach-tilt:12deg;--approach-mid-tilt:-6deg;--approach-near-tilt:5deg;--approach-skew:4deg}
#journeyAtmosphere[data-system="CYG"] #journeyApproachDepth{--approach-x:31%;--approach-y:41%;--approach-tilt:-5deg;--approach-mid-tilt:3deg;--approach-near-tilt:-2deg;--approach-skew:-2deg}
#journeyAtmosphere[data-system="ORION"] #journeyApproachDepth{--approach-x:71%;--approach-y:39%;--approach-tilt:9deg;--approach-mid-tilt:-5deg;--approach-near-tilt:4deg;--approach-skew:5deg}
#journeyAtmosphere[data-system="TAU"] #journeyApproachDepth{--approach-x:31%;--approach-y:40%;--approach-tilt:-13deg;--approach-mid-tilt:7deg;--approach-near-tilt:-6deg;--approach-skew:-5deg}
#journeyAtmosphere[data-system="SIRIUS"] #journeyApproachDepth{--approach-x:71%;--approach-y:41%;--approach-tilt:5deg;--approach-mid-tilt:-3deg;--approach-near-tilt:2deg;--approach-skew:3deg}
#journeyAtmosphere[data-system="PROX"] #journeyApproachDepth{--approach-x:30%;--approach-y:40%;--approach-tilt:-7deg;--approach-mid-tilt:4deg;--approach-near-tilt:-3deg;--approach-skew:-4deg}
#journeyAtmosphere[data-phase="warpEntry"] #journeyApproachDepth,
#journeyAtmosphere[data-phase="warp"] #journeyApproachDepth{opacity:0}
#journeyAtmosphere[data-phase="warpExit"] #journeyApproachDepth{opacity:.16}
#journeyAtmosphere[data-phase="decelerate"] #journeyApproachDepth{opacity:.34}
#journeyAtmosphere[data-phase="approach"] #journeyApproachDepth{opacity:.58}
#journeyAtmosphere[data-phase="observe"] #journeyApproachDepth{opacity:0}
#journeyAtmosphere[data-phase="warpExit"] #journeyApproachDepth::before{opacity:.46;transform:translate(-50%,-50%) rotate(var(--approach-tilt)) skewX(var(--approach-skew)) scale(.5)}
#journeyAtmosphere[data-phase="warpExit"] #journeyApproachDepth::after{opacity:.34;transform:translate(-50%,-50%) rotate(var(--approach-mid-tilt)) scale(.34)}
#journeyAtmosphere[data-phase="decelerate"] #journeyApproachDepth::before{opacity:.36;transform:translate(-50%,-50%) rotate(var(--approach-tilt)) skewX(var(--approach-skew)) scale(.84)}
#journeyAtmosphere[data-phase="decelerate"] #journeyApproachDepth::after{opacity:.28;transform:translate(-50%,-50%) rotate(var(--approach-mid-tilt)) scale(.74)}
#journeyAtmosphere[data-phase="approach"] #journeyApproachDepth::before{opacity:.24;transform:translate(-50%,-50%) rotate(var(--approach-tilt)) skewX(var(--approach-skew)) scale(1.12)}
#journeyAtmosphere[data-phase="approach"] #journeyApproachDepth::after{opacity:.18;transform:translate(-50%,-50%) rotate(var(--approach-near-tilt)) scale(1.2)}
#journeyAtmosphere[data-phase="observe"] #journeyApproachDepth::before,#journeyAtmosphere[data-phase="observe"] #journeyApproachDepth::after{opacity:0;transform:translate(-50%,-50%) scale(1.32)}
#journeyAtmosphere[data-phase="warpExit"] #journeyApproachDepth .approachDepthFar{transform:translate(-50%,-50%) rotate(var(--approach-tilt)) skewX(var(--approach-skew)) scale(.72)}
#journeyAtmosphere[data-phase="warpExit"] #journeyApproachDepth .approachDepthMid{transform:translate(-50%,-50%) rotate(var(--approach-mid-tilt)) scale(.56)}
#journeyAtmosphere[data-phase="warpExit"] #journeyApproachDepth .approachDepthNear{transform:translate(-50%,-50%) rotate(var(--approach-near-tilt)) scale(.4)}
#journeyAtmosphere[data-phase="decelerate"] #journeyApproachDepth .approachDepthFar{transform:translate(-50%,-50%) rotate(var(--approach-tilt)) skewX(var(--approach-skew)) scale(.88)}
#journeyAtmosphere[data-phase="decelerate"] #journeyApproachDepth .approachDepthMid{transform:translate(-50%,-50%) rotate(var(--approach-mid-tilt)) scale(.84)}
#journeyAtmosphere[data-phase="decelerate"] #journeyApproachDepth .approachDepthNear{transform:translate(-50%,-50%) rotate(var(--approach-near-tilt)) scale(.78)}
#journeyAtmosphere[data-phase="approach"] #journeyApproachDepth .approachDepthFar{transform:translate(-50%,-50%) rotate(var(--approach-tilt)) skewX(var(--approach-skew)) scale(1)}
#journeyAtmosphere[data-phase="approach"] #journeyApproachDepth .approachDepthMid{transform:translate(-50%,-50%) rotate(var(--approach-mid-tilt)) scale(1.13)}
#journeyAtmosphere[data-phase="approach"] #journeyApproachDepth .approachDepthNear{transform:translate(-50%,-50%) rotate(var(--approach-near-tilt)) scale(1.3)}
#journeyAtmosphere[data-phase="observe"] #journeyApproachDepth .approachDepthFar,
#journeyAtmosphere[data-phase="observe"] #journeyApproachDepth .approachDepthMid,
#journeyAtmosphere[data-phase="observe"] #journeyApproachDepth .approachDepthNear{transform:translate(-50%,-50%) scale(1.38)}

@media (max-width:520px){
  #journeyCorridorDepth .corridorDepthRungs{left:3%;right:3%;bottom:-1%}
  #journeyCorridorDepth .corridorDepthNear{left:4%;right:4%;bottom:5%;height:21%}
  #journeyCorridorDepth .corridorDepthRail{bottom:-8%}
  #journeyApproachDepth::before{width:clamp(196px,78vw,304px);height:clamp(132px,53vw,206px)}
  #journeyApproachDepth::after{width:clamp(128px,49vw,192px);height:clamp(86px,33vw,130px)}
  #journeyApproachDepth .approachDepthFar{width:clamp(142px,54vw,220px);height:clamp(106px,40vw,164px)}
  #journeyApproachDepth .approachDepthMid{width:clamp(104px,39vw,162px);height:clamp(76px,29vw,120px)}
  #journeyApproachDepth .approachDepthNear{width:clamp(72px,27vw,112px);height:clamp(52px,20vw,84px)}
}
@media (prefers-reduced-motion:reduce){
  #journeyCorridorDepth,#journeyCorridorDepth span,#journeyApproachDepth,#journeyApproachDepth span,#journeyApproachDepth::before,#journeyApproachDepth::after{animation:none!important;transition:none!important}
  #journeyAtmosphere[data-phase="warp"] #journeyCorridorDepth{opacity:.54;transform:scale(1)}
  #journeyAtmosphere[data-phase="approach"] #journeyApproachDepth{opacity:.48}
}
`;
  document.head.append(style);
}

function mount(){
  const atmosphere=document.querySelector('#journeyAtmosphere');
  const host=document.querySelector('#journeyTransit');
  if(!atmosphere||!host)return false;
  if(!host.querySelector(`#${ROOT_ID}`)){
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
  }
  if(!atmosphere.querySelector(`#${APPROACH_ROOT_ID}`)){
    const approach=document.createElement('div');
    approach.id=APPROACH_ROOT_ID;
    approach.setAttribute('aria-hidden','true');
    const far=document.createElement('span');far.className='approachDepthFar';
    const mid=document.createElement('span');mid.className='approachDepthMid';
    const near=document.createElement('span');near.className='approachDepthNear';
    approach.append(far,mid,near);
    atmosphere.append(approach);
  }
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

function approachSnapshot(){
  const atmosphere=document.querySelector('#journeyAtmosphere');
  const root=document.querySelector(`#${APPROACH_ROOT_ID}`);
  const phase=atmosphere?.getAttribute('data-phase')||null;
  const system=atmosphere?.getAttribute('data-system')||null;
  return{
    mounted:!!root,
    elements:root?.children?.length||0,
    phase,system,
    active:!!root&&SYSTEMS.includes(system)&&APPROACH_PHASES.has(phase)&&document.querySelector('#app')?.classList.contains('journeyAtmosphereActive')===true
  };
}

ensureStyle();ensureMount();
addEventListener('beforeunload',()=>mountObserver?.disconnect(),{once:true});
window.WarpJourneyCorridorDepth={snapshot,approachSnapshot,corridors:()=>[...CORRIDORS],systems:()=>[...SYSTEMS]};
})();