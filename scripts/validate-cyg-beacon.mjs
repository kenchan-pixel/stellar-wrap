import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=path=>readFileSync(resolve(root,path),'utf8');
const cyg=read('cyg-beacon-scan.js');
const atlas=read('star-atlas.js');
const journal=read('travel-journal.js');
const sw=read('sw.js');
const pkg=JSON.parse(read('package.json'));
const failures=[];
let passes=0;
const ok=(condition,message)=>{if(condition){passes++;console.log(`✓ ${message}`)}else failures.push(message)};

for(const file of ['cyg-beacon-scan.js','star-atlas.js']){
  const result=spawnSync(process.execPath,['--check',resolve(root,file)],{encoding:'utf8'});
  ok(result.status===0,`${file} parses${result.stderr?`: ${result.stderr.trim()}`:''}`);
}

ok(cyg.includes("const KEY='stellar-warp-cyg-beacon-v1'"),'CYG scan uses a versioned local storage key');
ok(cyg.includes("const SYSTEM='CYG'"),'CYG scan is scoped to CYG only');
ok(cyg.includes('const LOCK_WINDOW=8'),'signal lock window is explicitly bounded to ±8 degrees');
const signals=[...cyg.matchAll(/\{id:'([^']+)',name:'([^']+)',bearing:(\d+)/g)].map(match=>({id:match[1],bearing:Number(match[3])}));
ok(signals.length===3&&new Set(signals.map(signal=>signal.id)).size===3,'scanner defines exactly three unique signal sources');
ok(signals.every(signal=>signal.bearing>=0&&signal.bearing<360),'all signal bearings remain within 0–359 degrees');
ok(new Set(signals.map(signal=>signal.bearing)).size===3,'signal peaks use distinct bearings');
ok(cyg.includes('Math.abs(((a-b+540)%360)-180)'),'bearing comparison handles 0/359 degree wrap-around');
ok(cyg.includes('candidate.diff<=LOCK_WINDOW')&&cyg.includes('candidate.diff>LOCK_WINDOW'),'lock action is enabled and accepted only inside the bounded peak window');
ok(cyg.includes('type="range" min="0" max="359" step="1"'),'mobile scanner exposes a one-degree 0–359 bearing control');
ok(cyg.includes("localStorage.setItem(KEY,JSON.stringify({version:1,locked:progress.locked}))"),'locked signals persist locally with a versioned payload');
ok(cyg.includes('progress.locked.length===SIGNALS.length'),'discovery requires all three signal locks');
ok(cyg.includes('雙星航標三角場'),'CYG completion unlocks the named Star Atlas discovery');
ok(cyg.includes("state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost"),'scanner only appears during safe final CYG exploration');
ok(cyg.includes('setInterval(sample,500)'),'state gating is bounded to 2 Hz outside the render loop');
ok(cyg.includes("dispatchEvent(new CustomEvent('stellarwarp:discovery-change'"),'scanner emits a focused same-tab discovery refresh event');
ok(cyg.includes('@media(min-width:900px)')&&cyg.includes('font-size:var(--ui-sm)'),'desktop scanner readability reuses shared typography tokens');
ok(!/requestAnimationFrame|fetch\(|XMLHttpRequest|WebSocket/.test(cyg),'scanner adds no render-loop or network/backend work');
ok(journal.includes("import('./cyg-beacon-scan.js').catch(()=>{})"),'active simulator loads the CYG scanner');
ok(atlas.includes("window.WarpCygBeacon?.progress?.().discovery")&&atlas.includes("discoveries.set('CYG','雙星航標三角場')"),'Star Atlas consumes CYG discovery state');
ok(atlas.includes("addEventListener('stellarwarp:discovery-change'"),'Star Atlas refreshes immediately after same-tab discovery changes');
ok(sw.includes("'./cyg-beacon-scan.js'"),'prepared offline shell includes CYG scanner');
ok(pkg.scripts?.check?.includes('node scripts/validate-cyg-beacon.mjs'),'npm run check includes focused CYG validation');

if(failures.length){
  console.error(`\n${failures.length} CYG beacon validation failure(s):`);
  for(const failure of failures)console.error(`✗ ${failure}`);
  process.exit(1);
}
console.log(`\nCYG beacon triangulation: ${passes}/${passes} checks passed.`);
