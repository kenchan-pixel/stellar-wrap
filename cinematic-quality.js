import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const SAMPLE_MS=250;
const TARGETS=Object.freeze({
  TAU:{center:new THREE.Vector3(15,-5,-86),radius:23,triangles:8352,drawCalls:4},
  ORION:{starCenter:new THREE.Vector3(28,8,-137),starRadius:30,rockCenter:new THREE.Vector3(-26,-12,-90),rockRadius:10,triangles:10944,drawCalls:4},
  SIRIUS:{starCenter:new THREE.Vector3(-24,10,-134),starRadius:15,iceCenter:new THREE.Vector3(0,18,-151),iceRadius:6,relayCenter:new THREE.Vector3(0,-4,-82),relayRadius:17.5,triangles:11992,drawCalls:4}
});
const TAU_RING_ROTATION=new THREE.Euler(1.18,.2,.25);
const NAME='stellar-cinematic';
let tauRoot=null;
let tauSurface=null;
let tauObjects=[];
let tauCaptureCount=0;
let orionStar=null;
let orionRockRoot=null;
let orionRockSurface=null;
let orionSystemRoot=null;
let orionObjects=[];
let orionCaptureCount=0;
let siriusStar=null;
let siriusIceRoot=null;
let siriusIceSurface=null;
let siriusRelay=null;
let siriusObjects=[];
let siriusCaptureCount=0;
let qualityHooked=false;
let originalSetQuality=null;
let addHooked=false;
let originalAdd=null;
let lastSnapshot={active:false,target:null,quality:null,objects:0,triangles:0,drawCalls:0,captured:false,captureCount:0,profiles:{}};

function approx(a,b,t=.18){return Math.abs(a-b)<=t}
function planetRootSurface(candidate,center,radius){
  if(!candidate?.isGroup||!approx(candidate.position.x,center.x)||!approx(candidate.position.y,center.y)||!approx(candidate.position.z,center.z))return null;
  return candidate.children?.find?.(child=>child?.isMesh&&approx(child.scale.x,radius,.38)&&approx(child.scale.y,radius,.38))||null;
}
function starMatches(candidate,center,radius){
  return !!(candidate?.isMesh&&approx(candidate.position.x,center.x)&&approx(candidate.position.y,center.y)&&approx(candidate.position.z,center.z)&&approx(candidate.scale.x,radius,.45)&&approx(candidate.scale.y,radius,.45));
}
function isOrionStar(candidate){const p=TARGETS.ORION;return starMatches(candidate,p.starCenter,p.starRadius)}
function isSiriusStar(candidate){const p=TARGETS.SIRIUS;return starMatches(candidate,p.starCenter,p.starRadius)}
function isSiriusRelay(candidate){
  const p=TARGETS.SIRIUS,g=candidate?.geometry;
  return !!(candidate?.isMesh&&g?.type==='TorusGeometry'&&approx(candidate.position.x,p.relayCenter.x)&&approx(candidate.position.y,p.relayCenter.y)&&approx(candidate.position.z,p.relayCenter.z)&&approx(g.parameters?.radius,p.relayRadius,.12));
}

function captureCandidate(candidate){
  let captured=false;
  const tau=planetRootSurface(candidate,TARGETS.TAU.center,TARGETS.TAU.radius);
  if(tau){
    if(tauRoot!==candidate){disposeTauOwn();tauRoot=candidate;tauSurface=tau;tauCaptureCount++}
    captured=true;
  }
  const orionRock=planetRootSurface(candidate,TARGETS.ORION.rockCenter,TARGETS.ORION.rockRadius);
  if(orionRock){
    if(orionRockRoot!==candidate){disposeOrionOwn();orionRockRoot=candidate;orionRockSurface=orionRock;orionSystemRoot=candidate.parent||orionSystemRoot}
    captured=true;
  }
  if(isOrionStar(candidate)){
    if(orionStar!==candidate){disposeOrionOwn();orionStar=candidate;orionSystemRoot=candidate.parent||orionSystemRoot;orionCaptureCount++}
    captured=true;
  }
  const siriusIce=planetRootSurface(candidate,TARGETS.SIRIUS.iceCenter,TARGETS.SIRIUS.iceRadius);
  if(siriusIce){
    if(siriusIceRoot!==candidate){disposeSiriusOwn();siriusIceRoot=candidate;siriusIceSurface=siriusIce}
    captured=true;
  }
  if(isSiriusStar(candidate)){
    if(siriusStar!==candidate){disposeSiriusOwn();siriusStar=candidate;siriusCaptureCount++}
    captured=true;
  }
  if(isSiriusRelay(candidate)){
    if(siriusRelay!==candidate){disposeSiriusOwn();siriusRelay=candidate}
    captured=true;
  }
  return captured;
}

