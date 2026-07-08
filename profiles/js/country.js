/* ================================================================
   GIZ-SLOCAT NDC Transport Tracker — Country Profile Renderer
   profiles/js/country.js  v3
   ================================================================ */
"use strict";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
    (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const NAVY="#003D5C", TEAL="#00A4BD", GREEN="#9DBE3D", ORANGE="#E8821A", MUTED="#6B7280";
const ASI_COLOR = { Avoid:NAVY, Shift:TEAL, Improve:GREEN };

const SDG_COLORS = {
  1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",6:"#26BDE2",
  7:"#FCC30B",8:"#A21942",9:"#FD6925",10:"#DD1367",11:"#FD9D24",12:"#BF8B2E",
  13:"#3F7E44",14:"#0A97D9",15:"#56C02B",16:"#00689D",17:"#19486A"
};
const SDG_NAMES = {
  1:"No Poverty",2:"Zero Hunger",3:"Good Health and Well-being",4:"Quality Education",
  5:"Gender Equality",6:"Clean Water and Sanitation",7:"Affordable and Clean Energy",
  8:"Decent Work and Economic Growth",9:"Industry, Innovation and Infrastructure",
  10:"Reduced Inequalities",11:"Sustainable Cities and Communities",
  12:"Responsible Consumption and Production",13:"Climate Action",14:"Life Below Water",
  15:"Life on Land",16:"Peace, Justice and Strong Institutions",17:"Partnerships for the Goals"
};
const BENEFIT_ICONS = {
  "Air pollution reduction":  { label:"Air quality",      icon:`<path d="M3 8h13a3 3 0 1 0-3-3M3 12h17a3 3 0 1 1-3 3M3 16h11a3 3 0 1 1-3 3"/>` },
  "Health Benefits":          { label:"Health",           icon:`<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>` },
  "Better social inclusion":  { label:"Social inclusion", icon:`<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>` },
  "Economic benefits":        { label:"Economic",         icon:`<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>` },
  "Road safety improvements": { label:"Road safety",      icon:`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>` },
  "Congestion reduction":     { label:"Less congestion",  icon:`<path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M7 17v3M17 17v3M7 11h.01M17 11h.01"/>` },
  "Improved accessibility":   { label:"Accessibility",    icon:`<circle cx="12" cy="4" r="2"/><path d="M19 13v-2a7 7 0 0 0-14 0v2M12 6v9M8 21l4-6 4 6"/>` }
};
const ADAPT_ICONS = {
  "Structural and Technical":                 `<path d="M2 22h20M6 18V9l6-4 6 4v9M9 18v-5h6v5"/>`,
  "Institutional and Regulatory":             `<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"/>`,
  "Informational and Educational":            `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  "Other adaptation and resilience measures": `<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>`
};
const PARIS_DEADLINES = [
  {year:2015,label:"Paris Agreement"},
  {year:2020,label:"NDC update due"},
  {year:2025,label:"NDC update due"},
  {year:2030,label:"NDC update due"}
];
const GEN_NOTE = `Our definition of NDC generations:
\u2022 Third-generation NDCs: Any submissions since November 2024, also referred to as NDCs 3.0 or third-round NDCs.
\u2022 Second-generation NDCs: Any NDC submissions between January 2020 and October 2024.
\u2022 First-generation NDCs: Any NDC submissions mostly up to December 2019; once a country ratified the Paris Agreement, their INDCs formally became their NDC.`;

/* Transport targets = transport mitigation + transport adaptation areas only.
   Net zero, overall mitigation, and energy targets are NOT transport targets. */
const T_AREAS=new Set(["Transport sector mitigation target","Transport sector adaptation target"]);
function transportTargets(p,status){return (p.targets||[]).filter(t=>T_AREAS.has(t.area)&&(!status||t.status===status));}

/* ── Bootstrap ───────────────────────────────────────────────────── */
const params = new URLSearchParams(location.search);
const CODE   = (window.CP_CODE || params.get("country") || "COL").toUpperCase();
const BASE   = window.CP_BASE  || "";

function comparisonUrl(mode, opts) {
  const base = BASE + "../comparison/index_c.html";
  if (mode === "track")   return `${base}?mode=track&c=${encodeURIComponent(opts.c)}`;
  if (mode === "compare") return `${base}?mode=compare&c1=${encodeURIComponent(opts.c1||"")}&c2=${encodeURIComponent(opts.c2||"")}&c3=${encodeURIComponent(opts.c3||"")}&gen=${encodeURIComponent(opts.gen||"latest")}`;
  return base;
}
function buildDocUrlMap(docs) {
  const m={}; docs.forEach(d=>{ if(d.url) m[d.id]=d.url; }); return m;
}
function makePanel(id) {
  const p = document.createElement("div");
  p.className="cp-detail-panel"; p.id=id;
  p.innerHTML=`<button class="cp-detail-panel-close" aria-label="Close">\xd7</button><div class="cp-detail-panel-title"></div><div class="cp-detail-panel-body"></div>`;
  return p;
}

fetch(`${BASE}data/countries/${CODE}.json`)
  .then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
  .then(profile=>{
    Promise.all([
      fetch(`${BASE}data/ghg.json`).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch(`${BASE}../data/processed/benchmarks.json`).then(r=>r.ok?r.json():null).catch(()=>null)
    ]).then(([ghg,bench])=>render(profile,ghg,bench));
  })
  .catch(()=>{
    const el=document.getElementById("cp-story");
    if(el) el.innerHTML=`<p style="color:${ORANGE};">Could not load profile for <strong>${CODE}</strong>.</p>`;
  });

/* ================================================================ RENDER */
/* Chart resilience: when the Chart.js CDN is unreachable (e.g. behind a
   corporate proxy) charts previously skipped silently. safeChart() renders
   an HTML fallback instead, so the data is always visible. */
function chartFallbackBars(el, entries, colorFn){
  const max=Math.max(...entries.map(e=>e[1]),1);
  el.outerHTML=`<div class="cp-chart-fallback">${entries.map(([k,v],i)=>
    `<div class="cp-fb-row"><span class="cp-fb-label">${esc(k)}</span>
      <span class="cp-fb-bar"><span style="width:${Math.round(v/max*100)}%;background:${colorFn?colorFn(k,i):TEAL};"></span></span>
      <span class="cp-fb-val">${v}</span></div>`).join("")}</div>`;
}
function safeChart(canvas, cfg, fallbackEntries, colorFn){
  if(!canvas) return;
  const entries=(fallbackEntries||[]).filter(e=>e[1]>0);
  if(!entries.length){
    canvas.outerHTML=`<div class="cp-empty" style="margin:0;">No data available.</div>`;
    return;
  }
  if(!window.Chart){ chartFallbackBars(canvas, entries, colorFn); return; }
  try { new Chart(canvas, cfg); }
  catch(e){ console.warn("Chart render failed:", e); chartFallbackBars(canvas, entries, colorFn); }
}

function render(p, ghg, bench) {
  document.title=`${p.name} \u2014 Transport in Climate Policy | GIZ-SLOCAT Transport Tracker`;
  const flagEl=document.getElementById("cp-flag");
  if(flagEl){ flagEl.src=`${BASE}../assets/flags/${p.iso2}.png`; flagEl.onerror=()=>{flagEl.src=`https://flagcdn.com/w160/${p.iso2}.png`;}; flagEl.alt=`${p.name} flag`; }
  const nameEl=document.getElementById("cp-name"); if(nameEl) nameEl.textContent=p.name;
  setupCountrySwitcher(p.code);
  const subEl=document.getElementById("cp-sub"); if(subEl) subEl.textContent=[p.region,p.income,p.annex].filter(Boolean).join(", ");
  if(ghg&&ghg[p.code]) p.emissions={...(p.emissions||{}),...ghg[p.code]};
  const docUrlMap=buildDocUrlMap(p.documents);
  renderKPIs(p); renderEUNote(p); renderStory(p); renderEmKPIs(p); renderTrend(p,bench); renderGenerations(p);
  renderJourney(p,docUrlMap); renderTargets(p,docUrlMap); renderMeasures(p,docUrlMap,bench);
  renderBenefits(p); renderAdaptation(p,docUrlMap); renderCoalitions(p);
  renderSimilar(p); renderResources(p); setupExport(p);
  const gen=p.meta&&p.meta.generated;
  const fm=document.getElementById("cp-footer-meta");
  if(fm) fm.textContent=`Profile: ${p.name} (${p.code})${gen?", data generated "+gen:""}`;
}

/* ── KPIs ─────────────────────────────────────────────────────────── */
function renderKPIs(p){
  const el=document.getElementById("cp-kpi"); if(!el)return;
  const tt=transportTargets(p,"Active").length;
  const mm=(p.measures||[]).filter(x=>x.status==="Active").length
          +(p.adaptation||[]).filter(x=>x.status==="Active").length;
  const check=(ok,yes,no)=>`<span class="cp-hero-check ${ok?"yes":"no"}">${ok?"\u2713 "+yes:no}</span>`;
  el.innerHTML=`<div class="cp-hero-checks">
      ${check(tt>0,"Transport targets","No transport targets")}
      ${check(mm>0,"Transport measures","No transport measures")}
    </div>`;
}

/* Emissions KPIs, now living with the trend chart where they have context */
function renderEmKPIs(p){
  const el=document.getElementById("cp-em-kpis"); if(!el)return;
  const e=p.emissions||{};
  const stat=(v,u,l)=>v==null?"":`<div class="cp-em-stat"><span class="cp-em-val">${esc(v)}<small>${u}</small></span><span class="cp-em-lbl">${l}</span></div>`;
  const ord=e.transport_sector_rank!=null?(["1st","2nd","3rd"][e.transport_sector_rank-1]||e.transport_sector_rank+"th"):null;
  el.innerHTML=
    stat(e.transport_share_pct,"%","of national emissions")+
    stat(e.transport_mt," Mt","transport CO\u2082e, "+(e.year||""))+
    stat(e.transport_per_capita," t","per person")+
    (ord?`<div class="cp-em-stat"><span class="cp-em-val">${ord}</span><span class="cp-em-lbl">largest emitting sector</span></div>`:"");
}

/* ── Country switcher ─────────────────────────────────────────────── */
function clientSlugify(name){
  return String(name).normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function setupCountrySwitcher(currentCode) {
  const btn=document.getElementById("cp-name");
  const picker=document.getElementById("cp-country-picker");
  const search=document.getElementById("cp-country-picker-search");
  const listEl=document.getElementById("cp-country-picker-list");
  if(!btn||!picker||!listEl)return;

  let countries=null, loaded=false;

  function open(){
    picker.hidden=false; btn.setAttribute("aria-expanded","true");
    if(!loaded){
      loaded=true;
      fetch(`${BASE}data/countries/index.json`)
        .then(r=>r.ok?r.json():null)
        .then(idx=>{
          countries=(idx&&idx.countries||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
          draw("");
        })
        .catch(()=>{ listEl.innerHTML=`<li class="cp-country-picker-empty">Could not load country list.</li>`; });
    }
    search.value=""; search.focus();
  }
  function close(){
    picker.hidden=true; btn.setAttribute("aria-expanded","false");
  }
  function draw(q){
    if(!countries)return;
    const query=q.toLowerCase().trim();
    const list=query?countries.filter(c=>c.name.toLowerCase().includes(query)):countries;
    listEl.innerHTML=list.length?list.map(c=>`
      <li class="cp-country-picker-item${c.code===currentCode?" active":""}" data-code="${esc(c.code)}" role="option">
        <img src="${BASE}../assets/flags/${esc(c.iso2)}.png" onerror="this.onerror=null;this.src='https://flagcdn.com/w40/${esc(c.iso2)}.png'" alt="">
        <span>${esc(c.name)}</span>
      </li>`).join(""):`<li class="cp-country-picker-empty">No countries match "${esc(q)}".</li>`;
    listEl.querySelectorAll("[data-code]").forEach(li=>{
      li.addEventListener("click",()=>{
        const code=li.dataset.code;
        const target=countries.find(c=>c.code===code);
        if(target) location.href=`${BASE}countries/${clientSlugify(target.name)}/`;
      });
    });
  }

  btn.addEventListener("click",(e)=>{
    e.stopPropagation();
    if(picker.hidden) open(); else close();
  });
  search.addEventListener("input",()=>draw(search.value));
  document.addEventListener("click",(e)=>{
    if(!picker.hidden && !picker.contains(e.target) && e.target!==btn) close();
  });
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") close(); });
}


function renderEUNote(p) {
  const el=document.getElementById("cp-eu-note"); if(!el)return;
  if(p.reports_via_eu){ el.hidden=false; el.innerHTML=`<strong>Reports collectively through the EU NDC.</strong> NDC information below refers to the joint submission of the European Union and its 27 member states.`; }
}

/* ── Story ────────────────────────────────────────────────────────── */
function renderStory(p) {
  const el=document.getElementById("cp-story"); if(!el)return;
  const e=p.emissions||{};
  const am=p.measures.filter(m=>m.status==="Active").length;
  const tmit=p.targets.filter(t=>t.area==="Transport sector mitigation target"&&t.status==="Active").length;
  const tada=p.targets.filter(t=>t.area==="Transport sector adaptation target"&&t.status==="Active").length;
  const at=tmit+tada;
  const hasOverall=p.targets.some(t=>t.area==="Overall mitigation target"&&t.status==="Active");
  const aa=p.adaptation.filter(a=>a.status==="Active").length;
  const asi=p.asi_summary||{};
  const topAsi=Object.entries(asi).sort((a,b)=>b[1]-a[1]).slice(0,1).map(x=>x[0]);
  const cats=p.category_summary||{};
  const topCats=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
  const ndcN=p.documents.filter(d=>d.type==="NDC").length;
  const hasLTS=p.documents.some(d=>d.type==="LTS"&&d.status==="Active");

  let h=`<p><strong>${esc(p.name)}</strong> has submitted <strong>${ndcN} NDC${ndcN>1?"s":""}</strong>`;
  if(hasLTS) h+=` and a <strong>long-term strategy</strong>`;
  h+=` under the Paris Agreement. `;
  if(e.transport_share_pct!=null) h+=`Transport accounts for <span class="hl">${e.transport_share_pct}% of national emissions</span> (${e.transport_mt} Mt CO\u2082e in ${e.year}). `;
  if(e.transport_per_capita!=null) h+=`Per capita transport emissions stand at <strong>${e.transport_per_capita} t CO\u2082e</strong>. `;
  if(e.transport_sector_rank!=null){ const ord=["1st","2nd","3rd"][e.transport_sector_rank-1]||e.transport_sector_rank+"th"; h+=`Transport is the <span class="hl">${ord} largest emitting sector</span>. `; }
  h+=`</p><p>Its active documents `;
  h+=at>0?`set <strong>${at} transport target${at>1?"s":""}</strong>${tada>0?` (${tmit} mitigation, ${tada} adaptation)`:""}`:`<strong>do not set a transport target</strong>`;
  h+=` and `;
  h+=am>0?`include <strong>${am} transport mitigation measure${am>1?"s":""}</strong>`:`<strong>do not include transport mitigation measures</strong>`;
  if(am>0&&topAsi.length){
    h+=`, weighted toward <strong>${esc(topAsi[0])}</strong> approaches`;
    if(topCats.length===2) h+=`, with <strong>${esc(topCats[0])}</strong> and <strong>${esc(topCats[1])}</strong> as the leading categories`;
    else if(topCats.length===1) h+=`, with <strong>${esc(topCats[0])}</strong> as the leading category`;
  }
  h+=`. `;
  h+=aa>0?`It also addresses <strong>transport adaptation</strong> (${aa} measure${aa>1?"s":""}).`:`It does not address transport adaptation.`;
  h+=`</p>`;
  if(p.net_zero_target||hasOverall||(p.coalitions&&p.coalitions.length)){
    h+=`<p>`;
    if(p.net_zero_target&&hasOverall) h+=`${esc(p.name)} has committed to a <span class="hl">net-zero target</span> and sets an <strong>overall mitigation target</strong>. `;
    else if(p.net_zero_target) h+=`${esc(p.name)} has committed to a <span class="hl">net-zero target</span>. `;
    else if(hasOverall) h+=`${esc(p.name)} sets an <strong>overall mitigation target</strong>. `;
    if(p.coalitions&&p.coalitions.length) h+=`It has joined <strong>${p.coalitions.length} international transport coalition${p.coalitions.length>1?"s":""}</strong>.`;
    h+=`</p>`;
  }
  el.innerHTML=h;
}

/* ── Emissions trend: country view (Mt) + indexed global comparison ── */
function renderTrend(p,bench){
  const wrap=document.getElementById("cp-trend");
  if(!wrap) return;
  const t=p.trends;
  if(!t||!t.years||!t.years.length){ const b=wrap.closest(".cp-trend-block"); if(b) b.hidden=true; return; }
  const i0=Math.max(t.years.indexOf(1990),0);
  const years=t.years.slice(i0);
  const transport=t.transport.slice(i0);
  const total=(t.total||[]).slice(i0);
  const g=bench&&bench.global_transport;
  const gMap=g?Object.fromEntries(g.years.map((y,i)=>[y,g.transport[i]])):null;
  const globalT=gMap?years.map(y=>gMap[y]??null):null;

  const sub=document.getElementById("cp-trend-sub");
  if(sub){
    const first=transport[0], last=transport[transport.length-1];
    const dir=last>first*1.05?"has grown":last<first*0.95?"has declined":"has remained stable";
    sub.innerHTML=`Transport CO\u2082 in <strong>${esc(p.name)}</strong> ${dir} since ${years[0]}: from ${first} to <strong>${last} Mt</strong> in ${years[years.length-1]} (${esc(t.source||"EDGAR")}).`;
  }

  // Target pins: active targets grouped by year, colour by highest-priority type
  const PIN_TYPE={"Net zero target":{k:"Net zero",c:"#9DBE3D",pr:0},
    "Transport sector mitigation target":{k:"Transport",c:"#003D5C",pr:1},
    "Transport sector adaptation target":{k:"Adaptation",c:"#7A9B2E",pr:2},
    "Overall mitigation target":{k:"Overall",c:"#E8821A",pr:3}};
  const byYear={};
  (p.targets||[]).filter(x=>x.status==="Active"&&PIN_TYPE[x.area]&&+x.year>years[0])
    .forEach(x=>{ (byYear[+x.year]=byYear[+x.year]||new Set()).add(x.area); });
  const pinYears=Object.keys(byYear).map(Number).sort((a,b)=>a-b).slice(0,6)
    .map(yr=>{ const types=[...byYear[yr]].map(a=>PIN_TYPE[a]).sort((a,b)=>a.pr-b.pr);
      return {year:yr,types,c:types[0].c}; });
  const lastYear=years[years.length-1];
  const allYears=years.slice();
  const maxPin=pinYears.length?Math.max(...pinYears.map(x=>x.year)):0;
  for(let yr=lastYear+1;yr<=maxPin;yr++) allYears.push(yr);

  // Legend: colour key for pin types actually present
  const legendEl=document.getElementById("cp-pin-legend");
  if(legendEl&&pinYears.length){
    const present=[...new Map(pinYears.flatMap(pn=>pn.types).map(x=>[x.k,x])).values()].sort((a,b)=>a.pr-b.pr);
    legendEl.innerHTML=`<span class="cp-pin-key-title">Target years:</span> `+present.map(x=>
      `<span class="cp-pin-key"><span class="cp-pin-swatch" style="background:${x.c}"></span>${x.k}</span>`).join("");
    legendEl.hidden=false;
  }

  const canvas=document.getElementById("cp-trend-chart");
  if(!canvas) return;

  const pinPlugin={id:"targetPins",afterDatasetsDraw(chart){
    const {ctx,chartArea,scales:{x}}=chart;
    pinYears.forEach((pin,idx)=>{
      const i=allYears.indexOf(pin.year); if(i<0) return;
      const px=x.getPixelForValue(i);
      ctx.save();
      ctx.strokeStyle=pin.c; ctx.setLineDash([4,3]); ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(px,chartArea.top+16); ctx.lineTo(px,chartArea.bottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=pin.c; ctx.font="700 10px 'Source Sans 3'";
      // year-only label, clamped so it never truncates at the edges
      const w=ctx.measureText(String(pin.year)).width;
      let tx=px; ctx.textAlign="center";
      if(px-w/2<chartArea.left){ tx=chartArea.left; ctx.textAlign="left"; }
      else if(px+w/2>chartArea.right){ tx=chartArea.right; ctx.textAlign="right"; }
      ctx.fillText(String(pin.year),tx,chartArea.top+(idx%2?12:2)+8);
      ctx.restore();
    });
  }};

  const F={family:"Source Sans 3",size:11};
  function mtConfig(){
    const ds=[{label:"Transport CO\u2082 (Mt)",data:transport,borderColor:TEAL,backgroundColor:"rgba(0,164,189,0.10)",fill:true,pointRadius:0,borderWidth:2.5,tension:0.25}];
    if(total.length&&total.some(v=>v!=null))
      ds.push({label:"National total (Mt)",data:total,borderColor:MUTED,borderDash:[6,4],fill:false,pointRadius:0,borderWidth:1.6,tension:0.25});
    return {type:"line",data:{labels:allYears,datasets:ds},
      options:{plugins:{legend:{position:"bottom",labels:{font:F,boxWidth:14,boxHeight:2,padding:12}}},interaction:{mode:"index",intersect:false},
        scales:{x:{ticks:{font:F,maxTicksLimit:9},grid:{display:false}},
                y:{ticks:{font:F},title:{display:true,text:"Mt CO\u2082",font:F},grid:{color:"rgba(0,0,0,0.05)"}}}},
      plugins:[pinPlugin]};
  }
  function idx100(arr){ const b=arr.find(v=>v!=null)||1; return arr.map(v=>v==null?null:+(v/b*100).toFixed(1)); }
  function idxConfig(){
    const ds=[{label:esc(p.name)+" transport",data:idx100(transport),borderColor:TEAL,fill:false,pointRadius:0,borderWidth:2.5,tension:0.25}];
    if(total.length&&total.some(v=>v!=null))
      ds.push({label:esc(p.name)+" national total",data:idx100(total),borderColor:MUTED,borderDash:[6,4],fill:false,pointRadius:0,borderWidth:1.6,tension:0.25});
    if(globalT&&globalT.some(v=>v!=null))
      ds.push({label:"World transport",data:idx100(globalT),borderColor:ORANGE,fill:false,pointRadius:0,borderWidth:1.8,tension:0.25});
    return {type:"line",data:{labels:allYears,datasets:ds},
      options:{plugins:{legend:{position:"bottom",labels:{font:F,boxWidth:14,boxHeight:2,padding:12}}},interaction:{mode:"index",intersect:false},
        scales:{x:{ticks:{font:F,maxTicksLimit:9},grid:{display:false}},
                y:{ticks:{font:F},title:{display:true,text:"Index (1990 = 100)",font:F},grid:{color:"rgba(0,0,0,0.05)"}}}},
      plugins:[pinPlugin]};
  }

  if(window.Chart){
    try{
      let chart=new Chart(canvas,mtConfig());
      const views=document.getElementById("cp-trend-views");
      if(views){
        views.hidden=false;
        views.querySelectorAll(".cp-view-chip").forEach(ch=>ch.addEventListener("click",()=>{
          views.querySelectorAll(".cp-view-chip").forEach(x=>x.classList.remove("on"));
          ch.classList.add("on");
          chart.destroy();
          chart=new Chart(canvas,ch.dataset.view==="idx"?idxConfig():mtConfig());
        }));
      }
      return;
    }catch(e){ console.warn("Trend chart failed:", e); }
  }
  // SVG fallback (transport line only)
  const w=640,h=180,pad=6,max=Math.max(...transport),min=Math.min(...transport);
  const pts=transport.map((v,i)=>`${pad+i*(w-2*pad)/(transport.length-1)},${h-pad-((v-min)/(max-min||1))*(h-2*pad)}`).join(" ");
  canvas.outerHTML=`<svg class="cp-trend-fallback" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Transport emissions trend">
    <polyline points="${pts}" fill="none" stroke="#00A4BD" stroke-width="2.5"/></svg>
    <div class="cp-pub-meta">${years[0]}\u2013${years[years.length-1]}: ${min}\u2013${max} Mt</div>`;
}

/* ── Generation evolution: is transport content deepening over time? ── */
function renderGenerations(p){
  const block=document.getElementById("cp-gen-block");
  const canvas=document.getElementById("cp-gen-chart");
  if(!block||!canvas) return;
  const genByDoc={};
  (p.documents||[]).forEach(d=>{ if(d.id&&d.generation) genByDoc[d.id]=d.generation; });
  const GENS=["gen1","gen2","gen3"];
  const LBL={gen1:"1st generation",gen2:"2nd generation",gen3:"3rd generation"};
  const COL={gen1:NAVY,gen2:TEAL,gen3:ORANGE};
  const counts={gen1:{t:0,m:0},gen2:{t:0,m:0},gen3:{t:0,m:0}};
  (p.targets||[]).forEach(t=>{const g=genByDoc[t.doc_id];if(counts[g])counts[g].t++;});
  (p.measures||[]).forEach(m=>{const g=genByDoc[m.doc_id];if(counts[g])counts[g].m++;});
  const present=GENS.filter(g=>counts[g].t+counts[g].m>0);
  if(present.length<2) return; // one generation = nothing to evolve; keep hidden
  block.hidden=false;
  const sub=document.getElementById("cp-gen-sub");
  if(sub){
    const first=present[0],last=present[present.length-1];
    const v1=counts[first].t+counts[first].m,v2=counts[last].t+counts[last].m;
    const verb=v2>v1?"has grown":v2<v1?"has decreased":"has stayed level";
    sub.innerHTML=`Transport content volume ${verb} from the ${LBL[first]} (${v1} items) to the ${LBL[last]} (${v2}). Content volume is not the same as ambition, but it shows where attention went.`;
  }
  const cfg={type:"bar",
    data:{labels:present.map(g=>LBL[g]),datasets:[
      {label:"Targets",data:present.map(g=>counts[g].t),backgroundColor:present.map(g=>COL[g]),borderRadius:4},
      {label:"Measures",data:present.map(g=>counts[g].m),backgroundColor:present.map(g=>COL[g]+"80"),borderRadius:4}]},
    options:{plugins:{legend:{position:"bottom",labels:{font:{family:"Source Sans 3",size:11},boxWidth:12}}},
      scales:{x:{ticks:{font:{family:"Source Sans 3",size:11}},grid:{display:false}},
              y:{ticks:{font:{family:"Source Sans 3",size:11},precision:0},grid:{color:"rgba(0,0,0,0.05)"}}}}};
  if(window.Chart){ try{ new Chart(canvas,cfg); return; }catch(e){ console.warn("Gen chart failed:",e); } }
  chartFallbackBars(canvas, present.map(g=>[LBL[g],counts[g].t+counts[g].m]), g=>COL[present.find(x=>LBL[x]===g)]||TEAL);
}

/* ── Journey — timeline line + version labels + detail panel ─────── */
function renderJourney(p, docUrlMap) {
  const wrap=document.getElementById("cp-journey"); if(!wrap)return;
  const docs=p.documents;

  // Cards row — use d.version for the label
  wrap.innerHTML=docs.map((d,i)=>{
    const type=d.type.toLowerCase();
    const active=d.status==="Active";
    const tc=d.transport||{};
    const year=d.date?d.date.slice(0,4):"";
    return `<div class="cp-jcard${active?" active":""}" data-idx="${i}">
        <div class="cp-jcard-inner">
          <span class="cp-jcard-type ${type}">${esc(d.type)}</span>
          <div class="cp-jcard-name">${esc(d.version)}</div>
          ${year?`<div class="cp-jcard-year">${year}</div>`:""}
          <div class="cp-jcard-status"><span class="cp-jcard-dot ${tc.has_content?"has":"no"}"></span>${esc(d.status)}</div>
        </div>
        ${i<docs.length-1?`<span class="cp-jcard-arrow">\u203a</span>`:""}
      </div>`;
  }).join("");

  // Timeline bar
  const years=docs.map(d=>d.date?+d.date.slice(0,4):null).filter(Boolean);
  const minY=Math.min(...years,2015), maxY=Math.max(...years,new Date().getFullYear()+1);
  const span=maxY-minY||1;

  const tlBar=document.createElement("div");
  tlBar.style.cssText="position:relative;height:40px;margin:0.5rem 0.4rem 0;";

  // horizontal line
  const line=document.createElement("div");
  line.style.cssText="position:absolute;top:16px;left:0;right:0;height:2px;background:linear-gradient(to right,var(--ct-border),var(--ct-green) 80%,var(--ct-border));border-radius:2px;";
  tlBar.appendChild(line);

  // submission dots
  years.forEach(yr=>{
    const pct=((yr-minY)/span*100).toFixed(1);
    const dot=document.createElement("div");
    dot.title=yr;
    dot.style.cssText=`position:absolute;left:${pct}%;top:10px;width:12px;height:12px;border-radius:50%;background:var(--ct-navy);border:2px solid #fff;box-shadow:0 0 0 2px var(--ct-navy);transform:translateX(-50%);z-index:2;`;
    tlBar.appendChild(dot);
  });

  // Paris deadlines
  PARIS_DEADLINES.filter(pd=>pd.year>=minY&&pd.year<=maxY).forEach(pd=>{
    const pct=((pd.year-minY)/span*100).toFixed(1);
    const m=document.createElement("div");
    m.style.cssText=`position:absolute;left:${pct}%;top:6px;transform:translateX(-50%);text-align:center;z-index:1;`;
    m.innerHTML=`<div style="width:1px;height:22px;background:var(--ct-muted);margin:0 auto;opacity:0.45;"></div><div style="font-size:0.65rem;font-weight:700;color:var(--ct-muted);">${pd.year}</div><div style="font-size:0.6rem;color:var(--ct-muted);white-space:nowrap;line-height:1.1;">${esc(pd.label)}</div>`;
    tlBar.appendChild(m);
  });
  wrap.parentNode.insertBefore(tlBar,wrap.nextSibling);

  // Detail panel
  const panel=makePanel("cp-journey-detail-panel");
  tlBar.parentNode.insertBefore(panel,tlBar.nextSibling);
  panel.querySelector(".cp-detail-panel-close").addEventListener("click",()=>{
    panel.classList.remove("open");
    wrap.querySelectorAll(".cp-jcard").forEach(c=>c.classList.remove("open"));
  });

  wrap.querySelectorAll(".cp-jcard").forEach(card=>{
    card.querySelector(".cp-jcard-inner").addEventListener("click",()=>{
      const idx=+card.dataset.idx;
      const d=docs[idx];
      const tc=d.transport||{};
      const counts=d.counts||{};
      const already=card.classList.contains("open");
      wrap.querySelectorAll(".cp-jcard").forEach(c=>c.classList.remove("open"));
      if(already){ panel.classList.remove("open"); return; }
      card.classList.add("open");
      const year=d.date?d.date.slice(0,4):"";
      const checks=[
        {label:"Mitigation measures",val:tc.mitigation_measures},
        {label:"Transport targets",  val:tc.mitigation_target},
        {label:"Adaptation measures",val:tc.adaptation_measures},
      ];
      panel.querySelector(".cp-detail-panel-title").innerHTML=
        `${esc(d.version)} <span style="font-weight:400;color:var(--ct-muted);">${esc(d.type)}, ${esc(d.status)}${year?" ("+year+")":""}</span>`;
      panel.querySelector(".cp-detail-panel-body").innerHTML=tc.has_content?`
        <div class="cp-jcard-checks">${checks.map(c=>`<div class="cp-jcard-check ${c.val?"on":"off"}">${c.val?"\u2713":"\u25cb"} ${esc(c.label)}</div>`).join("")}</div>
        <div class="cp-jcard-count-row">${counts.measures?`<span>${counts.measures} measures</span>`:""} ${counts.targets?`<span>${counts.targets} targets</span>`:""} ${counts.adaptation?`<span>${counts.adaptation} adaptation</span>`:""}</div>
        <div class="cp-jcard-det-links">
          ${d.url?`<a href="${esc(d.url)}" target="_blank" rel="noopener" class="cp-jcard-det-link">View document \u2197</a>`:""}
          <a href="${comparisonUrl("track",{c:p.code})}" target="_blank" rel="noopener" class="cp-jcard-det-link secondary">Compare evolution in NDC Comparison \u2192</a>
        </div>`
        :`<p style="color:var(--ct-muted);font-size:0.88rem;">No transport content assessed in this document.</p>
        <div class="cp-jcard-det-links"><a href="${comparisonUrl("track",{c:p.code})}" target="_blank" rel="noopener" class="cp-jcard-det-link secondary">Compare evolution in NDC Comparison \u2192</a></div>`;
      panel.classList.add("open");
      panel.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
  });

  // Generation note
  const noteEl=document.getElementById("cp-journey-note");
  if(noteEl){
    noteEl.innerHTML=`<button class="cp-gen-note-toggle" id="gen-note-toggle">\u2139 About NDC generations</button>
      <div class="cp-gen-note-body" id="gen-note-body" hidden>
        ${GEN_NOTE.split("\n").map(l=>l.startsWith("\u2022")?`<p style="padding-left:1rem;margin:0.2rem 0;">\u2022 ${esc(l.slice(1).trim())}</p>`:`<p style="margin:0.25rem 0;">${esc(l)}</p>`).join("")}
      </div>`;
    document.getElementById("gen-note-toggle").addEventListener("click",()=>{
      const b=document.getElementById("gen-note-body"); b.hidden=!b.hidden;
    });
  }
}

/* ── Targets ──────────────────────────────────────────────────────── */
function renderTargets(p, docUrlMap) {
  const subEl=document.getElementById("cp-targets-sub");
  const fbar=document.getElementById("cp-target-filters");
  const listEl=document.getElementById("cp-targets");
  if(!listEl)return;
  const active=p.targets.filter(t=>t.status==="Active");
  if(subEl) subEl.innerHTML=`<strong>${active.length}</strong> transport-related target${active.length!==1?"s":""} in active documents.`;
  const areas=[...new Set(active.map(t=>t.area).filter(Boolean))];
  const docTypes=[...new Set(active.map(t=>t.doc_type).filter(Boolean))];
  if(fbar){
    fbar.innerHTML=`
      <div class="cp-filter-row"><span class="cp-filter-label">By document:</span>
        <button class="cp-filter active" data-doc="all">All (${active.length})</button>
        ${docTypes.map(dt=>`<button class="cp-filter" data-doc="${esc(dt)}">${esc(dt)} (${active.filter(t=>t.doc_type===dt).length})</button>`).join("")}
      </div>
      <div class="cp-filter-row" style="margin-top:0.4rem;"><span class="cp-filter-label">By type:</span>
        <button class="cp-filter active" data-type="all">All (${active.length})</button>
        ${areas.map(a=>`<button class="cp-filter" data-type="${esc(a)}">${esc(a)} (${active.filter(t=>t.area===a).length})</button>`).join("")}
      </div>`;
  }
  let curType="all",curDoc="all";
  function draw(){
    const list=active.filter(t=>(curType==="all"||t.area===curType)&&(curDoc==="all"||t.doc_type===curDoc));
    listEl.innerHTML=list.length?list.map(t=>{
      const docUrl=t.doc_id?(docUrlMap[t.doc_id]||null):null;
      return `<div class="cp-measure"><div class="cp-measure-top">
        <span class="cp-measure-instrument">${esc(t.content||t.type)}</span>
        ${t.year?`<span class="cp-measure-asi shift">${esc(t.year)}</span>`:""}
      </div><p class="cp-measure-meta">${esc(t.area||"")}${t.conditionality?", "+esc(t.conditionality):""}, ${docUrl?`<a href="${esc(docUrl)}" target="_blank" rel="noopener" style="color:var(--ct-teal)">${esc(t.version||t.document||"")}</a>`:esc(t.version||t.document||"")}${t.page&&t.page!=="n/a"?", p. "+esc(t.page):""}</p></div>`;
    }).join(""):`<div class="cp-empty">No targets match.</div>`;
  }
  if(fbar){
    fbar.querySelectorAll("[data-type]").forEach(b=>b.addEventListener("click",()=>{fbar.querySelectorAll("[data-type]").forEach(x=>x.classList.remove("active"));b.classList.add("active");curType=b.dataset.type;draw();}));
    fbar.querySelectorAll("[data-doc]").forEach(b=>b.addEventListener("click",()=>{fbar.querySelectorAll("[data-doc]").forEach(x=>x.classList.remove("active"));b.classList.add("active");curDoc=b.dataset.doc;draw();}));
  }
  draw();
  const navCmp=document.getElementById("cp-nav-compare");
  if(navCmp) navCmp.href=comparisonUrl("track",{c:p.code});
  const cmpLink=document.getElementById("cp-targets-compare");
  if(cmpLink){cmpLink.href=comparisonUrl("track",{c:p.code});cmpLink.hidden=false;}
}

/* ── Measures ─────────────────────────────────────────────────────── */
function renderMeasures(p, docUrlMap, bench) {
  const subEl=document.getElementById("cp-measures-sub");
  const fbar=document.getElementById("cp-measure-filters");
  const listEl=document.getElementById("cp-measures");
  const moreBtn=document.getElementById("cp-measures-more");
  if(!listEl)return;
  const active=p.measures.filter(m=>m.status==="Active");
  if(subEl) subEl.innerHTML=`<strong>${active.length}</strong> transport mitigation measures in active documents.`;

  // A-S-I: one stacked bar plus a generated sentence — the sentence is the
  // insight, the bar is its picture (replaces the space-hungry doughnut).
  const asiC=document.getElementById("cp-asi-chart");
  if(asiC){
    const asi=p.asi_summary||{};
    const order=["Avoid","Shift","Improve"].filter(k=>asi[k]);
    const total=order.reduce((s,k)=>s+asi[k],0);
    const sEl=document.getElementById("cp-asi-sentence");
    if(sEl&&total){
      const top=order.slice().sort((a,b)=>asi[b]-asi[a])[0];
      const low=order.slice().sort((a,b)=>asi[a]-asi[b])[0];
      const missing=["Avoid","Shift","Improve"].filter(k=>!asi[k]);
      let sent=`The strategy leans on <strong>${top}</strong> (${asi[top]} of ${total} measures)`;
      if(missing.length) sent+=`, with no ${missing.join(" or ")} content`;
      else if(low!==top&&asi[low]/total<0.15) sent+=`, with limited ${low} content (${asi[low]})`;
      sEl.innerHTML=sent+".";
    }
    safeChart(asiC,{type:"bar",
      data:{labels:[""],datasets:order.map(k=>({label:k,data:[asi[k]],backgroundColor:ASI_COLOR[k]||MUTED,barThickness:26}))},
      options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:"bottom",labels:{font:{family:"Source Sans 3",size:11},boxWidth:12,padding:10}},
          tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw} (${Math.round(c.raw/total*100)}%)`}}},
        scales:{x:{stacked:true,display:false,max:total},y:{stacked:true,display:false}}}},
      order.map(k=>[k,asi[k]]), k=>ASI_COLOR[k]||MUTED);
  }
  // Category chart with global-average emphasis markers (◆): shows whether
  // this country's focus on a category is above or below what is typical.
  const catC=document.getElementById("cp-cat-chart");
  if(catC){
    const cats=p.category_summary||{};
    const catTotal=Object.values(cats).reduce((s,v)=>s+v,0);
    const gShare=(bench&&bench.category_share)||null;
    const labels=Object.keys(cats);
    const datasets=[{type:"bar",data:Object.values(cats),backgroundColor:TEAL,borderRadius:4,order:2}];
    if(gShare&&catTotal){
      datasets.push({type:"scatter",label:"Global average emphasis",
        data:labels.map(l=>({x:+( (gShare[l]||0)*catTotal ).toFixed(1),y:l})),
        pointStyle:"rectRot",radius:5,backgroundColor:NAVY,borderColor:"#fff",borderWidth:1,order:1});
    }
    safeChart(catC,{type:"bar",
      data:{labels,datasets},
      options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},
          tooltip:{callbacks:{label:c=>c.dataset.type==="scatter"
            ?`Typical emphasis: ${c.raw.x} of ${catTotal} measures`
            :`${c.raw} measures`}}},
        scales:{x:{ticks:{font:{family:"Source Sans 3"}},grid:{display:false}},
                y:{ticks:{font:{family:"Source Sans 3",size:11},callback:function(v){const l=this.getLabelForValue(v);return l.length>24?l.slice(0,24)+"\u2026":l;}},grid:{display:false}}}}},
      Object.entries(cats));
  }

  const categories=[...new Set(active.map(m=>m.category).filter(Boolean))];
  const modes=[...new Set(active.flatMap(m=>m.modes||[]).filter(Boolean))].sort();
  const docTypes=[...new Set(active.map(m=>m.doc_type).filter(Boolean))];
  let curAsi="all",curCat="all",curMode="all",curDoc="all",curSearch="",showAll=false;

  if(fbar){
    fbar.innerHTML=`
      <div class="cp-filter-row"><span class="cp-filter-label">By document:</span>
        <button class="cp-filter active" data-doc="all">All (${active.length})</button>
        ${docTypes.map(dt=>`<button class="cp-filter" data-doc="${esc(dt)}">${esc(dt)} (${active.filter(m=>m.doc_type===dt).length})</button>`).join("")}
      </div>
      <div class="cp-filter-row" style="margin-top:0.4rem;"><span class="cp-filter-label">By A-S-I:</span>
        <button class="cp-filter active" data-asi="all">All (${active.length})</button>
        ${["Avoid","Shift","Improve"].map(a=>{const n=active.filter(m=>(m.asi||[]).includes(a)).length;return n?`<button class="cp-filter" data-asi="${a}">${a} (${n})</button>`:""}).join("")}
      </div>
      <div class="cp-filter-row" style="margin-top:0.4rem;"><span class="cp-filter-label">By category:</span>
        <button class="cp-filter active" data-cat="all">All (${active.length})</button>
        ${categories.map(c=>`<button class="cp-filter" data-cat="${esc(c)}">${esc(c)} (${active.filter(m=>m.category===c).length})</button>`).join("")}
      </div>
      ${modes.length?`<div class="cp-filter-row" style="margin-top:0.4rem;"><span class="cp-filter-label">By mode:</span>
        <button class="cp-filter active" data-mode="all">All (${active.length})</button>
        ${modes.map(m=>`<button class="cp-filter" data-mode="${esc(m)}">${esc(m)} (${active.filter(x=>(x.modes||[]).includes(m)).length})</button>`).join("")}
      </div>`:""}
      <div class="cp-filter-row" style="margin-top:0.5rem;">
        <input class="cp-search-input" id="cp-measures-search" placeholder="Search measures\u2026" type="text">
      </div>`;
    fbar.querySelectorAll("[data-doc]").forEach(b=>b.addEventListener("click",()=>{fbar.querySelectorAll("[data-doc]").forEach(x=>x.classList.remove("active"));b.classList.add("active");curDoc=b.dataset.doc;showAll=false;draw();}));
    fbar.querySelectorAll("[data-asi]").forEach(b=>b.addEventListener("click",()=>{fbar.querySelectorAll("[data-asi]").forEach(x=>x.classList.remove("active"));b.classList.add("active");curAsi=b.dataset.asi;showAll=false;draw();}));
    fbar.querySelectorAll("[data-cat]").forEach(b=>b.addEventListener("click",()=>{fbar.querySelectorAll("[data-cat]").forEach(x=>x.classList.remove("active"));b.classList.add("active");curCat=b.dataset.cat;showAll=false;draw();}));
    fbar.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{fbar.querySelectorAll("[data-mode]").forEach(x=>x.classList.remove("active"));b.classList.add("active");curMode=b.dataset.mode;showAll=false;draw();}));
    const srch=document.getElementById("cp-measures-search");
    if(srch) srch.addEventListener("input",()=>{curSearch=srch.value.toLowerCase().trim();showAll=false;draw();});
  }
  function draw(){
    const list=active.filter(m=>(curAsi==="all"||(m.asi||[]).includes(curAsi))&&(curCat==="all"||m.category===curCat)&&(curMode==="all"||(m.modes||[]).includes(curMode))&&(curDoc==="all"||m.doc_type===curDoc)&&(!curSearch||[m.instrument,m.purpose,m.category,m.quote].some(f=>f&&f.toLowerCase().includes(curSearch))));
    const shown=showAll?list:list.slice(0,6);
    listEl.innerHTML=shown.map(m=>{
      const ac=((m.asi&&m.asi[0])||"improve").toLowerCase();
      const du=m.doc_id?(docUrlMap[m.doc_id]||null):null;
      return `<div class="cp-measure ${ac}"><div class="cp-measure-top"><span class="cp-measure-instrument">${esc(m.instrument||m.purpose||m.category)}</span>${m.asi&&m.asi.length?`<span class="cp-measure-asi ${ac}">${esc(m.asi.join("/"))}</span>`:""}</div>${m.quote?`<p class="cp-measure-quote">${esc(m.quote)}</p>`:""}<p class="cp-measure-meta">${esc(m.category||"")}, ${du?`<a href="${esc(du)}" target="_blank" rel="noopener" style="color:var(--ct-teal)">${esc(m.version||m.document||"")}</a>`:esc(m.version||m.document||"")}${m.page?", p. "+esc(m.page):""}</p>${m.modes&&m.modes.length?`<div class="cp-measure-tags">${m.modes.map(x=>`<span class="cp-tag">${esc(x)}</span>`).join("")}</div>`:""}</div>`;
    }).join("")||`<div class="cp-empty">No measures match.</div>`;
    if(moreBtn){if(list.length>6){moreBtn.hidden=false;moreBtn.textContent=showAll?"Show fewer":`Show all ${list.length} measures`;}else moreBtn.hidden=true;}
  }
  if(moreBtn) moreBtn.addEventListener("click",()=>{showAll=!showAll;draw();});
  draw();
  const cmpLink=document.getElementById("cp-measures-compare");
  if(cmpLink){cmpLink.href=comparisonUrl("track",{c:p.code});cmpLink.hidden=false;}
}

/* ── Co-benefits — icon grid + shared detail panel below ─────────── */
function renderBenefits(p) {
  const grid=document.getElementById("cp-benefits");
  const sdgRow=document.getElementById("cp-sdgs");
  if(!grid)return;
  const active=p.benefits.filter(b=>b.status==="Active");
  const present={};
  active.forEach(b=>{present[b.type]=b;});

  grid.innerHTML=Object.entries(BENEFIT_ICONS).map(([type,info])=>{
    const on=!!present[type];
    return `<div class="cp-benefit ${on?"on":"off"}" data-btype="${esc(type)}" style="cursor:${on?"pointer":"default"}">
      ${on?`<svg class="cp-benefit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`:""}
      <div class="cp-benefit-icon"><svg viewBox="0 0 24 24">${info.icon}</svg></div>
      <div class="cp-benefit-label">${esc(info.label)}</div>
    </div>`;
  }).join("");

  // Shared panel below grid
  const panel=makePanel("cp-benefits-detail-panel");
  grid.parentNode.insertBefore(panel,grid.nextSibling);
  panel.querySelector(".cp-detail-panel-close").addEventListener("click",()=>{
    panel.classList.remove("open");
    grid.querySelectorAll(".cp-benefit").forEach(c=>c.classList.remove("selected"));
  });
  grid.querySelectorAll(".cp-benefit.on").forEach(card=>{
    card.addEventListener("click",()=>{
      const type=card.dataset.btype;
      const b=present[type];
      if(!b)return;
      const already=card.classList.contains("selected");
      grid.querySelectorAll(".cp-benefit").forEach(c=>c.classList.remove("selected"));
      if(already){panel.classList.remove("open");return;}
      card.classList.add("selected");
      panel.querySelector(".cp-detail-panel-title").textContent=BENEFIT_ICONS[type]?.label||type;
      panel.querySelector(".cp-detail-panel-body").innerHTML=`
        ${b.quote?`<p class="cp-pin-pop-content">${esc(b.quote)}</p>`:""}
        <p class="cp-pin-pop-meta" style="margin-top:0.5rem;">${esc(b.version||b.document||"")}</p>`;
      panel.classList.add("open");
      panel.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
  });

  // SDGs
  if(sdgRow){
    const sdgEntry=active.find(b=>/SDG/i.test(b.type));
    if(sdgEntry&&sdgEntry.quote){
      const nums=(sdgEntry.quote.match(/SDG\s*(\d+)/gi)||[]).map(s=>s.match(/\d+/)[0]);
      sdgRow.innerHTML=nums.length?`<span class="cp-sdg-label">SDGs referenced:</span>`+nums.map(n=>`<span class="cp-sdg" style="background:${SDG_COLORS[n]||MUTED}" title="SDG ${n}: ${SDG_NAMES[n]||""}">${n}</span>`).join("") : "";
    } else sdgRow.innerHTML="";
  }
}

/* ── Adaptation ───────────────────────────────────────────────────── */
function renderAdaptation(p, docUrlMap) {
  const wrap=document.getElementById("cp-adaptation"); if(!wrap)return;
  const active=p.adaptation.filter(a=>a.status==="Active");
  if(!active.length){wrap.innerHTML=`<div class="cp-empty">No transport adaptation measures in active documents.</div>`;return;}
  const groups={};
  active.forEach(a=>{(groups[a.category]=groups[a.category]||[]).push(a);});
  wrap.innerHTML=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length).map(([cat,items])=>`
    <div class="cp-adapt-group">
      <div class="cp-adapt-head">
        <div class="cp-adapt-icon"><svg viewBox="0 0 24 24">${ADAPT_ICONS[cat]||ADAPT_ICONS["Other adaptation and resilience measures"]}</svg></div>
        <div class="cp-adapt-titles"><div class="cp-adapt-cat">${esc(cat)}</div><div class="cp-adapt-count">${items.length} measure${items.length>1?"s":""}</div></div>
        <svg class="cp-adapt-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="cp-adapt-body">
        ${items.map(a=>{
          const du=a.doc_id?(docUrlMap[a.doc_id]||null):null;
          return `<div class="cp-adapt-item">
            <div class="cp-adapt-item-name">${esc(a.measure||"Adaptation measure")}</div>
            ${a.quote?`<div class="cp-adapt-item-quote">${esc(a.quote)}</div>`:""}
            <div class="cp-adapt-item-meta">${du?`<a href="${esc(du)}" target="_blank" rel="noopener" style="color:var(--ct-teal)">${esc(a.version||a.document||"")}</a>`:esc(a.version||a.document||"")}${a.modes&&a.modes.length?" "+a.modes.map(m=>`<span class="cp-tag">${esc(m)}</span>`).join(""):""} ${a.page?", p. "+esc(a.page):""}</div>
          </div>`;
        }).join("")}
      </div>
    </div>`).join("");
  wrap.querySelectorAll(".cp-adapt-head").forEach(h=>h.addEventListener("click",()=>h.parentElement.classList.toggle("open")));
  const cmpLink=document.getElementById("cp-adaptation-compare");
  if(cmpLink){cmpLink.href=comparisonUrl("track",{c:p.code});cmpLink.hidden=false;}
}

/* ── Coalitions ───────────────────────────────────────────────────── */
function renderCoalitions(p){
  const box=document.getElementById("cp-coalitions"); if(!box)return;
  box.innerHTML=(!p.coalitions||!p.coalitions.length)
    ?`<div class="cp-empty">${esc(p.name)} has not joined any of the tracked transport coalitions.</div>`
    :p.coalitions.map(c=>`<div class="cp-coalition"><div class="cp-coalition-icon">\u2713</div><div class="cp-coalition-name">${esc(c)}</div></div>`).join("");
}

/* ── Similar countries ────────────────────────────────────────────── */
function renderSimilar(p){
  const wrap=document.getElementById("cp-similar"); if(!wrap)return;
  const s=p.similar||{};
  const cats=p.category_summary||{};
  const top2=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
  const lenses=[
    {key:"region",    title:"Same region",               note:"Geographic peers"},
    {key:"emissions", title:"Similar transport share",    note:"Comparable emissions profile"},
    {key:"priorities",title:"Similar measure priorities", note:top2.join(", ")||"Comparable focus areas"}
  ];
  wrap.innerHTML=lenses.map(l=>{
    const list=(s[l.key]||[]).slice(0,5); if(!list.length)return"";
    return `<div class="cp-lens"><div class="cp-lens-title">${esc(l.title)}</div><div class="cp-lens-note">${esc(l.note)}</div>
      <div class="cp-lens-countries">${list.map(c=>{
        const cmpHref=comparisonUrl("compare",{c1:p.code,c2:c.code,gen:"latest"});
        return `<div class="cp-lens-row"><a class="cp-lens-country" href="${BASE}country.html?country=${esc(c.code)}">
          <img src="${BASE}../assets/flags/${esc(c.iso2)}.png" onerror="this.onerror=null;this.src='https://flagcdn.com/w40/${esc(c.iso2)}.png'" alt="">
          <span>${esc(c.name)}</span>
          ${c.share!=null?`<span class="share">${c.share}%</span>`:""}
          ${c.shared_focus?`<span class="share" style="font-size:0.7rem;">${esc(c.shared_focus)}</span>`:""}
        </a><a class="cp-lens-cmp" href="${cmpHref}" target="_blank" rel="noopener" title="Compare with ${esc(p.name)}">\u21c4</a></div>`;
      }).join("")}</div></div>`;
  }).join("");
  const link=document.getElementById("cp-compare-link");
  if(link) link.href=comparisonUrl("track",{c:p.code});
}

/* ── Resources ────────────────────────────────────────────────────── */
function renderResources(p){
  const pubBox=document.getElementById("cp-publications");
  if(pubBox){
    const all=(p.publications||[]).filter(pub=>pub.active!=="no");
    // Backwards compatible: if scope tags are absent (older data), treat all as country-specific
    const hasScope=all.some(pub=>pub.scope);
    const own=hasScope?all.filter(pub=>pub.scope==="country"):all;
    const global=hasScope?all.filter(pub=>pub.scope==="global"):[];
    renderPubList(pubBox,own,global,p);
  }
  const tdcLink=document.getElementById("cp-tdc-link");
  if(tdcLink&&p.links&&p.links.tdc_search) tdcLink.href=p.links.tdc_search;
  const dlBox=document.getElementById("cp-downloads");
  if(dlBox){
    dlBox.innerHTML=`
      <a class="cp-dl-btn" href="${BASE}factsheets/${esc(p.code)}.pdf" download><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg>Country factsheet (PDF)</a>
      <button class="cp-dl-btn" id="dl-measures"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>Measures (CSV)</button>
      <button class="cp-dl-btn" id="dl-targets"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>Targets (CSV)</button>`;
    document.getElementById("dl-measures").onclick=()=>downloadCSV(p.measures,`${p.code}_measures.csv`);
    document.getElementById("dl-targets").onclick=()=>downloadCSV(p.targets,`${p.code}_targets.csv`);
  }
}

const PUB_RECENT_COUNT=5;
function renderPubList(box,own,global,p){
  const state={type:"all",showAll:false,showGlobal:false};
  const types=[...new Set(own.map(x=>x.type).filter(Boolean))];

  function pubItem(pub){
    return `<div class="cp-pub"><a href="${esc(pub.url)}" target="_blank" rel="noopener">${esc(pub.title)}</a><div class="cp-pub-meta">${esc(pub.type||"")}${pub.date?", "+esc(pub.date):""}</div></div>`;
  }

  function draw(){
    const filtered=state.type==="all"?own:own.filter(x=>x.type===state.type);
    const visible=state.showAll?filtered:filtered.slice(0,PUB_RECENT_COUNT);
    const filterChips=types.length>1
      ?`<div class="cp-pub-filters">
          <button class="cp-pub-chip ${state.type==="all"?"on":""}" data-type="all">All</button>
          ${types.map(t=>`<button class="cp-pub-chip ${state.type===t?"on":""}" data-type="${esc(t)}">${esc(t)}s</button>`).join("")}
        </div>`:"";
    const ownBlock=filtered.length
      ?visible.map(pubItem).join("")
        +(filtered.length>PUB_RECENT_COUNT
          ?`<button class="cp-pub-more" id="cp-pub-more">${state.showAll?"Show fewer":`Show all ${filtered.length}`}</button>`:"")
      :`<p style="font-size:0.88rem;color:var(--ct-muted);">No country-specific publications yet. <a href="https://changing-transport.org/?s=${encodeURIComponent(p.name)}" target="_blank" rel="noopener">Search Changing Transport \u2192</a></p>`;
    const globalBlock=global.length
      ?`<button class="cp-pub-global-toggle" id="cp-pub-global-toggle" aria-expanded="${state.showGlobal}">
          More from Changing Transport (${global.length}) <span class="chev">${state.showGlobal?"\u25b4":"\u25be"}</span>
        </button>
        <div class="cp-pub-global" ${state.showGlobal?"":"hidden"}>${global.slice(0,30).map(pubItem).join("")}
          ${global.length>30?`<p class="cp-pub-meta" style="padding:0.4rem 0;">Showing 30 of ${global.length}. <a href="https://changing-transport.org/publications/" target="_blank" rel="noopener">Browse all \u2192</a></p>`:""}
        </div>`:"";
    box.innerHTML=filterChips+ownBlock+globalBlock;

    box.querySelectorAll(".cp-pub-chip").forEach(ch=>ch.onclick=()=>{state.type=ch.dataset.type;state.showAll=false;draw();});
    const more=box.querySelector("#cp-pub-more");
    if(more) more.onclick=()=>{state.showAll=!state.showAll;draw();};
    const gt=box.querySelector("#cp-pub-global-toggle");
    if(gt) gt.onclick=()=>{state.showGlobal=!state.showGlobal;draw();};
  }
  draw();
}

function setupExport(p){
  const btn=document.getElementById("cp-export-btn");
  if(btn) btn.onclick=()=>document.getElementById("deeper").scrollIntoView({behavior:"smooth"});
}
function downloadCSV(rows,filename){
  if(!rows||!rows.length)return;
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const csv=[keys.join(",")].concat(rows.map(r=>keys.map(k=>{let v=r[k];if(Array.isArray(v))v=v.join("; ");v=String(v??"").replace(/"/g,'""');return /[",\n]/.test(v)?`"${v}"`:v;}).join(","))).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download=filename;a.click();URL.revokeObjectURL(a.href);
}