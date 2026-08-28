import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

if(process.argv.includes('--runtime')){
  class ClassList{constructor(){this.s=new Set()}add(...x){x.forEach(v=>this.s.add(v))}remove(...x){x.forEach(v=>this.s.delete(v))}contains(x){return this.s.has(x)}toggle(x,f){const n=f===undefined?!this.s.has(x):!!f;n?this.s.add(x):this.s.delete(x);return n}}
  class El extends EventTarget{
    constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.id='';this.classList=new ClassList();this._className='';this.textContent='';this.attributes={};this.scrolled=false;this.disabled=false}
    set className(v){this._className=v;this.classList=new ClassList();String(v).split(/\s+/).filter(Boolean).forEach(x=>this.classList.add(x))}get className(){return this._className}
    append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n)}}
    setAttribute(k,v){this.attributes[k]=String(v)}
    querySelector(sel){return find(this,sel)}
    insertAdjacentElement(pos,node){assert.equal(pos,'beforebegin');const p=this.parentNode,i=p.children.indexOf(this);node.parentNode=p;p.children.splice(i,0,node);return node}
    scrollIntoView(){this.scrolled=true}
    click(){this.dispatchEvent(new Event('click'))}
  }
  function all(root){return [root,...root.children.flatMap(all)]}
  function match(el,s){if(s.startsWith('#'))return el.id===s.slice(1);if(s.startsWith('.'))return el.classList.contains(s.slice(1));return el.tagName===s.toUpperCase()}
  function find(root,selector){const parts=selector.trim().split(/\s+/);if(parts.length===1)return all(root).find(el=>match(el,parts[0]))||null;const first=all(root).filter(el=>match(el,parts[0]));for(const base of first){const hit=all(base).find(el=>el!==base&&match(el,parts[1]));if(hit)return hit}return null}
  class Doc{constructor(){this.head=new El('head');this.body=new El('body')}createElement(t){return new El(t)}querySelector(s){return find(this.head,s)||find(this.body,s)}}
  const document=new Doc(),app=new El('main');app.id='app';
  const explore=new El('section');explore.id='exploreCard';const body=new El('div');body.className='exploreBody';const actions=new El('div');actions.className='exploreActions';body.append(actions);explore.append(body);
  const open=new El('button');open.id='openPanel';let openCount=0;open.addEventListener('click',()=>openCount++);
  const atlas=new El('section');atlas.id='starAtlas';atlas.className='compact';const toggle=new El('button');toggle.id='atlasToggle';toggle.textContent='展開';atlas.append(toggle);
  app.append(explore,open,atlas);document.body.append(app);
  const events=new EventTarget(),intervals=[];let state={current:'LUNA',exploring:true,flying:false,contextLost:false},vibrations=0,photoEntries=0,photoActive=false;
  let discoveries={LUNA:'地月視差層'};
  const systems=[
    {id:'LUNA',discovery:{name:'地月視差層',kind:'地月幾何',note:'月面、遠方地球與環站形成可重現的三層視差基準。'}},
    {id:'VEGA',discovery:{name:'雙環共振窗口',kind:'人工星門',note:'雙層星門出現同步共振窗口。'}},
    {id:'CYG',discovery:{name:'雙星航標三角場',kind:'導航訊號',note:'雙星與人工航標形成穩定三角場。'}},
    {id:'ORION',discovery:{name:'三線發射殼層',kind:'發射光譜',note:'三條窄帶峰標記模擬發射殼層。'}}
  ];
  Object.assign(globalThis,{window:globalThis,document});
  if(typeof globalThis.CustomEvent!=='function')globalThis.CustomEvent=class CustomEvent extends Event{constructor(type,options={}){super(type);this.detail=options.detail}};
  Object.defineProperty(globalThis,'navigator',{value:{vibrate(){vibrations++}},configurable:true});
  globalThis.addEventListener=(...a)=>events.addEventListener(...a);globalThis.dispatchEvent=e=>events.dispatchEvent(e);
  globalThis.setInterval=(fn,ms)=>{intervals.push({fn,ms});return intervals.length};globalThis.setTimeout=fn=>{fn();return 1};
  globalThis.WarpSim={state(){return{...state}}};
  globalThis.WarpStarAtlas={snapshot(){return{discoveries:{...discoveries},systems:systems.map(x=>({...x,discovery:{...x.discovery}}))}}};
  globalThis.WarpPhotoMode={enter(){photoEntries++;photoActive=true},active(){return photoActive}};
  await import(pathToFileURL(resolve(root,'discovery-debrief.js')).href+'?runtime='+Date.now());
  const card=document.querySelector('#discoveryDebrief');assert(card&&!card.classList.contains('show'),'persisted discovery baseline does not replay completion on reload');
  discoveries.VEGA='雙環共振窗口';state={current:'VEGA',exploring:true,flying:false,contextLost:false};intervals.forEach(item=>item.fn());
  assert(card.classList.contains('show'),'1 Hz atlas fallback detects a legacy destination completion');
  assert(document.querySelector('#discoveryDebriefProgress').textContent.includes('2 / 7'),'legacy fallback reports current atlas progress');
  assert(document.querySelector('#discoveryDebriefNote').textContent.includes('人工星門'),'legacy completion shows catalog field-note classification');
  document.querySelector('#discoveryDebriefAtlas').dispatchEvent(new Event('click'));
  assert.equal(openCount,1,'atlas action opens control panel');assert(!atlas.classList.contains('compact'),'atlas action expands atlas');assert(atlas.scrolled,'atlas action scrolls atlas into view');assert(!card.classList.contains('show'),'atlas action dismisses debrief');
  discoveries.CYG='雙星航標三角場';state={current:'CYG',exploring:true,flying:false,contextLost:false};
  dispatchEvent(new CustomEvent('stellarwarp:discovery-change',{detail:{system:'CYG',discovery:'雙星航標三角場'}}));
  assert(card.classList.contains('show'),'completion event shows debrief');
  assert(document.querySelector('#discoveryDebriefTitle').textContent.includes('天鵝航標'),'debrief names destination');
  assert(document.querySelector('#discoveryDebriefName').textContent.includes('雙星航標三角場'),'debrief names discovery');
  assert(document.querySelector('#discoveryDebriefNote').textContent.includes('穩定三角場'),'debrief explains the collected field note');
  assert(document.querySelector('#discoveryDebriefProgress').textContent.includes('3 / 7'),'debrief reports atlas completion progress');
  assert.equal(document.querySelector('#discoveryDebriefPhoto').disabled,false,'photo handoff is available when existing Photo Mode API is ready');
  document.querySelector('#discoveryDebriefPhoto').dispatchEvent(new Event('click'));
  assert.equal(photoEntries,1,'photo handoff enters existing Photo Mode exactly once');assert(!card.classList.contains('show'),'photo handoff dismisses debrief after successful entry');
  assert.equal(vibrations,2,'each accepted completion gives one optional haptic acknowledgement');
  state.flying=true;dispatchEvent(new CustomEvent('stellarwarp:discovery-change',{detail:{system:'ORION',discovery:'三線發射殼層',count:4,total:7}}));assert(!card.classList.contains('show'),'unsafe flight state rejects completion UI');
  state={current:'ORION',exploring:true,flying:false,contextLost:false};dispatchEvent(new CustomEvent('stellarwarp:discovery-change',{detail:{system:'ORION',discovery:'三線發射殼層',count:4,total:7}}));assert(card.classList.contains('show'),'safe later discovery can show');document.querySelector('#discoveryDebriefNext').dispatchEvent(new Event('click'));assert.equal(openCount,2,'next-destination action opens existing navigation panel');assert(!card.classList.contains('show'),'next action dismisses debrief');
  console.log('Discovery field-note runtime passed.');process.exit(0);
}

