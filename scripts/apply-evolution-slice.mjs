import { readFileSync, writeFileSync } from 'node:fs';

function edit(path, mutator) {
  const before = readFileSync(path, 'utf8');
  const after = mutator(before);
  if (after === before) throw new Error(`No change produced for ${path}`);
  writeFileSync(path, after);
}

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`Missing anchor: ${label}`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`Ambiguous anchor: ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

const recoveryBlock = [
  "let last=performance.now(),hidden=false,contextLost=false,contextLossCount=0,lastContextLossAt=0,contextHelpTimer=0;document.addEventListener('visibilitychange',()=>{hidden=document.hidden;last=performance.now()});",
  "const contextStatus=document.createElement('div');contextStatus.setAttribute('role','status');contextStatus.setAttribute('aria-live','polite');contextStatus.style.cssText='position:absolute;z-index:19;left:50%;top:50%;transform:translate(-50%,-50%);max-width:min(82vw,340px);padding:12px 15px;border:1px solid rgba(185,218,255,.28);border-radius:14px;background:rgba(4,8,18,.9);backdrop-filter:blur(16px);box-shadow:0 16px 52px rgba(0,0,0,.5);font-size:11px;line-height:1.45;text-align:center;color:#eaf3ff;pointer-events:none;opacity:0;transition:opacity .18s';E.app.append(contextStatus);",
  "function showContextStatus(message,visible=true){contextStatus.textContent=message;contextStatus.style.opacity=visible?'1':'0'}",
  "C.addEventListener('webglcontextlost',()=>{const now=performance.now();contextLossCount=now-lastContextLossAt<60000?contextLossCount+1:1;lastContextLossAt=now;contextLost=true;last=now;showContextStatus('圖像引擎暫停 · 正在恢復 WebGL');if(audio.master&&audio.ctx)audio.master.gain.setTargetAtTime(0,audio.ctx.currentTime,.04);clearTimeout(contextHelpTimer);contextHelpTimer=setTimeout(()=>{if(contextLost)showContextStatus('圖像引擎仍在恢復 · 如畫面未回復，請重新整理頁面')},6500)});",
  "C.addEventListener('webglcontextrestored',()=>{contextLost=false;last=performance.now();frameEMA=16.7;qualityClock=perfClock=0;clearTimeout(contextHelpTimer);let safe='';if(contextLossCount>=2&&qualityMode==='high'){setQualityMode('standard',false);safe=' · 已暫時切換標準畫質'}else if(qualityMode==='auto'){quality=Math.min(quality,.72);benchmarkClock=benchmarkSum=benchmarkCount=0;benchmarkDone=false;autoTier='重新校準';resize();applySystemDetail(true)}else{resize();applySystemDetail(true)}showContextStatus('圖像引擎已恢復 · 航程由原位置繼續'+safe);setTimeout(()=>showContextStatus('',false),1400)});"
].join('\n');

edit('index.html', html => {
  html = replaceOnce(
    html,
    "let last=performance.now(),hidden=false;document.addEventListener('visibilitychange',()=>{hidden=document.hidden;last=performance.now()});",
    recoveryBlock,
    'context lifecycle insertion'
  );
  html = replaceOnce(
    html,
    'requestAnimationFrame(frame);if(hidden)return;',
    'requestAnimationFrame(frame);if(hidden||contextLost)return;',
    'pause frame while WebGL context is lost'
  );
  html = replaceOnce(
    html,
    "setAudio(v){audio.setEnabled(v)},arrivalProfile(t){return arrivalDepthAt(t)},state(){return{current,selected,route:[...route],phase,flying,exploring,frameMs:frameEMA,qualityMode,quality,warpAmount,tunnelAmount,fov:camera.fov,systemDepth,arrivalClock}}};",
    "setAudio(v){audio.setEnabled(v)},loseContext(){renderer.forceContextLoss()},restoreContext(){renderer.forceContextRestore()},arrivalProfile(t){return arrivalDepthAt(t)},state(){return{current,selected,route:[...route],phase,flying,exploring,frameMs:frameEMA,qualityMode,quality,warpAmount,tunnelAmount,fov:camera.fov,systemDepth,arrivalClock,contextLost,contextLossCount}}};",
    'diagnostic context controls'
  );
  return html;
});

edit('scripts/validate.mjs', source => {
  source = replaceOnce(
    source,
    "ok(indexBytes.equals(stableBytes), 'active index matches V4.0 stable snapshot');\nok(sha256(stableBytes) === stableHash, 'V4.0 stable SHA-256 is unchanged');",
    "ok(sha256(stableBytes) === stableHash, 'V4.0 stable SHA-256 is unchanged');",
    'allow active index to evolve independently of stable snapshot'
  );
  source = replaceOnce(
    source,
    "  ['public diagnostic API', 'window.WarpSim='],\n];",
    [
      "  ['public diagnostic API', 'window.WarpSim='],",
      "  ['WebGL context loss handling', \"C.addEventListener('webglcontextlost'\"],",
      "  ['WebGL context restoration handling', \"C.addEventListener('webglcontextrestored'\"],",
      "  ['simulation pauses during context loss', 'if(hidden||contextLost)return'],",
      "  ['context recovery diagnostic control', 'loseContext(){renderer.forceContextLoss()}'],",
      '];'
    ].join('\n'),
    'context recovery validation markers'
  );
  return source;
});

edit('CHANGELOG.md', source => replaceOnce(
  source,
  'All notable changes to this project are recorded here. Dates use Hong Kong time.\n\n## [4.0.0] - 2026-08-25',
  [
    'All notable changes to this project are recorded here. Dates use Hong Kong time.',
    '',
    '## [Unreleased]',
    '',
    '### Improved',
    '',
    '- Added mobile WebGL context-loss recovery: simulation time pauses while the GPU context is unavailable and resumes from the same flight phase after restoration.',
    '- Added an in-app recovery status overlay and delayed guidance when automatic restoration takes longer than expected.',
    "- Repeated context loss while using High quality temporarily falls back to Standard quality without overwriting the user's saved preference.",
    '- Auto quality re-benchmarks after context restoration instead of treating the recovery pause as poor frame performance.',
    '',
    '### Validation',
    '',
    '- The active simulator may now evolve independently while releases/v4.0-stable.html remains hash-locked as the regression baseline.',
    '- Added structural checks for WebGL context loss/restoration handlers and the paused simulation clock.',
    '',
    '## [4.0.0] - 2026-08-25'
  ].join('\n'),
  'unreleased recovery changelog'
));

edit('docs/PERFORMANCE.md', source => {
  const section = [
    '## 8. WebGL context 中斷與恢復',
    '',
    '手機切換 App、GPU 記憶體壓力或瀏覽器重設圖像引擎時，WebGL context 可能短暫遺失。Active simulator 的恢復策略：',
    '',
    '- context lost 時暫停模擬 clock，不讓航程在黑畫面期間偷偷前進。',
    '- 顯示置中的短狀態提示；超過約 6.5 秒仍未恢復才提示重新整理頁面。',
    '- context restored 後重設 frame timing，重新套用 renderer 尺寸及場景細節。',
    '- Auto 畫質重新校準，避免把恢復停頓誤判成持續低效能。',
    '- 60 秒內重複 context lost 且使用 High 畫質時，本次 session 暫降至 Standard；不覆寫已保存偏好。',
    '- Three.js renderer 本身負責重建 WebGL 內部狀態；應用層負責暫停／續接模擬與 UI 回饋。',
    '',
    '可使用公開診斷 API WarpSim.loseContext() / WarpSim.restoreContext() 配合瀏覽器開發工具作模擬測試。',
    '',
    '## 9. 完成標準',
    '',
    '- 主要裝置自動畫質下，大部分航程接近 60 fps'
  ].join('\n');
  source = replaceOnce(
    source,
    '## 8. 完成標準\n\n- 主要裝置自動畫質下，大部分航程接近 60 fps',
    section,
    'performance recovery section'
  );
  return source.replace('## 9. 必須人手核實', '## 10. 必須人手核實');
});

edit('docs/TESTING.md', source => {
  source = replaceOnce(
    source,
    '- `index.html` 與 V4.0 穩定快照完全一致\n- V4.0 穩定版 SHA-256 正確',
    '- V4.0 穩定快照 SHA-256 正確；active `index.html` 可獨立演進\n- WebGL context lost／restored handlers、暫停模擬 clock 及診斷控制存在',
    'testing automation baseline wording'
  );
  source = replaceOnce(
    source,
    '- [ ] 切換 App／鎖屏／返回後可恢復\n\n## 3. 建議測試航線',
    [
      '- [ ] 切換 App／鎖屏／返回後可恢復',
      '- [ ] 航行途中執行 WarpSim.loseContext() 後，畫面顯示恢復提示而航程進度不繼續',
      '- [ ] 執行 WarpSim.restoreContext() 後，從同一航行階段／位置續航，沒有時間跳躍',
      '- [ ] 60 秒內於 High 畫質重複兩次 context loss／restore，第二次恢復後本 session 暫降 Standard',
      '',
      '## 3. 建議測試航線'
    ].join('\n'),
    'manual WebGL recovery checks'
  );
  return source;
});

console.log('Applied WebGL recovery evolution slice.');
