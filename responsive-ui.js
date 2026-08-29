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
  #app .arrivalDebriefRoute,#app .arrivalDebriefObjective{font-size:var(--ui-xs);line-height:1.5}
  #app .arrivalDebriefActions{gap:8px}
  #app .arrivalDebriefActions button{min-height:44px;font-size:var(--ui-sm)}

  #app .landmarkGuide{margin:10px 0 9px;padding:10px;border-radius:13px}
  #app .landmarkGuideHead{gap:10px}
  #app .landmarkGuideTitle{font-size:var(--ui-md)}
  #app .landmarkRing{font-size:var(--ui-xs);line-height:1.45}
  #app .landmarkTabs{gap:7px;margin-top:9px}
  #app .landmarkTab{min-height:40px;font-size:var(--ui-sm)}
  #app .landmarkDetail{margin-top:9px;padding-top:9px}
  #app .landmarkMeta{gap:8px}
  #app .landmarkKind{padding:3px 8px;font-size:var(--ui-xs)}
  #app .landmarkName{font-size:var(--ui-sm)}
  #app .landmarkCopy{margin-top:6px;font-size:var(--ui-xs);line-height:1.55}

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

/* Journey Cinematics · Warp Threshold */
#app.journeyAtmosphereActive #journeyAtmosphere::before,
#app.journeyAtmosphereActive #journeyAtmosphere::after{
  content:"";
  position:absolute;
  left:50%;
  top:50%;
  pointer-events:none;
  border-radius:50%;
  opacity:0;
  transform:translate(-50%,-50%) scale(.55);
  transform-origin:center;
  will-change:transform,opacity;
}
#app.journeyAtmosphereActive #journeyAtmosphere::before{
  width:min(78vmin,680px);
  aspect-ratio:1;
  border:1px solid rgba(var(--journey-alt-rgb),.5);
  background:radial-gradient(circle at center,transparent 0 68%,rgba(var(--journey-rgb),.035) 69% 73%,rgba(var(--journey-alt-rgb),.12) 74%,transparent 76%);
  box-shadow:0 0 22px rgba(var(--journey-rgb),.18),inset 0 0 18px rgba(var(--journey-alt-rgb),.12);
}
#app.journeyAtmosphereActive #journeyAtmosphere::after{
  width:min(58vmin,520px);
  aspect-ratio:1;
  border:2px solid transparent;
  border-top-color:rgba(var(--journey-alt-rgb),.72);
  border-bottom-color:rgba(var(--journey-rgb),.55);
}
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warpEntry"]::before{
  animation:journeyThresholdIngress .82s cubic-bezier(.16,.82,.24,1) both;
}
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warpEntry"]::after{
  animation:journeyThresholdLock .72s cubic-bezier(.18,.76,.3,1) both;
}
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warp"]::before{
  opacity:.16;
  transform:translate(-50%,-50%) scale(1.34);
}
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warp"]::after{
  opacity:.08;
  transform:translate(-50%,-50%) rotate(18deg) scale(1.18);
}
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warpExit"]::before{
  animation:journeyThresholdEgress .68s cubic-bezier(.32,0,.68,1) both;
}
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warpExit"]::after{
  animation:journeyThresholdRelease .62s cubic-bezier(.32,0,.68,1) both;
}
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="decelerate"]::before,
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="decelerate"]::after,
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="approach"]::before,
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="approach"]::after,
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="observe"]::before,
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="observe"]::after{
  opacity:0;
  animation:none;
}
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warpEntry"] ~ #journeyRegion{
  border-left-width:2px;
  background:linear-gradient(90deg,rgba(3,7,15,.76),rgba(var(--journey-rgb),.07),transparent);
  box-shadow:-7px 0 18px rgba(var(--journey-rgb),.08);
}
#app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warpExit"] ~ #journeyRegion{
  border-left-width:2px;
  background:linear-gradient(90deg,rgba(3,7,15,.7),rgba(var(--journey-alt-rgb),.055),transparent);
}
@keyframes journeyThresholdIngress{
  0%{opacity:0;transform:translate(-50%,-50%) scale(.44)}
  42%{opacity:.78;transform:translate(-50%,-50%) scale(.88)}
  100%{opacity:.18;transform:translate(-50%,-50%) scale(1.34)}
}
@keyframes journeyThresholdLock{
  0%{opacity:0;transform:translate(-50%,-50%) rotate(-34deg) scale(.4)}
  52%{opacity:.68;transform:translate(-50%,-50%) rotate(6deg) scale(.9)}
  100%{opacity:.1;transform:translate(-50%,-50%) rotate(18deg) scale(1.18)}
}
@keyframes journeyThresholdEgress{
  0%{opacity:.16;transform:translate(-50%,-50%) scale(1.3)}
  52%{opacity:.74;transform:translate(-50%,-50%) scale(.9)}
  100%{opacity:0;transform:translate(-50%,-50%) scale(.56)}
}
@keyframes journeyThresholdRelease{
  0%{opacity:.08;transform:translate(-50%,-50%) rotate(18deg) scale(1.16)}
  48%{opacity:.58;transform:translate(-50%,-50%) rotate(-8deg) scale(.84)}
  100%{opacity:0;transform:translate(-50%,-50%) rotate(-28deg) scale(.5)}
}
@media (prefers-reduced-motion:reduce){
  #app.journeyAtmosphereActive #journeyAtmosphere::before,
  #app.journeyAtmosphereActive #journeyAtmosphere::after{animation:none!important;transition:none!important}
  #app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warpEntry"]::before{opacity:.2;transform:translate(-50%,-50%) scale(1.2)}
  #app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warpEntry"]::after{opacity:.1;transform:translate(-50%,-50%) rotate(12deg) scale(1.08)}
  #app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warpExit"]::before,
  #app.journeyAtmosphereActive #journeyAtmosphere[data-phase="warpExit"]::after{opacity:.08}
}

