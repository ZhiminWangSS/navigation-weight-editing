(() => {
  'use strict';
  const data = window.EXPERIMENT_DATA;
  if (!data) {
    document.getElementById('bar-chart').innerHTML = '<p class="data-error">Interactive data could not be loaded. The summary and downloadable results remain available.</p>';
    return;
  }
  const $ = (id) => document.getElementById(id);
  const escape = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = (n, digits = 2) => Number(n).toFixed(digits);
  const variants = ['baseline', 'stop', 'distance', 'combined'].map(id => data.variants.find(v => v.id === id));
  const metricConfig = {
    sr: {max:100, format:n=>`${number(n,0)}%`, label:'SUCCESS RATE · HIGHER IS BETTER', title:'The distance edit carries the signal.', text:'Distance-only matched the combined edit at 27 successes. STOP-only fell to 23. Better offline STOP recognition did not translate into better navigation.', interval:'Combined − baseline: +6 pp<br>95% paired bootstrap CI: [−2, +16]', caption:'Success requires an explicit STOP at less than 3 m from the goal.'},
    stop1m: {max:100, format:n=>`${number(n,0)}%`, label:'PRECISE STOPPING · HIGHER IS BETTER', title:'Two additional stops within one meter.', text:'Both the combined and distance-only edits reached 17 precise stops, versus 15 for the baseline. STOP-only dropped to 14. All rates use the full 50 episodes.', interval:'Combined − baseline: +4 pp<br>95% paired bootstrap CI: [−6, +14]', caption:'Explicit STOP at ≤1 m, divided by all 50 episodes; timeouts never count.'},
    spl: {max:1, format:n=>number(n,3), label:'PATH EFFICIENCY · HIGHER IS BETTER', title:'More success, with path length in view.', text:'SPL rewards successful navigation while penalizing excess path length. The combined edit rose from 0.456 to 0.503. This metric is not a measure of execution time.', interval:'Combined − baseline: +0.047<br>Small, fixed 50-episode subset', caption:'SPL = success weighted by normalized path length. Scale: 0–1.'},
    queries: {max:40, format:n=>number(n), label:'MODEL CALLS · LOWER IS FEWER', title:'Less overall inference. No speedup claim.', text:'Calls fell mainly on episodes that both versions failed. On the 23 shared successes, calls increased by 9.9%. Forward commands did not get longer.', interval:'Combined − baseline: −4.36 calls<br>95% paired bootstrap CI: [−11.38, +1.40]', caption:'Mean calls across all episodes. Shared-success calls: 22.83 → 25.09.'}
  };
  function renderMetric(key) {
    const cfg = metricConfig[key];
    document.querySelectorAll('[data-metric]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.metric === key)));
    const chart = $('bar-chart');
    if (!chart.children.length) {
      chart.innerHTML = variants.map(v => `<div class="bar-row ${v.id}" data-variant="${v.id}"><span class="bar-row-label">${escape(v.name)}</span><div class="bar-track"><div class="bar-fill" style="width:0%"></div></div><span class="bar-number"></span></div>`).join('');
    }
    variants.forEach(v => {
      const row = chart.querySelector(`[data-variant="${v.id}"]`);
      row.querySelector('.bar-fill').style.width = `${v[key] / cfg.max * 100}%`;
      row.querySelector('.bar-number').textContent = cfg.format(v[key]);
      row.setAttribute('aria-label', `${v.name}: ${cfg.format(v[key])}`);
    });
    $('chart-insight').innerHTML = `<span class="insight-label">${cfg.label}</span><h4>${cfg.title}</h4><p>${cfg.text}</p><span class="insight-interval">${cfg.interval}</span>`;
    $('chart-caption').textContent = cfg.caption;
  }
  document.querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => renderMetric(b.dataset.metric)));
  renderMetric('sr');

  const tokenRows = [{token:'···',id:'',group:'context'}, {token:'I',id:40,group:'stop'}, {token:'The',id:791,group:'stop'}, {token:'25',id:914,group:'distance'}, {token:'50',id:1135,group:'distance'}, {token:'75',id:2075,group:'distance'}, {token:'···',id:'',group:'context'}];
  $('weight-matrix').innerHTML = tokenRows.map((r,i) => `<div class="weight-row ${r.group === 'context' ? 'context' : 'active'}" data-row-group="${r.group}"><code>${r.token}</code><div class="weight-cells" aria-hidden="true">${Array.from({length:24},(_,j)=>`<span class="weight-cell" style="--o:${(.2 + ((j*17+i*11)%29)/39).toFixed(2)}"></span>`).join('')}</div><span class="row-id">${r.id}</span></div>`).join('');
  const counts = {combined:['20,474','0.000241% of the full model'],stop:['8,190','2 selected output-head rows'],distance:['12,284','3 selected output-head rows']};
  document.querySelectorAll('[data-rows]').forEach(b => b.addEventListener('click', () => {
    const choice = b.dataset.rows;
    document.querySelectorAll('[data-rows]').forEach(v => v.setAttribute('aria-pressed', String(v === b)));
    document.querySelectorAll('[data-row-group]').forEach(r => r.classList.toggle('active', r.dataset.rowGroup !== 'context' && (choice === 'combined' || r.dataset.rowGroup === choice)));
    $('weight-count').textContent = counts[choice][0];
    $('weight-percentage').textContent = counts[choice][1];
  }));

  function outcome(e) {
    if (e.baselineSuccess && e.combinedSuccess) return ['both-success','Both succeed'];
    if (!e.baselineSuccess && e.combinedSuccess) return ['gained','Gained success'];
    if (e.baselineSuccess && !e.combinedSuccess) return ['lost','Lost success'];
    return ['both-fail','Both fail'];
  }
  const grid = $('episode-grid');
  grid.innerHTML = data.episodes.map(e => {
    const [cls,label] = outcome(e);
    return `<button type="button" class="episode-tile ${cls}" data-episode="${e.id}" aria-pressed="false" aria-label="Episode ${e.id}: ${label}">${String(e.id).padStart(2,'0')}</button>`;
  }).join('');
  function selectEpisode(id) {
    const e = data.episodes.find(e => e.id === Number(id));
    if (!e) return;
    grid.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed',String(Number(b.dataset.episode) === e.id)));
    const hasTrace = data.trajectories.some(t => t.id === e.id);
    $('episode-detail').innerHTML = `<span>EP. ${String(e.id).padStart(3,'0')}</span><span class="detail-outcome"${outcome(e)[0]==='lost'?' style="color:var(--amber)"':''}>${outcome(e)[1]}</span><span class="detail-metric">Calls <strong>${e.baselineQueries} → ${e.combinedQueries}</strong></span><span class="detail-metric">Goal error <strong>${number(e.baselineNE)} → ${number(e.combinedNE)} m</strong></span>${hasTrace ? '<button type="button" id="view-trace">View recorded paths ↑</button>' : ''}`;
    if (hasTrace) $('view-trace').addEventListener('click', () => {
      setTrajectory(e.id);
      $('trajectory-select').scrollIntoView({behavior:motionEnabled?'smooth':'auto',block:'center'});
    });
  }
  grid.addEventListener('click', e => { const b = e.target.closest('[data-episode]'); if (b) selectEpisode(b.dataset.episode); });

  let motionEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let currentTrajectory = data.trajectories.find(t=>t.id===6) || data.trajectories[0];
  let replayProgress = 1, replayStarted = null;
  const replayLength = 8500;
  const selector = $('trajectory-select');
  data.trajectories.forEach(t => {
    const e = data.episodes.find(e=>e.id===t.id);
    const option = document.createElement('option'); option.value=t.id; option.textContent = `${String(t.id).padStart(2,'0')} / ${outcome(e)[1]}`; selector.append(option);
  });
  function setTrajectory(id) {
    currentTrajectory = data.trajectories.find(t => t.id === Number(id)) || data.trajectories[0];
    selector.value = currentTrajectory.id;
    const t = currentTrajectory, b = t.baselineMetrics, c = t.combinedMetrics;
    const e = data.episodes.find(e=>e.id===t.id);
    $('trajectory-outcome').textContent = outcome(e)[1].toUpperCase();
    $('trajectory-outcome').style.color = outcome(e)[0] === 'lost' ? 'var(--amber)' : 'var(--green)';
    $('trajectory-title').textContent = `Episode ${String(t.id).padStart(2,'0')}`;
    const instruction = (t.instruction || '').trim();
    $('trajectory-instruction').textContent = instruction === instruction.toUpperCase() ? instruction.charAt(0).toUpperCase() + instruction.slice(1).toLowerCase() : instruction;
    $('trajectory-stats').innerHTML = '<div class="trajectory-stat stat-head"><span></span><span>BASELINE</span><span>COMBINED</span></div>' + [
      ['Outcome',b.success?'Success':'Failed',c.success?'Success':'Failed'], ['Goal error',`${number(b.ne)} m`,`${number(c.ne)} m`], ['Model calls',b.queries,c.queries], ['Path length',`${number(b.pathLength)} m`,`${number(c.pathLength)} m`]
    ].map(row=>`<div class="trajectory-stat">${row.map(v=>`<span>${escape(v)}</span>`).join('')}</div>`).join('');
    replayStarted = null; setProgress(1); $('replay-button').textContent = '↻ Replay'; selectEpisode(t.id); drawLab();
  }
  selector.addEventListener('change', () => setTrajectory(selector.value));
  function setProgress(value) {
    replayProgress = Math.max(0, Math.min(1,value));
    $('trajectory-progress').value = Math.round(replayProgress*100);
    $('progress-label').textContent = `${Math.round(replayProgress*100)}%`;
  }
  $('trajectory-progress').addEventListener('input', e => { replayStarted = null; setProgress(Number(e.target.value)/100); $('replay-button').textContent='↻ Replay'; drawLab(); });
  $('replay-button').addEventListener('click', () => {
    if (replayStarted !== null) {replayStarted = null; $('replay-button').textContent='↻ Replay'; return;}
    setProgress(0); replayStarted = performance.now(); $('replay-button').textContent='Ⅱ Pause';
  });

  const heroCanvas=$('hero-canvas'), labCanvas=$('trajectory-canvas');
  const heroCtx=heroCanvas?.getContext('2d'), labCtx=labCanvas.getContext('2d');
  function dimensions(canvas) {
    const {width,height}=canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio || 1,2);
    if (canvas.width!==Math.round(width*dpr) || canvas.height!==Math.round(height*dpr)) {canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
    const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); return {w:width,h:height};
  }
  function geometry(t,w,h,iso=false) {
    const raw=[...t.baseline,...t.combined,t.start,t.goal].filter(p=>Array.isArray(p));
    const convert = iso ? p=>[(p[0]-p[1])*.83,(p[0]+p[1])*.43] : p=>[p[0],p[1]];
    const coords=raw.map(convert), xs=coords.map(p=>p[0]), ys=coords.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const padX=iso?62:55,padY=iso?105:66;
    const scale=Math.max(1,Math.min((w-padX*2)/Math.max(maxX-minX,1),(h-padY*2)/Math.max(maxY-minY,1)));
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    return {map:p=>{const q=convert(p);return[(q[0]-cx)*scale+w/2,(q[1]-cy)*scale+h/2+8]},scale,
      rawMinX:Math.min(...raw.map(p=>p[0])), rawMaxX:Math.max(...raw.map(p=>p[0])),rawMinZ:Math.min(...raw.map(p=>p[1])), rawMaxZ:Math.max(...raw.map(p=>p[1]))};
  }
  function line(ctx,points,color,width=1,dash=[]) {
    if (!points.length) return;
    ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
  }
  function partial(points,p) {
    const at=p*(points.length-1), n=Math.floor(at);const out=points.slice(0,n+1);
    if(n+1<points.length){const a=points[n],b=points[n+1],f=at-n;out.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);}
    return out;
  }
  function label(ctx,text,p,color,dx=10,dy=-12) {
    ctx.font='8px "IBM Plex Mono",monospace'; const width=ctx.measureText(text).width;
    ctx.fillStyle='#fbfcf8ee';ctx.fillRect(p[0]+dx-4,p[1]+dy-9,width+8,14);ctx.fillStyle=color;ctx.fillText(text,p[0]+dx,p[1]+dy);
  }
  function renderTrace(canvas,ctx,t,progress,hero=false,timestamp=0) {
    if(!ctx || !t)return;
    const {w,h}=dimensions(canvas); if(w<10||h<10)return;
    ctx.clearRect(0,0,w,h); const g=geometry(t,w,h,hero), map=g.map;
    ctx.save();ctx.beginPath();ctx.rect(10,hero?45:35,w-20,h-(hero?90:75));ctx.clip();
    const gridStep=Math.max(1,Math.ceil(Math.max(g.rawMaxX-g.rawMinX,g.rawMaxZ-g.rawMinZ)/16));
    for(let x=Math.floor(g.rawMinX)-3;x<=g.rawMaxX+3;x+=gridStep)line(ctx,[map([x,g.rawMinZ-3]),map([x,g.rawMaxZ+3])],'#b9cdb47a',.6);
    for(let z=Math.floor(g.rawMinZ)-3;z<=g.rawMaxZ+3;z+=gridStep)line(ctx,[map([g.rawMinX-3,z]),map([g.rawMaxX+3,z])],'#b9cdb47a',.6);
    if(hero){for(let x=Math.floor(g.rawMinX)-2;x<=g.rawMaxX+2;x+=gridStep)for(let z=Math.floor(g.rawMinZ)-2;z<=g.rawMaxZ+2;z+=gridStep){const p=map([x,z]);ctx.fillStyle='#6e986766';ctx.fillRect(p[0]-.8,p[1]-.8,1.6,1.6);}}
    const bp=t.baseline.map(map), cp=t.combined.map(map);
    if(progress<1&&!hero){line(ctx,bp,'#8393a22f',1,[3,5]);line(ctx,cp,'#65963a2b',1);}
    const bdraw=partial(bp,hero?1:progress),cdraw=partial(cp,hero?1:progress);
    line(ctx,bdraw,'#8897a1',hero?1.7:2,[5,5]);
    ctx.shadowBlur=hero?14:8;ctx.shadowColor='#79ac3f27';line(ctx,cdraw,'#609537',hero?2.4:2.5);ctx.shadowBlur=0;
    const start=map(t.start),goal=map(t.goal);
    ctx.strokeStyle='#405735';ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(...goal,16,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(...goal,5,0,Math.PI*2);ctx.stroke();line(ctx,[[goal[0]-9,goal[1]],[goal[0]+9,goal[1]]],'#405735',.8);line(ctx,[[goal[0],goal[1]-9],[goal[0],goal[1]+9]],'#405735',.8);
    ctx.fillStyle='#415c31';ctx.fillRect(start[0]-3,start[1]-3,6,6);
    label(ctx,'START',start,'#6a7c5c',9,18);label(ctx,'GOAL',goal,'#4b643c',19,-2);
    if(hero || progress>=1){const be=bp[bp.length-1],ce=cp[cp.length-1];ctx.strokeStyle='#8897a1';ctx.lineWidth=1.5;ctx.strokeRect(be[0]-3,be[1]-3,6,6);ctx.beginPath();ctx.arc(...ce,4,0,Math.PI*2);ctx.fillStyle='#609537';ctx.fill();}
    const cursorProgress=hero ? (motionEnabled?(timestamp%11000)/11000:1) : progress;
    const cursor=partial(cp,cursorProgress).at(-1);
    ctx.beginPath();ctx.arc(...cursor,5,0,Math.PI*2);ctx.fillStyle='#4b7c2e';ctx.shadowBlur=15;ctx.shadowColor='#609537';ctx.fill();ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(...cursor,11,0,Math.PI*2);ctx.strokeStyle='#80ab4866';ctx.lineWidth=1;ctx.stroke();
    if(!hero&&progress<1){const bcursor=partial(bp,progress).at(-1);ctx.beginPath();ctx.arc(...bcursor,4,0,Math.PI*2);ctx.fillStyle='#8897a1';ctx.fill();}
    ctx.restore();
    if(!hero){const scaleWidth=Math.min(90,g.scale*2),realMeters=scaleWidth/g.scale,x=20,y=h-48;line(ctx,[[x,y],[x+scaleWidth,y]],'#8ba278',1);line(ctx,[[x,y-3],[x,y+3]],'#8ba278',1);line(ctx,[[x+scaleWidth,y-3],[x+scaleWidth,y+3]],'#8ba278',1);ctx.font='8px monospace';ctx.fillStyle='#798e65';ctx.fillText(`${number(realMeters,1)} m (projected)`,x,y-7);}
  }
  function drawLab(){renderTrace(labCanvas,labCtx,currentTrajectory,replayProgress);}
  function updateMotion() {
    $('motion-toggle').setAttribute('aria-pressed',String(motionEnabled));
    $('motion-toggle').lastElementChild.textContent=motionEnabled?'Motion on':'Motion off';
    document.documentElement.classList.toggle('motion-off',!motionEnabled);
    if(!motionEnabled){replayStarted=null;$('replay-button').textContent='↻ Replay';}
    renderTrace(heroCanvas,heroCtx,data.trajectories[0],1,true,0);
  }
  $('motion-toggle').addEventListener('click',()=>{motionEnabled=!motionEnabled;updateMotion();});
  let heroVisible=true,labVisible=false;
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.target===heroCanvas)heroVisible=e.isIntersecting;else labVisible=e.isIntersecting;}),{rootMargin:'100px'});
  if (heroCanvas) observer.observe(heroCanvas);observer.observe(labCanvas);
  let lastFrame=0;
  function animate(now){
    if(now-lastFrame>30){
      if(motionEnabled&&heroVisible)renderTrace(heroCanvas,heroCtx,data.trajectories[0],1,true,now);
      if(replayStarted!==null){setProgress((now-replayStarted)/replayLength);if(labVisible)drawLab();if(replayProgress>=1){replayStarted=null;$('replay-button').textContent='↻ Replay';}}
      lastFrame=now;
    }
    requestAnimationFrame(animate);
  }
  const resize=new ResizeObserver(()=>{renderTrace(heroCanvas,heroCtx,data.trajectories[0],1,true,performance.now());drawLab();});
  if (heroCanvas) resize.observe(heroCanvas);resize.observe(labCanvas);
  updateMotion();setTrajectory(6);requestAnimationFrame(animate);
  const updateScroll=()=>{const d=document.documentElement;const ratio=(d.scrollHeight-d.clientHeight)>0?window.scrollY/(d.scrollHeight-d.clientHeight):0;$('scroll-progress').style.width=`${ratio*100}%`;};
  window.addEventListener('scroll',updateScroll,{passive:true});updateScroll();
})();
