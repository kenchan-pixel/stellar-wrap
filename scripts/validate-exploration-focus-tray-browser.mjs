import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function commandPath(name){
  if(!name)return'';
  if(name.includes('/')&&existsSync(name))return name;
  const probe=spawnSync('which',[name],{encoding:'utf8'});
  return probe.status===0?probe.stdout.trim():'';
}
function findChrome(){
  for(const candidate of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){
    const resolved=commandPath(candidate);
    if(resolved)return resolved;
  }
  return'';
}
async function freePort(){
  return await new Promise((resolve,reject)=>{
    const server=createTcpServer();
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{
      const address=server.address();
      const port=typeof address==='object'&&address?address.port:0;
      server.close(error=>error?reject(error):resolve(port));
    });
  });
}
async function waitUntil(fn,label,timeoutMs=12000){
  const deadline=Date.now()+timeoutMs;
  let lastError=null;
  while(Date.now()<deadline){
    try{
      const value=await fn();
      if(value)return value;
    }catch(error){lastError=error}
    await sleep(80);
  }
  const suffix=lastError?` (${lastError.message})`:'';
  throw new Error(`Timed out waiting for ${label}${suffix}`);
}
async function waitHttp(url){
  return waitUntil(async()=>{
    const response=await fetch(url,{cache:'no-store'});
    return response.ok;
  },`local server ${url}`,8000);
}

