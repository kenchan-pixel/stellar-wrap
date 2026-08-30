import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const gateway=readFileSync('mode-gateway.js','utf8');
const vesper=readFileSync('frontier-vesper.html','utf8');
const sw=readFileSync('sw.js','utf8');
const doc=readFileSync('docs/MODE_GATEWAY.md','utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const EVIDENCE_DIR=join(process.cwd(),'artifacts','focus-tray-browser');

assert.ok(gateway.includes('VESPER YARD｜暮環採集場'),'gateway must expose VESPER YARD');
assert.ok(gateway.includes("location.href='./frontier-vesper.html'"),'gateway must route VESPER to its standalone runtime');
assert.equal((gateway.match(/className='modeGatewayCard'/g)||[]).length,1,'top-level gateway card factory should remain singular');
assert.match(gateway,/frontierDestinations:root\?\.querySelectorAll\?\.\('\.modeGatewayDest button'\)\?\.length\|\|0/,'gateway snapshot must expose Frontier destination count');
assert.doesNotMatch(gateway,/localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon/,'gateway must not create storage/network authority');
assert.match(vesper,/three@0\.185\.1\/build\/three\.module\.js/,'VESPER must pin Three.js 0.185.1');
assert.equal((vesper.match(/new THREE\.WebGLRenderer/g)||[]).length,1,'VESPER must use exactly one renderer');
assert.match(vesper,/MAX_NORMAL_DPR=1\.25,MAX_CAPTURE_DPR=1\.60/,'VESPER mobile DPR bounds must remain explicit');
assert.match(vesper,/preserveDrawingBuffer:false/,'VESPER must not preserve the drawing buffer');
assert.match(vesper,/VESPER YARD｜暮環採集場/,'VESPER destination identity must be present');
assert.match(vesper,/phase='approach'/,'VESPER approach state must exist');
assert.match(vesper,/setPhase\('arrival'\)/,'VESPER arrival state must exist');
assert.match(vesper,/setPhase\('explore'\)/,'VESPER explore state must exist');
assert.match(vesper,/window\.WarpFrontierVesper=/,'VESPER must expose bounded test/diagnostic state');
assert.match(vesper,/toDataURL\('image\/png'\)/,'VESPER capture must export WebGL PNG data');
assert.doesNotMatch(vesper,/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/,'VESPER must stay stateless/local');
assert.equal((vesper.match(/data-vesper-vista=/g)||[]).length,3,'VESPER must expose exactly three composition vistas');
assert.match(vesper,/雲頂主環/,'VESPER overview vista must exist');
assert.match(vesper,/撈取切線/,'VESPER tether vista must exist');
assert.match(vesper,/貨運夜弧/,'VESPER cargo vista must exist');
assert.match(vesper,/TAP_MOVE_TOLERANCE=10/,'VESPER guided view must use a deliberate-drag threshold');
assert.match(vesper,/vista:guidedVista\|\|'free'/,'VESPER diagnostic state must expose guided/free composition');
assert.match(vesper,/applyVista\(id\)\{return applyVista\(id\)\}/,'VESPER must expose composition control for acceptance testing');
assert.ok(sw.includes("'./frontier-vesper.html'"),'offline CORE must include VESPER runtime');
assert.match(sw,/CACHE_NAME=`\$\{CACHE_PREFIX\}v15`/,'offline cache-generation contract must remain v15');
assert.ok(doc.includes('VESPER YARD｜暮環採集場'),'Mode Gateway SOT must describe VESPER');
assert.ok(doc.includes('雲頂主環')&&doc.includes('撈取切線')&&doc.includes('貨運夜弧'),'Mode Gateway SOT must describe VESPER capture vistas');
console.log('VESPER Frontier static contract: 27/27 passed');

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
async function trustedTap(cdp,selector){const p=await targetPoint(cdp,selector);assert.ok(p,`missing tap target ${selector}`);assert.ok(p.width>=44&&p.height>=44,`${selector} must expose a 44px touch target`);assert.ok(p.left>=0&&p.right<=await evalJs(cdp,'innerWidth')+1&&p.top>=0&&p.bottom<=await evalJs(cdp,'innerHeight')+1,`${selector} must stay inside viewport`);assert.equal(p.disabled,false,`${selector} must be enabled`);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return p}
async function trustedDrag(cdp,selector,dx=36,dy=10){const p=await targetPoint(cdp,selector);assert.ok(p,`missing drag target ${selector}`);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+dx,y:p.y+dy,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-vesper-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    let loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpModeGateway&&document.querySelector('#app')?.classList.contains('ready')&&WarpModeGateway.snapshot().visible"),'mode gateway',30000);
    const gatewayState=await evalJs(cdp,'WarpModeGateway.snapshot()');assert.equal(gatewayState.buttons,4,'top-level mode gateway must remain four actions');assert.equal(gatewayState.frontierDestinations,3,'Frontier destination strip should expose three original worlds');
    await evalJs(cdp,"document.querySelector('#frontierVesperQuick')?.scrollIntoView({block:'center',inline:'center'});true");await sleep(120);const quick=await targetPoint(cdp,'#frontierVesperQuick');assert.ok(quick&&quick.width>=44&&quick.height>=44);await trustedTap(cdp,'#frontierVesperQuick');await waitUntil(()=>evalJs(cdp,"location.pathname.endsWith('/frontier-vesper.html')"),'VESPER navigation');await waitUntil(()=>evalJs(cdp,"!!window.WarpFrontierVesper&&document.querySelector('#vesperApp')?.classList.contains('ready')"),'VESPER runtime',30000);
    const initial=await evalJs(cdp,'WarpFrontierVesper.state()');assert.equal(initial.destination,'VESPER');assert.ok(['approach','arrival','explore'].includes(initial.phase));const approachBytes=await screenshot(cdp,`frontier-vesper-${viewport}-approach.png`);assert.ok(approachBytes>8000,'VESPER approach screenshot should contain rendered scene');
    await evalJs(cdp,'WarpFrontierVesper.skipArrival();true');await waitUntil(()=>evalJs(cdp,"WarpFrontierVesper.state().phase==='explore'&&WarpFrontierVesper.state().exploring===true"),'VESPER explore');await sleep(180);
    const explored=await evalJs(cdp,'WarpFrontierVesper.state()');assert.equal(explored.cssWidth,width);assert.equal(explored.cssHeight,height);assert.ok(explored.drawCalls>0&&explored.drawCalls<=16,`VESPER draw calls bounded: ${explored.drawCalls}`);assert.ok(explored.triangles>0&&explored.triangles<=22000,`VESPER triangles bounded: ${explored.triangles}`);assert.ok(await evalJs(cdp,'document.documentElement.scrollWidth<=innerWidth+1'),'VESPER must not introduce horizontal overflow');
    const normal={width:explored.backingWidth,height:explored.backingHeight,pixelRatio:explored.pixelRatio};await trustedTap(cdp,'#vesperOrbit');await waitUntil(()=>evalJs(cdp,'WarpFrontierVesper.state().autoOrbit===false'),'trusted-touch VESPER orbit toggle');

    const vistas=[['overview','雲頂主環'],['tether','撈取切線'],['cargo','貨運夜弧']];
    for(const [id,label] of vistas){
      const selector=`[data-vesper-vista="${id}"]`;await trustedTap(cdp,selector);await waitUntil(()=>evalJs(cdp,`WarpFrontierVesper.state().vista===${JSON.stringify(id)}&&WarpFrontierVesper.state().autoOrbit===false`),`${label} guided composition`);await sleep(420);const state=await evalJs(cdp,'WarpFrontierVesper.state()');assert.equal(state.vista,id);assert.ok(Math.abs(state.orientation.targetRoll)<=.25,'VESPER guided roll must stay bounded');const bytes=await screenshot(cdp,`frontier-vesper-${viewport}-vista-${id}.png`);assert.ok(bytes>8000,`${label} screenshot should contain rendered scene`);
    }
    const cargoTarget=await evalJs(cdp,'WarpFrontierVesper.state().orientation');assert.ok(cargoTarget.targetYaw>.3&&cargoTarget.targetRoll>.2,'cargo composition must be materially distinct');
    await trustedTap(cdp,'#vesperSpace');await sleep(120);assert.equal(await evalJs(cdp,'WarpFrontierVesper.state().vista'),'cargo','stationary touch must preserve guided composition');
    await trustedDrag(cdp,'#vesperSpace',42,12);await waitUntil(()=>evalJs(cdp,"WarpFrontierVesper.state().vista==='free'"),'deliberate drag exits guided composition');
    await trustedTap(cdp,'[data-vesper-vista="overview"]');await waitUntil(()=>evalJs(cdp,"WarpFrontierVesper.state().vista==='overview'"),'overview restored for capture');
    const capture=await evalJs(cdp,'WarpFrontierVesper.capture(false)',true);assert.ok(capture.width>normal.width&&capture.height>normal.height,'VESPER capture must raise backing buffer');assert.equal(capture.cssWidth,width);assert.equal(capture.cssHeight,height);assert.ok(capture.bytes>12000,'VESPER capture must produce non-trivial PNG data');const restored=await evalJs(cdp,'WarpFrontierVesper.state()');assert.equal(restored.backingWidth,normal.width);assert.equal(restored.backingHeight,normal.height);assert.equal(restored.pixelRatio,normal.pixelRatio);assert.equal(restored.vista,'overview','capture must preserve selected guided composition');
    const exploreBytes=await screenshot(cdp,`frontier-vesper-${viewport}-explore.png`);assert.ok(exploreBytes>8000);assert.notEqual(exploreBytes,approachBytes,'approach and exploration evidence must differ');
    console.log(`VESPER Frontier browser ${viewport}: 3 trusted-touch vistas, stationary-tap preservation + drag exit, ${explored.drawCalls} draws / ${explored.triangles} tris, capture ${capture.width}x${capture.height}, restored DPR ${restored.pixelRatio}`);
  }catch(error){if(cdp)await screenshot(cdp,`frontier-vesper-failure-${viewport}.png`).catch(()=>{});throw error}finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for VESPER validation');console.log('VESPER browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('VESPER Frontier Fiction browser validation: passed at 390×844 and 360×800')}finally{await stop(server)}