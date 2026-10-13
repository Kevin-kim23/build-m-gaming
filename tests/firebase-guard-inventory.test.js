import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createPolicy}=require('../tools/firebase-guard/request-policy.cjs');
const {createOutput}=require('../tools/firebase-guard/privacy.cjs');
const {readInventory,matchIndex,expectedFields}=require('../tools/firebase-guard/inventory-read.cjs');
const definition=require('../firestore.indexes.json');
const p='budae-kiugi-dev',region='asia-northeast3';
const loc='https://run.googleapis.com/v1/projects/'+p+'/locations';
const services='https://run.googleapis.com/v2/projects/'+p+'/locations/'+region+'/services';
const db='https://firestore.googleapis.com/v1/projects/'+p+'/databases/(default)';
const page=url=>url+'?pageSize=100';
const get=(policy,url,body)=>policy.dispatch({method:'GET',url},async()=>({status:200,body}));
const location={name:'projects/'+p+'/locations/'+region,locationId:region};
test('inventory permits approved location then regional list and DB',async()=>{
  const policy=createPolicy({mode:'inventory'});
  await get(policy,page(loc),{locations:[location]});
  await get(policy,page(services),{services:[]});
  await get(policy,db,{name:'projects/'+p+'/databases/(default)',locationId:region});
});
const invalid=[
  ['project',page(loc.replace(p,'other-project')),'GET'],
  ['database',db.replace('(default)','other-db'),'GET'],
  ['unapproved region',page(services),'GET'],
  ['slash region',page(services.replace(region,'asia/northeast3')),'GET'],
  ['special region',page(services.replace(region,'asia%2Fnortheast3')),'GET'],
  ['filter',page(loc)+'&filter=anything','GET'],
  ['unknown host',page(loc.replace('run.googleapis.com','example.invalid')),'GET'],
  ['documents',db+'/documents','GET'],
  ['fields',db+'/collectionGroups/-/fields','GET'],
  ...['POST','PUT','PATCH','DELETE'].map(method=>[method,page(loc),method]),
];
for(const [label,url,method] of invalid)test('inventory denies '+label+' before transport',async()=>{
  let sent=0;
  await assert.rejects(()=>createPolicy({mode:'inventory'}).dispatch({method,url},async()=>{sent++;return {status:200,body:{}};}));
  assert.equal(sent,0);
});
test('inventory page token is bound, single use and cycles stop before next transport',async()=>{
  const policy=createPolicy({mode:'inventory'});
  await get(policy,page(loc),{locations:[location],nextPageToken:'FAKE_PAGE_A'});
  await get(policy,page(loc)+'&pageToken=FAKE_PAGE_A',{locations:[]});
  let sent=0;
  await assert.rejects(()=>policy.dispatch({method:'GET',url:page(loc)+'&pageToken=FAKE_PAGE_A'},async()=>{sent++;}));
  assert.equal(sent,0);
  const cycle=createPolicy({mode:'inventory'});
  await get(cycle,page(loc),{nextPageToken:'FAKE_PAGE_B'});
  await assert.rejects(()=>get(cycle,page(loc)+'&pageToken=FAKE_PAGE_B',{nextPageToken:'FAKE_PAGE_B'}));
  assert.equal(cycle.isStopped(),true);
});
test('inventory withholds regions until every location page has been read',async()=>{
  const policy=createPolicy({mode:'inventory'});
  await get(policy,page(loc),{locations:[location],nextPageToken:'FAKE_NEXT'});
  let sent=0;
  await assert.rejects(()=>policy.dispatch({method:'GET',url:page(services)},async()=>{sent++;}));
  assert.equal(sent,0);
});
test('inventory raw output attempts are discarded without emitting body',()=>{
  let text='';const output=createOutput(value=>text+=value);
  output.discard('FAKE_BODY_EMAIL_TOKEN');assert.equal(text,'');
  assert.throws(()=>output.emit('FAKE_BODY_EMAIL_TOKEN'));
  assert.equal(text,'');
});
test('inventory rejects token from another list and concurrent replay before transport',async()=>{
  const policy=createPolicy({mode:'inventory'});
  await get(policy,page(loc),{locations:[location],nextPageToken:'FAKE_BOUND'});
  let sent=0;
  await assert.rejects(()=>policy.dispatch({method:'GET',url:'https://cloudscheduler.googleapis.com/v1/projects/'+p+'/locations?pageSize=100&pageToken=FAKE_BOUND'},async()=>{sent++;}));
  assert.equal(sent,0);
  const concurrent=createPolicy({mode:'inventory'});
  const request={method:'GET',url:page(loc)};
  concurrent.begin(request);
  assert.throws(()=>concurrent.begin(request));assert.equal(concurrent.isStopped(),true);
});
for(const badLocation of [
  {...location,locationId:'asia/northeast3'}, {...location,locationId:'asia*northeast3'},
  {...location,name:'projects/other/locations/'+region}
])test('inventory rejects malformed region response before any regional request',async()=>{
  const policy=createPolicy({mode:'inventory'});
  await assert.rejects(()=>get(policy,page(loc),{locations:[badLocation]}));
  let sent=0;
  await assert.rejects(()=>policy.dispatch({method:'GET',url:page(services)},async()=>{sent++;}));
  assert.equal(sent,0);
});
test('inventory rejects duplicate regions, duplicate query and missing pageSize',async()=>{
  await assert.rejects(()=>get(createPolicy({mode:'inventory'}),page(loc),{locations:[location,location]}));
  for(const url of [loc,page(loc)+'&pageSize=100',page(loc)+'&pageToken=']) {
    let sent=0;
    await assert.rejects(()=>createPolicy({mode:'inventory'}).dispatch({method:'GET',url},async()=>{sent++;}));
    assert.equal(sent,0);
  }
});
const goodIndex=()=>({name:'projects/'+p+'/databases/(default)/collectionGroups/reportDedup/indexes/FAKE_INDEX',
  queryScope:'COLLECTION',fields:expectedFields(definition.indexes[0].fields),state:'READY'});
