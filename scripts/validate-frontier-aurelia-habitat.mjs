import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('frontier.html','utf8');
let passes=0;
const ok=(condition,message)=>{assert.ok(condition,message);passes++};

ok(source.includes("const AURELIA_DETAIL_PROFILE='AURELIA_HABITAT_V3'"),'AURELIA exposes the inhabited-megastructure v3 visual profile');
ok(source.includes('const FINAL_Z=-64,FINAL_FOV=56'),'fixed hero vista keeps the bounded wider arrival composition');
ok(source.includes('new THREE.TorusGeometry(19.8,.65,6,128)'),'inner habitat ribbon keeps bounded torus geometry');
ok(source.includes('const cityBlockCount=56'),'inhabited ribbon keeps a bounded 56-block city-light layer');
ok(source.includes('const dockSpineCount=8'),'outer silhouette keeps a bounded eight-spine docking layer');
ok(source.includes('const skylineTowerCount=32'),'v3 adds a bounded 32-tower inhabited skyline');
ok(source.includes('const solarVaneCount=12'),'v3 adds a bounded 12-vane sunward mirror wing');
ok(source.includes('new THREE.InstancedMesh(cityBlockGeo,cityBlockMat,cityBlockCount)'),'city lights remain one instanced draw-bearing object');
ok(source.includes('new THREE.InstancedMesh(dockSpineGeo,dockSpineMat,dockSpineCount)'),'docking spines remain one instanced draw-bearing object');
ok(source.includes('new THREE.InstancedMesh(skylineTowerGeo,skylineTowerMat,skylineTowerCount)'),'skyline towers share one instanced draw-bearing object');
ok(source.includes('new THREE.InstancedMesh(solarVaneGeo,solarVaneMat,solarVaneCount)'),'solar vanes share one instanced draw-bearing object');
ok(source.includes('profile:AURELIA_DETAIL_PROFILE,objects:5,cityBlocks:cityBlockCount,dockSpines:dockSpineCount,skylineTowers:skylineTowerCount,solarVanes:solarVaneCount'),'runtime diagnostics expose the exact v3 detail-object budget');
ok(source.includes('detailTriangles:2832'),'runtime diagnostics expose the bounded 2,832-triangle detail budget');
ok(source.includes('城市塔冠')&&source.includes('日照鏡翼'),'arrival/exploration copy names the new inhabited skyline and mirror-wing landmarks');
ok((source.match(/new THREE\.WebGLRenderer/g)||[]).length===1,'AURELIA keeps exactly one renderer');
ok(source.includes('preserveDrawingBuffer:false'),'AURELIA keeps the normal framebuffer memory boundary');
ok(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/.test(source),'AURELIA visual pass adds no persistence or background-network authority');

console.log(`AURELIA inhabited horizon v3 static contract: ${passes}/${passes} passed`);
