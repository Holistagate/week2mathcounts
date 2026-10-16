"use strict";

// Import legacy browser data once, keeping both standalone trainers' keys intact.
(() => {
  const prefix="mathcounts-combined-", marker=prefix+"migration-v1";
  const read=(key,fallback) => {
    try {return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;} catch (_) {return fallback;}
  };
  const write=(key,value) => localStorage.setItem(key,JSON.stringify(value));
  const label=(topic,week) => topic==="Foundations"?(week===1?"Remainder foundations":"Algebra foundations"):topic;
  const labelSession=(session,week) => {
    if(!session || !Array.isArray(session.questions) || !session.questions.length || !Number.isFinite(session.startedAt))return null;
    session.week=String(week);session.topic=label(session.topic,week);
    session.questions=session.questions.map(q => ({...q,week,topic:label(q.topic,week)}));
    if(session.results){
      session.results.results=(session.results.results || []).map(q => ({...q,week,topic:label(q.topic,week)}));
      session.results.topics=(session.results.topics || []).map(q => ({...q,topic:label(q.topic,week)}));
    }
    return session;
  };
  try {
    if(read(marker,false))return;
    if(read(prefix+"progress-v1",null)===null){
      const progress={};
      for(const key of ["mathcounts-remainder-lab-v1","mathcounts-algebra-lab-v1"]){
        const records=read(key,{});
        if(records && typeof records==="object" && !Array.isArray(records))Object.assign(progress,records);
      }
      write(prefix+"progress-v1",progress);
    }
    const histories=[],pending=[];
    for(const [week,legacy] of [[1,"mathcounts-"],[2,"mathcounts-algebra-"]]){
      const history=read(legacy+"assessment-history-v1",[]);
      if(Array.isArray(history))for(const item of history){
        const session=labelSession(item,week);if(session?.results)histories.push(session);
      }
      const session=labelSession(read(legacy+"assessment-v1",null),week);
      if(session?.results)histories.push(session);else if(session)pending.push(session);
    }
    if(read(prefix+"assessment-history-v1",null)===null){
      const distinct=[...new Map(histories.map(s => [s.id,s])).values()];
      distinct.sort((a,b)=>(b.submittedAt||b.startedAt)-(a.submittedAt||a.startedAt));
      write(prefix+"assessment-history-v1",distinct.slice(0,10));
    }
    if(read(prefix+"assessment-v1",null)===null && pending.length){
      // Resume the earliest deadline first; retain other unfinished sets below setup.
      const deadline=s => s.duration?s.startedAt+s.duration*1000:Infinity;
      pending.sort((a,b)=>deadline(a)-deadline(b)||b.startedAt-a.startedAt);
      write(prefix+"assessment-v1",pending.shift());
    }
    if(read(prefix+"saved-assessments-v1",null)===null)write(prefix+"saved-assessments-v1",pending);
    if(read(prefix+"fresh-practice-v1",null)===null){
      for(const [week,key] of [[1,"mathcounts-fresh-practice-v1"],[2,"mathcounts-algebra-fresh-practice-v1"]]){
        const q=read(key,null);
        if(q?.generated && Array.isArray(q.methods)){
          write(prefix+"fresh-practice-v1",{...q,week,topic:label(q.topic,week)});break;
        }
      }
    }
    write(marker,true);
  } catch (_) { /* The trainer also works when browser storage is unavailable. */ }
})();
