import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const responsive=readFileSync(resolve(root,'responsive-ui.js'),'utf8');
const journey=readFileSync(resolve(root,'journey-atmosphere.js'),'utf8');
const doc=readFileSync(resolve(root,'docs/CORRIDOR_LANDMARK_FLYBYS.md'),'utf8');
const failures=[];
const passes=[];
const ok=(condition,message)=>(condition?passes:failures).push(message);

const marker='/* Journey Scenery · Corridor Landmark Flybys */';
const scenery=responsive.includes(marker)?responsive.split(marker)[1]:'';
const corridors=['SOL>LUNA','SOL>SIRIUS','SOL>PROX','LUNA>VEGA','LUNA>PROX','VEGA>CYG','CYG>ORION','TAU>SIRIUS','SIRIUS>PROX'];

ok(Boolean(scenery),'responsive presentation layer includes the corridor-landmark scenery contract');
ok(scenery.includes('#app.journeyAtmosphereActive #journeyTransit::before')&&scenery.includes('#app.journeyAtmosphereActive #journeyTransit::after'),'landmark flybys reuse exactly two existing-container pseudo-elements instead of adding runtime DOM');
ok(scenery.includes('pointer-events:none'),'landmark scenery cannot intercept map or flight interaction');
ok(corridors.every(id=>scenery.includes(`data-corridor="${id}"`)),'all nine approved direct route corridors receive a distinct landmark treatment');
ok(new Set(corridors).size===9,'corridor validator covers exactly nine unique route identities');
ok(scenery.includes('data-phase="warpEntry"] #journeyTransit::before')&&scenery.includes('data-phase="warp"] #journeyTransit::before')&&scenery.includes('data-phase="warpExit"] #journeyTransit::before'),'landmarks stage through warp entry, cruise and exit');
ok(scenery.includes('data-phase="decelerate"] #journeyTransit::before')&&scenery.includes('data-phase="approach"] #journeyTransit::before')&&scenery.includes('data-phase="observe"] #journeyTransit::before'),'landmarks clear before destination approach and observation');
ok(scenery.includes('@keyframes corridorLandmarkFlybyA')&&scenery.includes('@keyframes corridorLandmarkFlybyB'),'two bounded parallax flyby motions are defined');
ok(scenery.includes('will-change:transform,opacity'),'landmark movement is compositor-oriented and limited to transform/opacity');
ok(scenery.includes('@media (prefers-reduced-motion:reduce)')&&scenery.includes('animation:none!important'),'reduced-motion disables the new flyby animations');
ok(!/filter\s*:|backdrop-filter|requestAnimationFrame|setInterval|new THREE|localStorage|sessionStorage|fetch\(|XMLHttpRequest|WebSocket/.test(scenery),'scenery slice adds no filters, render loop, timers, persistence, network or Three.js authority');
ok(!/\broute\s*=|Dijkstra|MAX_LEG|\bp:\s*\[/.test(scenery),'scenery slice does not duplicate route or coordinate authority');
ok(journey.includes("'SOL>LUNA'")&&journey.includes("'SIRIUS>PROX'")&&journey.includes('corridorFor(from,to)'),'route identity remains owned by Journey Atmosphere and reverse travel still reuses the same corridor profile');
ok(journey.includes('const SAMPLE_MS=250')&&journey.includes('ui.transit.setAttribute(\'data-corridor\''),'flybys reuse existing 4 Hz journey state and corridor data attributes');
ok(doc.includes('Corridor Landmark Flybys')&&doc.includes('Vertical Slice')&&doc.includes('Completion Signal'),'SOT records the named vertical slice and completion gate');
ok(doc.includes('九條')&&doc.includes('不新增星圖節點')&&doc.includes('60 fps'),'SOT defines nine-route scope, location-expansion boundary and physical-device performance caveat');

for(const message of passes)console.log(`✓ ${message}`);
if(failures.length){
  console.error(`\n${failures.length} corridor-landmark validation failure(s):`);
  for(const message of failures)console.error(`✗ ${message}`);
  process.exit(1);
}
console.log(`\nCorridor landmark flybys: ${passes.length}/${passes.length} checks passed.`);
