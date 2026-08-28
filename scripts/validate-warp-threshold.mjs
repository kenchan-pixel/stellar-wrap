import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const responsive=readFileSync(resolve(root,'responsive-ui.js'),'utf8');
const journey=readFileSync(resolve(root,'journey-atmosphere.js'),'utf8');
const doc=readFileSync(resolve(root,'docs/WARP_THRESHOLD_CINEMATICS.md'),'utf8');
const failures=[];
const passes=[];
const ok=(condition,message)=>(condition?passes:failures).push(message);

const marker='/* Journey Cinematics · Warp Threshold */';
const cinematic=responsive.includes(marker)?responsive.split(marker)[1]:'';

ok(Boolean(cinematic),'responsive presentation layer includes the warp-threshold cinematic contract');
ok(cinematic.includes('#app.journeyAtmosphereActive #journeyAtmosphere::before')&&cinematic.includes('#app.journeyAtmosphereActive #journeyAtmosphere::after'),'warp threshold reuses two CSS pseudo-elements without mounting another runtime DOM layer');
ok(cinematic.includes('pointer-events:none'),'warp threshold cannot intercept map or flight interaction');
ok(cinematic.includes('rgba(var(--journey-rgb)')&&cinematic.includes('rgba(var(--journey-alt-rgb)'),'threshold inherits the existing destination journey palette instead of duplicating system data');
ok(cinematic.includes('data-phase="warpEntry"]::before')&&cinematic.includes('journeyThresholdIngress')&&cinematic.includes('journeyThresholdLock'),'warp entry stages the threshold lock and expansion');
ok(cinematic.includes('data-phase="warp"]::before')&&cinematic.includes('opacity:.16')&&cinematic.includes('data-phase="warp"]::after')&&cinematic.includes('opacity:.08'),'warp cruise deliberately subordinates the threshold behind the existing tunnel and corridor scenery');
ok(cinematic.includes('data-phase="warpExit"]::before')&&cinematic.includes('journeyThresholdEgress')&&cinematic.includes('journeyThresholdRelease'),'warp exit reverses and releases the threshold effect');
ok(cinematic.includes('data-phase="decelerate"]::before')&&cinematic.includes('data-phase="approach"]::before')&&cinematic.includes('data-phase="observe"]::before'),'threshold clears before deceleration, Approach Vista and final observation');
ok(cinematic.includes('@keyframes journeyThresholdIngress')&&cinematic.includes('@keyframes journeyThresholdEgress'),'threshold motion is explicitly bounded to entry and exit keyframes');
ok(cinematic.includes('@media (prefers-reduced-motion:reduce)')&&cinematic.includes('animation:none!important'),'reduced-motion disables the added threshold keyframe animation');
ok(!/filter\s*:|backdrop-filter|requestAnimationFrame|setInterval|new THREE|localStorage|sessionStorage|fetch\(|XMLHttpRequest|WebSocket/.test(cinematic),'cinematic slice introduces no filter, render loop, persistence, network or Three.js authority');
ok(!/\broute\s*=|Dijkstra|MAX_LEG|\bp:\s*\[/.test(cinematic),'cinematic slice does not duplicate route or coordinate authority');
ok(journey.includes("const SAMPLE_MS=250")&&journey.includes("data-phase"),'cinematic reuses the existing bounded journey phase presentation state');
ok(doc.includes('Warp Threshold Cinematics')&&doc.includes('warpEntry')&&doc.includes('warpExit')&&doc.includes('Completion Signal'),'warp-threshold SOT records the vertical slice, phase contract and completion gate');
ok(doc.includes('不改 FOV')&&doc.includes('不新增 location')&&doc.includes('60 fps'),'SOT explicitly keeps camera, location expansion and physical-device performance claims out of scope');

for(const message of passes)console.log(`✓ ${message}`);
if(failures.length){
  console.error(`\n${failures.length} warp-threshold validation failure(s):`);
  for(const message of failures)console.error(`✗ ${message}`);
  process.exit(1);
}
console.log(`\nWarp threshold cinematics: ${passes.length}/${passes.length} checks passed.`);
