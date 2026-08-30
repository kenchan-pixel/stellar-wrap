import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const NAME='stellar-sirius-phase-aperture';
const VISUAL_PASS='phase-aperture-v1';
const SAMPLE_MS=250;
const PROFILE={relayCenter:new THREE.Vector3(0,-4,-82),relayRadius:17.5,triangles:3072,drawCalls:2};
const approx=(a,b,t=.25)=>Math.abs(a-b)<=t;
let relay=null,objects=[],captureCount=0,lastState=null;
const previousAdd=THREE.Object3D.prototype.add;

function measureTriangles(list=objects){
  let triangles=0;
  for(const object of list){
    const geometry=object.geometry;
    if(!geometry)continue;
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
  return approx(object.position.x,PROFILE.relayCenter.x,.35)&&approx(object.position.y,PROFILE.relayCenter.y,.35)&&approx(object.position.z,PROFILE.relayCenter.z,.35)&&approx(p.radius,PROFILE.relayRadius,.25)&&approx(p.tube,.25,.12);
}
function capture(object){
  if(!candidate(object)||object===relay)return;
  relay=object;
  captureCount++;
}
function addWrapper(...args){
  const result=previousAdd.apply(this,args);
  for(const object of args)capture(object);
  return result;
}
if(!window.__stellarSiriusPhaseApertureAddHook){
  THREE.Object3D.prototype.add=addWrapper;
  window.__stellarSiriusPhaseApertureAddHook={previousAdd,addWrapper};
}
function material(phase,colorA,colorB){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{uPhase:{value:phase},uA:{value:new THREE.Color(colorA)},uB:{value:new THREE.Color(colorB)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vUv;uniform float uPhase;uniform vec3 uA;uniform vec3 uB;void main(){
      float edge=smoothstep(.018,.115,vUv.x)*(1.0-smoothstep(.83,.985,vUv.x));
      float spine=1.0-smoothstep(.18,.49,abs(vUv.y-.5));
      float rails=smoothstep(.2,.92,.5+.5*cos(vUv.x*6.2831853*14.0+uPhase));
      float nodes=pow(max(0.0,.5+.5*cos(vUv.x*6.2831853*7.0+uPhase*.61)),12.0);
      float sweep=smoothstep(.25,.9,.5+.5*cos((vUv.x+vUv.y*.17)*6.2831853*2.0+uPhase));
      vec3 color=mix(uA,uB,clamp(nodes*.75+sweep*.28,0.0,1.0));
      float alpha=edge*spine*(.16+rails*.34+nodes*.76);
      gl_FragColor=vec4(color,alpha);
    }`
  });
}
function build(){
  if(!relay||objects.length)return;
  const upper=new THREE.Mesh(new THREE.TorusGeometry(17.7,.18,8,96,Math.PI*1.04),material(.35,'#77e8ff','#f1fdff'));
  upper.name=`${NAME}-upper-phase-arc`;
  upper.rotation.set(.42,.16,-.58);
  upper.position.set(0,0,.08);
  const lower=new THREE.Mesh(new THREE.TorusGeometry(14.9,.16,8,96,Math.PI*1.12),material(2.15,'#6fc8ff','#d7f6ff'));
  lower.name=`${NAME}-lower-phase-arc`;
  lower.rotation.set(-.48,.62,.44);
  lower.position.set(0,0,-.08);
  relay.add(upper,lower);
  objects=[upper,lower];
}
function shouldRun(state){return !!state&&state.exploring&&!state.flying&&!state.contextLost&&state.qualityMode==='high'&&state.current==='SIRIUS'}
function sync(){
  const sim=window.WarpSim;if(!sim?.state)return;
  const state=sim.state();lastState=state;
  const high=shouldRun(state);
  if(!high&&objects.length)disposeOwn();
  if(high&&relay&&!objects.length)build();
  for(const object of objects)object.visible=high;
}
function snapshot(){
  const state=lastState||window.WarpSim?.state?.()||{};
  const active=shouldRun(state)&&objects.length===2;
  return{visualPass:VISUAL_PASS,target:'SIRIUS',quality:state.qualityMode||null,active,captured:!!relay,captureCount,objects:objects.length,drawCalls:active?PROFILE.drawCalls:0,triangles:active?measureTriangles():0,budgetTriangles:PROFILE.triangles};
}
const timer=setInterval(sync,SAMPLE_MS);
addEventListener('beforeunload',()=>{
  clearInterval(timer);disposeOwn();
  const hook=window.__stellarSiriusPhaseApertureAddHook;
  if(hook?.addWrapper===addWrapper&&THREE.Object3D.prototype.add===addWrapper)THREE.Object3D.prototype.add=hook.previousAdd;
  if(hook?.addWrapper===addWrapper)delete window.__stellarSiriusPhaseApertureAddHook;
},{once:true});
window.WarpSiriusPhaseAperture={snapshot};
sync();
