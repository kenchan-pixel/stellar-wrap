(() => {
'use strict';

const MOBILE_QUERY='(max-width:899px)';
const TASK_IDS=new Set([
  'lunaSurvey','vegaSurvey','cygBeaconScan','orionSpectrograph',
  'tauRingProfiler','siriusRelayCalibration','proxAlignment','landmarkGuide'
]);
const PANES=new Set(['overview','explore','discovery']);
let pane='overview';
let wasActive=false;
let rail=null;
let railToggle=null;
let railTools=null;
let railExpanded=false;
let statusCard=null;
let appObserver=null;
let bodyObserver=null;
const media=typeof matchMedia==='function'?matchMedia(MOBILE_QUERY):{matches:innerWidth<900};

function finalExplore(){
  const app=document.querySelector('#app');
  const card=document.querySelector('#exploreCard');
  return !!app&&!!card&&media.matches&&app.classList.contains('exploring')&&card.classList.contains('show')&&!card.classList.contains('transit');
}
function currentState(){
  try{return window.WarpSim?.state?.()||null}catch{return null}
}
function discoveryAt(id){
  try{return window.WarpStarAtlas?.snapshot?.().discoveries?.[id]||''}catch{return''}
}
function setA11yHidden(node,hidden){
  if(!node)return;
  if(hidden){node.setAttribute('aria-hidden','true');node.setAttribute('inert','')}
  else{node.removeAttribute('aria-hidden');node.removeAttribute('inert')}
}
function clearStatus(){
  const mounted=statusCard?.isConnected?statusCard:document.querySelector('#exploreHubStatus');
  mounted?.remove();statusCard=null;
}
function statusNeeded(){
  const card=document.querySelector('#exploreCard');
  return finalExplore()&&pane==='discovery'&&!!card?.classList.contains('hubOpen');
}
function ensureStatus(){
  if(statusCard?.isConnected)return statusCard;
  const actions=document.querySelector('#exploreCard .exploreActions');
  if(!actions)return null;
  statusCard=document.querySelector('#exploreHubStatus');
  if(!statusCard){
    statusCard=document.createElement('section');
    statusCard.id='exploreHubStatus';
    statusCard.className='exploreHubStatus';
    statusCard.setAttribute('aria-live','polite');
    actions.insertAdjacentElement('beforebegin',statusCard);
  }
  return statusCard;
}
function updateStatus(){
  if(!statusNeeded()){clearStatus();return}
  const status=ensureStatus();if(!status)return;
  const state=currentState(),id=state?.current;
  const discovery=id?String(discoveryAt(id)||'').trim():'';
  status.replaceChildren();
  const title=document.createElement('strong');title.textContent=discovery?'本站發現已收錄':'本站探索進度';
  const copy=document.createElement('span');copy.textContent=discovery?`「${discovery}」已寫入星區圖鑑。`:'完成本站探索目標後，發現紀錄會在此顯示。';
  status.append(title,copy);
}
function ensureRail(){
  if(rail?.isConnected)return true;
  const app=document.querySelector('#app');if(!app)return false;
  if(!document.querySelector('#exploreHubStyle')){
    const style=document.createElement('style');
    style.id='exploreHubStyle';
    style.textContent=`
#exploreRail{display:none}
@media (max-width:899px){
  #app.exploreHubMobile #exploreRail{
    position:absolute;z-index:9;left:var(--safeL);top:50%;transform:translateY(-50%);
    width:50px;display:grid;gap:5px;padding:5px;border:1px solid rgba(188,215,255,.16);
    border-radius:17px;background:rgba(4,8,17,.58);backdrop-filter:blur(14px) saturate(120%);
    box-shadow:0 12px 32px rgba(0,0,0,.28);pointer-events:auto
  }
  #app.exploreHubMobile #exploreRail button{
    position:relative;width:40px;min-height:44px;padding:2px;border:1px solid transparent;border-radius:11px;
    background:transparent;color:rgba(230,240,255,.7);font-size:9px;font-weight:780;line-height:1.15
  }
  #app.exploreHubMobile #exploreRailToggle{
    min-height:46px;color:#f2f8ff;border-color:rgba(143,209,255,.28);background:rgba(104,169,229,.1)
  }
  #app.exploreHubMobile #exploreRail.railExpanded #exploreRailToggle{
    border-color:rgba(143,209,255,.48);background:rgba(104,169,229,.2)
  }
  #app.exploreHubMobile #exploreRailTools{
    display:grid;gap:5px;max-height:0;opacity:0;overflow:hidden;transform:translateY(-5px);pointer-events:none;
    transition:max-height .2s cubic-bezier(.2,.8,.2,1),opacity .14s ease,transform .18s ease
  }
  #app.exploreHubMobile #exploreRail.railExpanded #exploreRailTools{
    max-height:245px;opacity:1;transform:none;pointer-events:auto
  }
  #app.exploreHubMobile #exploreRail button[aria-pressed="true"]{
    color:#fff;border-color:rgba(143,209,255,.38);background:rgba(104,169,229,.13)
  }
  #app.exploreHubMobile #exploreRail button[data-direct="true"]{color:#cfe5ff}
  #app.exploreHubMobile #exploreCard:not(.transit){
    left:calc(var(--safeL) + 58px);right:auto;bottom:calc(var(--safeB) + 54px);
    width:min(calc(100vw - var(--safeL) - var(--safeR) - 72px),330px);max-height:min(68vh,560px);
    overflow:auto;overscroll-behavior:contain;opacity:0;transform:translateX(calc(-100% - 72px));
    pointer-events:none;transition:opacity .18s ease,transform .22s cubic-bezier(.2,.8,.2,1)
  }
  #app.exploreHubMobile #exploreCard:not(.transit).hubOpen{opacity:1;transform:none;pointer-events:auto}
  #app.exploreHubMobile #exploreCard:not(.transit) .exploreTop{
    position:sticky;top:-10px;z-index:2;margin:-2px -2px 4px;padding:2px 2px 7px;background:linear-gradient(180deg,rgba(4,8,17,.97) 78%,transparent)
  }
  #app.exploreHubMobile #exploreCard:not(.transit) .exploreCollapse{width:40px;height:40px;flex:0 0 40px}
  #app.exploreHubMobile #exploreCard:not(.transit) .hubPaneHidden{display:none!important}
  #app.exploreHubMobile #exploreCard:not(.transit) .exploreActions{grid-template-columns:1fr}
  #app.exploreHubMobile #exploreCard:not(.transit) #exploreContinue,
  #app.exploreHubMobile #exploreCard:not(.transit) #photoModeTrigger{display:none!important}
  #app.exploreHubMobile .exploreHubStatus{margin:7px 0;padding:9px;border:1px solid rgba(105,238,210,.18);border-radius:10px;background:rgba(69,160,143,.055)}
  #app.exploreHubMobile .exploreHubStatus strong{display:block;font-size:9px;color:#dff9f3}
  #app.exploreHubMobile .exploreHubStatus span{display:block;margin-top:4px;font-size:8px;line-height:1.45;color:var(--muted)}
  #app.photoMode #exploreRail{opacity:0!important;pointer-events:none!important}
}
@media (max-width:360px){
  #app.exploreHubMobile #exploreRail{width:47px;padding:4px}
  #app.exploreHubMobile #exploreRail button{width:37px;font-size:8px}
  #app.exploreHubMobile #exploreCard:not(.transit){left:calc(var(--safeL) + 54px);width:min(calc(100vw - var(--safeL) - var(--safeR) - 66px),300px)}
}
@media (prefers-reduced-motion:reduce){
  #app.exploreHubMobile #exploreCard:not(.transit),
  #app.exploreHubMobile #exploreRailTools{transition:none}
}
`;
    document.head.append(style);
  }
  rail=document.querySelector('#exploreRail');
  if(!rail){
    rail=document.createElement('nav');rail.id='exploreRail';rail.setAttribute('aria-label','到站探索工具');rail.setAttribute('aria-hidden','true');rail.setAttribute('inert','');
    railToggle=document.createElement('button');railToggle.id='exploreRailToggle';railToggle.type='button';railToggle.textContent='探索';railToggle.setAttribute('aria-label','展開探索工具');railToggle.setAttribute('aria-expanded','false');railToggle.setAttribute('aria-controls','exploreRailTools');
    railTools=document.createElement('div');railTools.id='exploreRailTools';railTools.className='exploreRailTools';railTools.setAttribute('aria-hidden','true');railTools.setAttribute('inert','');
    const buttons=[
      ['overview','概覽',false],['explore','探索',false],['discovery','發現',false],['photo','攝影',true],['map','星圖',true]
    ];
    for(const [action,label,direct] of buttons){
      const button=document.createElement('button');button.type='button';button.dataset.hubAction=action;button.dataset.direct=direct?'true':'false';button.textContent=label;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>activate(action));railTools.append(button);
    }
    railToggle.addEventListener('click',toggleRail);
    rail.append(railToggle,railTools);app.append(rail);
  }else{
    railToggle=rail.querySelector('#exploreRailToggle');railTools=rail.querySelector('#exploreRailTools');
  }
  return true;
}
function setRailExpanded(next){
  if(!rail)return false;
  const app=document.querySelector('#app');
  railExpanded=!!next&&finalExplore()&&!app?.classList.contains('photoMode');
  rail.classList.toggle('railExpanded',railExpanded);
  railToggle?.setAttribute('aria-expanded',railExpanded?'true':'false');
  if(railToggle)railToggle.setAttribute('aria-label',railExpanded?'收起探索工具':'展開探索工具');
  setA11yHidden(railTools,!railExpanded);
  return railExpanded;
}
function classify(child){
  if(child.id==='exploreMeta')return'overview';
  if(child.id==='exploreDesc')return'common';
  if(child.id==='arrivalDebrief')return'overview';
  if(child.id==='discoveryDebrief'||child.id==='exploreHubStatus')return'discovery';
  if(child.classList.contains('exploreActions'))return'actions';
  if(TASK_IDS.has(child.id))return'explore';
  return'explore';
}
function applyPane(){
  const body=document.querySelector('#exploreCard .exploreBody');if(!body)return;
  updateStatus();
  for(const child of body.children){
    const type=classify(child);
    const show=type==='common'||(pane==='overview'&&(type==='overview'||type==='actions'))||(pane==='explore'&&(type==='explore'||type==='actions'))||(pane==='discovery'&&type==='discovery');
    child.classList.toggle('hubPaneHidden',!show);
  }
  const card=document.querySelector('#exploreCard');if(card)card.dataset.hubPane=pane;
  updateRail();
}
function restoreChildren(){
  document.querySelectorAll('#exploreCard .hubPaneHidden').forEach(node=>node.classList.remove('hubPaneHidden'));
  const card=document.querySelector('#exploreCard');if(card)delete card.dataset.hubPane;
}
function updateRail(){
  if(!rail)return;
  const open=document.querySelector('#exploreCard')?.classList.contains('hubOpen');
  for(const button of rail.querySelectorAll('[data-hub-action]')){
    const action=button.dataset.hubAction;
    button.setAttribute('aria-pressed',open&&action===pane&&PANES.has(action)?'true':'false');
  }
}
function closeDrawer(){
  const card=document.querySelector('#exploreCard');card?.classList.remove('hubOpen');
  clearStatus();setA11yHidden(card,finalExplore());
  const collapse=document.querySelector('#exploreCollapse');if(collapse){collapse.textContent='⌄';collapse.setAttribute('aria-label','收起觀景資訊')}
  updateRail();return true;
}
function toggleRail(){
  if(!finalExplore())return false;
  if(railExpanded){setRailExpanded(false);return true}
  closeDrawer();setRailExpanded(true);return true;
}
function open(next=pane){
  if(!PANES.has(next)||!finalExplore())return false;
  pane=next;setRailExpanded(false);
  const card=document.querySelector('#exploreCard');if(!card)return false;
  card.classList.remove('collapsed');card.classList.add('hubOpen');setA11yHidden(card,false);
  const collapse=document.querySelector('#exploreCollapse');if(collapse){collapse.textContent='×';collapse.setAttribute('aria-label','關閉探索面板')}
  applyPane();return true;
}
function close(){
  closeDrawer();setRailExpanded(false);return true;
}
function openPhoto(){
  close();
  try{
    if(typeof window.WarpPhotoMode?.enter==='function'){window.WarpPhotoMode.enter();return true}
  }catch{return false}
  document.querySelector('#photoModeTrigger')?.click();return true;
}
function openMap(){
  close();document.querySelector('#openPanel')?.click();return true;
}
function activate(action){
  if(action==='photo')return openPhoto();
  if(action==='map')return openMap();
  if(!PANES.has(action))return false;
  const card=document.querySelector('#exploreCard');
  if(card?.classList.contains('hubOpen')&&pane===action)return close();
  return open(action);
}
function sync(){
  if(!ensureRail())return;
  const active=finalExplore(),app=document.querySelector('#app'),card=document.querySelector('#exploreCard'),photo=!!app?.classList.contains('photoMode');
  app?.classList.toggle('exploreHubMobile',active);
  setA11yHidden(rail,!active||photo);
  if(active){
    card?.classList.remove('collapsed');
    if(photo){closeDrawer();setRailExpanded(false)}
    else if(!wasActive){pane='overview';closeDrawer();setRailExpanded(false)}
    else if(card?.classList.contains('hubOpen')){setA11yHidden(card,false);applyPane()}
    else setA11yHidden(card,true);
  }else{
    card?.classList.remove('hubOpen');clearStatus();restoreChildren();setA11yHidden(card,false);setRailExpanded(false);
  }
  wasActive=active;updateRail();
}
function installObservers(){
  const app=document.querySelector('#app'),card=document.querySelector('#exploreCard'),body=card?.querySelector('.exploreBody');
  if(!app||!card)return;
  appObserver=new MutationObserver(sync);appObserver.observe(app,{attributes:true,attributeFilter:['class']});appObserver.observe(card,{attributes:true,attributeFilter:['class']});
  if(body){bodyObserver=new MutationObserver(()=>{if(finalExplore()&&card.classList.contains('hubOpen'))applyPane()});bodyObserver.observe(body,{childList:true});}
}

ensureRail();installObservers();sync();
media.addEventListener?.('change',sync);
document.querySelector('#space')?.addEventListener('click',()=>{if(finalExplore())close()});
document.querySelector('#exploreCollapse')?.addEventListener('click',event=>{
  if(!finalExplore())return;
  event.preventDefault();event.stopImmediatePropagation();close();
},{capture:true});
document.querySelector('#arrivalDebriefExplore')?.addEventListener('click',()=>{
  if(finalExplore())open('explore');
},{capture:true});
document.querySelector('#arrivalDebriefNext')?.addEventListener('click',()=>{
  if(finalExplore())close();
},{capture:true});
addEventListener('keydown',event=>{if(event.key==='Escape'&&finalExplore())close()});
addEventListener('stellarwarp:journey-complete',()=>queueMicrotask(sync));
addEventListener('stellarwarp:discovery-change',()=>{updateStatus();if(pane==='discovery'&&finalExplore())applyPane()});
window.WarpExploreHub={open,close,activate,toggleRail,active(){return finalExplore()},activePane(){return pane},menuExpanded(){return railExpanded}};
})();