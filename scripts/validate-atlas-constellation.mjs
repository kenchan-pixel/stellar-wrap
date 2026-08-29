import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const source=fs.readFileSync(`${root}/atlas-constellation.js`,'utf8');
const tray=fs.readFileSync(`${root}/exploration-focus-tray.js`,'utf8');
const sw=fs.readFileSync(`${root}/sw.js`,'utf8');
let passed=0;
function ok(condition,label){if(!condition)throw new Error(`FAIL: ${label}`);passed++;console.log(`✓ ${label}`)}

const syntax=spawnSync(process.execPath,['--check',`${root}/atlas-constellation.js`],{encoding:'utf8'});
ok(syntax.status===0,'atlas constellation JavaScript syntax');
const ids=[...source.matchAll(/const EXTERNAL_IDS=\[([^\]]+)\]/g)][0]?.[1]?.match(/'([A-Z]+)'/g)?.map(v=>v.slice(1,-1))||[];
ok(JSON.stringify(ids)===JSON.stringify(['LUNA','VEGA','CYG','ORION','TAU','SIRIUS','PROX']),'exact seven external discovery systems');
ok(source.includes('window.WarpStarAtlas?.snapshot?.()'),'uses Star Atlas as discovery authority');
ok(source.includes('window.WarpSim?.state?.()'),'reads core state only for current-system highlight');
ok(source.includes('探索星環 · 非航線比例'),'labels visual as non-route presentation');
ok(source.includes("observer.disconnect()"),'one-shot mutation observer disconnects after mount');
ok(!/setInterval|setTimeout|requestAnimationFrame|localStorage|sessionStorage|fetch\s*\(/.test(source),'adds no polling, render-loop, storage or network work');
ok(tray.includes("import('./atlas-constellation.js').catch(()=>{});"),'loaded through existing exploration presentation bootstrap');
ok(sw.includes("`${CACHE_PREFIX}v15`")&&sw.includes("'./atlas-constellation.js'"),'prepared offline shell includes constellation module');

class ClassList{
  constructor(el){this.el=el;this.set=new Set()}
  syncFrom(value=''){this.set=new Set(String(value).split(/\s+/).filter(Boolean))}
  sync(){this.el._className=[...this.set].join(' ')}
  add(...v){v.forEach(x=>this.set.add(x));this.sync()}
  remove(...v){v.forEach(x=>this.set.delete(x));this.sync()}
  contains(v){return this.set.has(v)}
  toggle(v,force){const on=force===undefined?!this.set.has(v):!!force;on?this.set.add(v):this.set.delete(v);this.sync();return on}
}
class StyleDecl{constructor(){this.props={}}setProperty(k,v){this.props[k]=String(v)}getPropertyValue(k){return this.props[k]||''}}
class El{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.attrs={};this.dataset={};this.style=new StyleDecl();this.classList=new ClassList(this);this._id='';this._className='';this._text=''}
  set id(v){this._id=String(v);this.attrs.id=this._id}get id(){return this._id}
  set className(v){this._className=String(v);this.attrs.class=this._className;this.classList.syncFrom(v)}get className(){return this._className}
  set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text||this.children.map(c=>c.textContent).join('')}
  get firstChild(){return this.children[0]||null}
  append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node)}}
  appendChild(node){this.append(node);return node}
  insertBefore(node,before){node.parentNode=this;const i=this.children.indexOf(before);if(i<0)this.children.push(node);else this.children.splice(i,0,node);return node}
  setAttribute(name,value){const v=String(value);this.attrs[name]=v;if(name==='id')this._id=v;if(name==='class'){this._className=v;this.classList.syncFrom(v)}if(name.startsWith('data-')){const key=name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());this.dataset[key]=v}}
  getAttribute(name){return this.attrs[name]??null}
  matches(selector){
    if(selector.startsWith('#'))return this.id===selector.slice(1);
    if(selector.startsWith('.'))return selector.slice(1).split('.').every(v=>this.classList.contains(v));
    const data=selector.match(/^\[data-([a-z-]+)="([^"]+)"\]$/);if(data){const key=data[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return this.dataset[key]===data[2]}
    return false;
  }
  querySelector(selector){return query(this,selector,false)}
  querySelectorAll(selector){return query(this,selector,true)}
}
function descendants(root){const out=[];for(const c of root.children){out.push(c,...descendants(c))}return out}
function query(root,selector,all){
  const parts=selector.trim().split(/\s+/);let pool=[root,...descendants(root)];
  if(parts.length===1){const hits=pool.filter(e=>e!==root&&e.matches(parts[0]));return all?hits:(hits[0]||null)}
  const [first,...rest]=parts;const parents=pool.filter(e=>typeof e.matches==='function'&&e.matches(first));const hits=[];for(const p of parents){for(const e of descendants(p))if(e.matches(rest.join(' ')))hits.push(e)}return all?hits:(hits[0]||null)
}
class Doc{
  constructor(){this.head=new El('head');this.body=new El('body')}
  createElement(tag){return new El(tag)}createElementNS(_ns,tag){return new El(tag)}
  querySelector(sel){const root={children:[this.head,this.body]};for(const e of descendants(root)){if(sel.includes(' ')){const found=query(e,sel,false);if(found)return found}else if(typeof e.matches==='function'&&e.matches(sel))return e}return null}
  querySelectorAll(sel){const root={children:[this.head,this.body]};const out=[];for(const e of descendants(root)){if(typeof e.matches==='function'&&e.matches(sel))out.push(e)}return out}
}
const document=new Doc();
const atlas=new El('section');atlas.id='starAtlas';const body=new El('div');body.className='atlasBody';atlas.append(body);document.body.append(atlas);
let discoveries={};
const listeners=new Map();
const context={
  document,console,
  MutationObserver:class{observe(){}disconnect(){}},
  CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},
  dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event)},
  WarpStarAtlas:{snapshot(){return{discoveries}}},
  WarpSim:{state(){return{current:'CYG'}}}
};
context.window=context;
vm.runInNewContext(source,context,{filename:'atlas-constellation.js'});
const visual=document.querySelector('#atlasConstellation');
ok(!!visual,'runtime mounts inside existing Star Atlas body');
ok(visual===body.firstChild,'constellation appears before card grid/content');
ok(visual.querySelectorAll('.atlasConstellationNode').length===7,'runtime renders seven bounded nodes');
ok(visual.querySelector('[data-system="CYG"]').classList.contains('current'),'runtime highlights current destination');
ok(visual.querySelectorAll('.atlasConstellationNode.discovered').length===0,'fresh state shows zero completed nodes');

