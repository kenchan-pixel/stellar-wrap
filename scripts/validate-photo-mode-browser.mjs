import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const EVIDENCE_DIR=join(process.cwd(),'artifacts','focus-tray-browser');
function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const c of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(c);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const s=createTcpServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const a=s.address(),p=typeof a==='object'&&a?a.port:0;s.close(e=>e?reject(e):resolve(p))})})}
async function waitUntil(fn,label,timeout=20000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const v=await fn();if(v)return v}catch(e){last=e}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const r=await fetch(url,{cache:'no-store'});return r.ok},`server ${url}`,8000)}
class Cdp{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}
  async connect(){this.ws=new WebSocket(this.url);await new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(t);res()},{once:true});this.ws.addEventListener('error',e=>{clearTimeout(t);rej(e.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(!m.id){const q=this.events.get(m.method)||[];this.events.delete(m.method);q.forEach(w=>{clearTimeout(w.t);w.r(m.params||{})});return}const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(p.t);m.error?p.j(new Error(m.error.message)):p.r(m.result||{})})}
  send(method,params={},timeout=12000){const id=++this.id;return new Promise((r,j)=>{const t=setTimeout(()=>{this.pending.delete(id);j(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{r,j,t});this.ws.send(JSON.stringify({id,method,params}))})}
  waitEvent(method,timeout=12000){return new Promise((r,j)=>{const w={r,j,t:setTimeout(()=>j(new Error(`event timeout ${method}`)),timeout)};const q=this.events.get(method)||[];q.push(w);this.events.set(method,q)})}
  close(){try{this.ws?.close()}catch{}}
}
async function evalJs(cdp,expression){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const r=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});writeFileSync(join(EVIDENCE_DIR,name),Buffer.from(r.data,'base64'))}
async function tap(cdp,selector){
  const point=await evalJs(cdp,`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,width:r.width,height:r.height,hit:hit?.id||hit?.className||hit?.tagName,disabled:!!el.disabled,visible:getComputedStyle(el).visibility!=='hidden'&&Number(getComputedStyle(el).opacity)>.5}})()`);
  assert.ok(point,`${selector} must exist`);assert.equal(point.disabled,false,`${selector} must be enabled`);assert.equal(point.visible,true,`${selector} must be visibly interactive`);assert.ok(point.height>=43.5,`${selector} must preserve the 44 px touch target`);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:1,radiusX:1,radiusY:1,force:1}]});await sleep(45);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return point;
}
async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-capture-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',c=>stderr=(stderr+String(c)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const r=await fetch(`http://127.0.0.1:${port}/json/list`),a=await r.json();return a.find(x=>x.type==='page'&&x.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}?mode=real`});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpPhotoMode&&document.querySelector('#app')?.classList.contains('ready')"),'production WebGL + Photo Mode',30000);
    const webgl=await evalJs(cdp,"(()=>{const c=document.querySelector('#space');return !!(c.getContext('webgl2')||c.getContext('webgl'))})()");assert.equal(webgl,true,'production canvas owns a WebGL context');
    await evalJs(cdp,"WarpSim.jumpTo('LUNA');WarpSim.setQuality('low');true");
    await waitUntil(()=>evalJs(cdp,"WarpSim.state().current==='LUNA'&&WarpSim.state().exploring&&WarpSim.state().qualityMode==='low'"),'safe LUNA low-quality exploration');
    await evalJs(cdp,`(()=>{window.__captureEvidence={qualityCalls:[]};const originalSet=WarpSim.setQuality.bind(WarpSim);WarpSim.setQuality=mode=>{window.__captureEvidence.qualityCalls.push(mode);return originalSet(mode)};const nativeToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(cb,type,quality){return nativeToBlob.call(this,blob=>setTimeout(()=>cb(blob),450),type,quality)};const nativeUrl=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.__captureEvidence.blobSize=blob.size;createImageBitmap(blob).then(img=>{window.__captureEvidence.pngWidth=img.width;window.__captureEvidence.pngHeight=img.height;img.close()});return nativeUrl(blob)};HTMLAnchorElement.prototype.click=function(){window.__captureEvidence.downloadName=this.download};return true})()`);
    await evalJs(cdp,"WarpPhotoMode.enter();true");
    await waitUntil(()=>evalJs(cdp,"WarpPhotoMode.active()&&WarpPhotoMode.guide()==='thirds'&&document.querySelector('#app')?.classList.contains('photoMode')"),'photo mode with default thirds guide');
    await waitUntil(()=>evalJs(cdp,"Number(getComputedStyle(document.querySelector('#photoCompositionGuide')).opacity)>=.55"),'thirds guide fade-in');
    const compose=await evalJs(cdp,`(()=>{const c=document.querySelector('#space'),r=c.getBoundingClientRect(),g=document.querySelector('#photoCompositionGuide'),gr=g.getBoundingClientRect(),gs=getComputedStyle(g),toolbar=document.querySelector('#photoModeToolbar'),tr=toolbar.getBoundingClientRect(),button=document.querySelector('#photoGuideToggle'),br=button.getBoundingClientRect(),lines=[...g.querySelectorAll('.photoGuideV1,.photoGuideV2,.photoGuideH1,.photoGuideH2')].filter(el=>getComputedStyle(el).display!=='none').length,hit=document.elementFromPoint(innerWidth/2,innerHeight/2);return{width:c.width,height:c.height,cssWidth:r.width,cssHeight:r.height,quality:WarpSim.state().qualityMode,mode:WarpPhotoMode.guide(),guide:{left:gr.left,right:gr.right,top:gr.top,bottom:gr.bottom,opacity:Number(gs.opacity),pointer:gs.pointerEvents,lines},toolbar:{left:tr.left,right:tr.right,top:tr.top,bottom:tr.bottom},button:{height:br.height,left:br.left,right:br.right,text:button.textContent},pageScroll:document.documentElement.scrollWidth,hitId:hit?.id||''}})()`);
    assert.equal(compose.quality,'low');assert.equal(Math.round(compose.cssWidth),width);assert.equal(Math.round(compose.cssHeight),height);assert.equal(compose.mode,'thirds');assert.equal(compose.guide.lines,4);assert.ok(compose.guide.opacity>=.55);assert.equal(compose.guide.pointer,'none');assert.ok(Math.abs(compose.guide.left)<=1&&Math.abs(compose.guide.top)<=1&&Math.abs(compose.guide.right-width)<=1&&Math.abs(compose.guide.bottom-height)<=1,'composition guide must cover the phone viewport');assert.ok(compose.toolbar.left>=-1&&compose.toolbar.right<=width+1&&compose.toolbar.bottom<=height+1,'photo toolbar must stay inside phone viewport');assert.ok(compose.button.height>=43.5&&compose.button.left>=-1&&compose.button.right<=width+1);assert.match(compose.button.text,/三分/);assert.ok(compose.pageScroll<=width+1,'composition UI must not create horizontal page overflow');assert.equal(compose.hitId,'space','pointer-transparent composition guide must leave canvas as central hit target');
    await screenshot(cdp,`capture-quality-${viewport}-compose.png`);

    await tap(cdp,'#photoGuideToggle');await waitUntil(()=>evalJs(cdp,"WarpPhotoMode.guide()==='center'"),'trusted touch center guide');
    const center=await evalJs(cdp,"(()=>{const g=document.querySelector('#photoCompositionGuide');return{mode:WarpPhotoMode.guide(),shown:[...g.querySelectorAll('.photoGuideVC,.photoGuideHC,.photoGuideMark')].filter(el=>getComputedStyle(el).display!=='none').length,text:document.querySelector('#photoGuideToggle')?.textContent}})()");assert.equal(center.mode,'center');assert.equal(center.shown,3);assert.match(center.text,/中心/);await screenshot(cdp,`capture-quality-${viewport}-center.png`);
    await tap(cdp,'#photoGuideToggle');await waitUntil(()=>evalJs(cdp,"WarpPhotoMode.guide()==='off'&&Number(getComputedStyle(document.querySelector('#photoCompositionGuide')).opacity)<.05"),'trusted touch guide off');const off=await evalJs(cdp,"(()=>{const g=document.querySelector('#photoCompositionGuide');return{opacity:Number(getComputedStyle(g).opacity),text:document.querySelector('#photoGuideToggle')?.textContent}})()");assert.ok(off.opacity<.05);assert.match(off.text,/關/);
    await tap(cdp,'#photoGuideToggle');await waitUntil(()=>evalJs(cdp,"WarpPhotoMode.guide()==='thirds'&&Number(getComputedStyle(document.querySelector('#photoCompositionGuide')).opacity)>=.55"),'trusted touch guide cycle back to thirds');

    await evalJs(cdp,"WarpPhotoMode.capture();true");
    await waitUntil(()=>evalJs(cdp,"WarpPhotoMode.capturing()&&WarpSim.state().qualityMode==='high'&&document.querySelector('#app')?.classList.contains('photoCapturing')"),'temporary high-quality capture state',5000);
    const boosted=await evalJs(cdp,"(()=>{const c=document.querySelector('#space'),r=c.getBoundingClientRect(),g=document.querySelector('#photoCompositionGuide'),button=document.querySelector('#photoGuideToggle');return{width:c.width,height:c.height,cssWidth:r.width,cssHeight:r.height,quality:WarpSim.state().qualityMode,guideOpacity:Number(getComputedStyle(g).opacity),guideMode:WarpPhotoMode.guide(),guideDisabled:button.disabled,toolbarOpacity:Number(getComputedStyle(document.querySelector('#photoModeToolbar')).opacity)}})()");
    assert.equal(boosted.quality,'high');assert(boosted.width>=compose.width*1.5,`boosted width ${boosted.width} must materially exceed ${compose.width}`);assert(boosted.height>=compose.height*1.5,`boosted height ${boosted.height} must materially exceed ${compose.height}`);assert.equal(Math.round(boosted.cssWidth),width);assert.equal(Math.round(boosted.cssHeight),height);assert.equal(boosted.guideMode,'thirds');assert.ok(boosted.guideOpacity<.05,'composition guide must be hidden from the capture frame');assert.equal(boosted.guideDisabled,true);assert.ok(boosted.toolbarOpacity<.05,'capture toolbar must be hidden from the capture frame');
    await screenshot(cdp,`capture-quality-${viewport}-boost.png`);
    await waitUntil(()=>evalJs(cdp,"!WarpPhotoMode.capturing()&&WarpSim.state().qualityMode==='low'&&window.__captureEvidence?.pngWidth>0"),'capture completion and quality restore',8000);
    await waitUntil(()=>evalJs(cdp,"Number(getComputedStyle(document.querySelector('#photoCompositionGuide')).opacity)>=.55"),'composition guide restore after capture');
    const after=await evalJs(cdp,"(()=>{const c=document.querySelector('#space'),g=document.querySelector('#photoCompositionGuide');return{width:c.width,height:c.height,quality:WarpSim.state().qualityMode,guide:WarpPhotoMode.guide(),guideOpacity:Number(getComputedStyle(g).opacity),evidence:window.__captureEvidence,toolbarBusy:document.querySelector('#photoModeToolbar')?.getAttribute('aria-busy'),captureDisabled:document.querySelector('#photoModeCapture')?.disabled,guideDisabled:document.querySelector('#photoGuideToggle')?.disabled}})()");
    assert.equal(after.quality,'low');assert.equal(after.width,compose.width);assert.equal(after.height,compose.height);assert.equal(after.guide,'thirds');assert.ok(after.guideOpacity>=.55,'composition guide must return after the clean capture frame');assert.deepEqual(after.evidence.qualityCalls,['high','low']);assert.equal(after.evidence.pngWidth,boosted.width);assert.equal(after.evidence.pngHeight,boosted.height);assert(after.evidence.blobSize>0);assert.match(after.evidence.downloadName,/stellar-wrap-luna-.*\.png$/);assert.equal(after.toolbarBusy,'false');assert.equal(after.captureDisabled,false);assert.equal(after.guideDisabled,false);
    console.log(`Photo Composition + Capture Boost real browser ${viewport}: thirds→center→off→thirds; ${compose.width}×${compose.height} → ${boosted.width}×${boosted.height} clean PNG → restored`);
  }catch(e){if(cdp)await screenshot(cdp,`capture-quality-failure-${viewport}.png`).catch(()=>{});throw e}finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){
  if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Photo Capture Boost browser validation');
  console.log('Photo Composition + Capture Boost browser validation skipped: Chrome/Chromium not available');
  process.exit(0);
}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{
  await waitHttp(base);
  await inspect(chrome,base,390,844);
  await inspect(chrome,base,360,800);
  console.log('Photo Composition Guides + Capture Boost browser validation: passed at 390×844 and 360×800');
}finally{
  await stop(server);
}