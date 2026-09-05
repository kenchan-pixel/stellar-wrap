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
function journeyText(record){const journey=journeyFor(record);if(!journey)return'';const parts=[journey.route.map(id=>SYSTEM_NAMES[id]||id).join(' → ')];if(Number.isFinite(journey.distance))parts.push(`${journey.distance.toFixed(1)} LY`);if(Number.isFinite(journey.seconds))parts.push(`${journey.seconds} 秒`);return parts.join(' · ')}
function ensureStyle(){
  if(document.querySelector('#captureVoyageContextStyle'))return;
  const style=document.createElement('style');style.id='captureVoyageContextStyle';style.textContent=`#gatewayRecords .captureGalleryVoyage{margin-top:6px;padding-top:6px;border-top:1px solid rgba(175,214,255,.09);font-size:6.5px;line-height:1.45;color:rgba(188,220,255,.7);overflow-wrap:anywhere}#gatewayRecords .captureGalleryVoyage::before{content:'抵達航程 · ';color:rgba(139,211,239,.76);font-weight:760}.captureGalleryViewerVoyage{margin-top:5px;max-width:100%;font-size:8px;line-height:1.35;color:rgba(166,218,244,.72);white-space:normal;overflow-wrap:anywhere}.captureGalleryViewerVoyage::before{content:'抵達航程 · ';font-weight:760;color:rgba(145,221,244,.82)}@media(max-width:360px){#gatewayRecords .captureGalleryVoyage{font-size:7px}.captureGalleryViewerVoyage{font-size:8px}}`;document.head.append(style);
}
function recordMap(){return new Map(records.map(record=>[String(record.id),record]))}
function decorateCards(){const host=document.querySelector('#captureGalleryGrid');if(!host)return 0;const byId=recordMap();let matched=0;for(const card of host.querySelectorAll('.captureGalleryCard')){const record=byId.get(String(card.dataset.captureId||'')),text=record?journeyText(record):'';let node=card.querySelector('.captureGalleryVoyage');if(!text){node?.remove();continue}if(!node){node=document.createElement('div');node.className='captureGalleryVoyage';const meta=card.querySelector('.captureGalleryMeta');meta?.insertAdjacentElement('afterend',node);if(!meta)card.querySelector('.captureGalleryInfo')?.prepend(node)}node.textContent=text;node.title=text;matched++}return matched}
function viewerRecord(){const text=viewerPosition?.textContent||'',match=text.match(/^\s*(\d+)\s*\/\s*(\d+)/);if(!match)return null;const index=Number(match[1])-1;return Number.isInteger(index)&&index>=0&&index<records.length?records[index]:null}
function decorateViewer(){const viewer=document.querySelector('#captureGalleryViewer'),meta=viewer?.querySelector('#captureGalleryViewerMeta');if(!viewer||!meta)return false;const record=viewerRecord(),text=record?journeyText(record):'';let node=viewer.querySelector('.captureGalleryViewerVoyage');if(!text){node?.remove();return false}if(!node){node=document.createElement('div');node.className='captureGalleryViewerVoyage';meta.insertAdjacentElement('afterend',node)}node.textContent=text;node.title=text;return true}
function decorate(){ensureStyle();decorateCards();decorateViewer()}
function installObservers(){const nextGrid=document.querySelector('#captureGalleryGrid');if(nextGrid&&nextGrid!==grid){gridObserver?.disconnect();grid=nextGrid;gridObserver=new MutationObserver(()=>schedule());gridObserver.observe(grid,{childList:true})}const nextPosition=document.querySelector('#captureGalleryViewerPosition');if(nextPosition&&nextPosition!==viewerPosition){viewerObserver?.disconnect();viewerPosition=nextPosition;viewerObserver=new MutationObserver(()=>decorateViewer());viewerObserver.observe(viewerPosition,{childList:true,characterData:true,subtree:true})}}
async function refresh(){if(refreshBusy){refreshAgain=true;return false}refreshBusy=true;try{records=await window.WarpCaptureGallery?.list?.()||[];installObservers();decorate();return true}catch{records=[];decorate();return false}finally{refreshBusy=false;if(refreshAgain){refreshAgain=false;queueMicrotask(()=>refresh())}}}
function schedule(){queueMicrotask(()=>refresh())}
function boot(){installObservers();if(grid&&viewerPosition){refresh();return}bootObserver=new MutationObserver(()=>{installObservers();if(grid&&viewerPosition){bootObserver?.disconnect();bootObserver=null;refresh()}});bootObserver.observe(document.documentElement,{childList:true,subtree:true});refresh()}
window.WarpCaptureVoyageContext={refresh,contextFor(recordOrId){const record=typeof recordOrId==='string'?records.find(item=>String(item.id)===recordOrId):recordOrId,journey=record?journeyFor(record):null;return journey?{...journey,route:[...journey.route],text:journeyText(record)}:null},snapshot(){return{records:records.length,matched:records.filter(record=>!!journeyFor(record)).length,maxMatchMs:MAX_MATCH_MS}}};
addEventListener('stellarwarp:capture-change',schedule);addEventListener('stellarwarp:journey-complete',schedule);addEventListener('stellarwarp:location-restored',schedule);addEventListener('pagehide',()=>{bootObserver?.disconnect();gridObserver?.disconnect();viewerObserver?.disconnect();records=[]},{once:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
