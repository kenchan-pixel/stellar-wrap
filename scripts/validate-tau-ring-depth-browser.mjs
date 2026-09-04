import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const EVIDENCE_DIR=join(process.cwd(),'artifacts','focus-tray-browser');
function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const candidate of[process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(candidate);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=20000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)},queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return{bytes:data.length,hash:createHash('sha256').update(data).digest('hex')}}
async function readDrawCalls(cdp){return evalJs(cdp,"(()=>{const m=(document.querySelector('#perfHud')?.textContent||'').match(/DRAW\\s+(\\d+)/);return m?Number(m[1]):-1})()")}
async function waitDrawCalls(cdp,expected=null,timeout=10000){return waitUntil(async()=>{const calls=await readDrawCalls(cdp);if(calls<0)return false;if(expected!==null&&calls!==expected)return false;return calls},expected===null?'renderer diagnostic draw-call sample':`renderer diagnostic DRAW ${expected}`,timeout)}
function assertDepth(snapshot,label){assert.ok(snapshot.shepherdDepthSpan>=4.2&&snapshot.shepherdDepthSpan<=snapshot.budgetDepthSpan,`${label}: shepherd depth span ${snapshot.shepherdDepthSpan} must prove near/far separation without exceeding ${snapshot.budgetDepthSpan}`)}
function assertShepherdArc(snapshot,label,active=true){
  assert.equal(snapshot.architecture,'shepherd-arc-v2',`${label}: live TAU architecture diagnostic must remain shepherd-arc-v2`);
  assert.equal(snapshot.budgetScaleMax,4.6,`${label}: shepherd scale budget must remain 4.6`);
  if(active){
    assert.equal(snapshot.shepherdScaleMin,2.5,`${label}: live minimum shepherd major scale must remain 2.5`);
    assert.equal(snapshot.shepherdScaleMax,4.6,`${label}: live maximum shepherd major scale must remain 4.6`);
  }else{
    assert.equal(snapshot.shepherdScaleMin,0,`${label}: disposed shepherd diagnostics must reset minimum scale to zero`);
    assert.equal(snapshot.shepherdScaleMax,0,`${label}: disposed shepherd diagnostics must reset maximum scale to zero`);
  }
}

