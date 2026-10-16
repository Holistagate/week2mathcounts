"use strict";

const algebraConfigs = {
  foundations: {endpoint:"balance", fields:[["a","Left x coefficient",4],["b","Left constant",7],["c","Right x coefficient",0],["d","Right constant",31]],
    equation:"ax + b = cx + d", button:"Solve and check", presets:[["4x + 7 = 31",[4,7,0,31]],["Variables on both sides",[5,-8,2,13]],["No solution",[2,1,2,3]],["Every x works",[2,1,2,1]]]},
  systems: {endpoint:"systems", fields:[["a","Equation 1: x coefficient",2],["b","Equation 1: y coefficient",3],["c","Equation 1: constant",23],["d","Equation 2: x coefficient",3],["e","Equation 2: y coefficient",-2],["f","Equation 2: constant",2]],
    equation:"ax + by = c; dx + ey = f", button:"Eliminate and check", presets:[["Scale and cancel",[2,3,23,3,-2,2]],["Add directly",[1,1,13,1,-1,5]],["No solution",[1,1,7,2,2,15]],["Same line",[1,1,7,2,2,14]]]},
  quadratics: {endpoint:"quadratics", fields:[["a","Coefficient of x²",1],["b","Coefficient of x",-7],["c","Constant",12]],
    equation:"ax² + bx + c = 0", button:"Find the real roots", presets:[["Two whole-number roots",[1,-7,12]],["Repeated root",[1,-6,9]],["Irrational roots",[1,0,-2]],["No real roots",[1,2,5]],["A leading coefficient",[2,-7,3]]]},
  identities: {endpoint:"identities", fields:[["x","x",53],["y","y",47]],
    equation:"Choose a pattern, then compare both forms", button:"Verify the identity", presets:[["53² − 47²",[53,47],"difference_squares"],["12³ − 7³",[12,7],"difference_cubes"],["Don't miss 2xy",[4,3],"square_sum"],["Sum of cubes",[5,2],"sum_cubes"]]},
};

function algebraOverview() {
  activity.innerHTML = `${head("01","A stronger algebra foundation.","Week 2: balance equations, solve systems, work with quadratics, and recognize the identities that make contest problems faster.")}
    <div class="overview-intro card"><span class="eyebrow">THIS WEEK'S FOCUS</span><h2>Understand the move. Then find the shortcut.</h2><p>Start with signs, distribution, and like terms. Spend most of your time on systems and quadratics. Use identities to connect the ideas and shorten calculations.</p><a class="primary action-link" href="#foundations">Start with foundations →</a><button class="secondary action-link" id="algebra-practice" type="button">Practice Week 2</button></div>
    <div class="lesson-map">${Object.entries(lessons).map(([key,l])=>`<a class="card lesson-link" href="#${key}"><span class="eyebrow">${l.number} · ${key.toUpperCase()}</span><h2>${esc(l.title)}</h2><p>${esc(l.intro)}</p><span class="caption">Lesson + worked examples + explorer →</span></a>`).join("")}</div>
    <section class="card lesson-plan"><h2>A 60-minute lesson</h2><ol class="schedule"><li><b>0–5 min</b><span>Quick check: distribute a negative sign and solve 4x + 7 = 31.</span></li><li><b>5–13 min</b><span>Foundations: balance both sides; clear denominators.</span></li><li><b>13–31 min</b><span>Systems: substitution, elimination, and a ticket problem. Compare one, zero, and infinitely many solutions.</span></li><li><b>31–46 min</b><span>Quadratics: factoring, zero-product rule, and context restrictions. Extend to completing the square.</span></li><li><b>46–56 min</b><span>Identities: differences of squares and cubes. Derive each by expanding.</span></li><li><b>56–60 min</b><span>Exit check: find x + y from a system; explain why (x + y)² needs 2xy.</span></li></ol><p class="caption">For a group still learning the basics, spend two meetings here. Treat the quadratic formula, root relationships, and sums of cubes as extensions.</p></section>
    <div class="takeaway"><strong>READY FOR PRACTICE?</strong>30 original algebra problems and 12 fresh-question templates, alongside Week 1 number theory in the combined practice bank. Choose Warm-up, Contest, or Stretch. Guided practice gives hints and worked solutions; assessments save answers and report results by topic.</div>`;
  $("#algebra-practice").addEventListener("click",()=>openPractice("2"));
}

