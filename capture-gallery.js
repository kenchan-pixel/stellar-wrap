(() => {
'use strict';
if(window.WarpCaptureGallery)return;

const DB_NAME='stellar-wrap-capture-gallery';
const DB_VERSION=1;
const STORE='captures';
const LIMIT=6;
const SYSTEM_NAMES={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
const FRAMES=new Set(['full','portrait','square']);
let dbPromise=null,section=null,bootObserver=null,captureObserver=null,copyObserver=null,renderGeneration=0;
let previewUrls=[],captureCandidate=null,captureWasActive=false,originalToBlob=null;
let viewer=null,viewerImage=null,viewerTitle=null,viewerMeta=null,viewerPosition=null,viewerOpenId=null,viewerUrl=null,viewerBodyOverflow='',viewerIds=[],viewerIndex=-1,viewerPointer=null,viewerSystem=null,viewerFocus=false,viewerDragX=0;

function available(){return typeof indexedDB!=='undefined'}
function requestResult(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'))})}
function transactionDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'))})}
function openDb(){
  if(!available())return Promise.reject(new Error('IndexedDB unavailable'));
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:'id'});store.createIndex('createdAt','createdAt',{unique:false})}};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{dbPromise=null;reject(request.error||new Error('IndexedDB open failed'))};
    request.onblocked=()=>{dbPromise=null;reject(new Error('IndexedDB upgrade blocked'))};
  });
  return dbPromise;
}
function normaliseCapture(input){
  if(!input||!(input.blob instanceof Blob)||input.blob.type!=='image/png'||input.blob.size<1)return null;
  const system=SYSTEM_NAMES[input.system]?input.system:null,width=Math.round(Number(input.width)),height=Math.round(Number(input.height));
  if(!system||!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width>8192||height>8192)return null;
  const createdAt=Number.isFinite(Number(input.createdAt))?Number(input.createdAt):Date.now(),frame=FRAMES.has(input.frame)?input.frame:'full';
  const random=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
  return{id:String(input.id||`${createdAt}-${random}`),system,width,height,frame,createdAt,blob:input.blob};
}
async function all(){
  const db=await openDb(),tx=db.transaction(STORE,'readonly'),rows=await requestResult(tx.objectStore(STORE).getAll());await transactionDone(tx);
  return rows.sort((a,b)=>Number(b.createdAt)-Number(a.createdAt)).slice(0,LIMIT);
}
async function recordById(id){
  if(!id)return null;const db=await openDb(),tx=db.transaction(STORE,'readonly'),record=await requestResult(tx.objectStore(STORE).get(String(id)));await transactionDone(tx);return record||null;
}
async function add(input){
  const record=normaliseCapture(input);if(!record)return false;
  const db=await openDb(),tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),rows=await requestResult(store.getAll());
  rows.sort((a,b)=>Number(a.createdAt)-Number(b.createdAt));
  while(rows.length>=LIMIT){const oldest=rows.shift();if(oldest?.id)store.delete(oldest.id)}
  store.put(record);await transactionDone(tx);
  dispatchEvent(new CustomEvent('stellarwarp:capture-change',{detail:{action:'add',id:record.id,system:record.system}}));
  render();return true;
}
async function remove(id,options={}){
  if(!id)return false;if(String(id)===viewerOpenId&&!options.keepViewer)closeViewer();const db=await openDb(),tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(String(id));await transactionDone(tx);
  dispatchEvent(new CustomEvent('stellarwarp:capture-change',{detail:{action:'remove',id:String(id)}}));render();return true;
}
async function reset(){
  closeViewer();if(!available())return false;const db=await openDb(),tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();await transactionDone(tx);
  dispatchEvent(new CustomEvent('stellarwarp:capture-change',{detail:{action:'reset'}}));render();return true;
}
async function count(){try{return(await all()).length}catch{return 0}}
function stamp(ms){try{return new Intl.DateTimeFormat('zh-HK',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch{return''}}
function frameLabel(frame){return frame==='portrait'?'9:16':frame==='square'?'1:1':'原幅'}
function releasePreviews(){for(const url of previewUrls)try{URL.revokeObjectURL(url)}catch{}previewUrls=[]}
function releaseViewerUrl(){if(viewerUrl){try{URL.revokeObjectURL(viewerUrl)}catch{}viewerUrl=null}}
function captureReturnState(system){
  let state=null;try{state=window.WarpSim?.state?.()}catch{}
  if(!SYSTEM_NAMES[system]||!state)return{enabled:false,label:'暫不可用',same:false};
  if(state.flying)return{enabled:false,label:'航行中',same:false};
  if(state.contextLost)return{enabled:false,label:'圖像恢復中',same:false};
  if(state.current===system)return{enabled:true,label:'返回目前景觀',same:true};
  if(typeof window.WarpSim?.select!=='function')return{enabled:false,label:'暫不可用',same:false};
  return{enabled:true,label:'再次前往',same:false};
}
function syncViewerReturn(){
  const button=viewer?.querySelector('[data-viewer-action="return"]');if(!button)return;const state=captureReturnState(viewerSystem);button.disabled=!state.enabled;button.textContent=state.label;const name=SYSTEM_NAMES[viewerSystem]||'';button.setAttribute('aria-label',name?`${state.label} ${name}`:state.label);
}
function returnToCaptureWorld(){
  const system=viewerSystem,state=captureReturnState(system);if(!state.enabled)return false;closeViewer();
  try{window.WarpModeGateway?.close?.();if(state.same)return true;window.WarpSim.select(system);document.querySelector('#panel')?.classList.add('open');return true}catch{return false}
}
async function download(id){
  try{
    const record=await recordById(id);if(!record?.blob)return false;
    const url=URL.createObjectURL(record.blob),link=document.createElement('a');link.href=url;link.download=`stellar-wrap-${record.system.toLowerCase()}-${record.frame}-${new Date(record.createdAt).toISOString().replace(/[:.]/g,'-')}.png`;link.rel='noopener';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);return true;
  }catch{return false}
}
function syncGatewayCopy(){
  const gateway=document.querySelector('#gatewayGallery small');if(gateway){const text='重看最近航程、外站發現與本機高畫質留影；點按留影可全螢幕重看、純影像觀看、拖動／左右掃動比較、返回景觀／再次前往、再次儲存或刪除。';if(gateway.textContent!==text)gateway.textContent=text}
  const local=document.querySelector('#gatewayRecords .modeGatewayLocal');if(local){const text='高畫質留影只保存在此裝置，最多保留最近 6 張；全螢幕重看可切換純影像觀看並直接拖動／左右掃動比較，亦可安全返回目前景觀或交接到既有 Real Space 航線規劃。再訪不會直接瞬移。';if(local.textContent!==text)local.textContent=text}
  const copy=document.querySelector('#modeGatewayCaptureCopy');if(copy){let state=null;try{state=window.WarpSim?.state?.()}catch{}const ready=!!(state&&!state.flying&&!state.contextLost&&state.exploring);const text=ready?'目前停泊點可直接進入既有高畫質 Photo Mode；成功留影會自動保留最近 6 張於本機 Gallery。':'Photo Mode 只會在安全的 Real Space 最終到站探索中啟用；成功留影會保存在本機 Gallery。';if(copy.textContent!==text)copy.textContent=text}
}
function ensureStyle(){
  if(document.querySelector('#captureGalleryStyle'))return;
  const style=document.createElement('style');style.id='captureGalleryStyle';style.textContent=`
#gatewayRecords .captureGallerySection{position:relative}
#gatewayRecords .captureGalleryHead{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-bottom:7px}
#gatewayRecords .captureGalleryHead strong{font-size:9px;color:#d8e8ff}.captureGalleryCount{font-size:7px;color:rgba(188,218,255,.6)}
#gatewayRecords .captureGalleryGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
#gatewayRecords .captureGalleryCard{min-width:0;overflow:hidden;border:1px solid rgba(169,211,255,.13);border-radius:12px;background:rgba(89,151,225,.045)}
#gatewayRecords .captureGalleryImage{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#02050b;cursor:zoom-in;outline:none}
#gatewayRecords .captureGalleryImage:focus-visible{box-shadow:inset 0 0 0 2px rgba(192,225,255,.82)}
#gatewayRecords .captureGalleryInfo{padding:7px}.captureGalleryInfo b{display:block;font-size:8px}.captureGalleryMeta{margin-top:3px;font-size:6.5px;line-height:1.4;color:rgba(219,233,255,.55)}
#gatewayRecords .captureGalleryActions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px}.captureGalleryActions button{min-height:44px;border:1px solid rgba(170,211,255,.17);border-radius:9px;background:rgba(110,172,255,.075);color:#eaf4ff;font-size:7px;font-weight:780}.captureGalleryActions .danger{background:rgba(255,124,124,.045);border-color:rgba(255,164,164,.12)}
#gatewayRecords .captureGalleryEmpty{padding:10px;border-radius:10px;background:rgba(255,255,255,.025);font-size:7px;line-height:1.5;color:rgba(220,234,255,.48)}
.captureGalleryViewer{position:fixed;inset:0;z-index:120;display:flex;flex-direction:column;gap:10px;padding:max(14px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:rgba(1,4,10,.985);overscroll-behavior:contain}
.captureGalleryViewer[hidden]{display:none}.captureGalleryViewerTop{display:grid;grid-template-columns:minmax(0,1fr) 48px 48px;gap:8px;align-items:center}.captureGalleryViewerCopy{min-width:0}.captureGalleryViewerCopy strong{display:block;font-size:12px;color:#f0f6ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.captureGalleryViewerMeta{margin-top:3px;font-size:9px;color:rgba(215,232,255,.6)}
.captureGalleryViewerClose,.captureGalleryViewerFocus,.captureGalleryViewerActions button,.captureGalleryViewerPager button{min-height:44px;border:1px solid rgba(182,218,255,.18);border-radius:12px;background:rgba(116,173,240,.08);color:#eff7ff;font-weight:760}.captureGalleryViewerClose,.captureGalleryViewerFocus{min-width:44px;font-size:18px}.captureGalleryViewerFocus[aria-pressed="true"]{background:rgba(145,206,255,.16);border-color:rgba(183,226,255,.34)}.captureGalleryViewerStage{min-height:0;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:14px;background:#010309;touch-action:pan-y}.captureGalleryViewerStage.dragging{cursor:grabbing}.captureGalleryViewerImage{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;transform:translate3d(0,0,0);opacity:1;transition:transform .16s cubic-bezier(.22,.72,.2,1),opacity .16s ease;will-change:transform,opacity}.captureGalleryViewerStage.dragging .captureGalleryViewerImage{transition:none}.captureGalleryViewerImage.slideNext{animation:captureGallerySlideNext .18s cubic-bezier(.2,.72,.22,1)}.captureGalleryViewerImage.slidePrev{animation:captureGallerySlidePrev .18s cubic-bezier(.2,.72,.22,1)}.captureGalleryViewerPager{display:grid;grid-template-columns:48px minmax(0,1fr) 48px;gap:8px;align-items:center}.captureGalleryViewerPager button{min-width:44px;font-size:20px}.captureGalleryViewerPager button:disabled{opacity:.28}.captureGalleryViewerPosition{text-align:center;font-size:8px;line-height:1.25;color:rgba(215,232,255,.62)}.captureGalleryViewerActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.captureGalleryViewerActions .route{background:rgba(113,190,221,.105);border-color:rgba(148,219,244,.2)}.captureGalleryViewerActions .danger{background:rgba(255,124,124,.055);border-color:rgba(255,164,164,.14)}
@keyframes captureGallerySlideNext{from{transform:translate3d(32px,0,0);opacity:.72}to{transform:translate3d(0,0,0);opacity:1}}
@keyframes captureGallerySlidePrev{from{transform:translate3d(-32px,0,0);opacity:.72}to{transform:translate3d(0,0,0);opacity:1}}
.captureGalleryViewer.focusMode{gap:0;padding:0;background:#000}.captureGalleryViewer.focusMode .captureGalleryViewerTop,.captureGalleryViewer.focusMode .captureGalleryViewerPager,.captureGalleryViewer.focusMode .captureGalleryViewerActions{display:none}.captureGalleryViewer.focusMode .captureGalleryViewerStage{border-radius:0;background:#000}.captureGalleryViewer.focusMode .captureGalleryViewerImage{max-width:100vw;max-height:100vh}
@media(prefers-reduced-motion:reduce){.captureGalleryViewerImage,.captureGalleryViewerStage.dragging .captureGalleryViewerImage{transition:none!important;animation:none!important;transform:none!important;opacity:1!important}}
@media(max-width:360px){#gatewayRecords .captureGalleryGrid{grid-template-columns:1fr}.captureGalleryViewer{gap:8px;padding-left:10px;padding-right:10px}.captureGalleryViewerPager,.captureGalleryViewerActions{gap:6px}.captureGalleryViewerActions button{font-size:8px;padding-left:5px;padding-right:5px}.captureGalleryViewer.focusMode{gap:0;padding:0}}
`;
  document.head.append(style);
}
function setViewerFocus(active){
  viewerFocus=!!(active&&viewer&&!viewer.hidden);if(viewer){viewer.classList.toggle('focusMode',viewerFocus);viewer.dataset.focus=viewerFocus?'true':'false';const button=viewer.querySelector('[data-viewer-action="focus"]');if(button)button.setAttribute('aria-pressed',viewerFocus?'true':'false')}
  return viewerFocus;
}
function resetViewerDrag(){
  viewerDragX=0;const stage=viewer?.querySelector('.captureGalleryViewerStage');stage?.classList.remove('dragging');if(viewerImage){viewerImage.style.removeProperty('transform');viewerImage.style.removeProperty('opacity')}
}
function updateViewerDrag(dx){
  if(!viewer||!viewerImage||!Number.isFinite(dx))return false;const stage=viewer.querySelector('.captureGalleryViewerStage');if(!stage)return false;const canMove=dx<0?viewerIndex<viewerIds.length-1:viewerIndex>0,resisted=dx*(canMove?1:.28),bounded=Math.max(-76,Math.min(76,resisted)),strength=Math.min(1,Math.abs(bounded)/76);viewerDragX=bounded;stage.classList.toggle('dragging',Math.abs(bounded)>1);viewerImage.style.transform=`translate3d(${bounded.toFixed(1)}px,0,0) scale(${(1-strength*.018).toFixed(4)})`;viewerImage.style.opacity=String((1-strength*.16).toFixed(3));return true;
}
function animateViewerArrival(direction){
  if(!viewer||!viewerImage||!direction)return;viewer.dataset.navDirection=direction>0?'next':'prev';viewerImage.classList.remove('slideNext','slidePrev');void viewerImage.offsetWidth;viewerImage.classList.add(direction>0?'slideNext':'slidePrev');
}
function syncViewerControls(){
  if(!viewer)return;const prev=viewer.querySelector('[data-viewer-action="prev"]'),next=viewer.querySelector('[data-viewer-action="next"]');if(prev)prev.disabled=viewerIndex<=0;if(next)next.disabled=viewerIndex<0||viewerIndex>=viewerIds.length-1;if(viewerPosition)viewerPosition.textContent=viewerIds.length?`${viewerIndex+1} / ${viewerIds.length} · 拖動或左右掃動比較 · 點影像純淨觀看`:'';syncViewerReturn();
}
function applyViewerRecord(record,index,direction=0){
  if(!record?.blob)return false;resetViewerDrag();releaseViewerUrl();viewerIndex=index;viewerOpenId=String(record.id);viewerSystem=record.system;viewerUrl=URL.createObjectURL(record.blob);viewerImage.src=viewerUrl;viewerImage.alt=`${SYSTEM_NAMES[record.system]||record.system} 留影大圖`;viewerTitle.textContent=SYSTEM_NAMES[record.system]||record.system;viewerMeta.textContent=`${stamp(Number(record.createdAt))} · ${record.width}×${record.height} · ${frameLabel(record.frame)}`;if(viewer)viewer.dataset.navDirection=direction>0?'next':direction<0?'prev':'none';if(direction)requestAnimationFrame(()=>{if(viewerOpenId===String(record.id))animateViewerArrival(direction)});syncViewerControls();return true;
}
async function stepViewer(delta){
  if(!viewer||viewer.hidden||!viewerIds.length)return false;const target=Math.max(0,Math.min(viewerIds.length-1,viewerIndex+delta));if(target===viewerIndex)return false;try{const record=await recordById(viewerIds[target]);return applyViewerRecord(record,target,delta)}catch{return false}
}
async function deleteViewerCurrent(){
  if(!viewerOpenId)return false;const id=viewerOpenId,index=viewerIndex;try{await remove(id,{keepViewer:true});viewerIds=viewerIds.filter(value=>value!==id);if(!viewerIds.length){closeViewer();return true}const target=Math.min(index,viewerIds.length-1),record=await recordById(viewerIds[target]);if(!applyViewerRecord(record,target)){closeViewer();return false}return true}catch{return false}
}
function ensureViewer(){
  if(viewer?.isConnected)return viewer;ensureStyle();viewer=document.createElement('aside');viewer.id='captureGalleryViewer';viewer.className='captureGalleryViewer';viewer.hidden=true;viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','留影全螢幕重看');viewer.innerHTML='<div class="captureGalleryViewerTop"><div class="captureGalleryViewerCopy"><strong id="captureGalleryViewerTitle">留影</strong><div id="captureGalleryViewerMeta" class="captureGalleryViewerMeta"></div></div><button type="button" class="captureGalleryViewerFocus" data-viewer-action="focus" aria-label="純影像觀看" aria-pressed="false">◱</button><button type="button" class="captureGalleryViewerClose" data-viewer-action="close" aria-label="關閉留影">×</button></div><div class="captureGalleryViewerStage"><img id="captureGalleryViewerImage" class="captureGalleryViewerImage" alt=""></div><div class="captureGalleryViewerPager"><button type="button" data-viewer-action="prev" aria-label="上一張留影">‹</button><span id="captureGalleryViewerPosition" class="captureGalleryViewerPosition" aria-live="polite"></span><button type="button" data-viewer-action="next" aria-label="下一張留影">›</button></div><div class="captureGalleryViewerActions"><button type="button" data-viewer-action="return" class="route">再次前往</button><button type="button" data-viewer-action="download">再次儲存</button><button type="button" data-viewer-action="delete" class="danger">刪除留影</button></div>';
  document.body.append(viewer);viewerImage=viewer.querySelector('#captureGalleryViewerImage');viewerTitle=viewer.querySelector('#captureGalleryViewerTitle');viewerMeta=viewer.querySelector('#captureGalleryViewerMeta');viewerPosition=viewer.querySelector('#captureGalleryViewerPosition');
  viewer.addEventListener('click',async event=>{const action=event.target.closest('[data-viewer-action]')?.dataset.viewerAction;if(action==='close'){closeViewer();return}if(action==='focus'){setViewerFocus(!viewerFocus);return}if(action==='prev'){await stepViewer(-1);return}if(action==='next'){await stepViewer(1);return}if(action==='return'){returnToCaptureWorld();return}if(action==='download'&&viewerOpenId){await download(viewerOpenId);return}if(action==='delete'&&viewerOpenId)await deleteViewerCurrent()});
  const stage=viewer.querySelector('.captureGalleryViewerStage');stage?.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;resetViewerDrag();viewerPointer={id:event.pointerId,x:event.clientX,y:event.clientY,axis:null};try{stage.setPointerCapture(event.pointerId)}catch{}});stage?.addEventListener('pointermove',event=>{if(!viewerPointer||viewerPointer.id!==event.pointerId)return;const dx=event.clientX-viewerPointer.x,dy=event.clientY-viewerPointer.y;if(!viewerPointer.axis&&Math.hypot(dx,dy)>=8)viewerPointer.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';if(viewerPointer.axis==='x'){updateViewerDrag(dx);event.preventDefault()}});stage?.addEventListener('pointerup',event=>{if(!viewerPointer||viewerPointer.id!==event.pointerId)return;const pointer=viewerPointer,dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;viewerPointer=null;resetViewerDrag();if((pointer.axis==='x'||Math.abs(dx)>=48)&&Math.abs(dx)>=48&&Math.abs(dx)>Math.abs(dy)*1.15){stepViewer(dx<0?1:-1);return}if(Math.abs(dx)<=12&&Math.abs(dy)<=12)setViewerFocus(!viewerFocus)});stage?.addEventListener('pointercancel',()=>{viewerPointer=null;resetViewerDrag()});viewerImage?.addEventListener('animationend',()=>viewerImage?.classList.remove('slideNext','slidePrev'));
  addEventListener('keydown',event=>{if(viewer?.hidden)return;if(event.key==='Escape'){if(viewerFocus){setViewerFocus(false);return}closeViewer();return}if(event.key==='c'||event.key==='C'){event.preventDefault();setViewerFocus(!viewerFocus);return}if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();stepViewer(event.key==='ArrowLeft'?-1:1)}});return viewer;
}
function closeViewer(){
  setViewerFocus(false);resetViewerDrag();releaseViewerUrl();if(viewerImage){viewerImage.classList.remove('slideNext','slidePrev');viewerImage.removeAttribute('src');viewerImage.alt=''}if(viewer){viewer.dataset.navDirection='none';viewer.hidden=true}viewerOpenId=null;viewerIds=[];viewerIndex=-1;viewerPointer=null;viewerSystem=null;syncViewerControls();if(document.body&&document.body.style.overflow==='hidden')document.body.style.overflow=viewerBodyOverflow;
}
async function openViewer(id){
  try{
    const rows=await all(),index=rows.findIndex(record=>String(record.id)===String(id));if(index<0||!rows[index]?.blob)return false;ensureViewer();closeViewer();viewerIds=rows.map(record=>String(record.id));viewerBodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';viewer.hidden=false;if(!applyViewerRecord(rows[index],index)){closeViewer();return false}viewer.querySelector('.captureGalleryViewerClose')?.focus({preventScroll:true});return true;
  }catch{return false}
}
function ensureUi(){
  const records=document.querySelector('#gatewayRecords');if(!records)return false;ensureStyle();ensureViewer();
  if(!section){section=document.querySelector('#captureGallerySection');if(!section){section=document.createElement('section');section.id='captureGallerySection';section.className='modeGatewayRecordSection captureGallerySection';section.setAttribute('aria-label','本機高畫質留影');section.innerHTML='<div class="captureGalleryHead"><strong>CAPTURE ARCHIVE｜本機留影</strong><span id="captureGalleryCount" class="captureGalleryCount">讀取中</span></div><div id="captureGalleryGrid" class="captureGalleryGrid" aria-live="polite"></div>';const before=records.querySelector('.modeGatewayCaptureBox');before?.insertAdjacentElement('beforebegin',section);if(!before)records.append(section);section.addEventListener('click',async event=>{const image=event.target.closest('.captureGalleryImage');if(image){const id=image.closest('.captureGalleryCard')?.dataset.captureId;if(id)await openViewer(id);return}const button=event.target.closest('button[data-capture-id]');if(!button)return;button.disabled=true;try{if(button.dataset.action==='download')await download(button.dataset.captureId);else if(button.dataset.action==='delete')await remove(button.dataset.captureId)}finally{if(button.isConnected)button.disabled=false}});section.addEventListener('keydown',async event=>{if(!['Enter',' '].includes(event.key))return;const image=event.target.closest('.captureGalleryImage');if(!image)return;event.preventDefault();const id=image.closest('.captureGalleryCard')?.dataset.captureId;if(id)await openViewer(id)})}}
  syncGatewayCopy();
  if(!copyObserver){copyObserver=new MutationObserver(()=>syncGatewayCopy());copyObserver.observe(records,{subtree:true,childList:true,characterData:true})}
  render();return true;
}
async function render(){
  if(!section&&!ensureUi())return;const generation=++renderGeneration,host=section?.querySelector('#captureGalleryGrid'),label=section?.querySelector('#captureGalleryCount');if(!host)return;releasePreviews();
  let rows=[];try{rows=await all()}catch{if(generation!==renderGeneration)return;host.innerHTML='<div class="captureGalleryEmpty">此瀏覽器暫時無法使用本機留影庫；高畫質 PNG 下載仍可正常使用。</div>';if(label)label.textContent='本機儲存不可用';return}
  if(generation!==renderGeneration)return;host.replaceChildren();if(label)label.textContent=`${rows.length} / ${LIMIT} 張`;
  if(!rows.length){const empty=document.createElement('div');empty.className='captureGalleryEmpty';empty.textContent='尚未有留影。於 Real Space 最終到站開啟攝影模式並完成高畫質留影後，圖片會自動保留在這部裝置。';host.append(empty);return}
  for(const record of rows){const card=document.createElement('article');card.className='captureGalleryCard';card.dataset.captureId=record.id;const img=document.createElement('img');img.className='captureGalleryImage';img.alt=`${SYSTEM_NAMES[record.system]||record.system} 留影`;img.loading='lazy';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label',`全螢幕重看${SYSTEM_NAMES[record.system]||record.system}留影`);const url=URL.createObjectURL(record.blob);previewUrls.push(url);img.src=url;const info=document.createElement('div');info.className='captureGalleryInfo';const title=document.createElement('b');title.textContent=SYSTEM_NAMES[record.system]||record.system;const meta=document.createElement('div');meta.className='captureGalleryMeta';meta.textContent=`${stamp(Number(record.createdAt))} · ${record.width}×${record.height} · ${frameLabel(record.frame)}`;const actions=document.createElement('div');actions.className='captureGalleryActions';const save=document.createElement('button');save.type='button';save.dataset.captureId=record.id;save.dataset.action='download';save.textContent='再次儲存';const del=document.createElement('button');del.type='button';del.dataset.captureId=record.id;del.dataset.action='delete';del.className='danger';del.textContent='刪除';actions.append(save,del);info.append(title,meta,actions);card.append(img,info);host.append(card)}
  syncGatewayCopy();
}
function installCaptureTap(){
  const proto=globalThis.HTMLCanvasElement?.prototype;if(!proto?.toBlob||originalToBlob)return false;originalToBlob=proto.toBlob;
  proto.toBlob=function(callback,type,quality){const canvas=this;return originalToBlob.call(canvas,blob=>{try{const app=document.querySelector('#app');if(blob&&blob.type==='image/png'&&app?.classList.contains('photoCapturing')){let state=null;try{state=window.WarpSim?.state?.()}catch{}captureCandidate={blob,width:canvas.width,height:canvas.height,system:state?.current||'',frame:window.WarpPhotoMode?.frame?.()||'full',createdAt:Date.now()}}}catch{}callback?.(blob)},type,quality)};
  const app=document.querySelector('#app');if(!app)return true;captureWasActive=app.classList.contains('photoCapturing');captureObserver=new MutationObserver(()=>{const now=app.classList.contains('photoCapturing');if(!captureWasActive&&now)captureCandidate=null;if(captureWasActive&&!now&&captureCandidate){const record=captureCandidate;captureCandidate=null;queueMicrotask(()=>add(record).catch(()=>{}))}captureWasActive=now});captureObserver.observe(app,{attributes:true,attributeFilter:['class']});return true;
}
function boot(){installCaptureTap();if(ensureUi())return;bootObserver=new MutationObserver(()=>{installCaptureTap();if(ensureUi()){bootObserver?.disconnect();bootObserver=null}});bootObserver.observe(document.documentElement,{subtree:true,childList:true})}

window.WarpCaptureGallery={list(){return all()},add,remove,download,reset,count,limit(){return LIMIT},available,open:openViewer,close:closeViewer,refresh(){ensureUi();return render()}};
addEventListener('stellarwarp:capture-change',()=>render());
addEventListener('stellarwarp:journey-complete',syncGatewayCopy);addEventListener('stellarwarp:discovery-change',syncGatewayCopy);addEventListener('stellarwarp:atlas-change',syncGatewayCopy);
addEventListener('pagehide',()=>{closeViewer();releasePreviews()},{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();