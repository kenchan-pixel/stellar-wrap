import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve} from 'node:path';

const width=Number(process.env.STELLAR_EXPLORE_WIDTH||390);
const height=Number(process.env.STELLAR_EXPLORE_HEIGHT||844);
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const observers=new Set();

function notifyChildList(target){
  for(const observer of [...observers])if(observer.target===target&&observer.options?.childList)observer.callback([{type:'childList',target}],observer);
}
class MiniMutationObserver{
  constructor(callback){this.callback=callback;this.target=null;this.options=null}
  observe(target,options={}){this.target=target;this.options=options;observers.add(this)}
  disconnect(){observers.delete(this);this.target=null}
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
    super();this.nodeType=1;this.tagName=String(tag).toUpperCase();this.parentNode=null;this.children=[];this.attributes={};this.dataset={};this._text='';this._className='';this.classList=new MiniClassList(this);this.scrolled=false;this.disabled=false;this.type='';
  }
  get parentElement(){return this.parentNode?.nodeType===1?this.parentNode:null}
  get isConnected(){let node=this;while(node){if(node===document?.documentElement)return true;node=node.parentNode}return false}
  get id(){return this.attributes.id||''}
  set id(value){this.attributes.id=String(value)}
  get className(){return this._className}
  set className(value){this.classList.load(value)}
  get textContent(){return this.children.length?this.children.map(child=>child.textContent).join(''):this._text}
  set textContent(value){for(const child of this.children)child.parentNode=null;this.children=[];this._text=String(value??'')}
  setAttribute(name,value=''){
    const key=String(name),text=String(value);this.attributes[key]=text;
    if(key==='id')this.id=text;else if(key==='class')this.className=text;else if(key==='disabled')this.disabled=true;
    else if(key.startsWith('data-')){const dataKey=key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());this.dataset[dataKey]=text}
  }
  removeAttribute(name){const key=String(name);delete this.attributes[key];if(key==='disabled')this.disabled=false}
  getAttribute(name){return this.attributes[String(name)]??null}
  append(...nodes){
    let changed=false;
    for(let node of nodes){if(node===null||node===undefined)continue;if(typeof node==='string'){const text=new MiniElement('span');text.textContent=node;node=text}
      if(node.parentNode){const old=node.parentNode,index=old.children.indexOf(node);if(index>=0){old.children.splice(index,1);notifyChildList(old)}}
      node.parentNode=this;this.children.push(node);changed=true;
    }
    if(changed)notifyChildList(this);
  }
  appendChild(node){this.append(node);return node}
  replaceChildren(...nodes){for(const child of this.children)child.parentNode=null;this.children=[];this._text='';if(nodes.length)this.append(...nodes);else notifyChildList(this)}
  insertAdjacentElement(position,element){
    if(!['beforebegin','afterend'].includes(position)||!this.parentNode)return null;
    const parent=this.parentNode;
    if(element.parentNode){const old=element.parentNode,index=old.children.indexOf(element);if(index>=0){old.children.splice(index,1);notifyChildList(old)}}
    const index=parent.children.indexOf(this);element.parentNode=parent;parent.children.splice(position==='beforebegin'?index:index+1,0,element);notifyChildList(parent);return element;
  }
  remove(){if(!this.parentNode)return;const parent=this.parentNode,index=parent.children.indexOf(this);if(index>=0)parent.children.splice(index,1);this.parentNode=null;notifyChildList(parent)}
  querySelector(selector){return querySelectorAllFrom(this,selector,false)[0]||null}
  querySelectorAll(selector){return querySelectorAllFrom(this,selector,false)}
  click(){this.dispatchEvent(new Event('click',{cancelable:true}))}
  scrollIntoView(){this.scrolled=true}
}
class MiniDocument extends EventTarget{
  constructor(){super();this.documentElement=new MiniElement('html');this.head=new MiniElement('head');this.body=new MiniElement('body');this.documentElement.append(this.head,this.body)}
  createElement(tag){return new MiniElement(tag)}
  querySelector(selector){return querySelectorAllFrom(this.documentElement,selector,true)[0]||null}
  querySelectorAll(selector){return querySelectorAllFrom(this.documentElement,selector,true)}
}
function descendants(node,includeSelf=false){const out=[];if(includeSelf&&node?.nodeType===1)out.push(node);for(const child of node?.children||[]){if(child?.nodeType===1){out.push(child);out.push(...descendants(child,false))}}return out}
function matchesSimple(element,selector){
  if(selector.startsWith('#'))return element.id===selector.slice(1);
  if(selector.startsWith('.'))return selector.slice(1).split('.').every(name=>element.classList.contains(name));
  if(selector.startsWith('[')&&selector.endsWith(']')){
    const body=selector.slice(1,-1),split=body.indexOf('='),rawName=split<0?body:body.slice(0,split),rawValue=split<0?null:body.slice(split+1),name=rawName.trim();let actual;
    if(name.startsWith('data-')){const key=name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());actual=element.dataset[key]}else actual=element.getAttribute(name);
    if(rawValue===null)return actual!==undefined&&actual!==null;return String(actual)===rawValue.trim().replace(/^['"]|['"]$/g,'');
  }
  return element.tagName===selector.toUpperCase();
}
function matchesSelector(element,selector){const parts=String(selector).trim().split(/\s+/).filter(Boolean);let node=element,index=parts.length-1;if(index<0||!matchesSimple(node,parts[index]))return false;for(index--;index>=0;index--){node=node.parentElement;while(node&&!matchesSimple(node,parts[index]))node=node.parentElement;if(!node)return false}return true}
function querySelectorAllFrom(rootNode,selector,includeSelf){return descendants(rootNode,includeSelf).filter(element=>matchesSelector(element,selector))}
function element(tag,id,className){const node=document.createElement(tag);if(id)node.id=id;if(className)node.className=className;return node}
function nextTurn(){return new Promise(resolve=>setImmediate(resolve))}

const document=new MiniDocument();
Object.defineProperty(globalThis,'window',{value:globalThis,configurable:true});
Object.defineProperty(globalThis,'document',{value:document,configurable:true});
Object.defineProperty(globalThis,'innerWidth',{value:width,writable:true,configurable:true});
Object.defineProperty(globalThis,'innerHeight',{value:height,writable:true,configurable:true});
Object.defineProperty(globalThis,'MutationObserver',{value:MiniMutationObserver,configurable:true});
const globalEvents=new EventTarget();
globalThis.addEventListener=(...args)=>globalEvents.addEventListener(...args);
globalThis.removeEventListener=(...args)=>globalEvents.removeEventListener(...args);
globalThis.dispatchEvent=event=>globalEvents.dispatchEvent(event);
const mediaEvents=new EventTarget();
const media={matches:true,addEventListener:(...args)=>mediaEvents.addEventListener(...args),setMatches(value){this.matches=!!value;mediaEvents.dispatchEvent(new Event('change'))}};
globalThis.matchMedia=()=>media;

const app=element('main','app','exploring');
const space=element('canvas','space');
const openPanel=element('button','openPanel');
const card=element('section','exploreCard','show');
const top=element('div',null,'exploreTop');const collapse=element('button','exploreCollapse','exploreCollapse');top.append(collapse);
const body=element('div',null,'exploreBody');
const meta=element('div','exploreMeta');const desc=element('div','exploreDesc');const arrival=element('section','arrivalDebrief','arrivalDebrief show');
const arrivalExplore=element('button','arrivalDebriefExplore');const arrivalNext=element('button','arrivalDebriefNext');arrival.append(arrivalExplore,arrivalNext);
const landmark=element('section','landmarkGuide');const luna=element('section','lunaSurvey');const discovery=element('section','discoveryDebrief');
const actions=element('div',null,'exploreActions');const continueBtn=element('button','exploreContinue');const photoTrigger=element('button','photoModeTrigger');actions.append(continueBtn,photoTrigger);
body.append(meta,desc,arrival,landmark,luna,discovery,actions);card.append(top,body);app.append(space,card,openPanel);document.body.append(app);
let mapOpens=0,photoEnters=0;openPanel.addEventListener('click',()=>mapOpens++);
let discoveries={};
globalThis.WarpSim={state(){return{current:'LUNA',route:['SOL','LUNA'],phase:'observe',exploring:true,flying:false,contextLost:false}}};
globalThis.WarpStarAtlas={snapshot(){return{discoveries:{...discoveries}}}};
globalThis.WarpPhotoMode={enter(){photoEnters++;app.classList.add('photoMode');return true}};

await import(`${pathToFileURL(resolve(root,'explore-hub.js')).href}?runtime=${process.pid}-${width}`);
await nextTurn();
const hub=globalThis.WarpExploreHub;assert(hub,'production WarpExploreHub API is exposed');
const rail=document.querySelector('#exploreRail');assert(rail,'rail mounts in production module');
const railButtons=rail.querySelectorAll('[data-hub-action]');assert.equal(railButtons.length,5,'five rail actions mount');
const action=name=>railButtons.find(button=>button.dataset.hubAction===name);
assert(app.classList.contains('exploreHubMobile'),'safe final mobile exploration activates hub mode');
assert.equal(card.classList.contains('hubOpen'),false,'final arrival defaults to a closed drawer');
assert.equal(card.getAttribute('aria-hidden'),'true','closed drawer is removed from the accessibility tree');
assert.notEqual(card.getAttribute('inert'),null,'closed drawer is inert to focus/navigation');
assert.equal(rail.getAttribute('aria-hidden'),null,'visible mobile rail is exposed to assistive navigation');
assert.equal(rail.getAttribute('inert'),null,'visible mobile rail is interactive for assistive navigation');
assert.equal(document.querySelector('#exploreHubStatus'),null,'closed hub does not leak a status card into the base exploration UI');

for(const name of ['overview','explore','discovery'])assert(action(name),`${name} pane action exists`);
action('explore').click();assert.equal(card.classList.contains('hubOpen'),true,'explore action opens drawer');assert.equal(card.getAttribute('aria-hidden'),null,'open drawer returns to accessibility tree');assert.equal(card.getAttribute('inert'),null,'open drawer returns to focus navigation');assert.equal(hub.activePane(),'explore','explore pane becomes active');assert.equal(luna.classList.contains('hubPaneHidden'),false,'real destination task is visible in explore pane');assert.equal(meta.classList.contains('hubPaneHidden'),true,'overview metadata is hidden in explore pane');
action('explore').click();assert.equal(card.classList.contains('hubOpen'),false,'same pane action closes drawer');assert.equal(card.getAttribute('aria-hidden'),'true','same-button close hides drawer from accessibility tree');assert.notEqual(card.getAttribute('inert'),null,'same-button close makes drawer inert');
action('overview').click();space.click();assert.equal(card.classList.contains('hubOpen'),false,'tapping 3D canvas closes drawer');assert.equal(card.getAttribute('aria-hidden'),'true','canvas close keeps hidden drawer out of accessibility tree');
action('overview').click();const escape=new Event('keydown');Object.defineProperty(escape,'key',{value:'Escape'});dispatchEvent(escape);assert.equal(card.classList.contains('hubOpen'),false,'Escape closes drawer');assert.equal(card.getAttribute('aria-hidden'),'true','Escape close keeps hidden drawer out of accessibility tree');
action('overview').click();collapse.click();assert.equal(card.classList.contains('hubOpen'),false,'existing collapse control closes drawer through hub bridge');assert.notEqual(card.getAttribute('inert'),null,'collapse close makes hidden drawer inert');

action('overview').click();let visibleBeforeArrivalScroll=false;arrivalExplore.addEventListener('click',()=>{visibleBeforeArrivalScroll=!luna.classList.contains('hubPaneHidden');luna.scrollIntoView()});arrivalExplore.click();assert.equal(hub.activePane(),'explore','arrival primary CTA switches to explore pane');assert.equal(card.getAttribute('aria-hidden'),null,'arrival handoff exposes the opened drawer to assistive navigation');assert.equal(visibleBeforeArrivalScroll,true,'arrival CTA reveals destination task before handoff scroll');assert.equal(luna.scrolled,true,'arrival handoff can scroll the now-visible real task');

action('overview').click();const lateTask=element('section','orionSpectrograph');body.append(lateTask);assert.equal(lateTask.classList.contains('hubPaneHidden'),true,'late destination module is filtered while overview pane is active');action('explore').click();assert.equal(lateTask.classList.contains('hubPaneHidden'),false,'late destination module becomes visible when explore pane is selected');

action('map').click();assert.equal(mapOpens,1,'map rail action delegates to existing map trigger');assert.equal(card.classList.contains('hubOpen'),false,'map handoff closes drawer');assert.equal(card.getAttribute('aria-hidden'),'true','map handoff leaves hidden drawer inaccessible');
action('photo').click();assert.equal(photoEnters,1,'photo rail action delegates to existing Photo Mode authority');assert.equal(card.classList.contains('hubOpen'),false,'photo handoff leaves drawer closed');media.setMatches(true);assert.equal(rail.getAttribute('aria-hidden'),'true','Photo Mode hides rail from accessibility tree as well as visually');assert.notEqual(rail.getAttribute('inert'),null,'Photo Mode makes hidden rail inert');app.classList.remove('photoMode');media.setMatches(true);assert.equal(rail.getAttribute('aria-hidden'),null,'leaving Photo Mode restores rail accessibility');assert.equal(rail.getAttribute('inert'),null,'leaving Photo Mode restores rail interaction');

discoveries={LUNA:'月環潮汐鎖定'};action('discovery').click();const status=document.querySelector('#exploreHubStatus');assert(status,'discovery pane mounts hub-scoped status');assert(status.textContent.includes('月環潮汐鎖定'),'discovery pane reads existing Star Atlas authority');
card.classList.add('transit');dispatchEvent(new Event('stellarwarp:journey-complete'));await Promise.resolve();await Promise.resolve();assert.equal(app.classList.contains('exploreHubMobile'),false,'transit fly-by exits hub mode');assert.equal(rail.getAttribute('aria-hidden'),'true','transit fly-by hides rail');assert.notEqual(rail.getAttribute('inert'),null,'transit rail is inert');assert.equal(card.getAttribute('aria-hidden'),null,'visible transit card remains accessible');assert.equal(card.getAttribute('inert'),null,'visible transit card remains interactive');assert.equal(document.querySelector('#exploreHubStatus'),null,'hub status is removed before transit base card resumes');assert.equal(luna.classList.contains('hubPaneHidden'),false,'transit cleanup restores base exploration children');

card.classList.remove('transit');dispatchEvent(new Event('stellarwarp:journey-complete'));await Promise.resolve();await Promise.resolve();action('discovery').click();assert(document.querySelector('#exploreHubStatus'),'status remounts only after mobile final hub is explicitly opened');media.setMatches(false);assert.equal(app.classList.contains('exploreHubMobile'),false,'desktop breakpoint exits mobile hub mode');assert.equal(rail.getAttribute('aria-hidden'),'true','desktop breakpoint hides mobile rail');assert.notEqual(rail.getAttribute('inert'),null,'desktop-hidden rail is inert');assert.equal(card.getAttribute('aria-hidden'),null,'desktop exploration card is not hidden from accessibility tree');assert.equal(card.getAttribute('inert'),null,'desktop exploration card remains interactive');assert.equal(document.querySelector('#exploreHubStatus'),null,'mobile status cannot leak into desktop exploration card');assert.equal(lateTask.classList.contains('hubPaneHidden'),false,'desktop cleanup restores dynamically inserted destination content');
media.setMatches(true);assert(app.classList.contains('exploreHubMobile'),'returning to mobile final exploration reactivates hub');assert.equal(card.classList.contains('hubOpen'),false,'return to mobile keeps scenery-first default closed state');assert.equal(card.getAttribute('aria-hidden'),'true','returning mobile closed drawer is hidden from accessibility tree');assert.notEqual(card.getAttribute('inert'),null,'returning mobile closed drawer is inert');

console.log(`Explore Hub runtime ${width}x${height}: passed`);