(() => {
'use strict';

const KEY='stellar-warp-cyg-beacon-v1';
const SYSTEM='CYG';
const LOCK_WINDOW=8;
const SIGNALS=[
  {id:'blue',name:'藍星脈衝',bearing:42,note:'藍色主星的穩定脈衝提供第一條時間基準。'},
  {id:'violet',name:'紫星脈衝',bearing:166,note:'紫藍伴星的相位偏移提供第二條交叉基準。'},
  {id:'beacon',name:'航標環回波',bearing:292,note:'人工航標環的窄頻回波把兩組恆星訊號鎖成三角定位。'}
];
const IDS=new Set(SIGNALS.map(signal=>signal.id));
let uiReady=false;
let lastVisible=false;
let bearing=0;

function normalise(raw){
  const locked=Array.isArray(raw?.locked)?raw.locked.filter(id=>IDS.has(id)):[];
  return{locked:[...new Set(locked)]};
}
function load(){try{return normalise(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return{locked:[]}}}
let progress=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,locked:progress.locked}))}catch{}}
function angleDiff(a,b){const d=Math.abs(((a-b+540)%360)-180);return d}
function isLocked(id){return progress.locked.includes(id)}
function unlocked(){return SIGNALS.filter(signal=>!isLocked(signal.id))}
function nearest(){
  const remaining=unlocked();
  if(!remaining.length)return null;
  return remaining.map(signal=>({signal,diff:angleDiff(bearing,signal.bearing)})).sort((a,b)=>a.diff-b.diff)[0];
}
function discoveryUnlocked(){return progress.locked.length===SIGNALS.length}
function strength(diff){return Math.max(0,Math.min(100,Math.round((1-diff/72)*100)))}
function safeExploration(){
  let state;try{state=window.WarpSim?.state?.()}catch{return false}
  return !!state&&state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost;
}

function ensureUi(){
  if(uiReady&&document.querySelector('#cygBeaconScan'))return true;
  const desc=document.querySelector('#exploreDesc');
  if(!desc)return false;
  if(!document.querySelector('#cygBeaconStyle')){
    const style=document.createElement('style');
    style.id='cygBeaconStyle';
    style.textContent='.cygBeacon{display:none;margin:8px 0 7px;padding:9px;border:1px solid rgba(176,142,255,.22);border-radius:12px;background:linear-gradient(180deg,rgba(86,53,155,.095),rgba(45,82,144,.055))}.cygBeacon.show{display:block}.cygHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.cygTitle{font-size:9px;font-weight:820;letter-spacing:.035em}.cygProgress{font-size:7px;color:#d4c9ff}.cygSignalRow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}.cygSignal{min-width:0;padding:5px 4px;border:1px solid rgba(188,215,255,.11);border-radius:8px;font-size:7px;line-height:1.25;text-align:center;color:var(--muted)}.cygSignal.locked{color:#c7fff1;border-color:rgba(105,233,207,.27);background:rgba(61,180,157,.08)}.cygScanner{margin-top:8px;padding:8px;border:1px solid rgba(188,215,255,.1);border-radius:10px;background:rgba(0,0,0,.12)}.cygBearing{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.cygBearing strong{font-size:10px}.cygBearing span{font-size:8px;color:#c8dbff}.cygRange{width:100%;height:32px;margin:4px 0 0;accent-color:#a9b7ff}.cygMeter{height:5px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.07)}.cygMeter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#8177ff,#d6c6ff);transition:width .08s linear}.cygReadout{margin-top:5px;font-size:8px;line-height:1.4;color:var(--muted)}.cygLock{width:100%;min-height:38px;margin-top:7px;border:1px solid rgba(177,197,255,.32);border-radius:10px;background:rgba(120,128,232,.12);color:var(--text);font-size:9px;font-weight:790}.cygLock:disabled{opacity:.42}.cygHint{margin:6px 0 0;font-size:7px;line-height:1.4;color:var(--muted)}.cygDiscovery{display:none;margin-top:7px;padding:7px 8px;border:1px solid rgba(104,235,207,.26);border-radius:9px;background:rgba(55,178,153,.08);font-size:8px;line-height:1.45;color:#ddfff7}.cygDiscovery.show{display:block}.cygPulse{animation:cygPulse .75s ease-out}@keyframes cygPulse{0%{box-shadow:0 0 0 0 rgba(155,133,255,.42)}100%{box-shadow:0 0 0 14px rgba(155,133,255,0)}}@media(min-width:900px){#app .cygTitle,#app .cygBearing strong{font-size:var(--ui-md)}#app .cygProgress,#app .cygSignal,#app .cygHint{font-size:var(--ui-xs)}#app .cygBearing span,#app .cygReadout,#app .cygDiscovery,#app .cygLock{font-size:var(--ui-sm)}#app .cygLock{min-height:40px}}';
    document.head.append(style);
  }
  const section=document.createElement('section');
  section.id='cygBeaconScan';
  section.className='cygBeacon';
  section.setAttribute('aria-label','天鵝航標訊號三角定位');
  section.innerHTML='<div class="cygHead"><strong class="cygTitle">航標訊號 · 三角定位</strong><span id="cygProgress" class="cygProgress">0 / 3 已鎖定</span></div><div id="cygSignalRow" class="cygSignalRow"></div><div class="cygScanner"><div class="cygBearing"><strong>掃描方位</strong><span id="cygBearing">000°</span></div><input id="cygRange" class="cygRange" type="range" min="0" max="359" step="1" value="0" aria-label="掃描方位 0 至 359 度"><div class="cygMeter" aria-hidden="true"><i id="cygMeter"></i></div><div id="cygReadout" class="cygReadout" aria-live="polite">慢慢掃描方位，尋找第一個訊號峰值。</div><button id="cygLock" class="cygLock" type="button" disabled>訊號未達鎖定門檻</button><p class="cygHint">接近峰值 ±8° 可鎖定；三個來源全部鎖定後完成三角定位。此感測器不會接管 3D 相機或航行控制。</p></div><div id="cygDiscovery" class="cygDiscovery" role="status" aria-live="polite"><strong>發現紀錄：雙星航標三角場</strong><br>藍星、紫星與人工航標環形成三源定位基準，讓天鵝航標能在雙星強光環境維持穩定導航。</div>';
  const anchor=document.querySelector('#landmarkGuide')||desc;
  anchor.insertAdjacentElement('afterend',section);
  section.querySelector('#cygRange').addEventListener('input',event=>{bearing=Number(event.target.value)||0;render()});
  section.querySelector('#cygLock').addEventListener('click',lockNearest);
  uiReady=true;
  render();
  return true;
}

