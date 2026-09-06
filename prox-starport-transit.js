import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const NAME='stellar-prox-starport-transit';
const VISUAL_PASS='starport-transit-lattice-v2';
const GANTRY_PASS='docking-gate-cascade-v3';
const SAMPLE_MS=250;
const PROFILE={starportCenter:new THREE.Vector3(15,-6,-82),starportRadius:20,starportTube:.42,triangles:2520,drawCalls:4,beacons:36,gantryBeams:18,gantryFrames:3,gantryFrontZ:6.2,gantryMidZ:3.4,gantryFarZ:.6,gantryDepthSpan:5.6,gantryPerspectiveRatio:1.48,depthBudget:8.2,laneDepthAmplitude:1.62,laneScaleFar:.94,laneScaleNear:1.08,laneDepthBudget:3.6};
const approx=(a,b,t=.25)=>Math.abs(a-b)<=t;
const emptyGantryMatrixMetrics=()=>({frames:0,frameDepths:[],frameWidths:[],depthSpan:0,nearWidth:0,farWidth:0,perspectiveRatio:0,rails:0,railDepthMin:0,railDepthMax:0});
let starport=null,objects=[],captureCount=0,lastState=null,beaconDepth={min:0,max:0,span:0},laneDepth={min:0,max:0,span:0,scaleMin:0,scaleMax:0,scaleRatio:0},gantryMatrixMetrics=emptyGantryMatrixMetrics();
const previousAdd=THREE.Object3D.prototype.add;

