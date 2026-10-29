/* THE RED THREAD — "Do something": the top three stories, each with one thing readers can do about it
   (a relief + school-rebuild fund, a protest support fund, a petition). Pledges and signatures are one
   document per person at pledges/<their id>, readable by everyone so the totals add up; no money moves. */
(function () {
  const { $, $$, esc, store, toast } = RS;
  const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
  const ACTS = [
    { id: "flood", story: "floods", kind: "fund", badge: "Fundraiser", title: "Flood relief + rebuild 3 schools in Assam", goal: 500000,
      what: "Relief kits (food, water purifiers, medicines) for displaced families, then repairs to three village schools the water damaged.", split: [["Relief kits", 60], ["School repairs", 40]], amounts: [100, 500, 1000] },
    { id: "protest", story: "genz", kind: "fund", badge: "Support the protest", title: "Legal aid, water and first aid for the Jantar Mantar sit-in", goal: 150000,
      what: "Pays for lawyers at the court hearing on 4 Nov, drinking water and a first-aid volunteer team. It does not fund travel or materials for any side.", split: [["Legal aid", 55], ["Water & first aid", 45]], amounts: [100, 250, 500] },
    { id: "justice", story: "justice", kind: "petition", badge: "Petition", title: "Demand a time-bound, independent probe and protection for the family", goal: 10000,
      what: "Addressed to the State Home Department: an inquiry into the nine-day delay finished within 30 days, and police protection for the survivor's family. The survivor is never named." }
  ];
  let db = null, user = null, uid = null, all = {}, mine = store.get("acts", {}), unsub = null;
  const totals = () => {
    const t = {}; ACTS.forEach(a => t[a.id] = { amt: 0, n: 0 });
    const docs = db ? Object.values(all) : [{ acts: mine }];
    docs.forEach(d => Object.entries((d && d.acts) || {}).forEach(([k, v]) => { if (!t[k] || !v) return; if (v.signed) t[k].n++; if (+v.amt > 0) { t[k].amt += Math.min(1e6, +v.amt); t[k].n++; } }));
    return t;
  };
  async function save(next) {
    mine = next; store.set("acts", mine); render();
    if (!db) return;
    try { await db.collection("pledges").doc(uid).set({ acts: mine, at: Date.now() }); }
    catch (e) { toast(e && e.code === "permission_denied" ? "You can read this page but not pledge. Ask the owner for access." : "Couldn't save that. Try again."); }
  }
  function card(a, t) {
    const s = RS.story(a.story), me = mine[a.id] || {}, val = a.kind === "fund" ? t.amt : t.n, pct = Math.min(100, val / a.goal * 100);
    const progress = a.kind === "fund"
      ? `<div class="act-num"><b>${inr(t.amt)}</b><span>pledged of ${inr(a.goal)} · ${t.n} ${t.n === 1 ? "person" : "people"}</span></div>`
      : `<div class="act-num"><b>${t.n.toLocaleString("en-IN")}</b><span>signed of ${a.goal.toLocaleString("en-IN")} needed</span></div>`;
    const cta = a.kind === "fund"
      ? (me.amt ? `<div class="act-done">✓ You pledged ${inr(me.amt)} <button class="linkish" type="button" data-unpledge="${a.id}">Change</button></div>`
        : `<div class="act-amts">${a.amounts.map(v => `<button type="button" data-amt="${v}" data-act="${a.id}">${inr(v)}</button>`).join("")}<label class="sr" for="amt-${a.id}">Other amount</label><input id="amt-${a.id}" inputmode="numeric" placeholder="Other ₹"></div>
           <button class="btn y" type="button" data-pledge="${a.id}">Pledge</button>`)
      : (me.signed ? `<div class="act-done">✓ You signed this petition <button class="linkish" type="button" data-unsign="${a.id}">Remove my signature</button></div>`
        : `<button class="btn y" type="button" data-sign="${a.id}">✍ Sign the petition</button>`);
    return `<article class="act" data-id="${a.id}">
      <button type="button" class="act-news" data-go="story" data-arg="${esc(a.story)}"><span class="lbl">${esc(s.place)} · ${esc(s.cat)} · ${esc(s.time)}</span><h3>${esc(s.title)}</h3><span class="act-read">Read all sides →</span></button>
      <div class="act-body"><span class="act-badge act-${a.kind}">${esc(a.badge)}</span><h4>${esc(a.title)}</h4><p>${esc(a.what)}</p>
        ${a.split ? `<div class="act-split">${a.split.map(([k, v]) => `<span><i style="width:${v}%"></i>${esc(k)} ${v}%</span>`).join("")}</div>` : ""}
        <div class="act-bar"><i style="width:${pct}%"></i></div>${progress}
        <div class="act-cta">${cta}<button class="btn sm" type="button" data-actshare="${a.story}">↗ Share</button></div>
        <p class="act-fine">${a.kind === "fund" ? "Prototype: this records a pledge. No money is charged and no card details are asked for. In the real app, money goes through a verified relief partner with public receipts." : "Prototype: signatures are counted here. In the real app, the petition is delivered to the addressee with the count and a public status update."}</p></div></article>`;
  }
  function render() {
    const box = $("#actGrid"); if (!box) return;
    const t = totals(), sel = {}; $$("#actGrid [data-amt][aria-pressed=true]").forEach(b => sel[b.dataset.act] = b.dataset.amt);
    box.innerHTML = ACTS.map(a => card(a, t[a.id])).join("");
    Object.entries(sel).forEach(([k, v]) => $(`#actGrid [data-act="${k}"][data-amt="${v}"]`)?.setAttribute("aria-pressed", "true"));
    $("#actMode").textContent = db ? "Live: totals include everyone this page is shared with." : "Demo mode: your pledges and signatures are saved in this browser. Open the site on claude.ai to count everyone's.";
  }
  document.addEventListener("click", e => {
    const am = e.target.closest("[data-amt]"); if (am) { $$(`#actGrid [data-act="${am.dataset.act}"]`).forEach(b => b.setAttribute("aria-pressed", b === am)); const i = $("#amt-" + am.dataset.act); if (i) i.value = ""; return; }
    const pl = e.target.closest("[data-pledge]"); if (pl) {
      const id = pl.dataset.pledge, typed = +String($("#amt-" + id)?.value || "").replace(/[^\d]/g, ""), chosen = +($(`#actGrid [data-act="${id}"][aria-pressed=true]`)?.dataset.amt || 0), amt = typed || chosen;
      if (!amt || amt < 10) { toast("Pick an amount (₹10 or more)"); return; } if (amt > 100000) { toast("For pledges over ₹1,00,000, contact the organisers directly."); return; }
      save({ ...mine, [id]: { amt, at: Date.now() } }); toast(`Thank you. ${inr(amt)} pledged.`); RS.sig && RS.sig("acted"); return;
    }
    const up = e.target.closest("[data-unpledge]"); if (up) { const n = { ...mine }; delete n[up.dataset.unpledge]; save(n); return; }
    const sg = e.target.closest("[data-sign]"); if (sg) { save({ ...mine, [sg.dataset.sign]: { signed: true, at: Date.now() } }); toast("Signed. Share it so it reaches the goal."); RS.sig && RS.sig("acted"); return; }
    const us = e.target.closest("[data-unsign]"); if (us) { const n = { ...mine }; delete n[us.dataset.unsign]; save(n); toast("Signature removed"); return; }
    const sh = e.target.closest("[data-actshare]"); if (sh) { const link = RS.shareLink ? RS.shareLink(sh.dataset.actshare).replace("#post-", "#story-") : location.href; navigator.clipboard.writeText(link).then(() => toast("Link copied"), () => toast(link)); }
  });
  render();
  (async () => {
    try { [db, user] = await Promise.all([window.claude?.use?.("db"), window.claude?.use?.("user")]); uid = user ? await user.id() : null; } catch { db = null; }
    if (!db || !uid) { db = null; render(); return; }
    try { const d = await db.collection("pledges").doc(uid).get(); if (d.exists && d.data().acts) { mine = d.data().acts; store.set("acts", mine); } } catch { }
    unsub = db.collection("pledges").limit(1000).onSnapshot(snap => { all = {}; snap.docs.forEach(d => all[d.id] = d.data()); render(); }, () => render());
    render();
  })();
})();