async function exercise(cdp,width,height){
  const viewport=`${width}x${height}`;
  await evalJs(cdp,"WarpSim.jumpTo('TAU');WarpSim.setQuality('standard');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot(),s=WarpCinematicQuality.snapshot();return WarpSim.state().current==='TAU'&&WarpSim.state().exploring&&x.captured===true&&x.objects===0&&s.objects===0})()"),'safe TAU Standard exploration');
  await evalJs(cdp,"(()=>{const hud=document.querySelector('#perfHud');if(hud&&!hud.classList.contains('show'))document.querySelector('#diagnosticsToggle')?.click();return true})()");
  const standardFrameCalls=await waitDrawCalls(cdp,null,20000);
  const standard=await evalJs(cdp,'WarpTauRingDepth.snapshot()');
  assert.equal(standard.active,false);assert.equal(standard.objects,0);assert.equal(standard.drawCalls,0);assert.equal(standard.triangles,0);assert.equal(standard.shepherds,0);assert.equal(standard.shepherdDepthSpan,0);assert.equal(standard.captured,true);assertShepherdArc(standard,'Standard exploration',false);
  const standardShot=await screenshot(cdp,`tau-ring-shadow-depth-${viewport}-standard.png`);

  await evalJs(cdp,"(()=>{WarpPhotoMode.enter();const c=document.querySelector('#space'),original=c.toBlob.bind(c);window.__tauRingCaptureProbe=[];c.toBlob=function(cb,type,...args){const x=WarpTauRingDepth.snapshot(),s=WarpCinematicQuality.snapshot();window.__tauRingCaptureProbe.push({active:x.active,architecture:x.architecture,objects:x.objects,triangles:x.triangles,shepherds:x.shepherds,shepherdDepthSpan:x.shepherdDepthSpan,budgetDepthSpan:x.budgetDepthSpan,shepherdScaleMin:x.shepherdScaleMin,shepherdScaleMax:x.shepherdScaleMax,budgetScaleMax:x.budgetScaleMax,sharedActive:s.active,sharedObjects:s.objects,sharedTriangles:s.triangles,quality:WarpSim.state().qualityMode,width:c.width,height:c.height});return original(cb,type,...args)};return WarpPhotoMode.active()})()");
  await waitUntil(()=>evalJs(cdp,'WarpPhotoMode.active()===true'),'TAU Photo Mode entry');
  await evalJs(cdp,'WarpPhotoMode.capture();true');
  await waitUntil(()=>evalJs(cdp,'window.__tauRingCaptureProbe?.length>0'),'TAU direct Photo Capture export probe',7000);
  const captureProbe=await evalJs(cdp,'window.__tauRingCaptureProbe[0]');
  assert.equal(captureProbe.active,true,'direct Standard→High Photo Capture must include TAU ring depth at PNG extraction');assert.equal(captureProbe.objects,4);assert.equal(captureProbe.triangles,2912);assert.equal(captureProbe.shepherds,16);assert.equal(captureProbe.sharedActive,true);assert.equal(captureProbe.sharedObjects,4);assert.equal(captureProbe.sharedTriangles,8352);assert.equal(captureProbe.quality,'high');assertDepth(captureProbe,'direct Standard→High capture');assertShepherdArc(captureProbe,'direct Standard→High capture');
  assert.ok(captureProbe.width>width&&captureProbe.height>height,'Photo Capture must use a larger High backing buffer than the CSS viewport');
  await waitUntil(()=>evalJs(cdp,"!WarpPhotoMode.capturing()&&WarpSim.state().qualityMode==='standard'&&WarpTauRingDepth.snapshot().objects===0"),'TAU direct capture restores Standard and disposes ring depth',8000);
  const postCaptureStandard=await evalJs(cdp,'WarpTauRingDepth.snapshot()');assertShepherdArc(postCaptureStandard,'post-capture Standard restore',false);
  await evalJs(cdp,'WarpPhotoMode.exit();true');

  await evalJs(cdp,"WarpSim.setQuality('high');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot(),s=WarpCinematicQuality.snapshot();return x.active===true&&x.objects===4&&x.triangles===2912&&x.shepherds===16&&x.shepherdDepthSpan>=4.2&&x.architecture==='shepherd-arc-v2'&&x.shepherdScaleMin===2.5&&x.shepherdScaleMax===4.6&&s.active===true&&s.objects===4&&s.triangles===8352})()"),'TAU shepherd arc v2 + shared cinematic High active',7000);
  const highFrameCalls=await waitDrawCalls(cdp,standardFrameCalls+8);assert.equal(highFrameCalls-standardFrameCalls,8,'actual renderer DRAW delta must equal shared High 4 + TAU ring depth 4 calls');
  const high=await evalJs(cdp,'WarpTauRingDepth.snapshot()');assert.equal(high.visualPass,'ring-shadow-parallax-v1');assert.equal(high.objects,4);assert.equal(high.shepherds,16);assert.equal(high.drawCalls,4);assert.equal(high.triangles,2912);assert.equal(high.budgetTriangles,2912);assertDepth(high,'normal High exploration');assertShepherdArc(high,'normal High exploration');
  const highShot=await screenshot(cdp,`tau-ring-shadow-depth-${viewport}-high.png`);assert.notEqual(highShot.hash,standardShot.hash,'TAU Standard and ring-depth High screenshots must differ');
  const viewportState=await evalJs(cdp,"(()=>{const c=document.querySelector('#space'),r=c.getBoundingClientRect();return{cssWidth:r.width,cssHeight:r.height,phase:WarpSim.state().phase,bodyWidth:document.documentElement.scrollWidth}})()");
  assert.equal(Math.round(viewportState.cssWidth),width);assert.equal(Math.round(viewportState.cssHeight),height);assert.equal(viewportState.phase,'explore');assert.ok(viewportState.bodyWidth<=width+1,'TAU ring depth must not create horizontal viewport overflow');

  await evalJs(cdp,"WarpSim.setQuality('low');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot(),s=WarpCinematicQuality.snapshot();return WarpSim.state().qualityMode==='low'&&x.active===false&&x.objects===0&&x.drawCalls===0&&x.triangles===0&&x.shepherds===0&&x.shepherdDepthSpan===0&&x.shepherdScaleMin===0&&x.shepherdScaleMax===0&&s.objects===0})()"),'TAU ring depth and shared cinematic High to Low disposal');
  const low=await evalJs(cdp,'WarpTauRingDepth.snapshot()');assertShepherdArc(low,'adaptive Low disposal',false);
  const lowFrameCalls=await waitUntil(async()=>{const calls=await readDrawCalls(cdp);return calls>=0&&calls<=standardFrameCalls?calls:false},`settled adaptive Low renderer DRAW at or below Standard ${standardFrameCalls}`,10000);
  assert.ok(lowFrameCalls<=standardFrameCalls,`adaptive Low renderer DRAW ${lowFrameCalls} must not exceed Standard baseline ${standardFrameCalls} after shared + TAU High disposal`);
  await evalJs(cdp,"WarpSim.setQuality('standard');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot(),s=WarpCinematicQuality.snapshot();return WarpSim.state().qualityMode==='standard'&&x.objects===0&&x.shepherdScaleMin===0&&x.shepherdScaleMax===0&&s.objects===0})()"),'TAU Standard baseline restore after Low');
  const restoredStandard=await evalJs(cdp,'WarpTauRingDepth.snapshot()');assertShepherdArc(restoredStandard,'Standard restore after Low',false);
  const restoredStandardCalls=await waitDrawCalls(cdp,standardFrameCalls);assert.equal(restoredStandardCalls,standardFrameCalls,'returning from adaptive Low to Standard must restore the original renderer DRAW baseline');
  await evalJs(cdp,"WarpSim.setQuality('high');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot();return x.active===true&&x.objects===4&&x.triangles===2912&&x.shepherds===16&&x.shepherdDepthSpan>=4.2&&x.architecture==='shepherd-arc-v2'&&x.shepherdScaleMin===2.5&&x.shepherdScaleMax===4.6})()"),'TAU shepherd arc v2 High rebuild after Low');
  const rebuilt=await evalJs(cdp,'WarpTauRingDepth.snapshot()');assertDepth(rebuilt,'High rebuild after Low');assertShepherdArc(rebuilt,'High rebuild after Low');
  await evalJs(cdp,"WarpSim.jumpTo('SOL');true");await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot();return x.objects===0&&x.shepherdScaleMin===0&&x.shepherdScaleMax===0})()"),'TAU ring depth departure disposal');
  const departed=await evalJs(cdp,'WarpTauRingDepth.snapshot()');assertShepherdArc(departed,'TAU departure disposal',false);
  await evalJs(cdp,"WarpSim.jumpTo('TAU');WarpSim.setQuality('high');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot();return x.active===true&&x.objects===4&&x.triangles===2912&&x.shepherds===16&&x.shepherdDepthSpan>=4.2&&x.architecture==='shepherd-arc-v2'&&x.shepherdScaleMin===2.5&&x.shepherdScaleMax===4.6})()"),'TAU shepherd arc v2 revisit rebuild',8000);
  const revisit=await evalJs(cdp,'WarpTauRingDepth.snapshot()');assert.ok(revisit.captureCount>=2,'TAU revisit must recapture rebuilt core planet anchor');assertDepth(revisit,'TAU revisit');assertShepherdArc(revisit,'TAU revisit');
  console.log(`TAU Shepherd Arc v2 real browser ${viewport}: live architecture ${high.architecture}; scale ${high.shepherdScaleMin}–${high.shepherdScaleMax}/${high.budgetScaleMax}; actual renderer DRAW Standard ${standardFrameCalls}→High ${highFrameCalls} (+${highFrameCalls-standardFrameCalls})→Low ${lowFrameCalls}→Standard ${restoredStandardCalls}; extension 4 objects / 16 instanced shepherds / 2,912 tris / 4 measured incremental draws; live ring depth ${high.shepherdDepthSpan}/${high.budgetDepthSpan}; direct capture ${captureProbe.width}×${captureProbe.height}; disposal diagnostics reset + Standard restore + rebuild + revisit passed; High screenshot ${highShot.bytes} bytes sha256 ${highShot.hash.slice(0,16)}…`);
}

async function inspect(chrome,base,width,height){
  const profile=mkdtempSync(join(tmpdir(),`stellar-tau-ring-depth-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
    browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}?mode=real`});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpPhotoMode&&!!window.WarpCinematicQuality&&!!window.WarpTauRingDepth&&document.querySelector('#app')?.classList.contains('ready')"),'production WebGL + Photo Mode + TAU ring depth layer',30000);
    await exercise(cdp,width,height);
  }catch(error){if(cdp)await screenshot(cdp,`tau-ring-shadow-depth-failure-${width}x${height}.png`).catch(()=>{});throw error}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for TAU ring-depth browser validation');console.log('TAU ring-depth browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('TAU Shepherd Arc v2 browser validation: live architecture + bounded shepherd scale diagnostics + Photo Capture + measured renderer draw budget + disposal-reset/lifecycle passed at 390×844 and 360×800')}finally{await stop(server)}