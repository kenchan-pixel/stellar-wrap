(() => {
'use strict';

const SYSTEM_NAMES={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
const GUIDE_MODES=Object.freeze(['thirds','center','off']);
const GUIDE_LABELS=Object.freeze({thirds:'格線：三分',center:'格線：中心',off:'格線：關'});
const FRAME_MODES=Object.freeze(['full','portrait','square']);
const FRAME_LABELS=Object.freeze({full:'畫幅：原幅',portrait:'畫幅：9:16',square:'畫幅：1:1'});
const FRAME_ASPECTS=Object.freeze({portrait:9/16,square:1});
let uiReady=false;
let active=false;
let currentId='SOL';
let lastVisible=false;
let captureBusy=false;
let toastTimer=0;
let guideMode='thirds';
let frameMode='full';
let previewBoost=false;
let previewPreviousQuality=null;

function safeState(state){
  return !!state&&SYSTEM_NAMES[state.current]&&state.exploring&&!state.flying&&!state.contextLost;
}

function ensureUi(){
  if(uiReady&&document.querySelector('#photoModeToolbar')&&document.querySelector('#photoModeTrigger')&&document.querySelector('#photoCompositionGuide')&&document.querySelector('#photoFrameGuide'))return true;
  const actions=document.querySelector('#exploreCard .exploreActions');
  const app=document.querySelector('#app');
  if(!actions||!app)return false;
  if(!document.querySelector('#photoModeStyle')){
    const style=document.createElement('style');
    style.id='photoModeStyle';
    style.textContent='.photoModeTrigger{display:none}.photoModeTrigger.show{display:block}.photoModeToolbar{position:absolute;z-index:18;left:var(--safeL);right:var(--safeR);bottom:var(--safeB);display:flex;align-items:center;gap:7px;padding:7px;border:1px solid rgba(181,216,255,.2);border-radius:14px;background:rgba(3,7,15,.72);backdrop-filter:blur(16px);box-shadow:0 12px 38px rgba(0,0,0,.35);opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .18s,transform .18s}.photoMode .photoModeToolbar{opacity:1;transform:none;pointer-events:auto}.photoModeToolbar button{min-height:44px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.055);color:var(--text);font-size:10px;font-weight:780;padding:0 12px}.photoModeToolbar button:disabled{opacity:.46}.photoModeToolbar .photoCapture{flex:1;border-color:rgba(178,216,255,.38);background:linear-gradient(180deg,rgba(150,195,255,.22),rgba(91,145,220,.1))}.photoPreviewToggle[aria-pressed="true"]{border-color:rgba(168,220,255,.42);background:linear-gradient(180deg,rgba(131,201,255,.2),rgba(86,137,225,.1));box-shadow:inset 0 0 0 1px rgba(255,255,255,.035)}.photoModeLabel{min-width:0;flex:1.2}.photoModeLabel strong{display:block;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.photoModeLabel span{display:block;margin-top:2px;font-size:7px;color:var(--muted)}.photoCompositionGuide,.photoFrameGuide{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .18s ease}.photoCompositionGuide{z-index:17}.photoFrameGuide{z-index:16;overflow:hidden}.photoFrameWindow{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid rgba(230,242,255,.62);box-shadow:0 0 0 100vmax rgba(1,4,10,.36),0 0 20px rgba(150,202,255,.12);pointer-events:none;opacity:.9;transition:width .18s ease,height .18s ease}.photoMode .photoFrameGuide.show{opacity:1}.photoCompositionGuide span{position:absolute;pointer-events:none;display:none;background:rgba(232,244,255,.46);box-shadow:0 0 0 1px rgba(0,0,0,.18)}.photoCompositionGuide .photoGuideV{top:0;bottom:0;width:1px}.photoCompositionGuide .photoGuideH{left:0;right:0;height:1px}.photoCompositionGuide .photoGuideV1{left:33.333%}.photoCompositionGuide .photoGuideV2{left:66.667%}.photoCompositionGuide .photoGuideH1{top:33.333%}.photoCompositionGuide .photoGuideH2{top:66.667%}.photoCompositionGuide .photoGuideVC{left:50%}.photoCompositionGuide .photoGuideHC{top:50%}.photoCompositionGuide .photoGuideMark{left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border:1px solid rgba(232,244,255,.56);border-radius:50%;background:transparent;box-shadow:0 0 0 1px rgba(0,0,0,.18)}.photoMode .photoCompositionGuide[data-mode="thirds"],.photoMode .photoCompositionGuide[data-mode="center"]{opacity:.62}.photoCompositionGuide[data-mode="thirds"] .photoGuideV1,.photoCompositionGuide[data-mode="thirds"] .photoGuideV2,.photoCompositionGuide[data-mode="thirds"] .photoGuideH1,.photoCompositionGuide[data-mode="thirds"] .photoGuideH2{display:block}.photoCompositionGuide[data-mode="center"] .photoGuideVC,.photoCompositionGuide[data-mode="center"] .photoGuideHC,.photoCompositionGuide[data-mode="center"] .photoGuideMark{display:block}.photoModeToast{position:absolute;z-index:19;left:50%;bottom:calc(var(--safeB) + 68px);transform:translateX(-50%) translateY(7px);max-width:82vw;padding:7px 10px;border-radius:999px;border:1px solid rgba(182,216,255,.18);background:rgba(3,7,15,.82);font-size:8px;color:#eaf3ff;opacity:0;pointer-events:none;transition:opacity .16s,transform .16s;white-space:nowrap}.photoModeToast.show{opacity:1;transform:translateX(-50%) translateY(0)}.photoMode .hud,.photoMode #flightBar,.photoMode #telemetry,.photoMode #openPanel,.photoMode #panel,.photoMode #exploreCard,.photoMode #perfHud{opacity:0!important;pointer-events:none!important}.photoMode.photoCapturing .photoModeToolbar,.photoMode.photoCapturing .photoModeToast,.photoMode.photoCapturing .photoCompositionGuide,.photoMode.photoCapturing .photoFrameGuide{opacity:0!important;pointer-events:none!important}@media (max-width:390px){.photoModeToolbar{gap:5px;padding:6px;flex-wrap:wrap}.photoModeToolbar button{padding:0 7px}.photoModeLabel{flex:1 0 100%}.photoModeLabel span{display:none}.photoGuideToggle,.photoFrameToggle,.photoPreviewToggle{flex:0 0 auto}.photoCapture{min-width:104px}.photoModeToast{bottom:calc(var(--safeB) + 158px)}}@media (prefers-reduced-motion:reduce){.photoCompositionGuide,.photoFrameGuide,.photoFrameWindow{transition:none}}';
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
  let frameGuide=document.querySelector('#photoFrameGuide');
  if(!frameGuide){
    frameGuide=document.createElement('div');
    frameGuide.id='photoFrameGuide';
    frameGuide.className='photoFrameGuide';
    frameGuide.setAttribute('aria-hidden','true');
    frameGuide.innerHTML='<span class="photoFrameWindow"></span>';
    app.append(frameGuide);
  }
  let toolbar=document.querySelector('#photoModeToolbar');
  if(!toolbar){
    toolbar=document.createElement('div');
    toolbar.id='photoModeToolbar';
    toolbar.className='photoModeToolbar';
    toolbar.setAttribute('role','group');
    toolbar.setAttribute('aria-label','目的地攝影模式');
    toolbar.setAttribute('aria-hidden','true');
    toolbar.innerHTML='<div class="photoModeLabel"><strong id="photoModeName">目的地攝影</strong><span>拖動畫面構圖 · 高畫質預覽只在攝影模式暫時啟用</span></div><button id="photoGuideToggle" class="photoGuideToggle" type="button">格線：三分</button><button id="photoFrameToggle" class="photoFrameToggle" type="button">畫幅：原幅</button><button id="photoPreviewToggle" class="photoPreviewToggle" type="button" aria-pressed="false">預覽：原</button><button id="photoModeExit" type="button">返回</button><button id="photoModeCapture" class="photoCapture" type="button">高畫質留影</button>';
    app.append(toolbar);
    toolbar.querySelector('#photoGuideToggle').addEventListener('click',cycleGuide);
    toolbar.querySelector('#photoFrameToggle').addEventListener('click',cycleFrame);
    toolbar.querySelector('#photoPreviewToggle').addEventListener('click',togglePreviewBoost);
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
  setFrameMode(frameMode,false);
  updatePreviewButton();
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

function updatePreviewButton(){
  const button=document.querySelector('#photoPreviewToggle');
  if(!button)return;
  button.textContent=previewBoost?'預覽：高':'預覽：原';
  button.setAttribute('aria-pressed',previewBoost?'true':'false');
  button.setAttribute('aria-label',previewBoost?'高畫質預覽已啟用 · 按下恢復原本畫質':'高畫質預覽未啟用 · 按下只在攝影模式暫時提升畫質');
}

function setPreviewBoost(next,announce=true){
  const desired=!!next;
  if(desired===previewBoost){updatePreviewButton();return previewBoost}
  const api=window.WarpSim;
  if(desired){
    let state;
    try{state=api?.state?.()}catch{return false}
    if(!active||captureBusy||!safeState(state)||typeof api?.setQuality!=='function')return false;
    previewPreviousQuality=state.qualityMode||null;
    previewBoost=true;
    if(previewPreviousQuality!=='high')api.setQuality('high');
    updatePreviewButton();
    if(announce)notify('高畫質預覽已啟用 · 離開攝影模式會自動恢復',1800);
    return true;
  }
  const previous=previewPreviousQuality;
  previewBoost=false;
  previewPreviousQuality=null;
  if(previous&&previous!=='high'&&typeof api?.setQuality==='function'){
    let state;
    try{state=api?.state?.()}catch{}
    if(state?.qualityMode==='high')api.setQuality(previous);
  }
  updatePreviewButton();
  if(announce&&active)notify('已恢復原本預覽畫質',1300);
  return false;
}

function togglePreviewBoost(){
  if(captureBusy)return;
  setPreviewBoost(!previewBoost);
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

function cropRect(width,height,mode=frameMode){
  const sourceWidth=Math.max(1,Math.round(Number(width)||1));
  const sourceHeight=Math.max(1,Math.round(Number(height)||1));
  const aspect=FRAME_ASPECTS[mode];
  if(!aspect)return{x:0,y:0,width:sourceWidth,height:sourceHeight,mode:'full'};
  let cropWidth=sourceWidth,cropHeight=Math.round(cropWidth/aspect);
  if(cropHeight>sourceHeight){cropHeight=sourceHeight;cropWidth=Math.round(cropHeight*aspect)}
  cropWidth=Math.max(1,Math.min(sourceWidth,cropWidth));
  cropHeight=Math.max(1,Math.min(sourceHeight,cropHeight));
  return{x:Math.floor((sourceWidth-cropWidth)/2),y:Math.floor((sourceHeight-cropHeight)/2),width:cropWidth,height:cropHeight,mode};
}

function updateFrameGuide(){
  const guide=document.querySelector('#photoFrameGuide');
  const windowEl=guide?.querySelector('.photoFrameWindow');
  if(!guide||!windowEl)return;
  const bounds=guide.getBoundingClientRect();
  const rect=cropRect(bounds.width,bounds.height,frameMode);
  guide.dataset.mode=frameMode;
  guide.classList.toggle('show',active&&frameMode!=='full');
  windowEl.style.width=`${rect.width}px`;
  windowEl.style.height=`${rect.height}px`;
}

function setFrameMode(mode,announce=true){
  const next=FRAME_MODES.includes(mode)?mode:'full';
  frameMode=next;
  const button=document.querySelector('#photoFrameToggle');
  if(button){
    button.textContent=FRAME_LABELS[frameMode];
    button.setAttribute('aria-label',`${FRAME_LABELS[frameMode]} · 按下切換輸出畫幅`);
  }
  updateFrameGuide();
  if(announce&&active)notify(frameMode==='full'?'輸出使用原始畫幅':frameMode==='portrait'?'已切換 9:16 直向畫幅':'已切換 1:1 方形畫幅',1400);
  return frameMode;
}

function cycleFrame(){
  const index=FRAME_MODES.indexOf(frameMode);
  setFrameMode(FRAME_MODES[(index+1)%FRAME_MODES.length]);
}

function setCaptureBusy(value){
  captureBusy=!!value;
  const toolbar=document.querySelector('#photoModeToolbar');
  if(toolbar)toolbar.setAttribute('aria-busy',captureBusy?'true':'false');
  const guideButton=document.querySelector('#photoGuideToggle');
  const frameButton=document.querySelector('#photoFrameToggle');
  const previewButton=document.querySelector('#photoPreviewToggle');
  const exitButton=document.querySelector('#photoModeExit');
  const captureButton=document.querySelector('#photoModeCapture');
  if(guideButton)guideButton.disabled=captureBusy;
  if(frameButton)frameButton.disabled=captureBusy;
  if(previewButton)previewButton.disabled=captureBusy;
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
  previewBoost=false;
  previewPreviousQuality=null;
  active=true;
  updateLabel();
  updatePreviewButton();
  setGuideMode(guideMode,false);
  setFrameMode(frameMode,false);
  document.querySelector('#app')?.classList.add('photoMode');
  document.querySelector('#photoModeToolbar')?.setAttribute('aria-hidden','false');
  updateFrameGuide();
  notify('已隱藏航行介面 · 可拖動畫面構圖');
}

function exit(){
  if(!active||captureBusy)return;
  setPreviewBoost(false,false);
  active=false;
  const app=document.querySelector('#app');
  app?.classList.remove('photoMode','photoCapturing');
  document.querySelector('#photoModeToolbar')?.setAttribute('aria-hidden','true');
  document.querySelector('#photoModeToast')?.classList.remove('show');
  updateFrameGuide();
}

function fileName(mode=frameMode){
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const suffix=mode==='portrait'?'-9x16':mode==='square'?'-square':'';
  return `stellar-wrap-${currentId.toLowerCase()}${suffix}-${stamp}.png`;
}

function saveBlob(blob,width,height,mode=frameMode){
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=fileName(mode);
  link.rel='noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),12000);
  const label=mode==='portrait'?'9:16 ':mode==='square'?'1:1 ':'';
  notify(`高畫質 ${label}影像 ${width}×${height} 已產生 · 如未自動儲存請長按保存`,2600);
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

async function frameBlob(blob,width,height,mode=frameMode){
  const rect=cropRect(width,height,mode);
  if(rect.mode==='full'||typeof createImageBitmap!=='function')return{blob,width,height,mode:'full'};
  let bitmap;
  try{
    bitmap=await createImageBitmap(blob);
    const output=document.createElement('canvas');
    output.width=rect.width;
    output.height=rect.height;
    const context=output.getContext('2d',{alpha:false});
    if(!context)return{blob,width,height,mode:'full'};
    context.drawImage(bitmap,rect.x,rect.y,rect.width,rect.height,0,0,rect.width,rect.height);
    const framed=await canvasBlob(output);
    return framed?{blob:framed,width:rect.width,height:rect.height,mode:rect.mode}:{blob,width,height,mode:'full'};
  }catch{
    return{blob,width,height,mode:'full'};
  }finally{
    bitmap?.close?.();
  }
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
  const requestedFrame=frameMode;
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
    const framed=await frameBlob(blob,width,height,requestedFrame);
    saveBlob(framed.blob,framed.width,framed.height,framed.mode);
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
addEventListener('resize',updateFrameGuide,{passive:true});
setInterval(sample,500);
sample();
window.WarpPhotoMode={
  enter,
  exit,
  capture,
  active(){return active},
  capturing(){return captureBusy},
  previewBoosted(){return previewBoost},
  setPreviewBoost(next){return setPreviewBoost(next)},
  guide(){return guideMode},
  setGuide(mode){return setGuideMode(mode)},
  frame(){return frameMode},
  setFrame(mode){return setFrameMode(mode)},
  crop(width,height,mode){return cropRect(width,height,mode)}
};
})();