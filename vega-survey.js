(() => {
'use strict';

const KEY='stellar-warp-vega-survey-v1';
const SYSTEM='VEGA';
const POINTS=[
  {
    id:'corona',
    label:'主星',
    title:'藍白主星日冕',
    cue:'觀景提示：先以最明亮的藍白主星作基準，慢慢拖動畫面，觀察星門結構與主星光暈的前後距離。',
    note:'主星是整個星門場景的光源與尺度基準；先建立它的位置，後續雙環對位會更容易判斷。'
  },
  {
    id:'inner',
    label:'內環',
    title:'近側星門內環',
    cue:'觀景提示：尋找較接近視點的發光星門環，讓環面斜向畫面，觀察厚度與主星之間的視差。',
    note:'近側星門的環面厚度與透視變化，令雙層星門不是平面裝飾，而是有實際深度的導航結構。'
  },
  {
    id:'alignment',
    label:'對位',
    title:'雙環共線窗口',
    cue:'觀景提示：繼續微調視角，嘗試令近側與遠側兩個星門環在畫面上接近同軸；再比較主星是否落在通道外側。',
    note:'兩個星門環短暫接近共線時會形成最清楚的穿越走廊，亦最能表現織女星門的立體結構。'
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
  if(uiReady&&document.querySelector('#vegaSurvey'))return true;
  const body=document.querySelector('#exploreCard .exploreBody');
  const desc=document.querySelector('#exploreDesc');
  if(!body||!desc)return false;
  if(!document.querySelector('#vegaSurveyStyle')){
    const style=document.createElement('style');
    style.id='vegaSurveyStyle';
    style.textContent='.vegaSurvey{display:none;margin:8px 0 7px;padding:8px;border:1px solid rgba(150,193,255,.18);border-radius:12px;background:rgba(88,132,231,.06)}.vegaSurvey.show{display:block}.vegaSurveyHead{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.vegaSurveyTitle{font-size:9px;font-weight:800;letter-spacing:.04em}.vegaSurveyProgress{font-size:7px;color:#bfd7ff}.vegaPointRow{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px}.vegaPoint{min-height:31px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.035);color:var(--text);font-size:8px;font-weight:760}.vegaPoint.active{border-color:rgba(160,193,255,.72);background:rgba(110,146,255,.15)}.vegaPoint.done:after{content:" ✓";color:#8cebdd}.vegaDetail{margin-top:7px;padding-top:7px;border-top:1px solid rgba(188,215,255,.09)}.vegaDetail strong{display:block;font-size:9px}.vegaCue{font-size:8px;line-height:1.45;color:var(--muted);margin:4px 0}.vegaNote{font-size:8px;line-height:1.45;color:#dce8ff;margin:4px 0 7px}.vegaComplete{width:100%;min-height:34px;border:1px solid rgba(170,198,255,.34);border-radius:9px;background:rgba(109,145,255,.12);color:var(--text);font-size:9px;font-weight:780}.vegaComplete:disabled{opacity:.5}.vegaDiscovery{display:none;margin-top:7px;padding:7px 8px;border-radius:9px;border:1px solid rgba(108,234,212,.25);background:rgba(66,183,165,.08);font-size:8px;line-height:1.45;color:#e1fff9}.vegaDiscovery.show{display:block}.vegaPulse{animation:vegaPulse .8s ease-out}@keyframes vegaPulse{0%{box-shadow:0 0 0 0 rgba(118,170,255,.42)}100%{box-shadow:0 0 0 14px rgba(118,170,255,0)}}';
    document.head.append(style);
  }
  let section=document.querySelector('#vegaSurvey');
  if(!section){
    section=document.createElement('section');
    section.id='vegaSurvey';
    section.className='vegaSurvey';
    section.setAttribute('aria-label','織女星門校準觀測');
    section.innerHTML='<div class="vegaSurveyHead"><span class="vegaSurveyTitle">織女星門 · 校準觀測</span><span id="vegaSurveyProgress" class="vegaSurveyProgress">0 / 3</span></div><div id="vegaPointRow" class="vegaPointRow"></div><div class="vegaDetail"><strong id="vegaPointTitle"></strong><p id="vegaCue" class="vegaCue"></p><p id="vegaNote" class="vegaNote"></p><button id="vegaComplete" class="vegaComplete" type="button">完成此觀測</button></div><div id="vegaDiscovery" class="vegaDiscovery" role="status" aria-live="polite"><strong>發現紀錄：雙環共振窗口</strong><br>以藍白主星作尺度基準，近遠兩層星門在特定視角形成清晰共線走廊；此發現只保存在本機。</div>';
    desc.insertAdjacentElement('afterend',section);
    const row=section.querySelector('#vegaPointRow');
    for(const point of POINTS){
      const button=document.createElement('button');
      button.type='button';button.className='vegaPoint';button.dataset.point=point.id;button.textContent=point.label;
      row.append(button);
    }
    row.addEventListener('click',event=>{
      const button=event.target.closest('[data-point]');
      if(!button||!IDS.has(button.dataset.point))return;
      selectedId=button.dataset.point;
      render();
      navigator.vibrate?.(10);
    });
    section.querySelector('#vegaComplete').addEventListener('click',()=>{
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
  const section=document.querySelector('#vegaSurvey');
  const point=POINTS.find(item=>item.id===selectedId)||POINTS[0];
  const count=progress.completed.length;
  section.querySelector('#vegaSurveyProgress').textContent=count+' / '+POINTS.length;
  for(const button of section.querySelectorAll('[data-point]')){
    button.classList.toggle('active',button.dataset.point===point.id);
    button.classList.toggle('done',isComplete(button.dataset.point));
  }
  section.querySelector('#vegaPointTitle').textContent=point.title;
  section.querySelector('#vegaCue').textContent=point.cue;
  section.querySelector('#vegaNote').textContent=point.note;
  const complete=section.querySelector('#vegaComplete');
  complete.disabled=isComplete(point.id);
  complete.textContent=isComplete(point.id)?'已完成觀測':'完成此觀測';
  section.querySelector('#vegaDiscovery').classList.toggle('show',discoveryUnlocked());
  if(pulse){section.classList.remove('vegaPulse');void section.offsetWidth;section.classList.add('vegaPulse')}
}

function sample(){
  ensureUi();
  const api=window.WarpSim;
  if(!api||typeof api.state!=='function')return;
  let state;try{state=api.state()}catch{return}
  const visible=state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost;
  const section=document.querySelector('#vegaSurvey');
  if(!section)return;
  if(visible!==lastVisible||state.current!==lastCurrent){
    section.classList.toggle('show',visible);
    if(visible){const next=POINTS.find(point=>!isComplete(point.id));selectedId=next?.id||selectedId;render()}
    lastVisible=visible;lastCurrent=state.current;
  }
}

setInterval(sample,500);
sample();
window.WarpVegaSurvey={
  progress(){return{completed:[...progress.completed],discovery:discoveryUnlocked()}},
  reset(){progress={completed:[]};save();selectedId=POINTS[0].id;render()}
};
})();
