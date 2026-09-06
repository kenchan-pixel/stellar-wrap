import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const EVIDENCE_DIR=join(process.cwd(),'artifacts','focus-tray-browser');

function commandPath(name){
  if(!name)return'';
  if(name.includes('/')&&existsSync(name))return name;
  const probe=spawnSync('which',[name],{encoding:'utf8'});
  return probe.status===0?probe.stdout.trim():'';
}
function findChrome(){
  for(const candidate of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){
    const found=commandPath(candidate);if(found)return found;
  }
  return'';
}
async function freePort(){
  return await new Promise((resolve,reject)=>{
    const server=createTcpServer();
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{
      const address=server.address(),port=typeof address==='object'&&address?address.port:0;
      server.close(error=>error?reject(error):resolve(port));
    });
  });
}
async function waitUntil(fn,label,timeout=30000){
  const end=Date.now()+timeout;let last;
  while(Date.now()<end){
    try{const value=await fn();if(value)return value}catch(error){last=error}
    await sleep(90);
  }
  throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`);
}
async function stop(child){
  if(!child||child.exitCode!==null)return;
  const done=new Promise(resolve=>child.once('exit',resolve));
  child.kill('SIGTERM');
  await Promise.race([done,sleep(700)]);
  if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}
}
async function cleanupProfile(profile){
  for(let attempt=0;attempt<3;attempt++){
    try{rmSync(profile,{recursive:true,force:true});return}catch{await sleep(180*(attempt+1))}
  }
}
async function waitHttp(url){
  return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000);
}
class Cdp{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}
  async connect(){
    this.ws=new WebSocket(this.url);
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);
      this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});
      this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true});
    });
    this.ws.addEventListener('message',event=>{
      const message=JSON.parse(String(event.data));
      if(!message.id){
        const queue=this.events.get(message.method)||[];this.events.delete(message.method);
        queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return;
      }
      const pending=this.pending.get(message.id);if(!pending)return;
      this.pending.delete(message.id);clearTimeout(pending.timer);
      message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{});
    });
  }
  send(method,params={},timeout=12000){
    const id=++this.id;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);
      this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  waitEvent(method,timeout=12000){
    return new Promise((resolve,reject)=>{
      const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};
      const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue);
    });
  }
  close(){try{this.ws?.close()}catch{}}
}
async function evalJs(cdp,expression){
  const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result?.value;
}
async function screenshot(cdp,name){
  mkdirSync(EVIDENCE_DIR,{recursive:true});
  const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length;
}

const SAMPLE=`(()=>{
  const root=document.querySelector('#warpVelocityAperture'),atmosphere=document.querySelector('#journeyAtmosphere');
  const transit=document.querySelector('#journeyTransit'),corridor=document.querySelector('#journeyCorridorDepth');
  const horizon=corridor?.querySelector('.corridorDepthHorizon'),rail=corridor?.querySelector('.corridorDepthRailLeft'),rungs=corridor?.querySelector('.corridorDepthRungs');
  if(!root||!window.WarpWarpVelocityAperture)return null;
  const styles=getComputedStyle(root),before=getComputedStyle(root,'::before'),after=getComputedStyle(root,'::after');
  const transitStyles=transit?getComputedStyle(transit):null,corridorStyles=corridor?getComputedStyle(corridor):null;
  const rootRect=root.getBoundingClientRect(),transitRect=transit?.getBoundingClientRect();
  const overlap=!!transitRect&&Math.min(rootRect.right,transitRect.right)>Math.max(rootRect.left,transitRect.left)&&Math.min(rootRect.bottom,transitRect.bottom)>Math.max(rootRect.top,transitRect.top);
  const scale=transform=>{
    if(!transform||transform==='none')return{x:1,y:1};
    const matrix=new DOMMatrixReadOnly(transform);
    return{x:Math.hypot(matrix.a,matrix.b),y:Math.hypot(matrix.c,matrix.d)};
  };
  return{
    state:WarpSim.state(),phase:atmosphere?.getAttribute('data-phase')||'',snapshot:WarpWarpVelocityAperture.snapshot(),
    root:{opacity:Number(styles.opacity),pointerEvents:styles.pointerEvents,children:root.children.length,ariaHidden:root.getAttribute('aria-hidden')},
    before:{opacity:Number(before.opacity),backgroundImage:before.backgroundImage,transform:before.transform,scale:scale(before.transform)},
    after:{opacity:Number(after.opacity),backgroundImage:after.backgroundImage,transform:after.transform,scale:scale(after.transform)},
    stack:{
      sameParent:!!transit&&root.parentElement===transit.parentElement,
      apertureZ:Number(styles.zIndex),transitZ:transitStyles?Number(transitStyles.zIndex):null,
      transitOpacity:transitStyles?Number(transitStyles.opacity):0,
      corridorInsideTransit:!!transit&&!!corridor&&transit.contains(corridor),corridorElements:corridor?.children?.length||0,
      corridorOpacity:corridorStyles?Number(corridorStyles.opacity):0,
      horizonOpacity:horizon?Number(getComputedStyle(horizon).opacity):0,
      railOpacity:rail?Number(getComputedStyle(rail).opacity):0,
      rungsOpacity:rungs?Number(getComputedStyle(rungs).opacity):0,
      overlap
    },
    canvasCount:document.querySelectorAll('canvas').length,ownedCanvasCount:root.querySelectorAll('canvas').length,
    scrollWidth:document.documentElement.scrollWidth,innerWidth
  };
})()`;

function near(actual,expected,tolerance=.025){return Math.abs(actual-expected)<=tolerance}
function assertScale(sample,expectedBefore,expectedAfter,label){
  assert.ok(near(sample.before.scale.x,expectedBefore.x),`${label} central scaleX ${sample.before.scale.x.toFixed(3)} must be near ${expectedBefore.x}`);
  assert.ok(near(sample.before.scale.y,expectedBefore.y),`${label} central scaleY ${sample.before.scale.y.toFixed(3)} must be near ${expectedBefore.y}`);
  assert.ok(near(sample.after.scale.x,expectedAfter.x),`${label} rim scaleX ${sample.after.scale.x.toFixed(3)} must be near ${expectedAfter.x}`);
  assert.ok(near(sample.after.scale.y,expectedAfter.y),`${label} rim scaleY ${sample.after.scale.y.toFixed(3)} must be near ${expectedAfter.y}`);
}
function assertMounted(sample,label){
  assert.ok(sample,`${label} aperture runtime must exist`);
  assert.equal(sample.snapshot.mounted,true,`${label} aperture must be mounted`);
  assert.equal(sample.snapshot.elements,0,`${label} aperture must keep the zero-child budget`);
  assert.equal(sample.snapshot.architecture,'velocity-aperture-v5',`${label} runtime must expose v5 architecture`);
  assert.equal(sample.snapshot.motionTreatment,'velocity-aperture-expansion-v6',`${label} runtime must expose v6 phase expansion`);
  assert.equal(sample.root.children,0,`${label} root must have no child nodes`);
  assert.equal(sample.root.ariaHidden,'true',`${label} root must remain presentation-only`);
  assert.equal(sample.root.pointerEvents,'none',`${label} root must stay pointer-transparent`);
  assert.equal(sample.ownedCanvasCount,0,`${label} aperture must not create a canvas`);
  assert.ok(sample.scrollWidth<=sample.innerWidth+1,`${label} aperture must not create horizontal overflow`);
}
function assertEntry(sample,label,baselineCanvas){
  assertMounted(sample,label);
  assert.equal(sample.state.phase,'warpEntry',`${label} must inspect real warp entry`);
  assert.equal(sample.phase,'warpEntry',`${label} Journey Atmosphere must match warp entry`);
  assert.equal(sample.snapshot.active,true);
  assert.ok(sample.root.opacity>=.43&&sample.root.opacity<=.47,`${label} root must settle near .45`);
  assert.ok(sample.before.opacity>=.53&&sample.before.opacity<=.57,`${label} central attenuation must settle near .55`);
  assert.ok(sample.after.opacity>=.33&&sample.after.opacity<=.37,`${label} rim must settle near .35`);
  assertScale(sample,{x:.88,y:.80},{x:.92,y:.86},label);
  assert.equal(sample.canvasCount,baselineCanvas,`${label} aperture must not add a renderer/canvas`);
}
function assertCruise(sample,label,baselineCanvas){
  assertMounted(sample,label);
  assert.equal(sample.state.phase,'warp',`${label} must inspect real warp cruise`);
  assert.equal(sample.phase,'warp',`${label} Journey Atmosphere must match warp cruise`);
  assert.equal(sample.snapshot.phase,'warp');assert.equal(sample.snapshot.active,true);
  assert.ok(sample.root.opacity>=.98,`${label} root must reach full cruise opacity`);
  assert.ok(sample.before.opacity>=.60&&sample.before.opacity<=.64,`${label} central attenuation must keep the .62 cruise bound`);
  assert.ok(sample.after.opacity>=.63&&sample.after.opacity<=.67,`${label} peripheral rim must keep the .65 cruise bound`);
  assertScale(sample,{x:1,y:.94},{x:1.04,y:1},label);
  assert.ok(sample.before.backgroundImage.includes('radial-gradient'),`${label} central attenuation must be a radial gradient`);
  assert.ok(sample.before.backgroundImage.includes('50% 35%'),`${label} phone attenuation field must stay 50% × 35%`);
  assert.ok(sample.after.backgroundImage.includes('72% 56%'),`${label} peripheral rim must stay 72% × 56%`);
  assert.ok(sample.after.backgroundImage.includes('linear-gradient'),`${label} route-colour side rim must remain present`);
  assert.equal(sample.stack.sameParent,true,`${label} transit and aperture must share the Journey Atmosphere stacking context`);
  assert.equal(sample.stack.apertureZ,4,`${label} aperture must remain on presentation layer 4`);
  assert.equal(sample.stack.transitZ,5,`${label} transit/corridor layer must be explicitly above the aperture`);
  assert.ok(sample.stack.transitZ>sample.stack.apertureZ,`${label} corridor cues must composite above attenuation`);
  assert.equal(sample.stack.corridorInsideTransit,true,`${label} corridor depth must remain inside the raised transit layer`);
  assert.equal(sample.stack.corridorElements,5,`${label} live corridor must retain horizon, rails, rungs and near frame`);
  assert.ok(sample.stack.transitOpacity>=.74,`${label} live transit layer must be visibly active`);
  assert.ok(sample.stack.corridorOpacity>=.68,`${label} live corridor root must be visibly active`);
  assert.ok(sample.stack.horizonOpacity>=.30,`${label} vanishing-point horizon must remain visible above attenuation`);
  assert.ok(sample.stack.railOpacity>=.55,`${label} corridor rail must remain visible above attenuation`);
  assert.ok(sample.stack.rungsOpacity>=.60,`${label} corridor rungs must remain visible above attenuation`);
  assert.equal(sample.stack.overlap,true,`${label} stacking assertion must cover overlapping full-frame layers`);
  assert.equal(sample.canvasCount,baselineCanvas,`${label} aperture must not add a renderer/canvas`);
}
function assertExit(sample,label,baselineCanvas){
  assertMounted(sample,label);
  assert.equal(sample.state.phase,'warpExit',`${label} must inspect real warp exit`);
  assert.equal(sample.phase,'warpExit',`${label} Journey Atmosphere must match warp exit`);
  assert.equal(sample.snapshot.active,true);
  assert.ok(sample.root.opacity>=.53&&sample.root.opacity<=.57,`${label} root must settle near .55`);
  assert.ok(sample.before.opacity>=.40&&sample.before.opacity<=.44,`${label} central attenuation must settle near .42`);
  assert.ok(sample.after.opacity>=.23&&sample.after.opacity<=.27,`${label} rim must settle near .25`);
  assertScale(sample,{x:1.16,y:1.08},{x:1.20,y:1.12},label);
  assert.equal(sample.canvasCount,baselineCanvas,`${label} aperture must not add a renderer/canvas`);
}

const SETTLED_PHASE=`(()=>{
  const phase=WarpSim.state().phase,r=document.querySelector('#warpVelocityAperture');
  if(!r)return false;
  const before=getComputedStyle(r,'::before'),after=getComputedStyle(r,'::after');
  const scale=transform=>{const m=new DOMMatrixReadOnly(transform);return{x:Math.hypot(m.a,m.b),y:Math.hypot(m.c,m.d)}};
  const b=scale(before.transform),a=scale(after.transform),close=(x,y)=>Math.abs(x-y)<=.025;
  if(phase==='warpEntry')return close(b.x,.88)&&close(b.y,.80)&&close(a.x,.92)&&close(a.y,.86)&&Number(before.opacity)>=.53&&Number(after.opacity)>=.33;
  if(phase==='warp')return close(b.x,1)&&close(b.y,.94)&&close(a.x,1.04)&&close(a.y,1)&&Number(before.opacity)>=.60&&Number(after.opacity)>=.63;
  if(phase==='warpExit')return close(b.x,1.16)&&close(b.y,1.08)&&close(a.x,1.20)&&close(a.y,1.12)&&Number(before.opacity)>=.40&&Number(after.opacity)>=.23;
  return false;
})()`;

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-aperture-${width}-`));
  let browser,cdp,stderr='';
  try{
    const port=await freePort();
    browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
    browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{
      if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);
      try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}
    },'Chrome target',12000);
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}?mode=real`});await loaded;
    await waitUntil(()=>evalJs(cdp,"document.querySelector('#app')?.classList.contains('ready')&&!!window.WarpSim&&!!window.WarpWarpVelocityAperture"),`velocity aperture runtime ${viewport}`,30000);
    const initial=await evalJs(cdp,SAMPLE);assertMounted(initial,`${viewport} initial`);assert.equal(initial.snapshot.active,false);assert.ok(initial.root.opacity<=.01);
    const baselineCanvas=initial.canvasCount;

    await evalJs(cdp,"(()=>{const warp=document.querySelector('#warp');if(warp){warp.value='1.8';warp.dispatchEvent(new Event('input',{bubbles:true}))}WarpSim.select('LUNA');WarpSim.launch();return true})()");

    await waitUntil(()=>evalJs(cdp,`WarpSim.state().phase==='warpEntry'&&WarpWarpVelocityAperture.snapshot().active===true&&${SETTLED_PHASE}`),`settled velocity aperture entry ${viewport}`,30000);
    const entry=await evalJs(cdp,SAMPLE);assertEntry(entry,`${viewport} entry`,baselineCanvas);
    const entryBytes=await screenshot(cdp,`warp-velocity-aperture-entry-${viewport}.png`);assert.ok(entryBytes>9000,`${viewport} entry screenshot must contain rendered runtime evidence`);

    await waitUntil(()=>evalJs(cdp,`WarpSim.state().phase==='warp'&&WarpWarpVelocityAperture.snapshot().active===true&&${SETTLED_PHASE}`),`settled velocity aperture cruise ${viewport}`,30000);
    const cruise=await evalJs(cdp,SAMPLE);assertCruise(cruise,`${viewport} cruise`,baselineCanvas);
    const cruiseBytes=await screenshot(cdp,`warp-velocity-aperture-cruise-${viewport}.png`);assert.ok(cruiseBytes>9000,`${viewport} cruise screenshot must contain rendered runtime evidence`);

    await waitUntil(()=>evalJs(cdp,`WarpSim.state().phase==='warpExit'&&WarpWarpVelocityAperture.snapshot().active===true&&${SETTLED_PHASE}`),`settled velocity aperture exit ${viewport}`,30000);
    const exit=await evalJs(cdp,SAMPLE);assertExit(exit,`${viewport} exit`,baselineCanvas);
    assert.ok(exit.before.scale.x>cruise.before.scale.x&&exit.before.scale.y>cruise.before.scale.y,`${viewport} exit central aperture must expand beyond cruise`);
    assert.ok(exit.after.scale.x>cruise.after.scale.x&&exit.after.scale.y>cruise.after.scale.y,`${viewport} exit rim must expand beyond cruise`);
    const exitBytes=await screenshot(cdp,`warp-velocity-aperture-exit-${viewport}.png`);assert.ok(exitBytes>9000,`${viewport} exit screenshot must contain rendered runtime evidence`);

    await waitUntil(()=>evalJs(cdp,"(()=>{const r=document.querySelector('#warpVelocityAperture'),p=WarpSim.state().phase;return ['decelerate','approach','observe'].includes(p)&&WarpWarpVelocityAperture.snapshot().active===false&&r&&Number(getComputedStyle(r).opacity)<=.01})()"),`velocity aperture clear ${viewport}`,35000);
    const cleared=await evalJs(cdp,SAMPLE);assertMounted(cleared,`${viewport} clear`);assert.equal(cleared.snapshot.active,false);assert.ok(cleared.root.opacity<=.01);assert.equal(cleared.canvasCount,baselineCanvas);
    await waitUntil(()=>evalJs(cdp,"WarpSim.state().phase==='observe'&&WarpWarpVelocityAperture.snapshot().active===false"),`velocity aperture observation ${viewport}`,30000);
    const observed=await evalJs(cdp,SAMPLE);assert.equal(observed.state.phase,'observe');assert.ok(observed.root.opacity<=.01);
    await evalJs(cdp,"WarpSim.abort();true");
    console.log(`${viewport}: entry=${entry.before.scale.x.toFixed(2)}x${entry.before.scale.y.toFixed(2)}, cruise=${cruise.before.scale.x.toFixed(2)}x${cruise.before.scale.y.toFixed(2)}, exit=${exit.before.scale.x.toFixed(2)}x${exit.before.scale.y.toFixed(2)}, stack=${cruise.stack.apertureZ}<${cruise.stack.transitZ}, screenshots=${entryBytes}/${cruiseBytes}/${exitBytes} bytes`);
  }finally{cdp?.close();await stop(browser);await cleanupProfile(profile)}
}

const chrome=findChrome();
if(!chrome){console.log('Warp Velocity Aperture browser: SKIPPED (Chromium unavailable)');process.exit(0)}
const serverPort=await freePort(),server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{
  const base=`http://127.0.0.1:${serverPort}/`;await waitHttp(base);
  await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);
  console.log('Warp Velocity Aperture expansion browser: 2/2 phone viewports passed');
}finally{await stop(server)}
