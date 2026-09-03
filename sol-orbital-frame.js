import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const NAME='stellar-sol-orbital-frame';
const VISUAL_PASS='orbital-observation-frame-v1';
const SAMPLE_MS=250;
const MAST_COUNT=16;
const LIGHT_COUNT=20;
const BRACE_SEGMENT_COUNT=30;
const PROFILE={
  earthCenter:new THREE.Vector3(14,-5,-80),earthRadius:18,
  moonCenter:new THREE.Vector3(-28,11,-128),moonRadius:4.7,
  triangles:352,drawCalls:3,masts:MAST_COUNT,lights:LIGHT_COUNT,braceSegments:BRACE_SEGMENT_COUNT,depthSpan:6.8
};
const approx=(a,b,t=.24)=>Math.abs(a-b)<=t;
let earthRoot=null,moonRoot=null,objects=[],captureCount=0,lastState=null,frameDepthRange={min:0,max:0,span:0};
const previousAdd=THREE.Object3D.prototype.add;

function planetCandidate(object,center,radius){
  if(!object?.isGroup||!approx(object.position.x,center.x)||!approx(object.position.y,center.y)||!approx(object.position.z,center.z))return false;
  return !!object.children?.find?.(child=>child?.isMesh&&approx(child.scale.x,radius,.42)&&approx(child.scale.y,radius,.42));
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
    object.removeFromParent();object.geometry?.dispose?.();
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const material of materials)material?.dispose?.();
  }
  objects=[];frameDepthRange={min:0,max:0,span:0};
}
function capture(object){
  if(planetCandidate(object,PROFILE.earthCenter,PROFILE.earthRadius)&&object!==earthRoot){disposeOwn();earthRoot=object;captureCount++}
  if(planetCandidate(object,PROFILE.moonCenter,PROFILE.moonRadius)&&object!==moonRoot){disposeOwn();moonRoot=object}
}
function addWrapper(...args){
  const result=previousAdd.apply(this,args);capture(this);for(const object of args)capture(object);return result;
}
if(!window.__stellarSolOrbitalFrameAddHook){
  THREE.Object3D.prototype.add=addWrapper;
  window.__stellarSolOrbitalFrameAddHook={previousAdd,addWrapper};
}

function mastField(){
  const geometry=new THREE.BoxGeometry(.34,4.8,.34);
  const material=new THREE.MeshStandardMaterial({color:'#799db8',emissive:'#17354d',emissiveIntensity:.7,metalness:.72,roughness:.28});
  const mesh=new THREE.InstancedMesh(geometry,material,MAST_COUNT);mesh.name=`${NAME}-foreground-masts`;
  const dummy=new THREE.Object3D();let minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<MAST_COUNT;i++){
    const t=i/(MAST_COUNT-1),a=-2.78+t*2.46,lane=i%2===0?-1:1,r=22.45+(i%3===0?.42:0),z=lane<0?3.15:9.55;
    dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,z+Math.sin(a*2.3)*.18);
    dummy.rotation.set(lane*.045,0,a+Math.PI/2);dummy.scale.set(1,i%5===0?1.35:i%3===0?1.16:1,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    minZ=Math.min(minZ,dummy.position.z);maxZ=Math.max(maxZ,dummy.position.z);
  }
  mesh.instanceMatrix.needsUpdate=true;frameDepthRange={min:minZ,max:maxZ,span:maxZ-minZ};return mesh;
}
function navigationLights(){
  const geometry=new THREE.OctahedronGeometry(.24,0);
  const material=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.92,depthWrite:false,blending:THREE.AdditiveBlending});
  const mesh=new THREE.InstancedMesh(geometry,material,LIGHT_COUNT);mesh.name=`${NAME}-navigation-lights`;
  const dummy=new THREE.Object3D(),cool=new THREE.Color('#a8e8ff'),warm=new THREE.Color('#ffd39a');
  for(let i=0;i<LIGHT_COUNT;i++){
    const t=i/(LIGHT_COUNT-1),a=-2.84+t*2.58,lane=i%2===0?-1:1,r=23.15,z=lane<0?3.55:9.95;
    dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,z+Math.cos(a*1.7)*.2);dummy.scale.setScalar(i%5===0?1.65:1);dummy.rotation.set(0,0,a);dummy.updateMatrix();
    mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,lane>0?warm:cool);
  }
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;return mesh;
}
function braceGeometry(){
  const positions=[],steps=13,start=-2.78,end=-.32,r=22.65;
  const point=(i,z)=>{const a=start+(end-start)*(i/(steps-1));return[Math.cos(a)*r,Math.sin(a)*r,z+Math.sin(a*2.3)*.18]};
  for(const z of[3.25,9.65])for(let i=0;i<steps-1;i++)positions.push(...point(i,z),...point(i+1,z));
  for(const i of[0,2,4,6,8,10])positions.push(...point(i,3.25),...point(i,9.65));
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return geometry;
}
function build(){
  if(!earthRoot||!moonRoot||objects.length)return;
  const masts=mastField();masts.renderOrder=3;
  const lights=navigationLights();lights.renderOrder=5;
  const braces=new THREE.LineSegments(braceGeometry(),new THREE.LineBasicMaterial({color:'#94d7f2',transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending}));
  braces.name=`${NAME}-dual-depth-braces`;braces.renderOrder=4;
  earthRoot.add(masts,braces,lights);objects=[masts,braces,lights];
}
function shouldRun(state){return !!state&&state.exploring&&!state.flying&&!state.contextLost&&state.qualityMode==='high'&&state.current==='SOL'}
function sync(){
  const sim=window.WarpSim;if(!sim?.state)return;const state=sim.state();lastState=state;const high=shouldRun(state);
  if(!high&&objects.length)disposeOwn();if(high&&earthRoot&&moonRoot&&!objects.length)build();for(const object of objects)object.visible=high;
}
function snapshot(){
  const state=lastState||window.WarpSim?.state?.()||{},active=shouldRun(state)&&objects.length===3;
  return{visualPass:VISUAL_PASS,target:'SOL',quality:state.qualityMode||null,active,captured:!!(earthRoot&&moonRoot),captureCount,objects:objects.length,masts:active?MAST_COUNT:0,lights:active?LIGHT_COUNT:0,braceSegments:active?BRACE_SEGMENT_COUNT:0,drawCalls:active?PROFILE.drawCalls:0,triangles:active?measureTriangles():0,budgetTriangles:PROFILE.triangles,frameDepthSpan:active?Number(frameDepthRange.span.toFixed(2)):0,budgetDepthSpan:PROFILE.depthSpan};
}
const timer=setInterval(sync,SAMPLE_MS);
const canvas=document.querySelector('#space');const qualityObserver=canvas?new MutationObserver(sync):null;
qualityObserver?.observe(canvas,{attributes:true,attributeFilter:['width','height']});
addEventListener('beforeunload',()=>{
  clearInterval(timer);qualityObserver?.disconnect();disposeOwn();
  const hook=window.__stellarSolOrbitalFrameAddHook;
  if(hook?.addWrapper===addWrapper&&THREE.Object3D.prototype.add===addWrapper)THREE.Object3D.prototype.add=hook.previousAdd;
  if(hook?.addWrapper===addWrapper)delete window.__stellarSolOrbitalFrameAddHook;
},{once:true});
window.WarpSolOrbitalFrame={snapshot};sync();