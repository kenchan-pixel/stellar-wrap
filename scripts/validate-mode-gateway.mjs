import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const gateway=readFileSync('mode-gateway.js','utf8');
const frontier=readFileSync('frontier.html','utf8');
const nadir=readFileSync('frontier-nadir.html','utf8');
const index=readFileSync('index.html','utf8');
const journal=readFileSync('travel-journal.js','utf8');
const sw=readFileSync('sw.js','utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const EVIDENCE_DIR=join(process.cwd(),'artifacts','focus-tray-browser');

assert.match(journal,/import\('\.\/mode-gateway\.js'\)/,'Travel Journal bootstrap must load the mode gateway');
for(const text of['繼續旅程','Real Space｜真實探索','Frontier Fiction｜科幻空域','Gallery / Captures｜探索記錄'])assert.ok(gateway.includes(text),`missing mode entry: ${text}`);
assert.ok(gateway.includes('AURELIA ARC｜曙光環域')&&gateway.includes('NADIR WELL｜玄淵觀測站'),'gateway must expose both original Frontier destinations');
assert.doesNotMatch(gateway,/localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon/,'mode gateway must not create storage/network authority');
assert.doesNotMatch(gateway,/WarpSim\.(?:select|start|isRouteValid)|\bDijkstra\b|\b(?:const|let|var)\s+[GN]\s*=/,'mode gateway must not own Real Space route/topology authority');
assert.doesNotMatch(index,/\bid\s*:\s*['"](?:AURELIA|NADIR)['"]/,'Frontier destinations must remain outside the Real Space system table');
assert.match(frontier,/three@0\.185\.1\/build\/three\.module\.js/,'AURELIA must pin the existing Three.js version');
assert.equal((frontier.match(/new THREE\.WebGLRenderer/g)||[]).length,1,'AURELIA must use exactly one WebGL renderer');
assert.match(frontier,/MAX_NORMAL_DPR=1\.25,MAX_CAPTURE_DPR=1\.60/,'AURELIA mobile DPR bounds must remain explicit');
assert.match(frontier,/window\.WarpFrontier=/,'AURELIA must remain a standalone Frontier runtime');
assert.match(nadir,/window\.WarpFrontierNadir=/,'NADIR must remain a standalone Frontier runtime');
assert.match(frontier,/AURELIA ARC｜曙光環域/,'AURELIA destination identity must be present');
assert.match(frontier,/phase='approach'/,'Frontier approach state must exist');
assert.match(frontier,/setPhase\('arrival'\)/,'Frontier arrival state must exist');
assert.match(frontier,/setPhase\('explore'\)/,'Frontier exploration state must exist');
assert.match(frontier,/toDataURL\('image\/png'\)/,'Frontier capture must export a real PNG from the WebGL canvas');
assert.doesNotMatch(frontier,/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/,'Frontier runtime must stay local and stateless');
assert.ok(sw.includes("'./mode-gateway.js'")&&sw.includes("'./frontier.html'")&&sw.includes("'./frontier-nadir.html'"),'offline CORE must include gateway and both Frontier destinations');
assert.match(sw,/CACHE_NAME=`\$\{CACHE_PREFIX\}v15`/,'existing offline cache-generation contract must remain v15');
console.log('Mode gateway semantic/static contract: 22/22 passed');

function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const c of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(c);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=20000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression,awaitPromise=false){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}
async function targetPoint(cdp,selector){return evalJs(cdp,`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,width:r.width,height:r.height,top:r.top,left:r.left,right:r.right,bottom:r.bottom,hit:hit?.id||hit?.closest?.('button')?.id||hit?.tagName||null,disabled:!!el.disabled}})()`)}
async function trustedTap(cdp,selector){const p=await targetPoint(cdp,selector);assert.ok(p,`missing tap target ${selector}`);assert.ok(p.width>=44&&p.height>=44,`${selector} must expose a 44px touch target`);assert.ok(p.left>=0&&p.top>=0,`${selector} must stay inside viewport`);assert.equal(p.disabled,false,`${selector} must be enabled`);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return p}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-mode-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    let loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpModeGateway&&document.querySelector('#app')?.classList.contains('ready')&&WarpModeGateway.snapshot().visible"),'mode gateway + Real Space runtime',30000);
    const gatewayState=await evalJs(cdp,"WarpModeGateway.snapshot()");assert.equal(gatewayState.visible,true);assert.equal(gatewayState.buttons,4);assert.equal(gatewayState.current,'SOL');
    const gatewayBounds=await evalJs(cdp,"(()=>{const r=document.querySelector('#modeGateway').getBoundingClientRect();const cards=[...document.querySelectorAll('.modeGatewayCard')].map(el=>{const b=el.getBoundingClientRect();return{id:el.id,w:b.width,h:b.height,left:b.left,right:b.right,top:b.top,bottom:b.bottom}});return{w:r.width,h:r.height,cards}})()");assert.equal(Math.round(gatewayBounds.w),width);assert.equal(Math.round(gatewayBounds.h),height);for(const card of gatewayBounds.cards){assert.ok(card.h>=44,`${card.id} touch height`);assert.ok(card.left>=0&&card.right<=width+1,`${card.id} horizontal viewport containment`)}
    const landingBytes=await screenshot(cdp,`mode-gateway-${viewport}.png`);assert.ok(landingBytes>8000,'landing screenshot should contain rendered UI');
    await trustedTap(cdp,'#gatewayGallery');await waitUntil(()=>evalJs(cdp,"WarpModeGateway.snapshot().recordsOpen===true&&document.querySelector('#gatewayRecords')?.classList.contains('open')"),'Gallery / Captures panel');const recordCopy=await evalJs(cdp,"document.querySelector('#gatewayRecords')?.textContent||''");assert.match(recordCopy,/PNG/);assert.match(recordCopy,/本機/);
    await evalJs(cdp,"WarpModeGateway.close();WarpModeGateway.open();true");await trustedTap(cdp,'#gatewayReal');await waitUntil(()=>evalJs(cdp,"WarpModeGateway.snapshot().visible===false&&document.querySelector('#panel')?.classList.contains('open')"),'Real Space handoff');assert.equal((await evalJs(cdp,"WarpSim.state().current")),'SOL','Real Space gateway must not rewrite current location');
    await evalJs(cdp,"document.querySelector('#panel')?.classList.remove('open');WarpModeGateway.open();true");await trustedTap(cdp,'#gatewayFrontier');
    await waitUntil(()=>evalJs(cdp,"location.pathname.endsWith('/frontier.html')"),'Frontier navigation');await waitUntil(()=>evalJs(cdp,"!!window.WarpFrontier&&document.querySelector('#frontierApp')?.classList.contains('ready')"),'AURELIA Frontier runtime',30000);
    const initial=await evalJs(cdp,"WarpFrontier.state()");assert.equal(initial.destination,'AURELIA');assert.ok(['approach','arrival','explore'].includes(initial.phase));const approachBytes=await screenshot(cdp,`frontier-aurelia-${viewport}-approach.png`);
    await evalJs(cdp,"WarpFrontier.skipArrival();true");await waitUntil(()=>evalJs(cdp,"WarpFrontier.state().phase==='explore'&&WarpFrontier.state().exploring===true"),'AURELIA explore state');await sleep(180);
    const explored=await evalJs(cdp,"WarpFrontier.state()");assert.equal(explored.cssWidth,width);assert.equal(explored.cssHeight,height);assert.ok(explored.drawCalls>0&&explored.drawCalls<=14,`AURELIA draw calls bounded: ${explored.drawCalls}`);assert.ok(explored.triangles>0&&explored.triangles<=22000,`AURELIA triangles bounded: ${explored.triangles}`);
    const normalBacking={width:explored.backingWidth,height:explored.backingHeight,pixelRatio:explored.pixelRatio};
    await trustedTap(cdp,'#frontierOrbit');await waitUntil(()=>evalJs(cdp,"WarpFrontier.state().autoOrbit===false"),'trusted-touch auto-orbit toggle');
    const capture=await evalJs(cdp,"WarpFrontier.capture(false)",true);assert.ok(capture.width>normalBacking.width&&capture.height>normalBacking.height,'Frontier capture must raise the actual WebGL backing buffer');assert.equal(capture.cssWidth,width);assert.equal(capture.cssHeight,height);assert.ok(capture.bytes>12000,'Frontier capture must produce non-trivial PNG data');
    const restored=await evalJs(cdp,"WarpFrontier.state()");assert.equal(restored.backingWidth,normalBacking.width);assert.equal(restored.backingHeight,normalBacking.height);assert.equal(restored.pixelRatio,normalBacking.pixelRatio);
    const exploreBytes=await screenshot(cdp,`frontier-aurelia-${viewport}-explore.png`);assert.notEqual(exploreBytes,approachBytes,'approach and final exploration evidence should differ');
    console.log(`Mode Gateway + AURELIA browser ${viewport}: 4-mode landing, trusted-touch handoff, ${explored.drawCalls} draws / ${explored.triangles} tris, capture ${capture.width}x${capture.height}, restored DPR ${restored.pixelRatio}`);
  }catch(error){if(cdp)await screenshot(cdp,`mode-gateway-failure-${viewport}.png`).catch(()=>{});throw error}finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for mode gateway validation');console.log('Mode gateway browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Mode Gateway + AURELIA Frontier Fiction browser validation: passed at 390×844 and 360×800')}finally{await stop(server)}