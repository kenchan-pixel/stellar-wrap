(() => {
'use strict';

const STYLE_ID='warpVelocityApertureStyle';
const ROOT_ID='warpVelocityAperture';
const ARCHITECTURE='velocity-aperture-v5';
const ACTIVE_PHASES=new Set(['warpEntry','warp','warpExit']);
let mountObserver=null;

function ensureStyle(){
  if(document.querySelector(`#${STYLE_ID}`))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#warpVelocityAperture{
  position:absolute;z-index:4;inset:0;overflow:hidden;pointer-events:none;opacity:0;
  transition:opacity .16s ease;contain:paint
}
#journeyTransit{z-index:5}
#warpVelocityAperture::before,#warpVelocityAperture::after{
  content:"";position:absolute;inset:-2%;pointer-events:none
}
#warpVelocityAperture::before{
  opacity:0;
  background:radial-gradient(ellipse 48% 34% at 50% 50%,rgba(1,3,9,.68) 0 8%,rgba(2,6,15,.50) 30%,rgba(4,9,20,.22) 56%,transparent 79%)
}
#warpVelocityAperture::after{
  opacity:0;
  background:radial-gradient(ellipse 72% 56% at 50% 50%,transparent 0 48%,rgba(var(--journey-alt-rgb),.028) 56%,transparent 66%),linear-gradient(90deg,rgba(var(--journey-rgb),.060),transparent 18% 82%,rgba(var(--journey-alt-rgb),.055))
}
#journeyAtmosphere[data-phase="warpEntry"] #warpVelocityAperture{opacity:.45}
#journeyAtmosphere[data-phase="warpEntry"] #warpVelocityAperture::before{opacity:.55}
#journeyAtmosphere[data-phase="warpEntry"] #warpVelocityAperture::after{opacity:.35}
#journeyAtmosphere[data-phase="warp"] #warpVelocityAperture{opacity:1}
#journeyAtmosphere[data-phase="warp"] #warpVelocityAperture::before{opacity:.62}
#journeyAtmosphere[data-phase="warp"] #warpVelocityAperture::after{opacity:.65}
#journeyAtmosphere[data-phase="warpExit"] #warpVelocityAperture{opacity:.55}
#journeyAtmosphere[data-phase="warpExit"] #warpVelocityAperture::before{opacity:.42}
#journeyAtmosphere[data-phase="warpExit"] #warpVelocityAperture::after{opacity:.25}
#journeyAtmosphere[data-phase="decelerate"] #warpVelocityAperture,
#journeyAtmosphere[data-phase="approach"] #warpVelocityAperture,
#journeyAtmosphere[data-phase="observe"] #warpVelocityAperture{opacity:0}
@media(max-width:520px){
  #warpVelocityAperture::before{
    background:radial-gradient(ellipse 50% 35% at 50% 50%,rgba(1,3,9,.68) 0 8%,rgba(2,6,15,.50) 30%,rgba(4,9,20,.22) 56%,transparent 79%)
  }
}
@media(prefers-reduced-motion:reduce){#warpVelocityAperture{transition:none}}
`;
  document.head.append(style);
}

function ensureRoot(){
  const atmosphere=document.querySelector('#journeyAtmosphere');
  if(!atmosphere)return null;
  ensureStyle();
  let root=document.querySelector(`#${ROOT_ID}`);
  if(!root){
    root=document.createElement('div');
    root.id=ROOT_ID;
    root.setAttribute('aria-hidden','true');
    atmosphere.append(root);
  }
  return root;
}

function snapshot(){
  const atmosphere=document.querySelector('#journeyAtmosphere');
  const root=document.querySelector(`#${ROOT_ID}`);
  const phase=atmosphere?.getAttribute('data-phase')||null;
  return{
    mounted:!!root,
    elements:root?.children?.length||0,
    phase,
    active:!!root&&ACTIVE_PHASES.has(phase),
    architecture:ARCHITECTURE
  };
}

function mount(){
  if(!ensureRoot())return false;
  mountObserver?.disconnect();
  mountObserver=null;
  return true;
}

if(!mount()&&typeof MutationObserver==='function'){
  mountObserver=new MutationObserver(()=>mount());
  mountObserver.observe(document.documentElement,{childList:true,subtree:true});
}
document.addEventListener('DOMContentLoaded',mount,{once:true});
window.WarpWarpVelocityAperture={snapshot};
})();