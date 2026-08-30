import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const NAME='stellar-prox-starport-transit';
const VISUAL_PASS='starport-transit-lattice-v1';
const SAMPLE_MS=250;
const PROFILE={starportCenter:new THREE.Vector3(15,-6,-82),starportRadius:20,starportTube:.42,triangles:2304,drawCalls:3,beacons:36};
const approx=(a,b,t=.25)=>Math.abs(a-b)<=t;
let starport=null,objects=[],captureCount=0,lastState=null;
const previousAdd=THREE.Object3D.prototype.add;

function measureTriangles(list=objects){
  let triangles=0;
  for(const object of list){
    if(!object?.isMesh)continue;
    const geometry=object.geometry;if(!geometry)continue;
    triangles+=(geometry.index?.count??geometry.attributes?.position?.count??0)/3;
  }
  return Math.round(triangles);
}
function disposeOwn(){
  for(const object of objects){
    object.removeFromParent();
    object.geometry?.dispose?.();
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const material of materials)material?.dispose?.();
  }
  objects=[];
}
function candidate(object){
  if(!object?.isMesh||object.geometry?.type!=='TorusGeometry')return false;
  const p=object.geometry.parameters||{};
  return approx(object.position.x,PROFILE.starportCenter.x,.35)&&approx(object.position.y,PROFILE.starportCenter.y,.35)&&approx(object.position.z,PROFILE.starportCenter.z,.35)&&approx(p.radius,PROFILE.starportRadius,.25)&&approx(p.tube,PROFILE.starportTube,.12);
}
function capture(object){if(!candidate(object)||object===starport)return;starport=object;captureCount++}
function addWrapper(...args){const result=previousAdd.apply(this,args);for(const object of args)capture(object);return result}
if(!window.__stellarProxStarportTransitAddHook){
  THREE.Object3D.prototype.add=addWrapper;
  window.__stellarProxStarportTransitAddHook={previousAdd,addWrapper};
}

function laneMaterial(phase,colorA,colorB){
  const shader=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{uPhase:{value:phase},uA:{value:new THREE.Color(colorA)},uB:{value:new THREE.Color(colorB)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vUv;uniform float uPhase;uniform vec3 uA;uniform vec3 uB;void main(){
      float taper=smoothstep(.02,.11,vUv.x)*(1.0-smoothstep(.88,.985,vUv.x));
      float core=1.0-smoothstep(.16,.48,abs(vUv.y-.5));
      float lanes=smoothstep(.3,.94,.5+.5*cos(vUv.x*6.2831853*18.0+uPhase));
      float nodes=pow(max(0.0,.5+.5*cos(vUv.x*6.2831853*9.0+uPhase*.73)),14.0);
      float flow=smoothstep(.26,.92,.5+.5*cos((vUv.x+vUv.y*.12)*6.2831853*3.0+uPhase));
      vec3 color=mix(uA,uB,clamp(nodes*.76+flow*.34,0.0,1.0));
      float alpha=taper*core*(.12+lanes*.28+nodes*.8);
      gl_FragColor=vec4(color,alpha);
    }`
  });
  shader.forceSinglePass=true;
  return shader;
}
function beaconGeometry(){
  const positions=new Float32Array(PROFILE.beacons*3),colors=new Float32Array(PROFILE.beacons*3);
  const cool=new THREE.Color('#8deeff'),warm=new THREE.Color('#ffc179'),mixed=new THREE.Color();
  for(let i=0;i<PROFILE.beacons;i++){
    const a=(i/PROFILE.beacons)*Math.PI*2+.12,r=i%3===0?26.1:23.6;
    positions[i*3]=Math.cos(a)*r;
    positions[i*3+1]=Math.sin(a)*r;
    positions[i*3+2]=Math.sin(a*3.0)*1.45+(i%2?-.35:.35);
    mixed.copy(cool).lerp(warm,i%4===0?.78:.16);
    colors[i*3]=mixed.r;colors[i*3+1]=mixed.g;colors[i*3+2]=mixed.b;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  return geometry;
}
function build(){
  if(!starport||objects.length)return;
  const outer=new THREE.Mesh(new THREE.TorusGeometry(23.2,.14,6,96,Math.PI*1.36),laneMaterial(.32,'#7beeff','#fff2cf'));
  outer.name=`${NAME}-outer-transit-lane`;outer.rotation.set(.22,-.12,.44);outer.position.z=.18;
  const crossing=new THREE.Mesh(new THREE.TorusGeometry(25.8,.11,6,96,Math.PI*1.08),laneMaterial(2.3,'#ffb062','#e8fbff'));
  crossing.name=`${NAME}-crossing-transit-lane`;crossing.rotation.set(-.38,.34,-.56);crossing.position.z=-.16;
  const beacons=new THREE.Points(beaconGeometry(),new THREE.PointsMaterial({size:.5,vertexColors:true,transparent:true,opacity:.86,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
  beacons.name=`${NAME}-approach-beacons`;beacons.rotation.set(.08,-.16,.2);
  starport.add(outer,crossing,beacons);objects=[outer,crossing,beacons];
}
function shouldRun(state){return !!state&&state.exploring&&!state.flying&&!state.contextLost&&state.qualityMode==='high'&&state.current==='PROX'}
function sync(){
  const sim=window.WarpSim;if(!sim?.state)return;
  const state=sim.state();lastState=state;const high=shouldRun(state);
  if(!high&&objects.length)disposeOwn();
  if(high&&starport&&!objects.length)build();
  for(const object of objects)object.visible=high;
}
function snapshot(){
  const state=lastState||window.WarpSim?.state?.()||{};
  const active=shouldRun(state)&&objects.length===3;
  return{visualPass:VISUAL_PASS,target:'PROX',quality:state.qualityMode||null,active,captured:!!starport,captureCount,objects:objects.length,drawCalls:active?PROFILE.drawCalls:0,triangles:active?measureTriangles():0,budgetTriangles:PROFILE.triangles,beacons:active?PROFILE.beacons:0,singlePass:active&&objects.filter(object=>object.isMesh).every(object=>object.material?.forceSinglePass===true)};
}
const timer=setInterval(sync,SAMPLE_MS);
const canvas=document.querySelector('#space');
const qualityObserver=canvas?new MutationObserver(sync):null;
qualityObserver?.observe(canvas,{attributes:true,attributeFilter:['width','height']});
addEventListener('beforeunload',()=>{
  clearInterval(timer);qualityObserver?.disconnect();disposeOwn();
  const hook=window.__stellarProxStarportTransitAddHook;
  if(hook?.addWrapper===addWrapper&&THREE.Object3D.prototype.add===addWrapper)THREE.Object3D.prototype.add=hook.previousAdd;
  if(hook?.addWrapper===addWrapper)delete window.__stellarProxStarportTransitAddHook;
},{once:true});
window.WarpProxStarportTransit={snapshot};
sync();
