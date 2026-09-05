import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const source=fs.readFileSync(new URL('../sol-orbital-frame.js',import.meta.url),'utf8');
const browserSource=fs.readFileSync(new URL('./validate-sol-orbital-frame-browser.mjs',import.meta.url),'utf8');
const focus=fs.readFileSync(new URL('../exploration-focus-tray.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const doc=fs.readFileSync(new URL('../docs/SOL_ORBITAL_FRAME.md',import.meta.url),'utf8');
let passed=0;
function check(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`PASS SOL ORBITAL FRAME ${passed}: ${label}`)}

new vm.Script(source.replace(/^import .*?;\s*/,''));
check(source.includes("three@0.185.1/build/three.module.js"),'SOL focused layer reuses pinned Three.js');
check(source.includes("VISUAL_PASS='orbital-observation-frame-v1'"),'stable frame visual-pass diagnostics are preserved');
check(source.includes("GANTRY_PROFILE='orbital-perspective-gantry-v2'"),'accepted v2 perspective profile is preserved');
check(source.includes("LATTICE_PROFILE='orbital-observation-lattice-v3'"),'accepted v3 observation lattice is preserved');
check(source.includes("NIGHT_PROFILE='earth-night-terminator-v4'"),'v4 exposes a dedicated Earth night-terminator profile');
check(focus.includes("import('./cinematic-quality.js').then(()=>import('./sol-orbital-frame.js')).then(()=>import('./luna-earthrise-depth.js'))"),'SOL focused layer keeps its approved bootstrap position');
check(/const CACHE_NAME=`\$\{CACHE_PREFIX\}v\d+`;/.test(sw)&&sw.includes("'./sol-orbital-frame.js'"),'SOL focused layer remains in the current versioned offline shell');

check(/earthCenter:new THREE\.Vector3\(14,-5,-80\),earthRadius:18/.test(source)&&/moonCenter:new THREE\.Vector3\(-28,11,-128\),moonRadius:4\.7/.test(source),'v4 reuses existing Earth and Moon scene anchors');
check(/const SOL_STAR_LOCAL=new THREE\.Vector3\(-78,38,-220\)/.test(source),'terminator direction derives from the existing SOL star position');
check(/function planetSurface\(object,center,radius\)/.test(source)&&/earthSurface=earth/.test(source),'v4 captures the existing rotating Earth surface instead of creating another planet authority');

check(/const BAY_COUNT=8/.test(source)&&/const bay=Math\.floor\(i\/2\),t=bay\/\(BAY_COUNT-1\)/.test(source),'16 masts remain authored as eight paired near/far bays');
check(/const MAST_COUNT=16/.test(source)&&/new THREE\.InstancedMesh\(geometry,material,MAST_COUNT\)/.test(source),'16 observation masts remain one instanced draw');
check(/const NEAR_MAST_SCALE=1\.46/.test(source)&&/const FAR_MAST_SCALE=\.72/.test(source),'accepted near/far mast scale hierarchy is unchanged');
check(/const LIGHT_COUNT=20/.test(source)&&/new THREE\.InstancedMesh\(geometry,material,LIGHT_COUNT\)/.test(source),'20 navigation lights remain one instanced draw');
check(/const BRACE_SEGMENT_COUNT=30/.test(source)&&/new THREE\.LineSegments\(braceGeometry\(\)/.test(source),'30 brace segments remain one LineSegments draw');

check(/function earthNightTexture\(\)/.test(source)&&/canvas\.width=PROFILE\.nightTexture\[0\]/.test(source)&&/clusters=\[/.test(source),'v4 adds a bounded procedural 512×256 city-light atlas');
check(/function earthNightMaterial\(\)/.test(source)&&/uniform vec3 uSunDirection/.test(source)&&/vNight=1\.0-smoothstep\(-0\.10,0\.18,sunFacing\)/.test(source),'city-light shader fades across a true directional day/night terminator');
check(/new THREE\.SphereGeometry\(1,48,32\)/.test(source)&&/earthSurface\.add\(nightLayer\)/.test(source),'night lights are one bounded sphere attached to the existing rotating Earth surface');
check(/nightLayer\.scale\.setScalar\(1\.009\)/.test(source)&&/THREE\.AdditiveBlending/.test(source),'night overlay stays just above the Earth surface and uses low-cost additive glow');
check(/earthRoot\.parent\.localToWorld\(sunWorld\)/.test(source)&&/sunWorld\.copy\(SOL_STAR_LOCAL\)/.test(source)&&/sunDirection\.copy\(sunWorld\)\.sub\(earthWorld\)\.normalize\(\)/.test(source),'terminator tracks the existing SOL system orientation instead of a fixed screen-space light');
check(/material\.userData\.ownedTextures=\[lights\]/.test(source)&&/for\(const texture of material\?\.userData\?\.ownedTextures\|\|\[\]\)texture\?\.dispose\?\.\(\)/.test(source),'owned procedural city texture is explicitly disposed');

check(/triangles:3328,drawCalls:4/.test(source)&&/nightTriangles:2976/.test(source),'focused v4 GPU budget is explicitly bounded to 3,328 triangles and four draws');
check(/object\.isInstancedMesh\?object\.count:1/.test(source),'runtime triangle measurement still accounts for instancing');
check(/nightProfile:active\?NIGHT_PROFILE:null/.test(source)&&/nightTriangles:active&&nightLayer\?geometryTriangles\(nightLayer\):0/.test(source),'runtime diagnostics expose the live v4 layer and measured night geometry');
check(/sunDirection:active\?\[sunDirection\.x,sunDirection\.y,sunDirection\.z\]/.test(source)&&/nightTexture:active\?PROFILE\.nightTexture:null/.test(source),'runtime diagnostics expose bounded terminator direction and texture dimensions only while active');

check(/state\.exploring&&!state\.flying&&!state\.contextLost/.test(source)&&/state\.qualityMode==='high'&&state\.current==='SOL'/.test(source),'v4 remains safe-final-exploration and High-only');
check(/if\(!high&&objects\.length\)disposeOwn\(\)/.test(source)&&/if\(high&&earthRoot&&earthSurface&&moonRoot&&!objects\.length\)build\(\)/.test(source),'downgrade/departure disposes and High rebuilds only after all anchors are recaptured');
check(/new MutationObserver\(sync\)/.test(source)&&/attributeFilter:\['width','height'\]/.test(source),'canvas backing-size changes still synchronize direct Photo Capture Boost');
check(/setInterval\(sync,SAMPLE_MS\)/.test(source)&&/const SAMPLE_MS=250/.test(source),'state/terminator synchronization stays bounded to 4 Hz outside the renderer loop');
check(!/requestAnimationFrame\s*\(/.test(source),'v4 adds no independent render loop');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'v4 adds no persistence authority');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'v4 adds no runtime network or analytics path');
check(/__stellarSolOrbitalFrameAddHook/.test(source)&&/THREE\.Object3D\.prototype\.add===addWrapper/.test(source),'scene-construction hook remains explicitly restorable');

check(/highFrameCalls-standardFrameCalls,8/.test(browserSource),'browser gate measures actual combined shared + focused SOL draw delta of eight');
check(/earth-night-terminator-v4/.test(browserSource)&&/nightTriangles/.test(browserSource)&&/sunDirection/.test(browserSource),'browser gate verifies v4 terminator diagnostics and measured geometry');
check(/WarpPhotoMode\.capture/.test(browserSource)&&/__solOrbitalCaptureProbe/.test(browserSource),'browser gate proves Standard→High Photo Capture includes the v4 layer');
check(/390,844/.test(browserSource)&&/360,800/.test(browserSource)&&/sol-orbital-frame-/.test(browserSource),'both required phone viewports emit visual evidence');

check(doc.includes('earth-night-terminator-v4')&&doc.includes('夜側')&&doc.includes('terminator'),'SOT records the v4 night-side Earth composition');
check(doc.includes('3,328')&&doc.includes('4')&&doc.includes('2,976'),'SOT records the bounded focused v4 geometry/draw budget');
check(doc.includes('390×844')&&doc.includes('360×800')&&doc.includes('Photo Capture'),'SOT keeps production-browser and direct-capture acceptance');

const browser=spawnSync(process.execPath,['scripts/validate-sol-orbital-frame-browser.mjs'],{encoding:'utf8',timeout:150000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production WebGL SOL v4 passes capture, renderer budget, lifecycle and both phone viewport gates');
console.log(`SOL Orbital Night-side Observation v4 validation: ${passed}/${passed} checks passed plus focused real-browser evidence`);