(() => {
'use strict';

const KEY='stellar-warp-prox-alignment-v1';
const SYSTEM='PROX';
const LOCK_WINDOW=3;
const MIN_VALUE=-50;
const MAX_VALUE=50;
const GATES=[
  {id:'outer',name:'外圍交通標',x:-28,y:24,note:'先以外圍交通標建立紅矮星港的進場基準。'},
  {id:'thermal',name:'熔岩側熱流窗',x:6,y:-17,note:'第二個窗口避開熔岩行星方向的強熱背景，修正進場向量。'},
  {id:'dock',name:'星港對接軸',x:32,y:12,note:'最後把導航軸收斂到星港對接走廊，完成三點進場校準。'}
];
const IDS=new Set(GATES.map(item=>item.id));
let uiReady=false;
let lastVisible=false;
let lateral=0;
let vertical=0;

function normalise(raw){
  const locked=Array.isArray(raw?.locked)?raw.locked.filter(id=>IDS.has(id)):[];
  return{locked:[...new Set(locked)]};
}
function load(){try{return normalise(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return{locked:[]}}}
let progress=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,locked:progress.locked}))}catch{}}
function isLocked(id){return progress.locked.includes(id)}
function remaining(){return GATES.filter(item=>!isLocked(item.id))}
function discoveryUnlocked(){return progress.locked.length===GATES.length}
function diff(item){return{x:Math.abs(lateral-item.x),y:Math.abs(vertical-item.y)}}
function nearest(){
  const items=remaining();
  if(!items.length)return null;
  return items.map(item=>{const d=diff(item);return{item,...d,distance:Math.hypot(d.x,d.y)}}).sort((a,b)=>a.distance-b.distance)[0];
}
function confidence(candidate){return candidate?Math.max(0,Math.min(100,Math.round(100-candidate.distance*4))):100}
function safeExploration(){
  let state;try{state=window.WarpSim?.state?.()}catch{return false}
  return !!state&&state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost;
}

