import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('frontier.html','utf8');
let passes=0;
const ok=(condition,message)=>{assert.ok(condition,message);passes++};

ok(source.includes("const AURELIA_DETAIL_PROFILE='AURELIA_HABITAT_V2'"),'AURELIA exposes the inhabited-megastructure visual profile');
ok(source.includes('const FINAL_Z=-64,FINAL_FOV=56'),'fixed hero vista uses the bounded wider arrival composition');
ok(source.includes('new THREE.TorusGeometry(19.8,.65,6,128)'),'inner habitat ribbon uses bounded torus geometry');
ok(source.includes('const cityBlockCount=56'),'inhabited ribbon keeps a bounded 56-block city layer');
ok(source.includes('const dockSpineCount=8'),'outer silhouette keeps a bounded eight-spine docking layer');
ok(source.includes('new THREE.InstancedMesh(cityBlockGeo,cityBlockMat,cityBlockCount)'),'city detail is instanced into one draw-bearing object');
ok(source.includes('new THREE.InstancedMesh(dockSpineGeo,dockSpineMat,dockSpineCount)'),'docking spines are instanced into one draw-bearing object');
ok(source.includes("profile:AURELIA_DETAIL_PROFILE,objects:3,cityBlocks:cityBlockCount,dockSpines:dockSpineCount"),'runtime diagnostics expose the exact detail-object budget');
ok(source.includes('detailTriangles:2304'),'runtime diagnostics expose the bounded 2,304-triangle detail budget');
ok((source.match(/new THREE\.WebGLRenderer/g)||[]).length===1,'AURELIA keeps exactly one renderer');
ok(source.includes('preserveDrawingBuffer:false'),'AURELIA keeps the normal framebuffer memory boundary');
ok(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/.test(source),'AURELIA visual pass adds no persistence or background-network authority');

console.log(`AURELIA inhabited hero vista static contract: ${passes}/${passes} passed`);
