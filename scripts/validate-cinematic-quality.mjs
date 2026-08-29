import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const source=fs.readFileSync(new URL('../cinematic-quality.js',import.meta.url),'utf8');
const focus=fs.readFileSync(new URL('../exploration-focus-tray.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
let passed=0;
function check(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`PASS ${passed}: ${label}`)}

const moduleBody=source.replace(/^import .*?;\s*/,'');new vm.Script(moduleBody);
check(source.includes("three@0.185.1/build/three.module.js"),'cinematic layer reuses the pinned Three.js version');
check(focus.includes("import('./cinematic-quality.js')"),'active exploration bootstrap loads cinematic quality');
check(sw.includes("'./cinematic-quality.js'"),'cinematic quality is included in the offline shell');
check(/TAU:\{center:new THREE\.Vector3\(15,-5,-86\),radius:23,triangles:8352,drawCalls:4\}/.test(source),'TAU quality profile remains explicitly bounded');
check(/ORION:\{starCenter:new THREE\.Vector3\(28,8,-137\),starRadius:30,rockCenter:new THREE\.Vector3\(-26,-12,-90\),rockRadius:10,triangles:10944,drawCalls:4\}/.test(source),'ORION quality profile is explicitly bounded');
check(/state\.exploring&&!state\.flying&&!state\.contextLost/.test(source),'enhancements are gated to safe final exploration');
check(/state\.qualityMode==='high'/.test(source),'additional 3D objects are High-tier only');
check(/function buildTau\(\)/.test(source)&&/new THREE\.RingGeometry\(30\.15,54\.85,192,1\)/.test(source),'TAU retains bounded real 3D surface and ring geometry');
check(/function buildOrion\(\)/.test(source)&&/orionStarTexture/.test(source)&&/orionCoronaMaterial/.test(source),'ORION High adds red-supergiant surface and corona detail');
check(/orionRockTexture/.test(source)&&/orion-terrain/.test(source),'ORION High adds real 3D foreground outpost surface detail');
check(/const count=84/.test(source)&&/orionFilamentGeometry/.test(source)&&/orionGlowTexture/.test(source),'ORION nebula filament layer uses 84 bounded soft point sprites');
check(/triangles:10944/.test(source)&&/drawCalls:4/.test(source),'ORION diagnostic contract caps the slice at four draw calls and 10,944 triangles');
check(/if\(!tauHigh&&tauObjects\.length\)disposeTauOwn\(\)/.test(source)&&/if\(!orionHigh&&orionObjects\.length\)disposeOrionOwn\(\)/.test(source),'dropping below High or leaving a target releases all owned cinematic GPU objects');
check(/if\(tauHigh&&tauRoot&&!tauObjects\.length\)buildTau\(\)/.test(source)&&/if\(orionHigh&&orionStar&&orionRockSurface&&orionSystemRoot&&!orionObjects\.length\)buildOrion\(\)/.test(source),'TAU and ORION High layers rebuild on demand');
check(/setInterval\(sync,SAMPLE_MS\)/.test(source)&&/const SAMPLE_MS=250/.test(source),'state synchronization is bounded to 4 Hz outside the renderer loop');
check(!/requestAnimationFrame\s*\(/.test(source),'cinematic module adds no independent render loop');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'cinematic layer adds no persistence authority');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'cinematic layer adds no runtime network or analytics path');
check(/THREE\.Object3D\?\.prototype/.test(source)&&/originalAdd\.apply\(this,children\)/.test(source),'scene-root capture observes construction events instead of renderer frames');
check(/__stellarCinematicAddHook/.test(source)&&/THREE\.Object3D\.prototype\.add=originalAdd/.test(source),'scene-construction hook is explicitly restored on page teardown');
check(/disposeMaterial/.test(source)&&/material\.map\?\.dispose/.test(source),'owned procedural GPU textures are explicitly released');
check(/function teardown\(\)/.test(source)&&/disposeTauOwn\(\);disposeOrionOwn\(\)/.test(source),'page teardown releases both destination quality slices');
check(/window\.WarpCinematicQuality=/.test(source),'diagnostic API exposes autonomous validation state');

const browser=spawnSync(process.execPath,['scripts/validate-cinematic-quality-browser.mjs'],{encoding:'utf8',timeout:150000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production WebGL TAU + ORION cinematic quality passes disposal, rebuild, revisit and viewport gates');
console.log(`Cinematic quality validation: ${passed}/${passed} checks passed plus two real-browser phone viewports covering TAU and ORION`);
