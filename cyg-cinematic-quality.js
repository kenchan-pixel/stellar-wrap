import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const SAMPLE_MS=250;
const VISUAL_PASS='resonant-beacon-v1';
const PROFILE=Object.freeze({
  primaryCenter:new THREE.Vector3(-18,10,-108),primaryRadius:11,
  companionCenter:new THREE.Vector3(18,-7,-118),companionRadius:8,
  beaconCenter:new THREE.Vector3(0,0,-92),beaconRadius:19,
  triangles:12992,drawCalls:4
});
const NAME='stellar-cinematic-cyg';
let primary=null,companion=null,beacon=null,objects=[],captureCount=0;
let addHooked=false,originalAdd=null,addWrapper=null;
let qualityHooked=false,originalSetQuality=null,qualityWrapper=null;
let lastSnapshot={active:false,target:null,quality:null,objects:0,triangles:0,budgetTriangles:0,drawCalls:0,captured:false,captureCount:0,visualPass:VISUAL_PASS};

function approx(a,b,t=.18){return Math.abs(a-b)<=t}
function starMatches(candidate,center,radius){return !!(candidate?.isMesh&&approx(candidate.position.x,center.x)&&approx(candidate.position.y,center.y)&&approx(candidate.position.z,center.z)&&approx(candidate.scale.x,radius,.45)&&approx(candidate.scale.y,radius,.45))}
function torusMatches(candidate,center,radius){const g=candidate?.geometry;return !!(candidate?.isMesh&&g?.type==='TorusGeometry'&&approx(candidate.position.x,center.x)&&approx(candidate.position.y,center.y)&&approx(candidate.position.z,center.z)&&approx(g.parameters?.radius,radius,.12))}
function geometryTriangleCount(object){if(!object?.isMesh||!object.geometry)return 0;const geometry=object.geometry,indexCount=geometry.index?.count,positionCount=geometry.attributes?.position?.count;if(Number.isFinite(indexCount))return Math.floor(indexCount/3);return Number.isFinite(positionCount)?Math.floor(positionCount/3):0}
function measuredTriangleCount(){return objects.reduce((sum,object)=>sum+geometryTriangleCount(object),0)}
function disposeMaterial(material){if(!material)return;material.map?.dispose?.();material.alphaMap?.dispose?.();material.dispose?.()}
function disposeOwn(){for(const object of objects){try{object.parent?.remove?.(object);object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(disposeMaterial);else disposeMaterial(object.material)}catch{}}objects=[]}

function captureCandidate(candidate){let captured=false;
  if(starMatches(candidate,PROFILE.primaryCenter,PROFILE.primaryRadius)){if(primary!==candidate){disposeOwn();primary=candidate;captureCount++}captured=true}
  if(starMatches(candidate,PROFILE.companionCenter,PROFILE.companionRadius)){if(companion!==candidate){disposeOwn();companion=candidate}captured=true}
  if(torusMatches(candidate,PROFILE.beaconCenter,PROFILE.beaconRadius)){if(beacon!==candidate){disposeOwn();beacon=candidate}captured=true}
  return captured
}
function hookSceneConstruction(){const proto=THREE.Object3D?.prototype;if(addHooked||!proto?.add)return;originalAdd=proto.add;addWrapper=function(...children){const value=originalAdd.apply(this,children);captureCandidate(this);for(const child of children)captureCandidate(child);return value};addWrapper.__stellarCinematicAddHook=true;addWrapper.__stellarCygCinematicAddHook=true;proto.add=addWrapper;addHooked=true}

