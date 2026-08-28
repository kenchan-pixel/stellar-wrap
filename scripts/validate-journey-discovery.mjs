import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

ok(journal.includes('function normaliseRestoreEntry(entry)')&&journal.includes('entry.route.some(id=>!IDS.has(id))'),'authoritative reload restore rejects any route containing an unknown system ID');
ok(journal.includes('endedAt<=startedAt||seconds<=0'),'authoritative reload restore rejects impossible completion chronology');
ok(journal.includes('const restoreEntry=rawEntries.length?normaliseRestoreEntry(rawEntries[0]):null')&&journal.includes('const latest=restoreEntry'),'reload authority is derived from the untouched newest persisted entry before tolerant journal sanitization');
ok(journal.includes('function restoreDockedLocation()')&&journal.includes('const latest=restoreEntry'),'reload continuity derives the resume point only from the strict newest completed-journey candidate');
ok(journal.includes("typeof api.state!=='function'||typeof api.jumpTo!=='function'")&&journal.includes('api.jumpTo(destination)'),'location restore delegates to the existing WarpSim state transition instead of duplicating scene/camera authority');
ok(journal.includes("state.current!=='SOL'||busy")&&journal.includes('state.selected')&&journal.includes('state.route.length'),'restore refuses to overwrite active, selected, travelling or already-restored runtime state');
ok(journal.includes("document.addEventListener('DOMContentLoaded',()=>{if(locationRestorePending)restoreDockedLocation()}")&&journal.includes('if(locationRestorePending&&restoreDockedLocation())'),'restore attempts after core startup and reuses the existing bounded journal sampler as fallback');
ok(journal.includes("dispatchEvent(new CustomEvent('stellarwarp:location-restored'"),'successful restore emits one focused UI refresh event');

function runRuntimeCase(name,payload,initial,expected){
  const code=`
import assert from 'node:assert/strict';
const payload=${JSON.stringify(payload)};
const store=new Map([['stellar-warp-travel-journal-v1',JSON.stringify(payload)]]);
globalThis.window=globalThis;
globalThis.document={hidden:false,addEventListener(){},querySelector(){return null}};
globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,String(value))};
globalThis.performance={now:()=>1000};
globalThis.setInterval=()=>0;
const events=new EventTarget();
globalThis.addEventListener=(...args)=>events.addEventListener(...args);
globalThis.removeEventListener=(...args)=>events.removeEventListener(...args);
globalThis.dispatchEvent=event=>events.dispatchEvent(event);
globalThis.CustomEvent=class CustomEvent extends Event{constructor(type,init={}){super(type);this.detail=init.detail}};
let state=${JSON.stringify(initial)};
const jumps=[];
globalThis.WarpSim={state(){return{...state,route:Array.isArray(state.route)?[...state.route]:[]}},jumpTo(id){jumps.push(id);state={...state,current:id,selected:null,route:[],flying:false,exploring:true,contextLost:false}}};
await import(${JSON.stringify(pathToFileURL(journalPath).href)}+'?runtime='+${JSON.stringify(name)}+'-'+Date.now());
assert.deepEqual(jumps,${JSON.stringify(expected.jumps)});
assert.equal(state.current,${JSON.stringify(expected.current)});
assert.equal(!!state.exploring,${JSON.stringify(expected.exploring)});
if(${JSON.stringify(!!expected.visited)})assert.deepEqual(new Set(globalThis.WarpTravelJournal.visited()),new Set(${JSON.stringify(expected.visited||[])}));
if(${JSON.stringify(!!expected.entryRoute)})assert.deepEqual(globalThis.WarpTravelJournal.entries()[0]?.route,${JSON.stringify(expected.entryRoute||[])});
`;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8',timeout:10000});
  ok(result.status===0,`${name} runtime continuity${result.stderr?`: ${result.stderr.trim()}`:''}`);
}
const validEntry={route:['SOL','SIRIUS','TAU'],startedAt:100,endedAt:200,seconds:8,distance:9.2};
const idle={current:'SOL',selected:null,route:[],phase:'idle',flying:false,exploring:false,contextLost:false};
runRuntimeCase('completed journey restores TAU',{version:2,entries:[validEntry],visited:['SOL','SIRIUS','TAU']},idle,{jumps:['TAU'],current:'TAU',exploring:true,visited:['SOL','SIRIUS','TAU']});
runRuntimeCase('fresh session stays at SOL',{version:2,entries:[],visited:['SOL']},idle,{jumps:[],current:'SOL',exploring:false});
runRuntimeCase('selected route blocks late restore',{version:2,entries:[validEntry],visited:['SOL','SIRIUS','TAU']},{...idle,selected:'LUNA',route:['SOL','LUNA']},{jumps:[],current:'SOL',exploring:false});
runRuntimeCase('malformed terminal history cannot restore',{version:2,entries:[{route:['SOL','NOPE'],startedAt:100,endedAt:200,seconds:8}],visited:['SOL','NOPE']},idle,{jumps:[],current:'SOL',exploring:false});
runRuntimeCase('embedded unknown newest route fails closed',{version:2,entries:[{route:['SOL','NOPE','TAU'],startedAt:100,endedAt:200,seconds:8,distance:9.2},{route:['SOL','LUNA'],startedAt:10,endedAt:20,seconds:5,distance:3.1}],visited:['SOL','TAU','LUNA']},idle,{jumps:[],current:'SOL',exploring:false,entryRoute:['SOL','TAU']});
runRuntimeCase('invalid completion chronology fails closed',{version:2,entries:[{route:['SOL','LUNA'],startedAt:300,endedAt:200,seconds:8,distance:3.1}],visited:['SOL','LUNA']},idle,{jumps:[],current:'SOL',exploring:false,entryRoute:['SOL','LUNA']});

const journalTimers=(journal.match(/setInterval\(/g)||[]).length;
const atlasTimers=(atlas.match(/setInterval\(/g)||[]).length;
ok(journalTimers===1&&atlasTimers===1,'journey discovery and reload continuity add no new polling loop');
ok(!/fetch\(|XMLHttpRequest|WebSocket/.test(journal+atlas),'journey discovery and reload continuity add no network/backend path');

for(const message of passes)console.log(`✓ ${message}`);
if(failures.length){
  console.error(`\n${failures.length} journey discovery validation failure(s):`);
  for(const message of failures)console.error(`✗ ${message}`);
  process.exit(1);
}
console.log(`\nJourney discovery continuity: ${passes.length}/${passes.length} checks passed.`);
