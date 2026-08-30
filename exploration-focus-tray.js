(() => {
'use strict';

const STYLE_ID='explorationFocusTrayStyle';
if(!document.querySelector(`#${STYLE_ID}`)){
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
@media (max-width:899px){
  #app.exploreHubMobile #openPanel,
  #app.exploreHubMobile #telemetry{
    display:none
  }
  #app.exploreHubMobile #exploreCard:not(.transit)[data-hub-pane="explore"]{
    left:calc(var(--safeL) + 10px);right:calc(var(--safeR) + 10px);
    bottom:calc(var(--safeB) + 8px);width:auto;max-height:min(42vh,360px);
    border-radius:18px;transform:translateY(calc(100% + var(--safeB) + 30px));
    scroll-padding-bottom:18px;transition:opacity .16s ease,transform .22s cubic-bezier(.2,.8,.2,1)
  }
  #app.exploreHubMobile #exploreCard:not(.transit)[data-hub-pane="explore"].hubOpen{
    transform:none
  }
  #app.exploreHubMobile #exploreCard:not(.transit)[data-hub-pane="explore"] #exploreDesc{
    display:none!important
  }
  #app.exploreHubMobile #exploreCard:not(.transit)[data-hub-pane="explore"] .exploreBody{
    padding-bottom:4px
  }
}
@media (max-width:360px){
  #app.exploreHubMobile #exploreCard:not(.transit)[data-hub-pane="explore"]{
    left:calc(var(--safeL) + 8px);right:calc(var(--safeR) + 8px);max-height:min(44vh,352px)
  }
}
@media (prefers-reduced-motion:reduce){
  #app.exploreHubMobile #exploreCard:not(.transit)[data-hub-pane="explore"]{transition:none}
}
`;
  document.head.append(style);
}

function active(){
  const app=document.querySelector('#app');
  const card=document.querySelector('#exploreCard');
  return !!app&&!!card&&app.classList.contains('exploreHubMobile')&&card.classList.contains('hubOpen')&&card.dataset.hubPane==='explore';
}

window.WarpExplorationFocusTray={active};
import('./atlas-constellation.js').catch(()=>{});
import('./cinematic-quality.js').then(()=>import('./cyg-cinematic-quality.js')).catch(()=>{});
import('./route-scenic-preview.js').catch(()=>{});
})();