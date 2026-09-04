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
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const a=server.address(),port=typeof a==='object'&&a?a.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=20000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);for(const waiter of queue){clearTimeout(waiter.timer);waiter.resolve(message.params||{})}return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)},queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return{bytes:data.length,hash:createHash('sha256').update(data).digest('hex')}}

async function exercise(cdp,width,height){
  const viewport=`${width}x${height}`;
  await evalJs(cdp,"WarpSim.jumpTo('PROX');WarpSim.setQuality('standard');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpProxStarportTransit.snapshot();return WarpSim.state().current==='PROX'&&WarpSim.state().exploring&&x.captured===true&&x.objects===0})()"),'PROX Standard baseline');
  const standardShot=await screenshot(cdp,`prox-parallax-${viewport}-standard.png`);

  await evalJs(cdp,"WarpSim.setQuality('high');true");
  const high=await waitUntil(async()=>{const x=await evalJs(cdp,'WarpProxStarportTransit.snapshot()');return x?.active&&x.objects===4&&x.triangles===2520&&x.laneDepthSpan>3.5&&x.laneDepthSpan<3.6&&x.laneScaleRatio>1.14&&x.laneScaleRatio<1.16?x:false},'PROX live parallax lane profile',8000);
  assert.equal(high.visualPass,'starport-transit-lattice-v2');
  assert.equal(high.drawCalls,4);assert.equal(high.beacons,36);assert.equal(high.gantryBeams,18);
  assert.equal(high.laneDepthBudget,3.6);assert(high.foregroundDepthLead>7.9&&high.foregroundDepthLead<=high.depthBudget,`foreground lead must stay inside ${high.depthBudget}, got ${high.foregroundDepthLead}`);
  const highShot=await screenshot(cdp,`prox-parallax-${viewport}-high.png`);
  assert(highShot.bytes>10000,'High parallax screenshot must contain rendered frame data');
  assert.notEqual(highShot.hash,standardShot.hash,'Standard and High parallax evidence must differ');
  const viewportState=await evalJs(cdp,"(()=>{const r=document.querySelector('#space').getBoundingClientRect();return{width:r.width,height:r.height,phase:WarpSim.state().phase}})()");
  assert.equal(Math.round(viewportState.width),width);assert.equal(Math.round(viewportState.height),height);assert.equal(viewportState.phase,'explore');

  await evalJs(cdp,"WarpSim.setQuality('low');true");
  await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpProxStarportTransit.snapshot();return x.active===false&&x.objects===0&&x.laneDepthSpan===0&&x.laneScaleRatio===0})()"),'PROX parallax disposal');
  console.log(`PROX parallax real browser ${viewport}: lane depth ${high.laneDepthSpan.toFixed(2)}/${high.laneDepthBudget}, scale ratio ${high.laneScaleRatio.toFixed(3)}x, foreground lead ${high.foregroundDepthLead.toFixed(2)}/${high.depthBudget}, High screenshot ${highShot.bytes} bytes sha256 ${highShot.hash.slice(0,16)}…`);
}
async function inspect(chrome,base,width,height){const profile=mkdtempSync(join(tmpdir(),`stellar-prox-parallax-${width}-`));let browser,cdp,stderr='';try{const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}?mode=real`});await loaded;await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpProxStarportTransit&&document.querySelector('#app')?.classList.contains('ready')"),'production WebGL + PROX transit layer',30000);await exercise(cdp,width,height)}catch(error){if(cdp)await screenshot(cdp,`prox-parallax-failure-${width}x${height}.png`).catch(()=>{});throw error}finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}}

const chrome=findChrome();if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for PROX parallax browser validation');console.log('PROX parallax browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('PROX parallax browser validation: live depth/scale profile + screenshots + disposal passed at 390×844 and 360×800')}finally{await stop(server)}