function harness(change=()=>{}) {
  const policy=createPolicy({mode:'inventory'}),events=[],calls=[];
  const output=createOutput(text=>events.push(JSON.parse(text)));
  async function read(host,path,query) {
    const url='https://'+host+path+(query?'?'+new URLSearchParams(query):'');
    const result=await policy.dispatch({method:'GET',url},async()=>{
      calls.push(path);
      let body=path.endsWith('/locations')?{locations:[location]}:
        path.endsWith('/services')?{services:[]}:path.endsWith('/jobs')?{jobs:[]}:
        path.endsWith('/indexes')?{indexes:[goodIndex()]}:
        {name:'projects/'+p+'/databases/(default)',locationId:region};
      const replacement=change(path,body);
      return {status:200,body:replacement??body};
    });
    return result.response.body;
  }
  return {events,calls,run:()=>readInventory(read,output,definition)};
}
test('inventory complete fake flow emits only fixed summaries for all stages',async()=>{
  const h=harness();await h.run();
  assert.deepEqual(h.events.filter(e=>e.event==='inventory-stage-ok').map(e=>[e.kind,e.count]),[
    ['run',0],['scheduler',0],['database',1],['indexes',1]]);
  assert.doesNotMatch(JSON.stringify(h.events),/FAKE_INDEX|projects\/|@|fields/);
});
test('inventory unexpected Run resource stops without querying Scheduler or DB',async()=>{
  const h=harness((path,body)=>{if(path.endsWith('/services'))body.services=[{name:'FAKE_RAW_SECRET'}];});
  await assert.rejects(h.run);
  assert.equal(h.calls.length,2);
  assert.equal(h.events.some(e=>e.event==='inventory-stage-ok'),false);
  assert.deepEqual(h.events.find(e=>e.event==='inventory-unexpected'),{event:'inventory-unexpected',kind:'run',count:1});
});
test('inventory region failure never emits global zero or continues',async()=>{
  const h=harness(path=>{if(path.endsWith('/services'))throw new Error('FAKE_PRIVATE_ERROR');});
  await assert.rejects(h.run);
  assert.equal(h.calls.length,2);
  assert.equal(h.events.some(e=>e.event==='inventory-stage-ok'),false);
  assert.doesNotMatch(JSON.stringify(h.events),/FAKE/);
});
test('inventory unreachable region response fails and withholds global zero',async()=>{
  const h=harness((path,body)=>{if(path.endsWith('/services'))body.unreachable=['FAKE_REGION'];});
  await assert.rejects(h.run);assert.equal(h.events.some(e=>e.event==='inventory-stage-ok'),false);
});
test('index comparison checks field values, order, direction and query scope',()=>{
  assert.equal(matchIndex(goodIndex(),definition.indexes[0]),true);
  for(const mutate of [
    index=>index.fields.reverse(),
    index=>index.fields[0].order='DESCENDING',
    index=>index.fields[0].fieldPath='otherField',
    index=>index.fields.at(-1).order='DESCENDING',
    index=>index.queryScope='COLLECTION_GROUP',
    index=>index.name=index.name.replace('reportDedup','otherCollection'),
    index=>index.apiScope='DATASTORE_MODE_API'
  ]){const index=goodIndex();mutate(index);assert.equal(matchIndex(index,definition.indexes[0]),false);}
});
for(const issue of ['missing','wrong-fields','not-ready','extra','wrong-location'])test('inventory rejects '+issue+' without claiming success',async()=>{
  const h=harness((path,body)=>{
    if(path.endsWith('/indexes')) {
      if(issue==='missing')body.indexes=[];
      if(issue==='wrong-fields')body.indexes[0].fields[0].order='DESCENDING';
      if(issue==='not-ready')body.indexes[0].state='CREATING';
      if(issue==='extra')body.indexes.push(goodIndex());
    }
    if(issue==='wrong-location'&&path.endsWith('(default)'))body.locationId='other';
  });
  await assert.rejects(h.run);
  assert.equal(h.events.some(e=>e.event==='inventory-stage-ok'&&e.kind==='indexes'),false);
});
