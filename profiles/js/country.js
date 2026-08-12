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
const MITIG_ICONS = {
  "Mode shift and demand management": `<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`,
  "Transport system improvements":    `<path d="M3 17l2-7h14l2 7M3 17h18M7 17v2m10-2v2M5 10h14"/>`,
  "Electrification":                  `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>`,
  "Alternative fuels":                `<path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 8v4l3 3"/>`,
  "Energy efficiency":                `<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>`,
  "Aviation and maritime":            `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.93 12a19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 3.88 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91"/>`
};
const MITIG_ICON_COLORS = {
  "Mode shift and demand management": {bg:"rgba(0,164,189,0.12)",   fg:"var(--ct-teal)"},
  "Transport system improvements":    {bg:"rgba(0,61,92,0.10)",     fg:"var(--ct-navy)"},
  "Electrification":                  {bg:"rgba(157,190,61,0.15)",  fg:"var(--ct-green-dark)"},
  "Alternative fuels":                {bg:"rgba(232,130,26,0.12)",  fg:"#B85E0A"},
  "Energy efficiency":                {bg:"rgba(157,190,61,0.15)",  fg:"var(--ct-green-dark)"},
  "Aviation and maritime":            {bg:"rgba(0,164,189,0.12)",   fg:"var(--ct-teal)"}
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
const TARGET_TYPE_CFG=[
  {area:"Net zero target",                    label:"Net-zero",             color:"#9DBE3D", icon:`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>`},
  {area:"Overall mitigation target",          label:"Overall mitigation",   color:"#E8821A", icon:`<path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 8v4l3 3"/>`},
  {area:"Transport sector mitigation target", label:"Transport mitigation", color:"#00A4BD", icon:`<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>`},
  {area:"Transport sector adaptation target", label:"Transport adaptation", color:"#003D5C", icon:`<path d="M2 22h20M6 18V9l6-4 6 4v9M9 18v-5h6v5"/>`},
];
const TARGET_AREAS_ALL=new Set(TARGET_TYPE_CFG.map(c=>c.area));

/* ── Bootstrap ───────────────────────────────────────────────────── */
const params = new URLSearchParams(location.search);
const CODE   = (window.CP_CODE || params.get("country") || "COL").toUpperCase();
const BASE   = window.CP_BASE  || "";

function comparisonUrl(mode, opts) {
  const base = "https://changing-transport.org/tracker/compare-ndc";
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
  const chip=(n,label)=>`
    <div class="cp-hero-chip ${n>0?"yes":"no"}">
      <span class="cp-hero-chip-icon">${n>0
        ?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`
        :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>`}</span>
      <span class="cp-hero-chip-text">${n>0?`<strong>${n}</strong> ${label}${n>1?"s":""}`:`No ${label}s`}</span>
    </div>`;
  el.innerHTML=`<div class="cp-hero-checks">
      ${chip(tt,"transport target")}
      ${chip(mm,"transport measure")}
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

  // Target pins: stacked per type per year, colors aligned with buckets
  const byPinYear={};
  (p.targets||[]).filter(x=>x.status==="Active"&&TARGET_AREAS_ALL.has(x.area)&&+x.year>years[0])
    .forEach(x=>{const yr=+x.year;if(!byPinYear[yr])byPinYear[yr]={};byPinYear[yr][x.area]=(byPinYear[yr][x.area]||0)+1;});
  const pinYears=Object.keys(byPinYear).map(Number).sort((a,b)=>a-b).slice(0,6)
    .map(yr=>({year:yr,types:TARGET_TYPE_CFG.filter(cfg=>byPinYear[yr][cfg.area]).map(cfg=>({...cfg,count:byPinYear[yr][cfg.area]}))}));
  const lastYear=years[years.length-1];
  const allYears=years.slice();
  const maxPin=pinYears.length?Math.max(...pinYears.map(x=>x.year)):0;
  for(let yr=lastYear+1;yr<=maxPin;yr++) allYears.push(yr);
  const legendEl=document.getElementById("cp-pin-legend");
  if(legendEl&&pinYears.length){
    const presentAreas=new Set(pinYears.flatMap(pn=>pn.types.map(t=>t.area)));
    const present=TARGET_TYPE_CFG.filter(x=>presentAreas.has(x.area));
    legendEl.innerHTML=`<span class="cp-pin-key-title">Target years:</span> `+present.map(x=>
      `<span class="cp-pin-key"><span class="cp-pin-swatch" style="background:${x.color}"></span>${esc(x.label)}</span>`).join("");
    legendEl.hidden=false;
  }

  const canvas=document.getElementById("cp-trend-chart");
  if(!canvas) return;

  const _pillRects=[];
  const pinPlugin={id:"targetPins",afterDatasetsDraw(chart){
    const {ctx,chartArea,scales:{x}}=chart;
    const PILL_H=13,PAD=5,STACK_GAP=2,COL_GAP=3;
    ctx.save(); ctx.font="700 9px 'Source Sans 3'"; _pillRects.length=0;
    const columns=pinYears.map(pin=>{
      const i=allYears.indexOf(pin.year); if(i<0) return null;
      const px=x.getPixelForValue(i);
      const w=ctx.measureText(String(pin.year)).width+PAD*2;
      return {px,w,pills:pin.types.map(tp=>({...tp,year:pin.year,w}))};
    }).filter(Boolean);
    const colCxs=columns.map(c=>c.px);
    for(let i=1;i<columns.length;i++){
      const minCx=colCxs[i-1]+columns[i-1].w/2+COL_GAP+columns[i].w/2;
      if(colCxs[i]<minCx) colCxs[i]=minCx;
    }
    for(let i=columns.length-1;i>=0;i--){
      const wall=i===columns.length-1?chartArea.right:colCxs[i+1]-columns[i+1].w/2-COL_GAP;
      if(colCxs[i]+columns[i].w/2>wall) colCxs[i]=wall-columns[i].w/2;
      if(colCxs[i]-columns[i].w/2<chartArea.left) colCxs[i]=chartArea.left+columns[i].w/2;
    }
    columns.forEach((col,ci)=>{
      const cx=colCxs[ci];
      const lineTop=chartArea.top+col.pills.length*(PILL_H+STACK_GAP);
      ctx.strokeStyle=col.pills[0]?.color||"#999"; ctx.setLineDash([4,3]); ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(col.px,lineTop); ctx.lineTo(col.px,chartArea.bottom); ctx.stroke(); ctx.setLineDash([]);
      col.pills.forEach((pill,si)=>{
        const py=chartArea.top+si*(PILL_H+STACK_GAP), bx=cx-pill.w/2;
        ctx.fillStyle=pill.color;
        if(ctx.roundRect){ctx.beginPath();ctx.roundRect(bx,py,pill.w,PILL_H,PILL_H/2);ctx.fill();}
        else ctx.fillRect(bx,py,pill.w,PILL_H);
        ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(String(pill.year),cx,py+PILL_H/2+0.5);
        _pillRects.push({x1:bx,y1:py,x2:bx+pill.w,y2:py+PILL_H,pill});
      });
    });
    ctx.restore();
  }};
  function setupPinInteraction(cvs){
    const tip=(()=>{let d=document.getElementById("cp-pin-tip");if(!d){d=document.createElement("div");d.id="cp-pin-tip";d.className="cp-pin-tip";document.body.appendChild(d);}return d;})();
    function hit(e){const r=cvs.getBoundingClientRect(),sx=cvs.width/r.width,sy=cvs.height/r.height,mx=(e.clientX-r.left)*sx,my=(e.clientY-r.top)*sy;return _pillRects.find(p=>mx>=p.x1&&mx<=p.x2&&my>=p.y1&&my<=p.y2)||null;}
    cvs.addEventListener("mousemove",e=>{const h=hit(e);if(h){cvs.style.cursor="pointer";tip.innerHTML=`<strong>${h.pill.year}</strong> · ${esc(h.pill.label)}<br>${h.pill.count} target${h.pill.count>1?"s":""}`;tip.style.cssText=`display:block;position:fixed;left:${Math.min(e.clientX+12,innerWidth-170)}px;top:${e.clientY-46}px`;}else{cvs.style.cursor="";tip.style.display="none";}});
    cvs.addEventListener("mouseleave",()=>{cvs.style.cursor="";tip.style.display="none";});
    cvs.addEventListener("click",e=>{const h=hit(e);if(!h)return;const el=document.getElementById("tb-"+h.pill.year);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});});
  }

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
      setupPinInteraction(canvas);
      const views=document.getElementById("cp-trend-views");
      if(views){
        views.hidden=false;
        views.querySelectorAll(".cp-view-chip").forEach(ch=>ch.addEventListener("click",()=>{
          views.querySelectorAll(".cp-view-chip").forEach(x=>x.classList.remove("on"));
          ch.classList.add("on");
          chart.destroy();
          chart=new Chart(canvas,ch.dataset.view==="idx"?idxConfig():mtConfig());
          setupPinInteraction(canvas);
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
  (p.targets||[]).forEach(t=>{if(!T_AREAS.has(t.area))return;const g=genByDoc[t.doc_id];if(counts[g])counts[g].t++;});
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
  // Letters above each bar identify the series (T/M); color stays per generation
  const letterPlugin={id:"genLetters",afterDatasetsDraw(chart){
    const {ctx}=chart;
    chart.data.datasets.forEach((ds,di)=>{
      const meta=chart.getDatasetMeta(di); if(!meta||meta.hidden)return;
      meta.data.forEach((bar,i)=>{
        const v=ds.data[i]; if(!v)return;
        ctx.save();
        ctx.fillStyle=COL[present[i]]||NAVY;
        ctx.font="800 12px 'Source Sans 3'";
        ctx.textAlign="center";
        ctx.fillText(di===0?"T":"M",bar.x,bar.y-5);
        ctx.restore();
      });
    });
  }};
  const cfg={type:"bar",
    data:{labels:present.map(g=>LBL[g]),datasets:[
      {label:"Targets",data:present.map(g=>counts[g].t),backgroundColor:present.map(g=>COL[g]),borderRadius:4},
      {label:"Measures",data:present.map(g=>counts[g].m),backgroundColor:present.map(g=>COL[g]+"80"),borderRadius:4}]},
    options:{layout:{padding:{top:16}},plugins:{legend:{display:false}},
      scales:{x:{ticks:{font:{family:"Source Sans 3",size:11}},grid:{display:false}},
              y:{ticks:{font:{family:"Source Sans 3",size:11},precision:0},grid:{color:"rgba(0,0,0,0.05)"}}}},
    plugins:[letterPlugin]};
  if(window.Chart){ try{ new Chart(canvas,cfg); return; }catch(e){ console.warn("Gen chart failed:",e); } }
  chartFallbackBars(canvas, present.map(g=>[LBL[g],counts[g].t+counts[g].m]), g=>COL[present.find(x=>LBL[x]===g)]||TEAL);
}

/* ── Journey — timeline line + version labels + detail panel ─────── */
function renderJourney(p, docUrlMap) {
  const wrap=document.getElementById("cp-journey"); if(!wrap)return;
  // Strict chronological order (NDC, LTS, BTR interleaved by submission date)
  const docs=[...(p.documents||[])].sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));

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
          <div class="cp-jcard-status"><span class="cp-jcard-dot ${active?"st-active":"st-archived"}"></span>${esc(d.status)}</div>
        </div>
        ${i<docs.length-1?`<span class="cp-jcard-arrow">\u203a</span>`:""}
      </div>`;
  }).join("");

  // Timeline bar
  const yearOf=d=>d.date?+d.date.slice(0,4):null;
  const frac=d=>{ // year + month fraction, so same-year documents don't overlap
    if(!d.date) return null;
    const y=+d.date.slice(0,4), m=+(d.date.slice(5,7)||1);
    return y+(m-1)/12;
  };
  const years=docs.map(yearOf).filter(Boolean);
  const minY=Math.min(...years,2015), maxY=Math.max(...years,new Date().getFullYear()+1);
  const span=maxY-minY||1;

  const tlBar=document.createElement("div");
  tlBar.style.cssText="position:relative;height:40px;margin:0.5rem 0.4rem 0;";

  // horizontal line
  const line=document.createElement("div");
  line.style.cssText="position:absolute;top:16px;left:0;right:0;height:2px;background:linear-gradient(to right,var(--ct-border),var(--ct-green) 80%,var(--ct-border));border-radius:2px;";
  tlBar.appendChild(line);

  // one dot per document: green = active (always), gray = archived,
  // archived turns navy while its summary is open
  docs.forEach((d,i)=>{
    const f=frac(d); if(f==null) return;
    const pct=Math.min(100,Math.max(0,(f-minY)/span*100)).toFixed(1);
    const dot=document.createElement("button");
    dot.type="button";
    dot.className=`cp-tl-dot ${d.status==="Active"?"is-active":"is-archived"}`;
    dot.dataset.idx=i;
    dot.title=`${d.version||d.type} (${d.date?d.date.slice(0,4):""}, ${d.status})`;
    dot.setAttribute("aria-label",dot.title);
    dot.style.left=pct+"%";
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

  function clearSelection(){
    wrap.querySelectorAll(".cp-jcard").forEach(c=>c.classList.remove("open"));
    tlBar.querySelectorAll(".cp-tl-dot").forEach(x=>x.classList.remove("selected"));
  }
  panel.querySelector(".cp-detail-panel-close").addEventListener("click",()=>{
    panel.classList.remove("open");
    clearSelection();
  });

  function openDoc(idx){
    const d=docs[idx];
    const tc=d.transport||{};
    const card=wrap.querySelector(`.cp-jcard[data-idx="${idx}"]`);
    const dot=tlBar.querySelector(`.cp-tl-dot[data-idx="${idx}"]`);
    const already=card&&card.classList.contains("open");
    clearSelection();
    if(already){ panel.classList.remove("open"); return; }
    if(card) card.classList.add("open");
    if(dot) dot.classList.add("selected");
    const year=d.date?d.date.slice(0,4):"";
    // Fixed summary order: mitigation targets, mitigation measures,
    // adaptation targets, adaptation measures
    const checks=[
      {label:"Mitigation targets",  val:tc.mitigation_target},
      {label:"Mitigation measures", val:tc.mitigation_measures},
      {label:"Adaptation targets",  val:tc.adaptation_target},
      {label:"Adaptation measures", val:tc.adaptation_measures},
    ];
    panel.querySelector(".cp-detail-panel-title").innerHTML=
      `${esc(d.version)} <span style="font-weight:400;color:var(--ct-muted);">${esc(d.type)}, ${esc(d.status)}${year?" ("+year+")":""}</span>`;
    const compareTile=`
      <a class="cp-doc-tile green" href="${comparisonUrl("track",{c:p.code})}" target="_blank" rel="noopener">
        <span class="cp-doc-tile-kicker">NDC comparison</span>
        <span class="cp-doc-tile-text">Check the content of previous NDCs and how it evolved \u2192</span>
      </a>`;
    const docTile=d.url?`
      <a class="cp-doc-tile navy" href="${esc(d.url)}" target="_blank" rel="noopener">
        <span class="cp-doc-tile-kicker"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/></svg> Original document</span>
        <span class="cp-doc-tile-text">View the full text \u2197</span>
        <span class="cp-doc-tile-src">Source: UNFCCC registry</span>
      </a>`:"";
    const tiles=`<div class="cp-doc-tiles${docTile?"":" single"}">${compareTile}${docTile}</div>`;
    panel.querySelector(".cp-detail-panel-body").innerHTML=tc.has_content?`
      <div class="cp-doc-panel-grid">
        <div class="cp-jcard-checks">${checks.map(c=>`<div class="cp-jcard-check ${c.val?"on":"off"}">${c.val?"\u2713":"\u25cb"} ${esc(c.label)}</div>`).join("")}</div>
        ${tiles}
      </div>`
      :`<div class="cp-doc-panel-grid">
        <p style="color:var(--ct-muted);font-size:0.88rem;margin:0;">No transport content assessed in this document.</p>
        ${tiles}
      </div>`;
    panel.classList.add("open");
    panel.scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  wrap.querySelectorAll(".cp-jcard").forEach(card=>{
    card.querySelector(".cp-jcard-inner").addEventListener("click",()=>openDoc(+card.dataset.idx));
  });
  tlBar.querySelectorAll(".cp-tl-dot").forEach(dot=>{
    dot.addEventListener("click",()=>openDoc(+dot.dataset.idx));
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
  const allActive=(p.targets||[]).filter(t=>t.status==="Active"&&TARGET_AREAS_ALL.has(t.area)&&t.year&&/\d{4}/.test(String(t.year)));
  const total=allActive.length;
  if(subEl) subEl.innerHTML=`<strong>${total}</strong> target${total!==1?"s":""} in <span class="hl">active documents</span>.`;
  const docTypes=[...new Set(allActive.map(t=>t.doc_type).filter(Boolean))];
  let curDoc="all";
  if(fbar){
    fbar.innerHTML=`<div class="cp-filter-row"><span class="cp-filter-label">By document:</span>
      <button class="cp-filter active" data-doc="all">All (${total})</button>
      ${docTypes.map(dt=>`<button class="cp-filter" data-doc="${esc(dt)}">${esc(dt)} (${allActive.filter(t=>t.doc_type===dt).length})</button>`).join("")}
    </div>`;
    fbar.querySelectorAll("[data-doc]").forEach(b=>b.addEventListener("click",()=>{fbar.querySelectorAll("[data-doc]").forEach(x=>x.classList.remove("active"));b.classList.add("active");curDoc=b.dataset.doc;draw();}));
  }
  const typeOrder=Object.fromEntries(TARGET_TYPE_CFG.map((c,i)=>[c.area,i]));
  function draw(){
    const list=allActive.filter(t=>curDoc==="all"||t.doc_type===curDoc);
    if(!list.length){listEl.innerHTML=`<div class="cp-empty">No targets match.</div>`;return;}
    const byYear={};
    list.forEach(t=>{const y=String(t.year).match(/(\d{4})/)[1];(byYear[y]=byYear[y]||[]).push(t);});
    listEl.innerHTML=Object.keys(byYear).sort().map(yr=>{
      const sorted=byYear[yr].sort((a,b)=>(typeOrder[a.area]??99)-(typeOrder[b.area]??99));
      const byType={};sorted.forEach(t=>(byType[t.area]=byType[t.area]||[]).push(t));
      const groups=TARGET_TYPE_CFG.filter(cfg=>byType[cfg.area]);
      const yearTotal=sorted.length;
      return `<div class="cp-target-bucket" id="tb-${yr}">
        <div class="cp-target-year-head">
          <div class="cp-target-year-badge">${esc(yr)}</div>
          <div class="cp-target-year-count">${yearTotal} target${yearTotal>1?"s":""}</div>
        </div>
        ${groups.map(cfg=>{
          const items=byType[cfg.area];
          const cardId=`cp-tcat-${yr}-${cfg.area.replace(/\s+/g,"-").toLowerCase()}`;
          const itemsHtml=items.map(t=>{
            const docUrl=t.doc_id?(docUrlMap[t.doc_id]||null):null;
            return `<div class="cp-pitem">
              <div class="cp-pitem-head"><span class="cp-pitem-name">${esc(t.content||t.type||"")}</span></div>
              <div class="cp-pitem-meta">${t.conditionality&&t.conditionality!=="\u2014"?`<span class="cp-target-cond">${esc(t.conditionality)}</span> `:""}${docUrl?`<a href="${esc(docUrl)}" target="_blank" rel="noopener" class="cp-target-doc">${esc(t.version||t.document||"")}</a>`:`<span>${esc(t.version||t.document||"")}</span>`}${t.page&&t.page!=="n/a"?` · p. ${esc(t.page)}`:""}</div>
            </div>`;
          }).join("");
          return `<div class="cp-pcat-card collapsed" id="${esc(cardId)}">
            <button class="cp-pcat-head" aria-expanded="false" aria-controls="${esc(cardId)}-body">
              <div class="cp-pcat-icon" style="background:${cfg.color}1F;color:${cfg.color};">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${cfg.icon}</svg>
              </div>
              <div class="cp-pcat-info">
                <div class="cp-pcat-name">${esc(cfg.label)}</div>
                <div class="cp-pcat-meta">${items.length} target${items.length>1?"s":""}</div>
              </div>
              <div class="cp-pcat-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div>
            </button>
            <div class="cp-pcat-body" id="${esc(cardId)}-body" hidden>${itemsHtml}</div>
          </div>`;
        }).join("")}
      </div>`;
    }).join("");
    // Toggle listeners
    listEl.querySelectorAll(".cp-pcat-head").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const card=btn.closest(".cp-pcat-card");
        const body=card.querySelector(".cp-pcat-body");
        const open=btn.getAttribute("aria-expanded")==="true";
        btn.setAttribute("aria-expanded",String(!open));
        card.classList.toggle("collapsed",open);
        body.hidden=open;
      });
    });
  }
  draw();
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
  if(subEl) subEl.innerHTML=`<strong>${active.length}</strong> transport mitigation measures in <span class="hl">active documents</span>.`;

  // ── Summary strip ─────────────────────────────────────────────────
  // Inserted before the filterbar. Pure HTML — no Chart.js needed,
  // works behind the GIZ proxy where the CDN is blocked.
  if(fbar){
    const asi=p.asi_summary||{};
    const asiOrder=["Avoid","Shift","Improve"].filter(k=>asi[k]);
    const asiTotal=asiOrder.reduce((s,k)=>s+asi[k],0);
    const cats=p.category_summary||{};
    const catTotal=Object.values(cats).reduce((s,v)=>s+v,0);

    // A-S-I chips
    const asiChips=asiOrder.length
      ? asiOrder.map(k=>{
          const pct=asiTotal?Math.round(asi[k]/asiTotal*100):0;
          return `<div class="cp-asi-chip">
            <span class="cp-asi-chip-val" style="color:${ASI_COLOR[k]}">${asi[k]}</span>
            <span class="cp-asi-chip-label">${k}</span>
            <div class="cp-asi-chip-bar"><div style="width:${pct}%;background:${ASI_COLOR[k]};"></div></div>
          </div>`;
        }).join("")
      : `<span style="font-size:0.82rem;color:var(--ct-muted);">No A-S-I data.</span>`;

    // Top 3 categories by share — simple, no global comparison.
    const topCats=catTotal
      ? Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([cat,n])=>{
          const pct=Math.round(n/catTotal*100);
          return `<div class="cp-topcat-row">
            <span class="cp-topcat-name">${esc(cat)}</span>
            <span class="cp-topcat-pct">${pct}%</span>
          </div>`;
        }).join("")
      : "";

    const strip=document.createElement("div");
    strip.className="cp-asi-strip";
    strip.innerHTML=`
      <div class="cp-asi-strip-left">
        <p class="cp-asi-strip-title">Avoid · Shift · Improve breakdown</p>
        <div class="cp-asi-chips">${asiChips}</div>
      </div>
      ${topCats?`<div class="cp-asi-strip-right">
        <p class="cp-asi-strip-title">Top categories</p>
        <div class="cp-topcat">${topCats}</div>
      </div>`:""}`;
    fbar.before(strip);
  }

  // ── Filters: one compact row (doc + A-S-I) + optional search ─────
  const docTypes=[...new Set(active.map(m=>m.doc_type).filter(Boolean))];
  let curAsi="all",curDoc="all",curSearch="";

  if(fbar){
    fbar.innerHTML=`
      <div class="cp-filter-row">
        <span class="cp-filter-label">By document:</span>
        <button class="cp-filter active" data-doc="all">All (${active.length})</button>
        ${docTypes.map(dt=>`<button class="cp-filter" data-doc="${esc(dt)}">${esc(dt)} (${active.filter(m=>m.doc_type===dt).length})</button>`).join("")}
        <span class="cp-filter-label" style="margin-left:0.75rem;">By A-S-I:</span>
        <button class="cp-filter active" data-asi="all">All</button>
        ${["Avoid","Shift","Improve"].map(a=>{const n=active.filter(m=>(m.asi||[]).includes(a)).length;return n?`<button class="cp-filter" data-asi="${a}">${a} (${n})</button>`:""}).join("")}
      </div>
      <div class="cp-filter-row" style="margin-top:0.4rem;">
        <input class="cp-search-input" id="cp-measures-search" placeholder="Search measures\u2026" type="text" style="max-width:320px;">
      </div>`;
    fbar.querySelectorAll("[data-doc]").forEach(b=>b.addEventListener("click",()=>{fbar.querySelectorAll("[data-doc]").forEach(x=>x.classList.remove("active"));b.classList.add("active");curDoc=b.dataset.doc;draw();}));
    fbar.querySelectorAll("[data-asi]").forEach(b=>b.addEventListener("click",()=>{fbar.querySelectorAll("[data-asi]").forEach(x=>x.classList.remove("active"));b.classList.add("active");curAsi=b.dataset.asi;draw();}));
    const srch=document.getElementById("cp-measures-search");
    if(srch) srch.addEventListener("input",()=>{curSearch=srch.value.toLowerCase().trim();draw();});
  }

  // ── Category display order ────────────────────────────────────────
  const CAT_ORDER=["Mode shift and demand management","Transport system improvements",
    "Electrification","Alternative fuels","Energy efficiency","Aviation and maritime"];

  function draw(){
    const list=active.filter(m=>
      (curAsi==="all"||(m.asi||[]).includes(curAsi))&&
      (curDoc==="all"||m.doc_type===curDoc)&&
      (!curSearch||[m.instrument,m.purpose,m.category,m.quote].some(f=>f&&f.toLowerCase().includes(curSearch))));
    if(!list.length){listEl.innerHTML=`<div class="cp-empty">No measures match.</div>`;if(moreBtn)moreBtn.hidden=true;return;}

    const byCat={};
    list.forEach(m=>{(byCat[m.category]=byCat[m.category]||[]).push(m);});
    const catKeys=[...CAT_ORDER.filter(c=>byCat[c]),...Object.keys(byCat).filter(c=>!CAT_ORDER.includes(c)).sort()];

    listEl.innerHTML=catKeys.map(cat=>{
      const items=byCat[cat];
      const clr=MITIG_ICON_COLORS[cat]||{bg:"rgba(0,61,92,0.10)",fg:"var(--ct-navy)"};
      const iconPath=MITIG_ICONS[cat]||`<circle cx="12" cy="12" r="9"/>`;
      // Dominant A-S-I badges for the header
      const asiCounts={};
      items.forEach(m=>(m.asi||[]).forEach(a=>{asiCounts[a]=(asiCounts[a]||0)+1;}));
      const asiBadges=["Avoid","Shift","Improve"].filter(a=>asiCounts[a])
        .map(a=>`<span class="cp-pcat-badge ${a.toLowerCase()}">${a}</span>`).join("");

      const itemsHtml=items.map(m=>{
        const du=m.doc_id?(docUrlMap[m.doc_id]||null):null;
        const asiTag=m.asi&&m.asi.length?`<span class="cp-pitem-asi ${((m.asi[0])||"improve").toLowerCase()}">${esc(m.asi.join("/"))}</span>`:"";
        return `<div class="cp-pitem">
          <div class="cp-pitem-head">
            <span class="cp-pitem-name">${esc(m.instrument||m.purpose||m.category)}</span>${asiTag}
          </div>
          ${m.quote?`<div class="cp-pitem-quote">${esc(m.quote)}</div>`:""}
          <div class="cp-pitem-meta">${du?`<a href="${esc(du)}" target="_blank" rel="noopener" class="cp-target-doc">${esc(m.version||m.document||"")}</a>`:`<span>${esc(m.version||m.document||"")}</span>`}${m.page?` · p. ${esc(m.page)}`:""}${m.modes&&m.modes.length?` · `+m.modes.slice(0,3).map(x=>`<span class="cp-tag">${esc(x)}</span>`).join(""):""}</div>
        </div>`;
      }).join("");

      const cardId=`cp-pcat-${cat.replace(/\s+/g,"-").toLowerCase()}`;
      return `<div class="cp-pcat-card collapsed" id="${esc(cardId)}">
        <button class="cp-pcat-head" aria-expanded="false" aria-controls="${esc(cardId)}-body">
          <div class="cp-pcat-icon" style="background:${clr.bg};color:${clr.fg};">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${iconPath}</svg>
          </div>
          <div class="cp-pcat-info">
            <div class="cp-pcat-name">${esc(cat)}</div>
            <div class="cp-pcat-meta">${items.length} measure${items.length>1?"s":""}${asiBadges?` <span class="cp-pcat-badges">${asiBadges}</span>`:""}</div>
          </div>
          <div class="cp-pcat-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div>
        </button>
        <div class="cp-pcat-body" id="${esc(cardId)}-body" hidden>${itemsHtml}</div>
      </div>`;
    }).join("");

    // Attach toggle listeners
    listEl.querySelectorAll(".cp-pcat-head").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const card=btn.closest(".cp-pcat-card");
        const body=card.querySelector(".cp-pcat-body");
        const open=btn.getAttribute("aria-expanded")==="true";
        btn.setAttribute("aria-expanded",String(!open));
        card.classList.toggle("collapsed",open);
        body.hidden=open;
      });
    });
    if(moreBtn) moreBtn.hidden=true;
  }
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

  // Uses the same cp-pcat-card component as Mitigation for visual consistency.
  const groups={};
  active.forEach(a=>{(groups[a.category]=groups[a.category]||[]).push(a);});

  wrap.innerHTML=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length).map(([cat,items])=>{
    const iconPath=ADAPT_ICONS[cat]||ADAPT_ICONS["Other adaptation and resilience measures"];
    const itemsHtml=items.map(a=>{
      const du=a.doc_id?(docUrlMap[a.doc_id]||null):null;
      return `<div class="cp-pitem">
        <div class="cp-pitem-head">
          <span class="cp-pitem-name">${esc(a.measure||"Adaptation measure")}</span>
        </div>
        ${a.quote?`<div class="cp-pitem-quote">${esc(a.quote)}</div>`:""}
        <div class="cp-pitem-meta">${du?`<a href="${esc(du)}" target="_blank" rel="noopener" class="cp-target-doc">${esc(a.version||a.document||"")}</a>`:esc(a.version||a.document||"")}${a.modes&&a.modes.length?" "+a.modes.map(m=>`<span class="cp-tag">${esc(m)}</span>`).join(""):""} ${a.page?`· p. ${esc(a.page)}`:""}</div>
      </div>`;
    }).join("");

    const cardId=`cp-acat-${cat.replace(/\s+/g,"-").toLowerCase()}`;
    return `<div class="cp-pcat-card collapsed" id="${esc(cardId)}">
      <button class="cp-pcat-head" aria-expanded="false" aria-controls="${esc(cardId)}-body">
        <div class="cp-pcat-icon" style="background:rgba(0,164,189,0.12);color:var(--ct-teal);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${iconPath}</svg>
        </div>
        <div class="cp-pcat-info">
          <div class="cp-pcat-name">${esc(cat)}</div>
          <div class="cp-pcat-meta">${items.length} measure${items.length>1?"s":""}</div>
        </div>
        <div class="cp-pcat-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div>
      </button>
      <div class="cp-pcat-body" id="${esc(cardId)}-body" hidden>${itemsHtml}</div>
    </div>`;
  }).join("");

  // Toggle listeners
  wrap.querySelectorAll(".cp-pcat-head").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const card=btn.closest(".cp-pcat-card");
      const body=card.querySelector(".cp-pcat-body");
      const open=btn.getAttribute("aria-expanded")==="true";
      btn.setAttribute("aria-expanded",String(!open));
      card.classList.toggle("collapsed",open);
      body.hidden=open;
    });
  });

  const cmpLink=document.getElementById("cp-adaptation-compare");
  if(cmpLink){cmpLink.href=comparisonUrl("track",{c:p.code});cmpLink.hidden=false;}
}

