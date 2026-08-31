import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('frontier-nadir.html','utf8');
let passes=0;
const ok=(condition,message)=>{assert.ok(condition,message);passes++};

ok(source.includes("const VISUAL_ID='NADIR_FIXED_LENSING_V3'"),'NADIR exposes the refined fixed black-hole visual identity');
ok(source.includes('new THREE.SphereGeometry(5.82,48,32)'),'event horizon remains an opaque spherical silhouette');
ok(source.includes('new THREE.RingGeometry(6.55,15.65,192,1)'),'accretion disk stays a bounded thin annulus');
ok(source.includes('const lensingCrown=')&&source.includes('new THREE.PlaneGeometry(44,26)'),'screen-plane lensing crown bends back-side light above and below the shadow');
ok(source.includes('ellipse=length(vec2(p.x,p.y*2.15))')&&source.includes('topBottom=smoothstep(.68,1.8,abs(p.y))'),'lensing crown uses a flattened upper/lower gravitational arc profile');
ok(source.includes('const photonApproach=')&&source.includes('Math.PI*.86'),'approaching photon light is a partial arc rather than a closed neon ring');
ok(source.includes('const photonRecede=')&&source.includes('Math.PI*.56'),'receding photon light is a separate dimmer partial arc');
ok(source.includes('dopplerAsymmetry:true')&&source.includes('portalRing:false'),'runtime explicitly exposes Doppler asymmetry and rejects portal-ring presentation');
ok(source.includes('centralClearance=Math.abs(x)<22&&Math.abs(y)<14'),'background starfield keeps a clean central lensing silhouette');
ok(source.includes('const count=92')&&source.includes('bend=3.3+.018*x*x'),'deflected-star bank follows bounded upper/lower lensing curves');
ok(!source.includes('ConeGeometry'),'portal-like giant cone jets remain removed');
ok(!/pointerdown|pointermove|touchstart|touchmove|dblclick/.test(source),'fixed NADIR scene has no user rotation handlers');
ok(source.includes('autoOrbit:false')&&source.includes("vista:'overview'")&&source.includes('fixed:true'),'runtime diagnostics enforce one fixed overview composition');
ok(source.includes('MAX_NORMAL_DPR=1.25')&&source.includes('MAX_CAPTURE_DPR=1.60'),'mobile/capture DPR budgets remain bounded');
ok(source.includes('renderer.info.render.calls')&&source.includes('renderer.info.render.triangles'),'runtime exposes render-cost evidence');
ok(source.includes('lensingCrown:true')&&source.includes('partialPhotonArc:true')&&source.includes('starDeflection:true'),'runtime exposes the refined lensing invariants');
ok(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon/.test(source),'NADIR adds no storage or background network authority');
ok((source.match(/new THREE\.WebGLRenderer/g)||[]).length===1,'NADIR keeps one renderer');
ok(source.includes("window.WarpFrontierNadir={state,applyVista,skipArrival,capture}"),'fixed scene preserves the shared Frontier scenic API');

console.log(`NADIR fixed black-hole V3 contract: ${passes}/${passes} checks passed`);
