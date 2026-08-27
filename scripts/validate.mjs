import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const failures = [];
const passes = [];

function ok(condition, message) {
  if (condition) passes.push(message);
  else failures.push(message);
}

function bytes(path) {
  return readFileSync(join(root, path));
}

function text(path) {
  return bytes(path).toString('utf8');
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const required = [
  'index.html',
  'travel-journal.js',
  'releases/v4.0-stable.html',
  'README.md',
  'AGENTS.md',
  'docs/PRD.md',
  'docs/ARCHITECTURE.md',
  'docs/FLIGHT_MODEL.md',
  'docs/STAR_MAP.md',
  'docs/PERFORMANCE.md',
  'docs/TESTING.md',
  'docs/DECISIONS.md',
  'docs/ROADMAP.md',
  'docs/HANDOFF.md',
  'docs/PUBLISHING.md',
  'docs/REPOSITORY_MANIFEST.md',
  'archive/README.md',
  'releases/README.md',
];
for (const path of required) {
  try {
    ok(statSync(join(root, path)).isFile(), `required file: ${path}`);
  } catch {
    ok(false, `required file: ${path}`);
  }
}

const indexBytes = bytes('index.html');
const stableBytes = bytes('releases/v4.0-stable.html');
const stableHash = '8fe7850e0d3c3d8f782571c429a7e3293b86ef2dc119cbbd86c9852f7c10a6a5';
ok(sha256(stableBytes) === stableHash, 'V4.0 stable SHA-256 is unchanged');

const archiveHashes = new Map([
  ['archive/v1-interactive-starfield.html', '8bbad22053b66101a65239e00028a3d28451bf03227f2f794c1d37ee8bafb00e'],
  ['archive/v2-navigation-simulator.html', '36031d21eaf24fad2271c238ea793bb8242971e1565709c320f6e2fb1701c025'],
  ['archive/v3.0-true-3d-navigation.html', '0eadbfd528e659c5acab4e1fa8ade3a8268bd11edef8b60cbb097d72d1f10cd9'],
  ['archive/v3.1-warp-restored.html', 'f04dc62eea878ca6d290fa563f264119696df114ebbcbbc46322781c95c6a1a2'],
  ['archive/v3.2-continuous-arrival-realistic-planets.html', '543fb2e6f6fb9c8fedeaae8a3e1e7c03d384db4abc3dea23495794473e63c6a9'],
]);
for (const [path, hash] of archiveHashes) {
  ok(sha256(bytes(path)) === hash, `archive integrity: ${path}`);
}

const html = indexBytes.toString('utf8');
ok(html.startsWith('<!doctype html>'), 'HTML doctype exists');
ok(html.includes('</html>'), 'HTML closes correctly');
ok(html.includes('three@0.185.1/build/three.module.js'), 'Three.js dependency is version-pinned');
ok(html.includes('prefers-reduced-motion:reduce'), 'reduced-motion CSS fallback exists');
ok(html.includes('aria-label="可轉向的 3D 星際曲速航行模擬器"'), 'main canvas has an accessible label');
ok(html.includes('travel-journal.js'), 'travel journal client is loaded by the active simulator');

const moduleMatch = html.match(/<script type="module">([\s\S]*?)<\/script>\s*<\/body>/);
ok(Boolean(moduleMatch), 'inline module script can be extracted');
if (moduleMatch) {
  const tmp = mkdtempSync(join(tmpdir(), 'warp-validate-'));
  const scriptPath = join(tmp, 'app.mjs');
  writeFileSync(scriptPath, moduleMatch[1]);
  const result = spawnSync(process.execPath, ['--check', scriptPath], { encoding: 'utf8' });
  ok(result.status === 0, `inline module JavaScript parses${result.stderr ? `: ${result.stderr.trim()}` : ''}`);
  rmSync(tmp, { recursive: true, force: true });
}

const journalScript = text('travel-journal.js');
const journalParse = spawnSync(process.execPath, ['--check', join(root, 'travel-journal.js')], { encoding: 'utf8' });
ok(journalParse.status === 0, `travel journal JavaScript parses${journalParse.stderr ? `: ${journalParse.stderr.trim()}` : ''}`);
ok(journalScript.includes("const KEY='stellar-warp-travel-journal-v1'"), 'travel journal storage key is versioned');
ok(journalScript.includes('previous.flying&&!state.flying&&active'), 'travel journal detects completed flight transitions');
ok(journalScript.includes('state.current!==destination'), 'travel journal rejects aborted or incomplete routes');
ok(journalScript.includes('setInterval(sample,500)'), 'travel journal sampling is bounded to 2 Hz');

const nodeBlock = html.match(/const N=\[([\s\S]*?)\];\s*const node=/);
ok(Boolean(nodeBlock), 'star-system data block exists');

const expectedIds = ['SOL', 'LUNA', 'VEGA', 'CYG', 'ORION', 'TAU', 'SIRIUS', 'PROX'];
let parsedNodes = [];
if (nodeBlock) {
  const re = /\{id:'([^']+)',name:'([^']+)',p:\[([^\]]+)\]/g;
  let match;
  while ((match = re.exec(nodeBlock[1]))) {
    parsedNodes.push({
      id: match[1],
      name: match[2],
      p: match[3].split(',').map(Number),
    });
  }
}
ok(parsedNodes.length === 8, 'exactly eight star systems are defined');
ok(expectedIds.every((id) => parsedNodes.some((n) => n.id === id)), 'all approved star-system IDs exist');
ok(new Set(parsedNodes.map((n) => n.id)).size === 8, 'star-system IDs are unique');
ok(parsedNodes.every((n) => n.p.length === 3 && n.p.every(Number.isFinite)), 'all systems have valid X/Y/Z coordinates');

function distance(a, b) {
  return Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]);
}

