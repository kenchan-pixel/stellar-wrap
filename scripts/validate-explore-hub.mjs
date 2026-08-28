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
has(hub,"min-height:44px",'rail actions preserve 44 px mobile touch target');
has(hub,"#exploreRailToggle",'scenery-first compact Explore handle is styled');
has(hub,"min-height:46px",'compact Explore handle exceeds the mobile touch baseline');
has(hub,"#exploreRailTools",'five mode actions live inside an expandable tool group');
has(hub,"#exploreRail.railExpanded #exploreRailTools",'tool group is only visually expanded on demand');
has(hub,"railToggle?.setAttribute('aria-expanded',railExpanded?'true':'false')",'compact handle exposes its expanded state');
has(hub,"setA11yHidden(railTools,!railExpanded)",'collapsed tool group leaves focus and assistive navigation');
has(hub,"function toggleRail()",'compact handle owns an explicit expand/collapse path');
has(hub,"closeDrawer();setRailExpanded(true)",'opening the tool chooser closes any content drawer so only one surface dominates');
has(hub,"pane=next;setRailExpanded(false)",'choosing a content mode collapses the five-action chooser before opening content');
has(hub,"window.WarpExploreHub={open,close,activate,toggleRail",'diagnostic hub API exposes the compact-menu transition');
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
has(hub,"@media (prefers-reduced-motion:reduce)",'reduced-motion drawer/menu handling exists');
has(hub,"#app.photoMode #exploreRail",'photo mode hides the exploration rail');
for(const id of ['lunaSurvey','vegaSurvey','cygBeaconScan','orionSpectrograph','tauRingProfiler','siriusRelayCalibration','proxAlignment','landmarkGuide'])has(hub,`'${id}'`,`exploration pane recognises ${id}`);
has(hub,"function clearStatus()",'hub owns explicit status cleanup lifecycle');
has(hub,"if(!statusNeeded()){clearStatus();return}",'status only exists while the mobile discovery drawer needs it');
has(hub,"card?.classList.remove('hubOpen');clearStatus();restoreChildren();setA11yHidden(card,false);setRailExpanded(false);",'hub deactivation restores base card and compacts the mobile rail');
has(hub,"document.querySelector('#arrivalDebriefExplore')?.addEventListener('click'",'arrival primary action is bridged into the hub');
has(hub,"if(finalExplore())open('explore');",'arrival primary action opens the exploration pane directly from compact state');
check(/#arrivalDebriefExplore'[\s\S]{0,180}\{capture:true\}/.test(hub),'arrival handoff bridge runs in capture phase so hidden targets are revealed first');
has(hub,"document.querySelector('#arrivalDebriefNext')?.addEventListener('click'",'arrival next-destination action closes hub surfaces before navigation');
check(!/setInterval\s*\(|setTimeout\s*\(|requestAnimationFrame\s*\(|localStorage|sessionStorage|fetch\s*\(/.test(hub),'hub adds no timer/render-loop/storage/network authority');
has(loader,"import('./explore-hub.js').catch(()=>{});",'existing navigation bootstrap loads explore hub');
has(sw,"'./explore-hub.js'",'prepared offline shell includes explore hub');
check(String(pkg.scripts?.check||'').includes('validate-explore-hub.mjs'),'repository check includes focused explore-hub validator');

for(const [width,height] of [[390,844],[360,800]]){
  const runtime=spawnSync(process.execPath,['scripts/validate-explore-hub-runtime.mjs'],{
    encoding:'utf8',env:{...process.env,STELLAR_EXPLORE_WIDTH:String(width),STELLAR_EXPLORE_HEIGHT:String(height)}
  });
  if(runtime.stdout)process.stdout.write(runtime.stdout);
  if(runtime.stderr)process.stderr.write(runtime.stderr);
  check(runtime.status===0,`production Explore Hub runtime passes at ${width}x${height}`);
}

if(process.exitCode)process.exit(process.exitCode);
console.log(`Explore Hub: ${pass} / ${pass} checks passed plus two production runtime viewports`);