import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const SAMPLE_MS=250;
const TARGET='TAU';
const TAU_CENTER=new THREE.Vector3(15,-5,-86);
const TAU_RADIUS=23;
const RING_ROTATION=new THREE.Euler(1.18,.2,.25);
const NAME='stellar-cinematic-tau';
let liveScene=null;
let root=null;
let planetRoot=null;
let surface=null;
let objects=[];
let qualityHooked=false;
let originalSetQuality=null;
let lastSnapshot={active:false,target:TARGET,quality:null,objects:0,triangles:0,drawCalls:0};

function captureScene(){
  const proto=THREE.WebGLRenderer?.prototype;
  if(!proto||proto.__stellarCinematicCapture)return;
  const original=proto.render;
  const wrapped=function(scene,camera){
    if(!liveScene&&scene?.isScene){liveScene=scene;queueMicrotask(sync)}
    proto.render=original;
    delete proto.__stellarCinematicCapture;
    return original.call(this,scene,camera);
  };
  proto.__stellarCinematicCapture=true;
  proto.render=wrapped;
}

function approx(a,b,t=.18){return Math.abs(a-b)<=t}
function findTau(scene){
  let found=null;
  scene?.traverse?.(candidate=>{
    if(found||!candidate?.isGroup)return;
    const p=candidate.children?.find?.(child=>child?.isGroup&&approx(child.position.x,TAU_CENTER.x)&&approx(child.position.y,TAU_CENTER.y)&&approx(child.position.z,TAU_CENTER.z));
    if(!p)return;
    const s=p.children?.find?.(child=>child?.isMesh&&approx(child.scale.x,TAU_RADIUS,.35)&&approx(child.scale.y,TAU_RADIUS,.35));
    if(s)found={root:candidate,planetRoot:p,surface:s};
  });
  return found;
}

function bandTexture(){
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
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}

function atmosphereMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:{uInner:{value:new THREE.Color('#da73ca')},uOuter:{value:new THREE.Color('#7d9cff')},uOpacity:{value:.44}},
    vertexShader:`varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vY=normal.y;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uInner;uniform vec3 uOuter;uniform float uOpacity;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float rim=pow(1.0-clamp(dot(vN,vV),0.0,1.0),2.05);float horizon=smoothstep(.08,1.0,rim);vec3 c=mix(uInner,uOuter,clamp(vY*.5+.5,0.0,1.0));float a=horizon*uOpacity;gl_FragColor=vec4(c,a);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.FrontSide
  });
}

function ringMaterial(){
  const inner=30.15/54.85;
  return new THREE.ShaderMaterial({
    uniforms:{uA:{value:new THREE.Color('#f7b4de')},uB:{value:new THREE.Color('#9d78df')},uOpacity:{value:.56},uInner:{value:inner}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform vec3 uA;uniform vec3 uB;uniform float uOpacity;uniform float uInner;varying vec2 vUv;void main(){float rr=length(vUv-.5)*2.0;float q=clamp((rr-uInner)/(1.0-uInner),0.0,1.0);float band=.50+.28*sin(q*165.0)+.14*sin(q*421.0+1.7)+.08*sin(q*907.0);float gaps=smoothstep(.08,.22,abs(sin(q*58.0+2.1)));float edge=smoothstep(uInner,uInner+.018,rr)*(1.0-smoothstep(.985,1.0,rr));float alpha=clamp((.16+.42*band)*gaps,0.0,.72)*edge*uOpacity;vec3 col=mix(uA,uB,clamp(q*.72+.14*sin(q*18.0),0.0,1.0));gl_FragColor=vec4(col,alpha);}`,
    transparent:true,blending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide
  });
}

function dustGeometry(){
  const count=96,p=new Float32Array(count*3);let seed=91427;
  const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  for(let i=0;i<count;i++){
    const a=rnd()*Math.PI*2,r=31+rnd()*23;
    p[i*3]=Math.cos(a)*r;p[i*3+1]=Math.sin(a)*r;p[i*3+2]=(rnd()-.5)*.22;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));return g;
}

function clearRefs(){root=null;planetRoot=null;surface=null;objects=[]}
function disposeMaterial(material){if(!material)return;material.map?.dispose?.();material.alphaMap?.dispose?.();material.dispose?.()}
function disposeOwn(){
  for(const o of objects){try{o.parent?.remove?.(o);o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(disposeMaterial);else disposeMaterial(o.material)}catch{}}
  clearRefs();
}

function build(found){
  disposeOwn();
  root=found.root;planetRoot=found.planetRoot;surface=found.surface;

  const bands=new THREE.Mesh(new THREE.SphereGeometry(1,64,40),new THREE.MeshStandardMaterial({map:bandTexture(),transparent:true,opacity:.34,depthWrite:false,roughness:.9,metalness:0}));
  bands.name=`${NAME}-bands`;bands.scale.setScalar(1.008);surface.add(bands);

  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),atmosphereMaterial());
  atmosphere.name=`${NAME}-atmosphere`;atmosphere.position.copy(TAU_CENTER);atmosphere.scale.setScalar(TAU_RADIUS*1.078);root.add(atmosphere);

  const ring=new THREE.Mesh(new THREE.RingGeometry(30.15,54.85,192,1),ringMaterial());
  ring.name=`${NAME}-ring`;ring.position.copy(TAU_CENTER);ring.rotation.copy(RING_ROTATION);root.add(ring);

  const dust=new THREE.Points(dustGeometry(),new THREE.PointsMaterial({color:'#ffd2ec',size:.36,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
  dust.name=`${NAME}-dust`;dust.position.copy(TAU_CENTER);dust.rotation.copy(RING_ROTATION);root.add(dust);

  objects=[bands,atmosphere,ring,dust];
}

function hookQuality(){
  const api=window.WarpSim;
  if(qualityHooked||!api||typeof api.setQuality!=='function')return;
  originalSetQuality=api.setQuality.bind(api);
  api.setQuality=mode=>{const value=originalSetQuality(mode);queueMicrotask(sync);return value};
  qualityHooked=true;
}

function sync(){
  hookQuality();
  const api=window.WarpSim;
  if(!api||typeof api.state!=='function')return;
  let state;try{state=api.state()}catch{return}
  if(root&&!root.parent)disposeOwn();
  const safe=state.current===TARGET&&state.exploring&&!state.flying&&!state.contextLost;
  const wantsHigh=safe&&state.qualityMode==='high';
  if(wantsHigh&&liveScene&&!root){const found=findTau(liveScene);if(found)build(found)}
  const active=!!(wantsHigh&&objects.length);
  for(const o of objects)o.visible=active;
  lastSnapshot={active,target:TARGET,quality:state.qualityMode,objects:objects.length,triangles:active?8352:0,drawCalls:active?4:0};
}

captureScene();
const timer=setInterval(sync,SAMPLE_MS);
addEventListener('pagehide',()=>{clearInterval(timer);if(qualityHooked&&originalSetQuality&&window.WarpSim)window.WarpSim.setQuality=originalSetQuality;disposeOwn()},{once:true});
window.WarpCinematicQuality={snapshot(){return{...lastSnapshot}},sync};
sync();
