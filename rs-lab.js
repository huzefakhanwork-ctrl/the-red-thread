/* THE RED THREAD — Investigate: dossier + mind map + editable timeline + my notes + Dhaga + "Write my article". */
(function () {
  const { $, $$, esc, store, st, cite, cites, md, toast, sig, show, AI } = RS;
  const C = CASE;
  let SID = "genz", TAB = "dossier";

  /* ================= NOTES ================= */
  const NOTE_KINDS = { fact: ["Fact I found", "#2FD3A6"], opinion: ["My opinion", "#FF4D6D"], question: ["Question", "#B69CFF"], quote: ["Quote", "#F5E500"], event: ["Timeline event", "#7B93FF"] };
  const notes = id => store.get("notes:" + id, []);
  const setNotes = (id, n) => { store.set("notes:" + id, n); if (n.length >= 5) sig("board"); };
  RS.addNote = (id, n) => { const all = notes(id); all.push({ id: "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind: n.kind || "fact", text: n.text, src: n.src || [], date: n.date || "", where: n.where || "", at: Date.now() }); setNotes(id, all); if (!$("#v-investigate")?.hidden && SID === id) renderTab(); };

  /* ================= MIND MAP (featured case) ================= */
  const TYPES = { event: ["#7C93F7", "Event"], person: ["#6FD0DC", "Person / institution"], claim: ["#F2A36A", "Claim"], evidence: ["#7FCB97", "Evidence"], question: ["#B5A5EC", "Open question"], source: ["#CFC5AF", "Coverage"], perspective: ["#EDE6D2", "Perspective"], context: ["#A8A396", "Background"], note: ["#F5E500", "Your note"] };
  const N = {}; const ORDER = []; let BR = [], CONTRA = [], GRAPH = null;
  const add = (id, o) => { N[id] = { id, kids: [], ...o }; ORDER.push(id); if (o.parent) N[o.parent].kids.push(id); return N[id]; };
  const mmKey = sid => sid === "genz" ? "mmNotes" : "mmNotes:" + sid;
  function buildGraph(sid) {
    if (GRAPH === sid) return; GRAPH = sid;
    for (const k in N) delete N[k]; ORDER.length = 0;
    if (sid === "genz") buildFeatured(); else buildFromStory(RS.story(sid));
    store.get(mmKey(sid), []).forEach(n => { if (N[n.parent] && !N[n.id]) add(n.id, { parent: n.parent, level: Math.min(3, N[n.parent].level + 1), type: "note", label: n.label, text: "Your private note.", src: [], mine: true }); });
    S.sel = null; S.hits = new Set(); S.fitted = false; setDepth(S.depth);
  }
  /* any story without a hand-built dossier: a graph from its headlines, framings, coverage and places */
  function buildFromStory(st) {
    const LO = window.LIVE_OUTLETS || {}, LEAN = { L: "Left", LL: "Lean left", C: "Centre", LR: "Lean right", R: "Right", U: "Unrated" };
    const arts = (st.articles || []).slice().sort((a, b) => a.time - b.time), on = id => (LO[id] || {}).name || id;
    const covered = arr => arr.filter(x => !/have covered this yet/.test(x));
    add("root", { label: st.title, type: "center", level: 0 });
    BR = [["know", "What we know", 1], ["tl", "Timeline of reports", 1], ["ppl", "People & institutions", 1], ["where", "Place & topic", 1], ["left", "Left framing", -1], ["right", "Right framing", -1], ["media", "Coverage by outlet", -1], ["q", "Open questions", -1]];
    BR.forEach(([id, label, side]) => add(id, { label, type: "branch", level: 1, side, parent: "root" }));
    st.sum.forEach((t, i) => add("k" + i, { parent: "know", level: 2, type: st.live ? "evidence" : "context", label: t, text: st.live ? "As reported. Check the outlet's article for detail." : "Illustrative summary point.", src: [] }));
    if (arts.length) arts.forEach((a, i) => add("t" + i, { parent: "tl", level: 2, type: "event", label: new Date(a.time).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " · " + on(a.outlet), text: a.title + (a.snippet ? ". " + a.snippet : ""), link: a.link, src: [] }));
    else add("t0", { parent: "tl", level: 2, type: "question", label: "No dated reports yet: add events in the Timeline tab", src: [] });
    // people and institutions: proper-noun phrases named in the headlines (a hint, not checked)
    const text = [st.title, ...arts.map(a => a.title), ...st.sum].join(" . ");
    const SKIP = /^(The|A|An|In|On|At|For|From|With|After|Before|Over|How|Why|What|Who|When|This|That|These|Live|Updates?|Breaking|Watch|India|Indian|New|Day|Week|Year|November|October|December|January|February|March|April|May|June|July|August|September|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Photo|Video)$/;
    const ents = new Map();
    (text.match(/\b(?:[A-Z][a-zA-Z.&'’-]+|[A-Z]{2,})(?:\s+(?:of\s+|and\s+)?(?:[A-Z][a-zA-Z.&'’-]+|[A-Z]{2,})){0,4}/g) || []).forEach(e => { e = e.replace(/[’']s$/, "").trim(); if (e.length < 3 || SKIP.test(e) || (st.place && e === st.place)) return; ents.set(e, (ents.get(e) || 0) + 1); });
    const top = [...ents].sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length) top.forEach(([e, n], i) => add("p" + i, { parent: "ppl", level: 2, type: "person", label: e, text: "Named " + n + (n === 1 ? " time" : " times") + " in the headlines. Not checked: verify their role in the outlets' articles.", src: [] }));
    else add("p0", { parent: "ppl", level: 2, type: "question", label: "Who is involved? Add them as notes", src: [] });
    add("w0", { parent: "where", level: 2, type: "context", label: st.place || "India", text: "Where the story is set, from the headlines.", src: [] });
    add("w1", { parent: "where", level: 2, type: "context", label: "Topic: " + st.cat, text: "Detected from the headlines.", src: [] });
    if (st.live) add("w2", { parent: "where", level: 2, type: "context", label: st.outletCount + (st.outletCount === 1 ? " outlet" : " outlets") + " covering it", text: "Latest report " + (st.time || ""), src: [] });
    const sideNodes = (br, items, hl, empty) => {
      if (hl && !/^Not covered/.test(hl)) add(br + "h", { parent: br, level: 2, type: "claim", label: hl, text: "A headline from this side.", src: [] });
      covered(items).forEach((x, i) => add(br + i, { parent: br, level: 2, type: "perspective", label: x, src: [] }));
      if (!N[br].kids.length) add(br + "0", { parent: br, level: 2, type: "question", label: empty, text: "A gap in coverage is worth noting, not proof of anything.", src: [] });
    };
    sideNodes("left", st.L, st.hl.L, "No left-leaning outlet we track has covered this yet");
    sideNodes("right", st.R, st.hl.R, "No right-leaning outlet we track has covered this yet");
    if (arts.length) { const by = new Map(); arts.forEach(a => { if (!by.has(a.outlet)) by.set(a.outlet, a); }); [...by.values()].forEach((a, i) => add("m" + i, { parent: "media", level: 2, type: "source", label: on(a.outlet) + ": “" + a.title + "”", text: "Lean: " + LEAN[(LO[a.outlet] || {}).b || "U"] + " (provisional).", link: a.link, src: [] })); }
    else Object.entries(st.cov || {}).filter(([, v]) => v).forEach(([k, v], i) => add("m" + i, { parent: "media", level: 2, type: "source", label: LEAN[k] + ": " + v + " articles", src: [] }));
    const qs = ["What do official documents or records say?", "Who is affected, and how many people?", "Who hasn't been heard from yet?"];
    if (!covered(st.R).length) qs.unshift("Why hasn't the right-leaning press covered this?");
    if (!covered(st.L).length) qs.unshift("Why hasn't the left-leaning press covered this?");
    qs.slice(0, 4).forEach((q, i) => add("q" + i, { parent: "q", level: 2, type: "question", label: q, text: "Unanswered in the headlines we have.", src: [] }));
    CONTRA = [];
  }
  /* the featured case: its hand-built graph */
  function buildFeatured() {
  add("root", { label: C.title, type: "center", level: 0 });
  BR = [["bg", "Background", 1], ["tl", "Timeline", 1], ["ppl", "People & institutions", 1], ["cl", "Claims", 1], ["ev", "Evidence", 1], ["persp", "Perspectives", -1], ["econ", "Economic & social impact", -1], ["media", "Media coverage", -1], ["q", "Open questions", -1]];
  BR.forEach(([id, label, side]) => add(id, { label, type: "branch", level: 1, side, parent: "root" }));
  add("bg1", { parent: "bg", level: 2, type: "context", label: "Leak reports across state exams, 2019–24", src: ["S9"], text: C.background[0].replace(/\s*\[S\d+\]/g, "") });
  add("bg2", { parent: "bg", level: 2, type: "evidence", label: "Papers sent in sealed digital-lock boxes", src: ["S1"], text: C.background[1].replace(/\s*\[S\d+\]/g, "") });
  add("bg3", { parent: "bg", level: 2, type: "evidence", label: "1.8 million candidates sat the exam", src: ["S1"], text: "From the agency's information bulletin." });
  C.timeline.forEach((t, i) => add("tl" + i, { parent: "tl", level: 2, type: "event", label: `${t.d}: ${t.t}`, src: t.src, status: t.st, ord: i, text: t.rep && t.rep !== t.d ? `Happened ${t.d}, reported ${t.rep}.` : `Date: ${t.d}.` }));
  C.people.forEach((p, i) => add("p" + i, { parent: "ppl", level: 2, type: "person", label: p.n, src: p.src, text: `${p.role}. Stated position: ${p.pos}. Influence: ${p.infl}.` }));
  C.claims.forEach(x => { add(x.id, { parent: "cl", level: 2, type: "claim", label: x.text, src: x.src, status: x.st, text: `Made by ${x.who}, ${x.when}.`, claim: x.id }); add(x.id + "f", { parent: x.id, level: 3, type: "evidence", label: "For: " + x.ev, src: x.src }); add(x.id + "a", { parent: x.id, level: 3, type: "evidence", label: "Against: " + x.counter, src: x.counterSrc }); });
  [["S4", "Police FIR: four arrests"], ["S8", "Agency report: two centres"], ["S6", "Fact-check: video is from 2019"], ["S7", "Court order: status report"], ["S10", "Ministry committee notification"]].forEach(([s, l]) => add("ev" + s, { parent: "ev", level: 2, type: "evidence", label: l, src: [s], text: C.sources[s].ex }));
  [["Full re-test for everyone", "Exam Nyay Manch", ["S5"], ["Strongest: screenshots appear to predate the exam, if the timestamps hold up", ["S3"], "unverified"], ["Weakness: no published evidence of a breach beyond two centres yet", ["S8"]]],
   ["Targeted re-test at two centres", "Testing agency", ["S8"], ["Strongest: based on an audit of the digital-lock logs", ["S8"], "partial"], ["Weakness: the agency audited itself; no independent check yet", []]],
   ["Protect current ranks", "Candidates who scored well", ["S5"], ["Strongest: per the agency, most centres were unaffected", ["S8"], "partial"], ["Weakness: relies entirely on the agency's count", []]]
  ].forEach((p, i) => { add("ps" + i, { parent: "persp", level: 2, type: "perspective", label: p[0], src: p[2], text: `Held by: ${p[1]}.` }); add("ps" + i + "s", { parent: "ps" + i, level: 3, type: "evidence", label: p[3][0], src: p[3][1], status: p[3][2], analysis: true }); add("ps" + i + "w", { parent: "ps" + i, level: 3, type: "question", label: p[4][0], src: p[4][1], analysis: true }); });
  add("ec1", { parent: "econ", level: 2, type: "context", label: "Second round of coaching and travel costs", text: "Reported by Delta Samachar through interviews. No cost figures yet.", src: [] });
  add("ec2", { parent: "econ", level: 2, type: "claim", label: "Admissions delayed ~2 months (prediction)", src: ["S10"], status: "prediction", text: "Claim C6 from a ministry official." });
  add("ec3", { parent: "econ", level: 2, type: "context", label: "Trust in national exams", text: "Analytical link: an interpretation, not a documented finding.", src: ["S9"], analysis: true });
  C.coverage.forEach((o, i) => add("m" + i, { parent: "media", level: 2, type: "source", label: `${o.outlet}: “${o.hl}”`, src: o.cites, text: `${o.type}, ${o.lang}. Leads with ${o.emph.toLowerCase()}. Doesn't address: ${o.lacks.toLowerCase()}.` }));
  C.questions.forEach((q, i) => add("q" + i, { parent: "q", level: 2, type: "question", label: q, text: "Unanswered in the available sources.", src: [] }));
  CONTRA = [["C1", "C2"], ["C3", "evS6"]];
  }

  const S = { depth: "detailed", exp: new Set(), sel: null, hits: new Set(), types: new Set(Object.keys(TYPES)), contra: false, tf: { x: 0, y: 0, k: .6 }, pos: {}, fitted: false };
  function setDepth(d) { S.depth = d; S.exp = new Set(); if (d !== "overview") BR.forEach(b => S.exp.add(b[0])); if (d === "expert") ORDER.forEach(id => { if (N[id].level === 2 && N[id].kids.length) S.exp.add(id); }); }
  setDepth("detailed"); buildGraph("genz");
  const visible = id => { const n = N[id]; if (!n.parent || n.parent === "root") return true; return S.exp.has(n.parent) && visible(n.parent); };
  const X = [0, 330, 620, 960];
  function layout() {
    const pos = { root: { x: 0, y: 0 } };
    const h = id => { const n = N[id]; const kids = S.exp.has(id) ? n.kids : []; const base = n.level === 1 ? 120 : n.level === 2 ? 62 : 50; return Math.max(base, kids.reduce((a, k) => a + h(k), 0)) + (n.level === 1 ? 26 : 0); };
    const place = (id, top, side) => { const n = N[id], H = h(id); pos[id] = { x: side * X[n.level], y: top + H / 2 - (n.level === 1 ? 13 : 0), side }; if (!S.exp.has(id)) return; const sum = n.kids.reduce((a, k) => a + h(k), 0); let y = top + (H - (n.level === 1 ? 26 : 0) - sum) / 2; n.kids.forEach(k => { place(k, y, side); y += h(k); }); };
    [1, -1].forEach(side => { const brs = BR.filter(b => b[2] === side).map(b => b[0]); let y = -brs.reduce((a, b) => a + h(b), 0) / 2; brs.forEach(b => { place(b, y, side); y += h(b); }); });
    S.pos = pos;
  }
  const wrapText = (s, max) => { const w = String(s).split(/\s+/), out = []; let line = ""; w.forEach(x => { if ((line + " " + x).trim().length > max && line) { out.push(line); line = x; } else line = (line + " " + x).trim(); }); if (line) out.push(line); if (out.length > 3) { out.length = 3; out[2] += "…"; } return out; };
  const RS_STATUS = { verified: "✓ verified", partial: "◐ partially supported", disputed: "⇄ disputed", unverified: "? unverified", misleading: "! misleading", prediction: "→ prediction", statement: "❝ statement", context: "◷ background", developing: "● developing" };
  const dimmed = n => n.level >= 2 && !S.types.has(n.type);
  function renderMap() {
    if (!$("#mmWorld")) return;
    layout(); const P = S.pos, ids = ORDER.filter(id => visible(id) && P[id]);
    const edge = (a, b, cls) => { const pa = P[a], pb = P[b], s = pb.side || 1; const ra = N[a].level === 0 ? 74 : N[a].level === 1 ? 50 : 11; const rb = N[b].level === 1 ? 50 : N[b].level === 2 ? 11 : 8; const x1 = pa.x + s * ra, x2 = pb.x - s * rb, mx = (x1 + x2) / 2; return `<path class="medge ${cls}" d="M${x1} ${pa.y} C${mx} ${pa.y} ${mx} ${pb.y} ${x2} ${pb.y}"/>`; };
    let edges = ids.filter(id => N[id].parent).map(id => edge(N[id].parent, id, (N[id].level > 1 ? "l2 " : "") + (N[id].analysis ? "analysis" : ""))).join("");
    if (S.contra) CONTRA.forEach(([a, b]) => { if (P[a] && P[b] && visible(a) && visible(b)) { const pa = P[a], pb = P[b], bend = (pa.side || 1) * 260; edges += `<path class="medge contra" d="M${pa.x} ${pa.y} C${pa.x + bend} ${pa.y} ${pb.x + bend} ${pb.y} ${pb.x} ${pb.y}"/><text x="${Math.max(pa.x, pb.x) + bend * .75}" y="${(pa.y + pb.y) / 2}" fill="#FF8A80" font-family="IBM Plex Mono" font-size="12">contradicts</text>`; } });
    const nodes = ids.map(id => {
      const n = N[id], p = P[id], cls = `mnode${dimmed(n) ? " dim" : ""}${S.hits.has(id) ? " hit" : ""}${S.sel === id ? " sel" : ""}`;
      if (n.level === 0) return `<g class="${cls}" data-id="${id}" tabindex="0" role="button" aria-label="${esc(n.label)}"><circle class="ring" r="74" fill="#F5E500" stroke="#171717" stroke-width="3"/>${wrapText(n.label, 12).map((l, i, a) => `<text text-anchor="middle" class="lbl-b" style="fill:#171717;font-size:22px" y="${(i - (a.length - 1) / 2) * 23 + 7}">${esc(l)}</text>`).join("")}</g>`;
      if (n.level === 1) { const closed = !S.exp.has(id); return `<g class="${cls}" data-id="${id}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-expanded="${!closed}" aria-label="${esc(n.label)} branch"><circle class="ring" r="50" fill="#2A2A2A" stroke="#F5E500" stroke-width="3"/>${wrapText(n.label, 11).map((l, i, a) => `<text text-anchor="middle" class="lbl-b" style="font-size:16px" y="${(i - (a.length - 1) / 2) * 17 + 5}">${esc(l)}</text>`).join("")}${closed ? `<g transform="translate(${p.side * 44} -38)"><circle r="13" fill="#F5E500"/><text text-anchor="middle" y="4" style="fill:#171717;font-size:11px;font-weight:700">+${n.kids.length}</text></g>` : ""}</g>`; }
      const col = TYPES[n.type][0], r = n.level === 2 ? 11 : 8, s = p.side, lines = wrapText(n.label, n.level === 2 ? 30 : 34), anc = s > 0 ? "start" : "end", tx = s * (r + 8);
      const more = n.kids.length && !S.exp.has(id) ? ` <tspan fill="#F5E500">+${n.kids.length}</tspan>` : "";
      return `<g class="${cls}" data-id="${id}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${esc(TYPES[n.type][1] + ': ' + n.label)}"><circle class="ring" r="${r}" fill="${n.type === "note" ? "#171717" : col}" stroke="${col}" stroke-width="2" ${n.status === "unverified" || n.status === "disputed" ? 'stroke-dasharray="3 3" fill-opacity=".35"' : ""}/>
        ${lines.map((l, i) => `<text text-anchor="${anc}" x="${tx}" y="${(i - (lines.length - 1) / 2) * 15 + 4}" ${n.type === "note" ? 'style="font-family:Caveat;font-size:19px;fill:#F5E500"' : n.level === 3 ? 'style="font-size:12px;fill:#CFC9BA"' : ""}>${esc(l)}${i === lines.length - 1 ? more : ""}</text>`).join("")}
        ${n.status && n.level === 2 ? `<text text-anchor="${anc}" x="${tx}" y="${(lines.length - 1) / 2 * 15 + 20}" style="font-family:IBM Plex Mono;font-size:10px;fill:#A8A396;text-transform:uppercase">${esc(RS_STATUS[n.status] || n.status)}</text>` : ""}</g>`;
    }).join("");
    $("#mmWorld").innerHTML = edges + nodes; applyTf();
    if (!S.fitted && $("#mm").clientWidth) { fit(); S.fitted = true; }
  }
  function applyTf() { const w = $("#mmWorld"); if (w) w.setAttribute("transform", `translate(${S.tf.x} ${S.tf.y}) scale(${S.tf.k})`); }
  function fit() { const svg = $("#mm"); const W = svg.clientWidth, H = svg.clientHeight; if (!W) return; const ps = Object.entries(S.pos).filter(([id]) => visible(id)).map(([, p]) => p);
    const minX = Math.min(...ps.map(p => p.x)) - 300, maxX = Math.max(...ps.map(p => p.x)) + 300, minY = Math.min(...ps.map(p => p.y)) - 60, maxY = Math.max(...ps.map(p => p.y)) + 60;
    const k = Math.min(W / (maxX - minX), H / (maxY - minY), 1.1); S.tf = { k, x: W / 2 - (minX + maxX) / 2 * k, y: H / 2 - (minY + maxY) / 2 * k }; applyTf(); }
  function focusNode(id) { const p = S.pos[id], svg = $("#mm"); if (!p || !svg.clientWidth) return; const k = Math.max(S.tf.k, .75); S.tf = { k, x: svg.clientWidth / 2 - p.x * k - (S.sel ? 120 : 0), y: svg.clientHeight / 2 - p.y * k }; applyTf(); }
  function expandTo(id) { let n = N[id]; while (n && n.parent) { S.exp.add(n.parent); n = N[n.parent]; } }
  function zoomAt(cx, cy, f) { const k2 = Math.max(.2, Math.min(2.6, S.tf.k * f)); S.tf.x = cx - (cx - S.tf.x) * k2 / S.tf.k; S.tf.y = cy - (cy - S.tf.y) * k2 / S.tf.k; S.tf.k = k2; applyTf(); }
  function selectNode(id, fromKey) {
    const n = N[id]; if (!n) return;
    if (n.level === 1) { S.exp.has(id) ? S.exp.delete(id) : S.exp.add(id); } else if (n.kids.length && n.level > 0) { if (S.exp.has(id) && S.sel === id) S.exp.delete(id); else S.exp.add(id); }
    S.sel = id; renderMap();
    const card = $("#nodecard"); if (n.level === 1) { card.hidden = true; return; } card.hidden = false;
    card.innerHTML = `<button class="x" type="button" aria-label="Close">×</button><span class="eyebrow">${esc(n.level === 0 ? "Investigation" : TYPES[n.type][1])}${n.analysis ? " · analytical link, not documented" : ""}</span><h3>${esc(n.label)}</h3>${n.status ? `<div>${st(n.status)}</div>` : ""}
      ${n.text ? `<p style="font-size:14.5px;color:#D8D2C4">${esc(n.text)}</p>` : ""}${n.src && n.src.length ? `<div><span class="eyebrow">Sources</span><div style="margin-top:4px">${cites(n.src)}</div></div>` : ""}
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm y" type="button" id="ncAsk">Ask ${AI}</button><button class="btn sm" type="button" id="ncNote">Add to my notes</button>${n.link ? `<a class="btn sm" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">Read the article ↗</a>` : ""}${n.mine ? `<button class="btn sm" type="button" id="ncDel">Delete note</button>` : ""}</div>
      ${n.mine ? "" : `<label class="eyebrow" for="ncTxt">Pin your thought to this node</label><textarea id="ncTxt" placeholder="What does this connect to?"></textarea><div><button class="btn sm" type="button" id="ncAdd">Pin to map</button></div>`}`;
    card.querySelector(".x").onclick = () => { card.hidden = true; S.sel = null; renderMap(); };
    $("#ncAsk").onclick = () => RS.askPrefill(`About "${n.label}": what's established, what's disputed, and what should I check next?`);
    $("#ncNote").onclick = () => { RS.addNote(SID, { kind: n.type === "claim" ? "quote" : n.type === "question" ? "question" : n.type === "event" ? "event" : "fact", text: n.label + (n.text ? ". " + n.text : ""), src: n.src || [] }); toast("Added to your notes"); };
    if ($("#ncDel")) $("#ncDel").onclick = () => { store.set(mmKey(SID), store.get(mmKey(SID), []).filter(x => x.id !== id)); const par = N[n.parent]; par.kids = par.kids.filter(k => k !== id); delete N[id]; ORDER.splice(ORDER.indexOf(id), 1); card.hidden = true; S.sel = null; renderMap(); };
    if ($("#ncAdd")) $("#ncAdd").onclick = () => { const v = $("#ncTxt").value.trim(); if (!v) return toast("Write a thought first"); const nid = "note" + Date.now(); const all = store.get(mmKey(SID), []); all.push({ id: nid, parent: id, label: v }); store.set(mmKey(SID), all); add(nid, { parent: id, level: Math.min(3, n.level + 1), type: "note", label: v, text: "Your private note.", src: [], mine: true }); S.exp.add(id); store.set("mapNote", true); RS.addNote(SID, { kind: "opinion", text: v }); renderMap(); toast("Pinned to the map and your notes"); };
    if (!fromKey) focusNode(id);
  }
  function mapHTML() {
    return `<div class="map-tools">
      <div class="seg" role="group" aria-label="Depth"><button type="button" data-d="overview" aria-pressed="${S.depth === "overview"}">Overview</button><button type="button" data-d="detailed" aria-pressed="${S.depth === "detailed"}">Detailed</button><button type="button" data-d="expert" aria-pressed="${S.depth === "expert"}">Expert</button></div>
      <input class="search" id="mmSearch" type="search" placeholder="Search the map" aria-label="Search the map" style="width:170px;padding:4px 10px">
      <button class="tool" type="button" id="contraBtn" aria-pressed="${S.contra}">Show contradictions</button>
      <div class="chipf" id="typeChips">${Object.entries(TYPES).map(([k, [c, l]]) => `<button type="button" data-t="${k}" aria-pressed="${S.types.has(k)}" style="--c:${c}">${l}</button>`).join("")}</div></div>
      <div class="mapwrap"><svg id="mm" role="application" aria-label="Interactive mind map. Drag to pan, scroll to zoom, click a node."><g id="mmWorld"></g></svg><div class="nodecard" id="nodecard" hidden></div>
        <div class="zoombox"><button type="button" id="zIn" aria-label="Zoom in">+</button><button type="button" id="zOut" aria-label="Zoom out">−</button><button type="button" id="zFit" style="font-size:12px">fit</button></div>
        <div class="map-legend"><span><i></i>documented</span><span><i class="d"></i>analytical</span><span><i class="c"></i>contradiction</span></div></div>`;
  }
  function wireMap(root) {
    const svg = $("#mm"); S.fitted = false;
    root.addEventListener("click", e => {
      const d = e.target.closest("[data-d]"); if (d) { setDepth(d.dataset.d); $$("[data-d]", root).forEach(b => b.setAttribute("aria-pressed", b === d)); renderMap(); fit(); }
      const t = e.target.closest("[data-t]"); if (t) { const k = t.dataset.t; S.types.has(k) ? S.types.delete(k) : S.types.add(k); t.setAttribute("aria-pressed", S.types.has(k)); renderMap(); }
    });
    $("#contraBtn").onclick = e => { S.contra = !S.contra; e.target.setAttribute("aria-pressed", S.contra); if (S.contra) { S.exp.add("cl"); S.exp.add("ev"); store.set("contraSeen", true); } renderMap(); };
    $("#mmSearch").addEventListener("input", e => { const q = e.target.value.trim().toLowerCase(); S.hits = new Set(); if (q.length > 1) ORDER.forEach(id => { if ((N[id].label + " " + (N[id].text || "")).toLowerCase().includes(q)) { S.hits.add(id); expandTo(id); } }); renderMap(); const f = [...S.hits][0]; if (f) focusNode(f); });
    $("#zIn").onclick = () => zoomAt(svg.clientWidth / 2, svg.clientHeight / 2, 1.25); $("#zOut").onclick = () => zoomAt(svg.clientWidth / 2, svg.clientHeight / 2, .8); $("#zFit").onclick = fit;
    let drag = null;
    svg.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, tx: S.tf.x, ty: S.tf.y, node: e.target.closest(".mnode"), moved: false }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; svg.classList.add("panning"); } if (drag.moved) { S.tf.x = drag.tx + dx; S.tf.y = drag.ty + dy; applyTf(); } });
    const up = () => { if (!drag) return; if (!drag.moved && drag.node) selectNode(drag.node.dataset.id); drag = null; svg.classList.remove("panning"); };
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
    svg.addEventListener("wheel", e => { e.preventDefault(); const r = svg.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0015)); }, { passive: false });
    svg.addEventListener("keydown", e => { const g = e.target.closest(".mnode"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectNode(g.dataset.id, true); } });
  }

  /* ================= DOSSIER ================= */
  const addBtn = (kind, text, src) => `<button type="button" class="addn" data-addnote='${esc(JSON.stringify({ kind, text, src }))}' title="Add to my notes">+ note</button>`;
  function dossierHTML() {
    const s = RS.story(SID), p = RS.share(s);
    if (SID !== "genz") return `<div class="paperpane"><span class="demo-tag">Illustrative story · summary only</span><h2 class="display" style="font-size:44px;margin:10px 0">${esc(s.title)}</h2>
      ${s.hide ? `<div class="gapbanner"><b>Under-covered:</b> ${esc(s.hide)}.</div>` : ""}
      <ul class="sumlist">${s.sum.map(x => `<li>${esc(x)} ${addBtn("fact", x, [])}</li>`).join("")}</ul>${RS.biasBar(s, true)}
      <div class="cmpbox" style="margin-top:14px"><div style="--g:${BIAS.L[1]}"><span class="eyebrow">Left framing</span><b>${esc(s.hl.L)}</b><span class="muted">${esc(s.L[0])}</span></div><div style="--g:${BIAS.C[1]}"><span class="eyebrow">Centre</span><b>${esc(s.hl.C)}</b></div><div style="--g:${BIAS.R[1]}"><span class="eyebrow">Right framing</span><b>${esc(s.hl.R)}</b><span class="muted">${esc(s.R[0])}</span></div></div>
      <div class="method" style="margin-top:18px"><b>No full dossier yet for this story.</b><span>Build one yourself: add timeline events and notes, ask ${AI} for background, then write your article. The featured case shows what a full dossier looks like.</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" type="button" data-itab="timeline">Add timeline events</button><button class="btn sm" type="button" data-go="investigate" data-arg="genz|dossier">See the featured dossier</button></div></div></div>`;
    return `<div class="paperpane">
      <div class="metaline"><span class="demo-tag">${esc(C.kicker)} · hypothetical events and sources</span><span>${st("developing")}</span><span>Updated ${esc(C.updated)}</span></div>
      <h2 class="display" style="font-size:clamp(40px,5vw,64px);line-height:.92;margin:10px 0">${esc(C.title)}</h2><p class="dek">${esc(C.dek)}</p>
      <nav class="dtoc">${[["intro", "Overview"], ["background", "Background"], ["claims", "Claims"], ["coverage", "Coverage"], ["questions", "Open questions"], ["sources", "Sources"]].map(([k, n]) => `<button type="button" data-sec="${k}">${n}</button>`).join("")}<button type="button" data-itab="timeline">Timeline →</button></nav>
      <section class="dsec" id="s-intro"><h2>What happened</h2><p class="prose" style="font-size:18px">${esc(C.happened)}</p><p class="prose"><b>Why it matters.</b> ${esc(C.matters)}</p>
        <div class="intro-grid"><div><span class="eyebrow">Established</span><ul>${C.established.map(([t, s]) => `<li>${esc(t)} ${cites(s)} ${addBtn("fact", t, s)}</li>`).join("")}</ul></div><div><span class="eyebrow">Still uncertain</span><ul>${C.uncertain.map(([t, s]) => `<li>${esc(t)} ${cites(s)} ${addBtn("question", t, s)}</li>`).join("")}</ul></div><div><span class="eyebrow">Investigate next</span><ul>${C.next.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div></div></section>
      <section class="dsec" id="s-background"><h2>Background</h2><div class="prose">${C.background.map(p => `<p>${esc(p).replace(/\[(S\d+)\]/g, (m, i) => cite(i))}</p>`).join("")}</div></section>
      <section class="dsec" id="s-people"><h2>People & institutions</h2><div class="people">${C.people.map(p => `<div class="person"><h3>${esc(p.n)}</h3><dl class="kv"><dt>Role</dt><dd>${esc(p.role)}</dd><dt>Position</dt><dd>${esc(p.pos)} ${cites(p.src)}</dd></dl></div>`).join("")}</div></section>
      <section class="dsec" id="s-claims"><h2>Claims & evidence</h2><div class="claims">${C.claims.map(x => `<div class="claim"><div><span class="lab-l">${x.id} · ${esc(x.kind)}</span><span class="ctext">“${esc(x.text)}”</span><span class="muted" style="font-size:14px">${esc(x.who)} · ${esc(x.when)} ${cites(x.src)}</span><span>${st(x.st)} ${addBtn("quote", `"${x.text}" (${x.who}, ${x.when}; status: ${x.st})`, [...x.src, ...x.counterSrc])}</span></div><div><span class="lab-l">Supporting evidence</span><span style="font-size:14.5px">${esc(x.ev)}</span></div><div><span class="lab-l">Counter-evidence</span><span style="font-size:14.5px">${esc(x.counter)} ${cites(x.counterSrc)}</span></div></div>`).join("")}</div></section>
      <section class="dsec" id="s-coverage"><h2>Coverage comparison</h2><div class="compare"><table><thead><tr><th>&nbsp;</th>${C.coverage.map(o => `<th>${esc(o.outlet)}<br><span style="font-weight:400;opacity:.8">${esc(o.type)} · ${esc(o.lang)}</span></th>`).join("")}</tr></thead><tbody>
        <tr><th>Headline</th>${C.coverage.map(o => `<td class="hl">${esc(o.hl)}</td>`).join("")}</tr><tr><th>Leads with</th>${C.coverage.map(o => `<td>${esc(o.emph)}</td>`).join("")}</tr><tr><th>Cites</th>${C.coverage.map(o => `<td>${o.cites.length ? cites(o.cites) : "<span class='muted'>Own interviews</span>"}</td>`).join("")}</tr><tr><th>Doesn't address</th>${C.coverage.map(o => `<td>${esc(o.lacks)}</td>`).join("")}</tr></tbody></table></div></section>
      <section class="dsec" id="s-questions"><h2>Open questions</h2><ol class="qlist">${C.questions.map(q => `<li>${esc(q)} ${addBtn("question", q, [])}</li>`).join("")}</ol></section>
      <section class="dsec" id="s-sources"><h2>Sources</h2><div class="srclist">${Object.entries(C.sources).map(([k, s]) => `<button class="srcrow" type="button" data-src="${k}"><span class="id">${k}</span><span><b>${esc(s.title)}</b><br><span class="mono muted">${esc(s.type)} · ${esc(s.date)}</span></span></button>`).join("")}</div></section></div>`;
  }

  /* ================= TIMELINE (editable) ================= */
  function timelineHTML() {
    const mine = notes(SID).filter(n => n.kind === "event");
    const base = SID === "genz" ? C.timeline.map((t, i) => ({ d: t.d, t: t.t, st: t.st, src: t.src, i })) : [];
    const comments = notes(SID).filter(n => n.on != null);
    return `<div class="paperpane"><div class="sec-head"><h2 class="display" style="font-size:40px">Timeline</h2><span class="mono muted">${base.length} sourced events · ${mine.length} added by you</span></div>
      <form class="tl-add" id="tlForm"><input id="tlDate" placeholder="Date (e.g. 2 Nov)" aria-label="Event date"><input id="tlText" placeholder="What happened? Add your own event" aria-label="Event"><input id="tlWhere" placeholder="Where did you find it? (link or source)" aria-label="Source"><button class="btn k sm" type="submit">Add event</button></form>
      <div class="tl">${[...base.map(b => ({ ...b, base: true })), ...mine].map(e => e.base ? `<div class="tl-item ${e.st}"><div class="tl-date">${esc(e.d)} ${st(e.st)}</div><div class="tl-t">${esc(e.t)} ${cites(e.src)}</div>
          ${comments.filter(c => c.on === e.i).map(c => `<div class="tl-mine">✎ ${esc(c.text)}</div>`).join("")}<div><button type="button" class="addn" data-tlc="${e.i}">+ my note on this</button></div></div>`
        : `<div class="tl-item mine"><div class="tl-date">${esc(e.date || "Undated")} <span class="youtag">You added</span></div><div class="tl-t">${esc(e.text)}</div>${e.where ? `<div class="mono muted">Source: ${esc(e.where)}</div>` : `<div class="mono" style="color:var(--pink)">No source yet. Add one before you publish.</div>`}<div><button type="button" class="addn" data-del="${e.id}">Remove</button></div></div>`).join("") || `<div class="empty">No events yet. Add the first thing that happened.</div>`}</div></div>`;
  }

  /* ================= NOTES ================= */
  function notesHTML() {
    const all = notes(SID).filter(n => n.on == null);
    return `<div class="paperpane"><div class="sec-head"><h2 class="display" style="font-size:40px">My notes</h2><button class="btn r" type="button" data-write="1">✍ Write my article</button></div>
      <p class="muted">Collect facts, quotes, questions and your own opinions here. ${AI} keeps your opinions labelled as yours when it drafts your article.</p>
      <form class="note-add" id="noteForm"><select id="noteKind" aria-label="Note type">${Object.entries(NOTE_KINDS).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join("")}</select>
        <textarea id="noteText" placeholder="Write a note, paste a quote, or jot your take" aria-label="Note"></textarea>
        <input id="noteWhere" placeholder="Source (optional): link, document, who said it" aria-label="Source"><button class="btn k sm" type="submit">Add note</button></form>
      <div class="notes">${all.length ? all.slice().reverse().map(n => `<div class="note" style="--k:${NOTE_KINDS[n.kind][1]}"><span class="nk">${NOTE_KINDS[n.kind][0]}${n.date ? " · " + esc(n.date) : ""}</span><p>${esc(n.text)}</p><div class="nf"><span>${cites(n.src)}${n.where ? `<span class="mono muted">${esc(n.where)}</span>` : ""}</span><button type="button" class="addn" data-del="${n.id}">Delete</button></div></div>`).join("")
        : `<div class="empty">No notes yet. Add one here, or use “+ note” anywhere in the dossier, map or ${AI}'s answers.</div>`}</div></div>`;
  }

  /* ================= VIEW ================= */
  RS.V.investigate = {
    mount(el) {
      el.innerHTML = `<div class="inv-bar"><div class="inv-bar-in">
          <select id="invStory" aria-label="Choose a story">${[...STORIES, ...(window.SAMPLE_STORIES || [])].map(s => `<option value="${s.id}">${esc(s.title)}${s.dossier ? " · example case study" : s.live ? "" : " · sample"}</option>`).join("")}</select>
          <div class="itabs" role="tablist">${[["dossier", "Dossier"], ["map", "Mind map"], ["timeline", "Timeline"], ["notes", "My notes"]].map(([k, n]) => `<button type="button" role="tab" data-itab="${k}">${n}<span class="cnt" data-cnt="${k}"></span></button>`).join("")}</div>
          <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><button class="tool" type="button" data-go="board" data-arg="import">Whiteboard</button><button class="btn r sm" type="button" data-write="1">✍ Write my article</button></span></div></div>
        <div class="inv-grid"><div class="inv-center" id="invCenter"></div><aside class="pane-right" id="assistant" aria-label="${AI}"></aside></div>`;
      $("#invStory").onchange = e => show("investigate", e.target.value + "|" + TAB);
      el.addEventListener("click", e => {
        const t = e.target.closest("[data-itab]"); if (t) { TAB = t.dataset.itab; renderTab(); return; }
        const w = e.target.closest("[data-write]"); if (w) { openWizard(); return; }
        const a = e.target.closest("[data-addnote]"); if (a) { const n = JSON.parse(a.dataset.addnote); RS.addNote(SID, n); a.textContent = "✓ noted"; a.disabled = true; toast("Added to your notes", "Open notes", () => { TAB = "notes"; renderTab(); }); return; }
        const sc = e.target.closest("[data-sec]"); if (sc) { $("#s-" + sc.dataset.sec)?.scrollIntoView({ behavior: "smooth" }); return; }
        const d = e.target.closest("[data-del]"); if (d) { setNotes(SID, notes(SID).filter(n => n.id !== d.dataset.del)); renderTab(); return; }
        const c = e.target.closest("[data-tlc]"); if (c) { const v = prompt2(c); return; }
      });
      mountAssistant($("#assistant"));
    },
    show(arg) {
      const [s, t, x] = String(arg || "").split("|");
      if (s && RS.story(s)) SID = s; if (t) TAB = t;
      $("#invStory").value = SID; renderTab(); switchChat();
      if (x === "ask") setTimeout(() => $("#asInput")?.focus(), 80);
      if (TAB === "dossier" && x) setTimeout(() => $("#s-" + x)?.scrollIntoView(), 60);
      if (TAB === "map") requestAnimationFrame(() => { if (x === "contra") { S.contra = true; S.exp.add("cl"); S.exp.add("ev"); store.set("contraSeen", true); renderMap(); fit(); $("#contraBtn").setAttribute("aria-pressed", "true"); } if (x === "q") { S.exp.add("q"); S.sel = "q"; renderMap(); focusNode("q"); } });
      if (SID === "genz") sig("overview", true);
    }
  };
  function prompt2(btn) {
    const i = +btn.dataset.tlc; const box = document.createElement("form"); box.className = "tl-add"; box.innerHTML = `<input placeholder="Your note on this event" aria-label="Your note"><button class="btn sm" type="submit">Save</button>`;
    btn.replaceWith(box); box.querySelector("input").focus();
    box.onsubmit = e => { e.preventDefault(); const v = box.querySelector("input").value.trim(); if (v) { const all = notes(SID); all.push({ id: "n" + Date.now().toString(36), kind: "opinion", text: v, on: i, src: [], at: Date.now() }); setNotes(SID, all); } renderTab(); };
  }
  function renderTab() {
    const c = $("#invCenter"); if (!c) return;
    $$(".itabs [data-itab]").forEach(b => { b.setAttribute("aria-selected", b.dataset.itab === TAB); b.disabled = false; });
    const nn = notes(SID); $("[data-cnt=notes]").textContent = nn.filter(n => n.on == null).length || ""; $("[data-cnt=timeline]").textContent = nn.filter(n => n.kind === "event").length ? "+" + nn.filter(n => n.kind === "event").length : "";
    if (TAB === "map") { buildGraph(SID); c.innerHTML = mapHTML(); c.className = "inv-center lab"; wireMap(c); requestAnimationFrame(() => { renderMap(); }); sig("map"); return; }
    c.className = "inv-center";
    c.innerHTML = TAB === "dossier" ? dossierHTML() : TAB === "timeline" ? timelineHTML() : notesHTML();
    if (TAB === "timeline") { sig("timeline"); $("#tlForm").onsubmit = e => { e.preventDefault(); const t = $("#tlText").value.trim(); if (!t) return toast("Describe the event first"); RS.addNote(SID, { kind: "event", text: t, date: $("#tlDate").value.trim(), where: $("#tlWhere").value.trim() }); toast("Event added to your timeline"); renderTab(); }; }
    if (TAB === "notes") { $("#noteForm").onsubmit = e => { e.preventDefault(); const t = $("#noteText").value.trim(); if (!t) return toast("Write something first"); RS.addNote(SID, { kind: $("#noteKind").value, text: t, where: $("#noteWhere").value.trim() }); renderTab(); }; }
    if (TAB === "dossier" && SID === "genz") { const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting && en.target.id === "s-coverage") sig("coverage"); }), { root: c.querySelector(".paperpane"), threshold: .2 }); $$(".dsec", c).forEach(s => io.observe(s)); }
  }

  /* ================= DHAGA (assistant) ================= */
  const MODES = {
    quick: ["Quick", "Understand it in two minutes", "Answer in under 130 words: what happened, why it matters, one thing that's unknown. Cite sources."],
    deep: ["Deep research", "Background, timeline, evidence, unknowns", "Write a structured report with '## ' sections: Summary; What happened; Background; Timeline; Stakeholders; Claims and evidence (each with a status word); Competing interpretations; Missing context; Unknowns; What could happen next (label as analysis). Keep each section tight."],
    investigate: ["Check a claim", "Trace one claim to its evidence", "Investigate the claim in the question. '## ' sections: The exact claim; Who made it and when; Evidence for; Evidence against; Status (one status word, with reason); What would settle it."],
    creator: ["Creator", "Research for a video or reel", "Help a creator research a video. '## ' sections: Central question; Key facts with sources; Strongest arguments on each side; Misconceptions to avoid; Hook ideas (3); Claims to verify before publishing."],
    kids: ["Explain simply", "For readers aged 12+", "Explain for a 12-year-old in short sentences, under 150 words. Keep facts accurate; no villains. End with one 'Think about it' question."],
    compare: ["Compare coverage", "How outlets framed it", "Compare how outlets framed this. '## ' sections: What each side emphasised; Headline language; What each establishes vs implies; Where they actually conflict on facts. Emphasis is not inaccuracy."]
  };
  const SUGG = { quick: ["What's actually happened so far?", "Explain this in simple Hinglish"], deep: ["Give me the full picture", "What context is missing from the viral posts?"], investigate: ["Is the main claim backed by evidence?", "Is the viral video real?"], creator: ["Help me plan a 12-minute Hindi YouTube video", "Plan a 45-second reel"], kids: ["Explain this simply", "Why should a teenager care?"], compare: ["How did left and right frame this?", "Which side left out what?"] };
  let mode = "deep", busy = false, ctl = null;
  const chatKey = () => "chat:" + SID;
  function mountAssistant(el) {
    el.innerHTML = `<div class="as-head"><div style="display:flex;gap:10px;align-items:center"><span class="dhaga-av" aria-hidden="true">ध</span><div><h2>${AI}</h2><p id="asStatus">Connecting to Claude…</p></div></div></div>
      <div class="modes" id="asModes" role="group" aria-label="Research mode"></div><div class="as-log" id="asLog" aria-live="polite"></div>
      <form class="as-form" id="asForm"><div class="as-suggest" id="asSugg"></div><div class="row"><textarea id="asInput" placeholder="Ask ${AI} a research question" aria-label="Your question"></textarea><div style="display:grid;gap:6px"><button class="btn y sm" type="submit" id="asSend">Ask</button><button class="btn sm" type="button" id="asStop" hidden>Stop</button></div></div>
        <div class="note">${AI} reads this story's sources only and cites them. Anything else is flagged as not sourced. No live web search.</div></form>`;
    renderModes();
    $("#asForm").addEventListener("submit", e => { e.preventDefault(); ask($("#asInput").value); });
    $("#asInput").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask($("#asInput").value); } });
    $("#asStop").onclick = () => ctl && ctl.abort();
    RS.onAi(aiState);
  }
  function switchChat() { renderLog(); }
  function aiState() { const ok = !!RS.ai(), s = $("#asStatus"); if (!s) return; s.textContent = !RS.aiReady() ? "Connecting to Claude…" : ok ? "Your research partner. Pick a mode." : "Off here: works when opened in Claude."; $("#asSend").disabled = !ok || busy; $("#asInput").disabled = !ok; $$("#asSugg button").forEach(b => b.disabled = !ok || busy); }
  function renderModes() {
    $("#asModes").innerHTML = Object.entries(MODES).map(([k, [l, d]]) => `<button type="button" aria-pressed="${k === mode}" title="${esc(d)}" data-m="${k}">${l}</button>`).join("");
    $$("#asModes button").forEach(b => b.onclick = () => { mode = b.dataset.m; renderModes(); });
    $("#asSugg").innerHTML = SUGG[mode].map(q => `<button type="button">${esc(q)}</button>`).join(""); $$("#asSugg button").forEach(b => b.onclick = () => ask(b.textContent)); aiState();
  }
  function renderLog() {
    const log = store.get(chatKey(), []), s = RS.story(SID);
    $("#asLog").innerHTML = (log.length ? "" : `<div class="amsg bot"><span class="who">${AI}</span><p>Namaste! I've read everything in this file on “${esc(s.title)}”. Ask me anything. I'll show you the evidence and the gaps; the conclusion is yours. Tap “+ note” on any answer to save it for your article.</p></div>`) +
      log.map((m, i) => m.role === "user" ? `<div class="amsg me"><div>${esc(m.content)}</div></div>` : m.err ? `<div class="amsg err">${esc(m.content)}</div>`
        : `<div class="amsg bot"><span class="who">${AI} · ${esc(MODES[m.mode]?.[0] || "")}</span>${md(m.content)}<div class="acts"><button type="button" data-anote="${i}">+ note</button><button type="button" data-pin="${i}">Pin to whiteboard</button><button type="button" data-copy="${i}">Copy</button></div></div>`).join("") +
      (log.length ? `<div><button class="linkish" type="button" id="asClear" style="color:var(--lab-mute);font-size:12px">Clear conversation</button></div>` : "");
    $$("#asLog [data-anote]").forEach(b => b.onclick = () => { const m = log[+b.dataset.anote]; RS.addNote(SID, { kind: "fact", text: `${AI} research: ` + m.content.replace(/[#*]/g, "").slice(0, 600), src: [...new Set((m.content.match(/S\d{1,2}/g) || []).filter(x => C.sources[x]))] }); b.textContent = "✓ noted"; toast("Saved to your notes"); });
    $$("#asLog [data-pin]").forEach(b => b.onclick = () => { const m = log[+b.dataset.pin]; RS.boardAdd({ type: "sticky", title: `${AI} summary (verify)`, text: m.content.replace(/[#*]/g, "").slice(0, 280), src: [...new Set((m.content.match(/S\d{1,2}/g) || []).filter(x => C.sources[x]))] }); toast("Pinned to your whiteboard"); });
    $$("#asLog [data-copy]").forEach(b => b.onclick = () => navigator.clipboard.writeText(log[+b.dataset.copy].content).then(() => toast("Copied"), () => toast("Your browser blocked copying")));
    if ($("#asClear")) $("#asClear").onclick = () => { store.set(chatKey(), []); renderLog(); };
    $("#asLog").scrollTop = 1e9;
  }
  async function ask(q) {
    q = (q || "").trim(); const ai = RS.ai(); if (!q || busy || !ai) return;
    busy = true; $("#asInput").value = ""; aiState();
    const key = chatKey(), sid = SID, log = store.get(key, []); log.push({ role: "user", content: q, mode }); store.set(key, log); renderLog();
    const bubble = document.createElement("div"); bubble.className = "amsg bot"; bubble.innerHTML = `<span class="who">${AI} · ${MODES[mode][0]}</span><p>Thinking… pulling the thread.</p>`; $("#asLog").append(bubble); $("#asLog").scrollTop = 1e9;
    $("#asStop").hidden = false; ctl = new AbortController();
    const myNotes = notes(sid).slice(-12).map(n => `- (${NOTE_KINDS[n.kind][0]}) ${n.text}`).join("\n");
    const sys = `You are ${AI} (Hindi for "thread"), the research companion inside ${BRAND.name}, an Indian news investigation app for young readers. You're warm, direct, a little playful, never preachy. You are a research partner, not an oracle. Story file:\n${RS.caseContext(sid)}\n\nThe reader's own notes so far:\n${myNotes || "(none yet)"}\n\n${RS.EVIDENCE_RULES}\n\nFormatting: plain text, '## ' headings when the mode asks for sections, '- ' bullets, **bold** sparingly, no tables, no links.`;
    const hist = log.filter(m => !m.err).slice(-9, -1).map(m => ({ role: m.role, content: m.content.slice(0, 2500) })); const thisMode = mode;
    try {
      const { text, truncated } = await ai([{ role: "user", content: sys }, ...hist, { role: "user", content: `[Mode: ${MODES[thisMode][0]}] ${MODES[thisMode][2]}\n\nQuestion: ${q}` }], { cache: false, signal: ctl.signal, modelTier: thisMode === "quick" || thisMode === "kids" ? "quick" : "default", onText: ({ text }) => { bubble.innerHTML = `<span class="who">${AI} · ${MODES[thisMode][0]}</span>${md(text)}`; $("#asLog").scrollTop = 1e9; } });
      log.push({ role: "assistant", content: text + (truncated ? "\n\n(Cut short. Ask for one section at a time.)" : ""), mode: thisMode }); sig("ai");
    } catch (e) {
      if (e.code === "cancelled") { if (e.text) log.push({ role: "assistant", content: e.text + "\n\n(Stopped.)", mode: thisMode }); }
      else { if (e.text) log.push({ role: "assistant", content: e.text, mode: thisMode }); log.push({ role: "assistant", content: RS.aiErr(e.code), err: true }); if (RS.aiFatal(e.code)) RS.killAi(); }
    }
    store.set(key, log); busy = false; ctl = null; $("#asStop").hidden = true; if (SID === sid) renderLog(); aiState();
  }
  RS.askPrefill = t => { const i = $("#asInput"); if (i) { i.value = t; i.focus(); } };
  RS.setMode = m => { if (MODES[m]) { mode = m; if ($("#asModes")) renderModes(); } };

  /* ================= WRITE MY ARTICLE (wizard) ================= */
  const ANG = ["Explainer", "My opinion", "Investigation", "Myth vs evidence", "Human story"];
  const AUD = ["Gen Z readers", "Everyone", "Students", "My followers"];
  function openWizard() {
    const nn = notes(SID), s = RS.story(SID);
    const wz = $("#wizard"); wz.hidden = false; $("#scrim").hidden = false;
    wz.innerHTML = `<header><div><span class="eyebrow">Write my article · ${esc(s.title)}</span><h2 class="display" style="font-size:34px">Tell ${AI} how you want it</h2></div><button class="btn sm flat" type="button" id="wzX">Close</button></header>
      <div class="wz-body">
        <div class="wz-sum"><b>${nn.length}</b> notes and events from you will be used${nn.length ? "" : `. You have none yet, so the draft will lean on the story file. Add a few notes first for an article that sounds like you`}.</div>
        <div class="field"><label>Angle</label><div class="tabs" id="wzAng">${ANG.map((a, i) => `<button type="button" aria-pressed="${i === 0}">${a}</button>`).join("")}</div></div>
        <div class="field"><label>Who's it for?</label><div class="tabs" id="wzAud">${AUD.map((a, i) => `<button type="button" aria-pressed="${i === 0}">${a}</button>`).join("")}</div></div>
        <div class="grid2"><div class="field"><label for="wzLen">Length</label><select id="wzLen"><option value="450">Short (~450 words)</option><option value="800" selected>Medium (~800 words)</option><option value="1200">Long (~1,200 words)</option></select></div>
          <div class="field"><label for="wzLang">Language</label><select id="wzLang"><option>English</option><option>Hinglish</option><option>Hindi</option></select></div></div>
        <div class="field"><label for="wzTake">Your take, in a line or two (optional)</label><textarea id="wzTake" placeholder="e.g. A full re-test isn't fair until someone proves the leak spread beyond two centres."></textarea></div>
        <p class="status muted" id="wzStatus"></p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn r" type="button" id="wzAI">✍ Write it with ${AI}</button><button class="btn" type="button" id="wzPlain">Build a draft from my notes (no AI)</button></div>
        <p class="mono muted" style="font-size:11.5px">You'll get an editable draft. Your opinions stay marked as yours; facts keep their sources. Nothing is published until you press Publish.</p></div>`;
    const pick = id => $$("#" + id + " button").forEach(b => b.onclick = () => $$("#" + id + " button").forEach(x => x.setAttribute("aria-pressed", x === b)));
    pick("wzAng"); pick("wzAud");
    const close = () => { wz.hidden = true; $("#scrim").hidden = true; };
    $("#wzX").onclick = close;
    const sel = id => $(`#${id} [aria-pressed="true"]`).textContent;
    $("#wzAI").disabled = !RS.ai();
    if (!RS.ai()) $("#wzStatus").textContent = `${AI} is off here (works when opened in Claude), so use the notes-based draft.`;
    $("#wzPlain").onclick = () => { close(); RS.openEditor(plainDraft(sel("wzAng"), $("#wzTake").value.trim())); };
    $("#wzAI").onclick = async () => {
      const ai = RS.ai(); if (!ai) return; $("#wzAI").disabled = true; $("#wzStatus").textContent = `${AI} is writing your draft… this can take a minute.`;
      const myNotes = nn.map(n => `- [${NOTE_KINDS[n.kind][0]}${n.date ? ", " + n.date : ""}] ${n.text}${n.where ? " (source: " + n.where + ")" : ""}${n.src?.length ? " " + n.src.map(x => "[" + x + "]").join("") : ""}`).join("\n");
      try {
        const r = await ai.json(`Write a publishable draft article IN THE AUTHOR'S VOICE for their personal publication on ${BRAND.name}.
Angle: ${sel("wzAng")}. Audience: ${sel("wzAud")}. Language: ${$("#wzLang").value}. About ${$("#wzLen").value} words.
Author's take: ${$("#wzTake").value.trim() || "(none given; don't invent one)"}
Author's notes (the backbone of the piece; use them first):
${myNotes || "(no notes)"}
Story file for facts: ${RS.caseContext(SID)}
${RS.EVIDENCE_RULES}
Extra rules: the author's opinions must appear as the author's view ("I think…", "In my view…"), never as fact. Facts keep their [S#] citations. Don't invent quotes, numbers or people. Flag anything from the author's notes that has no source by appending " (needs a source)".
Reply with only JSON: {"title":"","subtitle":"","sections":[{"heading":"","paragraphs":[""]}],"verify":["claims the author should check before publishing"]}`, { modelTier: "default" });
        if (!r || !r.title || !Array.isArray(r.sections)) throw { code: "invalid_json" };
        close(); RS.openEditor({ storyId: SID, title: r.title, subtitle: r.subtitle || "", html: r.sections.map(s => `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ""}${(s.paragraphs || []).map(p => `<p>${linkCites(p)}</p>`).join("")}`).join("") + (r.verify?.length ? `<aside class="verifybox"><b>Check before publishing</b><ul>${r.verify.map(v => `<li>${esc(v)}</li>`).join("")}</ul></aside>` : ""), aiDraft: true });
      } catch (e) { $("#wzStatus").textContent = RS.aiErr(e.code); $("#wzAI").disabled = !RS.ai(); if (RS.aiFatal(e.code)) RS.killAi(); }
    };
  }
  const linkCites = p => esc(p).replace(/\[(S\d{1,2})\]/g, (m, id) => C.sources[id] ? cite(id) : "").replace(/\(needs a source\)/g, `<mark class="needsrc">needs a source</mark>`);
  function plainDraft(angle, take) {
    const nn = notes(SID), s = RS.story(SID), by = k => nn.filter(n => n.kind === k);
    const li = arr => `<ul>${arr.map(n => `<li>${esc(n.text)} ${cites(n.src)}${!n.src?.length && !n.where && n.kind !== "opinion" && n.kind !== "question" ? ` <mark class="needsrc">needs a source</mark>` : n.where ? ` <span class="mono muted">(${esc(n.where)})</span>` : ""}</li>`).join("")}</ul>`;
    const events = by("event"), facts = by("fact"), quotes = by("quote"), qs = by("question"), ops = by("opinion");
    const html = `<p>${esc(s.sum[0])}</p>${take ? `<p><b>My take:</b> ${esc(take)}</p>` : ""}`
      + (events.length || SID === "genz" ? `<h2>How it unfolded</h2>${events.length ? li(events) : `<ul>${C.timeline.slice(1, 6).map(t => `<li>${esc(t.d)}: ${esc(t.t)} ${cites(t.src)}</li>`).join("")}</ul>`}` : "")
      + (facts.length ? `<h2>What I found</h2>${li(facts)}` : "") + (quotes.length ? `<h2>What people are claiming</h2>${li(quotes)}` : "")
      + (ops.length ? `<h2>What I think</h2>${ops.map(o => `<p>${esc(o.text)}</p>`).join("")}` : "") + (qs.length ? `<h2>What I still want answered</h2>${li(qs)}` : "");
    return { storyId: SID, title: (angle === "My opinion" ? "My take on " : "What I found about ") + s.title.charAt(0).toLowerCase() + s.title.slice(1), subtitle: `Notes, sources and questions from my investigation on ${BRAND.name}.`, html };
  }
  RS.storyNotes = notes; RS.NOTE_KINDS = NOTE_KINDS;
  window.addEventListener("resize", () => { if (!$("#v-investigate")?.hidden && TAB === "map") applyTf(); });
})();
