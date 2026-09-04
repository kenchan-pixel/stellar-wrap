import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const filePath=fileURLToPath(import.meta.url);
const root=resolve(dirname(filePath),'..');
const modulePath=resolve(root,'navigation-discovery-status.js');
const source=readFileSync(modulePath,'utf8');
const sw=readFileSync(resolve(root,'sw.js'),'utf8');
const discoveryDebrief=readFileSync(resolve(root,'discovery-debrief.js'),'utf8');
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const failures=[];
const passes=[];
const ok=(condition,message)=>(condition?passes:failures).push(message);

const parse=spawnSync(process.execPath,['--check',modulePath],{encoding:'utf8'});
ok(parse.status===0,`navigation discovery JavaScript parses${parse.stderr?`: ${parse.stderr.trim()}`:''}`);
ok(source.includes('window.WarpStarAtlas?.snapshot?.()'),'navigation status reads existing Star Atlas authority');
ok(source.includes('window.WarpTravelJournal?.visited?.()'),'navigation map reuses the travel journal visited-system authority');
ok(source.includes("if(visited.has(id))node.classList.add('visited')"),'persisted visits are layered onto core map nodes without erasing current-session visit state');
ok(source.includes("observer.observe(map,{childList:true})")&&!source.includes('subtree:true'),'map redraw observer is direct-child-only');
ok(source.includes("addEventListener('stellarwarp:discovery-change',schedule)"),'same-tab discovery changes trigger navigation refresh');
ok(source.includes("addEventListener('stellarwarp:location-restored',schedule)"),'restored location triggers a focused map refresh when navigation is already mounted');
ok(source.includes('queueMicrotask'),'map redraw refreshes are microtask-coalesced');
ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|WebSocket|requestAnimationFrame|setInterval/.test(source),'navigation status adds no persistence, network, render-loop or polling work');
ok(sw.includes("const CACHE_NAME=`${CACHE_PREFIX}v16`"),'offline shell generation advances for exploration constellation');
ok(sw.includes("'./navigation-discovery-status.js'"),'offline shell includes navigation discovery status');
ok(discoveryDebrief.includes("import('./navigation-discovery-status.js').catch(()=>{})"),'discovery continuity bootstrap loads navigation discovery status');
ok(pkg.scripts?.check?.includes('node scripts/validate-navigation-discovery.mjs'),'npm run check includes focused navigation discovery validation');