function ensureUi(){
  if(uiReady&&document.querySelector('#proxAlignment'))return true;
  const desc=document.querySelector('#exploreDesc');
  if(!desc)return false;
  if(!document.querySelector('#proxAlignmentStyle')){
    const style=document.createElement('style');
    style.id='proxAlignmentStyle';
    style.textContent='.proxAlign{display:none;margin:8px 0 7px;padding:9px;border:1px solid rgba(255,167,120,.24);border-radius:12px;background:linear-gradient(180deg,rgba(121,58,38,.12),rgba(64,37,35,.055))}.proxAlign.show{display:block}.proxHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.proxTitle{font-size:9px;font-weight:820;letter-spacing:.035em}.proxProgress{font-size:7px;color:#ffd0b6}.proxGates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}.proxGate{min-width:0;padding:5px 4px;border:1px solid rgba(255,210,185,.11);border-radius:8px;font-size:7px;line-height:1.25;text-align:center;color:var(--muted)}.proxGate.locked{color:#fff2e9;border-color:rgba(255,179,132,.32);background:rgba(180,90,55,.11)}.proxPanel{margin-top:8px;padding:8px;border:1px solid rgba(255,214,190,.1);border-radius:10px;background:rgba(0,0,0,.12)}.proxAxis{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.proxAxis strong{font-size:10px}.proxAxis span{font-size:8px;color:#ffe0ce}.proxRange{width:100%;height:44px;margin:0;accent-color:#ef936d}.proxVector{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:4px 0 6px}.proxVector div{padding:5px 6px;border:1px solid rgba(255,215,190,.09);border-radius:8px;font-size:7px;color:var(--muted);text-align:center}.proxVector strong{display:block;margin-top:2px;font-size:9px;color:#fff1e7}.proxMeter{height:5px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.07)}.proxMeter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#b65b44,#ffb07f);transition:width .08s linear}.proxReadout{margin-top:5px;font-size:8px;line-height:1.4;color:var(--muted)}.proxLock{width:100%;min-height:44px;margin-top:7px;border:1px solid rgba(255,177,130,.36);border-radius:10px;background:rgba(174,78,47,.14);color:var(--text);font-size:9px;font-weight:790}.proxLock:disabled{opacity:.42}.proxHint{margin:6px 0 0;font-size:7px;line-height:1.4;color:var(--muted)}.proxDiscovery{display:none;margin-top:7px;padding:7px 8px;border:1px solid rgba(255,179,132,.3);border-radius:9px;background:rgba(148,68,42,.11);font-size:8px;line-height:1.45;color:#fff2e9}.proxDiscovery.show{display:block}.proxPulse{animation:proxPulse .75s ease-out}@keyframes proxPulse{0%{box-shadow:0 0 0 0 rgba(240,132,87,.42)}100%{box-shadow:0 0 0 14px rgba(240,132,87,0)}}@media(min-width:900px){#app .proxTitle,#app .proxAxis strong{font-size:var(--ui-md)}#app .proxProgress,#app .proxGate,#app .proxHint{font-size:var(--ui-xs)}#app .proxAxis span,#app .proxReadout,#app .proxDiscovery,#app .proxLock,#app .proxVector strong{font-size:var(--ui-sm)}#app .proxLock{min-height:44px}}';
    document.head.append(style);
  }
  const section=document.createElement('section');
  section.id='proxAlignment';
  section.className='proxAlign';
  section.setAttribute('aria-label','比鄰星港三點進場校準');
  section.innerHTML='<div class="proxHead"><strong class="proxTitle">星港校準 · 三點進場向量</strong><span id="proxProgress" class="proxProgress">0 / 3 已鎖定</span></div><div id="proxGates" class="proxGates"></div><div class="proxPanel"><div class="proxAxis"><strong>橫向偏移</strong><span id="proxLateralValue">0</span></div><input id="proxLateral" class="proxRange" type="range" min="-50" max="50" step="1" value="0" aria-label="星港橫向偏移索引 -50 至 50"><div class="proxAxis"><strong>垂直偏移</strong><span id="proxVerticalValue">0</span></div><input id="proxVertical" class="proxRange" type="range" min="-50" max="50" step="1" value="0" aria-label="星港垂直偏移索引 -50 至 50"><div class="proxVector"><div>橫向<strong id="proxLateralReadout">0</strong></div><div>垂直<strong id="proxVerticalReadout">0</strong></div></div><div class="proxMeter" aria-hidden="true"><i id="proxMeter"></i></div><div id="proxReadout" class="proxReadout" aria-live="polite">調整兩個方向軸，尋找星港交通標與對接走廊。</div><button id="proxLock" class="proxLock" type="button" disabled>未進入進場窗口</button><p class="proxHint">兩個索引都進入目標 ±3 才可鎖定。-50 至 50 只代表本機方向偏移，不是實際角度或距離。</p></div><div id="proxDiscovery" class="proxDiscovery" role="status" aria-live="polite"><strong>發現紀錄：紅矮星港三點進場網</strong><br>外圍交通標、熔岩側熱流窗與星港對接軸形成一組可重現的三點導航網，為紅矮星高背景干擾下的進場提供穩定基準。</div>';
  const anchor=document.querySelector('#landmarkGuide')||desc;
  anchor.insertAdjacentElement('afterend',section);
  section.querySelector('#proxLateral').addEventListener('input',event=>{lateral=Math.max(MIN_VALUE,Math.min(MAX_VALUE,Number(event.target.value)||0));render()});
  section.querySelector('#proxVertical').addEventListener('input',event=>{vertical=Math.max(MIN_VALUE,Math.min(MAX_VALUE,Number(event.target.value)||0));render()});
  section.querySelector('#proxLock').addEventListener('click',lockNearest);
  uiReady=true;render();return true;
}

