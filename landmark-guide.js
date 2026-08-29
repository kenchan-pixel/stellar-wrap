(() => {
'use strict';

const SYSTEMS={
  SOL:{ring:'人工近地軌道環',landmarks:[
    {id:'earth',label:'地球',kind:'天然',title:'類地行星',detail:'中央藍色球體是地球本體；海陸、雲層、大氣與夜光都屬行星表面及大氣效果。'},
    {id:'moon',label:'月球',kind:'天然',title:'天然衛星',detail:'較遠的灰白球體代表月球，用前後距離建立地月尺度感。'},
    {id:'orbit',label:'軌道環',kind:'人工',title:'近地軌道基建',detail:'地球周圍兩條發光環是模擬導航／軌道設施，不是土星式天然行星環。'}
  ]},
  LUNA:{ring:'人工月球軌道環站',landmarks:[
    {id:'moon',label:'月面',kind:'天然',title:'月球近景',detail:'主要灰白天體是月球近距表面，撞擊盆地提供前景尺度。'},
    {id:'earth',label:'地球',kind:'天然',title:'遠方地球',detail:'遠方藍色地球與近距月面形成視差，顯示地月系的前後深度。'},
    {id:'station',label:'環站',kind:'人工',title:'月球軌道基地',detail:'月面附近的發光環代表人工軌道基地／導航設施，不是天然行星環。'}
  ]},
  VEGA:{ring:'人工雙層曲速星門',landmarks:[
    {id:'star',label:'主星',kind:'天然',title:'藍白主序星',detail:'明亮藍白主星是場景主要光源，也是判斷星門尺度與深度的基準。'},
    {id:'inner',label:'內環',kind:'人工',title:'近側曲速門',detail:'較粗、較近的發光環是人工曲速門結構，並非行星軌道或天然環。'},
    {id:'outer',label:'外環',kind:'人工',title:'遠側曲速門',detail:'第二個環與近側環共同構成雙層星門；兩環的不同傾角與距離用來表現通道深度。'}
  ]},
  CYG:{ring:'人工航標環陣',landmarks:[
    {id:'blue',label:'藍星',kind:'天然',title:'藍色恆星',detail:'藍色恆星是雙星系統其中一個主要光源。'},
    {id:'violet',label:'紫星',kind:'天然',title:'紫藍伴星',detail:'另一顆伴星與藍星形成雙光源，令星區具有明顯色差及空間感。'},
    {id:'beacon',label:'航標環',kind:'人工',title:'立體航標陣列',detail:'發光環屬人工導航航標，不是圍繞恆星形成的天然物質環。'}
  ]},
  ORION:{ring:'沒有主要環狀地標',landmarks:[
    {id:'giant',label:'紅巨星',kind:'天然',title:'紅超巨星',detail:'大型橙紅恆星主導整個星區的照明與色調。'},
    {id:'rock',label:'岩質體',kind:'天然',title:'岩質前哨天體',detail:'近側岩質天體提供前景尺度，與遠方巨星形成強烈大小對比。'},
    {id:'nebula',label:'星雲',kind:'天然',title:'發射星雲',detail:'大範圍橙紅發光氣體是星區背景結構，不是實體牆面或人工屏障。'}
  ]},
  TAU:{ring:'天然行星環',landmarks:[
    {id:'giant',label:'巨行星',kind:'天然',title:'氣態巨行星',detail:'中央大型氣態行星是金牛塵海的主要天體。'},
    {id:'rings',label:'行星環',kind:'天然',title:'天然物質環',detail:'這裡的寬闊環帶代表天然行星環；與 SOL、VEGA 的人工發光環不同。'},
    {id:'moon',label:'衛星',kind:'天然',title:'小型衛星',detail:'外側小天體是伴隨巨行星運行的衛星，用作行星環尺度參考。'}
  ]},
  SIRIUS:{ring:'人工中繼環站',landmarks:[
    {id:'primary',label:'主星',kind:'天然',title:'藍白主星',detail:'較大的藍白恆星是天狼星區主要光源。'},
    {id:'secondary',label:'伴星',kind:'天然',title:'第二光源',detail:'另一顆亮星形成雙星照明，令冰質物體與環站有兩組高光方向。'},
    {id:'relay',label:'中繼環',kind:'人工',title:'導航中繼站',detail:'場景中的發光環是人工中繼／導航設施，不是天然行星環。'}
  ]},
  PROX:{ring:'天然碎屑帶＋人工星港',landmarks:[
    {id:'star',label:'紅矮星',kind:'天然',title:'紅矮主星',detail:'暗紅恆星提供低亮度暖色照明，是比鄰星港的主要光源。'},
    {id:'lava',label:'熔岩星',kind:'天然',title:'熔岩行星',detail:'高溫岩質行星以發光裂谷表現活躍表面。'},
    {id:'outer',label:'外圍帶',kind:'混合',title:'碎屑帶與星港',detail:'外圍由天然小行星碎屑帶配合人工星港元素組成；不是單一完整行星環。'}
  ]}
};
const IDS=new Set(Object.keys(SYSTEMS));
let uiReady=false;
let current='SOL';
let selected='earth';
let lastVisible=false;

function ensureStyle(){
  if(document.querySelector('#landmarkGuideStyle'))return;
  const style=document.createElement('style');
  style.id='landmarkGuideStyle';
  style.textContent='.landmarkGuide{display:none;margin:8px 0 7px;padding:8px;border:1px solid rgba(184,214,255,.16);border-radius:12px;background:rgba(77,119,190,.055)}.landmarkGuide.show{display:block}.landmarkGuideHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.landmarkGuideTitle{font-size:clamp(10px,1.8vw,12px);font-weight:810}.landmarkRing{font-size:clamp(9px,1.55vw,11px);color:#bcd6ff;text-align:right}.landmarkTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px}.landmarkTab{min-height:34px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.035);color:var(--text);font-size:clamp(10px,1.65vw,12px);font-weight:760}.landmarkTab.active{border-color:rgba(160,199,255,.62);background:rgba(115,161,232,.13)}.landmarkDetail{margin-top:7px;padding-top:7px;border-top:1px solid rgba(188,215,255,.09)}.landmarkMeta{display:flex;align-items:center;gap:6px;min-width:0}.landmarkKind{flex:0 0 auto;padding:2px 6px;border-radius:999px;border:1px solid rgba(188,215,255,.18);font-size:clamp(8px,1.35vw,10px);color:#dbeaff}.landmarkKind.artificial{border-color:rgba(126,190,255,.32);color:#b8ddff}.landmarkKind.natural{border-color:rgba(112,226,198,.28);color:#baf3e4}.landmarkKind.mixed{border-color:rgba(239,203,132,.28);color:#f1d9a8}.landmarkName{font-size:clamp(10px,1.7vw,12px);font-weight:790;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.landmarkCopy{margin:4px 0 0;font-size:clamp(9px,1.55vw,11px);line-height:1.5;color:var(--muted)}@media(max-width:350px){.landmarkGuideHead{display:block}.landmarkRing{margin-top:2px;text-align:left}.landmarkTabs{gap:4px}.landmarkTab{padding:0 3px}}';
  document.head.append(style);
}

function systemData(id){return SYSTEMS[id]||SYSTEMS.SOL}
function selectedLandmark(){
  const system=systemData(current);
  return system.landmarks.find(item=>item.id===selected)||system.landmarks[0];
}
function ensureUi(){
  if(uiReady&&document.querySelector('#landmarkGuide'))return true;
  const desc=document.querySelector('#exploreDesc');
  if(!desc)return false;
  ensureStyle();
  const section=document.createElement('section');
  section.id='landmarkGuide';
  section.className='landmarkGuide';
  section.setAttribute('aria-label','目的地場景導覽');
  section.innerHTML='<div class="landmarkGuideHead"><strong class="landmarkGuideTitle">場景導覽</strong><span id="landmarkRing" class="landmarkRing"></span></div><div id="landmarkTabs" class="landmarkTabs"></div><div class="landmarkDetail"><div class="landmarkMeta"><span id="landmarkKind" class="landmarkKind"></span><strong id="landmarkName" class="landmarkName"></strong></div><p id="landmarkCopy" class="landmarkCopy"></p></div>';
  desc.insertAdjacentElement('afterend',section);
  section.querySelector('#landmarkTabs').addEventListener('click',event=>{
    const button=event.target.closest('[data-landmark]');
    if(!button)return;
    const system=systemData(current);
    if(!system.landmarks.some(item=>item.id===button.dataset.landmark))return;
    selected=button.dataset.landmark;
    render();
    navigator.vibrate?.(8);
  });
  uiReady=true;
  render();
  return true;
}

function render(){
  if(!ensureUi()||!uiReady)return;
  const section=document.querySelector('#landmarkGuide');
  const ring=document.querySelector('#landmarkRing');
  const tabs=document.querySelector('#landmarkTabs');
  const kind=document.querySelector('#landmarkKind');
  const name=document.querySelector('#landmarkName');
  const copy=document.querySelector('#landmarkCopy');
  if(!section||!ring||!tabs||!kind||!name||!copy)return;
  const system=systemData(current),landmark=selectedLandmark();
  ring.textContent='環狀結構：'+system.ring;
  tabs.replaceChildren();
  for(const item of system.landmarks){
    const button=document.createElement('button');
    button.type='button';
    button.className='landmarkTab'+(item.id===landmark.id?' active':'');
    button.dataset.landmark=item.id;
    button.textContent=item.label;
    tabs.append(button);
  }
  kind.textContent=landmark.kind;
  kind.className='landmarkKind '+(landmark.kind==='人工'?'artificial':landmark.kind==='天然'?'natural':'mixed');
  name.textContent=landmark.title;
  copy.textContent=landmark.detail;
}

function sample(){
  ensureUi();
  let state;
  try{state=window.WarpSim?.state?.()}catch{return}
  if(!state)return;
  const next=IDS.has(state.current)?state.current:current;
  const visible=IDS.has(state.current)&&state.exploring&&!state.flying&&!state.contextLost;
  if(next!==current){
    current=next;
    selected=systemData(current).landmarks[0].id;
    render();
  }
  if(visible!==lastVisible){
    document.querySelector('#landmarkGuide')?.classList.toggle('show',visible);
    lastVisible=visible;
  }
}

setInterval(sample,500);
sample();
window.WarpLandmarkGuide={
  visible(){return lastVisible},
  snapshot(id=current){const system=systemData(id);return{system:id,ring:system.ring,landmarks:system.landmarks.map(item=>({...item}))}}
};
})();
