(() => {
'use strict';
if(window.WarpModeGatewayCinematic)return;

const STYLE_ID='modeGatewayCinematicStyle';
const CARD_ART={
  gatewayContinue:'continue',
  gatewayReal:'real',
  gatewayFrontier:'frontier',
  gatewayGallery:'gallery'
};
const DEST_ART={AURELIA:'aurelia',NADIR:'nadir',VESPER:'vesper',EIDOLON:'eidolon'};
const VOYAGE_ART={SOL:'sol',LUNA:'luna',VEGA:'vega',CYG:'cyg',ORION:'orion',TAU:'tau',SIRIUS:'sirius',PROX:'prox'};
let observer=null,recordsObserver=null;

function ensureStyle(){
  if(document.querySelector(`#${STYLE_ID}`))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#modeGateway.modeGatewayCinematicReady{
  background:
    radial-gradient(circle at 83% 10%,rgba(109,142,255,.24),transparent 27%),
    radial-gradient(circle at 18% 74%,rgba(89,206,255,.13),transparent 31%),
    linear-gradient(160deg,#02040a 0%,#071127 54%,#02040a 100%)
}
#modeGateway.modeGatewayCinematicReady::before{
  content:"";position:fixed;z-index:0;left:-15vw;right:-15vw;top:7vh;height:34vh;pointer-events:none;opacity:.42;
  background:
    radial-gradient(circle at 12% 28%,rgba(255,255,255,.72) 0 1px,transparent 1.5px),
    radial-gradient(circle at 32% 62%,rgba(188,220,255,.7) 0 1px,transparent 1.5px),
    radial-gradient(circle at 58% 18%,rgba(255,255,255,.58) 0 1px,transparent 1.4px),
    radial-gradient(circle at 78% 48%,rgba(180,203,255,.78) 0 1px,transparent 1.5px),
    radial-gradient(circle at 92% 25%,rgba(255,255,255,.54) 0 1px,transparent 1.4px);
  background-size:118px 92px,154px 127px,201px 146px,173px 133px,227px 171px
}
#modeGateway.modeGatewayCinematicReady::after{
  content:"";position:fixed;z-index:0;left:50%;top:3vh;width:min(112vw,980px);height:min(46vw,360px);pointer-events:none;
  border:1px solid rgba(154,197,255,.12);border-radius:50%;transform:translateX(-50%) rotate(-7deg);box-shadow:0 0 56px rgba(92,139,255,.08)
}
#modeGateway .modeGatewayCard{position:relative;overflow:hidden;isolation:isolate}
#modeGateway .modeGatewayCard>strong,#modeGateway .modeGatewayCard>small,#modeGateway .modeGatewayCard>em{position:relative;z-index:2;max-width:72%}
#modeGateway .modeGatewayCardArt{position:absolute;z-index:1;right:-8px;top:50%;width:88px;height:88px;transform:translateY(-50%);pointer-events:none;opacity:.86}
#modeGateway .modeGatewayCardArt::before,#modeGateway .modeGatewayCardArt::after{content:"";position:absolute;display:block;box-sizing:border-box}
#modeGateway .modeGatewayCardArt[data-art="continue"]{background:linear-gradient(145deg,transparent 43%,rgba(151,204,255,.13) 44% 46%,transparent 47%)}
#modeGateway .modeGatewayCardArt[data-art="continue"]::before{left:10px;top:55px;width:62px;height:1px;background:linear-gradient(90deg,transparent,#9bd8ff 26%,#dbe8ff 73%,transparent);transform:rotate(-25deg);box-shadow:0 0 10px rgba(127,193,255,.45)}
#modeGateway .modeGatewayCardArt[data-art="continue"]::after{right:15px;top:24px;width:12px;height:12px;border-radius:50%;background:#eaf5ff;box-shadow:-39px 28px 0 -3px #84c8ff,0 0 18px #79b9ff}
#modeGateway .modeGatewayCardArt[data-art="real"]::before{right:7px;top:21px;width:49px;height:49px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#b7e5ff 0 7%,#357db0 19%,#174662 43%,#06111e 69%);box-shadow:-8px 0 18px rgba(93,184,255,.2),0 0 18px rgba(90,178,255,.22)}
#modeGateway .modeGatewayCardArt[data-art="real"]::after{right:0;top:35px;width:76px;height:27px;border:1px solid rgba(167,219,255,.52);border-left-color:transparent;border-radius:50%;transform:rotate(-16deg);box-shadow:0 0 12px rgba(107,187,255,.15)}
#modeGateway .modeGatewayCardArt[data-art="frontier"]::before{right:6px;top:17px;width:63px;height:55px;border:4px solid rgba(209,192,255,.7);border-left-color:rgba(115,126,224,.22);border-radius:50%;transform:rotate(-19deg);box-shadow:0 0 16px rgba(171,136,255,.3),inset 0 0 13px rgba(116,179,255,.14)}
#modeGateway .modeGatewayCardArt[data-art="frontier"]::after{right:27px;top:34px;width:22px;height:22px;border-radius:50%;background:#04060e;box-shadow:0 0 0 2px rgba(228,218,255,.5),0 0 17px rgba(137,108,255,.6)}
#modeGateway .modeGatewayCardArt[data-art="gallery"]::before{right:13px;top:19px;width:54px;height:42px;border:1px solid rgba(183,220,255,.58);border-radius:7px;box-shadow:-10px 10px 0 -1px rgba(104,158,217,.1),-10px 10px 0 0 rgba(165,204,245,.28)}
#modeGateway .modeGatewayCardArt[data-art="gallery"]::after{right:23px;top:29px;width:30px;height:18px;background:linear-gradient(150deg,transparent 46%,rgba(137,206,255,.6) 47% 51%,transparent 52%),radial-gradient(circle at 74% 27%,#e9f6ff 0 2px,transparent 3px);border-bottom:1px solid rgba(155,208,255,.34)}
#modeGateway .modeGatewayDest button{padding-right:84px}
#modeGateway .modeGatewayDestArt{position:absolute;right:24px;top:50%;width:48px;height:48px;transform:translateY(-50%);pointer-events:none;opacity:.86}
#modeGateway .modeGatewayDestArt::before,#modeGateway .modeGatewayDestArt::after{content:"";position:absolute;display:block;box-sizing:border-box}
#modeGateway .modeGatewayDestArt[data-art="aurelia"]::before{inset:9px 2px;border:3px solid rgba(202,229,255,.78);border-radius:50%;transform:rotate(-19deg);box-shadow:0 0 11px rgba(131,191,255,.3)}
#modeGateway .modeGatewayDestArt[data-art="aurelia"]::after{left:20px;top:20px;width:9px;height:9px;border-radius:50%;background:#ceb8ff;box-shadow:0 0 10px #9f84ff}
#modeGateway .modeGatewayDestArt[data-art="nadir"]::before{left:11px;top:11px;width:27px;height:27px;border-radius:50%;background:#010208;box-shadow:0 0 0 2px rgba(225,220,255,.72),0 0 16px rgba(137,104,255,.72)}
#modeGateway .modeGatewayDestArt[data-art="nadir"]::after{left:3px;top:18px;width:43px;height:13px;border:2px solid rgba(222,214,255,.74);border-left-color:transparent;border-radius:50%;transform:rotate(-8deg)}
#modeGateway .modeGatewayDestArt[data-art="vesper"]::before{left:8px;top:8px;width:34px;height:34px;border-radius:50%;background:repeating-linear-gradient(176deg,#90d3c2 0 5px,#356f72 6px 9px,#223e55 10px 14px);box-shadow:inset -8px -4px 12px rgba(0,0,0,.46),0 0 13px rgba(90,213,190,.2)}
#modeGateway .modeGatewayDestArt[data-art="vesper"]::after{left:1px;top:20px;width:47px;height:10px;border:1px solid rgba(176,244,225,.66);border-left-color:transparent;border-radius:50%;transform:rotate(11deg)}
#modeGateway .modeGatewayDestArt[data-art="eidolon"]::before{left:4px;top:7px;width:39px;height:34px;border:2px dashed rgba(222,204,255,.72);border-radius:50%;transform:rotate(-26deg);box-shadow:0 0 12px rgba(163,119,220,.2)}
#modeGateway .modeGatewayDestArt[data-art="eidolon"]::after{left:14px;top:5px;width:22px;height:40px;border:1px dashed rgba(180,139,238,.58);border-radius:50%;transform:rotate(32deg)}

/* Gallery Voyage Postcards v2: turn real journey receipts into scenic records without new data authority. */
#modeGateway .modeGatewayJourney.cinematicVoyage{position:relative;min-height:118px;padding-right:112px;overflow:hidden;isolation:isolate;background:linear-gradient(105deg,rgba(120,175,255,.06),rgba(7,12,24,.88) 62%,rgba(4,8,17,.96))}
#modeGateway .modeGatewayJourney.cinematicVoyage::before{content:"";position:absolute;z-index:0;right:0;top:0;width:43%;height:100%;pointer-events:none;background:linear-gradient(90deg,rgba(4,8,17,0),rgba(4,8,17,.08) 22%,rgba(4,8,17,.42))}
#modeGateway .modeGatewayJourney.cinematicVoyage>.modeGatewayJourneyTop,#modeGateway .modeGatewayJourney.cinematicVoyage>.modeGatewayJourneyRoute,#modeGateway .modeGatewayJourney.cinematicVoyage>.modeGatewayJourneyMeta,#modeGateway .modeGatewayJourney.cinematicVoyage>.modeGatewayJourneyOutcome,#modeGateway .modeGatewayJourney.cinematicVoyage>.modeGatewayRevisit{position:relative;z-index:2}
#modeGateway .modeGatewayJourney.cinematicVoyage>.modeGatewayRevisit{max-width:100%}
#modeGateway .modeGatewayVoyageArt{position:absolute;z-index:1;right:3px;top:50%;width:104px;height:96px;transform:translateY(-50%);pointer-events:none;opacity:.9;overflow:hidden;border-radius:20px}
#modeGateway .modeGatewayVoyageArt::before,#modeGateway .modeGatewayVoyageArt::after{content:"";position:absolute;display:block;box-sizing:border-box}
#modeGateway .modeGatewayVoyageArt[data-system="sol"]{background:radial-gradient(circle at 66% 44%,rgba(64,149,211,.42),transparent 36%),radial-gradient(circle at 82% 15%,rgba(255,255,255,.65) 0 1px,transparent 1.6px)}
#modeGateway .modeGatewayVoyageArt[data-system="sol"]::before{right:14px;top:17px;width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 36% 30%,#b9ebff 0 7%,#378cc1 18%,#1f6b70 37%,#14384e 55%,#07111d 75%);box-shadow:-6px 0 20px rgba(105,201,255,.32),0 0 0 1px rgba(174,224,255,.22)}
#modeGateway .modeGatewayVoyageArt[data-system="sol"]::after{right:3px;top:36px;width:89px;height:25px;border:1px solid rgba(174,222,255,.52);border-left-color:transparent;border-radius:50%;transform:rotate(-14deg)}
#modeGateway .modeGatewayVoyageArt[data-system="luna"]{background:radial-gradient(circle at 28% 17%,rgba(125,187,255,.32) 0 5px,transparent 6px)}
#modeGateway .modeGatewayVoyageArt[data-system="luna"]::before{right:7px;bottom:7px;width:72px;height:72px;border-radius:50%;background:radial-gradient(circle at 37% 28%,#c9ced4 0 8%,#8a929c 9% 21%,#5d6570 22% 34%,#343b45 48%,#171d26 72%);box-shadow:-7px -3px 17px rgba(207,221,236,.18)}
#modeGateway .modeGatewayVoyageArt[data-system="luna"]::after{left:19px;top:12px;width:17px;height:17px;border-radius:50%;background:linear-gradient(145deg,#79bff4,#183e68);box-shadow:0 0 12px rgba(110,190,255,.36)}
#modeGateway .modeGatewayVoyageArt[data-system="vega"]::before{right:9px;top:12px;width:72px;height:72px;border:4px solid rgba(179,223,255,.78);border-left-color:rgba(81,120,190,.18);border-radius:50%;transform:rotate(-18deg);box-shadow:0 0 17px rgba(91,182,255,.34),inset 0 0 15px rgba(119,198,255,.2)}
#modeGateway .modeGatewayVoyageArt[data-system="vega"]::after{right:32px;top:35px;width:24px;height:24px;border-radius:50%;background:#d8f4ff;box-shadow:0 0 20px #8fdfff}
#modeGateway .modeGatewayVoyageArt[data-system="cyg"]::before{left:13px;top:23px;width:23px;height:23px;border-radius:50%;background:#d8efff;box-shadow:0 0 19px #72c2ff,47px 24px 0 -4px #c5a6ff,47px 24px 16px -2px rgba(174,127,255,.65)}
#modeGateway .modeGatewayVoyageArt[data-system="cyg"]::after{right:8px;top:12px;width:58px;height:70px;border:1px solid rgba(166,214,255,.48);border-radius:50%;transform:rotate(31deg)}
#modeGateway .modeGatewayVoyageArt[data-system="orion"]{background:radial-gradient(circle at 78% 35%,rgba(245,106,74,.22),transparent 43%),linear-gradient(155deg,transparent 46%,rgba(190,78,106,.14) 48% 53%,transparent 55%)}
#modeGateway .modeGatewayVoyageArt[data-system="orion"]::before{right:13px;top:17px;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#ffd2a0 0 5%,#e16f48 21%,#8d302c 48%,#38141b 72%);box-shadow:0 0 22px rgba(239,92,60,.52)}
#modeGateway .modeGatewayVoyageArt[data-system="orion"]::after{left:6px;bottom:11px;width:76px;height:20px;border-top:1px solid rgba(255,158,143,.36);border-radius:50%;transform:rotate(-9deg)}
#modeGateway .modeGatewayVoyageArt[data-system="tau"]::before{right:11px;top:19px;width:60px;height:60px;border-radius:50%;background:repeating-linear-gradient(174deg,#d6b690 0 7px,#8f6e65 8px 12px,#4d4458 13px 18px);box-shadow:inset -13px -4px 18px rgba(0,0,0,.42),0 0 18px rgba(201,155,255,.14)}
#modeGateway .modeGatewayVoyageArt[data-system="tau"]::after{right:-3px;top:35px;width:99px;height:27px;border:2px solid rgba(221,190,245,.7);border-left-color:transparent;border-radius:50%;transform:rotate(10deg);box-shadow:0 0 11px rgba(190,141,235,.18)}
#modeGateway .modeGatewayVoyageArt[data-system="sirius"]::before{left:13px;top:18px;width:27px;height:27px;border-radius:50%;background:#e8f7ff;box-shadow:0 0 21px #8cd5ff,47px 24px 0 -8px #c5ddff,47px 24px 14px -5px rgba(150,199,255,.54)}
#modeGateway .modeGatewayVoyageArt[data-system="sirius"]::after{right:1px;top:26px;width:74px;height:42px;border:2px solid rgba(174,219,255,.62);border-radius:50%;transform:rotate(-18deg);box-shadow:0 0 13px rgba(97,177,255,.22)}
#modeGateway .modeGatewayVoyageArt[data-system="prox"]{background:linear-gradient(150deg,transparent 50%,rgba(255,94,54,.08) 52% 56%,transparent 58%)}
#modeGateway .modeGatewayVoyageArt[data-system="prox"]::before{left:9px;top:18px;width:49px;height:49px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#ffd0a0 0 5%,#d74b35 19%,#791f28 49%,#2c0f1a 73%);box-shadow:0 0 20px rgba(222,61,48,.43)}
#modeGateway .modeGatewayVoyageArt[data-system="prox"]::after{right:4px;top:24px;width:50px;height:49px;border:2px solid rgba(138,209,255,.65);border-left-color:transparent;border-radius:12px 50% 50% 14px;transform:rotate(-10deg);box-shadow:0 0 10px rgba(103,183,255,.18)}
#modeGateway .modeGatewayJourney.cinematicVoyage[data-cinematic-system="TAU"]{border-color:rgba(210,176,240,.18)}
#modeGateway .modeGatewayJourney.cinematicVoyage[data-cinematic-system="ORION"],#modeGateway .modeGatewayJourney.cinematicVoyage[data-cinematic-system="PROX"]{border-color:rgba(236,124,101,.16)}
#modeGateway .modeGatewayJourney.cinematicVoyage[data-cinematic-system="SOL"],#modeGateway .modeGatewayJourney.cinematicVoyage[data-cinematic-system="SIRIUS"],#modeGateway .modeGatewayJourney.cinematicVoyage[data-cinematic-system="CYG"],#modeGateway .modeGatewayJourney.cinematicVoyage[data-cinematic-system="VEGA"]{border-color:rgba(132,197,255,.16)}

@media(max-width:520px){#modeGateway .modeGatewayCard>strong,#modeGateway .modeGatewayCard>small,#modeGateway .modeGatewayCard>em{max-width:78%}#modeGateway .modeGatewayCardArt{right:-20px;opacity:.66}#modeGateway .modeGatewayDestArt{right:22px}#modeGateway .modeGatewayJourney.cinematicVoyage{padding-right:99px}#modeGateway .modeGatewayVoyageArt{width:92px;opacity:.82}}
@media(max-width:360px){#modeGateway .modeGatewayCardArt{right:-27px;opacity:.56}#modeGateway .modeGatewayCard>strong,#modeGateway .modeGatewayCard>small,#modeGateway .modeGatewayCard>em{max-width:82%}#modeGateway .modeGatewayJourney.cinematicVoyage{padding-right:92px}#modeGateway .modeGatewayVoyageArt{right:-2px;width:88px;opacity:.76}}
@media(prefers-reduced-motion:reduce){#modeGateway.modeGatewayCinematicReady::before,#modeGateway.modeGatewayCinematicReady::after{transition:none}}
`;
  document.head.append(style);
}

function decorateVoyages(root=document.querySelector('#modeGateway')){
  const host=root?.querySelector('#modeGatewayJourneyList');
  if(!host)return 0;
  let count=0;
  for(const card of host.querySelectorAll('.modeGatewayJourney')){
    const id=card.querySelector('[data-revisit]')?.dataset.revisit||'';
    const art=VOYAGE_ART[id];
    if(!art)continue;
    card.classList.add('cinematicVoyage');
    card.dataset.cinematicSystem=id;
    let visual=card.querySelector('.modeGatewayVoyageArt');
    if(!visual){
      visual=document.createElement('span');
      visual.className='modeGatewayVoyageArt';
      visual.setAttribute('aria-hidden','true');
      card.append(visual);
    }
    visual.dataset.system=art;
    count++;
  }
  return count;
}

function watchVoyages(root){
  const host=root?.querySelector('#modeGatewayJourneyList');
  if(!host||recordsObserver)return;
  recordsObserver=new MutationObserver(()=>decorateVoyages(root));
  recordsObserver.observe(host,{childList:true});
}

function decorate(){
  const root=document.querySelector('#modeGateway');
  if(!root)return false;
  ensureStyle();
  for(const [id,art] of Object.entries(CARD_ART)){
    const card=root.querySelector(`#${id}`);
    if(!card)continue;
    card.dataset.cinematic=art;
    if(!card.querySelector('.modeGatewayCardArt')){
      const visual=document.createElement('span');visual.className='modeGatewayCardArt';visual.dataset.art=art;visual.setAttribute('aria-hidden','true');card.append(visual);
    }
  }
  for(const [id,art] of Object.entries(DEST_ART)){
    const button=root.querySelector(`.modeGatewayDest [data-dest="${id}"]`);
    if(!button)continue;
    button.dataset.cinematic=art;
    if(!button.querySelector('.modeGatewayDestArt')){
      const visual=document.createElement('span');visual.className='modeGatewayDestArt';visual.dataset.art=art;visual.setAttribute('aria-hidden','true');button.append(visual);
    }
  }
  decorateVoyages(root);
  watchVoyages(root);
  root.classList.add('modeGatewayCinematicReady');
  return true;
}

function snapshot(){
  const root=document.querySelector('#modeGateway');
  return{
    ready:!!root?.classList.contains('modeGatewayCinematicReady'),
    cards:root?.querySelectorAll('.modeGatewayCardArt').length||0,
    destinations:root?.querySelectorAll('.modeGatewayDestArt').length||0,
    voyages:root?.querySelectorAll('.modeGatewayJourney.cinematicVoyage').length||0,
    cardKinds:[...root?.querySelectorAll('.modeGatewayCardArt')||[]].map(el=>el.dataset.art),
    destinationKinds:[...root?.querySelectorAll('.modeGatewayDestArt')||[]].map(el=>el.dataset.art),
    voyageKinds:[...root?.querySelectorAll('.modeGatewayVoyageArt')||[]].map(el=>el.dataset.system)
  };
}

function boot(){
  if(decorate())return;
  observer=new MutationObserver(()=>{if(decorate()){observer?.disconnect();observer=null}});
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

window.WarpModeGatewayCinematic={refresh:decorate,snapshot};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();