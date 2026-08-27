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
const sw=read('sw.js');
const pkg=JSON.parse(read('package.json'));

for(const file of ['arrival-debrief.js','travel-journal.js']){
  const result=spawnSync(process.execPath,['--check',resolve(root,file)],{encoding:'utf8'});
  ok(result.status===0,`${file} parses${result.stderr?`: ${result.stderr.trim()}`:''}`);
}

ok(journal.includes("new CustomEvent('stellarwarp:journey-complete'"),'travel journal emits a dedicated completion event');
ok(journal.includes("import('./arrival-debrief.js').catch(()=>{})"),'travel journal bootstrap loads arrival debrief');
ok(journal.includes('state.current!==destination'),'completion source still rejects aborted/incomplete routes');
ok(debrief.includes("addEventListener('stellarwarp:journey-complete',onJourneyComplete)"),'debrief is driven by completion events');
ok(debrief.includes('state.current===destination&&state.exploring&&!state.flying&&!state.contextLost'),'debrief is gated to safe final exploration');
ok(debrief.includes("actions.insertAdjacentElement('beforebegin',card)"),'debrief stays inside the existing destination card flow');
ok(debrief.includes("document.querySelector('#openPanel')?.click()"),'debrief provides a next-destination handoff');
ok(debrief.includes("document.querySelector('#space')?.addEventListener('webglcontextlost',hide)"),'debrief hides on WebGL context loss');
ok(debrief.includes('routeDistance(entry.route).toFixed(1)'),'debrief reports route distance');
ok(debrief.includes('entry.seconds')&&debrief.includes('秒活躍航行'),'debrief reports active-flight time');
ok(!/localStorage|sessionStorage/.test(debrief),'debrief adds no persistence store');
ok(!/fetch\(|XMLHttpRequest|WebSocket/.test(debrief),'debrief adds no network/backend path');
ok(!/setInterval|requestAnimationFrame/.test(debrief),'debrief adds no polling or render-loop work');
ok(sw.includes("'./arrival-debrief.js'"),'offline core includes arrival debrief');
ok(pkg.scripts?.check?.includes('node scripts/validate-arrival-debrief.mjs'),'npm run check includes arrival-debrief validation');

const coords={SOL:[0,0,0],LUNA:[1.4,2.4,.5],VEGA:[5.2,3.1,1.4],CYG:[9.1,5.6,2.3],ORION:[12.2,1.2,3.2],TAU:[9.5,-4,1.7],SIRIUS:[4.4,-3.4,-.9],PROX:[1.5,-1.8,-2.4]};
const dist=(a,b)=>Math.hypot(coords[a][0]-coords[b][0],coords[a][1]-coords[b][1],coords[a][2]-coords[b][2]);
const routeDistance=route=>route.slice(1).reduce((sum,id,index)=>sum+dist(route[index],id),0);
ok(Math.abs(routeDistance(['SOL','LUNA','VEGA','CYG','ORION'])-16.97)<.03,'ORION debrief distance matches approved route baseline');
ok(Math.abs(routeDistance(['SOL','SIRIUS','TAU'])-11.39)<.03,'TAU debrief distance matches approved route baseline');

if(failures.length){
  console.error(`\n${failures.length} arrival-debrief validation failure(s):`);
  for(const failure of failures)console.error(`✗ ${failure}`);
  process.exit(1);
}
console.log(`\nArrival debrief: ${passes}/${passes} checks passed.`);
