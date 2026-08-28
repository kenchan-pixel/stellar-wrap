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
#app.journeyAtmosphereActive #warpHalo{border-color:rgba(var(--journey-rgb),.88);box-shadow:0 0 22px rgba(var(--journey-rgb),.86),0 0 70px rgba(var(--journey-alt-rgb),.46),inset 0 0 28px rgba(var(--journey-alt-rgb),.38)}
#app.journeyAtmosphereActive #warpEdge{background:radial-gradient(ellipse at center,transparent 30%,rgba(var(--journey-alt-rgb),.07) 55%,rgba(var(--journey-rgb),.4) 100%)}
#app.journeyAtmosphereActive #warpFlash{background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.98) 0,rgba(var(--journey-alt-rgb),.9) 7%,rgba(var(--journey-rgb),.34) 24%,rgba(var(--journey-rgb),.08) 46%,transparent 68%)}
#journeyRegion{position:absolute;z-index:5;top:calc(var(--safeT) + 78px);left:var(--safeL);max-width:min(62vw,245px);padding:6px 8px 6px 9px;border-left:1px solid rgba(var(--journey-rgb),.5);background:linear-gradient(90deg,rgba(3,7,15,.62),rgba(3,7,15,.18),transparent);text-shadow:0 2px 12px #000;pointer-events:none;opacity:0;transform:translateY(-3px);transition:opacity .2s ease,transform .2s ease}
#journeyRegion.show{opacity:1;transform:none}
#journeyRegion .journeyRegionKicker{font-size:7px;letter-spacing:.12em;font-weight:850;color:rgba(var(--journey-alt-rgb),.82);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#journeyRegion .journeyRegionTitle{margin-top:2px;font-size:9px;line-height:1.3;font-weight:760;color:#f5f9ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#journeyRegion .journeyRegionMeta{margin-top:2px;font-size:7px;line-height:1.3;color:rgba(229,239,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (min-width:900px){#journeyRegion{top:calc(max(16px,var(--safeT)) + 94px);left:max(18px,var(--safeL));max-width:min(30vw,360px);padding:8px 10px}#journeyRegion .journeyRegionKicker{font-size:var(--ui-xs,11px)}#journeyRegion .journeyRegionTitle{font-size:var(--ui-sm,12px)}#journeyRegion .journeyRegionMeta{font-size:var(--ui-xs,11px)}}
@media (prefers-reduced-motion:reduce){#journeyAtmosphere,#journeyRegion{transition:none}}
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
  let region=document.querySelector('#journeyRegion');
  if(!region){
    region=document.createElement('div');
    region.id='journeyRegion';
    region.setAttribute('role','status');
    region.setAttribute('aria-live','polite');
    region.innerHTML='<div id="journeyRegionKicker" class="journeyRegionKicker"></div><div id="journeyRegionTitle" class="journeyRegionTitle"></div><div id="journeyRegionMeta" class="journeyRegionMeta"></div>';
    app.append(region);
  }
  return{app,atmosphere,region};
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
  const app=document.querySelector('#app'),atmosphere=document.querySelector('#journeyAtmosphere'),region=document.querySelector('#journeyRegion');
  app?.classList.remove('journeyAtmosphereActive');
  app?.removeAttribute('data-journey-system');
  atmosphere?.removeAttribute('data-system');atmosphere?.removeAttribute('data-phase');
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
