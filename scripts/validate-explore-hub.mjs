import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

let pass=0;
function check(ok,label){
  if(!ok){console.error('FAIL:',label);process.exitCode=1;return}
  pass++;console.log('PASS:',label);
}
function has(source,text,label){check(source.includes(text),label)}

const hub=fs.readFileSync('explore-hub.js','utf8');
const loader=fs.readFileSync('navigation-discovery-status.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const syntax=spawnSync(process.execPath,['--check','explore-hub.js'],{encoding:'utf8'});
check(syntax.status===0,'explore-hub.js passes node --check');
has(hub,"const MOBILE_QUERY='(max-width:899px)'",'mobile-only breakpoint is explicit');
has(hub,"min-height:44px",'rail controls preserve 44 px mobile touch target');
has(hub,"#app.exploreHubMobile #exploreCard:not(.transit).hubOpen",'drawer requires explicit open state');
has(hub,"!card.classList.contains('transit')",'transit fly-by remains outside the mobile hub');
has(hub,"['overview','概覽',false]",'overview rail action exists');
has(hub,"['explore','探索',false]",'exploration rail action exists');
has(hub,"['discovery','發現',false]",'discovery rail action exists');
has(hub,"['photo','攝影',true]",'photo rail action exists');
has(hub,"['map','星圖',true]",'map rail action exists');
has(hub,"window.WarpPhotoMode?.enter",'photo action reuses existing Photo Mode authority');
has(hub,"document.querySelector('#openPanel')?.click()",'map action reuses existing navigation panel');
has(hub,"window.WarpStarAtlas?.snapshot?.().discoveries",'discovery pane reads existing Star Atlas authority');
has(hub,"new MutationObserver",'hub reacts to existing DOM/state changes without frame polling');
has(hub,"@media (prefers-reduced-motion:reduce)",'reduced-motion drawer handling exists');
has(hub,"#app.photoMode #exploreRail",'photo mode hides the exploration rail');
for(const id of ['lunaSurvey','vegaSurvey','cygBeaconScan','orionSpectrograph','tauRingProfiler','siriusRelayCalibration','proxAlignment','landmarkGuide'])has(hub,`'${id}'`,`exploration pane recognises ${id}`);
check(!/setInterval\s*\(|requestAnimationFrame\s*\(|localStorage|sessionStorage|fetch\s*\(/.test(hub),'hub adds no timer/render-loop/storage/network authority');
has(loader,"import('./explore-hub.js').catch(()=>{});",'existing navigation bootstrap loads explore hub');
has(sw,"'./explore-hub.js'",'prepared offline shell includes explore hub');
check(String(pkg.scripts?.check||'').includes('validate-explore-hub.mjs'),'repository check includes focused explore-hub validator');

if(process.exitCode)process.exit(process.exitCode);
console.log(`Explore Hub: ${pass} / ${pass} checks passed`);
