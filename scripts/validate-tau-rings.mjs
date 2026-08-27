import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const filePath=fileURLToPath(import.meta.url);
const root=resolve(dirname(filePath),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

class ClassList{
  constructor(el){this.el=el;this.set=new Set()}
  load(v){this.set=new Set(String(v||'').split(/\s+/).filter(Boolean));this.sync()}
  sync(){this.el._className=[...this.set].join(' ')}
  add(...xs){xs.forEach(x=>x&&this.set.add(x));this.sync()}
  remove(...xs){xs.forEach(x=>this.set.delete(x));this.sync()}
  contains(x){return this.set.has(x)}
  toggle(x,force){const on=force===undefined?!this.contains(x):!!force;on?this.set.add(x):this.set.delete(x);this.sync();return on}
}
class El extends EventTarget{
  constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.parentNode=null;this.children=[];this.attrs={};this.dataset={};this.style={};this.disabled=false;this.value='';this._text='';this._className='';this.classList=new ClassList(this)}
  get parentElement(){return this.parentNode||null}
  get id(){return this.attrs.id||''} set id(v){this.attrs.id=String(v)}
  get className(){return this._className} set className(v){this.classList.load(v)}
  get textContent(){return this.children.length?this.children.map(x=>x.textContent||'').join(''):this._text}
  set textContent(v){this.children=[];this._text=String(v??'')}
  get offsetWidth(){return 390}
  setAttribute(k,v=''){this.attrs[k]=String(v);if(k==='id')this.id=v;else if(k==='class')this.className=v;else if(k==='disabled')this.disabled=true;else if(k==='value')this.value=String(v);else if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v)}
  getAttribute(k){return this.attrs[k]??null}
  append(...nodes){for(let node of nodes){if(typeof node==='string'){const text=new El('span');text.textContent=node;node=text}node.parentNode=this;this.children.push(node)}}
  replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes)}
  insertAdjacentElement(pos,el){if(pos!=='afterend'||!this.parentNode)return null;const list=this.parentNode.children,i=list.indexOf(this);if(i<0)return null;el.parentNode=this.parentNode;list.splice(i+1,0,el);return el}
  querySelector(sel){return query(this,sel,false)[0]||null}
  querySelectorAll(sel){return query(this,sel,false)}
  closest(sel){let node=this;while(node){if(matches(node,sel))return node;node=node.parentNode}return null}
  scrollIntoView(){}
  set innerHTML(html){this.replaceChildren();parse(String(html),this)}
}
class Doc extends EventTarget{
  constructor(){super();this.head=new El('head');this.body=new El('body');this.root=new El('html');this.root.append(this.head,this.body)}
  createElement(tag){return new El(tag)}
  querySelector(sel){return query(this.root,sel,true)[0]||null}
  querySelectorAll(sel){return query(this.root,sel,true)}
}
function walk(node,include=false,out=[]){if(include)out.push(node);for(const child of node.children||[]){out.push(child);walk(child,false,out)}return out}
function simple(el,sel){if(sel.startsWith('#'))return el.id===sel.slice(1);if(sel.startsWith('.'))return sel.slice(1).split('.').every(c=>el.classList.contains(c));if(sel.startsWith('[')){const body=sel.slice(1,-1),[raw,val]=body.split('='),name=raw.trim();let actual=name.startsWith('data-')?el.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:el.getAttribute(name);return val===undefined?actual!=null:String(actual)===val.trim().replace(/^['"]|['"]$/g,'')}return el.tagName===sel.toUpperCase()}
function matches(el,sel){const parts=String(sel).trim().split(/\s+/).filter(Boolean);let node=el,i=parts.length-1;if(i<0||!simple(node,parts[i]))return false;for(i--;i>=0;i--){node=node.parentNode;while(node&&!simple(node,parts[i]))node=node.parentNode;if(!node)return false}return true}
function query(node,sel,include){return walk(node,include,[]).filter(el=>matches(el,sel))}
function parse(html,parent){const stack=[parent],tokens=html.match(/<[^>]+>|[^<]+/g)||[],voids=new Set(['BR','INPUT','HR','IMG']);for(const token of tokens){if(token.startsWith('</')){if(stack.length>1)stack.pop();continue}if(token.startsWith('<')){const m=token.match(/^<\s*([\w-]+)/);if(!m)continue;const el=new El(m[1]),attrs=token.slice(m[0].length,token.length-(token.endsWith('/>')?2:1));for(const a of attrs.matchAll(/([^\s=/>]+)(?:\s*=\s*"([^"]*)")?/g))el.setAttribute(a[1],a[2]??'');stack.at(-1).append(el);if(!token.endsWith('/>')&&!voids.has(el.tagName))stack.push(el)}else if(token.trim()){const text=new El('span');text.textContent=token;stack.at(-1).append(text)}}}
class Storage{constructor(seed={}){this.map=new Map(Object.entries(seed))}getItem(k){return this.map.has(String(k))?this.map.get(String(k)):null}setItem(k,v){this.map.set(String(k),String(v))}snapshot(){return Object.fromEntries(this.map)}}

function install(seed={}){
  const document=new Doc(),app=document.createElement('main'),desc=document.createElement('div'),guide=document.createElement('section'),journal=document.createElement('section');
  app.id='app';desc.id='exploreDesc';guide.id='landmarkGuide';journal.id='travelJournal';app.append(desc,guide,journal);document.body.append(app);
  const events=new EventTarget(),intervals=[],storage=new Storage(seed),state={current:'TAU',exploring:true,flying:false,contextLost:false};
  Object.defineProperty(globalThis,'window',{value:globalThis,configurable:true});
  Object.defineProperty(globalThis,'document',{value:document,configurable:true});
  Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
  Object.defineProperty(globalThis,'navigator',{value:{vibrate(){}},configurable:true});
  if(typeof globalThis.CustomEvent!=='function')globalThis.CustomEvent=class CustomEvent extends Event{constructor(type,opts={}){super(type);this.detail=opts.detail}};
  globalThis.addEventListener=(...a)=>events.addEventListener(...a);globalThis.removeEventListener=(...a)=>events.removeEventListener(...a);globalThis.dispatchEvent=e=>events.dispatchEvent(e);
  globalThis.setInterval=(fn,ms)=>{intervals.push({fn,ms});return intervals.length};globalThis.clearInterval=()=>{};
  globalThis.WarpTravelJournal={entries(){return[]},visited(){return['SOL','TAU']}};
  globalThis.WarpSim={state(){return{...state}},select(){return true}};
  return{document,storage,state,tick(){intervals.forEach(x=>x.fn())}};
}
function input(el,value){el.value=String(value);el.dispatchEvent(new Event('input'))}
function click(el){el.dispatchEvent(new Event('click'))}
function atlasHas(document,label){return document.querySelectorAll('.atlasDiscovery').some(el=>el.textContent.includes(label))}
async function waitFor(predicate,label){for(let i=0;i<60;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve))}throw new Error(`Timed out waiting for ${label}`)}

async function runtime(phase){
  const seed=process.env.TAU_STORAGE?JSON.parse(Buffer.from(process.env.TAU_STORAGE,'base64').toString('utf8')):{};
  const page=install(seed);
  await import(pathToFileURL(resolve(root,'star-atlas.js')).href);
  await waitFor(()=>globalThis.WarpStarAtlas&&globalThis.WarpTauRings,'production Star Atlas and TAU module');
  page.tick();
  const section=page.document.querySelector('#tauRingProfiler'),range=page.document.querySelector('#tauRange'),action=page.document.querySelector('#tauCapture'),api=globalThis.WarpTauRings;
  assert(section&&range&&action,'production TAU controls exist');assert(section.classList.contains('show'),'TAU control visible in safe final exploration');
  if(phase==='fresh'){
    input(range,0);assert.equal(action.disabled,true,'capture disabled away from anomaly');
    input(range,20);assert.equal(action.disabled,false,'capture enabled exactly at ±3 boundary');
    input(range,23);click(action);assert.equal(api.progress().captured.length,1,'first ring anomaly recorded');
    click(action);assert.equal(api.progress().captured.length,1,'duplicate cannot re-record anomaly');
    input(range,56);page.state.flying=true;page.tick();assert.equal(section.classList.contains('show'),false,'TAU control hides while flying');assert.equal(api.capture(),false,'diagnostic capture rejected while flying');
    page.state.flying=false;page.state.contextLost=true;page.tick();assert.equal(api.capture(),false,'diagnostic capture rejected during context loss');
    page.state.contextLost=false;page.tick();click(action);assert.equal(api.progress().captured.length,2,'second anomaly records after safe state returns');
    input(range,82);click(action);assert.equal(api.progress().captured.length,3,'third anomaly completes profile');assert.equal(api.progress().discovery,true,'TAU discovery unlocks');
    assert(page.document.querySelector('#tauDiscovery').classList.contains('show'),'discovery panel shown');assert(atlasHas(page.document,'三層環隙共振'),'same-tab production Star Atlas shows TAU discovery');
  }else{
    assert.equal(api.progress().captured.length,3,'fresh process restores three anomalies');assert.equal(api.progress().discovery,true,'fresh process restores discovery');assert(page.document.querySelector('#tauProgress').textContent.startsWith('3 / 3'),'reloaded UI renders completion');assert(atlasHas(page.document,'三層環隙共振'),'fresh-process production Star Atlas restores TAU discovery');
  }
  console.log('STORAGE:'+Buffer.from(JSON.stringify(page.storage.snapshot())).toString('base64'));
}
function child(phase,storage=''){const r=spawnSync(process.execPath,[filePath,'--runtime',phase],{encoding:'utf8',timeout:10000,env:{...process.env,TAU_STORAGE:storage}});if(r.status!==0)throw new Error(r.stdout+'\n'+r.stderr);const m=r.stdout.match(/STORAGE:([A-Za-z0-9+/=]+)/);assert(m);return m[1]}

if(process.argv[2]==='--runtime')await runtime(process.argv[3]);
else{
  const tau=read('tau-ring-profiler.js'),atlas=read('star-atlas.js'),sw=read('sw.js'),pkg=JSON.parse(read('package.json'));let passes=0;const ok=(v,msg)=>{assert(v,msg);passes++};
  ok(spawnSync(process.execPath,['--check',resolve(root,'tau-ring-profiler.js')]).status===0,'TAU module parses');
  ok(tau.includes("const KEY='stellar-warp-tau-rings-v1'"),'versioned TAU storage key');ok(tau.includes("const SYSTEM='TAU'"),'TAU-only scope');ok(tau.includes('const CAPTURE_WINDOW=3'),'bounded ±3 capture window');
  const radii=[...tau.matchAll(/\{id:'[^']+',name:'[^']+',radius:(\d+)/g)].map(x=>Number(x[1]));ok(radii.length===3&&new Set(radii).size===3&&radii.every(x=>x>=0&&x<=100),'three unique normalized ring radii');
  ok(tau.includes("state.current===SYSTEM&&state.exploring&&!state.flying&&!state.contextLost"),'safe final-exploration gate');ok(tau.includes('setInterval(sample,500)'),'state sampling bounded to 2 Hz');
  ok(tau.includes("localStorage.setItem(KEY,JSON.stringify({version:1,captured:progress.captured}))"),'progress persists locally');ok(tau.includes("discoveryUnlocked()?'三層環隙共振':null"),'completion emits TAU discovery');
  ok(!/fetch\(|XMLHttpRequest|WebSocket|requestAnimationFrame/.test(tau),'no network or renderer-loop work');ok(tau.includes('.tauRange{width:100%;height:44px')&&tau.includes('.tauCapture{width:100%;min-height:44px'),'mobile scan controls meet 44px touch-target baseline');
  ok(tau.includes('@media(min-width:900px)')&&tau.includes('font-size:var(--ui-sm)'),'desktop readability uses shared tokens');
  ok(atlas.includes("const TAU_RINGS_KEY='stellar-warp-tau-rings-v1'"),'Star Atlas observes TAU storage');ok(atlas.includes("discoveries.set('TAU','三層環隙共振')"),'Star Atlas aggregates TAU discovery');ok(atlas.includes("import('./tau-ring-profiler.js').then(()=>render(true)).catch(()=>{})"),'Star Atlas loads TAU module');
  ok(sw.includes("'./tau-ring-profiler.js'"),'offline shell includes TAU module');ok(pkg.scripts?.check?.includes('node scripts/validate-tau-rings.mjs'),'npm check includes TAU validator');
  const storage=child('fresh');passes++;child('reload',storage);passes++;
  console.log(`\nTAU ring profiler: ${passes}/${passes} checks passed (production Star Atlas + TAU DOM/event runtime).`);
}
