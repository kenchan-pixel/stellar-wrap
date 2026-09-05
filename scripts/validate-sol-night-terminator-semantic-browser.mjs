import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';

const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';
const NIGHT_LAYER_NAME='stellar-sol-orbital-frame-earth-night-terminator';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function commandPath(name){if(!name)return'';if(name.includes('/')&&existsSync(name))return name;const p=spawnSync('which',[name],{encoding:'utf8'});return p.status===0?p.stdout.trim():''}
function findChrome(){for(const candidate of[process.env.CHROME_BIN,'google-chrome-stable','google-chrome','chromium','chromium-browser']){const p=commandPath(candidate);if(p)return p}return''}
async function freePort(){return await new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address(),port=typeof address==='object'&&address?address.port:0;server.close(error=>error?reject(error):resolve(port))})})}
async function waitUntil(fn,label,timeout=20000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value}catch(error){last=error}await sleep(80)}throw new Error(`Timed out waiting for ${label}${last?`: ${last.message}`:''}`)}
async function waitHttp(url){return waitUntil(async()=>{const response=await fetch(url,{cache:'no-store'});return response.ok},`server ${url}`,8000)}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([done,sleep(700)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([done,sleep(900)])}}
class Cdp{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.events=new Map()}
  async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(event.error||new Error('CDP error'))},{once:true})});this.ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id){const queue=this.events.get(message.method)||[];this.events.delete(message.method);queue.forEach(waiter=>{clearTimeout(waiter.timer);waiter.resolve(message.params||{})});return}const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{})})}
  send(method,params={},timeout=12000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`))},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}
  waitEvent(method,timeout=12000){return new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:setTimeout(()=>reject(new Error(`event timeout ${method}`)),timeout)},queue=this.events.get(method)||[];queue.push(waiter);this.events.set(method,queue)})}
  close(){try{this.ws?.close()}catch{}}
}
async function evalJs(cdp,expression,awaitPromise=false){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}
async function installNightLayerCapture(cdp){
  return evalJs(cdp,`(async()=>{const THREE=await import('${THREE_URL}');const proto=THREE.Object3D.prototype;if(window.__stellarSolNightLayerCapture?.installed)return true;const prior=proto.add,state={installed:true,prior,wrapper:null,layer:null};state.wrapper=function(...args){const result=prior.apply(this,args);for(const object of args){if(object?.name==='${NIGHT_LAYER_NAME}')state.layer=object}return result};proto.add=state.wrapper;window.__stellarSolNightLayerCapture=state;return true})()`,true);
}
async function renderedSemanticProbe(cdp){
  return evalJs(cdp,`(async()=>{
    const THREE=await import('${THREE_URL}'),capture=window.__stellarSolNightLayerCapture,proto=THREE.Object3D.prototype;
    if(capture?.wrapper&&proto.add===capture.wrapper)proto.add=capture.prior;
    const layer=capture?.layer;if(!layer?.isMesh)throw new Error('live SOL night layer was not captured from the production scene');
    const sourceMaterial=layer.material,sourceTexture=sourceMaterial?.uniforms?.uLights?.value;
    if(!sourceTexture?.isTexture||!sourceTexture.image)throw new Error('live SOL night shader texture is unavailable');
    const image=sourceTexture.image,width=image.width|0,height=image.height|0;
    if(width!==512||height!==256)throw new Error('unexpected live city atlas size '+width+'x'+height);
    const ctx=image.getContext?.('2d');if(!ctx)throw new Error('live city atlas canvas is not readable');
    const data=ctx.getImageData(0,0,width,height).data;let peakAlpha=-1,peakX=0,peakY=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const alpha=data[(y*width+x)*4+3];if(alpha>peakAlpha){peakAlpha=alpha;peakX=x;peakY=y}}
    const targetU=(peakX+.5)/width,targetV=sourceTexture.flipY?1-(peakY+.5)/height:(peakY+.5)/height;
    const uv=layer.geometry?.attributes?.uv,normal=layer.geometry?.attributes?.normal;
    if(!uv||!normal)throw new Error('live SOL night geometry lacks UV/normal attributes');
    let best=-1,bestDistance=Infinity;
    for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=uv.getY(i),du=Math.min(Math.abs(u-targetU),1-Math.abs(u-targetU)),dv=Math.abs(v-targetV),distance=du*du+dv*dv;if(distance<bestDistance){bestDistance=distance;best=i}}
    if(best<0)throw new Error('failed to resolve a city-atlas surface probe');
    const probeNormal=new THREE.Vector3(normal.getX(best),normal.getY(best),normal.getZ(best)).normalize();
    const material=sourceMaterial.clone();material.uniforms.uLights.value=sourceTexture;material.uniforms.uOpacity.value=1;
    const probe=new THREE.Mesh(layer.geometry,material);probe.quaternion.setFromUnitVectors(probeNormal,new THREE.Vector3(0,0,1));
    const scene=new THREE.Scene();scene.add(probe);
    const camera=new THREE.OrthographicCamera(-1.08,1.08,1.08,-1.08,.1,10);camera.position.set(0,0,3);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
    const canvas=document.createElement('canvas'),renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.setSize(96,96,false);renderer.setClearColor(0x000000,0);
    const target=new THREE.WebGLRenderTarget(96,96,{depthBuffer:true,stencilBuffer:false});
    const sample=direction=>{material.uniforms.uSunDirection.value.copy(direction);renderer.setRenderTarget(target);renderer.clear(true,true,true);renderer.render(scene,camera);const pixels=new Uint8Array(96*96*4);renderer.readRenderTargetPixels(target,0,0,96,96,pixels);let sum=0,max=0,lit=0;for(let y=40;y<56;y++)for(let x=40;x<56;x++){const i=(y*96+x)*4,value=pixels[i]+pixels[i+1]+pixels[i+2];sum+=value;max=Math.max(max,value);if(value>8)lit++}return{sum,max,lit}};
    let day,terminator,night;
    try{day=sample(new THREE.Vector3(0,0,1));terminator=sample(new THREE.Vector3(1,0,0));night=sample(new THREE.Vector3(0,0,-1))}
    finally{renderer.setRenderTarget(null);target.dispose();material.dispose();renderer.dispose();if(capture)capture.layer=null}
    return{layerName:layer.name,atlas:[width,height],atlasPeak:Number((peakAlpha/255).toFixed(4)),probeUv:[Number(targetU.toFixed(4)),Number(targetV.toFixed(4))],day,terminator,night,shaderUsesNightMask:sourceMaterial.vertexShader.includes('vNight=1.0-smoothstep(-0.10,0.18,sunFacing)')&&sourceMaterial.fragmentShader.includes('light.a*vNight')};
  })()`,true);
}
async function inspect(chrome,base){
  const width=390,height=844,profile=mkdtempSync(join(tmpdir(),'stellar-sol-terminator-semantic-'));let browser,cdp,stderr='';
  try{
    const port=await freePort();browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr?.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-3000));
    const target=await waitUntil(async()=>{if(browser.exitCode!==null)throw new Error(stderr||`Chrome exited ${browser.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/json/list`),targets=await response.json();return targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl)||null}catch{return null}},'Chrome target');
    cdp=new Cdp(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.waitEvent('Page.loadEventFired',15000);await cdp.send('Page.navigate',{url:`${base}?mode=real`});await loaded;
    await waitUntil(()=>evalJs(cdp,"!!window.WarpSim&&!!window.WarpSolOrbitalFrame&&document.querySelector('#app')?.classList.contains('ready')"),'production WebGL + SOL v4',30000);
    await evalJs(cdp,"WarpSim.jumpTo('SOL');WarpSim.setQuality('standard');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpSolOrbitalFrame.snapshot();return WarpSim.state().current==='SOL'&&WarpSim.state().exploring&&x.captured===true&&x.objects===0})()"),'SOL Standard baseline');
    const standard=await evalJs(cdp,'WarpSolOrbitalFrame.snapshot()');
    assert.equal(standard.baseEmissionSuppressed,false,'Standard must keep the core Earth emissive path untouched');
    assert.ok(Math.abs(standard.baseEmissionIntensity-.82)<.0001,`Standard base city emissive intensity expected .82, got ${standard.baseEmissionIntensity}`);

    await installNightLayerCapture(cdp);
    await evalJs(cdp,"WarpSim.setQuality('high');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpSolOrbitalFrame.snapshot();return x.active&&x.baseEmissionSuppressed&&x.baseEmissionIntensity===0&&x.cityVisibility?.night>0&&!!window.__stellarSolNightLayerCapture?.layer})()"),'SOL High terminator ownership');
    const high=await evalJs(cdp,'WarpSolOrbitalFrame.snapshot()');
    assert.equal(high.nightProfile,'earth-night-terminator-v4');
    assert.equal(high.baseEmissionSuppressed,true,'High must suppress the unmasked core city-light emission');
    assert.equal(high.baseEmissionIntensity,0,'High core Earth emissive intensity must be zero while v4 owns city lights');
    assert.ok(Math.abs(high.baseEmissionRestoreIntensity-standard.baseEmissionIntensity)<.0001,'High must preserve the exact prior core emissive intensity for restoration');
    assert.ok(high.cityVisibility.atlasPeak>.8,'diagnostic atlas peak must come from a non-empty live procedural city atlas');
    assert.equal(high.cityVisibility.day,0,'JavaScript diagnostic day sample must remain fully masked');
    assert.ok(high.cityVisibility.night>high.cityVisibility.terminator&&high.cityVisibility.terminator>high.cityVisibility.day,'JavaScript diagnostic night > terminator > day contrast must hold');

    const rendered=await renderedSemanticProbe(cdp);
    assert.equal(rendered.layerName,NIGHT_LAYER_NAME,'rendered semantic probe must use the live production night-layer mesh');
    assert.deepEqual(rendered.atlas,[512,256],'rendered semantic probe must use the live production city atlas');
    assert.ok(rendered.atlasPeak>.8,'rendered semantic probe must use a non-empty production city atlas');
    assert.equal(rendered.shaderUsesNightMask,true,'rendered semantic probe must use the production GLSL night mask and texture path');
    assert.ok(rendered.night.max>20&&rendered.night.lit>0,`night framebuffer probe must contain visible city-light output, got ${JSON.stringify(rendered.night)}`);
    assert.ok(rendered.day.sum<=Math.max(6,rendered.night.sum*.03),`day framebuffer probe must extinguish the sampled city cluster, got day ${rendered.day.sum} vs night ${rendered.night.sum}`);
    assert.ok(rendered.terminator.sum>rendered.day.sum+20,`terminator framebuffer probe must exceed day output, got ${rendered.terminator.sum} vs ${rendered.day.sum}`);
    assert.ok(rendered.night.sum>rendered.terminator.sum*1.08,`night framebuffer probe must exceed terminator output, got ${rendered.night.sum} vs ${rendered.terminator.sum}`);

    await evalJs(cdp,"WarpSim.setQuality('low');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpSolOrbitalFrame.snapshot();return x.objects===0&&!x.baseEmissionSuppressed&&Math.abs((x.baseEmissionIntensity??0)-.82)<.0001})()"),'High→Low exact base-emission restoration');
    const low=await evalJs(cdp,'WarpSolOrbitalFrame.snapshot()');
    assert.ok(Math.abs(low.baseEmissionIntensity-standard.baseEmissionIntensity)<.0001,'downgrade must restore the exact Standard city emissive intensity');
    assert.equal(low.cityVisibility,null,'inactive tier must clear terminator semantic samples');

    await evalJs(cdp,"WarpSim.setQuality('high');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpSolOrbitalFrame.snapshot();return x.active&&x.baseEmissionSuppressed&&x.cityVisibility?.night>x.cityVisibility?.terminator})()"),'Low→High suppression rebuild');
    await evalJs(cdp,"WarpSim.jumpTo('LUNA');true");
    await waitUntil(()=>evalJs(cdp,"(()=>{const x=WarpSolOrbitalFrame.snapshot();return x.objects===0&&!x.baseEmissionSuppressed&&Math.abs((x.baseEmissionIntensity??0)-.82)<.0001})()"),'SOL departure base-emission restoration');
    const viewport=await evalJs(cdp,"(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,phase:WarpSim.state().phase}))()");
    assert.ok(viewport.w<=width+1,'semantic fix must not introduce horizontal overflow');
    console.log(`SOL terminator rendered semantics: framebuffer day ${rendered.day.sum}, terminator ${rendered.terminator.sum}, night ${rendered.night.sum}; Standard emissive ${standard.baseEmissionIntensity} → High ${high.baseEmissionIntensity} → Low ${low.baseEmissionIntensity}; lifecycle passed`);
  }finally{cdp?.close();await stop(browser);try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:80})}catch{}}
}

const chrome=findChrome();
if(!chrome){if(process.env.CI||process.env.STELLAR_BROWSER_REQUIRED==='1')throw new Error('Chrome/Chromium is required for SOL terminator semantic validation');console.log('SOL terminator semantic browser validation skipped: Chrome/Chromium not available');process.exit(0)}
const serverPort=await freePort(),base=`http://127.0.0.1:${serverPort}/`;const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(serverPort)},stdio:['ignore','ignore','pipe']});
try{await waitHttp(base);await inspect(chrome,base);console.log('SOL Earth Night Terminator rendered semantic browser validation: passed')}finally{await stop(server)}