(() => {
'use strict';

const KEY='stellar-warp-expedition-v1';
const LIMIT=6;
const SYSTEMS=[
  ['SOL','地球近軌'],['LUNA','月環基地'],['VEGA','織女星門'],['CYG','天鵝航標'],
  ['ORION','獵戶前哨'],['TAU','金牛塵海'],['SIRIUS','天狼中繼站'],['PROX','比鄰星港']
];
const NAMES=Object.fromEntries(SYSTEMS);
const IDS=new Set(SYSTEMS.map(([id])=>id));
let uiReady=false;

function normalise(raw){
  const stops=[];
  for(const id of Array.isArray(raw?.stops)?raw.stops:[]){
    if(IDS.has(id)&&!stops.includes(id)&&stops.length<LIMIT)stops.push(id);
  }
  const cursor=Math.max(0,Math.min(stops.length,Number.isInteger(raw?.cursor)?raw.cursor:0));
  return{stops,cursor};
}
function load(){
  try{return normalise(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return{stops:[],cursor:0}}
}
let plan=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,stops:plan.stops,cursor:plan.cursor}))}catch{}}
function readState(){try{return window.WarpSim?.state?.()||null}catch{return null}}
function nextStop(){return plan.stops[plan.cursor]||null}
function completed(){return plan.cursor}
function remaining(){return Math.max(0,plan.stops.length-plan.cursor)}