/* Journey Scenery · Corridor Landmark Flybys */
#app.journeyAtmosphereActive #journeyTransit::before,
#app.journeyAtmosphereActive #journeyTransit::after{
  content:"";
  position:absolute;
  display:block;
  pointer-events:none;
  opacity:0;
  will-change:transform,opacity;
}
#app.journeyAtmosphereActive #journeyTransit{
  --corridor-rotate:0deg;
  --corridor-skew-x:0deg;
}
#journeyAtmosphere[data-phase="warpEntry"] #journeyTransit::before{opacity:.12;transform:translate3d(8vw,-2vh,0) scale(.82) skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate))}
#journeyAtmosphere[data-phase="warpEntry"] #journeyTransit::after{opacity:.08;transform:translate3d(-5vw,3vh,0) scale(.78) skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate))}
#journeyAtmosphere[data-phase="warp"] #journeyTransit::before{animation:corridorLandmarkFlybyA 5.4s ease-in-out infinite alternate}
#journeyAtmosphere[data-phase="warp"] #journeyTransit::after{animation:corridorLandmarkFlybyB 6.2s ease-in-out infinite alternate}
#journeyAtmosphere[data-phase="warpExit"] #journeyTransit::before{opacity:.08;transform:translate3d(-12vw,4vh,0) scale(1.12) skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate))}
#journeyAtmosphere[data-phase="warpExit"] #journeyTransit::after{opacity:.05;transform:translate3d(10vw,-3vh,0) scale(1.08) skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate))}
#journeyAtmosphere[data-phase="decelerate"] #journeyTransit::before,
#journeyAtmosphere[data-phase="decelerate"] #journeyTransit::after,
#journeyAtmosphere[data-phase="approach"] #journeyTransit::before,
#journeyAtmosphere[data-phase="approach"] #journeyTransit::after,
#journeyAtmosphere[data-phase="observe"] #journeyTransit::before,
#journeyAtmosphere[data-phase="observe"] #journeyTransit::after{opacity:0;animation:none}

