(() => {
'use strict';
if(window.WarpCaptureShare)return;

const STYLE_ID='captureShareStyle';
const SYSTEM_NAMES={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
let bootObserver=null,gridObserver=null,grid=null;

function supported(){
  if(typeof navigator?.share!=='function'||typeof navigator?.canShare!=='function'||typeof File!=='function')return false;
  try{
    const probe=new File([new Uint8Array([137,80,78,71])],'stellar-wrap-share-probe.png',{type:'image/png'});
    return navigator.canShare({files:[probe]})===true;
  }catch{return false}
}
function filename(record){
  const stamp=new Date(Number(record.createdAt)||Date.now()).toISOString().replace(/[:.]/g,'-');
  return `stellar-wrap-${String(record.system||'capture').toLowerCase()}-${record.frame||'full'}-${stamp}.png`;
}
function ensureStyle(){
  if(document.querySelector(`#${STYLE_ID}`))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#gatewayRecords .captureGalleryActions .captureGalleryShare{grid-column:1/-1;background:rgba(92,193,174,.09);border-color:rgba(136,227,208,.2);color:#eafff9}
#gatewayRecords .captureGalleryActions .captureGalleryShare[data-share-state="error"]{background:rgba(255,124,124,.055);border-color:rgba(255,164,164,.14);color:#fff0f0}
`;
  document.head.append(style);
}
async function recordFor(id){
  if(!id||typeof window.WarpCaptureGallery?.list!=='function')return null;
  try{return (await window.WarpCaptureGallery.list()).find(record=>String(record.id)===String(id))||null}catch{return null}
}
async function share(id,button=null){
  if(!supported())return{ok:false,reason:'unsupported'};
  const record=await recordFor(id);
  if(!record?.blob||record.blob.type!=='image/png')return{ok:false,reason:'missing'};
  const name=SYSTEM_NAMES[record.system]||record.system||'Stellar Wrap';
  const file=new File([record.blob],filename(record),{type:'image/png',lastModified:Number(record.createdAt)||Date.now()});
  let canShare=false;try{canShare=navigator.canShare({files:[file]})===true}catch{}
  if(!canShare)return{ok:false,reason:'unsupported'};
  const prior=button?.textContent||'';
  if(button){button.disabled=true;button.dataset.shareState='opening';button.textContent='開啟系統分享…'}
  try{
    await navigator.share({files:[file],title:`Stellar Wrap · ${name}`,text:`Stellar Wrap 留影｜${name}`});
    if(button)button.dataset.shareState='shared';
    return{ok:true,id:String(record.id),system:record.system,size:file.size};
  }catch(error){
    if(error?.name==='AbortError'){
      if(button)button.dataset.shareState='cancelled';
      return{ok:false,cancelled:true};
    }
    if(button)button.dataset.shareState='error';
    return{ok:false,reason:'share-failed'};
  }finally{
    if(button){button.disabled=false;button.textContent=prior||'分享留影'}
  }
}
function decorateCard(card){
  const actions=card?.querySelector('.captureGalleryActions'),id=card?.dataset.captureId;
  if(!actions||!id)return false;
  let button=actions.querySelector('.captureGalleryShare');
  if(!supported()){button?.remove();return false}
  if(button)return true;
  button=document.createElement('button');
  button.type='button';button.className='captureGalleryShare';button.dataset.captureShareId=id;button.textContent='分享留影';button.setAttribute('aria-label','透過系統分享此留影');
  button.addEventListener('click',async event=>{event.stopPropagation();await share(id,button)});
  actions.append(button);return true;
}
function decorate(){
  const host=document.querySelector('#captureGalleryGrid');
  if(!host)return 0;
  ensureStyle();
  if(grid!==host){
    gridObserver?.disconnect();grid=host;
    gridObserver=new MutationObserver(()=>decorate());
    gridObserver.observe(grid,{childList:true});
  }
  if(!supported()){
    for(const button of host.querySelectorAll('.captureGalleryShare'))button.remove();
    return 0;
  }
  let count=0;for(const card of host.querySelectorAll('.captureGalleryCard'))if(decorateCard(card))count++;
  return count;
}
function boot(){
  if(document.querySelector('#captureGalleryGrid')){decorate();return}
  bootObserver=new MutationObserver(()=>{if(document.querySelector('#captureGalleryGrid')){decorate();bootObserver?.disconnect();bootObserver=null}});
  bootObserver.observe(document.documentElement,{childList:true,subtree:true});
}

window.WarpCaptureShare={available:supported,share,refresh:decorate};
addEventListener('stellarwarp:capture-change',()=>decorate());
addEventListener('pagehide',()=>{bootObserver?.disconnect();gridObserver?.disconnect()},{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
