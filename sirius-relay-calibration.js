(() => {
'use strict';

const KEY='stellar-warp-sirius-relay-v1';
const SYSTEM='SIRIUS';
const LOCK_WINDOW=4;
const MIN_VALUE=0;
const MAX_VALUE=100;
const WINDOWS=[
  {id:'primary',name:'主星載波窗',carrier:24,phase:72,note:'主星載波在高相位窗口最穩定，適合作為中繼站第一個校準基準。'},
  {id:'secondary',name:'伴星補償窗',carrier:53,phase:37,note:'伴星訊號需要較低相位補償，才能與主星載波分離。'},
  {id:'relay',name:'環站握手窗',carrier:82,phase:61,note:'中繼環最終以獨立握手窗口鎖定雙星訊號，完成三點校準。'}
];
const IDS=new Set(WINDOWS.map(item=>item.id));
let uiReady=false;
let lastVisible=false;
let carrier=MIN_VALUE;
let phase=MIN_VALUE;

function normalise(raw){
  const locked=Array.isArray(raw?.locked)?raw.locked.filter(id=>IDS.has(id)):[];
  return{locked:[...new Set(locked)]};
}
function load(){try{return normalise(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return{locked:[]}}}
let progress=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,locked:progress.locked}))}catch{}}
function isLocked(id){return progress.locked.includes(id)}
function remaining(){return WINDOWS.filter(item=>!isLocked(item.id))}
function diff(item){return{carrier:Math.abs(carrier-item.carrier),phase:Math.abs(phase-item.phase)}}
function nearest(){
  const items=remaining();
  if(!items.length)return null;
  return items.map(item=>{
    const d=diff(item);
    return{item,...d,distance:Math.hypot(d.carrier,d.phase)};
  }).sort((a,b)=>a.distance-b.distance)[0];
}
function discoveryUnlocked(){return progress.locked.length===WINDOWS.length}
function strength(candidate){
  if(!candidate)return 100;
  return Math.max(0,Math.min(100,Math.round(100-candidate.distance*5)));
}
function safeExploration(){
  let state;try{state=window.WarpSim?.state?.()}catch{return false}
  return !!state&&state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost;
}

