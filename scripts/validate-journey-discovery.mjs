import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const journalPath=resolve(root,'travel-journal.js');
const atlasPath=resolve(root,'star-atlas.js');
const indexPath=resolve(root,'index.html');
const journal=readFileSync(journalPath,'utf8');
const atlas=readFileSync(atlasPath,'utf8');
const index=readFileSync(indexPath,'utf8');
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
ok(index.includes('isRouteValid(r){')&&index.includes("G[r[i]]?.some(([id])=>id===r[i+1])"),'core exposes a read-only route validator backed by the authoritative 6.0 LY graph');
ok(journal.includes("typeof api.state!=='function'||typeof api.jumpTo!=='function'||typeof api.isRouteValid!=='function'")&&journal.includes('api.isRouteValid(latest.route)')&&journal.includes('api.jumpTo(destination)'),'location restore validates topology through core authority before delegating to the existing WarpSim transition');
ok(journal.includes("state.current!=='SOL'||busy")&&journal.includes('state.selected')&&journal.includes('state.route.length'),'restore refuses to overwrite active, selected, travelling or already-restored runtime state');
ok(journal.includes("document.addEventListener('DOMContentLoaded',()=>{if(locationRestorePending){ensureRestoreVeil();restoreDockedLocation()}")&&journal.includes('if(locationRestorePending&&restoreDockedLocation())'),'restore attempts after core startup and reuses the existing bounded journal sampler as fallback');
ok(journal.includes("dispatchEvent(new CustomEvent('stellarwarp:location-restored'"),'successful restore emits one focused UI refresh event');
ok(journal.includes("veil.id='locationRestoreVeil'")&&journal.includes("veil.textContent='恢復上次停泊點…'"),'pending reload continuity masks the transient default SOL scene with a focused restore veil');
ok(journal.includes("z-index:19")&&index.includes('#loading{position:absolute;z-index:20'),'restore veil stays below the existing startup loading/recovery layer');
ok(journal.includes("try{api.jumpTo(destination)}catch{settleLocationRestore();return false}\n  settleLocationRestore();"),'successful restore removes the veil only after the existing destination transition completes');
ok(journal.includes("if(!api.isRouteValid(latest.route)){settleLocationRestore();return false}")&&journal.includes("state.current!=='SOL'||busy){settleLocationRestore();return false"),'definitive fail-closed decisions also settle the restore veil instead of trapping the UI');

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
const validEdges=new Set(['SOL>SIRIUS','SIRIUS>SOL','SIRIUS>TAU','TAU>SIRIUS','SOL>LUNA','LUNA>SOL']);
globalThis.WarpSim={state(){return{...state,route:Array.isArray(state.route)?[...state.route]:[]}},isRouteValid(route){return Array.isArray(route)&&route.length>1&&route.slice(1).every((id,i)=>validEdges.has(route[i]+'>'+id))},jumpTo(id){jumps.push(id);state={...state,current:id,selected:null,route:[],flying:false,exploring:true,contextLost:false}}};
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
function runRestoreVeilCase(name,payload,validRoute,expected){
  const code=`
import assert from 'node:assert/strict';
const payload=${JSON.stringify(payload)};
const store=new Map([['stellar-warp-travel-journal-v1',JSON.stringify(payload)]]);
const children=[];
const app={append(node){node.parentNode=this;children.push(node)}};
const makeNode=()=>({id:'',textContent:'',style:{cssText:''},removed:false,setAttribute(){},remove(){this.removed=true}});
globalThis.window=globalThis;
globalThis.document={
  hidden:false,
  addEventListener(){},
  querySelector(selector){if(selector==='#app')return app;if(selector==='#locationRestoreVeil')return children.find(node=>node.id==='locationRestoreVeil'&&!node.removed)||null;return null},
  createElement(){return makeNode()}
};
globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,String(value))};
globalThis.performance={now:()=>1000};
globalThis.setInterval=()=>0;
const events=new EventTarget();
globalThis.addEventListener=(...args)=>events.addEventListener(...args);
globalThis.removeEventListener=(...args)=>events.removeEventListener(...args);
globalThis.dispatchEvent=event=>events.dispatchEvent(event);
globalThis.CustomEvent=class CustomEvent extends Event{constructor(type,init={}){super(type);this.detail=init.detail}};
await import(${JSON.stringify(pathToFileURL(journalPath).href)}+'?veil='+${JSON.stringify(name)}+'-'+Date.now());
const pending=document.querySelector('#locationRestoreVeil');
assert.ok(pending,'restore veil should exist while core authority is unavailable');
assert.equal(pending.textContent,'恢復上次停泊點…');
assert.equal(globalThis.WarpTravelJournal.restorePending(),true);
let state={current:'SOL',selected:null,route:[],phase:'idle',flying:false,exploring:false,contextLost:false};
const jumps=[];
globalThis.WarpSim={state(){return{...state,route:[...state.route]}},isRouteValid(){return ${JSON.stringify(validRoute)}},jumpTo(id){jumps.push(id);state={...state,current:id,route:[],exploring:true}}};
const restored=globalThis.WarpTravelJournal.restoreLocation();
assert.equal(restored,${JSON.stringify(expected.restored)});
assert.deepEqual(jumps,${JSON.stringify(expected.jumps)});
assert.equal(state.current,${JSON.stringify(expected.current)});
assert.equal(globalThis.WarpTravelJournal.restorePending(),false);
assert.equal(document.querySelector('#locationRestoreVeil'),null,'veil should be removed after restore is settled');
`;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8',timeout:10000});
  ok(result.status===0,`${name} restore-veil lifecycle${result.stderr?`: ${result.stderr.trim()}`:''}`);
}
const validEntry={route:['SOL','SIRIUS','TAU'],startedAt:100,endedAt:200,seconds:8,distance:9.2};
const idle={current:'SOL',selected:null,route:[],phase:'idle',flying:false,exploring:false,contextLost:false};
runRuntimeCase('completed journey restores TAU',{version:2,entries:[validEntry],visited:['SOL','SIRIUS','TAU']},idle,{jumps:['TAU'],current:'TAU',exploring:true,visited:['SOL','SIRIUS','TAU']});
runRuntimeCase('fresh session stays at SOL',{version:2,entries:[],visited:['SOL']},idle,{jumps:[],current:'SOL',exploring:false});
runRuntimeCase('selected route blocks late restore',{version:2,entries:[validEntry],visited:['SOL','SIRIUS','TAU']},{...idle,selected:'LUNA',route:['SOL','LUNA']},{jumps:[],current:'SOL',exploring:false});
runRuntimeCase('malformed terminal history cannot restore',{version:2,entries:[{route:['SOL','NOPE'],startedAt:100,endedAt:200,seconds:8}],visited:['SOL','NOPE']},idle,{jumps:[],current:'SOL',exploring:false});
runRuntimeCase('embedded unknown newest route fails closed',{version:2,entries:[{route:['SOL','NOPE','TAU'],startedAt:100,endedAt:200,seconds:8,distance:9.2},{route:['SOL','LUNA'],startedAt:10,endedAt:20,seconds:5,distance:3.1}],visited:['SOL','TAU','LUNA']},idle,{jumps:[],current:'SOL',exploring:false,entryRoute:['SOL','TAU']});
runRuntimeCase('invalid completion chronology fails closed',{version:2,entries:[{route:['SOL','LUNA'],startedAt:300,endedAt:200,seconds:8,distance:3.1}],visited:['SOL','LUNA']},idle,{jumps:[],current:'SOL',exploring:false,entryRoute:['SOL','LUNA']});
runRuntimeCase('known IDs with impossible direct leg fail closed',{version:2,entries:[{route:['SOL','ORION'],startedAt:100,endedAt:200,seconds:8,distance:12.7}],visited:['SOL','ORION']},idle,{jumps:[],current:'SOL',exploring:false,entryRoute:['SOL','ORION']});
runRestoreVeilCase('valid docked restore stays covered until TAU transition',{version:2,entries:[validEntry],visited:['SOL','SIRIUS','TAU']},true,{restored:true,jumps:['TAU'],current:'TAU'});
runRestoreVeilCase('invalid topology settles cover at SOL',{version:2,entries:[{route:['SOL','ORION'],startedAt:100,endedAt:200,seconds:8,distance:12.7}],visited:['SOL','ORION']},false,{restored:false,jumps:[],current:'SOL'});

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
