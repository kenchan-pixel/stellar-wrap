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
async function waitDrawCalls(cdp,expected=null){return waitUntil(async()=>{const calls=await readDrawCalls(cdp);if(calls<0)return false;if(expected!==null&&calls!==expected)return false;return calls},expected===null?'renderer diagnostic draw sample':`renderer DRAW ${expected}`,10000)}
function assertV3(snapshot,label){
  assert.equal(snapshot.architecture,'phase-threshold-spokes-v3',`${label}: v3 architecture must be live`);
  assert.equal(snapshot.nodes,24,`${label}: existing 24-node instanced budget must remain`);
  assert.equal(snapshot.thresholds,8,`${label}: exactly eight threshold spokes must be active`);
  assert.ok(snapshot.nodeDepthSpan>=4.8&&snapshot.nodeDepthSpan<=snapshot.budgetDepthSpan,`${label}: original collar centre depth remains bounded`);
  assert.ok(snapshot.thresholdSpokeAxialExtent>=4.79&&snapshot.thresholdSpokeAxialExtent<=4.81,`${label}: each authored spoke axial extent ${snapshot.thresholdSpokeAxialExtent} must remain approximately 4.8 local units`);
  assert.ok(snapshot.thresholdEnvelopeDepth>=9.7&&snapshot.thresholdEnvelopeDepth<=snapshot.budgetThresholdEnvelopeDepth,`${label}: aggregate gate-local threshold envelope ${snapshot.thresholdEnvelopeDepth} must remain within ${snapshot.budgetThresholdEnvelopeDepth}`);
}

