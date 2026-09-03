import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('frontier-vesper.html','utf8');
let passes=0;
const ok=(condition,message)=>{assert.ok(condition,message);passes++};

ok(source.includes("VESPER_DETAIL_PROFILE='VESPER_HARVEST_V2'"),'VESPER must expose the atmospheric-harvest visual profile');
ok(source.includes('STORM_TEXTURE_SIZE=[384,192]'),'VESPER storm texture must remain bounded at 384x192');
ok(source.includes('function stormTexture()'),'VESPER must keep a procedural storm texture rather than an external image asset');
ok(source.includes('new THREE.CanvasTexture(c)'),'VESPER storm treatment must use an in-memory procedural canvas texture');
ok(source.includes('COLLECTOR_INTAKE_COUNT=8'),'VESPER must keep exactly eight collector intakes');
ok(source.includes('SERVICE_LIGHT_COUNT=16'),'VESPER must keep exactly sixteen service lights');
ok(source.includes('new THREE.InstancedMesh(intakeGeo,intakeMat,COLLECTOR_INTAKE_COUNT)'),'collector intakes must remain one instanced draw-bearing object');
ok(source.includes('new THREE.InstancedMesh(serviceLightGeo,serviceLightMat,SERVICE_LIGHT_COUNT)'),'service lights must remain one instanced draw-bearing object');
ok(source.includes("visualProfile:VESPER_DETAIL_PROFILE"),'VESPER runtime diagnostics must expose the visual profile');
ok(source.includes('collectorIntakes:COLLECTOR_INTAKE_COUNT')&&source.includes('serviceLights:SERVICE_LIGHT_COUNT'),'VESPER runtime diagnostics must expose bounded industrial detail counts');
ok(!/TextureLoader|ImageBitmapLoader|fetch\(/.test(source),'VESPER visual upgrade must not add external texture/network loading');
ok((source.match(/new THREE\.WebGLRenderer/g)||[]).length===1,'VESPER must keep one WebGL renderer');
ok(source.includes('MAX_NORMAL_DPR=1.25')&&source.includes('MAX_CAPTURE_DPR=1.60'),'VESPER must keep bounded normal/capture DPR tiers');

console.log(`VESPER atmospheric harvest hero vista contract: ${passes}/${passes} passed`);