class CdpClient{
  constructor(url){
    this.url=url;this.nextId=0;this.pending=new Map();this.ws=null;
  }
  async connect(){
    this.ws=new WebSocket(this.url);
    await new Promise((resolve,reject)=>{
      const onOpen=()=>{cleanup();resolve()};
      const onError=event=>{cleanup();reject(event.error||new Error('CDP WebSocket failed'))};
      const cleanup=()=>{this.ws.removeEventListener('open',onOpen);this.ws.removeEventListener('error',onError)};
      this.ws.addEventListener('open',onOpen);
      this.ws.addEventListener('error',onError);
    });
    this.ws.addEventListener('message',event=>{
      const message=JSON.parse(String(event.data));
      if(!message.id)return;
      const pending=this.pending.get(message.id);if(!pending)return;
      this.pending.delete(message.id);
      if(message.error)pending.reject(new Error(`${message.error.message||'CDP error'} (${message.error.code||'?'})`));
      else pending.resolve(message.result||{});
    });
    this.ws.addEventListener('close',()=>{
      for(const pending of this.pending.values())pending.reject(new Error('CDP WebSocket closed'));
      this.pending.clear();
    });
  }
  send(method,params={}){
    assert(this.ws&&this.ws.readyState===WebSocket.OPEN,`CDP socket must be open before ${method}`);
    const id=++this.nextId;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  close(){try{this.ws?.close()}catch{}}
}

async function evaluate(cdp,expression){
  const response=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(response.exceptionDetails){
    const description=response.exceptionDetails.exception?.description||response.exceptionDetails.text||'Runtime.evaluate failed';
    throw new Error(description);
  }
  return response.result?.value;
}
async function waitExpression(cdp,expression,label,timeoutMs=20000){
  return waitUntil(async()=>await evaluate(cdp,expression),label,timeoutMs);
}
async function clickSelector(cdp,selector){
  const point=await evaluate(cdp,`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect();const s=getComputedStyle(el);return{visible:r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&s.pointerEvents!=='none',x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  assert(point?.visible,`${selector} must be visible and pointer-interactive`);
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
}
async function cardSnapshot(cdp){
  return await evaluate(cdp,`(()=>{const card=document.querySelector('#exploreCard');const r=card.getBoundingClientRect();const s=getComputedStyle(card);return{viewport:{width:innerWidth,height:innerHeight},pane:card.dataset.hubPane||'',open:card.classList.contains('hubOpen'),active:!!window.WarpExplorationFocusTray?.active?.(),rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},computed:{left:s.left,right:s.right,bottom:s.bottom,maxHeight:s.maxHeight,overflowY:s.overflowY},toggleExpanded:document.querySelector('#exploreRailToggle')?.getAttribute('aria-expanded')||''}})()`);
}
function numeric(value){const number=Number.parseFloat(value);return Number.isFinite(number)?number:null}
function validateTray(snapshot,width,height){
  assert.equal(snapshot.viewport.width,width,'browser viewport width matches acceptance viewport');
  assert.equal(snapshot.viewport.height,height,'browser viewport height matches acceptance viewport');
  assert.equal(snapshot.pane,'explore','real Explore control opens the Explore pane');
  assert.equal(snapshot.open,true,'Explore pane is visually open');
  assert.equal(snapshot.active,true,'Focus Tray diagnostic agrees with the rendered Explore pane');
  const narrow=width<=360;
  const maxHeight=Math.min(height*(narrow ? .44 : .42),narrow?352:360);
  assert(snapshot.rect.height<=maxHeight+1.5,`tray height ${snapshot.rect.height.toFixed(1)} stays below ${maxHeight.toFixed(1)}px bound`);
  const horizontalGap=narrow?17:19;
  assert(snapshot.rect.left>=horizontalGap,`tray left ${snapshot.rect.left.toFixed(1)} respects safe horizontal inset`);
  assert(width-snapshot.rect.right>=horizontalGap,`tray right gap ${(width-snapshot.rect.right).toFixed(1)} respects safe horizontal inset`);
  const bottomGap=height-snapshot.rect.bottom;
  assert(bottomGap>=17,`tray bottom gap ${bottomGap.toFixed(1)} respects safe bottom inset`);
  const minVisibleRatio=narrow ? .56 : .58;
  const visibleRatio=1-(snapshot.rect.height/height);
  assert(visibleRatio>=minVisibleRatio-.002,`Focus Tray leaves at least ${(minVisibleRatio*100).toFixed(0)}% of viewport height unobstructed`);
  assert(snapshot.rect.top>=0&&snapshot.rect.bottom<=height,'tray stays vertically inside the real viewport');
  const computedMax=numeric(snapshot.computed.maxHeight);
  assert(computedMax!==null&&computedMax<=maxHeight+1.5,'computed max-height resolves to the intended browser bound');
  return{bottomGap,maxHeight};
}
function validateDrawer(snapshot,name,exploreSnapshot,exploreMetrics){
  assert.equal(snapshot.pane,name,`${name} control opens its existing pane`);
  assert.equal(snapshot.open,true,`${name} drawer is open`);
  assert.equal(snapshot.active,false,`${name} does not activate Focus Tray`);
  const viewportHeight=snapshot.viewport.height;
  const bottomGap=viewportHeight-snapshot.rect.bottom;
  assert(snapshot.rect.left>=exploreSnapshot.rect.left+30,`${name} keeps the original left drawer offset`);
  assert(bottomGap>=exploreMetrics.bottomGap+30,`${name} keeps the original raised drawer bottom offset`);
  assert(snapshot.rect.width<=exploreSnapshot.rect.width-25,`${name} remains narrower than the bottom Focus Tray`);
  const computedMax=numeric(snapshot.computed.maxHeight);
  assert(computedMax!==null&&computedMax>=exploreMetrics.maxHeight+100,`${name} keeps the original taller drawer max-height`);
}

async function inspectViewport(chrome,baseUrl,width,height){
  const profile=mkdtempSync(join(tmpdir(),`stellar-wrap-browser-${width}-`));
  let browser=null;let cdp=null;
  try{
    browser=spawn(chrome,[
      '--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check',
      '--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=0',
      `--user-data-dir=${profile}`,'about:blank'
    ],{stdio:'ignore'});
    const activePortFile=join(profile,'DevToolsActivePort');
    await waitUntil(()=>existsSync(activePortFile),`Chrome DevTools port for ${width}x${height}`,8000);
    const debugPort=Number(readFileSync(activePortFile,'utf8').split(/\r?\n/)[0]);
    const target=await waitUntil(async()=>{
      const response=await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets=await response.json();
      return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null;
    },'Chrome page target',8000);
    cdp=new CdpClient(target.webSocketDebuggerUrl);await cdp.connect();
    await cdp.send('Page.enable');await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height});
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    await cdp.send('Page.navigate',{url:baseUrl});
    await waitExpression(cdp,"document.readyState==='complete'&&!!window.WarpSim&&!!window.WarpExploreHub&&!!window.WarpExplorationFocusTray&&!!document.querySelector('#exploreRailToggle')",'production simulator + Explore Hub bootstrap',30000);
    await evaluate(cdp,"WarpSim.jumpTo('LUNA');true");
    await waitExpression(cdp,"document.querySelector('#app')?.classList.contains('exploreHubMobile')&&!document.querySelector('#exploreCard')?.classList.contains('hubOpen')",'compact final-exploration state');

    await clickSelector(cdp,'#exploreRailToggle');
    await waitExpression(cdp,"document.querySelector('#exploreRailToggle')?.getAttribute('aria-expanded')==='true'",'expanded real Explore chooser');
    await clickSelector(cdp,'[data-hub-action="explore"]');
    await waitExpression(cdp,"document.querySelector('#exploreCard')?.classList.contains('hubOpen')&&document.querySelector('#exploreCard')?.dataset.hubPane==='explore'",'real Focus Tray open');
    const explore=await cardSnapshot(cdp);const metrics=validateTray(explore,width,height);

    await clickSelector(cdp,'#exploreRailToggle');
    await waitExpression(cdp,"document.querySelector('#exploreRailToggle')?.getAttribute('aria-expanded')==='true'&&!document.querySelector('#exploreCard')?.classList.contains('hubOpen')",'chooser reopens after closing Focus Tray');
    await clickSelector(cdp,'[data-hub-action="overview"]');
    await waitExpression(cdp,"document.querySelector('#exploreCard')?.dataset.hubPane==='overview'&&document.querySelector('#exploreCard')?.classList.contains('hubOpen')",'Overview drawer open');
    validateDrawer(await cardSnapshot(cdp),'overview',explore,metrics);

    await clickSelector(cdp,'#exploreRailToggle');
    await waitExpression(cdp,"document.querySelector('#exploreRailToggle')?.getAttribute('aria-expanded')==='true'&&!document.querySelector('#exploreCard')?.classList.contains('hubOpen')",'chooser reopens after Overview');
    await clickSelector(cdp,'[data-hub-action="discovery"]');
    await waitExpression(cdp,"document.querySelector('#exploreCard')?.dataset.hubPane==='discovery'&&document.querySelector('#exploreCard')?.classList.contains('hubOpen')",'Discovery drawer open');
    validateDrawer(await cardSnapshot(cdp),'discovery',explore,metrics);

    console.log(`Exploration Focus Tray real browser ${width}x${height}: passed`);
  }finally{
    cdp?.close();
    if(browser&&!browser.killed)browser.kill('SIGTERM');
    await sleep(120);
    rmSync(profile,{recursive:true,force:true});
  }
}

const chrome=findChrome();
if(!chrome){
  if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Focus Tray browser validation in CI');
  console.log('Exploration Focus Tray real browser: skipped because Chrome/Chromium is unavailable outside CI');
  process.exit(0);
}

const port=await freePort();
const baseUrl=`http://127.0.0.1:${port}/`;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:'ignore'});
try{
  await waitHttp(baseUrl);
  for(const [width,height] of [[390,844],[360,800]])await inspectViewport(chrome,baseUrl,width,height);
}finally{
  if(!server.killed)server.kill('SIGTERM');
}
