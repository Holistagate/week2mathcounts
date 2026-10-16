"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const fmt = value => Number(value).toLocaleString("en-US");
const activity = $("#activity");
let currentTab = "overview", requestVersion = 0, animation = null;
const formMemory = {};
const STORAGE_KEY = "mathcounts-combined-progress-v1";
let progress = {};
try { progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
catch (_) { progress = {}; }
if (!progress || typeof progress !== "object" || Array.isArray(progress)) progress = {};
let questions = [], practiceIndex = 0, topic = "All topics", level = "All levels", hintIndex = 0;
let practiceWeek = "all";
let questionsPromise = null;
let generatorSpecs = [], extraPracticeQuestions = [];
const FRESH_PRACTICE_KEY = "mathcounts-combined-fresh-practice-v1";
let generatedPracticeQuestion = loadAssessmentValue(FRESH_PRACTICE_KEY,null);
if (!generatedPracticeQuestion?.generated || !Array.isArray(generatedPracticeQuestion.methods)) generatedPracticeQuestion=null;

const configs = {
  remainder: {
    number: "01", title: "What's left over?", intro: "Make equal groups. The remainder is what you have left after every full group is counted.",
    fields: [["a", "Number (a)", 17], ["n", "Group size / modulus (n)", 5, 1, 120]],
    button: "Visualize remainder", presets: [["17 mod 5", {a:17,n:5}], ["−17 mod 5", {a:-17,n:5}], ["24 mod 6", {a:24,n:6}]],
    takeaway: "Every integer has exactly one remainder r with 0 ≤ r < n. Write a = qn + r.",
    challenge: "Without calculating, what happens to the remainder if you add n to a?",
    challengeAnswer: "It stays the same: adding n adds one full group. Try 17 and 22 modulo 5."
  },
  classes: {
    number: "02", title: "Different numbers. Same class.", intro: "Two numbers are congruent modulo n when they leave the same remainder. Their difference is a multiple of n.",
    fields: [["a", "First number (a)", 17], ["b", "Compare with (b)", 2], ["n", "Modulus (n)", 5, 1, 120]],
    button: "Compare the classes", presets: [["17 ≡ 2 (mod 5)",{a:17,b:2,n:5}], ["−8 ≡ 2 (mod 5)",{a:-8,b:2,n:5}], ["17 vs. 3",{a:17,b:3,n:5}]],
    takeaway: "a ≡ b (mod n) means n divides a − b. You can replace a number with any member of its class.",
    challenge: "Why can 48 be replaced with −1 in a calculation modulo 7?",
    challengeAnswer: "48 − (−1) = 49, a multiple of 7. Both have least nonnegative remainder 6."
  },
  clock: {
    number: "03", title: "Take arithmetic around the clock.", intro: "Count forward to add, backward to subtract, and make repeated hops to multiply. Every full turn brings you back.",
    fields: [["a", "First number (a)", 9, -1000000, 1000000], ["b", "Second number (b)", 5, -1000000, 1000000], ["n", "Clock positions (n)", 12, 1, 120], ["operation", "Operation", "add", "select", [["add","Add: a + b"],["subtract","Subtract: a − b"],["multiply","Multiply: a × b"]]]],
    button: "Set the clock", presets: [["9 + 5 mod 12",{a:9,b:5,n:12,operation:"add"}], ["2 − 5 mod 7",{a:2,b:5,n:7,operation:"subtract"}], ["3 × 4 mod 7",{a:3,b:4,n:7,operation:"multiply"}]],
    takeaway: "Reduce the numbers before you add, subtract, or multiply. The final remainder stays the same.",
    challenge: "Why is the top labeled 0 on a modular clock?",
    challengeAnswer: "Residues are 0 through n − 1. On an ordinary 12-hour clock, the hour labeled 12 represents residue 0."
  },
  powers: {
    number: "04", title: "Find the pattern in a huge power.", intro: "Multiply by the base, reduce, repeat. Once a remainder returns, the following remainders repeat in the same order.",
    fields: [["base", "Base", 2], ["n", "Modulus (n)", 7, 1, 120], ["exponent", "Power to evaluate", 100, 0, 1000000000]],
    button: "Detect the cycle", presets: [["2ᵏ mod 7",{base:2,n:7,exponent:100}], ["7ᵏ mod 10",{base:7,n:10,exponent:2026}], ["2ᵏ mod 8",{base:2,n:8,exponent:50}]],
    takeaway: "Reduce an exponent using the cycle length, not the modulus. If there is a transient prefix, account for it first.",
    challenge: "For 2ᵏ modulo 7, why does an exponent divisible by 3 give remainder 1?",
    challengeAnswer: "The cycle is 2, 4, 1, starting at exponent 1. A multiple of 3 lands on the third entry, not on an exponent-0 entry."
  },
  congruence: {
    number: "05", title: "Find every x that works.", intro: "Solve ax ≡ b (mod n). First check the greatest common divisor, then use an inverse when one exists.",
    fields: [["a", "Coefficient (a)", 3], ["b", "Right side (b)", 5], ["n", "Modulus (n)", 7, 1, 120]],
    button: "Solve the congruence", presets: [["3x ≡ 5 (mod 7)",{a:3,b:5,n:7}], ["4x ≡ 6 (mod 10)",{a:4,b:6,n:10}], ["4x ≡ 5 (mod 10)",{a:4,b:5,n:10}]],
    takeaway: "Let d = gcd(a, n). Solutions exist exactly when d divides b. If so, there are d distinct solution classes modulo n.",
    challenge: "Can you always divide both sides of a congruence by a coefficient?",
    challengeAnswer: "No. An inverse exists only when the coefficient and modulus are relatively prime. When dividing out a common gcd, divide the modulus too."
  }
};

async function api(endpoint, values = {}) {
  let response;
  try { response = await fetch(`/api/${endpoint}?${new URLSearchParams(values)}`); }
  catch (_) { throw new Error("Cannot reach Python. Keep the trainer running in your terminal, then try again."); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

function openPractice(week="all", chosenTopic="All topics") {
  practiceWeek=week;topic=chosenTopic;level="All levels";
  practiceReviewIds=null;practiceIndex=0;clearFreshPractice();
  practiceMode="guided";storeAssessmentValue("mathcounts-combined-practice-mode",practiceMode);
  if(location.hash==="#practice")switchTab("practice");else location.hash="practice";
}

function inputField(field) {
  const [name,label,value,low = -1000000000,high = 1000000000] = field;
  if (low === "select") return `<label class="field" for="field-${name}">${label}<select id="field-${name}" name="${name}">${high.map(([id,text]) => `<option value="${id}" ${id === value ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
  const note = name === "n" ? "1–120; smaller moduli are easier to see." : name === "exponent" ? "0–1,000,000,000; no huge power is expanded." : "Positive, zero, or negative integers.";
  return `<label class="field" for="field-${name}">${label}<input id="field-${name}" name="${name}" type="number" step="1" min="${low}" max="${high}" value="${value}" required><small>${note}</small></label>`;
}

function head(number, title, intro) {
  return `<div class="activity-head"><span class="eyebrow">${currentTab === "practice" ? "BOTH WEEKS · CONTEST PRACTICE" : currentTab in configs ? `WEEK 1 · ACTIVITY ${number} / 05` : currentTab in lessons ? `WEEK 2 · ACTIVITY ${number} / 04` : currentTab === "algebra-overview" ? "WEEK 2 · LESSON PLAN" : "WEEKS 1 + 2 · MATHCOUNTS"}</span><h1 tabindex="-1">${esc(title)}</h1><p class="intro">${esc(intro)}</p></div>`;
}

function showExplorer(tab) {
  const c = configs[tab];
  activity.innerHTML = `${head(c.number,c.title,c.intro)}<div class="grid"><section class="card form-card"><h2>Try your own numbers</h2><form id="explorer-form">${c.fields.map(inputField).join("")}<button class="primary" type="submit">${c.button}</button></form><div id="form-error" class="error" role="alert"></div><h3>Start with an example</h3><div class="presets">${c.presets.map(([label],index) => `<button type="button" data-preset="${index}">${label}</button>`).join("")}</div><p class="caption">Predict the answer first. Then check what the picture tells you.</p></section><section id="result" class="card result-card" aria-live="polite" aria-atomic="true"><p class="loading">Calculating…</p></section></div><div class="takeaway"><strong>KEEP THIS IDEA</strong>${c.takeaway}</div><div class="try-card"><strong>Discuss with a partner:</strong> ${c.challenge}<details><summary>Check the explanation</summary><p>${c.challengeAnswer}</p></details></div>`;
  const form = $("#explorer-form");
  if (formMemory[tab]) Object.entries(formMemory[tab]).forEach(([key,value]) => {form.elements[key].value = value;});
  form.addEventListener("submit", event => {event.preventDefault(); calculate(tab, form);});
  $(".presets").addEventListener("click", event => {
    const button = event.target.closest("[data-preset]");
    if (!button) return;
    Object.entries(c.presets[Number(button.dataset.preset)][1]).forEach(([key,value]) => {form.elements[key].value = value;});
    form.requestSubmit();
  });
  calculate(tab, form);
}

async function calculate(tab, form) {
  stopAnimation();
  const version = ++requestVersion;
  const values = Object.fromEntries(new FormData(form));
  formMemory[tab] = values;
  const result = $("#result"), error = $("#form-error");
  error.textContent = "";
  result.setAttribute("aria-busy", "true");
  try {
    const data = await api(tab, values);
    if (version !== requestVersion) return;
    result.innerHTML = renderers[tab](data);
    if (tab === "clock") $("#animate-clock").addEventListener("click", () => animateClock(data));
  } catch (problem) {
    if (version !== requestVersion) return;
    error.textContent = problem.message;
    result.innerHTML = `<p class="explanation">Update the numbers and calculate again.</p>`;
  } finally {
    if (version === requestVersion) result.removeAttribute("aria-busy");
  }
}

function numberLine(d) {
  const x = 70 + 400 * d.remainder / d.n;
  const tickCount = Math.min(d.n, 20);
  let ticks = "";
  for (let i = 0; i <= tickCount; i++) {
    const at = 70 + 400 * i / tickCount;
    ticks += `<line x1="${at}" y1="72" x2="${at}" y2="82" stroke="#b8c6ba"/>`;
  }
  return `<svg class="number-line" viewBox="0 0 540 140" role="img" aria-label="${d.a} is ${d.remainder} units after ${d.lower_multiple}, between consecutive multiples of ${d.n}."><line x1="45" y1="77" x2="495" y2="77" stroke="#b7c7b8" stroke-width="2"/>${ticks}<line x1="70" y1="77" x2="${x}" y2="77" stroke="#c66328" stroke-width="5"/><circle cx="${x}" cy="77" r="6" fill="#c66328"/><text x="${x}" y="51" text-anchor="middle" fill="#a94b1c" font-size="16" font-weight="700">${fmt(d.a)}</text><text x="70" y="107" text-anchor="middle" fill="#56696b" font-size="12">${fmt(d.lower_multiple)}</text><text x="470" y="107" text-anchor="middle" fill="#56696b" font-size="12">${fmt(d.upper_multiple)}</text><text x="270" y="132" text-anchor="middle" fill="#56696b" font-size="10">Consecutive multiples of ${d.n} · orange distance = ${d.remainder}</text></svg>`;
}

function groupBox(count, leftover = false) {
  return `<div class="group ${leftover ? "leftover" : ""}"><div class="dots" aria-hidden="true">${Array.from({length:Math.min(count,20)}, () => '<span class="dot"></span>').join("")}</div><span class="count">${count} ${leftover ? "left over" : "in a group"}</span></div>`;
}

function renderRemainder(d) {
  const groups = d.quotient >= 0 ? `<div class="groups" aria-label="${d.quotient} full groups of ${d.n} and ${d.remainder} left over">${Array.from({length:Math.min(d.quotient,5)}, () => groupBox(d.n)).join("")}${d.quotient > 5 ? `<span class="more-groups">+ ${fmt(d.quotient - 5)} more groups</span>` : ""}${groupBox(d.remainder,true)}</div>${d.n > 20 ? '<p class="caption">Boxes preview at most 20 dots; the label gives the exact count.</p>' : ""}` : '<p class="caption">For a negative number, locate the multiple of n just below it, then move forward to a.</p>';
  return `<span class="result-label">THE REMAINDER</span><div class="equation">${fmt(d.a)} mod ${d.n} = <strong>${d.remainder}</strong></div><p class="explanation">${fmt(d.a)} = (${fmt(d.quotient)}) × ${d.n} + ${d.remainder}<br>The remainder fits the rule: 0 ≤ ${d.remainder} < ${d.n}.</p>${groups}<hr class="divider">${numberLine(d)}<p class="caption">${d.remainder === 0 ? "Exactly on a multiple. Nothing is left over." : `The next full group would require ${d.n - d.remainder} more.`}</p>`;
}

function renderClasses(d) {
  return `<span class="badge ${d.equivalent ? "" : "warn"}">${d.equivalent ? "SAME CONGRUENCE CLASS" : "DIFFERENT CLASSES"}</span><div class="equation">${fmt(d.a)} ${d.equivalent ? "≡" : "≢"} ${fmt(d.b)} (mod ${d.n})</div><p class="explanation">${fmt(d.a)} has remainder ${d.remainder}. ${fmt(d.b)} has remainder ${d.b_remainder}.<br>The difference is ${fmt(d.a)} − (${fmt(d.b)}) = ${fmt(d.difference)}, which ${d.equivalent ? "is" : "is not"} a multiple of ${d.n}.</p><h3>A few members of ${fmt(d.a)}'s class</h3><div class="class-strip">${d.members.map(v => `<span class="class-member ${v === d.a ? "focus" : ""}">${fmt(v)}</span>`).join("")}</div><p class="caption">Keep adding or subtracting ${d.n}. This class goes on in both directions.</p><details ${d.n <= 12 ? "open" : ""}><summary>All ${d.n} congruence ${d.n === 1 ? "class" : "classes"}</summary><div class="buckets">${d.classes.map(c => `<div class="bucket ${c.residue === d.remainder ? "selected" : ""}"><b>${c.residue}</b><span>…, ${c.members.join(", ")}, …</span></div>`).join("")}</div></details>`;
}

function clockPoint(residue, n, radius = 124) {
  const angle = 2 * Math.PI * residue / n - Math.PI / 2;
  return [170 + radius * Math.cos(angle), 170 + radius * Math.sin(angle)];
}

function clockSvg(d) {
  let marks = "";
  for (let i = 0; i < d.n; i++) {
    const [x,y] = clockPoint(i,d.n), [tx,ty] = clockPoint(i,d.n,146);
    const shown = d.n <= 24 || i === d.start || i === d.result || i % Math.ceil(d.n / 20) === 0;
    const highlight = i === d.result, initial = i === d.start;
    marks += `<circle cx="${x}" cy="${y}" r="${highlight || initial ? 7 : 3}" fill="${highlight ? "#c66328" : initial ? "#08695c" : "#bacabb"}"/>`;
    if (shown) marks += `<text x="${tx}" y="${ty+4}" text-anchor="middle" fill="${highlight ? "#b5531e" : "#536861"}" font-size="${d.n <= 24 ? 13 : 10}" font-weight="${highlight ? 700 : 400}">${i}</text>`;
  }
  const [hx,hy] = clockPoint(d.result,d.n,105);
  return `<svg id="clock-picture" class="clock-svg" viewBox="0 0 340 340" role="img" aria-label="A clock with ${d.n} positions, labeled 0 through ${d.n - 1}. The result is ${d.result}."><circle cx="170" cy="170" r="124" fill="#f6f9f2" stroke="#d7e2d3" stroke-width="2"/>${marks}<line id="clock-hand" x1="170" y1="170" x2="${hx}" y2="${hy}" stroke="#c66328" stroke-width="3" stroke-linecap="round"/><circle cx="170" cy="170" r="7" fill="#c66328"/><rect x="140" y="199" width="60" height="46" rx="10" fill="#e5eee0"/><text id="clock-value" x="170" y="229" text-anchor="middle" fill="#08695c" font-size="26" font-weight="700">${d.result}</text></svg>`;
}

function clockMovement(d) {
  if (d.operation === "multiply") return {start:0,steps:d.operand,direction:1,hop:d.start};
  const signed = d.operation === "add" ? d.b : -d.b;
  return {start:d.start,steps:Math.abs(signed) % d.n,direction:Math.sign(signed),hop:1};
}

function renderClock(d) {
  const symbols = {add:"+",subtract:"−",multiply:"×"};
  const signed = d.operation === "add" ? d.b : -d.b;
  const move = clockMovement(d);
  const turns = Math.floor(Math.abs(signed) / d.n);
  const explanation = d.operation === "multiply" ? `Reduce both factors: ${fmt(d.a)} ≡ ${d.start} and ${fmt(d.b)} ≡ ${d.operand} (mod ${d.n}). Start at 0 and take ${d.operand} hops of ${d.start}.` : `Start at ${d.start}. Move ${move.steps} ${signed < 0 ? "counterclockwise" : "clockwise"} ${move.steps === 1 ? "step" : "steps"}${turns ? ` after removing ${fmt(turns)} full ${turns === 1 ? "turn" : "turns"}` : ""}.`;
  return `<span class="result-label">WRAP AROUND MODULO ${d.n}</span><div class="equation">(${fmt(d.a)} ${symbols[d.operation]} ${d.b < 0 ? `(${fmt(d.b)})` : fmt(d.b)}) mod ${d.n} = <strong>${d.result}</strong></div><div class="clock-layout">${clockSvg(d)}<div class="clock-stats"><div class="clock-stat">Modulus<strong>${d.n}</strong></div><div class="clock-stat">Unreduced result<strong>${fmt(d.raw)}</strong></div><div class="clock-stat">Remainder<strong>${d.result}</strong></div></div></div><div class="legend"><span>First number's residue</span><span class="orange">Result</span></div><p class="explanation">${explanation}</p><button id="animate-clock" class="secondary" type="button">▶ Animate the hops</button><p id="animation-status" class="caption" aria-live="polite">A modular clock puts 0 at the top.</p>`;
}

function stopAnimation() {
  if (animation !== null) clearInterval(animation);
  animation = null;
}

function animateClock(d) {
  stopAnimation();
  const move = clockMovement(d), button = $("#animate-clock");
  let step = 0;
  const paint = residue => {
    const [x,y] = clockPoint(residue,d.n,105);
    $("#clock-hand").setAttribute("x2",x);
    $("#clock-hand").setAttribute("y2",y);
    $("#clock-value").textContent = residue;
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !move.steps) {
    paint(d.result);
    $("#animation-status").textContent = `The final remainder is ${d.result}. ${!move.steps ? "Full turns do not change the position." : "Animation is reduced by your browser preference."}`;
    return;
  }
  button.disabled = true;
  paint(move.start);
  $("#animation-status").textContent = `Start at ${move.start}; take ${move.steps} hops of ${move.hop}.`;
  animation = setInterval(() => {
    step++;
    paint(((move.start + move.direction * move.hop * step) % d.n + d.n) % d.n);
    if (step >= move.steps) {
      stopAnimation();
      button.disabled = false;
      $("#animation-status").textContent = `${move.steps} hops complete. The final remainder is ${d.result}.`;
    }
  },Math.max(25,Math.min(400,2200/move.steps)));
}

function powerExpression(base, exponent) {return `${base < 0 ? `(${fmt(base)})` : fmt(base)}<sup>${fmt(exponent)}</sup>`;}

function renderPowers(d) {
  const tiles = d.residues.map((r,i) => `<div class="power-tile ${i + 1 < d.cycle_start ? "prefix" : ""}"><small>k = ${i+1}</small><b>${r}</b></div>`).join("");
  let mapping;
  if (d.exponent === 0) mapping = `A nonzero base to exponent 0 is 1. Reduce 1 modulo ${d.n} to get ${d.result}.`;
  else if (d.exponent < d.cycle_start) mapping = `Exponent ${d.exponent} is in the transient prefix. Read that term directly: the remainder is ${d.result}.`;
  else mapping = `Map exponent ${fmt(d.exponent)} to ${d.cycle_start} + ((${fmt(d.exponent)} − ${d.cycle_start}) mod ${d.period}) = ${d.reduced_exponent}. That term has remainder ${d.result}.`;
  return `<span class="result-label">AUTOMATIC CYCLE DETECTION</span><div class="equation">${powerExpression(d.base,d.exponent)} mod ${d.n} = <strong>${d.result}</strong></div><div class="stats"><div class="stat"><span>Cycle length</span><b>${d.period}</b></div><div class="stat"><span>Cycle starts at k</span><b>${d.cycle_start}</b></div><div class="stat"><span>Transient terms</span><b>${d.transient.length}</b></div></div><p class="caption">Each tile shows base<sup>k</sup> mod ${d.n}. Multiply a remainder by ${fmt(d.base)}, then reduce again.</p><div class="sequence">${tiles}<div class="power-tile repeat"><small>k = ${d.repeated_exponent} ↻</small><b>${d.repeated_residue}</b></div></div><div class="legend"><span>Repeating cycle</span><span class="orange">Transient prefix</span></div><div class="math-note">${mapping}</div><p class="explanation">${d.transient.length ? `The first ${d.transient.length} ${d.transient.length === 1 ? "term does" : "terms do"} not belong to the repeating cycle. ` : "The cycle starts with the first power. "}At k = ${d.repeated_exponent}, remainder ${d.repeated_residue} returns. Because the next step always multiplies by the same base, the cycle must repeat.</p>`;
}

function renderCongruence(d) {
  const equation = `${fmt(d.a)}x ≡ ${fmt(d.b)} (mod ${d.n})`;
  let steps = [`gcd(${fmt(d.a)}, ${d.n}) = ${d.gcd}.`];
  if (!d.solvable) steps.push(`${d.gcd} does not divide ${fmt(d.b)}, so there are no solutions.`);
  else {
    steps.push(`${d.gcd} divides ${fmt(d.b)}, so there ${d.gcd === 1 ? "is 1 solution class" : `are ${d.gcd} solution classes`} modulo ${d.n}.`);
    if (d.reduced_n === 1) steps.push("The reduced modulus is 1. Every integer x works in the original congruence.");
    else {
      if (d.gcd > 1) steps.push(`Divide the coefficient, right side, and modulus by ${d.gcd}: ${fmt(d.reduced_a)}x ≡ ${fmt(d.reduced_b)} (mod ${d.reduced_n}).`);
      steps.push(`The inverse of ${fmt(d.reduced_a)} modulo ${d.reduced_n} is ${d.inverse}: ${fmt(d.reduced_a)} × ${d.inverse} ≡ 1 (mod ${d.reduced_n}).`);
      steps.push(`Multiply both sides by ${d.inverse}: x ≡ ${d.solutions[0]} (mod ${d.reduced_n}).`);
    }
  }
  const solutionList = d.solutions.length <= 12 ? d.solutions.join(", ") : `${d.solutions.slice(0,5).join(", ")}, …, ${d.solutions[d.solutions.length-1]}`;
  const grid = Array.from({length:d.n},(_,x) => `<span class="residue ${d.solutions.includes(x) ? "solution" : ""}" ${d.solutions.includes(x) ? 'aria-label="' + x + ', solution"' : ""}>${x}</span>`).join("");
  return `<span class="badge ${d.solvable ? "" : "warn"}">${d.solvable ? `${d.gcd} SOLUTION ${d.gcd === 1 ? "CLASS" : "CLASSES"}` : "NO SOLUTIONS"}</span><div class="equation">${equation}</div><ol class="steps">${steps.map(s => `<li>${s}</li>`).join("")}</ol>${d.solvable ? `<div class="math-note"><b>All integer solutions:</b> x ≡ ${solutionList} (mod ${d.n}).<br>Add any multiple of ${d.n} to a highlighted value.</div>` : '<div class="math-note">An inverse cannot fix a congruence that fails the gcd test.</div>'}<h3>Test every residue: 0 through ${d.n-1}</h3><div class="residues">${grid}</div><p class="caption">${d.solvable ? `Highlighted values satisfy the original equation. Check x = ${d.solutions[0]}: ${fmt(d.a)} × ${d.solutions[0]} ≡ ${((d.b % d.n) + d.n) % d.n} (mod ${d.n}).` : "No residue satisfies the original equation."}</p>`;
}

const renderers = {remainder:renderRemainder,classes:renderClasses,clock:renderClock,powers:renderPowers,congruence:renderCongruence};

function filteredQuestions() {
  const pool=practiceReviewIds?[...questions,...extraPracticeQuestions]:questions;
  return pool.filter(q => (!practiceReviewIds || practiceReviewIds.includes(q.id))
    && weekMatches(q,practiceWeek) && (topic === "All topics" || q.topic === topic) && (level === "All levels" || q.level === level));
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
  const freshRecords=Object.entries(progress).filter(([id])=>(id.startsWith('gen-v1:') || id.startsWith('alg-v1:'))).map(([,p])=>p || {});
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
  activity.innerHTML = `${head("06","Think like a contestant.","Choose an efficient number-theory or algebra approach, then solve the problem. Other correct approaches may exist; these choices focus on efficient contest shortcuts.")}<p class="loading">Loading practice…</p>`;
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
  const topicOptions = ["All topics",...new Set(questions.filter(q=>weekMatches(q,practiceWeek)).map(q=>q.topic))];
  $("#practice-content").innerHTML = `${practiceReviewIds ? `<div class="review-banner">Reviewing ${practiceReviewIds.length} missed assessment ${practiceReviewIds.length===1?'question':'questions'}. <button id="clear-review" class="secondary" type="button">Show full bank</button></div>` : ""}<div class="practice-bar"><label for="week-filter">Week<select id="week-filter">${WEEK_OPTIONS.map(([value,label])=>`<option value="${value}" ${value===practiceWeek?"selected":""}>${label}</option>`).join("")}</select></label><label for="topic-filter">Topic<select id="topic-filter">${topicOptions.map(t=>`<option ${t===topic?"selected":""}>${esc(t)}</option>`).join("")}</select></label><label for="level-filter">Level<select id="level-filter">${["All levels","Warm-up","Contest","Stretch"].map(l=>`<option ${l===level?"selected":""}>${l}</option>`).join("")}</select></label><button id="random-problem" class="secondary" type="button">↻ Random problem</button><button id="generate-problem" class="primary" type="button">Generate a fresh problem</button><span id="practice-count" class="practice-count"></span></div><div class="progress-track" role="img" aria-label="Practice progress"><div id="progress-fill"></div></div><div class="practice-grid"><section id="question-card" class="card"></section><aside class="card practice-side"><h2>Your practice record</h2><div class="stat"><span>Authored problems solved</span><b id="solved-count">0</b></div><div class="stat"><span>Both steps right on first try</span><b id="first-try-count">0</b></div><div class="stat"><span>Fresh questions solved</span><b id="fresh-solved-count">0</b></div><p>Hints support learning. First-try credit means a correct strategy and answer with no hints or revealed solution.</p><p>Progress stays in this browser. Use reset before a different student starts.</p><button id="reset-progress" class="secondary" type="button">Reset progress</button></aside></div>`;
  $("#week-filter").addEventListener("change",event=>{practiceWeek=event.target.value;topic="All topics";practiceIndex=0;practiceReviewIds=null;clearFreshPractice();renderPracticeShell();});
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
    const data=await api('generate',{topic,level,week:practiceWeek});
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
  card.innerHTML = `${generatedPracticeQuestion?'<div class="review-banner">New numbers, ready to solve. <button id="back-to-bank" class="secondary" type="button">Back to authored problems</button></div>':''}<div class="question-top"><span class="badge">Week ${q.week} · ${esc(q.level)} · ${esc(q.topic)}</span><span class="question-index">${generatedPracticeQuestion?'Freshly generated':`${practiceIndex+1} / ${list.length}`}${prior.solved ? " · solved" : ""}</span></div><span class="eyebrow">${esc(q.title)}</span><p class="question-prompt">${esc(q.prompt)}</p><div class="stage-label">01 · CHOOSE THE FASTEST APPROACH</div><div class="methods" role="group" aria-label="Choose a method">${q.methods.map((m,i)=>`<button class="method" data-method="${i}" type="button"><span>${"ABCD"[i]}</span>${esc(m)}</button>`).join("")}</div><div id="method-feedback" aria-live="polite"></div><div class="stage-label">02 · GIVE YOUR ANSWER</div><form id="answer-form"><label class="field" for="practice-answer">Your answer (${esc(q.unit)})</label><div class="answer-row"><input id="practice-answer" name="value" type="number" min="-1000000000" max="1000000000" step="1" placeholder="Choose an approach first" required disabled><button class="primary" type="submit" disabled>Check answer</button></div></form><div id="answer-feedback" aria-live="polite"></div><div id="practice-error" class="error" role="alert"></div><div class="practice-actions"><button id="hint-button" class="secondary" type="button">Get a hint (1/3)</button><button id="solution-button" class="secondary" type="button">Show worked solution</button></div><div id="hints" aria-live="polite"></div><div id="solution" aria-live="polite"></div><div class="question-nav"><button id="previous-question" class="secondary" type="button" ${generatedPracticeQuestion||practiceIndex===0?"disabled":""}>← Previous</button><button id="next-question" class="secondary" type="button" ${!generatedPracticeQuestion&&practiceIndex===list.length-1?"disabled":""}>${generatedPracticeQuestion?"Generate another →":"Next problem →"}</button></div>`;
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