/* ── Coalitions ───────────────────────────────────────────────────── */
/* Cross-country membership lookup, fetched once and cached across tiles.
   Source: profiles/data/initiatives-index.json, built by the pipeline. */
let INITIATIVE_MEMBERS_CACHE=null, INITIATIVE_MEMBERS_LOADING=false, INITIATIVE_MEMBERS_QUEUE=[];
function ensureInitiativeMembers(cb){
  if(INITIATIVE_MEMBERS_CACHE){ cb(INITIATIVE_MEMBERS_CACHE); return; }
  INITIATIVE_MEMBERS_QUEUE.push(cb);
  if(INITIATIVE_MEMBERS_LOADING) return;
  INITIATIVE_MEMBERS_LOADING=true;
  fetch(`${BASE}data/initiatives-index.json`)
    .then(r=>r.ok?r.json():null)
    .then(json=>{
      INITIATIVE_MEMBERS_CACHE=(json&&json.initiatives)||{};
      INITIATIVE_MEMBERS_LOADING=false;
      INITIATIVE_MEMBERS_QUEUE.forEach(fn=>fn(INITIATIVE_MEMBERS_CACHE));
      INITIATIVE_MEMBERS_QUEUE=[];
    })
    .catch(()=>{
      INITIATIVE_MEMBERS_CACHE={};
      INITIATIVE_MEMBERS_LOADING=false;
      INITIATIVE_MEMBERS_QUEUE.forEach(fn=>fn({}));
      INITIATIVE_MEMBERS_QUEUE=[];
    });
}

