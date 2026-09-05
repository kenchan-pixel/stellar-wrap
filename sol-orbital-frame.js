import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const NAME='stellar-sol-orbital-frame';
const VISUAL_PASS='orbital-observation-frame-v1';
const GANTRY_PROFILE='orbital-perspective-gantry-v2';
const LATTICE_PROFILE='orbital-observation-lattice-v3';
const NIGHT_PROFILE='earth-night-terminator-v4';
const SAMPLE_MS=250;
const BAY_COUNT=8;
const MAST_COUNT=16;
const LIGHT_COUNT=20;
const BRACE_SEGMENT_COUNT=30;
const NEAR_MAST_SCALE=1.46;
const FAR_MAST_SCALE=.72;
const FRAME_START=-2.78;
const FRAME_END=-.42;
const NIGHT_EDGE_START=-.10;
const NIGHT_EDGE_END=.18;
const SOL_STAR_LOCAL=new THREE.Vector3(-78,38,-220);
const PROFILE={
  earthCenter:new THREE.Vector3(14,-5,-80),earthRadius:18,
  moonCenter:new THREE.Vector3(-28,11,-128),moonRadius:4.7,
  triangles:3328,drawCalls:4,bays:BAY_COUNT,masts:MAST_COUNT,lights:LIGHT_COUNT,braceSegments:BRACE_SEGMENT_COUNT,depthSpan:6.8,
  nightTriangles:2976,nightTexture:[512,256]
};
const approx=(a,b,t=.24)=>Math.abs(a-b)<=t;
let earthRoot=null,earthSurface=null,moonRoot=null,objects=[],nightLayer=null,captureCount=0,lastState=null,frameDepthRange={min:0,max:0,span:0},mastScaleRange={min:0,max:0,ratio:0};
let baseEarthEmission=null,nightPeakAlpha=0;
const previousAdd=THREE.Object3D.prototype.add;
const earthWorld=new THREE.Vector3(),sunWorld=new THREE.Vector3(),sunDirection=new THREE.Vector3(-1,0,0);

function planetSurface(object,center,radius){
  if(!object?.isGroup||!approx(object.position.x,center.x)||!approx(object.position.y,center.y)||!approx(object.position.z,center.z))return null;
  return object.children?.find?.(child=>child?.isMesh&&approx(child.scale.x,radius,.42)&&approx(child.scale.y,radius,.42))||null;
}
function geometryTriangles(object){
  if(!object?.isMesh||!object.geometry)return 0;
  const geometry=object.geometry,indexCount=geometry.index?.count,positionCount=geometry.attributes?.position?.count;
  const base=Number.isFinite(indexCount)?indexCount/3:Number.isFinite(positionCount)?positionCount/3:0;
  return Math.round(base*(object.isInstancedMesh?object.count:1));
}
function measureTriangles(list=objects){return list.reduce((sum,object)=>sum+geometryTriangles(object),0)}
function smoothstep(edge0,edge1,x){const t=Math.max(0,Math.min(1,(x-edge0)/(edge1-edge0)));return t*t*(3-2*t)}
function nightMask(sunFacing){return 1-smoothstep(NIGHT_EDGE_START,NIGHT_EDGE_END,sunFacing)}
function baseEmissionIntensity(){const value=earthSurface?.material?.emissiveIntensity;return Number.isFinite(value)?Number(value.toFixed(4)):null}
function suppressBaseEarthEmission(){
  const material=earthSurface?.material;
  if(!material||!Number.isFinite(material.emissiveIntensity))return false;
  if(baseEarthEmission?.material===material){material.emissiveIntensity=0;return true}
  if(baseEarthEmission)restoreBaseEarthEmission();
  baseEarthEmission={material,emissiveIntensity:material.emissiveIntensity};
  material.emissiveIntensity=0;
  return true;
}
function restoreBaseEarthEmission(){
  if(!baseEarthEmission)return;
  const {material,emissiveIntensity}=baseEarthEmission;
  if(material&&Number.isFinite(emissiveIntensity))material.emissiveIntensity=emissiveIntensity;
  baseEarthEmission=null;
}
function visibilitySamples(){
  if(!nightLayer||nightPeakAlpha<=0)return null;
  const opacity=nightLayer.material?.uniforms?.uOpacity?.value??1;
  const sample=facing=>Number((nightPeakAlpha*nightMask(facing)*opacity).toFixed(4));
  return{day:sample(1),terminator:sample(0),night:sample(-1),atlasPeak:Number(nightPeakAlpha.toFixed(4))};
}
function disposeOwn(){
  restoreBaseEarthEmission();
  for(const object of objects){
    object.removeFromParent();object.geometry?.dispose?.();
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const material of materials){
      for(const texture of material?.userData?.ownedTextures||[])texture?.dispose?.();
      material?.dispose?.();
    }
  }
  objects=[];nightLayer=null;nightPeakAlpha=0;frameDepthRange={min:0,max:0,span:0};mastScaleRange={min:0,max:0,ratio:0};
}
function capture(object){
  const earth=planetSurface(object,PROFILE.earthCenter,PROFILE.earthRadius);
  if(earth&&object!==earthRoot){disposeOwn();earthRoot=object;earthSurface=earth;captureCount++}
  const moon=planetSurface(object,PROFILE.moonCenter,PROFILE.moonRadius);
  if(moon&&object!==moonRoot){disposeOwn();moonRoot=object}
}
function addWrapper(...args){
  const result=previousAdd.apply(this,args);capture(this);for(const object of args)capture(object);return result;
}
if(!window.__stellarSolOrbitalFrameAddHook){
  THREE.Object3D.prototype.add=addWrapper;
  window.__stellarSolOrbitalFrameAddHook={previousAdd,addWrapper};
}

