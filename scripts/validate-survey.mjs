import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const surveyPath=resolve(root,'exploration-survey.js');
const vegaPath=resolve(root,'vega-survey.js');
const atlasPath=resolve(root,'star-atlas.js');
const journalPath=resolve(root,'travel-journal.js');
const responsivePath=resolve(root,'responsive-ui.js');
const landmarkPath=resolve(root,'landmark-guide.js');
const survey=readFileSync(surveyPath,'utf8');
const vega=readFileSync(vegaPath,'utf8');
const atlas=readFileSync(atlasPath,'utf8');
const journal=readFileSync(journalPath,'utf8');
const responsive=readFileSync(responsivePath,'utf8');
const landmark=readFileSync(landmarkPath,'utf8');
const failures=[];
const passes=[];
const ok=(condition,message)=>(condition?passes:failures).push(message);

for(const [label,path] of [['LUNA guided survey',surveyPath],['VEGA gate survey',vegaPath],['star atlas',atlasPath],['responsive UI',responsivePath],['landmark guide',landmarkPath]]){
  const parse=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
  ok(parse.status===0,`${label} JavaScript parses${parse.stderr?`: ${parse.stderr.trim()}`:''}`);
}
ok(survey.includes("const KEY='stellar-warp-luna-survey-v1'"),'LUNA survey storage key is versioned');
ok(survey.includes("const SYSTEM='LUNA'"),'LUNA survey is scoped to LUNA only');
const lunaIds=[...survey.matchAll(/id:'([^']+)'/g)].map(match=>match[1]).filter(id=>['basin','earth','ring'].includes(id));
ok(lunaIds.length===3&&new Set(lunaIds).size===3,'LUNA survey defines exactly three unique observation points');
ok(survey.includes("state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost"),'LUNA survey only activates during safe final-destination exploration');
ok(survey.includes('POINTS.every(point=>isComplete(point.id))'),'LUNA discovery unlock requires all three observations');
ok(survey.includes("localStorage.setItem(KEY,JSON.stringify({version:1,completed:progress.completed}))"),'LUNA survey progress persists locally');
ok(survey.includes('setInterval(sample,500)'),'LUNA survey polling is bounded to 2 Hz');
ok(survey.includes("navigator.vibrate?.(10)"),'LUNA survey haptic hint is optional and capability-gated');
ok(!survey.includes('fetch(')&&!survey.includes('XMLHttpRequest'),'LUNA survey adds no network or backend dependency');

ok(vega.includes("const KEY='stellar-warp-vega-survey-v1'"),'VEGA survey uses its own versioned local progress key');
ok(vega.includes("const SYSTEM='VEGA'"),'VEGA survey is scoped to VEGA only');
const vegaIds=[...vega.matchAll(/id:'([^']+)'/g)].map(match=>match[1]).filter(id=>['corona','inner','alignment'].includes(id));
ok(vegaIds.length===3&&new Set(vegaIds).size===3,'VEGA survey defines exactly three unique gate-calibration observations');
ok(vega.includes("state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost"),'VEGA survey only activates during safe final-destination exploration');
ok(vega.includes('POINTS.every(point=>isComplete(point.id))'),'VEGA discovery unlock requires all three observations');
ok(vega.includes('雙環共振窗口'),'VEGA survey unlocks the bespoke dual-ring resonance discovery');
ok(vega.includes('setInterval(sample,500)'),'VEGA survey polling is bounded to 2 Hz');
ok(vega.includes("navigator.vibrate?.(10)"),'VEGA survey haptic hint is optional and capability-gated');
ok(!vega.includes('fetch(')&&!vega.includes('XMLHttpRequest'),'VEGA survey adds no network or backend dependency');

