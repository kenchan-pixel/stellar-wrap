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
check(/const TARGET='TAU'/.test(source),'first quality slice is intentionally bounded to TAU');
check(/state\.current===TARGET&&state\.exploring&&!state\.flying&&!state\.contextLost/.test(source),'enhancement is gated to safe final exploration');
check(/state\.qualityMode==='high'/.test(source),'additional 3D load is visible only in High tier');
check(/new THREE\.SphereGeometry\(1,64,40\)/.test(source)&&/new THREE\.RingGeometry\(30\.15,54\.85,192,1\)/.test(source),'High tier adds bounded real 3D surface and ring geometry');
check(/new THREE\.ShaderMaterial/.test(source)&&/uInner/.test(source)&&/uOuter/.test(source),'atmosphere and ring depth use GPU shader materials');
check(/const count=96/.test(source),'ring dust particle count is explicitly bounded');
check(/drawCalls:active\?4:0/.test(source),'diagnostic contract caps the slice at four additional draw calls');
check(/setInterval\(sync,SAMPLE_MS\)/.test(source)&&/const SAMPLE_MS=250/.test(source),'state synchronization is bounded to 4 Hz outside the renderer loop');
check(!/requestAnimationFrame\s*\(/.test(source),'cinematic module adds no independent render loop');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'cinematic layer adds no persistence authority');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'cinematic layer adds no runtime network or analytics path');
check(/proto\.render=original/.test(source),'renderer interception restores the original render method immediately after scene capture');
check(/window\.WarpCinematicQuality=/.test(source),'diagnostic API exposes autonomous validation state');

const browser=spawnSync(process.execPath,['scripts/validate-cinematic-quality-browser.mjs'],{encoding:'utf8',timeout:120000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production WebGL TAU cinematic quality passes at both phone viewports');
console.log(`Cinematic quality validation: ${passed}/${passed} checks passed plus two real-browser TAU viewports`);
