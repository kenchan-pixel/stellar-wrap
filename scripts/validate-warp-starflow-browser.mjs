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
    const found=commandPath(candidate);
    if(found)return found;
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
  if(child.exitCode===null){
    child.kill('SIGKILL');
    await Promise.race([done,sleep(900)]);
  }
}
async function cleanupProfile(profile){
  for(let attempt=0;attempt<3;attempt++){
    try{rmSync(profile,{recursive:true,force:true});return}catch{await sleep(180*(attempt+1))}
  }
}
async function waitHttp(url){
  return waitUntil(async()=>{
    const response=await fetch(url,{cache:'no-store'});
    return response.ok;
  },`server ${url}`,8000);
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
        const queue=this.events.get(message.method)||[];
        this.events.delete(message.method);
        queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});
        return;
      }
      const pending=this.pending.get(message.id);
      if(!pending)return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{});
    });
  }
  send(method,params={},timeout=12000){
    const id=++this.id;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);
      this.pending.set(id,{resolve,reject,timer});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  waitEvent(method,timeout=12000){
    return new Promise((resolve,reject)=>{
      const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};
      const queue=this.events.get(method)||[];
      queue.push(waiter);
      this.events.set(method,queue);
    });
  }
  close(){try{this.ws?.close()}catch{}}
}
async function evalJs(cdp,expression,awaitPromise=false){
  const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result?.value;
}
async function screenshot(cdp,name){
  mkdirSync(EVIDENCE_DIR,{recursive:true});
  const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  const data=Buffer.from(result.data,'base64');
  writeFileSync(join(EVIDENCE_DIR,name),data);
  return data.length;
}

const STARFLOW_EXPRESSION=`(()=>{
  const root=document.querySelector('#journeyCorridorDepth'),atmosphere=document.querySelector('#journeyAtmosphere'),transit=document.querySelector('#journeyTransit');
  if(!root)return null;
  const rect=root.getBoundingClientRect(),before=getComputedStyle(root,'::before'),after=getComputedStyle(root,'::after'),styles=getComputedStyle(root),horizon=root.querySelector('.corridorDepthHorizon');
  const pseudo=style=>({
    content:style.content,
    opacity:Number(style.opacity),
    animationName:style.animationName,
    animationDuration:style.animationDuration,
    animationPlayState:style.animationPlayState,
    transform:style.transform,
    width:parseFloat(style.width),
    left:parseFloat(style.left),
    right:parseFloat(style.right),
    backgroundImage:style.backgroundImage,
    pointerEvents:style.pointerEvents
  });
  return{
    state:WarpSim.state(),
    snapshot:WarpJourneyCorridorDepth.snapshot(),
    approach:WarpJourneyCorridorDepth.approachSnapshot(),
    phase:atmosphere?.getAttribute('data-phase')||'',
    corridor:transit?.getAttribute('data-corridor')||'',
    root:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height,opacity:Number(styles.opacity)},
    horizonOpacity:horizon?Number(getComputedStyle(horizon).opacity):0,
    before:pseudo(before),
    after:pseudo(after),
    scrollWidth:document.documentElement.scrollWidth,
    innerWidth,
    innerHeight
  };
})()`;