#journeyTransit[data-corridor="SOL>LUNA"]::before{left:-28vmin;top:8vh;width:74vmin;height:74vmin;border:2px solid rgba(var(--journey-alt-rgb),.34);border-right-color:transparent;border-bottom-color:transparent;border-radius:50%;background:radial-gradient(circle at 62% 48%,transparent 0 61%,rgba(var(--journey-rgb),.07) 62% 68%,transparent 69%)}
#journeyTransit[data-corridor="SOL>LUNA"]::after{right:-20vmin;bottom:-14vmin;width:46vmin;height:46vmin;border:1px solid rgba(var(--journey-rgb),.28);border-left-color:transparent;border-radius:50%;box-shadow:inset 18px 0 36px rgba(var(--journey-rgb),.055)}
#journeyTransit[data-corridor="SOL>SIRIUS"]::before{left:-12vw;top:16vh;width:52vw;height:18vh;border:1px solid rgba(var(--journey-alt-rgb),.3);--corridor-skew-x:-18deg;--corridor-rotate:11deg;background:linear-gradient(110deg,transparent 0 42%,rgba(var(--journey-rgb),.09) 49% 52%,transparent 60%)}
#journeyTransit[data-corridor="SOL>SIRIUS"]::after{right:-14vw;bottom:12vh;width:44vw;height:14vh;border-top:1px solid rgba(var(--journey-rgb),.3);border-bottom:1px solid rgba(var(--journey-alt-rgb),.18);--corridor-skew-x:21deg;--corridor-rotate:-9deg}
#journeyTransit[data-corridor="SOL>PROX"]::before{right:-22vmin;top:6vh;width:68vmin;height:68vmin;border:2px solid rgba(var(--journey-rgb),.35);border-left-color:transparent;border-bottom-color:transparent;border-radius:50%;--corridor-rotate:-28deg;background:radial-gradient(circle at 70% 30%,rgba(var(--journey-rgb),.07),transparent 52%)}
#journeyTransit[data-corridor="SOL>PROX"]::after{left:-10vw;bottom:8vh;width:54vw;height:24vh;border-top:2px solid rgba(var(--journey-alt-rgb),.22);border-radius:50% 50% 0 0;--corridor-rotate:12deg}
#journeyTransit[data-corridor="LUNA>VEGA"]::before{right:-25vmin;top:10vh;width:76vmin;height:76vmin;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 36%,rgba(var(--journey-alt-rgb),.19) 36.5% 37%,transparent 37.5% 47%,rgba(var(--journey-rgb),.12) 47.5% 48%,transparent 48.5%)}
#journeyTransit[data-corridor="LUNA>VEGA"]::after{left:-16vmin;bottom:-10vmin;width:50vmin;height:50vmin;border:1px solid rgba(var(--journey-rgb),.28);border-radius:50%;box-shadow:0 0 32px rgba(var(--journey-rgb),.08)}
#journeyTransit[data-corridor="LUNA>PROX"]::before{left:-9vw;top:12vh;width:48vw;height:28vh;clip-path:polygon(4% 55%,15% 18%,38% 8%,59% 28%,83% 14%,97% 56%,76% 88%,51% 77%,26% 94%);background:radial-gradient(circle at 38% 42%,rgba(185,199,220,.14),rgba(65,72,88,.08) 38%,transparent 72%)}
#journeyTransit[data-corridor="LUNA>PROX"]::after{right:-5vw;bottom:11vh;width:35vw;height:22vh;clip-path:polygon(8% 44%,28% 10%,55% 20%,84% 6%,97% 52%,74% 90%,42% 80%,17% 96%);background:linear-gradient(132deg,rgba(var(--journey-rgb),.12),rgba(88,96,112,.07),transparent 74%)}
#journeyTransit[data-corridor="VEGA>CYG"]::before{left:-8vw;top:21vh;width:76vw;height:3px;background:linear-gradient(90deg,transparent,rgba(var(--journey-alt-rgb),.38),rgba(var(--journey-rgb),.12),transparent);--corridor-rotate:17deg;box-shadow:0 12vh 0 rgba(var(--journey-rgb),.08)}
#journeyTransit[data-corridor="VEGA>CYG"]::after{right:-9vw;bottom:25vh;width:68vw;height:2px;background:linear-gradient(90deg,transparent,rgba(var(--journey-rgb),.34),transparent);--corridor-rotate:-14deg;box-shadow:0 -10vh 0 rgba(var(--journey-alt-rgb),.07)}
#journeyTransit[data-corridor="CYG>ORION"]::before{left:-15vw;top:4vh;width:58vw;height:76vh;background:radial-gradient(ellipse at 30% 42%,rgba(var(--journey-rgb),.14),transparent 58%),radial-gradient(ellipse at 65% 68%,rgba(var(--journey-alt-rgb),.08),transparent 62%);border-radius:46% 54% 62% 38%}
#journeyTransit[data-corridor="CYG>ORION"]::after{right:-18vw;bottom:-8vh;width:62vw;height:58vh;background:radial-gradient(ellipse at 48% 52%,rgba(var(--journey-alt-rgb),.11),transparent 64%);border-top:1px solid rgba(var(--journey-rgb),.2);border-radius:50%}
#journeyTransit[data-corridor="TAU>SIRIUS"]::before{left:-30vmin;bottom:-22vmin;width:88vmin;height:54vmin;border:2px solid rgba(var(--journey-rgb),.24);border-top-color:rgba(var(--journey-alt-rgb),.32);border-radius:50%;--corridor-rotate:14deg;background:radial-gradient(ellipse at center,transparent 0 58%,rgba(var(--journey-rgb),.055) 59% 66%,transparent 67%)}
#journeyTransit[data-corridor="TAU>SIRIUS"]::after{right:-24vmin;top:5vh;width:62vmin;height:40vmin;border-top:1px solid rgba(var(--journey-alt-rgb),.25);border-bottom:1px solid rgba(var(--journey-rgb),.16);border-radius:50%;--corridor-rotate:-19deg}
#journeyTransit[data-corridor="SIRIUS>PROX"]::before{right:-25vmin;top:7vh;width:72vmin;height:72vmin;border-radius:50%;background:conic-gradient(from 18deg,rgba(var(--journey-alt-rgb),.22) 0 7%,transparent 7% 22%,rgba(var(--journey-rgb),.15) 22% 30%,transparent 30% 49%,rgba(var(--journey-alt-rgb),.16) 49% 55%,transparent 55% 79%,rgba(var(--journey-rgb),.12) 79% 85%,transparent 85%);mask:radial-gradient(circle,transparent 0 58%,#000 59% 63%,transparent 64%)}
#journeyTransit[data-corridor="SIRIUS>PROX"]::after{left:-12vmin;bottom:8vh;width:42vmin;height:42vmin;border:1px dashed rgba(var(--journey-rgb),.3);border-radius:50%;--corridor-rotate:22deg}

