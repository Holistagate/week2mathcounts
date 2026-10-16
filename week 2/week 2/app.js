"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const fmt = value => Number(value).toLocaleString("en-US");
const activity = $("#activity");
let currentTab = "overview", requestVersion = 0, animation = null;
const formMemory = {};
const STORAGE_KEY = "mathcounts-algebra-lab-v1";
let progress = {};
try { progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
catch (_) { progress = {}; }
if (!progress || typeof progress !== "object" || Array.isArray(progress)) progress = {};
let questions = [], practiceIndex = 0, topic = "All topics", level = "All levels", hintIndex = 0;
let questionsPromise = null;
let generatorSpecs = [], extraPracticeQuestions = [];
const FRESH_PRACTICE_KEY = "mathcounts-algebra-fresh-practice-v1";
let generatedPracticeQuestion = loadAssessmentValue(FRESH_PRACTICE_KEY,null);
if (!generatedPracticeQuestion?.generated || !Array.isArray(generatedPracticeQuestion.methods)) generatedPracticeQuestion=null;

async function api(endpoint, values = {}) {
  let response;
  try { response = await fetch(`/api/${endpoint}?${new URLSearchParams(values)}`); }
  catch (_) { throw new Error("Cannot reach Python. Keep the trainer running in your terminal, then try again."); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

function filteredQuestions() {
  const pool=practiceReviewIds?[...questions,...extraPracticeQuestions]:questions;
  return pool.filter(q => (!practiceReviewIds || practiceReviewIds.includes(q.id))
    && (topic === "All topics" || q.topic === topic) && (level === "All levels" || q.level === level));
}

function saveProgress() {
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));}
  catch (_) { /* Activities still work if browser storage is disabled. */ }
  updateScore();
}

function record(id) {
  if (!progress[id] || typeof progress[id] !== "object") progress[id] = {attempts:0,methodAttempts:0};
  return progress[id];
}

function totals() {
  const records = questions.map(q => progress[q.id] || {});
  const freshRecords=Object.entries(progress).filter(([id])=>id.startsWith('alg-v1:')).map(([,p])=>p || {});
  return {solved:records.filter(p => p.solved).length,
          generatedSolved:freshRecords.filter(p => p.solved).length,
          firstTry:[...records,...freshRecords].filter(p => p.solved && p.attempts === 1 && p.methodAttempts === 1 && p.methodCorrect && !p.assisted).length};
}

function updateScore() {
  if (currentTab !== "practice" || !$("#solved-count")) return;
  const score = totals();
  $("#solved-count").textContent = `${score.solved} / ${questions.length}`;
  $("#first-try-count").textContent = score.firstTry;
  $("#fresh-solved-count").textContent = score.generatedSolved;
  $("#practice-count").textContent = `${score.solved} of ${questions.length} solved`;
  $("#progress-fill").style.width = `${100 * score.solved / Math.max(1,questions.length)}%`;
}

async function showPractice() {
  const version = ++requestVersion;
  activity.innerHTML = `${head("06","Think like a contestant.","Choose a useful algebra strategy, then solve the problem. Other correct approaches may exist; these choices focus on efficient contest shortcuts.")}<p class="loading">Loading practice…</p>`;
  try {
    if (!questionsPromise) questionsPromise = api("questions").catch(error => {questionsPromise = null; throw error;});
    const data = await questionsPromise;
    if (version !== requestVersion) return;
    questions = data.questions;
    generatorSpecs = data.generators || [];
    renderContestShell();
  } catch (problem) {
    if (version === requestVersion) activity.innerHTML += `<div class="error" role="alert">${esc(problem.message)}</div>`;
  }
}

