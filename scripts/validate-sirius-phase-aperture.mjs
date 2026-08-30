import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const source=fs.readFileSync(new URL('../sirius-phase-aperture.js',import.meta.url),'utf8');
const browserSource=fs.readFileSync(new URL('./validate-sirius-phase-aperture-browser.mjs',import.meta.url),'utf8');
const focus=fs.readFileSync(new URL('../exploration-focus-tray.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const doc=fs.readFileSync(new URL('../docs/SIRIUS_PHASE_APERTURE.md',import.meta.url),'utf8');
let passed=0;
function check(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`PASS SIRIUS APERTURE ${passed}: ${label}`)}

new vm.Script(source.replace(/^import .*?;\s*/,''));
check(source.includes("three@0.185.1/build/three.module.js"),'SIRIUS aperture reuses pinned Three.js');
check(/import\('\.\/orion-prominence-quality\.js'\)\)\.then\(\(\)=>import\('\.\/sirius-phase-aperture\.js'\)\)/.test(focus),'SIRIUS aperture loads after existing cinematic extensions');
check(sw.includes("'./sirius-phase-aperture.js'"),'SIRIUS aperture is included in the prepared offline shell');
check(/relayCenter:new THREE\.Vector3\(0,-4,-82\),relayRadius:17\.5/.test(source),'SIRIUS aperture anchor matches the existing outer relay ring');
check(/triangles:3072,drawCalls:2/.test(source),'SIRIUS aperture budget is bounded to 3,072 triangles / two draw calls');
check(/shader\.forceSinglePass=true/.test(source),'transparent DoubleSide aperture materials explicitly use one renderer pass per mesh');
check(/singlePass:active&&objects\.every/.test(source),'SIRIUS diagnostics expose live single-pass material state');
check(/VISUAL_PASS='phase-aperture-v1'/.test(source)&&/visualPass:VISUAL_PASS/.test(source),'SIRIUS diagnostics identify the phase-aperture visual pass');
check(/new THREE\.TorusGeometry\(17\.7,\.18,8,96,Math\.PI\*1\.04\)/.test(source),'upper relay aperture is bounded partial torus geometry');
check(/new THREE\.TorusGeometry\(14\.9,\.16,8,96,Math\.PI\*1\.12\)/.test(source),'lower relay aperture is bounded partial torus geometry');
check(/float rails=smoothstep/.test(source)&&/float nodes=pow/.test(source)&&/float edge=smoothstep/.test(source),'relay shader adds segmented rails, sync nodes and tapered arc ends');
check(/upper\.rotation\.set\(\.42,\.16,-\.58\)/.test(source)&&/lower\.rotation\.set\(-\.48,\.62,\.44\)/.test(source),'aperture arcs use opposing 3D planes for a stronger station silhouette');
check(/state\.exploring&&!state\.flying&&!state\.contextLost/.test(source)&&/state\.qualityMode==='high'&&state\.current==='SIRIUS'/.test(source),'SIRIUS aperture is safe-final-exploration and High-only');
check(/if\(!high&&objects\.length\)disposeOwn\(\)/.test(source)&&/if\(high&&relay&&!objects\.length\)build\(\)/.test(source),'SIRIUS aperture disposes on downgrade/departure and rebuilds on demand');
check(/geometry\.index\?\.count/.test(source)&&/geometry\.attributes\?\.position\?\.count/.test(source),'SIRIUS aperture diagnostics measure actual BufferGeometry triangles');
check(/setInterval\(sync,SAMPLE_MS\)/.test(source)&&/const SAMPLE_MS=250/.test(source),'SIRIUS aperture synchronization retains a bounded 4 Hz fallback outside the renderer loop');
check(/new MutationObserver\(sync\)/.test(source)&&/attributeFilter:\['width','height'\]/.test(source),'SIRIUS aperture reacts immediately to renderer backing-size quality changes so one-shot Photo Capture includes High detail');
check(/qualityObserver\?\.disconnect\(\)/.test(source),'SIRIUS quality observer is disconnected on teardown');
check(!/requestAnimationFrame\s*\(/.test(source),'SIRIUS aperture adds no independent render loop');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'SIRIUS aperture adds no persistence authority');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'SIRIUS aperture adds no runtime network or analytics path');
check(/object\.geometry\?\.dispose/.test(source)&&/material\?\.dispose/.test(source),'SIRIUS aperture explicitly releases owned geometry and materials');
check(/__stellarSiriusPhaseApertureAddHook/.test(source)&&/THREE\.Object3D\.prototype\.add===addWrapper/.test(source),'SIRIUS construction hook is explicitly restorable on teardown');
check(/window\.WarpSiriusPhaseAperture=/.test(source),'SIRIUS aperture exposes a bounded diagnostic API');
check(/#perfHud/.test(browserSource)&&/highFrameCalls-standardFrameCalls,6/.test(browserSource)&&/lowFrameCalls,standardFrameCalls/.test(browserSource),'production-browser gate measures actual renderer DRAW delta and lower-tier restoration instead of trusting profile constants');
check(doc.includes('3,072')&&doc.includes('2 draw calls')&&doc.includes('Standard／Low'),'SIRIUS aperture SOT records bounded High cost and zero lower-tier cost');
check(doc.includes('Photo Capture')&&doc.includes('backing-canvas'),'SIRIUS SOT records direct-capture synchronization and its event-driven backing-canvas trigger');
check(doc.includes('forceSinglePass')&&doc.includes('renderer diagnostic'),'SIRIUS SOT records the single-pass draw contract and actual renderer measurement gate');

const browser=spawnSync(process.execPath,['scripts/validate-sirius-phase-aperture-browser.mjs'],{encoding:'utf8',timeout:140000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production WebGL SIRIUS aperture passes direct-capture, measured-renderer-budget, disposal, rebuild, revisit and both phone viewport gates');
console.log(`SIRIUS Phase Aperture validation: ${passed}/${passed} checks passed plus focused real-browser evidence`);
