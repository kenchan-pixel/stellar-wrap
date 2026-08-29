import assert from 'node:assert/strict';

await import('./validate-explore-hub-runtime.mjs');
await import('../exploration-focus-tray.js');

const hub=globalThis.WarpExploreHub;
const tray=globalThis.WarpExplorationFocusTray;
const document=globalThis.document;
const card=document.querySelector('#exploreCard');
const style=document.querySelector('#explorationFocusTrayStyle');
assert(hub&&tray&&card&&style,'production Explore Hub and focus-tray runtime mount');

assert.equal(tray.active(),false,'focus tray starts inactive while the hub is compact');
hub.open('explore');
assert.equal(card.dataset.hubPane,'explore','Explore mode remains the existing hub pane authority');
assert.equal(card.classList.contains('hubOpen'),true,'Explore pane opens through the production hub');
assert.equal(tray.active(),true,'focus tray activates only for the open Explore pane');
assert.match(style.textContent,/max-height:min\(42vh,360px\)/,'phone tray keeps most of the vertical scenery visible');
assert.match(style.textContent,/bottom:calc\(var\(--safeB\) \+ 8px\)/,'tray respects the bottom safe area');
assert.match(style.textContent,/\[data-hub-pane="explore"\] #exploreDesc\{\s*display:none!important/,'Explore tray removes duplicated destination copy already available in Overview');

hub.open('overview');
assert.equal(card.dataset.hubPane,'overview','Overview still uses the existing content pane');
assert.equal(tray.active(),false,'Overview is not converted into the instrument tray');
hub.open('discovery');
assert.equal(card.dataset.hubPane,'discovery','Discovery still uses the existing content pane');
assert.equal(tray.active(),false,'Discovery is not converted into the instrument tray');
hub.close();
assert.equal(tray.active(),false,'closing the hub leaves no focus tray active');

console.log(`Exploration Focus Tray runtime ${globalThis.innerWidth}x${globalThis.innerHeight}: passed`);
