import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const source=readFileSync('journey-corridor-depth.js','utf8');
const loader=readFileSync('exploration-focus-tray.js','utf8');
const sw=readFileSync('sw.js','utf8');
const doc=readFileSync('docs/WARP_CORRIDOR_DEPTH.md','utf8');
const pkg=readFileSync('package.json','utf8');
const parse=spawnSync(process.execPath,['--check','journey-corridor-depth.js'],{encoding:'utf8'});
assert.equal(parse.status,0,parse.stderr||'journey-corridor-depth.js must parse');

assert.match(source,/const CORRIDORS=\['SOL>LUNA','SOL>SIRIUS','SOL>PROX','LUNA>VEGA','LUNA>PROX','VEGA>CYG','CYG>ORION','TAU>SIRIUS','SIRIUS>PROX'\]/,'must cover exactly the nine approved direct corridors');
assert.match(source,/const WARP_PHASES=new Set\(\['warpEntry','warp','warpExit'\]\)/,'must reuse the existing three warp phases');
assert.match(source,/root\.append\(horizon,left,right,rungs,near\)/,'runtime must mount exactly five bounded presentation elements');
assert.match(source,/corridorDepthHorizon/);assert.match(source,/corridorDepthRailLeft/);assert.match(source,/corridorDepthRailRight/);assert.match(source,/corridorDepthRungs/);assert.match(source,/corridorDepthNear/);
for(const id of ['SOL>LUNA','SOL>SIRIUS','SOL>PROX','LUNA>VEGA','LUNA>PROX','VEGA>CYG','CYG>ORION','TAU>SIRIUS','SIRIUS>PROX'])assert.ok(source.includes(`data-corridor=\"${id}\"`),`${id} must define corridor perspective orientation`);
for(const phase of ['warpEntry','warp','warpExit','decelerate','approach','observe'])assert.ok(source.includes(`data-phase=\"${phase}\"`),`${phase} must have an explicit visibility contract`);
assert.match(source,/@media \(prefers-reduced-motion:reduce\)/,'must support reduced motion');
assert.match(source,/MutationObserver/,'mount must be event-driven when Journey Atmosphere loads later');
assert.doesNotMatch(source,/setInterval|setTimeout|requestAnimationFrame|localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|WebSocket|\bTHREE\b|new WebGLRenderer/,'must not add timers, render-loop, persistence, network or Three.js authority');
assert.doesNotMatch(source,/filter\s*:|backdrop-filter/,'must avoid filter/backdrop-filter fill-rate cost');
assert.doesNotMatch(source,/WarpSim\.(select|launch|jumpTo|abort)|Dijkstra|MAX_LEG|arrivalClock|camera\./,'must not mutate route, timing or camera authority');
assert.ok(loader.includes("import('./journey-corridor-depth.js').catch(()=>{})"),'existing bootstrap must load corridor depth module');
assert.ok(sw.includes("'./journey-corridor-depth.js'"),'offline CORE must include corridor depth module');
assert.ok(pkg.includes('validate-warp-corridor-depth.mjs'),'npm run check must include focused corridor depth validation');
assert.ok(doc.includes('Warp Corridor Perspective Depth')&&doc.includes('Vertical Slice')&&doc.includes('Completion Signal'),'SOT must define the named vertical slice and completion signal');
assert.ok(existsSync('docs/WARP_CORRIDOR_DEPTH.md'));

class ClassList{constructor(){this.s=new Set()}add(...v){v.forEach(x=>this.s.add(x))}contains(v){return this.s.has(v)}}
class El{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.attributes={};this.classList=new ClassList();this.id='';this.className=''}
  append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n)}}
  setAttribute(k,v){this.attributes[k]=String(v)}
  getAttribute(k){return this.attributes[k]??null}
  querySelector(selector){
    const test=n=>selector.startsWith('#')?n.id===selector.slice(1):false;
    const walk=n=>{for(const c of n.children){if(test(c))return c;const r=walk(c);if(r)return r}return null};
    return test(this)?this:walk(this);
  }
}
const root=new El('html'),head=new El('head'),body=new El('body');root.append(head,body);
const app=new El('main');app.id='app';app.classList.add('journeyAtmosphereActive');body.append(app);
const atmosphere=new El('div');atmosphere.id='journeyAtmosphere';atmosphere.setAttribute('data-phase','warp');app.append(atmosphere);
const transit=new El('div');transit.id='journeyTransit';transit.setAttribute('data-corridor','SOL>LUNA');atmosphere.append(transit);
const document={documentElement:root,head,body,createElement:t=>new El(t),querySelector:s=>root.querySelector(s)};
class MO{constructor(cb){this.cb=cb}observe(){}disconnect(){}}
Object.defineProperty(globalThis,'window',{value:globalThis,configurable:true});
Object.defineProperty(globalThis,'document',{value:document,configurable:true});
Object.defineProperty(globalThis,'MutationObserver',{value:MO,configurable:true});
globalThis.addEventListener=()=>{};
await import(new URL(`../journey-corridor-depth.js?validate=${Date.now()}`,import.meta.url));
const api=globalThis.WarpJourneyCorridorDepth;
assert.ok(api,'must expose bounded diagnostic API');
assert.equal(api.corridors().length,9,'diagnostic API must expose nine corridors');
assert.equal(document.querySelector('#journeyCorridorDepth')?.children.length,5,'runtime mount must contain exactly five children');
assert.deepEqual(api.snapshot(),{mounted:true,elements:5,phase:'warp',corridor:'SOL>LUNA',active:true});
atmosphere.setAttribute('data-phase','approach');
assert.equal(api.snapshot().active,false,'approach must make corridor depth inactive');
app.classList.s.delete('journeyAtmosphereActive');atmosphere.setAttribute('data-phase','warp');
assert.equal(api.snapshot().active,false,'inactive Journey Atmosphere must fail closed');

console.log('Warp Corridor Perspective Depth: 31/31 checks passed');
