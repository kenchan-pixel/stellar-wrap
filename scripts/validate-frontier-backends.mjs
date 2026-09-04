import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const BACKENDS={
  AURELIA:{path:'frontier.html',api:'WarpFrontier'},
  NADIR:{path:'frontier-nadir.html',api:'WarpFrontierNadir'},
  VESPER:{path:'frontier-vesper.html',api:'WarpFrontierVesper'},
  EIDOLON:{path:'frontier-eidolon.html',api:'WarpFrontierEidolon'}
};
const EVIDENCE_DIR=join(process.cwd(),'artifacts','mode-gateway-browser');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let passes=0;
const ok=(condition,message)=>{assert.ok(condition,message);passes++};

for(const [id,backend] of Object.entries(BACKENDS)){
  const source=readFileSync(backend.path,'utf8');
  ok((source.match(/new THREE\.WebGLRenderer/g)||[]).length===1,`${id} must keep exactly one WebGL renderer`);
  ok(source.includes('three@0.185.1'),`${id} must keep the pinned Three.js runtime`);
  ok(source.includes('preserveDrawingBuffer:false'),`${id} must keep the normal framebuffer memory boundary`);
  ok(source.includes('MAX_NORMAL_DPR=1.25')&&source.includes('MAX_CAPTURE_DPR=1.60'),`${id} must keep bounded normal/capture DPR tiers`);
  ok(source.includes(`window.${backend.api}=`),`${id} must expose its scenic child API`);
  ok(/capture\s*\(|capture\}/.test(source),`${id} must retain its high-resolution capture path`);
  ok(source.includes('drawCalls')&&source.includes('triangles'),`${id} state must expose renderer-cost diagnostics`);
  ok(source.includes('backingWidth')&&source.includes('backingHeight')&&source.includes('pixelRatio'),`${id} state must expose capture/restore diagnostics`);
  ok(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/.test(source),`${id} renderer backend must add no persistence/background-network authority`);
}
console.log(`Frontier renderer backend static contract: ${passes}/${passes} passed`);