function hookSceneConstruction(){
  const proto=THREE.Object3D?.prototype;
  if(addHooked||!proto?.add)return;
  originalAdd=proto.add;
  const wrapped=function(...children){
    const value=originalAdd.apply(this,children);
    captureCandidate(this);
    for(const child of children)captureCandidate(child);
    return value;
  };
  wrapped.__stellarCinematicAddHook=true;
  proto.add=wrapped;
  addHooked=true;
}

function canvasTexture(canvas){
  const t=new THREE.CanvasTexture(canvas);
  t.wrapS=THREE.RepeatWrapping;
  t.wrapT=THREE.ClampToEdgeWrapping;
  t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=4;
  return t;
}

function tauBandTexture(){
  const c=document.createElement('canvas');c.width=768;c.height=384;
  const x=c.getContext('2d'),im=x.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){
    const v=y/c.height,u=xx/c.width;
    const lat=(v-.5)*Math.PI;
    const broad=.5+.5*Math.sin(lat*30+Math.sin(u*Math.PI*2*2.2)*1.4);
    const fine=.5+.5*Math.sin(lat*74-u*11+Math.sin(lat*9)*1.1);
    const storm=Math.exp(-((u-.72)**2/.004+(v-.58)**2/.003));
    const mix=Math.max(0,Math.min(1,.18+.52*broad+.23*fine+.34*storm));
    const i=(y*c.width+xx)*4;
    im.data[i]=112+Math.round(96*mix);
    im.data[i+1]=50+Math.round(74*mix);
    im.data[i+2]=118+Math.round(86*mix);
    im.data[i+3]=Math.round(34+54*mix+48*storm);
  }
  x.putImageData(im,0,0);
  return canvasTexture(c);
}

function tauAtmosphereMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:{uInner:{value:new THREE.Color('#da73ca')},uOuter:{value:new THREE.Color('#7d9cff')},uOpacity:{value:.44}},
    vertexShader:`varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vY=normal.y;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uInner;uniform vec3 uOuter;uniform float uOpacity;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float rim=pow(1.0-clamp(dot(vN,vV),0.0,1.0),2.05);float horizon=smoothstep(.08,1.0,rim);vec3 c=mix(uInner,uOuter,clamp(vY*.5+.5,0.0,1.0));gl_FragColor=vec4(c,horizon*uOpacity);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.FrontSide
  });
}

function tauRingMaterial(){
  const inner=30.15/54.85;
  return new THREE.ShaderMaterial({
    uniforms:{uA:{value:new THREE.Color('#f7b4de')},uB:{value:new THREE.Color('#9d78df')},uOpacity:{value:.56},uInner:{value:inner}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform vec3 uA;uniform vec3 uB;uniform float uOpacity;uniform float uInner;varying vec2 vUv;void main(){float rr=length(vUv-.5)*2.0;float q=clamp((rr-uInner)/(1.0-uInner),0.0,1.0);float band=.50+.28*sin(q*165.0)+.14*sin(q*421.0+1.7)+.08*sin(q*907.0);float gaps=smoothstep(.08,.22,abs(sin(q*58.0+2.1)));float edge=smoothstep(uInner,uInner+.018,rr)*(1.0-smoothstep(.985,1.0,rr));float alpha=clamp((.16+.42*band)*gaps,0.0,.72)*edge*uOpacity;vec3 col=mix(uA,uB,clamp(q*.72+.14*sin(q*18.0),0.0,1.0));gl_FragColor=vec4(col,alpha);}`,
    transparent:true,depthWrite:false,side:THREE.DoubleSide
  });
}

