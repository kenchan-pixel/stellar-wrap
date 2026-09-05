import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const source=readFileSync('capture-voyage-context.js','utf8');
const loader=readFileSync('exploration-focus-tray.js','utf8');
const sw=readFileSync('sw.js','utf8');
const doc=readFileSync('docs/CAPTURE_VOYAGE_CONTEXT.md','utf8');
const EVIDENCE_DIR=join(process.cwd(),'artifacts','capture-gallery');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

assert.match(source,/WarpTravelJournal\?\.entries/,'voyage context must read the existing Travel Journal authority');
assert.match(source,/WarpCaptureGallery\?\.list/,'voyage context must read the existing Capture Gallery authority');
assert.match(source,/const MAX_MATCH_MS=12\*60\*60\*1000/,'capture-to-journey matching must be bounded to twelve hours');
assert.match(source,/entry\.route\[entry\.route\.length-1\]!==record\.system/,'journey destination must match the photographed system');
assert.match(source,/age>MAX_MATCH_MS/,'stale journeys must fail closed rather than being attributed to a capture');
assert.match(source,/captureGalleryVoyage/,'Gallery cards must expose matched arrival context');
assert.match(source,/captureGalleryViewerVoyage/,'immersive viewer must expose matched arrival context');
assert.doesNotMatch(source,/THREE\.|WebGLRenderer|setInterval\s*\(|requestAnimationFrame\s*\(|\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB\.open|WarpSim\.(?:select|jumpTo|launch)/,'voyage context must add no renderer, timer, network, persistence or navigation authority');
assert.match(loader,/import\('\.\/capture-voyage-context\.js'\)/,'runtime enhancement chain must load capture voyage context');
assert.ok(sw.includes("const CACHE_PREFIX='stellar-wrap-shell-'")&&/const CACHE_NAME=`\$\{CACHE_PREFIX\}v\d+`/.test(sw)&&sw.includes("'./capture-voyage-context.js'"),'prepared offline shell must remain versioned and include capture voyage context');
assert.ok(doc.includes('Voyage Context v8')&&doc.includes('12 小時')&&doc.includes('不新增持久化')&&doc.includes('不新增航線權限'),'voyage-context SOT must state the bounded matching and authority constraints');
for(const file of ['capture-voyage-context.js','exploration-focus-tray.js']){const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(syntax.status,0,`${file} syntax failed: ${syntax.stderr}`)}
console.log('Capture Gallery Voyage Context static contract passed');

function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const c of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(c);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=28000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}send(method,params={},timeout=16000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=16000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression,awaitPromise=false){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-capture-voyage-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    let loaded=cdp.waitEvent('Page.loadEventFired',18000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,'!!window.WarpSim&&!!window.WarpTravelJournal'),'initial simulator runtime',35000);
    const now=Date.now(),endedAt=now-30000,startedAt=endedAt-37000;
    await evalJs(cdp,`localStorage.setItem('stellar-warp-travel-journal-v1',JSON.stringify({version:2,entries:[{route:['SOL','SIRIUS','TAU'],startedAt:${startedAt},endedAt:${endedAt},seconds:37,distance:11.4}],visited:['SOL','SIRIUS','TAU']}));true`);
    loaded=cdp.waitEvent('Page.loadEventFired',18000);await cdp.send('Page.reload',{ignoreCache:true});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpTravelJournal&&!!window.WarpCaptureGallery&&!!window.WarpCaptureVoyageContext&&!!window.WarpModeGateway&&WarpSim.state().current==='TAU'&&WarpSim.state().exploring&&!WarpSim.state().flying"),'restored TAU journey + voyage context runtime',35000);
    await evalJs(cdp,'WarpCaptureGallery.reset()',true);
    await evalJs(cdp,`(async()=>{const make=async(color,system,createdAt)=>{const c=document.createElement('canvas');c.width=420;c.height=280;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,420,280);g.addColorStop(0,color);g.addColorStop(1,'#020612');x.fillStyle=g;x.fillRect(0,0,420,280);x.fillStyle='rgba(255,255,255,.78)';x.font='bold 34px sans-serif';x.fillText(system,24,52);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));return WarpCaptureGallery.add({blob,system,width:420,height:280,frame:'full',createdAt})};await make('#7561d7','TAU',${endedAt+30000});await make('#397fb8','VEGA',${endedAt-5000});return WarpCaptureGallery.count()})()`,true);
    await waitUntil(()=>evalJs(cdp,'WarpCaptureGallery.count().then(n=>n===2)',true),'two local captures');await evalJs(cdp,'WarpCaptureVoyageContext.refresh()',true);
    const stale=await evalJs(cdp,`WarpCaptureVoyageContext.contextFor({system:'TAU',createdAt:${endedAt}+13*60*60*1000})`);assert.equal(stale,null,'capture more than twelve hours later must not inherit an old voyage');
    const snapshot=await evalJs(cdp,'WarpCaptureVoyageContext.snapshot()');assert.deepEqual(snapshot,{records:2,matched:1,maxMatchMs:43200000});
    const before=await evalJs(cdp,"(()=>{const s=WarpSim.state();return{current:s.current,selected:s.selected||null,flying:s.flying,route:Array.isArray(s.route)?s.route:[]}})()");
    await evalJs(cdp,'WarpModeGateway.openRecords();true');await waitUntil(()=>evalJs(cdp,"document.querySelectorAll('#captureGalleryGrid .captureGalleryCard').length===2&&document.querySelectorAll('#captureGalleryGrid .captureGalleryVoyage').length===1"),'Gallery voyage receipt');
    await evalJs(cdp,"document.querySelector('#captureGallerySection').scrollIntoView({block:'start'});true");await sleep(100);
    const gallery=await evalJs(cdp,`(()=>{const root=document.querySelector('#modeGateway'),cards=[...document.querySelectorAll('#captureGalleryGrid .captureGalleryCard')],matched=cards[0]?.querySelector('.captureGalleryVoyage'),unmatched=cards[1]?.querySelector('.captureGalleryVoyage'),r=matched?.getBoundingClientRect();return{overflow:root.scrollWidth-root.clientWidth,matched:matched?.textContent||'',unmatched:!!unmatched,left:r?.left||0,right:r?.right||0,cardRight:cards[0]?.getBoundingClientRect().right||0}})()`);
    assert.ok(gallery.overflow<=1,`voyage context must not add horizontal overflow, got ${gallery.overflow}`);assert.match(gallery.matched,/地球近軌 → 天狼中繼站 → 金牛塵海/);assert.match(gallery.matched,/11\.4 LY/);assert.match(gallery.matched,/37 秒/);assert.equal(gallery.unmatched,false,'unmatched destination capture must not receive fabricated route context');assert.ok(gallery.left>=-1&&gallery.right<=gallery.cardRight+1);
    const galleryBytes=await screenshot(cdp,`capture-gallery-voyage-card-${viewport}.png`);assert.ok(galleryBytes>12000);
    await evalJs(cdp,"document.querySelector('#captureGalleryGrid .captureGalleryImage').click();true");await waitUntil(()=>evalJs(cdp,"!document.querySelector('#captureGalleryViewer')?.hidden&&document.querySelector('.captureGalleryViewerVoyage')?.textContent.includes('11.4 LY')"),'viewer matched voyage receipt');
    const viewer=await evalJs(cdp,`(()=>{const v=document.querySelector('#captureGalleryViewer'),r=v.getBoundingClientRect(),context=v.querySelector('.captureGalleryViewerVoyage')?.textContent||'',buttons=[...v.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height);return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,context,buttons}})()`);
    assert.ok(viewer.left>=-1&&viewer.top>=-1&&viewer.right<=width+1&&viewer.bottom<=height+1);assert.ok(viewer.overflow<=1);assert.ok(viewer.buttons.every(value=>value>=44));assert.match(viewer.context,/地球近軌 → 天狼中繼站 → 金牛塵海/);
    const viewerBytes=await screenshot(cdp,`capture-gallery-voyage-viewer-${viewport}.png`);assert.ok(viewerBytes>12000);
    await evalJs(cdp,"document.querySelector('#captureGalleryViewer [data-viewer-action=\"next\"]').click();true");await waitUntil(()=>evalJs(cdp,"document.querySelector('#captureGalleryViewerPosition')?.textContent.startsWith('2 / 2')&&!document.querySelector('.captureGalleryViewerVoyage')"),'viewer unmatched capture clears voyage receipt');
    const after=await evalJs(cdp,"(()=>{const s=WarpSim.state();return{current:s.current,selected:s.selected||null,flying:s.flying,route:Array.isArray(s.route)?s.route:[]}})()");assert.deepEqual(after,before,'voyage context presentation must not mutate navigation or flight state');assert.equal(await evalJs(cdp,'WarpCaptureGallery.count()',true),2,'voyage context must not mutate the capture archive');
    console.log(`Capture voyage context ${viewport}: matched route + stale/unmatched fail-closed + layout passed`);
  }finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Capture Gallery Voyage Context validation');console.log('Capture Gallery Voyage Context browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Capture Gallery Voyage Context browser validation: passed')}finally{await stop(server)}