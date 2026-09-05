(() => {
'use strict';
if(window.WarpCaptureVoyageContext)return;

const SYSTEM_NAMES={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
const MAX_MATCH_MS=12*60*60*1000;
const CLOCK_SLOP_MS=2*60*1000;
let records=[];
let bootObserver=null,gridObserver=null,viewerObserver=null,grid=null,viewerPosition=null;
let refreshBusy=false,refreshAgain=false;

function journalEntries(){try{return window.WarpTravelJournal?.entries?.()||[]}catch{return[]}}
function normaliseJourney(entry,record){
  if(!entry||!record||!SYSTEM_NAMES[record.system]||!Array.isArray(entry.route)||entry.route.length<2)return null;
  if(entry.route.some(id=>!SYSTEM_NAMES[id])||entry.route[entry.route.length-1]!==record.system)return null;
  const capturedAt=Number(record.createdAt),endedAt=Number(entry.endedAt);if(!Number.isFinite(capturedAt)||!Number.isFinite(endedAt))return null;
  const age=capturedAt-endedAt;if(age<-CLOCK_SLOP_MS||age>MAX_MATCH_MS)return null;
  const distance=Number(entry.distance),seconds=Number(entry.seconds);
  return{route:[...entry.route],endedAt,ageMs:Math.max(0,age),distance:Number.isFinite(distance)&&distance>0?Math.round(distance*10)/10:null,seconds:Number.isFinite(seconds)&&seconds>0?Math.round(seconds):null};
}
function journeyFor(record){let best=null;for(const entry of journalEntries()){const candidate=normaliseJourney(entry,record);if(candidate&&(!best||candidate.ageMs<best.ageMs))best=candidate}return best}
function journeyTextFrom(journey){if(!journey)return'';const parts=[journey.route.map(id=>SYSTEM_NAMES[id]||id).join(' → ')];if(Number.isFinite(journey.distance))parts.push(`${journey.distance.toFixed(1)} LY`);if(Number.isFinite(journey.seconds))parts.push(`${journey.seconds} 秒`);return parts.join(' · ')}
function journeyText(record){return journeyTextFrom(journeyFor(record))}
function ensureStyle(){
  if(document.querySelector('#captureVoyageContextStyle'))return;
  const style=document.createElement('style');style.id='captureVoyageContextStyle';style.textContent=`
#gatewayRecords .captureGalleryVoyage{margin-top:7px;padding-top:7px;border-top:1px solid rgba(175,214,255,.11);min-width:0;color:rgba(188,220,255,.78)}
#gatewayRecords .captureGalleryVoyage::before{content:'抵達航程';display:block;margin-bottom:5px;font-size:7px;line-height:1.2;color:rgba(149,220,244,.84);font-weight:780;letter-spacing:.04em}
.captureGalleryViewerVoyage{margin-top:6px;max-width:100%;min-width:0;color:rgba(188,226,247,.8)}
.captureGalleryViewerVoyage::before{content:'抵達航程';display:block;margin-bottom:5px;font-size:8px;line-height:1.2;font-weight:780;color:rgba(154,226,247,.9);letter-spacing:.04em}
.captureVoyageRail{display:flex;align-items:flex-start;width:100%;min-width:0;margin:0 0 5px;overflow:hidden}
.captureVoyageStop{display:flex;flex:0 1 auto;min-width:0;max-width:44px;flex-direction:column;align-items:center;gap:3px;color:rgba(205,228,250,.62)}
.captureVoyageStop i{display:block;width:6px;height:6px;flex:0 0 6px;border-radius:999px;border:1px solid rgba(172,218,248,.52);background:rgba(103,165,216,.24);box-shadow:0 0 0 2px rgba(89,151,210,.04)}
.captureVoyageStop em{display:block;max-width:100%;font-style:normal;font-size:5.5px;line-height:1;letter-spacing:.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.captureVoyageStop.current{color:#dff6ff}.captureVoyageStop.current i{width:7px;height:7px;flex-basis:7px;border-color:rgba(186,239,255,.92);background:rgba(112,220,247,.74);box-shadow:0 0 8px rgba(103,211,246,.42)}
.captureVoyageLink{height:1px;min-width:3px;flex:1 1 12px;margin:3px 2px 0;background:linear-gradient(90deg,rgba(125,187,230,.28),rgba(143,223,245,.68));box-shadow:0 0 5px rgba(102,183,229,.11)}
.captureVoyageText{font-size:6.5px;line-height:1.45;color:rgba(188,220,255,.7);overflow-wrap:anywhere}
.captureGalleryViewerVoyage .captureVoyageRail{margin-bottom:6px}
.captureGalleryViewerVoyage .captureVoyageStop{max-width:58px;gap:4px}.captureGalleryViewerVoyage .captureVoyageStop i{width:7px;height:7px;flex-basis:7px}.captureGalleryViewerVoyage .captureVoyageStop.current i{width:8px;height:8px;flex-basis:8px}.captureGalleryViewerVoyage .captureVoyageStop em{font-size:7px}.captureGalleryViewerVoyage .captureVoyageLink{margin-top:3px}.captureGalleryViewerVoyage .captureVoyageText{font-size:8px;line-height:1.35;color:rgba(177,222,245,.76)}
@media(max-width:360px){#gatewayRecords .captureGalleryVoyage::before{font-size:8px}.captureVoyageText{font-size:7px}.captureGalleryViewerVoyage .captureVoyageText{font-size:8px}}
`;
  document.head.append(style);
}
function recordMap(){return new Map(records.map(record=>[String(record.id),record]))}
function fillVoyageNode(node,journey){
  const text=journeyTextFrom(journey);node.replaceChildren();node.dataset.route=journey.route.join('>');node.setAttribute('aria-label',`抵達航程 ${text}`);node.title=text;
  const rail=document.createElement('div');rail.className='captureVoyageRail';rail.setAttribute('aria-hidden','true');
  journey.route.forEach((id,index)=>{const stop=document.createElement('span');stop.className=`captureVoyageStop${index===journey.route.length-1?' current':''}`;const dot=document.createElement('i'),label=document.createElement('em');label.textContent=id;stop.append(dot,label);rail.append(stop);if(index<journey.route.length-1){const link=document.createElement('span');link.className='captureVoyageLink';rail.append(link)}});
  const copy=document.createElement('div');copy.className='captureVoyageText';copy.textContent=text;copy.setAttribute('aria-hidden','true');node.append(rail,copy);return node;
}
function ensureVoyageNode(parent,selector,className,journey,insert){let node=parent?.querySelector(selector);if(!journey){node?.remove();return null}if(!node){node=document.createElement('div');node.className=className;insert(node)}return fillVoyageNode(node,journey)}
function decorateCards(){const host=document.querySelector('#captureGalleryGrid');if(!host)return 0;const byId=recordMap();let matched=0;for(const card of host.querySelectorAll('.captureGalleryCard')){const record=byId.get(String(card.dataset.captureId||'')),journey=record?journeyFor(record):null;const node=ensureVoyageNode(card,'.captureGalleryVoyage','captureGalleryVoyage',journey,newNode=>{const meta=card.querySelector('.captureGalleryMeta');meta?.insertAdjacentElement('afterend',newNode);if(!meta)card.querySelector('.captureGalleryInfo')?.prepend(newNode)});if(node)matched++}return matched}
function viewerRecord(){const text=viewerPosition?.textContent||'',match=text.match(/^\s*(\d+)\s*\/\s*(\d+)/);if(!match)return null;const index=Number(match[1])-1;return Number.isInteger(index)&&index>=0&&index<records.length?records[index]:null}
function decorateViewer(){const viewer=document.querySelector('#captureGalleryViewer'),meta=viewer?.querySelector('#captureGalleryViewerMeta');if(!viewer||!meta)return false;const record=viewerRecord(),journey=record?journeyFor(record):null;return !!ensureVoyageNode(viewer,'.captureGalleryViewerVoyage','captureGalleryViewerVoyage',journey,node=>meta.insertAdjacentElement('afterend',node))}
function decorate(){ensureStyle();decorateCards();decorateViewer()}
function installObservers(){const nextGrid=document.querySelector('#captureGalleryGrid');if(nextGrid&&nextGrid!==grid){gridObserver?.disconnect();grid=nextGrid;gridObserver=new MutationObserver(()=>schedule());gridObserver.observe(grid,{childList:true})}const nextPosition=document.querySelector('#captureGalleryViewerPosition');if(nextPosition&&nextPosition!==viewerPosition){viewerObserver?.disconnect();viewerPosition=nextPosition;viewerObserver=new MutationObserver(()=>decorateViewer());viewerObserver.observe(viewerPosition,{childList:true,characterData:true,subtree:true})}}
async function refresh(){if(refreshBusy){refreshAgain=true;return false}refreshBusy=true;try{records=await window.WarpCaptureGallery?.list?.()||[];installObservers();decorate();return true}catch{records=[];decorate();return false}finally{refreshBusy=false;if(refreshAgain){refreshAgain=false;queueMicrotask(()=>refresh())}}}
function schedule(){queueMicrotask(()=>refresh())}
function boot(){installObservers();if(grid&&viewerPosition){refresh();return}bootObserver=new MutationObserver(()=>{installObservers();if(grid&&viewerPosition){bootObserver?.disconnect();bootObserver=null;refresh()}});bootObserver.observe(document.documentElement,{childList:true,subtree:true});refresh()}
window.WarpCaptureVoyageContext={refresh,contextFor(recordOrId){const record=typeof recordOrId==='string'?records.find(item=>String(item.id)===recordOrId):recordOrId,journey=record?journeyFor(record):null;return journey?{...journey,route:[...journey.route],text:journeyTextFrom(journey)}:null},snapshot(){return{records:records.length,matched:records.filter(record=>!!journeyFor(record)).length,maxMatchMs:MAX_MATCH_MS}}};
addEventListener('stellarwarp:capture-change',schedule);addEventListener('stellarwarp:journey-complete',schedule);addEventListener('stellarwarp:location-restored',schedule);addEventListener('pagehide',()=>{bootObserver?.disconnect();gridObserver?.disconnect();viewerObserver?.disconnect();records=[]},{once:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
