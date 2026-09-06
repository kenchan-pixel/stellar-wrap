import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const NAME='stellar-vega-gate-depth';
const VISUAL_PASS='parallax-aperture-v1';
const ARCHITECTURE_PASS='phase-threshold-spokes-v3';
const SAMPLE_MS=250;
const NODE_COUNT=24;
const THRESHOLD_COUNT=8;
const PROFILE={
  center:new THREE.Vector3(17,-1,-82),radius:24,
  triangles:2560,drawCalls:4,nodes:NODE_COUNT,depthSpan:5.8,thresholdDepthSpan:10.2
};
const approx=(a,b,t=.2)=>Math.abs(a-b)<=t;
let gate=null,objects=[],captureCount=0,lastState=null,nodeDepthRange={min:0,max:0,span:0},thresholdDepthRange={min:0,max:0,span:0};
const previousAdd=THREE.Object3D.prototype.add;

function gateCandidate(object){
  const geometry=object?.geometry;
  return !!(object?.isMesh&&geometry?.type==='TorusGeometry'&&approx(object.position.x,PROFILE.center.x)&&approx(object.position.y,PROFILE.center.y)&&approx(object.position.z,PROFILE.center.z)&&approx(geometry.parameters?.radius,PROFILE.radius,.15));
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
  objects=[];nodeDepthRange={min:0,max:0,span:0};thresholdDepthRange={min:0,max:0,span:0};
}
function capture(object){if(gateCandidate(object)&&object!==gate){disposeOwn();gate=object;captureCount++}}
function addWrapper(...args){
  const result=previousAdd.apply(this,args);
  capture(this);for(const object of args)capture(object);
  return result;
}
if(!window.__stellarVegaGateDepthAddHook){
  THREE.Object3D.prototype.add=addWrapper;
  window.__stellarVegaGateDepthAddHook={previousAdd,addWrapper};
}

