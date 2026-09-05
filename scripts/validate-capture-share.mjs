import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const source=readFileSync('capture-share.js','utf8');
const loader=readFileSync('exploration-focus-tray.js','utf8');
const sw=readFileSync('sw.js','utf8');
const doc=readFileSync('docs/CAPTURE_GALLERY.md','utf8');
const EVIDENCE_DIR=join(process.cwd(),'artifacts','capture-gallery');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

assert.match(source,/navigator\?\.share/,'native share must use the browser Web Share API');
assert.match(source,/navigator\?\.canShare/,'native PNG sharing must capability-check file sharing');
assert.match(source,/new File\(\[record\.blob\]/,'native share must wrap the already-stored PNG rather than recapture');
assert.match(source,/files:\[file\]/,'share payload must contain the local PNG File');
assert.match(source,/error\?\.name==='AbortError'/,'share-sheet cancellation must be a normal non-error outcome');
assert.match(source,/captureGalleryShare/,'Gallery cards must expose a dedicated share action');
assert.doesNotMatch(source,/THREE\.|WebGLRenderer|setInterval\s*\(|requestAnimationFrame\s*\(|\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB\.open/,'native share must add no renderer, loop, network or persistence authority');
assert.match(loader,/import\('\.\/capture-share\.js'\)/,'runtime bootstrap must load Capture Share');
assert.ok(sw.includes("const CACHE_NAME=`${CACHE_PREFIX}v17`")&&sw.includes("'./capture-share.js'"),'prepared offline shell must include Capture Share v17');
assert.ok(doc.includes('Capture Gallery v7')&&doc.includes('Native Share')&&doc.includes('latest **6** captures')&&doc.includes('do not create a second camera')&&doc.includes('full-screen viewer'),'Capture Gallery SOT must include the native-share slice while preserving the bounded archive/viewer contract');
for(const file of ['capture-share.js','exploration-focus-tray.js']){const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(syntax.status,0,`${file} syntax failed: ${syntax.stderr}`)}
console.log('Capture Gallery native share static contract passed');

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
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-capture-share-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',18000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpCaptureGallery&&!!window.WarpCaptureShare&&!!window.WarpModeGateway&&!!document.querySelector('#captureGalleryGrid')"),'Capture Share runtime',35000);
    await evalJs(cdp,'WarpCaptureGallery.reset()',true);
    const id=await evalJs(cdp,`(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,320,180);g.addColorStop(0,'#5b42d8');g.addColorStop(1,'#07101e');x.fillStyle=g;x.fillRect(0,0,320,180);x.fillStyle='#eef7ff';x.font='bold 30px sans-serif';x.fillText('LUNA',22,48);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));await WarpCaptureGallery.add({blob,system:'LUNA',width:320,height:180,frame:'full',createdAt:1767620000000});return (await WarpCaptureGallery.list())[0].id})()`,true);assert.ok(id);
    await evalJs(cdp,'WarpModeGateway.openRecords();true');await waitUntil(()=>evalJs(cdp,"document.querySelectorAll('#captureGalleryGrid .captureGalleryCard').length===1"),'single local capture card');
    const unsupported=await evalJs(cdp,"document.querySelectorAll('#captureGalleryGrid .captureGalleryShare').length");assert.equal(unsupported,0,'headless browser without file-share capability must not show a dead share action');

    await evalJs(cdp,`(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:payload=>Array.isArray(payload?.files)&&payload.files.length===1&&payload.files[0]?.type==='image/png'});Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{const file=payload.files[0],bytes=new Uint8Array(await file.arrayBuffer());window.__captureShareReceipt={title:payload.title,text:payload.text,name:file.name,type:file.type,size:file.size,signature:[...bytes.slice(0,8)]};}});WarpCaptureShare.refresh();return true})()`);
    await waitUntil(()=>evalJs(cdp,"document.querySelectorAll('#captureGalleryGrid .captureGalleryShare').length===1"),'native share action after capability enable');
    const layout=await evalJs(cdp,`(()=>{const root=document.querySelector('#modeGateway'),card=document.querySelector('#captureGalleryGrid .captureGalleryCard'),button=card.querySelector('.captureGalleryShare'),r=card.getBoundingClientRect(),b=button.getBoundingClientRect();return{overflow:root.scrollWidth-root.clientWidth,cardLeft:r.left,cardRight:r.right,buttonHeight:b.height,buttonLeft:b.left,buttonRight:b.right,text:button.textContent}})()`);
    assert.ok(layout.overflow<=1,`native share must not create horizontal overflow, got ${layout.overflow}`);assert.ok(layout.cardLeft>=-1&&layout.cardRight<=width+1);assert.ok(layout.buttonHeight>=44,'share action must keep the 44px mobile touch baseline');assert.ok(layout.buttonLeft>=layout.cardLeft-1&&layout.buttonRight<=layout.cardRight+1);assert.equal(layout.text,'分享留影');
    const before=await evalJs(cdp,"(()=>{const s=WarpSim.state();return{current:s.current,selected:s.selected||null,flying:s.flying,count:null}})()");
    await evalJs(cdp,"document.querySelector('#captureGalleryGrid .captureGalleryShare').click();true");
    const receipt=await waitUntil(()=>evalJs(cdp,'window.__captureShareReceipt||null'),'native share receipt');
    assert.equal(receipt.type,'image/png');assert.ok(receipt.size>1000);assert.match(receipt.name,/stellar-wrap-luna-full-/);assert.match(receipt.title,/月環基地/);assert.match(receipt.text,/月環基地/);assert.deepEqual(receipt.signature.slice(0,4),[137,80,78,71],'shared File must be the stored PNG bytes');
    const countAfter=await evalJs(cdp,'WarpCaptureGallery.count()',true);assert.equal(countAfter,1,'sharing must not consume or duplicate the stored capture');
    const after=await evalJs(cdp,"(()=>{const s=WarpSim.state();return{current:s.current,selected:s.selected||null,flying:s.flying,count:null}})()");assert.deepEqual(after,before,'sharing must not mutate Real Space navigation or flight state');
    const bytes=await screenshot(cdp,`capture-gallery-share-${viewport}.png`);assert.ok(bytes>12000,'native-share Gallery screenshot must contain the capture card and action');

    const cancelled=await evalJs(cdp,`(async()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancelled','AbortError')}});return WarpCaptureShare.share(${JSON.stringify(id)})})()`,true);assert.equal(cancelled.cancelled,true,'closing the OS share sheet must be treated as cancellation rather than a product failure');assert.equal(await evalJs(cdp,'WarpCaptureGallery.count()',true),1);
    await evalJs(cdp,"Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});WarpCaptureShare.refresh();true");
    await waitUntil(()=>evalJs(cdp,"document.querySelectorAll('#captureGalleryGrid .captureGalleryShare').length===0"),'share action removed when file share becomes unavailable');
    console.log(`Capture native share ${viewport}: PNG ${receipt.size} bytes, 44px action, cancellation + unsupported fallback passed`);
  }finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Capture Gallery native-share validation');console.log('Capture Gallery native-share browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Capture Gallery native share browser validation: passed')}finally{await stop(server)}