function ensureUi(){
  if(uiReady&&document.querySelector('#expeditionCard'))return true;
  const settings=document.querySelector('.settings');
  if(!settings)return false;
  if(!document.querySelector('#expeditionStyle')){
    const style=document.createElement('style');
    style.id='expeditionStyle';
    style.textContent='.expeditionCard{margin-top:9px;border:1px solid var(--line);border-radius:15px;padding:10px;background:rgba(255,255,255,.024)}.expeditionHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.expeditionTitle{font-size:11px;font-weight:790}.expeditionSummary{display:block;margin-top:2px;font-size:8px;color:var(--muted)}.expeditionToggle,.expeditionAdd,.expeditionPlan,.expeditionClear,.expeditionRemove{border:1px solid var(--line);background:rgba(255,255,255,.045);color:var(--text);border-radius:10px;min-height:38px;font-size:9px;font-weight:750}.expeditionToggle{padding:0 10px}.expeditionBody{display:grid;gap:8px;margin-top:8px}.expeditionCard.compact .expeditionBody{display:none}.expeditionNext{padding:8px;border:1px solid rgba(153,202,255,.18);border-radius:11px;background:rgba(105,160,230,.055)}.expeditionNext span{display:block;font-size:8px;color:#bcd6ff}.expeditionNext strong{display:block;margin-top:3px;font-size:11px}.expeditionList{display:grid;gap:5px}.expeditionStop{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:7px;padding:6px 0;border-top:1px solid rgba(188,215,255,.08)}.expeditionStop:first-child{border-top:0}.expeditionNo{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line);font-size:8px;color:var(--muted)}.expeditionStop.done{opacity:.55}.expeditionStop.done .expeditionNo{border-color:#66e6cf;color:#8ff5e3}.expeditionStop.next .expeditionNo{background:rgba(139,190,255,.18);color:#fff;border-color:rgba(168,210,255,.55)}.expeditionStopName{font-size:9px;line-height:1.35}.expeditionStopName small{display:block;margin-top:2px;font-size:7px;color:var(--muted)}.expeditionRemove{min-height:32px;padding:0 8px;font-size:8px}.expeditionBuilder{display:grid;grid-template-columns:1fr auto;gap:6px}.expeditionBuilder select{min-width:0;border:1px solid var(--line);border-radius:10px;background:#0b1220;color:var(--text);padding:0 9px;font-size:9px;min-height:40px}.expeditionAdd{padding:0 11px}.expeditionActions{display:grid;grid-template-columns:1.4fr .8fr;gap:6px}.expeditionPlan{border-color:rgba(171,211,255,.34);background:rgba(119,171,238,.1)}.expeditionPlan:disabled,.expeditionAdd:disabled{opacity:.42}.expeditionHint{font-size:7px;line-height:1.45;color:var(--muted)}.expeditionPulse{animation:expeditionPulse .8s ease-out}@keyframes expeditionPulse{0%{box-shadow:0 0 0 0 rgba(111,220,198,.38)}100%{box-shadow:0 0 0 16px rgba(111,220,198,0)}}@media(min-width:900px){#app .expeditionTitle,#app .expeditionNext strong{font-size:var(--ui-md)}#app .expeditionSummary,#app .expeditionNext span,#app .expeditionNo,#app .expeditionStopName small,#app .expeditionHint{font-size:var(--ui-xs)}#app .expeditionStopName,#app .expeditionToggle,#app .expeditionAdd,#app .expeditionPlan,#app .expeditionClear,#app .expeditionBuilder select{font-size:var(--ui-sm)}#app .expeditionToggle,#app .expeditionAdd,#app .expeditionPlan,#app .expeditionClear,#app .expeditionBuilder select{min-height:40px}#app .expeditionRemove{font-size:var(--ui-xs);min-height:34px}}';
    document.head.append(style);
  }
  const card=document.createElement('section');
  card.id='expeditionCard';
  card.className='expeditionCard compact';
  card.setAttribute('aria-label','探索行程');
  card.innerHTML='<div class="expeditionHead"><div><div class="expeditionTitle">探索行程</div><span id="expeditionSummary" class="expeditionSummary">未建立行程</span></div><button id="expeditionToggle" class="expeditionToggle" type="button" aria-expanded="false">展開</button></div><div class="expeditionBody"><div class="expeditionNext"><span>下一目的地</span><strong id="expeditionNext">尚未加入目的地</strong></div><div id="expeditionList" class="expeditionList"></div><div class="expeditionBuilder"><select id="expeditionSelect" aria-label="加入探索目的地"></select><button id="expeditionAdd" class="expeditionAdd" type="button">加入</button></div><div class="expeditionActions"><button id="expeditionPlan" class="expeditionPlan" type="button">規劃下一站</button><button id="expeditionClear" class="expeditionClear" type="button">清除</button></div><div class="expeditionHint">只保存目的地次序；每一站實際航線仍由原有星圖規劃器計算，並由你手動按「啟動航行」。最多 6 站。</div></div>';
  settings.insertAdjacentElement('beforebegin',card);
  card.querySelector('#expeditionToggle').addEventListener('click',()=>{
    const compact=card.classList.toggle('compact');
    card.querySelector('#expeditionToggle').textContent=compact?'展開':'收起';
    card.querySelector('#expeditionToggle').setAttribute('aria-expanded',compact?'false':'true');
    render();
  });
  card.querySelector('#expeditionAdd').addEventListener('click',()=>{
    const id=card.querySelector('#expeditionSelect')?.value;
    add(id);
  });
  card.querySelector('#expeditionPlan').addEventListener('click',()=>planNext());
  card.querySelector('#expeditionClear').addEventListener('click',()=>clear());
  card.querySelector('#expeditionList').addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-index]');
    if(!button)return;
    removeAt(Number(button.dataset.removeIndex));
  });
  uiReady=true;
  render();
  return true;
}

