import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const source=readFileSync('mode-gateway-cinematic.js','utf8');
const tray=readFileSync('exploration-focus-tray.js','utf8');
const sw=readFileSync('sw.js','utf8');
const EVIDENCE_DIR=join(process.cwd(),'artifacts','mode-gateway-browser');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

for(const token of ['gatewayContinue','gatewayReal','gatewayFrontier','gatewayGallery'])assert.ok(source.includes(token),`cinematic gateway art must target ${token}`);
for(const token of ['AURELIA','NADIR','VESPER','EIDOLON'])assert.ok(source.includes(token),`cinematic gateway art must expose ${token} identity`);
assert.match(source,/pointer-events:none/,'decorative gateway art must never capture touch input');
assert.match(source,/modeGatewayCinematicReady/,'gateway exposes one bounded cinematic-ready state');
assert.match(source,/WarpModeGatewayCinematic=\{refresh:decorate,snapshot\}/,'gateway cinematic module exposes diagnostics without route authority');
assert.doesNotMatch(source,/THREE\.|WebGLRenderer|setInterval\s*\(|setTimeout\s*\(|requestAnimationFrame\s*\(|localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon/,'gateway cinematic art adds no renderer/timer/storage/network authority');
assert.ok(tray.includes("import('./mode-gateway-cinematic.js').catch(()=>{});"),'existing bootstrap loads gateway cinematic art');
assert.ok(sw.includes("'./mode-gateway-cinematic.js'"),'offline shell includes gateway cinematic art');
console.log('Mode Gateway Cinematic static contract passed');

function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const c of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(c);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=24000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}
async function targetPoint(cdp,selector){return evalJs(cdp,`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()`)}
async function trustedTap(cdp,selector){const p=await targetPoint(cdp,selector);assert.ok(p,`missing tap target ${selector}`);assert.ok(p.width>=44&&p.height>=44,`${selector} must retain a 44px touch target`);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-gateway-cinematic-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpModeGateway&&!!window.WarpModeGatewayCinematic&&WarpModeGateway.snapshot().visible&&WarpModeGatewayCinematic.snapshot().ready"),'cinematic mode gateway runtime',30000);
    const snap=await evalJs(cdp,'WarpModeGatewayCinematic.snapshot()');
    assert.equal(snap.cards,4);assert.equal(snap.destinations,4);
    assert.deepEqual(snap.cardKinds,['continue','real','frontier','gallery']);
    assert.deepEqual(snap.destinationKinds,['aurelia','nadir','vesper','eidolon']);
    const layout=await evalJs(cdp,"(()=>{const root=document.querySelector('#modeGateway'),cards=[...document.querySelectorAll('.modeGatewayCard')],dests=[...document.querySelectorAll('.modeGatewayDest button')];return{rootOverflow:root.scrollWidth-root.clientWidth,cards:cards.map(el=>{const r=el.getBoundingClientRect(),art=el.querySelector('.modeGatewayCardArt');return{left:r.left,right:r.right,h:r.height,artPointer:getComputedStyle(art).pointerEvents}}),dests:dests.map(el=>{const r=el.getBoundingClientRect(),art=el.querySelector('.modeGatewayDestArt');return{left:r.left,right:r.right,h:r.height,artPointer:getComputedStyle(art).pointerEvents}})}})()");
    assert.ok(layout.rootOverflow<=1,`gateway must not create horizontal overflow, got ${layout.rootOverflow}`);
    for(const box of [...layout.cards,...layout.dests]){assert.ok(box.left>=0&&box.right<=width+1,'cinematic gateway control must stay inside phone viewport');assert.ok(box.h>=44,'cinematic gateway control must keep mobile touch height');assert.equal(box.artPointer,'none','decorative art must not intercept input')}
    const bytes=await screenshot(cdp,`mode-gateway-cinematic-${viewport}.png`);assert.ok(bytes>10000,'cinematic landing screenshot must contain visible rendered content');
    await trustedTap(cdp,'#gatewayFrontier');await waitUntil(()=>evalJs(cdp,"document.activeElement?.id==='frontierAureliaQuick'"),'Frontier selector trusted focus after cinematic decoration');
    const scenicVisible=await evalJs(cdp,"(()=>{const a=document.querySelector('#frontierAureliaQuick .modeGatewayDestArt'),r=a?.getBoundingClientRect();return !!a&&r.width>=44&&r.height>=44})()");assert.equal(scenicVisible,true,'AURELIA miniature remains visibly sized after Frontier selector focus');
    console.log(`Mode Gateway Cinematic ${viewport}: 4 mode vistas + 4 Frontier identity miniatures; no horizontal overflow; trusted Frontier touch passed; screenshot ${bytes} bytes`);
  }catch(error){if(cdp)await screenshot(cdp,`mode-gateway-cinematic-failure-${viewport}.png`).catch(()=>{});throw error}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Mode Gateway Cinematic validation');console.log('Mode Gateway Cinematic browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Mode Gateway Cinematic browser validation: both mobile portrait viewports passed')}finally{await stop(server)}