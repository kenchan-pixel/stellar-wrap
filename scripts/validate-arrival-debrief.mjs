import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=path=>readFileSync(resolve(root,path),'utf8');
const failures=[];
let passes=0;
function ok(condition,message){if(condition){passes++;console.log(`✓ ${message}`)}else failures.push(message)}

const debrief=read('arrival-debrief.js');
const journal=read('travel-journal.js');
const index=read('index.html');
const sw=read('sw.js');
const responsive=read('responsive-ui.js');
const runtime=read('scripts/validate-destination-runtime.mjs');
const pkg=JSON.parse(read('package.json'));

for(const file of ['arrival-debrief.js','travel-journal.js']){
  const result=spawnSync(process.execPath,['--check',resolve(root,file)],{encoding:'utf8'});
  ok(result.status===0,`${file} parses${result.stderr?`: ${result.stderr.trim()}`:''}`);
}

ok(journal.includes("new CustomEvent('stellarwarp:journey-complete'"),'travel journal emits a dedicated completion event');
ok(journal.includes("import('./arrival-debrief.js').catch(()=>{})"),'travel journal bootstrap loads arrival debrief');
ok(journal.includes('state.current!==destination'),'completion source still rejects aborted/incomplete routes');
ok(journal.includes("document.querySelector('#routeMeta')")&&journal.includes("match(/(\\d+(?:\\.\\d+)?)\\s*LY\\b/i)"),'travel journal captures distance from the core planner output');
ok(journal.includes('distance:activeSession.distance'),'completed journal entry carries the planner-owned distance snapshot');
ok(journal.includes("recordedDistance.toFixed(1)+' LY'"),'travel journal surfaces cumulative recorded route distance');
ok(debrief.includes("addEventListener('stellarwarp:journey-complete',onJourneyComplete)"),'debrief is driven by completion events');
ok(debrief.includes('state.current===destination&&state.exploring&&!state.flying&&!state.contextLost'),'debrief is gated to safe final exploration');
ok(debrief.includes("landmark.insertAdjacentElement('beforebegin',card)")&&debrief.includes("desc.insertAdjacentElement('afterend',card)"),'arrival summary is repositioned ahead of destination landmark/task content when shown');
ok(debrief.includes("document.querySelector('#openPanel')?.click()"),'debrief provides a next-destination handoff');
ok(debrief.includes("document.querySelector('#space')?.addEventListener('webglcontextlost',hide)"),'debrief hides on WebGL context loss');
ok(debrief.includes("entry.distance.toFixed(1)+' LY'"),'debrief reports the planner-owned journal distance');
ok(!/const\s+COORD\s*=/.test(debrief),'debrief does not duplicate the approved coordinate table');
ok(debrief.includes('entry.seconds')&&debrief.includes('秒活躍航行'),'debrief reports active-flight time');
ok(debrief.includes("window.WarpStarAtlas?.snapshot?.().discoveries?.[destination]")&&debrief.includes("addEventListener('stellarwarp:discovery-change'"),'arrival exploration state consumes the existing Star Atlas discovery authority and refresh event');
for(const target of ['#lunaSurvey','#vegaSurvey','#cygBeaconScan','#orionSpectrograph','#tauRingProfiler','#siriusRelayCalibration','#proxAlignment'])ok(debrief.includes(`target:'${target}'`),`arrival handoff maps ${target}`);
ok(debrief.includes("explore.textContent='開始探索'")&&debrief.includes("explore.textContent='查看發現'")&&debrief.includes("explore.textContent='自由探索'"),'arrival primary action distinguishes incomplete, completed and SOL exploration states');
ok(debrief.includes("scrollIntoView?.({block:'nearest',behavior:'smooth'})"),'arrival exploration action scrolls directly to the destination task without changing camera/flight authority');
ok(debrief.includes('.arrivalDebriefActions button{min-height:44px'),'arrival handoff uses the 44 px mobile touch baseline');
ok(responsive.includes('#app .arrivalDebriefRoute,#app .arrivalDebriefObjective')&&responsive.includes('#app .arrivalDebriefActions button{min-height:44px'),'desktop readability covers the new objective text and preserves 44 px actions');
ok(runtime.includes('runArrivalHandoff')&&runtime.includes('arrival handoff scrolls the real destination interaction into view'),'phone runtime harness executes the production arrival-to-exploration handoff');
ok(!/localStorage|sessionStorage/.test(debrief),'debrief adds no persistence store');
ok(!/fetch\(|XMLHttpRequest|WebSocket/.test(debrief),'debrief adds no network/backend path');
ok(!/setInterval|requestAnimationFrame/.test(debrief),'debrief adds no polling or render-loop work');
ok(sw.includes("'./arrival-debrief.js'"),'offline core includes arrival debrief');
ok(pkg.scripts?.check?.includes('node scripts/validate-arrival-debrief.mjs'),'npm run check includes arrival-debrief validation');
ok(index.includes('const routeDistance=r=>')&&index.includes('${totalDistance.toFixed(1)} LY'),'core planner remains the route-distance calculation authority');

const nodeBlock=index.match(/const N=\[([\s\S]*?)\];\s*const node=/);
const coords=new Map();
if(nodeBlock){
  const re=/\{id:'([^']+)',name:'[^']+',p:\[([^\]]+)\]/g;
  let match;
  while((match=re.exec(nodeBlock[1])))coords.set(match[1],match[2].split(',').map(Number));
}
ok(coords.size===8,'focused validator derives all eight coordinates from the production star data');
function dist(a,b){const A=coords.get(a),B=coords.get(b);return A&&B?Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]):NaN}
function routeDistance(route){return route.slice(1).reduce((sum,id,index)=>sum+dist(route[index],id),0)}
ok(Math.abs(routeDistance(['SOL','LUNA','VEGA','CYG','ORION'])-16.97)<.03,'ORION distance baseline is derived from production coordinates');
ok(Math.abs(routeDistance(['SOL','SIRIUS','TAU'])-11.39)<.03,'TAU distance baseline is derived from production coordinates');

if(failures.length){
  console.error(`\n${failures.length} arrival-debrief validation failure(s):`);
  for(const failure of failures)console.error(`✗ ${failure}`);
  process.exit(1);
}
console.log(`\nArrival debrief: ${passes}/${passes} checks passed.`);
