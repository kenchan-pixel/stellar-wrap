import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const SAMPLE_MS=250;
const VISUAL_PASS='prominence-observatory-v2';
const PROFILE=Object.freeze({
  starCenter:new THREE.Vector3(28,8,-137),starRadius:30,
  rockCenter:new THREE.Vector3(-26,-12,-90),rockRadius:10,
  triangles:3264,drawCalls:3,observatoryMasts:16,mastDepthBudget:2.2,foregroundLeadBudget:58,
  mastSilhouetteSpanMin:5.8,mastSilhouetteBiasXMin:2.5,mastHeightMin:2.6,mastHeightMax:3.8
});
const NAME='stellar-cinematic-orion-prominence';
let star=null,rockRoot=null,objects=[],captureCount=0,mastDepth={min:0,max:0,span:0},mastSilhouette={minX:0,maxX:0,minY:0,maxY:0,spanY:0,minHeight:0,maxHeight:0};
let addHooked=false,originalAdd=null,addWrapper=null;
let qualityHooked=false,originalSetQuality=null,qualityWrapper=null;
let lastSnapshot={active:false,target:null,quality:null,objects:0,triangles:0,budgetTriangles:0,drawCalls:0,captured:false,captureCount:0,visualPass:VISUAL_PASS};

function approx(a,b,t=.18){return Math.abs(a-b)<=t}
function starMatches(candidate){return !!(candidate?.isMesh&&approx(candidate.position.x,PROFILE.starCenter.x)&&approx(candidate.position.y,PROFILE.starCenter.y)&&approx(candidate.position.z,PROFILE.starCenter.z)&&approx(candidate.scale.x,PROFILE.starRadius,.45)&&approx(candidate.scale.y,PROFILE.starRadius,.45))}
function rockMatches(candidate){
  if(!candidate?.isGroup||!approx(candidate.position.x,PROFILE.rockCenter.x)||!approx(candidate.position.y,PROFILE.rockCenter.y)||!approx(candidate.position.z,PROFILE.rockCenter.z))return false;
  return !!candidate.children?.find?.(child=>child?.isMesh&&approx(child.scale.x,PROFILE.rockRadius,.42)&&approx(child.scale.y,PROFILE.rockRadius,.42));
}
function geometryTriangleCount(object){
  if(!object?.isMesh||!object.geometry)return 0;
  const geometry=object.geometry,indexCount=geometry.index?.count,positionCount=geometry.attributes?.position?.count;
  const base=Number.isFinite(indexCount)?indexCount/3:Number.isFinite(positionCount)?positionCount/3:0;
  return Math.floor(base*(object.isInstancedMesh?object.count:1));
}
function measuredTriangleCount(){return objects.reduce((sum,object)=>sum+geometryTriangleCount(object),0)}
function disposeMaterial(material){if(!material)return;material.map?.dispose?.();material.alphaMap?.dispose?.();material.dispose?.()}
function disposeOwn(){for(const object of objects){try{object.parent?.remove?.(object);object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(disposeMaterial);else disposeMaterial(object.material)}catch{}}objects=[];mastDepth={min:0,max:0,span:0};mastSilhouette={minX:0,maxX:0,minY:0,maxY:0,spanY:0,minHeight:0,maxHeight:0}}

function captureCandidate(candidate){
  let captured=false;
  if(starMatches(candidate)){if(star!==candidate){disposeOwn();star=candidate;captureCount++}captured=true}
  if(rockMatches(candidate)){if(rockRoot!==candidate){disposeOwn();rockRoot=candidate}captured=true}
  return captured;
}
function hookSceneConstruction(){
  const proto=THREE.Object3D?.prototype;if(addHooked||!proto?.add)return;
  originalAdd=proto.add;
  addWrapper=function(...children){const value=originalAdd.apply(this,children);captureCandidate(this);for(const child of children)captureCandidate(child);return value};
  addWrapper.__stellarCinematicAddHook=true;addWrapper.__stellarOrionProminenceAddHook=true;proto.add=addWrapper;addHooked=true
}

