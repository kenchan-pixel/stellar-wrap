import fs from 'node:fs';
import vm from 'node:vm';

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
check(/classList\.add\('photoCapturing'\)/.test(source)&&/photoCapturing \.photoModeToolbar/.test(source),'capture hides its own toolbar from the saved frame');
check(/requestAnimationFrame\(\(\)=>\{\s*canvas\.toBlob/.test(source),'capture waits for a fresh rendered frame before PNG extraction');
check(/link\.download=fileName\(\)/.test(source)&&/image\/png/.test(source),'capture saves a local PNG with a destination filename');
check(/if\(active&&!visible\)exit\(\)/.test(source),'flight/context changes automatically leave photo mode');
check(/window\.WarpPhotoMode=\{/.test(source),'diagnostic photo-mode API is exposed');
check(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(source),'photo mode adds no network or analytics path');
check(!/localStorage|sessionStorage|indexedDB/.test(source),'photo mode stores no user data');

console.log(`Photo mode validation: ${passed}/${passed} checks passed`);
