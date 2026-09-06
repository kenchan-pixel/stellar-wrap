import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('frontier-vesper.html','utf8');
let passes=0;
const ok=(condition,message)=>{assert.ok(condition,message);passes++};

ok(source.includes("VESPER_DETAIL_PROFILE='VESPER_HARVEST_V3'"),'VESPER must expose the v3 atmospheric-harvest visual profile');
ok(source.includes('STORM_TEXTURE_SIZE=[384,192]'),'VESPER storm texture must remain bounded at 384x192');
ok(source.includes('function stormTexture()'),'VESPER must keep a procedural storm texture rather than an external image asset');
ok(source.includes('new THREE.CanvasTexture(c)'),'VESPER storm treatment must use an in-memory procedural canvas texture');
ok(source.includes('COLLECTOR_INTAKE_COUNT=8'),'VESPER must keep exactly eight collector intakes');
ok(source.includes('SERVICE_LIGHT_COUNT=16'),'VESPER must keep exactly sixteen service lights');
ok(source.includes('HARVEST_BOOM_COUNT=12'),'VESPER v3 must keep exactly twelve radial harvest booms');
ok(source.includes('CONDENSER_VANE_COUNT=12'),'VESPER v3 must keep exactly twelve condenser vanes');
ok(source.includes('HARVEST_DEPTH_SPAN=6.8'),'VESPER v3 near/far extraction depth must remain bounded at 6.8 local units');
ok(source.includes('HARVEST_DETAIL_TRIANGLES=288'),'VESPER v3 added detail must remain bounded at 288 triangles');
ok(source.includes('new THREE.InstancedMesh(intakeGeo,intakeMat,COLLECTOR_INTAKE_COUNT)'),'collector intakes must remain one instanced draw-bearing object');
ok(source.includes('new THREE.InstancedMesh(serviceLightGeo,serviceLightMat,SERVICE_LIGHT_COUNT)'),'service lights must remain one instanced draw-bearing object');
ok(source.includes('new THREE.InstancedMesh(harvestBoomGeo,harvestBoomMat,HARVEST_BOOM_COUNT)'),'harvest booms must remain one instanced draw-bearing object');
ok(source.includes('new THREE.InstancedMesh(condenserVaneGeo,condenserVaneMat,CONDENSER_VANE_COUNT)'),'condenser vanes must remain one instanced draw-bearing object');
ok((source.match(/instanceMatrix\.setUsage\(THREE\.StaticDrawUsage\)/g)||[]).length>=4,'VESPER industrial detail instance matrices must remain static');
ok(source.includes('harvestBooms:HARVEST_BOOM_COUNT')&&source.includes('condenserVanes:CONDENSER_VANE_COUNT'),'VESPER runtime diagnostics must expose v3 industrial detail counts');
ok(source.includes('depthSpan:HARVEST_DEPTH_SPAN')&&source.includes('detailObjects:2')&&source.includes('detailTriangles:HARVEST_DETAIL_TRIANGLES'),'VESPER runtime diagnostics must expose bounded v3 detail cost and depth span');
ok(source.includes("visualProfile:VESPER_DETAIL_PROFILE"),'VESPER runtime diagnostics must expose the visual profile');
ok(!/TextureLoader|ImageBitmapLoader|fetch\(/.test(source),'VESPER visual upgrade must not add external texture/network loading');
ok((source.match(/new THREE\.WebGLRenderer/g)||[]).length===1,'VESPER must keep one WebGL renderer');
ok(source.includes('MAX_NORMAL_DPR=1.25')&&source.includes('MAX_CAPTURE_DPR=1.60'),'VESPER must keep bounded normal/capture DPR tiers');
ok((source.match(/function render\(/g)||[]).length===1,'VESPER v3 must not add a second render-loop authority');

console.log(`VESPER atmospheric harvest depth v3 contract: ${passes}/${passes} passed`);