function prominenceMaterial(primary,edge,phase){
  const material=new THREE.ShaderMaterial({
    uniforms:{uPrimary:{value:new THREE.Color(primary)},uEdge:{value:new THREE.Color(edge)},uOpacity:{value:.88},uPhase:{value:phase}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform vec3 uPrimary;uniform vec3 uEdge;uniform float uOpacity;uniform float uPhase;varying vec2 vUv;void main(){float endFade=smoothstep(.015,.12,vUv.x)*(1.0-smoothstep(.84,.985,vUv.x));float strand=.56+.44*(.5+.5*sin(vUv.y*25.0+vUv.x*33.0+uPhase));float knots=pow(max(0.0,.5+.5*cos(vUv.x*6.2831853*5.0+uPhase)),7.0);float spine=smoothstep(.05,.55,1.0-abs(vUv.y-.5)*2.0);float alpha=endFade*clamp(.24+strand*.42+knots*.55,0.0,1.0)*(.58+.42*spine)*uOpacity;vec3 color=mix(uPrimary,uEdge,clamp(.18+knots*.82,0.0,1.0));gl_FragColor=vec4(color,alpha);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide
  });
  material.forceSinglePass=true;
  return material;
}
function observatoryMastMesh(){
  const geometry=new THREE.BoxGeometry(1,1,1);
  const material=new THREE.MeshBasicMaterial({color:'#ffd2a0',transparent:true,opacity:.94,depthWrite:false,toneMapped:false});
  material.forceSinglePass=true;
  const masts=new THREE.InstancedMesh(geometry,material,PROFILE.observatoryMasts);
  masts.name=`${NAME}-foreground-observatory-masts`;masts.frustumCulled=false;
  const helper=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3();
  let minZ=Infinity,maxZ=-Infinity,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minHeight=Infinity,maxHeight=-Infinity;
  for(let i=0;i<PROFILE.observatoryMasts;i++){
    const t=i/(PROFILE.observatoryMasts-1),angle=-.35+t*1.15,z=.72+((i%4)/3)*.20,radial=Math.sqrt(Math.max(.01,1-z*z));
    const x=radial*Math.cos(angle),y=radial*Math.sin(angle),height=PROFILE.mastHeightMin+(i%5)*.3;
    dir.set(x,y,z).normalize();helper.position.copy(dir).multiplyScalar(PROFILE.rockRadius*1.008);
    helper.quaternion.setFromUnitVectors(up,dir);helper.scale.set(.28,height,.28);helper.updateMatrix();masts.setMatrixAt(i,helper.matrix);
    minZ=Math.min(minZ,helper.position.z);maxZ=Math.max(maxZ,helper.position.z);minX=Math.min(minX,helper.position.x);maxX=Math.max(maxX,helper.position.x);minY=Math.min(minY,helper.position.y);maxY=Math.max(maxY,helper.position.y);minHeight=Math.min(minHeight,height);maxHeight=Math.max(maxHeight,height);
  }
  masts.instanceMatrix.needsUpdate=true;
  mastDepth={min:minZ,max:maxZ,span:maxZ-minZ};
  mastSilhouette={minX,maxX,minY,maxY,spanY:maxY-minY,minHeight,maxHeight};
  return masts;
}

function build(){
  if(!star||!rockRoot||objects.length)return;
  const crownA=new THREE.Mesh(new THREE.TorusGeometry(1.24,.035,8,96,Math.PI*1.38),prominenceMaterial('#ff6b36','#ffe0a6',.35));
  crownA.name=`${NAME}-crown-a`;crownA.rotation.set(1.08,.28,-.48);crownA.scale.set(1,.9,1);star.add(crownA);
  const crownB=new THREE.Mesh(new THREE.TorusGeometry(1.34,.028,8,96,Math.PI*1.18),prominenceMaterial('#ff8a42','#fff0c7',2.15));
  crownB.name=`${NAME}-crown-b`;crownB.rotation.set(.46,1.02,.72);crownB.scale.set(.94,1,1);star.add(crownB);
  const masts=observatoryMastMesh();rockRoot.add(masts);objects=[crownA,crownB,masts];
}
function hookQuality(){const api=window.WarpSim;if(qualityHooked||!api||typeof api.setQuality!=='function')return;originalSetQuality=api.setQuality.bind(api);qualityWrapper=mode=>{const value=originalSetQuality(mode);queueMicrotask(sync);return value};api.setQuality=qualityWrapper;qualityHooked=true}
function sync(){
  hookQuality();const api=window.WarpSim;if(!api||typeof api.state!=='function')return;let state;try{state=api.state()}catch{return}
  const safe=state.exploring&&!state.flying&&!state.contextLost,high=safe&&state.qualityMode==='high'&&state.current==='ORION';
  if(!high&&objects.length)disposeOwn();if(high&&star&&rockRoot&&!objects.length)build();for(const object of objects)object.visible=high;
  const active=!!(high&&objects.length===3),foregroundDepthLead=active?(PROFILE.rockCenter.z+mastDepth.max-PROFILE.starCenter.z):0;
  lastSnapshot={active,target:state.current,quality:state.qualityMode,objects:objects.length,triangles:active?measuredTriangleCount():0,budgetTriangles:active?PROFILE.triangles:0,drawCalls:active?PROFILE.drawCalls:0,captured:!!(star&&rockRoot),captureCount,visualPass:VISUAL_PASS,observatoryMasts:active?PROFILE.observatoryMasts:0,mastDepthSpan:active?Number(mastDepth.span.toFixed(2)):0,mastDepthBudget:PROFILE.mastDepthBudget,foregroundDepthLead:active?Number(foregroundDepthLead.toFixed(2)):0,foregroundLeadBudget:PROFILE.foregroundLeadBudget,mastSilhouetteSpan:active?Number(mastSilhouette.spanY.toFixed(2)):0,mastSilhouetteSpanMin:PROFILE.mastSilhouetteSpanMin,mastSilhouetteBiasX:active?Number(mastSilhouette.minX.toFixed(2)):0,mastSilhouetteBiasXMin:PROFILE.mastSilhouetteBiasXMin,mastHeightMin:active?Number(mastSilhouette.minHeight.toFixed(2)):0,mastHeightMax:active?Number(mastSilhouette.maxHeight.toFixed(2)):0,singlePass:active&&objects.filter(object=>object.isMesh).every(object=>object.material?.forceSinglePass===true)}
}

hookSceneConstruction();
const timer=setInterval(sync,SAMPLE_MS);
addEventListener('pagehide',()=>{clearInterval(timer);disposeOwn();star=null;rockRoot=null;if(qualityHooked&&qualityWrapper&&window.WarpSim?.setQuality===qualityWrapper)window.WarpSim.setQuality=originalSetQuality;if(addHooked&&addWrapper&&THREE.Object3D.prototype.add===addWrapper)THREE.Object3D.prototype.add=originalAdd},{once:true});
window.WarpOrionProminenceQuality={snapshot(){return typeof structuredClone==='function'?structuredClone(lastSnapshot):JSON.parse(JSON.stringify(lastSnapshot))},sync};
sync();
