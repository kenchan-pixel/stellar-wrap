import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const source=fs.readFileSync(new URL('../prox-starport-transit.js',import.meta.url),'utf8');
const browserSource=fs.readFileSync(new URL('./validate-prox-starport-transit-browser.mjs',import.meta.url),'utf8');
const focus=fs.readFileSync(new URL('../exploration-focus-tray.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const doc=fs.readFileSync(new URL('../docs/PROX_STARPORT_TRANSIT_LATTICE.md',import.meta.url),'utf8');
let passed=0;
function check(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`PASS PROX TRANSIT ${passed}: ${label}`)}

new vm.Script(source.replace(/^import .*?;\s*/,''));
check(source.includes("three@0.185.1/build/three.module.js"),'PROX transit reuses pinned Three.js');
check(/import\('\.\/sirius-phase-aperture\.js'\)\)\.then\(\(\)=>import\('\.\/prox-starport-transit\.js'\)\)/.test(focus),'PROX transit loads after existing cinematic extensions');
check(sw.includes("'./prox-starport-transit.js'"),'PROX transit is included in the prepared offline shell');
check(/starportCenter:new THREE\.Vector3\(15,-6,-82\),starportRadius:20,starportTube:\.42/.test(source),'PROX transit anchor matches the existing outer starport ring');
check(/triangles:2304,drawCalls:3,beacons:36/.test(source),'PROX transit budget is bounded to 2,304 triangles / three draw calls / 36 beacons');
check(/new THREE\.TorusGeometry\(23\.2,\.14,6,96,Math\.PI\*1\.36\)/.test(source),'outer traffic lane is bounded partial torus geometry');
check(/new THREE\.TorusGeometry\(25\.8,\.11,6,96,Math\.PI\*1\.08\)/.test(source),'crossing traffic lane is bounded partial torus geometry');
check(/PROFILE\.beacons\*3/.test(source)&&/new THREE\.Points\(beaconGeometry\(\)/.test(source),'approach lattice uses exactly 36 bounded point beacons');
check(/float lanes=smoothstep/.test(source)&&/float nodes=pow/.test(source)&&/float taper=smoothstep/.test(source),'traffic shaders add segmented lanes, sync nodes and tapered ends');
check(/shader\.forceSinglePass=true/.test(source),'transparent DoubleSide traffic lanes explicitly use one renderer pass per mesh');
check(/singlePass:active&&objects\.filter\(object=>object\.isMesh\)\.every/.test(source),'PROX diagnostics expose live single-pass mesh state');
check(/VISUAL_PASS='starport-transit-lattice-v1'/.test(source)&&/visualPass:VISUAL_PASS/.test(source),'PROX diagnostics identify the transit-lattice visual pass');
check(/starport\.add\(outer,crossing,beacons\)/.test(source),'traffic lattice inherits the existing starport rotation authority');
check(/state\.exploring&&!state\.flying&&!state\.contextLost/.test(source)&&/state\.qualityMode==='high'&&state\.current==='PROX'/.test(source),'PROX transit is safe-final-exploration and High-only');
check(/if\(!high&&objects\.length\)disposeOwn\(\)/.test(source)&&/if\(high&&starport&&!objects\.length\)build\(\)/.test(source),'PROX transit disposes on downgrade/departure and rebuilds on demand');
check(/if\(!object\?\.isMesh\)continue/.test(source)&&/geometry\.index\?\.count/.test(source),'PROX triangle diagnostics measure mesh BufferGeometry and exclude point beacons');
check(/setInterval\(sync,SAMPLE_MS\)/.test(source)&&/const SAMPLE_MS=250/.test(source),'PROX synchronization retains a bounded 4 Hz fallback outside the renderer loop');
check(/new MutationObserver\(sync\)/.test(source)&&/attributeFilter:\['width','height'\]/.test(source),'PROX transit reacts immediately to Photo Capture backing-size quality changes');
check(/qualityObserver\?\.disconnect\(\)/.test(source),'PROX quality observer is disconnected on teardown');
check(!/requestAnimationFrame\s*\(/.test(source),'PROX transit adds no independent render loop');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'PROX transit adds no persistence authority');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'PROX transit adds no runtime network or analytics path');
check(/object\.geometry\?\.dispose/.test(source)&&/material\?\.dispose/.test(source),'PROX transit explicitly releases owned geometry and materials');
check(/__stellarProxStarportTransitAddHook/.test(source)&&/THREE\.Object3D\.prototype\.add===addWrapper/.test(source),'PROX construction hook is explicitly restorable on teardown');
check(/window\.WarpProxStarportTransit=/.test(source),'PROX transit exposes a bounded diagnostic API');
check(/highFrameCalls-standardFrameCalls,7/.test(browserSource)&&/lowFrameCalls,standardFrameCalls/.test(browserSource),'production-browser gate measures actual renderer DRAW delta and lower-tier restoration');
check(doc.includes('2,304')&&doc.includes('3 draw calls')&&doc.includes('Standard／Low'),'PROX transit SOT records bounded High cost and zero lower-tier cost');
check(doc.includes('Photo Capture')&&doc.includes('backing-canvas'),'PROX transit SOT records direct-capture synchronization');
check(doc.includes('36')&&doc.includes('approach beacons')&&doc.includes('existing starport'),'PROX transit SOT records the user-visible traffic-lattice treatment');

const browser=spawnSync(process.execPath,['scripts/validate-prox-starport-transit-browser.mjs'],{encoding:'utf8',timeout:140000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production WebGL PROX transit passes direct-capture, measured-renderer-budget, disposal, rebuild, revisit and both phone viewport gates');
console.log(`PROX Starport Transit validation: ${passed}/${passed} checks passed plus focused real-browser evidence`);
