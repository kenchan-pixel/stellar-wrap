(() => {
'use strict';

const SAMPLE_MS=250;
const PROFILES=Object.freeze({
  SOL:{name:'地球近軌',corridor:'地月返航域',signature:'藍色母港 · 近地軌道光帶'},
  LUNA:{name:'月環基地',corridor:'月環轉移走廊',signature:'灰白月域 · 地球反照'},
  VEGA:{name:'織女星門',corridor:'藍白星門航道',signature:'電離塵霧 · 星門進近'},
  CYG:{name:'天鵝航標',corridor:'雙星航標帶',signature:'藍紫雙星 · 航標陣列'},
  ORION:{name:'獵戶前哨',corridor:'赤紅星雲前緣',signature:'紅巨星光 · 發射塵雲'},
  TAU:{name:'金牛塵海',corridor:'粉紫塵海航路',signature:'環行星 · 高密度塵帶'},
  SIRIUS:{name:'天狼中繼站',corridor:'冰藍中繼航道',signature:'雙星光場 · 冰質碎片'},
  PROX:{name:'比鄰星港',corridor:'赤矮星港邊界',signature:'紅矮星風 · 熔岩航標'}
});
const IDS=new Set(Object.keys(PROFILES));
const PHASES=new Set(['turn','accelerate','warpEntry','warp','warpExit','decelerate','approach','observe']);
let lastLegKey='',lastPhase='';
let lastSnapshot={active:false,from:null,to:null,phase:null,leg:0,total:0};

function ensureStyle(){
  if(document.querySelector('#journeyAtmosphereStyle'))return;
  const style=document.createElement('style');
  style.id='journeyAtmosphereStyle';
  style.textContent=`
#app.journeyAtmosphereActive[data-journey-system="SOL"]{--journey-rgb:108,184,255;--journey-alt-rgb:181,222,255}
#app.journeyAtmosphereActive[data-journey-system="LUNA"]{--journey-rgb:205,221,244;--journey-alt-rgb:132,166,210}
#app.journeyAtmosphereActive[data-journey-system="VEGA"]{--journey-rgb:111,203,255;--journey-alt-rgb:205,241,255}
#app.journeyAtmosphereActive[data-journey-system="CYG"]{--journey-rgb:170,137,255;--journey-alt-rgb:91,194,255}
#app.journeyAtmosphereActive[data-journey-system="ORION"]{--journey-rgb:255,126,82;--journey-alt-rgb:255,194,119}
#app.journeyAtmosphereActive[data-journey-system="TAU"]{--journey-rgb:239,107,198;--journey-alt-rgb:178,105,255}
#app.journeyAtmosphereActive[data-journey-system="SIRIUS"]{--journey-rgb:132,216,255;--journey-alt-rgb:221,245,255}
#app.journeyAtmosphereActive[data-journey-system="PROX"]{--journey-rgb:255,99,72;--journey-alt-rgb:255,166,91}
#journeyAtmosphere{position:absolute;z-index:3;inset:0;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .28s ease;contain:layout paint style}
#journeyAtmosphere .journeyMedium,#journeyAtmosphere .journeyTrace{position:absolute;inset:-5%;pointer-events:none}
#journeyAtmosphere .journeyMedium{background:radial-gradient(ellipse at center,transparent 34%,rgba(var(--journey-rgb),.045) 58%,rgba(var(--journey-rgb),.22) 100%),linear-gradient(118deg,rgba(var(--journey-alt-rgb),.055),transparent 38% 64%,rgba(var(--journey-rgb),.07))}
#journeyAtmosphere .journeyTrace{opacity:.8;background:linear-gradient(90deg,rgba(var(--journey-rgb),.12),transparent 16% 84%,rgba(var(--journey-alt-rgb),.1))}
#journeyAtmosphere[data-phase="turn"]{opacity:.16}
#journeyAtmosphere[data-phase="accelerate"]{opacity:.28}
#journeyAtmosphere[data-phase="warpEntry"]{opacity:.72}
#journeyAtmosphere[data-phase="warp"]{opacity:1}
#journeyAtmosphere[data-phase="warpExit"]{opacity:.88}
#journeyAtmosphere[data-phase="decelerate"]{opacity:.66}
#journeyAtmosphere[data-phase="approach"]{opacity:.46}
#journeyAtmosphere[data-phase="observe"]{opacity:.22}
#journeyAtmosphere[data-system="VEGA"] .journeyTrace{background:repeating-radial-gradient(circle at 50% 50%,transparent 0 13%,rgba(var(--journey-rgb),.075) 13.4%,transparent 14.2% 27%)}
#journeyAtmosphere[data-system="CYG"] .journeyTrace{background:linear-gradient(112deg,rgba(var(--journey-alt-rgb),.16),transparent 34% 66%,rgba(var(--journey-rgb),.15))}
#journeyAtmosphere[data-system="ORION"] .journeyTrace{background:radial-gradient(circle at 12% 30%,rgba(var(--journey-rgb),.16),transparent 34%),radial-gradient(circle at 88% 72%,rgba(var(--journey-alt-rgb),.11),transparent 38%)}
#journeyAtmosphere[data-system="TAU"] .journeyTrace{background:radial-gradient(ellipse at 20% 64%,rgba(var(--journey-rgb),.16),transparent 36%),radial-gradient(ellipse at 83% 32%,rgba(var(--journey-alt-rgb),.13),transparent 42%)}
#journeyAtmosphere[data-system="SIRIUS"] .journeyTrace{background:linear-gradient(68deg,transparent 0 22%,rgba(var(--journey-alt-rgb),.07) 23%,transparent 24% 63%,rgba(var(--journey-rgb),.08) 64%,transparent 65%)}
#journeyAtmosphere[data-system="PROX"] .journeyTrace{background:radial-gradient(circle at 50% 118%,rgba(var(--journey-rgb),.2),transparent 48%),linear-gradient(90deg,rgba(var(--journey-alt-rgb),.08),transparent 20% 80%,rgba(var(--journey-rgb),.1))}
#journeyVista{position:absolute;inset:0;opacity:0;transform:scale(.94);transform-origin:center;transition:opacity .58s ease,transform .82s cubic-bezier(.2,.7,.2,1);pointer-events:none}
#journeyVista .journeyVistaPrimary,#journeyVista .journeyVistaSecondary{position:absolute;display:block;border-radius:50%;opacity:.92;transition:transform .82s cubic-bezier(.2,.7,.2,1),opacity .58s ease}
#journeyVista .journeyVistaPrimary{width:clamp(110px,34vw,280px);height:clamp(110px,34vw,280px);right:-8vw;top:15vh}
#journeyVista .journeyVistaSecondary{width:clamp(34px,10vw,82px);height:clamp(34px,10vw,82px);right:22vw;top:55vh}
#journeyAtmosphere[data-phase="warpExit"] #journeyVista{opacity:.22;transform:scale(.84)}
#journeyAtmosphere[data-phase="decelerate"] #journeyVista{opacity:.42;transform:scale(.92)}
#journeyAtmosphere[data-phase="approach"] #journeyVista{opacity:.72;transform:scale(1)}
#journeyAtmosphere[data-phase="observe"] #journeyVista{opacity:0;transform:scale(1.04)}
#journeyAtmosphere[data-system="SOL"] .journeyVistaPrimary{background:radial-gradient(circle at 35% 31%,rgba(255,255,255,.72) 0 2%,transparent 3%),radial-gradient(circle at 43% 42%,rgba(83,188,255,.95) 0 32%,rgba(28,93,180,.82) 54%,rgba(5,19,54,.52) 70%,transparent 72%);box-shadow:0 0 38px rgba(72,170,255,.24)}
#journeyAtmosphere[data-system="SOL"] .journeyVistaSecondary{background:radial-gradient(circle at 38% 34%,rgba(235,241,250,.95) 0 32%,rgba(115,132,154,.74) 58%,transparent 61%)}
#journeyAtmosphere[data-system="LUNA"] .journeyVistaPrimary{left:-8vw;right:auto;top:18vh;background:radial-gradient(circle at 36% 30%,rgba(255,255,255,.34) 0 4%,transparent 5%),radial-gradient(circle at 66% 58%,rgba(55,63,78,.22) 0 7%,transparent 8%),radial-gradient(circle at 44% 44%,rgba(222,230,242,.95) 0 38%,rgba(112,126,150,.72) 63%,rgba(21,27,41,.3) 70%,transparent 72%)}
#journeyAtmosphere[data-system="LUNA"] .journeyVistaSecondary{left:25vw;right:auto;top:56vh;background:radial-gradient(circle at 42% 40%,rgba(90,190,255,.92) 0 30%,rgba(40,96,170,.68) 55%,transparent 59%)}
#journeyAtmosphere[data-system="VEGA"] .journeyVistaPrimary{background:radial-gradient(circle at center,transparent 0 43%,rgba(var(--journey-alt-rgb),.18) 44% 47%,transparent 48% 57%,rgba(var(--journey-rgb),.58) 58% 60%,transparent 61%);box-shadow:inset 0 0 18px rgba(var(--journey-rgb),.16),0 0 26px rgba(var(--journey-rgb),.16)}
#journeyAtmosphere[data-system="VEGA"] .journeyVistaSecondary{background:radial-gradient(circle,rgba(255,255,255,.96) 0 4%,rgba(var(--journey-alt-rgb),.8) 7%,rgba(var(--journey-rgb),.2) 27%,transparent 54%)}
#journeyAtmosphere[data-system="CYG"] .journeyVistaPrimary{left:-9vw;right:auto;top:16vh;width:clamp(92px,28vw,230px);height:clamp(92px,28vw,230px);background:radial-gradient(circle,rgba(255,255,255,.92) 0 3%,rgba(var(--journey-alt-rgb),.8) 6%,rgba(var(--journey-alt-rgb),.18) 28%,transparent 58%)}
#journeyAtmosphere[data-system="CYG"] .journeyVistaSecondary{left:20vw;right:auto;top:45vh;width:clamp(70px,21vw,170px);height:clamp(70px,21vw,170px);background:radial-gradient(circle,rgba(255,255,255,.86) 0 3%,rgba(var(--journey-rgb),.78) 7%,rgba(var(--journey-rgb),.18) 31%,transparent 60%)}
#journeyAtmosphere[data-system="ORION"] .journeyVistaPrimary{right:-10vw;top:12vh;background:radial-gradient(circle at 45% 43%,rgba(255,232,184,.86) 0 9%,rgba(var(--journey-alt-rgb),.78) 18%,rgba(var(--journey-rgb),.52) 40%,rgba(var(--journey-rgb),.12) 66%,transparent 72%)}
#journeyAtmosphere[data-system="ORION"] .journeyVistaSecondary{right:20vw;top:59vh;width:clamp(80px,23vw,190px);height:clamp(58px,17vw,140px);border-radius:48% 52% 57% 43%;background:radial-gradient(ellipse at 35% 50%,rgba(var(--journey-rgb),.18),transparent 55%),radial-gradient(ellipse at 70% 42%,rgba(var(--journey-alt-rgb),.12),transparent 58%)}
#journeyAtmosphere[data-system="TAU"] .journeyVistaPrimary{left:-8vw;right:auto;top:16vh;background:radial-gradient(circle at 38% 35%,rgba(255,225,248,.38) 0 5%,transparent 6%),radial-gradient(circle at center,rgba(223,144,226,.88) 0 34%,rgba(113,74,169,.68) 58%,rgba(35,24,68,.34) 70%,transparent 72%)}
#journeyAtmosphere[data-system="TAU"] .journeyVistaPrimary::before{content:"";position:absolute;left:-20%;top:30%;width:140%;height:36%;border:1px solid rgba(var(--journey-alt-rgb),.7);border-radius:50%;transform:rotate(-16deg);box-shadow:0 0 9px rgba(var(--journey-rgb),.18)}
#journeyAtmosphere[data-system="TAU"] .journeyVistaSecondary{left:26vw;right:auto;top:58vh;background:radial-gradient(circle,rgba(232,218,244,.86) 0 34%,rgba(118,102,145,.6) 58%,transparent 61%)}
#journeyAtmosphere[data-system="SIRIUS"] .journeyVistaPrimary{right:-9vw;top:15vh;width:clamp(92px,28vw,230px);height:clamp(92px,28vw,230px);background:radial-gradient(circle,rgba(255,255,255,.98) 0 4%,rgba(var(--journey-alt-rgb),.84) 8%,rgba(var(--journey-rgb),.18) 31%,transparent 60%)}
#journeyAtmosphere[data-system="SIRIUS"] .journeyVistaSecondary{right:22vw;top:52vh;width:clamp(76px,22vw,180px);height:clamp(76px,22vw,180px);background:radial-gradient(circle at center,transparent 0 42%,rgba(var(--journey-alt-rgb),.55) 43% 46%,transparent 47%);box-shadow:inset 0 0 12px rgba(var(--journey-rgb),.12)}
#journeyAtmosphere[data-system="PROX"] .journeyVistaPrimary{left:-9vw;right:auto;top:14vh;background:radial-gradient(circle,rgba(255,221,168,.86) 0 8%,rgba(var(--journey-alt-rgb),.68) 18%,rgba(var(--journey-rgb),.46) 42%,rgba(var(--journey-rgb),.1) 66%,transparent 72%)}
#journeyAtmosphere[data-system="PROX"] .journeyVistaSecondary{left:25vw;right:auto;top:58vh;background:radial-gradient(circle at 37% 34%,rgba(255,199,111,.72) 0 6%,rgba(112,34,26,.88) 24%,rgba(41,13,17,.8) 56%,transparent 60%);box-shadow:0 0 12px rgba(var(--journey-rgb),.18)}
#app.journeyAtmosphereActive #warpHalo{border-color:rgba(var(--journey-rgb),.88);box-shadow:0 0 22px rgba(var(--journey-rgb),.86),0 0 70px rgba(var(--journey-alt-rgb),.46),inset 0 0 28px rgba(var(--journey-alt-rgb),.38)}
#app.journeyAtmosphereActive #warpEdge{background:radial-gradient(ellipse at center,transparent 30%,rgba(var(--journey-alt-rgb),.07) 55%,rgba(var(--journey-rgb),.4) 100%)}
#app.journeyAtmosphereActive #warpFlash{background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.98) 0,rgba(var(--journey-alt-rgb),.9) 7%,rgba(var(--journey-rgb),.34) 24%,rgba(var(--journey-rgb),.08) 46%,transparent 68%)}
#journeyRegion{position:absolute;z-index:5;top:calc(var(--safeT) + 78px);left:var(--safeL);max-width:min(62vw,245px);padding:6px 8px 6px 9px;border-left:1px solid rgba(var(--journey-rgb),.5);background:linear-gradient(90deg,rgba(3,7,15,.62),rgba(3,7,15,.18),transparent);text-shadow:0 2px 12px #000;pointer-events:none;opacity:0;transform:translateY(-3px);transition:opacity .2s ease,transform .2s ease}
#journeyRegion.show{opacity:1;transform:none}
#journeyRegion .journeyRegionKicker{font-size:7px;letter-spacing:.12em;font-weight:850;color:rgba(var(--journey-alt-rgb),.82);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#journeyRegion .journeyRegionTitle{margin-top:2px;font-size:9px;line-height:1.3;font-weight:760;color:#f5f9ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#journeyRegion .journeyRegionMeta{margin-top:2px;font-size:7px;line-height:1.3;color:rgba(229,239,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:430px){#journeyVista .journeyVistaPrimary{top:18vh}#journeyVista .journeyVistaSecondary{top:57vh}#journeyAtmosphere[data-phase="approach"] #journeyVista{opacity:.64}}
@media (min-width:900px){#journeyRegion{top:calc(max(16px,var(--safeT)) + 94px);left:max(18px,var(--safeL));max-width:min(30vw,360px);padding:8px 10px}#journeyRegion .journeyRegionKicker{font-size:var(--ui-xs,11px)}#journeyRegion .journeyRegionTitle{font-size:var(--ui-sm,12px)}#journeyRegion .journeyRegionMeta{font-size:var(--ui-xs,11px)}}
@media (prefers-reduced-motion:reduce){#journeyAtmosphere,#journeyRegion,#journeyVista,#journeyVista .journeyVistaPrimary,#journeyVista .journeyVistaSecondary{transition:none}}
`;
  document.head.append(style);
}

function ensureUi(){
  ensureStyle();
  const app=document.querySelector('#app');
  if(!app)return null;
  let atmosphere=document.querySelector('#journeyAtmosphere');
  if(!atmosphere){
    atmosphere=document.createElement('div');
    atmosphere.id='journeyAtmosphere';
    atmosphere.setAttribute('aria-hidden','true');
    const medium=document.createElement('div');medium.className='journeyMedium';
    const trace=document.createElement('div');trace.className='journeyTrace';
    atmosphere.append(medium,trace);
    const warp=document.querySelector('#warpFx');
    if(warp?.parentElement===app)app.insertBefore(atmosphere,warp);else app.append(atmosphere);
  }
  let vista=atmosphere.querySelector('#journeyVista');
  if(!vista){
    vista=document.createElement('div');
    vista.id='journeyVista';
    vista.className='journeyVista';
    vista.setAttribute('aria-hidden','true');
    const primary=document.createElement('span');primary.className='journeyVistaPrimary';
    const secondary=document.createElement('span');secondary.className='journeyVistaSecondary';
    vista.append(primary,secondary);
    atmosphere.append(vista);
  }
  let region=document.querySelector('#journeyRegion');
  if(!region){
    region=document.createElement('div');
    region.id='journeyRegion';
    region.setAttribute('role','status');
    region.setAttribute('aria-live','polite');
    region.innerHTML='<div id="journeyRegionKicker" class="journeyRegionKicker"></div><div id="journeyRegionTitle" class="journeyRegionTitle"></div><div id="journeyRegionMeta" class="journeyRegionMeta"></div>';
    app.append(region);
  }
  return{app,atmosphere,vista,region};
}

function activeLeg(state){
  if(!state?.flying||state.contextLost||!Array.isArray(state.route)||state.route.length<2)return null;
  const route=state.route;
  if(route.some(id=>!IDS.has(id)))return null;
  const from=IDS.has(state.current)?state.current:route[0];
  const index=route.indexOf(from);
  if(index<0||index>=route.length-1)return null;
  return{from,to:route[index+1],index:index+1,total:route.length-1};
}

function hide(){
  const app=document.querySelector('#app'),atmosphere=document.querySelector('#journeyAtmosphere'),vista=document.querySelector('#journeyVista'),region=document.querySelector('#journeyRegion');
  app?.classList.remove('journeyAtmosphereActive');
  app?.removeAttribute('data-journey-system');
  atmosphere?.removeAttribute('data-system');atmosphere?.removeAttribute('data-phase');
  vista?.removeAttribute('data-vista-system');
  region?.classList.remove('show');
  lastLegKey='';lastPhase='';
  lastSnapshot={active:false,from:null,to:null,phase:null,leg:0,total:0};
}

function render(state){
  const leg=activeLeg(state);
  if(!leg){hide();return false}
  const ui=ensureUi(),profile=PROFILES[leg.to];
  if(!ui||!profile){hide();return false}
  const phase=PHASES.has(state.phase)?state.phase:'turn';
  const legKey=`${leg.from}>${leg.to}:${leg.index}/${leg.total}`;
  if(lastLegKey!==legKey){
    ui.app.classList.add('journeyAtmosphereActive');
    ui.app.setAttribute('data-journey-system',leg.to);
    ui.atmosphere.setAttribute('data-system',leg.to);
    ui.vista.setAttribute('data-vista-system',leg.to);
    ui.region.classList.add('show');
    const kicker=document.querySelector('#journeyRegionKicker'),title=document.querySelector('#journeyRegionTitle'),meta=document.querySelector('#journeyRegionMeta');
    if(kicker)kicker.textContent='航區識別 · '+profile.corridor;
    if(title)title.textContent=profile.signature;
    if(meta)meta.textContent=`${PROFILES[leg.from]?.name||leg.from} → ${profile.name} · ${leg.index}/${leg.total} 航段`;
    lastLegKey=legKey;
  }
  if(lastPhase!==phase){ui.atmosphere.setAttribute('data-phase',phase);lastPhase=phase}
  lastSnapshot={active:true,from:leg.from,to:leg.to,phase,leg:leg.index,total:leg.total,corridor:profile.corridor,signature:profile.signature};
  return true;
}

function sample(){
  const api=window.WarpSim;
  if(!api||typeof api.state!=='function'){hide();return false}
  let state;try{state=api.state()}catch{hide();return false}
  return render(state);
}

ensureUi();sample();
const timer=setInterval(sample,SAMPLE_MS);timer?.unref?.();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sample()});
window.WarpJourneyAtmosphere={
  render(){return sample()},
  snapshot(){return{...lastSnapshot}},
  profiles(){return Object.fromEntries(Object.entries(PROFILES).map(([id,profile])=>[id,{...profile}]))}
};
})();
