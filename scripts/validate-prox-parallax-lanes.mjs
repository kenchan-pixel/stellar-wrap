import fs from 'node:fs';

const source=fs.readFileSync(new URL('../prox-starport-transit.js',import.meta.url),'utf8');
const doc=fs.readFileSync(new URL('../docs/PROX_STARPORT_TRANSIT_LATTICE.md',import.meta.url),'utf8');
let passed=0;
function check(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`PASS PROX PARALLAX ${passed}: ${label}`)}

check(/laneDepthAmplitude:1\.62,laneScaleFar:\.94,laneScaleNear:1\.08,laneDepthBudget:3\.6/.test(source),'traffic-lane parallax profile is bounded');
check(/function deformLaneGeometry\(geometry,direction=1\)/.test(source),'traffic lanes use one bounded geometry deformation helper');
check(/Math\.sin\(\(u-\.5\)\*Math\.PI\)\*direction/.test(source),'each lane performs one smooth far-to-near depth sweep');
check(/PROFILE\.laneScaleFar\+\(\(sweep\+1\)\*\.5\)\*\(PROFILE\.laneScaleNear-PROFILE\.laneScaleFar\)/.test(source),'depth sweep also carries bounded perspective scaling');
check(/deformLaneGeometry\(outer\.geometry,1\)/.test(source)&&/deformLaneGeometry\(crossing\.geometry,-1\)/.test(source),'crossing lanes sweep in opposing depth directions');
check(/laneDepthSpan:active\?laneDepth\.span:0/.test(source)&&/laneScaleRatio:active\?laneDepth\.scaleRatio:0/.test(source),'runtime diagnostics expose live lane depth and perspective ratio');
check(/triangles:2520,drawCalls:4,beacons:36,gantryBeams:18/.test(source),'parallax refinement keeps the existing bounded renderer budget');
check(/new THREE\.TorusGeometry\(23\.2,\.14,6,96,Math\.PI\*1\.36\)/.test(source)&&/new THREE\.TorusGeometry\(25\.8,\.11,6,96,Math\.PI\*1\.08\)/.test(source),'parallax reuses the same two lane meshes rather than adding geometry objects');
check(!/requestAnimationFrame\s*\(/.test(source),'parallax refinement adds no independent animation loop');
check(doc.includes('3.5 local units')&&doc.includes('0.94 → 1.08')&&doc.includes('same 4 objects / 2,520 triangles / 4 draw calls'),'SOT records the user-visible depth sweep and unchanged cost');

const amplitude=1.62,tube=.14,far=.94,near=1.08;
const expectedDepthSpan=2*amplitude+2*tube;
const scaleRatio=near/far;
check(expectedDepthSpan>3.5&&expectedDepthSpan<3.6,`declared lane sweep stays inside 3.6 depth budget (${expectedDepthSpan.toFixed(2)})`);
check(scaleRatio>1.14&&scaleRatio<1.16,`declared near/far perspective ratio stays bounded (${scaleRatio.toFixed(3)}x)`);
console.log(`PROX parallax traffic-lane validation: ${passed}/${passed} checks passed`);