function renderPracticeShell() {
  const topicOptions = ["All topics",...new Set(questions.map(q=>q.topic))];
  $("#practice-content").innerHTML = `${practiceReviewIds ? `<div class="review-banner">Reviewing ${practiceReviewIds.length} missed assessment ${practiceReviewIds.length===1?'question':'questions'}. <button id="clear-review" class="secondary" type="button">Show full bank</button></div>` : ""}<div class="practice-bar"><label for="topic-filter">Topic<select id="topic-filter">${topicOptions.map(t=>`<option ${t===topic?"selected":""}>${esc(t)}</option>`).join("")}</select></label><label for="level-filter">Level<select id="level-filter">${["All levels","Warm-up","Contest","Stretch"].map(l=>`<option ${l===level?"selected":""}>${l}</option>`).join("")}</select></label><button id="random-problem" class="secondary" type="button">↻ Random problem</button><button id="generate-problem" class="primary" type="button">Generate a fresh problem</button><span id="practice-count" class="practice-count"></span></div><div class="progress-track" role="img" aria-label="Practice progress"><div id="progress-fill"></div></div><div class="practice-grid"><section id="question-card" class="card"></section><aside class="card practice-side"><h2>Your practice record</h2><div class="stat"><span>Authored problems solved</span><b id="solved-count">0</b></div><div class="stat"><span>Both steps right on first try</span><b id="first-try-count">0</b></div><div class="stat"><span>Fresh questions solved</span><b id="fresh-solved-count">0</b></div><p>Hints support learning. First-try credit means a correct strategy and answer with no hints or revealed solution.</p><p>Progress stays in this browser. Use reset before a different student starts.</p><button id="reset-progress" class="secondary" type="button">Reset progress</button></aside></div>`;
  $("#topic-filter").addEventListener("change",event=>{topic=event.target.value;practiceIndex=0;clearFreshPractice();showQuestion();});
  $("#level-filter").addEventListener("change",event=>{level=event.target.value;practiceIndex=0;clearFreshPractice();showQuestion();});
  $("#reset-progress").addEventListener("click",()=>{progress={};saveProgress();showQuestion();});
  $("#random-problem").addEventListener("click",()=>{
    clearFreshPractice();
    const count=filteredQuestions().length;
    if(count>1)practiceIndex=(practiceIndex+1+Math.floor(Math.random()*(count-1)))%count;
    showQuestion();
  });
  $("#generate-problem").addEventListener("click",generateNewPracticeQuestion);
  $("#clear-review")?.addEventListener("click",()=>{practiceReviewIds=null;practiceIndex=0;clearFreshPractice();renderPracticeShell();});
  showQuestion();
  updateScore();
}

function clearFreshPractice() {
  generatedPracticeQuestion=null;
  storeAssessmentValue(FRESH_PRACTICE_KEY,null);
}

async function generateNewPracticeQuestion() {
  const version=++requestVersion, button=$("#generate-problem");
  button.disabled=true;
  button.textContent='Generating…';
  try {
    const data=await api('generate',{topic,level});
    if(version!==requestVersion)return;
    generatedPracticeQuestion=data.question;
    storeAssessmentValue(FRESH_PRACTICE_KEY,generatedPracticeQuestion);
    practiceReviewIds=null;
    renderPracticeShell();
  } catch(problem) {
    if(version===requestVersion){
      const card=$("#question-card");
      card.insertAdjacentHTML('afterbegin',`<div class="error" role="alert">${esc(problem.message)}</div>`);
    }
  } finally {
    // Filter changes can invalidate the request without replacing this button.
    if(button.isConnected){button.disabled=false;button.textContent='Generate a fresh problem';}
  }
}

function showQuestion() {
  ++requestVersion;
  hintIndex = 0;
  const list = filteredQuestions(), card = $("#question-card");
  if (!list.length && !generatedPracticeQuestion) {card.innerHTML='<div class="empty-state">No questions match both filters. Choose a different topic or level.</div>';return;}
  practiceIndex = Math.max(0,Math.min(practiceIndex,list.length-1));
  const q = generatedPracticeQuestion || list[practiceIndex], prior = progress[q.id] || {};
  card.innerHTML = `${generatedPracticeQuestion?'<div class="review-banner">New numbers, ready to solve. <button id="back-to-bank" class="secondary" type="button">Back to authored problems</button></div>':''}<div class="question-top"><span class="badge">${esc(q.level)} · ${esc(q.topic)}</span><span class="question-index">${generatedPracticeQuestion?'Freshly generated':`${practiceIndex+1} / ${list.length}`}${prior.solved ? " · solved" : ""}</span></div><span class="eyebrow">${esc(q.title)}</span><p class="question-prompt">${esc(q.prompt)}</p><div class="stage-label">01 · CHOOSE THE FASTEST APPROACH</div><div class="methods" role="group" aria-label="Choose a method">${q.methods.map((m,i)=>`<button class="method" data-method="${i}" type="button"><span>${"ABCD"[i]}</span>${esc(m)}</button>`).join("")}</div><div id="method-feedback" aria-live="polite"></div><div class="stage-label">02 · GIVE YOUR ANSWER</div><form id="answer-form"><label class="field" for="practice-answer">Your answer (${esc(q.unit)})</label><div class="answer-row"><input id="practice-answer" name="value" type="number" min="-1000000000" max="1000000000" step="1" placeholder="Choose an approach first" required disabled><button class="primary" type="submit" disabled>Check answer</button></div></form><div id="answer-feedback" aria-live="polite"></div><div id="practice-error" class="error" role="alert"></div><div class="practice-actions"><button id="hint-button" class="secondary" type="button">Get a hint (1/3)</button><button id="solution-button" class="secondary" type="button">Show worked solution</button></div><div id="hints" aria-live="polite"></div><div id="solution" aria-live="polite"></div><div class="question-nav"><button id="previous-question" class="secondary" type="button" ${generatedPracticeQuestion||practiceIndex===0?"disabled":""}>← Previous</button><button id="next-question" class="secondary" type="button" ${!generatedPracticeQuestion&&practiceIndex===list.length-1?"disabled":""}>${generatedPracticeQuestion?"Generate another →":"Next problem →"}</button></div>`;
  $(".methods").addEventListener("click",event=>{const b=event.target.closest("[data-method]");if(b)checkMethod(q,Number(b.dataset.method));});
  $("#answer-form").addEventListener("submit",event=>{event.preventDefault();checkAnswer(q);});
  $("#hint-button").addEventListener("click",()=>getHint(q));
  $("#solution-button").addEventListener("click",()=>showSolution(q));
  $("#back-to-bank")?.addEventListener("click",()=>{clearFreshPractice();showQuestion();});
  $("#previous-question").addEventListener("click",()=>{practiceIndex--;showQuestion();});
  $("#next-question").addEventListener("click",()=>{if(generatedPracticeQuestion)generateNewPracticeQuestion();else{practiceIndex++;showQuestion();}});
}

