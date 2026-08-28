import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const journalPath=resolve(root,'travel-journal.js');
const atlasPath=resolve(root,'star-atlas.js');
const journal=readFileSync(journalPath,'utf8');
const atlas=readFileSync(atlasPath,'utf8');
const failures=[];
const passes=[];
const ok=(condition,message)=>(condition?passes:failures).push(message);

for(const [label,path] of [['travel journal',journalPath],['star atlas',atlasPath]]){
  const parse=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
  ok(parse.status===0,`${label} JavaScript parses${parse.stderr?`: ${parse.stderr.trim()}`:''}`);
}

ok(journal.includes('window.WarpStarAtlas?.snapshot?.().discoveries'),'journey outcomes read the existing Star Atlas discovery authority');
ok(journal.includes("outcome.textContent='發現 · '+discovery")&&journal.includes("outcome.textContent='探索未完成'"),'retained journeys distinguish completed and pending exploration outcomes');
ok(journal.includes("outcome.textContent='母港紀錄 · 無外站發現'"),'SOL journey outcome keeps explicit home-system semantics');
ok(journal.includes("discoveryCount+'/'+DISCOVERY_TOTAL+' 發現'"),'journal summary exposes the seven-destination discovery count');
ok(journal.includes("addEventListener('stellarwarp:discovery-change',()=>render())"),'same-tab discovery completion refreshes journal immediately');
ok(journal.includes("addEventListener('stellarwarp:atlas-change',()=>render())"),'late-loaded persisted discovery authority refreshes journal after reload');
ok(atlas.includes('const changed=signature!==lastSignature')&&atlas.includes("if(changed)dispatchEvent(new CustomEvent('stellarwarp:atlas-change'"),'Star Atlas emits a focused refresh only when its authoritative model changes');
ok(atlas.includes("import('./vega-survey.js').then(()=>render(true)).catch(()=>{})")&&atlas.includes("import('./prox-starport-alignment.js').then(()=>render(true)).catch(()=>{})"),'late destination module loads re-evaluate the Star Atlas model');
ok(journal.includes("localStorage.setItem(KEY,JSON.stringify({version:2,entries:journal.entries.slice(0,LIMIT),visited:normaliseVisited(journal.visited,journal.entries)}))"),'journal persistence schema remains route/visited-only without copied discovery state');
ok((journal.match(/setInterval\(/g)||[]).length===1&&(atlas.match(/setInterval\(/g)||[]).length===1,'journey discovery continuity adds no new polling loop');
ok(!/fetch\(|XMLHttpRequest|WebSocket/.test(journal+atlas),'journey discovery continuity adds no network/backend path');

for(const message of passes)console.log(`✓ ${message}`);
if(failures.length){
  console.error(`\n${failures.length} journey discovery validation failure(s):`);
  for(const message of failures)console.error(`✗ ${message}`);
  process.exit(1);
}
console.log(`\nJourney discovery continuity: ${passes.length}/${passes.length} checks passed.`);
