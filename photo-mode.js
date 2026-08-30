(() => {
'use strict';

const SYSTEM_NAMES={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
const GUIDE_MODES=Object.freeze(['thirds','center','off']);
const GUIDE_LABELS=Object.freeze({thirds:'格線：三分',center:'格線：中心',off:'格線：關'});
let uiReady=false;
let active=false;
let currentId='SOL';
let lastVisible=false;
let captureBusy=false;
let toastTimer=0;
let guideMode='thirds';

function safeState(state){
  return !!state&&SYSTEM_NAMES[state.current]&&state.exploring&&!state.flying&&!state.contextLost;
}

function ensureUi(){
  if(uiReady&&document.querySelector('#photoModeToolbar')&&document.querySelector('#photoModeTrigger')&&document.querySelector('#photoCompositionGuide'))return true;
  const actions=document.querySelector('#exploreCard .exploreActions');
  const app=document.querySelector('#app');
  if(!actions||!app)return false;
  if(!document.querySelector('#photoModeStyle')){
    const style=document.createElement('style');
    style.id='photoModeStyle';
    style.textContent='.photoModeTrigger{display:none}.photoModeTrigger.show{display:block}.photoModeToolbar{position:absolute;z-index:18;left:var(--safeL);right:var(--safeR);bottom:var(--safeB);display:flex;align-items:center;gap:7px;padding:7px;border:1px solid rgba(181,216,255,.2);border-radius:14px;background:rgba(3,7,15,.72);backdrop-filter:blur(16px);box-shadow:0 12px 38px rgba(0,0,0,.35);opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .18s,transform .18s}.photoMode .photoModeToolbar{opacity:1;transform:none;pointer-events:auto}.photoModeToolbar button{min-height:44px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.055);color:var(--text);font-size:10px;font-weight:780;padding:0 12px}.photoModeToolbar button:disabled{opacity:.46}.photoModeToolbar .photoCapture{flex:1;border-color:rgba(178,216,255,.38);background:linear-gradient(180deg,rgba(150,195,255,.22),rgba(91,145,220,.1))}.photoModeLabel{min-width:0;flex:1.2}.photoModeLabel strong{display:block;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.photoModeLabel span{display:block;margin-top:2px;font-size:7px;color:var(--muted)}.photoCompositionGuide{position:absolute;z-index:17;inset:0;pointer-events:none;opacity:0;transition:opacity .18s ease}.photoCompositionGuide span{position:absolute;pointer-events:none;display:none;background:rgba(232,244,255,.46);box-shadow:0 0 0 1px rgba(0,0,0,.18)}.photoCompositionGuide .photoGuideV{top:0;bottom:0;width:1px}.photoCompositionGuide .photoGuideH{left:0;right:0;height:1px}.photoCompositionGuide .photoGuideV1{left:33.333%}.photoCompositionGuide .photoGuideV2{left:66.667%}.photoCompositionGuide .photoGuideH1{top:33.333%}.photoCompositionGuide .photoGuideH2{top:66.667%}.photoCompositionGuide .photoGuideVC{left:50%}.photoCompositionGuide .photoGuideHC{top:50%}.photoCompositionGuide .photoGuideMark{left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border:1px solid rgba(232,244,255,.56);border-radius:50%;background:transparent;box-shadow:0 0 0 1px rgba(0,0,0,.18)}.photoMode .photoCompositionGuide[data-mode="thirds"],.photoMode .photoCompositionGuide[data-mode="center"]{opacity:.62}.photoCompositionGuide[data-mode="thirds"] .photoGuideV1,.photoCompositionGuide[data-mode="thirds"] .photoGuideV2,.photoCompositionGuide[data-mode="thirds"] .photoGuideH1,.photoCompositionGuide[data-mode="thirds"] .photoGuideH2{display:block}.photoCompositionGuide[data-mode="center"] .photoGuideVC,.photoCompositionGuide[data-mode="center"] .photoGuideHC,.photoCompositionGuide[data-mode="center"] .photoGuideMark{display:block}.photoModeToast{position:absolute;z-index:19;left:50%;bottom:calc(var(--safeB) + 68px);transform:translateX(-50%) translateY(7px);max-width:82vw;padding:7px 10px;border-radius:999px;border:1px solid rgba(182,216,255,.18);background:rgba(3,7,15,.82);font-size:8px;color:#eaf3ff;opacity:0;pointer-events:none;transition:opacity .16s,transform .16s;white-space:nowrap}.photoModeToast.show{opacity:1;transform:translateX(-50%) translateY(0)}.photoMode .hud,.photoMode #flightBar,.photoMode #telemetry,.photoMode #openPanel,.photoMode #panel,.photoMode #exploreCard,.photoMode #perfHud{opacity:0!important;pointer-events:none!important}.photoMode.photoCapturing .photoModeToolbar,.photoMode.photoCapturing .photoModeToast,.photoMode.photoCapturing .photoCompositionGuide{opacity:0!important;pointer-events:none!important}@media (max-width:390px){.photoModeToolbar{gap:5px;padding:6px;flex-wrap:wrap}.photoModeToolbar button{padding:0 9px}.photoModeLabel{flex:1 0 calc(100% - 96px)}.photoModeLabel span{display:none}.photoGuideToggle{flex:0 0 auto}.photoCapture{min-width:118px}.photoModeToast{bottom:calc(var(--safeB) + 112px)}}@media (prefers-reduced-motion:reduce){.photoCompositionGuide{transition:none}}';
    document.head.append(style);
  }
  let trigger=document.querySelector('#photoModeTrigger');
  if(!trigger){
    trigger=document.createElement('button');
    trigger.id='photoModeTrigger';
    trigger.className='microBtn photoModeTrigger';
    trigger.type='button';
    trigger.textContent='攝影模式';
    trigger.addEventListener('click',enter);
    actions.append(trigger);
  }
  let guide=document.querySelector('#photoCompositionGuide');
  if(!guide){
    guide=document.createElement('div');
    guide.id='photoCompositionGuide';
    guide.className='photoCompositionGuide';
    guide.setAttribute('aria-hidden','true');
    guide.innerHTML='<span class="photoGuideV photoGuideV1"></span><span class="photoGuideV photoGuideV2"></span><span class="photoGuideH photoGuideH1"></span><span class="photoGuideH photoGuideH2"></span><span class="photoGuideV photoGuideVC"></span><span class="photoGuideH photoGuideHC"></span><span class="photoGuideMark"></span>';
    app.append(guide);
  }
  let toolbar=document.querySelector('#photoModeToolbar');
  if(!toolbar){
    toolbar=document.createElement('div');
    toolbar.id='photoModeToolbar';
    toolbar.className='photoModeToolbar';
    toolbar.setAttribute('role','group');
    toolbar.setAttribute('aria-label','目的地攝影模式');
    toolbar.setAttribute('aria-hidden','true');
    toolbar.innerHTML='<div class="photoModeLabel"><strong id="photoModeName">目的地攝影</strong><span>拖動畫面構圖 · 格線只作構圖輔助，不會寫入 PNG</span></div><button id="photoGuideToggle" class="photoGuideToggle" type="button">格線：三分</button><button id="photoModeExit" type="button">返回</button><button id="photoModeCapture" class="photoCapture" type="button">高畫質留影</button>';
    app.append(toolbar);
    toolbar.querySelector('#photoGuideToggle').addEventListener('click',cycleGuide);
    toolbar.querySelector('#photoModeExit').addEventListener('click',exit);
    toolbar.querySelector('#photoModeCapture').addEventListener('click',capture);
  }
  if(!document.querySelector('#photoModeToast')){
    const toast=document.createElement('div');
    toast.id='photoModeToast';
    toast.className='photoModeToast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    app.append(toast);
  }
  uiReady=true;
  setGuideMode(guideMode,false);
  return true;
}

function notify(message,delay=1800){
  const toast=document.querySelector('#photoModeToast');
  if(!toast)return;
  clearTimeout(toastTimer);
  toast.textContent=message;
  toast.classList.add('show');
  toastTimer=setTimeout(()=>toast.classList.remove('show'),delay);
}

function updateLabel(){
  const label=document.querySelector('#photoModeName');
  if(label)label.textContent=(SYSTEM_NAMES[currentId]||currentId)+' · 攝影模式';
}

function setGuideMode(mode,announce=true){
  const next=GUIDE_MODES.includes(mode)?mode:'thirds';
  guideMode=next;
  const guide=document.querySelector('#photoCompositionGuide');
  if(guide)guide.dataset.mode=guideMode;
  const button=document.querySelector('#photoGuideToggle');
  if(button){
    button.textContent=GUIDE_LABELS[guideMode];
    button.setAttribute('aria-label',`${GUIDE_LABELS[guideMode]} · 按下切換構圖輔助`);
  }
  if(announce&&active)notify(guideMode==='off'?'構圖格線已關閉':guideMode==='thirds'?'已切換三分構圖格線':'已切換中心構圖格線',1300);
  return guideMode;
}

function cycleGuide(){
  const index=GUIDE_MODES.indexOf(guideMode);
  setGuideMode(GUIDE_MODES[(index+1)%GUIDE_MODES.length]);
}

function setCaptureBusy(value){
  captureBusy=!!value;
  const toolbar=document.querySelector('#photoModeToolbar');
  if(toolbar)toolbar.setAttribute('aria-busy',captureBusy?'true':'false');
  const guideButton=document.querySelector('#photoGuideToggle');
  const exitButton=document.querySelector('#photoModeExit');
  const captureButton=document.querySelector('#photoModeCapture');
  if(guideButton)guideButton.disabled=captureBusy;
  if(exitButton)exitButton.disabled=captureBusy;
  if(captureButton)captureButton.disabled=captureBusy;
}

function enter(){
  if(active||!ensureUi())return;
  const api=window.WarpSim;
  let state;
  try{state=api?.state?.()}catch{return}
  if(!safeState(state))return;
  currentId=state.current;
  active=true;
  updateLabel();
  setGuideMode(guideMode,false);
  document.querySelector('#app')?.classList.add('photoMode');
  document.querySelector('#photoModeToolbar')?.setAttribute('aria-hidden','false');
  notify('已隱藏航行介面 · 可拖動畫面構圖');
}

function exit(){
  if(!active||captureBusy)return;
  active=false;
  const app=document.querySelector('#app');
  app?.classList.remove('photoMode','photoCapturing');
  document.querySelector('#photoModeToolbar')?.setAttribute('aria-hidden','true');
  document.querySelector('#photoModeToast')?.classList.remove('show');
}

function fileName(){
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  return `stellar-wrap-${currentId.toLowerCase()}-${stamp}.png`;
}

function saveBlob(blob,width,height){
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=fileName();
  link.rel='noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),12000);
  notify(`高畫質影像 ${width}×${height} 已產生 · 如未自動儲存請長按保存`,2600);
}

function nextFrame(){
  return new Promise(resolve=>requestAnimationFrame(()=>resolve()));
}

function prepareCaptureQuality(api,state){
  const previous=state?.qualityMode;
  const boosted=previous&&previous!=='high'&&typeof api?.setQuality==='function';
  if(boosted)api.setQuality('high');
  return{previous,boosted};
}

function restoreCaptureQuality(api,token){
  if(token?.boosted&&token.previous&&typeof api?.setQuality==='function')api.setQuality(token.previous);
}

function canvasBlob(canvas){
  return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
}

async function capture(){
  if(!active||captureBusy)return;
  const canvas=document.querySelector('#space');
  const api=window.WarpSim;
  let state;
  try{state=api?.state?.()}catch{return}
  if(!canvas||!safeState(state)||typeof canvas.toBlob!=='function'){
    notify('目前無法產生影像 · 可使用手機截圖',2400);
    return;
  }
  const qualityToken=prepareCaptureQuality(api,state);
  const app=document.querySelector('#app');
  setCaptureBusy(true);
  app?.classList.add('photoCapturing');
  try{
    await nextFrame();
    await nextFrame();
    let latest;
    try{latest=api?.state?.()}catch{}
    if(!active||!safeState(latest)){
      notify('留影已取消 · 目前不在安全探索狀態',2400);
      return;
    }
    const width=canvas.width,height=canvas.height;
    const blob=await canvasBlob(canvas);
    if(!blob){
      notify('影像產生失敗 · 可使用手機截圖',2400);
      return;
    }
    saveBlob(blob,width,height);
  }finally{
    restoreCaptureQuality(api,qualityToken);
    app?.classList.remove('photoCapturing');
    setCaptureBusy(false);
  }
}

function sample(){
  ensureUi();
  const api=window.WarpSim;
  if(!api||typeof api.state!=='function')return;
  let state;
  try{state=api.state()}catch{return}
  if(SYSTEM_NAMES[state.current])currentId=state.current;
  const visible=safeState(state);
  const trigger=document.querySelector('#photoModeTrigger');
  if(trigger&&visible!==lastVisible)trigger.classList.toggle('show',visible);
  if(active&&!visible&&!captureBusy)exit();
  if(active)updateLabel();
  lastVisible=visible;
}

addEventListener('keydown',event=>{if(event.key==='Escape'&&active&&!captureBusy)exit()});
setInterval(sample,500);
sample();
window.WarpPhotoMode={
  enter,
  exit,
  capture,
  active(){return active},
  capturing(){return captureBusy},
  guide(){return guideMode},
  setGuide(mode){return setGuideMode(mode)}
};
})();