const atlasIds=[...atlas.matchAll(/\{id:'([^']+)',name:/g)].map(match=>match[1]);
ok(atlasIds.length===8&&new Set(atlasIds).size===8,'star atlas defines exactly eight unique existing systems');
ok(journal.includes("function normaliseVisited(raw,entries=[])")&&journal.includes("visited:normaliseVisited(parsed.visited,entries)"),'travel journal migrates and retains cumulative visited-system state');
ok(journal.includes("version:2")&&journal.includes("visited:normaliseVisited(journal.visited,journal.entries)"),'visited-system state shares the existing journal record instead of adding a new store');
ok(journal.includes("journal.visited=normaliseVisited(journal.visited,[entry])"),'completed routes extend persistent visited-system state before capped history is saved');
ok(journal.includes("visited(){return normaliseVisited(journal.visited,journal.entries)}"),'travel journal exposes persistent visited systems to exploration clients');
ok(journal.includes('window.WarpStarAtlas?.snapshot?.().discoveries'),'travel journal reads discovery outcomes from the existing Star Atlas authority');
ok(journal.includes("outcome.textContent='發現 · '+discovery")&&journal.includes("outcome.textContent='探索未完成'"),'travel journal distinguishes completed and unfinished exploration outcomes');
ok(journal.includes("addEventListener('stellarwarp:discovery-change',()=>render())"),'travel journal refreshes immediately when a discovery completes in the same tab');
ok(journal.includes("import('./star-atlas.js').then(()=>render()).catch(()=>{})"),'travel journal refreshes after Star Atlas authority becomes available');
ok(journal.includes("discoveryCount+'/'+DISCOVERY_TOTAL+' 發現'"),'travel journal summary surfaces seven-discovery collection progress');
ok(atlas.includes('window.WarpTravelJournal?.visited?.()'),'star atlas derives long-lived visit progress from the journal authority');
ok(atlas.includes('window.WarpTravelJournal?.entries?.()'),'star atlas uses retained journal entries only for recent per-system statistics');
ok(atlas.includes('window.WarpLunaSurvey?.progress?.()'),'star atlas consumes the existing LUNA discovery authority');
ok(atlas.includes('window.WarpVegaSurvey?.progress?.()'),'star atlas consumes the VEGA discovery authority instead of creating a second discovery store');
ok(atlas.includes("discoveries.set('VEGA','雙環共振窗口')"),'star atlas labels the VEGA discovery consistently');
ok(atlas.includes("import('./vega-survey.js').then(()=>render(true)).catch(()=>{})"),'star atlas loads VEGA survey and refreshes discovery state when ready');
ok(atlas.includes('window.WarpSim.select(destination)'),'star atlas hands route planning back to the existing WarpSim planner');
ok(atlas.includes('state.flying||state.contextLost||destination===state.current'),'star atlas blocks replanning in unsafe or redundant states');
ok(atlas.includes('model.visited.size===SYSTEMS.length'),'star atlas completion requires all eight systems');
ok(atlas.includes('setInterval(sample,1000)'),'star atlas sampling is bounded to 1 Hz');
ok(!/localStorage|fetch\(|XMLHttpRequest|WebSocket/.test(atlas),'star atlas itself adds no persistence, network or backend path');

ok(journal.includes("import('./responsive-ui.js').catch(()=>{})"),'active simulator loads the responsive readability layer');
ok(responsive.includes('@media (min-width:900px)'),'desktop readability changes are isolated behind a desktop-width media query');
ok(responsive.includes('--ui-xs:clamp(')&&responsive.includes('--ui-lg:clamp('),'desktop typography scales within bounded clamp values');
ok(responsive.includes('#app .kicker')&&responsive.includes('#app #panel')&&responsive.includes('#app #exploreCard'),'responsive layer covers the core HUD, navigation panel and exploration card');
ok(responsive.includes('#app .vegaSurveyTitle')&&responsive.includes('#app .lunaSurveyTitle')&&responsive.includes('#app .arrivalDebriefTitle'),'responsive layer covers destination survey and arrival text');
ok(responsive.includes('#app .journalTitle')&&responsive.includes('#app .atlasTitle'),'responsive layer covers journal and Star Atlas text');
ok(responsive.includes('#app .landmarkGuideTitle{font-size:var(--ui-md)}')&&responsive.includes('#app .landmarkRing{font-size:var(--ui-xs)')&&responsive.includes('#app .landmarkCopy{margin-top:6px;font-size:var(--ui-xs)'),'responsive layer covers landmark guide desktop typography with shared tokens');
ok(responsive.includes('#app .landmarkTab{min-height:40px;font-size:var(--ui-sm)}'),'landmark guide desktop controls use the readable shared text size and 40 px minimum height');
ok(!/requestAnimationFrame|setInterval|localStorage|fetch\(|XMLHttpRequest|WebSocket/.test(responsive),'responsive layer adds no polling, render-loop, persistence or network work');
ok(!/zoom\s*:|transform\s*:\s*scale/i.test(responsive),'desktop readability does not scale or distort the WebGL canvas');

const landmarkSystems=['SOL','LUNA','VEGA','CYG','ORION','TAU','SIRIUS','PROX'];
ok(landmarkSystems.every(id=>landmark.includes(`${id}:{ring:`)),'landmark guide covers all eight approved destinations');
const landmarkIds=[...landmark.matchAll(/\{id:'([^']+)',label:/g)].map(match=>match[1]);
ok(landmarkIds.length===24,'landmark guide provides exactly three scene landmarks per destination');
ok(landmark.includes("SOL:{ring:'人工近地軌道環'")&&landmark.includes('不是土星式天然行星環'),'SOL explicitly distinguishes artificial orbital rings from natural planetary rings');
ok(landmark.includes("VEGA:{ring:'人工雙層曲速星門'")&&landmark.includes('共同構成雙層星門'),'VEGA explicitly identifies the two rings as an artificial warp-gate pair');
ok(landmark.includes("TAU:{ring:'天然行星環'")&&landmark.includes('與 SOL、VEGA 的人工發光環不同'),'TAU explicitly distinguishes its natural planetary ring from artificial ring structures');
ok(landmark.includes('state.exploring&&!state.flying&&!state.contextLost'),'landmark guide only appears during safe final-destination exploration');
ok(landmark.includes('setInterval(sample,500)'),'landmark guide state sampling is bounded to 2 Hz');
ok(journal.includes("import('./landmark-guide.js').catch(()=>{})"),'active simulator loads the landmark guide through the existing client bootstrap');
ok(!/localStorage|fetch\(|XMLHttpRequest|WebSocket|requestAnimationFrame/.test(landmark),'landmark guide adds no persistence, network, backend or render-loop work');

for(const message of passes)console.log(`✓ ${message}`);
if(failures.length){
  console.error(`\n${failures.length} exploration validation failure(s):`);
  for(const message of failures)console.error(`✗ ${message}`);
  process.exit(1);
}
console.log(`\nExploration continuity: ${passes.length}/${passes.length} checks passed.`);