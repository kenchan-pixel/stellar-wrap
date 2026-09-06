import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const EVIDENCE_DIR=join(process.cwd(),'artifacts','frontier-destination-handoff');
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
async function evalJs(cdp,expression,awaitPromise=false){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise},awaitPromise?20000:12000);if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const r=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});writeFileSync(join(EVIDENCE_DIR,name),Buffer.from(r.data,'base64'))}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-nadir-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',c=>stderr=(stderr+String(c)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const r=await fetch(`http://127.0.0.1:${port}/json/list`),a=await r.json();return a.find(x=>x.type==='page'&&x.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}frontier-nadir.html?test=1`});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpFrontierNadir&&document.querySelector('#nadirApp')?.classList.contains('ready')"),'NADIR production scene',30000);
    const webgl=await evalJs(cdp,"(()=>{const c=document.querySelector('#nadirSpace');return !!(c.getContext('webgl2')||c.getContext('webgl'))})()");assert.equal(webgl,true,'NADIR canvas owns a WebGL context');
    await evalJs(cdp,"WarpFrontierNadir.skipArrival();true");
    await waitUntil(()=>evalJs(cdp,"WarpFrontierNadir.state().phase==='explore'"),'fixed final scenic phase');
    await sleep(180);
    const before=await evalJs(cdp,`(()=>{const s=WarpFrontierNadir.state(),c=document.querySelector('#nadirSpace'),r=c.getBoundingClientRect();return{...s,cssWidth:r.width,cssHeight:r.height,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}})()`);
    assert.equal(before.visualId,'NADIR_FIXED_LENSING_V4');assert.equal(before.qualityId,'NADIR_OBSERVATORY_DEPTH_V3');assert.equal(before.observatoryProfile,'NADIR_INTERFEROMETER_FRAME_V1');assert.equal(before.fixed,true);assert.equal(before.autoOrbit,false);assert.equal(before.vista,'overview');assert.equal(before.portalRing,false);assert.equal(before.jets,false);assert.equal(before.causticSheet,true);assert.equal(before.lensedStreaks,true);assert.equal(before.observatoryFrame,true);assert.equal(before.collectorRings,3);assert.equal(before.trussBeams,12);assert.equal(before.receiverPods,12);assert.equal(before.depthBeacons,10);assert.equal(before.eventHorizon,true);assert.equal(before.lensingCrown,true);assert.ok(before.pixelRatio<=1.251,'normal DPR must stay <=1.25');assert.equal(Math.round(before.cssWidth),width);assert.equal(Math.round(before.cssHeight),height);assert.ok(before.scrollWidth<=width+1&&before.scrollHeight<=height+1,'fixed scene must not create viewport overflow');assert.ok(before.drawCalls>0&&before.drawCalls<=20,`bounded draw calls expected, got ${before.drawCalls}`);assert.ok(before.triangles>0&&before.triangles<=20000,`bounded triangles expected, got ${before.triangles}`);
    await screenshot(cdp,`nadir-observatory-depth-${viewport}.png`);
    const captured=await evalJs(cdp,"WarpFrontierNadir.capture(false)",true);
    assert.ok(captured?.blobSize>0,'capture must return a non-empty PNG');assert.ok(captured.width>=before.backingWidth*1.2,`capture width ${captured.width} must materially exceed normal ${before.backingWidth}`);assert.ok(captured.height>=before.backingHeight*1.2,`capture height ${captured.height} must materially exceed normal ${before.backingHeight}`);
    await waitUntil(()=>evalJs(cdp,`(()=>{const s=WarpFrontierNadir.state();return !s.capturing&&Math.abs(s.pixelRatio-${Number(before.pixelRatio)})<.01&&s.backingWidth===${Number(before.backingWidth)}&&s.backingHeight===${Number(before.backingHeight)}})()`),'capture DPR and backing-buffer restore',5000);
    const after=await evalJs(cdp,'WarpFrontierNadir.state()');
    assert.equal(after.qualityId,'NADIR_OBSERVATORY_DEPTH_V3');assert.equal(after.observatoryProfile,'NADIR_INTERFEROMETER_FRAME_V1');assert.equal(after.observatoryFrame,true);assert.equal(after.collectorRings,3);assert.equal(after.trussBeams,12);assert.equal(after.receiverPods,12);assert.equal(after.depthBeacons,10);assert.equal(after.backingWidth,before.backingWidth);assert.equal(after.backingHeight,before.backingHeight);
    console.log(`NADIR Observatory Depth v3 real browser ${viewport}: ${before.drawCalls} draws / ${before.triangles} triangles / 3 collectors / 12 truss beams / 12 receivers / 10 depth beacons; capture ${captured.width}×${captured.height} → restored DPR ${after.pixelRatio}`);
  }catch(e){if(cdp)await screenshot(cdp,`nadir-observatory-depth-failure-${viewport}.png`).catch(()=>{});throw e}finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){
  if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for NADIR observatory-depth browser validation');
  console.log('NADIR Observatory Depth browser validation skipped: Chrome/Chromium not available');
  process.exit(0);
}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{
  await waitHttp(base);
  await inspect(chrome,base,390,844);
  await inspect(chrome,base,360,800);
  console.log('NADIR Observatory Depth v3 + Capture Boost browser validation: passed at 390×844 and 360×800');
}finally{
  await stop(server);
}