const observers=new Set();
function notify(target){for(const observer of [...observers])if(observer.target===target&&observer.options?.childList)observer.callback([{type:'childList',target}],observer)}
class MiniMutationObserver{
  constructor(callback){this.callback=callback;this.target=null;this.options=null}
  observe(target,options={}){this.target=target;this.options=options;observers.add(this)}
  disconnect(){observers.delete(this)}
}
class MiniClassList{
  constructor(element){this.element=element;this.tokens=new Set()}
  load(value){this.tokens=new Set(String(value||'').split(/\s+/).filter(Boolean));this.sync()}
  sync(){this.element._className=[...this.tokens].join(' ')}
  add(...tokens){for(const token of tokens)if(token)this.tokens.add(token);this.sync()}
  remove(...tokens){for(const token of tokens)this.tokens.delete(token);this.sync()}
  contains(token){return this.tokens.has(token)}
  toggle(token,force){const next=force===undefined?!this.contains(token):!!force;if(next)this.tokens.add(token);else this.tokens.delete(token);this.sync();return next}
}
class MiniElement extends EventTarget{
  constructor(tag='div'){
    super();this.nodeType=1;this.tagName=String(tag).toUpperCase();this.parentNode=null;this.children=[];this.attributes={};this.dataset={};this._text='';this._className='';this.classList=new MiniClassList(this);
  }
  get parentElement(){return this.parentNode}
  get id(){return this.attributes.id||''}
  set id(value){this.attributes.id=String(value)}
  get className(){return this._className}
  set className(value){this.classList.load(value)}
  get textContent(){return this.children.length?this.children.map(child=>child.textContent).join(''):this._text}
  set textContent(value){this.children=[];this._text=String(value??'')}
  setAttribute(name,value=''){
    const key=String(name),text=String(value);this.attributes[key]=text;
    if(key==='id')this.id=text;else if(key==='class')this.className=text;
    else if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=text;
  }
  getAttribute(name){return this.attributes[String(name)]??null}
  append(...nodes){
    let changed=false;
    for(const node of nodes){if(!node)continue;if(node.parentNode){const old=node.parentNode,idx=old.children.indexOf(node);if(idx>=0){old.children.splice(idx,1);notify(old)}}node.parentNode=this;this.children.push(node);changed=true}
    if(changed)notify(this);
  }
  insertAdjacentElement(position,element){
    if(!['beforebegin','afterend'].includes(position)||!this.parentNode)return null;
    const parent=this.parentNode,index=parent.children.indexOf(this);if(index<0)return null;
    if(element.parentNode){const old=element.parentNode,idx=old.children.indexOf(element);if(idx>=0){old.children.splice(idx,1);notify(old)}}
    element.parentNode=parent;parent.children.splice(position==='beforebegin'?index:index+1,0,element);notify(parent);return element;
  }
  replaceChildren(...nodes){for(const child of this.children)child.parentNode=null;this.children=[];this._text='';notify(this);if(nodes.length)this.append(...nodes)}
  remove(){if(!this.parentNode)return;const parent=this.parentNode,index=parent.children.indexOf(this);if(index>=0){parent.children.splice(index,1);this.parentNode=null;notify(parent)}}
  querySelector(selector){return queryAll(this,selector,false)[0]||null}
  querySelectorAll(selector){return queryAll(this,selector,false)}
}
class MiniDocument extends EventTarget{
  constructor(){super();this.head=new MiniElement('head');this.body=new MiniElement('body');this.root=new MiniElement('html');this.root.append(this.head,this.body)}
  createElement(tag){return new MiniElement(tag)}
  createElementNS(_ns,tag){return new MiniElement(tag)}
  querySelector(selector){return queryAll(this.root,selector,true)[0]||null}
  querySelectorAll(selector){return queryAll(this.root,selector,true)}
}
function descendants(node,includeSelf=false){const out=[];if(includeSelf)out.push(node);for(const child of node.children||[]){out.push(child);out.push(...descendants(child,false))}return out}
function simpleMatch(element,selector){
  if(selector.startsWith('#'))return element.id===selector.slice(1);
  if(selector.startsWith('.'))return selector.slice(1).split('.').every(name=>element.classList.contains(name));
  return element.tagName===selector.toUpperCase();
}
function matches(element,selector){
  const parts=String(selector).trim().split(/\s+/).filter(Boolean);if(!parts.length)return false;
  let node=element,index=parts.length-1;if(!simpleMatch(node,parts[index]))return false;
  while(--index>=0){node=node.parentElement;while(node&&!simpleMatch(node,parts[index]))node=node.parentElement;if(!node)return false}
  return true;
}
function queryAll(root,selector,includeSelf){return descendants(root,includeSelf).filter(element=>matches(element,selector))}

const document=new MiniDocument();
const app=document.createElement('main');app.id='app';
const panel=document.createElement('section');panel.id='panel';
const open=document.createElement('button');open.id='openPanel';
const map=document.createElement('svg');map.id='map';
const routeCard=document.createElement('div');routeCard.className='routeCard';
const destination=document.createElement('div');destination.id='destinationName';destination.textContent='天鵝航標';
const routeLegs=document.createElement('div');routeLegs.id='routeLegs';
routeCard.append(destination,routeLegs);panel.append(map,routeCard);app.append(open,panel);document.body.append(app);

const names={SOL:'地球近軌',LUNA:'月環基地',VEGA:'織女星門',CYG:'天鵝航標',ORION:'獵戶前哨',TAU:'金牛塵海',SIRIUS:'天狼中繼站',PROX:'比鄰星港'};
function makeNode(id,selected=false){const group=document.createElementNS('svg','g');group.className='mapNode'+(selected?' selected':'');const core=document.createElementNS('svg','circle');core.className='nodeCore';const label=document.createElementNS('svg','text');label.textContent=names[id];group.append(core,label);return group}
function redraw(selected='CYG'){map.replaceChildren(...Object.keys(names).map(id=>makeNode(id,id===selected)))}
redraw();

