import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const source=readFileSync('frontier-scenic.html','utf8');
const EVIDENCE_DIR=join(process.cwd(),'artifacts','frontier-destination-handoff');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

assert.ok(source.includes('FRONTIER DESTINATIONS｜科幻目的地'));
assert.ok(source.includes('DESTINATION CONFIRM｜目的地確認'));
assert.ok(source.includes('FRONTIER ARRIVAL SIGNATURE'));
assert.ok(source.includes('>前往景觀</button>'));
for(const id of ['AURELIA','NADIR','VESPER','EIDOLON']){
  assert.ok(source.includes(`.transition[data-signature="${id}"]`),`${id} needs its own arrival signature`);
}
assert.match(source,/signature:'棲息環鎖定/);
assert.match(source,/signature:'引力透鏡鎖定/);
assert.match(source,/signature:'雲頂航標鎖定/);
assert.match(source,/signature:'遺跡相位鎖定/);
assert.match(source,/TRANSITION_MS=TEST_MODE\?480:780/);
assert.match(source,/\.transition\{position:absolute;z-index:11/);
assert.match(source,/arrivalSignature:transition\.classList\.contains\('active'\)/);
assert.doesNotMatch(source,/Dijkstra|routeDistance|warpSeconds|WarpSim\.(?:select|start|isRouteValid)/);
assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon|requestAnimationFrame/);
console.log('Frontier arrival-signature static contract passed');

function commandPath(name){
  if(!name)return'';
  if(name.includes('/')&&existsSync(name))return name;
  const p=spawnSync('which',[name],{encoding:'utf8'});
  return p.status===0?p.stdout.trim():'';
}
function findChrome(){
  for(const c of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){
    const p=commandPath(c);if(p)return p;
  }
  return'';
}
async function freePort(){
  return await new Promise((resolve,reject)=>{
    const server=createTcpServer();server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{const a=server.address(),port=typeof a==='object'&&a?a.port:0;server.close(e=>e?reject(e):resolve(port));});
  });
}
async function waitUntil(fn,label,timeout=24000){
  const end=Date.now()+timeout;let last;
  while(Date.now()<end){try{const v=await fn();if(v)return v;}catch(e){last=e;}await sleep(60);}
  throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`);
}
async function stop(child){
  if(!child||child.exitCode!==null)return;
  const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');
  await Promise.race([done,sleep(700)]);if(child.exitCode===null)child.kill('SIGKILL');
}
async function waitHttp(url){return waitUntil(async()=>{const r=await fetch(url,{cache:'no-store'});return r.ok;},`server ${url}`,8000);}
class Cdp{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map();}
  async connect(){
    this.ws=new WebSocket(this.url);
    await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});this.ws.addEventListener('error',e=>{clearTimeout(t);reject(e.error||new Error('CDP error'));},{once:true});});
    this.ws.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(!m.id){const q=this.events.get(m.method)||[];this.events.delete(m.method);q.forEach(w=>{clearTimeout(w.timer);w.resolve(m.params||{});});return;}const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(pending?.timer);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result||{});});
  }
  send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`));},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}));});}
  waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const w={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const q=this.events.get(method)||[];q.push(w);this.events.set(method,q);});}
  close(){try{this.ws?.close();}catch{}}
}
async function evalJs(cdp,expression,awaitPromise=false){
  const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result?.value;
}
async function targetPoint(cdp,selector){return evalJs(cdp,`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,disabled:!!e.disabled}})()`);}
async function trustedTap(cdp,selector){
  const p=await targetPoint(cdp,selector);assert.ok(p,`missing ${selector}`);assert.ok(p.w>=44&&p.h>=44,`${selector} must be >=44px`);assert.equal(p.disabled,false);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,radiusX:5,radiusY:5,force:1,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const r=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(r.data,'base64');await import('node:fs').then(fs=>fs.writeFileSync(join(EVIDENCE_DIR,name),data));return data.length;}

