(() => {
'use strict';

const STATUS_EVENT='OFFLINE_STATUS';
const STARTUP_TIMEOUT=9000;
let cacheReady=false;
let uiReady=false;
let lastStatus='';

function secureEnough(){
  return location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
}

function ensureUi(){
  if(uiReady&&document.querySelector('#offlineStatus'))return true;
  const settings=document.querySelector('.settings');
  if(!settings)return false;
  const card=document.createElement('div');
  card.id='offlineStatus';
  card.className='setting wide';
  card.setAttribute('aria-label','離線啟動狀態');
  card.innerHTML='<label><span>離線啟動</span><output id="offlineState">準備中</output></label><div id="offlineNote" class="qualityNote">首次連線後會保存核心程式及固定版本 3D 引擎，之後可在沒有網絡時重新開啟。</div>';
  settings.append(card);
  uiReady=true;
  renderStatus();
  return true;
}

function renderStatus(){
  if(!ensureUi()&&!uiReady)return;
  const state=document.querySelector('#offlineState');
  const note=document.querySelector('#offlineNote');
  if(!state||!note)return;
  let label='準備中';
  let detail='首次連線後會保存核心程式及固定版本 3D 引擎，之後可在沒有網絡時重新開啟。';
  if(!('serviceWorker' in navigator)){
    label='不支援';
    detail='此瀏覽器不支援 Service Worker；仍可正常在線使用。';
  }else if(!secureEnough()){
    label='需 HTTPS';
    detail='離線快取只會在 HTTPS 或 localhost 啟用。';
  }else if(cacheReady&&navigator.onLine){
    label='已準備';
    detail='核心程式及 Three.js 已有本機快取；斷網後重新開啟會使用最近成功版本。';
  }else if(cacheReady&&!navigator.onLine){
    label='離線可用';
    detail='目前沒有網絡；正在使用已保存的核心程式與 3D 引擎。';
  }else if(!navigator.onLine){
    label='未準備';
    detail='目前離線，而且此裝置尚未完成首次快取；請先連線成功開啟一次。';
  }else if(lastStatus==='error'){
    label='未完成';
    detail='離線快取未能完成；在線航行不受影響，可稍後重新載入再試。';
  }
  state.textContent=label;
  note.textContent=detail;
}

function askStatus(worker){
  if(!worker)return;
  try{worker.postMessage({type:STATUS_EVENT})}catch{}
}

async function register(){
  ensureUi();
  if(!('serviceWorker' in navigator)||!secureEnough()){renderStatus();return}
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    const ready=await navigator.serviceWorker.ready;
    lastStatus='registered';
    askStatus(navigator.serviceWorker.controller||ready.active||registration.active||registration.waiting);
  }catch{
    lastStatus='error';
    renderStatus();
  }
}

function startupGuard(){
  const app=document.querySelector('#app');
  const loading=document.querySelector('#loading');
  if(!loading||app?.classList.contains('ready'))return;
  loading.replaceChildren();
  const title=document.createElement('strong');
  title.textContent=navigator.onLine?'3D 引擎未能完成啟動':'目前離線，未能完成啟動';
  const detail=document.createElement('small');
  detail.style.display='block';
  detail.style.marginTop='7px';
  detail.textContent=navigator.onLine
    ?'請重新載入；若問題持續，可能是固定版本 Three.js 暫時無法取得。'
    :(cacheReady?'已偵測到離線快取，但這次啟動仍失敗；請重新載入一次。':'此裝置尚未完成首次離線快取，請先連線成功開啟一次。');
  const retry=document.createElement('button');
  retry.type='button';
  retry.textContent='重新載入';
  retry.style.cssText='margin-top:14px;min-height:44px;padding:0 18px;border:1px solid rgba(190,220,255,.35);border-radius:12px;background:rgba(255,255,255,.07);color:#eef6ff;font-weight:780';
  retry.addEventListener('click',()=>location.reload());
  loading.append(title,detail,retry);
}

navigator.serviceWorker?.addEventListener?.('message',event=>{
  if(event.data?.type!==STATUS_EVENT)return;
  cacheReady=!!event.data.ready;
  lastStatus=cacheReady?'ready':'partial';
  renderStatus();
});

navigator.serviceWorker?.addEventListener?.('controllerchange',()=>{
  askStatus(navigator.serviceWorker.controller);
});
addEventListener('online',()=>{renderStatus();askStatus(navigator.serviceWorker?.controller)});
addEventListener('offline',renderStatus);

setTimeout(startupGuard,STARTUP_TIMEOUT);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',register,{once:true});
else register();

window.WarpOffline={
  ready(){return cacheReady},
  refresh(){askStatus(navigator.serviceWorker?.controller)}
};
})();