function ensureUi(){
  if(uiReady&&document.querySelector('#siriusRelayCalibration'))return true;
  const desc=document.querySelector('#exploreDesc');
  if(!desc)return false;
  if(!document.querySelector('#siriusRelayStyle')){
    const style=document.createElement('style');
    style.id='siriusRelayStyle';
    style.textContent='.siriusRelay{display:none;margin:8px 0 7px;padding:9px;border:1px solid rgba(159,207,255,.24);border-radius:12px;background:linear-gradient(180deg,rgba(62,116,180,.10),rgba(48,71,113,.055))}.siriusRelay.show{display:block}.siriusHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.siriusTitle{font-size:9px;font-weight:820;letter-spacing:.035em}.siriusProgress{font-size:7px;color:#c9e5ff}.siriusWindows{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}.siriusWindow{min-width:0;padding:5px 4px;border:1px solid rgba(188,215,255,.11);border-radius:8px;font-size:7px;line-height:1.25;text-align:center;color:var(--muted)}.siriusWindow.locked{color:#e8f5ff;border-color:rgba(147,207,255,.32);background:rgba(83,146,204,.11)}.siriusPanel{margin-top:8px;padding:8px;border:1px solid rgba(188,215,255,.1);border-radius:10px;background:rgba(0,0,0,.12)}.siriusAxis{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.siriusAxis strong{font-size:10px}.siriusAxis span{font-size:8px;color:#d4eaff}.siriusRange{width:100%;height:44px;margin:0;accent-color:#86bff0}.siriusVector{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:4px 0 6px}.siriusVector div{padding:5px 6px;border:1px solid rgba(188,215,255,.09);border-radius:8px;font-size:7px;color:var(--muted);text-align:center}.siriusVector strong{display:block;margin-top:2px;font-size:9px;color:#e7f4ff}.siriusMeter{height:5px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.07)}.siriusMeter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#6d8bd7,#9de4ff);transition:width .08s linear}.siriusReadout{margin-top:5px;font-size:8px;line-height:1.4;color:var(--muted)}.siriusLock{width:100%;min-height:44px;margin-top:7px;border:1px solid rgba(152,208,255,.36);border-radius:10px;background:rgba(76,142,202,.13);color:var(--text);font-size:9px;font-weight:790}.siriusLock:disabled{opacity:.42}.siriusHint{margin:6px 0 0;font-size:7px;line-height:1.4;color:var(--muted)}.siriusDiscovery{display:none;margin-top:7px;padding:7px 8px;border:1px solid rgba(151,211,255,.3);border-radius:9px;background:rgba(72,132,190,.1);font-size:8px;line-height:1.45;color:#edf8ff}.siriusDiscovery.show{display:block}.siriusPulse{animation:siriusPulse .75s ease-out}@keyframes siriusPulse{0%{box-shadow:0 0 0 0 rgba(126,194,245,.42)}100%{box-shadow:0 0 0 14px rgba(126,194,245,0)}}@media(min-width:900px){#app .siriusTitle,#app .siriusAxis strong{font-size:var(--ui-md)}#app .siriusProgress,#app .siriusWindow,#app .siriusHint{font-size:var(--ui-xs)}#app .siriusAxis span,#app .siriusReadout,#app .siriusDiscovery,#app .siriusLock,#app .siriusVector strong{font-size:var(--ui-sm)}#app .siriusLock{min-height:44px}}';
    document.head.append(style);
  }
  const section=document.createElement('section');
  section.id='siriusRelayCalibration';
  section.className='siriusRelay';
  section.setAttribute('aria-label','天狼中繼站雙星相位校準');
  section.innerHTML='<div class="siriusHead"><strong class="siriusTitle">中繼校準 · 雙星相位鎖定</strong><span id="siriusProgress" class="siriusProgress">0 / 3 已鎖定</span></div><div id="siriusWindows" class="siriusWindows"></div><div class="siriusPanel"><div class="siriusAxis"><strong>載波索引</strong><span id="siriusCarrierValue">0 / 100</span></div><input id="siriusCarrier" class="siriusRange" type="range" min="0" max="100" step="1" value="0" aria-label="中繼載波索引 0 至 100"><div class="siriusAxis"><strong>相位索引</strong><span id="siriusPhaseValue">0 / 100</span></div><input id="siriusPhase" class="siriusRange" type="range" min="0" max="100" step="1" value="0" aria-label="中繼相位索引 0 至 100"><div class="siriusVector"><div>載波<strong id="siriusCarrierReadout">0</strong></div><div>相位<strong id="siriusPhaseReadout">0</strong></div></div><div class="siriusMeter" aria-hidden="true"><i id="siriusMeter"></i></div><div id="siriusReadout" class="siriusReadout" aria-live="polite">調整兩個校準軸，尋找中繼站穩定握手窗口。</div><button id="siriusLock" class="siriusLock" type="button" disabled>未進入鎖定窗口</button><p class="siriusHint">兩個索引都進入目標 ±4 才可鎖定。0–100 只代表本機校準軸，不是實際頻率或角度。</p></div><div id="siriusDiscovery" class="siriusDiscovery" role="status" aria-live="polite"><strong>發現紀錄：雙星相位中繼窗</strong><br>主星、伴星與人工中繼環存在三個可重現的穩定握手窗口，形成一套針對雙星照明環境的導航同步基準。</div>';
  const anchor=document.querySelector('#landmarkGuide')||desc;
  anchor.insertAdjacentElement('afterend',section);
  section.querySelector('#siriusCarrier').addEventListener('input',event=>{carrier=Math.max(MIN_VALUE,Math.min(MAX_VALUE,Number(event.target.value)||MIN_VALUE));render()});
  section.querySelector('#siriusPhase').addEventListener('input',event=>{phase=Math.max(MIN_VALUE,Math.min(MAX_VALUE,Number(event.target.value)||MIN_VALUE));render()});
  section.querySelector('#siriusLock').addEventListener('click',lockNearest);
  uiReady=true;
  render();
  return true;
}

