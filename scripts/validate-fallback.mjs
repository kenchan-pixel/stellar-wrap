import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('offline-bootstrap.js');
const pkg=JSON.parse(read('package.json'));
const doc=read('docs/FALLBACK.md');
let passed=0;
const checks=[];
function check(ok,label){checks.push([!!ok,label]);if(ok)passed++}

const syntax=spawnSync(process.execPath,['--check','offline-bootstrap.js'],{cwd:root,encoding:'utf8'});
check(syntax.status===0,'offline bootstrap JavaScript syntax');
check(source.includes("function webglAvailable()"),'explicit WebGL capability probe exists');
check(source.includes("getExtension?.('WEBGL_lose_context')?.loseContext()"),'WebGL capability probe releases its temporary context');
check(source.includes("function showStaticFallback(reason='startup')"),'static fallback renderer exists');
check(source.includes("if(webglAvailable())setTimeout(startupGuard,STARTUP_TIMEOUT)"),'9 second guard runs only when WebGL is available');
check(source.includes("showStaticFallback('webgl')"),'unsupported WebGL enters fallback immediately');
check(source.includes("STATIC NAVIGATION FALLBACK"),'fallback has explicit mode label');
check(source.includes('靜態模式只提供星圖與路線參考'),'fallback does not misrepresent 3D capability');
check(source.includes("location.reload()"),'fallback exposes 3D retry action');
check(!source.includes('requestAnimationFrame('),'fallback adds no render-loop work');
check(!source.includes('setInterval('),'fallback adds no polling loop');

const block=source.match(/const FALLBACK_SYSTEMS=\[(.*?)\];/s)?.[1]||'';
const systems=[];
const re=/{id:'([^']+)',name:'([^']+)',p:\[([^\]]+)\],m:\[([^\]]+)\]}/g;
for(const match of block.matchAll(re))systems.push({id:match[1],p:match[3].split(',').map(Number)});
check(systems.length===8,'fallback contains exactly eight systems');
check(new Set(systems.map(system=>system.id)).size===8,'fallback system IDs are unique');
const ids=['SOL','LUNA','VEGA','CYG','ORION','TAU','SIRIUS','PROX'];
check(ids.every(id=>systems.some(system=>system.id===id)),'all approved V4 system IDs exist');

const byId=Object.fromEntries(systems.map(system=>[system.id,system]));
const distance=(a,b)=>Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1],a.p[2]-b.p[2]);
const graph={};for(const a of systems)graph[a.id]=systems.filter(b=>a!==b&&distance(a,b)<=6.001).map(b=>[b.id,distance(a,b)]);
function plan(from,to){const queue=new Set(ids),cost={},prev={};for(const id of ids)cost[id]=Infinity;cost[from]=0;while(queue.size){let current=null;for(const id of queue)if(current===null||cost[id]<cost[current])current=id;if(current===null||!Number.isFinite(cost[current]))break;queue.delete(current);if(current===to)break;for(const[next,w]of graph[current])if(queue.has(next)&&cost[current]+w<cost[next]){cost[next]=cost[current]+w;prev[next]=current}}const route=[];if(!Number.isFinite(cost[to]))return route;for(let id=to;id;id=prev[id]){route.unshift(id);if(id===from)break}return route}
check(plan('SOL','ORION').join('>')==='SOL>LUNA>VEGA>CYG>ORION','fallback preserves SOL → ORION shortest route');
check(plan('SOL','TAU').join('>')==='SOL>SIRIUS>TAU','fallback preserves SOL → TAU shortest route');
check(ids.every(id=>id==='SOL'||plan('SOL',id).length>1),'all fallback systems remain reachable from SOL');
check(pkg.scripts?.check?.includes('validate-fallback.mjs'),'npm run check includes fallback validator');
check(doc.includes('靜態導航後備'),'fallback behaviour is documented');
check(doc.includes('不會模擬 3D 航程'),'documentation states fallback limitation');

for(const[ok,label]of checks)console.log(`${ok?'PASS':'FAIL'} ${label}`);
console.log(`\n${passed}/${checks.length} fallback checks passed.`);
if(passed!==checks.length)process.exit(1);