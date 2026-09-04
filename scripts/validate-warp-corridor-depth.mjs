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
assert.match(source,/const SYSTEMS=\['SOL','LUNA','VEGA','CYG','ORION','TAU','SIRIUS','PROX'\]/,'approach depth must cover exactly the eight approved Real Space systems');
assert.match(source,/const WARP_PHASES=new Set\(\['warpEntry','warp','warpExit'\]\)/,'must reuse the existing three warp phases');
assert.match(source,/const APPROACH_PHASES=new Set\(\['warpExit','decelerate','approach'\]\)/,'approach bridge must reuse the existing arrival phases');
assert.match(source,/root\.append\(horizon,left,right,rungs,near\)/,'runtime must mount exactly five bounded corridor elements');
assert.match(source,/approach\.append\(far,mid,near\)/,'runtime must mount exactly three bounded approach-depth planes');
assert.match(source,/corridorDepthHorizon/);assert.match(source,/corridorDepthRailLeft/);assert.match(source,/corridorDepthRailRight/);assert.match(source,/corridorDepthRungs/);assert.match(source,/corridorDepthNear/);
assert.match(source,/approachDepthFar/);assert.match(source,/approachDepthMid/);assert.match(source,/approachDepthNear/);
assert.match(source,/#journeyApproachDepth::before,#journeyApproachDepth::after/,'v3 must add the bounded shockfront as pseudo-elements without extra DOM children');
assert.match(source,/#journeyAtmosphere\[data-phase="warpExit"\] #journeyApproachDepth::before\{opacity:\.46;transform:[^}]*scale\(\.5\)\}/,'warp exit must reveal a compact outer shockfront');
assert.match(source,/#journeyAtmosphere\[data-phase="decelerate"\] #journeyApproachDepth::before\{opacity:\.36;transform:[^}]*scale\(\.84\)\}/,'deceleration must expand the outer shockfront');
assert.match(source,/#journeyAtmosphere\[data-phase="approach"\] #journeyApproachDepth::before\{opacity:\.24;transform:[^}]*scale\(1\.12\)\}/,'approach must expand and soften the outer shockfront');
assert.match(source,/#journeyAtmosphere\[data-phase="observe"\] #journeyApproachDepth::before,#journeyAtmosphere\[data-phase="observe"\] #journeyApproachDepth::after\{opacity:0;/,'shockfront must fully clear before final observation');
for(const id of ['SOL>LUNA','SOL>SIRIUS','SOL>PROX','LUNA>VEGA','LUNA>PROX','VEGA>CYG','CYG>ORION','TAU>SIRIUS','SIRIUS>PROX'])assert.ok(source.includes(`data-corridor=\"${id}\"`),`${id} must define corridor perspective orientation`);
for(const id of ['SOL','LUNA','VEGA','CYG','ORION','TAU','SIRIUS','PROX'])assert.ok(source.includes(`data-system=\"${id}\"`),`${id} must define a destination-specific approach-depth anchor`);
for(const phase of ['warpEntry','warp','warpExit','decelerate','approach','observe'])assert.ok(source.includes(`data-phase=\"${phase}\"`),`${phase} must have an explicit depth visibility contract`);
assert.match(source,/#journeyAtmosphere\[data-phase="approach"\] #journeyApproachDepth\{opacity:\.58\}/,'approach phase must make the depth bridge visibly active');
assert.match(source,/#journeyAtmosphere\[data-phase="observe"\] #journeyApproachDepth\{opacity:0\}/,'depth bridge must clear before final observation');
assert.match(source,/@media \(max-width:520px\)[\s\S]*#journeyApproachDepth::before\{width:clamp\(196px,78vw,304px\)/,'phone layout must bound shockfront width instead of allowing unbounded clipping');
assert.match(source,/@media \(prefers-reduced-motion:reduce\)[\s\S]*#journeyApproachDepth::before,#journeyApproachDepth::after/,'reduced-motion contract must include the shockfront');
assert.match(source,/MutationObserver/,'mount must be event-driven when Journey Atmosphere loads later');
assert.doesNotMatch(source,/setInterval|setTimeout|requestAnimationFrame|localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|WebSocket|\bTHREE\b|new WebGLRenderer/,'must not add timers, render-loop, persistence, network or Three.js authority');
assert.doesNotMatch(source,/filter\s*:|backdrop-filter/,'must avoid filter/backdrop-filter fill-rate cost');
assert.doesNotMatch(source,/WarpSim\.(select|launch|jumpTo|abort)|Dijkstra|MAX_LEG|arrivalClock|camera\./,'must not mutate route, timing or camera authority');
assert.ok(loader.includes("import('./journey-corridor-depth.js').catch(()=>{})"),'existing bootstrap must load journey depth module');
assert.ok(sw.includes("'./journey-corridor-depth.js'"),'offline CORE must include journey depth module');
assert.ok(pkg.includes('validate-warp-corridor-depth.mjs')&&pkg.includes('validate-warp-corridor-depth-browser.mjs'),'npm run check must include focused static and browser depth validation');
assert.ok(doc.includes('Warp Exit Shockfront')&&doc.includes('Vertical Slice v3')&&doc.includes('Completion Signal'),'SOT must define the named v3 shockfront vertical slice and completion signal');
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
const atmosphere=new El('div');atmosphere.id='journeyAtmosphere';atmosphere.setAttribute('data-phase','warp');atmosphere.setAttribute('data-system','LUNA');app.append(atmosphere);
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
assert.equal(api.systems().length,8,'diagnostic API must expose eight approach systems');
assert.equal(document.querySelector('#journeyCorridorDepth')?.children.length,5,'runtime corridor mount must contain exactly five children');
assert.equal(document.querySelector('#journeyApproachDepth')?.children.length,3,'runtime approach mount must contain exactly three children despite pseudo-element shockfronts');
assert.deepEqual(api.snapshot(),{mounted:true,elements:5,phase:'warp',corridor:'SOL>LUNA',active:true});
assert.deepEqual(api.approachSnapshot(),{mounted:true,elements:3,phase:'warp',system:'LUNA',active:false});
atmosphere.setAttribute('data-phase','approach');
assert.equal(api.snapshot().active,false,'approach must make corridor depth inactive');
assert.deepEqual(api.approachSnapshot(),{mounted:true,elements:3,phase:'approach',system:'LUNA',active:true});
atmosphere.setAttribute('data-phase','observe');
assert.equal(api.approachSnapshot().active,false,'observe must make approach depth inactive');
app.classList.s.delete('journeyAtmosphereActive');atmosphere.setAttribute('data-phase','warpExit');
assert.equal(api.snapshot().active,false,'inactive Journey Atmosphere must fail closed for corridor depth');
assert.equal(api.approachSnapshot().active,false,'inactive Journey Atmosphere must fail closed for approach depth');

console.log('Warp Corridor + Approach Depth v3: focused checks passed');
