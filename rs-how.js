/* THE RED THREAD — "How it works": where the news comes from, how stories are grouped, the public method for the
   left / centre / right labels (every outlet, its label and why), "Dispute this rating" and the public log of
   disputes and decisions. Also registers the "Take action" page (its markup is in body.html, rs-act fills it). */
(function () {
  const { esc, store, toast } = RS, L = window.LIVE;
  const GROUPS = [["L", "Left"], ["LL", "Leans left"], ["C", "Centre"], ["LR", "Leans right"], ["R", "Right"]];
  const NAME = { ...Object.fromEntries(GROUPS), U: "Not rated" };
  const COL = { L: "#FB7185", LL: "#FDA4AF", C: "#94A3B8", LR: "#93C5FD", R: "#60A5FA", U: "#64748B" };
  const DEF = {
    L: "Consistently argues from the left: strongly critical of the BJP-led government and of Hindu nationalism, and its story choices and opinion pages rarely make the government's case.",
    LL: "Mainstream reporting, but editorials and story choices tilt left-liberal and are more often critical of the government than supportive.",
    C: "Mainstream reporting without a consistent party line: it runs both critical and supportive coverage, and its opinion pages carry writers from more than one side.",
    LR: "Mainstream reporting, but editorials, prime-time framing and story choices tilt toward the government and the right more often than against.",
    R: "Openly argues from the right: strongly supportive of the BJP-led government or of Hindu nationalism, and often describes itself that way."
  };
  const STATUS = { open: "Open", reviewing: "Being reviewed", changed: "Label changed", kept: "Label kept" };
  const chip = k => `<span class="rd-chip" style="--c:${COL[k] || COL.U}">${NAME[k] || k}</span>`;
  const outlets = () => (L ? L.outlets : []).filter(o => o.via !== "gdelt");
  const outlet = id => outlets().find(o => o.id === id);
  const club = () => RS.club;
  let filter = "all", disputes = [], el = null;

  const LKEY = "rating-disputes";  // prototype copy (no database): disputes stay in this browser
  async function loadDisputes() {
    const c = club();
    if (c && window.RT_CONFIG && RT_CONFIG.supabaseUrl) {
      await c.ready();
      if (c.remote()) {
        const r = await c.sb().from("rating_disputes").select("*, by:profiles!rating_disputes_created_by_fkey(username)").order("created_at", { ascending: false }).limit(200);
        if (!r.error) { disputes = r.data.map(d => ({ ...d, by: (d.by && d.by.username) || "member" })); return; }
        if (!/does not exist|schema cache/i.test(r.error.message)) toast("Couldn’t load rating disputes: " + r.error.message);
      }
    }
    disputes = store.get(LKEY, []);
  }

  function page() {
    const os = outlets(), checkers = L && L.factchecks ? [...new Set(L.factchecks.map(f => f.name))] : [];
    return `<div class="how">
      <div><span class="eyebrow">How it works</span><h1>Every side of today's news, and how we work it out</h1></div>
      <p>The Red Thread collects today's headlines from Indian news outlets, groups the reports that are about the same event, and shows you which outlets covered it and how. The point is to see the whole picture, not to tell you what to think.</p>
      <nav class="rd-toc" aria-label="On this page"><a href="#how-src">Where the news comes from</a><a href="#how-story">How a story is made</a><a href="#how-method">How the labels are decided</a><a href="#how-outlets">Every outlet, and why</a><a href="#how-disputes">Disputes and changes</a><a href="#how-money">Who pays</a></nav>

      <section id="how-src"><h2>Where the news comes from</h2>
        <p>${L ? `Every 30 minutes a small program reads the public news feeds (RSS) of ${os.length} Indian outlets. The last update was ${esc(window.LIVE_UPDATED || "")}.` : "In this copy the news is a fixed sample; the live version reads Indian outlets' public news feeds every 30 minutes."} Each headline links to the outlet's own article; we show the headline, a short summary and the outlet's photo with credit, and send you to the outlet to read the rest.</p>
        ${checkers.length ? `<p>Fact-checks come from ${checkers.map(esc).join(", ")}.</p>` : ""}
      </section>

      <section id="how-story"><h2>How a "story" is made</h2>
        <p>Reports from different outlets that share the same key words, published around the same time, are grouped into one story. The place on the map comes from the place names in the headlines. This is automatic, so sometimes two different events get grouped, or one event is split in two.</p>
      </section>

      <section id="how-method"><h2>How left, centre and right are decided</h2>
        <p>Each <b>outlet</b> has one label. A story's split is simply which outlets covered it, one outlet one vote: if two centre outlets and three left-leaning outlets reported it, it shows 40% centre and 60% left. A "blindspot" is a story covered by one side and not the other.</p>
        <h3>The five labels</h3>
        <div class="rd-defs">${GROUPS.map(([k]) => `<div>${chip(k)}<p>${DEF[k]}</p></div>`).join("")}</div>
        <p class="muted rd-small">In India, "left" and "right" mostly mean critical of, or supportive of, the BJP-led central government and Hindu nationalism. If the government changes, the labels will be reviewed, because that meaning shifts with it.</p>
        <h3>What we look at</h3>
        <ol class="rd-signals">
          <li><b>Editorial and opinion pages.</b> Which side the outlet's own editorials and regular columnists usually take.</li>
          <li><b>Story choice.</b> What it covers and what it leaves out. Our own blindspot data counts this for every outlet, every day.</li>
          <li><b>Framing.</b> Words in headlines and prime-time segments, for example "crackdown" versus "action", "protesters" versus "rioters".</li>
          <li><b>How it describes itself, and how others describe it.</b> Public statements, media-research studies and press-freedom reports.</li>
          <li><b>Ownership and funding</b>, as context only. A label is never given for who owns an outlet; owners are shown so you can judge.</li>
        </ol>
        <h3>Who decides</h3>
        <p>Right now the labels are set by The Red Thread's founding editor, and every one is marked <b>provisional</b>. That is not good enough on its own, so this is the plan, in order:</p>
        <ol class="rd-signals">
          <li><b>Now:</b> every label shows its reason (below), and anyone can dispute it. Every dispute and every decision is published.</li>
          <li><b>Next:</b> a review panel of readers who say they lean left, centre and right. Each rates outlets' headlines without seeing the outlet's name, and a label changes only when the panel agrees across sides.</li>
          <li><b>Then:</b> an outside reviewer checks the method once a year, and the results are posted here.</li>
        </ol>
      </section>

      <section id="how-outlets"><h2>Every outlet, its label, and why</h2>
        <p>${os.length ? `${os.length} outlets are rated.` : "The live list of outlets loads with the news."} Think one is wrong? Press <b>Dispute</b> and show us.</p>
        <div class="rd-filters" role="group" aria-label="Filter by label">${[["all", "All"], ...GROUPS].map(([k, n]) => `<button type="button" class="rd-f ${filter === k ? "on" : ""}" data-rdf="${k}">${n}</button>`).join("")}</div>
        <div class="rd-table" id="rdTable">${outletRows()}</div>
      </section>

      <section id="how-disputes"><h2>Disputes and rating changes</h2>
        <p>Anyone with a Club account can dispute a label. An editor answers within 14 days: the label is either changed or kept, and the reason is written here for everyone to read. Disputes that show examples (links to recent headlines, editorials or segments) carry the most weight; "they're biased" on its own usually isn't enough.</p>
        <div><button class="btn y sm" type="button" data-dispute="">Dispute a rating</button></div>
        <div id="rdLog" class="rd-log"><p class="muted rd-small">Loading disputes…</p></div>
      </section>

      <section><h2>What this can't tell you</h2>
        <ul>
          <li>One label per outlet is rough: an outlet's news desk and opinion pages differ, and a single article can break from its outlet's usual line.</li>
          <li>It counts <i>who</i> covered a story, not <i>how</i>. Two outlets can report the same event with opposite slants.</li>
          <li>When only one outlet has covered a story, there is nothing to compare yet, so we don't show a split.</li>
        </ul>
      </section>

      <section id="how-money"><h2>Who pays for this</h2>
        <p>The Red Thread is an independent prototype, built and paid for by its founder. It has no advertisers and takes no money from political parties, governments or news outlets. If that ever changes, every funder will be listed on this page.</p>
      </section>

      <section><h2>What else is here</h2>
        <ul>
          <li><b>Investigate</b> and the <b>Research board</b>: tools to map a story out yourself.</li>
          <li><b>Media watch</b>: live fact-checks, and a sample of how outlets' corrections could be tracked.</li>
          <li><b>Ask AI</b> (Dhaga): an assistant that answers from the stories on this site and shows its sources.</li>
          <li><b>Take action</b>: example fundraisers and petitions, kept separate from the news.</li>
        </ul>
      </section>
      <div><button class="mbtn mt" type="button" data-go="discover">SEE TODAY'S HEADLINES →</button></div>
    </div>`;
  }

  function outletRows() {
    const os = outlets().filter(o => filter === "all" || o.lean === filter);
    if (!os.length) return `<p class="muted rd-small">No outlets with this label.</p>`;
    return os.map(o => {
      const open = disputes.filter(d => d.outlet_id === o.id && (d.status === "open" || d.status === "reviewing")).length;
      return `<div class="rd-row"><b class="rd-name">${esc(o.name)}</b>${chip(o.lean)}<span class="rd-why">${o.why ? esc(o.why) : `<span class="muted">Reason being written up.</span>`}${open ? ` <span class="rd-open">${open} open dispute${open > 1 ? "s" : ""}</span>` : ""}</span><button type="button" class="btn sm" data-dispute="${esc(o.id)}" aria-label="Dispute the label for ${esc(o.name)}">Dispute</button></div>`;
    }).join("");
  }

  function logHTML() {
    if (!disputes.length) return `<p class="muted rd-small">No disputes yet. When there are, every one appears here with the decision and the reason.</p>`;
    const ed = club() && club().isEditor();
    return disputes.map(d => `<article class="rd-item" data-id="${esc(d.id)}">
      <div class="rd-itemhead"><b>${esc(d.outlet_name)}</b><span>${chip(d.current_lean)} → ${chip(d.suggested_lean)} suggested</span><span class="rd-status rd-${d.status}">${STATUS[d.status] || d.status}</span></div>
      <p>${esc(d.reason)}</p>
      ${(d.evidence || []).filter(Boolean).length ? `<p class="rd-small">Evidence: ${d.evidence.filter(Boolean).map((u, k) => `<a href="${esc(u)}" target="_blank" rel="noopener nofollow ugc">link ${k + 1}</a>`).join(" · ")}</p>` : ""}
      <p class="muted rd-small">Filed by @${esc(d.by || "member")} · ${new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
      ${d.decision ? `<div class="rd-decision"><b>Decision${d.status === "changed" && d.new_lean ? `: changed to ${NAME[d.new_lean]}` : d.status === "kept" ? ": label kept" : ""}</b><p>${esc(d.decision)}</p></div>` : ""}
      ${ed && (d.status === "open" || d.status === "reviewing") ? `<form class="rd-decide" data-decide="${esc(d.id)}">
        <label class="rd-small" for="rdDec-${esc(d.id)}">Your decision and the reason (published)</label>
        <textarea id="rdDec-${esc(d.id)}" name="decision" rows="3" minlength="20" maxlength="1500" required placeholder="What you checked, and why the label changes or stays."></textarea>
        <div class="rd-decrow"><select name="new_lean" aria-label="New label">${GROUPS.map(([k, n]) => `<option value="${k}" ${k === d.suggested_lean ? "selected" : ""}>${n}</option>`).join("")}</select>
          <button class="btn y sm" type="submit" value="changed">Change the label</button><button class="btn sm" type="submit" value="kept">Keep the label</button>
          ${d.status === "open" ? `<button class="linkish" type="button" data-reviewing="${esc(d.id)}">Mark as being reviewed</button>` : ""}</div></form>` : ""}
    </article>`).join("");
  }
  const refresh = () => {
    if (!el) return;
    const t = el.querySelector("#rdTable"), g = el.querySelector("#rdLog");
    if (t) t.innerHTML = outletRows(); if (g) g.innerHTML = logHTML();
  };

  // the form: which outlet, what label instead, why, and up to three links
  async function disputeModal(id, firstIds) {
    const c = club();
    if (!c) return toast("Disputes need the Club, which didn't load.");
    if (window.RT_CONFIG && RT_CONFIG.supabaseUrl) await c.ready();
    if (c.remote() && !c.uid()) { toast("Sign in to the Club to dispute a rating, so we can reply to you."); return c.signIn(); }
    if (!c.me()) { toast("Finish setting up your Club profile first."); return RS.show("club"); }
    const os = outlets(), first = (firstIds || []).map(outlet).filter(Boolean), rest = os.filter(o => !first.includes(o));
    const opt = o => `<option value="${esc(o.id)}" ${o.id === id ? "selected" : ""}>${esc(o.name)} (now: ${NAME[o.lean]})</option>`;
    const ov = c.modal(`<form data-form="dispute"><span class="eyebrow">Dispute a rating</span><h2>Think a label is wrong? Show us.</h2>
      <div class="field"><label for="rdO">Outlet</label><select id="rdO" name="outlet" required>${id || first.length ? "" : `<option value="">Pick an outlet</option>`}${first.length ? `<optgroup label="On this story">${first.map(opt).join("")}</optgroup><optgroup label="All outlets">${rest.map(opt).join("")}</optgroup>` : os.map(opt).join("")}</select></div>
      <div class="field"><label for="rdS">What it should be</label><select id="rdS" name="suggested" required>${GROUPS.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></div>
      <div class="field"><label for="rdR">Why? Give examples</label><textarea id="rdR" name="reason" rows="5" required minlength="20" maxlength="1500" placeholder="For example: in the last month its editorials on X and Y both took the government's side, and its headline on Z called protesters 'rioters'."></textarea></div>
      <fieldset class="field rd-ev"><legend>Links to the examples (up to 3, optional but they help most)</legend>${[1, 2, 3].map(n => `<input name="ev" type="url" maxlength="500" placeholder="https://…" aria-label="Evidence link ${n}">`).join("")}</fieldset>
      <p class="muted qc-small">Your dispute, your username and our decision are published on How it works.</p>
      <button class="btn y" type="submit">Send the dispute</button></form>`);
    const oSel = ov.querySelector("#rdO"), sSel = ov.querySelector("#rdS");
    const sync = () => { const o = outlet(oSel.value); [...sSel.options].forEach(op => op.disabled = !!o && op.value === o.lean); if (sSel.selectedOptions[0] && sSel.selectedOptions[0].disabled) sSel.value = [...sSel.options].find(op => !op.disabled).value; };
    oSel.onchange = sync; sync();
    ov.querySelector("form").onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target), o = outlet(String(f.get("outlet")));
      if (!o) return toast("Pick an outlet");
      const row = { outlet_id: o.id, outlet_name: o.name, current_lean: o.lean, suggested_lean: String(f.get("suggested")), reason: String(f.get("reason")).trim(), evidence: f.getAll("ev").map(String).map(s => s.trim()).filter(Boolean).slice(0, 3) };
      if (row.reason.length < 20) return toast("Say a little more: at least 20 characters.");
      const btn = e.target.querySelector("[type=submit]"); btn.disabled = true;
      if (c.remote()) { const r = await c.rw(c.sb().from("rating_disputes").insert(row)); btn.disabled = false; if (!r) return; }
      else store.set(LKEY, [{ ...row, id: "d" + Date.now().toString(36), status: "open", by: c.me().name, created_at: new Date().toISOString() }, ...store.get(LKEY, [])]);
      c.close(ov); toast("Thanks. Your dispute is published, and an editor will answer within 14 days.");
      await loadDisputes(); refresh();
    };
  }
  RS.disputeRating = disputeModal;

  async function decide(form, status) {
    const c = club(), id = form.dataset.decide, decision = form.decision.value.trim(), new_lean = status === "changed" ? form.new_lean.value : null;
    if (status !== "reviewing" && decision.length < 20) return toast("Write the reason for the decision (at least 20 characters).");
    const upd = status === "reviewing" ? { status } : { status, decision, new_lean };
    if (c.remote()) { const r = await c.rw(c.sb().from("rating_disputes").update(upd).eq("id", id)); if (!r) return; }
    else store.set(LKEY, store.get(LKEY, []).map(d => d.id === id ? { ...d, ...upd } : d));
    toast(status === "changed" ? "Decision published. Now update the outlet's label in scripts/outlets.json so the site uses it." : status === "kept" ? "Decision published." : "Marked as being reviewed.");
    await loadDisputes(); refresh();
  }

  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-dispute]"); if (!b) return;
    e.preventDefault(); disputeModal(b.dataset.dispute || "", (b.dataset.outlets || "").split(",").filter(Boolean));
  });

  RS.V.how = {
    mount(root) {
      el = root;
      root.addEventListener("click", e => {
        const f = e.target.closest("[data-rdf]"); if (f) { filter = f.dataset.rdf; root.querySelectorAll("[data-rdf]").forEach(x => x.classList.toggle("on", x === f)); refresh(); return; }
        const rv = e.target.closest("[data-reviewing]"); if (rv) decide(rv.closest("form"), "reviewing");
        const a = e.target.closest(".rd-toc a"); if (a) { e.preventDefault(); const t = root.querySelector(a.getAttribute("href")); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }
      });
      root.addEventListener("submit", e => { const f = e.target.closest("[data-decide]"); if (!f) return; e.preventDefault(); decide(f, e.submitter ? e.submitter.value : "kept"); });
    },
    show(arg, root) {
      el = root || document.getElementById("v-how"); el.innerHTML = page();
      loadDisputes().then(refresh);
      if (arg === "disputes" || arg === "outlets" || arg === "method") setTimeout(() => { const t = el.querySelector("#how-" + arg); if (t) t.scrollIntoView({ block: "start" }); }, 50);
    }
  };
  RS.V.act = { mount() {}, show() {} };
})();
