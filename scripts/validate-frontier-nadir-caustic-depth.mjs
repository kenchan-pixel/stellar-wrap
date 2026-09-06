import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const source=readFileSync('frontier-nadir.html','utf8');
let passes=0;
const ok=(condition,message)=>{assert.ok(condition,message);passes++};

ok(source.includes("const QUALITY_ID='NADIR_OBSERVATORY_DEPTH_V3'"),'NADIR exposes the observatory-depth v3 visual identity');
ok(source.includes("const OBSERVATORY_PROFILE='NADIR_INTERFEROMETER_FRAME_V1'"),'NADIR exposes the fixed interferometer foreground profile');
ok(source.includes('const causticMaterial=new THREE.ShaderMaterial')&&source.includes('new THREE.PlaneGeometry(50,31)'),'caustic depth keeps one bounded shader plane');
ok(source.includes('float curve=6.0+.012*p.x*p.x')&&source.includes('float ribbon='),'caustic shader keeps upper/lower curved ribbons rather than a portal ring');
ok(source.includes('function buildLensedStreaks()')&&source.includes('const segments=36')&&source.includes('new THREE.LineSegments'),'lensed-star streak bank remains bounded to one 36-segment draw');
ok(source.includes('new Float32Array(28*3)')&&source.includes('new THREE.Points(photonG,photonM)'),'photon emphasis remains a bounded 28-point bank rather than a torus');
ok(source.includes('new THREE.InstancedMesh(collectorGeo,collectorMat,collectorLayout.length)')&&source.includes('collectorRings:3'),'three observatory collector rings share one instanced draw');
ok(source.includes('new THREE.InstancedMesh(collectorGlowGeo,collectorGlowMat,collectorLayout.length)'),'collector rim lighting shares one instanced additive draw');
ok(source.includes('new THREE.InstancedMesh(trussGeo,trussMat,12)')&&source.includes('trussBeams:12'),'foreground observatory truss is bounded to twelve instances in one draw');
ok(source.includes('new THREE.InstancedMesh(podGeo,podMat,12)')&&source.includes('receiverPods:12'),'receiver cassettes use one bounded twelve-instance bank');
ok(source.includes('new THREE.InstancedMesh(beaconGeo,beaconMat,10)')&&source.includes('depthBeacons:10'),'far observatory depth uses one ten-instance beacon bank');
ok(source.includes('observatoryFrame:true')&&source.includes('causticSheet:true')&&source.includes('lensedStreaks:true'),'runtime diagnostics expose observatory frame plus preserved caustic depth layers');
ok(source.includes('portalRing:false')&&!source.includes('TorusGeometry(6.08'),'observatory upgrade preserves the no-portal-ring identity');
ok(source.includes("const VISUAL_ID='NADIR_FIXED_LENSING_V4'")&&source.includes('eventHorizon:true')&&source.includes('lensingCrown:true'),'existing fixed black-hole visual contract remains authoritative');
ok(source.includes('MAX_NORMAL_DPR=1.25')&&source.includes('MAX_CAPTURE_DPR=1.60'),'normal and capture DPR ceilings remain bounded');
ok((source.match(/new THREE\.WebGLRenderer/g)||[]).length===1,'NADIR still owns exactly one WebGL renderer');
ok(!/pointerdown|pointermove|touchstart|touchmove|dblclick/.test(source),'fixed curated composition still has no camera-rotation handlers');
ok(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/.test(source),'observatory depth adds no persistence, backend or analytics authority');
ok(source.includes("window.WarpFrontierNadir={state,applyVista,skipArrival,capture}"),'shared Frontier scenic API remains unchanged');

const browser=spawnSync(process.execPath,['scripts/validate-frontier-nadir-caustic-depth-browser.mjs'],{encoding:'utf8',timeout:90000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);
if(browser.stderr)process.stderr.write(browser.stderr);
ok(browser.status===0,'real production NADIR observatory-depth + capture lifecycle passes at both phone viewports');

console.log(`NADIR Observatory Depth v3 validation: ${passes}/${passes} checks passed plus two real-browser viewports`);
