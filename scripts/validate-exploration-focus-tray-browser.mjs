import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
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
    const resolved=commandPath(candidate);if(resolved)return resolved;
  }
  return'';
}
async function freePort(){
  return await new Promise((resolve,reject)=>{
    const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{
      const address=server.address(),port=typeof address==='object'&&address?address.port:0;
      server.close(error=>error?reject(error):resolve(port));
    });
  });
}
async function waitUntil(fn,label,timeoutMs=12000){
  const deadline=Date.now()+timeoutMs;let lastError=null;
  while(Date.now()<deadline){
    try{const value=await fn();if(value)return value}catch(error){lastError=error}
    await sleep(80);
  }
  throw new Error(`Timed out waiting for ${label}${lastError?` (${lastError.message})`:''}`);
}
async function stopChild(child){
  if(!child||child.exitCode!==null)return;
  const exited=new Promise(resolve=>child.once('exit',resolve));
  child.kill('SIGTERM');
  await Promise.race([exited,sleep(800)]);
  if(child.exitCode===null){
    child.kill('SIGKILL');
    await Promise.race([exited,sleep(1200)]);
  }
}
async function removeTree(path){
  const retryable=new Set(['EBUSY','ENOTEMPTY','EPERM']);let lastError=null;
  for(let attempt=0;attempt<8;attempt++){
    try{
      rmSync(path,{recursive:true,force:true,maxRetries:2,retryDelay:80});
      return;
    }catch(error){
      lastError=error;
      if(!retryable.has(error?.code))throw error;
      await sleep(100*(attempt+1));
    }
  }
  throw lastError;
}
async function waitHttp(url){
  return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`local server ${url}`,8000);
}

