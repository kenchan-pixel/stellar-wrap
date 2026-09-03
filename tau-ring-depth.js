import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const NAME='stellar-tau-ring-depth';
const VISUAL_PASS='ring-shadow-parallax-v1';
const SAMPLE_MS=250;
const SHEPHERD_COUNT=16;
const RING_ROTATION=new THREE.Euler(1.18,.2,.25);
const PROFILE={
  center:new THREE.Vector3(15,-5,-86),radius:23,
  triangles:2912,drawCalls:4,shepherds:SHEPHERD_COUNT,depthSpan:5.2
};
const approx=(a,b,t=.24)=>Math.abs(a-b)<=t;
let tauRoot=null,objects=[],captureCount=0,lastState=null,shepherdDepthRange={min:0,max:0,span:0};
const previousAdd=THREE.Object3D.prototype.add;

function planetCandidate(object){
  if(!object?.isGroup||!approx(object.position.x,PROFILE.center.x)||!approx(object.position.y,PROFILE.center.y)||!approx(object.position.z,PROFILE.center.z))return false;
  return !!object.children?.find?.(child=>child?.isMesh&&approx(child.scale.x,PROFILE.radius,.42)&&approx(child.scale.y,PROFILE.radius,.42));
}
function geometryTriangles(object){
  if(!object?.isMesh||!object.geometry)return 0;
  const geometry=object.geometry,indexCount=geometry.index?.count,positionCount=geometry.attributes?.position?.count;
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
  objects=[];shepherdDepthRange={min:0,max:0,span:0};
}
function capture(object){
  if(planetCandidate(object)&&object!==tauRoot){disposeOwn();tauRoot=object;captureCount++}
}
function addWrapper(...args){
  const result=previousAdd.apply(this,args);
  capture(this);for(const object of args)capture(object);
  return result;
}
if(!window.__stellarTauRingDepthAddHook){
  THREE.Object3D.prototype.add=addWrapper;
  window.__stellarTauRingDepthAddHook={previousAdd,addWrapper};
}

