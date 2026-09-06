import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const candidate of[process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const path=commandPath(candidate);if(path)return path}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=20000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}

class Cdp{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}
  async connect(){
    this.ws=new WebSocket(this.url);
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});
    this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})
  }
  send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}
  waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)},queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}
  close(){try{this.ws?.close()}catch{}}
}
async function evalJs(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
function assertBand(snapshot,label,active){assert.equal(snapshot.ringBandPass,'resonance-gap-banding-v1',`${label}: live band-pass diagnostic must remain resonance-gap-banding-v1`);assert.equal(snapshot.ringGapBands,active?3:0,`${label}: live resonance-gap count must ${active?'remain 3':'reset to 0'}`)}

async function exercise(cdp,width,height){
  const viewport=`${width}x${height}`;
  await evalJs(cdp,"WarpSim.jumpTo('TAU');WarpSim.setQuality('standard');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot();return WarpSim.state().current==='TAU'&&WarpSim.state().exploring&&x.captured===true&&x.objects===0})()"),'safe TAU Standard exploration');
  const standard=await evalJs(cdp,'WarpTauRingDepth.snapshot()');assertBand(standard,`${viewport} Standard`,false);

  await evalJs(cdp,"(()=>{WarpPhotoMode.enter();const c=document.querySelector('#space'),original=c.toBlob.bind(c);window.__tauBandCaptureProbe=[];c.toBlob=function(cb,type,...args){const x=WarpTauRingDepth.snapshot();window.__tauBandCaptureProbe.push({ringBandPass:x.ringBandPass,ringGapBands:x.ringGapBands,active:x.active,objects:x.objects,quality:WarpSim.state().qualityMode});return original(cb,type,...args)};return true})()");
  await waitUntil(()=>evalJs(cdp,'WarpPhotoMode.active()===true'),'TAU Photo Mode entry');
  await evalJs(cdp,'WarpPhotoMode.capture();true');
  await waitUntil(()=>evalJs(cdp,'window.__tauBandCaptureProbe?.length>0'),'TAU resonance-gap capture probe',7000);
  const capture=await evalJs(cdp,'window.__tauBandCaptureProbe[0]');assert.equal(capture.active,true);assert.equal(capture.objects,4);assert.equal(capture.quality,'high');assertBand(capture,`${viewport} direct Photo Capture`,true);
  await waitUntil(()=>evalJs(cdp,"!WarpPhotoMode.capturing()&&WarpSim.state().qualityMode==='standard'&&WarpTauRingDepth.snapshot().objects===0"),'Photo Capture restore');
  assertBand(await evalJs(cdp,'WarpTauRingDepth.snapshot()'),`${viewport} post-capture restore`,false);
  await evalJs(cdp,'WarpPhotoMode.exit();WarpSim.setQuality(\'high\');true');

  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot();return x.active===true&&x.ringBandPass==='resonance-gap-banding-v1'&&x.ringGapBands===3})()"),'TAU Resonance Gap Banding High active');
  assertBand(await evalJs(cdp,'WarpTauRingDepth.snapshot()'),`${viewport} High`,true);
  await evalJs(cdp,"WarpSim.setQuality('low');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot();return x.objects===0&&x.ringGapBands===0})()"),'TAU Low disposal');
  assertBand(await evalJs(cdp,'WarpTauRingDepth.snapshot()'),`${viewport} Low disposal`,false);
  await evalJs(cdp,"WarpSim.setQuality('high');true");
  await waitUntil(()=>evalJs(cdp,"WarpTauRingDepth.snapshot().ringGapBands===3"),'TAU High rebuild');
  assertBand(await evalJs(cdp,'WarpTauRingDepth.snapshot()'),`${viewport} High rebuild`,true);
  await evalJs(cdp,"WarpSim.jumpTo('SOL');true");
  await waitUntil(()=>evalJs(cdp,"WarpTauRingDepth.snapshot().ringGapBands===0"),'TAU departure disposal');
  assertBand(await evalJs(cdp,'WarpTauRingDepth.snapshot()'),`${viewport} departure`,false);
  await evalJs(cdp,"WarpSim.jumpTo('TAU');WarpSim.setQuality('high');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpTauRingDepth.snapshot();return x.ringGapBands===3&&x.captureCount>=2})()"),'TAU revisit rebuild');
  assertBand(await evalJs(cdp,'WarpTauRingDepth.snapshot()'),`${viewport} revisit`,true);
  console.log(`TAU Resonance Gap Banding browser ${viewport}: live pass + 3 active gaps + capture + disposal/rebuild/revisit diagnostics passed`);
}

async function inspect(chrome,base,width,height){
  const profile=mkdtempSync(join(tmpdir(),`stellar-tau-resonance-gap-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}?mode=real`});await loaded;await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpPhotoMode&&!!window.WarpTauRingDepth&&document.querySelector('#app')?.classList.contains('ready')"),'production TAU runtime',30000);await exercise(cdp,width,height);
  }finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for TAU resonance-gap browser validation');console.log('TAU resonance-gap browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('TAU Resonance Gap Banding browser validation: live v3 diagnostics passed at 390×844 and 360×800')}finally{await stop(server)}
