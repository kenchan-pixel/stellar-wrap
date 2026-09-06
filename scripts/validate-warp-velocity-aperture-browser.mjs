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
  if(!root||!window.WarpWarpVelocityAperture)return null;
  const styles=getComputedStyle(root),before=getComputedStyle(root,'::before'),after=getComputedStyle(root,'::after');
  return{
    state:WarpSim.state(),phase:atmosphere?.getAttribute('data-phase')||'',snapshot:WarpWarpVelocityAperture.snapshot(),
    root:{opacity:Number(styles.opacity),pointerEvents:styles.pointerEvents,children:root.children.length,ariaHidden:root.getAttribute('aria-hidden')},
    before:{opacity:Number(before.opacity),backgroundImage:before.backgroundImage},
    after:{opacity:Number(after.opacity),backgroundImage:after.backgroundImage},
    canvasCount:document.querySelectorAll('canvas').length,ownedCanvasCount:root.querySelectorAll('canvas').length,
    scrollWidth:document.documentElement.scrollWidth,innerWidth
  };
})()`;

function assertMounted(sample,label){
  assert.ok(sample,`${label} aperture runtime must exist`);
  assert.equal(sample.snapshot.mounted,true,`${label} aperture must be mounted`);
  assert.equal(sample.snapshot.elements,0,`${label} aperture must keep the zero-child budget`);
  assert.equal(sample.snapshot.architecture,'velocity-aperture-v5',`${label} runtime must expose v5 architecture`);
  assert.equal(sample.root.children,0,`${label} root must have no child nodes`);
  assert.equal(sample.root.ariaHidden,'true',`${label} root must remain presentation-only`);
  assert.equal(sample.root.pointerEvents,'none',`${label} root must stay pointer-transparent`);
  assert.equal(sample.ownedCanvasCount,0,`${label} aperture must not create a canvas`);
  assert.ok(sample.scrollWidth<=sample.innerWidth+1,`${label} aperture must not create horizontal overflow`);
}
function assertCruise(sample,label,baselineCanvas){
  assertMounted(sample,label);
  assert.equal(sample.state.phase,'warp',`${label} must inspect real warp cruise`);
  assert.equal(sample.phase,'warp',`${label} Journey Atmosphere must match warp cruise`);
  assert.equal(sample.snapshot.phase,'warp');assert.equal(sample.snapshot.active,true);
  assert.ok(sample.root.opacity>=.98,`${label} root must reach full cruise opacity`);
  assert.ok(sample.before.opacity>=.60&&sample.before.opacity<=.64,`${label} central attenuation must keep the .62 cruise bound`);
  assert.ok(sample.after.opacity>=.63&&sample.after.opacity<=.67,`${label} peripheral rim must keep the .65 cruise bound`);
  assert.ok(sample.before.backgroundImage.includes('radial-gradient'),`${label} central attenuation must be a radial gradient`);
  assert.ok(sample.before.backgroundImage.includes('50% 35%'),`${label} phone attenuation field must stay 50% × 35%`);
  assert.ok(sample.after.backgroundImage.includes('72% 56%'),`${label} peripheral rim must stay 72% × 56%`);
  assert.ok(sample.after.backgroundImage.includes('linear-gradient'),`${label} route-colour side rim must remain present`);
  assert.equal(sample.canvasCount,baselineCanvas,`${label} aperture must not add a renderer/canvas`);
}

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
    await waitUntil(()=>evalJs(cdp,"(()=>{const r=document.querySelector('#warpVelocityAperture');return WarpSim.state().phase==='warp'&&WarpWarpVelocityAperture.snapshot().active===true&&r&&Number(getComputedStyle(r).opacity)>.98&&Number(getComputedStyle(r,'::before').opacity)>.60&&Number(getComputedStyle(r,'::after').opacity)>.63})()"),`velocity aperture cruise ${viewport}`,45000);
    const cruise=await evalJs(cdp,SAMPLE);assertCruise(cruise,`${viewport} cruise`,baselineCanvas);
    const bytes=await screenshot(cdp,`warp-velocity-aperture-${viewport}.png`);assert.ok(bytes>9000,`${viewport} screenshot must contain rendered runtime evidence`);

    await waitUntil(()=>evalJs(cdp,"(()=>{const r=document.querySelector('#warpVelocityAperture');if(WarpSim.state().phase!=='warpExit'||WarpWarpVelocityAperture.snapshot().active!==true||!r)return false;const root=Number(getComputedStyle(r).opacity),before=Number(getComputedStyle(r,'::before').opacity),after=Number(getComputedStyle(r,'::after').opacity);return root>=.53&&root<=.57&&before>=.40&&before<=.44&&after>=.23&&after<=.27})()"),`settled velocity aperture exit ${viewport}`,20000);
    const exit=await evalJs(cdp,SAMPLE);assertMounted(exit,`${viewport} exit`);assert.equal(exit.snapshot.active,true);assert.equal(exit.snapshot.phase,'warpExit');
    assert.ok(exit.root.opacity>=.50&&exit.root.opacity<=.57);assert.ok(exit.before.opacity>=.40&&exit.before.opacity<=.44);assert.ok(exit.after.opacity>=.23&&exit.after.opacity<=.27);

    await waitUntil(()=>evalJs(cdp,"(()=>{const r=document.querySelector('#warpVelocityAperture'),p=WarpSim.state().phase;return ['decelerate','approach','observe'].includes(p)&&WarpWarpVelocityAperture.snapshot().active===false&&r&&Number(getComputedStyle(r).opacity)<=.01})()"),`velocity aperture clear ${viewport}`,35000);
    const cleared=await evalJs(cdp,SAMPLE);assertMounted(cleared,`${viewport} clear`);assert.equal(cleared.snapshot.active,false);assert.ok(cleared.root.opacity<=.01);assert.equal(cleared.canvasCount,baselineCanvas);
    await waitUntil(()=>evalJs(cdp,"WarpSim.state().phase==='observe'&&WarpWarpVelocityAperture.snapshot().active===false"),`velocity aperture observation ${viewport}`,30000);
    const observed=await evalJs(cdp,SAMPLE);assert.equal(observed.state.phase,'observe');assert.ok(observed.root.opacity<=.01);
    await evalJs(cdp,"WarpSim.abort();true");
    console.log(`${viewport}: aperture=${cruise.before.opacity.toFixed(2)}/${cruise.after.opacity.toFixed(2)}, exit=${exit.root.opacity.toFixed(2)}, screenshot=${bytes} bytes`);
  }finally{cdp?.close();await stop(browser);await cleanupProfile(profile)}
}

const chrome=findChrome();
if(!chrome){console.log('Warp Velocity Aperture browser: SKIPPED (Chromium unavailable)');process.exit(0)}
const serverPort=await freePort(),server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{
  const base=`http://127.0.0.1:${serverPort}/`;await waitHttp(base);
  await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);
  console.log('Warp Velocity Aperture browser: 2/2 phone viewports passed');
}finally{await stop(server)}