function tauDustGeometry(){
  const count=96,p=new Float32Array(count*3);let seed=91427;
  const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  for(let i=0;i<count;i++){
    const a=rnd()*Math.PI*2,r=31+rnd()*23;
    p[i*3]=Math.cos(a)*r;p[i*3+1]=Math.sin(a)*r;p[i*3+2]=(rnd()-.5)*.22;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));return g;
}

function orionStarTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=256;
  const x=c.getContext('2d'),im=x.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){
    const u=xx/c.width,v=y/c.height,lon=u*Math.PI*2,lat=(v-.5)*Math.PI;
    const cells=.5+.5*Math.sin(lon*17+Math.sin(lat*11)*2.4)+.28*Math.sin(lon*41-lat*27)+.16*Math.sin(lon*73+lat*49);
    const plume=.5+.5*Math.sin(lon*5.3+lat*8.7);
    const spot=Math.exp(-((u-.62)**2/.0025+(v-.42)**2/.005))+Math.exp(-((u-.29)**2/.004+(v-.63)**2/.004));
    const mix=Math.max(0,Math.min(1,.42+cells*.18+plume*.1-spot*.28));
    const i=(y*c.width+xx)*4;
    im.data[i]=220+Math.round(35*mix);
    im.data[i+1]=72+Math.round(85*mix);
    im.data[i+2]=30+Math.round(50*mix);
    im.data[i+3]=Math.round(82+112*mix);
  }
  x.putImageData(im,0,0);
  return canvasTexture(c);
}

function orionRockTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=256;
  const x=c.getContext('2d'),im=x.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){
    const u=xx/c.width,v=y/c.height;
    const ridge=.5+.5*Math.sin(u*93+Math.sin(v*37)*2.2);
    const fracture=.5+.5*Math.sin((u+v)*151)+.28*Math.sin(u*233-v*117);
    const crater=Math.exp(-((u-.23)**2/.0018+(v-.61)**2/.003))+Math.exp(-((u-.72)**2/.0028+(v-.36)**2/.002));
    const mix=Math.max(0,Math.min(1,.18+.38*ridge+.18*fracture-.24*crater));
    const i=(y*c.width+xx)*4;
    im.data[i]=118+Math.round(72*mix);
    im.data[i+1]=50+Math.round(46*mix);
    im.data[i+2]=34+Math.round(35*mix);
    im.data[i+3]=Math.round(30+72*mix);
  }
  x.putImageData(im,0,0);
  return canvasTexture(c);
}

function orionCoronaMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:{uCore:{value:new THREE.Color('#ff8a4f')},uEdge:{value:new THREE.Color('#ffd2a6')},uOpacity:{value:.52}},
    vertexShader:`varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vY=normal.y;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uCore;uniform vec3 uEdge;uniform float uOpacity;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float rim=pow(1.0-clamp(dot(vN,vV),0.0,1.0),1.75);float flare=.82+.18*sin(vY*31.0);vec3 c=mix(uCore,uEdge,clamp(rim*.92,0.0,1.0));gl_FragColor=vec4(c,smoothstep(.04,1.0,rim)*uOpacity*flare);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.FrontSide
  });
}

function orionGlowTexture(){
  const c=document.createElement('canvas');c.width=64;c.height=64;
  const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,31);
  g.addColorStop(0,'rgba(255,255,255,.96)');g.addColorStop(.2,'rgba(255,226,210,.72)');g.addColorStop(.58,'rgba(255,166,140,.2)');g.addColorStop(1,'rgba(255,120,100,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function orionFilamentGeometry(){
  const count=84,p=new Float32Array(count*3),colors=new Float32Array(count*3);let seed=31027;
  const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const a=new THREE.Color('#ff9a64'),b=new THREE.Color('#d26f7d'),c=new THREE.Color();
  for(let i=0;i<count;i++){
    const t=i/(count-1),angle=t*Math.PI*5.2+(rnd()-.5)*.5,r=22+t*62+(rnd()-.5)*9;
    p[i*3]=8+Math.cos(angle)*r;p[i*3+1]=-4+Math.sin(angle*.72)*r*.34+(rnd()-.5)*9;p[i*3+2]=-155+(t-.5)*86+(rnd()-.5)*18;
    c.copy(a).lerp(b,t);colors.set([c.r,c.g,c.b],i*3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3));return g;
}

function siriusStarTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=256;
  const x=c.getContext('2d'),im=x.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){
    const u=xx/c.width,v=y/c.height,lon=u*Math.PI*2,lat=(v-.5)*Math.PI;
    const cells=.5+.5*Math.sin(lon*21+Math.sin(lat*13)*2.1)+.24*Math.sin(lon*47-lat*31)+.13*Math.sin(lon*89+lat*57);
    const polar=.5+.5*Math.cos(lat*2);
    const mix=Math.max(0,Math.min(1,.34+cells*.2+polar*.12));
    const i=(y*c.width+xx)*4;
    im.data[i]=185+Math.round(58*mix);
    im.data[i+1]=226+Math.round(28*mix);
    im.data[i+2]=238+Math.round(17*mix);
    im.data[i+3]=Math.round(76+118*mix);
  }
  x.putImageData(im,0,0);
  return canvasTexture(c);
}

function siriusIceTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=256;
  const x=c.getContext('2d'),im=x.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){
    const u=xx/c.width,v=y/c.height;
    const ridge=.5+.5*Math.sin(u*109+Math.sin(v*43)*2.8);
    const fissure=Math.abs(Math.sin(u*173-v*119+.7*Math.sin(v*67)));
    const frost=.5+.5*Math.sin((u+v)*237);
    const mix=Math.max(0,Math.min(1,.2+.35*ridge+.24*frost-.18*(1-fissure)));
    const i=(y*c.width+xx)*4;
    im.data[i]=128+Math.round(78*mix);
    im.data[i+1]=190+Math.round(54*mix);
    im.data[i+2]=210+Math.round(42*mix);
    im.data[i+3]=Math.round(34+82*mix);
  }
  x.putImageData(im,0,0);
  return canvasTexture(c);
}

function siriusHaloMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:{uCore:{value:new THREE.Color('#bceeff')},uEdge:{value:new THREE.Color('#f4feff')},uOpacity:{value:.46}},
    vertexShader:`varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vY=normal.y;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uCore;uniform vec3 uEdge;uniform float uOpacity;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float rim=pow(1.0-clamp(dot(vN,vV),0.0,1.0),1.82);float striation=.86+.14*sin(vY*36.0);vec3 c=mix(uCore,uEdge,clamp(rim*.95,0.0,1.0));gl_FragColor=vec4(c,smoothstep(.04,1.0,rim)*uOpacity*striation);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.FrontSide
  });
}

function siriusRelayMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:{uA:{value:new THREE.Color('#8eefff')},uB:{value:new THREE.Color('#e8fdff')},uOpacity:{value:.72}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform vec3 uA;uniform vec3 uB;uniform float uOpacity;varying vec2 vUv;void main(){float seg=.35+.65*smoothstep(.22,.72,.5+.5*sin(vUv.x*6.2831853*24.0));float rail=.75+.25*sin(vUv.x*6.2831853*7.0+vUv.y*9.0);vec3 c=mix(uA,uB,clamp(.28+.72*seg,0.0,1.0));gl_FragColor=vec4(c,uOpacity*seg*rail);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false
  });
}