function render(pulse=false){
  if(!ensureUi()||!uiReady)return;
  const section=document.querySelector('#proxAlignment'),row=section?.querySelector('#proxGates'),progressText=section?.querySelector('#proxProgress'),lateralValue=section?.querySelector('#proxLateralValue'),verticalValue=section?.querySelector('#proxVerticalValue'),lateralReadout=section?.querySelector('#proxLateralReadout'),verticalReadout=section?.querySelector('#proxVerticalReadout'),meter=section?.querySelector('#proxMeter'),readout=section?.querySelector('#proxReadout'),action=section?.querySelector('#proxLock'),discovery=section?.querySelector('#proxDiscovery');
  if(!section||!row||!progressText||!lateralValue||!verticalValue||!lateralReadout||!verticalReadout||!meter||!readout||!action||!discovery)return;
  row.replaceChildren();
  for(const item of GATES){const chip=document.createElement('div');chip.className='proxGate'+(isLocked(item.id)?' locked':'');chip.textContent=isLocked(item.id)?`✓ ${item.name}`:'未鎖定窗口';row.append(chip)}
  progressText.textContent=`${progress.locked.length} / ${GATES.length} 已鎖定`;
  lateralValue.textContent=String(Math.round(lateral));verticalValue.textContent=String(Math.round(vertical));lateralReadout.textContent=String(Math.round(lateral));verticalReadout.textContent=String(Math.round(vertical));
  const candidate=nearest();
  if(candidate){
    const level=confidence(candidate),capturable=candidate.x<=LOCK_WINDOW&&candidate.y<=LOCK_WINDOW;meter.style.width=level+'%';
    readout.textContent=capturable?`向量一致度 ${level}% · 可鎖定 ${candidate.item.name}`:`向量一致度 ${level}% · 繼續微調兩個方向軸`;
    action.disabled=!capturable;action.textContent=capturable?`鎖定 · ${candidate.item.name}`:'未進入進場窗口';
  }else{meter.style.width='100%';readout.textContent='三個進場導航窗口已完成校準。';action.disabled=true;action.textContent='星港校準完成'}
  discovery.classList.toggle('show',discoveryUnlocked());
  if(pulse){section.classList.remove('proxPulse');void section.offsetWidth;section.classList.add('proxPulse')}
}

function lockNearest(){
  if(!safeExploration())return false;
  const candidate=nearest();
  if(!candidate||candidate.x>LOCK_WINDOW||candidate.y>LOCK_WINDOW||isLocked(candidate.item.id))return false;
  progress.locked.push(candidate.item.id);progress=normalise(progress);save();navigator.vibrate?.(14);render(true);
  dispatchEvent(new CustomEvent('stellarwarp:discovery-change',{detail:{system:SYSTEM,discovery:discoveryUnlocked()?'紅矮星港三點進場網':null}}));
  return true;
}
function sample(){ensureUi();const visible=safeExploration();if(visible!==lastVisible){document.querySelector('#proxAlignment')?.classList.toggle('show',visible);lastVisible=visible;if(visible)render()}}
setInterval(sample,500);sample();
window.WarpProxAlignment={
  progress(){return{locked:[...progress.locked],discovery:discoveryUnlocked()}},
  tuneLateral(value){lateral=Math.max(MIN_VALUE,Math.min(MAX_VALUE,Math.round(Number(value)||0)));const input=document.querySelector('#proxLateral');if(input)input.value=String(lateral);render();return lateral},
  tuneVertical(value){vertical=Math.max(MIN_VALUE,Math.min(MAX_VALUE,Math.round(Number(value)||0)));const input=document.querySelector('#proxVertical');if(input)input.value=String(vertical);render();return vertical},
  lock(){return lockNearest()},
  reset(){progress={locked:[]};lateral=0;vertical=0;save();const a=document.querySelector('#proxLateral'),b=document.querySelector('#proxVertical');if(a)a.value='0';if(b)b.value='0';render()}
};
})();
