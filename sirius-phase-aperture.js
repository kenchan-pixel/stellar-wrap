import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const NAME='stellar-sirius-phase-aperture';
const VISUAL_PASS='phase-aperture-v3';
const ARCHITECTURE='dual-star-pylon-weave-v3';
const SAMPLE_MS=250;
const PROFILE={relayCenter:new THREE.Vector3(0,-4,-82),relayRadius:17.5,triangles:4064,drawCalls:4,nodes:16,depthSpan:10.8,scaleMax:5.2};
const approx=(a,b,t=.25)=>Math.abs(a-b)<=t;
let relay=null,objects=[],captureCount=0,lastState=null,beaconDepthRange={min:0,max:0,span:0},pylonScaleRange={min:0,max:0};
const previousAdd=THREE.Object3D.prototype.add;

function geometryTriangles(object){
  const geometry=object?.geometry;if(!geometry)return 0;
  const indexCount=geometry.index?.count,positionCount=geometry.attributes?.position?.count;
  const base=Number.isFinite(indexCount)?indexCount/3:Number.isFinite(positionCount)?positionCount/3:0;
  return Math.round(base*(object.isInstancedMesh?object.count:1));
}
function measureTriangles(list=objects){return list.reduce((sum,object)=>sum+geometryTriangles(object),0)}
function disposeOwn(){
  for(const object of objects){
    object.removeFromParent();
    object.geometry?.dispose?.();
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const material of materials)material?.dispose?.();
  }
  objects=[];beaconDepthRange={min:0,max:0,span:0};pylonScaleRange={min:0,max:0};
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
  const shader=new THREE.ShaderMaterial({
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
  shader.forceSinglePass=true;
  return shader;
}
function beaconLattice(){
  const geometry=new THREE.OctahedronGeometry(.22,0);
  const beaconMaterial=new THREE.MeshBasicMaterial({color:'#b9f5ff',transparent:true,opacity:.94,depthWrite:false,blending:THREE.AdditiveBlending});
  beaconMaterial.forceSinglePass=true;
  const beacons=new THREE.InstancedMesh(geometry,beaconMaterial,PROFILE.nodes);
  beacons.name=`${NAME}-phase-pylon-weave`;
  const dummy=new THREE.Object3D();
  const cool=new THREE.Color('#69cfff'),hot=new THREE.Color('#f7ffff');
  let minZ=Infinity,maxZ=-Infinity,minScale=Infinity,maxScale=-Infinity;
  for(let i=0;i<PROFILE.nodes;i++){
    const angle=i/PROFILE.nodes*Math.PI*2;
    const lane=i%2===0?1:-1;
    const radiusX=lane>0?13.2:10.9,radiusY=lane>0?8.4:6.8;
    const z=lane*4.1+Math.sin(angle*2)*1.3;
    const major=i%4===0?5.2:lane>0?4.1:3;
    const width=i%4===0?.9:lane>0?.68:.56;
    dummy.position.set(Math.cos(angle)*radiusX,Math.sin(angle)*radiusY,z);
    dummy.rotation.set(angle*.16+lane*.12,angle*.3-lane*.08,angle+Math.PI*.5+lane*.22);
    dummy.scale.set(width,major,width*.72);dummy.updateMatrix();
    beacons.setMatrixAt(i,dummy.matrix);beacons.setColorAt(i,i%4===0?hot:cool);
    minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);minScale=Math.min(minScale,major);maxScale=Math.max(maxScale,major);
  }
  beaconDepthRange={min:minZ,max:maxZ,span:maxZ-minZ};
  pylonScaleRange={min:minScale,max:maxScale};
  beacons.instanceMatrix.needsUpdate=true;if(beacons.instanceColor)beacons.instanceColor.needsUpdate=true;
  beacons.rotation.set(.08,-.16,.28);
  return beacons;
}
function build(){
  if(!relay||objects.length)return;
  const upper=new THREE.Mesh(new THREE.TorusGeometry(17.7,.18,8,96,Math.PI*1.04),material(.35,'#77e8ff','#f1fdff'));
  upper.name=`${NAME}-upper-phase-arc`;
  upper.rotation.set(.5,.3,-.62);
  upper.position.set(0,.45,-3.2);
  const lower=new THREE.Mesh(new THREE.TorusGeometry(14.9,.16,8,96,Math.PI*1.12),material(2.15,'#6fc8ff','#d7f6ff'));
  lower.name=`${NAME}-lower-phase-arc`;
  lower.rotation.set(-.54,.72,.4);
  lower.position.set(0,-.35,3);
  const iris=new THREE.Mesh(new THREE.TorusGeometry(10.2,.12,6,72),material(4.05,'#8fe7ff','#ffffff'));
  iris.name=`${NAME}-inner-iris`;
  iris.rotation.set(-.22,-.42,.98);
  iris.position.set(.35,.1,.8);
  const beacons=beaconLattice();
  relay.add(upper,lower,iris,beacons);
  objects=[upper,lower,iris,beacons];
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
  const active=shouldRun(state)&&objects.length===4;
  const layerDepths=active?objects.slice(0,3).map(object=>Number(object.position.z.toFixed(2))):[];
  return{visualPass:VISUAL_PASS,architecture:ARCHITECTURE,target:'SIRIUS',quality:state.qualityMode||null,active,captured:!!relay,captureCount,objects:objects.length,nodes:active?PROFILE.nodes:0,drawCalls:active?PROFILE.drawCalls:0,triangles:active?measureTriangles():0,budgetTriangles:PROFILE.triangles,singlePass:active&&objects.every(object=>object.material?.forceSinglePass===true),layerDepths,beaconDepthSpan:active?Number(beaconDepthRange.span.toFixed(2)):0,budgetDepthSpan:PROFILE.depthSpan,pylonScaleMin:active?Number(pylonScaleRange.min.toFixed(2)):0,pylonScaleMax:active?Number(pylonScaleRange.max.toFixed(2)):0,budgetScaleMax:PROFILE.scaleMax};
}
const timer=setInterval(sync,SAMPLE_MS);
const canvas=document.querySelector('#space');
const qualityObserver=canvas?new MutationObserver(sync):null;
qualityObserver?.observe(canvas,{attributes:true,attributeFilter:['width','height']});
addEventListener('beforeunload',()=>{
  clearInterval(timer);qualityObserver?.disconnect();disposeOwn();
  const hook=window.__stellarSiriusPhaseApertureAddHook;
  if(hook?.addWrapper===addWrapper&&THREE.Object3D.prototype.add===addWrapper)THREE.Object3D.prototype.add=hook.previousAdd;
  if(hook?.addWrapper===addWrapper)delete window.__stellarSiriusPhaseApertureAddHook;
},{once:true});
window.WarpSiriusPhaseAperture={snapshot};
sync();
