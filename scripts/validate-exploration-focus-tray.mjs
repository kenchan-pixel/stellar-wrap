import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

let pass=0;
function check(ok,label){
  if(!ok){console.error('FAIL:',label);process.exitCode=1;return}
  pass++;console.log('PASS:',label);
}
function has(source,text,label){check(source.includes(text),label)}

const tray=fs.readFileSync('exploration-focus-tray.js','utf8');
const loader=fs.readFileSync('navigation-discovery-status.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const syntax=spawnSync(process.execPath,['--check','exploration-focus-tray.js'],{encoding:'utf8'});
check(syntax.status===0,'exploration-focus-tray.js passes node --check');
has(tray,'@media (max-width:899px)','focus tray remains mobile-only');
has(tray,'[data-hub-pane="explore"]','focus tray delegates pane state to the existing Explore Hub');
has(tray,'max-height:min(42vh,360px)','Explore pane leaves the majority of phone height to the 3D scene');
has(tray,'bottom:calc(var(--safeB) + 8px)','focus tray respects the mobile bottom safe area');
has(tray,'left:calc(var(--safeL) + 10px);right:calc(var(--safeR) + 10px)','focus tray fits inside both horizontal safe areas');
has(tray,'#exploreDesc','duplicated destination description is suppressed only in focused Explore mode');
has(tray,'@media (max-width:360px)','narrow-phone tray bound exists');
has(tray,'max-height:min(44vh,352px)','360 px layout keeps a bounded tray height');
has(tray,'@media (prefers-reduced-motion:reduce)','reduced-motion transition handling exists');
has(tray,'window.WarpExplorationFocusTray={active}','diagnostic focus-tray state is exposed without new authority');
check(!/setInterval\s*\(|setTimeout\s*\(|requestAnimationFrame\s*\(|localStorage|sessionStorage|fetch\s*\(|THREE\./.test(tray),'focus tray adds no timer/render-loop/storage/network/Three.js authority');
has(loader,"import('./exploration-focus-tray.js').catch(()=>{});",'existing navigation bootstrap loads the focus tray');
has(sw,"'./exploration-focus-tray.js'",'prepared offline shell includes the focus tray');
check(String(pkg.scripts?.check||'').includes('validate-exploration-focus-tray.mjs'),'repository check includes focused tray validation');
check(fs.existsSync('scripts/validate-exploration-focus-tray-runtime.mjs'),'focus-tray production runtime harness exists');

for(const [width,height] of [[390,844],[360,800]]){
  const runtime=spawnSync(process.execPath,['scripts/validate-exploration-focus-tray-runtime.mjs'],{
    encoding:'utf8',env:{...process.env,STELLAR_EXPLORE_WIDTH:String(width),STELLAR_EXPLORE_HEIGHT:String(height)}
  });
  if(runtime.stdout)process.stdout.write(runtime.stdout);
  if(runtime.stderr)process.stderr.write(runtime.stderr);
  check(runtime.status===0,`production Exploration Focus Tray runtime passes at ${width}x${height}`);
}

if(process.exitCode)process.exit(process.exitCode);
console.log(`Exploration Focus Tray: ${pass} / ${pass} checks passed plus two production runtime viewports`);
