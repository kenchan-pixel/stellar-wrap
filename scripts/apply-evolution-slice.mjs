import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const write = (path, body) => writeFileSync(join(root, path), body);

function replaceOnce(body, needle, replacement, label) {
  if (body.includes(replacement)) return body;
  if (!body.includes(needle)) throw new Error(`Missing ${label}`);
  return body.replace(needle, replacement);
}

const journalSource = String.raw`(() => {
'use strict';
const KEY='stellar-warp-travel-journal-v1';
const LIMIT=12;
const NAMES={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
const IDS=new Set(Object.keys(NAMES));
let previous=null,active=null,currentId='SOL',uiReady=false;

function normaliseEntry(entry){
  if(!entry||!Array.isArray(entry.route))return null;
  const route=entry.route.filter(id=>IDS.has(id));
  if(route.length<2)return null;
  const startedAt=Number(entry.startedAt),endedAt=Number(entry.endedAt),seconds=Number(entry.seconds);
  if(!Number.isFinite(startedAt)||!Number.isFinite(endedAt)||!Number.isFinite(seconds))return null;
  return{route,startedAt,endedAt,seconds:Math.max(1,Math.min(86400,Math.round(seconds)))};
}
function load(){
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||'{}');
    const entries=Array.isArray(parsed.entries)?parsed.entries.map(normaliseEntry).filter(Boolean).slice(0,LIMIT):[];
    return{entries};
  }catch{return{entries:[]}}
}
let journal=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,entries:journal.entries.slice(0,LIMIT)}))}catch{}}
function formatStamp(ms){try{return new Intl.DateTimeFormat('zh-HK',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch{return''}}
function name(id){return NAMES[id]||id}
function ensureUi(){
  if(uiReady&&document.querySelector('#travelJournal'))return true;
  const routeCard=document.querySelector('.routeCard');
  if(!routeCard)return false;
  if(!document.querySelector('#travelJournalStyle')){
    const style=document.createElement('style');
    style.id='travelJournalStyle';
    style.textContent='.travelJournal{margin-top:9px;border:1px solid var(--line);border-radius:15px;padding:10px;background:rgba(255,255,255,.024)}.journalHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.journalTitle{font-size:11px;font-weight:780}.journalSummary{display:block;margin-top:2px;font-size:8px;color:var(--muted)}.journalToggle,.journalRevisit{border:1px solid var(--line);background:rgba(255,255,255,.045);color:var(--text);border-radius:10px;min-height:34px;padding:0 10px;font-size:9px;font-weight:740}.journalBody{display:grid;gap:6px;margin-top:8px}.travelJournal.compact .journalBody{display:none}.journalEmpty{font-size:9px;line-height:1.45;color:var(--muted);padding:4px 1px}.journalEntry{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border-top:1px solid rgba(188,215,255,.09);padding-top:7px}.journalEntry:first-child{border-top:0}.journalMain{font-size:9px;line-height:1.35;min-width:0}.journalMain strong{font-size:10px}.journalRoute{margin-top:2px;color:var(--muted);font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.journalMeta{margin-top:2px;color:#bdd7ff;font-size:7px}.journalPulse{animation:journalPulse .8s ease-out}@keyframes journalPulse{0%{box-shadow:0 0 0 0 rgba(111,220,198,.42)}100%{box-shadow:0 0 0 16px rgba(111,220,198,0)}}';
    document.head.append(style);
  }
  let card=document.querySelector('#travelJournal');
  if(!card){
    card=document.createElement('section');
    card.id='travelJournal';
    card.className='travelJournal compact';
    card.setAttribute('aria-label','旅行日誌');
    card.innerHTML='<div class="journalHead"><div><div class="journalTitle">旅行日誌</div><span id="journalSummary" class="journalSummary">尚未記錄旅程</span></div><button id="journalToggle" class="journalToggle" type="button" aria-expanded="false">展開</button></div><div id="journalBody" class="journalBody"><div id="journalEntries"></div></div>';
    routeCard.insertAdjacentElement('afterend',card);
    card.querySelector('#journalToggle').addEventListener('click',()=>{
      const compact=card.classList.toggle('compact');
      card.querySelector('#journalToggle').textContent=compact?'展開':'收起';
      card.querySelector('#journalToggle').setAttribute('aria-expanded',compact?'false':'true');
    });
    card.querySelector('#journalEntries').addEventListener('click',event=>{
      const button=event.target.closest('[data-destination]');
      if(!button||button.disabled||!window.WarpSim)return;
      const destination=button.dataset.destination;
      if(destination&&destination!==currentId){window.WarpSim.select(destination)}
    });
  }
  uiReady=true;
  render();
  return true;
}
function render(){
  if(!ensureUi()||!uiReady)return;
  const summary=document.querySelector('#journalSummary'),host=document.querySelector('#journalEntries');
  if(!summary||!host)return;
  const visited=new Set(['SOL']);
  for(const entry of journal.entries)for(const id of entry.route)visited.add(id);
  summary.textContent=journal.entries.length?journal.entries.length+' 次旅程 · '+visited.size+'/8 星區已記錄':'完成航程後會自動記錄';
  host.replaceChildren();
  if(!journal.entries.length){
    const empty=document.createElement('div');
    empty.className='journalEmpty';
    empty.textContent='完整抵達最終目的地後，會在此保存路線與實際航行時間；中止航程不會寫入。';
    host.append(empty);return;
  }
  for(const entry of journal.entries.slice(0,5)){
    const destination=entry.route[entry.route.length-1],row=document.createElement('div');
    row.className='journalEntry';
    const main=document.createElement('div');main.className='journalMain';
    const title=document.createElement('strong');title.textContent=name(entry.route[0])+' → '+name(destination);
    const route=document.createElement('div');route.className='journalRoute';route.textContent=entry.route.map(name).join(' → ');
    const meta=document.createElement('div');meta.className='journalMeta';meta.textContent=formatStamp(entry.endedAt)+' · '+entry.seconds+' 秒';
    main.append(title,route,meta);
    const revisit=document.createElement('button');revisit.type='button';revisit.className='journalRevisit';revisit.dataset.destination=destination;revisit.textContent=destination===currentId?'目前位置':'再次規劃';revisit.disabled=destination===currentId;
    row.append(main,revisit);host.append(row);
  }
}
function recordCompleted(activeSession,state){
  const route=(activeSession?.route||[]).filter(id=>IDS.has(id));
  const destination=route[route.length-1];
  if(route.length<2||state.current!==destination)return false;
  const endedAt=Date.now(),entry=normaliseEntry({route,startedAt:activeSession.startedAt,endedAt,seconds:(endedAt-activeSession.startedAt)/1000});
  if(!entry)return false;
  journal.entries.unshift(entry);journal.entries=journal.entries.slice(0,LIMIT);save();render();
  const card=document.querySelector('#travelJournal');if(card){card.classList.remove('journalPulse');void card.offsetWidth;card.classList.add('journalPulse')}
  return true;
}
function sample(){
  ensureUi();
  const api=window.WarpSim;if(!api||typeof api.state!=='function')return;
  let state;try{state=api.state()}catch{return}
  currentId=IDS.has(state.current)?state.current:currentId;
  if(!previous){previous=state;if(state.flying&&Array.isArray(state.route)&&state.route.length>1)active={route:[...state.route],startedAt:Date.now()};render();return}
  if(state.flying&&!previous.flying)active={route:Array.isArray(state.route)?[...state.route]:[],startedAt:Date.now()};
  else if(state.flying&&active&&Array.isArray(state.route)&&state.route.length>1)active.route=[...state.route];
  if(previous.flying&&!state.flying&&active){recordCompleted(active,state);active=null}
  if(previous.current!==state.current)render();
  previous=state;
}
setInterval(sample,500);
sample();
window.WarpTravelJournal={entries(){return journal.entries.map(entry=>({...entry,route:[...entry.route]}))}};
})();
`;
write('travel-journal.js', journalSource);

