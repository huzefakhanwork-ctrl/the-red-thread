/* THE RED THREAD — core: store, router, helpers, AI handle, home (carpet + leaderboard), Discover, story page. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("rs:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("rs:" + k, JSON.stringify(v)); } catch { } }
  };
  const AI = BRAND.ai;

  const STATUS = {
    verified: ["✓", "Verified"], strong: ["✓", "Strongly supported"], partial: ["◐", "Partially supported"], disputed: ["⇄", "Disputed"],
    unverified: ["?", "Unverified"], misleading: ["!", "Misleading without context"], contradicted: ["✕", "Contradicted by evidence"],
    opinion: ["❝", "Opinion"], statement: ["❝", "Official statement"], prediction: ["→", "Prediction"], context: ["◷", "Background"],
    developing: ["●", "Developing"], insufficient: ["–", "Insufficient evidence"], substantiated: ["✓", "Substantiated"],
    unsupported: ["✕", "Unsupported"], inconclusive: ["–", "Inconclusive"], corrected: ["↺", "Corrected by publisher"], review: ["…", "Under review"]
  };
  const st = k => { const s = STATUS[k] || ["•", k]; return `<span class="st st-${k}"><i aria-hidden="true">${s[0]}</i>${s[1]}</span>`; };
  const cite = id => CASE.sources[id] ? `<button type="button" class="cite" data-src="${id}" title="${esc(CASE.sources[id].title)}">${id}</button>` : "";
  const cites = arr => (arr || []).map(cite).join("");

  /* ---- news helpers ---- */
  const outlet = id => OUTLETS.find(o => o.id === id);
  const initials = n => n.replace(/^The /, "").split(/[\s']+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const logo = (o, cls = "") => `<span class="logo ${cls}" style="--c:${o.c}" title="${esc(o.name)}">${initials(o.name)}</span>`;
  const story = id => STORIES.find(s => s.id === id) || (window.SAMPLE_STORIES || []).find(s => s.id === id);
  function share(s) {
    const v = s.cov, L = v.L + v.LL, C = v.C, R = v.R + v.LR, t = L + C + R || 1;
    const l = Math.round(L / t * 100), c = Math.round(C / t * 100);
    return { l, c, r: 100 - l - c, L, C, R, tracked: L + C + R, total: L + C + R + v.U };
  }
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const countLine = s => s.live ? `${plural(s.outletCount, "outlet")} · ${plural(s.articleCount || (s.articles || []).length, "article")}` : `${share(s).total} sources`;
  const leanText = s => { const p = share(s); const m = Math.max(p.l, p.c, p.r); return m === p.c ? `${p.c}% Centre coverage` : m === p.l ? `${p.l}% Left coverage` : `${p.r}% Right coverage`; };
  function biasBar(s, big) {
    if (s.live && s.outletCount < 2) return `<div class="bbar-none mono">Only 1 outlet so far · nothing to compare yet</div>`;
    const p = share(s);
    return `<div class="bbar ${big ? "big" : ""}" role="img" aria-label="Coverage: ${p.l}% left, ${p.c}% centre, ${p.r}% right">
      <span class="l" style="flex:${Math.max(p.l, 4)}">${big || p.l >= 18 ? `L ${p.l}%` : ""}</span><span class="c" style="flex:${Math.max(p.c, 4)}">${big || p.c >= 18 ? `C ${p.c}%` : ""}</span><span class="r" style="flex:${Math.max(p.r, 4)}">${big || p.r >= 18 ? `R ${p.r}%` : ""}</span></div>`;
  }
  // the distinct real outlets in a live story, with their (provisional) lean, in order of first report
  const liveOutlets = s => { const LO = window.LIVE_OUTLETS || {}, seen = new Set(); return (s.articles || []).map(a => a.outlet).filter(id => !seen.has(id) && seen.add(id)).map(id => LO[id] || { id, name: id, b: "U", c: "#64748B" }); };
  function biasColumns(s) {
    const groups = ["L", "LL", "C", "LR", "R"];
    return `<div class="bcols">${groups.map(g => {
      const n = s.cov[g], os = s.live ? liveOutlets(s).filter(o => o.b === g) : OUTLETS.filter(o => o.b === g), shown = os.slice(0, s.live ? 4 : Math.min(n, 4));
      return `<div class="bcol" style="--g:${BIAS[g][1]}" title="${BIAS[g][0]}: ${n} ${s.live ? (n === 1 ? "outlet" : "outlets") : "sources"}">${shown.map(o => logo(o)).join("")}${(s.live ? os.length > shown.length : n > shown.length) ? `<span class="logo more">+${s.live ? os.length - shown.length : n - shown.length}</span>` : ""}${!n ? `<span class="zero">0</span>` : ""}<span class="glabel">${BIAS[g][0]}</span></div>`;
    }).join("")}</div>`;
  }
  const agoOf = t => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + " min ago" : m < 2880 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago"; };
  function articles(s) {
    if (s.live) return (s.articles || []).map(a => { const o = (window.LIVE_OUTLETS || {})[a.outlet] || { id: a.outlet, name: a.outlet, b: "U", c: "#2DD4BF", lang: "", t: "", fact: "Not rated" };
      const g = o.b, side = g === "L" || g === "LL" ? "L" : g === "R" || g === "LR" ? "R" : "C"; return { o, g, side, hl: a.title, link: a.link, img: a.image, ago: agoOf(a.time) }; });
    const out = []; let mins = 14;
    ["C", "L", "LR", "LL", "R", "U"].forEach(g => {
      const os = OUTLETS.filter(o => o.b === g).slice(0, Math.min(2, s.cov[g]));
      os.forEach(o => { const side = g === "L" || g === "LL" ? "L" : g === "R" || g === "LR" ? "R" : "C"; out.push({ o, g, side, hl: s.hl[side], ago: mins < 60 ? mins + " min ago" : Math.round(mins / 60) + "h ago" }); mins += 23; });
    });
    return out;
  }
  const photoOf = seed => { const s = (window.STORIES || []).find(x => x.id === seed); return s && s.live && s.image ? s : null; };
  const art = (seed, h = 120) => { const p = photoOf(seed); if (p) { const by = ((window.LIVE_OUTLETS || {})[p.imageBy] || {}).name || "the outlet"; return `<span class="livephoto-wrap">${baseArt(seed, h)}<img class="livephoto" src="${esc(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="photocredit">Photo: ${esc(by)}</span></span>`; } return window.ART && ART[seed] ? ART[seed]() : baseArt(seed, h); };
  const baseArt = (seed, h = 120) => { const cols = ["#FF4D6D", "#3D5AFE", "#F5E500", "#2FD3A6", "#B69CFF", "#FF8A3D"]; let n = 0; for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) % 997;
    const a = cols[n % 6], b = cols[(n + 2) % 6], c = cols[(n + 4) % 6];
    return `<svg class="art" viewBox="0 0 200 ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="${h}" fill="${a}"/><circle cx="${40 + n % 120}" cy="${h * .55}" r="${h * .5}" fill="${b}"/><rect x="${n % 90}" y="${h * .15}" width="70" height="${h * .7}" rx="35" fill="${c}" transform="rotate(${n % 40 - 20} 100 ${h / 2})"/><path d="M0 ${h * .8}Q60 ${h * .5} 120 ${h * .85}T200 ${h * .7}" stroke="#171717" stroke-width="5" fill="none"/></svg>`; };

  /* ---- signals & mastery ---- */
  const SIGNALS = [
    ["overview", "Read the investigation overview"], ["timeline", "Explored the timeline"], ["sources", "Opened 3 or more sources"],
    ["primary", "Opened a primary document"], ["coverage", "Compared how outlets covered it"], ["map", "Explored the mind map"],
    ["ai", `Asked ${AI} a question`], ["board", "Added 5+ notes or board items"], ["quiz", "Passed the knowledge check"]
  ];
  const SIG_LABEL = Object.fromEntries(SIGNALS);
  const LEVELS = ["Curious", "Informed", "Researcher", "Analyst", "Story Master"];
  function signals() { return new Set(store.get("signals", [])); }
  function sig(name, quiet) {
    const s = signals(); if (s.has(name)) return;
    const before = level().lvl;
    s.add(name); store.set("signals", [...s]); renderChip();
    if (!quiet && SIG_LABEL[name]) toast(`Milestone: ${SIG_LABEL[name]}`);
    if (level().lvl > before) setTimeout(() => toast(`Level up: ${LEVELS[level().lvl - 1]}`, "See card", () => show("mastery")), 1400);
  }
  function level() {
    const s = signals(), q = store.get("quizBest", 0);
    const n = SIGNALS.filter(([k]) => k !== "quiz" && s.has(k)).length;
    let lvl = 0;
    if (n >= 1) lvl = 1; if (n >= 3) lvl = 2;
    if (n >= 5 && s.has("timeline") && s.has("sources")) lvl = 3;
    if (lvl >= 3 && q >= 3 && s.has("coverage")) lvl = 4;
    if (lvl >= 4 && q >= 4 && n >= 7) lvl = 5;
    return { lvl, n, q, total: SIGNALS.length };
  }
  function renderChip() {
    const L = level(), pct = Math.round(L.lvl / 5 * 100);
    $("#lvlChip").innerHTML = `<svg class="ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="4"/><circle cx="12" cy="12" r="9" fill="none" stroke="#FF4D6D" stroke-width="4" stroke-dasharray="${pct * 0.5655} 57" transform="rotate(-90 12 12)"/></svg><span class="t">${L.lvl ? "Lv " + L.lvl + " · " + LEVELS[L.lvl - 1] : "Start mastering"}</span>`;
  }

  /* ---- toast ---- */
  let tt;
  function toast(msg, actLabel, act) {
    const t = $("#toast");
    t.innerHTML = `<span>${esc(msg)}</span>${actLabel ? `<button type="button">${esc(actLabel)}</button>` : ""}`;
    if (actLabel) t.querySelector("button").onclick = () => { t.hidden = true; act(); };
    t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, actLabel ? 5000 : 2600);
  }

  /* ---- saved ---- */
  function saved() { return store.get("saved", []); }
  function isSaved(k, id) { return saved().some(x => x.k === k && x.id === id); }
  function toggleSave(k, id, title) {
    let s = saved();
    if (s.some(x => x.k === k && x.id === id)) { s = s.filter(x => !(x.k === k && x.id === id)); toast("Removed from your library"); }
    else { s.unshift({ k, id, title, at: new Date().toISOString() }); toast("Saved to your library"); }
    store.set("saved", s); return s.some(x => x.k === k && x.id === id);
  }

  /* ---- AI ---- */
  let ai = null, aiReady = false; const aiSubs = [];
  (async () => { try { ai = await window.claude?.use?.("sample"); } catch { ai = null; } aiReady = true; aiSubs.forEach(f => f()); })();
  const AI_ERR = {
    not_granted: `Claude access wasn't allowed for this page, so ${AI} is off for this visit.`, sampling_disabled: "Claude isn't available on this account.",
    rate_limited: "Too many requests right now. Wait a minute, then try again.", refused: `${AI} can't help with that request. Try rephrasing it.`,
    session_expired: "Sign in to Claude again to use AI features.", invalid_json: "The AI's answer came back in the wrong shape. Try again, or ask for less at once.",
    prompt_too_large: "That's too much text at once. Try a shorter excerpt."
  };
  const aiErr = code => AI_ERR[code] || "Couldn't reach Claude. Try again.";
  const aiFatal = code => ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(code);
  function caseContext(storyId) {
    const ls = storyId && story(storyId);
    if (ls && ls.live) return JSON.stringify({
      note: "REAL news: headlines and short snippets from Indian outlets' public RSS feeds, collected " + (window.LIVE_UPDATED || "recently") + ". Only headlines and snippets are available, not full articles, so say so when detail is missing. Outlet leans are provisional estimates. Cite articles by their id, like [A2].",
      title: ls.title, place: ls.place, topic: ls.cat, coverage: share(ls),
      articles: (ls.articles || []).map((a, i) => ({ id: "A" + (i + 1), outlet: ((window.LIVE_OUTLETS || {})[a.outlet] || {}).name || a.outlet, lean: ((window.LIVE_OUTLETS || {})[a.outlet] || {}).b || "U", headline: a.title, snippet: a.snippet, url: a.link, published: new Date(a.time).toISOString() }))
    });
    if (storyId && storyId !== "genz") { const s = story(storyId); const p = share(s); return JSON.stringify({ note: "ILLUSTRATIVE story for a product demo. No source documents are attached; only this summary.", title: s.title, place: s.place, summary: s.sum, howLeftFramedIt: s.L, howRightFramedIt: s.R, headlines: s.hl, coverage: `${p.total} articles; ${p.l}% left, ${p.c}% centre, ${p.r}% right of tracked outlets`, coverageGap: s.hide || null }); }
    const c = CASE;
    return JSON.stringify({
      note: "ILLUSTRATIVE case file: hypothetical events and invented sources for a product demo.",
      title: c.title, summary: c.happened, whyItMatters: c.matters, background: c.background,
      timeline: c.timeline.map(t => ({ happened: t.d, reported: t.rep, event: t.t, status: t.st, sources: t.src })),
      stakeholders: c.people.map(p => ({ name: p.n, role: p.role, position: p.pos, sources: p.src })),
      claims: c.claims.map(x => ({ id: x.id, claim: x.text, by: x.who, date: x.when, evidence: x.ev, counter: x.counter, status: x.st, sources: [...x.src, ...x.counterSrc] })),
      coverage: c.coverage.map(o => ({ outlet: o.outlet, type: o.type, language: o.lang, headline: o.hl, emphasis: o.emph, cites: o.cites, includes: o.has, doesNotAddress: o.lacks })),
      openQuestions: c.questions,
      sources: Object.fromEntries(Object.entries(c.sources).map(([k, s]) => [k, `${s.title} (${s.type}, ${s.date}, ${s.by}): ${s.ex}`]))
    });
  }
  const EVIDENCE_RULES = `Evidence rules (always follow):
- Cite only source IDs from the case file, written exactly like [S4]. Never invent sources, links, quotes, numbers or documents.
- Anything not in the case file must be marked "(general background, not from this case file: verify)".
- Separate verified facts, claims, allegations, interpretations and predictions. Use these status words where useful: Verified, Strongly supported, Partially supported, Disputed, Unverified, Misleading without context, Contradicted by evidence, Opinion, Prediction, Insufficient evidence.
- "Not mentioned in an article" is not the same as "suppressed". Never assert hidden motives without evidence.
- Don't tell the reader what to believe. Give the strongest version of each side, proportional to its evidence.
- Say plainly what remains unknown.`;
  function md(text) {
    const lines = String(text || "").split(/\r?\n/); let html = "", list = false, sec = false;
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[(S\d{1,2})\]/g, (m, id) => CASE.sources[id] ? cite(id) : `<span class="unsourced" title="This reference isn't in the case file">unknown ref</span>`)
      .replace(/\(general background, not from this case file: verify\)/gi, `<span class="unsourced">not sourced · verify</span>`);
    const closeList = () => { if (list) { html += "</ul>"; list = false; } };
    lines.forEach(l => { const t = l.trim();
      if (/^#{1,3}\s/.test(t)) { closeList(); if (sec) html += "</details>"; html += `<details open><summary>${inline(t.replace(/^#+\s*/, ""))}</summary>`; sec = true; return; }
      if (/^[-*•]\s/.test(t)) { if (!list) { html += "<ul>"; list = true; } html += `<li>${inline(t.replace(/^[-*•]\s*/, ""))}</li>`; return; }
      closeList(); if (t) html += `<p>${inline(t)}</p>`; });
    closeList(); if (sec) html += "</details>"; return html;
  }

  /* ---- drawer ---- */
  const PRIMARY = ["Primary document", "Primary record", "Court record", "Official document"];
  function openSource(id) {
    const s = CASE.sources[id]; if (!s) return;
    const opened = new Set(store.get("opened", [])); opened.add(id); store.set("opened", [...opened]);
    if (opened.size >= 3) sig("sources"); if (PRIMARY.includes(s.type)) sig("primary");
    const d = $("#drawer");
    const usedBy = CASE.claims.filter(c => c.src.includes(id) || c.counterSrc.includes(id)).map(c => c.id);
    d.innerHTML = `<header><span class="mono"><b style="background:var(--yellow);padding:0 4px">${id}</b> · ${esc(s.type)}</span><button class="btn sm flat" type="button" id="drClose">Close</button></header>
      <div class="body"><span class="demo-tag">Illustrative source</span><h2>${esc(s.title)}</h2>
        <dl class="kv"><dt>Published</dt><dd>${esc(s.date)}</dd><dt>By</dt><dd>${esc(s.by)}</dd><dt>Type</dt><dd>${esc(s.type)}${PRIMARY.includes(s.type) ? " · primary" : ""}</dd><dt>Used in</dt><dd>${usedBy.length ? usedBy.map(c => `Claim ${c}`).join(", ") : "Timeline and background"}</dd></dl>
        <div class="doc-ex">${esc(s.ex)}</div>
        <p class="muted" style="font-size:14px">In the real product this panel shows the original document or article link. This demo source is invented, so there's no link to open.</p></div>
      <footer><button class="btn sm" type="button" id="drSave">${isSaved("src", id) ? "Saved" : "Save source"}</button><button class="btn sm" type="button" id="drNote">Add to my notes</button><button class="btn sm y" type="button" id="drAsk">Ask ${AI}</button></footer>`;
    d.hidden = false; $("#scrim").hidden = false; $("#drClose").onclick = closeDrawer; $("#drClose").focus();
    $("#drSave").onclick = e => { e.target.textContent = toggleSave("src", id, s.title) ? "Saved" : "Save source"; };
    $("#drNote").onclick = () => { RS.addNote("genz", { kind: "fact", text: `${s.title}: ${s.ex}`, src: [id] }); toast("Added to your notes", "Open notes", () => show("investigate", "genz|notes")); };
    $("#drAsk").onclick = () => { closeDrawer(); show("investigate", "genz||ask"); RS.askPrefill && RS.askPrefill(`What does ${id} (${s.title}) establish, and what doesn't it establish?`); };
  }
  function closeDrawer() { $("#drawer").hidden = true; $("#scrim").hidden = true; }

  /* ---- router ---- */
  const V = {}; let current = null;
  const ALIAS = {
    inv: a => ["investigate", `${String(a || "genz").split(":")[0]}|dossier|${String(a || "").split(":")[1] || ""}`],
    lab: a => ["investigate", a === "ask" ? "||ask" : `genz|map|${a || ""}`],
    investigations: () => ["investigate", ""],
    clip: a => ["studio", a ? "post:" + a : ""]
  };
  const NAV_OF = { board: "investigate", story: "discover", post: "publications", write: "publications", chat: "chat", shame: "shame" };
  function show(name, arg) {
    if (ALIAS[name]) [name, arg] = ALIAS[name](arg);
    if (!V[name]) name = "home";
    $("#moreMenu").open = false; closeDrawer();
    Object.keys(V).forEach(k => { const el = $("#v-" + k); if (el) el.hidden = k !== name; });
    const navName = NAV_OF[name] || name;
    $$(".tnav button, .tmenu button").forEach(b => b.setAttribute("aria-current", b.dataset.go === navName ? "page" : "false"));
    const v = V[name], el = $("#v-" + name);
    if (!v.mounted) { v.mount && v.mount(el); v.mounted = true; }
    const keepScroll = v.show && v.show(arg, el);
    current = name;
    if (!keepScroll) window.scrollTo({ top: 0 });
    document.body.classList.toggle("at-home", name === "home");
    if (window.RT_SHOWN) window.RT_SHOWN(name, arg);
  }
  document.addEventListener("click", e => {
    const s = e.target.closest("[data-src]"); if (s) { e.preventDefault(); openSource(s.dataset.src); return; }
    const g = e.target.closest("[data-go]"); if (g) { e.preventDefault(); (window.RT_GO || show)(g.dataset.go, g.dataset.arg, g); }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#drawer").hidden) closeDrawer(); });
  $("#scrim").addEventListener("click", closeDrawer);

  /* ============ HOME ============ */
  const HIDDEN = ["floods", "sand", "riders", "eggs", "oxygen", "fishing", "upi", "lang"];
  const CLUE = { floods: "60,000 displaced. Barely on prime time.", sand: "Who checks how deep the pits go?", riders: "No official count of heat illness.", eggs: "The circular was never announced.", oxygen: "Installed in a hurry, then forgotten?", fishing: "Last season's relief still unpaid.", upi: "Right-leaning outlets barely covered it.", lang: "Left-leaning outlets barely covered it." };
  function carpetTile() {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' fill='#B3221E'/><path d='M0 48L48 0L96 48L48 96Z' fill='none' stroke='#8C1714' stroke-width='7'/><path d='M0 48L48 0L96 48L48 96Z' fill='none' stroke='#EBCBA5' stroke-width='1.4' stroke-dasharray='3 4'/><path d='M34 48Q48 36 62 48Q48 60 34 48Z' fill='none' stroke='#F5E500' stroke-width='2'/><circle cx='48' cy='48' r='4' fill='#F5E500'/><path d='M4 4h14v10H4zM7 7h8M7 10h6' fill='none' stroke='#EBCBA5' stroke-width='1.2'/><path d='M78 82l8-8m0 0h-6m6 0v6' fill='none' stroke='#EBCBA5' stroke-width='1.6'/><circle cx='88' cy='10' r='4' fill='none' stroke='#EBCBA5' stroke-width='1.4'/><path d='M8 86q4-6 8 0t8 0' fill='none' stroke='#EBCBA5' stroke-width='1.4'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  V.home = {
    mount(el) {
      const rot = i => [-2.2, 1.4, -1, 2, 1.2, -1.8, .8, -1.3][i % 8];
      const feat = story("genz");
      el.innerHTML = `
      <div class="hero"><div class="wrap">
        <div class="hero-top">
          <h1>What Indian media <em>didn't show you.</em></h1>
          <div class="hero-copy"><p>Eight stories this week that got a sliver of the coverage their impact deserved. Pull back the carpet, see who covered them and who didn't, then investigate them yourself.</p>
            <div class="hero-actions"><button class="btn y" type="button" id="unroll">Pull back the carpet</button><button class="btn" type="button" data-go="discover">See all of today's news</button></div></div>
        </div>
        <div class="stage" id="stage" style="--p:.07">
          <div class="under" id="under"><svg class="threads" id="threads" aria-hidden="true"></svg>
            ${HIDDEN.map((id, i) => { const s = story(id), p = share(s); return `<div class="frag ${i === 2 ? "yellow" : i === 5 ? "black" : ""}" style="--rot:${rot(i)}deg" tabindex="0" role="button" data-id="${id}" aria-label="${esc(s.title)}">
              <span class="fthumb">${art(id)}</span><span class="eyebrow">${esc(s.cat)} · ${esc(s.place)}</span><span class="ft">${esc(s.title)}</span>
              <span class="gap">${s.hide ? esc(s.hide) : s.blind === "right" ? "Blindspot: barely covered on the right" : "Blindspot: barely covered on the left"}</span>
              ${biasBar(s)}<span class="mono" style="font-size:11px">${p.total} articles · ${p.tracked} from tracked outlets</span>
              <span class="clue">${esc(CLUE[id])}</span>
              <span class="acts"><span data-a="open">Coverage</span><span data-a="inv">Investigate</span><span data-a="ask">Ask ${AI}</span></span></div>`; }).join("")}
          </div>
          <div class="carpet" id="carpet" aria-hidden="true">
            <div class="weave" style="background-image:repeating-linear-gradient(90deg,#0000 0 3px,#00000018 3px 4px),repeating-linear-gradient(0deg,#0000 0 3px,#00000014 3px 4px),${carpetTile()};"></div>
            <div style="position:absolute;inset:16px;border:6px double #EBCBA5;pointer-events:none"></div><div class="fringe"></div>
            <div class="carpet-label"><div class="eyebrow" style="color:#F5E7D5">Swept under the carpet this week</div><div class="display">8 stories Indian media barely covered</div><div class="mono" style="margin-top:8px">Drag the roll →</div></div>
          </div>
          <div class="hint" id="hint">drag me →</div>
          <div class="roll" id="roll" tabindex="0" role="slider" aria-label="Pull back the carpet to reveal under-covered stories" aria-valuemin="0" aria-valuemax="100" aria-valuenow="7"><div class="grip">PULL<br>→</div></div>
        </div>
        <div class="stage-meta"><span id="revealed">0 of 8 stories revealed</span><span>How we pick: big impact, small coverage across ${OUTLETS.length} tracked outlets. Low coverage doesn't by itself mean anyone hid it. <button class="linkish" type="button" id="rollBack" style="color:var(--yellow)">Roll it back</button></span></div>
      </div></div>

      <div class="wrap">
        <section class="section" id="homeBoard"></section>

        <section class="section">
          <div class="sec-head"><h2>Daily briefing</h2><button class="linkish" type="button" data-go="discover">Open Discover →</button></div>
          <div class="brief3">
            <button class="feat-card" type="button" data-go="story" data-arg="${feat.id}">${art(feat.id, 140)}<span class="eyebrow">${esc(feat.cat)} · ${esc(feat.place)} · featured investigation</span><span class="ft">${esc(feat.title)}</span>${biasBar(feat, true)}</button>
            <div class="toplist">${STORIES.filter(s => !HIDDEN.includes(s.id) && s.id !== "genz").concat(story("upi")).slice(0, 5).map(s => `<button type="button" class="trow" data-go="story" data-arg="${s.id}"><span class="eyebrow">${esc(s.cat)} · ${esc(s.place)}</span><b>${esc(s.title)}</b>${biasBar(s)}<span class="mono muted" style="font-size:11px">${leanText(s)}: ${countLine(s)}</span></button>`).join("")}</div>
            <div class="blindcol"><span class="blindlogo">BLINDSPOT</span><p class="muted" style="font-size:13.5px">Stories covered mostly by one side of the spectrum.</p>
              ${STORIES.filter(s => s.blind).slice(0, 3).map(s => `<button type="button" class="blindcard" data-go="story" data-arg="${s.id}"><span class="tagb">Blindspot · ${s.blind === "right" ? "Right" : "Left"} barely covered</span><b>${esc(s.title)}</b>${biasBar(s)}</button>`).join("")}</div>
          </div>
        </section>

        <section class="section split">
          <div class="overlooked"><span class="eyebrow">From the community</span><h3>Readers turned research into articles</h3><div id="homePosts" class="dark-list"></div><div><button class="btn y" type="button" data-go="publications">Read publications</button></div></div>
          <div class="rule-top" style="display:grid;gap:10px;align-content:start">
            <span class="eyebrow">Weekly, at your door</span><h2 class="display" style="font-size:44px">The magazine and the comic, delivered</h2>
            <p class="muted">Every week: a long-read issue for you and a news comic for younger readers. Kids who ace the comic quiz get goodies in their next delivery.</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn r" type="button" data-go="magazine">Flip through &amp; subscribe</button><button class="btn" type="button" data-go="kids">Read this week's comic</button></div>
          </div>
        </section>
      </div>`;
      this.carpet(el);
    },
    show() {
      $("#homePosts").innerHTML = RS.allPosts().slice(0, 3).map(p => `<button type="button" class="dl-row" data-go="post" data-arg="${p.id}"><b>${esc(p.title)}</b><span>${esc(RS.pubOf(p)?.name || "")} · ${p.srcCount} sources</span></button>`).join("");
      $("#homeBoard").innerHTML = leaderboardHTML(true);
      requestAnimationFrame(drawThreads);
    },
    carpet(el) {
      const stage = $("#stage", el), roll = $("#roll", el), under = $("#under", el); let p = 0.07;
      const set = (v, anim = true) => {
        p = Math.max(0.04, Math.min(1, v)); stage.classList.toggle("dragging", !anim); stage.style.setProperty("--p", p);
        roll.setAttribute("aria-valuenow", Math.round(p * 100)); $("#hint").hidden = p > 0.2;
        const cut = stage.getBoundingClientRect().width * p; let n = 0;
        $$(".frag", under).forEach(f => { const vis = f.offsetLeft + f.offsetWidth * .5 < cut; f.tabIndex = vis ? 0 : -1; f.setAttribute("aria-hidden", vis ? "false" : "true"); if (vis) n++; });
        $("#revealed").textContent = `${n} of 8 stories revealed`;
      };
      set(p); let drag = null;
      roll.addEventListener("pointerdown", e => { drag = 1; roll.setPointerCapture(e.pointerId); });
      roll.addEventListener("pointermove", e => { if (!drag) return; const r = stage.getBoundingClientRect(); set((e.clientX - r.left) / r.width, false); });
      const end = () => { if (!drag) return; drag = null; set(p > 0.82 ? 1 : p, true); };
      roll.addEventListener("pointerup", end); roll.addEventListener("pointercancel", end);
      roll.addEventListener("keydown", e => { if (e.key === "ArrowRight") { e.preventDefault(); set(p + 0.1); } if (e.key === "ArrowLeft") { e.preventDefault(); set(p - 0.1); } if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(p < 1 ? 1 : 0.07); } });
      $("#carpet", el).addEventListener("click", () => set(p + 0.3));
      $("#unroll", el).onclick = () => { set(1); setTimeout(() => under.querySelector(".frag")?.focus({ preventScroll: true }), 950); };
      $("#rollBack", el).onclick = () => set(0.07);
      const act = (f, a) => { const id = f.dataset.id;
        if (a === "inv") return show("investigate", id + "|dossier");
        if (a === "ask") { show("investigate", id + "||ask"); RS.askPrefill(`What's missing from the coverage of "${story(id).title}", and what should I check first?`); return; }
        show("story", id); };
      under.addEventListener("click", e => { const f = e.target.closest(".frag"); if (f) act(f, e.target.dataset.a || "open"); });
      under.addEventListener("keydown", e => { const f = e.target.closest(".frag"); if (f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); act(f, "open"); } });
      window.addEventListener("resize", () => { set(p, false); drawThreads(); });
    }
  };
  function drawThreads() {
    const under = $("#under"); if (!under || !under.offsetWidth) return;
    const fr = $$(".frag", under), pts = fr.map(f => [f.offsetLeft + f.offsetWidth / 2, f.offsetTop + 10]);
    const pairs = [[0, 1], [1, 6], [2, 3], [3, 7], [4, 5], [5, 0], [6, 7], [2, 4]];
    $("#threads").innerHTML = pairs.filter(([a, b]) => pts[a] && pts[b]).map(([a, b]) => `<path d="M${pts[a][0]} ${pts[a][1]} Q${(pts[a][0] + pts[b][0]) / 2} ${(pts[a][1] + pts[b][1]) / 2 + 40} ${pts[b][0]} ${pts[b][1]}" stroke="#FF4D6D" stroke-width="2" fill="none" opacity=".85"/>`).join("")
      + pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#F5E500" stroke="#171717" stroke-width="1.5"/>`).join("");
  }

  /* ---- leaderboard (Shameboard) ---- */
  function leaderboardHTML(onHome) {
    const L = LEADER, top = [L[1], L[0], L[2]];
    return `<div class="lb">
      <div class="lb-head"><div><span class="demo-tag">Sample outlets · illustrative numbers</span><h2>The Shameboard</h2><p>Who got the story wrong most often this month? Ranked by misleading or false findings per 100 checked claims. Votes don't count here, only reviewed evidence.</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-self:end"><button class="btn y" type="button" data-go="shame">See the evidence</button><button class="btn" type="button" data-go="shame" data-arg="flag">Flag a claim</button></div></div>
      <div class="podium">${top.map((o, i) => { const rank = [2, 1, 3][i]; const out = outlet(o.org) || { name: o.name, c: "#1A237E" };
        return `<button type="button" class="pod p${rank}" data-go="shame" data-arg="${o.org}"><span class="crown">${rank === 1 ? "♛" : ""}</span>${logo({ name: o.name, c: out.c || "#444" }, "xl")}<b>${esc(o.name)}</b><span class="mono">${esc(o.t)}</span><span class="rate">${o.rate}<small>/100</small></span><span class="step">${rank}</span></button>`; }).join("")}</div>
      <ol class="lb-list" start="4">${L.slice(3).map((o, i) => { const out = outlet(o.org) || { c: "#444" };
        return `<li><button type="button" data-go="shame" data-arg="${o.org}"><span class="rk">${i + 4}</span>${logo({ name: o.name, c: out.c })}<span class="nm"><b>${esc(o.name)}</b><span class="mono muted">${esc(o.t)}</span></span><span class="meter"><span style="width:${Math.min(100, o.rate * 5)}%"></span></span><span class="num">${o.rate}</span><span class="mono muted cr">${o.corrected}% corrected</span><span class="tr ${o.trend > 0 ? "up" : o.trend < 0 ? "down" : ""}">${o.trend > 0 ? "▲" : o.trend < 0 ? "▼" : "–"}</span></button></li>`; }).join("")}</ol>
      <p class="mono muted" style="font-size:11.5px">Method: each finding is a single checked claim reviewed by two people, with the publisher's response on record. Rates use claims checked as the denominator, so big and small outlets compare fairly. ${onHome ? "" : "Corrections are credited."}</p></div>`;
  }

  /* ============ DISCOVER (Ground-News-style) ============ */
  const TOPICS = ["Education", "Economy", "Environment", "Labour", "Health", "Disaster", "Children", "Livelihoods", "Climate", "Sports"];
  V.discover = {
    tab: "Home", q: "", city: "", topic: "",
    mount(el) {
      el.innerHTML = `<div class="topicbar"><div class="wrap"><span aria-hidden="true">↗</span>${TOPICS.map(t => `<button type="button" data-topic="${t}">${t} <b>+</b></button>`).join("")}</div></div>
        <div class="wrap"><div class="gn-head"><div class="tabs" id="gnTabs"></div><input class="search" id="gnSearch" type="search" placeholder="Search today's stories" aria-label="Search stories"></div>
        <div class="gn" id="gn"></div></div>`;
      $("#gnSearch").addEventListener("input", e => { this.q = e.target.value.toLowerCase(); this.render(); });
      $$(".topicbar [data-topic]", el).forEach(b => b.onclick = () => { this.topic = this.topic === b.dataset.topic ? "" : b.dataset.topic; $$(".topicbar [data-topic]").forEach(x => x.setAttribute("aria-pressed", x.dataset.topic === this.topic)); this.render(); });
    },
    show(arg) { if (arg) this.tab = arg; this.render(); },
    render() {
      $("#gnTabs").innerHTML = ["Home", "For You", "Local", "Blindspot"].map(t => `<button type="button" aria-pressed="${t === this.tab}">${t}</button>`).join("");
      $$("#gnTabs button").forEach(b => b.onclick = () => { this.tab = b.textContent; this.render(); });
      let list = STORIES.filter(s => (!this.topic || s.cat === this.topic) && (!this.q || (s.title + s.sum.join(" ") + s.place).toLowerCase().includes(this.q)));
      if (this.tab === "Blindspot") list = list.filter(s => s.blind || s.hide);
      if (this.tab === "Local" && this.city) list = list.filter(s => s.place.toLowerCase().includes(this.city.toLowerCase()));
      if (this.tab === "For You") { const f = store.get("follows", []); list = [...list].sort((a, b) => (b.cat === "Education") - (a.cat === "Education")); }
      const feat = list[0], rest = list.slice(1);
      const row = s => `<button type="button" class="gn-row" data-go="story" data-arg="${s.id}"><span class="txt"><span class="eyebrow">${esc(s.cat)} · ${esc(s.place)}${s.hide ? " · <b style='color:var(--pink)'>Under-covered</b>" : ""}</span><b>${esc(s.title)}</b><span class="mini">${biasBar(s)}<span class="mono">${leanText(s)}: ${countLine(s)}</span></span></span>${art(s.id, 90)}</button>`;
      $("#gn").innerHTML = !list.length ? `<div class="empty">No stories match. Clear the topic or search and try again.</div>` : `
        <div class="gn-left"><h3 class="display" style="font-size:30px">Daily Briefing</h3><p class="mono muted">${list.length} stories · ${list.reduce((a, s) => a + share(s).total, 0)} articles</p>
          ${list.slice(0, 4).map(s => `<button type="button" class="brief-item" data-go="story" data-arg="${s.id}"><b>${esc(s.title)}</b><span class="muted">${esc(s.sum[0])}</span></button>`).join("")}
          <div class="localbox"><b>Local news</b><p class="muted" style="font-size:13.5px">See stories and media bias in your city or state.</p><div style="display:flex;gap:6px"><input class="search" id="cityIn" placeholder="City or state" value="${esc(this.city)}" style="width:100%"><button class="btn sm" type="button" id="cityGo">Set</button></div></div></div>
        <div class="gn-main">${feat ? `<button type="button" class="gn-feat" data-go="story" data-arg="${feat.id}">${art(feat.id, 150)}<span class="cap"><span class="eyebrow">${esc(feat.cat)} · ${esc(feat.place)}</span><span class="ft">${esc(feat.title)}</span>${biasBar(feat, true)}</span></button>` : ""}
          <div class="gn-list">${rest.map(row).join("")}</div></div>
        <div class="gn-right"><span class="blindlogo">BLINDSPOT</span><p class="muted" style="font-size:13.5px">Stories covered disproportionately by one side, or barely covered at all.</p>
          ${STORIES.filter(s => s.blind || s.hide).slice(0, 4).map(s => `<button type="button" class="blindcard" data-go="story" data-arg="${s.id}"><span class="tagb">${s.blind ? "Blindspot · " + (s.blind === "right" ? "Right" : "Left") : "Under-covered"} · ${countLine(s)}</span><b>${esc(s.title)}</b>${biasBar(s)}</button>`).join("")}</div>`;
      const go = () => { this.city = $("#cityIn").value.trim(); this.tab = "Local"; this.render(); };
      if ($("#cityGo")) { $("#cityGo").onclick = go; $("#cityIn").onkeydown = e => { if (e.key === "Enter") go(); }; }
    }
  };

  /* ============ STORY PAGE ============ */
  V.story = {
    side: "C", filter: "All",
    show(id, el) {
      const s = story(id) || STORIES[0], p = share(s), arts = articles(s);
      this.side = this.side || "C";
      const sumFor = k => k === "C" ? s.sum : k === "L" ? [...s.L, ...s.sum.slice(0, 2)] : [...s.R, ...s.sum.slice(0, 2)];
      el.innerHTML = `<div class="wrap"><div class="story">
        <div class="story-main">
          <div class="metaline"><span>${s.live ? "Latest update" : "Published"} ${esc(s.time)}</span><span>${esc(s.cat)} · ${esc(s.place)}</span>${s.live ? `<span class="demo-tag live-tag">● Live · real headlines</span>` : `<span class="demo-tag">Illustrative story</span>`}
            <span style="margin-left:auto;display:flex;gap:6px"><button class="btn sm" type="button" id="stSave">${isSaved("story", s.id) ? "Saved" : "Save"}</button><button class="btn sm" type="button" id="stChat">Share to chat</button></span></div>
          <h1 class="display story-title">${esc(s.title)}</h1>
          <figure class="story-hero">${art(s.id)}${s.live && s.image ? "" : `<figcaption class="mono">Illustration · ${esc(s.place)}</figcaption>`}</figure>
          ${s.hide ? `<div class="gapbanner"><b>Under-covered:</b> ${esc(s.hide)}.</div>` : ""}
          <div class="seg3" role="tablist">${[["L", "Left"], ["C", "Centre"], ["R", "Right"]].map(([k, n]) => `<button type="button" role="tab" aria-selected="${this.side === k}" data-side="${k}">${n}</button>`).join("")}<button type="button" id="cmpBtn" class="cmp">⇆ Bias comparison</button></div>
          <ul class="sumlist" id="sumList">${sumFor(this.side).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
          <div id="cmpBox" hidden class="cmpbox"><div style="--g:${BIAS.L[1]}"><span class="eyebrow">Left headline</span><b>${esc(s.hl.L)}</b></div><div style="--g:${BIAS.C[1]}"><span class="eyebrow">Centre headline</span><b>${esc(s.hl.C)}</b></div><div style="--g:${BIAS.R[1]}"><span class="eyebrow">Right headline</span><b>${esc(s.hl.R)}</b></div></div>
          <div class="insight"><span>✦ Summary by ${AI} from ${s.live ? countLine(s) : p.total + " articles"}</span><button class="linkish" type="button" id="wrongBtn">Does this summary seem wrong?</button></div>
          <div class="cta-row"><button class="btn k" type="button" data-go="investigate" data-arg="${s.id}|dossier">Investigate this story</button><button class="btn y" type="button" data-go="investigate" data-arg="${s.id}||ask">Ask ${AI}</button><button class="btn" type="button" data-go="investigate" data-arg="${s.id}|notes">Write about it</button></div>
          <div class="arts-head"><h2 class="display">${s.live ? plural(s.articleCount || arts.length, "Article") + ` <small class="mono muted" style="font-size:13px">from ${plural(s.outletCount, "outlet")}</small>` : p.total + " Articles"}</h2><div class="tabs" id="artTabs"></div></div>
          <div class="arts" id="arts"></div>
          <p class="mono muted" style="font-size:12px">${s.live ? `Real headlines from Indian outlets' public news feeds, collected ${esc(window.LIVE_UPDATED || "")}. Each links to the outlet. Left/centre/right labels are provisional estimates, not yet reviewed.` : `Showing a sample of ${arts.length} of ${p.total} articles. Outlets and headlines are invented for this demo.`}</p>
        </div>
        <aside class="story-side">
          <div class="sidecard"><h3>Coverage details</h3><dl class="covdl">${s.live ? `<dt>Outlets on this story</dt><dd>${s.outletCount}</dd><dt>Articles</dt><dd>${s.articleCount || arts.length}</dd>` : `<dt>Total news sources</dt><dd>${p.total}</dd>`}<dt>Leaning left</dt><dd>${p.L}</dd><dt>Leaning right</dt><dd>${p.R}</dd><dt>Centre</dt><dd>${p.C}</dd><dt>${s.live ? "Not yet rated" : "Untracked bias"}</dt><dd>${s.cov.U}</dd><dt>Bias distribution</dt><dd>${p.l >= p.r && p.l >= p.c ? p.l + "% Left" : p.r >= p.c ? p.r + "% Right" : p.c + "% Centre"}</dd></dl></div>
          <div class="sidecard"><h3>Bias distribution</h3><p style="font-size:13.5px">• ${Math.max(p.l, p.c, p.r)}% of the ${s.live ? "rated outlets" : "sources"} ${p.l >= p.c && p.l >= p.r ? "lean left" : p.r >= p.c ? "lean right" : "are centre"}</p>${biasBar(s, true)}${biasColumns(s)}
            <h4 class="eyebrow" style="margin-top:12px">Untracked bias</h4><div class="untracked">${s.live ? (liveOutlets(s).filter(o => o.b === "U").map(o => logo(o)).join("") || `<span class="mono muted" style="font-size:12px">None: every outlet on this story has a (provisional) lean rating.</span>`) : `${OUTLETS.filter(o => o.b === "U").map(o => logo(o)).join("")}<span class="logo more">+${Math.max(0, s.cov.U - 4)}</span>`}</div></div>
          <div class="sidecard"><h3>Factuality &amp; ownership</h3>${s.live ? `<p class="mono muted" style="font-size:12px">Factuality and ownership ratings for real outlets aren't published yet. They need a reviewed method first.</p>` : ""}${(s.live ? [] : arts).slice(0, 5).map(a => `<div class="fo"><span>${logo(a.o)} ${esc(a.o.name)}</span><span class="mono">${esc(a.o.fact)} factuality</span></div>`).join("")}${s.live ? "" : `<p class="mono muted" style="font-size:11px">Ratings are sample values for this demo.</p>`}</div>
          <div class="sidecard"><h3>More stories like this</h3>${STORIES.filter(x => x.id !== s.id && (x.cat === s.cat || x.hide)).slice(0, 3).map(x => `<button type="button" class="linkish" style="display:block;text-align:left;margin-bottom:8px" data-go="story" data-arg="${x.id}">${esc(x.title)}</button>`).join("")}</div>
        </aside></div></div>`;
      $$("[data-side]", el).forEach(b => b.onclick = () => { this.side = b.dataset.side; this.show(id, el); });
      $("#cmpBtn").onclick = () => { $("#cmpBox").hidden = !$("#cmpBox").hidden; };
      $("#wrongBtn").onclick = () => toast("Thanks. Your flag goes to the editors with this summary's sources.");
      $("#stSave").onclick = e => { e.target.textContent = toggleSave("story", s.id, s.title) ? "Saved" : "Save"; };
      $("#stChat").onclick = () => { RS.shareToChat({ kind: "story", id: s.id, title: s.title }); };
      const artList = () => {
        const counts = { All: arts.length, Left: arts.filter(a => a.side === "L").length, Centre: arts.filter(a => a.side === "C").length, Right: arts.filter(a => a.side === "R").length };
        $("#artTabs").innerHTML = Object.entries(counts).map(([k, n]) => `<button type="button" aria-pressed="${k === this.filter}">${k} <small>${n}</small></button>`).join("");
        $$("#artTabs button").forEach(b => b.onclick = () => { this.filter = b.firstChild.textContent.trim(); artList(); });
        const f = { All: null, Left: "L", Centre: "C", Right: "R" }[this.filter];
        $("#arts").innerHTML = arts.filter(a => !f || a.side === f).map(a => `<div class="artrow"><div class="arttop"><span class="opill">${logo(a.o)}${esc(a.o.name)}</span><span class="chips">${a.link ? "" : `<button type="button" class="chipx" data-own="${a.o.id}">Ownership</button><button type="button" class="chipx" data-fact="${a.o.id}">Factuality</button>`}<span class="biaspill" style="--g:${BIAS[a.g][1]}">${BIAS[a.g][0]}</span></span></div>${a.img ? `<img class="livephoto artthumb" src="${esc(a.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}${a.link ? `<a class="arthl" href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">${esc(a.hl)} ↗</a><span class="mono muted">${a.ago} · read it at ${esc(a.o.name)} · lean is provisional</span>` : `<b class="arthl">${esc(a.hl)}</b><span class="mono muted">${a.ago} · ${esc(a.o.lang)} · ${esc(a.o.t)}</span>`}</div>`).join("");
        $$("[data-own]").forEach(b => b.onclick = () => toast(`${outlet(b.dataset.own).name}: ${outlet(b.dataset.own).own}`));
        $$("[data-fact]").forEach(b => b.onclick = () => toast(`${outlet(b.dataset.fact).name}: ${outlet(b.dataset.fact).fact} factuality (sample rating)`));
      };
      artList();
      if (s.id === "genz") sig("coverage", true);
    }
  };

  /* ---- posts helpers ---- */
  function allPosts() { const mine = store.get("posts", []).map(p => ({ ...p, mine: true })), ids = new Set(mine.map(p => p.id)); return [...mine, ...(RS.sharedPosts || []).filter(p => !ids.has(p.id)), ...SAMPLE_POSTS]; }
  function pubOf(p) { return p.mine ? RS.myPub() : PUBS.find(x => x.id === p.pub) || { id: "friend", name: p.pubName || "A friend's publication", by: "", desc: "", color: p.pubColor || "#2DD4BF" }; }

  /* ---- public API ---- */
  window.RS = {
    $, $$, esc, store, st, cite, cites, md, toast, sig, signals, level, LEVELS, SIGNALS, renderChip, show, V,
    openSource, closeDrawer, saved, isSaved, toggleSave, allPosts, pubOf, story, share, countLine, biasBar, biasColumns, logo, outlet, art, leaderboardHTML,
    ai: () => ai, aiReady: () => aiReady, onAi: f => { aiSubs.push(f); if (aiReady) f(); }, aiErr, aiFatal, killAi: () => { ai = null; aiSubs.forEach(f => f()); },
    caseContext, EVIDENCE_RULES, AI,
    myPub: () => store.get("mypub", { id: "mine", name: "Gen Z Dispatch", by: "You", desc: "My notes and investigations on the stories shaping India.", color: "#FF4D6D" }),
    askPrefill: () => { }, addNote: () => { }, shareToChat: () => { }, boardAdd: () => { },
    boot() {
      $("#brandWord").innerHTML = esc(BRAND.name).replace(/(\S+)$/, "<i>$1</i>");
      $("#footBrand").textContent = `${BRAND.name}: ${BRAND.tagline}`;
      $$("[data-ai-name]").forEach(e => e.textContent = AI);
      document.title = BRAND.name; renderChip();
      const h = (location.hash || "").slice(1), m = h.match(/^(story|post)-(.+)$/);
      if (m) show(m[1], m[2]); else show(V[h] || ALIAS[h] ? h : "home");
      document.fonts && document.fonts.ready.then(drawThreads);
    }
  };
})();
