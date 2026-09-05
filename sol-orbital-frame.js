import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const NAME='stellar-sol-orbital-frame';
const VISUAL_PASS='orbital-observation-frame-v1';
const GANTRY_PROFILE='orbital-perspective-gantry-v2';
const LATTICE_PROFILE='orbital-observation-lattice-v3';
const SAMPLE_MS=250;
const BAY_COUNT=8;
const MAST_COUNT=16;
const LIGHT_COUNT=20;
const BRACE_SEGMENT_COUNT=30;
const NEAR_MAST_SCALE=1.46;
const FAR_MAST_SCALE=.72;
const FRAME_START=-2.78;
const FRAME_END=-.42;
const PROFILE={
  earthCenter:new THREE.Vector3(14,-5,-80),earthRadius:18,
  moonCenter:new THREE.Vector3(-28,11,-128),moonRadius:4.7,
  triangles:352,drawCalls:3,bays:BAY_COUNT,masts:MAST_COUNT,lights:LIGHT_COUNT,braceSegments:BRACE_SEGMENT_COUNT,depthSpan:6.8
};
const approx=(a,b,t=.24)=>Math.abs(a-b)<=t;
let earthRoot=null,moonRoot=null,objects=[],captureCount=0,lastState=null,frameDepthRange={min:0,max:0,span:0},mastScaleRange={min:0,max:0,ratio:0};
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
  objects=[];frameDepthRange={min:0,max:0,span:0};mastScaleRange={min:0,max:0,ratio:0};
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
  const geometry=new THREE.BoxGeometry(.46,6.2,.46);
  const material=new THREE.MeshStandardMaterial({color:'#83a9c2',emissive:'#173d59',emissiveIntensity:.78,metalness:.76,roughness:.25});
  const mesh=new THREE.InstancedMesh(geometry,material,MAST_COUNT);mesh.name=`${NAME}-perspective-masts`;
  const dummy=new THREE.Object3D();let minZ=Infinity,maxZ=-Infinity,minScale=Infinity,maxScale=-Infinity;
  for(let i=0;i<MAST_COUNT;i++){
    const bay=Math.floor(i/2),t=bay/(BAY_COUNT-1),a=FRAME_START+t*(FRAME_END-FRAME_START),near=i%2===0,r=near?24.15:22.65,z=near?9.55:3.15,scaleY=near?NEAR_MAST_SCALE:FAR_MAST_SCALE,cross=near?1.18:.82;
    dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,z+Math.sin(a*2.3)*.18);
    dummy.rotation.set(near?.06:-.035,0,a+Math.PI/2);dummy.scale.set(cross,scaleY,cross);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    minZ=Math.min(minZ,dummy.position.z);maxZ=Math.max(maxZ,dummy.position.z);minScale=Math.min(minScale,scaleY);maxScale=Math.max(maxScale,scaleY);
  }
  mesh.instanceMatrix.needsUpdate=true;frameDepthRange={min:minZ,max:maxZ,span:maxZ-minZ};mastScaleRange={min:minScale,max:maxScale,ratio:maxScale/minScale};return mesh;
}
function navigationLights(){
  const geometry=new THREE.OctahedronGeometry(.24,0);
  const material=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending});
  const mesh=new THREE.InstancedMesh(geometry,material,LIGHT_COUNT);mesh.name=`${NAME}-perspective-navigation-lights`;
  const dummy=new THREE.Object3D(),cool=new THREE.Color('#a8e8ff'),warm=new THREE.Color('#ffd39a'),laneCount=LIGHT_COUNT/2;
  for(let i=0;i<LIGHT_COUNT;i++){
    const lane=Math.floor(i/2),t=lane/(laneCount-1),a=FRAME_START+t*(FRAME_END-FRAME_START),near=i%2===0,r=near?24.55:23.05,z=near?9.95:3.55,scale=near?2.05:.82;
    dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,z+Math.cos(a*1.7)*.2);dummy.scale.setScalar(i%5===0?scale*1.22:scale);dummy.rotation.set(0,0,a);dummy.updateMatrix();
    mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,near?warm:cool);
  }
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;return mesh;
}
function braceGeometry(){
  const positions=[],steps=BAY_COUNT,start=FRAME_START,end=FRAME_END,farR=22.85,nearR=24.15,farZ=3.25,nearZ=9.65;
  const point=(i,z,r)=>{const a=start+(end-start)*(i/(steps-1));return[Math.cos(a)*r,Math.sin(a)*r,z+Math.sin(a*2.3)*.18]};
  for(const [z,r] of[[farZ,farR],[nearZ,nearR]])for(let i=0;i<steps-1;i++)positions.push(...point(i,z,r),...point(i+1,z,r));
  for(let i=0;i<steps;i++)positions.push(...point(i,farZ,farR),...point(i,nearZ,nearR));
  for(let i=0;i<steps-1;i++)positions.push(...point(i,farZ,farR),...point(i+1,nearZ,nearR));
  positions.push(...point(steps-1,farZ,farR),...point(steps-2,nearZ,nearR));
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return geometry;
}
function build(){
  if(!earthRoot||!moonRoot||objects.length)return;
  const masts=mastField();masts.renderOrder=3;
  const lights=navigationLights();lights.renderOrder=5;
  const braces=new THREE.LineSegments(braceGeometry(),new THREE.LineBasicMaterial({color:'#a8e7ff',transparent:true,opacity:.62,depthWrite:false,blending:THREE.AdditiveBlending}));
  braces.name=`${NAME}-perspective-chevron-braces`;braces.renderOrder=4;
  earthRoot.add(masts,braces,lights);objects=[masts,braces,lights];
}
function shouldRun(state){return !!state&&state.exploring&&!state.flying&&!state.contextLost&&state.qualityMode==='high'&&state.current==='SOL'}
function sync(){
  const sim=window.WarpSim;if(!sim?.state)return;const state=sim.state();lastState=state;const high=shouldRun(state);
  if(!high&&objects.length)disposeOwn();if(high&&earthRoot&&moonRoot&&!objects.length)build();for(const object of objects)object.visible=high;
}
function snapshot(){
  const state=lastState||window.WarpSim?.state?.()||{},active=shouldRun(state)&&objects.length===3;
  return{visualPass:VISUAL_PASS,gantryProfile:active?GANTRY_PROFILE:null,latticeProfile:active?LATTICE_PROFILE:null,target:'SOL',quality:state.qualityMode||null,active,captured:!!(earthRoot&&moonRoot),captureCount,objects:objects.length,bays:active?BAY_COUNT:0,masts:active?MAST_COUNT:0,lights:active?LIGHT_COUNT:0,braceSegments:active?BRACE_SEGMENT_COUNT:0,drawCalls:active?PROFILE.drawCalls:0,triangles:active?measureTriangles():0,budgetTriangles:PROFILE.triangles,frameDepthSpan:active?Number(frameDepthRange.span.toFixed(2)):0,budgetDepthSpan:PROFILE.depthSpan,mastScaleRatio:active?Number(mastScaleRange.ratio.toFixed(2)):0};
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