function shortestPath(nodes, from, to, maxLeg = 6.0) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const unvisited = new Set(byId.keys());
  const dist = new Map([...unvisited].map((id) => [id, Infinity]));
  const prev = new Map();
  dist.set(from, 0);
  while (unvisited.size) {
    let current = null;
    for (const id of unvisited) {
      if (current === null || dist.get(id) < dist.get(current)) current = id;
    }
    if (current === null || !Number.isFinite(dist.get(current))) break;
    unvisited.delete(current);
    if (current === to) break;
    for (const next of unvisited) {
      const leg = distance(byId.get(current), byId.get(next));
      if (leg > maxLeg + 1e-9) continue;
      const candidate = dist.get(current) + leg;
      if (candidate < dist.get(next)) {
        dist.set(next, candidate);
        prev.set(next, current);
      }
    }
  }
  if (!Number.isFinite(dist.get(to))) return [];
  const route = [];
  for (let id = to; id; id = prev.get(id)) {
    route.unshift(id);
    if (id === from) break;
  }
  return route;
}

if (parsedNodes.length === 8) {
  ok(parsedNodes.every((n) => shortestPath(parsedNodes, 'SOL', n.id).length > 0), 'all systems are reachable from SOL');
  ok(shortestPath(parsedNodes, 'SOL', 'ORION').join('>') === 'SOL>LUNA>VEGA>CYG>ORION', 'approved SOL → ORION route is unchanged');
  ok(shortestPath(parsedNodes, 'SOL', 'TAU').join('>') === 'SOL>SIRIUS>TAU', 'approved SOL → TAU route is unchanged');
}

const requiredBehaviour = [
  ['phase turn', "phase='turn'"],
  ['phase accelerate', "'accelerate'"],
  ['phase warp entry', "'warpEntry'"],
  ['phase warp cruise', "'warp'"],
  ['phase warp exit', "'warpExit'"],
  ['phase decelerate', "'decelerate'"],
  ['phase approach', "'approach'"],
  ['phase observe', "'observe'"],
  ['continuous arrival profile', 'function arrivalDepthAt'],
  ['Hermite arrival interpolation', 'function hermiteDepth'],
  ['dynamic audio', 'class SpaceAudio'],
  ['destination exploration', 'function enterExplore'],
  ['adaptive quality', "qualityMode==='auto'"],
  ['2.5D star map', '2.5D 全息星圖'],
  ['public diagnostic API', 'window.WarpSim='],
  ['WebGL context loss handling', "C.addEventListener('webglcontextlost'"],
  ['WebGL context restoration handling', "C.addEventListener('webglcontextrestored'"],
  ['simulation pauses during context loss', 'if(hidden||contextLost)return'],
  ['context recovery diagnostic control', 'loseContext(){renderer.forceContextLoss()}'],
];
for (const [name, marker] of requiredBehaviour) ok(html.includes(marker), name);

const textExtensions = new Set(['.html', '.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.txt']);
const secretPatterns = [
  ['AWS access key', /AKIA[0-9A-Z]{16}/g],
  ['GitHub classic token', /gh[pousr]_[A-Za-z0-9]{30,}/g],
  ['GitHub fine-grained token', /github_pat_[A-Za-z0-9_]{30,}/g],
  ['OpenAI-like secret', /sk-[A-Za-z0-9_-]{20,}/g],
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];
for (const full of walk(root)) {
  if (!textExtensions.has(extname(full).toLowerCase())) continue;
  const body = readFileSync(full, 'utf8');
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    ok(!pattern.test(body), `no ${label}: ${relative(root, full)}`);
  }
}

for (const message of passes) console.log(`✓ ${message}`);
if (failures.length) {
  console.error(`\n${failures.length} validation failure(s):`);
  for (const message of failures) console.error(`✗ ${message}`);
  process.exit(1);
}
console.log(`\nAll ${passes.length} checks passed.`);