function measureTriangles(list=objects){
  let triangles=0;
  for(const object of list){
    if(!object?.isMesh)continue;
    const geometry=object.geometry;if(!geometry)continue;
    const base=(geometry.index?.count??geometry.attributes?.position?.count??0)/3;
    triangles+=base*(object.isInstancedMesh?object.count:1);
  }
  return Math.round(triangles);
}
function clearLaneDepth(){laneDepth={min:0,max:0,span:0,scaleMin:0,scaleMax:0,scaleRatio:0}}
function clearGantryMatrixMetrics(){gantryMatrixMetrics=emptyGantryMatrixMetrics()}
function disposeOwn(){
  for(const object of objects){
    object.removeFromParent();
    object.geometry?.dispose?.();
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const material of materials)material?.dispose?.();
  }
  objects=[];clearLaneDepth();clearGantryMatrixMetrics();
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
  let minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<PROFILE.beacons;i++){
    const a=(i/PROFILE.beacons)*Math.PI*2+.12,r=i%3===0?26.1:23.6,z=Math.sin(a*3.0)*1.45+(i%2?-.35:.35);
    positions[i*3]=Math.cos(a)*r;
    positions[i*3+1]=Math.sin(a)*r;
    positions[i*3+2]=z;
    minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
    mixed.copy(cool).lerp(warm,i%4===0?.78:.16);
    colors[i*3]=mixed.r;colors[i*3+1]=mixed.g;colors[i*3+2]=mixed.b;
  }
  beaconDepth={min:minZ,max:maxZ,span:maxZ-minZ};
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  return geometry;
}
function deformLaneGeometry(geometry,direction=1){
  const position=geometry.attributes.position,uv=geometry.attributes.uv;
  let minZ=Infinity,maxZ=-Infinity,minScale=Infinity,maxScale=-Infinity;
  for(let i=0;i<position.count;i++){
    const u=uv.getX(i),sweep=Math.sin((u-.5)*Math.PI)*direction;
    const depth=sweep*PROFILE.laneDepthAmplitude;
    const scale=PROFILE.laneScaleFar+((sweep+1)*.5)*(PROFILE.laneScaleNear-PROFILE.laneScaleFar);
    position.setXYZ(i,position.getX(i)*scale,position.getY(i)*scale,position.getZ(i)+depth);
    minZ=Math.min(minZ,position.getZ(i));maxZ=Math.max(maxZ,position.getZ(i));minScale=Math.min(minScale,scale);maxScale=Math.max(maxScale,scale);
  }
  position.needsUpdate=true;geometry.computeBoundingSphere();geometry.computeBoundingBox();
  return{minZ,maxZ,scaleMin:minScale,scaleMax:maxScale};
}
function gantrySegments(){
  const near=[new THREE.Vector3(-13,-17,PROFILE.gantryFrontZ),new THREE.Vector3(13,-17,PROFILE.gantryFrontZ),new THREE.Vector3(11,-10,PROFILE.gantryFrontZ),new THREE.Vector3(-11,-10,PROFILE.gantryFrontZ)];
  const mid=[new THREE.Vector3(-11,-16,PROFILE.gantryMidZ),new THREE.Vector3(11,-16,PROFILE.gantryMidZ),new THREE.Vector3(9.1,-9.4,PROFILE.gantryMidZ),new THREE.Vector3(-9.1,-9.4,PROFILE.gantryMidZ)];
  const far=[new THREE.Vector3(-8.8,-15,PROFILE.gantryFarZ),new THREE.Vector3(8.8,-15,PROFILE.gantryFarZ),new THREE.Vector3(7.2,-9.3,PROFILE.gantryFarZ),new THREE.Vector3(-7.2,-9.3,PROFILE.gantryFarZ)];
  const segments=[];
  const edge=(a,b)=>segments.push([a,b]);
  for(const frame of[near,mid,far]){edge(frame[0],frame[1]);edge(frame[1],frame[2]);edge(frame[2],frame[3]);edge(frame[3],frame[0])}
  for(let i=0;i<4;i++)edge(near[i],far[i]);
  edge(new THREE.Vector3(0,-17,PROFILE.gantryFrontZ),new THREE.Vector3(0,-15,PROFILE.gantryFarZ));
  edge(new THREE.Vector3(0,-10,PROFILE.gantryFrontZ),new THREE.Vector3(0,-9.3,PROFILE.gantryFarZ));
  return segments;
}
function measureGantryMatrices(gantry){
  const matrix=new THREE.Matrix4(),center=new THREE.Vector3(),axis=new THREE.Vector3();
  const frames=[],rails=[];
  for(let i=0;i<gantry.count;i++){
    gantry.getMatrixAt(i,matrix);
    const e=matrix.elements;
    center.set(e[12],e[13],e[14]);axis.set(e[4],e[5],e[6]);
    const length=axis.length();if(!Number.isFinite(length)||length<=0)continue;
    const direction=axis.clone().multiplyScalar(1/length),half=direction.clone().multiplyScalar(length*.5);
    const a=center.clone().sub(half),b=center.clone().add(half),depth=Math.abs(a.z-b.z);
    if(depth>.5){rails.push(depth);continue}
    const z=(a.z+b.z)*.5;
    let frame=frames.find(entry=>Math.abs(entry.z-z)<.05);
    if(!frame){frame={z,endpoints:[]};frames.push(frame)}
    frame.endpoints.push(a,b);
  }
  frames.sort((a,b)=>a.z-b.z);
  const frameDepths=frames.map(frame=>frame.z),frameWidths=frames.map(frame=>Math.max(...frame.endpoints.map(point=>point.x))-Math.min(...frame.endpoints.map(point=>point.x)));
  const depthSpan=frameDepths.length?Math.max(...frameDepths)-Math.min(...frameDepths):0;
  const farWidth=frameWidths[0]||0,nearWidth=frameWidths[frameWidths.length-1]||0;
  return{frames:frames.length,frameDepths,frameWidths,depthSpan,nearWidth,farWidth,perspectiveRatio:farWidth?nearWidth/farWidth:0,rails:rails.length,railDepthMin:rails.length?Math.min(...rails):0,railDepthMax:rails.length?Math.max(...rails):0};
}
function gantryMesh(){
  const beamGeometry=new THREE.BoxGeometry(1,1,1);
  const beamMaterial=new THREE.MeshBasicMaterial({color:'#c8f5ff',transparent:true,opacity:.68,depthWrite:false,blending:THREE.AdditiveBlending});
  beamMaterial.forceSinglePass=true;
  const gantry=new THREE.InstancedMesh(beamGeometry,beamMaterial,PROFILE.gantryBeams);
  gantry.name=`${NAME}-foreground-docking-gate-cascade`;gantry.frustumCulled=false;
  const helper=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),delta=new THREE.Vector3();
  const segments=gantrySegments();
  for(let i=0;i<segments.length;i++){
    const [a,b]=segments[i];delta.subVectors(b,a);const length=delta.length();
    helper.position.copy(a).add(b).multiplyScalar(.5);
    helper.quaternion.setFromUnitVectors(up,delta.clone().normalize());
    helper.scale.set(.22,length,.22);helper.updateMatrix();gantry.setMatrixAt(i,helper.matrix);
  }
  gantry.instanceMatrix.needsUpdate=true;
  return gantry;
}
function build(){
  if(!starport||objects.length)return;
  const outer=new THREE.Mesh(new THREE.TorusGeometry(23.2,.14,6,96,Math.PI*1.36),laneMaterial(.32,'#7beeff','#fff2cf'));
  const outerDepth=deformLaneGeometry(outer.geometry,1);
  outer.name=`${NAME}-outer-transit-lane`;outer.rotation.set(.22,-.12,.44);
  const crossing=new THREE.Mesh(new THREE.TorusGeometry(25.8,.11,6,96,Math.PI*1.08),laneMaterial(2.3,'#ffb062','#e8fbff'));
  const crossingDepth=deformLaneGeometry(crossing.geometry,-1);
  crossing.name=`${NAME}-crossing-transit-lane`;crossing.rotation.set(-.38,.34,-.56);
  laneDepth={min:Math.min(outerDepth.minZ,crossingDepth.minZ),max:Math.max(outerDepth.maxZ,crossingDepth.maxZ),span:0,scaleMin:Math.min(outerDepth.scaleMin,crossingDepth.scaleMin),scaleMax:Math.max(outerDepth.scaleMax,crossingDepth.scaleMax),scaleRatio:0};
  laneDepth.span=laneDepth.max-laneDepth.min;laneDepth.scaleRatio=laneDepth.scaleMax/laneDepth.scaleMin;
  const beacons=new THREE.Points(beaconGeometry(),new THREE.PointsMaterial({size:.5,vertexColors:true,transparent:true,opacity:.86,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
  beacons.name=`${NAME}-approach-beacons`;beacons.rotation.set(.08,-.16,.2);
  const gantry=gantryMesh();gantryMatrixMetrics=measureGantryMatrices(gantry);
  starport.add(outer,crossing,beacons,gantry);objects=[outer,crossing,beacons,gantry];
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
  const active=shouldRun(state)&&objects.length===4;
  const trafficMin=active?Math.min(beaconDepth.min,laneDepth.min):0;
  const matrixFront=active&&gantryMatrixMetrics.frameDepths.length?Math.max(...gantryMatrixMetrics.frameDepths):0;
  return{visualPass:VISUAL_PASS,gantryPass:GANTRY_PASS,target:'PROX',quality:state.qualityMode||null,active,captured:!!starport,captureCount,objects:objects.length,drawCalls:active?PROFILE.drawCalls:0,triangles:active?measureTriangles():0,budgetTriangles:PROFILE.triangles,beacons:active?PROFILE.beacons:0,gantryBeams:active?PROFILE.gantryBeams:0,gantryFrames:active?PROFILE.gantryFrames:0,gantryDepthSpan:active?PROFILE.gantryDepthSpan:0,gantryPerspectiveRatio:active?PROFILE.gantryPerspectiveRatio:0,gantryMatrixFrames:active?gantryMatrixMetrics.frames:0,gantryMatrixFrameDepths:active?[...gantryMatrixMetrics.frameDepths]:[],gantryMatrixFrameWidths:active?[...gantryMatrixMetrics.frameWidths]:[],gantryMatrixDepthSpan:active?gantryMatrixMetrics.depthSpan:0,gantryMatrixNearWidth:active?gantryMatrixMetrics.nearWidth:0,gantryMatrixFarWidth:active?gantryMatrixMetrics.farWidth:0,gantryMatrixPerspectiveRatio:active?gantryMatrixMetrics.perspectiveRatio:0,gantryMatrixRails:active?gantryMatrixMetrics.rails:0,gantryMatrixRailDepthMin:active?gantryMatrixMetrics.railDepthMin:0,gantryMatrixRailDepthMax:active?gantryMatrixMetrics.railDepthMax:0,beaconDepthSpan:active?beaconDepth.span:0,laneDepthSpan:active?laneDepth.span:0,laneScaleRatio:active?laneDepth.scaleRatio:0,laneDepthBudget:PROFILE.laneDepthBudget,foregroundDepthLead:active?matrixFront-trafficMin:0,depthBudget:PROFILE.depthBudget,singlePass:active&&objects.filter(object=>object.isMesh).every(object=>object.material?.forceSinglePass===true)};
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
