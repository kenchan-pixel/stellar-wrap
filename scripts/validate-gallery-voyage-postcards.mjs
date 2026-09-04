import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const source=readFileSync('mode-gateway-cinematic.js','utf8');
const gateway=readFileSync('mode-gateway.js','utf8');
const doc=readFileSync('docs/MODE_GATEWAY_CINEMATIC.md','utf8');
const EVIDENCE_DIR=join(process.cwd(),'artifacts','gallery-voyage-postcards');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

for(const token of ['SOL','LUNA','VEGA','CYG','ORION','TAU','SIRIUS','PROX'])assert.ok(source.includes(`${token}:`),`voyage postcard map must cover ${token}`);
for(const token of ['cinematicVoyage','modeGatewayVoyageArt','decorateVoyages','recordsObserver'])assert.ok(source.includes(token),`voyage postcard runtime must include ${token}`);
assert.match(source,/observe\(host,\{childList:true\}\)/,'dynamic voyage redraw observer must stay scoped to the journey-list child set');
assert.match(source,/pointer-events:none/,'postcard art must never intercept touch');
assert.doesNotMatch(source,/THREE\.|WebGLRenderer|setInterval\s*\(|setTimeout\s*\(|requestAnimationFrame\s*\(|localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon/,'postcard layer adds no renderer/timer/storage/network authority');
assert.match(gateway,/entries\.slice\(0,5\)/,'underlying Gallery remains bounded to five voyage records');
assert.ok(doc.includes('Gallery Voyage Postcards v2')&&doc.includes('zero new persistence'),'Mode Gateway cinematic SOT must document the postcard contract');
console.log('Gallery Voyage Postcards static contract passed');

function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const c of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(c);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=24000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}
async function targetPoint(cdp,selector){return evalJs(cdp,`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height}})()`)}
async function trustedTap(cdp,selector){const p=await targetPoint(cdp,selector);assert.ok(p,`missing ${selector}`);assert.ok(p.width>=44&&p.height>=44,`${selector} must retain >=44px touch target`);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-voyage-postcards-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpModeGateway&&!!window.WarpModeGatewayCinematic&&!!window.WarpTravelJournal&&WarpModeGateway.snapshot().visible&&WarpModeGatewayCinematic.snapshot().ready"),'gateway postcard runtime',30000);
    await evalJs(cdp,`(()=>{WarpTravelJournal.entries=()=>[{route:['SOL','SIRIUS','TAU'],endedAt:1788030000000,seconds:42,distance:9.7},{route:['SOL','LUNA','VEGA','CYG','ORION'],endedAt:1788020000000,seconds:71,distance:17.4}];return true})()`);
    await trustedTap(cdp,'#gatewayGallery');
    await waitUntil(()=>evalJs(cdp,"WarpModeGateway.snapshot().recordsOpen&&WarpModeGatewayCinematic.snapshot().voyages===2"),'two scenic voyage postcards');
    const snap=await evalJs(cdp,'WarpModeGatewayCinematic.snapshot()');assert.equal(snap.voyages,2);assert.deepEqual(snap.voyageKinds,['tau','orion']);
    const layout=await evalJs(cdp,`(()=>{const root=document.querySelector('#modeGateway'),cards=[...document.querySelectorAll('#modeGatewayJourneyList .cinematicVoyage')];return{overflow:root.scrollWidth-root.clientWidth,cards:cards.map(card=>{const r=card.getBoundingClientRect(),art=card.querySelector('.modeGatewayVoyageArt'),a=art.getBoundingClientRect(),button=card.querySelector('[data-revisit]').getBoundingClientRect();return{left:r.left,right:r.right,height:r.height,artWidth:a.width,artPointer:getComputedStyle(art).pointerEvents,buttonHeight:button.height,system:card.dataset.cinematicSystem}})}})()`);
    assert.ok(layout.overflow<=1,`postcard gallery must not overflow horizontally, got ${layout.overflow}`);
    assert.deepEqual(layout.cards.map(card=>card.system),['TAU','ORION']);
    for(const card of layout.cards){assert.ok(card.left>=0&&card.right<=width+1,'voyage postcard stays in phone viewport');assert.ok(card.height>=110,'voyage postcard has meaningful scenic record height');assert.ok(card.artWidth>=80,'destination art remains visibly sized');assert.equal(card.artPointer,'none');assert.ok(card.buttonHeight>=44,'existing revisit control retains touch baseline')}
    await evalJs(cdp,"document.querySelector('#modeGatewayJourneyList')?.scrollIntoView({block:'start'});true");await sleep(100);
    const bytes=await screenshot(cdp,`gallery-voyage-postcards-${viewport}.png`);assert.ok(bytes>10000,'voyage postcard screenshot must contain rendered record content');

    await evalJs(cdp,`(()=>{WarpTravelJournal.entries=()=>[{route:['SOL','SIRIUS'],endedAt:1788040000000,seconds:31,distance:8.6}];dispatchEvent(new CustomEvent('stellarwarp:journey-complete'));return true})()`);
    await waitUntil(()=>evalJs(cdp,"WarpModeGatewayCinematic.snapshot().voyages===1&&WarpModeGatewayCinematic.snapshot().voyageKinds[0]==='sirius'"),'live journey list redecorated after refresh');
    console.log(`Gallery Voyage Postcards ${viewport}: TAU + ORION scenic receipts rendered, dynamic SIRIUS redraw passed, screenshot ${bytes} bytes`);
  }catch(error){if(cdp)await screenshot(cdp,`gallery-voyage-postcards-failure-${viewport}.png`).catch(()=>{});throw error}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Gallery Voyage Postcards validation');console.log('Gallery Voyage Postcards browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Gallery Voyage Postcards browser validation: both mobile portrait viewports passed')}finally{await stop(server)}
