(() => {
'use strict';

const KEY='stellar-warp-tau-rings-v1';
const SYSTEM='TAU';
const CAPTURE_WINDOW=3;
const MIN_RADIUS=0;
const MAX_RADIUS=100;
const FEATURES=[
  {id:'inner',name:'內環稀薄帶',radius:23,note:'內側環帶出現較低密度窗口，令背後星光透過率短暫上升。'},
  {id:'resonance',name:'衛星共振隙',radius:56,note:'中段環隙與外側衛星軌道形成穩定共振，維持清晰密度谷。'},
  {id:'wake',name:'外環密度波',radius:82,note:'外環受衛星擾動形成週期性密度波，呈現可辨識的明暗尾流。'}
];
const IDS=new Set(FEATURES.map(feature=>feature.id));
let uiReady=false;
let lastVisible=false;
let radius=MIN_RADIUS;

function normalise(raw){
  const captured=Array.isArray(raw?.captured)?raw.captured.filter(id=>IDS.has(id)):[];
  return{captured:[...new Set(captured)]};
}
function load(){try{return normalise(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return{captured:[]}}}
let progress=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,captured:progress.captured}))}catch{}}
function isCaptured(id){return progress.captured.includes(id)}
function remaining(){return FEATURES.filter(feature=>!isCaptured(feature.id))}
function nearest(){
  const features=remaining();
  if(!features.length)return null;
  return features.map(feature=>({feature,diff:Math.abs(radius-feature.radius)})).sort((a,b)=>a.diff-b.diff)[0];
}
function discoveryUnlocked(){return progress.captured.length===FEATURES.length}
function contrast(diff){return Math.max(0,Math.min(100,Math.round((1-diff/30)*100)))}
function safeExploration(){
  let state;try{state=window.WarpSim?.state?.()}catch{return false}
  return !!state&&state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost;
}

function ensureUi(){
  if(uiReady&&document.querySelector('#tauRingProfiler'))return true;
  const desc=document.querySelector('#exploreDesc');
  if(!desc)return false;
  if(!document.querySelector('#tauRingProfilerStyle')){
    const style=document.createElement('style');
    style.id='tauRingProfilerStyle';
    style.textContent='.tauProfiler{display:none;margin:8px 0 7px;padding:9px;border:1px solid rgba(231,167,233,.22);border-radius:12px;background:linear-gradient(180deg,rgba(124,73,133,.10),rgba(78,48,100,.055))}.tauProfiler.show{display:block}.tauHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.tauTitle{font-size:9px;font-weight:820;letter-spacing:.035em}.tauProgress{font-size:7px;color:#f0c8f3}.tauFeatureRow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}.tauFeature{min-width:0;padding:5px 4px;border:1px solid rgba(188,215,255,.11);border-radius:8px;font-size:7px;line-height:1.25;text-align:center;color:var(--muted)}.tauFeature.captured{color:#ffe9ff;border-color:rgba(232,170,238,.3);background:rgba(174,91,183,.1)}.tauScanner{margin-top:8px;padding:8px;border:1px solid rgba(188,215,255,.1);border-radius:10px;background:rgba(0,0,0,.12)}.tauRadius{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.tauRadius strong{font-size:10px}.tauRadius span{font-size:8px;color:#f0cff4}.tauProfile{position:relative;height:18px;margin:7px 0 1px;border-radius:999px;overflow:hidden;border:1px solid rgba(236,202,242,.12);background:repeating-linear-gradient(90deg,rgba(225,181,228,.22) 0 5%,rgba(96,55,112,.22) 5% 9%,rgba(230,189,225,.36) 9% 17%,rgba(63,39,88,.28) 17% 22%)}.tauProfile::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.04),transparent 28%,rgba(255,214,255,.08) 57%,transparent 78%)}.tauProbe{position:absolute;z-index:1;top:1px;bottom:1px;width:2px;left:0;background:#fff1ff;box-shadow:0 0 7px rgba(255,212,255,.8);transform:translateX(-1px)}.tauRange{width:100%;height:34px;margin:1px 0 0;accent-color:#d59cdf}.tauMeter{height:5px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.07)}.tauMeter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#9c78cc,#f0aadf);transition:width .08s linear}.tauReadout{margin-top:5px;font-size:8px;line-height:1.4;color:var(--muted)}.tauCapture{width:100%;min-height:40px;margin-top:7px;border:1px solid rgba(231,184,239,.34);border-radius:10px;background:rgba(170,92,181,.12);color:var(--text);font-size:9px;font-weight:790}.tauCapture:disabled{opacity:.42}.tauHint{margin:6px 0 0;font-size:7px;line-height:1.4;color:var(--muted)}.tauDiscovery{display:none;margin-top:7px;padding:7px 8px;border:1px solid rgba(234,180,239,.28);border-radius:9px;background:rgba(155,82,166,.09);font-size:8px;line-height:1.45;color:#fff0ff}.tauDiscovery.show{display:block}.tauPulse{animation:tauPulse .75s ease-out}@keyframes tauPulse{0%{box-shadow:0 0 0 0 rgba(219,145,227,.42)}100%{box-shadow:0 0 0 14px rgba(219,145,227,0)}}@media(min-width:900px){#app .tauTitle,#app .tauRadius strong{font-size:var(--ui-md)}#app .tauProgress,#app .tauFeature,#app .tauHint{font-size:var(--ui-xs)}#app .tauRadius span,#app .tauReadout,#app .tauDiscovery,#app .tauCapture{font-size:var(--ui-sm)}#app .tauCapture{min-height:40px}}';
    document.head.append(style);
  }
  const section=document.createElement('section');
  section.id='tauRingProfiler';
  section.className='tauProfiler';
  section.setAttribute('aria-label','金牛塵海行星環徑向剖面掃描');
  section.innerHTML='<div class="tauHead"><strong class="tauTitle">行星環剖面 · 共振掃描</strong><span id="tauProgress" class="tauProgress">0 / 3 已記錄</span></div><div id="tauFeatureRow" class="tauFeatureRow"></div><div class="tauScanner"><div class="tauRadius"><strong>環帶半徑</strong><span id="tauRadius">0 / 100</span></div><div class="tauProfile" aria-hidden="true"><i id="tauProbe" class="tauProbe"></i></div><input id="tauRange" class="tauRange" type="range" min="0" max="100" step="1" value="0" aria-label="行星環徑向掃描 0 至 100"><div class="tauMeter" aria-hidden="true"><i id="tauMeter"></i></div><div id="tauReadout" class="tauReadout" aria-live="polite">沿天然行星環由內向外掃描，尋找密度異常。</div><button id="tauCapture" class="tauCapture" type="button" disabled>未進入異常窗口</button><p class="tauHint">接近異常半徑 ±3 可記錄；三個環帶特徵完成後建立共振剖面。0–100 為本地掃描索引，不代表真實公里尺度。</p></div><div id="tauDiscovery" class="tauDiscovery" role="status" aria-live="polite"><strong>發現紀錄：三層環隙共振</strong><br>內環稀薄帶、衛星共振隙與外環密度波共同顯示金牛塵海的天然行星環並非均勻圓盤，而是持續受衛星與軌道共振塑形。</div>';
  const anchor=document.querySelector('#landmarkGuide')||desc;
  anchor.insertAdjacentElement('afterend',section);
  section.querySelector('#tauRange').addEventListener('input',event=>{radius=Math.max(MIN_RADIUS,Math.min(MAX_RADIUS,Number(event.target.value)||MIN_RADIUS));render()});
  section.querySelector('#tauCapture').addEventListener('click',captureNearest);
  uiReady=true;
  render();
  return true;
}

