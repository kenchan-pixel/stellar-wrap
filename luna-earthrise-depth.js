import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const NAME='stellar-luna-earthrise-depth';
const VISUAL_PASS='earthrise-parallax-v1';
const SAMPLE_MS=250;
const BEACON_COUNT=18;
const PROFILE={
  moonCenter:new THREE.Vector3(13,-7,-70),moonRadius:21,
  earthCenter:new THREE.Vector3(-35,17,-146),earthRadius:12,
  ringCenter:new THREE.Vector3(13,-7,-70),ringRadius:26,
  triangles:2704,drawCalls:4,beacons:BEACON_COUNT,depthSpan:3.8
};
const approx=(a,b,t=.24)=>Math.abs(a-b)<=t;
let moonRoot=null,earthRoot=null,ring=null,objects=[],captureCount=0,lastState=null,beaconDepthRange={min:0,max:0,span:0};
const previousAdd=THREE.Object3D.prototype.add;

function planetCandidate(object,center,radius){
  if(!object?.isGroup||!approx(object.position.x,center.x)||!approx(object.position.y,center.y)||!approx(object.position.z,center.z))return false;
  return !!object.children?.find?.(child=>child?.isMesh&&approx(child.scale.x,radius,.42)&&approx(child.scale.y,radius,.42));
}
function ringCandidate(object){
  const p=object?.geometry?.parameters||{};
  return !!(object?.isMesh&&object.geometry?.type==='TorusGeometry'&&approx(object.position.x,PROFILE.ringCenter.x,.35)&&approx(object.position.y,PROFILE.ringCenter.y,.35)&&approx(object.position.z,PROFILE.ringCenter.z,.35)&&approx(p.radius,PROFILE.ringRadius,.2));
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
  objects=[];beaconDepthRange={min:0,max:0,span:0};
}
function capture(object){
  if(planetCandidate(object,PROFILE.moonCenter,PROFILE.moonRadius)&&object!==moonRoot){disposeOwn();moonRoot=object;captureCount++}
  if(planetCandidate(object,PROFILE.earthCenter,PROFILE.earthRadius)&&object!==earthRoot){disposeOwn();earthRoot=object}
  if(ringCandidate(object)&&object!==ring){disposeOwn();ring=object}
}
function addWrapper(...args){
  const result=previousAdd.apply(this,args);
  capture(this);for(const object of args)capture(object);
  return result;
}
if(!window.__stellarLunaEarthriseDepthAddHook){
  THREE.Object3D.prototype.add=addWrapper;
  window.__stellarLunaEarthriseDepthAddHook={previousAdd,addWrapper};
}

