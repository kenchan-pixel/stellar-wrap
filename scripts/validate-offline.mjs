import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=path=>readFileSync(resolve(root,path),'utf8');
const failures=[];
let passes=0;
function ok(condition,message){if(condition){passes++;console.log(`✓ ${message}`)}else failures.push(message)}

const bootstrap=read('offline-bootstrap.js');
const sw=read('sw.js');
const journal=read('travel-journal.js');
const pkg=JSON.parse(read('package.json'));

for(const file of ['offline-bootstrap.js','sw.js']){
  const result=spawnSync(process.execPath,['--check',resolve(root,file)],{encoding:'utf8'});
  ok(result.status===0,`${file} parses${result.stderr?`: ${result.stderr.trim()}`:''}`);
}

ok(journal.includes("import('./offline-bootstrap.js').catch(()=>{})"),'candidate bootstrap loads offline resilience module');
ok(bootstrap.includes("navigator.serviceWorker.register('./sw.js'"),'service worker registration is same-scope and static');
ok(bootstrap.includes("updateViaCache:'none'"),'service worker update bypasses stale HTTP cache');
ok(bootstrap.includes("const STARTUP_TIMEOUT=9000"),'startup recovery guard is bounded to 9 seconds');
ok(bootstrap.includes("retry.addEventListener('click',()=>location.reload())"),'startup failure offers explicit reload recovery');
ok(bootstrap.includes("addEventListener('online'" )&&bootstrap.includes("addEventListener('offline'"),'online/offline state updates are event-driven');
ok(bootstrap.includes('cacheReady&&navigator.onLine')&&bootstrap.includes('cacheReady&&!navigator.onLine'),'UI distinguishes prepared online and prepared offline states');
ok(!bootstrap.includes('localStorage'),'offline bootstrap adds no persistent user-data store');

ok(sw.includes("const CACHE_PREFIX='stellar-wrap-shell-'"),'service worker cache is versioned');
ok(sw.includes("const CACHE_NAME=`${CACHE_PREFIX}v4`"),'offline shell generation advances when VEGA exploration joins the cache');
ok(sw.includes("three@0.185.1/build/three.module.js"),'offline cache pins the approved Three.js version');
for(const path of ['./index.html','./travel-journal.js','./exploration-survey.js','./star-atlas.js','./vega-survey.js','./photo-mode.js','./arrival-debrief.js','./offline-bootstrap.js'])ok(sw.includes(`'${path}'`),`offline core includes ${path}`);
ok(sw.includes("event.request.mode==='navigate'" )&&sw.includes('networkFirst(event.request)'),'navigation uses network-first with cached fallback');
ok(sw.includes('if(isThree)')&&sw.includes('cacheFirst(event.request)'),'fixed Three.js dependency uses cache-first offline fallback');
ok(sw.includes("event.data?.type!=='OFFLINE_STATUS'"),'service worker exposes explicit cache-readiness status');
ok(sw.includes('local.every(Boolean)&&!!three'),'offline-ready state requires both local shell and Three.js');
ok(!/setInterval|requestAnimationFrame/.test(sw),'service worker adds no render-loop or polling work');
ok(pkg.scripts?.check?.includes('node scripts/validate-offline.mjs'),'npm run check includes focused offline validation');

if(failures.length){
  console.error(`\n${failures.length} offline validation failure(s):`);
  for(const failure of failures)console.error(`✗ ${failure}`);
  process.exit(1);
}
console.log(`\nOffline resilience: ${passes}/${passes} checks passed.`);
