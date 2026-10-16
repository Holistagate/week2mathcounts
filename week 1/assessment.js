"use strict";

// Loaded before app.js. These functions share its rendering and API helpers.
function loadAssessmentValue(key, fallback) {
  try {return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;}
  catch (_) {return fallback;}
}
const ASSESSMENT_KEY = "mathcounts-assessment-v1";
const HISTORY_KEY = "mathcounts-assessment-history-v1";
const SETTINGS_KEY = "mathcounts-assessment-settings-v1";
let assessmentSession = loadAssessmentValue(ASSESSMENT_KEY,null);
if (!assessmentSession || !Array.isArray(assessmentSession.questions) || !assessmentSession.questions.length || !Number.isFinite(assessmentSession.startedAt)) assessmentSession=null;
let assessmentHistory = loadAssessmentValue(HISTORY_KEY,[]);
if (!Array.isArray(assessmentHistory)) assessmentHistory=[];
let assessmentSettings = {count:10,time:600,topic:"All topics",level:"Contest + Stretch",source:"mixed",strategies:false,...loadAssessmentValue(SETTINGS_KEY,{})};
if (!['bank','mixed','generated'].includes(assessmentSettings.source)) assessmentSettings.source='mixed';
let practiceMode = loadAssessmentValue("mathcounts-practice-mode","assessment");
if (!['assessment','guided'].includes(practiceMode)) practiceMode="assessment";
let assessmentView = assessmentSession ? (assessmentSession.results ? "results" : "active") : "setup";
let assessmentReview = null, practiceReviewIds = null, gradingAssessment = false;
let assessmentTimer = null, assessmentError = "";

function storeAssessmentValue(key, value) {
  try {localStorage.setItem(key,JSON.stringify(value));} catch (_) {}
}
function persistAssessment() {storeAssessmentValue(ASSESSMENT_KEY,assessmentSession);}

function renderContestShell() {
  ++requestVersion;
  activity.innerHTML = `${head("06","Put your shortcuts to the test.",`Mix ${questions.length} original contest-style problems with fresh questions generated on demand. Take an assessment, or practice with hints and immediate feedback.`)}<div class="practice-modes" role="group" aria-label="Practice mode"><button id="assessment-mode" class="mode ${practiceMode==='assessment'?'active':''}" type="button" aria-pressed="${practiceMode==='assessment'}">Random assessments</button><button id="guided-mode" class="mode ${practiceMode==='guided'?'active':''}" type="button" aria-pressed="${practiceMode==='guided'}">Guided practice</button><span>${questions.length} authored + fresh questions</span></div><div id="practice-content"></div>`;
  $("#assessment-mode").addEventListener("click",()=>setPracticeMode("assessment"));
  $("#guided-mode").addEventListener("click",()=>setPracticeMode("guided"));
  if(practiceMode==='guided')renderPracticeShell();else renderAssessment();
}

function setPracticeMode(mode) {
  practiceMode=mode;
  storeAssessmentValue("mathcounts-practice-mode",mode);
  renderContestShell();
}

function renderAssessment() {
  if(currentTab!=='practice'||practiceMode!=='assessment'||!$("#practice-content"))return;
  ++requestVersion;
  if(assessmentView==='active'&&assessmentSession&&!assessmentSession.results)renderActiveAssessment();
  else if(assessmentView==='results'&&(assessmentReview?.results||assessmentSession?.results))renderAssessmentResults(assessmentReview||assessmentSession);
  else renderAssessmentSetup();
}

function selectedAssessmentPool() {
  return questions.filter(q=>(assessmentSettings.topic==='All topics'||q.topic===assessmentSettings.topic)
    &&(assessmentSettings.level==='All levels'||q.level===assessmentSettings.level
       ||(assessmentSettings.level==='Contest + Stretch'&&q.level!=='Warm-up')));
}

