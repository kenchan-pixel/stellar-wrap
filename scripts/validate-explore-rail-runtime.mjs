import assert from 'node:assert/strict';

await import('./validate-explore-hub-runtime.mjs');

const hub=globalThis.WarpExploreHub;
const document=globalThis.document;
assert(hub&&document,'production Explore Hub runtime is available after base harness');

const rail=document.querySelector('#exploreRail');
const toggle=document.querySelector('#exploreRailToggle');
const tools=document.querySelector('#exploreRailTools');
const card=document.querySelector('#exploreCard');
const space=document.querySelector('#space');
const overview=rail?.querySelectorAll('[data-hub-action]')?.find(button=>button.dataset.hubAction==='overview');
assert(rail&&toggle&&tools&&card&&space&&overview,'compact rail runtime controls mount');

assert.equal(hub.menuExpanded(),false,'final mobile exploration starts with compact handle only');
assert.equal(toggle.getAttribute('aria-expanded'),'false','compact handle starts collapsed');
assert.equal(tools.getAttribute('aria-hidden'),'true','collapsed tool group is hidden from assistive navigation');
assert.notEqual(tools.getAttribute('inert'),null,'collapsed tool group is inert');

toggle.click();
assert.equal(hub.menuExpanded(),true,'compact handle expands the five-tool chooser');
assert.equal(rail.classList.contains('railExpanded'),true,'expanded state is reflected on the production rail');
assert.equal(toggle.getAttribute('aria-expanded'),'true','expanded handle reports aria-expanded=true');
assert.equal(tools.getAttribute('aria-hidden'),null,'expanded tool group returns to assistive navigation');
assert.equal(tools.getAttribute('inert'),null,'expanded tool group returns to focus navigation');
assert.equal(card.classList.contains('hubOpen'),false,'tool chooser does not simultaneously open the content drawer');

toggle.click();
assert.equal(hub.menuExpanded(),false,'second handle tap returns to scenery-first compact state');
assert.equal(tools.getAttribute('aria-hidden'),'true','re-collapsed tools leave assistive navigation');
assert.notEqual(tools.getAttribute('inert'),null,'re-collapsed tools are inert');

toggle.click();overview.click();
assert.equal(hub.menuExpanded(),false,'choosing a mode collapses the five-tool chooser');
assert.equal(card.classList.contains('hubOpen'),true,'chosen mode opens exactly one content drawer');
assert.equal(tools.getAttribute('aria-hidden'),'true','tools remain hidden while content drawer is open');
assert.notEqual(tools.getAttribute('inert'),null,'hidden tools remain inert while content drawer is open');

toggle.click();
assert.equal(card.classList.contains('hubOpen'),false,'opening the chooser from an open drawer closes that drawer first');
assert.equal(hub.menuExpanded(),true,'handle then exposes the chooser as the only active surface');
space.click();
assert.equal(hub.menuExpanded(),false,'canvas tap returns the hub to compact scenery-first state');
assert.equal(card.classList.contains('hubOpen'),false,'canvas tap leaves the content drawer closed');

console.log(`Scenery-first Explore Rail runtime ${globalThis.innerWidth}x${globalThis.innerHeight}: passed`);