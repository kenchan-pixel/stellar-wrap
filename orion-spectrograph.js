(() => {
'use strict';

const KEY='stellar-warp-orion-spectrum-v1';
const SYSTEM='ORION';
const CAPTURE_WINDOW=4;
const MIN_WAVELENGTH=470;
const MAX_WAVELENGTH=680;
const LINES=[
  {id:'hbeta',name:'Hβ',wavelength:486,note:'氫 β 發射線補上高能氣體的藍綠結構。'},
  {id:'oiii',name:'[O III]',wavelength:501,note:'雙電離氧發射線勾勒較高激發區域。'},
  {id:'halpha',name:'Hα',wavelength:656,note:'氫 α 發射線描出發射星雲最強的紅色殼層。'}
];
const IDS=new Set(LINES.map(line=>line.id));
let uiReady=false;
let lastVisible=false;
let wavelength=MIN_WAVELENGTH;

function normalise(raw){
  const captured=Array.isArray(raw?.captured)?raw.captured.filter(id=>IDS.has(id)):[];
  return{captured:[...new Set(captured)]};
}
function load(){try{return normalise(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return{captured:[]}}}
let progress=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,captured:progress.captured}))}catch{}}
function isCaptured(id){return progress.captured.includes(id)}
function remaining(){return LINES.filter(line=>!isCaptured(line.id))}
function nearest(){
  const lines=remaining();
  if(!lines.length)return null;
  return lines.map(line=>({line,diff:Math.abs(wavelength-line.wavelength)})).sort((a,b)=>a.diff-b.diff)[0];
}
function discoveryUnlocked(){return progress.captured.length===LINES.length}
function strength(diff){return Math.max(0,Math.min(100,Math.round((1-diff/70)*100)))}

function ensureUi(){
  if(uiReady&&document.querySelector('#orionSpectrograph'))return true;
  const desc=document.querySelector('#exploreDesc');
  if(!desc)return false;
  if(!document.querySelector('#orionSpectrographStyle')){
    const style=document.createElement('style');
    style.id='orionSpectrographStyle';
    style.textContent='.orionSpectrum{display:none;margin:8px 0 7px;padding:9px;border:1px solid rgba(255,155,116,.22);border-radius:12px;background:linear-gradient(180deg,rgba(137,55,35,.10),rgba(72,42,94,.06))}.orionSpectrum.show{display:block}.orionHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.orionTitle{font-size:9px;font-weight:820;letter-spacing:.035em}.orionProgress{font-size:7px;color:#ffcbb7}.orionLineRow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}.orionLine{min-width:0;padding:5px 4px;border:1px solid rgba(188,215,255,.11);border-radius:8px;font-size:7px;line-height:1.25;text-align:center;color:var(--muted)}.orionLine.captured{color:#fff0e8;border-color:rgba(255,181,141,.3);background:rgba(186,89,54,.1)}.orionScanner{margin-top:8px;padding:8px;border:1px solid rgba(188,215,255,.1);border-radius:10px;background:rgba(0,0,0,.12)}.orionWavelength{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.orionWavelength strong{font-size:10px}.orionWavelength span{font-size:8px;color:#ffd3c2}.orionBand{height:7px;margin:7px 0 0;border-radius:99px;background:linear-gradient(90deg,#5b4cff 0%,#4f8dff 13%,#48d7d0 28%,#69e46f 42%,#e9df59 57%,#ff9f4d 72%,#ff5b4d 88%,#a92d42 100%);opacity:.78}.orionRange{width:100%;height:32px;margin:2px 0 0;accent-color:#ff9a77}.orionMeter{height:5px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.07)}.orionMeter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#8a67ff,#ff8a68);transition:width .08s linear}.orionReadout{margin-top:5px;font-size:8px;line-height:1.4;color:var(--muted)}.orionCapture{width:100%;min-height:38px;margin-top:7px;border:1px solid rgba(255,190,158,.34);border-radius:10px;background:rgba(191,91,61,.12);color:var(--text);font-size:9px;font-weight:790}.orionCapture:disabled{opacity:.42}.orionHint{margin:6px 0 0;font-size:7px;line-height:1.4;color:var(--muted)}.orionDiscovery{display:none;margin-top:7px;padding:7px 8px;border:1px solid rgba(255,185,145,.28);border-radius:9px;background:rgba(166,73,45,.09);font-size:8px;line-height:1.45;color:#fff1ea}.orionDiscovery.show{display:block}.orionPulse{animation:orionPulse .75s ease-out}@keyframes orionPulse{0%{box-shadow:0 0 0 0 rgba(255,140,105,.42)}100%{box-shadow:0 0 0 14px rgba(255,140,105,0)}}@media(min-width:900px){#app .orionTitle,#app .orionWavelength strong{font-size:var(--ui-md)}#app .orionProgress,#app .orionLine,#app .orionHint{font-size:var(--ui-xs)}#app .orionWavelength span,#app .orionReadout,#app .orionDiscovery,#app .orionCapture{font-size:var(--ui-sm)}#app .orionCapture{min-height:40px}}';
    document.head.append(style);
  }
  const section=document.createElement('section');
  section.id='orionSpectrograph';
  section.className='orionSpectrum';
  section.setAttribute('aria-label','獵戶前哨星雲窄帶光譜掃描');
  section.innerHTML='<div class="orionHead"><strong class="orionTitle">星雲光譜 · 窄帶掃描</strong><span id="orionProgress" class="orionProgress">0 / 3 已記錄</span></div><div id="orionLineRow" class="orionLineRow"></div><div class="orionScanner"><div class="orionWavelength"><strong>觀測波長</strong><span id="orionWavelength">470 nm</span></div><div class="orionBand" aria-hidden="true"></div><input id="orionRange" class="orionRange" type="range" min="470" max="680" step="1" value="470" aria-label="觀測波長 470 至 680 納米"><div class="orionMeter" aria-hidden="true"><i id="orionMeter"></i></div><div id="orionReadout" class="orionReadout" aria-live="polite">掃描可見光窄帶，尋找第一條發射峰。</div><button id="orionCapture" class="orionCapture" type="button" disabled>未進入譜線窗口</button><p class="orionHint">接近譜線 ±4 nm 可記錄；三條發射線完成後建立窄帶殼層紀錄。掃描只讀取本機探索狀態，不改變相機或航程。</p></div><div id="orionDiscovery" class="orionDiscovery" role="status" aria-live="polite"><strong>發現紀錄：三線發射殼層</strong><br>Hβ、[O III] 與 Hα 三組窄帶訊號共同勾勒獵戶前哨附近發射星雲的高低激發結構。</div>';
  const anchor=document.querySelector('#landmarkGuide')||desc;
  anchor.insertAdjacentElement('afterend',section);
  section.querySelector('#orionRange').addEventListener('input',event=>{wavelength=Math.max(MIN_WAVELENGTH,Math.min(MAX_WAVELENGTH,Number(event.target.value)||MIN_WAVELENGTH));render()});
  section.querySelector('#orionCapture').addEventListener('click',captureNearest);
  uiReady=true;
  render();
  return true;
}

