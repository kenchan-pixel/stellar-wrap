import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const source=readFileSync('capture-gallery.js','utf8');
const journal=readFileSync('travel-journal.js','utf8');
const sw=readFileSync('sw.js','utf8');
const doc=readFileSync('docs/CAPTURE_GALLERY.md','utf8');
const EVIDENCE_DIR=join(process.cwd(),'artifacts','capture-gallery');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

assert.match(source,/const LIMIT=6/,'capture archive must remain bounded to six images');
assert.match(source,/indexedDB\.open\(DB_NAME,DB_VERSION\)/,'capture archive must use its dedicated IndexedDB store');
assert.match(source,/originalToBlob\.call\(canvas/,'capture archive must observe the existing Photo Mode toBlob path rather than create a second capture');
assert.match(source,/photoCapturing/,'capture interception must be scoped to the existing Photo Mode capture state');
assert.match(source,/URL\.revokeObjectURL/,'preview/download object URLs must be revoked');
assert.doesNotMatch(source,/THREE\.|WebGLRenderer|requestAnimationFrame\s*\(|setInterval\s*\(|\bfetch\s*\(|XMLHttpRequest|sendBeacon/,'capture archive adds no renderer, render-loop, polling or network authority');
assert.match(journal,/import\('\.\/capture-gallery\.js'\)/,'runtime bootstrap must load Capture Gallery');
assert.ok(sw.includes("const CACHE_NAME=`${CACHE_PREFIX}v16`")&&sw.includes("'./capture-gallery.js'"),'prepared offline shell must include Capture Gallery v16');
assert.ok(doc.includes('latest **6** captures')&&doc.includes('do not create a second camera'),'Capture Gallery SOT must state bound and single-capture authority');
for(const file of ['capture-gallery.js','travel-journal.js']){const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(syntax.status,0,`${file} syntax failed: ${syntax.stderr}`)}
console.log('Capture Gallery static contract passed');

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
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-capture-gallery-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    let loaded=cdp.waitEvent('Page.loadEventFired',18000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpPhotoMode&&!!window.WarpModeGateway&&!!window.WarpCaptureGallery&&!!document.querySelector('#captureGallerySection')"),'Capture Gallery runtime',35000);
    await evalJs(cdp,'WarpCaptureGallery.reset()',true);await waitUntil(()=>evalJs(cdp,'WarpCaptureGallery.count().then(n=>n===0)',true),'empty capture archive');
    await evalJs(cdp,"WarpModeGateway.close();WarpSim.setQuality('standard');WarpSim.jumpTo('TAU');true");
    await waitUntil(()=>evalJs(cdp,"WarpSim.state().current==='TAU'&&WarpSim.state().exploring&&!WarpSim.state().flying"),'safe TAU exploration');
    const before=await evalJs(cdp,'WarpSim.state().qualityMode');assert.equal(before,'standard');
    await evalJs(cdp,"WarpPhotoMode.enter();WarpPhotoMode.setFrame('square');true");
    await evalJs(cdp,'WarpPhotoMode.capture()',true);
    await waitUntil(()=>evalJs(cdp,'WarpCaptureGallery.count().then(n=>n===1)',true),'real Photo Mode capture archived');
    const after=await evalJs(cdp,'WarpSim.state().qualityMode');assert.equal(after,'standard','Photo Mode quality must restore after capture');
    const record=await evalJs(cdp,"WarpCaptureGallery.list().then(rows=>({system:rows[0]?.system,width:rows[0]?.width,height:rows[0]?.height,frame:rows[0]?.frame,size:rows[0]?.blob?.size||0}))",true);
    assert.equal(record.system,'TAU');assert.equal(record.frame,'square');assert.equal(record.width,record.height,'square archive must keep final cropped PNG dimensions');assert.ok(record.size>10000,'real archived PNG must contain rendered image data');
    await evalJs(cdp,'WarpPhotoMode.exit();WarpModeGateway.openRecords();true');
    await waitUntil(()=>evalJs(cdp,"document.querySelectorAll('#captureGalleryGrid .captureGalleryCard').length===1&&document.querySelector('#captureGalleryGrid img')?.complete&&document.querySelector('#captureGalleryGrid img')?.naturalWidth>0"),'capture thumbnail rendered');
    await evalJs(cdp,"document.querySelector('#captureGallerySection').scrollIntoView({block:'start'});true");await sleep(120);
    const layout=await evalJs(cdp,`(()=>{const root=document.querySelector('#modeGateway'),section=document.querySelector('#captureGallerySection'),card=section.querySelector('.captureGalleryCard'),img=card.querySelector('img'),buttons=[...card.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height),r=card.getBoundingClientRect(),s=section.getBoundingClientRect();return{overflow:root.scrollWidth-root.clientWidth,sectionLeft:s.left,sectionRight:s.right,cardLeft:r.left,cardRight:r.right,imgWidth:img.getBoundingClientRect().width,imgHeight:img.getBoundingClientRect().height,buttons,copy:document.querySelector('#gatewayGallery small')?.textContent||'',local:document.querySelector('#gatewayRecords .modeGatewayLocal')?.textContent||''}})()`);
    assert.ok(layout.overflow<=1,`Capture Gallery must not overflow horizontally, got ${layout.overflow}`);assert.ok(layout.sectionLeft>=0&&layout.sectionRight<=width+1);assert.ok(layout.cardLeft>=0&&layout.cardRight<=width+1);assert.ok(layout.imgWidth>100&&layout.imgHeight>70);assert.ok(layout.buttons.every(value=>value>=44),'archive actions must retain >=44px touch height');assert.match(layout.copy,/本機高畫質留影/);assert.match(layout.local,/最多保留最近 6 張/);
    const bytes=await screenshot(cdp,`capture-gallery-${viewport}.png`);assert.ok(bytes>15000,'capture gallery screenshot must contain rendered thumbnail');

    loaded=cdp.waitEvent('Page.loadEventFired',18000);await cdp.send('Page.reload',{ignoreCache:true});await loaded;
    await waitUntil(()=>evalJs(cdp,'!!window.WarpCaptureGallery&&WarpCaptureGallery.count().then(n=>n===1)',true),'IndexedDB capture survives page reload',35000);
    await evalJs(cdp,'WarpModeGateway.openRecords();true');await waitUntil(()=>evalJs(cdp,"document.querySelectorAll('#captureGalleryGrid .captureGalleryCard').length===1"),'persisted capture card after reload');

    await evalJs(cdp,`(async()=>{const makeBlob=()=>new Promise(resolve=>{const c=document.createElement('canvas');c.width=4;c.height=4;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,4,4);c.toBlob(resolve,'image/png')});const blob=await makeBlob();for(let i=0;i<6;i++)await WarpCaptureGallery.add({blob,system:'LUNA',width:4,height:4,frame:'full',createdAt:Date.now()+i+10});return await WarpCaptureGallery.count()})()`,true);
    assert.equal(await evalJs(cdp,'WarpCaptureGallery.count()',true),6,'archive must prune transactionally to six captures');
    const ids=await evalJs(cdp,'WarpCaptureGallery.list().then(rows=>rows.map(row=>row.id))',true);assert.equal(ids.length,6);await evalJs(cdp,`WarpCaptureGallery.remove(${JSON.stringify(ids[0])})`,true);assert.equal(await evalJs(cdp,'WarpCaptureGallery.count()',true),5,'delete action must remove one local capture');
    console.log(`Capture Gallery ${viewport}: real TAU square PNG ${record.width}x${record.height}, ${record.size} bytes; reload, six-item bound and delete passed; screenshot ${bytes} bytes`);
  }catch(error){if(cdp)await screenshot(cdp,`capture-gallery-failure-${viewport}.png`).catch(()=>{});throw error}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Capture Gallery validation');console.log('Capture Gallery browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Capture Gallery browser validation: both mobile portrait viewports passed')}finally{await stop(server)}
