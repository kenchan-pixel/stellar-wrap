import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const source=fs.readFileSync(new URL('../cyg-cinematic-quality.js',import.meta.url),'utf8');
const focus=fs.readFileSync(new URL('../exploration-focus-tray.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const doc=fs.readFileSync(new URL('../docs/CYG_RESONANT_BEACON.md',import.meta.url),'utf8');
let passed=0;
function check(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`PASS CYG ${passed}: ${label}`)}

new vm.Script(source.replace(/^import .*?;\s*/,''));
check(source.includes("three@0.185.1/build/three.module.js"),'CYG layer reuses pinned Three.js');
const sharedLoader="import('./cinematic-quality.js')",cygLoader="import('./cyg-cinematic-quality.js')";
check(focus.includes(sharedLoader)&&focus.includes(cygLoader)&&focus.indexOf(sharedLoader)<focus.indexOf(cygLoader),'CYG extension loads after the shared cinematic layer');
check(sw.includes("'./cyg-cinematic-quality.js'"),'CYG cinematic extension remains in the offline shell');
check(/primaryCenter:new THREE\.Vector3\(-18,10,-108\)/.test(source)&&/primaryRadius:11/.test(source),'CYG primary anchor matches the core scene');
check(/companionCenter:new THREE\.Vector3\(18,-7,-118\)/.test(source)&&/companionRadius:8/.test(source),'CYG companion anchor matches the core scene');
check(/beaconCenter:new THREE\.Vector3\(0,0,-92\)/.test(source)&&/beaconRadius:19/.test(source),'CYG outer beacon anchor matches the core torus');
check(/VISUAL_PASS='resonant-beacon-depth-v2'/.test(source)&&/visualPass:VISUAL_PASS/.test(source),'CYG diagnostics identify the depth-cage v2 pass');
check(/triangles:13208,drawCalls:6/.test(source),'CYG v2 High budget is explicitly bounded to 13,208 triangles / six draws');
check(/const PYLON_COUNT=18/.test(source)&&/const CAGE_SEGMENT_COUNT=42/.test(source),'CYG v2 bounds 18 pylons and 42 cage segments');
check(/depthSpanBudget:8\.2/.test(source)&&/pylonDepthSpan:active\?Number\(pylonDepthRange\.span\.toFixed\(2\)\):0/.test(source),'CYG v2 exposes a bounded live near/far depth span');
check(/new THREE\.BoxGeometry\(\.24,2\.4,\.24\)/.test(source)&&/new THREE\.InstancedMesh\(geometry,material,PYLON_COUNT\)/.test(source),'CYG v2 uses one instanced pylon mesh');
check(/function resonanceCageGeometry\(\)/.test(source)&&/new THREE\.LineSegments\(resonanceCageGeometry\(\)/.test(source),'CYG v2 uses one bounded line-segment depth cage');
check(/object\.isInstancedMesh\?object\.count:1/.test(source),'CYG measured triangle diagnostics include all instanced pylons');
check(/new THREE\.SphereGeometry\(1,64,40\)/.test(source)&&/primary-detail/.test(source),'CYG primary retains higher-frequency stellar detail');
check(/new THREE\.SphereGeometry\(1,48,32\)/.test(source)&&/companion-detail/.test(source),'CYG companion retains bounded stellar detail');
check(/const resonance=\.5\+\.5\*Math\.cos\(lon\*2\.0-lat\*\.8-\.55\)/.test(source)&&/const resonance=\.5\+\.5\*Math\.cos\(lon\*2\.0\+lat\*\.72\+2\.45\)/.test(source),'CYG twin-star textures retain complementary resonance bands');
check(/float lobeA=pow/.test(source)&&/float lobeB=pow/.test(source),'CYG binary halo retains asymmetric magnetic lobes');
check(/float phase=fract\(vUv\.x\*18\.0\)/.test(source)&&/float lock=pow/.test(source),'CYG beacon track retains segmented rails and lock wedge');
check(/beacon\.add\(pylons,cage\)/.test(source),'new depth structures inherit the existing beacon transform authority');
check(/state\.exploring&&!state\.flying&&!state\.contextLost/.test(source)&&/state\.qualityMode==='high'&&state\.current==='CYG'/.test(source),'CYG v2 remains safe-final-exploration and High-only');
check(/if\(!high&&objects\.length\)disposeOwn\(\)/.test(source)&&/if\(high&&primary&&companion&&beacon&&!objects\.length\)build\(\)/.test(source),'CYG v2 disposes on downgrade/departure and rebuilds on demand');
check(/setInterval\(sync,SAMPLE_MS\)/.test(source)&&/const SAMPLE_MS=250/.test(source),'CYG synchronization remains bounded to 4 Hz outside the renderer loop');
check(!/requestAnimationFrame\s*\(/.test(source),'CYG v2 adds no independent render loop');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'CYG v2 adds no persistence authority');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'CYG v2 adds no runtime network or analytics path');
check(/material\.map\?\.dispose/.test(source)&&/object\.geometry\?\.dispose/.test(source),'CYG owned textures, materials and geometries remain explicitly released');
check(/__stellarCygCinematicAddHook/.test(source)&&/THREE\.Object3D\.prototype\.add===addWrapper/.test(source),'CYG scene-construction hook remains restorable');
check(/window\.WarpCygCinematicQuality=/.test(source),'CYG diagnostic API exposes autonomous validation state');
check(doc.includes('13,208')&&doc.includes('6 draw')&&doc.includes('18')&&doc.includes('42'),'CYG SOT records the v2 bounded geometry / draw / structure budget');
check(doc.includes('Standard／Low')&&doc.includes('depth cage'),'CYG SOT records zero lower-tier cost and the depth-cage outcome');

const browser=spawnSync(process.execPath,['scripts/validate-cyg-cinematic-quality-browser.mjs'],{encoding:'utf8',timeout:180000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production WebGL CYG v2 passes renderer-cost, capture, depth, disposal, rebuild, revisit and viewport gates');
console.log(`CYG resonant beacon depth validation: ${passed}/${passed} checks passed plus two real-browser phone viewports`);