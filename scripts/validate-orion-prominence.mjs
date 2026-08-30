import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const source=fs.readFileSync(new URL('../orion-prominence-quality.js',import.meta.url),'utf8');
const focus=fs.readFileSync(new URL('../exploration-focus-tray.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const doc=fs.readFileSync(new URL('../docs/ORION_PROMINENCE_CROWN.md',import.meta.url),'utf8');
let passed=0;
function check(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`PASS ORION PROM ${passed}: ${label}`)}

new vm.Script(source.replace(/^import .*?;\s*/,''));
check(source.includes("three@0.185.1/build/three.module.js"),'ORION prominence layer reuses pinned Three.js');
check(/import\('\.\/cinematic-quality\.js'\)\.then\(\(\)=>import\('\.\/cyg-cinematic-quality\.js'\)\)\.then\(\(\)=>import\('\.\/orion-prominence-quality\.js'\)\)/.test(focus),'ORION prominence loads after the existing cinematic layers');
check(sw.includes("'./orion-prominence-quality.js'"),'ORION prominence extension is included in the offline shell');
check(/starCenter:new THREE\.Vector3\(28,8,-137\),starRadius:30/.test(source),'ORION prominence anchor matches the existing red-supergiant scene');
check(/triangles:3072,drawCalls:2/.test(source),'ORION prominence budget is explicitly bounded to 3,072 triangles / two draw calls');
check(/VISUAL_PASS='prominence-crown-v1'/.test(source)&&/visualPass:VISUAL_PASS/.test(source),'ORION diagnostics identify the prominence crown pass');
check(/new THREE\.TorusGeometry\(1\.24,\.035,8,96,Math\.PI\*1\.38\)/.test(source),'primary prominence arc is bounded partial torus geometry');
check(/new THREE\.TorusGeometry\(1\.34,\.028,8,96,Math\.PI\*1\.18\)/.test(source),'secondary prominence arc is bounded partial torus geometry');
check(/float endFade=smoothstep\(\.015,\.12,vUv\.x\)/.test(source)&&/float knots=pow/.test(source),'prominence shader tapers arc ends and adds bounded hot knots');
check(/crownA\.rotation\.set\(1\.08,\.28,-\.48\)/.test(source)&&/crownB\.rotation\.set\(\.46,1\.02,\.72\)/.test(source),'two prominence arcs use distinct 3D orientations for an asymmetric silhouette');
check(/state\.exploring&&!state\.flying&&!state\.contextLost/.test(source)&&/state\.qualityMode==='high'&&state\.current==='ORION'/.test(source),'ORION prominence is safe-final-exploration and High-only');
check(/if\(!high&&objects\.length\)disposeOwn\(\)/.test(source)&&/if\(high&&star&&!objects\.length\)build\(\)/.test(source),'ORION prominence disposes on downgrade/departure and rebuilds on demand');
check(/geometry\.index\?\.count/.test(source)&&/geometry\.attributes\?\.position\?\.count/.test(source),'ORION prominence diagnostics measure actual BufferGeometry triangles');
check(/setInterval\(sync,SAMPLE_MS\)/.test(source)&&/const SAMPLE_MS=250/.test(source),'ORION prominence synchronization is bounded to 4 Hz outside the renderer loop');
check(!/requestAnimationFrame\s*\(/.test(source),'ORION prominence adds no independent render loop');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'ORION prominence adds no persistence authority');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'ORION prominence adds no runtime network or analytics path');
check(/object\.geometry\?\.dispose/.test(source)&&/material\.dispose\?\.\(\)/.test(source),'ORION prominence owned geometry and materials are explicitly released');
check(/__stellarOrionProminenceAddHook/.test(source)&&/THREE\.Object3D\.prototype\.add===addWrapper/.test(source),'ORION prominence construction hook is explicitly restorable on teardown');
check(/window\.WarpOrionProminenceQuality=/.test(source),'ORION prominence diagnostic API exposes autonomous validation state');
check(doc.includes('3,072')&&doc.includes('2 draw calls')&&doc.includes('Standard／Low'),'ORION prominence SOT records the bounded High cost and zero-cost lower tiers');
check(doc.includes('prominence crown')&&doc.includes('asymmetric'),'ORION prominence SOT records the user-visible asymmetric stellar silhouette');

const browser=spawnSync(process.execPath,['scripts/validate-orion-prominence-browser.mjs'],{encoding:'utf8',timeout:120000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production WebGL ORION prominence passes measured-budget, disposal, rebuild, revisit and viewport gates');
console.log(`ORION Prominence Crown validation: ${passed}/${passed} checks passed plus focused real-browser evidence`);