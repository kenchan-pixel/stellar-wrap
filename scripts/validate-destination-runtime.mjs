import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const filePath=fileURLToPath(import.meta.url);
const root=resolve(dirname(filePath),'..');
const mutationObservers=new Set();

function notifyChildList(target){
  for(const observer of [...mutationObservers]){
    if(observer.target===target&&observer.options?.childList)observer.callback([{type:'childList',target}],observer);
  }
}
class MiniMutationObserver {
  constructor(callback){this.callback=callback;this.target=null;this.options=null}
  observe(target,options={}){this.target=target;this.options=options;mutationObservers.add(this)}
  disconnect(){mutationObservers.delete(this);this.target=null;this.options=null}
}
class MiniText {
  constructor(value=''){this.nodeType=3;this.parentNode=null;this.value=String(value)}
  get textContent(){return this.value}
  set textContent(value){this.value=String(value)}
}
class MiniClassList {
  constructor(element){this.element=element;this.tokens=new Set()}
  load(value){this.tokens=new Set(String(value||'').split(/\s+/).filter(Boolean));this.sync()}
  sync(){this.element._className=[...this.tokens].join(' ')}
  add(...tokens){for(const token of tokens)if(token)this.tokens.add(token);this.sync()}
  remove(...tokens){for(const token of tokens)this.tokens.delete(token);this.sync()}
  contains(token){return this.tokens.has(token)}
  toggle(token,force){const next=force===undefined?!this.contains(token):!!force;if(next)this.tokens.add(token);else this.tokens.delete(token);this.sync();return next}
}
class MiniElement extends EventTarget {
  constructor(tagName='div'){
    super();
    this.nodeType=1;
    this.tagName=String(tagName).toUpperCase();
    this.parentNode=null;
    this.children=[];
    this.attributes={};
    this.dataset={};
    this.style={};
    this.disabled=false;
    this.value='';
    this.type='';
    this.scrolled=false;
    this._text='';
    this._className='';
    this.classList=new MiniClassList(this);
  }
  get parentElement(){return this.parentNode?.nodeType===1?this.parentNode:null}
  get previousElementSibling(){
    const parent=this.parentElement;if(!parent)return null;
    const index=parent.children.indexOf(this);
    for(let i=index-1;i>=0;i--)if(parent.children[i]?.nodeType===1)return parent.children[i];
    return null;
  }
  get id(){return this.attributes.id||''}
  set id(value){this.attributes.id=String(value)}
  get className(){return this._className}
  set className(value){this.classList.load(value)}
  get textContent(){return this.children.length?this.children.map(child=>child.textContent).join(''):this._text}
  set textContent(value){this.children=[];this._text=String(value??'')}
  get offsetWidth(){return 390}
  setAttribute(name,value=''){
    const key=String(name),text=String(value);
    this.attributes[key]=text;
    if(key==='id')this.id=text;
    else if(key==='class')this.className=text;
    else if(key==='disabled')this.disabled=true;
    else if(key==='value')this.value=text;
    else if(key==='type')this.type=text;
    else if(key.startsWith('data-')){
      const dataKey=key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
      this.dataset[dataKey]=text;
    }
  }
  getAttribute(name){return this.attributes[String(name)]??null}
  append(...nodes){
    if(this._text){const prior=new MiniText(this._text);prior.parentNode=this;this.children.push(prior);this._text=''}
    let changed=false;
    for(let node of nodes){
      if(node===null||node===undefined)continue;
      if(typeof node==='string')node=new MiniText(node);
      if(node.parentNode&&node.parentNode!==this){const prior=node.parentNode.children?.indexOf(node)??-1;if(prior>=0){node.parentNode.children.splice(prior,1);notifyChildList(node.parentNode)}}
      node.parentNode=this;
      this.children.push(node);changed=true;
    }
    if(changed)notifyChildList(this);
  }
  appendChild(node){this.append(node);return node}
  replaceChildren(...nodes){
    if(this.children.length)for(const child of this.children)child.parentNode=null;
    const changed=this.children.length>0||this._text!==''||nodes.length>0;
    this.children=[];this._text='';
    if(nodes.length)this.append(...nodes);else if(changed)notifyChildList(this);
  }
  insertAdjacentElement(position,element){
    if(!['afterend','beforebegin'].includes(position)||!this.parentNode)return null;
    const targetParent=this.parentNode;
    if(element.parentNode){const oldParent=element.parentNode,oldIndex=oldParent.children.indexOf(element);if(oldIndex>=0){oldParent.children.splice(oldIndex,1);if(oldParent!==targetParent)notifyChildList(oldParent)}}
    const siblings=targetParent.children,index=siblings.indexOf(this);
    if(index<0)return null;
    element.parentNode=targetParent;siblings.splice(position==='beforebegin'?index:index+1,0,element);notifyChildList(targetParent);return element;
  }
  scrollIntoView(){this.scrolled=true}
  querySelector(selector){return querySelectorAllFrom(this,selector,false)[0]||null}
  querySelectorAll(selector){return querySelectorAllFrom(this,selector,false)}
  closest(selector){let node=this;while(node){if(node.nodeType===1&&matchesSelector(node,selector))return node;node=node.parentNode}return null}
  set innerHTML(html){this.replaceChildren();parseHtml(String(html),this)}
  get innerHTML(){return''}
}
class MiniDocument extends EventTarget {
  constructor(width=390,height=844){
    super();
    this.documentElement=new MiniElement('html');
    this.documentElement.clientWidth=width;this.documentElement.clientHeight=height;
    this.head=new MiniElement('head');this.body=new MiniElement('body');
    this.documentElement.append(this.head,this.body);
  }
  createElement(tag){return new MiniElement(tag)}
  querySelector(selector){return querySelectorAllFrom(this.documentElement,selector,true)[0]||null}
  querySelectorAll(selector){return querySelectorAllFrom(this.documentElement,selector,true)}
}
function descendants(node,includeSelf=false){
  const output=[];
  if(includeSelf&&node?.nodeType===1)output.push(node);
  for(const child of node?.children||[]){if(child?.nodeType===1){output.push(child);output.push(...descendants(child,false))}}
  return output;
}
function matchesSimple(element,selector){
  if(!selector)return false;
  if(selector.startsWith('#'))return element.id===selector.slice(1);
  if(selector.startsWith('.'))return selector.slice(1).split('.').every(name=>element.classList.contains(name));
  if(selector.startsWith('[')&&selector.endsWith(']')){
    const body=selector.slice(1,-1),[rawName,rawValue]=body.split('='),name=rawName.trim();
    let actual;
    if(name.startsWith('data-')){const key=name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());actual=element.dataset[key]}
    else actual=element.getAttribute(name);
    if(rawValue===undefined)return actual!==undefined&&actual!==null;
    return String(actual)===rawValue.trim().replace(/^['"]|['"]$/g,'');
  }
  return element.tagName===selector.toUpperCase();
}
function matchesSelector(element,selector){
  const parts=String(selector).trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return false;
  let node=element,index=parts.length-1;
  if(!matchesSimple(node,parts[index]))return false;
  for(index--;index>=0;index--){node=node.parentElement;while(node&&!matchesSimple(node,parts[index]))node=node.parentElement;if(!node)return false}
  return true;
}
function querySelectorAllFrom(rootNode,selector,includeSelf){return descendants(rootNode,includeSelf).filter(element=>matchesSelector(element,selector))}
function parseHtml(html,parent){
  const voidTags=new Set(['BR','HR','IMG','INPUT','META','LINK']),stack=[parent],tokens=html.match(/<[^>]+>|[^<]+/g)||[];
  for(const token of tokens){
    if(token.startsWith('<!--'))continue;
    if(token.startsWith('</')){if(stack.length>1)stack.pop();continue}
    if(token.startsWith('<')){
      const match=token.match(/^<\s*([A-Za-z0-9-]+)/);if(!match)continue;
      const element=new MiniElement(match[1]),attrSource=token.slice(match[0].length,token.length-(token.endsWith('/>')?2:1));
      const attrRegex=/([^\s=/>]+)(?:\s*=\s*"([^"]*)")?/g;let attr;
      while((attr=attrRegex.exec(attrSource)))element.setAttribute(attr[1],attr[2]??'');
      stack.at(-1).append(element);
      if(!token.endsWith('/>')&&!voidTags.has(element.tagName))stack.push(element);
    }else if(token.trim())stack.at(-1).append(new MiniText(token));
  }
}
class MiniStorage {
  constructor(seed={}){this.data=new Map(Object.entries(seed))}
  get length(){return this.data.size}
  key(index){return[...this.data.keys()][index]??null}
  getItem(key){return this.data.has(String(key))?this.data.get(String(key)):null}
  setItem(key,value){this.data.set(String(key),String(value))}
  removeItem(key){this.data.delete(String(key))}
  clear(){this.data.clear()}
  snapshot(){return Object.fromEntries(this.data)}
}
function installPage(target,seed){
  mutationObservers.clear();
  const document=new MiniDocument(390,844);
  const app=document.createElement('main');app.id='app';
  const exploreCard=document.createElement('section');exploreCard.id='exploreCard';
  const body=document.createElement('div');body.className='exploreBody';
  const desc=document.createElement('div');desc.id='exploreDesc';
  const landmark=document.createElement('section');landmark.id='landmarkGuide';
  const actions=document.createElement('div');actions.className='exploreActions';
  body.append(desc,landmark,actions);exploreCard.append(body);
  const journal=document.createElement('section');journal.id='travelJournal';
  app.append(exploreCard,journal);document.body.append(app);
  const events=new EventTarget(),intervals=[],storage=new MiniStorage(seed),state={current:target,exploring:true,flying:false,contextLost:false};
  Object.defineProperty(globalThis,'window',{value:globalThis,configurable:true});
  Object.defineProperty(globalThis,'document',{value:document,configurable:true});
  Object.defineProperty(globalThis,'innerWidth',{value:390,writable:true,configurable:true});
  Object.defineProperty(globalThis,'innerHeight',{value:844,writable:true,configurable:true});
  Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
  Object.defineProperty(globalThis,'navigator',{value:{vibrate(){}},configurable:true});
  Object.defineProperty(globalThis,'MutationObserver',{value:MiniMutationObserver,configurable:true});
  globalThis.addEventListener=(...args)=>events.addEventListener(...args);
  globalThis.removeEventListener=(...args)=>events.removeEventListener(...args);
  globalThis.dispatchEvent=event=>events.dispatchEvent(event);
  globalThis.setInterval=(callback,ms)=>{intervals.push({callback,ms});return intervals.length};
  globalThis.clearInterval=()=>{};
  globalThis.WarpTravelJournal={entries(){return[]},visited(){return['SOL',target]}};
  globalThis.WarpSim={state(){return{...state}},select(){return true}};
  return{document,storage,state,tick(){for(const item of intervals)item.callback()}};
}
async function waitFor(predicate,label){
  for(let i=0;i<50;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve))}
  throw new Error(`Timed out waiting for ${label}`);
}
function atlasHas(document,label){return document.querySelectorAll('.atlasDiscovery').some(element=>element.textContent.includes(label))}
function dispatchInput(element,value){element.value=String(value);element.dispatchEvent(new Event('input'))}
function dispatchClick(element){element.dispatchEvent(new Event('click'))}