function horizonMaterial(){
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{uA:{value:new THREE.Color('#a8c9e8')},uB:{value:new THREE.Color('#f5fbff')}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vUv;uniform vec3 uA;uniform vec3 uB;void main(){
      float taper=smoothstep(.02,.16,vUv.x)*(1.0-smoothstep(.84,.99,vUv.x));
      float ridge=pow(max(0.0,.5+.5*sin(vUv.x*6.2831853*9.0+vUv.y*7.0)),5.0);
      float soft=.58+.42*smoothstep(.18,.82,vUv.y);
      vec3 color=mix(uA,uB,clamp(.24+ridge*.72,0.0,1.0));
      gl_FragColor=vec4(color,taper*soft*(.18+ridge*.34));
    }`
  });
  material.forceSinglePass=true;return material;
}
function earthriseMaterial(){
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide,
    uniforms:{uBlue:{value:new THREE.Color('#5faaff')},uWhite:{value:new THREE.Color('#effcff')}},
    vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:`varying vec3 vN;varying vec3 vV;uniform vec3 uBlue;uniform vec3 uWhite;void main(){
      float rim=pow(1.0-clamp(dot(vN,vV),0.0,1.0),2.35);
      float crescent=smoothstep(-.18,.72,vN.x*.86+vN.y*.18);
      float edge=smoothstep(.08,1.0,rim);
      vec3 color=mix(uBlue,uWhite,clamp(rim*.9+crescent*.22,0.0,1.0));
      gl_FragColor=vec4(color,edge*(.14+.48*crescent));
    }`
  });
  material.forceSinglePass=true;return material;
}
function beaconLattice(){
  const geometry=new THREE.OctahedronGeometry(.2,0);
  const material=new THREE.MeshBasicMaterial({color:'#dff8ff',transparent:true,opacity:.86,depthWrite:false,blending:THREE.AdditiveBlending});
  material.forceSinglePass=true;
  const beacons=new THREE.InstancedMesh(geometry,material,BEACON_COUNT);beacons.name=`${NAME}-orbital-beacons`;
  const dummy=new THREE.Object3D(),near=new THREE.Color('#f5fdff'),far=new THREE.Color('#86cdf8');
  let minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<BEACON_COUNT;i++){
    const a=i/BEACON_COUNT*Math.PI*2,lane=i%2===0?1:-1,r=lane>0?26.45:25.75,z=lane*1.55+Math.sin(a*2)*.32;
    dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,z);dummy.rotation.set(a*.08,-a*.05,a);dummy.scale.setScalar(i%6===0?1.65:i%3===0?1.28:.9);dummy.updateMatrix();
    beacons.setMatrixAt(i,dummy.matrix);beacons.setColorAt(i,lane>0?near:far);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
  }
  beacons.instanceMatrix.needsUpdate=true;if(beacons.instanceColor)beacons.instanceColor.needsUpdate=true;
  beaconDepthRange={min:minZ,max:maxZ,span:maxZ-minZ};return beacons;
}
function railGeometry(){
  const segments=28,positions=[];
  for(const lane of[-1,1]){
    const radius=lane>0?26.55:25.65,z=lane*1.52;
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
      positions.push(Math.cos(a)*radius,Math.sin(a)*radius,z+Math.sin(a*2)*.28,Math.cos(b)*radius,Math.sin(b)*radius,z+Math.sin(b*2)*.28);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return geometry;
}
function build(){
  if(!moonRoot||!earthRoot||!ring||objects.length)return;
  const horizon=new THREE.Mesh(new THREE.TorusGeometry(21.55,.14,6,112,Math.PI*1.22),horizonMaterial());
  horizon.name=`${NAME}-lunar-horizon`;horizon.rotation.set(1.34,.16,-.52);horizon.position.set(.25,.15,1.15);horizon.renderOrder=2;
  const earthrise=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),earthriseMaterial());
  earthrise.name=`${NAME}-earthrise-crescent`;earthrise.scale.setScalar(PROFILE.earthRadius*1.13);earthrise.renderOrder=2;
  const beacons=beaconLattice();beacons.renderOrder=4;
  const rails=new THREE.LineSegments(railGeometry(),new THREE.LineBasicMaterial({color:'#8ddcff',transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending}));
  rails.name=`${NAME}-dual-orbital-rails`;rails.renderOrder=3;
  moonRoot.add(horizon);earthRoot.add(earthrise);ring.add(beacons,rails);objects=[horizon,earthrise,beacons,rails];
}
function shouldRun(state){return !!state&&state.exploring&&!state.flying&&!state.contextLost&&state.qualityMode==='high'&&state.current==='LUNA'}
function sync(){
  const sim=window.WarpSim;if(!sim?.state)return;const state=sim.state();lastState=state;const high=shouldRun(state);
  if(!high&&objects.length)disposeOwn();if(high&&moonRoot&&earthRoot&&ring&&!objects.length)build();for(const object of objects)object.visible=high;
}
function snapshot(){
  const state=lastState||window.WarpSim?.state?.()||{},active=shouldRun(state)&&objects.length===4;
  return{visualPass:VISUAL_PASS,target:'LUNA',quality:state.qualityMode||null,active,captured:!!(moonRoot&&earthRoot&&ring),captureCount,objects:objects.length,beacons:active?BEACON_COUNT:0,drawCalls:active?PROFILE.drawCalls:0,triangles:active?measureTriangles():0,budgetTriangles:PROFILE.triangles,beaconDepthSpan:active?Number(beaconDepthRange.span.toFixed(2)):0,budgetDepthSpan:PROFILE.depthSpan};
}
const timer=setInterval(sync,SAMPLE_MS);
const canvas=document.querySelector('#space');const qualityObserver=canvas?new MutationObserver(sync):null;
qualityObserver?.observe(canvas,{attributes:true,attributeFilter:['width','height']});
addEventListener('beforeunload',()=>{
  clearInterval(timer);qualityObserver?.disconnect();disposeOwn();
  const hook=window.__stellarLunaEarthriseDepthAddHook;
  if(hook?.addWrapper===addWrapper&&THREE.Object3D.prototype.add===addWrapper)THREE.Object3D.prototype.add=hook.previousAdd;
  if(hook?.addWrapper===addWrapper)delete window.__stellarLunaEarthriseDepthAddHook;
},{once:true});
window.WarpLunaEarthriseDepth={snapshot};sync();