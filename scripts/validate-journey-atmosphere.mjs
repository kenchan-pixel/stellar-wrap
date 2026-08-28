import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const filePath=fileURLToPath(import.meta.url);
const root=resolve(dirname(filePath),'..');
const modulePath=resolve(root,'journey-atmosphere.js');
const source=readFileSync(modulePath,'utf8');
const responsive=readFileSync(resolve(root,'responsive-ui.js'),'utf8');
const sw=readFileSync(resolve(root,'sw.js'),'utf8');
const doc=readFileSync(resolve(root,'docs/JOURNEY_ATMOSPHERE.md'),'utf8');
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const failures=[];
const passes=[];
const ok=(condition,message)=>(condition?passes:failures).push(message);

const parse=spawnSync(process.execPath,['--check',modulePath],{encoding:'utf8'});
ok(parse.status===0,`journey atmosphere JavaScript parses${parse.stderr?`: ${parse.stderr.trim()}`:''}`);
ok(source.includes('const SAMPLE_MS=250'),'journey atmosphere uses bounded 4 Hz state sampling');
ok(source.includes('state.route')&&source.includes('state.current'),'active leg identity comes from the existing core route/current state');
ok(source.includes("state.contextLost"),'context loss suppresses the journey presentation layer');
ok(source.includes("#app.journeyAtmosphereActive #warpHalo")&&source.includes("#app.journeyAtmosphereActive #warpEdge")&&source.includes("#app.journeyAtmosphereActive #warpFlash"),'existing warp entry/exit overlays inherit destination palette without new renderer authority');
ok(source.includes('data-journey-system')&&source.includes('journeyRegion'),'edge HUD exposes current corridor identity while central canvas remains untouched');
ok(source.includes('data-system="VEGA"')&&source.includes('data-system="ORION"')&&source.includes('data-system="TAU"')&&source.includes('data-system="PROX"'),'major destination families have distinct peripheral atmosphere patterns');
ok(source.includes('#journeyVista')&&source.includes('journeyVistaPrimary')&&source.includes('journeyVistaSecondary'),'approach vista uses a bounded two-layer presentation object rather than a new scene');
ok(source.includes('data-phase="warpExit"] #journeyVista')&&source.includes('data-phase="decelerate"] #journeyVista')&&source.includes('data-phase="approach"] #journeyVista'),'destination vista stages in only across the existing arrival phases');
ok(source.includes('data-phase="observe"] #journeyVista{opacity:0'),'approach vista clears before final destination observation so the real 3D landmark remains authoritative');
for(const id of ['SOL','LUNA','VEGA','CYG','ORION','TAU','SIRIUS','PROX']){
  ok(source.includes(`data-system="${id}"] .journeyVistaPrimary`),`${id} has a distinct approach-vista primary treatment`);
}
ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|WebSocket|requestAnimationFrame/.test(source),'journey atmosphere adds no persistence, network path or render-loop work');
ok(!/Dijkstra|MAX_LEG|\bp:\s*\[|route graph|new THREE/.test(source),'journey atmosphere does not duplicate coordinates, route topology or Three.js scene authority');
ok(!/filter\s*:|backdrop-filter/.test(source),'approach vista avoids blur/filter effects that would add mobile compositing cost');
ok(responsive.includes("import('./journey-atmosphere.js').catch(()=>{})"),'existing presentation bootstrap loads journey atmosphere');
ok(sw.includes("const CACHE_NAME=`${CACHE_PREFIX}v13`"),'offline shell remains on the current cache generation because no new shell file was added');
ok(sw.includes("'./journey-atmosphere.js'"),'prepared offline shell includes journey atmosphere');
ok(pkg.scripts?.check?.includes('node scripts/validate-journey-atmosphere.mjs'),'npm run check includes focused journey atmosphere validation');
ok(doc.includes('Journey Atmosphere')&&doc.includes('Approach Vista'),'journey atmosphere SOT records the destination approach-vista extension');

class MiniClassList{
  constructor(element){this.element=element;this.tokens=new Set()}
  sync(){this.element.attributes.class=[...this.tokens].join(' ')}
  add(...tokens){for(const token of tokens)if(token)this.tokens.add(token);this.sync()}
  remove(...tokens){for(const token of tokens)this.tokens.delete(token);this.sync()}
  contains(token){return this.tokens.has(token)}
}
class MiniElement extends EventTarget{
  constructor(tag='div'){super();this.tagName=String(tag).toUpperCase();this.attributes={};this.children=[];this.parentNode=null;this.classList=new MiniClassList(this);this._text=''}
  get parentElement(){return this.parentNode}
  get id(){return this.attributes.id||''}
  set id(value){this.attributes.id=String(value)}
  get className(){return this.attributes.class||''}
  set className(value){this.classList.tokens=new Set(String(value||'').split(/\s+/).filter(Boolean));this.classList.sync()}
  get textContent(){return this.children.length?this.children.map(child=>child.textContent).join(''):this._text}
  set textContent(value){this.children=[];this._text=String(value??'')}
  set innerHTML(value){
    this.children=[];this._text='';
    const re=/<div id="([^"]+)" class="([^"]*)"><\/div>/g;let match;
    while((match=re.exec(String(value)))){const child=new MiniElement('div');child.id=match[1];child.className=match[2];this.append(child)}
  }
  setAttribute(name,value=''){this.attributes[String(name)]=String(value);if(name==='class')this.className=value}
  getAttribute(name){return this.attributes[String(name)]??null}
  removeAttribute(name){delete this.attributes[String(name)]}
  append(...nodes){for(const node of nodes){if(!node)continue;if(node.parentNode)node.remove();node.parentNode=this;this.children.push(node)}}
  insertBefore(node,reference){if(node.parentNode)node.remove();const index=this.children.indexOf(reference);node.parentNode=this;if(index<0)this.children.push(node);else this.children.splice(index,0,node);return node}
  remove(){if(!this.parentNode)return;const index=this.parentNode.children.indexOf(this);if(index>=0)this.parentNode.children.splice(index,1);this.parentNode=null}
  querySelector(selector){return query(this,selector,true)}
}
function query(root,selector,includeSelf=false){
  const id=selector.startsWith('#')?selector.slice(1):null;
  if(includeSelf&&id&&root.id===id)return root;
  for(const child of root.children||[]){if(id&&child.id===id)return child;const nested=query(child,selector,false);if(nested)return nested}
  return null;
}
class MiniDocument extends EventTarget{
  constructor(){super();this.hidden=false;this.readyState='complete';this.head=new MiniElement('head');this.body=new MiniElement('body');this.root=new MiniElement('html');this.root.append(this.head,this.body)}
  createElement(tag){return new MiniElement(tag)}
  querySelector(selector){return query(this.root,selector,true)}
}

const document=new MiniDocument();
const app=document.createElement('main');app.id='app';
const canvas=document.createElement('canvas');canvas.id='space';
const warp=document.createElement('div');warp.id='warpFx';
const halo=document.createElement('div');halo.id='warpHalo';
const edge=document.createElement('div');edge.id='warpEdge';
const flash=document.createElement('div');flash.id='warpFlash';
warp.append(edge,flash,halo);app.append(canvas,warp);document.body.append(app);

let state={flying:true,contextLost:false,route:['SOL','LUNA','VEGA','CYG','ORION'],current:'CYG',phase:'warp'};
Object.defineProperty(globalThis,'window',{value:globalThis,configurable:true});
Object.defineProperty(globalThis,'document',{value:document,configurable:true});
globalThis.WarpSim={state(){return{...state,route:[...state.route]}}};

await import(pathToFileURL(modulePath).href+`?test=${Date.now()}`);
const api=globalThis.WarpJourneyAtmosphere;
ok(!!api,'journey atmosphere exposes a bounded diagnostic API');
ok(Object.keys(api.profiles()).length===8,'all eight approved systems have a journey identity profile');
ok(app.classList.contains('journeyAtmosphereActive'),'active flight enables the atmosphere layer');
ok(app.getAttribute('data-journey-system')==='ORION','multi-leg route resolves the next destination from current core state');
ok(document.querySelector('#journeyAtmosphere')?.getAttribute('data-phase')==='warp','warp cruise receives the strong journey-atmosphere phase');
ok(document.querySelector('#journeyVista')?.getAttribute('data-vista-system')==='ORION','approach-vista identity follows the real active-leg destination');
ok(document.querySelector('#journeyRegionKicker')?.textContent.includes('赤紅星雲前緣'),'ORION leg exposes its destination-specific corridor identity');
ok(document.querySelector('#journeyRegionTitle')?.textContent.includes('紅巨星光'),'ORION leg exposes a destination-specific travel signature');
ok(document.querySelector('#journeyRegionMeta')?.textContent.includes('天鵝航標 → 獵戶前哨')&&document.querySelector('#journeyRegionMeta')?.textContent.includes('4/4'),'edge HUD identifies the real fourth leg without copying route planning');

state={...state,current:'LUNA',phase:'approach'};api.render();
ok(app.getAttribute('data-journey-system')==='VEGA','next intermediate leg retargets presentation to VEGA');
ok(document.querySelector('#journeyAtmosphere')?.getAttribute('data-phase')==='approach','continuous approach keeps the target identity at the destination-vista phase');
ok(document.querySelector('#journeyVista')?.getAttribute('data-vista-system')==='VEGA','approach vista retargets together with the actual next leg');
ok(document.querySelector('#journeyRegionKicker')?.textContent.includes('藍白星門航道')&&document.querySelector('#journeyRegionMeta')?.textContent.includes('2/4'),'VEGA handoff reports the real second leg and star-gate corridor');

state={...state,phase:'observe'};api.render();
ok(document.querySelector('#journeyAtmosphere')?.getAttribute('data-phase')==='observe','final observation reaches the CSS state that fades the approach vista away');

state={...state,contextLost:true};api.render();
ok(!app.classList.contains('journeyAtmosphereActive')&&!document.querySelector('#journeyRegion')?.classList.contains('show'),'WebGL context loss removes decorative atmosphere and route cue');
ok(document.querySelector('#journeyVista')?.getAttribute('data-vista-system')===null,'WebGL context loss also clears the destination-vista identity');
state={...state,contextLost:false,flying:false};api.render();
ok(api.snapshot().active===false,'idle/exploration state leaves the travel view unmodified');
state={flying:true,contextLost:false,route:['SOL','NOPE','VEGA'],current:'SOL',phase:'warp'};api.render();
ok(api.snapshot().active===false,'malformed route state fails closed instead of inventing location identity');

for(const message of passes)console.log(`✓ ${message}`);
if(failures.length){console.error(`\n${failures.length} journey atmosphere validation failure(s):`);for(const message of failures)console.error(`✗ ${message}`);process.exit(1)}
console.log(`\nJourney atmosphere: ${passes.length}/${passes.length} checks passed.`);