function render(pulse=false){
  if(!ensureUi()||!uiReady)return;
  const card=document.querySelector('#expeditionCard');
  const summary=card?.querySelector('#expeditionSummary');
  const next=card?.querySelector('#expeditionNext');
  const list=card?.querySelector('#expeditionList');
  const select=card?.querySelector('#expeditionSelect');
  const addButton=card?.querySelector('#expeditionAdd');
  const planButton=card?.querySelector('#expeditionPlan');
  const clearButton=card?.querySelector('#expeditionClear');
  if(!card||!summary||!next||!list||!select||!addButton||!planButton||!clearButton)return;

  const state=readState();
  const current=IDS.has(state?.current)?state.current:null;
  const nextId=nextStop();
  const done=completed(),left=remaining();
  summary.textContent=plan.stops.length?(left?`${done}/${plan.stops.length} 完成 · ${left} 站待航行`:`${plan.stops.length}/${plan.stops.length} · 行程完成`):'未建立行程';
  next.textContent=nextId?`${NAMES[nextId]} · ${nextId}`:(plan.stops.length?'行程完成':'尚未加入目的地');

  list.replaceChildren();
  if(!plan.stops.length){
    const empty=document.createElement('div');empty.className='expeditionHint';empty.textContent='按次序加入目的地，完成一站後系統會自動推進到下一站。';list.append(empty);
  }else{
    plan.stops.forEach((id,index)=>{
      const row=document.createElement('div');
      row.className='expeditionStop'+(index<plan.cursor?' done':index===plan.cursor?' next':'');
      const no=document.createElement('span');no.className='expeditionNo';no.textContent=index<plan.cursor?'✓':String(index+1);
      const name=document.createElement('div');name.className='expeditionStopName';name.textContent=NAMES[id];
      const meta=document.createElement('small');meta.textContent=index<plan.cursor?'已完成':index===plan.cursor?'下一站':id;
      name.append(meta);row.append(no,name);
      if(index>=plan.cursor){const remove=document.createElement('button');remove.type='button';remove.className='expeditionRemove';remove.dataset.removeIndex=String(index);remove.textContent='移除';row.append(remove)}
      list.append(row);
    });
  }

  select.replaceChildren();
  const available=SYSTEMS.filter(([id])=>id!==current&&!plan.stops.includes(id));
  for(const [id,label] of available){const option=document.createElement('option');option.value=id;option.textContent=`${label} · ${id}`;select.append(option)}
  if(!available.length){const option=document.createElement('option');option.value='';option.textContent=plan.stops.length>=LIMIT?'已達 6 站上限':'沒有可加入目的地';select.append(option)}
  const canAdd=available.length>0&&plan.stops.length<LIMIT;
  select.disabled=!canAdd;addButton.disabled=!canAdd;

  const unsafe=!!(state?.flying||state?.contextLost);
  const same=!!nextId&&nextId===current;
  planButton.disabled=!nextId||unsafe||same;
  planButton.textContent=!nextId?'沒有下一站':state?.contextLost?'圖像恢復中':state?.flying?'航行中':same?'已在下一站':`規劃 ${NAMES[nextId]}`;
  clearButton.disabled=!plan.stops.length;
  if(pulse){card.classList.remove('expeditionPulse');void card.offsetWidth;card.classList.add('expeditionPulse')}
}

function add(id){
  const state=readState();
  if(!IDS.has(id)||id===state?.current||plan.stops.includes(id)||plan.stops.length>=LIMIT)return false;
  plan.stops.push(id);save();render(true);return true;
}
function removeAt(index){
  if(!Number.isInteger(index)||index<plan.cursor||index>=plan.stops.length)return false;
  plan.stops.splice(index,1);
  plan.cursor=Math.min(plan.cursor,plan.stops.length);
  save();render();return true;
}
function clear(){plan={stops:[],cursor:0};save();render();dispatchEvent(new CustomEvent('stellarwarp:expedition-progress'));return true}
function planNext(){
  const id=nextStop(),state=readState();
  if(!id||!state||state.flying||state.contextLost||id===state.current||typeof window.WarpSim?.select!=='function')return false;
  try{window.WarpSim.select(id)}catch{return false}
  document.querySelector('.routeCard')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
  render();return true;
}
function onJourneyComplete(event){
  const route=event.detail?.route;
  const destination=Array.isArray(route)?route[route.length-1]:null;
  if(!destination||destination!==nextStop())return;
  plan.cursor=Math.min(plan.cursor+1,plan.stops.length);
  save();render(true);
  dispatchEvent(new CustomEvent('stellarwarp:expedition-progress',{detail:snapshot()}));
}
function snapshot(){return{stops:[...plan.stops],cursor:plan.cursor,next:nextStop(),remaining:remaining(),complete:plan.stops.length>0&&plan.cursor>=plan.stops.length}}

addEventListener('stellarwarp:journey-complete',onJourneyComplete);
addEventListener('storage',event=>{if(event.key===KEY){plan=load();render()}});
document.querySelector('#openPanel')?.addEventListener('click',()=>render());
for(const eventName of['webglcontextlost','webglcontextrestored'])document.querySelector('#space')?.addEventListener(eventName,()=>render());
ensureUi();render();
window.WarpExpedition={snapshot,add,removeAt,clear,planNext,next(){return nextStop()}};
})();