function disposeMaterial(material){if(!material)return;material.map?.dispose?.();material.alphaMap?.dispose?.();material.dispose?.()}
function disposeList(list){
  for(const o of list){try{o.parent?.remove?.(o);o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(disposeMaterial);else disposeMaterial(o.material)}catch{}}
  return[];
}
function disposeTauOwn(){tauObjects=disposeList(tauObjects)}
function disposeOrionOwn(){orionObjects=disposeList(orionObjects)}
function disposeSiriusOwn(){siriusObjects=disposeList(siriusObjects)}
function teardown(){
  disposeTauOwn();disposeOrionOwn();disposeSiriusOwn();
  tauRoot=null;tauSurface=null;
  orionStar=null;orionRockRoot=null;orionRockSurface=null;orionSystemRoot=null;
  siriusStar=null;siriusIceRoot=null;siriusIceSurface=null;siriusRelay=null;
}

function buildTau(){
  if(!tauRoot||!tauSurface||tauObjects.length)return;
  const bands=new THREE.Mesh(new THREE.SphereGeometry(1,64,40),new THREE.MeshStandardMaterial({map:tauBandTexture(),transparent:true,opacity:.34,depthWrite:false,roughness:.9,metalness:0}));
  bands.name=`${NAME}-tau-bands`;bands.scale.setScalar(1.008);tauSurface.add(bands);

  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),tauAtmosphereMaterial());
  atmosphere.name=`${NAME}-tau-atmosphere`;atmosphere.scale.setScalar(TARGETS.TAU.radius*1.078);tauRoot.add(atmosphere);

  const ring=new THREE.Mesh(new THREE.RingGeometry(30.15,54.85,192,1),tauRingMaterial());
  ring.name=`${NAME}-tau-ring`;ring.rotation.copy(TAU_RING_ROTATION);tauRoot.add(ring);

  const dust=new THREE.Points(tauDustGeometry(),new THREE.PointsMaterial({color:'#ffd2ec',size:.36,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
  dust.name=`${NAME}-tau-dust`;dust.rotation.copy(TAU_RING_ROTATION);tauRoot.add(dust);
  tauObjects=[bands,atmosphere,ring,dust];
}

function buildOrion(){
  if(!orionStar||!orionRockSurface||!orionSystemRoot||orionObjects.length)return;
  const granulation=new THREE.Mesh(new THREE.SphereGeometry(1,64,40),new THREE.MeshBasicMaterial({map:orionStarTexture(),transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthWrite:false}));
  granulation.name=`${NAME}-orion-granulation`;granulation.scale.setScalar(1.016);orionStar.add(granulation);

  const corona=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),orionCoronaMaterial());
  corona.name=`${NAME}-orion-corona`;corona.scale.setScalar(1.105);orionStar.add(corona);

  const terrain=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.MeshStandardMaterial({map:orionRockTexture(),transparent:true,opacity:.36,depthWrite:false,roughness:1,metalness:0}));
  terrain.name=`${NAME}-orion-terrain`;terrain.scale.setScalar(1.008);orionRockSurface.add(terrain);

  const filaments=new THREE.Points(orionFilamentGeometry(),new THREE.PointsMaterial({map:orionGlowTexture(),size:5.2,vertexColors:true,transparent:true,opacity:.24,alphaTest:.01,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
  filaments.name=`${NAME}-orion-filaments`;orionSystemRoot.add(filaments);
  orionObjects=[granulation,corona,terrain,filaments];
}

function buildSirius(){
  if(!siriusStar||!siriusIceSurface||!siriusRelay||siriusObjects.length)return;
  const granulation=new THREE.Mesh(new THREE.SphereGeometry(1,64,40),new THREE.MeshBasicMaterial({map:siriusStarTexture(),transparent:true,opacity:.54,blending:THREE.AdditiveBlending,depthWrite:false}));
  granulation.name=`${NAME}-sirius-granulation`;granulation.scale.setScalar(1.014);siriusStar.add(granulation);

  const halo=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),siriusHaloMaterial());
  halo.name=`${NAME}-sirius-halo`;halo.scale.setScalar(1.12);siriusStar.add(halo);

  const frost=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.MeshStandardMaterial({map:siriusIceTexture(),transparent:true,opacity:.38,depthWrite:false,roughness:.88,metalness:.04}));
  frost.name=`${NAME}-sirius-frost`;frost.scale.setScalar(1.012);siriusIceSurface.add(frost);

  const relay=new THREE.Mesh(new THREE.TorusGeometry(TARGETS.SIRIUS.relayRadius,.34,8,128),siriusRelayMaterial());
  relay.name=`${NAME}-sirius-relay`;siriusRelay.add(relay);
  siriusObjects=[granulation,halo,frost,relay];
}