let discoveries={CYG:'雙星航標三角場',ORION:'三線發射殼層'};
const persistentVisited=['SOL','LUNA','CYG','ORION'];
const globalEvents=new EventTarget();
Object.defineProperty(globalThis,'window',{value:globalThis,configurable:true});
Object.defineProperty(globalThis,'document',{value:document,configurable:true});
Object.defineProperty(globalThis,'MutationObserver',{value:MiniMutationObserver,configurable:true});
globalThis.addEventListener=(...args)=>globalEvents.addEventListener(...args);
globalThis.removeEventListener=(...args)=>globalEvents.removeEventListener(...args);
globalThis.dispatchEvent=event=>globalEvents.dispatchEvent(event);
globalThis.WarpStarAtlas={snapshot(){return{visited:[...persistentVisited],discoveries:{...discoveries},systems:[]}}};
globalThis.WarpTravelJournal={visited(){return[...persistentVisited]}};

await import(pathToFileURL(modulePath).href+`?test=${Date.now()}`);
await new Promise(resolve=>setImmediate(resolve));
const status=document.querySelector('#navDiscoveryStatus'),progress=document.querySelector('#navDiscoveryProgress'),detail=document.querySelector('#navDiscoveryDetail');
ok(!!status&&!!progress&&!!detail,'production navigation status UI mounts beside the real route-card anchors');
ok(progress?.textContent.includes('2 / 7'),'initial navigation summary reflects existing discovery count');
ok(detail?.textContent.includes('雙星航標三角場'),'selected discovered destination names its recorded finding');
ok(document.querySelectorAll('.mapNode.discovered').length===2,'existing discovered destinations are visibly marked on the map');
ok(document.querySelectorAll('.navDiscoveryMark').length===2,'discovered map nodes receive one compact check marker each');
ok(document.querySelectorAll('.mapNode.visited').length===4,'persisted travel-journal visits are restored onto the navigation map');

destination.textContent='月環基地';globalThis.WarpNavigationDiscovery.render();
ok(detail.textContent==='尚未完成本站探索','selected unfinished destination is explicitly identified before route launch');

discoveries={...discoveries,LUNA:'地月視差層'};
globalThis.dispatchEvent(new Event('stellarwarp:discovery-change'));
await new Promise(resolve=>setImmediate(resolve));
ok(progress.textContent.includes('3 / 7'),'same-tab discovery event immediately advances navigation progress');
ok(detail.textContent.includes('地月視差層'),'same-tab completion updates selected destination status without reload');
ok(document.querySelectorAll('.mapNode.discovered').length===3,'same-tab completion marks the newly discovered map node');

redraw('VEGA');destination.textContent='織女星門';
await new Promise(resolve=>setImmediate(resolve));
ok(document.querySelectorAll('.mapNode.discovered').length===3,'map redraw observer reapplies all discovery markers after core SVG rebuild');
ok(document.querySelectorAll('.mapNode.visited').length===4,'map redraw observer reapplies persisted visited systems after core SVG rebuild');
ok(detail.textContent==='尚未完成本站探索','redrawn selected unfinished destination keeps route-card exploration context');

destination.textContent='地球近軌';globalThis.WarpNavigationDiscovery.render();
ok(detail.textContent==='母港 · 無外站發現','SOL is clearly treated as the home system rather than a missing discovery');
ok(new Set(globalThis.WarpNavigationDiscovery.snapshot().visited).size===4,'navigation diagnostic snapshot exposes the same persistent visited authority');

for(const message of passes)console.log(`✓ ${message}`);
if(failures.length){console.error(`\n${failures.length} navigation discovery validation failure(s):`);for(const message of failures)console.error(`✗ ${message}`);process.exit(1)}
console.log(`\nNavigation discovery: ${passes.length}/${passes.length} checks passed.`);