discoveries={LUNA:'x',CYG:'x',PROX:'x'};context.WarpAtlasConstellation.render();
ok(visual.querySelectorAll('.atlasConstellationNode.discovered').length===3,'same-tab render updates discovery nodes');
ok(visual.getAttribute('aria-label').includes('3 / 7'),'accessible summary updates to 3 / 7');
ok(visual.style.getPropertyValue('--atlas-progress')==='154.3deg','center progress ring reflects 3 / 7');
ok(!visual.querySelector('[data-system="VEGA"]').getAttribute('aria-label').includes('雙環共振窗口'),'pending node does not leak undiscovered record name');

discoveries=Object.fromEntries(ids.map(id=>[id,'done']));context.WarpAtlasConstellation.render();
ok(visual.classList.contains('complete'),'all seven discoveries activate completion visual state');
ok(document.querySelector('#atlasConstellationStyle').textContent.includes('@media(max-width:360px)'),'mobile narrow-screen treatment exists');

const browser=spawnSync(process.execPath,['scripts/validate-atlas-constellation-browser.mjs'],{encoding:'utf8',timeout:120000,env:{...process.env,STELLAR_BROWSER_REQUIRED:process.env.CI?'1':'0'}});
if(browser.stdout)process.stdout.write(browser.stdout);
if(browser.stderr)process.stderr.write(browser.stderr);
ok(browser.status===0,'real production-page constellation layout passes at both phone viewports');

console.log(`Atlas Constellation validation: ${passed}/${passed} passed plus two real-browser viewports`);
