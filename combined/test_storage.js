const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'storage.js'),'utf8');
const key=name=>'mathcounts-combined-'+name+'-v1';
function harness(initial={}){
  const storage=new Map(Object.entries(initial).map(([k,v])=>[k,JSON.stringify(v)]));
  const context=vm.createContext({localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
  return {run:()=>vm.runInContext(source,context),read:k=>JSON.parse(storage.get(k)||'null'),storage};
}
function session(id,startedAt,duration=0){
  return {id,startedAt,duration,topic:'Foundations',questions:[{id:'q-'+id,topic:'Foundations',methods:['a','b','c','d']}],
    answers:{['q-'+id]:'0'},methods:{['q-'+id]:2},results:null};
}
test('progress from both weeks is imported once; reset stays reset',()=>{
  const h=harness({'mathcounts-remainder-lab-v1':{remainder:{solved:true}},'mathcounts-algebra-lab-v1':{balance:{solved:true}}});
  h.run();assert.deepEqual(h.read(key('progress')),{remainder:{solved:true},balance:{solved:true}});
  h.storage.set(key('progress'),'{}');h.run();assert.deepEqual(h.read(key('progress')),{});
  assert.deepEqual(h.read('mathcounts-remainder-lab-v1'),{remainder:{solved:true}});
});
test('both unfinished sets retain their answers, methods and absolute deadlines',()=>{
  const first=session('one',100000,600),second=session('two',200000,60);
  const h=harness({'mathcounts-assessment-v1':first,'mathcounts-algebra-assessment-v1':second});h.run();
  const active=h.read(key('assessment')),saved=h.read(key('saved-assessments'));
  assert.equal(active.id,'two');assert.equal(active.startedAt+active.duration*1000,260000);
  assert.deepEqual(active.answers,second.answers);assert.deepEqual(active.methods,second.methods);
  assert.equal(active.questions[0].topic,'Algebra foundations');assert.equal(active.week,'2');
  assert.equal(saved[0].id,'one');assert.equal(saved[0].questions[0].topic,'Remainder foundations');
});
test('completed reports are combined, deduplicated and correctly relabeled',()=>{
  const first=session('one',100000),second=session('two',200000);
  for(const s of [first,second])s.results={score:1,total:1,results:[{topic:'Foundations'}],topics:[{topic:'Foundations'}]};
  const h=harness({'mathcounts-assessment-v1':first,'mathcounts-assessment-history-v1':[first],
    'mathcounts-algebra-assessment-history-v1':[second]});h.run();
  const history=h.read(key('assessment-history'));assert.equal(history.length,2);
  assert.equal(history[0].id,'two');assert.equal(history[0].results.topics[0].topic,'Algebra foundations');
  assert.equal(history[1].results.results[0].topic,'Remainder foundations');
});
test('existing merged data wins over older standalone data',()=>{
  const h=harness({[key('progress')]:{},[key('assessment-history')]:[],[key('assessment')]:session('combined',300000),
    'mathcounts-remainder-lab-v1':{remainder:{solved:true}},'mathcounts-assessment-v1':session('one',100000)});
  h.run();assert.deepEqual(h.read(key('progress')),{});assert.deepEqual(h.read(key('assessment-history')),[]);
  assert.equal(h.read(key('assessment')).id,'combined');assert.equal(h.read(key('saved-assessments'))[0].id,'one');
});
test('malformed or disabled storage does not prevent startup',()=>{
  const h=harness({'mathcounts-assessment-history-v1':{},'mathcounts-algebra-lab-v1':[]});
  h.storage.set('mathcounts-remainder-lab-v1','invalid json');assert.doesNotThrow(h.run);
  assert.deepEqual(h.read(key('progress')),{});
  assert.doesNotThrow(()=>vm.runInNewContext(source,{localStorage:{getItem(){throw new Error('disabled');}}}));
});
