import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('capture-voyage-context.js','utf8');
assert.match(source,/const age=capturedAt-endedAt;if\(age<0\|\|age>MAX_MATCH_MS\)return null;/,'voyage context must reject journeys completed after the capture');
assert.doesNotMatch(source,/CLOCK_SLOP_MS/,'local capture/journey matching must not allow post-capture clock slop');

const journeys=[
  {route:['SOL','SIRIUS','TAU'],startedAt:100,endedAt:1000,seconds:37,distance:11.4},
  {route:['PROX','SIRIUS','TAU'],startedAt:2100,endedAt:3000,seconds:29,distance:9.4}
];
const sandbox={
  window:{WarpTravelJournal:{entries:()=>journeys}},
  document:{readyState:'loading',addEventListener(){}},
  addEventListener(){},
  console
};
vm.runInNewContext(source,sandbox,{filename:'capture-voyage-context.js'});
const api=sandbox.window.WarpCaptureVoyageContext;
assert.ok(api,'production voyage context API must initialize in the regression harness');

const between=api.contextFor({system:'TAU',createdAt:2000});
assert.ok(between,'the completed pre-capture TAU journey must still match');
assert.equal(between.route.join('>'),'SOL>SIRIUS>TAU','a later same-destination journey must not replace the actual pre-capture route');
assert.equal(between.endedAt,1000,'the matched journey must have completed no later than the capture');

const beforeBoth=api.contextFor({system:'TAU',createdAt:500});
assert.equal(beforeBoth,null,'a capture earlier than all same-destination journeys must fail closed');

console.log('Capture voyage timestamp ordering regression: passed');
