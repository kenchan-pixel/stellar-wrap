(() => {
'use strict';

const KEY='stellar-warp-luna-survey-v1';
const SYSTEM='LUNA';
const POINTS=[
  {
    id:'basin',
    label:'月面',
    title:'撞擊盆地近景',
    cue:'觀景提示：主月面位於畫面右下至中央，可拖動畫面細看灰白盆地與明暗地形。',
    note:'近距月面提供最強的前景尺度，撞擊盆地與表面明暗令月環基地不再只是背景球體。'
  },
  {
    id:'earth',
    label:'地球',
    title:'遠方地球視差',
    cue:'觀景提示：向左上方拖動，尋找遠方藍色地球；與近距月面比較前後景深度。',
    note:'遠方地球與近距月面形成清楚視差，將同一場景由單一景物變成有深度的地月空間。'
  },
  {
    id:'ring',
    label:'環站',
    title:'月球軌道環站',
    cue:'觀景提示：回到月面周邊，觀察發光軌道環與月面輪廓的交疊。',
    note:'環站以人工幾何線條切過天然月面，成為月環基地最明確的人造地標。'
  }
];
const IDS=new Set(POINTS.map(point=>point.id));
let selectedId=POINTS[0].id;
let lastVisible=false;
let lastCurrent='';
let uiReady=false;

function normalise(value){
  const completed=Array.isArray(value?.completed)?value.completed.filter(id=>IDS.has(id)):[];
  return{completed:[...new Set(completed)]};
}
function load(){
  try{return normalise(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return{completed:[]}}
}
let progress=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,completed:progress.completed}))}catch{}}
function isComplete(id){return progress.completed.includes(id)}
function discoveryUnlocked(){return POINTS.every(point=>isComplete(point.id))}

function ensureUi(){
  if(uiReady&&document.querySelector('#lunaSurvey'))return true;
  const body=document.querySelector('#exploreCard .exploreBody');
  const desc=document.querySelector('#exploreDesc');
  if(!body||!desc)return false;
  if(!document.querySelector('#lunaSurveyStyle')){
    const style=document.createElement('style');
    style.id='lunaSurveyStyle';
    style.textContent='.lunaSurvey{display:none;margin:8px 0 7px;padding:8px;border:1px solid rgba(166,206,255,.16);border-radius:12px;background:rgba(112,165,235,.055)}.lunaSurvey.show{display:block}.lunaSurveyHead{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.lunaSurveyTitle{font-size:9px;font-weight:800;letter-spacing:.04em}.lunaSurveyProgress{font-size:7px;color:#bcd6ff}.lunaPointRow{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px}.lunaPoint{min-height:31px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.035);color:var(--text);font-size:8px;font-weight:760}.lunaPoint.active{border-color:rgba(153,202,255,.64);background:rgba(126,180,255,.14)}.lunaPoint.done:after{content:" ✓";color:#78e7cf}.lunaDetail{margin-top:7px;padding-top:7px;border-top:1px solid rgba(188,215,255,.09)}.lunaDetail strong{display:block;font-size:9px}.lunaCue{font-size:8px;line-height:1.45;color:var(--muted);margin:4px 0}.lunaNote{font-size:8px;line-height:1.45;color:#dceaff;margin:4px 0 7px}.lunaComplete{width:100%;min-height:34px;border:1px solid rgba(171,210,255,.3);border-radius:9px;background:rgba(125,181,255,.11);color:var(--text);font-size:9px;font-weight:780}.lunaComplete:disabled{opacity:.5}.lunaDiscovery{display:none;margin-top:7px;padding:7px 8px;border-radius:9px;border:1px solid rgba(105,238,210,.25);background:rgba(72,192,165,.08);font-size:8px;line-height:1.45;color:#dffff7}.lunaDiscovery.show{display:block}.lunaPulse{animation:lunaPulse .8s ease-out}@keyframes lunaPulse{0%{box-shadow:0 0 0 0 rgba(105,238,210,.4)}100%{box-shadow:0 0 0 14px rgba(105,238,210,0)}}';
    document.head.append(style);
  }
  let section=document.querySelector('#lunaSurvey');
  if(!section){
    section=document.createElement('section');
    section.id='lunaSurvey';
    section.className='lunaSurvey';
    section.setAttribute('aria-label','月環基地觀測任務');
    section.innerHTML='<div class="lunaSurveyHead"><span class="lunaSurveyTitle">月環基地 · 觀測任務</span><span id="lunaSurveyProgress" class="lunaSurveyProgress">0 / 3</span></div><div id="lunaPointRow" class="lunaPointRow"></div><div class="lunaDetail"><strong id="lunaPointTitle"></strong><p id="lunaCue" class="lunaCue"></p><p id="lunaNote" class="lunaNote"></p><button id="lunaComplete" class="lunaComplete" type="button">完成此觀測</button></div><div id="lunaDiscovery" class="lunaDiscovery" role="status" aria-live="polite"><strong>發現紀錄：地月視差層</strong><br>三個觀測點共同建立由近距月面、人工環站到遠方地球的完整深度關係。此發現只保存在本機。</div>';
    desc.insertAdjacentElement('afterend',section);
    const row=section.querySelector('#lunaPointRow');
    for(const point of POINTS){
      const button=document.createElement('button');
      button.type='button';button.className='lunaPoint';button.dataset.point=point.id;button.textContent=point.label;
      row.append(button);
    }
    row.addEventListener('click',event=>{
      const button=event.target.closest('[data-point]');
      if(!button||!IDS.has(button.dataset.point))return;
      selectedId=button.dataset.point;
      render();
      navigator.vibrate?.(10);
    });
    section.querySelector('#lunaComplete').addEventListener('click',()=>{
      if(!IDS.has(selectedId)||isComplete(selectedId))return;
      progress.completed.push(selectedId);progress=normalise(progress);save();render(true);
      const next=POINTS.find(point=>!isComplete(point.id));
      if(next){selectedId=next.id;setTimeout(()=>render(),500)}
    });
  }
  uiReady=true;
  render();
  return true;
}

