import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('frontier-nadir.html','utf8');
let passes=0;
const ok=(condition,message)=>{assert.ok(condition,message);passes++};

ok(source.includes("const VISUAL_ID='NADIR_FIXED_LENSING_V2'"),'NADIR exposes the fixed black-hole visual identity');
ok(source.includes('new THREE.SphereGeometry(5.78,48,32)'),'event horizon uses an opaque spherical silhouette');
ok(source.includes('const photonRing=')&&source.includes('TorusGeometry(6.02,.105'),'a thin photon ring wraps the event horizon');
ok(source.includes('const lensedBackArc=')&&source.includes('vertical=pow(abs(sin(a)),4.2)'),'back-side accretion light is bent into upper/lower lensing arcs');
ok(source.includes('doppler=.5+.5*cos')&&source.includes('const dopplerCrescent='),'accretion light has directional Doppler asymmetry');
ok(source.includes('new THREE.RingGeometry(6.35,17.0,192,1)'),'accretion disk is a bounded thin annulus, not a fat torus prop');
ok(!source.includes('ConeGeometry'),'portal-like giant cone jets are removed');
ok(!/pointerdown|pointermove|touchstart|touchmove|dblclick/.test(source),'fixed NADIR scene has no user rotation handlers');
ok(source.includes('autoOrbit:false')&&source.includes("vista:'overview'")&&source.includes('fixed:true'),'runtime diagnostics enforce one fixed overview composition');
ok(source.includes('MAX_NORMAL_DPR=1.25')&&source.includes('MAX_CAPTURE_DPR=1.60'),'mobile/capture DPR budgets remain bounded');
ok(source.includes('renderer.info.render.calls')&&source.includes('renderer.info.render.triangles'),'runtime exposes render-cost evidence');
ok(source.includes('jets:false')&&source.includes('eventHorizon:true')&&source.includes('lensedBackArc:true')&&source.includes('dopplerAsymmetry:true'),'runtime exposes black-hole visual invariants');
ok(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/.test(source),'NADIR adds no storage or background network authority');
ok((source.match(/new THREE\.WebGLRenderer/g)||[]).length===1,'NADIR keeps one renderer');
ok(source.includes("window.WarpFrontierNadir={state,applyVista,skipArrival,capture}"),'fixed scene preserves the shared Frontier scenic API');

console.log(`NADIR fixed black-hole contract: ${passes}/${passes} checks passed`);