function lesson(tab) {
  const l=lessons[tab], c=algebraConfigs[tab];
  activity.innerHTML = `${head(l.number,l.title,l.intro)}
    <section class="concept-grid">${l.cards.map(([title,body])=>`<article class="card concept"><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join("")}</section>
    <section class="worked"><h2>Work through the reasoning</h2>${l.examples.map(([title,equation,steps])=>`<details class="worked-example"><summary>${esc(title)}<span>${esc(equation)}</span></summary><ol class="steps">${steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></details>`).join("")}</section>
    <div class="takeaway"><strong>KEEP THIS IDEA</strong>${esc(l.takeaway)}</div>
    <div class="explorer-heading"><span class="eyebrow">TRY YOUR OWN NUMBERS</span><h2>Predict first. Then test.</h2><p class="caption">${esc(c.equation)}</p></div>
    <div class="grid"><section class="card form-card"><form id="explorer-form">${tab==="identities"?`<label class="field" for="field-kind">Identity<select name="kind" id="field-kind"><option value="difference_squares">x² − y²</option><option value="square_sum">(x + y)²</option><option value="square_difference">(x − y)²</option><option value="difference_cubes">x³ − y³</option><option value="sum_cubes">x³ + y³</option></select></label>`:""}${c.fields.map(([id,label,value])=>`<label class="field" for="field-${id}">${esc(label)}<input id="field-${id}" name="${id}" type="number" step="1" min="-100" max="100" value="${value}" required></label>`).join("")}<small class="caption field-range">Whole numbers from −100 to 100. Answers may be fractions or radicals.</small><button type="submit" class="primary">${c.button}</button></form><div id="form-error" class="error" role="alert"></div><h3>Start with an example</h3><div class="presets">${c.presets.map(([label],i)=>`<button type="button" data-preset="${i}">${esc(label)}</button>`).join("")}</div></section><section class="card result-card" id="result" aria-live="polite" aria-atomic="true"><p class="loading">Calculating…</p></section></div>
    <div class="pitfall"><b>Watch for this:</b> ${esc(l.mistake)}</div><div class="try-card"><strong>Discuss with a partner:</strong> ${esc(l.discuss[0])}<details><summary>Check the explanation</summary><p>${esc(l.discuss[1])}</p></details></div>
    <div class="lesson-actions"><button class="primary" id="topic-practice" type="button">Practice this topic →</button><button class="secondary" id="print-lesson" type="button">Print this lesson</button></div>`;
  const form=$("#explorer-form");
  if(formMemory[tab]) Object.entries(formMemory[tab]).forEach(([key,value])=>{form.elements[key].value=value;});
  form.addEventListener("submit",e=>{e.preventDefault();calculateAlgebra(tab,form);});
  $(".presets").addEventListener("click",e=>{
    const button=e.target.closest("[data-preset]"); if(!button)return;
    const [,values,kind]=c.presets[Number(button.dataset.preset)];
    c.fields.forEach(([key],i)=>{form.elements[key].value=values[i];});
    if(kind)form.elements.kind.value=kind;
    form.requestSubmit();
  });
  $("#topic-practice").addEventListener("click",()=>{
    openPractice("2",{foundations:"Algebra foundations",systems:"Systems",quadratics:"Quadratics",identities:"Identities"}[tab]);
  });
  $("#print-lesson").addEventListener("click",()=>{
    document.querySelectorAll(".worked-example, .try-card details").forEach(d=>d.open=true);window.print();
  });
  calculateAlgebra(tab,form);
}

async function calculateAlgebra(tab,form) {
  const version=++requestVersion, values=Object.fromEntries(new FormData(form));
  formMemory[tab]=values;
  const result=$("#result"),error=$("#form-error");error.textContent="";result.setAttribute("aria-busy","true");
  try{
    const d=await api(algebraConfigs[tab].endpoint,values);
    if(version!==requestVersion)return;
    result.innerHTML=renderResult(tab,d,values);
  }catch(problem){if(version===requestVersion){error.textContent=problem.message;result.innerHTML="<p>Check the inputs and try again.</p>";}}
  finally{if(version===requestVersion)result.removeAttribute("aria-busy");}
}

const asNumber = value => {
  const parts=String(value).split("/").map(Number);return parts.length===2?parts[0]/parts[1]:parts[0];
};
function signed(n,variable="") {return `${Number(n)<0?"−":"+"} ${Math.abs(Number(n))}${variable}`;}
function expression(a,b,c) {return `${a}x² ${signed(b,"x")} ${signed(c)}`;}
function linear(a,b,c) {return `${a}x ${signed(b,"y")} = ${c}`;}
function orderedSteps(steps){return `<ol class="steps">${steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`;}

function renderResult(tab,d,v) {
  if(tab==="foundations") {
    const answer=d.status==="unique"?`x = ${esc(d.x)}`:d.status==="none"?"No solution":"Every real x works";
    return `<span class="eyebrow">BALANCE BOTH SIDES</span><div class="equation small-equation">${v.a}x ${signed(v.b)} = ${v.c}x ${signed(v.d)}</div><div class="balance-display" aria-hidden="true"><span>Same operation</span><b>=</b><span>Same operation</span></div><h2 class="answer-heading">${answer}</h2>${orderedSteps(d.steps)}`;
  }
  if(tab==="systems") {
    const values="abcdef".split("").map(k=>Number(v[k]));
    const answer=d.status==="unique"?`x = ${esc(d.x)}, y = ${esc(d.y)}`:d.status==="none"?"No solution":"Infinitely many real solutions";
    return `<span class="eyebrow">ONE PAIR MUST SATISFY BOTH</span><div class="math-note system-equations">${linear(...values.slice(0,3))}<br>${linear(...values.slice(3))}</div><h2 class="answer-heading">${answer}</h2>${systemGraph(values,d)}${orderedSteps(d.steps)}`;
  }
  if(tab==="quadratics") {
    const answer=d.status==="infinite"?"Every real x works":d.roots.length?`x = ${d.roots.map(esc).join(" or ")}`:"No real solutions";
    return `<span class="eyebrow">ROOTS ARE X-INTERCEPTS</span><div class="math-note">${expression(v.a,v.b,v.c)} = 0</div><h2 class="answer-heading">${answer}</h2>${d.approximations?.length&&d.roots.some(r=>r.includes("√"))?`<p class="caption">Approximately ${d.approximations.map(n=>n.toFixed(4)).join(" and ")}</p>`:""}${quadraticGraph(v,d)}${orderedSteps(d.steps)}${d.discriminant!==undefined?`<div class="math-note">D = ${d.discriminant} · ${d.discriminant>0?"2 distinct real roots":d.discriminant===0?"1 repeated real root":"0 real roots"}</div>`:""}`;
  }
  const formula=d.formula;
  const numeric={difference_squares:`(${d.x} − (${d.y}))(${d.x} + (${d.y})) = ${d.difference} × ${d.total}`,
    difference_cubes:`(${d.x} − (${d.y}))(${d.x}² + (${d.x})(${d.y}) + (${d.y})²) = ${d.difference} × ${d.x*d.x+d.product+d.y*d.y}`,
    sum_cubes:`(${d.x} + (${d.y}))(${d.x}² − (${d.x})(${d.y}) + (${d.y})²) = ${d.total} × ${d.x*d.x-d.product+d.y*d.y}`,
    square_sum:`(${d.x})² + 2(${d.x})(${d.y}) + (${d.y})² = ${d.x*d.x} + (${2*d.product}) + ${d.y*d.y}`,
    square_difference:`(${d.x})² − 2(${d.x})(${d.y}) + (${d.y})² = ${d.x*d.x} − (${2*d.product}) + ${d.y*d.y}`}[d.kind];
  const area=d.kind==="square_sum"&&d.x>0&&d.y>0?areaSquare(d.x,d.y):"";
  return `<span class="eyebrow">TWO FORMS, THE SAME VALUE</span><div class="math-note identity-formula">${esc(formula)}</div><div class="identity-values"><div><span>Original form</span><b>${fmt(d.left)}</b></div><span>=</span><div><span>Expanded / factored form</span><b>${fmt(d.right)}</b></div></div>${area}<h3>Use the structure</h3><p class="explanation">${esc(numeric)} = ${fmt(d.right)}.</p><p class="caption">The identity is true for all real x and y. Testing numbers illustrates it; expanding the factors proves it.</p>`;
}

function graphFrame(bounds,label,draw) {
  const [xl,xh,yl,yh]=bounds;
  const px=x=>58+544*(x-xl)/(xh-xl),py=y=>274-224*(y-yl)/(yh-yl);
  const labelNumber=n=>Math.abs(n)>1000?n.toExponential(1):Number(n.toFixed(2));
  let grid="";
  for(let i=0;i<=4;i++){
    const x=xl+(xh-xl)*i/4,y=yl+(yh-yl)*i/4;
    grid+=`<line x1="${px(x)}" y1="50" x2="${px(x)}" y2="274" stroke="#dde5db"/><line x1="58" y1="${py(y)}" x2="602" y2="${py(y)}" stroke="#dde5db"/><text x="${px(x)}" y="295" text-anchor="middle">${labelNumber(x)}</text><text x="49" y="${py(y)+4}" text-anchor="end">${labelNumber(y)}</text>`;
  }
  const axes=`${yl<=0&&yh>=0?`<line x1="58" y1="${py(0)}" x2="602" y2="${py(0)}" stroke="#657a72"/>`:""}${xl<=0&&xh>=0?`<line x1="${px(0)}" y1="50" x2="${px(0)}" y2="274" stroke="#657a72"/>`:""}`;
  return `<svg class="algebra-graph" viewBox="0 0 660 320" role="img" aria-label="${esc(label)}"><defs><clipPath id="graph-clip"><rect x="58" y="50" width="544" height="224"/></clipPath></defs>${grid}${axes}<g clip-path="url(#graph-clip)">${draw(px,py)}</g><text x="623" y="295">x</text><text x="48" y="32">y</text></svg>`;
}

function systemGraph(v,d) {
  const [a,b,c,e,f,g]=v;
  const x=d.status==="unique"?asNumber(d.x):0,y=d.status==="unique"?asNumber(d.y):0;
  const intercepts=[b?c/b:0,a?c/a:0,f?g/f:0,e?g/e:0].filter(Number.isFinite);
  const span=Math.max(6,Math.abs(x)*1.3,Math.abs(y)*1.3,...intercepts.map(n=>Math.min(30,Math.abs(n)*1.3)));
  const svg=graphFrame([-span,span,-span,span],`Equation 1 in green and equation 2 in orange. ${d.status==="unique"?`They intersect at (${d.x}, ${d.y}).`:d.status==="none"?"No shared solution.":"Infinitely many real solutions."}`,(px,py)=>{
    const line=(p,q,r,color,dash="")=>{
      if(!p&&!q)return "";
      if(!q)return `<line x1="${px(r/p)}" y1="50" x2="${px(r/p)}" y2="274" stroke="${color}" stroke-width="3" ${dash}/>`;
      return `<line x1="${px(-span)}" y1="${py((r+p*span)/q)}" x2="${px(span)}" y2="${py((r-p*span)/q)}" stroke="${color}" stroke-width="3" ${dash}/>`;
    };
    return line(a,b,c,"#306953")+line(e,f,g,"#c66328",'stroke-dasharray="8 5"')+(d.status==="unique"?`<circle cx="${px(x)}" cy="${py(y)}" r="6" fill="#142c32"/>`:"");
  });
  return svg+`<div class="legend"><span>Equation 1 · solid green</span><span class="orange">Equation 2 · dashed orange</span></div>`;
}

function quadraticGraph(v,d) {
  const [a,b,c]=[v.a,v.b,v.c].map(Number), evaluate=x=>a*x*x+b*x+c;
  if(!a&&!b)return "";
  const center=a?-b/(2*a):asNumber(d.roots[0]);
  const half=a?Math.max(3,Math.sqrt(Math.abs(b*b-4*a*c))/(2*Math.abs(a))*1.35):6;
  const xl=center-half,xh=center+half;
  const ys=[evaluate(xl),evaluate(center),evaluate(xh),0],lo=Math.min(...ys),hi=Math.max(...ys),padding=Math.max(1,(hi-lo)*0.15);
  return graphFrame([xl,xh,lo-padding,hi+padding],`Graph of y = ${expression(a,b,c)}. ${d.roots.length?"Exact roots: "+d.roots.join(" and "):"No real roots."}`,(px,py)=>{
    const points=Array.from({length:151},(_,i)=>{const x=xl+(xh-xl)*i/150;return `${px(x)},${py(evaluate(x))}`;}).join(" ");
    return `<polyline points="${points}" fill="none" stroke="#306953" stroke-width="3"/>${(d.approximations||d.roots.map(asNumber)).map(x=>`<circle cx="${px(x)}" cy="${py(0)}" r="5" fill="#c66328"/>`).join("")}`;
  })+`<p class="caption">Green: y = ${esc(expression(a,b,c))}. Orange dots: real roots. Plot scales adapt to your numbers.</p>`;
}

function areaSquare(x,y) {
  const total=x+y,side=230,cut=side*x/total;
  return `<svg class="area-square" viewBox="0 0 340 295" role="img" aria-label="A square with side x plus y splits into areas x squared, xy, xy, and y squared. The two rectangles explain the 2xy term."><g transform="translate(45 25)"><rect width="${cut}" height="${cut}" fill="#d6e6d7"/><rect x="${cut}" width="${side-cut}" height="${cut}" fill="#edd8bc"/><rect y="${cut}" width="${cut}" height="${side-cut}" fill="#edd8bc"/><rect x="${cut}" y="${cut}" width="${side-cut}" height="${side-cut}" fill="#a9c8b3"/><rect width="230" height="230" fill="none" stroke="#306953"/><line x1="${cut}" x2="${cut}" y2="230" stroke="#306953"/><line y1="${cut}" y2="${cut}" x2="230" stroke="#306953"/><text x="${cut/2}" y="${cut/2}" text-anchor="middle">x²</text><text x="${(cut+side)/2}" y="${cut/2}" text-anchor="middle">xy</text><text x="${cut/2}" y="${(cut+side)/2}" text-anchor="middle">xy</text><text x="${(cut+side)/2}" y="${(cut+side)/2}" text-anchor="middle">y²</text><text x="115" y="255" text-anchor="middle">Side: x + y = ${total}</text></g></svg><p class="caption">Two rectangles of area xy make the middle term 2xy.</p>`;
}

