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
let viewer=null,viewerImage=null,viewerTitle=null,viewerMeta=null,viewerOpenId=null,viewerUrl=null,viewerBodyOverflow='';

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
async function remove(id){
  if(!id)return false;if(String(id)===viewerOpenId)closeViewer();const db=await openDb(),tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(String(id));await transactionDone(tx);
  dispatchEvent(new CustomEvent('stellarwarp:capture-change',{detail:{action:'remove',id:String(id)}}));render();return true;
}
async function reset(){
  closeViewer();if(!available())return false;const db=await openDb(),tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();await transactionDone(tx);
  dispatchEvent(new CustomEvent('stellarwarp:capture-change',{detail:{action:'reset'}});render();return true;
}
async function count(){try{return(await all()).length}catch{return 0}}
function stamp(ms){try{return new Intl.DateTimeFormat('zh-HK',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch{return''}}
function frameLabel(frame){return frame==='portrait'?'9:16':frame==='square'?'1:1':'原幅'}
function releasePreviews(){for(const url of previewUrls)try{URL.revokeObjectURL(url)}catch{}previewUrls=[]}
async function download(id){
  try{
    const record=await recordById(id);if(!record?.blob)return false;
    const url=URL.createObjectURL(record.blob),link=document.createElement('a');link.href=url;link.download=`stellar-wrap-${record.system.toLowerCase()}-${record.frame}-${new Date(record.createdAt).toISOString().replace(/[:.]/g,'-')}.png`;link.rel='noopener';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);return true;
  }catch{return false}
}
function syncGatewayCopy(){
  const gateway=document.querySelector('#gatewayGallery small');if(gateway){const text='重看最近航程、外站發現與本機高畫質留影；點按留影可全螢幕重看、再次儲存或刪除。';if(gateway.textContent!==text)gateway.textContent=text}
  const local=document.querySelector('#gatewayRecords .modeGatewayLocal');if(local){const text='高畫質留影只保存在此裝置，最多保留最近 6 張；點按圖片可全螢幕重看。航程再訪仍只會預選目的地並打開既有 Real Space 航線面板。';if(local.textContent!==text)local.textContent=text}
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
.captureGalleryViewer{position:fixed;inset:0;z-index:120;display:flex;flex-direction:column;gap:12px;padding:max(14px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:rgba(1,4,10,.96);backdrop-filter:blur(12px);overscroll-behavior:contain}
.captureGalleryViewer[hidden]{display:none}.captureGalleryViewerTop{display:grid;grid-template-columns:minmax(0,1fr) 48px;gap:10px;align-items:center}.captureGalleryViewerCopy{min-width:0}.captureGalleryViewerCopy strong{display:block;font-size:12px;color:#f0f6ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.captureGalleryViewerMeta{margin-top:3px;font-size:9px;color:rgba(215,232,255,.6)}
.captureGalleryViewerClose,.captureGalleryViewerActions button{min-height:44px;border:1px solid rgba(182,218,255,.18);border-radius:12px;background:rgba(116,173,240,.08);color:#eff7ff;font-weight:760}.captureGalleryViewerClose{min-width:44px;font-size:18px}.captureGalleryViewerStage{min-height:0;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:14px;background:#010309}.captureGalleryViewerImage{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}.captureGalleryViewerActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.captureGalleryViewerActions .danger{background:rgba(255,124,124,.055);border-color:rgba(255,164,164,.14)}
@media(max-width:360px){#gatewayRecords .captureGalleryGrid{grid-template-columns:1fr}.captureGalleryViewer{gap:9px;padding-left:10px;padding-right:10px}.captureGalleryViewerActions{gap:6px}}
`;
  document.head.append(style);
}
function ensureViewer(){
  if(viewer?.isConnected)return viewer;ensureStyle();viewer=document.createElement('aside');viewer.id='captureGalleryViewer';viewer.className='captureGalleryViewer';viewer.hidden=true;viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','留影全螢幕重看');viewer.innerHTML='<div class="captureGalleryViewerTop"><div class="captureGalleryViewerCopy"><strong id="captureGalleryViewerTitle">留影</strong><div id="captureGalleryViewerMeta" class="captureGalleryViewerMeta"></div></div><button type="button" class="captureGalleryViewerClose" data-viewer-action="close" aria-label="關閉留影">×</button></div><div class="captureGalleryViewerStage"><img id="captureGalleryViewerImage" class="captureGalleryViewerImage" alt=""></div><div class="captureGalleryViewerActions"><button type="button" data-viewer-action="download">再次儲存</button><button type="button" data-viewer-action="delete" class="danger">刪除留影</button></div>';
  document.body.append(viewer);viewerImage=viewer.querySelector('#captureGalleryViewerImage');viewerTitle=viewer.querySelector('#captureGalleryViewerTitle');viewerMeta=viewer.querySelector('#captureGalleryViewerMeta');
  viewer.addEventListener('click',async event=>{const action=event.target.closest('[data-viewer-action]')?.dataset.viewerAction;if(action==='close'){closeViewer();return}if(action==='download'&&viewerOpenId){await download(viewerOpenId);return}if(action==='delete'&&viewerOpenId){const id=viewerOpenId;closeViewer();await remove(id)}});
  addEventListener('keydown',event=>{if(event.key==='Escape'&&!viewer?.hidden)closeViewer()});return viewer;
}
function closeViewer(){
  if(viewerUrl){try{URL.revokeObjectURL(viewerUrl)}catch{}viewerUrl=null}if(viewerImage){viewerImage.removeAttribute('src');viewerImage.alt=''}if(viewer)viewer.hidden=true;viewerOpenId=null;if(document.body&&document.body.style.overflow==='hidden')document.body.style.overflow=viewerBodyOverflow;
}
async function openViewer(id){
  try{
    const record=await recordById(id);if(!record?.blob)return false;ensureViewer();closeViewer();viewerOpenId=String(record.id);viewerUrl=URL.createObjectURL(record.blob);viewerImage.src=viewerUrl;viewerImage.alt=`${SYSTEM_NAMES[record.system]||record.system} 留影大圖`;viewerTitle.textContent=SYSTEM_NAMES[record.system]||record.system;viewerMeta.textContent=`${stamp(Number(record.createdAt))} · ${record.width}×${record.height} · ${frameLabel(record.frame)}`;viewerBodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';viewer.hidden=false;viewer.querySelector('.captureGalleryViewerClose')?.focus({preventScroll:true});return true;
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
