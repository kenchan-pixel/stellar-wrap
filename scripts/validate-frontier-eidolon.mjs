import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const gateway=readFileSync('mode-gateway.js','utf8');
const eidolon=readFileSync('frontier-eidolon.html','utf8');
const index=readFileSync('index.html','utf8');
const sw=readFileSync('sw.js','utf8');
const doc=readFileSync('docs/MODE_GATEWAY.md','utf8');
const compositionDoc=readFileSync('docs/EIDOLON_COMPOSITION_GUIDE.md','utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const EVIDENCE_DIR=join(process.cwd(),'artifacts','focus-tray-browser');

assert.ok(gateway.includes('EIDOLON GATE｜遺光門廊'),'gateway must expose EIDOLON GATE');
assert.ok(gateway.includes("location.href='./frontier-eidolon.html'"),'gateway must route EIDOLON to its standalone runtime');
assert.match(gateway,/frontierFeatured:root\?\.querySelectorAll\?\.\('\.modeGatewayFeature'\)\?\.length\|\|0/,'gateway snapshot must expose featured Frontier expedition count');
assert.doesNotMatch(index,/\bid\s*:\s*['"]EIDOLON['"]/,'EIDOLON must remain outside the Real Space system table');
assert.doesNotMatch(gateway,/localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon/,'gateway must not create storage/network authority');
assert.match(eidolon,/three@0\.185\.1\/build\/three\.module\.js/,'EIDOLON must pin Three.js 0.185.1');
assert.equal((eidolon.match(/new THREE\.WebGLRenderer/g)||[]).length,1,'EIDOLON must use exactly one renderer');
assert.match(eidolon,/MAX_NORMAL_DPR=1\.25,MAX_CAPTURE_DPR=1\.60/,'EIDOLON mobile DPR bounds must remain explicit');
assert.match(eidolon,/preserveDrawingBuffer:false/,'EIDOLON must not preserve the drawing buffer');
assert.match(eidolon,/EIDOLON GATE｜遺光門廊/,'EIDOLON destination identity must be present');
assert.match(eidolon,/phase='approach'/,'EIDOLON approach state must exist');
assert.match(eidolon,/setPhase\('arrival'\)/,'EIDOLON arrival state must exist');
assert.match(eidolon,/setPhase\('explore'\)/,'EIDOLON explore state must exist');
assert.match(eidolon,/window\.WarpFrontierEidolon=/,'EIDOLON must expose bounded test/diagnostic state');
assert.match(eidolon,/toDataURL\('image\/png'\)/,'EIDOLON capture must export WebGL PNG data');
assert.doesNotMatch(eidolon,/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/,'EIDOLON must stay stateless/local');
assert.equal((eidolon.match(/data-eidolon-vista=/g)||[]).length,3,'EIDOLON must expose exactly three guided capture vistas');
assert.match(eidolon,/\.vistaRail button\{min-height:44px/,'EIDOLON guided vistas must retain 44px mobile touch height');
assert.match(eidolon,/斷環全景/,'EIDOLON overview vista must exist');
assert.match(eidolon,/黑幕中軸/,'EIDOLON veil vista must exist');
assert.match(eidolon,/遺光殘標/,'EIDOLON beacon vista must exist');
assert.match(eidolon,/TAP_MOVE_TOLERANCE=10/,'EIDOLON guided view must use a deliberate-drag threshold');
assert.match(eidolon,/VISTA_SETTLE_EPS=\.006,VISTA_SETTLE_MS=1200/,'EIDOLON guided capture must use a bounded settle contract');
assert.match(eidolon,/async function waitForVistaSettle\(\)/,'EIDOLON guided capture must wait for actual orientation convergence');
assert.match(eidolon,/const settled=await waitForVistaSettle\(\)/,'EIDOLON capture must settle the selected vista before raising capture DPR');
assert.match(eidolon,/vista:guidedVista\|\|'free'/,'EIDOLON diagnostic state must expose guided/free composition');
assert.match(eidolon,/applyVista\(id\)\{return applyVista\(id\)\}/,'EIDOLON must expose composition control for acceptance testing');
assert.ok(sw.includes("'./frontier-eidolon.html'"),'offline CORE must include EIDOLON runtime');
assert.match(sw,/CACHE_NAME=`\$\{CACHE_PREFIX\}v15`/,'offline cache-generation contract must remain v15');
assert.ok(doc.includes('EIDOLON GATE｜遺光門廊'),'Mode Gateway SOT must describe EIDOLON');
assert.ok(compositionDoc.includes('斷環全景')&&compositionDoc.includes('黑幕中軸')&&compositionDoc.includes('遺光殘標'),'EIDOLON composition SOT must describe all three capture vistas');
assert.ok(compositionDoc.includes('0.006')&&compositionDoc.includes('1.2'),'EIDOLON composition SOT must document bounded quick-capture settling');
console.log('EIDOLON Frontier static contract: 32/32 passed');

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
async function trustedDrag(cdp,selector,dx,dy){const p=await targetPoint(cdp,selector);assert.ok(p,`missing drag target ${selector}`);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+dx,y:p.y+dy,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-eidolon-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    let loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpModeGateway&&document.querySelector('#app')?.classList.contains('ready')&&WarpModeGateway.snapshot().visible"),'mode gateway',30000);
    const gatewayState=await evalJs(cdp,'WarpModeGateway.snapshot()');assert.equal(gatewayState.buttons,4);assert.equal(gatewayState.frontierDestinations,3,'compact strip must remain three established worlds');assert.equal(gatewayState.frontierFeatured,1,'EIDOLON must be exposed as one featured expedition');
    await evalJs(cdp,"document.querySelector('#frontierEidolonFeature')?.scrollIntoView({block:'center',inline:'center'});true");await sleep(120);await trustedTap(cdp,'#frontierEidolonFeature');await waitUntil(()=>evalJs(cdp,"location.pathname.endsWith('/frontier-eidolon.html')"),'EIDOLON navigation');await waitUntil(()=>evalJs(cdp,"!!window.WarpFrontierEidolon&&document.querySelector('#eidolonApp')?.classList.contains('ready')"),'EIDOLON runtime',30000);
    const initial=await evalJs(cdp,'WarpFrontierEidolon.state()');assert.equal(initial.destination,'EIDOLON');assert.ok(['approach','arrival','explore'].includes(initial.phase));const approachBytes=await screenshot(cdp,`frontier-eidolon-${viewport}-approach.png`);assert.ok(approachBytes>8000,'EIDOLON approach screenshot should contain rendered scene');
    await evalJs(cdp,'WarpFrontierEidolon.skipArrival();true');await waitUntil(()=>evalJs(cdp,"WarpFrontierEidolon.state().phase==='explore'&&WarpFrontierEidolon.state().exploring===true"),'EIDOLON explore');await sleep(180);
    const explored=await evalJs(cdp,'WarpFrontierEidolon.state()');assert.equal(explored.cssWidth,width);assert.equal(explored.cssHeight,height);assert.ok(explored.drawCalls>0&&explored.drawCalls<=16,`EIDOLON draw calls bounded: ${explored.drawCalls}`);assert.ok(explored.triangles>0&&explored.triangles<=22000,`EIDOLON triangles bounded: ${explored.triangles}`);
    const normal={width:explored.backingWidth,height:explored.backingHeight,pixelRatio:explored.pixelRatio};
    for(const id of ['overview','veil','beacon']){const selector=`[data-eidolon-vista="${id}"]`,p=await targetPoint(cdp,selector);assert.ok(p&&p.height>=44&&p.width>=44,`${id} vista must expose 44px trusted-touch target`);assert.ok(p.left>=0&&p.right<=width+1&&p.top>=0&&p.bottom<=height+1,`${id} vista must remain inside ${viewport}`)}
    await trustedTap(cdp,'[data-eidolon-vista="overview"]');await waitUntil(()=>evalJs(cdp,"WarpFrontierEidolon.state().vista==='overview'"),'overview vista');const overview=await evalJs(cdp,'WarpFrontierEidolon.state().orientation');assert.ok(Math.abs(overview.targetYaw-.08)<.001&&Math.abs(overview.targetRoll-.02)<.001,'overview target must use establishing composition');const overviewBytes=await screenshot(cdp,`frontier-eidolon-${viewport}-overview.png`);assert.ok(overviewBytes>8000);
    await trustedTap(cdp,'[data-eidolon-vista="veil"]');await waitUntil(()=>evalJs(cdp,"WarpFrontierEidolon.state().vista==='veil'"),'veil vista');const veil=await evalJs(cdp,'WarpFrontierEidolon.state().orientation');assert.ok(veil.targetYaw<-.3&&veil.targetRoll<-.15,'veil composition must be materially distinct');const veilBytes=await screenshot(cdp,`frontier-eidolon-${viewport}-veil.png`);assert.ok(veilBytes>8000&&veilBytes!==overviewBytes,'veil evidence must differ from overview');
    await trustedTap(cdp,'[data-eidolon-vista="beacon"]');await waitUntil(()=>evalJs(cdp,"WarpFrontierEidolon.state().vista==='beacon'"),'beacon vista');const beacon=await evalJs(cdp,'WarpFrontierEidolon.state().orientation');assert.ok(beacon.targetYaw>.3&&beacon.targetRoll>.18,'beacon composition must be materially distinct');const beaconBytes=await screenshot(cdp,`frontier-eidolon-${viewport}-beacon.png`);assert.ok(beaconBytes>8000&&beaconBytes!==veilBytes,'beacon evidence must differ from veil');
    await trustedTap(cdp,'#eidolonSpace');await sleep(120);assert.equal(await evalJs(cdp,'WarpFrontierEidolon.state().vista'),'beacon','stationary touch must preserve guided composition');
    await trustedDrag(cdp,'#eidolonSpace',42,12);await waitUntil(()=>evalJs(cdp,"WarpFrontierEidolon.state().vista==='free'"),'deliberate drag exits guided composition');
    await trustedTap(cdp,'[data-eidolon-vista="veil"]');await waitUntil(()=>evalJs(cdp,"WarpFrontierEidolon.state().vista==='veil'"),'veil selected for immediate capture');
    const preCapture=await evalJs(cdp,'WarpFrontierEidolon.state().orientation');const preGap=Math.max(Math.abs(preCapture.yaw-preCapture.targetYaw),Math.abs(preCapture.pitch-preCapture.targetPitch),Math.abs(preCapture.roll-preCapture.targetRoll));assert.ok(preGap>.02,`regression setup must start before vista settles; gap=${preGap}`);
    const capture=await evalJs(cdp,'WarpFrontierEidolon.capture(false)',true);assert.equal(capture.settled,true,'quick guided capture must settle the selected vista before PNG');for(const axis of ['yaw','pitch','roll']){const target=`target${axis[0].toUpperCase()}${axis.slice(1)}`,gap=Math.abs(capture.orientation[axis]-capture.orientation[target]);assert.ok(gap<=.0065,`captured ${axis} must match selected target; gap=${gap}`)}assert.ok(capture.width>normal.width&&capture.height>normal.height,'EIDOLON capture must raise backing buffer');assert.equal(capture.cssWidth,width);assert.equal(capture.cssHeight,height);assert.ok(capture.bytes>12000,'EIDOLON capture must produce non-trivial PNG data');
    const restored=await evalJs(cdp,'WarpFrontierEidolon.state()');assert.equal(restored.backingWidth,normal.width);assert.equal(restored.backingHeight,normal.height);assert.equal(restored.pixelRatio,normal.pixelRatio);assert.equal(restored.vista,'veil','capture must preserve selected guided composition');for(const axis of ['yaw','pitch','roll']){const target=`target${axis[0].toUpperCase()}${axis.slice(1)}`,gap=Math.abs(restored.orientation[axis]-restored.orientation[target]);assert.ok(gap<=.0065,`restored ${axis} must remain on captured vista; gap=${gap}`)}
    const captureBytes=await screenshot(cdp,`frontier-eidolon-${viewport}-capture-state.png`);assert.ok(captureBytes>8000);
    console.log(`EIDOLON Frontier browser ${viewport}: three guided vistas, quick-capture gap ${preGap.toFixed(3)} rad, ${explored.drawCalls} draws / ${explored.triangles} tris, capture ${capture.width}x${capture.height}, restored DPR ${restored.pixelRatio}`);
  }catch(error){if(cdp)await screenshot(cdp,`frontier-eidolon-failure-${viewport}.png`).catch(()=>{});throw error}finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for EIDOLON validation');console.log('EIDOLON browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('EIDOLON Frontier Fiction browser validation: passed at 390×844 and 360×800')}finally{await stop(server)}