let html=read('index.html');
const loader='<script src="./travel-journal.js" defer></script>\n';
if(!html.includes(loader.trim())){
  const marker='<script type="module">';
  if(!html.includes(marker))throw new Error('Missing inline module marker');
  html=html.replace(marker,loader+marker);
  write('index.html',html);
}

let validator=read('scripts/validate.mjs');
validator=replaceOnce(validator,"const required = [\n  'index.html',","const required = [\n  'index.html',\n  'travel-journal.js',",'validator required-file anchor');
validator=replaceOnce(validator,"ok(html.includes('aria-label=\"可轉向的 3D 星際曲速航行模擬器\"'), 'main canvas has an accessible label');","ok(html.includes('aria-label=\"可轉向的 3D 星際曲速航行模擬器\"'), 'main canvas has an accessible label');\nok(html.includes('travel-journal.js'), 'travel journal client is loaded by the active simulator');",'validator HTML marker anchor');
validator=replaceOnce(validator,"  rmSync(tmp, { recursive: true, force: true });\n}\n\nconst nodeBlock", "  rmSync(tmp, { recursive: true, force: true });\n}\n\nconst journalScript = text('travel-journal.js');\nconst journalParse = spawnSync(process.execPath, ['--check', join(root, 'travel-journal.js')], { encoding: 'utf8' });\nok(journalParse.status === 0, `travel journal JavaScript parses${journalParse.stderr ? `: ${journalParse.stderr.trim()}` : ''}`);\nok(journalScript.includes(\"const KEY='stellar-warp-travel-journal-v1'\"), 'travel journal storage key is versioned');\nok(journalScript.includes('previous.flying&&!state.flying&&active'), 'travel journal detects completed flight transitions');\nok(journalScript.includes('state.current!==destination'), 'travel journal rejects aborted or incomplete routes');\nok(journalScript.includes('setInterval(sample,500)'), 'travel journal sampling is bounded to 2 Hz');\n\nconst nodeBlock",'validator journal checks anchor');
write('scripts/validate.mjs',validator);

