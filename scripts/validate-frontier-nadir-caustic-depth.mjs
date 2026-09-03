import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const source=readFileSync('frontier-nadir.html','utf8');
let passes=0;
const ok=(condition,message)=>{assert.ok(condition,message);passes++};

ok(source.includes("const QUALITY_ID='NADIR_CAUSTIC_DEPTH_V2'"),'NADIR exposes the bounded caustic-depth visual identity');
ok(source.includes('const causticMaterial=new THREE.ShaderMaterial')&&source.includes('new THREE.PlaneGeometry(50,31)'),'caustic depth uses one bounded shader plane');
ok(source.includes('float curve=6.0+.012*p.x*p.x')&&source.includes('float ribbon='),'caustic shader forms upper/lower curved ribbons rather than a portal ring');
ok(source.includes('function buildLensedStreaks()')&&source.includes('const segments=36')&&source.includes('new THREE.LineSegments'),'lensed-star streak bank is bounded to one 36-segment draw');
ok(source.includes('new Float32Array(28*3)')&&source.includes('new THREE.Points(photonG,photonM)'),'photon emphasis uses 28 bounded points rather than a torus');
ok(source.includes('new THREE.InstancedMesh(beaconGeo,beaconMat,6)'),'far observatory depth uses one six-instance beacon bank');
ok(source.includes('causticSheet:true')&&source.includes('lensedStreaks:true')&&source.includes('depthBeacons:true'),'runtime diagnostics expose all new depth layers');
ok(source.includes('portalRing:false')&&!source.includes('TorusGeometry(6.08'),'caustic upgrade preserves the no-portal-ring identity');
ok(source.includes("const VISUAL_ID='NADIR_FIXED_LENSING_V4'")&&source.includes('eventHorizon:true')&&source.includes('lensingCrown:true'),'existing fixed black-hole visual contract remains authoritative');
ok(source.includes('MAX_NORMAL_DPR=1.25')&&source.includes('MAX_CAPTURE_DPR=1.60'),'normal and capture DPR ceilings remain bounded');
ok((source.match(/new THREE\.WebGLRenderer/g)||[]).length===1,'NADIR still owns exactly one WebGL renderer');
ok(!/pointerdown|pointermove|touchstart|touchmove|dblclick/.test(source),'fixed curated composition still has no camera-rotation handlers');
ok(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/.test(source),'caustic depth adds no persistence, backend or analytics authority');
ok(source.includes("window.WarpFrontierNadir={state,applyVista,skipArrival,capture}"),'shared Frontier scenic API remains unchanged');

const browser=spawnSync(process.execPath,['scripts/validate-frontier-nadir-caustic-depth-browser.mjs'],{encoding:'utf8',timeout:90000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);
if(browser.stderr)process.stderr.write(browser.stderr);
ok(browser.status===0,'real production NADIR caustic-depth + capture lifecycle passes at both phone viewports');

console.log(`NADIR Caustic Depth v2 validation: ${passes}/${passes} checks passed plus two real-browser viewports`);