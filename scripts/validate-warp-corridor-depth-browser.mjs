import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const EVIDENCE_DIR=join(process.cwd(),'artifacts','focus-tray-browser');
function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const candidate of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const found=commandPath(candidate);if(found)return found}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const a=server.address(),port=typeof a==='object'&&a?a.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=30000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(90)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}
  async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}
  send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}
  waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}
  close(){try{this.ws?.close()}catch{}}
}
async function evalJs(cdp,expression,awaitPromise=false){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-corridor-depth-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();
    browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
    browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target',12000);
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}?mode=real`});await loaded;
    await waitUntil(()=>evalJs(cdp,"document.querySelector('#app')?.classList.contains('ready')&&!!window.WarpSim&&!!window.WarpJourneyAtmosphere&&!!window.WarpJourneyCorridorDepth"),'Real Space corridor depth runtime',30000);
    const initial=await evalJs(cdp,"WarpJourneyCorridorDepth.snapshot()");assert.equal(initial.mounted,true);assert.equal(initial.elements,5);assert.equal(initial.active,false);
    await evalJs(cdp,"(()=>{const warp=document.querySelector('#warp');if(warp){warp.value='1.8';warp.dispatchEvent(new Event('input',{bubbles:true}))}WarpSim.select('LUNA');WarpSim.launch();return true})()");
    await waitUntil(()=>evalJs(cdp,"WarpSim.state().phase==='warp'&&WarpJourneyCorridorDepth.snapshot().active===true"),`SOL→LUNA warp depth ${viewport}`,45000);
    const live=await evalJs(cdp,`(()=>{const root=document.querySelector('#journeyCorridorDepth'),transit=document.querySelector('#journeyTransit'),atmosphere=document.querySelector('#journeyAtmosphere'),r=root?.getBoundingClientRect(),styles=root?getComputedStyle(root):null,horizon=root?.querySelector('.corridorDepthHorizon'),rails=root?.querySelectorAll('.corridorDepthRail').length||0;return{snapshot:WarpJourneyCorridorDepth.snapshot(),route:WarpSim.state().route.join('>'),phase:WarpSim.state().phase,root:r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null,opacity:styles?Number(styles.opacity):0,pointerEvents:styles?.pointerEvents||'',corridor:transit?.getAttribute('data-corridor'),atmospherePhase:atmosphere?.getAttribute('data-phase'),rails,horizon:horizon?getComputedStyle(horizon).opacity:null,pageScroll:document.documentElement.scrollWidth,innerWidth}})()`);
    assert.equal(live.route,'SOL>LUNA');assert.equal(live.phase,'warp');assert.equal(live.corridor,'SOL>LUNA');assert.equal(live.atmospherePhase,'warp');
    assert.deepEqual(live.snapshot,{mounted:true,elements:5,phase:'warp',corridor:'SOL>LUNA',active:true});
    assert.ok(live.root&&live.root.left>=-1&&live.root.right<=width+1&&live.root.top>=-1&&live.root.bottom<=height+1,'corridor depth root must stay inside phone viewport');
    assert.ok(live.opacity>=0.65,'warp corridor depth must be visibly active during cruise');assert.equal(live.pointerEvents,'none');assert.equal(live.rails,2);assert.ok(Number(live.horizon)>0.2,'vanishing-point horizon must be visible');assert.ok(live.pageScroll<=width+1,'corridor depth must not cause page overflow');
    await sleep(220);const bytes=await screenshot(cdp,`warp-corridor-depth-${viewport}.png`);assert.ok(bytes>9000,'warp corridor screenshot must contain rendered runtime evidence');
    await waitUntil(()=>evalJs(cdp,"['decelerate','approach','observe'].includes(WarpSim.state().phase)"),`SOL→LUNA clears corridor before approach ${viewport}`,35000);
    const cleared=await evalJs(cdp,`(()=>{const root=document.querySelector('#journeyCorridorDepth');return{snapshot:WarpJourneyCorridorDepth.snapshot(),opacity:root?Number(getComputedStyle(root).opacity):1,phase:WarpSim.state().phase}})()`);
    assert.equal(cleared.snapshot.active,false);assert.ok(cleared.opacity<=0.05,'corridor depth must clear before destination approach/observation');
    WarpSim?.abort?.();
    console.log(`${viewport}: corridor=${live.corridor}, elements=${live.snapshot.elements}, opacity=${live.opacity.toFixed(2)}, screenshot=${bytes} bytes, clearedAt=${cleared.phase}`);
  } finally {cdp?.close();await stop(browser);rmSync(profile,{recursive:true,force:true})}
}

const chrome=findChrome();
if(!chrome){console.log('Warp Corridor Perspective Depth browser: SKIPPED (Chromium unavailable)');process.exit(0)}
const serverPort=await freePort(),server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{
  const base=`http://127.0.0.1:${serverPort}/`;await waitHttp(base);
  await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);
  console.log('Warp Corridor Perspective Depth browser: 2/2 phone viewports passed');
} finally {await stop(server)}
