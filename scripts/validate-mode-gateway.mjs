import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const gateway=readFileSync('mode-gateway.js','utf8');
const scenic=readFileSync('frontier-scenic.html','utf8');
const journal=readFileSync('travel-journal.js','utf8');
const index=readFileSync('index.html','utf8');
const sw=readFileSync('sw.js','utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const EVIDENCE_DIR=join(process.cwd(),'artifacts','mode-gateway-browser');
const DESTS=['AURELIA','NADIR','VESPER','EIDOLON'];
const ORDERS=['01','02','03','04'];

assert.match(journal,/import\('\.\/mode-gateway\.js'\)/,'Travel Journal bootstrap must load the mode gateway');
for(const text of['繼續旅程','Real Space｜真實探索','Frontier Fiction｜科幻空域','Gallery / Captures｜探索記錄'])assert.ok(gateway.includes(text),`missing mode entry: ${text}`);
for(const text of['AURELIA ARC｜曙光環域','NADIR WELL｜玄淵觀測站','VESPER YARD｜暮環採集場','EIDOLON GATE｜遺光門廊'])assert.ok(gateway.includes(text),`missing Frontier destination: ${text}`);
assert.match(gateway,/\.modeGatewayDest\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,'wider Frontier selector may retain the compact two-column layout');
assert.match(gateway,/@media\(max-width:520px\)\{[^`]*\.modeGatewayDest\{grid-template-columns:1fr\}/s,'phone Landing selector must collapse to one ordered column');
assert.match(scenic,/@media\(max-width:520px\)\{\.destGrid\{grid-template-columns:1fr\}/,'phone scenic selector must use the same one-column rail');
for(const order of ORDERS)assert.ok(gateway.includes(`data-order="${order}"`),`Landing selector must expose stable order ${order}`);
assert.match(gateway,/aria-label="AURELIA ARC｜曙光環域，選擇目的地"/,'Landing destination controls need selection-first accessible labels');
assert.match(gateway,/FRONTIER DESTINATIONS｜科幻目的地/,'Landing selector must use destination rather than route language');
assert.doesNotMatch(gateway,/FRONTIER ROUTE/,'Landing selector must not visibly imply a Frontier route authority');
for(const source of [gateway,scenic]){
  for(const text of['DESTINATION CONFIRM｜目的地確認','取消','前往景觀'])assert.ok(source.includes(text),`missing shared destination-confirm language: ${text}`);
}
assert.match(gateway,/frontierPending/,'Landing runtime must expose pending destination selection');
assert.match(scenic,/selectionPending:selectionDest/,'Scenic runtime must expose pending destination selection');
assert.match(gateway,/frontier-scenic\.html\?dest=/,'confirmed Frontier entries must use the unified scenic shell');
assert.doesNotMatch(gateway,/NEW EXPEDITION/,'Frontier landing must not keep the legacy featured-expedition copy; runtime validation proves zero featured destination pointers');
assert.doesNotMatch(gateway,/localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon/,'mode gateway must not create storage/network authority');
assert.doesNotMatch(gateway,/WarpSim\.(?:start|isRouteValid)|\bDijkstra\b|\b(?:const|let|var)\s+[GN]\s*=/,'mode gateway must not own Real Space route/topology authority; Gallery may delegate destination selection to WarpSim.select');
assert.doesNotMatch(index,/\bid\s*:\s*['"](?:AURELIA|NADIR|VESPER|EIDOLON)['"]/,'Frontier destinations must remain outside the Real Space system table');
assert.match(scenic,/#frontierFrame\{[^}]*pointer-events:none/s,'scenic scene must be display-only to the user');
assert.match(scenic,/WarpFrontierScenic=/,'scenic shell must expose validation state');
for(const api of['WarpFrontier','WarpFrontierNadir','WarpFrontierVesper','WarpFrontierEidolon'])assert.ok(scenic.includes(`api:'${api}'`),`scenic shell must reuse ${api}`);
assert.equal((scenic.match(/vista:'overview'/g)||[]).length,4,'all four Frontier destinations must use one curated overview composition');
for(const control of['模式選擇','>科幻目的地</button>','Real Space','高畫質留影'])assert.ok(scenic.includes(control),`missing unified scenic control: ${control}`);
assert.doesNotMatch(scenic,/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/,'scenic shell must remain stateless');
assert.ok(sw.includes("'./frontier-scenic.html'"),'offline CORE must include unified scenic shell');
assert.match(sw,/const CACHE_NAME=`\$\{CACHE_PREFIX\}v\d+`;/,'offline shell must keep an explicit versioned cache generation; validate-offline owns the current generation number');
console.log('Mode Gateway + Frontier Scenic selection/confirm static contract passed');

function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const c of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(c);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=24000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression,awaitPromise=false){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}
async function targetPoint(cdp,selector){return evalJs(cdp,`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,disabled:!!el.disabled}})()`)}
async function trustedTap(cdp,selector){const p=await targetPoint(cdp,selector);assert.ok(p,`missing tap target ${selector}`);assert.ok(p.width>=44&&p.height>=44,`${selector} must expose a 44px touch target`);assert.ok(p.left>=0&&p.top>=0,`${selector} must stay inside viewport`);assert.equal(p.disabled,false,`${selector} must be enabled`);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return p}
function assertPhoneRail(boxes,label,width){assert.equal(boxes.length,4,`${label} must have four destinations`);assert.deepEqual(boxes.map(box=>box.order),ORDERS,`${label} must preserve 01–04 order`);for(const [i,box] of boxes.entries()){assert.ok(box.h>=44,`${label} ${box.order} must expose 44px touch height`);assert.ok(box.left>=0&&box.right<=width+1,`${label} ${box.order} must stay inside viewport`);assert.ok(box.aria&&box.aria.length>8,`${label} ${box.order} must have an accessible label`);if(i>0)assert.ok(box.top>=boxes[i-1].bottom-1,`${label} ${box.order} must occupy its own row`)}}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-scenic-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    let loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpModeGateway&&document.querySelector('#app')?.classList.contains('ready')&&WarpModeGateway.snapshot().visible"),'mode gateway + Real Space runtime',30000);
    const gatewayState=await evalJs(cdp,'WarpModeGateway.snapshot()');assert.equal(gatewayState.buttons,4);assert.equal(gatewayState.frontierDestinations,4);assert.equal(gatewayState.frontierFeatured,0);
    const boxes=await evalJs(cdp,"[...document.querySelectorAll('.modeGatewayDest button')].map(el=>{const r=el.getBoundingClientRect();return{order:el.dataset.order,aria:el.getAttribute('aria-label'),h:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}})");assertPhoneRail(boxes,'Landing Frontier rail',width);
    assert.ok((await screenshot(cdp,`frontier-gateway-${viewport}.png`))>8000);
    await trustedTap(cdp,'#gatewayFrontier');await waitUntil(()=>evalJs(cdp,"document.activeElement?.id==='frontierAureliaQuick'"),'Frontier selector focus');assert.ok((await evalJs(cdp,'location.pathname')).endsWith('/'));
    await trustedTap(cdp,'#frontierNadirQuick');await waitUntil(()=>evalJs(cdp,"WarpModeGateway.snapshot().frontierPending==='NADIR'&&WarpModeGateway.snapshot().frontierCommitOpen"),'Landing destination confirmation');assert.ok((await evalJs(cdp,'location.pathname')).endsWith('/'));assert.ok((await screenshot(cdp,`frontier-gateway-confirm-${viewport}.png`))>8000);
    await trustedTap(cdp,'#gatewayFrontierCommitCancel');await waitUntil(()=>evalJs(cdp,"WarpModeGateway.snapshot().frontierPending===''&&!WarpModeGateway.snapshot().frontierCommitOpen"),'Landing confirmation cancel');assert.ok((await evalJs(cdp,'location.pathname')).endsWith('/'));
    await trustedTap(cdp,'#frontierAureliaQuick');await waitUntil(()=>evalJs(cdp,"WarpModeGateway.snapshot().frontierPending==='AURELIA'&&WarpModeGateway.snapshot().frontierCommitOpen"),'AURELIA staged selection');
    await trustedTap(cdp,'#gatewayFrontierCommitConfirm');await waitUntil(()=>evalJs(cdp,"location.pathname.endsWith('/frontier-scenic.html')&&new URLSearchParams(location.search).get('dest')==='AURELIA'"),'AURELIA scenic shell');
    let captureEvidence=null;
    for(let i=0;i<DESTS.length;i++){
      const id=DESTS[i];
      if(i>0){const previous=DESTS[i-1];await trustedTap(cdp,'#routeButton');await waitUntil(()=>evalJs(cdp,'WarpFrontierScenic.state().selectorOpen===true'),'Frontier destination panel');if(i===1){const scenicBoxes=await evalJs(cdp,"[...document.querySelectorAll('#destGrid button')].map(el=>{const r=el.getBoundingClientRect();return{order:el.dataset.order,aria:el.getAttribute('aria-label'),h:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}})");assertPhoneRail(scenicBoxes,'In-destination Frontier rail',width);assert.ok((await screenshot(cdp,`frontier-aurelia-rail-${viewport}.png`))>8000)}await trustedTap(cdp,`[data-dest="${id}"]`);await waitUntil(()=>evalJs(cdp,`WarpFrontierScenic.state().selectionPending==='${id}'&&WarpFrontierScenic.state().selectionVisible&&WarpFrontierScenic.state().destination==='${previous}'&&!WarpFrontierScenic.state().switching`),`${id} staged destination confirmation`,2400);if(i===1)assert.ok((await screenshot(cdp,`frontier-aurelia-nadir-confirm-${viewport}.png`))>8000);await trustedTap(cdp,'#destinationCommitConfirm');await waitUntil(()=>evalJs(cdp,`WarpFrontierScenic.state().switching===true&&WarpFrontierScenic.state().pendingDestination==='${id}'`),`${id} confirmed scenic handoff`,1800);await waitUntil(()=>evalJs(cdp,`WarpFrontierScenic.state().destination==='${id}'&&WarpFrontierScenic.state().child`),`${id} scenic child`,30000)}
      await waitUntil(()=>evalJs(cdp,'!!window.WarpFrontierScenic&&WarpFrontierScenic.state().child'),`${id} child runtime`,30000);
      await evalJs(cdp,'WarpFrontierScenic.skipArrival()');
      await waitUntil(()=>evalJs(cdp,"WarpFrontierScenic.state().child?.phase==='explore'&&WarpFrontierScenic.state().child?.autoOrbit===false&&WarpFrontierScenic.state().child?.vista==='overview'"),`${id} fixed scenic view`,12000);
      const state=await evalJs(cdp,'WarpFrontierScenic.state()');assert.equal(state.destination,id);assert.equal(state.fixed,true);assert.equal(state.framePointerEvents,'none');assert.equal(state.controls,4);assert.equal(state.destinations,4);assert.equal(state.child.autoOrbit,false);assert.equal(state.child.vista,'overview');assert.ok(state.child.drawCalls>0,`${id} must render the scene`);assert.ok(state.child.triangles>0,`${id} must expose rendered geometry`);
      assert.ok((await screenshot(cdp,`frontier-${id.toLowerCase()}-fixed-${viewport}.png`))>8000);
      if(id==='NADIR'){
        const normal={w:state.child.backingWidth,h:state.child.backingHeight,dpr:state.child.pixelRatio};const capture=await evalJs(cdp,'WarpFrontierScenic.capture(false)',true);assert.ok(capture.width>normal.w&&capture.height>normal.h);const restored=await evalJs(cdp,'WarpFrontierScenic.state().child');assert.equal(restored.backingWidth,normal.w);assert.equal(restored.backingHeight,normal.h);assert.equal(restored.pixelRatio,normal.dpr);captureEvidence={width:capture.width,height:capture.height,dpr:restored.pixelRatio};
      }
    }
    assert.ok(captureEvidence);console.log(`Frontier Scenic browser ${viewport}: shared select→confirm flow + 4 fixed overviews + NADIR capture ${captureEvidence.width}x${captureEvidence.height}, restored DPR ${captureEvidence.dpr}`);
  }catch(error){if(cdp)await screenshot(cdp,`frontier-scenic-failure-${viewport}.png`).catch(()=>{});throw error}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for mode gateway validation');console.log('Mode gateway browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Mode Gateway + Frontier Scenic browser validation: shared destination confirmation and all four fixed-angle destinations passed at 390×844 and 360×800')}finally{await stop(server)}
