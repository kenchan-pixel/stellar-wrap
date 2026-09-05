import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const source=readFileSync('capture-gallery.js','utf8');
const EVIDENCE_DIR=join(process.cwd(),'artifacts','capture-gallery-swipe');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

assert.match(source,/data-viewer-action=\"prev\"/,'capture viewer must expose previous action');
assert.match(source,/data-viewer-action=\"next\"/,'capture viewer must expose next action');
assert.match(source,/data-viewer-action=\"return\"/,'capture viewer must expose capture-to-world return action');
assert.match(source,/WarpSim\.select\(system\)/,'capture return must reuse existing Real Space selection authority');
assert.doesNotMatch(source,/\.jumpTo\s*\(/,'capture return must not instant-jump to a photographed destination');
assert.match(source,/pointerdown/,'capture viewer must listen for touch/pointer swipe start');
assert.match(source,/Math\.abs\(dx\)>=48/,'capture viewer must use a bounded swipe threshold');
assert.match(source,/event\.key==='ArrowLeft'/,'capture viewer must support keyboard previous navigation');
assert.match(source,/keepViewer:true/,'deleting one of several captures must preserve immersive review');
assert.doesNotMatch(source,/THREE\.|WebGLRenderer|requestAnimationFrame\s*\(|setInterval\s*\(|\bfetch\s*\(|XMLHttpRequest|sendBeacon/,'capture review must add no renderer, render-loop, polling or network authority');
const syntax=spawnSync(process.execPath,['--check','capture-gallery.js'],{encoding:'utf8'});assert.equal(syntax.status,0,`capture-gallery.js syntax failed: ${syntax.stderr}`);
console.log('Capture Gallery swipe + return static contract passed');

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
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-capture-swipe-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',18000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpCaptureGallery&&!!window.WarpModeGateway&&!!document.querySelector('#captureGalleryViewer')"),'Capture Gallery viewer runtime',35000);
    await evalJs(cdp,'WarpCaptureGallery.reset()',true);
    await evalJs(cdp,`(async()=>{const make=async(color,system,createdAt)=>{const c=document.createElement('canvas');c.width=320;c.height=180;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,320,180);g.addColorStop(0,color);g.addColorStop(1,'#020612');x.fillStyle=g;x.fillRect(0,0,320,180);x.fillStyle='rgba(255,255,255,.72)';x.font='bold 30px sans-serif';x.fillText(system,22,48);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));return WarpCaptureGallery.add({blob,system,width:320,height:180,frame:'full',createdAt})};const now=Date.now();await make('#8c4cff','TAU',now);await make('#3aa8ff','SIRIUS',now-60000);return WarpCaptureGallery.count()})()`,true);
    await waitUntil(()=>evalJs(cdp,'WarpCaptureGallery.count().then(n=>n===2)',true),'two local captures');
    await evalJs(cdp,'WarpModeGateway.openRecords();true');await waitUntil(()=>evalJs(cdp,"document.querySelectorAll('#captureGalleryGrid .captureGalleryCard').length===2"),'two capture cards');
    const firstId=await evalJs(cdp,"document.querySelector('#captureGalleryGrid .captureGalleryCard')?.dataset.captureId||''");assert.ok(firstId);
    await evalJs(cdp,`WarpCaptureGallery.open(${JSON.stringify(firstId)})`,true);await waitUntil(()=>evalJs(cdp,"!document.querySelector('#captureGalleryViewer')?.hidden&&document.querySelector('#captureGalleryViewerImage')?.complete"),'immersive viewer open');
    const initial=await evalJs(cdp,`(()=>{const v=document.querySelector('#captureGalleryViewer'),r=v.getBoundingClientRect(),buttons=[...v.querySelectorAll('button')],heights=buttons.map(b=>b.getBoundingClientRect().height),prev=v.querySelector('[data-viewer-action="prev"]'),next=v.querySelector('[data-viewer-action="next"]'),ret=v.querySelector('[data-viewer-action="return"]');return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,rootOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,title:document.querySelector('#captureGalleryViewerTitle')?.textContent||'',position:document.querySelector('#captureGalleryViewerPosition')?.textContent||'',heights,prevDisabled:prev?.disabled,nextDisabled:next?.disabled,returnDisabled:ret?.disabled,returnText:ret?.textContent||'',bodyOverflow:document.body.style.overflow}})()`);
    assert.equal(initial.title,'金牛塵海');assert.match(initial.position,/1 \/ 2/);assert.equal(initial.prevDisabled,true);assert.equal(initial.nextDisabled,false);assert.equal(initial.returnDisabled,false);assert.equal(initial.returnText,'再次前往');assert.ok(initial.heights.every(value=>value>=44),'all viewer controls must keep 44px touch height');assert.ok(initial.left>=-1&&initial.top>=-1&&initial.right<=width+1&&initial.bottom<=height+1);assert.ok(initial.rootOverflow<=1);assert.equal(initial.bodyOverflow,'hidden');
    const initialBytes=await screenshot(cdp,`capture-gallery-swipe-start-${viewport}.png`);assert.ok(initialBytes>12000);

    await evalJs(cdp,"document.querySelector('#captureGalleryViewer [data-viewer-action=\"return\"]').click();true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const s=WarpSim.state();return document.querySelector('#captureGalleryViewer')?.hidden===true&&s.current==='SOL'&&s.selected==='TAU'&&document.querySelector('#panel')?.classList.contains('open')&&WarpModeGateway.snapshot().visible===false})()"),'capture-to-existing-route handoff');
    await sleep(360);const routeBytes=await screenshot(cdp,`capture-gallery-return-route-${viewport}.png`);assert.ok(routeBytes>12000);
    const routeState=await evalJs(cdp,"(()=>{const s=WarpSim.state();return{current:s.current,selected:s.selected,flying:s.flying,panel:document.querySelector('#panel')?.classList.contains('open')}})()");assert.deepEqual(routeState,{current:'SOL',selected:'TAU',flying:false,panel:true},'capture return must plan rather than instant travel');

    await evalJs(cdp,"document.querySelector('#panel')?.classList.remove('open');WarpModeGateway.openRecords();true");await waitUntil(()=>evalJs(cdp,"document.querySelectorAll('#captureGalleryGrid .captureGalleryCard').length===2"),'capture records reopened after route handoff');await evalJs(cdp,`WarpCaptureGallery.open(${JSON.stringify(firstId)})`,true);await waitUntil(()=>evalJs(cdp,"!document.querySelector('#captureGalleryViewer')?.hidden&&document.querySelector('#captureGalleryViewerTitle')?.textContent==='金牛塵海'"),'viewer reopened after route handoff');

    await evalJs(cdp,"document.querySelector('#captureGalleryViewer [data-viewer-action=\"next\"]').click();true");await waitUntil(()=>evalJs(cdp,"document.querySelector('#captureGalleryViewerTitle')?.textContent==='天狼中繼站'"),'next capture button');assert.match(await evalJs(cdp,"document.querySelector('#captureGalleryViewerPosition')?.textContent||''"),/2 \/ 2/);
    await evalJs(cdp,"document.querySelector('#captureGalleryViewer [data-viewer-action=\"prev\"]').click();true");await waitUntil(()=>evalJs(cdp,"document.querySelector('#captureGalleryViewerTitle')?.textContent==='金牛塵海'"),'previous capture button');

    const stage=await evalJs(cdp,`(()=>{const r=document.querySelector('.captureGalleryViewerStage').getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()`),y=(stage.top+stage.bottom)/2,startX=stage.left+(stage.right-stage.left)*.78,endX=stage.left+(stage.right-stage.left)*.22;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:startX,y,radiusX:8,radiusY:8,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:endX,y,radiusX:8,radiusY:8,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await waitUntil(()=>evalJs(cdp,"document.querySelector('#captureGalleryViewerTitle')?.textContent==='天狼中繼站'"),'true touch swipe to next capture');
    const swipeBytes=await screenshot(cdp,`capture-gallery-swipe-next-${viewport}.png`);assert.ok(swipeBytes>12000);

    await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,nativeVirtualKeyCode:37});await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,nativeVirtualKeyCode:37});await waitUntil(()=>evalJs(cdp,"document.querySelector('#captureGalleryViewerTitle')?.textContent==='金牛塵海'"),'keyboard previous capture');

    await evalJs(cdp,"document.querySelector('#captureGalleryViewer [data-viewer-action=\"delete\"]').click();true");
    await waitUntil(()=>evalJs(cdp,"WarpCaptureGallery.count().then(n=>n===1&&!document.querySelector('#captureGalleryViewer')?.hidden&&document.querySelector('#captureGalleryViewerTitle')?.textContent==='天狼中繼站')",true),'delete current while preserving viewer');assert.match(await evalJs(cdp,"document.querySelector('#captureGalleryViewerPosition')?.textContent||''"),/1 \/ 1/);
    const single=await evalJs(cdp,`(()=>{const v=document.querySelector('#captureGalleryViewer');return{prev:v.querySelector('[data-viewer-action="prev"]').disabled,next:v.querySelector('[data-viewer-action="next"]').disabled}})()`);assert.equal(single.prev,true);assert.equal(single.next,true);
    await evalJs(cdp,"document.querySelector('#captureGalleryViewer [data-viewer-action=\"delete\"]').click();true");await waitUntil(()=>evalJs(cdp,"WarpCaptureGallery.count().then(n=>n===0&&document.querySelector('#captureGalleryViewer')?.hidden===true&&document.body.style.overflow!=='hidden')",true),'last delete closes viewer');
    console.log(`Capture Gallery ${viewport}: route handoff, prev/next, true touch swipe, keyboard navigation, in-viewer delete passed; screenshots ${initialBytes}/${routeBytes}/${swipeBytes} bytes`);
  }catch(error){if(cdp)await screenshot(cdp,`capture-gallery-swipe-failure-${viewport}.png`).catch(()=>{});throw error}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Capture Gallery swipe validation');console.log('Capture Gallery swipe browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Capture Gallery swipe + return browser validation: both mobile portrait viewports passed')}finally{await stop(server)}