function render(pulse=false){
  if(!ensureUi()||!uiReady)return;
  const section=document.querySelector('#siriusRelayCalibration');
  const row=section?.querySelector('#siriusWindows');
  const progressText=section?.querySelector('#siriusProgress');
  const carrierValue=section?.querySelector('#siriusCarrierValue');
  const phaseValue=section?.querySelector('#siriusPhaseValue');
  const carrierReadout=section?.querySelector('#siriusCarrierReadout');
  const phaseReadout=section?.querySelector('#siriusPhaseReadout');
  const meter=section?.querySelector('#siriusMeter');
  const readout=section?.querySelector('#siriusReadout');
  const action=section?.querySelector('#siriusLock');
  const discovery=section?.querySelector('#siriusDiscovery');
  if(!section||!row||!progressText||!carrierValue||!phaseValue||!carrierReadout||!phaseReadout||!meter||!readout||!action||!discovery)return;
  row.replaceChildren();
  for(const item of WINDOWS){
    const chip=document.createElement('div');chip.className='siriusWindow'+(isLocked(item.id)?' locked':'');
    chip.textContent=isLocked(item.id)?`✓ ${item.name}`:'未鎖定窗口';row.append(chip);
  }
  progressText.textContent=`${progress.locked.length} / ${WINDOWS.length} 已鎖定`;
  carrierValue.textContent=`${Math.round(carrier)} / ${MAX_VALUE}`;
  phaseValue.textContent=`${Math.round(phase)} / ${MAX_VALUE}`;
  carrierReadout.textContent=String(Math.round(carrier));
  phaseReadout.textContent=String(Math.round(phase));
  const candidate=nearest();
  if(candidate){
    const level=strength(candidate);meter.style.width=level+'%';
    const capturable=candidate.carrier<=LOCK_WINDOW&&candidate.phase<=LOCK_WINDOW;
    readout.textContent=capturable?`握手強度 ${level}% · 可鎖定 ${candidate.item.name}`:`握手強度 ${level}% · 繼續微調載波與相位`;
    action.disabled=!capturable;
    action.textContent=capturable?`鎖定窗口 · ${candidate.item.name}`:'未進入鎖定窗口';
  }else{
    meter.style.width='100%';readout.textContent='三個中繼握手窗口已完成校準。';action.disabled=true;action.textContent='中繼校準完成';
  }
  discovery.classList.toggle('show',discoveryUnlocked());
  if(pulse){section.classList.remove('siriusPulse');void section.offsetWidth;section.classList.add('siriusPulse')}
}

function lockNearest(){
  if(!safeExploration())return false;
  const candidate=nearest();
  if(!candidate||candidate.carrier>LOCK_WINDOW||candidate.phase>LOCK_WINDOW||isLocked(candidate.item.id))return false;
  progress.locked.push(candidate.item.id);progress=normalise(progress);save();
  navigator.vibrate?.(14);
  render(true);
  dispatchEvent(new CustomEvent('stellarwarp:discovery-change',{detail:{system:SYSTEM,discovery:discoveryUnlocked()?'雙星相位中繼窗':null}}));
  return true;
}

function sample(){
  ensureUi();
  const visible=safeExploration();
  if(visible!==lastVisible){document.querySelector('#siriusRelayCalibration')?.classList.toggle('show',visible);lastVisible=visible;if(visible)render()}
}

setInterval(sample,500);
sample();
window.WarpSiriusRelay={
  progress(){return{locked:[...progress.locked],discovery:discoveryUnlocked()}},
  tuneCarrier(value){carrier=Math.max(MIN_VALUE,Math.min(MAX_VALUE,Math.round(Number(value)||MIN_VALUE)));const input=document.querySelector('#siriusCarrier');if(input)input.value=String(carrier);render();return carrier},
  tunePhase(value){phase=Math.max(MIN_VALUE,Math.min(MAX_VALUE,Math.round(Number(value)||MIN_VALUE)));const input=document.querySelector('#siriusPhase');if(input)input.value=String(phase);render();return phase},
  lock(){return lockNearest()},
  reset(){progress={locked:[]};carrier=MIN_VALUE;phase=MIN_VALUE;save();const carrierInput=document.querySelector('#siriusCarrier'),phaseInput=document.querySelector('#siriusPhase');if(carrierInput)carrierInput.value=String(carrier);if(phaseInput)phaseInput.value=String(phase);render()}
};
})();
