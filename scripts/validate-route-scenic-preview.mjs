import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const preview=readFileSync('route-scenic-preview.js','utf8');
const loader=readFileSync('exploration-focus-tray.js','utf8');
const pkg=readFileSync('package.json','utf8');
const sw=readFileSync('sw.js','utf8');
const doc=readFileSync('docs/SCENIC_ROUTE_PREVIEW.md','utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const EVIDENCE_DIR=join(process.cwd(),'artifacts','focus-tray-browser');

assert.ok(loader.includes("import('./route-scenic-preview.js')"),'Focus Tray loader must bootstrap Scenic Route Preview');
assert.ok(preview.includes('window.WarpJourneyAtmosphere'),'preview must consume existing Journey Atmosphere presentation authority');
assert.ok(preview.includes('api.corridors()')&&preview.includes('api.profiles()'),'preview must consume existing corridor/profile metadata');
assert.ok(preview.includes('window.WarpSim?.state?.()'),'preview must read the existing core route state');
assert.match(preview,/new MutationObserver\(schedule\)/,'preview must react to route-list redraws without polling');
assert.match(preview,/observer\.observe\(routeHost,\{childList:true\}\)/,'preview observer must stay bounded to route-list child changes');
assert.ok(preview.includes('queueMicrotask'),'preview refreshes must be microtask-coalesced');
assert.ok(preview.includes("insertAdjacentElement('afterend',root)"),'preview must stay inside the existing navigation panel flow');
assert.doesNotMatch(preview,/localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon|setInterval|setTimeout|requestAnimationFrame|\bTHREE\b/,'preview must add no storage, network, timer, render-loop or Three.js authority');
assert.ok(sw.includes("'./route-scenic-preview.js'"),'prepared offline shell must include the presentation module');
assert.match(pkg,/validate-route-scenic-preview\.mjs/,'main validation must include Scenic Route Preview');
assert.match(doc,/SOL → LUNA → VEGA → CYG → ORION/,'SOT must retain the approved long-route acceptance case');
assert.match(preview,/className='routeScenicArrivalCard'/,'preview must append one explicit arrival-finale card after route legs');
assert.match(preview,/曲速脫離 → 連續減速 → 到站探索/,'arrival finale must preserve the approved arrival-to-exploration story');
assert.match(preview,/dataset\.routeScenicJump='start'/,'preview must expose a presentation-only start jump');
assert.match(preview,/dataset\.routeScenicJump='arrival'/,'preview must expose a presentation-only arrival jump');
assert.match(preview,/\.routeScenicNav button\{min-height:44px/,'preview navigation must preserve the 44 px mobile touch baseline');
assert.match(preview,/track\.scrollTo\(\{left,behavior:/,'preview navigation must move only its bounded horizontal card track');
assert.match(preview,/matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/,'preview navigation must respect reduced-motion preference');
assert.doesNotMatch(preview,/WarpSim\.(select|launch|jumpTo|start)|\.select\(|\.launch\(|\.jumpTo\(/,'preview navigation must not mutate route, launch or simulated location authority');
for(const id of ['SOL','LUNA','VEGA','CYG','ORION','TAU','SIRIUS','PROX'])assert.ok(preview.includes(`data-destination=\"${id}\"`)||preview.includes(`data-destination="${id}"`),`arrival finale must define a distinct ${id} visual identity`);
console.log('Scenic Route Preview static contract: 28/28 passed');

function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const candidate of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const found=commandPath(candidate);if(found)return found}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=20000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}
  async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}
  send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}
  waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}
  close(){try{this.ws?.close()}catch{}}
}
async function evalJs(cdp,expression,awaitPromise=false){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}
async function trustedTap(cdp,selector,flag){
  const point=await evalJs(cdp,`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,width:r.width,height:r.height,hit:hit===el||el.contains(hit)}})()`);
  assert.ok(point&&point.hit,`${selector} must be the real hit target`);assert.ok(point.width>=44&&point.height>=44,`${selector} must preserve a 44 px touch target`);
  await evalJs(cdp,`(()=>{window[${JSON.stringify(flag)}]=false;const el=document.querySelector(${JSON.stringify(selector)});el?.addEventListener('click',event=>{window[${JSON.stringify(flag)}]=event.isTrusted},{once:true});return !!el})()`);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:1,radiusX:4,radiusY:4,force:1}]});await sleep(55);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await waitUntil(()=>evalJs(cdp,`window[${JSON.stringify(flag)}]===true`),`${selector} trusted touch delivery`,4000);
  return point;
}
async function cardFullyVisible(cdp,selector){return evalJs(cdp,`(()=>{const track=document.querySelector('#routeScenicPreview .routeScenicTrack'),card=document.querySelector(${JSON.stringify(selector)});if(!track||!card)return false;const t=track.getBoundingClientRect(),c=card.getBoundingClientRect();return c.left>=t.left-1&&c.right<=t.right+1})()`)}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-route-preview-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();
    browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
    browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}?mode=real`});await loaded;
    await waitUntil(()=>evalJs(cdp,"document.querySelector('#app')?.classList.contains('ready')&&!!window.WarpSim&&!!window.WarpJourneyAtmosphere&&!!window.WarpRouteScenicPreview"),'Real Space scenic-preview runtime',30000);
    await evalJs(cdp,"document.querySelector('#panel')?.classList.add('open');WarpSim.select('ORION');true");
    await waitUntil(()=>evalJs(cdp,"WarpRouteScenicPreview.snapshot().cards===4&&WarpRouteScenicPreview.snapshot().arrival?.id==='ORION'"),'SOL to ORION scenic cards + arrival finale');
    await evalJs(cdp,`(()=>{const panel=document.querySelector('#panel'),root=document.querySelector('#routeScenicPreview');if(!panel||!root)return false;panel.scrollTop=Math.max(0,root.offsetTop-Math.max(18,(panel.clientHeight-root.offsetHeight)/2));return true})()`);
    await evalJs(cdp,"new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",true);
    const outbound=await evalJs(cdp,`(()=>{const panel=document.querySelector('#panel'),root=document.querySelector('#routeScenicPreview'),track=root?.querySelector('.routeScenicTrack'),r=root?.getBoundingClientRect(),p=panel?.getBoundingClientRect();const cards=[...document.querySelectorAll('.routeScenicCard')],arrival=document.querySelector('.routeScenicArrivalCard'),buttons=[...root.querySelectorAll('.routeScenicNav button')];return{snapshot:WarpRouteScenicPreview.snapshot(),route:WarpSim.state().route.join('>'),names:cards.map(card=>card.querySelector('.routeScenicTitle')?.textContent),buttons:buttons.map(button=>({text:button.textContent,height:button.getBoundingClientRect().height,disabled:button.disabled})),arrivalCards:root?.querySelectorAll('.routeScenicArrivalCard').length||0,arrivalDestination:arrival?.dataset.destination||null,arrivalTitle:arrival?.querySelector('.routeScenicTitle')?.textContent||null,arrivalCopy:arrival?.textContent||'',arrivalAria:root.querySelector('[data-route-scenic-jump="arrival"]')?.getAttribute('aria-label')||'',root:r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null,panel:p?{left:p.left,right:p.right,top:p.top,bottom:p.bottom,width:p.width,height:p.height}:null,pageScroll:document.documentElement.scrollWidth,innerWidth,trackScroll:track?.scrollWidth||0,trackClient:track?.clientWidth||0}})()`);
    assert.deepEqual(outbound.names,['地月影錐','星門引導弧','藍紫導引束','獵戶發射雲絲']);
    assert.equal(outbound.snapshot.key,'SOL>LUNA>VEGA>CYG>ORION');
    assert.equal(outbound.snapshot.arrival.id,'ORION');assert.equal(outbound.snapshot.arrival.name,'獵戶前哨');
    assert.equal(outbound.arrivalCards,1,'route trailer must end with exactly one arrival finale');assert.equal(outbound.arrivalDestination,'ORION');assert.equal(outbound.arrivalTitle,'獵戶前哨');assert.match(outbound.arrivalCopy,/曲速脫離.*連續減速.*到站探索/);assert.equal(outbound.arrivalAria,'查看獵戶前哨抵達構圖');
    assert.deepEqual(outbound.buttons.map(button=>button.text),['起點景觀','看抵達構圖']);assert.ok(outbound.buttons.every(button=>button.height>=44&&!button.disabled),'preview-local navigation must expose two enabled 44 px touch targets');
    assert.ok(outbound.root&&outbound.root.left>=-1&&outbound.root.right<=width+1,'Scenic Route Preview must stay horizontally inside phone viewport');
    assert.ok(outbound.panel&&outbound.root.top>=outbound.panel.top-1&&outbound.root.bottom<=outbound.panel.bottom+1,'Scenic Route Preview evidence must be fully visible inside the open navigation panel');
    assert.ok(outbound.pageScroll<=width+1,'Scenic Route Preview must not create page-level horizontal overflow');
    assert.ok(outbound.trackScroll>=outbound.trackClient,'Scenic Route Preview cards must remain bounded inside their own track');
    await sleep(120);const imageBytes=await screenshot(cdp,`route-scenic-${viewport}.png`);assert.ok(imageBytes>8000,'route preview screenshot should contain rendered app evidence');

    await trustedTap(cdp,'[data-route-scenic-jump="arrival"]','__routeArrivalTrusted');
    await waitUntil(()=>cardFullyVisible(cdp,'.routeScenicArrivalCard'),'trusted arrival jump reveals finale',5000);
    const arrivalRoute=await evalJs(cdp,"WarpSim.state().route.join('>')");assert.equal(arrivalRoute,outbound.route,'arrival preview jump must not mutate authoritative route');
    const arrivalImageBytes=await screenshot(cdp,`route-scenic-arrival-${viewport}.png`);assert.ok(arrivalImageBytes>8000,'arrival-finale screenshot should contain rendered app evidence');

    await trustedTap(cdp,'[data-route-scenic-jump="start"]','__routeStartTrusted');
    await waitUntil(()=>cardFullyVisible(cdp,'.routeScenicCard'),'trusted start jump reveals first scenic leg',5000);
    const startRoute=await evalJs(cdp,"WarpSim.state().route.join('>')");assert.equal(startRoute,outbound.route,'start preview jump must not mutate authoritative route');

    await evalJs(cdp,"WarpSim.jumpTo('ORION');WarpSim.select('SOL');true");
    await waitUntil(()=>evalJs(cdp,"WarpRouteScenicPreview.snapshot().key==='ORION>CYG>VEGA>LUNA>SOL'&&WarpRouteScenicPreview.snapshot().cards===4&&WarpRouteScenicPreview.snapshot().arrival?.id==='SOL'"),'ORION to SOL reverse scenic route + home arrival');
    const reverse=await evalJs(cdp,"({cards:[...document.querySelectorAll('.routeScenicCard')].map(card=>({name:card.querySelector('.routeScenicTitle')?.textContent,reverse:card.dataset.reverse})),arrival:[...document.querySelectorAll('.routeScenicArrivalCard')].map(card=>card.dataset.destination)})");
    assert.deepEqual(reverse.cards.map(item=>item.name),['獵戶發射雲絲','藍紫導引束','星門引導弧','地月影錐']);
    assert.ok(reverse.cards.every(item=>item.reverse==='true'),'reverse travel must reuse canonical corridor presentation profiles');
    assert.deepEqual(reverse.arrival,['SOL'],'reverse route must end in the SOL-specific arrival composition');

    await evalJs(cdp,"WarpSim.jumpTo('SOL');WarpSim.select('SIRIUS');true");
    await waitUntil(()=>evalJs(cdp,"WarpRouteScenicPreview.snapshot().key==='SOL>SIRIUS'&&WarpRouteScenicPreview.snapshot().cards===1&&WarpRouteScenicPreview.snapshot().arrival?.id==='SIRIUS'"),'direct scenic route + arrival finale');
    const direct=await evalJs(cdp,"({corridor:document.querySelector('.routeScenicCard .routeScenicTitle')?.textContent,arrival:document.querySelector('.routeScenicArrivalCard')?.dataset.destination,arrivalCount:document.querySelectorAll('.routeScenicArrivalCard').length})");assert.equal(direct.corridor,'冰藍剪切層');assert.equal(direct.arrival,'SIRIUS');assert.equal(direct.arrivalCount,1);
    console.log(`Scenic Route Preview browser ${viewport}: 2× trusted 44px trailer jumps + route immutability + SOL→ORION 4 scenic legs / ORION finale + reverse SOL finale + SOL→SIRIUS direct finale passed`);
  }catch(error){if(cdp)await screenshot(cdp,`route-scenic-failure-${viewport}.png`).catch(()=>{});throw error}finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Scenic Route Preview validation');console.log('Scenic Route Preview browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Scenic Route Preview trusted-touch navigation + production-browser validation: passed at 390×844 and 360×800')}finally{await stop(server)}