async function inspect(chrome,base,width,height){
  const profile=mkdtempSync(join(tmpdir(),`stellar-frontier-signature-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();
    browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
    browser.stderr?.on('data',c=>stderr=(stderr+String(c)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const r=await fetch(`http://127.0.0.1:${port}/json/list`),items=await r.json();return items.find(x=>x.type==='page'&&x.webSocketDebuggerUrl)||null;}catch{return null;}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}frontier-scenic.html?dest=AURELIA`});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpFrontierScenic&&!!WarpFrontierScenic.state().child&&document.querySelector('#scenicApp')?.classList.contains('ready')"),'AURELIA scenic runtime',30000);
    await evalJs(cdp,'WarpFrontierScenic.skipArrival()');
    await waitUntil(()=>evalJs(cdp,"WarpFrontierScenic.state().child?.phase==='explore'&&WarpFrontierScenic.state().child?.vista==='overview'"),'AURELIA fixed overview',12000);
    await trustedTap(cdp,'#routeButton');
    await waitUntil(()=>evalJs(cdp,'WarpFrontierScenic.state().selectorOpen===true'),'destination selector');
    await trustedTap(cdp,'[data-dest="NADIR"]');
    await waitUntil(()=>evalJs(cdp,"WarpFrontierScenic.state().selectionPending==='NADIR'&&WarpFrontierScenic.state().selectionVisible"),'NADIR staged');
    assert.equal(await evalJs(cdp,"WarpFrontierScenic.state().destination"),'AURELIA');
    await trustedTap(cdp,'#destinationCommitConfirm');
    const evidenceName=`frontier-arrival-signature-${width}x${height}.png`;
    const handoff=await waitUntil(async()=>{
      const sample=await evalJs(cdp,"(()=>{const t=document.querySelector('#transition'),sig=document.querySelector('.transitionSig');if(!t||!sig)return null;const tr=t.getBoundingClientRect(),sr=sig.getBoundingClientRect(),ts=getComputedStyle(t),state=WarpFrontierScenic.state();const ready=state.switching&&state.transitionVisible&&state.arrivalSignature==='NADIR'&&t.classList.contains('active')&&t.getAttribute('aria-hidden')==='false'&&ts.visibility==='visible'&&Number(ts.opacity)>.9;return{ready,active:t.classList.contains('active'),aria:t.getAttribute('aria-hidden'),opacity:Number(ts.opacity),visibility:ts.visibility,signature:state.arrivalSignature,copy:document.querySelector('#transitionSignature')?.textContent,from:document.querySelector('#transitionFrom')?.textContent,to:document.querySelector('#transitionTo')?.textContent,sigW:sr.width,sigH:sr.height,inViewport:sr.left>=0&&sr.right<=innerWidth+1&&sr.top>=0&&sr.bottom<=innerHeight+1,overlayW:tr.width,overlayH:tr.height,captureDisabled:document.querySelector('#capture')?.disabled}})()");
      if(!sample?.ready)return false;
      sample.screenshotBytes=await screenshot(cdp,evidenceName);
      return sample;
    },'rendered NADIR signature handoff',2200);
    assert.equal(handoff.active,true);assert.equal(handoff.aria,'false');assert.equal(handoff.visibility,'visible');assert.ok(handoff.opacity>.9);
    assert.equal(handoff.signature,'NADIR');assert.ok(handoff.copy.includes('事件視界'));assert.ok(handoff.from.includes('AURELIA ARC'));assert.ok(handoff.to.includes('NADIR WELL'));
    assert.ok(handoff.sigW>=100&&handoff.sigH>=80);assert.equal(handoff.inViewport,true);assert.equal(handoff.overlayW,width);assert.equal(handoff.overlayH,height);assert.equal(handoff.captureDisabled,true);
    assert.ok(handoff.screenshotBytes>8000);
    await waitUntil(()=>evalJs(cdp,"WarpFrontierScenic.state().destination==='NADIR'&&!WarpFrontierScenic.state().switching&&!!WarpFrontierScenic.state().child"),'NADIR destination loaded',30000);
    assert.equal(await evalJs(cdp,'WarpFrontierScenic.state().arrivalSignature'),'');
    await evalJs(cdp,'WarpFrontierScenic.skipArrival()');
    await waitUntil(()=>evalJs(cdp,"WarpFrontierScenic.state().child?.phase==='explore'&&WarpFrontierScenic.state().child?.vista==='overview'"),'NADIR fixed overview',12000);
    const finalState=await evalJs(cdp,"(()=>({destination:WarpFrontierScenic.state().destination,fixed:WarpFrontierScenic.state().fixed,framePointerEvents:WarpFrontierScenic.state().framePointerEvents,overflow:document.documentElement.scrollWidth>innerWidth+1}))()");
    assert.deepEqual(finalState,{destination:'NADIR',fixed:true,framePointerEvents:'none',overflow:false});
    console.log(`Frontier arrival signature browser ${width}x${height}: trusted AURELIA→NADIR handoff + bounded signature + fixed arrival passed`);
  }catch(error){if(cdp)await screenshot(cdp,`frontier-arrival-signature-failure-${width}x${height}.png`).catch(()=>{});throw error;}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80});}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Frontier arrival-signature validation');console.log('Frontier arrival-signature browser validation skipped: Chrome/Chromium not available');process.exit(0);}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Frontier arrival-signature validation passed at both phone viewports');}finally{await stop(server);}
