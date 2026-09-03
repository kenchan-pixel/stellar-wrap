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
async function cleanupProfile(profile){for(let attempt=0;attempt<3;attempt++){try{rmSync(profile,{recursive:true,force:true});return}catch{await sleep(180*(attempt+1))}}}
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
    await waitUntil(()=>evalJs(cdp,"document.querySelector('#app')?.classList.contains('ready')&&!!window.WarpSim&&!!window.WarpJourneyAtmosphere&&!!window.WarpJourneyCorridorDepth"),'Real Space journey depth runtime',30000);
    const initial=await evalJs(cdp,"({corridor:WarpJourneyCorridorDepth.snapshot(),approach:WarpJourneyCorridorDepth.approachSnapshot()})");
    assert.equal(initial.corridor.mounted,true);assert.equal(initial.corridor.elements,5);assert.equal(initial.corridor.active,false);
    assert.equal(initial.approach.mounted,true);assert.equal(initial.approach.elements,3);assert.equal(initial.approach.active,false);

    await evalJs(cdp,"(()=>{const warp=document.querySelector('#warp');if(warp){warp.value='1.8';warp.dispatchEvent(new Event('input',{bubbles:true}))}WarpSim.select('LUNA');WarpSim.launch();return true})()");
    await waitUntil(()=>evalJs(cdp,"(()=>{const root=document.querySelector('#journeyCorridorDepth');return WarpSim.state().phase==='warp'&&document.querySelector('#journeyAtmosphere')?.getAttribute('data-phase')==='warp'&&WarpJourneyCorridorDepth.snapshot().active===true&&root&&Number(getComputedStyle(root).opacity)>=0.65})()"),`SOL→LUNA settled rendered warp depth ${viewport}`,45000);
    const live=await evalJs(cdp,`(()=>{const root=document.querySelector('#journeyCorridorDepth'),transit=document.querySelector('#journeyTransit'),atmosphere=document.querySelector('#journeyAtmosphere'),r=root?.getBoundingClientRect(),styles=root?getComputedStyle(root):null,horizon=root?.querySelector('.corridorDepthHorizon'),rails=root?.querySelectorAll('.corridorDepthRail').length||0;return{snapshot:WarpJourneyCorridorDepth.snapshot(),approach:WarpJourneyCorridorDepth.approachSnapshot(),route:WarpSim.state().route.join('>'),phase:WarpSim.state().phase,root:r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null,opacity:styles?Number(styles.opacity):0,pointerEvents:styles?.pointerEvents||'',corridor:transit?.getAttribute('data-corridor'),atmospherePhase:atmosphere?.getAttribute('data-phase'),rails,horizon:horizon?getComputedStyle(horizon).opacity:null,pageScroll:document.documentElement.scrollWidth,innerWidth}})()`);
    assert.equal(live.route,'SOL>LUNA');assert.equal(live.phase,'warp');assert.equal(live.corridor,'SOL>LUNA');assert.equal(live.atmospherePhase,'warp');
    assert.deepEqual(live.snapshot,{mounted:true,elements:5,phase:'warp',corridor:'SOL>LUNA',active:true});
    assert.equal(live.approach.active,false,'approach depth must stay clear during warp cruise');
    assert.ok(live.root&&live.root.left>=-1&&live.root.right<=width+1&&live.root.top>=-1&&live.root.bottom<=height+1,'corridor depth root must stay inside phone viewport');
    assert.ok(live.opacity>=0.65,'warp corridor depth must be visibly active during cruise');assert.equal(live.pointerEvents,'none');assert.equal(live.rails,2);assert.ok(Number(live.horizon)>0.2,'vanishing-point horizon must be visible');assert.ok(live.pageScroll<=width+1,'corridor depth must not cause page overflow');
    await sleep(220);const warpBytes=await screenshot(cdp,`warp-corridor-depth-${viewport}.png`);assert.ok(warpBytes>9000,'warp corridor screenshot must contain rendered runtime evidence');

    await waitUntil(()=>evalJs(cdp,"(()=>{const clearPhases=['decelerate','approach','observe'],root=document.querySelector('#journeyCorridorDepth'),atmosphere=document.querySelector('#journeyAtmosphere'),renderedPhase=atmosphere?.getAttribute('data-phase'),snapshot=WarpJourneyCorridorDepth.snapshot(),opacity=root?Number(getComputedStyle(root).opacity):1;return clearPhases.includes(WarpSim.state().phase)&&clearPhases.includes(renderedPhase)&&snapshot.active===false&&opacity<=0.05})()"),`SOL→LUNA rendered corridor clears before approach ${viewport}`,35000);
    const cleared=await evalJs(cdp,`(()=>{const root=document.querySelector('#journeyCorridorDepth'),atmosphere=document.querySelector('#journeyAtmosphere');return{snapshot:WarpJourneyCorridorDepth.snapshot(),opacity:root?Number(getComputedStyle(root).opacity):1,phase:WarpSim.state().phase,atmospherePhase:atmosphere?.getAttribute('data-phase')}})()`);
    assert.equal(cleared.snapshot.active,false);assert.ok(['decelerate','approach','observe'].includes(cleared.atmospherePhase),'rendered journey phase must have left warp before corridor clear acceptance');assert.ok(cleared.opacity<=0.05,'corridor depth must clear before destination approach/observation');

    await waitUntil(()=>evalJs(cdp,"(()=>{const root=document.querySelector('#journeyApproachDepth'),atmosphere=document.querySelector('#journeyAtmosphere'),snapshot=WarpJourneyCorridorDepth.approachSnapshot();return WarpSim.state().phase==='approach'&&atmosphere?.getAttribute('data-phase')==='approach'&&snapshot.active===true&&snapshot.system==='LUNA'&&root&&Number(getComputedStyle(root).opacity)>=0.52})()"),`SOL→LUNA settled approach parallax ${viewport}`,35000);
    const approach=await evalJs(cdp,`(()=>{const root=document.querySelector('#journeyApproachDepth'),atmosphere=document.querySelector('#journeyAtmosphere'),r=root?.getBoundingClientRect(),styles=root?getComputedStyle(root):null,far=root?.querySelector('.approachDepthFar'),mid=root?.querySelector('.approachDepthMid'),near=root?.querySelector('.approachDepthNear');return{snapshot:WarpJourneyCorridorDepth.approachSnapshot(),corridor:WarpJourneyCorridorDepth.snapshot(),phase:WarpSim.state().phase,atmospherePhase:atmosphere?.getAttribute('data-phase'),root:r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom}:null,opacity:styles?Number(styles.opacity):0,pointerEvents:styles?.pointerEvents||'',anchorX:styles?.getPropertyValue('--approach-x').trim()||'',transforms:[far,mid,near].map(el=>el?getComputedStyle(el).transform:''),pageScroll:document.documentElement.scrollWidth,innerWidth}})()`);
    assert.deepEqual(approach.snapshot,{mounted:true,elements:3,phase:'approach',system:'LUNA',active:true});
    assert.equal(approach.corridor.active,false,'warp corridor must remain inactive while approach depth owns the handoff');
    assert.equal(approach.phase,'approach');assert.equal(approach.atmospherePhase,'approach');assert.equal(approach.pointerEvents,'none');
    assert.equal(approach.anchorX,'29%','LUNA approach depth must use its destination-specific left-side anchor');
    assert.ok(approach.root&&approach.root.left>=-1&&approach.root.right<=width+1&&approach.root.top>=-1&&approach.root.bottom<=height+1,'approach depth root must stay inside phone viewport');
    assert.ok(approach.opacity>=0.52,'approach parallax must be visibly active');
    assert.equal(new Set(approach.transforms).size,3,'far/mid/near approach planes must render at three distinct transforms');
    assert.ok(approach.pageScroll<=width+1,'approach depth must not cause page overflow');
    await sleep(180);const approachBytes=await screenshot(cdp,`approach-parallax-LUNA-${viewport}.png`);assert.ok(approachBytes>9000,'approach screenshot must contain rendered runtime evidence');

    await waitUntil(()=>evalJs(cdp,"(()=>{const root=document.querySelector('#journeyApproachDepth'),state=WarpSim.state(),snapshot=WarpJourneyCorridorDepth.approachSnapshot(),opacity=root?Number(getComputedStyle(root).opacity):1;return state.phase==='observe'&&snapshot.active===false&&opacity<=0.05})()"),`SOL→LUNA approach depth clears for observation ${viewport}`,25000);
    const observed=await evalJs(cdp,"({phase:WarpSim.state().phase,approach:WarpJourneyCorridorDepth.approachSnapshot(),opacity:Number(getComputedStyle(document.querySelector('#journeyApproachDepth')).opacity)})");
    assert.equal(observed.phase,'observe');assert.equal(observed.approach.active,false);assert.ok(observed.opacity<=0.05,'approach depth must clear before final 3D observation');

    await evalJs(cdp,"WarpSim.abort();true");
    console.log(`${viewport}: corridor=${live.corridor}, warpOpacity=${live.opacity.toFixed(2)}, approach=${approach.snapshot.system}, approachOpacity=${approach.opacity.toFixed(2)}, screenshots=${warpBytes}/${approachBytes} bytes`);
  } finally {cdp?.close();await stop(browser);await cleanupProfile(profile)}
}

const chrome=findChrome();
if(!chrome){console.log('Warp-to-Approach Depth Bridge browser: SKIPPED (Chromium unavailable)');process.exit(0)}
const serverPort=await freePort(),server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{
  const base=`http://127.0.0.1:${serverPort}/`;await waitHttp(base);
  await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);
  console.log('Warp-to-Approach Depth Bridge browser: 2/2 phone viewports passed');
} finally {await stop(server)}