function render(pulse=false){
  if(!ensureUi()||!uiReady)return;
  const section=document.querySelector('#orionSpectrograph');
  const row=section?.querySelector('#orionLineRow');
  const progressText=section?.querySelector('#orionProgress');
  const wavelengthText=section?.querySelector('#orionWavelength');
  const meter=section?.querySelector('#orionMeter');
  const readout=section?.querySelector('#orionReadout');
  const capture=section?.querySelector('#orionCapture');
  const discovery=section?.querySelector('#orionDiscovery');
  if(!section||!row||!progressText||!wavelengthText||!meter||!readout||!capture||!discovery)return;
  row.replaceChildren();
  for(const line of LINES){
    const chip=document.createElement('div');chip.className='orionLine'+(isCaptured(line.id)?' captured':'');
    chip.textContent=isCaptured(line.id)?`✓ ${line.name} · ${line.wavelength} nm`:'未識別譜線';row.append(chip);
  }
  progressText.textContent=`${progress.captured.length} / ${LINES.length} 已記錄`;
  wavelengthText.textContent=Math.round(wavelength)+' nm';
  const candidate=nearest();
  if(candidate){
    const level=strength(candidate.diff);meter.style.width=level+'%';
    const capturable=candidate.diff<=CAPTURE_WINDOW;
    readout.textContent=capturable?`發射峰 ${level}% · ${candidate.line.name} 約 ${candidate.line.wavelength} nm`:`訊號 ${level}% · 繼續掃描波長`;
    capture.disabled=!capturable;
    capture.textContent=capturable?`記錄譜線 · ${candidate.line.name}`:'未進入譜線窗口';
  }else{
    meter.style.width='100%';readout.textContent='三條發射線已完成窄帶組合。';capture.disabled=true;capture.textContent='光譜記錄完成';
  }
  discovery.classList.toggle('show',discoveryUnlocked());
  if(pulse){section.classList.remove('orionPulse');void section.offsetWidth;section.classList.add('orionPulse')}
}

function captureNearest(){
  const candidate=nearest();
  if(!candidate||candidate.diff>CAPTURE_WINDOW||isCaptured(candidate.line.id))return false;
  progress.captured.push(candidate.line.id);progress=normalise(progress);save();
  navigator.vibrate?.(14);
  render(true);
  dispatchEvent(new CustomEvent('stellarwarp:discovery-change',{detail:{system:SYSTEM,discovery:discoveryUnlocked()?'三線發射殼層':null}}));
  return true;
}

function sample(){
  ensureUi();
  let state;try{state=window.WarpSim?.state?.()}catch{return}
  if(!state)return;
  const visible=state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost;
  if(visible!==lastVisible){document.querySelector('#orionSpectrograph')?.classList.toggle('show',visible);lastVisible=visible;if(visible)render()}
}

setInterval(sample,500);
sample();
window.WarpOrionSpectrum={
  progress(){return{captured:[...progress.captured],discovery:discoveryUnlocked()}},
  tune(value){wavelength=Math.max(MIN_WAVELENGTH,Math.min(MAX_WAVELENGTH,Math.round(Number(value)||MIN_WAVELENGTH)));const input=document.querySelector('#orionRange');if(input)input.value=String(wavelength);render();return wavelength},
  capture(){return captureNearest()},
  reset(){progress={captured:[]};wavelength=MIN_WAVELENGTH;save();const input=document.querySelector('#orionRange');if(input)input.value=String(wavelength);render()}
};
})();