function selectedGenerators(settings=assessmentSettings) {
  return generatorSpecs.filter(q=>(settings.topic==='All topics'||q.topic===settings.topic)
    &&(settings.level==='All levels'||q.level===settings.level
      ||(settings.level==='Contest + Stretch'&&q.level!=='Warm-up')));
}

function assessmentPoolDescription() {
  const available=selectedAssessmentPool().length, fresh=selectedGenerators().length;
  const s=assessmentSettings, canGenerate=s.source!=='bank'&&fresh>0;
  const actual=canGenerate?s.count:Math.min(s.count,available);
  const possible=actual>0&&(s.source!=='generated'||fresh>0);
  let text='No questions match. Choose another topic, difficulty, or question source.';
  if(possible){
    if(s.source==='generated')text=`${actual} fresh questions with new numbers, generated when you start.`;
    else if(s.source==='mixed'&&canGenerate){
      const bankCount=Math.min(Math.floor(actual/2),available);
      text=bankCount?`${actual} questions: at least ${actual-bankCount} freshly generated, plus up to ${bankCount} drawn from ${available} authored problems.`:`${actual} fresh questions. No authored problems match these filters.`;
    }
    else text=`${actual} questions from ${available} authored problems${actual<s.count?' (the filtered bank is smaller than your requested set)':''}.`;
  }
  return {text,possible};
}

