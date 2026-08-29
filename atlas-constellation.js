(() => {
'use strict';

const STYLE_ID='atlasConstellationStyle';
const EXTERNAL_IDS=['LUNA','VEGA','CYG','ORION','TAU','SIRIUS','PROX'];
const SYSTEM_NAMES={LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
let observer=null;
let mounted=false;

function readSnapshot(){
  try{return window.WarpStarAtlas?.snapshot?.()||null}catch{return null}
}
function readState(){
  try{return window.WarpSim?.state?.()||null}catch{return null}
}
function ensureStyle(){
  if(document.querySelector(`#${STYLE_ID}`))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
.atlasConstellation{position:relative;height:184px;margin:0 0 8px;border:1px solid rgba(161,204,255,.13);border-radius:13px;overflow:hidden;background:radial-gradient(circle at 50% 50%,rgba(73,137,205,.09),transparent 34%),linear-gradient(180deg,rgba(7,14,28,.74),rgba(4,8,18,.42));isolation:isolate}
.atlasConstellation::before{content:"";position:absolute;inset:20px 36px;border:1px solid rgba(150,202,255,.08);border-radius:50%;pointer-events:none}
.atlasConstellation::after{content:"";position:absolute;inset:42px 69px;border:1px dashed rgba(118,234,211,.08);border-radius:50%;pointer-events:none}
.atlasConstellationLinks{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.62}
.atlasConstellationLinks polygon{fill:none;stroke:rgba(138,188,237,.16);stroke-width:1;stroke-dasharray:3 5;vector-effect:non-scaling-stroke}
.atlasConstellationCenter{position:absolute;left:50%;top:50%;width:68px;height:68px;transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center;text-align:center;background:conic-gradient(#76ead3 var(--atlas-progress,0deg),rgba(132,173,221,.09) 0);box-shadow:0 0 28px rgba(86,169,222,.08)}
.atlasConstellationCenter::before{content:"";position:absolute;inset:5px;border-radius:50%;background:rgba(6,12,24,.94);border:1px solid rgba(174,216,255,.17)}
.atlasConstellationCount{position:relative;z-index:1;font-size:15px;font-weight:820;line-height:1;color:#effaff}.atlasConstellationCount small{display:block;margin-top:5px;font-size:7px;font-weight:760;letter-spacing:.08em;color:#9ec9ef}
.atlasConstellationNode{position:absolute;width:46px;min-height:34px;transform:translate(-50%,-50%);display:grid;place-items:center;padding:4px 3px;border:1px solid rgba(179,211,244,.14);border-radius:10px;background:rgba(7,13,26,.82);color:rgba(210,226,245,.52);font-size:7px;font-weight:820;line-height:1.05;text-align:center;box-shadow:0 8px 18px rgba(0,0,0,.18)}
.atlasConstellationNode::after{content:"";width:4px;height:4px;margin-top:3px;border-radius:50%;background:rgba(195,216,239,.2)}
.atlasConstellationNode.discovered{border-color:rgba(104,235,207,.45);background:rgba(31,94,88,.32);color:#dffdf7;box-shadow:0 0 18px rgba(72,208,181,.12)}
.atlasConstellationNode.discovered::after{background:#76ead3;box-shadow:0 0 8px rgba(118,234,211,.7)}
.atlasConstellationNode.current{outline:1px solid rgba(172,213,255,.62);outline-offset:2px}
.atlasConstellationNode[data-system="LUNA"]{left:14%;top:28%}.atlasConstellationNode[data-system="VEGA"]{left:39%;top:14%}.atlasConstellationNode[data-system="CYG"]{left:71%;top:20%}.atlasConstellationNode[data-system="ORION"]{left:86%;top:51%}.atlasConstellationNode[data-system="TAU"]{left:72%;top:82%}.atlasConstellationNode[data-system="SIRIUS"]{left:39%;top:87%}.atlasConstellationNode[data-system="PROX"]{left:13%;top:69%}
.atlasConstellationCaption{position:absolute;left:8px;right:8px;bottom:5px;text-align:center;font-size:6.5px;letter-spacing:.04em;color:rgba(195,215,238,.38);pointer-events:none}
.atlasConstellation.complete .atlasConstellationCenter{box-shadow:0 0 34px rgba(72,208,181,.18)}
@media(max-width:360px){.atlasConstellation{height:176px}.atlasConstellationNode{width:42px;font-size:6.6px}.atlasConstellation::before{inset:19px 29px}}
@media(prefers-reduced-motion:reduce){.atlasConstellationCenter{transition:none}}
`;
  document.head.append(style);
}
function ensureUi(){
  const body=document.querySelector('#starAtlas .atlasBody');
  if(!body)return false;
  ensureStyle();
  let visual=document.querySelector('#atlasConstellation');
  if(!visual){
    visual=document.createElement('section');
    visual.id='atlasConstellation';
    visual.className='atlasConstellation';
    visual.setAttribute('role','img');
    visual.setAttribute('aria-label','探索星環 · 0 / 7 外站發現');
    const lines=document.createElementNS('http://www.w3.org/2000/svg','svg');
    lines.setAttribute('class','atlasConstellationLinks');
    lines.setAttribute('viewBox','0 0 100 100');
    lines.setAttribute('aria-hidden','true');
    const polygon=document.createElementNS('http://www.w3.org/2000/svg','polygon');
    polygon.setAttribute('points','14,28 39,14 71,20 86,51 72,82 39,87 13,69');
    lines.append(polygon);
    const center=document.createElement('div');
    center.className='atlasConstellationCenter';
    const count=document.createElement('div');count.id='atlasConstellationCount';count.className='atlasConstellationCount';
    const value=document.createElement('span');value.id='atlasConstellationValue';value.textContent='0 / 7';
    const label=document.createElement('small');label.textContent='發現';
    count.append(value,label);center.append(count);visual.append(lines,center);
    for(const id of EXTERNAL_IDS){
      const node=document.createElement('div');
      node.className='atlasConstellationNode';
      node.dataset.system=id;
      node.textContent=id;
      visual.append(node);
    }
    const caption=document.createElement('div');
    caption.className='atlasConstellationCaption';
    caption.textContent='探索星環 · 非航線比例';
    visual.append(caption);
    body.insertBefore(visual,body.firstChild);
  }
  mounted=true;
  return true;
}
function render(){
  if(!ensureUi())return false;
  const snapshot=readSnapshot();
  if(!snapshot)return false;
  const discoveries=snapshot.discoveries||{};
  const state=readState();
  const count=EXTERNAL_IDS.filter(id=>discoveries[id]).length;
  const visual=document.querySelector('#atlasConstellation');
  const counter=document.querySelector('#atlasConstellationValue');
  if(!visual||!counter)return false;
  visual.style.setProperty('--atlas-progress',`${(count/EXTERNAL_IDS.length*360).toFixed(1)}deg`);
  visual.classList.toggle('complete',count===EXTERNAL_IDS.length);
  visual.setAttribute('aria-label',`探索星環 · ${count} / ${EXTERNAL_IDS.length} 外站發現`);
  counter.textContent=`${count} / ${EXTERNAL_IDS.length}`;
  for(const id of EXTERNAL_IDS){
    const node=visual.querySelector(`[data-system="${id}"]`);
    if(!node)continue;
    const discovered=!!discoveries[id];
    node.classList.toggle('discovered',discovered);
    node.classList.toggle('current',state?.current===id);
    node.setAttribute('aria-label',`${SYSTEM_NAMES[id]} · ${discovered?'已收錄發現':'發現未收錄'}${state?.current===id?' · 目前位置':''}`);
  }
  return true;
}
function watchForAtlas(){
  if(render())return;
  if(observer||!document.body||typeof MutationObserver!=='function')return;
  observer=new MutationObserver(()=>{
    if(!render())return;
    observer.disconnect();
    observer=null;
  });
  observer.observe(document.body,{childList:true,subtree:true});
}

addEventListener('stellarwarp:atlas-change',render);
addEventListener('stellarwarp:discovery-change',render);
addEventListener('stellarwarp:journey-complete',render);
watchForAtlas();
window.WarpAtlasConstellation={render,mounted:()=>mounted};
})();