function canvasTexture(canvas){const texture=new THREE.CanvasTexture(canvas);texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture}
function primaryTexture(){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height);for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const u=x/canvas.width,v=y/canvas.height,lon=u*Math.PI*2,lat=(v-.5)*Math.PI;const cells=.5+.5*Math.sin(lon*19+Math.sin(lat*13)*2.4)+.24*Math.sin(lon*47-lat*31)+.12*Math.sin(lon*91+lat*59);const arcs=.5+.5*Math.cos(lat*5.8+Math.sin(lon*3.7)*1.4);const resonance=.5+.5*Math.cos(lon*2.0-lat*.8-.55),hot=Math.pow(resonance,7),grain=Math.max(0,Math.min(1,.48+cells*.27+arcs*.16)),shade=Math.max(0,Math.min(1,.16+grain*.56+hot*.42));const i=(y*canvas.width+x)*4;image.data[i]=62+Math.round(154*shade);image.data[i+1]=118+Math.round(114*shade);image.data[i+2]=184+Math.round(66*shade);image.data[i+3]=Math.round(132+78*Math.max(grain,hot))}ctx.putImageData(image,0,0);return canvasTexture(canvas)}
function companionTexture(){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height);for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const u=x/canvas.width,v=y/canvas.height,lon=u*Math.PI*2,lat=(v-.5)*Math.PI;const cells=.5+.5*Math.sin(lon*17+Math.sin(lat*15)*2.1)+.25*Math.sin(lon*43-lat*29)+.12*Math.sin(lon*83+lat*53);const veins=.5+.5*Math.sin(lat*8.4+Math.sin(lon*5.1));const resonance=.5+.5*Math.cos(lon*2.0+lat*.72+2.45),hot=Math.pow(resonance,7),grain=Math.max(0,Math.min(1,.46+cells*.27+veins*.17)),shade=Math.max(0,Math.min(1,.14+grain*.54+hot*.46));const i=(y*canvas.width+x)*4;image.data[i]=104+Math.round(132*shade);image.data[i+1]=76+Math.round(126*shade);image.data[i+2]=174+Math.round(74*shade);image.data[i+3]=Math.round(132+80*Math.max(grain,hot))}ctx.putImageData(image,0,0);return canvasTexture(canvas)}
function haloMaterial(){return new THREE.ShaderMaterial({uniforms:{uA:{value:new THREE.Color('#75bdff')},uB:{value:new THREE.Color('#e0c7ff')},uOpacity:{value:.5}},vertexShader:`varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vP=normalize(position);gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform vec3 uA;uniform vec3 uB;uniform float uOpacity;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){float rim=pow(1.0-clamp(dot(vN,vV),0.0,1.0),1.78);float lon=atan(vP.z,vP.x);float lat=asin(clamp(vP.y,-1.0,1.0));float lobeA=pow(max(0.0,.5+.5*cos(lon*2.0-lat*.65-.55)),5.0);float lobeB=pow(max(0.0,.5+.5*cos(lon*3.0+lat*3.6+1.3)),7.0);float bands=.82+.18*(.5+.5*sin(lat*32.0+lon*2.0));float field=clamp(.24+lobeA*.58+lobeB*.34,0.0,1.0);vec3 c=mix(uA,uB,clamp(.18+lobeB*.82,0.0,1.0));gl_FragColor=vec4(c,smoothstep(.04,1.0,rim)*uOpacity*bands*field);}`,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.FrontSide})}
function beaconMaterial(){return new THREE.ShaderMaterial({uniforms:{uA:{value:new THREE.Color('#73c6ff')},uB:{value:new THREE.Color('#e4c6ff')},uOpacity:{value:.9}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform vec3 uA;uniform vec3 uB;uniform float uOpacity;varying vec2 vUv;void main(){float phase=fract(vUv.x*18.0);float segment=smoothstep(.07,.16,phase)*(1.0-smoothstep(.62,.76,phase));float twin=.58+.42*cos(vUv.y*6.2831853*2.0);float lock=pow(max(0.0,cos((vUv.x-.13)*6.2831853)),24.0);float rail=clamp(.07+segment*.86+lock*.98,0.0,1.0);float polarity=step(.5,fract(vUv.x*9.0));vec3 segmentColor=mix(uA,uB,polarity);vec3 c=mix(segmentColor,vec3(1.0,.93,1.0),lock*.78);gl_FragColor=vec4(c,uOpacity*rail*(.58+.42*twin));}`,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})}

function build(){if(!primary||!companion||!beacon||objects.length)return;
  const primaryDetail=new THREE.Mesh(new THREE.SphereGeometry(1,64,40),new THREE.MeshBasicMaterial({map:primaryTexture(),transparent:true,opacity:.52,blending:THREE.NormalBlending,depthWrite:false}));primaryDetail.name=`${NAME}-primary-detail`;primaryDetail.scale.setScalar(1.014);primary.add(primaryDetail);
  const companionDetail=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.MeshBasicMaterial({map:companionTexture(),transparent:true,opacity:.54,blending:THREE.NormalBlending,depthWrite:false}));companionDetail.name=`${NAME}-companion-detail`;companionDetail.scale.setScalar(1.016);companion.add(companionDetail);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),haloMaterial());halo.name=`${NAME}-binary-halo`;halo.scale.setScalar(1.13);primary.add(halo);
  const track=new THREE.Mesh(new THREE.TorusGeometry(PROFILE.beaconRadius,.28,8,128),beaconMaterial());track.name=`${NAME}-beacon-track`;beacon.add(track);
  objects=[primaryDetail,companionDetail,halo,track]
}
function hookQuality(){const api=window.WarpSim;if(qualityHooked||!api||typeof api.setQuality!=='function')return;originalSetQuality=api.setQuality.bind(api);qualityWrapper=mode=>{const value=originalSetQuality(mode);queueMicrotask(sync);return value};api.setQuality=qualityWrapper;qualityHooked=true}
function sync(){hookQuality();const api=window.WarpSim;if(!api||typeof api.state!=='function')return;let state;try{state=api.state()}catch{return}const safe=state.exploring&&!state.flying&&!state.contextLost;const high=safe&&state.qualityMode==='high'&&state.current==='CYG';if(!high&&objects.length)disposeOwn();if(high&&primary&&companion&&beacon&&!objects.length)build();for(const object of objects)object.visible=high;const active=!!(high&&objects.length);lastSnapshot={active,target:state.current,quality:state.qualityMode,objects:objects.length,triangles:active?measuredTriangleCount():0,budgetTriangles:active?PROFILE.triangles:0,drawCalls:active?PROFILE.drawCalls:0,captured:!!(primary&&companion&&beacon),captureCount,visualPass:VISUAL_PASS}}

hookSceneConstruction();
const timer=setInterval(sync,SAMPLE_MS);
addEventListener('pagehide',()=>{clearInterval(timer);disposeOwn();primary=null;companion=null;beacon=null;if(qualityHooked&&qualityWrapper&&window.WarpSim?.setQuality===qualityWrapper)window.WarpSim.setQuality=originalSetQuality;if(addHooked&&addWrapper&&THREE.Object3D.prototype.add===addWrapper)THREE.Object3D.prototype.add=originalAdd},{once:true});
window.WarpCygCinematicQuality={snapshot(){return typeof structuredClone==='function'?structuredClone(lastSnapshot):JSON.parse(JSON.stringify(lastSnapshot))},sync};
sync();