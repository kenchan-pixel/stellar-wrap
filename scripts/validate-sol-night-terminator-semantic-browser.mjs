import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const candidate of[process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(candidate);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=20000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
class Cdp{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}
  async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}
  send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}
  waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)},queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}
  close(){try{this.ws?.close()}catch{}}
}
async function evalJs(cdp,expression){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function inspect(chrome,base){
  const width=390,height=844,profile=mkdtempSync(join(tmpdir(),'stellar-sol-terminator-semantic-'));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}?mode=real`});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpSolOrbitalFrame&&document.querySelector('#app')?.classList.contains('ready')"),'production WebGL + SOL v4',30000);
    await evalJs(cdp,"WarpSim.jumpTo('SOL');WarpSim.setQuality('standard');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpSolOrbitalFrame.snapshot();return WarpSim.state().current==='SOL'&&WarpSim.state().exploring&&x.captured===true&&x.objects===0})()"),'SOL Standard baseline');
    const standard=await evalJs(cdp,'WarpSolOrbitalFrame.snapshot()');
    assert.equal(standard.baseEmissionSuppressed,false,'Standard must keep the core Earth emissive path untouched');
    assert.ok(Math.abs(standard.baseEmissionIntensity-.82)<.0001,`Standard base city emissive intensity expected .82, got ${standard.baseEmissionIntensity}`);

    await evalJs(cdp,"WarpSim.setQuality('high');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpSolOrbitalFrame.snapshot();return x.active&&x.baseEmissionSuppressed&&x.baseEmissionIntensity===0&&x.cityVisibility?.night>0})()"),'SOL High terminator ownership');
    const high=await evalJs(cdp,'WarpSolOrbitalFrame.snapshot()');
    assert.equal(high.nightProfile,'earth-night-terminator-v4');
    assert.equal(high.baseEmissionSuppressed,true,'High must suppress the unmasked core city-light emission');
    assert.equal(high.baseEmissionIntensity,0,'High core Earth emissive intensity must be zero while v4 owns city lights');
    assert.ok(Math.abs(high.baseEmissionRestoreIntensity-standard.baseEmissionIntensity)<.0001,'High must preserve the exact prior core emissive intensity for restoration');
    assert.ok(high.cityVisibility.atlasPeak>.8,'semantic sample must come from a non-empty live procedural city atlas');
    assert.equal(high.cityVisibility.day,0,'day hemisphere city visibility must be fully masked');
    assert.ok(high.cityVisibility.night>.75,'night hemisphere city visibility must remain strong');
    assert.ok(high.cityVisibility.night>high.cityVisibility.terminator&&high.cityVisibility.terminator>high.cityVisibility.day,'night > terminator > day semantic contrast must hold');

    await evalJs(cdp,"WarpSim.setQuality('low');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpSolOrbitalFrame.snapshot();return x.objects===0&&!x.baseEmissionSuppressed&&Math.abs((x.baseEmissionIntensity??0)-.82)<.0001})()"),'High→Low exact base-emission restoration');
    const low=await evalJs(cdp,'WarpSolOrbitalFrame.snapshot()');
    assert.ok(Math.abs(low.baseEmissionIntensity-standard.baseEmissionIntensity)<.0001,'downgrade must restore the exact Standard city emissive intensity');
    assert.equal(low.cityVisibility,null,'inactive tier must clear terminator semantic samples');

    await evalJs(cdp,"WarpSim.setQuality('high');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpSolOrbitalFrame.snapshot();return x.active&&x.baseEmissionSuppressed&&x.cityVisibility?.night>x.cityVisibility?.terminator})()"),'Low→High suppression rebuild');
    await evalJs(cdp,"WarpSim.jumpTo('LUNA');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpSolOrbitalFrame.snapshot();return x.objects===0&&!x.baseEmissionSuppressed&&Math.abs((x.baseEmissionIntensity??0)-.82)<.0001})()"),'SOL departure base-emission restoration');
    const viewport=await evalJs(cdp,"(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,phase:WarpSim.state().phase}))()");
    assert.ok(viewport.w<=width+1,'semantic fix must not introduce horizontal overflow');
    console.log(`SOL terminator semantic browser: Standard emissive ${standard.baseEmissionIntensity} → High ${high.baseEmissionIntensity}; visibility day ${high.cityVisibility.day}, terminator ${high.cityVisibility.terminator}, night ${high.cityVisibility.night}; Low restored ${low.baseEmissionIntensity}; lifecycle passed`);
  }finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for SOL terminator semantic validation');console.log('SOL terminator semantic browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base);console.log('SOL Earth Night Terminator semantic browser validation: passed')}finally{await stop(server)}