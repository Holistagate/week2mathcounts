// Node's standard-library test runner; no browser or installed packages needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'assessment.js'),'utf8');

function harness(existingStorage = new Map()) {
  let now=1000000, interval=null, failure=false, blocked=false, release=null;
  const requests=[];
  const context=vm.createContext({
    Date:class extends Date {static now(){return now;}},
    localStorage:{getItem:key=>existingStorage.get(key)??null,setItem:(key,value)=>existingStorage.set(key,value)},
    setInterval:callback=>{interval=callback;return 1;},clearInterval:()=>{},
    currentTab:'remainder',requestVersion:0,$:()=>null,
    fetch:async (_url,options)=>{
      requests.push(JSON.parse(options.body));
      if(failure){failure=false;throw new Error('connection lost');}
      const response={ok:true,json:async()=>({score:1,total:2,answered:1,skipped:1,results:[],topics:[]})};
      if(blocked)return new Promise(resolve=>{release=()=>resolve(response);});
      return response;
    }
  });
  vm.runInContext(source,context);
  return {storage:existingStorage,requests,run:script=>vm.runInContext(script,context),
    advance:ms=>{now+=ms;},failNext:()=>{failure=true;},block:()=>{blocked=true;},
    release:()=>release(),tick:()=>interval()};
}
function session(h,answers={one:'2',two:''}) {
  h.run(`assessmentSession=${JSON.stringify({id:'test',startedAt:1000000,duration:60,strategies:true,index:0,expired:false,results:null,
    questions:[{id:'one',methods:['A','B','C','D']},{id:'two',methods:['A','B','C','D']}],answers,methods:{one:3}})};`);
}

test('deadline is absolute and survives reloading stored answers',()=>{
  const h=harness();session(h);h.run('persistAssessment()');h.advance(45001);
  assert.equal(h.run('assessmentRemaining()'),15);
  const resumed=harness(h.storage);resumed.advance(45001);
  assert.equal(resumed.run('assessmentRemaining()'),15);
  assert.equal(resumed.run('assessmentSession.answers.one'),'2');
  resumed.advance(14999);assert.equal(resumed.run('assessmentRemaining()'),0);
});
test('answer counts include zero and reject fractions or out-of-range integers',()=>{
  const h=harness();session(h,{one:'0',two:'-3'});
  assert.equal(h.run('assessmentAnswered()'),2);
  for(const invalid of ['', '2.5','1000000001','word'])
    assert.equal(h.run(`validAssessmentAnswer(${JSON.stringify(invalid)})`),false);
});
test('submission includes saved answers and original shuffled-method indices',async()=>{
  const h=harness();session(h);await h.run('finishAssessment()');
  assert.deepEqual(h.requests[0].items,[{id:'one',answer:'2',method:3},{id:'two',answer:null,method:null}]);
  assert.equal(h.run('assessmentSession.results.score'),1);
  assert.equal(h.run('assessmentHistory.length'),1);
  assert.equal(h.run('gradingAssessment'),false);
});
test('manual submission points to an invalid answer without grading',async()=>{
  const h=harness();session(h,{one:'2',two:'2.5'});await h.run('finishAssessment()');
  assert.equal(h.requests.length,0);
  assert.equal(h.run('assessmentSession.index'),1);
  assert.match(h.run('assessmentError'),/Question 2 needs a whole number/);
});
test('timer auto-submits once and treats invalid entries as skipped',async()=>{
  const h=harness();session(h,{one:'2',two:'2.5'});h.run('startAssessmentClock()');h.advance(60000);h.tick();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.requests.length,1);
  assert.equal(h.requests[0].items[1].answer,null);
  assert.equal(h.run('assessmentSession.finishReason'),'time');
  h.tick();assert.equal(h.requests.length,1);
});
test('failed grading preserves answers and allows a retry after the deadline',async()=>{
  const h=harness();session(h);h.advance(60000);h.failNext();await h.run("finishAssessment('time')");
  assert.equal(h.run('assessmentSession.results'),null);
  assert.equal(h.run('assessmentSession.answers.one'),'2');
  assert.equal(h.run('gradingAssessment'),false);
  await h.run("finishAssessment('time')");assert.equal(h.requests.length,2);
  assert.equal(h.run('assessmentSession.results.score'),1);
});
test('double submission cannot duplicate grading or saved history',async()=>{
  const h=harness();session(h);h.block();const pending=h.run('finishAssessment()');
  await h.run('finishAssessment()');assert.equal(h.requests.length,1);
  h.release();await pending;assert.equal(h.run('assessmentHistory.length'),1);
});

test('fresh sources can fill a topic without authored problems',()=>{
  const h=harness();
  h.run(`questions=[];generatorSpecs=[{topic:'Congruences',level:'Warm-up'}];
    assessmentSettings={count:20,topic:'Congruences',level:'Warm-up',source:'mixed'};`);
  assert.equal(h.run('assessmentPoolDescription().possible'),true);
  assert.match(h.run('assessmentPoolDescription().text'),/20 fresh questions/);
  h.run("assessmentSettings.source='bank'");
  assert.equal(h.run('assessmentPoolDescription().possible'),false);
  h.run("assessmentSettings.source='generated'");
  assert.equal(h.run('assessmentPoolDescription().possible'),true);
  h.run("assessmentSettings.level='Stretch'");
  assert.equal(h.run('assessmentPoolDescription().possible'),false);
});
test('legacy saved settings default to a mix of authored and fresh questions',()=>{
  const storage=new Map([['mathcounts-assessment-settings-v1',JSON.stringify({count:5,topic:'Digits'})]]);
  const h=harness(storage);
  assert.equal(h.run('assessmentSettings.source'),'mixed');
  assert.equal(h.run('assessmentSettings.count'),5);
});
test('saved generated assessments retain their question and method order',()=>{
  const h=harness();session(h);
  h.run(`assessmentSession.questions[0]={id:'gen-v1:inverse:0000000000000042',generated:true,
    prompt:'What is x?',methods:['One','Two','Three','Four'],method_order:[2,0,3,1]};
    assessmentSession.answers={'gen-v1:inverse:0000000000000042':'4'};persistAssessment();`);
  const resumed=harness(h.storage);
  assert.equal(resumed.run('assessmentSession.questions[0].generated'),true);
  assert.equal(resumed.run('assessmentSession.questions[0].prompt'),'What is x?');
  assert.equal(resumed.run('assessmentSession.questions[0].method_order.join()'),'2,0,3,1');
  assert.equal(resumed.run('assessmentAnswered()'),1);
});