function renderAssessmentSetup() {
  const topics=['All topics',...new Set(questions.map(q=>q.topic))];
  const levels=['Contest + Stretch','All levels','Warm-up','Contest','Stretch'];
  const counts=[5,10,20], times=[[0,'Untimed'],[300,'5 minutes'],[600,'10 minutes'],[1200,'20 minutes'],[1800,'30 minutes']];
  const sources=[['mixed','Mixed: authored + fresh'],['generated','Fresh questions only'],['bank','Authored problems only']];
  const content=$("#practice-content");
  content.innerHTML=`<div class="assessment-setup"><section class="card"><span class="eyebrow">A FRESH SET EVERY TIME</span><h2 class="assessment-title">Build your assessment</h2><p class="explanation">Fresh questions use new numbers in contest-style problem types. Sets avoid repeated questions and spread across topics when you choose All topics. Answers and worked solutions appear after you submit.</p><form id="assessment-setup-form"><div class="assessment-fields"><label class="field" for="assessment-count">Questions<select id="assessment-count" name="count">${counts.map(n=>`<option value="${n}" ${Number(assessmentSettings.count)===n?'selected':''}>${n} questions</option>`).join('')}</select></label><label class="field" for="assessment-time">Time limit<select id="assessment-time" name="time">${times.map(([n,label])=>`<option value="${n}" ${Number(assessmentSettings.time)===n?'selected':''}>${label}</option>`).join('')}</select></label><label class="field" for="assessment-topic">Topic<select id="assessment-topic" name="topic">${topics.map(t=>`<option ${assessmentSettings.topic===t?'selected':''}>${esc(t)}</option>`).join('')}</select></label><label class="field" for="assessment-level">Difficulty<select id="assessment-level" name="level">${levels.map(l=>`<option ${assessmentSettings.level===l?'selected':''}>${esc(l)}</option>`).join('')}</select></label></div><label class="field" for="assessment-source">Question source<select id="assessment-source" name="source">${sources.map(([value,label])=>`<option value="${value}" ${assessmentSettings.source===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="check-field"><input id="assessment-strategies" name="strategies" type="checkbox" ${assessmentSettings.strategies?'checked':''}> Include a strategy-choice step</label><p class="caption">Leave this off for a numeric-answer assessment: students must identify the shortcut themselves.</p><p id="pool-description" class="pool-description"></p><button id="start-assessment" class="primary" type="submit">Start random assessment →</button></form><div id="assessment-error" class="error" role="alert">${esc(assessmentError)}</div></section><aside class="card"><h2>How it works</h2><ol class="steps"><li>Try each problem without a calculator.</li><li>Move freely between questions. Leave a blank to skip.</li><li>Submit the set, or let the timer finish it.</li><li>Review your score, topic breakdown, and worked solutions.</li></ol><div class="math-note">Answers save in this browser. A timed assessment keeps counting down when you switch activities or reload.</div><p class="caption">Training lengths and times are customizable; these sets are original modular-arithmetic practice.</p></aside></div><div id="assessment-history"></div>`;
  const form=$("#assessment-setup-form");
  const updateSettings=()=>{
    const values=Object.fromEntries(new FormData(form));
    assessmentSettings={count:Number(values.count),time:Number(values.time),topic:values.topic,level:values.level,source:values.source,strategies:form.elements.strategies.checked};
    storeAssessmentValue(SETTINGS_KEY,assessmentSettings);
    const pool=assessmentPoolDescription();
    $("#pool-description").textContent=pool.text;
    $("#start-assessment").disabled=!pool.possible;
  };
  form.addEventListener('change',updateSettings);
  form.addEventListener('submit',event=>{event.preventDefault();updateSettings();startRandomAssessment();});
  updateSettings();
  renderAssessmentHistory();
}

async function startRandomAssessment() {
  const version=requestVersion, button=$("#start-assessment");
  button.disabled=true;
  assessmentError='';
  $("#assessment-error").textContent='';
  try {
    const data=await api('assessment',{count:assessmentSettings.count,topic:assessmentSettings.topic,level:assessmentSettings.level,source:assessmentSettings.source});
    if(version!==requestVersion)return;
    assessmentSession={id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,questions:data.questions,
      startedAt:Date.now(),duration:Number(assessmentSettings.time),strategies:assessmentSettings.strategies,
      answers:{},methods:{},index:0,expired:false,results:null,topic:assessmentSettings.topic,level:assessmentSettings.level,source:data.source};
    assessmentView='active';assessmentReview=null;
    persistAssessment();renderAssessment();
  } catch(problem) {
    if(version===requestVersion){assessmentError=problem.message;$("#assessment-error").textContent=problem.message;button.disabled=false;}
  }
}

function assessmentRemaining(session=assessmentSession) {
  return session?.duration?Math.max(0,Math.ceil((session.startedAt+session.duration*1000-Date.now())/1000)):null;
}
function timerText(seconds) {
  if(seconds===null)return 'Untimed';
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}
function validAssessmentAnswer(value) {
  return /^[+-]?\d+$/.test(String(value))&&Math.abs(Number(value))<=1000000000;
}
function assessmentAnswered(session=assessmentSession) {
  return session.questions.filter(q=>validAssessmentAnswer(session.answers[q.id]??'')).length;
}

function renderActiveAssessment() {
  const session=assessmentSession;
  session.index=Math.max(0,Math.min(session.index||0,session.questions.length-1));
  const q=session.questions[session.index], count=session.questions.length;
  const locked=gradingAssessment||session.expired;
  const order=q.method_order||q.methods.map((_,i)=>i);
  $("#practice-content").innerHTML=`<div class="assessment-status"><span class="badge">ASSESSMENT IN PROGRESS</span><span id="assessment-answered">${assessmentAnswered()} / ${count} answered</span><span id="assessment-clock" class="timer ${assessmentRemaining()!==null&&assessmentRemaining()<=60?'urgent':''}" role="timer" aria-label="Time remaining">${timerText(assessmentRemaining())}</span></div><div class="practice-grid"><section class="card"><div class="question-top"><span class="question-index">Question ${session.index+1} of ${count}</span><span class="badge">${esc(q.level)} · ${esc(q.topic)}${q.generated?' · Fresh numbers':''}</span></div><p class="question-prompt">${esc(q.prompt)}</p>${session.strategies?`<div class="stage-label">CHOOSE AN EFFICIENT APPROACH</div><div class="methods" role="group" aria-label="Assessment strategy">${order.map((original,i)=>`<button class="method ${session.methods[q.id]===original?'selected':''}" data-assessment-method="${original}" type="button" aria-pressed="${session.methods[q.id]===original}" ${locked?'disabled':''}><span>${'ABCD'[i]}</span>${esc(q.methods[original])}</button>`).join('')}</div>`:''}<label class="field assessment-answer-label" for="assessment-answer">Your answer (${esc(q.unit)})<input id="assessment-answer" type="number" min="-1000000000" max="1000000000" step="1" value="${esc(session.answers[q.id]??'')}" placeholder="Leave blank to skip" ${locked?'disabled':''}></label><p class="caption">${session.expired?'Time is up. Your saved answers are ready to score.':'Your answer is saved as you type. Results are withheld until submission.'}</p><div id="assessment-error" class="error" role="alert">${esc(assessmentError)}</div><div class="question-nav"><button id="assessment-previous" class="secondary" type="button" ${session.index===0||locked?'disabled':''}>← Previous</button><button id="assessment-next" class="secondary" type="button" ${session.index===count-1||locked?'disabled':''}>Next question →</button></div></section><aside class="card assessment-sidebar"><h2>Question navigator</h2><div class="question-map">${session.questions.map((item,i)=>`<button type="button" data-assessment-index="${i}" class="${i===session.index?'current':''} ${validAssessmentAnswer(session.answers[item.id]??'')?'answered':''}" aria-label="Question ${i+1}${validAssessmentAnswer(session.answers[item.id]??'')?', answered':', blank'}" ${i===session.index?'aria-current="step"':''} ${locked?'disabled':''}>${i+1}</button>`).join('')}</div><div class="legend"><span>Answer entered</span><span class="gray">Blank / skipped</span></div><p class="caption">${session.duration?'The timer keeps running if you switch activities.':'This is an untimed assessment. Work at your own pace.'}</p><button id="submit-assessment" class="primary" type="button" ${gradingAssessment?'disabled':''}>${gradingAssessment?'Scoring…':session.expired?'Score saved answers':'Submit assessment'}</button><p class="caption">Blanks count as skipped. Once submitted, this set is closed for review.</p></aside></div>`;
  $("#assessment-answer").addEventListener('input',event=>{
    if(assessmentRemaining()===0||session.expired){finishAssessment('time');return;}
    session.answers[q.id]=event.target.value;persistAssessment();updateAssessmentCounts();
  });
  $("#assessment-answer").addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();if(session.index<count-1&&!locked)moveAssessment(session.index+1);}
  });
  $(".question-map").addEventListener('click',event=>{const button=event.target.closest('[data-assessment-index]');if(button)moveAssessment(Number(button.dataset.assessmentIndex));});
  $(".methods")?.addEventListener('click',event=>{
    const button=event.target.closest('[data-assessment-method]');
    if(!button||locked)return;
    if(assessmentRemaining()===0){finishAssessment('time');return;}
    session.methods[q.id]=Number(button.dataset.assessmentMethod);persistAssessment();renderAssessment();
  });
  $("#assessment-previous").addEventListener('click',()=>moveAssessment(session.index-1));
  $("#assessment-next").addEventListener('click',()=>moveAssessment(session.index+1));
  $("#submit-assessment").addEventListener('click',()=>finishAssessment(session.expired?'time':'manual'));
}

function updateAssessmentCounts() {
  if(!$("#assessment-answered"))return;
  $("#assessment-answered").textContent=`${assessmentAnswered()} / ${assessmentSession.questions.length} answered`;
  document.querySelectorAll('[data-assessment-index]').forEach(button=>{
    const index=Number(button.dataset.assessmentIndex), q=assessmentSession.questions[index];
    const answered=validAssessmentAnswer(assessmentSession.answers[q.id]??'');
    button.classList.toggle('answered',answered);
    button.setAttribute('aria-label',`Question ${index+1}${answered?', answered':', blank'}`);
  });
}

function moveAssessment(index) {
  if(gradingAssessment||assessmentSession.expired)return;
  if(assessmentRemaining()===0){finishAssessment('time');return;}
  assessmentSession.index=index;assessmentError='';persistAssessment();renderAssessment();
  $("#assessment-answer")?.focus({preventScroll:true});
}

async function finishAssessment(reason='manual') {
  const session=assessmentSession;
  if(!session||session.results||gradingAssessment)return;
  if(reason==='time'||assessmentRemaining()===0)session.expired=true;
  if(!session.expired){
    const badIndex=session.questions.findIndex(q=>{
      const answer=session.answers[q.id]??'';
      return answer!==''&&!validAssessmentAnswer(answer);
    });
    if(badIndex!==-1){session.index=badIndex;assessmentError=`Question ${badIndex+1} needs a whole number from −1 billion to 1 billion. Clear it to skip.`;renderAssessment();return;}
  }
  gradingAssessment=true;assessmentError='';persistAssessment();renderAssessment();
  const submittedAt=Date.now();
  const items=session.questions.map(q=>({id:q.id,
    answer:validAssessmentAnswer(session.answers[q.id]??'')?session.answers[q.id]:null,
    method:session.strategies?(session.methods[q.id]??null):null}));
  try {
    let response;
    try {response=await fetch('/api/grade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});}
    catch(_){throw new Error('Cannot reach Python. Keep the trainer running, then try submitting again. Your answers are saved.');}
    const results=await response.json();
    if(!response.ok)throw new Error(results.error||'Could not score this assessment.');
    session.results=results;session.submittedAt=submittedAt;session.finishReason=session.expired?'time':'manual';
    persistAssessment();
    assessmentHistory=[session,...assessmentHistory.filter(item=>item.id!==session.id)].slice(0,10);
    storeAssessmentValue(HISTORY_KEY,assessmentHistory);
    assessmentReview=null;assessmentView='results';
    renderAssessment();
  } catch(problem) {
    assessmentError=problem.message;
  } finally {
    gradingAssessment=false;
    // An expired set stays locked but can retry submission after a connection failure.
    renderAssessment();
  }
}

function startAssessmentClock() {
  if(assessmentTimer!==null)clearInterval(assessmentTimer);
  assessmentTimer=setInterval(()=>{
    if(!assessmentSession||assessmentSession.results||!assessmentSession.duration)return;
    const remaining=assessmentRemaining();
    const clock=$("#assessment-clock");
    if(clock){clock.textContent=timerText(remaining);clock.classList.toggle('urgent',remaining<=60);}
    if(remaining===0&&!gradingAssessment&&!assessmentSession.expired)finishAssessment('time');
  },500);
  if(assessmentSession&&!assessmentSession.results&&assessmentRemaining()===0&&!assessmentSession.expired)finishAssessment('time');
}

function renderAssessmentResults(session) {
  const r=session.results;
  const elapsed=Math.max(0,Math.round((session.submittedAt-session.startedAt)/1000));
  const displayElapsed=session.duration?Math.min(elapsed,session.duration):elapsed;
  const missed=r.results.filter(item=>!item.correct);
  $("#practice-content").innerHTML=`<section class="card assessment-results"><div class="question-top"><span class="badge">ASSESSMENT COMPLETE</span><span class="question-index">${session.finishReason==='time'?'Time limit reached':'Submitted'} · ${timerText(displayElapsed)} elapsed</span></div><h2 class="assessment-title">${r.score===r.total?'All correct. Well done.':r.percent>=70?'A solid start. Review the gaps.':'Use the review to build your next shortcut.'}</h2><div class="assessment-score"><strong>${r.score}<span> / ${r.total}</span></strong><div>${r.percent}% correct<br><span>${r.answered} answered · ${r.skipped} skipped</span></div></div>${session.strategies?`<p class="math-note">Strategy choices: <b>${r.strategy_score} / ${r.total}</b> correct (${r.strategy_answered} selected). Numeric answers determine the assessment score.</p>`:''}<p class="caption">${r.generated_count||0} freshly generated · ${r.total-(r.generated_count||0)} authored problems</p><h3>Where to practice next</h3><div class="topic-results">${r.topics.map(t=>`<div><span>${esc(t.topic)}</span><b>${t.correct} / ${t.total}</b><div class="topic-meter"><span style="width:${100*t.correct/t.total}%"></span></div></div>`).join('')}</div><div class="practice-actions"><button id="new-assessment" class="primary" type="button">Build another random set →</button>${missed.length?'<button id="practice-missed" class="secondary" type="button">Practice missed questions with hints</button>':''}<button id="assessment-home" class="secondary" type="button">Assessment history</button></div><h3>Review every question</h3><p class="caption">Open a question for the answer, an efficient approach, and the worked solution.</p><div class="assessment-review">${r.results.map((item,i)=>`<details ${!item.correct?'open':''}><summary><span class="review-status ${item.status}">${item.correct?'✓':item.status==='skipped'?'—':'×'}</span><span>Q${i+1}. ${esc(item.prompt)}</span></summary><div class="review-content"><div class="review-answers"><span>Your answer: <b>${item.submitted_answer===null?'Skipped':item.submitted_answer}</b></span><span>Correct answer: <b>${item.answer}</b></span></div><p>${esc(item.solution)}</p><p><b>Efficient approach:</b> ${esc(item.recommended_method)}. ${esc(item.method_reason)}</p>${session.strategies?`<p><b>Your strategy:</b> ${item.submitted_method?esc(item.submitted_method):'Not selected'}${item.method_correct===null?'':item.method_correct?' ✓':' · review this choice'}</p>`:''}</div></details>`).join('')}</div></section>`;
  $("#new-assessment").addEventListener('click',()=>{assessmentReview=null;assessmentView='setup';assessmentError='';renderAssessment();});
  $("#assessment-home").addEventListener('click',()=>{assessmentView='setup';renderAssessment();});
  $("#practice-missed")?.addEventListener('click',()=>{
    const ids=new Set(missed.map(item=>item.id));
    extraPracticeQuestions=session.questions.filter(q=>q.generated&&ids.has(q.id));
    clearFreshPractice();
    practiceReviewIds=[...ids];topic='All topics';level='All levels';practiceIndex=0;
    setPracticeMode('guided');
  });
}

function renderAssessmentHistory() {
  const root=$("#assessment-history");
  if(!assessmentHistory.length){root.innerHTML='<p class="caption">Your last 10 assessment results will appear here. Guided-practice credit is tracked separately.</p>';return;}
  root.innerHTML=`<section class="card history-card"><div class="question-top"><h2>Recent assessments</h2><button id="clear-assessment-history" class="secondary" type="button">Clear assessment history</button></div><p class="caption">Saved in this browser · the 10 most recent sets</p><div class="assessment-history">${assessmentHistory.map((item,i)=>`<div><span>${esc(new Date(item.startedAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))}<small>${esc(item.topic)} · ${esc(item.level)} · ${item.duration?timerText(item.duration)+' limit':'Untimed'}</small></span><b>${item.results.score} / ${item.results.total}</b><button class="secondary" data-history-index="${i}" type="button">Review</button></div>`).join('')}</div></section>`;
  $("#clear-assessment-history").addEventListener('click',()=>{
    assessmentHistory=[];assessmentReview=null;storeAssessmentValue(HISTORY_KEY,assessmentHistory);
    if(assessmentSession?.results){assessmentSession=null;persistAssessment();}
    renderAssessment();
  });
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-history-index]');
    if(!button)return;
    assessmentReview=assessmentHistory[Number(button.dataset.historyIndex)];assessmentView='results';renderAssessment();
  });
}