let architecture=read('docs/ARCHITECTURE.md');
architecture=replaceOnce(architecture,"V4.0 採用**單頁、無後端、無建置流程**的靜態 WebGL 架構。所有 UI、航線資料、狀態機、程序化星體、音效及效能調節均在 `index.html` 內運行；Three.js 以固定版本從 CDN 載入。","V4.0 穩定基線採用**單頁、無後端、無建置流程**的靜態 WebGL 架構。Active evolution 仍維持純靜態部署；核心航行、3D、音效及效能邏輯留在 `index.html`，而低頻率、非渲染關鍵路徑的旅行日誌以 `travel-journal.js` 獨立載入。Three.js 仍以固定版本從 CDN 載入。",'architecture summary');
architecture=replaceOnce(architecture,"| `WarpSim` | 提供測試／診斷用的公開控制介面 |","| `WarpSim` | 提供測試／診斷用的公開控制介面 |\n| `travel-journal.js` | 以 2 Hz 讀取公開 flight state，只在完整抵達最終目的地時把最近旅程寫入本機日誌；不參與每幀渲染 |",'architecture component table');
architecture=replaceOnce(architecture,"目前只使用 `localStorage` 保存畫質模式等本機設定：","目前只使用 `localStorage` 保存畫質模式、聲音設定及 active evolution 的本機旅行日誌：",'architecture storage summary');
architecture=replaceOnce(architecture,"- 沒有上傳位置、裝置或航行資料","- 旅行日誌只保存最近最多 12 次已完成路線與本機時間；中止航程不記錄\n- 沒有上傳位置、裝置或航行資料",'architecture privacy list');
write('docs/ARCHITECTURE.md',architecture);

let testing=read('docs/TESTING.md');
testing=replaceOnce(testing,"- WebGL context lost／restored handlers、暫停模擬 clock 及診斷控制存在","- WebGL context lost／restored handlers、暫停模擬 clock 及診斷控制存在\n- 旅行日誌外掛可通過 `node --check`，使用版本化本機儲存 key、2 Hz 有界輪詢，且只接受真正完成最終目的地的航程",'testing automated list');
testing=replaceOnce(testing,"- [ ] 可打開星圖選擇下一個目的地\n\n### G. 聲音","- [ ] 可打開星圖選擇下一個目的地\n- [ ] 完整抵達最終目的地後，控制面板「旅行日誌」新增一筆路線與實際時間\n- [ ] 中止航程不會新增旅行日誌\n- [ ] 重新整理頁面後旅行日誌仍保留，且最多只保留最近 12 次\n- [ ] 從不是目前位置的舊日誌按「再次規劃」，可正常建立前往該目的地的新航線\n\n### G. 聲音",'testing exploration checks');
write('docs/TESTING.md',testing);

let roadmap=read('docs/ROADMAP.md');
roadmap=replaceOnce(roadmap,"## V5｜探索層\n\n**狀態：候選方案；產品方向一致**","## V5｜探索層\n\n**狀態：候選方案；產品方向一致**\n\n> Draft 驗證中：`autonomous-evolution` 已加入第一個「探索連續性」切片——純本機旅行日誌，記錄完成航程、實際時間與再次規劃入口。此實作仍在 Draft PR，**不代表 V5 已獲批准**；合併前需由擁有人確認使用效果。",'roadmap V5 status');
write('docs/ROADMAP.md',roadmap);

let changelog=read('CHANGELOG.md');
changelog=replaceOnce(changelog,"### Improved\n\n- Added mobile WebGL context-loss recovery:","### Improved\n\n- Added a local-only travel journal that records completed final-destination journeys, route, timestamp and actual elapsed travel time, with a quick re-plan action for past destinations.\n- Travel journal history is capped at the latest 12 journeys, survives reloads through a versioned `localStorage` record, excludes aborted flights, and is sampled at only 2 Hz outside the render loop.\n- Added mobile WebGL context-loss recovery:",'changelog improvements');
changelog=replaceOnce(changelog,"### Validation\n\n- The active simulator may now evolve independently","### Validation\n\n- Added syntax and structural checks for the travel journal loader, versioned storage, bounded sampling and completed-route gate.\n- The active simulator may now evolve independently",'changelog validation');
write('CHANGELOG.md',changelog);

console.log('Applied travel journal evolution slice.');
