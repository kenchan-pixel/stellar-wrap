import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const source=readFileSync('frontier-scenic.html','utf8');
const EVIDENCE_DIR=join(process.cwd(),'artifacts','frontier-destination-handoff');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

assert.ok(source.includes('FRONTIER FICTION · SCENIC DESTINATION'),'Frontier shell must present destinations rather than a fake route');
assert.ok(source.includes('FRONTIER DESTINATIONS｜科幻目的地'),'destination selector must use destination language');
assert.ok(source.includes('>科幻目的地</button>'),'main Frontier selector control must use destination language');
assert.ok(source.includes('目前景觀'),'selector must identify exactly which scenic destination is current');
assert.ok(source.includes('切換空域景觀'),'destination change must have a coherent scenic handoff');
assert.match(source,/TRANSITION_MS=TEST_MODE\?480:780/,'handoff must be bounded and deterministic');
assert.match(source,/switching,pendingDestination:pendingDest,transitionVisible:/,'runtime must expose handoff state for acceptance');
assert.match(source,/currentMarkers:grid\.querySelectorAll\('\[aria-current="page"\]'\)\.length/,'runtime must expose the single-current-marker invariant');
assert.doesNotMatch(source,/Dijkstra|\bLY\b|routeDistance|warpSeconds|WarpSim\.(?:select|start|isRouteValid)/,'Frontier scenic handoff must not invent physical route authority');
assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon/,'Frontier scenic handoff must add no persistence or network authority');
console.log('Frontier Destination Handoff static contract: 10/10 passed');

function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const c of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(c);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=24000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(60)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression,awaitPromise=false){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}
async function targetPoint(cdp,selector){return evalJs(cdp,`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,disabled:!!el.disabled}})()`)}
async function trustedTap(cdp,selector){const p=await targetPoint(cdp,selector);assert.ok(p,`missing tap target ${selector}`);assert.ok(p.width>=44&&p.height>=44,`${selector} must expose a 44px touch target`);assert.equal(p.disabled,false,`${selector} must be enabled`);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return p}
async function waitCurrentMarkerVisible(cdp,label){return waitUntil(()=>evalJs(cdp,"(()=>{const panel=document.querySelector('#route'),mark=document.querySelector('#destGrid [aria-current=\"page\"] .currentMark');if(!panel||!mark)return false;const r=mark.getBoundingClientRect(),s=getComputedStyle(mark),ps=getComputedStyle(panel);return ps.visibility!=='hidden'&&Number(ps.opacity)>.99&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0})()"),label,2400)}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-frontier-handoff-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}frontier-scenic.html?dest=AURELIA&test=1`});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpFrontierScenic&&!!WarpFrontierScenic.state().child&&document.querySelector('#scenicApp')?.classList.contains('ready')"),'AURELIA scenic runtime',30000);
    await evalJs(cdp,'WarpFrontierScenic.skipArrival()');
    await waitUntil(()=>evalJs(cdp,"WarpFrontierScenic.state().child?.phase==='explore'&&WarpFrontierScenic.state().child?.autoOrbit===false&&WarpFrontierScenic.state().child?.vista==='overview'"),'AURELIA fixed overview',12000);
    await trustedTap(cdp,'#routeButton');
    await waitUntil(()=>evalJs(cdp,'WarpFrontierScenic.state().selectorOpen===true'),'destination selector');
    await waitCurrentMarkerVisible(cdp,'AURELIA current marker visible after selector transition');
    let selector=await evalJs(cdp,"(()=>{const current=[...document.querySelectorAll('#destGrid [aria-current=\"page\"]')];const buttons=[...document.querySelectorAll('#destGrid button')];const marks=current.map(x=>x.querySelector('.currentMark'));return{current:current.map(x=>x.dataset.dest),currentMark:marks.map(x=>x?.textContent||''),markerVisible:marks.every(x=>{if(!x)return false;const r=x.getBoundingClientRect(),s=getComputedStyle(x);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0}),buttons:buttons.map(x=>{const r=x.getBoundingClientRect();return{id:x.dataset.dest,h:r.height,left:r.left,right:r.right}})}})()");
    assert.deepEqual(selector.current,['AURELIA']);assert.deepEqual(selector.currentMark,['目前景觀']);assert.equal(selector.markerVisible,true);assert.equal(selector.buttons.length,4);for(const box of selector.buttons){assert.ok(box.h>=44);assert.ok(box.left>=0&&box.right<=width+1)}
    await trustedTap(cdp,'[data-dest="NADIR"]');
    await waitUntil(()=>evalJs(cdp,'WarpFrontierScenic.state().switching===true&&WarpFrontierScenic.state().transitionVisible===true'),'bounded scenic handoff',1800);
    const handoff=await evalJs(cdp,"({from:document.querySelector('#transitionFrom')?.textContent,to:document.querySelector('#transitionTo')?.textContent,aria:document.querySelector('#transition')?.getAttribute('aria-hidden'),captureDisabled:document.querySelector('#capture')?.disabled})");
    assert.ok(handoff.from.includes('AURELIA ARC'));assert.ok(handoff.to.includes('NADIR WELL'));assert.equal(handoff.aria,'false');assert.equal(handoff.captureDisabled,true);
    assert.ok((await screenshot(cdp,`frontier-handoff-${viewport}.png`))>8000);
    await waitUntil(()=>evalJs(cdp,"WarpFrontierScenic.state().destination==='NADIR'&&!WarpFrontierScenic.state().switching&&!!WarpFrontierScenic.state().child"),'NADIR handoff completion',30000);
    await evalJs(cdp,'WarpFrontierScenic.skipArrival()');
    await waitUntil(()=>evalJs(cdp,"WarpFrontierScenic.state().child?.phase==='explore'&&WarpFrontierScenic.state().child?.autoOrbit===false&&WarpFrontierScenic.state().child?.vista==='overview'"),'NADIR fixed overview',12000);
    await trustedTap(cdp,'#routeButton');await waitUntil(()=>evalJs(cdp,'WarpFrontierScenic.state().selectorOpen===true'),'NADIR selector');
    await waitCurrentMarkerVisible(cdp,'NADIR current marker visible after selector transition');
    selector=await evalJs(cdp,"(()=>{const current=[...document.querySelectorAll('#destGrid [aria-current=\"page\"]')];const mark=current[0]?.querySelector('.currentMark');const r=mark?.getBoundingClientRect();const s=mark?getComputedStyle(mark):null;return{current:current.map(x=>x.dataset.dest),markerText:mark?.textContent||'',markerVisible:!!mark&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0,markers:WarpFrontierScenic.state().currentMarkers,overflow:document.documentElement.scrollWidth>innerWidth+1}})()");
    assert.deepEqual(selector.current,['NADIR']);assert.equal(selector.markerText,'目前景觀');assert.equal(selector.markerVisible,true);assert.equal(selector.markers,1);assert.equal(selector.overflow,false);
    assert.ok((await screenshot(cdp,`frontier-nadir-selector-${viewport}.png`))>8000);
    console.log(`Frontier Destination Handoff browser ${viewport}: AURELIA → bounded handoff → NADIR, one visible current marker, fixed overview`);
  }catch(error){if(cdp)await screenshot(cdp,`frontier-handoff-failure-${viewport}.png`).catch(()=>{});throw error}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Frontier destination handoff validation');console.log('Frontier Destination Handoff browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Frontier Destination Handoff browser validation: both phone viewports passed')}finally{await stop(server)}