const failures=[];let passes=0;const ok=(c,m)=>{if(c){passes++;console.log('✓ '+m)}else failures.push(m)};
const debrief=read('discovery-debrief.js'),atlas=read('star-atlas.js'),arrival=read('arrival-debrief.js'),sw=read('sw.js'),pkg=JSON.parse(read('package.json'));
const syntax=spawnSync(process.execPath,['--check',resolve(root,'discovery-debrief.js')],{encoding:'utf8'});ok(syntax.status===0,'discovery debrief JavaScript parses');
const atlasSyntax=spawnSync(process.execPath,['--check',resolve(root,'star-atlas.js')],{encoding:'utf8'});ok(atlasSyntax.status===0,'Star Atlas JavaScript parses with field-note catalog');
ok(arrival.includes("import('./discovery-debrief.js').catch(()=>{})"),'active arrival flow loads discovery completion handoff');
ok(debrief.includes("addEventListener('stellarwarp:discovery-change'")&&debrief.includes('setInterval(sample,1000)'),'handoff uses immediate discovery events with a bounded 1 Hz atlas fallback');
ok(debrief.includes('readSnapshot()?.discoveries')&&debrief.includes('readSnapshot()?.systems'),'handoff reads discovery result and field-note metadata from existing Star Atlas authority');
ok((atlas.match(/discovery:\{name:/g)||[]).length===7,'Star Atlas defines exactly seven external discovery field-note profiles');
ok(atlas.includes("kind:'發射光譜'")&&atlas.includes("kind:'行星環結構'")&&atlas.includes("kind:'星港進場'"),'field-note profiles distinguish destination-specific discovery types');
ok(atlas.includes("badge.className='atlasDiscovery'")&&atlas.includes("note.className='atlasDiscoveryNote'")&&atlas.includes('system.discovery?'),'Star Atlas renders persistent field notes only alongside collected discoveries');
ok(debrief.includes('state.current===system&&state.exploring&&!state.flying&&!state.contextLost'),'completion UI is gated to safe final exploration');
ok(debrief.includes('window.WarpPhotoMode')&&debrief.includes('api.enter()')&&debrief.includes('api.active'),'completion handoff reuses existing Photo Mode without a second capture path');
ok(debrief.includes("document.querySelector('#openPanel')?.click()")&&debrief.includes("atlas.classList.remove('compact')"),'completion actions reuse existing panel and Star Atlas');
ok(debrief.includes('.discoveryDebriefActions button{min-height:44px'),'mobile actions preserve the 44 px touch baseline');
ok(debrief.includes('.discoveryPhoto{grid-column:1/-1'),'photo handoff remains full-width instead of squeezing three phone buttons into one row');
ok(/@media\(min-width:900px\)/.test(debrief)&&debrief.includes('var(--ui-sm)'),'desktop text reuses responsive typography tokens');
ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|WebSocket|requestAnimationFrame/.test(debrief),'handoff adds no persistence, network or render-loop work');
ok(sw.includes("'./discovery-debrief.js'"),'prepared offline shell includes discovery completion handoff');
ok(pkg.scripts?.check?.includes('node scripts/validate-discovery-debrief.mjs'),'npm run check includes focused discovery handoff validation');
const runtime=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--runtime'],{encoding:'utf8'});ok(runtime.status===0,'390x844-style field-note/photo runtime flow passes'+(runtime.stderr?`: ${runtime.stderr.trim()}`:''));
if(failures.length){console.error(`\n${failures.length} discovery debrief validation failure(s):`);failures.forEach(x=>console.error('✗ '+x));process.exit(1)}
console.log(`\nDiscovery field notes + photo handoff: ${passes}/${passes} focused checks passed.`);if(runtime.stdout)process.stdout.write(runtime.stdout);