function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const c of [process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(c);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=24000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
class Cdp{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)};const queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}close(){try{this.ws?.close()}catch{}}}
async function evalJs(cdp,expression,awaitPromise=false){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function screenshot(cdp,name){mkdirSync(EVIDENCE_DIR,{recursive:true});const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const data=Buffer.from(result.data,'base64');writeFileSync(join(EVIDENCE_DIR,name),data);return data.length}
function assertAureliaV3Live(state,label){
  const detail=state?.habitatDetail;
  assert.ok(detail,`${label} must expose live AURELIA habitat detail diagnostics`);
  assert.equal(detail.profile,'AURELIA_HABITAT_V3',`${label} must keep the live AURELIA v3 profile`);
  assert.equal(detail.skylineTowers,32,`${label} must keep 32 live skyline tower instances`);
  assert.equal(detail.solarVanes,12,`${label} must keep 12 live solar-vane instances`);
  assert.equal(detail.objects,5,`${label} must keep the five-object AURELIA detail layer`);
  assert.equal(detail.detailTriangles,2832,`${label} must keep the 2,832-triangle AURELIA detail budget`);
  assert.ok(state.drawCalls>=17,`${label} must keep the v3 detail layers live in the renderer, got ${state.drawCalls} draws`);
  assert.ok(state.triangles>=13396,`${label} must keep the v3 detail layers live in the renderer, got ${state.triangles} triangles`);
}

async function inspect(chrome,base,width,height){
  const viewport=`${width}x${height}`,profile=mkdtempSync(join(tmpdir(),`stellar-frontier-backends-${width}-`));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}frontier-scenic.html?dest=AURELIA`});await loaded;
    await waitUntil(()=>evalJs(cdp,'!!window.WarpFrontierScenic&&!!WarpFrontierScenic.state().child'),'Frontier scenic runtime',30000);
    const evidence={};
    for(const id of Object.keys(BACKENDS)){
      if((await evalJs(cdp,'WarpFrontierScenic.state().destination'))!==id){
        await evalJs(cdp,`WarpFrontierScenic.select('${id}')`);
        await waitUntil(()=>evalJs(cdp,`WarpFrontierScenic.state().destination==='${id}'&&!!WarpFrontierScenic.state().child`),`${id} child runtime`,30000);
      }
      await evalJs(cdp,'WarpFrontierScenic.skipArrival()');
      await waitUntil(()=>evalJs(cdp,"(()=>{const s=WarpFrontierScenic.state();return s.child?.phase==='explore'&&s.child?.autoOrbit===false&&s.child?.vista==='overview'})()"),`${id} fixed scenic state`,12000);
      const before=await evalJs(cdp,'WarpFrontierScenic.state()');
      assert.equal(before.destination,id);assert.equal(before.fixed,true);assert.equal(before.framePointerEvents,'none');
      assert.ok(before.child.drawCalls>0&&before.child.drawCalls<=18,`${id} draw calls must remain bounded, got ${before.child.drawCalls}`);
      assert.ok(before.child.triangles>0&&before.child.triangles<=24000,`${id} triangles must remain bounded, got ${before.child.triangles}`);
      assert.ok(before.child.pixelRatio<=1.25+.001,`${id} normal DPR must remain <= 1.25, got ${before.child.pixelRatio}`);
      if(id==='AURELIA')assertAureliaV3Live(before.child,`${id} ${viewport} before capture`);
      const normal={w:before.child.backingWidth,h:before.child.backingHeight,dpr:before.child.pixelRatio,draws:before.child.drawCalls,triangles:before.child.triangles};
      const capture=await evalJs(cdp,'WarpFrontierScenic.capture(false)',true);
      assert.ok(capture&&capture.width>normal.w&&capture.height>normal.h,`${id} shell capture must raise the real backing buffer`);
      await waitUntil(()=>evalJs(cdp,`(()=>{const s=WarpFrontierScenic.state().child;return s&&!s.capturing&&s.backingWidth===${normal.w}&&s.backingHeight===${normal.h}&&Math.abs(s.pixelRatio-${normal.dpr})<.001})()`),`${id} capture DPR restore`);
      const restored=await evalJs(cdp,'WarpFrontierScenic.state().child');
      assert.equal(restored.autoOrbit,false,`${id} capture must preserve fixed scenic camera authority`);assert.equal(restored.vista,'overview',`${id} capture must preserve overview vista`);
      assert.ok(restored.drawCalls>0&&restored.drawCalls<=18,`${id} draw calls must stay bounded after capture`);assert.ok(restored.triangles>0&&restored.triangles<=24000,`${id} triangles must stay bounded after capture`);
      if(id==='AURELIA')assertAureliaV3Live(restored,`${id} ${viewport} after capture restore`);
      const bytes=await screenshot(cdp,`frontier-backend-${id.toLowerCase()}-${viewport}.png`);assert.ok(bytes>8000,`${id} restored scenic screenshot must contain rendered content`);
      evidence[id]={capture:`${capture.width}x${capture.height}`,normal:`${normal.w}x${normal.h}`,dpr:normal.dpr,draws:normal.draws,triangles:normal.triangles,...(id==='AURELIA'?{aureliaProfile:restored.habitatDetail.profile,skylineTowers:restored.habitatDetail.skylineTowers,solarVanes:restored.habitatDetail.solarVanes,detailObjects:restored.habitatDetail.objects,detailTriangles:restored.habitatDetail.detailTriangles}:{})};
    }
    assert.equal(Object.keys(evidence).length,4);
    console.log(`Frontier renderer backends ${viewport}: ${JSON.stringify(evidence)}`);
  }catch(error){if(cdp)await screenshot(cdp,`frontier-backends-failure-${viewport}.png`).catch(()=>{});throw error}
  finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for Frontier renderer backend validation');console.log('Frontier renderer backend browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`,server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base,390,844);await inspect(chrome,base,360,800);console.log('Frontier renderer backend browser validation: all four scenic child captures passed at 390×844 and 360×800')}finally{await stop(server)}
