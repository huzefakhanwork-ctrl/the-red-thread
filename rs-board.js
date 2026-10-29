/* THE REAL SCROLL — News Whiteboard (with AI commands) + Publish-as-story flow. */
(function () {
  const { $, $$, esc, store, st, cites, toast, sig, show } = RS;
  const C = CASE;
  const LABEL = { claim: "Claim", evidence: "Evidence", question: "Open question", event: "Event", person: "Person / institution", source: "Source", sticky: "Sticky note", note: "Note", heading: "Heading", zone: "Zone" };
  const ADDABLE = ["sticky", "claim", "evidence", "question", "event", "person", "note", "heading"];

  let B = store.get("board", null) || { objs: [], links: [], strokes: [], view: { x: 40, y: 30, k: .7 } };
  let sel = new Set(), tool = "select", connectFrom = null, hist = [], fut = [], clip = [], mounted = false, editing = null;
  const uid = () => "o" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const snapshot = () => JSON.stringify({ objs: B.objs, links: B.links, strokes: B.strokes });
  function snap() { hist.push(snapshot()); if (hist.length > 80) hist.shift(); fut = []; updUndo(); }
  function restore(s) { const o = JSON.parse(s); B.objs = o.objs; B.links = o.links; B.strokes = o.strokes; sel.clear(); save(); render(); }
  function undo() { if (!hist.length) return; fut.push(snapshot()); restore(hist.pop()); updUndo(); }
  function redo() { if (!fut.length) return; hist.push(snapshot()); restore(fut.pop()); updUndo(); }
  function updUndo() { if (!mounted) return; $("#wbUndo").disabled = !hist.length; $("#wbRedo").disabled = !fut.length; }
  let saveT;
  function save() {
    store.set("board", B);
    if (B.objs.filter(o => !["heading", "zone"].includes(o.type)).length >= 5) sig("board");
    if (mounted) { $("#wbSaved").textContent = "Saving…"; clearTimeout(saveT); saveT = setTimeout(() => $("#wbSaved").textContent = "Saved · private to you", 300); }
  }

  /* ---------- add helpers ---------- */
  function freeSpot() {
    if (!mounted || !$("#wb").clientWidth) { const n = B.objs.length; return { x: 60 + (n % 6) * 250, y: 1700 + Math.floor(n / 6) * 200 }; }
    const wb = $("#wb"), v = B.view; const cx = (wb.clientWidth / 2 - v.x) / v.k, cy = (wb.clientHeight / 2 - v.y) / v.k;
    const n = B.objs.length % 5; return { x: Math.round(cx - 110 + n * 24), y: Math.round(cy - 60 + n * 24) };
  }
  function addObj(o, noSnap) {
    if (!noSnap) snap();
    const p = (o.x == null) ? freeSpot() : { x: o.x, y: o.y };
    const obj = { id: o.id || uid(), type: LABEL[o.type] ? o.type : "sticky", x: p.x, y: p.y, title: String(o.title || ""), text: String(o.text || ""), src: (o.src || []).filter(s => C.sources[s]), w: o.w, h: o.h, mine: o.mine ?? !(o.src && o.src.length) };
    B.objs.push(obj); return obj;
  }
  RS.boardAdd = o => { addObj(o); save(); if (mounted) render(); };
  const link = (from, to, label) => B.links.push({ id: uid(), from, to, label: label || "" });

  /* ---------- templates ---------- */
  function originX() { return B.objs.length ? Math.max(...B.objs.map(o => o.x + (o.w || 240))) + 160 : 40; }
  const claimObj = (x, X, Y) => addObj({ type: "claim", x: X, y: Y, title: x.text, text: `${x.who}, ${x.when}. Status: ${st_plain(x.st)}.`, src: [...x.src, ...x.counterSrc] }, true);
  const st_plain = k => ({ verified: "Verified", partial: "Partially supported", disputed: "Disputed", unverified: "Unverified", misleading: "Misleading without context", prediction: "Prediction" }[k] || k);
  const evObj = (s, X, Y) => addObj({ type: s === "S3" ? "source" : "evidence", x: X, y: Y, title: C.sources[s].title, text: C.sources[s].ex, src: [s] }, true);
  const TEMPLATES = {
    story: ["Investigative story (import the case)", () => {
      const ox = originX(); const ids = {};
      addObj({ type: "heading", x: ox, y: 30, title: C.title, mine: false }, true);
      addObj({ type: "sticky", x: ox, y: 130, title: "What happened", text: C.happened.slice(0, 220) + "…", src: ["S4", "S8"] }, true);
      addObj({ type: "zone", x: ox, y: 330, w: 11 * 240 + 30, h: 250, title: "Timeline", mine: false }, true);
      C.timeline.forEach((t, i) => addObj({ type: "event", x: ox + 20 + i * 240, y: 380, title: t.t, text: `${t.d}${t.rep && t.rep !== t.d ? " · reported " + t.rep : ""} · ${st_plain(t.st)}`, src: t.src }, true));
      addObj({ type: "zone", x: ox, y: 620, w: 6 * 240 + 30, h: 240, title: "People & institutions", mine: false }, true);
      C.people.forEach((p, i) => addObj({ type: "person", x: ox + 20 + i * 240, y: 670, title: p.n, text: p.pos, src: p.src }, true));
      addObj({ type: "zone", x: ox, y: 900, w: 6 * 240 + 30, h: 520, title: "Claims and evidence", mine: false }, true);
      C.claims.forEach((x, i) => { ids[x.id] = claimObj(x, ox + 20 + i * 240, 950).id; });
      [["S4", "C5", "backed by"], ["S6", "C3", "contradicts"], ["S8", "C2", "source"]].forEach(([s, c], i) => { const e = evObj(s, ox + 260 + i * 400, 1200); link(ids[c], e.id, [["S4", "C5", "backed by"], ["S6", "C3", "contradicted by"], ["S8", "C2", "source"]][i][2]); });
      link(ids.C1, ids.C2, "conflicts with");
      addObj({ type: "zone", x: ox, y: 1460, w: 5 * 240 + 30, h: 240, title: "Open questions", mine: false }, true);
      C.questions.forEach((q, i) => addObj({ type: "question", x: ox + 20 + i * 240, y: 1510, title: q, mine: false }, true));
      return { x: ox, y: 30 };
    }],
    two: ["Two-sided argument", () => {
      const ox = originX();
      addObj({ type: "heading", x: ox, y: 30, title: "Students vs the agency: what each side says", mine: false }, true);
      addObj({ type: "zone", x: ox, y: 140, w: 520, h: 700, title: "Exam Nyay Manch says", mine: false }, true);
      addObj({ type: "zone", x: ox + 560, y: 140, w: 300, h: 700, title: "Evidence", mine: false }, true);
      addObj({ type: "zone", x: ox + 900, y: 140, w: 520, h: 700, title: "Testing agency says", mine: false }, true);
      const a = claimObj(C.claims[0], ox + 20, 200), b = claimObj(C.claims[3], ox + 260, 200);
      const c = claimObj(C.claims[1], ox + 920, 200);
      addObj({ type: "claim", x: ox + 1160, y: 200, title: "No evidence of a systemic leak", text: "Agency statement, 16 Sep.", src: ["S2"] }, true);
      const e1 = evObj("S3", ox + 580, 200), e2 = evObj("S8", ox + 580, 430), e3 = evObj("S4", ox + 580, 640);
      link(a.id, e1.id, "relies on"); link(c.id, e2.id, "relies on"); link(b.id, e3.id, "context");
      addObj({ type: "sticky", x: ox + 20, y: 560, title: "Strongest case for a full re-test?", text: "Write it in your own words.", mine: true }, true);
      addObj({ type: "sticky", x: ox + 920, y: 560, title: "Strongest case for a targeted re-test?", text: "Write it in your own words.", mine: true }, true);
      return { x: ox, y: 30 };
    }],
    timeline: ["Timeline of events", () => {
      const ox = originX();
      addObj({ type: "heading", x: ox, y: 30, title: "How it unfolded", mine: false }, true);
      let prev = null;
      C.timeline.forEach((t, i) => { const o = addObj({ type: "event", x: ox + i * 250, y: 160 + (i % 2) * 200, title: t.t, text: `${t.d} · ${st_plain(t.st)}`, src: t.src }, true); if (prev) link(prev, o.id, ""); prev = o.id; });
      return { x: ox, y: 30 };
    }],
    myth: ["Myth vs evidence", () => {
      const ox = originX();
      addObj({ type: "heading", x: ox, y: 30, title: "What's circulating vs what the evidence shows", mine: false }, true);
      addObj({ type: "zone", x: ox, y: 150, w: 520, h: 560, title: "What's circulating", mine: false }, true);
      addObj({ type: "zone", x: ox + 620, y: 150, w: 520, h: 560, title: "What the evidence shows", mine: false }, true);
      const m1 = claimObj(C.claims[2], ox + 30, 210), m2 = claimObj(C.claims[0], ox + 30, 460);
      const e1 = evObj("S6", ox + 650, 210), e2 = evObj("S8", ox + 650, 460);
      link(m1.id, e1.id, "contradicted by"); link(m2.id, e2.id, "disputed by");
      return { x: ox, y: 30 };
    }],
    benefit: ["Who benefits, and how?", () => {
      const ox = originX();
      addObj({ type: "heading", x: ox, y: 30, title: "Who gains or loses under each outcome?", mine: false }, true);
      C.people.slice(0, 6).forEach((p, i) => {
        const x = ox + (i % 3) * 420, y = 150 + Math.floor(i / 3) * 420;
        addObj({ type: "zone", x, y, w: 390, h: 380, title: p.n, mine: false }, true);
        addObj({ type: "person", x: x + 20, y: y + 60, title: p.n, text: p.pos, src: p.src }, true);
        addObj({ type: "question", x: x + 20, y: y + 220, title: "What would they gain or risk? What's the evidence?", mine: true }, true);
      });
      addObj({ type: "note", x: ox, y: 1000, title: "Questions, not conclusions. Fill in only what you can source.", mine: true }, true);
      return { x: ox, y: 30 };
    }],
    reel: ["60-second reel", () => {
      const ox = originX();
      addObj({ type: "heading", x: ox, y: 30, title: "Reel plan: 60 seconds", mine: false }, true);
      [["Hook · 0–5s", "One line that makes people stop."], ["Context · 5–20s", "What happened, with one source on screen."], ["Evidence · 20–45s", "The claim and what backs or contradicts it."], ["Question · 45–60s", "Leave viewers with what's still unknown."]].forEach(([t, d], i) => {
        addObj({ type: "zone", x: ox + i * 300, y: 140, w: 280, h: 480, title: t, mine: false }, true);
        addObj({ type: "sticky", x: ox + i * 300 + 40, y: 200, title: d, mine: true }, true);
      });
      return { x: ox, y: 30 };
    }]
  };
  function applyTemplate(k) {
    snap(); const at = TEMPLATES[k][1](); save(); render();
    B.view.k = .55; B.view.x = 40 - at.x * B.view.k; B.view.y = 30 - at.y * B.view.k; applyView();
    toast(`Added: ${TEMPLATES[k][0]}`, "Undo", undo);
  }

  /* ---------- paste a link: build a starter board from a Red Thread story/post or any news link ---------- */
  const rowOf = (title, items, type, ox, y, per = 5) => { // a zone holding a row (or rows) of cards; returns the y below it
    if (!items.length) return y;
    const rows = Math.ceil(items.length / per), w = Math.min(items.length, per) * 240 + 30, h = rows * 190 + 70;
    addObj({ type: "zone", x: ox, y, w, h, title, mine: false }, true);
    const objs = items.map((it, i) => addObj({ type: it.type || type, x: ox + 20 + (i % per) * 240, y: y + 50 + Math.floor(i / per) * 190, title: String(it.title || "").slice(0, 160), text: String(it.text || "").slice(0, 300), src: it.src || [], mine: !!it.mine }, true));
    rowOf.last = objs; return y + h + 40;
  };
  const QS = ["Who is affected, and how many people?", "What do official records or documents say?", "Who hasn't been heard from yet?", "What would change my mind?"];
  function parseLink(raw) {
    const s = String(raw || "").trim(); if (!s) return null;
    const m = s.match(/#(story|post)-([\w-]+)/) || s.match(/^(story|post):([\w-]+)$/);
    if (m) return { kind: m[1], id: m[2] };
    let u; try { u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s); } catch { return null; }
    if (!/\./.test(u.hostname)) return null;
    const host = u.hostname.replace(/^www\.|^m\.|^amp\./, ""), parts = u.pathname.split("/").filter(Boolean);
    const slug = [...parts].reverse().find(p => /[a-z]{3,}-[a-z]{2,}/i.test(p.replace(/\.(cms|html?|php|ece)$/i, ""))) || "";
    const headline = slug.replace(/\.(cms|html?|php|ece)$/i, "").replace(/-\d{7,}.*$|\d{7,}/g, "").split("-").filter(w => w && !/^\d{7,}$/.test(w)).join(" ").replace(/\b(\w)(\w*)/g, (m, a, b, i) => (i && /^(a|an|the|of|in|on|to|for|and|or|at|by|from|with|as)$/i.test(m)) ? m.toLowerCase() : a.toUpperCase() + b);
    const dm = u.pathname.match(/(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})/), date = dm ? new Date(+dm[1], +dm[2] - 1, +dm[3]).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
    const KNOWN = { thehindu: "The Hindu", indianexpress: "The Indian Express", hindustantimes: "Hindustan Times", timesofindia: "The Times of India", indiatimes: "The Times of India", ndtv: "NDTV", thewire: "The Wire", scroll: "Scroll", theprint: "ThePrint", livemint: "Mint", deccanherald: "Deccan Herald", news18: "News18", indiatoday: "India Today", thequint: "The Quint", newslaundry: "Newslaundry", altnews: "Alt News", bbc: "BBC", reuters: "Reuters", aljazeera: "Al Jazeera", theguardian: "The Guardian", nytimes: "The New York Times", telegraphindia: "The Telegraph", economictimes: "The Economic Times", business_standard: "Business Standard", "business-standard": "Business Standard", thenewsminute: "The News Minute", firstpost: "Firstpost", republicworld: "Republic", zeenews: "Zee News", aajtak: "Aaj Tak", abplive: "ABP Live", moneycontrol: "Moneycontrol" };
    const known = host.split(".").map(x => KNOWN[x]).find(Boolean);
    const outlet = known || host.split(".").slice(-3).filter(x => !/^(com|co|in|org|net|news)$/.test(x)).join(" ").replace(/\b\w/g, c => c.toUpperCase()) || host;
    return { kind: "web", url: u.href, host, outlet, headline, date };
  }
  function boardFromStory(s) {
    if (s.dossier) return TEMPLATES.story[1]();
    const ox = originX(), p = RS.share(s), tot = Object.values(s.cov).reduce((a, b) => a + b, 0);
    addObj({ type: "heading", x: ox, y: 30, title: s.title, mine: false }, true);
    addObj({ type: "sticky", x: ox, y: 120, w: 520, title: `${s.place} · ${s.cat} · ${s.time}`, text: `Coverage: ${tot} articles · Left ${p.l}% · Centre ${p.c}% · Right ${p.r}%. Story from The Red Thread (illustrative).`, mine: false }, true);
    let y = 300;
    y = rowOf("What we know", s.sum.map(t => ({ title: t, type: "event" })), "event", ox, y);
    const L = rowOf("How the left frames it", [{ title: s.hl.L, text: "Left-leaning headline", type: "claim" }, ...s.L.map(t => ({ title: t, type: "note" }))], "note", ox, y);
    rowOf("How the right frames it", [{ title: s.hl.R, text: "Right-leaning headline", type: "claim" }, ...s.R.map(t => ({ title: t, type: "note" }))], "note", ox + 3 * 240 + 70, y);
    y = Math.max(L, y + 300);
    y = rowOf("Centre / neutral framing", [{ title: s.hl.C, text: "Centre headline", type: "claim" }], "claim", ox, y);
    rowOf("Open questions", QS.map(t => ({ title: t, type: "question" })), "question", ox, y);
    return { x: ox, y: 30 };
  }
  function boardFromPost(p) {
    const ox = originX(), tmp = document.createElement("div"); tmp.innerHTML = p.body || "";
    const lines = [...tmp.querySelectorAll("li, p")].map(x => ({ t: x.textContent.replace(/\s*S\d{1,2}\s*/g, " ").replace(/\s+/g, " ").trim(), s: [...x.querySelectorAll(".cite")].map(c => c.dataset.src).filter(id => C.sources[id]) })).filter(x => x.t.length > 25).slice(0, 10);
    const srcs = [...new Set(lines.flatMap(x => x.s))];
    addObj({ type: "heading", x: ox, y: 30, title: p.title, mine: false }, true);
    if (p.dek) addObj({ type: "sticky", x: ox, y: 120, w: 520, title: p.dek, text: `${RS.pubOf(p).name} · ${p.date || ""}`, mine: false }, true);
    let y = 300;
    y = rowOf("Key points from the article", lines.map(x => ({ title: x.t, type: x.s.length ? "evidence" : "claim", src: x.s })), "claim", ox, y);
    y = rowOf("Sources it cites", srcs.map(sid => ({ title: C.sources[sid].title, text: C.sources[sid].ex, type: "source", src: [sid] })), "source", ox, y);
    rowOf("Open questions", QS.map(t => ({ title: t, type: "question" })), "question", ox, y);
    return { x: ox, y: 30 };
  }
  function scanText(text) { // no AI: sort sentences into claims, facts, notes
    const sents = String(text).replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z"'“])/).map(x => x.trim()).filter(x => x.length > 30 && x.length < 320);
    const claims = [], facts = [], people = [], dates = [];
    sents.forEach(x => {
      if (/\b(said|says|claimed|claims|alleged|alleges|according to|told|accused|denied|argued)\b|["“]/i.test(x)) claims.push(x);
      else if (/\d/.test(x)) facts.push(x);
      const dm = x.match(/\b(\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))\b/);
      if (dm && dates.length < 6) dates.push({ title: x.slice(0, 150), text: dm[0] });
    });
    const nm = String(text).match(/\b(?:[A-Z][a-z]+ ){1,2}(?:Ministry|Police|Court|Commission|Board|Agency|Department|Government|Party|Union|Council|University)\b|\b(?:Mr|Ms|Mrs|Dr|Prof)\.? [A-Z][a-z]+(?: [A-Z][a-z]+)?/g) || [];
    [...new Set(nm)].slice(0, 6).forEach(n => people.push({ title: n }));
    return { claims: claims.slice(0, 8).map(t => ({ title: t })), facts: facts.slice(0, 8).map(t => ({ title: t })), people, timeline: dates, questions: [] };
  }
  async function boardFromWeb(L, text) {
    let d = null, how = "";
    if (text && text.trim().length > 80) {
      const ai = RS.ai();
      if (ai) {
        try {
          d = await ai.json(`Turn this news article into a research whiteboard. Use ONLY the article text below; never add facts from elsewhere. Keep each item under 25 words. Separate claims (what someone says, with who says it) from facts the article states as established. Suggest open questions a careful reader should check.
Article URL: ${L.url}
Article text:
"""${text.slice(0, 12000)}"""
Reply with only JSON: {"headline":"","summary":"","claims":[{"text":"","by":""}],"facts":[""],"people":[{"name":"","role":""}],"timeline":[{"date":"","event":""}],"questions":[""]}`, { modelTier: "default" });
          if (d && d.headline != null) { d = { headline: d.headline, summary: d.summary, claims: (d.claims || []).slice(0, 10).map(c => ({ title: c.text, text: c.by ? "Said by " + c.by : "" })), facts: (d.facts || []).slice(0, 10).map(t => ({ title: t })), people: (d.people || []).slice(0, 8).map(p => ({ title: p.name, text: p.role })), timeline: (d.timeline || []).slice(0, 10).map(t => ({ title: t.event, text: t.date })), questions: (d.questions || []).slice(0, 6).map(t => ({ title: t })) }; how = `${RS.AI} read the text you pasted`; }
          else d = null;
        } catch (e) { d = null; if (e && RS.aiFatal(e.code)) RS.killAi(); }
      }
      if (!d) { d = scanText(text); how = "sorted from the text you pasted (turn on Dhaga for a smarter board)"; }
    }
    const ox = originX();
    addObj({ type: "heading", x: ox, y: 30, title: (d && d.headline) || L.headline || "News article from " + L.outlet, mine: false }, true);
    addObj({ type: "source", x: ox, y: 120, w: 520, title: `${L.outlet}${L.date ? " · " + L.date : ""}`, text: L.url + ((d && d.summary) ? "\n\n" + d.summary : ""), mine: false }, true);
    let y = 330;
    const blank = (t, n) => Array.from({ length: n }, () => ({ title: t, mine: true }));
    y = rowOf("Claims (who says what)", d && d.claims.length ? d.claims.map(c => ({ ...c, type: "claim" })) : blank("Write the article's main claim, and who makes it", 2), "claim", ox, y);
    y = rowOf("Facts the article states", d && d.facts.length ? d.facts.map(c => ({ ...c, type: "evidence" })) : blank("A fact you can check (number, date, document)", 2), "evidence", ox, y);
    const yp = rowOf("People & institutions", d && d.people.length ? d.people.map(c => ({ ...c, type: "person" })) : blank("Who is involved?", 2), "person", ox, y, 4);
    rowOf("Timeline", d && d.timeline.length ? d.timeline.map(c => ({ ...c, type: "event" })) : blank("When did it happen?", 2), "event", ox + 4 * 240 + 70, y, 4);
    y = Math.max(yp, y + 280);
    rowOf("Open questions", (d && d.questions.length ? d.questions : QS.map(t => ({ title: t }))).map(c => ({ ...c, type: "question" })), "question", ox, y);
    return { at: { x: ox, y: 30 }, how };
  }
  async function buildFromLink(raw, text) {
    const L = parseLink(raw); const msg = $("#wbLinkMsg");
    if (!L) { msg.textContent = "That doesn't look like a link. Paste a full news URL, or a Red Thread story link."; return; }
    let at, how = "";
    snap();
    if (L.kind === "story") { const s = RS.story(L.id); if (!s) { msg.textContent = "That Red Thread story isn't in this browser."; hist.pop(); updUndo(); return; } at = boardFromStory(s); how = "from the Red Thread story"; }
    else if (L.kind === "post") { const p = RS.allPosts().find(x => x.id === L.id); if (!p) { msg.textContent = "That post isn't available here yet. Open it once in Publications, then try again."; hist.pop(); updUndo(); return; } at = boardFromPost(p); how = "from the Red Thread article"; }
    else { msg.textContent = text && text.trim().length > 80 && RS.ai() ? `${RS.AI} is reading the article…` : "Building…"; const r = await boardFromWeb(L, text); at = r.at; how = r.how || "from the link (paste the article text for a fuller board)"; }
    save(); render();
    B.view.k = .55; B.view.x = 40 - at.x * B.view.k; B.view.y = 30 - at.y * B.view.k; applyView();
    $("#wbLinkBox").hidden = true; toast(`Board built ${how}. Now make it yours.`, "Undo", undo);
  }

  /* ---------- render ---------- */
  function objHtml(o) {
    const isSel = sel.has(o.id), isC = connectFrom === o.id;
    const size = o.type === "zone" ? `width:${o.w || 400}px;height:${o.h || 300}px;` : o.w ? `width:${o.w}px;` : "";
    const tag = o.src.length ? "sourced" : o.mine ? "your note" : "";
    return `<div class="obj ${o.type}${isSel ? " sel" : ""}${isC ? " csrc" : ""}" data-id="${o.id}" style="left:${o.x}px;top:${o.y}px;${size}${o.type === "zone" ? "z-index:0" : ""}">
      <div class="oh"><span>${LABEL[o.type]}</span><span>${tag}</span></div>
      <div class="ob"><div class="ot">${esc(o.title) || "<span style='opacity:.5'>Double-click to write</span>"}</div>${o.text ? `<div class="ox">${esc(o.text)}</div>` : ""}${o.src.length ? `<div class="osrc">Source ${cites(o.src)}</div>` : ""}</div></div>`;
  }
  function render() {
    if (!mounted) return;
    const zones = B.objs.filter(o => o.type === "zone"), rest = B.objs.filter(o => o.type !== "zone");
    $("#wObjs").innerHTML = [...zones, ...rest].map(objHtml).join("");
    drawLinks();
    $("#wbEmpty").hidden = B.objs.length > 0;
    $("#wbDel").disabled = !sel.size;
    $("#wbCount").textContent = `${B.objs.length} items · ${B.links.length} links`;
  }
  function drawLinks() {
    const g = $("#wLinks"); const el = id => $(`.obj[data-id="${id}"]`, $("#wObjs"));
    const center = id => { const e = el(id); return e ? [e.offsetLeft + e.offsetWidth / 2, e.offsetTop + e.offsetHeight / 2] : null; };
    g.innerHTML = B.strokes.map(s => `<path class="ink" d="${s.d}"/>`).join("") + B.links.map(l => {
      const a = center(l.from), b = center(l.to); if (!a || !b) return "";
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 30, w = l.label.length * 7 + 12;
      return `<path class="link" d="M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}" marker-end="url(#arr)"/>${l.label ? `<rect class="lbg" x="${mx - w / 2}" y="${my + 4}" width="${w}" height="18"/><text class="lt" x="${mx}" y="${my + 17}" text-anchor="middle">${esc(l.label)}</text>` : ""}`;
    }).join("");
  }
  function applyView() { if (!mounted) return; const v = B.view; $("#world").style.transform = `translate(${v.x}px,${v.y}px) scale(${v.k})`; }
  function fitBoard() {
    const wb = $("#wb"); if (!B.objs.length || !wb.clientWidth) return;
    const minX = Math.min(...B.objs.map(o => o.x)), minY = Math.min(...B.objs.map(o => o.y)), maxX = Math.max(...B.objs.map(o => o.x + (o.w || 240))), maxY = Math.max(...B.objs.map(o => o.y + (o.h || 180)));
    const k = Math.min(wb.clientWidth / (maxX - minX + 80), wb.clientHeight / (maxY - minY + 80), 1);
    B.view = { k, x: (wb.clientWidth - (maxX + minX) * k) / 2, y: (wb.clientHeight - (maxY + minY) * k) / 2 }; applyView(); save();
  }
  function setTool(t) { tool = t; connectFrom = null; $$("[data-tool]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tool === t)); const wb = $("#wb"); wb.className = "wb " + (t === "select" ? "" : t); $("#wbHint").textContent = HINTS[t]; render(); }
  const HINTS = { select: "Drag to move · Shift-click to multi-select · Double-click to edit · Drag the background to pan", pan: "Drag anywhere to pan · Scroll to zoom", pen: "Draw freehand annotations", connect: "Click one item, then another, to connect them" };

  /* ---------- view ---------- */
  RS.V.board = {
    mount(el) {
      el.innerHTML = `<div class="board-grid">
        <div class="board-main">
          <div class="wb-tools" role="toolbar" aria-label="Whiteboard tools">
            <button class="tool" type="button" data-tool="select" aria-pressed="true">Select</button><button class="tool" type="button" data-tool="pan" aria-pressed="false">Hand</button><button class="tool" type="button" data-tool="pen" aria-pressed="false">Pen</button><button class="tool" type="button" data-tool="connect" aria-pressed="false">Connect</button>
            <input id="linkLbl" class="search" style="width:110px;padding:4px 8px;font-size:13px" value="relates to" aria-label="Label for new connections">
            <span class="tsep"></span>
            <select id="wbAdd" aria-label="Add an item"><option value="">+ Add item</option>${ADDABLE.map(t => `<option value="${t}">${LABEL[t]}</option>`).join("")}</select>
            <button class="tool linktool" type="button" id="wbLink">🔗 Paste a link</button>
            <select id="wbTpl" aria-label="Add a template"><option value="">Templates</option>${Object.entries(TEMPLATES).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join("")}</select>
            <span class="tsep"></span>
            <button class="tool" type="button" id="wbUndo" disabled title="Undo (Ctrl+Z)">Undo</button><button class="tool" type="button" id="wbRedo" disabled title="Redo (Ctrl+Y)">Redo</button><button class="tool" type="button" id="wbDel" disabled title="Delete (Del)">Delete</button>
            <span class="tsep"></span>
            <button class="tool" type="button" id="wbOut" aria-label="Zoom out">−</button><button class="tool" type="button" id="wbFit">Fit</button><button class="tool" type="button" id="wbIn" aria-label="Zoom in">+</button>
            <span class="tsep"></span>
            <button class="btn y sm" type="button" id="wbPublish">Publish as a story</button>
            <span class="wb-save"><span id="wbCount"></span> · <span id="wbSaved">Saved · private to you</span></span>
          </div>
          <div class="wb" id="wb" tabindex="0" aria-label="Whiteboard canvas">
            <div class="world" id="world"><svg aria-hidden="true"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#171717"/></marker></defs><g id="wLinks"></g><path id="wPen" class="ink" d=""/></svg><div id="wObjs"></div></div>
            <div id="wbEmpty" hidden style="position:absolute;inset:0;display:grid;place-items:center;padding:16px">
              <div style="background:var(--paper);border:2px solid var(--ink);box-shadow:6px 6px 0 var(--ink);padding:22px;max-width:460px;display:grid;gap:12px;color:var(--ink)">
                <span class="eyebrow">Your whiteboard · private</span><h2 class="display" style="font-size:38px">Lay out the story your way.</h2>
                <p>Import the case study's timeline, people, claims, evidence and open questions, then move, connect and annotate them. Imported items keep their sources. Nothing is published unless you choose to.</p>
                <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn k" type="button" data-tpl="story">Import the case study</button><button class="btn" type="button" data-tpl="two">Two-sided template</button><button class="btn" type="button" data-tpl="myth">Myth vs evidence</button><button class="btn y" type="button" id="wbLink2">🔗 Paste a news link</button></div>
              </div></div>
            <div class="wblink" id="wbLinkBox" hidden role="dialog" aria-label="Build a board from a link"><form id="wbLinkForm">
              <div class="wblink-h"><div><span class="eyebrow">New board from a link</span><b>Paste a news link</b></div><button type="button" class="pubx" id="wbLinkX" aria-label="Close">×</button></div>
              <input id="wbLinkIn" placeholder="https://… a news article, or a Red Thread story / post link" autocomplete="off" aria-label="Link">
              <details id="wbLinkMore"><summary>Add the article text (best for outside links)</summary><textarea id="wbLinkTxt" placeholder="This page can't open other websites, so copy the article's text and paste it here. Dhaga sorts it into claims, facts, people, a timeline and open questions."></textarea></details>
              <div class="wblink-try"><span class="muted">Try a Red Thread story:</span> ${["floods", "sand", "riders", "tram", "genz"].map(id => `<button type="button" class="chipx" data-try="story:${id}">${esc((RS.story(id) || {}).place || id)}</button>`).join("")}</div>
              <div class="wblink-f"><span id="wbLinkMsg" class="muted" aria-live="polite"></span><button class="btn y sm" type="submit">Build my board</button></div></form></div>
            <div class="wb-hint" id="wbHint">${HINTS.select}</div>
          </div>
        </div>
        <aside class="ai-panel" aria-label="AI board assistant">
          <div class="as-head"><span class="eyebrow">Board assistant</span><h2>Tell it what to arrange</h2><p id="wbAiStatus">Connecting to Claude…</p></div>
          <div class="body">
            <div class="cmds" id="wbCmds"></div>
            <div id="wbAiOut" aria-live="polite"></div>
          </div>
          <form class="as-form" id="wbAiForm"><textarea id="wbAiIn" placeholder="e.g. Put the government's claims on the left and the protesters' demands on the right" aria-label="Board command"></textarea>
            <div class="row" style="justify-content:space-between;align-items:center"><span class="note">It only adds or moves items, and every change can be undone.</span><button class="btn y sm" type="submit" id="wbAiGo">Run</button></div></form>
        </aside></div>`;
      mounted = true;
      $("#wbCmds").innerHTML = ["Create a timeline of the protest", "Separate verified facts from disputed claims", "Show which claims have supporting documents", "Suggest five questions I should investigate before publishing", "Find the missing evidence in my argument"].map(c => `<button type="button">${c}</button>`).join("");
      this.wire(el);
      RS.onAi(() => { const ok = !!RS.ai(); $("#wbAiStatus").textContent = !RS.aiReady() ? "Connecting to Claude…" : ok ? "Live AI. It changes the board only when you run a command." : "AI is off: it works when this page is opened in Claude. Templates and manual tools still work."; $("#wbAiGo").disabled = !ok; $$("#wbCmds button").forEach(b => b.disabled = !ok); });
    },
    show(arg) {
      requestAnimationFrame(() => {
        render(); applyView(); updUndo();
        if (arg === "import") { if (B.objs.some(o => o.type === "heading" && o.title === C.title)) { toast("The case study is already on your board"); fitBoard(); } else applyTemplate("story"); }
      });
    },
    wire(el) {
      const wb = $("#wb"), world = $("#world");
      el.addEventListener("click", e => { const t = e.target.closest("[data-tool]"); if (t) setTool(t.dataset.tool); const tp = e.target.closest("[data-tpl]"); if (tp) applyTemplate(tp.dataset.tpl); });
      $("#wbAdd").onchange = e => { const t = e.target.value; e.target.value = ""; if (!t) return; const o = addObj({ type: t, title: "", text: "", mine: true }); sel = new Set([o.id]); save(); render(); startEdit(o.id); };
      const openLink = (val = "") => { const box = $("#wbLinkBox"); box.hidden = false; $("#wbLinkMsg").textContent = ""; $("#wbLinkIn").value = val; $("#wbLinkTxt").value = ""; $("#wbLinkMore").open = false; setTimeout(() => $("#wbLinkIn").focus(), 30); };
      $("#wbLink").onclick = () => openLink(); $("#wbLink2").onclick = () => openLink();
      $("#wbLinkX").onclick = () => { $("#wbLinkBox").hidden = true; };
      $("#wbLinkIn").addEventListener("input", e => { const L = parseLink(e.target.value); if (L && L.kind === "web") { $("#wbLinkMore").open = true; $("#wbLinkMsg").textContent = `${L.outlet}${L.headline ? ": “" + L.headline + "”" : ""}`; } else $("#wbLinkMsg").textContent = L ? "Red Thread link: the board comes straight from our data." : ""; });
      $("#wbLinkBox").addEventListener("click", e => { const t = e.target.closest("[data-try]"); if (t) { $("#wbLinkIn").value = t.dataset.try; buildFromLink(t.dataset.try, ""); } });
      $("#wbLinkForm").addEventListener("submit", e => { e.preventDefault(); buildFromLink($("#wbLinkIn").value, $("#wbLinkTxt").value); });
      document.addEventListener("paste", e => { if ($("#v-board").hidden || e.target.closest("input, textarea, [contenteditable=true]")) return; const t = (e.clipboardData && e.clipboardData.getData("text")) || ""; if (/^\s*https?:\/\/\S+\s*$/.test(t)) { e.preventDefault(); openLink(t.trim()); toast("Link pasted: build a board from it?"); } });
      $("#wbTpl").onchange = e => { const t = e.target.value; e.target.value = ""; if (t) applyTemplate(t); };
      $("#wbUndo").onclick = undo; $("#wbRedo").onclick = redo; $("#wbDel").onclick = delSel;
      $("#wbIn").onclick = () => zoom(1.2); $("#wbOut").onclick = () => zoom(1 / 1.2); $("#wbFit").onclick = fitBoard;
      $("#wbPublish").onclick = () => { if (B.objs.filter(o => o.type !== "zone" && o.type !== "heading").length < 3) { toast("Add at least 3 items to the board before publishing"); return; } fmt = "article"; editMode = false; const dr = draft(); RS.openEditor({ storyId: "genz", title: dr.title, subtitle: dr.dek, html: renderDraft(dr).replace(/^<div class="body">/, "").replace(/<\/div>$/, "") }); };
      const toWorld = e => { const r = wb.getBoundingClientRect(); return [(e.clientX - r.left - B.view.x) / B.view.k, (e.clientY - r.top - B.view.y) / B.view.k]; };
      let d = null;
      wb.addEventListener("pointerdown", e => {
        if (e.target.closest("[contenteditable='true']") || e.target.closest(".cite") || e.target.closest("#wbEmpty")) return;
        const ob = e.target.closest(".obj"); wb.focus({ preventScroll: true });
        if (tool === "connect" && ob) {
          const id = ob.dataset.id;
          if (!connectFrom) { connectFrom = id; render(); }
          else if (connectFrom !== id) { snap(); link(connectFrom, id, $("#linkLbl").value.trim()); connectFrom = null; save(); render(); toast("Connected", "Undo", undo); }
          return;
        }
        if (tool === "pen") { const p = toWorld(e); d = { pen: [p] }; wb.setPointerCapture(e.pointerId); return; }
        if (ob && tool === "select") {
          const id = ob.dataset.id;
          if (e.shiftKey) { sel.has(id) ? sel.delete(id) : sel.add(id); render(); return; }
          if (!sel.has(id)) { sel = new Set([id]); render(); }
          d = { move: true, x: e.clientX, y: e.clientY, start: [...sel].map(i => { const o = B.objs.find(q => q.id === i); return [o, o.x, o.y]; }), before: snapshot(), moved: false };
          wb.setPointerCapture(e.pointerId); return;
        }
        d = { pan: true, x: e.clientX, y: e.clientY, vx: B.view.x, vy: B.view.y, moved: false }; wb.setPointerCapture(e.pointerId);
      });
      wb.addEventListener("pointermove", e => {
        if (!d) return;
        if (d.pen) { d.pen.push(toWorld(e)); $("#wPen").setAttribute("d", "M" + d.pen.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L")); return; }
        const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
        if (d.move && d.moved) { d.start.forEach(([o, x, y]) => { o.x = Math.round(x + dx / B.view.k); o.y = Math.round(y + dy / B.view.k); const n = $(`.obj[data-id="${o.id}"]`); if (n) { n.style.left = o.x + "px"; n.style.top = o.y + "px"; } }); drawLinks(); }
        if (d.pan && d.moved) { B.view.x = d.vx + dx; B.view.y = d.vy + dy; applyView(); }
      });
      const up = () => {
        if (!d) return;
        if (d.pen) { if (d.pen.length > 2) { snap(); B.strokes.push({ id: uid(), d: "M" + d.pen.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") }); save(); } $("#wPen").setAttribute("d", ""); drawLinks(); }
        if (d.move && d.moved) { hist.push(d.before); fut = []; updUndo(); save(); }
        if (d.pan) { if (!d.moved && sel.size) { sel.clear(); render(); } save(); }
        d = null;
      };
      wb.addEventListener("pointerup", up); wb.addEventListener("pointercancel", up);
      wb.addEventListener("wheel", e => { e.preventDefault(); const r = wb.getBoundingClientRect(); zoom(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      wb.addEventListener("dblclick", e => { const ob = e.target.closest(".obj"); if (ob && tool === "select") startEdit(ob.dataset.id); });
      document.addEventListener("keydown", e => {
        if ($("#v-board").hidden || editing || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
        const mod = e.ctrlKey || e.metaKey;
        if ((e.key === "Delete" || e.key === "Backspace") && sel.size) { e.preventDefault(); delSel(); }
        else if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
        else if (mod && e.key.toLowerCase() === "c" && sel.size) { clip = B.objs.filter(o => sel.has(o.id)).map(o => ({ ...o })); toast(`Copied ${clip.length} item${clip.length > 1 ? "s" : ""}`); }
        else if (mod && e.key.toLowerCase() === "v" && clip.length) { e.preventDefault(); snap(); sel = new Set(); clip.forEach(o => { const n = addObj({ ...o, id: null, x: o.x + 40, y: o.y + 40 }, true); sel.add(n.id); }); save(); render(); }
        else if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); sel = new Set(B.objs.map(o => o.id)); render(); }
        else if (e.key === "Escape") { sel.clear(); connectFrom = null; render(); }
      });
      window.addEventListener("resize", () => mounted && applyView());
      $("#wbCmds").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { $("#wbAiIn").value = b.textContent; runAi(b.textContent); } });
      $("#wbAiForm").addEventListener("submit", e => { e.preventDefault(); runAi($("#wbAiIn").value); });
    }
  };
  function zoom(f, cx, cy) { const wb = $("#wb"); cx = cx ?? wb.clientWidth / 2; cy = cy ?? wb.clientHeight / 2; const k2 = Math.max(.15, Math.min(2.2, B.view.k * f)); B.view.x = cx - (cx - B.view.x) * k2 / B.view.k; B.view.y = cy - (cy - B.view.y) * k2 / B.view.k; B.view.k = k2; applyView(); clearTimeout(saveT); saveT = setTimeout(() => store.set("board", B), 400); }
  function delSel() { if (!sel.size) return; snap(); B.objs = B.objs.filter(o => !sel.has(o.id)); B.links = B.links.filter(l => !sel.has(l.from) && !sel.has(l.to)); const n = sel.size; sel.clear(); save(); render(); toast(`Deleted ${n} item${n > 1 ? "s" : ""}`, "Undo", undo); }
  function startEdit(id) {
    const n = $(`.obj[data-id="${id}"]`); if (!n) return;
    const o = B.objs.find(q => q.id === id); const before = snapshot();
    editing = id;
    const t = n.querySelector(".ot"); if (!o.title) t.textContent = "";
    let x = n.querySelector(".ox"); if (!x && !["heading", "zone", "note"].includes(o.type)) { x = document.createElement("div"); x.className = "ox"; x.dataset.placeholder = "Details"; t.after(x); }
    [t, x].forEach(e => e && (e.contentEditable = "true"));
    t.focus(); const r = document.createRange(); r.selectNodeContents(t); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    const done = ev => {
      if (ev && ev.relatedTarget && n.contains(ev.relatedTarget)) return;
      n.removeEventListener("focusout", done);
      o.title = t.innerText.trim(); o.text = x ? x.innerText.trim() : o.text; editing = null;
      if (snapshot() !== before) { hist.push(before); fut = []; updUndo(); }
      save(); render();
    };
    n.addEventListener("focusout", done);
    n.addEventListener("keydown", ev => { if (ev.key === "Escape") { ev.preventDefault(); n.querySelector("[contenteditable]")?.blur(); } });
  }

  /* ---------- AI commands ---------- */
  async function runAi(cmd) {
    cmd = (cmd || "").trim(); const ai = RS.ai(); if (!cmd || !ai) return;
    const out = $("#wbAiOut"); $("#wbAiGo").disabled = true;
    out.innerHTML = `<div class="amsg bot"><span class="who">Board assistant</span><p>Working on: “${esc(cmd)}”…</p></div>`;
    const items = B.objs.filter(o => o.type !== "zone").map(o => ({ id: o.id, type: o.type, title: o.title.slice(0, 90), src: o.src, x: o.x, y: o.y }));
    const bounds = B.objs.length ? { maxX: Math.max(...B.objs.map(o => o.x + (o.w || 240))), minY: Math.min(...B.objs.map(o => o.y)) } : { maxX: 0, minY: 0 };
    try {
      const r = await ai.json(`You help arrange a private research whiteboard about an ILLUSTRATIVE news case. Follow the user's command by adding, connecting or moving items. Never delete.
${RS.EVIDENCE_RULES}

Case file: ${RS.caseContext()}

Current board items (id, type, title, sources, position): ${JSON.stringify(items)}
Free space starts at x=${bounds.maxX + 160}, y=${bounds.minY}. Items are about 230px wide and 170px tall; leave gaps.

User command: "${cmd}"

Reply with only JSON:
{"say":"one or two sentences on what you did and anything the user should verify","add":[{"key":"n1","type":"claim|evidence|question|event|person|sticky|note|heading","title":"max 12 words","text":"max 30 words","src":["S4"],"x":0,"y":0}],"connect":[{"from":"existing id or new key","to":"existing id or new key","label":"max 3 words"}],"move":[{"id":"existing id","x":0,"y":0}]}
Rules: "src" may only use case-file IDs; leave it empty for your own suggestions and questions. At most 14 added items.`, { modelTier: "default" });
      snap();
      const keyMap = {}, ids = new Set(B.objs.map(o => o.id));
      (Array.isArray(r?.add) ? r.add : []).slice(0, 14).forEach(a => { const o = addObj({ type: ADDABLE.includes(a.type) ? a.type : "sticky", title: a.title, text: a.text, src: Array.isArray(a.src) ? a.src : [], x: +a.x || 0, y: +a.y || 0, mine: !(a.src && a.src.length) }, true); keyMap[a.key] = o.id; });
      const res = k => keyMap[k] || (ids.has(k) ? k : null);
      (Array.isArray(r?.connect) ? r.connect : []).forEach(c => { const a = res(c.from), b = res(c.to); if (a && b && a !== b) link(a, b, String(c.label || "").slice(0, 24)); });
      (Array.isArray(r?.move) ? r.move : []).forEach(m => { const o = B.objs.find(q => q.id === m.id); if (o && isFinite(+m.x) && isFinite(+m.y)) { o.x = +m.x; o.y = +m.y; } });
      save(); render(); fitBoard();
      const n = Object.keys(keyMap).length;
      out.innerHTML = `<div class="amsg bot"><span class="who">Board assistant</span><p>${esc(r?.say || "Done.")}</p><p class="mono" style="color:var(--lab-mute)">${n} added · ${(r?.connect || []).length} connections · ${(r?.move || []).length} moved</p><div class="acts"><button type="button" id="wbAiUndo">Undo these changes</button></div></div>`;
      $("#wbAiUndo").onclick = () => { undo(); out.innerHTML = `<div class="amsg err">Changes undone.</div>`; };
      $("#wbAiIn").value = "";
    } catch (e) {
      out.innerHTML = `<div class="amsg err">${esc(RS.aiErr(e.code))}</div>`;
      if (RS.aiFatal(e.code)) RS.killAi();
    }
    $("#wbAiGo").disabled = !RS.ai();
  }

  /* ============ PUBLISH ============ */
  const FORMATS = { article: "Article", visual: "Visual explainer", carousel: "Instagram carousel", thread: "Research thread" };
  let fmt = "article", editMode = true;
  function draft() {
    const o = B.objs;
    const head = o.find(x => x.type === "heading");
    const events = o.filter(x => x.type === "event"), claims = o.filter(x => x.type === "claim"), ev = o.filter(x => x.type === "evidence" || x.type === "source"),
      ppl = o.filter(x => x.type === "person"), qs = o.filter(x => x.type === "question"), mine = o.filter(x => (x.type === "sticky" || x.type === "note") && x.title && !/^(Write it|Double-click)/.test(x.text));
    const srcs = [...new Set(o.flatMap(x => x.src))];
    const secs = [];
    if (events.length) secs.push(["What happened", events.map(e => [e.title, e.text, e.src])]);
    if (claims.length) secs.push(["The claims, and what backs them", claims.map(e => [e.title, e.text, e.src])]);
    if (ev.length) secs.push(["The evidence", ev.map(e => [e.title, e.text, e.src])]);
    if (ppl.length) secs.push(["Who's involved", ppl.map(e => [e.title, e.text, e.src])]);
    if (qs.length) secs.push(["What nobody knows yet", qs.map(e => [e.title, "", e.src])]);
    return { title: head ? head.title : "What I found looking into " + C.title, dek: "A visual investigation built on " + srcs.length + " sources. Facts are linked; my own interpretation is marked separately.", secs, mine, srcs };
  }
  function renderDraft(dr) {
    const ce = editMode ? 'contenteditable="true"' : "";
    const item = ([t, x, s]) => `<li><b>${esc(t)}</b>${x ? ` ${esc(x)}` : ""} ${cites(s)}</li>`;
    if (fmt === "carousel") {
      const slides = [[dr.title, dr.dek], ...dr.secs.map(([h, items]) => [h, items.slice(0, 3).map(i => i[0]).join(" · ")]), ...(dr.mine.length ? [["My take", dr.mine[0].title]] : []), ["Sources", dr.srcs.map(s => s + ": " + C.sources[s].title).join("; ") || "No sources attached"]];
      return `<div class="slides">${slides.map(([t, x], i) => `<div class="slide"><span class="sn">${i + 1}/${slides.length}${i === slides.length - 1 ? " · sources" : ""}</span><span class="stt" ${ce}>${esc(t)}</span><span class="sx" ${ce}>${esc(x)}</span></div>`).join("")}</div>`;
    }
    if (fmt === "thread") {
      const posts = [`${dr.title}. A thread.`, ...dr.secs.flatMap(([h, items]) => [`${h}:`, ...items.slice(0, 3).map(i => i[0] + (i[2]?.length ? ` [${i[2].join(", ")}]` : ""))]), ...dr.mine.map(m => "My take (interpretation): " + m.title), "Sources: " + (dr.srcs.join(", ") || "none")];
      return `<div class="thread">${posts.map((p, i) => `<div><span class="mono muted">${i + 1}/${posts.length}</span><span ${ce}>${esc(p)}</span></div>`).join("")}</div>`;
    }
    const visual = fmt === "visual";
    return `<div class="body">${dr.secs.map(([h, items], i) => visual
      ? `<section style="background:${["var(--ink)", "var(--yellow)", "#FBF8F0"][i % 3]};color:${i % 3 === 0 ? "var(--paper)" : "var(--ink)"};padding:22px;border:2px solid var(--ink);display:grid;gap:10px"><span class="mono">${String(i + 1).padStart(2, "0")}</span><h2 ${ce} style="font-size:44px">${esc(h)}</h2><ul ${ce}>${items.map(item).join("")}</ul></section>`
      : `<h2 ${ce}>${esc(h)}</h2><ul ${ce}>${items.map(item).join("")}</ul>`).join("")}
      ${dr.mine.length ? `<div class="interp"><span class="interp-tag">Author's interpretation · not a verified finding</span>${dr.mine.map(m => `<p ${ce}>${esc(m.title)}${m.text ? " " + esc(m.text) : ""}</p>`).join("")}</div>` : ""}
      <h2>Sources</h2><ul>${dr.srcs.map(s => `<li>${cites([s])} ${esc(C.sources[s].title)} · <span class="muted">${esc(C.sources[s].type)}, ${esc(C.sources[s].date)}</span></li>`).join("") || "<li>No sources attached. Add sourced items to your board first.</li>"}</ul></div>`;
  }
  RS.boardFormats = {
    show(arg, el) {
      const dr = draft(), pub = RS.myPub(), L = RS.level();
      const unsourcedClaims = B.objs.filter(o => o.type === "claim" && !o.src.length).length;
      el.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">Publish as a story · from your whiteboard</span><h1>Preview, edit, then publish</h1><p>Your board stays private. This creates a separate post on your publication, and only when you press Publish.</p></div>
        <div class="pub-grid">
          <aside style="display:grid;gap:16px;align-content:start">
            <div class="field"><label>Format</label><div class="tabs" id="fmtTabs">${Object.entries(FORMATS).map(([k, l]) => `<button type="button" aria-pressed="${k === fmt}" data-f="${k}">${l}</button>`).join("")}</div></div>
            <div class="field"><label for="pubName">Your publication</label><input id="pubName" value="${esc(pub.name)}"><textarea id="pubDesc" style="min-height:60px">${esc(pub.desc)}</textarea></div>
            <div class="method"><b>Before you publish</b>
              <span>${dr.srcs.length ? "✓" : "✕"} ${dr.srcs.length} sources attached</span>
              <span>${unsourcedClaims ? "!" : "✓"} ${unsourcedClaims ? unsourcedClaims + " claim(s) on your board have no source" : "Every claim has a source"}</span>
              <span>✓ Your interpretation is marked separately</span>
              <span>${L.lvl >= 3 ? "✓" : "–"} Mastery: ${L.lvl ? RS.LEVELS[L.lvl - 1] : "not started"} (shown as a signal, never as proof)</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" id="pvToggle">${editMode ? "Preview" : "Edit"}</button><button class="btn r" type="button" id="pubGo">Publish</button></div>
            <button class="linkish" type="button" data-go="board">← Back to the board</button>
          </aside>
          <article class="article" id="draftArt">
            <span class="kick">${FORMATS[fmt]} · draft · ${esc(pub.name)}</span>
            <h1 ${editMode ? 'contenteditable="true"' : ""} id="dTitle">${esc(dr.title)}</h1>
            <p class="dek" ${editMode ? 'contenteditable="true"' : ""} id="dDek">${esc(dr.dek)}</p>
            <div class="byline"><span class="pub-dot" style="--c:${pub.color}"></span><b>${esc(pub.name)}</b><span class="muted">by you · ${dr.srcs.length} sources</span></div>
            <div id="dBody">${renderDraft(dr)}</div>
          </article></div></div>`;
      $$("#fmtTabs button").forEach(b => b.onclick = () => { fmt = b.dataset.f; this.show(arg, el); });
      $("#pvToggle").onclick = () => { editMode = !editMode; this.show(arg, el); };
      $("#pubGo").onclick = () => {
        const name = $("#pubName").value.trim() || "My publication";
        store.set("mypub", { ...pub, name, desc: $("#pubDesc").value.trim() });
        $$("#draftArt [contenteditable]").forEach(e => e.removeAttribute("contenteditable"));
        const post = { id: "u" + Date.now().toString(36), pub: "mine", title: $("#dTitle").innerText.trim(), dek: $("#dDek").innerText.trim(), date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), format: FORMATS[fmt], srcCount: dr.srcs.length, sources: dr.srcs, mastery: L.lvl ? RS.LEVELS[L.lvl - 1] : "", body: $("#dBody").innerHTML, fmt };
        const posts = store.get("posts", []); posts.unshift(post); store.set("posts", posts); store.set("published", true);
        editMode = true;
        toast("Published to " + name, "See it in Discover", () => show("discover", "New Voices"));
        show("post", post.id);
      };
    }
  };
})();