function ringShadowMaterial(){
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.FrontSide,
    uniforms:{uShadow:{value:new THREE.Color('#150717')}},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec3 vP;uniform vec3 uShadow;void main(){
      float band=1.0-smoothstep(.045,.19,abs(vP.y));
      float penumbra=.46+.54*smoothstep(-.72,.56,vP.x);
      float breakup=.88+.12*sin(vP.x*31.0+vP.z*17.0);
      gl_FragColor=vec4(uShadow,band*penumbra*breakup*.48);
    }`
  });
  return material;
}
function ringScatterMaterial(nearSide){
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{
      uInner:{value:new THREE.Color(nearSide?'#ffd6ee':'#b56cc8')},
      uOuter:{value:new THREE.Color(nearSide?'#ff9fd4':'#7b4b9f')},
      uOpacity:{value:nearSide?.34:.19}
    },
    vertexShader:'varying float vR;varying float vA;void main(){vR=length(position.xy);vA=atan(position.y,position.x);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying float vR;varying float vA;uniform vec3 uInner;uniform vec3 uOuter;uniform float uOpacity;void main(){
      float radial=.5+.5*sin(vR*2.45+sin(vA*3.0)*.9);
      float fine=.5+.5*sin(vR*9.8-vA*2.0);
      float gaps=smoothstep(.24,.76,radial*.76+fine*.24);
      float edge=smoothstep(29.9,32.0,vR)*(1.0-smoothstep(53.2,55.5,vR));
      vec3 color=mix(uOuter,uInner,clamp(.18+.82*gaps,0.0,1.0));
      gl_FragColor=vec4(color,edge*uOpacity*(.26+.74*gaps));
    }`
  });
  material.forceSinglePass=true;return material;
}
function planeOffset(distance){return new THREE.Vector3(0,0,distance).applyEuler(RING_ROTATION)}
function shepherdLattice(){
  const geometry=new THREE.OctahedronGeometry(.28,0);
  const material=new THREE.MeshBasicMaterial({color:'#ffe2f3',transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending});
  material.forceSinglePass=true;
  const shepherds=new THREE.InstancedMesh(geometry,material,SHEPHERD_COUNT);
  shepherds.name=`${NAME}-shepherd-moonlets`;shepherds.rotation.copy(RING_ROTATION);shepherds.renderOrder=6;
  const dummy=new THREE.Object3D();let minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<SHEPHERD_COUNT;i++){
    const angle=i/SHEPHERD_COUNT*Math.PI*2+.16,lane=i%2===0?1:-1,radius=lane>0?48.2:34.6;
    const z=lane*2.1+Math.sin(angle*3)*.32;
    dummy.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,z);
    dummy.rotation.set(angle*.07,-angle*.04,angle);
    dummy.scale.setScalar(i%4===0?1.5:i%3===0?1.18:.88);
    dummy.updateMatrix();shepherds.setMatrixAt(i,dummy.matrix);
    minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
  }
  shepherds.instanceMatrix.needsUpdate=true;
  shepherdDepthRange={min:minZ,max:maxZ,span:maxZ-minZ};
  return shepherds;
}
function build(){
  if(!tauRoot||objects.length)return;
  const shadow=new THREE.Mesh(new THREE.SphereGeometry(1,48,24),ringShadowMaterial());
  shadow.name=`${NAME}-planet-ring-shadow`;shadow.scale.setScalar(PROFILE.radius*1.012);shadow.rotation.copy(RING_ROTATION);shadow.renderOrder=3;

  const nearRing=new THREE.Mesh(new THREE.RingGeometry(29.8,55.6,144,1,Math.PI*.04,Math.PI*.98),ringScatterMaterial(true));
  nearRing.name=`${NAME}-near-forward-scatter`;nearRing.rotation.copy(RING_ROTATION);nearRing.position.copy(planeOffset(.82));nearRing.renderOrder=5;

  const farRing=new THREE.Mesh(new THREE.RingGeometry(30.2,55.2,144,1,Math.PI*1.02,Math.PI*.98),ringScatterMaterial(false));
  farRing.name=`${NAME}-far-back-scatter`;farRing.rotation.copy(RING_ROTATION);farRing.position.copy(planeOffset(-.72));farRing.renderOrder=2;

  const shepherds=shepherdLattice();
  tauRoot.add(shadow,nearRing,farRing,shepherds);objects=[shadow,nearRing,farRing,shepherds];
}
function shouldRun(state){return !!state&&state.exploring&&!state.flying&&!state.contextLost&&state.qualityMode==='high'&&state.current==='TAU'}
function sync(){
  const sim=window.WarpSim;if(!sim?.state)return;const state=sim.state();lastState=state;const high=shouldRun(state);
  if(!high&&objects.length)disposeOwn();if(high&&tauRoot&&!objects.length)build();for(const object of objects)object.visible=high;
}
function snapshot(){
  const state=lastState||window.WarpSim?.state?.()||{},active=shouldRun(state)&&objects.length===4;
  return{visualPass:VISUAL_PASS,target:'TAU',quality:state.qualityMode||null,active,captured:!!tauRoot,captureCount,objects:objects.length,shepherds:active?SHEPHERD_COUNT:0,drawCalls:active?PROFILE.drawCalls:0,triangles:active?measureTriangles():0,budgetTriangles:PROFILE.triangles,shepherdDepthSpan:active?Number(shepherdDepthRange.span.toFixed(2)):0,budgetDepthSpan:PROFILE.depthSpan};
}
const timer=setInterval(sync,SAMPLE_MS);
const canvas=document.querySelector('#space');const qualityObserver=canvas?new MutationObserver(sync):null;
qualityObserver?.observe(canvas,{attributes:true,attributeFilter:['width','height']});
addEventListener('beforeunload',()=>{
  clearInterval(timer);qualityObserver?.disconnect();disposeOwn();
  const hook=window.__stellarTauRingDepthAddHook;
  if(hook?.addWrapper===addWrapper&&THREE.Object3D.prototype.add===addWrapper)THREE.Object3D.prototype.add=hook.previousAdd;
  if(hook?.addWrapper===addWrapper)delete window.__stellarTauRingDepthAddHook;
},{once:true});
window.WarpTauRingDepth={snapshot};sync();
