import { existsSync, readFileSync } from 'node:fs';
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
const doc=read('docs/OFFLINE.md');
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
ok(sw.includes("const CACHE_NAME=`${CACHE_PREFIX}v17`"),'offline shell retains the current exploration/capture-share generation');
ok(sw.includes("three@0.185.1/build/three.module.js"),'offline cache pins the approved Three.js version');

const coreMatch=sw.match(/const CORE=\[(.*?)\];/s);
ok(!!coreMatch,'service worker exposes one explicit CORE active-shell manifest');
const corePaths=coreMatch?[...coreMatch[1].matchAll(/'(\.\/[^']*)'/g)].map(match=>match[1]):[];
ok(corePaths.includes('./')&&corePaths.includes('./index.html'),'CORE manifest includes navigation root and active index');
ok(corePaths.includes('./tau-ring-depth.js'),'current TAU cinematic extension participates in offline readiness');
ok(corePaths.includes('./capture-gallery.js'),'current Capture Gallery participates in offline readiness');
ok(corePaths.includes('./capture-share.js'),'current Capture Gallery Native Share extension participates in offline readiness');
ok(new Set(corePaths).size===corePaths.length,'CORE manifest contains no duplicate entries');
for(const path of corePaths.filter(path=>path!=='./')){
  ok(existsSync(resolve(root,path.slice(2))),`offline CORE path exists: ${path}`);
}
ok(doc.includes('`sw.js` 的 `CORE`')&&doc.includes('每一個現行 `CORE`'),'offline SOT delegates the active-shell inventory to the actual service-worker CORE manifest instead of a stale duplicate list');
ok(!doc.includes('Service Worker 只處理：'),'offline SOT no longer claims an outdated exhaustive six-file shell');

ok(sw.includes("event.request.mode==='navigate'" )&&sw.includes('networkFirst(event.request)'),'navigation uses network-first with cached fallback');
ok(sw.includes('if(isThree)')&&sw.includes('cacheFirst(event.request)'),'fixed Three.js dependency uses cache-first offline fallback');
ok(sw.includes("event.data?.type!=='OFFLINE_STATUS'"),'service worker exposes explicit cache-readiness status');
ok(sw.includes('local.every(Boolean)&&!!three'),'offline-ready state requires every current CORE resource plus Three.js');
ok(!/setInterval|requestAnimationFrame/.test(sw),'service worker adds no render-loop or polling work');
ok(pkg.scripts?.check?.includes('node scripts/validate-offline.mjs'),'npm run check includes focused offline validation');

if(failures.length){
  console.error(`\n${failures.length} offline validation failure(s):`);
  for(const failure of failures)console.error(`✗ ${failure}`);
  process.exit(1);
}
console.log(`\nOffline resilience: ${passes}/${passes} checks passed.`);