class CdpClient{
  constructor(url){this.url=url;this.nextId=0;this.pending=new Map();this.eventWaiters=new Map();this.ws=null}
  async connect(){
    this.ws=new WebSocket(this.url);
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{cleanup();reject(new Error('CDP WebSocket connection timed out'))},8000);
      const cleanup=()=>{clearTimeout(timer);this.ws.removeEventListener('open',open);this.ws.removeEventListener('error',fail)};
      const open=()=>{cleanup();resolve()},fail=event=>{cleanup();reject(event.error||new Error('CDP WebSocket failed'))};
      this.ws.addEventListener('open',open);this.ws.addEventListener('error',fail);
    });
    this.ws.addEventListener('message',event=>{
      const message=JSON.parse(String(event.data));
      if(!message.id){
        const waiters=this.eventWaiters.get(message.method)||[];
        if(waiters.length){
          this.eventWaiters.delete(message.method);
          for(const waiter of waiters){clearTimeout(waiter.timer);waiter.resolve(message.params||{})}
        }
        return;
      }
      const pending=this.pending.get(message.id);if(!pending)return;
      this.pending.delete(message.id);clearTimeout(pending.timer);
      if(message.error)pending.reject(new Error(message.error.message||'CDP error'));else pending.resolve(message.result||{});
    });
  }
  send(method,params={},timeoutMs=10000){
    assert(this.ws?.readyState===WebSocket.OPEN,`CDP socket must be open before ${method}`);
    const id=++this.nextId;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP command timed out: ${method}`))},timeoutMs);
      this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  waitEvent(method,timeoutMs=10000){
    return new Promise((resolve,reject)=>{
      const waiter={resolve,reject,timer:null};
      waiter.timer=setTimeout(()=>{
        const queue=this.eventWaiters.get(method)||[],next=queue.filter(item=>item!==waiter);
        if(next.length)this.eventWaiters.set(method,next);else this.eventWaiters.delete(method);
        reject(new Error(`CDP event timed out: ${method}`));
      },timeoutMs);
      const queue=this.eventWaiters.get(method)||[];queue.push(waiter);this.eventWaiters.set(method,queue);
    });
  }
  close(){
    for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new Error('CDP socket closed'))}
    this.pending.clear();
    for(const waiters of this.eventWaiters.values())for(const waiter of waiters){clearTimeout(waiter.timer);waiter.reject(new Error('CDP socket closed'))}
    this.eventWaiters.clear();
    try{this.ws?.close()}catch{}
  }
}
async function evaluate(cdp,expression,label='Runtime.evaluate'){
  try{
    const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});
    if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Runtime.evaluate failed');
    return result.result?.value;
  }catch(error){
    throw new Error(`${label}: ${error.message}`);
  }
}
async function waitExpression(cdp,expression,label,timeoutMs=12000){return waitUntil(()=>evaluate(cdp,expression,label),label,timeoutMs)}
async function loadProductionScript(cdp,src,globalName){
  await evaluate(cdp,`(()=>{const id='stellarHarness-${globalName}';if(document.getElementById(id))return true;const script=document.createElement('script');script.id=id;script.src=${JSON.stringify(src)};script.async=false;document.head.append(script);return true})()`,`inject ${src}`);
  await waitExpression(cdp,`!!window[${JSON.stringify(globalName)}]`,`${globalName} production script`);
}
async function clickSelector(cdp,selector){
  const point=await waitUntil(async()=>{
    const state=await evaluate(cdp,`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect(),s=getComputedStyle(el),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return{ok:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.pointerEvents!=='none'&&(hit===el||el.contains(hit)),x,y,hit:hit?.id||hit?.getAttribute?.('data-hub-action')||hit?.tagName||''}})()`,`hit-test ${selector}`);
    return state?.ok?state:null;
  },`hit-testable ${selector}`,3000);
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
}
async function waitCardSettled(cdp,label){
  return waitExpression(cdp,`(()=>{const card=document.querySelector('#exploreCard');if(!card?.classList.contains('hubOpen'))return false;const r=card.getBoundingClientRect(),s=getComputedStyle(card),left=Number.parseFloat(s.left);return s.opacity==='1'&&s.pointerEvents!=='none'&&s.transform==='none'&&Number.isFinite(left)&&Math.abs(r.left-left)<1.5})()`,label,3500);
}
async function captureScreenshot(cdp,name){
  mkdirSync(EVIDENCE_DIR,{recursive:true});
  const shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false},10000);
  writeFileSync(join(EVIDENCE_DIR,name),Buffer.from(shot.data,'base64'));
}
async function snapshot(cdp){
  return evaluate(cdp,`(()=>{const card=document.querySelector('#exploreCard'),r=card.getBoundingClientRect(),s=getComputedStyle(card);return{viewport:{width:innerWidth,height:innerHeight},pane:card.dataset.hubPane||'',open:card.classList.contains('hubOpen'),active:!!window.WarpExplorationFocusTray?.active?.(),rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},computed:{maxHeight:s.maxHeight,left:s.left,right:s.right,bottom:s.bottom,overflowY:s.overflowY,transform:s.transform}}})()`,'Focus Tray geometry snapshot');
}
function px(value){const parsed=Number.parseFloat(value);return Number.isFinite(parsed)?parsed:null}
function assertTray(state,width,height){
  assert.deepEqual(state.viewport,{width,height});assert.equal(state.pane,'explore');assert.equal(state.open,true);assert.equal(state.active,true);
  const narrow=width<=360,maxHeight=Math.min(height*(narrow?.44:.42),narrow?352:360),minVisible=narrow?.56:.58;
  assert(state.rect.height<=maxHeight+1.5,`Focus Tray height ${state.rect.height.toFixed(1)}px exceeds ${maxHeight.toFixed(1)}px`);
  assert(state.rect.left>=(narrow?17:19),`Focus Tray left ${state.rect.left.toFixed(1)}px respects safe-area inset`);
  assert(width-state.rect.right>=(narrow?17:19),`Focus Tray right gap ${(width-state.rect.right).toFixed(1)}px respects safe-area inset`);
  assert(height-state.rect.bottom>=17,`Focus Tray bottom gap ${(height-state.rect.bottom).toFixed(1)}px respects safe-area inset`);
  assert(1-state.rect.height/height>=minVisible-.002,`Focus Tray preserves at least ${Math.round(minVisible*100)}% scenery height`);
  const computedMax=px(state.computed.maxHeight);assert(computedMax!==null&&computedMax<=maxHeight+1.5,'browser resolves Focus Tray max-height contract');
  return{maxHeight,bottomGap:height-state.rect.bottom};
}
function assertDrawer(state,name,tray,metrics){
  assert.equal(state.pane,name);assert.equal(state.open,true);assert.equal(state.active,false);
  const bottomGap=state.viewport.height-state.rect.bottom;
  assert(state.rect.left>=tray.rect.left+30,`${name} retains original left-drawer offset`);
  assert(bottomGap>=metrics.bottomGap+30,`${name} retains original raised drawer bottom offset`);
  assert(state.rect.width<=tray.rect.width-25,`${name} remains narrower than Focus Tray`);
  const max=px(state.computed.maxHeight);assert(max!==null&&max>=metrics.maxHeight+100,`${name} retains original taller drawer bound`);
}

async function inspectViewport(chrome,baseUrl,width,height){
  const viewport=`${width}x${height}`;
  const stage=message=>console.log(`[Focus Tray browser ${viewport}] ${message}`);
  const profile=mkdtempSync(join(tmpdir(),`stellar-wrap-layout-${width}-`));let browser=null,cdp=null,chromeError='';
  try{
    stage('launch headless Chrome');
    const debugPort=await freePort();
    browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
    browser.stderr?.on('data',chunk=>{chromeError=(chromeError+String(chunk)).slice(-4000)});
    const target=await waitUntil(async()=>{
      if(browser.exitCode!==null)throw new Error(`Chrome exited ${browser.exitCode}: ${chromeError.trim()||'no stderr'}`);
      try{
        const response=await fetch(`http://127.0.0.1:${debugPort}/json/list`),targets=await response.json();
        return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null;
      }catch{return null}
    },`Chrome page target ${viewport}`,12000);
    cdp=new CdpClient(target.webSocketDebuggerUrl);await cdp.connect();
    await cdp.send('Page.enable');await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height});
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});

    // Render the real production document/CSS without starting the simulator's WebGL runtime. The two exact
    // production UI scripts under test are then loaded through the local server as browser scripts, avoiding
    // a giant Runtime.evaluate payload and keeping the layout gate deterministic on software CI runners.
    await cdp.send('Emulation.setScriptExecutionDisabled',{value:true});
    const loaded=cdp.waitEvent('Page.loadEventFired',10000);
    await cdp.send('Page.navigate',{url:baseUrl});
    await loaded;
    await cdp.send('Emulation.setScriptExecutionDisabled',{value:false});
    await waitExpression(cdp,"document.readyState==='complete'&&!!document.querySelector('#app')&&!!document.querySelector('#exploreCard')",'production page DOM');
    stage('production document and CSS loaded');

    // Provide only the existing read-only state authority needed by Explore Hub, then load the exact production
    // modules over HTTP. No test-only branch exists inside product source and no layout value is mocked.
    await evaluate(cdp,`(()=>{window.WarpSim={state:()=>({current:'LUNA',selected:null,route:[],phase:'observe',flying:false,exploring:true,contextLost:false}),select:()=>{},launch:()=>{},abort:()=>{}};window.WarpStarAtlas={snapshot:()=>({discoveries:{}})};document.querySelector('#loading')?.remove();return true})()`,'install bounded UI state authority');
    await loadProductionScript(cdp,`${baseUrl}explore-hub.js`,'WarpExploreHub');
    await loadProductionScript(cdp,`${baseUrl}exploration-focus-tray.js`,'WarpExplorationFocusTray');
    stage('production Explore Hub and Focus Tray scripts loaded');

    // Enter final exploration only after observers/listeners are mounted, matching the real lifecycle.
    await evaluate(cdp,`(()=>{const app=document.querySelector('#app'),card=document.querySelector('#exploreCard');app.classList.add('ready','exploring');card.classList.add('show');card.classList.remove('transit','collapsed');return true})()`,'enter final exploration');
    await waitExpression(cdp,"!!window.WarpExploreHub&&!!window.WarpExplorationFocusTray&&document.querySelector('#app')?.classList.contains('exploreHubMobile')&&!!document.querySelector('#exploreRailToggle')",'production Explore Hub browser bootstrap');

    await clickSelector(cdp,'#exploreRailToggle');
    await waitExpression(cdp,"document.querySelector('#exploreRailToggle')?.getAttribute('aria-expanded')==='true'",'expanded Explore chooser');
    await clickSelector(cdp,'[data-hub-action="explore"]');
    await waitExpression(cdp,"document.querySelector('#exploreCard')?.dataset.hubPane==='explore'&&document.querySelector('#exploreCard')?.classList.contains('hubOpen')",'Focus Tray open');
    await waitCardSettled(cdp,'Focus Tray visual transition settled');
    const tray=await snapshot(cdp),metrics=assertTray(tray,width,height);
    await captureScreenshot(cdp,`focus-tray-${viewport}.png`);
    stage(`Focus Tray geometry accepted (${tray.rect.width.toFixed(1)}×${tray.rect.height.toFixed(1)}px)`);

    await clickSelector(cdp,'#exploreRailToggle');
    await waitExpression(cdp,"document.querySelector('#exploreRailToggle')?.getAttribute('aria-expanded')==='true'&&!document.querySelector('#exploreCard')?.classList.contains('hubOpen')",'chooser reopens after tray');
    await clickSelector(cdp,'[data-hub-action="overview"]');
    await waitExpression(cdp,"document.querySelector('#exploreCard')?.dataset.hubPane==='overview'&&document.querySelector('#exploreCard')?.classList.contains('hubOpen')",'Overview drawer open');
    await waitCardSettled(cdp,'Overview drawer visual transition settled');
    assertDrawer(await snapshot(cdp),'overview',tray,metrics);

    await clickSelector(cdp,'#exploreRailToggle');
    await waitExpression(cdp,"document.querySelector('#exploreRailToggle')?.getAttribute('aria-expanded')==='true'&&!document.querySelector('#exploreCard')?.classList.contains('hubOpen')",'chooser reopens after Overview');
    await clickSelector(cdp,'[data-hub-action="discovery"]');
    await waitExpression(cdp,"document.querySelector('#exploreCard')?.dataset.hubPane==='discovery'&&document.querySelector('#exploreCard')?.classList.contains('hubOpen')",'Discovery drawer open');
    await waitCardSettled(cdp,'Discovery drawer visual transition settled');
    assertDrawer(await snapshot(cdp),'discovery',tray,metrics);
    console.log(`Exploration Focus Tray real browser ${viewport}: passed`);
  }catch(error){
    if(cdp)await captureScreenshot(cdp,`failure-${viewport}.png`).catch(()=>{});
    throw error;
  }finally{
    cdp?.close();
    await stopChild(browser);
    await removeTree(profile);
  }
}

const chrome=findChrome();
if(!chrome){
  if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Focus Tray browser validation in CI');
  console.log('Exploration Focus Tray real browser: skipped because Chrome/Chromium is unavailable outside CI');process.exit(0);
}
const port=await freePort(),baseUrl=`http://127.0.0.1:${port}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:'ignore'});
try{
  await waitHttp(baseUrl);
  for(const [width,height] of [[390,844],[360,800]])await inspectViewport(chrome,baseUrl,width,height);
}finally{await stopChild(server)}