function render(pulse=false){
  if(!ensureUi()||!uiReady)return;
  const section=document.querySelector('#cygBeaconScan');
  const row=section?.querySelector('#cygSignalRow');
  const progressText=section?.querySelector('#cygProgress');
  const bearingText=section?.querySelector('#cygBearing');
  const meter=section?.querySelector('#cygMeter');
  const readout=section?.querySelector('#cygReadout');
  const lock=section?.querySelector('#cygLock');
  const discovery=section?.querySelector('#cygDiscovery');
  if(!section||!row||!progressText||!bearingText||!meter||!readout||!lock||!discovery)return;
  row.replaceChildren();
  for(const signal of SIGNALS){
    const chip=document.createElement('div');chip.className='cygSignal'+(isLocked(signal.id)?' locked':'');
    chip.textContent=(isLocked(signal.id)?'✓ ':'')+signal.name;row.append(chip);
  }
  progressText.textContent=`${progress.locked.length} / ${SIGNALS.length} 已鎖定`;
  bearingText.textContent=String(Math.round(bearing)).padStart(3,'0')+'°';
  const candidate=nearest();
  if(candidate){
    const level=strength(candidate.diff);meter.style.width=level+'%';
    const lockable=candidate.diff<=LOCK_WINDOW;
    readout.textContent=lockable?`峰值 ${level}% · 可鎖定 ${candidate.signal.name}`:`最強訊號 ${level}% · 繼續微調方位`;
    lock.disabled=!lockable;
    lock.textContent=lockable?`鎖定 · ${candidate.signal.name}`:'訊號未達鎖定門檻';
  }else{
    meter.style.width='100%';readout.textContent='三個訊號來源已完成三角定位。';lock.disabled=true;lock.textContent='定位完成';
  }
  discovery.classList.toggle('show',discoveryUnlocked());
  if(pulse){section.classList.remove('cygPulse');void section.offsetWidth;section.classList.add('cygPulse')}
}

function lockNearest(){
  if(!safeExploration())return false;
  const candidate=nearest();
  if(!candidate||candidate.diff>LOCK_WINDOW||isLocked(candidate.signal.id))return false;
  progress.locked.push(candidate.signal.id);progress=normalise(progress);save();
  navigator.vibrate?.([12,35,12]);
  render(true);
  dispatchEvent(new CustomEvent('stellarwarp:discovery-change',{detail:{system:SYSTEM,discovery:discoveryUnlocked()?'雙星航標三角場':null}}));
  return true;
}

function sample(){
  ensureUi();
  const visible=safeExploration();
  if(visible!==lastVisible){document.querySelector('#cygBeaconScan')?.classList.toggle('show',visible);lastVisible=visible;if(visible)render()}
}

setInterval(sample,500);
sample();
window.WarpCygBeacon={
  progress(){return{locked:[...progress.locked],discovery:discoveryUnlocked()}},
  tune(value){bearing=Math.max(0,Math.min(359,Math.round(Number(value)||0)));const input=document.querySelector('#cygRange');if(input)input.value=String(bearing);render();return bearing},
  lock(){return lockNearest()},
  reset(){progress={locked:[]};bearing=0;save();const input=document.querySelector('#cygRange');if(input)input.value='0';render()}
};
})();
