import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const source=fs.readFileSync(new URL('../photo-mode.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../travel-journal.js',import.meta.url),'utf8');
let passed=0;
function check(condition,label){
  if(!condition)throw new Error(`FAIL: ${label}`);
  passed++;
  console.log(`PASS ${passed}: ${label}`);
}

new vm.Script(source);
check(bootstrap.includes("import('./photo-mode.js')"),'photo mode is loaded by the active client bootstrap');
check(/const SYSTEM_NAMES=\{[^}]*LUNA:'月環基地'/.test(source),'known destination map is explicit');
check(/state\.exploring&&!state\.flying&&!state\.contextLost/.test(source),'photo mode is gated to safe final exploration');
check(/setInterval\(sample,500\)/.test(source),'state sampling is bounded to 2 Hz');
check(/#photoModeTrigger/.test(source)&&/攝影模式/.test(source),'exploration UI exposes a photo-mode entry action');
check(/classList\.add\('photoMode'\)/.test(source),'entering photo mode activates clean-view state');
check(/\.photoMode \.hud/.test(source)&&/\.photoMode #exploreCard/.test(source)&&/\.photoMode #openPanel/.test(source),'clean-view state hides core HUD and exploration panels');
check(/GUIDE_MODES=Object\.freeze\(\['thirds','center','off'\]\)/.test(source),'composition aid exposes bounded thirds, center and off modes');
check(/id='photoCompositionGuide'|guide\.id='photoCompositionGuide'/.test(source)&&/pointer-events:none/.test(source),'composition guide is a pointer-transparent presentation layer');
check(/photoGuideV1/.test(source)&&/photoGuideV2/.test(source)&&/photoGuideH1/.test(source)&&/photoGuideH2/.test(source),'rule-of-thirds guide uses four bounded guide lines');
check(/photoGuideVC/.test(source)&&/photoGuideHC/.test(source)&&/photoGuideMark/.test(source),'center guide provides crosshair and center mark');
check(/min-height:44px/.test(source)&&/photoGuideToggle/.test(source),'guide control preserves the mobile 44 px touch baseline');
check(/photoCapturing \.photoCompositionGuide/.test(source),'composition aid is hidden during the capture frame');
check(/classList\.add\('photoCapturing'\)/.test(source)&&/photoCapturing \.photoModeToolbar/.test(source),'capture hides its own toolbar from the saved frame');
check(/async function capture\(\)/.test(source)&&((source.match(/await nextFrame\(\)/g)||[]).length>=2),'capture waits two rendered frames before PNG extraction');
check(/prepareCaptureQuality/.test(source)&&/api\.setQuality\('high'\)/.test(source),'capture temporarily requests the existing High renderer tier');
check(/const previous=state\?\.qualityMode/.test(source)&&/restoreCaptureQuality/.test(source)&&/api\.setQuality\(token\.previous\)/.test(source),'capture restores the user previous quality mode after export');
check(/finally\s*\{[\s\S]*restoreCaptureQuality/.test(source),'quality restoration is protected by a finally path');
check(/canvasBlob\(canvas\)/.test(source)&&/canvas\.toBlob\(resolve,'image\/png'\)/.test(source),'capture exports a PNG from the boosted WebGL canvas');
check(/高畫質影像/.test(source)&&/width.*height/.test(source),'capture feedback reports the rendered image dimensions');
check(/aria-busy/.test(source)&&/captureBusy/.test(source),'capture blocks duplicate actions while the high-quality frame is being prepared');
check(/if\(active&&!visible&&!captureBusy\)exit\(\)/.test(source),'flight/context changes leave photo mode safely outside an active capture');
check(/window\.WarpPhotoMode=\{/.test(source)&&/capturing\(\)/.test(source)&&/guide\(\)/.test(source),'diagnostic photo-mode API exposes capture and guide state for validation');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'photo mode adds no network or analytics path');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'photo mode stores no user data directly');

const browser=spawnSync(process.execPath,['scripts/validate-photo-mode-browser.mjs'],{encoding:'utf8',timeout:120000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);
if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production capture composition + WebGL boost passes at both phone viewports');

console.log(`Photo mode validation: ${passed}/${passed} checks passed plus two real-browser capture-composition viewports`);