const SPECS={
  CYG:{api:'WarpCygBeacon',section:'#cygBeaconScan',range:'#cygRange',action:'#cygLock',progress:'#cygProgress',discoveryEl:'#cygDiscovery',field:'locked',method:'lock',outside:0,boundary:34,targets:[42,166,292],discovery:'雙星航標三角場'},
  ORION:{api:'WarpOrionSpectrum',section:'#orionSpectrograph',range:'#orionRange',action:'#orionCapture',progress:'#orionProgress',discoveryEl:'#orionDiscovery',field:'captured',method:'capture',outside:470,boundary:482,targets:[486,501,656],discovery:'三線發射殼層'}
};
const HANDOFF_SPECS={
  LUNA:{module:'exploration-survey.js',section:'#lunaSurvey'},
  VEGA:{module:'vega-survey.js',section:'#vegaSurvey'},
  CYG:{module:'cyg-beacon-scan.js',section:'#cygBeaconScan'},
  ORION:{module:'orion-spectrograph.js',section:'#orionSpectrograph'},
  TAU:{module:'tau-ring-profiler.js',section:'#tauRingProfiler'},
  SIRIUS:{module:'sirius-relay-calibration.js',section:'#siriusRelayCalibration'},
  PROX:{module:'prox-starport-alignment.js',section:'#proxAlignment'}
};
async function loadProduction(spec){
  await import(pathToFileURL(resolve(root,'star-atlas.js')).href);
  await waitFor(()=>globalThis[spec.api]&&globalThis.WarpStarAtlas,`${spec.api} and WarpStarAtlas`);
  await import(pathToFileURL(resolve(root,'arrival-debrief.js')).href);
  await waitFor(()=>globalThis.WarpArrivalDebrief,'WarpArrivalDebrief');
}
function arrivalEntry(target){return{route:['SOL',target],seconds:18,distance:6.2}}
function runArrivalHandoff(page,target,spec,section,phase){
  if(target!=='CYG')return;
  assert.equal(globalThis.WarpArrivalDebrief.show(arrivalEntry(target)),true,'arrival debrief opens from a safe completed journey');
  const debrief=page.document.querySelector('#arrivalDebrief'),objective=page.document.querySelector('#arrivalDebriefObjective'),explore=page.document.querySelector('#arrivalDebriefExplore'),landmark=page.document.querySelector('#landmarkGuide');
  assert(debrief&&objective&&explore&&landmark,'production arrival handoff controls exist');
  const siblings=debrief.parentElement.children;
  assert(siblings.indexOf(debrief)<siblings.indexOf(landmark),'arrival summary is placed before landmark and destination task content');
  if(phase==='fresh'){
    assert(objective.textContent.includes('尚未完成'),'fresh arrival identifies unfinished destination exploration');
    assert.equal(explore.textContent,'開始探索','fresh arrival offers a direct exploration action');
    dispatchClick(explore);
    assert.equal(globalThis.WarpArrivalDebrief.visible(),false,'exploration action closes the arrival summary');
    assert.equal(section.scrolled,true,'arrival handoff scrolls the real destination interaction into view');
  }else{
    assert(objective.textContent.includes(spec.discovery),'reloaded completed arrival names the persisted discovery');
    assert.equal(explore.textContent,'查看發現','completed arrival offers discovery review instead of a generic continue action');
  }
}
async function runPage(target,phase){
  const spec=SPECS[target];assert(spec,`unknown target ${target}`);
  const seed=process.env.STELLAR_RUNTIME_STORAGE?JSON.parse(Buffer.from(process.env.STELLAR_RUNTIME_STORAGE,'base64').toString('utf8')):{};
  const page=installPage(target,seed);await loadProduction(spec);page.tick();
  assert.equal(innerWidth,390,'phone acceptance viewport width is 390px');
  assert.equal(innerHeight,844,'phone acceptance viewport height is 844px');
  const section=page.document.querySelector(spec.section),range=page.document.querySelector(spec.range),action=page.document.querySelector(spec.action);
  assert(section&&range&&action,'production interaction controls exist');
  assert(section.classList.contains('show'),'interaction is visible during safe final exploration');
  const api=globalThis[spec.api];
  if(phase==='fresh'){
    runArrivalHandoff(page,target,spec,section,'fresh');
    dispatchInput(range,spec.outside);assert.equal(action.disabled,true,'action stays disabled away from a target window');
    dispatchInput(range,spec.boundary);assert.equal(action.disabled,false,'action enables at the approved capture/lock boundary');
    dispatchInput(range,spec.targets[0]);dispatchClick(action);assert.equal(api.progress()[spec.field].length,1,'first source is recorded once');
    dispatchClick(action);assert.equal(api.progress()[spec.field].length,1,'duplicate action cannot record the same source twice');
    dispatchInput(range,spec.targets[1]);
    page.state.flying=true;page.tick();assert.equal(section.classList.contains('show'),false,'control hides while flying');
    assert.equal(api[spec.method](),false,'hidden diagnostic action is rejected while flying');
    assert.equal(api.progress()[spec.field].length,1,'flying state cannot mutate discovery progress');
    page.state.flying=false;page.state.contextLost=true;page.tick();assert.equal(section.classList.contains('show'),false,'control hides during WebGL context loss');
    assert.equal(api[spec.method](),false,'hidden diagnostic action is rejected during context loss');
    assert.equal(api.progress()[spec.field].length,1,'context-loss state cannot mutate discovery progress');
    page.state.contextLost=false;page.tick();assert(section.classList.contains('show'),'control returns after safe exploration is restored');
    dispatchClick(action);assert.equal(api.progress()[spec.field].length,2,'second source records after safe exploration returns');
    dispatchInput(range,spec.targets[2]);dispatchClick(action);assert.equal(api.progress()[spec.field].length,3,'all three sources complete through production DOM events');
    assert.equal(api.progress().discovery,true,'third source unlocks discovery state');
    assert(page.document.querySelector(spec.discoveryEl).classList.contains('show'),'production discovery panel is shown');
    assert(atlasHas(page.document,spec.discovery),'same-tab discovery event refreshes production Star Atlas DOM');
    if(target==='CYG'){
      assert.equal(globalThis.WarpArrivalDebrief.show(arrivalEntry(target)),true,'arrival summary can reopen after discovery completion');
      assert(page.document.querySelector('#arrivalDebriefObjective').textContent.includes(spec.discovery),'same-tab completed arrival reflects the new Star Atlas discovery');
      assert.equal(page.document.querySelector('#arrivalDebriefExplore').textContent,'查看發現','same-tab completed arrival switches its primary handoff action');
    }
  }else if(phase==='reload'){
    assert.equal(api.progress()[spec.field].length,3,'fresh-process reload restores all three recorded sources');
    assert.equal(api.progress().discovery,true,'fresh-process reload restores discovery state');
    assert(page.document.querySelector(spec.progress).textContent.startsWith('3 / 3'),'reloaded production UI renders completed progress');
    assert(page.document.querySelector(spec.discoveryEl).classList.contains('show'),'reloaded production UI renders discovery panel');
    assert(atlasHas(page.document,spec.discovery),'reloaded production Star Atlas renders persisted discovery');
    runArrivalHandoff(page,target,spec,section,'reload');
  }else throw new Error(`unknown phase ${phase}`);
  console.log(`STORAGE_B64:${Buffer.from(JSON.stringify(page.storage.snapshot()),'utf8').toString('base64')}`);
}
async function runHandoffPage(target){
  const config=HANDOFF_SPECS[target];assert(config,`unknown handoff target ${target}`);
  const page=installPage(target,{});
  globalThis.WarpStarAtlas={snapshot(){return{discoveries:{}}}};
  await import(pathToFileURL(resolve(root,'arrival-debrief.js')).href);
  await waitFor(()=>globalThis.WarpArrivalDebrief,'WarpArrivalDebrief');
  assert.equal(globalThis.WarpArrivalDebrief.show(arrivalEntry(target)),true,`${target} debrief opens before late destination module load`);
  await import(pathToFileURL(resolve(root,config.module)).href);
  const section=await (async()=>{await waitFor(()=>page.document.querySelector(config.section),`${target} production exploration section`);return page.document.querySelector(config.section)})();
  page.tick();
  const desc=page.document.querySelector('#exploreDesc'),debrief=page.document.querySelector('#arrivalDebrief'),landmark=page.document.querySelector('#landmarkGuide'),explore=page.document.querySelector('#arrivalDebriefExplore');
  assert(desc&&debrief&&landmark&&section&&explore,`${target} handoff DOM exists`);
  const siblings=debrief.parentElement.children;
  assert.equal(debrief.previousElementSibling,desc,`${target} debrief retains the immediate post-description slot after late module insertion`);
  assert(siblings.indexOf(debrief)<siblings.indexOf(landmark),`${target} debrief precedes Landmark Guide`);
  assert(siblings.indexOf(debrief)<siblings.indexOf(section),`${target} debrief precedes the actual destination task`);
  assert.equal(explore.textContent,'開始探索',`${target} unfinished discovery exposes exploration action`);
  dispatchClick(explore);
  assert.equal(section.scrolled,true,`${target} exploration action scrolls the actual production task into view`);
  console.log(`HANDOFF_OK:${target}`);
}
function runChild(target,phase,storage=''){
  const result=spawnSync(process.execPath,[filePath,'--page',target,phase],{encoding:'utf8',timeout:10000,env:{...process.env,STELLAR_RUNTIME_STORAGE:storage}});
  if(result.status!==0)throw new Error(`${target} ${phase} runtime failed\n${result.stdout}\n${result.stderr}`);
  const marker=result.stdout.match(/STORAGE_B64:([A-Za-z0-9+/=]+)/);assert(marker,`${target} ${phase} emitted storage snapshot`);return marker[1];
}
function runHandoffChild(target){
  const result=spawnSync(process.execPath,[filePath,'--handoff',target],{encoding:'utf8',timeout:10000,env:{...process.env}});
  if(result.status!==0)throw new Error(`${target} handoff runtime failed\n${result.stdout}\n${result.stderr}`);
  assert(result.stdout.includes(`HANDOFF_OK:${target}`),`${target} handoff runtime completed`);
}

if(process.argv[2]==='--page')await runPage(process.argv[3],process.argv[4]);
else if(process.argv[2]==='--handoff')await runHandoffPage(process.argv[3]);
else{
  const packageJson=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
  assert(packageJson.scripts?.check?.includes('node scripts/validate-destination-runtime.mjs'),'npm run check includes executable destination runtime validation');
  let passes=2;
  for(const target of Object.keys(SPECS)){const storage=runChild(target,'fresh');passes++;runChild(target,'reload',storage);passes++}
  for(const target of Object.keys(HANDOFF_SPECS)){runHandoffChild(target);passes++}
  console.log(`\nDestination interaction runtime: ${passes}/${passes} checks passed (production DOM/event integration + seven-destination load-order handoff, 390×844 harness).`);
}