function seeded(seed){return()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)}
function earthNightTexture(){
  const canvas=document.createElement('canvas');canvas.width=PROFILE.nightTexture[0];canvas.height=PROFILE.nightTexture[1];
  const ctx=canvas.getContext('2d'),rnd=seeded(90421),clusters=[
    [.205,.34,.055,.032,36],[.145,.35,.04,.025,20],[.515,.34,.055,.03,42],
    [.69,.48,.052,.035,34],[.72,.37,.068,.04,42],[.805,.355,.032,.022,26],[.56,.52,.045,.045,14]
  ];
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='lighter';
  for(const [u,v,sx,sy,count] of clusters){
    for(let i=0;i<count;i++){
      const px=(u+(rnd()-.5)*sx)*canvas.width,py=(v+(rnd()-.5)*sy)*canvas.height,r=.55+rnd()*1.8;
      const gradient=ctx.createRadialGradient(px,py,0,px,py,r*3.4);
      const warm=rnd()>.24;
      gradient.addColorStop(0,warm?'rgba(255,248,204,.96)':'rgba(190,225,255,.9)');
      gradient.addColorStop(.24,warm?'rgba(255,181,82,.66)':'rgba(106,185,255,.54)');
      gradient.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gradient;ctx.fillRect(px-r*3.4,py-r*3.4,r*6.8,r*6.8);
    }
  }
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let peak=0;
  for(let i=3;i<pixels.length;i+=4)peak=Math.max(peak,pixels[i]);
  nightPeakAlpha=peak/255;
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}
function earthNightMaterial(){
  const lights=earthNightTexture(),material=new THREE.ShaderMaterial({
    uniforms:{uLights:{value:lights},uSunDirection:{value:sunDirection.clone()},uOpacity:{value:.92}},
    vertexShader:`uniform vec3 uSunDirection;varying vec2 vUv;varying float vNight;varying float vRim;
void main(){
  vUv=uv;
  vec3 worldNormal=normalize(mat3(modelMatrix)*normal);
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  vec3 viewNormal=normalize(normalMatrix*normal);
  vec3 viewDir=normalize(-mv.xyz);
  float sunFacing=dot(worldNormal,normalize(uSunDirection));
  vNight=1.0-smoothstep(-0.10,0.18,sunFacing);
  vRim=pow(1.0-clamp(dot(viewNormal,viewDir),0.0,1.0),1.6);
  gl_Position=projectionMatrix*mv;
}`,
    fragmentShader:`uniform sampler2D uLights;uniform float uOpacity;varying vec2 vUv;varying float vNight;varying float vRim;
void main(){
  vec4 light=texture2D(uLights,vUv);
  float alpha=light.a*vNight*(0.82+0.24*vRim)*uOpacity;
  if(alpha<0.003)discard;
  vec3 colour=light.rgb*(1.08+0.18*vRim);
  gl_FragColor=vec4(colour,alpha);
}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,side:THREE.FrontSide
  });
  material.userData.ownedTextures=[lights];return material;
}
function updateSunDirection(){
  if(!nightLayer||!earthRoot?.parent)return;
  earthRoot.getWorldPosition(earthWorld);
  sunWorld.copy(SOL_STAR_LOCAL);earthRoot.parent.localToWorld(sunWorld);
  sunDirection.copy(sunWorld).sub(earthWorld).normalize();
  nightLayer.material?.uniforms?.uSunDirection?.value?.copy?.(sunDirection);
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
  if(!earthRoot||!earthSurface||!moonRoot||objects.length)return;
  const masts=mastField();masts.renderOrder=3;
  const lights=navigationLights();lights.renderOrder=5;
  const braces=new THREE.LineSegments(braceGeometry(),new THREE.LineBasicMaterial({color:'#a8e7ff',transparent:true,opacity:.62,depthWrite:false,blending:THREE.AdditiveBlending}));
  braces.name=`${NAME}-perspective-chevron-braces`;braces.renderOrder=4;
  nightLayer=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),earthNightMaterial());
  nightLayer.name=`${NAME}-earth-night-terminator`;nightLayer.scale.setScalar(1.009);nightLayer.renderOrder=2;
  if(!suppressBaseEarthEmission()){nightLayer.geometry.dispose();nightLayer.material.userData.ownedTextures?.forEach(texture=>texture.dispose?.());nightLayer.material.dispose();nightLayer=null;nightPeakAlpha=0;return}
  earthRoot.add(masts,braces,lights);earthSurface.add(nightLayer);objects=[masts,braces,lights,nightLayer];updateSunDirection();
}
function shouldRun(state){return !!state&&state.exploring&&!state.flying&&!state.contextLost&&state.qualityMode==='high'&&state.current==='SOL'}
function sync(){
  const sim=window.WarpSim;if(!sim?.state)return;const state=sim.state();lastState=state;const high=shouldRun(state);
  if(!high&&objects.length)disposeOwn();
  if(high&&earthRoot&&earthSurface&&moonRoot&&!objects.length)build();
  if(high&&nightLayer)updateSunDirection();
  for(const object of objects)object.visible=high;
}
function snapshot(){
  const state=lastState||window.WarpSim?.state?.()||{},active=shouldRun(state)&&objects.length===4;
  const material=earthSurface?.material,baseEmissionSuppressed=!!(active&&baseEarthEmission?.material===material&&material?.emissiveIntensity===0);
  return{
    visualPass:VISUAL_PASS,gantryProfile:active?GANTRY_PROFILE:null,latticeProfile:active?LATTICE_PROFILE:null,nightProfile:active?NIGHT_PROFILE:null,
    target:'SOL',quality:state.qualityMode||null,active,captured:!!(earthRoot&&earthSurface&&moonRoot),captureCount,objects:objects.length,
    bays:active?BAY_COUNT:0,masts:active?MAST_COUNT:0,lights:active?LIGHT_COUNT:0,braceSegments:active?BRACE_SEGMENT_COUNT:0,nightLayer:active?1:0,
    drawCalls:active?PROFILE.drawCalls:0,triangles:active?measureTriangles():0,budgetTriangles:PROFILE.triangles,nightTriangles:active&&nightLayer?geometryTriangles(nightLayer):0,
    frameDepthSpan:active?Number(frameDepthRange.span.toFixed(2)):0,budgetDepthSpan:PROFILE.depthSpan,mastScaleRatio:active?Number(mastScaleRange.ratio.toFixed(2)):0,
    sunDirection:active?[sunDirection.x,sunDirection.y,sunDirection.z].map(v=>Number(v.toFixed(3))):null,nightTexture:active?PROFILE.nightTexture:null,
    baseEmissionSuppressed,baseEmissionIntensity:baseEmissionIntensity(),baseEmissionRestoreIntensity:active&&baseEarthEmission?Number(baseEarthEmission.emissiveIntensity.toFixed(4)):null,
    cityVisibility:active?visibilitySamples():null
  };
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