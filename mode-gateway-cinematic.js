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
let observer=null;

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
@media(max-width:520px){#modeGateway .modeGatewayCard>strong,#modeGateway .modeGatewayCard>small,#modeGateway .modeGatewayCard>em{max-width:78%}#modeGateway .modeGatewayCardArt{right:-20px;opacity:.66}#modeGateway .modeGatewayDestArt{right:22px}}
@media(max-width:360px){#modeGateway .modeGatewayCardArt{right:-27px;opacity:.56}#modeGateway .modeGatewayCard>strong,#modeGateway .modeGatewayCard>small,#modeGateway .modeGatewayCard>em{max-width:82%}}
@media(prefers-reduced-motion:reduce){#modeGateway.modeGatewayCinematicReady::before,#modeGateway.modeGatewayCinematicReady::after{transition:none}}
`;
  document.head.append(style);
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
  root.classList.add('modeGatewayCinematicReady');
  return true;
}

function snapshot(){
  const root=document.querySelector('#modeGateway');
  return{
    ready:!!root?.classList.contains('modeGatewayCinematicReady'),
    cards:root?.querySelectorAll('.modeGatewayCardArt').length||0,
    destinations:root?.querySelectorAll('.modeGatewayDestArt').length||0,
    cardKinds:[...root?.querySelectorAll('.modeGatewayCardArt')||[]].map(el=>el.dataset.art),
    destinationKinds:[...root?.querySelectorAll('.modeGatewayDestArt')||[]].map(el=>el.dataset.art)
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