function render(pulse=false){
  if(!ensureUi()||!uiReady)return;
  const section=document.querySelector('#tauRingProfiler');
  const row=section?.querySelector('#tauFeatureRow');
  const progressText=section?.querySelector('#tauProgress');
  const radiusText=section?.querySelector('#tauRadius');
  const probe=section?.querySelector('#tauProbe');
  const meter=section?.querySelector('#tauMeter');
  const readout=section?.querySelector('#tauReadout');
  const capture=section?.querySelector('#tauCapture');
  const discovery=section?.querySelector('#tauDiscovery');
  if(!section||!row||!progressText||!radiusText||!probe||!meter||!readout||!capture||!discovery)return;
  row.replaceChildren();
  for(const feature of FEATURES){
    const chip=document.createElement('div');chip.className='tauFeature'+(isCaptured(feature.id)?' captured':'');
    chip.textContent=isCaptured(feature.id)?`✓ ${feature.name} · ${feature.radius}`:'未識別環帶';row.append(chip);
  }
  progressText.textContent=`${progress.captured.length} / ${FEATURES.length} 已記錄`;
  radiusText.textContent=`${Math.round(radius)} / ${MAX_RADIUS}`;
  probe.style.left=(radius/MAX_RADIUS*100).toFixed(1)+'%';
  const candidate=nearest();
  if(candidate){
    const level=contrast(candidate.diff);meter.style.width=level+'%';
    const capturable=candidate.diff<=CAPTURE_WINDOW;
    readout.textContent=capturable?`密度異常 ${level}% · 可記錄 ${candidate.feature.name}`:`環帶對比 ${level}% · 繼續移動徑向探針`;
    capture.disabled=!capturable;
    capture.textContent=capturable?`記錄異常 · ${candidate.feature.name}`:'未進入異常窗口';
  }else{
    meter.style.width='100%';readout.textContent='三個環帶特徵已完成徑向剖面。';capture.disabled=true;capture.textContent='環帶剖面完成';
  }
  discovery.classList.toggle('show',discoveryUnlocked());
  if(pulse){section.classList.remove('tauPulse');void section.offsetWidth;section.classList.add('tauPulse')}
}

function captureNearest(){
  if(!safeExploration())return false;
  const candidate=nearest();
  if(!candidate||candidate.diff>CAPTURE_WINDOW||isCaptured(candidate.feature.id))return false;
  progress.captured.push(candidate.feature.id);progress=normalise(progress);save();
  navigator.vibrate?.(14);
  render(true);
  dispatchEvent(new CustomEvent('stellarwarp:discovery-change',{detail:{system:SYSTEM,discovery:discoveryUnlocked()?'三層環隙共振':null}}));
  return true;
}

function sample(){
  ensureUi();
  const visible=safeExploration();
  if(visible!==lastVisible){document.querySelector('#tauRingProfiler')?.classList.toggle('show',visible);lastVisible=visible;if(visible)render()}
}

setInterval(sample,500);
sample();
window.WarpTauRings={
  progress(){return{captured:[...progress.captured],discovery:discoveryUnlocked()}},
  tune(value){radius=Math.max(MIN_RADIUS,Math.min(MAX_RADIUS,Math.round(Number(value)||MIN_RADIUS)));const input=document.querySelector('#tauRange');if(input)input.value=String(radius);render();return radius},
  capture(){return captureNearest()},
  reset(){progress={captured:[]};radius=MIN_RADIUS;save();const input=document.querySelector('#tauRange');if(input)input.value=String(radius);render()}
};
})();
