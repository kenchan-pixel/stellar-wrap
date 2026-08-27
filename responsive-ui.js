(() => {
'use strict';

if(document.querySelector('#responsiveUiStyle'))return;
const style=document.createElement('style');
style.id='responsiveUiStyle';
style.textContent=`
@media (min-width:900px){
  #app{
    --ui-xs:clamp(10px,.46vw,13px);
    --ui-sm:clamp(11px,.54vw,14px);
    --ui-md:clamp(13px,.64vw,17px);
    --ui-lg:clamp(22px,1.05vw,30px);
  }

  #app .hud{top:max(16px,var(--safeT));left:max(18px,var(--safeL));right:max(18px,var(--safeR));gap:16px}
  #app .hudBlock{max-width:62%}
  #app .kicker{font-size:var(--ui-xs)}
  #app .place{font-size:var(--ui-lg);margin-top:5px}
  #app .sub{font-size:var(--ui-sm);margin-top:5px;line-height:1.45}
  #app .phase{padding:10px 13px;border-radius:13px}
  #app .phase strong{font-size:var(--ui-md)}
  #app .phase span{font-size:var(--ui-xs);margin-top:4px;line-height:1.45}
  #app #flightBar{top:calc(max(16px,var(--safeT)) + 82px)}
  #app #telemetry{left:max(18px,var(--safeL));bottom:max(18px,var(--safeB));gap:5px}
  #app .teleLine{font-size:var(--ui-sm)}
  #app .teleLine b{font-size:var(--ui-md);margin-right:7px}
  #app #openPanel{right:max(18px,var(--safeR));bottom:max(18px,var(--safeB));height:48px;padding:0 18px;font-size:var(--ui-sm)}

  #app #panel{right:18px;bottom:18px;width:clamp(460px,30vw,560px);max-height:90%;padding:16px 16px calc(16px + env(safe-area-inset-bottom));border-radius:24px}
  #app .panelHead{top:-16px;padding:16px 0 12px}
  #app .panelHead h2{font-size:clamp(17px,.78vw,20px)}
  #app .panelHead p{font-size:var(--ui-sm);line-height:1.45}
  #app .mapWrap{padding:9px}
  #app .mapNode text{font-size:var(--ui-xs)}
  #app .mapStatus,#app .mapAxis{font-size:var(--ui-xs)}
  #app .routeCard{margin-top:11px;padding:13px}
  #app .routeTitle{font-size:var(--ui-md)}
  #app .routeMeta{font-size:var(--ui-sm)}
  #app .routeLine{font-size:var(--ui-sm);line-height:1.5}
  #app .routeLegs{gap:7px;max-height:170px}
  #app .routeLeg{grid-template-columns:24px 1fr auto;gap:9px;padding-top:8px}
  #app .legNo{width:24px;height:24px;font-size:var(--ui-xs)}
  #app .legMain{font-size:var(--ui-sm);line-height:1.4}
  #app .legSub{font-size:var(--ui-xs);margin-top:3px}
  #app .legTime{font-size:var(--ui-xs)}
  #app .primary,#app .secondary{min-height:48px;font-size:var(--ui-sm)}
  #app .setting{padding:11px}
  #app .setting label{font-size:var(--ui-sm)}
  #app .setting select{font-size:var(--ui-sm);padding:8px}
  #app .setting .microBtn{min-height:32px;font-size:var(--ui-xs)}
  #app .qualityNote{font-size:var(--ui-xs);line-height:1.45}
  #app .legend{font-size:var(--ui-xs);line-height:1.55}
  #app .chip{font-size:var(--ui-xs);padding:6px 9px}

  #app #exploreCard{left:18px;bottom:18px;width:clamp(410px,25vw,500px);max-height:calc(100vh - 36px);overflow:auto;overscroll-behavior:contain;padding:14px;border-radius:18px}
  #app #exploreCard.transit{width:clamp(390px,23vw,470px)}
  #app .exploreKicker{font-size:var(--ui-xs)}
  #app .exploreTitle{font-size:clamp(17px,.78vw,20px);margin-top:4px}
  #app .exploreCollapse{width:36px;height:36px;font-size:18px}
  #app .exploreMeta{font-size:var(--ui-sm);margin-top:8px;line-height:1.45}
  #app .exploreDesc{font-size:var(--ui-sm);line-height:1.55;margin:7px 0 10px}
  #app .exploreActions{gap:8px}
  #app .exploreActions button,#app .microBtn{min-height:40px;font-size:var(--ui-sm)}
  #app #perfHud{min-width:138px;padding:9px 10px;font-size:var(--ui-xs);line-height:1.5}

  #app .journalTitle,#app .atlasTitle{font-size:var(--ui-md)}
  #app .journalSummary,#app .atlasSummary{font-size:var(--ui-xs)}
  #app .journalToggle,#app .journalRevisit,#app .atlasToggle,#app .atlasPlan{min-height:38px;font-size:var(--ui-xs)}
  #app .journalEmpty,#app .journalMain{font-size:var(--ui-sm);line-height:1.5}
  #app .journalMain strong{font-size:var(--ui-sm)}
  #app .journalRoute,#app .journalMeta{font-size:var(--ui-xs)}
  #app .atlasComplete{font-size:var(--ui-xs)}
  #app .atlasCard{padding:10px}
  #app .atlasCardTop strong{font-size:var(--ui-sm)}
  #app .atlasId,#app .atlasTag,#app .atlasLandmark,#app .atlasMeta,#app .atlasDiscovery{font-size:var(--ui-xs)}
  #app .atlasLandmark,#app .atlasMeta{line-height:1.45}

  #app .lunaSurvey,#app .vegaSurvey,#app .arrivalDebrief{padding:10px;margin:10px 0 9px}
  #app .lunaSurveyTitle,#app .vegaSurveyTitle,#app .arrivalDebriefTitle{font-size:var(--ui-sm)}
  #app .lunaSurveyProgress,#app .vegaSurveyProgress,#app .arrivalDebriefBadge{font-size:var(--ui-xs)}
  #app .lunaPoint,#app .vegaPoint{min-height:38px;font-size:var(--ui-sm)}
  #app .lunaDetail strong,#app .vegaDetail strong{font-size:var(--ui-sm)}
  #app .lunaCue,#app .lunaNote,#app .vegaCue,#app .vegaNote{font-size:var(--ui-xs);line-height:1.55}
  #app .lunaComplete,#app .vegaComplete{min-height:40px;font-size:var(--ui-sm)}
  #app .lunaDiscovery,#app .vegaDiscovery{font-size:var(--ui-xs);line-height:1.55}
  #app .arrivalDebriefStats{font-size:var(--ui-sm);line-height:1.5}
  #app .arrivalDebriefRoute{font-size:var(--ui-xs);line-height:1.5}
  #app .arrivalDebriefActions{gap:8px}
  #app .arrivalDebriefActions button{min-height:40px;font-size:var(--ui-sm)}

  #app .photoModeToolbar{left:max(18px,var(--safeL));right:max(18px,var(--safeR));bottom:max(18px,var(--safeB));padding:9px;gap:9px}
  #app .photoModeToolbar button{font-size:var(--ui-sm)}
  #app .photoModeLabel strong{font-size:var(--ui-sm)}
  #app .photoModeLabel span,#app .photoModeToast{font-size:var(--ui-xs)}

  #app .fallbackKicker,#app .fallbackControls label,#app .fallbackMeta,#app .fallbackFoot{font-size:var(--ui-xs)}
  #app .fallbackTitle{font-size:clamp(24px,1.2vw,32px)}
  #app .fallbackCopy,#app .fallbackRoute{font-size:var(--ui-sm)}
  #app .fallbackRoute strong{font-size:var(--ui-md)}
  #app .fallbackNode text{font-size:var(--ui-xs)}
}
`;
document.head.append(style);
})();