function hookQuality(){
  const api=window.WarpSim;
  if(qualityHooked||!api||typeof api.setQuality!=='function')return;
  originalSetQuality=api.setQuality.bind(api);
  api.setQuality=mode=>{const value=originalSetQuality(mode);queueMicrotask(sync);return value};
  qualityHooked=true;
}

function currentProfile(id){
  if(id==='TAU')return{objects:tauObjects,captured:!!tauRoot,captureCount:tauCaptureCount,...TARGETS.TAU};
  if(id==='ORION')return{objects:orionObjects,captured:!!(orionStar&&orionRockSurface&&orionSystemRoot),captureCount:orionCaptureCount,...TARGETS.ORION};
  if(id==='SIRIUS')return{objects:siriusObjects,captured:!!(siriusStar&&siriusIceSurface&&siriusRelay),captureCount:siriusCaptureCount,...TARGETS.SIRIUS};
  return{objects:[],captured:false,captureCount:0,triangles:0,drawCalls:0};
}

function sync(){
  hookQuality();
  const api=window.WarpSim;
  if(!api||typeof api.state!=='function')return;
  let state;try{state=api.state()}catch{return}
  const safe=state.exploring&&!state.flying&&!state.contextLost;
  const high=safe&&state.qualityMode==='high';
  const tauHigh=high&&state.current==='TAU';
  const orionHigh=high&&state.current==='ORION';
  const siriusHigh=high&&state.current==='SIRIUS';
  if(!tauHigh&&tauObjects.length)disposeTauOwn();
  if(!orionHigh&&orionObjects.length)disposeOrionOwn();
  if(!siriusHigh&&siriusObjects.length)disposeSiriusOwn();
  if(tauHigh&&tauRoot&&!tauObjects.length)buildTau();
  if(orionHigh&&orionStar&&orionRockSurface&&orionSystemRoot&&!orionObjects.length)buildOrion();
  if(siriusHigh&&siriusStar&&siriusIceSurface&&siriusRelay&&!siriusObjects.length)buildSirius();
  for(const o of tauObjects)o.visible=tauHigh;
  for(const o of orionObjects)o.visible=orionHigh;
  for(const o of siriusObjects)o.visible=siriusHigh;
  const profile=currentProfile(state.current),active=!!(high&&profile.objects.length);
  lastSnapshot={
    active,target:state.current,quality:state.qualityMode,objects:profile.objects.length,
    triangles:active?profile.triangles:0,drawCalls:active?profile.drawCalls:0,
    captured:profile.captured,captureCount:profile.captureCount,
    profiles:{
      TAU:{captured:!!tauRoot,objects:tauObjects.length,captureCount:tauCaptureCount},
      ORION:{captured:!!(orionStar&&orionRockSurface&&orionSystemRoot),objects:orionObjects.length,captureCount:orionCaptureCount},
      SIRIUS:{captured:!!(siriusStar&&siriusIceSurface&&siriusRelay),objects:siriusObjects.length,captureCount:siriusCaptureCount}
    }
  };
}

hookSceneConstruction();
const timer=setInterval(sync,SAMPLE_MS);
addEventListener('pagehide',()=>{
  clearInterval(timer);
  if(qualityHooked&&originalSetQuality&&window.WarpSim)window.WarpSim.setQuality=originalSetQuality;
  if(addHooked&&originalAdd&&THREE.Object3D.prototype.add?.__stellarCinematicAddHook)THREE.Object3D.prototype.add=originalAdd;
  teardown();
},{once:true});
window.WarpCinematicQuality={snapshot(){return typeof structuredClone==='function'?structuredClone(lastSnapshot):JSON.parse(JSON.stringify(lastSnapshot))},sync};
sync();
