import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=path=>readFileSync(resolve(root,path),'utf8');
const orion=read('orion-spectrograph.js');
const atlas=read('star-atlas.js');
const journal=read('travel-journal.js');
const sw=read('sw.js');
const pkg=JSON.parse(read('package.json'));
const failures=[];
let passes=0;
const ok=(condition,message)=>{if(condition){passes++;console.log(`✓ ${message}`)}else failures.push(message)};

for(const file of ['orion-spectrograph.js','star-atlas.js']){
  const result=spawnSync(process.execPath,['--check',resolve(root,file)],{encoding:'utf8'});
  ok(result.status===0,`${file} parses${result.stderr?`: ${result.stderr.trim()}`:''}`);
}

ok(orion.includes("const KEY='stellar-warp-orion-spectrum-v1'"),'ORION spectrum uses a versioned local storage key');
ok(orion.includes("const SYSTEM='ORION'"),'spectrograph is scoped to ORION only');
ok(orion.includes('const CAPTURE_WINDOW=4'),'capture window is explicitly bounded to ±4 nm');
ok(orion.includes('const MIN_WAVELENGTH=470')&&orion.includes('const MAX_WAVELENGTH=680'),'wavelength control is bounded to 470–680 nm');
const lines=[...orion.matchAll(/\{id:'([^']+)',name:'([^']+)',wavelength:(\d+)/g)].map(match=>({id:match[1],name:match[2],wavelength:Number(match[3])}));
ok(lines.length===3&&new Set(lines.map(line=>line.id)).size===3,'spectrograph defines exactly three unique emission-line IDs');
ok(new Set(lines.map(line=>line.wavelength)).size===3,'emission lines use distinct wavelengths');
ok(lines.every(line=>line.wavelength>=470&&line.wavelength<=680),'all emission lines remain inside the approved wavelength band');
ok(lines.some(line=>line.id==='hbeta'&&line.wavelength===486),'Hβ interaction line is fixed at the simplified 486 nm value');
ok(lines.some(line=>line.id==='oiii'&&line.wavelength===501),'[O III] interaction line is fixed at the simplified 501 nm value');
ok(lines.some(line=>line.id==='halpha'&&line.wavelength===656),'Hα interaction line is fixed at the simplified 656 nm value');
ok(orion.includes('candidate.diff<=CAPTURE_WINDOW')&&orion.includes('candidate.diff>CAPTURE_WINDOW'),'capture UI and action share the same bounded peak window');
ok(orion.includes('type="range" min="470" max="680" step="1"'),'mobile wavelength scanner exposes one-nanometre control across the approved band');
ok(orion.includes("localStorage.setItem(KEY,JSON.stringify({version:1,captured:progress.captured}))"),'captured spectral lines persist locally with a versioned payload');
ok(orion.includes('progress.captured.length===LINES.length'),'discovery requires all three spectral captures');
ok(orion.includes('三線發射殼層'),'ORION completion unlocks the named Star Atlas discovery');
ok(orion.includes("state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost"),'spectrograph only appears during safe final ORION exploration');
ok(orion.includes('setInterval(sample,500)'),'state gating is bounded to 2 Hz outside the render loop');
ok(orion.includes("dispatchEvent(new CustomEvent('stellarwarp:discovery-change'"),'spectrograph emits a focused same-tab discovery refresh event');
ok(orion.includes('@media(min-width:900px)')&&orion.includes('font-size:var(--ui-sm)'),'desktop spectrograph readability reuses shared typography tokens');
ok(!/requestAnimationFrame|fetch\(|XMLHttpRequest|WebSocket/.test(orion),'spectrograph adds no render-loop or network/backend work');
ok(journal.includes("import('./orion-spectrograph.js').catch(()=>{})"),'active simulator loads the ORION spectrograph');
ok(atlas.includes("window.WarpOrionSpectrum?.progress?.().discovery")&&atlas.includes("discoveries.set('ORION','三線發射殼層')"),'Star Atlas consumes ORION discovery state');
ok(atlas.includes("ORION_SURVEY_KEY='stellar-warp-orion-spectrum-v1'"),'Star Atlas storage refresh observes the ORION spectrum key');
ok(sw.includes("'./orion-spectrograph.js'"),'prepared offline shell includes ORION spectrograph');
ok(pkg.scripts?.check?.includes('node scripts/validate-orion-spectrum.mjs'),'npm run check includes focused ORION spectrum validation');

if(failures.length){
  console.error(`\n${failures.length} ORION spectrum validation failure(s):`);
  for(const failure of failures)console.error(`✗ ${failure}`);
  process.exit(1);
}
console.log(`\nORION nebula spectrograph: ${passes}/${passes} checks passed.`);
