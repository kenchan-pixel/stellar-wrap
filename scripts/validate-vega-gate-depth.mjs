import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const source=fs.readFileSync(new URL('../vega-gate-depth.js',import.meta.url),'utf8');
const browserSource=fs.readFileSync(new URL('./validate-vega-gate-depth-browser.mjs',import.meta.url),'utf8');
const focus=fs.readFileSync(new URL('../exploration-focus-tray.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const doc=fs.readFileSync(new URL('../docs/VEGA_GATE_PARALLAX.md',import.meta.url),'utf8');
let passed=0;
function check(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`PASS VEGA GATE DEPTH ${passed}: ${label}`)}

new vm.Script(source.replace(/^import .*?;\s*/,''));
check(source.includes("three@0.185.1/build/three.module.js"),'VEGA gate-depth layer reuses pinned Three.js');
const sharedLoader="import('./cinematic-quality.js')",vegaLoader="import('./vega-gate-depth.js')";
check(focus.includes(sharedLoader)&&focus.includes(vegaLoader)&&focus.indexOf(sharedLoader)<focus.indexOf(vegaLoader),'VEGA gate depth loads after shared cinematic quality');
check(sw.includes("'./vega-gate-depth.js'"),'VEGA gate depth is included in prepared offline shell');
check(/center:new THREE\.Vector3\(17,-1,-82\),radius:24/.test(source),'VEGA gate anchor matches existing scene authority');
check(/triangles:2560,drawCalls:4,nodes:NODE_COUNT,depthSpan:5\.8/.test(source),'VEGA pass declares bounded 2,560-triangle / four-draw budget');
check(/new THREE\.CircleGeometry\(18,64\)/.test(source)&&/aperture-membrane/.test(source),'gate receives a bounded luminous aperture membrane');
check(/new THREE\.TorusGeometry\(25\.4,\.24,6,96,Math\.PI\*1\.08\)/.test(source)&&/near-phase-rail/.test(source)&&/far-phase-rail/.test(source),'near/far phase rails use bounded partial torus geometry');
check(/nearArc\.position\.z=\.9/.test(source)&&/farArc\.position\.z=-\.8/.test(source),'phase rails are physically separated along local gate depth');
check(/const NODE_COUNT=24/.test(source)&&/new THREE\.InstancedMesh\(geometry,material,NODE_COUNT\)/.test(source)&&/new THREE\.OctahedronGeometry\(\.24,0\)/.test(source),'24 low-poly phase nodes share one instanced draw');
check(/lane=i%2===0\?1:-1/.test(source)&&/z=lane\*2\.35\+Math\.sin\(angle\*3\.0\)\*\.28/.test(source),'phase nodes occupy staggered near/far lanes');
check(/material\.forceSinglePass=true/.test(source),'transparent gate materials explicitly remain single-pass');
check(/object\.isInstancedMesh\?object\.count:1/.test(source),'runtime triangle diagnostics account for instancing');
check(/state\.exploring&&!state\.flying&&!state\.contextLost/.test(source)&&/state\.qualityMode==='high'&&state\.current==='VEGA'/.test(source),'VEGA extension is safe-final-exploration and High-only');
check(/if\(!high&&objects\.length\)disposeOwn\(\)/.test(source)&&/if\(high&&gate&&!objects\.length\)build\(\)/.test(source),'downgrade/departure disposes extension and High rebuilds on demand');
check(/setInterval\(sync,SAMPLE_MS\)/.test(source)&&/const SAMPLE_MS=250/.test(source),'state sync is bounded to 4 Hz outside renderer loop');
check(/new MutationObserver\(sync\)/.test(source)&&/attributeFilter:\['width','height'\]/.test(source),'canvas backing-size changes immediately synchronize Photo Capture Boost');
check(!/requestAnimationFrame\s*\(/.test(source),'VEGA extension adds no independent render loop');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'VEGA extension adds no persistence authority');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'VEGA extension adds no runtime network or analytics path');
check(/object\.geometry\?\.dispose/.test(source)&&/material\?\.dispose/.test(source),'owned geometry and materials are explicitly released');
check(/__stellarVegaGateDepthAddHook/.test(source)&&/THREE\.Object3D\.prototype\.add===addWrapper/.test(source),'scene-construction hook is explicitly restorable');
check(/window\.WarpVegaGateDepth=/.test(source)&&/nodeDepthSpan/.test(source),'diagnostic API exposes live bounded gate-depth state');
check(/#perfHud/.test(browserSource)&&/highFrameCalls-standardFrameCalls,8/.test(browserSource),'browser gate measures shared + VEGA incremental renderer draws');
check(/WarpPhotoMode\.capture/.test(browserSource)&&/__vegaGateCaptureProbe/.test(browserSource),'browser gate verifies one-shot Photo Capture includes VEGA gate depth');
check(/390,844/.test(browserSource)&&/360,800/.test(browserSource)&&/vega-gate-parallax-/.test(browserSource),'both required phone viewports emit visual evidence');
check(doc.includes('2,560')&&doc.includes('4 draw calls')&&doc.includes('24')&&doc.includes('390×844')&&doc.includes('360×800'),'SOT records bounded performance and both phone visual gates');
check(doc.includes('Photo Capture')&&doc.includes('Standard／Low')&&doc.includes('視差'),'SOT records capture synchronization, lower-tier zero cost and parallax outcome');

const browser=spawnSync(process.execPath,['scripts/validate-vega-gate-depth-browser.mjs'],{encoding:'utf8',timeout:150000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production WebGL VEGA gate depth passes capture, measured renderer budget, lifecycle and both phone viewport gates');
console.log(`VEGA Gate Parallax validation: ${passed}/${passed} checks passed plus focused real-browser evidence`);