function renderCoalitions(p){
  const box=document.getElementById("cp-coalitions"); if(!box)return;
  setupCoalitionModal();
  if(!p.coalitions||!p.coalitions.length){
    box.innerHTML=`<div class="cp-empty">No transport coalitions registered for ${esc(p.name)}. Do you know one? <a href="mailto:transport-tracker@giz.de" class="cp-contact-link">Contact us</a></div>`;
    return;
  }
  // Group by subsector; empty subsector = ungrouped (rendered flat)
  const grouped={};
  for(const c of p.coalitions){
    const s=c.subsector||"";
    if(!grouped[s]) grouped[s]=[];
    grouped[s].push(c);
  }
  const hasSectors=Object.keys(grouped).some(s=>s!=="");
  const coalMap={};
  const tile=c=>{
    const slug=String(c.key).toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+Object.keys(coalMap).length;
    coalMap[slug]=c;
    return coalitionTile(c,slug);
  };
  let inner="";
  if(hasSectors){
    // Named sectors first (alpha), ungrouped last
    const sectors=Object.keys(grouped).filter(s=>s).sort();
    if(grouped[""]) sectors.push("");
    for(const s of sectors){
      if(s) inner+=`<div class="cp-coal-sector">${esc(s)}</div>`;
      inner+=grouped[s].map(tile).join("");
    }
  } else {
    inner=p.coalitions.map(tile).join("");
  }
  box.innerHTML=`<div class="cp-coal-grid">${inner}</div>`;

  box.querySelectorAll(".cp-coal-tile").forEach(el=>{
    el.addEventListener("click",()=>openCoalitionModal(coalMap[el.dataset.slug],p.code));
  });
}

