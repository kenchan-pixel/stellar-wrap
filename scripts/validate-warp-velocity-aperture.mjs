import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=path=>readFileSync(resolve(root,path),'utf8');
const failures=[];
let passes=0;
function ok(condition,message){if(condition){passes++;console.log(`✓ ${message}`)}else failures.push(message)}

const source=read('warp-velocity-aperture.js');
const loader=read('exploration-focus-tray.js');
const sw=read('sw.js');
const doc=read('docs/WARP_CORRIDOR_DEPTH.md');
const pkg=JSON.parse(read('package.json'));
const parsed=spawnSync(process.execPath,['--check',resolve(root,'warp-velocity-aperture.js')],{encoding:'utf8'});

ok(parsed.status===0,`warp velocity aperture parses${parsed.stderr?`: ${parsed.stderr.trim()}`:''}`);
ok(source.includes("const ARCHITECTURE='velocity-aperture-v5'"),'v5 velocity-aperture architecture is explicit');
ok(source.includes("const MOTION_TREATMENT='velocity-aperture-expansion-v6'"),'v6 phase-expansion treatment is explicit without replacing the v5 architecture contract');
ok(source.includes("new Set(['warpEntry','warp','warpExit'])"),'aperture is limited to warp entry/cruise/exit phases');
ok(source.includes('position:absolute;z-index:4;inset:0'),'aperture keeps an explicit presentation-layer z-index');
ok(source.includes('#journeyTransit{z-index:5}'),'corridor/transit presentation layer is explicitly above the aperture');
ok(source.includes('ellipse 48% 34% at 50% 50%')&&source.includes('rgba(1,3,9,.68)'),'desktop aperture has a bounded central attenuation field');
ok(source.includes('ellipse 50% 35% at 50% 50%'),'phone aperture keeps a portrait-specific bounded attenuation field');
ok(source.includes('ellipse 72% 56% at 50% 50%')&&source.includes('linear-gradient(90deg'),'outer rim adds a low-cost peripheral depth grade');
ok(source.includes('transition:opacity .16s ease,transform .46s cubic-bezier(.2,.72,.18,1)'),'v6 expansion uses one bounded phase transition rather than a render-loop animation');
ok(source.includes('data-phase="warpEntry"] #warpVelocityAperture::before{opacity:.55;transform:translate3d(0,0,0) scale(.88,.80)}'),'warp entry starts with a compressed central aperture');
ok(source.includes('data-phase="warpEntry"] #warpVelocityAperture::after{opacity:.35;transform:translate3d(0,0,0) scale(.92,.86)}'),'warp entry starts with a compressed peripheral rim');
ok(source.includes('data-phase="warp"] #warpVelocityAperture::before{opacity:.62;transform:translate3d(0,0,0) scale(1,.94)}'),'warp cruise opens the central aperture to its stable depth read');
ok(source.includes('data-phase="warp"] #warpVelocityAperture::after{opacity:.65;transform:translate3d(0,0,0) scale(1.04,1)}'),'warp cruise keeps the peripheral rim slightly wider than the attenuation field');
ok(source.includes('data-phase="warpExit"] #warpVelocityAperture::before{opacity:.42;transform:translate3d(0,0,0) scale(1.16,1.08)}'),'warp exit expands the central aperture beyond cruise scale');
ok(source.includes('data-phase="warpExit"] #warpVelocityAperture::after{opacity:.25;transform:translate3d(0,0,0) scale(1.20,1.12)}'),'warp exit expands the peripheral rim beyond the central aperture');
ok(source.includes('#journeyAtmosphere[data-phase="warp"] #warpVelocityAperture{opacity:1}'),'warp cruise enables the full aperture grade');
ok(source.includes('#journeyAtmosphere[data-phase="decelerate"] #warpVelocityAperture')&&source.includes('#journeyAtmosphere[data-phase="observe"] #warpVelocityAperture{opacity:0}'),'aperture clears before destination approach/observation owns the frame');
ok(source.includes('@media(prefers-reduced-motion:reduce)')&&source.includes('#warpVelocityAperture,#warpVelocityAperture::before,#warpVelocityAperture::after{transition:none}'),'reduced-motion mode removes the phase interpolation');
ok(source.includes("root.setAttribute('aria-hidden','true')")&&source.includes("root.id=ROOT_ID"),'aperture is presentation-only and non-semantic');
ok(source.includes("elements:root?.children?.length||0"),'runtime snapshot exposes zero-child pseudo-element budget');
ok(source.includes('motionTreatment:MOTION_TREATMENT'),'runtime diagnostics expose the v6 motion treatment');
ok(source.includes("window.WarpWarpVelocityAperture={snapshot}"),'runtime exposes focused diagnostics for acceptance');
ok(!/setInterval|requestAnimationFrame/.test(source),'aperture adds no timer or render loop');
ok(!/\bfetch\s*\(|localStorage|sessionStorage|indexedDB/.test(source),'aperture adds no network or persistence authority');
ok(!/THREE\.|three@|new\s+WebGLRenderer/.test(source),'aperture adds no Three.js renderer, geometry or dependency');
ok(!/backdrop-filter|\bfilter\s*:/.test(source),'aperture avoids filter/backdrop-filter fill-rate work');
ok(loader.includes("import('./warp-velocity-aperture.js').catch(()=>{})"),'production focus-tray loader mounts the aperture module');
ok(sw.includes("'./warp-velocity-aperture.js'"),'prepared offline shell contains the aperture module');
ok(doc.includes('Velocity Aperture Expansion')&&doc.includes('velocity-aperture-expansion-v6'),'Warp Corridor SOT records the v6 phase-expansion treatment');
ok(doc.includes('velocity-aperture-v5'),'Warp Corridor SOT preserves the v5 aperture architecture contract');
ok(doc.includes('z-index 4')&&doc.includes('z-index 5'),'Warp Corridor SOT records the aperture/corridor stacking contract');
ok(pkg.scripts?.check?.includes('node scripts/validate-warp-velocity-aperture.mjs'),'npm run check includes focused aperture validation');

if(failures.length){
  console.error(`\n${failures.length} warp velocity aperture validation failure(s):`);
  for(const failure of failures)console.error(`✗ ${failure}`);
  process.exit(1);
}
console.log(`\nWarp velocity aperture expansion v6: ${passes}/${passes} checks passed.`);
