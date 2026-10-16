"use strict";

function overview() {
  activity.innerHTML = `${head("", "Two weeks. One place to practice.", "Explore number theory and algebra, then bring both sets of shortcuts into the same contest practice.")}
    <section class="card course-hero"><span class="eyebrow">YOUR MATHCOUNTS TOOLKIT</span><h2>Build the idea. Find the pattern. Solve efficiently.</h2><p>Start with Week 1 remainders and modular arithmetic, continue into Week 2 algebra, or jump straight to a mixed assessment. Every explorer, lesson, hint, and worked solution is here.</p><div class="course-stats"><div><b>90</b><span>original practice problems</span></div><div><b>30</b><span>fresh-question templates</span></div><div><b>10</b><span>practice topics</span></div></div><a class="primary action-link" href="#remainder">Start Week 1 →</a><button class="secondary action-link" data-practice-week="all" type="button">Practice both weeks</button></section>
    <div class="course-weeks"><section class="card course-week week-one"><span class="eyebrow">WEEK 1</span><h2>Number theory</h2><p>Use small remainders to make large calculations manageable.</p><ul><li>Remainders and congruence classes</li><li>Addition, subtraction, and multiplication on a modular clock</li><li>Power cycles and units digits</li><li>Solving congruences and counting possibilities</li></ul><p class="caption">60 authored problems · 18 fresh-question templates</p><a class="primary action-link" href="#remainder">Explore number theory →</a><button class="secondary" data-practice-week="1" type="button">Practice Week 1</button></section>
    <section class="card course-week week-two"><span class="eyebrow">WEEK 2</span><h2>Algebra</h2><p>Balance equations and recognize structure before expanding.</p><ul><li>Distribution, signs, and equations</li><li>Substitution and elimination in systems</li><li>Quadratics, factoring, and exact roots</li><li>Squares, cubes, and algebraic identities</li></ul><p class="caption">30 authored problems · 12 fresh-question templates</p><a class="primary action-link" href="#algebra-overview">Explore algebra →</a><button class="secondary" data-practice-week="2" type="button">Practice Week 2</button></section></div>
    <section class="card course-plan"><h2>A suggested 45-minute Week 1 lesson</h2><ol class="schedule"><li><b>0–8 min</b><span>Remainders and congruence classes, including a negative input.</span></li><li><b>8–15 min</b><span>Modular clock: explain why a full turn changes nothing.</span></li><li><b>15–25 min</b><span>Power cycles: compare 2ᵏ mod 7 with 2ᵏ mod 8.</span></li><li><b>25–33 min</b><span>Congruences with one, several, and no solutions.</span></li><li><b>33–45 min</b><span>Week 1 contest practice with an explanation of the chosen shortcut.</span></li></ol><p class="caption">Week 2 has its own 60-minute lesson plan under Algebra lesson plan.</p></section>
    <div class="takeaway"><strong>PRACTICE YOUR WAY</strong>Choose both weeks, one week, or a specific topic. Guided practice gives hints and immediate feedback. Random assessments save answers and give scores, topic breakdowns, and worked solutions after submission.</div>`;
  activity.querySelectorAll("[data-practice-week]").forEach(button => button.addEventListener("click", () => {
    openPractice(button.dataset.practiceWeek);
  }));
}

function switchTab(tab, focus=false) {
  if (!(tab in configs) && !(tab in algebraConfigs) && !["overview","algebra-overview","practice"].includes(tab)) tab="overview";
  currentTab=tab;++requestVersion;stopAnimation();
  $("#activity-select").value=tab;
  document.querySelectorAll("nav button").forEach(button => {
    const selected=button.dataset.tab===tab;
    button.classList.toggle("active",selected);
    if(selected)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
  });
  $("#week-pill").textContent=tab in configs?"WEEK 1 · NUMBER THEORY":tab in algebraConfigs||tab==="algebra-overview"?"WEEK 2 · ALGEBRA":"WEEKS 1 + 2";
  if(tab==="overview")overview();
  else if(tab==="algebra-overview")algebraOverview();
  else if(tab==="practice")showPractice();
  else if(tab in configs)showExplorer(tab);
  else lesson(tab);
  if(focus)$("h1")?.focus({preventScroll:true});
}

$("nav").addEventListener("click",event => {
  const button=event.target.closest("[data-tab]");if(!button)return;
  if(location.hash===`#${button.dataset.tab}`)switchTab(button.dataset.tab,true);
  else location.hash=button.dataset.tab;
});
$("#activity-select").addEventListener("change",event=>{
  if(location.hash===`#${event.target.value}`)switchTab(event.target.value,true);
  else location.hash=event.target.value;
});
window.addEventListener("hashchange",()=>{if(location.hash!=="#workspace")switchTab(location.hash.slice(1),true);});
switchTab(location.hash.slice(1)||"overview");
startAssessmentClock();
