import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const surveyPath=resolve(root,'exploration-survey.js');
const atlasPath=resolve(root,'star-atlas.js');
const journalPath=resolve(root,'travel-journal.js');
const survey=readFileSync(surveyPath,'utf8');
const atlas=readFileSync(atlasPath,'utf8');
const journal=readFileSync(journalPath,'utf8');
const failures=[];
const passes=[];
const ok=(condition,message)=>(condition?passes:failures).push(message);

for(const [label,path] of [['guided survey',surveyPath],['star atlas',atlasPath]]){
  const parse=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
  ok(parse.status===0,`${label} JavaScript parses${parse.stderr?`: ${parse.stderr.trim()}`:''}`);
}
ok(survey.includes("const KEY='stellar-warp-luna-survey-v1'"),'guided survey storage key is versioned');
ok(survey.includes("const SYSTEM='LUNA'"),'guided survey is scoped to LUNA only');
const ids=[...survey.matchAll(/id:'([^']+)'/g)].map(match=>match[1]).filter(id=>['basin','earth','ring'].includes(id));
ok(ids.length===3&&new Set(ids).size===3,'guided survey defines exactly three unique observation points');
ok(survey.includes("state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost"),'guided survey only activates during safe final-destination exploration');
ok(survey.includes('POINTS.every(point=>isComplete(point.id))'),'discovery unlock requires all three observations');
ok(survey.includes("localStorage.setItem(KEY,JSON.stringify({version:1,completed:progress.completed}))"),'guided survey progress persists locally');
ok(survey.includes('setInterval(sample,500)'),'guided survey polling is bounded to 2 Hz');
ok(survey.includes("navigator.vibrate?.(10)"),'guided survey haptic hint is optional and capability-gated');
ok(journal.includes("import('./exploration-survey.js').catch(()=>{})"),'active simulator loads the guided survey module through the existing low-frequency client');
ok(!survey.includes('fetch(')&&!survey.includes('XMLHttpRequest'),'guided survey adds no network or backend dependency');

const atlasIds=[...atlas.matchAll(/\{id:'([^']+)',name:/g)].map(match=>match[1]);
ok(atlasIds.length===8&&new Set(atlasIds).size===8,'star atlas defines exactly eight unique existing systems');
ok(journal.includes("function normaliseVisited(raw,entries=[])")&&journal.includes("visited:normaliseVisited(parsed.visited,entries)"),'travel journal migrates and retains cumulative visited-system state');
ok(journal.includes("version:2")&&journal.includes("visited:normaliseVisited(journal.visited,journal.entries)"),'visited-system state shares the existing journal record instead of adding a new store');
ok(journal.includes("journal.visited=normaliseVisited(journal.visited,[entry])"),'completed routes extend persistent visited-system state before capped history is saved');
ok(journal.includes("visited(){return normaliseVisited(journal.visited,journal.entries)}"),'travel journal exposes persistent visited systems to exploration clients');
ok(atlas.includes('window.WarpTravelJournal?.visited?.()'),'star atlas derives long-lived visit progress from the journal authority');
ok(atlas.includes('window.WarpTravelJournal?.entries?.()'),'star atlas uses retained journal entries only for recent per-system statistics');
ok(atlas.includes('window.WarpLunaSurvey?.progress?.()'),'star atlas consumes the existing LUNA discovery authority');
ok(atlas.includes('window.WarpSim.select(destination)'),'star atlas hands route planning back to the existing WarpSim planner');
ok(atlas.includes('state.flying||state.contextLost||destination===state.current'),'star atlas blocks replanning in unsafe or redundant states');
ok(atlas.includes('model.visited.size===SYSTEMS.length'),'star atlas completion requires all eight systems');
ok(atlas.includes('setInterval(sample,1000)'),'star atlas sampling is bounded to 1 Hz');
ok(!/localStorage|fetch\(|XMLHttpRequest|WebSocket/.test(atlas),'star atlas itself adds no persistence, network or backend path');
ok(journal.includes("import('./star-atlas.js').catch(()=>{})"),'active simulator loads star atlas through the existing client bootstrap');

for(const message of passes)console.log(`✓ ${message}`);
if(failures.length){
  console.error(`\n${failures.length} exploration validation failure(s):`);
  for(const message of failures)console.error(`✗ ${message}`);
  process.exit(1);
}
console.log(`\nExploration continuity: ${passes.length}/${passes.length} checks passed.`);
