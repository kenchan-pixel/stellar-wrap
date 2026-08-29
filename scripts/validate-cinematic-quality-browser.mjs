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
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(t);res()},{once:true});this.ws.addEventListener('error',e=>{clearTimeout(t);rej(e.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(!m.id){const q=this.events.get(m.method)||[];this.events.delete(m.method);q.forEach(w=>{clearTimeout(w.t);w.r(m.params||{})});return}const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(p.t);m.error?p.j(new Error(m.error.message)):p.r(m.result||{})})}send(method,params={},timeout=12000){const id=++this.id;return new Promise((r,j)=>{const t=setTimeout(()=>{this.pending.delete(id);j(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{r,j,t});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=12000){return new Promise((r,j)=>{const w={r,j,t:setTimeout(()=>j(new Error(`event timeout ${method}`)),timeout)};const q=this.events.get(method)||[];q.push(w);this.events.set(method,q)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const r=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(r.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}
async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-cinematic-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',c=>stderr=(stderr+String(c)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const r=await fetch(`http://127.0.0.1:${port}/json/list`),a=await r.json();return a.find(x=>x.type==='page'&&x.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:base});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpCinematicQuality&&document.querySelector('#app')?.classList.contains('ready')"),'production WebGL + cinematic layer',30000);
    await evalJs(cdp,"WarpSim.jumpTo('TAU');WarpSim.setQuality('standard');true");
    await waitUntil(()=>evalJs(cdp,"WarpSim.state().current==='TAU'&&WarpSim.state().exploring&&WarpCinematicQuality.snapshot().quality==='standard'"),'safe TAU Standard exploration');
    const standard=await evalJs(cdp,"WarpCinematicQuality.snapshot()");assert.equal(standard.active,false);assert.equal(standard.quality,'standard');assert.equal(standard.objects,0);assert.equal(standard.drawCalls,0);
    const standardBytes=await screenshot(cdp,`cinematic-tau-${viewport}-standard.png`);

    await evalJs(cdp,"WarpSim.setQuality('high');true");
    await waitUntil(()=>evalJs(cdp,"WarpCinematicQuality.snapshot().active===true"),'TAU High cinematic layer active',5000);
    const high=await evalJs(cdp,"WarpCinematicQuality.snapshot()");assert.equal(high.active,true);assert.equal(high.quality,'high');assert.equal(high.objects,4);assert.equal(high.drawCalls,4);assert.equal(high.triangles,8352);
    const highBytes=await screenshot(cdp,`cinematic-tau-${viewport}-high.png`);assert.notEqual(highBytes,standardBytes,'standard and High evidence should not serialize identically');
    const viewportState=await evalJs(cdp,"(()=>{const c=document.querySelector('#space'),r=c.getBoundingClientRect();return{cssWidth:r.width,cssHeight:r.height,backingWidth:c.width,backingHeight:c.height,phase:WarpSim.state().phase}})()");
    assert.equal(Math.round(viewportState.cssWidth),width);assert.equal(Math.round(viewportState.cssHeight),height);assert.equal(viewportState.phase,'explore');

    await evalJs(cdp,"WarpSim.setQuality('low');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const s=WarpCinematicQuality.snapshot();return s.active===false&&s.objects===0&&s.drawCalls===0})()"),'High to Low cinematic GPU disposal');
    const low=await evalJs(cdp,"WarpCinematicQuality.snapshot()");assert.equal(low.objects,0);assert.equal(low.drawCalls,0);

    await evalJs(cdp,"WarpSim.setQuality('high');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const s=WarpCinematicQuality.snapshot();return s.active===true&&s.objects===4&&s.drawCalls===4})()"),'High cinematic layer rebuild after Low');
    const rebuilt=await evalJs(cdp,"WarpCinematicQuality.snapshot()");assert.equal(rebuilt.triangles,8352);

    await evalJs(cdp,"WarpSim.jumpTo('SOL');true");
    await waitUntil(()=>evalJs(cdp,"WarpSim.state().current==='SOL'&&WarpCinematicQuality.snapshot().objects===0"),'TAU departure cinematic GPU disposal');
    await evalJs(cdp,"WarpSim.jumpTo('TAU');WarpSim.setQuality('high');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const s=WarpCinematicQuality.snapshot();return WarpSim.state().current==='TAU'&&s.active===true&&s.objects===4&&s.drawCalls===4})()"),'TAU revisit High cinematic rebuild',7000);
    const revisit=await evalJs(cdp,"WarpCinematicQuality.snapshot()");assert.equal(revisit.triangles,8352);assert.ok(revisit.captureCount>=2,'TAU revisit should recapture the rebuilt core root');

    console.log(`TAU Cinematic High real browser ${viewport}: 4 bounded 3D layers, ${high.triangles} tris; High→Low releases GPU objects, High rebuilds, TAU round-trip rebuilds; High evidence ${highBytes} bytes; Standard ${standardBytes} bytes`);
  }catch(e){if(cdp)await screenshot(cdp,`cinematic-tau-failure-${viewport}.png`).catch(()=>{});throw e}finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}
const chrome=findChrome();if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for cinematic quality browser validation');console.log('Cinematic quality browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('TAU Cinematic High browser validation: passed at 390×844 and 360×800')}finally{await stop(server)}