function apertureMaterial(){
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{uInner:{value:new THREE.Color('#dff8ff')},uOuter:{value:new THREE.Color('#5baeff')},uOpacity:{value:.24}},
    vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vP;uniform vec3 uInner;uniform vec3 uOuter;uniform float uOpacity;void main(){
      float r=length(vP)/18.0;
      float edge=1.0-smoothstep(.86,1.0,r);
      float rings=.35+.65*pow(.5+.5*cos(r*45.0),5.0);
      float core=1.0-smoothstep(.05,.78,r);
      vec3 color=mix(uInner,uOuter,clamp(r*.9,0.0,1.0));
      gl_FragColor=vec4(color,edge*uOpacity*(.18+.46*rings+.36*core));
    }`
  });
  material.forceSinglePass=true;return material;
}
function arcMaterial(nearSide){
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{uA:{value:new THREE.Color(nearSide?'#f1fdff':'#6a94ff')},uB:{value:new THREE.Color(nearSide?'#78d8ff':'#805cff')},uOpacity:{value:nearSide?.78:.38}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vUv;uniform vec3 uA;uniform vec3 uB;uniform float uOpacity;void main(){
      float segment=.3+.7*smoothstep(.18,.82,.5+.5*sin(vUv.x*6.2831853*24.0));
      float pulse=.72+.28*sin(vUv.x*6.2831853*7.0+vUv.y*9.0);
      vec3 color=mix(uB,uA,clamp(.2+.8*segment,0.0,1.0));
      gl_FragColor=vec4(color,uOpacity*segment*pulse);
    }`
  });
  material.forceSinglePass=true;return material;
}
function phaseNodeLattice(){
  const geometry=new THREE.OctahedronGeometry(.24,0);
  const material=new THREE.MeshBasicMaterial({color:'#d6f6ff',transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending});
  material.forceSinglePass=true;
  const nodes=new THREE.InstancedMesh(geometry,material,NODE_COUNT);
  nodes.name=`${NAME}-phase-nodes`;nodes.renderOrder=7;
  const dummy=new THREE.Object3D();let minZ=Infinity,maxZ=-Infinity,thresholdMin=Infinity,thresholdMax=-Infinity,thresholds=0;
  for(let i=0;i<NODE_COUNT;i++){
    const angle=i/NODE_COUNT*Math.PI*2+.08,lane=i%2===0?1:-1,radius=lane>0?27.6:21.2;
    const z=lane*2.35+Math.sin(angle*3.0)*.28;
    const threshold=i%3===0;
    const pylonLength=i%6===0?9.2:i%3===0?7.8:6.6;
    const thickness=i%4===0?1.8:1.35;
    dummy.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,z);
    if(threshold){
      dummy.rotation.set(Math.sin(angle)*.31*lane,-Math.cos(angle)*.31*lane,angle);
      dummy.scale.set(2.4,1.45,10.0);
      const halfDepth=.24*10.0;
      thresholdMin=Math.min(thresholdMin,z-halfDepth);thresholdMax=Math.max(thresholdMax,z+halfDepth);thresholds++;
    }else{
      dummy.rotation.set(lane*.08,-lane*.05,angle+(lane<0?Math.PI/2:0));
      dummy.scale.set(pylonLength,thickness,lane>0?1.6:1.25);
    }
    dummy.updateMatrix();nodes.setMatrixAt(i,dummy.matrix);
    minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
  }
  nodes.instanceMatrix.needsUpdate=true;
  nodeDepthRange={min:minZ,max:maxZ,span:maxZ-minZ};
  thresholdDepthRange=thresholds===THRESHOLD_COUNT?{min:thresholdMin,max:thresholdMax,span:thresholdMax-thresholdMin}:{min:0,max:0,span:0};
  return nodes;
}
function build(){
  if(!gate||objects.length)return;
  const aperture=new THREE.Mesh(new THREE.CircleGeometry(18,64),apertureMaterial());
  aperture.name=`${NAME}-aperture-membrane`;aperture.position.z=-.12;aperture.renderOrder=3;

  const nearArc=new THREE.Mesh(new THREE.TorusGeometry(25.4,.24,6,96,Math.PI*1.08),arcMaterial(true));
  nearArc.name=`${NAME}-near-phase-rail`;nearArc.position.z=.9;nearArc.rotation.z=-Math.PI*.08;nearArc.renderOrder=6;

  const farArc=new THREE.Mesh(new THREE.TorusGeometry(25.4,.24,6,96,Math.PI*1.08),arcMaterial(false));
  farArc.name=`${NAME}-far-phase-rail`;farArc.position.z=-.8;farArc.rotation.z=Math.PI*.92;farArc.renderOrder=2;

  const nodes=phaseNodeLattice();
  gate.add(aperture,nearArc,farArc,nodes);objects=[aperture,nearArc,farArc,nodes];
}
function shouldRun(state){return !!state&&state.exploring&&!state.flying&&!state.contextLost&&state.qualityMode==='high'&&state.current==='VEGA'}
function sync(){
  const sim=window.WarpSim;if(!sim?.state)return;const state=sim.state();lastState=state;const high=shouldRun(state);
  if(!high&&objects.length)disposeOwn();if(high&&gate&&!objects.length)build();for(const object of objects)object.visible=high;
}
function snapshot(){
  const state=lastState||window.WarpSim?.state?.()||{},active=shouldRun(state)&&objects.length===4;
  return{visualPass:VISUAL_PASS,architecture:ARCHITECTURE_PASS,target:'VEGA',quality:state.qualityMode||null,active,captured:!!gate,captureCount,objects:objects.length,nodes:active?NODE_COUNT:0,thresholds:active?THRESHOLD_COUNT:0,drawCalls:active?PROFILE.drawCalls:0,triangles:active?measureTriangles():0,budgetTriangles:PROFILE.triangles,nodeDepthSpan:active?Number(nodeDepthRange.span.toFixed(2)):0,budgetDepthSpan:PROFILE.depthSpan,thresholdDepthSpan:active?Number(thresholdDepthRange.span.toFixed(2)):0,budgetThresholdDepthSpan:PROFILE.thresholdDepthSpan};
}
const timer=setInterval(sync,SAMPLE_MS);
const canvas=document.querySelector('#space');const qualityObserver=canvas?new MutationObserver(sync):null;
qualityObserver?.observe(canvas,{attributes:true,attributeFilter:['width','height']});
addEventListener('beforeunload',()=>{
  clearInterval(timer);qualityObserver?.disconnect();disposeOwn();
  const hook=window.__stellarVegaGateDepthAddHook;
  if(hook?.addWrapper===addWrapper&&THREE.Object3D.prototype.add===addWrapper)THREE.Object3D.prototype.add=hook.previousAdd;
  if(hook?.addWrapper===addWrapper)delete window.__stellarVegaGateDepthAddHook;
},{once:true});
window.WarpVegaGateDepth={snapshot};sync();
