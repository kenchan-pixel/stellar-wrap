import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const source=fs.readFileSync(new URL('../luna-earthrise-depth.js',import.meta.url),'utf8');
const browserSource=fs.readFileSync(new URL('./validate-luna-earthrise-depth-browser.mjs',import.meta.url),'utf8');
const focus=fs.readFileSync(new URL('../exploration-focus-tray.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const doc=fs.readFileSync(new URL('../docs/LUNA_EARTHRISE_DEPTH.md',import.meta.url),'utf8');
let passed=0;
function check(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`PASS LUNA EARTHRISE ${passed}: ${label}`)}

new vm.Script(source.replace(/^import .*?;\s*/,''));
check(source.includes("three@0.185.1/build/three.module.js"),'LUNA depth layer reuses pinned Three.js');
check(focus.includes("import('./cinematic-quality.js').then(()=>import('./luna-earthrise-depth.js'))"),'LUNA depth layer loads after the shared cinematic quality layer');
check(sw.includes("'./luna-earthrise-depth.js'")&&sw.includes("`${CACHE_PREFIX}v15`"),'LUNA layer is included in the existing prepared offline shell generation');
check(/moonCenter:new THREE\.Vector3\(13,-7,-70\),moonRadius:21/.test(source)&&/earthCenter:new THREE\.Vector3\(-35,17,-146\),earthRadius:12/.test(source)&&/ringCenter:new THREE\.Vector3\(13,-7,-70\),ringRadius:26/.test(source),'LUNA anchors match the existing moon, distant Earth and orbital ring authorities');
check(/triangles:2704,drawCalls:4,beacons:BEACON_COUNT,depthSpan:3\.8/.test(source),'Earthrise depth pass declares a bounded 2,704-triangle / four-draw budget');
check(/new THREE\.TorusGeometry\(21\.55,\.14,6,112,Math\.PI\*1\.22\)/.test(source)&&/lunar-horizon/.test(source),'lunar horizon is a bounded partial 3D rim rather than a screen overlay');
check(/new THREE\.SphereGeometry\(1,32,20\)/.test(source)&&/earthrise-crescent/.test(source)&&/float crescent=smoothstep/.test(source),'distant Earth gets a bounded directional crescent limb');
check(/const BEACON_COUNT=18/.test(source)&&/new THREE\.InstancedMesh\(geometry,material,BEACON_COUNT\)/.test(source)&&/new THREE\.OctahedronGeometry\(\.2,0\)/.test(source),'18 orbital beacons share one low-poly instanced draw');
check(/lane=i%2===0\?1:-1/.test(source)&&/z=lane\*1\.55\+Math\.sin\(a\*2\)\*\.32/.test(source),'orbital beacons occupy two staggered near/far depth lanes');
check(/new THREE\.LineSegments\(railGeometry\(\)/.test(source)&&/for\(const lane of\[-1,1\]\)/.test(source),'dual orbital rails add depth guidance without triangle-heavy geometry');
check(/object\.isInstancedMesh\?object\.count:1/.test(source),'runtime triangle measurement accounts for instanced beacons');
check(/state\.exploring&&!state\.flying&&!state\.contextLost/.test(source)&&/state\.qualityMode==='high'&&state\.current==='LUNA'/.test(source),'Earthrise depth is safe-final-exploration and High-only');
check(/if\(!high&&objects\.length\)disposeOwn\(\)/.test(source)&&/if\(high&&moonRoot&&earthRoot&&ring&&!objects\.length\)build\(\)/.test(source),'downgrade/departure disposes owned objects and High rebuilds on demand');
check(/setInterval\(sync,SAMPLE_MS\)/.test(source)&&/const SAMPLE_MS=250/.test(source),'state synchronization is bounded to 4 Hz outside the renderer loop');
check(/new MutationObserver\(sync\)/.test(source)&&/attributeFilter:\['width','height'\]/.test(source),'canvas backing-size changes immediately synchronize Photo Capture Boost');
check(!/requestAnimationFrame\s*\(/.test(source),'LUNA depth layer adds no independent render loop');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'LUNA depth layer adds no persistence authority');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'LUNA depth layer adds no runtime network or analytics path');
check(/object\.geometry\?\.dispose/.test(source)&&/material\?\.dispose/.test(source),'owned geometry and materials are explicitly released');
check(/__stellarLunaEarthriseDepthAddHook/.test(source)&&/THREE\.Object3D\.prototype\.add===addWrapper/.test(source),'scene-construction hook is explicitly restorable');
check(/window\.WarpLunaEarthriseDepth=/.test(source)&&/beaconDepthSpan/.test(source),'diagnostic API exposes live bounded depth state');
check(/#perfHud/.test(browserSource)&&/highFrameCalls-standardFrameCalls,8/.test(browserSource),'production-browser gate measures the actual combined shared + Earthrise DRAW delta');
check(/WarpPhotoMode\.capture/.test(browserSource)&&/__lunaEarthriseCaptureProbe/.test(browserSource),'production-browser gate verifies one-shot Photo Capture includes the High Earthrise layer');
check(/390,844/.test(browserSource)&&/360,800/.test(browserSource)&&/luna-earthrise-depth-/.test(browserSource),'both required phone viewports emit visual evidence');
check(doc.includes('2,704')&&doc.includes('4 draw calls')&&doc.includes('18')&&doc.includes('390×844')&&doc.includes('360×800'),'SOT records bounded performance and both phone visual gates');
check(doc.includes('Photo Capture')&&doc.includes('Standard／Low')&&doc.includes('地球升起'),'SOT records capture synchronization, lower-tier zero cost and user-visible Earthrise outcome');

const browser=spawnSync(process.execPath,['scripts/validate-luna-earthrise-depth-browser.mjs'],{encoding:'utf8',timeout:140000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production WebGL LUNA Earthrise depth passes capture, measured renderer budget, lifecycle and both phone viewport gates');
console.log(`LUNA Earthrise Parallax Depth validation: ${passed}/${passed} checks passed plus focused real-browser evidence`);