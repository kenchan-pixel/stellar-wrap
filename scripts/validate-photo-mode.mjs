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
check(/FRAME_MODES=Object\.freeze\(\['full','portrait','square'\]\)/.test(source),'capture framing exposes bounded original, 9:16 and 1:1 modes');
check(/FRAME_ASPECTS=Object\.freeze\(\{portrait:9\/16,square:1\}\)/.test(source),'framed capture uses explicit 9:16 and square aspect authority');
check(/frameGuide\.id='photoFrameGuide'/.test(source)&&/photoFrameWindow/.test(source),'photo mode exposes a dedicated crop-preview window');
check(/\.photoFrameGuide\{[^}]*pointer-events:none/.test(source)&&/box-shadow:0 0 0 100vmax/.test(source),'crop preview darkens only the outside frame and stays pointer-transparent');
check(/function cropRect\(width,height,mode=frameMode\)/.test(source)&&/Math\.min\(sourceWidth,cropWidth\)/.test(source)&&/Math\.min\(sourceHeight,cropHeight\)/.test(source),'crop calculation is center-bounded and cannot upscale beyond the boosted source');
check(/createImageBitmap\(blob\)/.test(source)&&/context\.drawImage\(bitmap,rect\.x,rect\.y,rect\.width,rect\.height,0,0,rect\.width,rect\.height\)/.test(source),'framed output crops decoded boosted pixels without a second WebGL renderer');
check(/photoCapturing \.photoFrameGuide/.test(source),'crop preview is hidden from the saved capture frame');
check(/id=\"photoFrameToggle\"/.test(source)&&/min-height:44px/.test(source),'frame selector preserves the mobile 44 px touch baseline');
check(/photoGuideToggle,.photoFrameToggle/.test(source)&&/photoModeLabel\{flex:1 0 100%\}/.test(source),'small-phone toolbar gives framing controls a bounded second-row layout');
check(/photoCapturing \.photoCompositionGuide/.test(source),'composition aid is hidden during the capture frame');
check(/classList\.add\('photoCapturing'\)/.test(source)&&/photoCapturing \.photoModeToolbar/.test(source),'capture hides its own toolbar from the saved frame');
check(/async function capture\(\)/.test(source)&&((source.match(/await nextFrame\(\)/g)||[]).length>=2),'capture waits two rendered frames before PNG extraction');
check(/prepareCaptureQuality/.test(source)&&/api\.setQuality\('high'\)/.test(source),'capture temporarily requests the existing High renderer tier');
check(/const previous=state\?\.qualityMode/.test(source)&&/restoreCaptureQuality/.test(source)&&/api\.setQuality\(token\.previous\)/.test(source),'capture restores the user previous quality mode after export');
check(/finally\s*\{[\s\S]*restoreCaptureQuality/.test(source),'quality restoration is protected by a finally path');
check(/const requestedFrame=frameMode/.test(source)&&/frameBlob\(blob,width,height,requestedFrame\)/.test(source),'capture freezes the requested frame mode for the in-flight export');
check(/canvasBlob\(canvas\)/.test(source)&&/canvas\.toBlob\(resolve,'image\/png'\)/.test(source),'capture exports PNG pixels from the boosted WebGL canvas and bounded crop canvas');
check(/-9x16/.test(source)&&/-square/.test(source),'framed files carry an explicit aspect suffix for local capture records');
check(/高畫質 \$\{label\}影像/.test(source)&&/width.*height/.test(source),'capture feedback reports final framed image dimensions');
check(/aria-busy/.test(source)&&/captureBusy/.test(source),'capture blocks duplicate actions while the high-quality frame is being prepared');
check(/if\(active&&!visible&&!captureBusy\)exit\(\)/.test(source),'flight/context changes leave photo mode safely outside an active capture');
check(/window\.WarpPhotoMode=\{/.test(source)&&/capturing\(\)/.test(source)&&/guide\(\)/.test(source)&&/frame\(\)/.test(source)&&/crop\(width,height,mode\)/.test(source),'diagnostic photo-mode API exposes capture, guide and frame state for validation');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'photo mode adds no network or analytics path');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'photo mode stores no user data directly');

const browser=spawnSync(process.execPath,['scripts/validate-photo-mode-browser.mjs'],{encoding:'utf8',timeout:120000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);
if(browser.stderr)process.stderr.write(browser.stderr);
check(browser.status===0,'real production capture composition + framed WebGL boost passes at both phone viewports');

console.log(`Photo mode validation: ${passed}/${passed} checks passed plus two real-browser framed capture viewports`);