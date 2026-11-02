/* THE RED THREAD — The Questioners' Club: an open research community inside the site.
   Question · Investigate · Discuss · Publish. Home feed (For you / Latest / Popular), Investigation Rooms with
   claim-level evidence, open Discussions, Missing Stories (with an editorial status pipeline), Members, Events, a
   Create menu, onboarding, reporting and a moderation queue with an audit log.
   PROTOTYPE: there is no backend yet, so your profile and everything you add is saved in this browser only. The
   seeded investigations, discussions, members and events are illustrative samples, not real people or findings.
   Real accounts, shared contributions and enforced permissions need a server (e.g. Supabase with row-level security). */
(function () {
  const { $, $$, esc, store, toast } = RS;
  const KEY = "club";
  const TOPICS = ["Politics & Governance", "Economics & Business", "Science & Technology", "History & Culture", "Law & Justice", "Environment & Climate", "International Affairs", "Media & Journalism", "Education", "Society & Human Rights", "Sports", "Health"];
  const LABEL = { community: ["Community contribution", "Submitted by a member. Not independently verified by The Red Thread."], review: ["Under review", "Being examined. Its accuracy has not been established."], verified: ["Editorially verified", "Reviewed by The Red Thread editors within the stated scope."], disputed: ["Disputed", "Credible counter-evidence or material disagreement has been raised."] };
  const RESP = { supports: "Supporting evidence", challenges: "Challenges it", context: "Adds context", wording: "Needs more precise wording" };
  const PIPE = [["submitted", "Submitted"], ["research", "Community research"], ["editorial", "Editorial review"], ["published", "Published"], ["notpursued", "Not pursued"]];
  const ROLES = ["member", "moderator", "editor"];
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const now = () => Date.now(), H = 36e5, D = 864e5;
  const ago = t => { const s = (now() - t) / 1000; return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + "m ago" : s < 86400 ? Math.floor(s / 3600) + "h ago" : Math.floor(s / 86400) + "d ago"; };

  /* ---------- illustrative seed community ---------- */
  function seed() {
    const t = now(), S = "(sample)";
    const m = ["aarav_asks", "meera.reads", "kabir_k", "zoya_files", "dev_in_delhi"];
    return {
      me: null, follows: [], saved: [], reports: [], audit: [], hidden: [], notes: {},
      members: [
        { name: m[0], bio: "Engineering student. Asks why before how.", interests: ["Science & Technology", "Education"], sample: true },
        { name: m[1], bio: "Reads court judgements for fun.", interests: ["Law & Justice", "Politics & Governance"], sample: true },
        { name: m[2], bio: "Tracks what TV debates leave out.", interests: ["Media & Journalism"], sample: true },
        { name: m[3], bio: "Keeps a spreadsheet of everything.", interests: ["Economics & Business", "Environment & Climate"], sample: true },
        { name: m[4], bio: "Lives in the air-quality headlines.", interests: ["Environment & Climate", "Health"], sample: true }
      ],
      invs: [
        { id: "i-air", sample: true, title: "Why are Indian cities struggling with air pollution despite repeated government action?", question: "What actually drives winter pollution in Indian cities, and why haven't repeated measures fixed it?", why: "Millions breathe hazardous air every winter, and every year the same debates return.", subqs: ["Which sources dominate in which season?", "Which measures were enforced, and which only announced?", "How do Delhi and smaller cities differ?"], topic: "Environment & Climate", by: m[4], at: t - 9 * D,
          sources: [{ id: "s1", title: "Government emissions inventory " + S, publisher: "Sample publisher", date: "2025", type: "Government report", url: "", by: m[3], at: t - 8 * D, ver: "unverified" }, { id: "s2", title: "Research paper on seasonal pollution sources " + S, publisher: "Sample journal", date: "2024", type: "Research paper", url: "", by: m[0], at: t - 6 * D, ver: "unverified" }, { id: "s3", title: "Independent analysis of winter pollution patterns " + S, publisher: "Sample research group", date: "2025", type: "Analysis", url: "", by: m[4], at: t - 4 * D, ver: "unverified" }],
          claims: [{ id: "c1", text: "Vehicle emissions are the primary cause of Delhi's winter air pollution.", status: "review", by: m[4], at: t - 7 * D, responses: [{ id: "r1", kind: "supports", text: "The emissions inventory ranks transport among the largest year-round sources.", src: "s1", by: m[3], at: t - 6 * D }, { id: "r2", kind: "challenges", text: "In winter, the paper finds crop-residue burning and weather trapping dominate on peak days.", src: "s2", by: m[0], at: t - 5 * D }, { id: "r3", kind: "context", text: "‘Primary’ changes by month. Suggest rewording to a specific season and measure.", src: "s3", by: m[1], at: t - 3 * D }] }],
          perspectives: [{ who: "Commuters", view: "Traffic is the visible, daily cause.", by: m[2] }, { who: "Farmers' groups", view: "Stubble burning is blamed for a few weeks while year-round sources are ignored.", by: m[3] }],
          comments: [{ id: "k1", by: m[1], text: "Can someone find which measures had enforcement data, not just announcements?", at: t - 2 * D, replies: [{ id: "k2", by: m[3], text: "On it. I'll add what I find to Research.", at: t - 1 * D }] }],
          questions: [{ text: "How much does weather alone explain the worst days?", by: m[0] }], findings: null, history: [{ at: t - 9 * D, by: m[4], what: "started the investigation" }, { at: t - 3 * D, by: m[1], what: "suggested rewording a claim" }] },
        { id: "i-leak", sample: true, title: "Did the exam paper leak beyond two centres?", question: "Is there evidence that leaked questions spread beyond the two centres the agency named?", why: "A re-test decision affects 1.8 million candidates in this illustrative case.", subqs: ["Who took the photographs?", "Can the screenshot timestamps be verified?"], topic: "Education", by: m[1], at: t - 5 * D, story: "genz",
          sources: [], claims: [{ id: "c2", text: "The breach was limited to two centres.", status: "disputed", by: m[1], at: t - 4 * D, responses: [{ id: "r4", kind: "challenges", text: "The agency audited itself; no independent audit yet.", by: m[2], at: t - 3 * D }] }],
          perspectives: [], comments: [], questions: [{ text: "Will the expert committee's report be public?", by: m[2] }], findings: null, history: [{ at: t - 5 * D, by: m[1], what: "started the investigation from a story" }] },
        { id: "i-coach", sample: true, title: "Is coaching culture changing how students prepare for entrance exams?", question: "What has changed in how students prepare, and who can afford it?", why: "Families spend heavily on coaching; the payoff is rarely measured.", subqs: [], topic: "Education", by: m[0], at: t - 2 * D, sources: [], claims: [], perspectives: [], comments: [], questions: [], findings: null, history: [{ at: t - 2 * D, by: m[0], what: "started the investigation" }] }
      ],
      discs: [
        { id: "d1", sample: true, title: "Why do Indian news channels focus so much on political debates?", body: "Prime time is mostly panels shouting. Is that what people watch, or what's cheap to make?", why: "I want to know if it's demand or cost.", topic: "Media & Journalism", by: m[2], at: t - 20 * H, react: { useful: 6, insightful: 3 }, replies: [{ id: "x1", by: m[3], text: "Studio debates cost far less than field reporting. Worth finding numbers.", at: t - 18 * H }] },
        { id: "d2", sample: true, title: "Is India's education system preparing students for actual jobs?", body: "Placement numbers say one thing, my seniors say another.", why: "Final-year student, genuinely worried.", topic: "Education", by: m[0], at: t - 2 * D, react: { useful: 4, insightful: 1 }, replies: [] },
        { id: "d3", sample: true, title: "Why do we trust some news outlets more than others?", body: "Is it the outlet, or whether it agrees with us?", why: "Testing my own bias.", topic: "Media & Journalism", by: m[1], at: t - 3 * D, react: { useful: 8, insightful: 5 }, replies: [{ id: "x2", by: m[2], text: "Try reading the same story from three outlets blind.", at: t - 2 * D }] },
        { id: "d4", sample: true, title: "Is social media making political polarisation worse?", body: "Or does it just show us polarisation that was always there?", why: "Saw two opposite studies quoted.", topic: "Society & Human Rights", by: m[3], at: t - 4 * D, react: { useful: 2, insightful: 2 }, replies: [] }
      ],
      missing: [
        { id: "ms1", sample: true, headline: "Ward water-tanker contracts lapsed without notice " + S, place: "Sample city", what: "Residents say tanker visits stopped after contracts ended.", why: "Thousands rely on tankers in summer.", sources: "", next: "Find the contract notice and who decided not to renew.", by: m[3], at: t - 6 * D, status: "research", notes: [{ by: m[4], text: "Two residents' associations have posted about it.", at: t - 5 * D }] },
        { id: "ms2", sample: true, headline: "District hospital's dialysis unit closed for repairs for months " + S, place: "Sample district", what: "Patients travel 80 km for dialysis.", why: "Missed sessions are dangerous.", sources: "", next: "Confirm dates and the repair budget.", by: m[0], at: t - 3 * D, status: "editorial", notes: [] }
      ],
      events: [
        { id: "e1", title: "Weekly investigation: pick it, split it, source it", when: t + 3 * D, where: "Online", kind: "Research session", sample: true },
        { id: "e2", title: "Live debate: should a leak at two centres mean a full re-test?", when: t + 6 * D, where: "Online", kind: "Debate", sample: true },
        { id: "e3", title: "Campus meetup: how to read a court order", when: t + 12 * D, where: "Bengaluru (sample venue)", kind: "Workshop", sample: true }
      ]
    };
  }
  let C = store.get(KEY, null) || seed();
  const save = () => store.set(KEY, C);
  const me = () => C.me;
  const role = () => (C.me && C.me.role) || "member";
  const isTeam = () => role() !== "member";
  const hidden = id => C.hidden.includes(id);
  const inv = id => C.invs.find(x => x.id === id);
  const disc = id => C.discs.find(x => x.id === id);
  const contributors = i => [...new Set([i.by, ...i.sources.map(x => x.by), ...i.claims.flatMap(c => [c.by, ...c.responses.map(r => r.by)]), ...i.comments.flatMap(k => [k.by, ...k.replies.map(r => r.by)]), ...i.perspectives.map(p => p.by)])];
  const weight = i => i.sources.length * 3 + i.claims.reduce((n, c) => n + 2 + c.responses.length * 2, 0) + i.comments.reduce((n, k) => n + 1 + k.replies.length, 0);
  const dWeight = d => d.replies.length * 2 + (d.react.useful || 0) + (d.react.insightful || 0);
  const tag = k => `<span class="qc-label qc-${k}" title="${esc(LABEL[k][1])}">${LABEL[k][0]}</span>`;
  const who = n => `<button type="button" class="qc-who" data-act="member" data-id="${esc(n)}">@${esc(n)}</button>`;
  const sampleTag = x => x && x.sample ? `<span class="qc-sample">Illustrative sample</span>` : "";
  let tab = "home", sort = "foryou", sub = null, el = null, pendingAfterJoin = null;

  // every member action goes through here: join first, then do it
  const need = fn => { if (me()) return fn(); pendingAfterJoin = fn; onboarding(); };
  const log = (i, what) => { i.history.unshift({ at: now(), by: me().name, what }); };
  const follow = id => { const f = new Set(C.follows); f.has(id) ? f.delete(id) : f.add(id); C.follows = [...f]; save(); render(); toast(f.has(id) ? "Following. Updates show in Your activity." : "Unfollowed"); };

  /* ---------- page frame ---------- */
  const NAV = [["home", "Home"], ["investigations", "Investigations"], ["discussions", "Discussions"], ["missing", "Missing Stories"], ["members", "Members"], ["events", "Events"]];
  function frame(body) {
    return `<div class="wrap qc">
      <header class="qc-hero"><div><span class="eyebrow">The Red Thread · Community</span><h1>The Questioners’ Club</h1><p>Don’t take our word for it. Pull the thread. A place to question, investigate, discuss and publish, together.</p></div>
        <div class="qc-heroacts">${me() ? `<button type="button" class="qc-mechip" data-act="member" data-id="${esc(me().name)}">@${esc(me().name)}${isTeam() ? ` · ${role()}` : ""}</button>` : `<button class="btn" type="button" data-act="join">Join the club</button>`}<button class="btn y" type="button" data-act="create">+ Create</button></div></header>
      <p class="qc-proto">Prototype: your profile and contributions are saved in this browser only, and the people and posts already here are illustrative samples. Shared accounts come with the community backend.</p>
      <nav class="qc-nav" aria-label="Club">${NAV.map(([k, n]) => `<button type="button" data-tab="${k}" aria-current="${tab === k ? "page" : "false"}">${n}</button>`).join("")}${isTeam() ? `<button type="button" data-tab="mod" aria-current="${tab === "mod" ? "page" : "false"}">Moderation${C.reports.filter(r => r.status === "open").length ? ` <b class="qc-count">${C.reports.filter(r => r.status === "open").length}</b>` : ""}</button>` : ""}</nav>
      <div class="qc-body">${body}</div></div>`;
  }
  function render() {
    if (!el) return;
    const body = sub && sub.t === "inv" ? invRoom(inv(sub.id)) : sub && sub.t === "disc" ? discPage(disc(sub.id)) : sub && sub.t === "member" ? profile(sub.id)
      : tab === "investigations" ? invList() : tab === "discussions" ? discList() : tab === "missing" ? missingPage() : tab === "members" ? membersPage() : tab === "events" ? eventsPage() : tab === "mod" ? modPage() : home();
    el.innerHTML = frame(body);
    const hash = "#club-" + (sub ? sub.t + ":" + sub.id : tab);
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }

  /* ---------- cards ---------- */
  const invCard = i => `<article class="qc-card" data-act="inv" data-id="${i.id}"><span class="eyebrow">Investigation · ${esc(i.topic)}</span><h3>${esc(i.title)}</h3>
    <p>${esc(i.question)}</p><div class="qc-meta">${sampleTag(i)}<span>${contributors(i).length} contributor${contributors(i).length === 1 ? "" : "s"}</span><span>${i.sources.length} source${i.sources.length === 1 ? "" : "s"}</span><span>${i.claims.length} claim${i.claims.length === 1 ? "" : "s"}</span><span>started by @${esc(i.by)} · ${ago(i.at)}</span>${i.findings && i.findings.published ? `<span class="qc-pub">Findings published</span>` : ""}</div></article>`;
  const discCard = d => hidden(d.id) ? "" : `<article class="qc-card" data-act="disc" data-id="${d.id}"><span class="eyebrow">Discussion · ${esc(d.topic)}</span><h3>${esc(d.title)}</h3>${d.why ? `<p class="qc-why"><b>Why I’m asking:</b> ${esc(d.why)}</p>` : ""}
    <div class="qc-meta">${sampleTag(d)}<span>${d.replies.length} replies</span><span>${d.react.useful || 0} found it useful</span><span>@${esc(d.by)} · ${ago(d.at)}</span></div></article>`;

  /* ---------- Module A: home ---------- */
  function home() {
    const mine = me() ? me().interests : [];
    const all = [...C.invs.map(x => ({ k: "inv", x, t: x.history[0] ? x.history[0].at : x.at, w: weight(x) })), ...C.discs.filter(d => !hidden(d.id)).map(x => ({ k: "disc", x, t: x.replies.length ? Math.max(...x.replies.map(r => r.at)) : x.at, w: dWeight(x) }))];
    const list = sort === "latest" ? all.sort((a, b) => b.t - a.t) : sort === "popular" ? all.sort((a, b) => b.w - a.w) : all.sort((a, b) => (mine.includes(b.x.topic) - mine.includes(a.x.topic)) || b.t - a.t);
    const featured = [...C.invs].sort((a, b) => weight(b) - weight(a)).slice(0, 2);
    const act = activity();
    return `${me() ? "" : `<div class="qc-welcome"><b>Browse freely.</b> Join to ask, investigate, add sources and publish. It takes 20 seconds. <button class="btn sm y" type="button" data-act="join">Join</button></div>`}
      <section><h2 class="qc-h">Featured investigations</h2><div class="qc-grid2">${featured.map(invCard).join("")}</div></section>
      <section><div class="qc-feedhead"><h2 class="qc-h">Happening now</h2><div class="tabs">${[["foryou", "For you"], ["latest", "Latest"], ["popular", "Popular"]].map(([k, n]) => `<button type="button" data-sort="${k}" aria-pressed="${sort === k}">${n}</button>`).join("")}</div></div>
        <p class="muted qc-small">${sort === "popular" ? "Popular means meaningful contributions (sources, evidence, replies), not likes. Outrage doesn’t win here." : sort === "foryou" ? (mine.length ? "Your interests first, then everything else." : "Join and pick your interests to tailor this.") : "Everything, newest first."}</p>
        <div class="qc-list">${list.slice(0, 10).map(e => e.k === "inv" ? invCard(e.x) : discCard(e.x)).join("")}</div></section>
      ${me() ? `<section><h2 class="qc-h">Your activity</h2>${act.length ? `<ul class="qc-act">${act.map(a => `<li><span>${a.text}</span><span class="muted">${ago(a.at)}</span></li>`).join("")}</ul>` : `<p class="muted">Follow an investigation or start a discussion: replies and updates show here.</p>`}</section>` : ""}
      ${tryNext()}`;
  }
  function tryNext() {
    const open = [...C.invs].sort((a, b) => contributors(a).length - contributors(b).length)[0], q = C.discs.find(d => !d.replies.length) || C.discs[0];
    return `<section><h2 class="qc-h">Try one thing today</h2><div class="qc-grid3">
      <button type="button" class="qc-try" data-act="inv" data-id="${open.id}"><b>Join an investigation</b><span>${esc(open.title)}</span></button>
      <button type="button" class="qc-try" data-act="disc" data-id="${q.id}"><b>Answer a question</b><span>${esc(q.title)}</span></button>
      <button type="button" class="qc-try" data-act="create"><b>Ask your own</b><span>Start a discussion or an investigation in seconds.</span></button></div></section>`;
  }
  function activity() {
    if (!me()) return [];
    const out = [];
    C.invs.filter(i => C.follows.includes(i.id) || i.by === me().name).forEach(i => i.history.filter(h => h.by !== me().name).slice(0, 3).forEach(h => out.push({ at: h.at, text: `@${esc(h.by)} ${esc(h.what)} in <button type="button" class="linkish" data-act="inv" data-id="${i.id}">${esc(i.title.slice(0, 60))}</button>` })));
    C.discs.filter(d => d.by === me().name || C.follows.includes(d.id)).forEach(d => d.replies.filter(r => r.by !== me().name).forEach(r => out.push({ at: r.at, text: `@${esc(r.by)} replied in <button type="button" class="linkish" data-act="disc" data-id="${d.id}">${esc(d.title.slice(0, 60))}</button>` })));
    C.reports.filter(r => r.by === me().name && r.status === "actioned").forEach(r => out.push({ at: r.doneAt, text: `Your report was reviewed: ${esc(r.action)}` }));
    return out.sort((a, b) => b.at - a.at).slice(0, 8);
  }

  /* ---------- Module B: investigations ---------- */
  const invList = () => `<div class="qc-feedhead"><h2 class="qc-h">Investigations</h2><button class="btn sm y" type="button" data-act="new-inv">+ Start an investigation</button></div>
    <p class="muted qc-small">Collaborative research projects. Anyone can add sources, challenge claims and propose findings.</p><div class="qc-list">${[...C.invs].sort((a, b) => b.at - a.at).map(invCard).join("")}</div>`;
  const SECS = [["overview", "Overview"], ["research", "Research"], ["claims", "Claims"], ["perspectives", "Perspectives"], ["discussion", "Discussion"], ["questions", "Open questions"], ["findings", "Findings"], ["contributors", "Contributors"]];
  function invRoom(i) {
    if (!i) return `<p class="muted">This investigation isn’t here. <button class="linkish" type="button" data-tab="investigations">See all investigations</button></p>`;
    const sec = sub.sec || "overview", f = C.follows.includes(i.id), canEdit = me() && (me().name === i.by || isTeam() || (i.findings && i.findings.by === me().name));
    let body = "";
    if (sec === "overview") body = `<p class="qc-q">${esc(i.question)}</p><h4>Why it matters</h4><p>${esc(i.why || "—")}</p>${i.subqs.length ? `<h4>Sub-questions</h4><ul>${i.subqs.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : ""}
      ${i.story ? `<p><button class="btn sm" type="button" data-go="story" data-arg="${esc(i.story)}">Open the news story this came from</button> <button class="btn sm" type="button" data-go="board">Map it on my Research Board</button></p>` : ""}
      <h4>Activity history</h4><ul class="qc-hist">${i.history.slice(0, 12).map(h => `<li><b>@${esc(h.by)}</b> ${esc(h.what)} <span class="muted">· ${ago(h.at)}</span></li>`).join("")}</ul>`;
    else if (sec === "research") body = `<div class="qc-srcs">${i.sources.length ? i.sources.map(s => `<div class="qc-src"><div><b>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)}</b><span class="muted">${esc(s.publisher || "Unknown publisher")} · ${esc(s.date || "date unknown")} · ${esc(s.type)}</span><span class="muted">Added by @${esc(s.by)} · ${ago(s.at)} · ${s.ver === "verified" ? "checked by editors" : "not yet checked"}</span></div>${rep("src", i.id + "/" + s.id)}</div>`).join("") : `<p class="muted">No sources yet. Add the first one.</p>`}</div>
      <form class="qc-form" data-form="source"><h4>Add a source</h4><div class="qc-f2"><input name="title" required placeholder="Title of the report, article or document"><input name="url" type="url" placeholder="Link (https://…)"></div><div class="qc-f3"><input name="publisher" placeholder="Publisher or author"><input name="date" placeholder="Date published"><select name="type">${["News report", "Government report", "Research paper", "Court record", "Data set", "Analysis", "Social media (unverified)", "Other"].map(o => `<option>${o}</option>`).join("")}</select></div><button class="btn y sm" type="submit">Add source</button></form>`;
    else if (sec === "claims") body = `<p class="muted qc-small">Challenge specific claims, not people. Each claim carries its own evidence status.</p>${i.claims.map(c => claimBox(i, c)).join("") || `<p class="muted">No claims yet.</p>`}
      <form class="qc-form" data-form="claim"><h4>Add a claim to examine</h4><input name="text" required placeholder="One specific, checkable statement"><button class="btn y sm" type="submit">Add claim</button></form>`;
    else if (sec === "perspectives") body = `${i.perspectives.map(p => `<div class="qc-persp"><b>${esc(p.who)}</b><p>${esc(p.view)}</p><span class="muted">added by @${esc(p.by)}</span></div>`).join("") || `<p class="muted">No perspectives yet. Who sees this differently, and why?</p>`}
      <form class="qc-form" data-form="persp"><h4>Add a perspective</h4><div class="qc-f2"><input name="who" required placeholder="Whose view (a group, not a person to attack)"><input name="view" required placeholder="Their strongest argument, fairly put"></div><button class="btn y sm" type="submit">Add perspective</button></form>`;
    else if (sec === "discussion") body = thread(i.comments, "inv:" + i.id);
    else if (sec === "questions") body = `<ul class="qc-qs">${i.questions.map((q, k) => `<li class="${q.resolved ? "done" : ""}">${esc(q.text)} <span class="muted">· @${esc(q.by)}</span>${q.resolved ? " <b>answered</b>" : me() ? ` <button class="linkish" type="button" data-act="resolve" data-k="${k}">Mark answered</button>` : ""}</li>`).join("") || `<li class="muted">Nothing open yet.</li>`}</ul>
      <form class="qc-form" data-form="question"><input name="text" required placeholder="What remains unanswered?"><button class="btn y sm" type="submit">Add question</button></form>`;
    else if (sec === "findings") body = (i.findings ? `<div class="qc-find">${tag(i.findings.verified ? "verified" : "community")}<p>${esc(i.findings.text).replace(/\n/g, "<br>")}</p><span class="muted">Summary by @${esc(i.findings.by)} · ${ago(i.findings.at)}${i.findings.published ? " · published to Publications" : ""}</span>
        <div class="qc-row">${!i.findings.published && canEdit ? `<button class="btn y sm" type="button" data-act="publish-findings">Publish to Publications</button>` : ""}${isTeam() && role() === "editor" && !i.findings.verified ? `<button class="btn sm" type="button" data-act="verify-findings">Mark editorially verified</button>` : ""}</div></div>`
      : `<p class="muted">No findings yet. When the evidence is in, summarise what you found, what you didn’t, and what remains open.</p>`) + `
      ${canEdit || !i.findings ? `<form class="qc-form" data-form="findings"><h4>${i.findings ? "Revise the findings" : "Write the findings"}</h4><textarea name="text" required rows="5" placeholder="What the evidence shows, what it doesn’t, and what is still open. Cite sources by name.">${i.findings ? esc(i.findings.text) : ""}</textarea><button class="btn y sm" type="submit">Save findings</button></form>` : ""}`;
    else body = `<div class="qc-people">${contributors(i).map(n => `<div class="qc-person">${who(n)}<span class="muted">${n === i.by ? "started it" : "contributor"}</span></div>`).join("")}</div>`;
    return `<button class="linkish qc-back" type="button" data-tab="investigations">← All investigations</button>
      <header class="qc-roomhead"><span class="eyebrow">Investigation room · ${esc(i.topic)}</span><h2>${esc(i.title)}</h2>
        <div class="qc-meta">${sampleTag(i)}${tag("community")}<span>${contributors(i).length} contributor${contributors(i).length === 1 ? "" : "s"}</span><span>started by @${esc(i.by)} · ${ago(i.at)}</span></div>
        <div class="qc-row"><button class="btn sm ${f ? "" : "y"}" type="button" data-act="follow" data-id="${i.id}">${f ? "Following" : "Follow"}</button><button class="btn sm" type="button" data-act="share">Copy link</button><button class="btn sm" type="button" data-act="to-studio">+ Creator Studio</button>${rep("inv", i.id)}</div></header>
      <nav class="qc-secs">${SECS.map(([k, n]) => `<button type="button" data-sec="${k}" aria-current="${sec === k ? "true" : "false"}">${n}${k === "research" ? ` <small>${i.sources.length}</small>` : k === "claims" ? ` <small>${i.claims.length}</small>` : ""}</button>`).join("")}</nav>
      <div class="qc-sec">${body}</div>`;
  }
  function claimBox(i, c) {
    const n = k => c.responses.filter(r => r.kind === k).length;
    return `<div class="qc-claim"><div class="qc-claimhead"><span class="eyebrow">Claim under review</span>${tag(c.status)}</div><p class="qc-claimtext">${esc(c.text)}</p>
      <div class="qc-tally"><span>${n("supports")} supporting</span><span>${n("challenges")} challenging</span><span>${n("context")} context</span><span>${n("wording")} wording</span></div>
      ${c.responses.map(r => { const s = r.src && i.sources.find(x => x.id === r.src); return `<div class="qc-resp qc-${r.kind}"><b>${RESP[r.kind]}</b><p>${esc(r.text)}</p><span class="muted">${s ? "Source: " + esc(s.title) + " · " : ""}@${esc(r.by)} · ${ago(r.at)}</span></div>`; }).join("")}
      <form class="qc-form qc-respform" data-form="resp" data-claim="${c.id}"><div class="qc-f3"><select name="kind">${Object.entries(RESP).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select><select name="src"><option value="">No source</option>${i.sources.map(s => `<option value="${s.id}">${esc(s.title.slice(0, 50))}</option>`).join("")}</select><input name="text" required placeholder="Your evidence or point"></div><button class="btn sm" type="submit">Respond to this claim</button>${isTeam() ? ` <select class="qc-setstatus" data-claim="${c.id}" aria-label="Set claim status">${Object.keys(LABEL).filter(k => k !== "community" && (k !== "verified" || role() === "editor")).map(k => `<option value="${k}" ${c.status === k ? "selected" : ""}>${LABEL[k][0]}</option>`).join("")}</select>` : ""}</form></div>`;
  }

  /* ---------- threaded comments (investigations + discussions) ---------- */
  function thread(list, ctx) {
    return `<div class="qc-thread">${list.map(k => hidden(k.id) ? `<div class="qc-hiddenmsg">A reply is hidden pending moderator review.</div>` : `<div class="qc-cmt"><div class="qc-cmthead">${who(k.by)}<span class="muted">${ago(k.at)}</span>${rep("cmt", ctx + "/" + k.id)}</div><p>${esc(k.text)}</p>${C.notes[k.id] ? `<p class="qc-note"><b>Moderator context:</b> ${esc(C.notes[k.id])}</p>` : ""}
        ${(k.replies || []).map(r => hidden(r.id) ? "" : `<div class="qc-cmt qc-reply"><div class="qc-cmthead">${who(r.by)}<span class="muted">${ago(r.at)}</span></div><p>${esc(r.text)}</p></div>`).join("")}
        <form class="qc-form qc-replyform" data-form="reply" data-ctx="${ctx}" data-parent="${k.id}"><input name="text" required placeholder="Reply…"><button class="btn sm" type="submit">Reply</button></form></div>`).join("") || `<p class="muted">No comments yet.</p>`}
      <form class="qc-form" data-form="comment" data-ctx="${ctx}"><textarea name="text" required rows="2" placeholder="Add a comment, question or challenge. Use @name to mention someone."></textarea><button class="btn y sm" type="submit">Comment</button></form></div>`;
  }

  /* ---------- Module C: discussions ---------- */
  const discList = () => `<div class="qc-feedhead"><h2 class="qc-h">Discussions</h2><button class="btn sm y" type="button" data-act="new-disc">+ Start a discussion</button></div>
    <p class="muted qc-small">Open questions that don’t need a full investigation. Say why you’re asking.</p><div class="qc-list">${[...C.discs].sort((a, b) => b.at - a.at).map(discCard).join("")}</div>`;
  function discPage(d) {
    if (!d || hidden(d.id)) return `<p class="muted">This discussion is unavailable${d ? " while a moderator reviews it" : ""}. <button class="linkish" type="button" data-tab="discussions">All discussions</button></p>`;
    const f = C.follows.includes(d.id), sv = C.saved.includes(d.id);
    return `<button class="linkish qc-back" type="button" data-tab="discussions">← All discussions</button>
      <header class="qc-roomhead"><span class="eyebrow">Discussion · ${esc(d.topic)}</span><h2>${esc(d.title)}</h2><div class="qc-meta">${sampleTag(d)}${tag("community")}<span>${who(d.by)} · ${ago(d.at)}</span></div></header>
      ${d.why ? `<p class="qc-why"><b>Why I’m asking:</b> ${esc(d.why)}</p>` : ""}<p class="qc-bodytext">${esc(d.body || "")}</p>${d.link ? `<p><a href="${esc(d.link)}" target="_blank" rel="noopener noreferrer">${esc(d.link)}</a></p>` : ""}
      ${C.notes[d.id] ? `<p class="qc-note"><b>Moderator context:</b> ${esc(C.notes[d.id])}</p>` : ""}
      <div class="qc-row"><button class="btn sm" type="button" data-act="react" data-k="useful">Useful · ${d.react.useful || 0}</button><button class="btn sm" type="button" data-act="react" data-k="insightful">Insightful · ${d.react.insightful || 0}</button><button class="btn sm" type="button" data-act="follow" data-id="${d.id}">${f ? "Following" : "Follow"}</button><button class="btn sm" type="button" data-act="save" data-id="${d.id}">${sv ? "Saved" : "Save"}</button><button class="btn sm" type="button" data-act="share">Copy link</button><button class="btn sm" type="button" data-act="disc-to-inv">Turn into an investigation</button>${rep("disc", d.id)}</div>
      <h4>Replies</h4>${thread(d.replies.map(r => ({ ...r, replies: r.replies || [] })), "disc:" + d.id)}`;
  }

  /* ---------- Module D: missing stories ---------- */
  function missingPage() {
    return `<div class="qc-feedhead"><h2 class="qc-h">Missing Stories</h2><button class="btn sm y" type="button" data-act="new-missing">+ Submit a missing story</button></div>
      <p class="muted qc-small">Stories you think deserve attention. The community adds what it finds; our editors decide what becomes a Red Thread story. Not being picked never means a story is false.</p>
      <div class="qc-pipe">${PIPE.map(([k, n]) => `<span>${n} <b>${C.missing.filter(m => m.status === k).length}</b></span>`).join("<i>→</i>")}</div>
      <div class="qc-list">${C.missing.filter(m => !hidden(m.id)).sort((a, b) => b.at - a.at).map(m => `<article class="qc-card qc-ms"><span class="eyebrow">${esc(m.place)} · ${PIPE.find(p => p[0] === m.status)[1]}</span><h3>${esc(m.headline)}</h3>
        <p><b>What happened:</b> ${esc(m.what)}</p><p><b>Why it matters:</b> ${esc(m.why)}</p>${m.next ? `<p><b>Needs investigating:</b> ${esc(m.next)}</p>` : ""}${m.sources ? `<p class="muted">Sources: ${esc(m.sources)}</p>` : ""}
        ${m.notes.map(n => `<p class="qc-msnote">@${esc(n.by)}: ${esc(n.text)} <span class="muted">· ${ago(n.at)}</span></p>`).join("")}
        <div class="qc-meta">${sampleTag(m)}${tag(m.status === "editorial" ? "review" : "community")}<span>submitted by @${esc(m.by)} · ${ago(m.at)}</span></div>
        <form class="qc-form qc-replyform" data-form="msnote" data-id="${m.id}"><input name="text" required placeholder="Add what you know or found"><button class="btn sm" type="submit">Add</button></form>
        <div class="qc-row">${isTeam() && role() === "editor" ? `<select class="qc-msstatus" data-id="${m.id}" aria-label="Editorial status">${PIPE.map(([k, n]) => `<option value="${k}" ${m.status === k ? "selected" : ""}>${n}</option>`).join("")}</select>` : ""}<button class="btn sm" type="button" data-act="ms-to-inv" data-id="${m.id}">Start an investigation on it</button>${rep("ms", m.id)}</div></article>`).join("")}</div>`;
  }

  /* ---------- Module E: members ---------- */
  const allMembers = () => [...(me() ? [{ ...me(), self: true }] : []), ...C.members];
  const membersPage = () => `<h2 class="qc-h">Members</h2><p class="muted qc-small">Profiles show research activity, not political affiliation. No leaderboard: quality over quantity.</p>
    <div class="qc-grid3">${allMembers().map(m => `<button type="button" class="qc-mcard" data-act="member" data-id="${esc(m.name)}"><b>@${esc(m.name)}</b><span>${esc(m.bio || "")}</span><span class="muted">${(m.interests || []).slice(0, 2).map(esc).join(" · ")}</span>${m.sample ? `<span class="qc-sample">Sample member</span>` : m.self ? `<span class="qc-pub">You</span>` : ""}</button>`).join("")}</div>`;
  function profile(name) {
    const m = allMembers().find(x => x.name === name); if (!m) return `<p class="muted">Member not found.</p>`;
    const started = C.invs.filter(i => i.by === name), joined = C.invs.filter(i => i.by !== name && contributors(i).includes(name)), ds = C.discs.filter(d => d.by === name), pubs = C.invs.filter(i => i.findings && i.findings.published && i.findings.by === name);
    const useful = C.invs.reduce((n, i) => n + i.sources.filter(s => s.by === name).length + i.claims.reduce((k, c) => k + c.responses.filter(r => r.by === name).length, 0), 0);
    const badges = [useful >= 1 && "First evidence", useful >= 5 && "Source hunter", started.length >= 1 && "Investigation starter", joined.length >= 2 && "Collaborator", pubs.length >= 1 && "Published researcher"].filter(Boolean);
    return `<button class="linkish qc-back" type="button" data-tab="members">← Members</button>
      <header class="qc-roomhead"><span class="eyebrow">${m.sample ? "Sample member" : "Member"}</span><h2>@${esc(m.name)}</h2><p>${esc(m.bio || "")}</p><div class="qc-meta">${(m.interests || []).map(t => `<span>${esc(t)}</span>`).join("")}</div>
        <div class="qc-row">${m.self ? `<button class="btn sm" type="button" data-act="join">Edit profile</button>` : `<button class="btn sm" type="button" data-act="follow" data-id="@${esc(m.name)}">${C.follows.includes("@" + m.name) ? "Following" : "Follow"}</button>${rep("user", m.name)}`}</div></header>
      ${badges.length ? `<div class="qc-badges">${badges.map(b => `<span>${b}</span>`).join("")}</div>` : ""}
      <div class="qc-stats"><div><b>${started.length}</b><span>investigations started</span></div><div><b>${joined.length}</b><span>contributed to</span></div><div><b>${useful}</b><span>sources and evidence</span></div><div><b>${pubs.length}</b><span>published findings</span></div></div>
      ${started.length + joined.length ? `<h4>Investigations</h4><div class="qc-list">${[...started, ...joined].map(invCard).join("")}</div>` : ""}${ds.length ? `<h4>Discussions</h4><div class="qc-list">${ds.map(discCard).join("")}</div>` : ""}`;
  }

  /* ---------- Module F: events ---------- */
  const eventsPage = () => `<h2 class="qc-h">Events</h2><p class="muted qc-small">Research sessions, debates and meetups. Sign-up links are added as each event is confirmed.</p>
    <div class="qc-list">${C.events.sort((a, b) => a.when - b.when).map(e => `<article class="qc-card qc-event"><div class="qc-date"><b>${new Date(e.when).getDate()}</b><span>${new Date(e.when).toLocaleDateString("en-IN", { month: "short" })}</span></div><div><span class="eyebrow">${esc(e.kind)} · ${esc(e.where)}</span><h3>${esc(e.title)}</h3><div class="qc-meta">${sampleTag(e)}<span>${new Date(e.when).toLocaleDateString("en-IN", { weekday: "long" })}</span></div>
      <button class="btn sm" type="button" data-act="rsvp" data-id="${e.id}">${(C.rsvp || []).includes(e.id) ? "✓ You’re interested" : "I’m interested"}</button></div></article>`).join("")}</div>`;

  /* ---------- reporting + moderation ---------- */
  const rep = (kind, id) => `<button type="button" class="qc-report" data-act="report" data-kind="${kind}" data-id="${esc(id)}" title="Report this">Report</button>`;
  function report(kind, id) {
    const ov = modal(`<h2>Report this ${{ inv: "investigation", disc: "discussion", cmt: "comment", src: "source", ms: "story", user: "member" }[kind] || "item"}</h2>
      <form data-form="report"><div class="field"><label for="qcRR">What’s wrong?</label><select id="qcRR" name="reason">${["False or misleading as presented", "Harassment or hate", "Spam or duplicate", "Personal information", "Illegal content", "Something else"].map(o => `<option>${o}</option>`).join("")}</select></div>
      <div class="field"><label for="qcRD">Details (optional)</label><textarea id="qcRD" name="detail" rows="3"></textarea></div><p class="muted qc-small">A moderator reviews every report. If action is taken, the author is told why and can appeal. Serious legal issues go to our Grievance Officer.</p><button class="btn y" type="submit">Send report</button></form>`);
    ov.querySelector("form").onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); C.reports.unshift({ id: uid("rp"), kind, target: id, reason: f.get("reason"), detail: f.get("detail"), by: me() ? me().name : "guest", at: now(), status: "open" }); save(); close(ov); toast("Report sent. A moderator will review it."); render(); };
  }
  const targetText = r => { const [a, b] = String(r.target).split("/"); if (r.kind === "inv") return (inv(a) || {}).title; if (r.kind === "disc") return (disc(a) || {}).title; if (r.kind === "ms") return (C.missing.find(m => m.id === a) || {}).headline; if (r.kind === "user") return "@" + a; if (r.kind === "src") { const i = inv(a); return i && (i.sources.find(s => s.id === b) || {}).title; } if (r.kind === "cmt") { const [t, x] = a.split(":"), list = t === "inv" ? (inv(x) || {}).comments : (disc(x) || {}).replies; return ((list || []).find(k => k.id === b) || {}).text; } return r.target; };
  const hideId = r => { const [a, b] = String(r.target).split("/"); return b || a; };
  function modPage() {
    const open = C.reports.filter(r => r.status === "open"), done = C.reports.filter(r => r.status !== "open");
    return `<h2 class="qc-h">Moderation queue</h2><p class="muted qc-small">Visible to moderators and editors. Never rewrite a member’s words: hide, remove or add a visible context note, and every action is logged.</p>
      ${open.length ? open.map(r => `<div class="qc-rep"><div><span class="eyebrow">${esc(r.kind)} · reported by @${esc(r.by)} · ${ago(r.at)}</span><b>${esc(r.reason)}</b><p>“${esc((targetText(r) || "(item removed)").slice(0, 200))}”</p>${r.detail ? `<p class="muted">${esc(r.detail)}</p>` : ""}</div>
        <div class="qc-row"><button class="btn sm" type="button" data-mod="none" data-id="${r.id}">No action</button><button class="btn sm" type="button" data-mod="note" data-id="${r.id}">Add context note</button><button class="btn sm" type="button" data-mod="hide" data-id="${r.id}">Hide pending review</button><button class="btn sm r" type="button" data-mod="remove" data-id="${r.id}">Remove</button></div></div>`).join("") : `<p class="muted">No open reports.</p>`}
      <h4>Audit log</h4><ul class="qc-hist">${C.audit.slice(0, 30).map(a => `<li><b>@${esc(a.by)}</b> ${esc(a.what)} <span class="muted">· ${ago(a.at)}</span></li>`).join("") || `<li class="muted">Nothing yet.</li>`}</ul>`;
  }
  function moderate(action, id) {
    const r = C.reports.find(x => x.id === id); if (!r) return;
    let note = "";
    if (action === "note") { note = prompt("Context note shown under the content:"); if (!note) return; C.notes[hideId(r)] = note; }
    if (action === "hide" || action === "remove") C.hidden.push(hideId(r));
    r.status = "actioned"; r.doneAt = now(); r.action = { none: "no action needed", note: "a context note was added", hide: "hidden pending review", remove: "removed" }[action];
    C.audit.unshift({ at: now(), by: me().name, what: `${r.action} · ${r.kind} report (“${r.reason}”)${note ? ": " + note : ""}` }); save(); render(); toast("Done. Logged in the audit log.");
  }

  /* ---------- modals: onboarding + create ---------- */
  function modal(html) { const ov = document.createElement("div"); ov.className = "qc-modal"; ov.setAttribute("role", "dialog"); ov.innerHTML = `<div class="qc-modalin"><button type="button" class="qc-x" aria-label="Close">×</button>${html}</div>`; document.body.append(ov); ov.querySelector(".qc-x").onclick = () => close(ov); ov.addEventListener("click", e => { if (e.target === ov) close(ov); }); return ov; }
  const close = ov => ov.remove();
  function onboarding() {
    const m = me() || { name: "", bio: "", interests: [] };
    const ov = modal(`<form data-form="join"><span class="eyebrow">${me() ? "Your profile" : "Join The Questioners’ Club"}</span><h2>${me() ? "Edit your profile" : "What makes you curious?"}</h2>
      <div class="field"><label for="qcN">Username</label><input id="qcN" name="name" required pattern="[A-Za-z0-9._]{3,20}" title="3–20 letters, numbers, dots or underscores" value="${esc(m.name)}" ${me() ? "readonly" : ""} placeholder="e.g. curious_kiran"></div>
      <div class="field"><label for="qcB">Short bio (optional)</label><input id="qcB" name="bio" maxlength="120" value="${esc(m.bio)}" placeholder="What do you like digging into?"></div>
      <label class="cs-lab">Choose the subjects you enjoy exploring. You can change these any time.</label>
      <div class="qc-topics">${TOPICS.map(t => `<label><input type="checkbox" name="interests" value="${esc(t)}" ${m.interests.includes(t) ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}</div>
      <label class="chk"><input type="checkbox" name="adult" required ${me() ? "checked" : ""}> I’m 18 or older and agree to the community rules: challenge claims, not people.</label>
      ${me() ? `<div class="field"><label for="qcRole">Prototype role (to try the team tools)</label><select id="qcRole" name="role">${ROLES.map(r => `<option value="${r}" ${role() === r ? "selected" : ""}>${r[0].toUpperCase() + r.slice(1)}</option>`).join("")}</select></div>` : ""}
      <p class="muted qc-small"><span data-cnt>${m.interests.length}</span> interests selected · Saved in this browser (prototype).</p><button class="btn y" type="submit">${me() ? "Save" : "Continue"}</button></form>`);
    const f = ov.querySelector("form");
    f.addEventListener("change", () => { ov.querySelector("[data-cnt]").textContent = f.querySelectorAll("[name=interests]:checked").length; });
    f.onsubmit = e => {
      e.preventDefault(); const d = new FormData(f), name = String(d.get("name")).trim();
      if (!me() && allMembers().some(x => x.name.toLowerCase() === name.toLowerCase())) { toast("That username is taken. Try another."); return; }
      const wasNew = !me();
      C.me = { name, bio: String(d.get("bio") || "").trim(), interests: d.getAll("interests"), role: d.get("role") || role(), joined: me() ? me().joined : now() };
      save(); close(ov);
      if (wasNew) { toast(`Welcome, @${name}. Make your first contribution below.`); sort = "foryou"; tab = "home"; sub = null; }
      render();
      if (pendingAfterJoin) { const fn = pendingAfterJoin; pendingAfterJoin = null; fn(); }
    };
  }
  function createMenu() {
    const ov = modal(`<span class="eyebrow">Create</span><h2>What do you want to start?</h2><div class="qc-createlist">
      ${[["new-inv", "Start an investigation", "A question worth digging into, with others."], ["new-disc", "Ask a question / start a discussion", "Quick, open, no research needed yet."], ["new-missing", "Submit a missing story", "Something the news isn’t covering."], ["publish", "Publish an article", "Write it up in Publications."]].map(([a, t, s]) => `<button type="button" data-act="${a}"><b>${t}</b><span>${s}</span></button>`).join("")}</div>`);
    ov.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (b) { close(ov); act(b.dataset.act, b); } });
  }
  function newInv(seedFrom) {
    need(() => {
      const s = seedFrom || {};
      const ov = modal(`<form data-form="inv"><span class="eyebrow">New investigation</span><h2>${s.title ? "Investigate this with others" : "Start an investigation"}</h2>
        <div class="field"><label for="qiT">Title</label><input id="qiT" name="title" required maxlength="140" value="${esc(s.title || "")}"></div>
        <div class="field"><label for="qiQ">The central question</label><input id="qiQ" name="question" required maxlength="200" value="${esc(s.question || "")}" placeholder="What exactly are you trying to find out?"></div>
        <div class="field"><label for="qiW">Why it matters</label><textarea id="qiW" name="why" rows="2">${esc(s.why || "")}</textarea></div>
        <div class="field"><label for="qiS">Sub-questions (one per line)</label><textarea id="qiS" name="subqs" rows="3"></textarea></div>
        <div class="field"><label for="qiP">Topic</label><select id="qiP" name="topic">${TOPICS.map(t => `<option ${t === (s.topic || (me().interests[0])) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
        ${s.sources && s.sources.length ? `<p class="muted qc-small">${s.sources.length} sources from the story will be attached.</p>` : ""}<button class="btn y" type="submit">Create investigation</button></form>`);
      ov.querySelector("form").onsubmit = e => {
        e.preventDefault(); const d = new FormData(e.target);
        const i = { id: uid("i"), title: d.get("title").trim(), question: d.get("question").trim(), why: d.get("why").trim(), subqs: String(d.get("subqs")).split("\n").map(x => x.trim()).filter(Boolean), topic: d.get("topic"), by: me().name, at: now(), story: s.story || "", sources: (s.sources || []).map(x => ({ id: uid("s"), ...x, by: me().name, at: now(), ver: "unverified" })), claims: [], perspectives: [], comments: [], questions: [], findings: null, history: [] };
        log(i, s.story ? "started the investigation from a news story" : "started the investigation");
        C.invs.unshift(i); C.follows.push(i.id); save(); close(ov); sub = { t: "inv", id: i.id, sec: "overview" }; render(); window.scrollTo({ top: 0 });
        toast("Investigation created. Copy its link to invite others.");
      };
    });
  }
  function newDisc() {
    need(() => {
      const ov = modal(`<form data-form="disc"><span class="eyebrow">New discussion</span><h2>Ask the club</h2>
        <div class="field"><label for="qdT">Your question</label><input id="qdT" name="title" required maxlength="160"></div>
        <div class="field"><label for="qdW">Why am I asking this?</label><input id="qdW" name="why" required maxlength="200" placeholder="A line of context helps people give useful answers"></div>
        <div class="field"><label for="qdB">More detail (optional)</label><textarea id="qdB" name="body" rows="3"></textarea></div>
        <div class="field"><label for="qdL">Link (optional)</label><input id="qdL" name="link" type="url" placeholder="https://…"></div>
        <div class="field"><label for="qdP">Topic</label><select id="qdP" name="topic">${TOPICS.map(t => `<option ${t === me().interests[0] ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div><button class="btn y" type="submit">Post</button></form>`);
      ov.querySelector("form").onsubmit = e => { e.preventDefault(); const d = new FormData(e.target); const x = { id: uid("d"), title: d.get("title").trim(), why: d.get("why").trim(), body: d.get("body").trim(), link: d.get("link").trim(), topic: d.get("topic"), by: me().name, at: now(), react: {}, replies: [] }; C.discs.unshift(x); C.follows.push(x.id); save(); close(ov); sub = { t: "disc", id: x.id }; render(); toast("Posted."); };
    });
  }
  function newMissing() {
    need(() => {
      const ov = modal(`<form data-form="ms"><span class="eyebrow">Missing story</span><h2>What isn’t the news covering?</h2>
        <div class="qc-f2"><div class="field"><label for="qmH">Headline</label><input id="qmH" name="headline" required maxlength="140"></div><div class="field"><label for="qmP">Location</label><input id="qmP" name="place" required maxlength="80"></div></div>
        <div class="field"><label for="qmW">What happened?</label><textarea id="qmW" name="what" required rows="2"></textarea></div>
        <div class="field"><label for="qmY">Why does it matter?</label><textarea id="qmY" name="why" required rows="2"></textarea></div>
        <div class="field"><label for="qmS">Supporting sources (links or descriptions)</label><textarea id="qmS" name="sources" rows="2"></textarea></div>
        <div class="field"><label for="qmN">What needs further investigation?</label><input id="qmN" name="next"></div>
        <p class="muted qc-small">Don’t post private people’s personal details. Submissions go to Community research, then Editorial review.</p><button class="btn y" type="submit">Submit</button></form>`);
      ov.querySelector("form").onsubmit = e => { e.preventDefault(); const d = new FormData(e.target); C.missing.unshift({ id: uid("m"), ...Object.fromEntries(["headline", "place", "what", "why", "sources", "next"].map(k => [k, String(d.get(k) || "").trim()])), by: me().name, at: now(), status: "submitted", notes: [] }); save(); close(ov); tab = "missing"; sub = null; render(); toast("Submitted. The community can now add to it."); };
    });
  }

  /* ---------- actions ---------- */
  function act(a, b) {
    const id = b && b.dataset.id;
    if (a === "join") return onboarding();
    if (a === "create") return need(createMenu);
    if (a === "inv") { sub = { t: "inv", id, sec: "overview" }; render(); return window.scrollTo({ top: 0 }); }
    if (a === "disc") { sub = { t: "disc", id }; render(); return window.scrollTo({ top: 0 }); }
    if (a === "member") { sub = { t: "member", id }; render(); return window.scrollTo({ top: 0 }); }
    if (a === "new-inv") return newInv();
    if (a === "new-disc") return newDisc();
    if (a === "new-missing") return newMissing();
    if (a === "publish") return RS.show("write");
    if (a === "report") return report(b.dataset.kind, id);
    if (a === "share") { const u = location.href; return navigator.clipboard.writeText(u).then(() => toast("Link copied"), () => toast(u)); }
    if (a === "follow") return need(() => follow(id));
    if (a === "save") return need(() => { const s = new Set(C.saved); s.has(id) ? s.delete(id) : s.add(id); C.saved = [...s]; save(); render(); });
    if (a === "rsvp") return need(() => { const s = new Set(C.rsvp || []); s.has(id) ? s.delete(id) : s.add(id); C.rsvp = [...s]; save(); render(); });
    if (a === "react") return need(() => { const d = disc(sub.id), k = b.dataset.k, mk = "r:" + d.id + ":" + k; if ((C.myReacts || []).includes(mk)) return toast("You already marked this"); d.react[k] = (d.react[k] || 0) + 1; C.myReacts = [...(C.myReacts || []), mk]; save(); render(); });
    if (a === "resolve") return need(() => { const i = inv(sub.id); i.questions[+b.dataset.k].resolved = true; log(i, "marked a question answered"); save(); render(); });
    if (a === "disc-to-inv") { const d = disc(sub.id); return newInv({ title: d.title, question: d.title, why: d.why, topic: d.topic }); }
    if (a === "ms-to-inv") { const m = C.missing.find(x => x.id === id); return newInv({ title: m.headline, question: "What happened, and why hasn’t it been covered?", why: m.why, topic: "Society & Human Rights" }); }
    if (a === "to-studio") { const i = inv(sub.id); return RS.studioAdd ? RS.studioAdd([{ line: i.question, note: i.why }, ...i.claims.map(c => ({ line: c.text, note: LABEL[c.status][0] + ": " + c.responses.map(r => RESP[r.kind] + " – " + r.text).join(" ") }))], "investigation") : null; }
    if (a === "publish-findings") return need(() => publishFindings(inv(sub.id)));
    if (a === "verify-findings") { const i = inv(sub.id); i.findings.verified = true; log(i, "findings marked editorially verified"); C.audit.unshift({ at: now(), by: me().name, what: "verified findings · " + i.title }); save(); return render(); }
  }
  async function publishFindings(i) {
    const body = `<p><b>Question:</b> ${esc(i.question)}</p><p>${esc(i.findings.text).replace(/\n/g, "<br>")}</p>${i.sources.length ? `<p><b>Sources examined:</b> ${i.sources.map(s => s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)).join("; ")}</p>` : ""}<p class="muted">Community research from The Questioners’ Club, by ${contributors(i).map(n => "@" + esc(n)).join(", ")}. Community contribution: not independently verified by The Red Thread.</p>`;
    const p = { id: "u" + Date.now().toString(36), pub: "mine", title: "What we found: " + i.title, dek: i.question, date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), format: "Community research", srcCount: i.sources.length, sources: [], body, storyId: i.story || "" };
    store.set("posts", [p, ...store.get("posts", [])]); store.set("published", true);
    if (RS.publishShared) await RS.publishShared(p);
    i.findings.published = true; log(i, "published the findings"); save(); render(); toast("Published to Publications as community research.", "View", () => RS.show("post", p.id));
  }
  function submit(form) {
    const d = new FormData(form), k = form.dataset.form, i = sub && sub.t === "inv" ? inv(sub.id) : null, txt = String(d.get("text") || "").trim();
    if (k === "source") { i.sources.push({ id: uid("s"), title: d.get("title").trim(), url: d.get("url").trim(), publisher: d.get("publisher").trim(), date: d.get("date").trim(), type: d.get("type"), by: me().name, at: now(), ver: "unverified" }); log(i, "added a source"); }
    else if (k === "claim") { i.claims.push({ id: uid("c"), text: txt, status: "review", by: me().name, at: now(), responses: [] }); log(i, "added a claim to examine"); }
    else if (k === "resp") { const c = i.claims.find(x => x.id === form.dataset.claim); c.responses.push({ id: uid("r"), kind: d.get("kind"), text: txt, src: d.get("src"), by: me().name, at: now() }); if (d.get("kind") === "challenges" && c.status === "review" && c.responses.filter(r => r.kind === "challenges").length >= 2) c.status = "disputed"; log(i, RESP[d.get("kind")].toLowerCase() + " on a claim"); }
    else if (k === "persp") { i.perspectives.push({ who: d.get("who").trim(), view: d.get("view").trim(), by: me().name }); log(i, "added a perspective"); }
    else if (k === "question") { i.questions.push({ text: txt, by: me().name }); log(i, "added an open question"); }
    else if (k === "findings") { i.findings = { text: txt, by: me().name, at: now(), published: false, verified: false }; log(i, "wrote the findings"); }
    else if (k === "msnote") { const m = C.missing.find(x => x.id === form.dataset.id); m.notes.push({ by: me().name, text: txt, at: now() }); if (m.status === "submitted") m.status = "research"; }
    else if (k === "comment" || k === "reply") {
      const [t, x] = form.dataset.ctx.split(":"), list = t === "inv" ? inv(x).comments : disc(x).replies, item = { id: uid("k"), by: me().name, text: txt, at: now(), replies: [] };
      if (k === "reply") { const par = list.find(y => y.id === form.dataset.parent); (par.replies = par.replies || []).push(item); } else list.push(item);
      if (t === "inv") log(inv(x), "commented in the discussion");
      const mentions = [...txt.matchAll(/@([A-Za-z0-9._]{3,20})/g)].map(m => m[1]).filter(n => allMembers().some(mm => mm.name === n));
      if (mentions.length) toast("Mentioned " + mentions.map(n => "@" + n).join(", "));
    }
    save(); render();
  }

  /* ---------- view ---------- */
  RS.V.club = {
    mount(root) {
      el = root;
      root.addEventListener("click", e => {
        const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; sub = null; render(); return; }
        const s = e.target.closest("[data-sec]"); if (s) { sub.sec = s.dataset.sec; render(); return; }
        const so = e.target.closest("[data-sort]"); if (so) { sort = so.dataset.sort; render(); return; }
        const m = e.target.closest("[data-mod]"); if (m) { moderate(m.dataset.mod, m.dataset.id); return; }
        const a = e.target.closest("[data-act]"); if (a && !a.closest("form")) { e.preventDefault(); act(a.dataset.act, a); }
      });
      root.addEventListener("submit", e => { const f = e.target.closest("form[data-form]"); if (!f) return; e.preventDefault(); need(() => submit(f)); });
      root.addEventListener("change", e => {
        const c = e.target.closest(".qc-setstatus"); if (c) { const i = inv(sub.id), cl = i.claims.find(x => x.id === c.dataset.claim); cl.status = c.value; log(i, `set a claim to “${LABEL[c.value][0]}”`); C.audit.unshift({ at: now(), by: me().name, what: `claim status → ${LABEL[c.value][0]} · ${cl.text.slice(0, 60)}` }); save(); render(); return; }
        const ms = e.target.closest(".qc-msstatus"); if (ms) { const x = C.missing.find(y => y.id === ms.dataset.id); x.status = ms.value; C.audit.unshift({ at: now(), by: me().name, what: `missing story → ${PIPE.find(p => p[0] === ms.value)[1]} · ${x.headline.slice(0, 60)}` }); save(); render(); }
      });
    },
    // arg: "inv:<id>", "disc:<id>", "member:<name>", a tab name, or "new:<storyId>" to start an investigation from a news story
    show(arg, root) {
      el = root || el; C = store.get(KEY, null) || C;
      const [k, id] = String(arg || "").split(/:(.+)/);
      if (k === "new" && id) {
        const s = RS.story(id); sub = null; tab = "investigations"; render();
        if (s) newInv({ title: s.title, question: `What really happened in “${s.title}”, and what is each side leaving out?`, why: (s.sum || [])[0] || "", story: s.id, sources: (s.articles || []).filter((a, n, arr) => arr.findIndex(b => b.outlet === a.outlet) === n).slice(0, 8).map(a => ({ title: a.title, url: a.link, publisher: ((window.LIVE_OUTLETS || {})[a.outlet] || {}).name || a.outlet, date: "", type: "News report" })) });
        return;
      }
      if (["inv", "disc", "member"].includes(k) && id) sub = { t: k, id, sec: "overview" };
      else if (NAV.some(n => n[0] === k) || k === "mod") { tab = k; sub = null; }
      render();
    }
  };
})();
