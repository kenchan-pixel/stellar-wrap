import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const SAMPLE_MS=250;
const VISUAL_PASS='prominence-crown-v1';
const PROFILE=Object.freeze({
  starCenter:new THREE.Vector3(28,8,-137),starRadius:30,
  triangles:3072,drawCalls:2
});
const NAME='stellar-cinematic-orion-prominence';
let star=null,objects=[],captureCount=0;
let addHooked=false,originalAdd=null,addWrapper=null;
let qualityHooked=false,originalSetQuality=null,qualityWrapper=null;
let lastSnapshot={active:false,target:null,quality:null,objects:0,triangles:0,budgetTriangles:0,drawCalls:0,captured:false,captureCount:0,visualPass:VISUAL_PASS};

function approx(a,b,t=.18){return Math.abs(a-b)<=t}
function starMatches(candidate){return !!(candidate?.isMesh&&approx(candidate.position.x,PROFILE.starCenter.x)&&approx(candidate.position.y,PROFILE.starCenter.y)&&approx(candidate.position.z,PROFILE.starCenter.z)&&approx(candidate.scale.x,PROFILE.starRadius,.45)&&approx(candidate.scale.y,PROFILE.starRadius,.45))}
function geometryTriangleCount(object){if(!object?.isMesh||!object.geometry)return 0;const geometry=object.geometry,indexCount=geometry.index?.count,positionCount=geometry.attributes?.position?.count;if(Number.isFinite(indexCount))return Math.floor(indexCount/3);return Number.isFinite(positionCount)?Math.floor(positionCount/3):0}
function measuredTriangleCount(){return objects.reduce((sum,object)=>sum+geometryTriangleCount(object),0)}
function disposeMaterial(material){if(!material)return;material.map?.dispose?.();material.alphaMap?.dispose?.();material.dispose?.()}
function disposeOwn(){for(const object of objects){try{object.parent?.remove?.(object);object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(disposeMaterial);else disposeMaterial(object.material)}catch{}}objects=[]}

function captureCandidate(candidate){if(!starMatches(candidate))return false;if(star!==candidate){disposeOwn();star=candidate;captureCount++}return true}
function hookSceneConstruction(){const proto=THREE.Object3D?.prototype;if(addHooked||!proto?.add)return;originalAdd=proto.add;addWrapper=function(...children){const value=originalAdd.apply(this,children);captureCandidate(this);for(const child of children)captureCandidate(child);return value};addWrapper.__stellarCinematicAddHook=true;addWrapper.__stellarOrionProminenceAddHook=true;proto.add=addWrapper;addHooked=true}

function prominenceMaterial(primary,edge,phase){return new THREE.ShaderMaterial({
  uniforms:{uPrimary:{value:new THREE.Color(primary)},uEdge:{value:new THREE.Color(edge)},uOpacity:{value:.88},uPhase:{value:phase}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform vec3 uPrimary;uniform vec3 uEdge;uniform float uOpacity;uniform float uPhase;varying vec2 vUv;void main(){float endFade=smoothstep(.015,.12,vUv.x)*(1.0-smoothstep(.84,.985,vUv.x));float strand=.56+.44*(.5+.5*sin(vUv.y*25.0+vUv.x*33.0+uPhase));float knots=pow(max(0.0,.5+.5*cos(vUv.x*6.2831853*5.0+uPhase)),7.0);float spine=smoothstep(.05,.55,1.0-abs(vUv.y-.5)*2.0);float alpha=endFade*clamp(.24+strand*.42+knots*.55,0.0,1.0)*(.58+.42*spine)*uOpacity;vec3 color=mix(uPrimary,uEdge,clamp(.18+knots*.82,0.0,1.0));gl_FragColor=vec4(color,alpha);}`,
  transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide
})}

function build(){if(!star||objects.length)return;
  const crownA=new THREE.Mesh(new THREE.TorusGeometry(1.24,.035,8,96,Math.PI*1.38),prominenceMaterial('#ff6b36','#ffe0a6',.35));
  crownA.name=`${NAME}-crown-a`;crownA.rotation.set(1.08,.28,-.48);crownA.scale.set(1,.9,1);star.add(crownA);
  const crownB=new THREE.Mesh(new THREE.TorusGeometry(1.34,.028,8,96,Math.PI*1.18),prominenceMaterial('#ff8a42','#fff0c7',2.15));
  crownB.name=`${NAME}-crown-b`;crownB.rotation.set(.46,1.02,.72);crownB.scale.set(.94,1,1);star.add(crownB);
  objects=[crownA,crownB]
}
function hookQuality(){const api=window.WarpSim;if(qualityHooked||!api||typeof api.setQuality!=='function')return;originalSetQuality=api.setQuality.bind(api);qualityWrapper=mode=>{const value=originalSetQuality(mode);queueMicrotask(sync);return value};api.setQuality=qualityWrapper;qualityHooked=true}
function sync(){hookQuality();const api=window.WarpSim;if(!api||typeof api.state!=='function')return;let state;try{state=api.state()}catch{return}const safe=state.exploring&&!state.flying&&!state.contextLost;const high=safe&&state.qualityMode==='high'&&state.current==='ORION';if(!high&&objects.length)disposeOwn();if(high&&star&&!objects.length)build();for(const object of objects)object.visible=high;const active=!!(high&&objects.length);lastSnapshot={active,target:state.current,quality:state.qualityMode,objects:objects.length,triangles:active?measuredTriangleCount():0,budgetTriangles:active?PROFILE.triangles:0,drawCalls:active?PROFILE.drawCalls:0,captured:!!star,captureCount,visualPass:VISUAL_PASS}}

hookSceneConstruction();
const timer=setInterval(sync,SAMPLE_MS);
addEventListener('pagehide',()=>{clearInterval(timer);disposeOwn();star=null;if(qualityHooked&&qualityWrapper&&window.WarpSim?.setQuality===qualityWrapper)window.WarpSim.setQuality=originalSetQuality;if(addHooked&&addWrapper&&THREE.Object3D.prototype.add===addWrapper)THREE.Object3D.prototype.add=originalAdd},{once:true});
window.WarpOrionProminenceQuality={snapshot(){return typeof structuredClone==='function'?structuredClone(lastSnapshot):JSON.parse(JSON.stringify(lastSnapshot))},sync};
sync();