async function practiceAction(q, action, value) {
  $("#practice-error").textContent = "";
  return api("practice",{id:q.id,action,...(value===undefined?{}:{value})});
}

async function checkMethod(q, choice) {
  const version = requestVersion;
  const buttons = Array.from(activity.querySelectorAll("[data-method]"));
  buttons.forEach(b=>{b.disabled=true;});
  try {
    const feedback = await practiceAction(q,"method",choice);
    if (version !== requestVersion) return;
    const p = record(q.id);
    if (!p.methodCorrect) p.methodAttempts=(p.methodAttempts||0)+1;
    if (feedback.correct) p.methodCorrect=true;
    buttons.forEach((b,i)=>{b.classList.toggle("selected",i===choice&&feedback.correct);b.classList.toggle("weak",i===choice&&!feedback.correct);b.setAttribute("aria-pressed",i===choice);});
    $("#method-feedback").innerHTML=`<div class="feedback ${feedback.correct?"":"retry"}"><b>${feedback.correct?"Good shortcut. ":"Consider a different shortcut. "}</b>${esc(feedback.explanation)}</div>`;
    $("#practice-answer").disabled=false;
    $("#practice-answer").placeholder="Enter an integer";
    $("#answer-form button").disabled=false;
    saveProgress();
  } catch(problem) {if(version===requestVersion)$("#practice-error").textContent=problem.message;}
  finally {if(version===requestVersion)buttons.forEach(b=>{b.disabled=false;});}
}

async function checkAnswer(q) {
  const version=requestVersion, button=$("#answer-form button");
  button.disabled=true;
  try {
    const feedback=await practiceAction(q,"answer",$("#practice-answer").value);
    if(version!==requestVersion)return;
    const p=record(q.id);
    if(!p.solved&&!p.revealed)p.attempts=(p.attempts||0)+1;
    if(feedback.correct&&!p.revealed)p.solved=true;
    $("#answer-feedback").innerHTML=`<div class="feedback ${feedback.correct?"":"retry"}"><b>${feedback.correct?"Correct! ":"Not quite. "}</b>${esc(feedback.explanation)}</div>`;
    saveProgress();
  } catch(problem) {if(version===requestVersion)$("#practice-error").textContent=problem.message;}
  finally {if(version===requestVersion)button.disabled=false;}
}

async function getHint(q) {
  if(hintIndex>=3)return;
  const version=requestVersion, button=$("#hint-button");
  button.disabled=true;
  try {
    const feedback=await practiceAction(q,"hint",hintIndex);
    if(version!==requestVersion)return;
    if(!record(q.id).solved)record(q.id).assisted=true;
    hintIndex++;
    $("#hints").insertAdjacentHTML("beforeend",`<div class="hint"><b>Hint ${feedback.number}:</b> ${esc(feedback.hint)}</div>`);
    button.textContent=hintIndex===3?"All 3 hints shown":`Get a hint (${hintIndex+1}/3)`;
    saveProgress();
  } catch(problem) {if(version===requestVersion)$("#practice-error").textContent=problem.message;}
  finally {if(version===requestVersion)button.disabled=hintIndex>=3;}
}

async function showSolution(q) {
  const version=requestVersion, button=$("#solution-button");
  button.disabled=true;
  try {
    const feedback=await practiceAction(q,"solution");
    if(version!==requestVersion)return;
    const p=record(q.id);
    if(!p.solved){p.revealed=true;p.assisted=true;}
    $("#solution").innerHTML=`<div class="solution-box"><strong>Answer: ${feedback.answer}</strong>${esc(feedback.explanation)}<p><b>Recommended approach:</b> ${esc(feedback.method)}</p></div>`;
    button.textContent="Solution shown";
    saveProgress();
  } catch(problem) {if(version===requestVersion){$("#practice-error").textContent=problem.message;button.disabled=false;}}
}