function render(pulse=false){
  if(!ensureUi()||!uiReady)return;
  const section=document.querySelector('#lunaSurvey');
  const point=POINTS.find(item=>item.id===selectedId)||POINTS[0];
  const count=progress.completed.length;
  section.querySelector('#lunaSurveyProgress').textContent=count+' / '+POINTS.length;
  for(const button of section.querySelectorAll('[data-point]')){
    button.classList.toggle('active',button.dataset.point===point.id);
    button.classList.toggle('done',isComplete(button.dataset.point));
  }
  section.querySelector('#lunaPointTitle').textContent=point.title;
  section.querySelector('#lunaCue').textContent=point.cue;
  section.querySelector('#lunaNote').textContent=point.note;
  const complete=section.querySelector('#lunaComplete');
  complete.disabled=isComplete(point.id);
  complete.textContent=isComplete(point.id)?'已完成觀測':'完成此觀測';
  section.querySelector('#lunaDiscovery').classList.toggle('show',discoveryUnlocked());
  if(pulse){section.classList.remove('lunaPulse');void section.offsetWidth;section.classList.add('lunaPulse')}
}

function sample(){
  ensureUi();
  const api=window.WarpSim;
  if(!api||typeof api.state!=='function')return;
  let state;try{state=api.state()}catch{return}
  const visible=state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost;
  const section=document.querySelector('#lunaSurvey');
  if(!section)return;
  if(visible!==lastVisible||state.current!==lastCurrent){
    section.classList.toggle('show',visible);
    if(visible){const next=POINTS.find(point=>!isComplete(point.id));selectedId=next?.id||selectedId;render()}
    lastVisible=visible;lastCurrent=state.current;
  }
}

setInterval(sample,500);
sample();
window.WarpLunaSurvey={
  progress(){return{completed:[...progress.completed],discovery:discoveryUnlocked()}},
  reset(){progress={completed:[]};save();selectedId=POINTS[0].id;render()}
};
})();