function assertPeripheralLayout(sample,label){
  assert.ok(sample&&sample.root,`${label} starflow root must exist`);
  const {root,before,after}=sample;
  assert.equal(before.content==='none',false,`${label} left starflow pseudo-element must exist`);
  assert.equal(after.content==='none',false,`${label} right starflow pseudo-element must exist`);
  assert.equal(before.pointerEvents,'none',`${label} left starflow must remain pointer-transparent`);
  assert.equal(after.pointerEvents,'none',`${label} right starflow must remain pointer-transparent`);
  assert.ok(before.backgroundImage.includes('repeating-linear-gradient'),`${label} left starflow must render a lightweight repeating gradient`);
  assert.ok(after.backgroundImage.includes('repeating-linear-gradient'),`${label} right starflow must render a lightweight repeating gradient`);
  assert.notEqual(before.backgroundImage,after.backgroundImage,`${label} starflow sheets must retain distinct gradient direction/identity`);
  assert.ok(before.width>=root.width*.49&&before.width<=root.width*.55,`${label} left starflow width must stay mobile-bounded`);
  assert.ok(after.width>=root.width*.49&&after.width<=root.width*.55,`${label} right starflow width must stay mobile-bounded`);
  const leftInnerEdge=before.left+before.width;
  const rightInnerEdge=root.width-after.right-after.width;
  assert.ok(leftInnerEdge<=root.width*.48,`${label} left starflow must stay peripheral and leave the central corridor clear`);
  assert.ok(rightInnerEdge>=root.width*.52,`${label} right starflow must stay peripheral and leave the central corridor clear`);
  assert.ok(sample.horizonOpacity>.2,`${label} central vanishing-point horizon must remain visible`);
  assert.ok(sample.scrollWidth<=sample.innerWidth+1,`${label} starflow must not create horizontal page overflow`);
}
function assertCruise(sample,label){
  assert.equal(sample.state.phase,'warp',`${label} must inspect real warp cruise`);
  assert.equal(sample.phase,'warp',`${label} Journey Atmosphere must match warp cruise`);
  assert.equal(sample.corridor,'SOL>LUNA',`${label} must use the SOL→LUNA corridor`);
  assert.deepEqual(sample.snapshot,{mounted:true,elements:5,phase:'warp',corridor:'SOL>LUNA',active:true});
  assert.equal(sample.approach.active,false,`${label} approach layer must stay inactive during warp`);
  assert.ok(sample.root.opacity>=.65,`${label} corridor root must be visibly active`);
  assertPeripheralLayout(sample,label);
  assert.ok(sample.before.opacity>=.30&&sample.before.opacity<=.34,`${label} left starflow must render at the v4 cruise intensity`);
  assert.ok(sample.after.opacity>=.30&&sample.after.opacity<=.34,`${label} right starflow must render at the v4 cruise intensity`);
  assert.equal(sample.before.animationName,'corridorDepthStarflowLeft',`${label} left starflow must run the intended transform animation`);
  assert.equal(sample.after.animationName,'corridorDepthStarflowRight',`${label} right starflow must run the intended transform animation`);
  assert.ok(Math.abs(parseFloat(sample.before.animationDuration)-.78)<.02,`${label} left starflow must keep the fast near-field rate`);
  assert.ok(Math.abs(parseFloat(sample.after.animationDuration)-1.08)<.02,`${label} right starflow must keep the slower parallax rate`);
  assert.notEqual(sample.before.animationDuration,sample.after.animationDuration,`${label} two starflow sheets must retain distinct parallax rates`);
  assert.equal(sample.before.animationPlayState,'running',`${label} left starflow must be running`);
  assert.equal(sample.after.animationPlayState,'running',`${label} right starflow must be running`);
}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-starflow-${width}-`));
  let browser,cdp,stderr='';
  try{
    const port=await freePort();
    browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
    browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{
      if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);
      try{
        const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();
        return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null;
      }catch{return null}
    },'Chrome target',12000);

    cdp=new Cdp(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);
    await cdp.send('Page.navigate',{url:`${base}?mode=real`});
    await loaded;

    await waitUntil(()=>evalJs(cdp,"document.querySelector('#app')?.classList.contains('ready')&&!!window.WarpSim&&!!window.WarpJourneyAtmosphere&&!!window.WarpJourneyCorridorDepth"),`starflow runtime ${viewport}`,30000);
    const initial=await evalJs(cdp,STARFLOW_EXPRESSION);
    assert.equal(initial.snapshot.mounted,true);assert.equal(initial.snapshot.elements,5);assert.equal(initial.snapshot.active,false);
    assert.equal(initial.approach.mounted,true);assert.equal(initial.approach.elements,3);assert.equal(initial.approach.active,false);

    await evalJs(cdp,"(()=>{const warp=document.querySelector('#warp');if(warp){warp.value='1.8';warp.dispatchEvent(new Event('input',{bubbles:true}))}WarpSim.select('LUNA');WarpSim.launch();return true})()");
    await waitUntil(()=>evalJs(cdp,"(()=>{const root=document.querySelector('#journeyCorridorDepth'),atmosphere=document.querySelector('#journeyAtmosphere');return WarpSim.state().phase==='warp'&&atmosphere?.getAttribute('data-phase')==='warp'&&WarpJourneyCorridorDepth.snapshot().active===true&&root&&Number(getComputedStyle(root,'::before').opacity)>=.30&&Number(getComputedStyle(root,'::after').opacity)>=.30})()"),`visible starflow cruise ${viewport}`,45000);

    const cruiseA=await evalJs(cdp,STARFLOW_EXPRESSION);
    assertCruise(cruiseA,`${viewport} cruise`);
    assert.ok(cruiseA.root.left>=-1&&cruiseA.root.right<=width+1&&cruiseA.root.top>=-1&&cruiseA.root.bottom<=height+1,`${viewport} corridor root must stay inside viewport`);
    await sleep(180);
    const cruiseB=await evalJs(cdp,STARFLOW_EXPRESSION);
    assertCruise(cruiseB,`${viewport} moving cruise`);
    assert.notEqual(cruiseA.before.transform,cruiseB.before.transform,`${viewport} left starflow transform must visibly advance`);
    assert.notEqual(cruiseA.after.transform,cruiseB.after.transform,`${viewport} right starflow transform must visibly advance`);
    const warpBytes=await screenshot(cdp,`warp-starflow-${viewport}.png`);
    assert.ok(warpBytes>9000,`${viewport} starflow screenshot must contain rendered runtime evidence`);

    await waitUntil(()=>evalJs(cdp,"(()=>{const root=document.querySelector('#journeyCorridorDepth'),atmosphere=document.querySelector('#journeyAtmosphere');return WarpSim.state().phase==='warpExit'&&atmosphere?.getAttribute('data-phase')==='warpExit'&&root&&Number(getComputedStyle(root,'::before').opacity)>=.10&&Number(getComputedStyle(root,'::after').opacity)>=.10})()"),`starflow warp-exit handoff ${viewport}`,20000);
    const exit=await evalJs(cdp,STARFLOW_EXPRESSION);
    assert.equal(exit.state.phase,'warpExit');assert.equal(exit.phase,'warpExit');assert.equal(exit.snapshot.active,true);
    assertPeripheralLayout(exit,`${viewport} warpExit`);
    assert.ok(exit.before.opacity>=.10&&exit.before.opacity<=.14,`${viewport} left starflow must soften during warp exit`);
    assert.ok(exit.after.opacity>=.10&&exit.after.opacity<=.14,`${viewport} right starflow must soften during warp exit`);
    assert.equal(exit.before.animationName,'none',`${viewport} left starflow motion must stop before approach`);
    assert.equal(exit.after.animationName,'none',`${viewport} right starflow motion must stop before approach`);
    assert.equal(exit.approach.active,true,`${viewport} approach bridge must already own the warp-exit handoff`);

    await waitUntil(()=>evalJs(cdp,"(()=>{const root=document.querySelector('#journeyCorridorDepth'),phase=WarpSim.state().phase,atmosphere=document.querySelector('#journeyAtmosphere')?.getAttribute('data-phase'),snapshot=WarpJourneyCorridorDepth.snapshot(),before=root?getComputedStyle(root,'::before'):null,after=root?getComputedStyle(root,'::after'):null;return ['decelerate','approach','observe'].includes(phase)&&['decelerate','approach','observe'].includes(atmosphere)&&snapshot.active===false&&Number(before?.opacity||1)<=.01&&Number(after?.opacity||1)<=.01})()"),`starflow clear before approach ${viewport}`,35000);
    const cleared=await evalJs(cdp,STARFLOW_EXPRESSION);
    assert.equal(cleared.snapshot.active,false,`${viewport} corridor must be inactive after warp`);
    assert.ok(cleared.before.opacity<=.01&&cleared.after.opacity<=.01,`${viewport} starflow sheets must fully clear after warp exit`);
    assert.equal(cleared.before.animationName,'none',`${viewport} left starflow animation must be absent after warp`);
    assert.equal(cleared.after.animationName,'none',`${viewport} right starflow animation must be absent after warp`);
    assert.ok(cleared.scrollWidth<=width+1,`${viewport} cleared starflow must not leave overflow`);

    await waitUntil(()=>evalJs(cdp,"WarpSim.state().phase==='observe'&&WarpJourneyCorridorDepth.approachSnapshot().active===false"),`final observation ${viewport}`,30000);
    const observed=await evalJs(cdp,STARFLOW_EXPRESSION);
    assert.equal(observed.state.phase,'observe');assert.equal(observed.snapshot.active,false);assert.equal(observed.approach.active,false);
    assert.ok(observed.before.opacity<=.01&&observed.after.opacity<=.01,`${viewport} starflow must stay absent in final observation`);

    await evalJs(cdp,"WarpSim.abort();true");
    console.log(`${viewport}: starflow=${cruiseA.before.opacity.toFixed(2)}/${cruiseA.after.opacity.toFixed(2)}, rates=${cruiseA.before.animationDuration}/${cruiseA.after.animationDuration}, exit=${exit.before.opacity.toFixed(2)}, screenshot=${warpBytes} bytes`);
  }finally{
    cdp?.close();
    await stop(browser);
    await cleanupProfile(profile);
  }
}

const chrome=findChrome();
if(!chrome){
  console.log('Warp Corridor Peripheral Starflow browser: SKIPPED (Chromium unavailable)');
  process.exit(0);
}
const serverPort=await freePort(),server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{
  const base=`http://127.0.0.1:${serverPort}/`;
  await waitHttp(base);
  await inspect(chrome,base,390,844);
  await inspect(chrome,base,360,800);
  console.log('Warp Corridor Peripheral Starflow browser: 2/2 phone viewports passed');
}finally{
  await stop(server);
}