async function exercise(cdp,width,height){
  const viewport=`${width}x${height}`;
  await evalJs(cdp,"WarpSim.jumpTo('VEGA');WarpSim.setQuality('standard');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpVegaGateDepth.snapshot(),s=WarpCinematicQuality.snapshot();return WarpSim.state().current==='VEGA'&&WarpSim.state().exploring&&x.captured===true&&x.objects===0&&s.objects===0})()"),'safe VEGA Standard exploration');
  await evalJs(cdp,"(()=>{const hud=document.querySelector('#perfHud');if(hud&&!hud.classList.contains('show'))document.querySelector('#diagnosticsToggle')?.click();return true})()");
  const standardFrameCalls=await waitDrawCalls(cdp);
  const standard=await evalJs(cdp,'WarpVegaGateDepth.snapshot()');
  assert.equal(standard.active,false);assert.equal(standard.objects,0);assert.equal(standard.drawCalls,0);assert.equal(standard.triangles,0);assert.equal(standard.nodes,0);assert.equal(standard.thresholds,0);assert.equal(standard.thresholdSpokeAxialExtent,0);assert.equal(standard.thresholdEnvelopeDepth,0);
  const standardShot=await screenshot(cdp,`vega-gate-parallax-${viewport}-standard.png`);

  await evalJs(cdp,"(()=>{WarpPhotoMode.enter();const c=document.querySelector('#space'),original=c.toBlob.bind(c);window.__vegaGateCaptureProbe=[];c.toBlob=function(cb,type,...args){const x=WarpVegaGateDepth.snapshot(),s=WarpCinematicQuality.snapshot();window.__vegaGateCaptureProbe.push({...x,sharedActive:s.active,sharedObjects:s.objects,sharedTriangles:s.triangles,quality:WarpSim.state().qualityMode,width:c.width,height:c.height});return original(cb,type,...args)};return WarpPhotoMode.active()})()");
  await waitUntil(()=>evalJs(cdp,'WarpPhotoMode.active()===true'),'VEGA Photo Mode entry');
  await evalJs(cdp,'WarpPhotoMode.capture();true');
  await waitUntil(()=>evalJs(cdp,'window.__vegaGateCaptureProbe?.length>0'),'VEGA direct Photo Capture export probe',7000);
  const captureProbe=await evalJs(cdp,'window.__vegaGateCaptureProbe[0]');
  assert.equal(captureProbe.active,true,'direct Standard→High Photo Capture includes VEGA gate depth');assert.equal(captureProbe.objects,4);assert.equal(captureProbe.triangles,2560);assert.equal(captureProbe.sharedActive,true);assert.equal(captureProbe.sharedObjects,4);assert.equal(captureProbe.sharedTriangles,12992);assert.equal(captureProbe.quality,'high');assertV3(captureProbe,'direct Standard→High capture');
  assert.ok(captureProbe.width>width&&captureProbe.height>height,'Photo Capture uses larger High backing buffer than CSS viewport');
  await waitUntil(()=>evalJs(cdp,"!WarpPhotoMode.capturing()&&WarpSim.state().qualityMode==='standard'&&WarpVegaGateDepth.snapshot().objects===0"),'VEGA direct capture restores Standard and disposes v3',8000);
  await evalJs(cdp,'WarpPhotoMode.exit();true');

  await evalJs(cdp,"WarpSim.setQuality('high');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpVegaGateDepth.snapshot(),s=WarpCinematicQuality.snapshot();return x.active===true&&x.objects===4&&x.triangles===2560&&x.nodes===24&&x.thresholds===8&&x.thresholdSpokeAxialExtent>=4.79&&x.thresholdEnvelopeDepth>=9.7&&s.active===true&&s.objects===4&&s.triangles===12992})()"),'VEGA phase threshold v3 + shared cinematic High active',7000);
  const highFrameCalls=await waitDrawCalls(cdp,standardFrameCalls+8);assert.equal(highFrameCalls-standardFrameCalls,8,'renderer DRAW delta remains shared High 4 + VEGA 4 calls');
  const high=await evalJs(cdp,'WarpVegaGateDepth.snapshot()');assert.equal(high.visualPass,'parallax-aperture-v1');assert.equal(high.objects,4);assert.equal(high.drawCalls,4);assert.equal(high.triangles,2560);assert.equal(high.budgetTriangles,2560);assertV3(high,'normal High exploration');
  const highShot=await screenshot(cdp,`vega-gate-parallax-${viewport}-high.png`);assert.notEqual(highShot.hash,standardShot.hash,'VEGA Standard and v3 High screenshots differ');assert.ok(highShot.bytes>10000,'VEGA v3 High screenshot contains rendered evidence');
  const viewportState=await evalJs(cdp,"(()=>{const c=document.querySelector('#space'),r=c.getBoundingClientRect();return{cssWidth:r.width,cssHeight:r.height,phase:WarpSim.state().phase,bodyWidth:document.documentElement.scrollWidth}})()");
  assert.equal(Math.round(viewportState.cssWidth),width);assert.equal(Math.round(viewportState.cssHeight),height);assert.equal(viewportState.phase,'explore');assert.ok(viewportState.bodyWidth<=width+1,'VEGA v3 must not create horizontal overflow');

  await evalJs(cdp,"WarpSim.setQuality('low');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpVegaGateDepth.snapshot();return x.active===false&&x.objects===0&&x.drawCalls===0&&x.triangles===0&&x.thresholds===0&&x.thresholdSpokeAxialExtent===0&&x.thresholdEnvelopeDepth===0})()"),'VEGA v3 High to Low disposal');
  const lowFrameCalls=await waitDrawCalls(cdp,standardFrameCalls);assert.equal(lowFrameCalls,standardFrameCalls,'renderer DRAW returns to lower-tier baseline after disposal');
  await evalJs(cdp,"WarpSim.setQuality('high');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpVegaGateDepth.snapshot();return x.active===true&&x.objects===4&&x.thresholds===8&&x.thresholdSpokeAxialExtent>=4.79&&x.thresholdEnvelopeDepth>=9.7})()"),'VEGA v3 High rebuild after Low');
  assertV3(await evalJs(cdp,'WarpVegaGateDepth.snapshot()'),'High rebuild after Low');
  await evalJs(cdp,"WarpSim.jumpTo('SOL');true");await waitUntil(()=>evalJs(cdp,'WarpVegaGateDepth.snapshot().objects===0'),'VEGA v3 departure disposal');
  await evalJs(cdp,"WarpSim.jumpTo('VEGA');WarpSim.setQuality('high');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpVegaGateDepth.snapshot();return x.active===true&&x.objects===4&&x.thresholds===8&&x.thresholdSpokeAxialExtent>=4.79&&x.thresholdEnvelopeDepth>=9.7})()"),'VEGA v3 revisit rebuild',8000);
  const revisit=await evalJs(cdp,'WarpVegaGateDepth.snapshot()');assert.ok(revisit.captureCount>=2,'VEGA revisit recaptures rebuilt core gate anchor');assertV3(revisit,'VEGA revisit');
  console.log(`VEGA Gate v3 real browser ${viewport}: DRAW ${standardFrameCalls}→${highFrameCalls} (+${highFrameCalls-standardFrameCalls})→${lowFrameCalls}; 4 objects / 24 instanced pylons / 8 threshold spokes / 2,560 tris / 4 VEGA draws; collar depth ${high.nodeDepthSpan}/${high.budgetDepthSpan}; spoke axial extent ${high.thresholdSpokeAxialExtent}; aggregate threshold envelope ${high.thresholdEnvelopeDepth}/${high.budgetThresholdEnvelopeDepth}; capture ${captureProbe.width}×${captureProbe.height}; screenshot ${highShot.bytes} bytes sha256 ${highShot.hash.slice(0,16)}…`);
}

async function inspect(chrome,base,width,height){
  const profile=mkdtempSync(join(tmpdir(),`stellar-vega-gate-depth-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}?mode=real`});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpPhotoMode&&!!window.WarpCinematicQuality&&!!window.WarpVegaGateDepth&&document.querySelector('#app')?.classList.contains('ready')"),'production WebGL + Photo Mode + VEGA v3',30000);
    await exercise(cdp,width,height);
  }catch(error){if(cdp)await screenshot(cdp,`vega-gate-parallax-failure-${width}x${height}.png`).catch(()=>{});throw error}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for VEGA gate-depth browser validation');console.log('VEGA gate-depth browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('VEGA Gate v3 browser validation: Photo Capture + measured renderer budget + clarified depth diagnostics + lifecycle passed at 390×844 and 360×800')}finally{await stop(server)}