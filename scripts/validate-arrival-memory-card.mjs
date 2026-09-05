import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const source=readFileSync('arrival-debrief.js','utf8');
const EVIDENCE_DIR=join(process.cwd(),'artifacts','arrival-memory-card');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
assert.match(source,/id=\"arrivalDebriefRibbon\"/,'arrival debrief must expose a visual route ribbon');
assert.match(source,/routeIds\.forEach\(\(id,index\)=>/,'route ribbon must derive stops from the completed planner-owned route');
assert.match(source,/arrivalDebriefStop'\+\(index===routeIds\.length-1\?' destination':''\)/,'route ribbon must distinguish the final destination');
assert.match(source,/id=\"arrivalDebriefPhoto\"/,'arrival debrief must expose a direct journey capture action');
assert.match(source,/if\(!currentEntry\|\|!safeArrival\(currentEntry\)\)return false/,'photo handoff must re-check safe final arrival at action time');
assert.match(source,/window\.WarpPhotoMode/,'photo handoff must reuse the existing Destination Photo Mode authority');
assert.doesNotMatch(source,/WebGLRenderer|THREE\.|localStorage|sessionStorage|\bfetch\s*\(|XMLHttpRequest|WebSocket|setInterval|requestAnimationFrame/,'arrival memory card must not add renderer, persistence, network, polling or render-loop authority');
const syntax=spawnSync(process.execPath,['--check','arrival-debrief.js'],{encoding:'utf8'});assert.equal(syntax.status,0,`arrival-debrief.js syntax failed: ${syntax.stderr}`);
console.log('Arrival Memory Card static contract passed');

function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const c of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(c);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=32000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(90)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}send(method,params={},timeout=16000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=16000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression,awaitPromise=false){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-arrival-memory-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',18000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,'!!window.WarpSim&&!!window.WarpArrivalDebrief&&!!window.WarpPhotoMode'),'simulator arrival/photo APIs',38000);

    await evalJs(cdp,"WarpSim.jumpTo('TAU');true");await waitUntil(()=>evalJs(cdp,"(()=>{const s=WarpSim.state();return s.current==='TAU'&&s.exploring&&!s.flying&&!s.contextLost})()"),'safe TAU exploration');
    const shown=await evalJs(cdp,"WarpArrivalDebrief.show({route:['SOL','SIRIUS','TAU'],distance:11.4,seconds:42})");assert.equal(shown,true);
    const card=await waitUntil(()=>evalJs(cdp,`(()=>{const c=document.querySelector('#arrivalDebrief');if(!c?.classList.contains('show'))return null;const stops=[...c.querySelectorAll('.arrivalDebriefStop')],buttons=[...c.querySelectorAll('.arrivalDebriefActions button')],r=c.getBoundingClientRect();return{stops:stops.map(s=>s.dataset.system),destination:stops.at(-1)?.classList.contains('destination'),route:c.querySelector('#arrivalDebriefRoute')?.textContent||'',photo:c.querySelector('#arrivalDebriefPhoto')?.textContent||'',minButton:Math.min(...buttons.map(b=>b.getBoundingClientRect().height)),left:r.left,right:r.right,width:r.width,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}})()`),'arrival memory card');
    assert.deepEqual(card.stops,['SOL','SIRIUS','TAU']);assert.equal(card.destination,true);assert.match(card.route,/地球近軌.*天狼中繼站.*金牛塵海/);assert.match(card.photo,/旅程留影.*金牛塵海/);assert.ok(card.minButton>=44,`touch target ${card.minButton}`);assert.ok(card.left>=-1&&card.right<=width+1&&card.width<=width+1);assert.ok(card.overflow<=1,`overflow ${card.overflow}`);
    const cardBytes=await screenshot(cdp,`arrival-memory-card-${viewport}.png`);assert.ok(cardBytes>12000);
    await evalJs(cdp,"document.querySelector('#arrivalDebriefPhoto').click();true");
    const handoff=await waitUntil(()=>evalJs(cdp,"(()=>{const s=WarpSim.state();return WarpPhotoMode.active()?{active:true,current:s.current,exploring:s.exploring,flying:s.flying,debrief:document.querySelector('#arrivalDebrief')?.classList.contains('show'),photoClass:document.querySelector('#app')?.classList.contains('photoMode'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}:null})()"),'arrival to Photo Mode handoff');
    assert.equal(handoff.current,'TAU');assert.equal(handoff.exploring,true);assert.equal(handoff.flying,false);assert.equal(handoff.debrief,false);assert.equal(handoff.photoClass,true);assert.ok(handoff.overflow<=1);
    const photoBytes=await screenshot(cdp,`arrival-photo-handoff-${viewport}.png`);assert.ok(photoBytes>12000);
    await evalJs(cdp,'WarpPhotoMode.exit();true');

    await evalJs(cdp,"WarpSim.jumpTo('ORION');true");await waitUntil(()=>evalJs(cdp,"(()=>{const s=WarpSim.state();return s.current==='ORION'&&s.exploring&&!s.flying&&!s.contextLost})()"),'safe ORION exploration');
    const orionShown=await evalJs(cdp,"WarpArrivalDebrief.show({route:['SOL','LUNA','VEGA','CYG','ORION'],distance:17.0,seconds:68})");assert.equal(orionShown,true);
    const orion=await waitUntil(()=>evalJs(cdp,`(()=>{const c=document.querySelector('#arrivalDebrief');if(!c?.classList.contains('show'))return null;const ribbon=c.querySelector('#arrivalDebriefRibbon'),stops=[...c.querySelectorAll('.arrivalDebriefStop')],rr=ribbon.getBoundingClientRect(),cr=c.getBoundingClientRect(),stopRects=stops.map(s=>s.getBoundingClientRect());return{stops:stops.map(s=>s.dataset.system),destination:stops.at(-1)?.classList.contains('destination'),contained:stopRects.every(r=>r.left>=rr.left-1&&r.right<=rr.right+1),ribbonLeft:rr.left,ribbonRight:rr.right,cardLeft:cr.left,cardRight:cr.right,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}})()`),'five-stop ORION route ribbon');
    assert.deepEqual(orion.stops,['SOL','LUNA','VEGA','CYG','ORION']);assert.equal(orion.destination,true);assert.equal(orion.contained,true,'all five route nodes must remain inside the ribbon');assert.ok(orion.ribbonLeft>=-1&&orion.ribbonRight<=width+1,'ORION ribbon must remain inside the viewport');assert.ok(orion.cardLeft>=-1&&orion.cardRight<=width+1,'ORION arrival card must remain inside the viewport');assert.ok(orion.overflow<=1,`ORION overflow ${orion.overflow}`);
    const orionBytes=await screenshot(cdp,`arrival-memory-orion-${viewport}.png`);assert.ok(orionBytes>12000);
    await evalJs(cdp,'WarpArrivalDebrief.hide();true');
    console.log(`Arrival Memory Card ${viewport}: TAU ribbon + 44px controls + safe Photo Mode handoff + five-stop ORION ribbon passed; screenshots ${cardBytes}/${photoBytes}/${orionBytes} bytes`);
  }catch(error){if(cdp)await screenshot(cdp,`arrival-memory-failure-${viewport}.png`).catch(()=>{});throw error}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Arrival Memory Card validation');console.log('Arrival Memory Card browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Arrival Memory Card browser validation: both mobile portrait viewports passed')}finally{await stop(server)}
