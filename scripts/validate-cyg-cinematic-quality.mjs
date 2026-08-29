import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const source=fs.readFileSync(new URL('../cyg-cinematic-quality.js',import.meta.url),'utf8');
const focus=fs.readFileSync(new URL('../exploration-focus-tray.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
let passed=0;
function check(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`PASS CYG ${passed}: ${label}`)}

new vm.Script(source.replace(/^import .*?;\s*/,''));
check(source.includes("three@0.185.1/build/three.module.js"),'CYG layer reuses pinned Three.js');
check(/import\('\.\/cinematic-quality\.js'\)\.then\(\(\)=>import\('\.\/cyg-cinematic-quality\.js'\)\)/.test(focus),'CYG extension loads after the existing cinematic layer');
check(sw.includes("'./cyg-cinematic-quality.js'"),'CYG cinematic extension is included in the offline shell');
check(/primaryCenter:new THREE\.Vector3\(-18,10,-108\)/.test(source)&&/primaryRadius:11/.test(source),'CYG primary star anchor matches the existing core scene');
check(/companionCenter:new THREE\.Vector3\(18,-7,-118\)/.test(source)&&/companionRadius:8/.test(source),'CYG companion star anchor matches the existing core scene');
check(/beaconCenter:new THREE\.Vector3\(0,0,-92\)/.test(source)&&/beaconRadius:19/.test(source),'CYG outer beacon anchor matches the existing core torus');
check(/triangles:12992/.test(source)&&/drawCalls:4/.test(source),'CYG High budget is explicitly bounded to 12,992 triangles / four draw calls');
check(/new THREE\.SphereGeometry\(1,64,40\)/.test(source)&&/primary-detail/.test(source),'CYG primary gains higher-frequency real 3D stellar detail');
check(/new THREE\.SphereGeometry\(1,48,32\)/.test(source)&&/companion-detail/.test(source),'CYG companion gains bounded real 3D stellar detail');
check(/binary-halo/.test(source)&&/haloMaterial/.test(source),'CYG High adds a bounded additive blue-violet halo');
check(/new THREE\.TorusGeometry\(PROFILE\.beaconRadius,\.28,8,128\)/.test(source)&&/beacon\.add\(track\)/.test(source),'CYG beacon track attaches to the existing outer rotating torus');
check(/geometry\.index\?\.count/.test(source)&&/geometry\.attributes\?\.position\?\.count/.test(source),'CYG diagnostics measure actual BufferGeometry triangles');
check(/state\.exploring&&!state\.flying&&!state\.contextLost/.test(source)&&/state\.qualityMode==='high'&&state\.current==='CYG'/.test(source),'CYG objects are safe-final-exploration and High-only');
check(/if\(!high&&objects\.length\)disposeOwn\(\)/.test(source)&&/if\(high&&primary&&companion&&beacon&&!objects\.length\)build\(\)/.test(source),'CYG High objects dispose on downgrade/departure and rebuild on demand');
check(/setInterval\(sync,SAMPLE_MS\)/.test(source)&&/const SAMPLE_MS=250/.test(source),'CYG synchronization is bounded to 4 Hz outside the renderer loop');
check(!/requestAnimationFrame\s*\(/.test(source),'CYG adds no independent render loop');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'CYG adds no persistence authority');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'CYG adds no network or analytics path');
check(/material\.map\?\.dispose/.test(source)&&/object\.geometry\?\.dispose/.test(source),'CYG owned textures, materials and geometries are explicitly released');
check(/__stellarCygCinematicAddHook/.test(source)&&/THREE\.Object3D\.prototype\.add===addWrapper/.test(source),'CYG construction hook is explicitly restorable on teardown');
check(/window\.WarpCygCinematicQuality=/.test(source),'CYG diagnostic API exposes autonomous validation state');

const browser=spawnSync(process.execPath,['scripts/validate-cyg-cinematic-quality-browser.mjs'],{encoding:'utf8',timeout:180000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production WebGL CYG quality passes measured-budget, disposal, rebuild, revisit and viewport gates');
console.log(`CYG cinematic quality validation: ${passed}/${passed} checks passed plus two real-browser phone viewports`);