@keyframes corridorLandmarkFlybyA{
  0%{opacity:.1;transform:translate3d(14vw,-3vh,0) scale(.8) skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate)) rotate(-4deg)}
  48%{opacity:.38;transform:translate3d(0,2vh,0) scale(1) skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate))}
  100%{opacity:.13;transform:translate3d(-15vw,5vh,0) scale(1.14) skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate)) rotate(5deg)}
}
@keyframes corridorLandmarkFlybyB{
  0%{opacity:.08;transform:translate3d(-10vw,4vh,0) scale(.84) skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate)) rotate(4deg)}
  52%{opacity:.28;transform:translate3d(1vw,-1vh,0) scale(1.02) skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate))}
  100%{opacity:.09;transform:translate3d(13vw,-5vh,0) scale(1.12) skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate)) rotate(-5deg)}
}
@media (prefers-reduced-motion:reduce){
  #app.journeyAtmosphereActive #journeyTransit::before,
  #app.journeyAtmosphereActive #journeyTransit::after{animation:none!important;transition:none!important}
  #journeyAtmosphere[data-phase="warp"] #journeyTransit::before{opacity:.2;transform:skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate))}
  #journeyAtmosphere[data-phase="warp"] #journeyTransit::after{opacity:.12;transform:skewX(var(--corridor-skew-x)) rotate(var(--corridor-rotate))}
}
`;
document.head.append(style);
})();

import('./journey-atmosphere.js').catch(()=>{});