function coalitionTile(c, slug){
  const count=c.member_count;
  return `<button class="cp-coal-tile" type="button" data-slug="${esc(slug)}">
    <div class="cp-coal-tile-icon">&#10003;</div>
    <div class="cp-coal-tile-main">
      <div class="cp-coal-tile-name">${esc(c.key)}</div>
      ${count!=null?`<div class="cp-coal-tile-count">${count} ${count===1?"country":"countries"}</div>`:""}
    </div>
  </button>`;
}

/* Shared modal — one instance, reused for every tile, so the grid layout
   itself never has to accommodate variable content height. */
let _coalModalReady=false;
function setupCoalitionModal(){
  if(_coalModalReady) return;
  const overlay=document.getElementById("cp-coal-modal");
  if(!overlay) return;
  _coalModalReady=true;
  document.getElementById("cp-coal-modal-close").addEventListener("click", closeCoalitionModal);
  overlay.addEventListener("click", e=>{ if(e.target===overlay) closeCoalitionModal(); });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape" && !overlay.hidden) closeCoalitionModal(); });
}

function closeCoalitionModal(){
  const overlay=document.getElementById("cp-coal-modal");
  if(overlay) overlay.hidden=true;
  document.body.classList.remove("cp-modal-open");
}

function openCoalitionModal(c, currentCode){
  const overlay=document.getElementById("cp-coal-modal");
  if(!overlay||!c) return;
  document.getElementById("cp-coal-modal-title").textContent=c.key;
  const descEl=document.getElementById("cp-coal-modal-desc");
  descEl.textContent=c.description||"";
  descEl.hidden=!c.description;
  const urlsHtml=c.urls.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//,"").replace(/\/$/,""))}</a>`).join("");
  const urlsEl=document.getElementById("cp-coal-modal-urls");
  urlsEl.innerHTML=urlsHtml;
  urlsEl.hidden=!c.urls.length;
  const listEl=document.getElementById("cp-coal-modal-members-list");
  listEl.innerHTML="Loading…";
  overlay.hidden=false;
  document.body.classList.add("cp-modal-open");
  ensureInitiativeMembers(all=>{
    const list=(all[c.key]||[]).filter(m=>m.code!==currentCode);
    listEl.innerHTML = list.length
      ? list.map(m=>`<a class="cp-coal-member" href="${BASE}countries/${esc(clientSlugify(m.name))}/">
          <img src="${BASE}../assets/flags/${esc(m.iso2)}.png" onerror="this.onerror=null;this.src='https://flagcdn.com/w40/${esc(m.iso2)}.png'" alt="">
          <span>${esc(m.name)}</span>
        </a>`).join("")
      : `<p class="cp-coal-members-empty">No other countries recorded yet.</p>`;
  });
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
        </a><a class="cp-lens-cmp" href="${cmpHref}" target="_blank" rel="noopener" aria-label="Compare with ${esc(c.name)}"><span class="cp-lens-cmp-icon">\u21c4</span></a></div>`;
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
  // TDC tile links to the portal home (per-country search deliberately disabled)
  // Factsheet button deferred — build_factsheets.py and PDFs stay in the repo, unused for now
  const dlBox=document.getElementById("cp-downloads");
  if(dlBox){
    dlBox.innerHTML=`
      <button class="cp-dl-btn" id="dl-all"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Full country dataset (CSV)</button>
      <button class="cp-dl-btn" id="dl-measures"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>Measures only (CSV)</button>
      <button class="cp-dl-btn" id="dl-targets"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>Targets only (CSV)</button>`;
    document.getElementById("dl-all").onclick=()=>{
      const tag=(rows,t)=>(rows||[]).map(r=>({record_type:t,...r}));
      downloadCSV([
        ...tag(p.targets,"target"),
        ...tag(p.measures,"mitigation measure"),
        ...tag(p.adaptation,"adaptation measure")
      ],`${p.code}_transport_tracker_dataset.csv`);
    };
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
  if(btn) btn.onclick=()=>{
    const target=document.getElementById("downloads")||document.getElementById("deeper");
    if(target) target.scrollIntoView({behavior:"smooth"});
  };
}
function downloadCSV(rows,filename){
  if(!rows||!rows.length)return;
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const csv=[keys.join(",")].concat(rows.map(r=>keys.map(k=>{let v=r[k];if(Array.isArray(v))v=v.join("; ");v=String(v??"").replace(/"/g,'""');return /[",\n]/.test(v)?`"${v}"`:v;}).join(","))).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download=filename;a.click();URL.revokeObjectURL(a.href);
}