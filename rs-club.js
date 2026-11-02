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
  const save = () => { if (!remote) store.set(KEY, C); };

  /* ---------- the shared backend (Supabase). If it can't load (e.g. inside claude.ai), the prototype above is used ---------- */
  const CFG = window.RT_CONFIG || {};
  let sb = null, remote = false, uidNow = null, needProfile = false, loaded = false, boot = null;
  const loadLib = () => window.supabase ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js"; s.onload = res; s.onerror = rej; document.head.append(s); });
  async function connect() {
    if (!CFG.supabaseUrl || !CFG.supabaseKey) return false;
    try {
      await loadLib();
      // implicit flow: an email confirmation link works in whichever browser opens it, not only the one that signed up
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true } });
      const err = /error_description=([^&]+)/.exec(location.hash + location.search);
      if (err) toast(decodeURIComponent(err[1].replace(/\+/g, " ")) + ". Try signing in, or ask for a new link.");
      const { data, error } = await sb.from("events").select("id").limit(1);
      if (error) throw error;
      const s = (await sb.auth.getSession()).data.session; uidNow = s ? s.user.id : null;
      sb.auth.onAuthStateChange((ev, ses) => {
        if (ev === "PASSWORD_RECOVERY") setTimeout(newPassword, 0);
        const n = ses ? ses.user.id : null; if (n !== uidNow) { uidNow = n; reload(); }
      });
      remote = true; return true;
    } catch (e) { sb = null; return false; }
  }
  const T = t => Date.parse(t) || 0;
  const friendly = e => /row-level security/i.test(e.message) ? "You don’t have permission to do that." : /duplicate key.*username/i.test(e.message) ? "That username is taken. Try another." : /duplicate key/i.test(e.message) ? "Already done." : e.message;
  // errors show inside the open pop-up (a toast would sit behind it) and as a toast otherwise
  async function rw(q) {
    const r = await q;
    const box = [...document.querySelectorAll(".qc-modal")].pop();
    if (box) box.querySelectorAll(".qc-err").forEach(x => x.remove());
    if (!r.error) return r;
    const msg = /check constraint/i.test(r.error.message) ? "Something is too long or too short. Shorten the longest box and try again." : friendly(r.error);
    if (box) { const p = document.createElement("p"); p.className = "qc-err"; p.setAttribute("role", "alert"); p.textContent = msg; (box.querySelector("form") || box.querySelector(".qc-modalin")).append(p); p.scrollIntoView({ block: "nearest" }); }
    else toast(msg);
    return null;
  }
  async function reload() {
    if (!sb) return;
    const NAMES = ["profiles", "investigations", "sources", "claims", "claim_responses", "perspectives", "open_questions", "findings", "discussions", "comments", "reactions", "missing_stories", "missing_notes", "events", "event_interest", "context_notes"];
    const all = t => sb.from(t).select("*");
    const res = await Promise.all([...NAMES.map(all), all("history").order("created_at", { ascending: false }).limit(1000),
      uidNow ? all("follows").eq("user_id", uidNow) : null, uidNow ? all("notifications").eq("user_id", uidNow).order("created_at", { ascending: false }).limit(40) : null,
      uidNow ? all("reports").order("created_at", { ascending: false }).limit(200) : null, uidNow ? all("moderation_log").order("created_at", { ascending: false }).limit(100) : null]);
    const bad = res.find(r => r && r.error); if (bad) { toast("Couldn’t load the club: " + bad.error.message); return; }
    const D = {}; NAMES.forEach((n, k) => D[n] = res[k].data || []);
    const [hist, fol, notif, reps, mlog] = res.slice(NAMES.length).map(r => r ? r.data || [] : []);
    const nm = Object.fromEntries(D.profiles.map(p => [p.id, p.username])), N = id => nm[id] || "former member";
    const thread = rows => rows.filter(c => !c.parent_id).sort((a, b) => T(a.created_at) - T(b.created_at)).map(c => ({ id: c.id, by: N(c.created_by), text: c.body, at: T(c.created_at), replies: rows.filter(r => r.parent_id === c.id).sort((a, b) => T(a.created_at) - T(b.created_at)).map(r => ({ id: r.id, by: N(r.created_by), text: r.body, at: T(r.created_at) })) }));
    const meP = D.profiles.find(p => p.id === uidNow);
    C = {
      me: meP ? { name: meP.username, bio: meP.bio || "", interests: meP.interests || [], role: meP.role, joined: T(meP.created_at) } : null,
      members: D.profiles.filter(p => p.id !== uidNow).map(p => ({ name: p.username, bio: p.bio || "", interests: p.interests || [] })),
      invs: D.investigations.map(i => ({ id: i.id, title: i.title, question: i.question, why: i.why || "", subqs: i.subqs || [], topic: i.topic || "Politics & Governance", story: i.story_id || "", by: N(i.created_by), at: T(i.created_at),
        sources: D.sources.filter(s => s.investigation_id === i.id).map(s => ({ id: s.id, title: s.title, url: s.url || "", publisher: s.publisher || "", date: s.published || "", type: s.type || "Other", by: N(s.created_by), at: T(s.created_at), ver: s.verified ? "verified" : "unverified" })),
        claims: D.claims.filter(c => c.investigation_id === i.id).map(c => ({ id: c.id, text: c.body, status: c.status, by: N(c.created_by), at: T(c.created_at), responses: D.claim_responses.filter(r => r.claim_id === c.id).map(r => ({ id: r.id, kind: r.kind, text: r.body, src: r.source_id || "", by: N(r.created_by), at: T(r.created_at) })) })),
        perspectives: D.perspectives.filter(p => p.investigation_id === i.id).map(p => ({ who: p.who, view: p.view, by: N(p.created_by) })),
        comments: thread(D.comments.filter(c => c.investigation_id === i.id)),
        questions: D.open_questions.filter(q => q.investigation_id === i.id).map(q => ({ id: q.id, text: q.body, by: N(q.created_by), resolved: q.resolved })),
        findings: (f => f ? { text: f.body, by: N(f.created_by), at: T(f.updated_at), published: f.published, verified: f.verified } : null)(D.findings.find(f => f.investigation_id === i.id)),
        history: hist.filter(h => h.investigation_id === i.id).map(h => ({ at: T(h.created_at), by: N(h.actor), what: h.what })) })),
      discs: D.discussions.map(d => ({ id: d.id, title: d.title, body: d.body || "", why: d.why, link: d.link || "", topic: d.topic || "", by: N(d.created_by), at: T(d.created_at),
        react: { useful: D.reactions.filter(r => r.discussion_id === d.id && r.kind === "useful").length, insightful: D.reactions.filter(r => r.discussion_id === d.id && r.kind === "insightful").length }, replies: thread(D.comments.filter(c => c.discussion_id === d.id)) })),
      missing: D.missing_stories.map(m => ({ id: m.id, headline: m.headline, place: m.place, what: m.what, why: m.why, sources: m.sources || "", next: m.next || "", by: N(m.created_by), at: T(m.created_at), status: m.status, notes: D.missing_notes.filter(n => n.story_id === m.id).map(n => ({ by: N(n.created_by), text: n.body, at: T(n.created_at) })) })),
      events: D.events.map(e => ({ id: e.id, title: e.title, when: T(e.starts_at), where: e.place || "Online", kind: e.kind || "Event", link: e.link || "" })),
      follows: fol.map(f => f.target_type === "member" ? "@" + f.target_id : f.target_id), saved: fol.filter(f => f.saved).map(f => f.target_id),
      rsvp: D.event_interest.filter(x => x.user_id === uidNow).map(x => x.event_id), myReacts: D.reactions.filter(r => r.user_id === uidNow).map(r => "r:" + r.discussion_id + ":" + r.kind),
      reports: reps.map(r => ({ id: r.id, kind: r.target_type, target: r.target_id, reason: r.reason, detail: r.detail || "", by: r.created_by ? N(r.created_by) : "guest", at: T(r.created_at), status: r.status === "open" ? "open" : "actioned", action: r.action || "", doneAt: T(r.handled_at) })),
      audit: mlog.map(a => ({ at: T(a.created_at), by: N(a.actor), what: a.action + (a.note ? ": " + a.note : "") })),
      hidden: ["investigations", "sources", "claims", "claim_responses", "perspectives", "open_questions", "discussions", "comments", "missing_stories", "missing_notes"].flatMap(n => D[n].filter(x => x.hidden).map(x => x.id)),
      notes: Object.fromEntries(D.context_notes.map(n => [n.target_id, n.note])),
      notifs: notif.map(n => ({ id: n.id, text: n.body, link: n.link, read: n.read, at: T(n.created_at) }))
    };
    needProfile = !!uidNow && !meP; loaded = true;
    render();
    if (needProfile) onboarding();
  }
  const REP_TABLE = { inv: "investigations", disc: "discussions", cmt: "comments", src: "sources", ms: "missing_stories" };
  const logMod = (action, type, id, note) => sb.from("moderation_log").insert({ action, target_type: type, target_id: String(id), note: note || null, actor: uidNow });

  // sign in / create account (email + password; Supabase sends the confirmation email)
  function authModal(mode = "signup") {
    const ov = modal(`<form data-form="auth"><span class="eyebrow">The Questioners’ Club</span><h2>${mode === "signup" ? "Create your account" : "Welcome back"}</h2>
      <div class="field"><label for="qaE">Email</label><input id="qaE" name="email" type="email" required autocomplete="email"></div>
      <div class="field"><label for="qaP">Password</label><input id="qaP" name="password" type="password" required minlength="8" autocomplete="${mode === "signup" ? "new-password" : "current-password"}"></div>
      ${mode === "signup" ? `<p class="muted qc-small">We’ll email you a link to confirm your address. 18+ only.</p>` : `<p class="muted qc-small"><button class="linkish" type="button" data-forgot>Forgot your password?</button></p>`}
      <button class="btn y" type="submit">${mode === "signup" ? "Create account" : "Sign in"}</button>
      <p class="muted qc-small">${mode === "signup" ? `Already a member? <button class="linkish" type="button" data-swap>Sign in</button>` : `New here? <button class="linkish" type="button" data-swap>Create an account</button>`}</p></form>`);
    ov.querySelector("[data-swap]").onclick = () => { close(ov); authModal(mode === "signup" ? "signin" : "signup"); };
    const fg = ov.querySelector("[data-forgot]"); if (fg) fg.onclick = async () => { const e = ov.querySelector("[name=email]").value.trim(); if (!e) return toast("Type your email first"); if (await rw(sb.auth.resetPasswordForEmail(e, { redirectTo: location.origin + location.pathname + "#club-home" }))) toast("Check your email for a reset link"); };
    ov.querySelector("form").onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target), email = String(f.get("email")).trim(), password = String(f.get("password"));
      const btn = e.target.querySelector("[type=submit]"); btn.disabled = true;
      const r = mode === "signup" ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname + "#club-home" } }) : await sb.auth.signInWithPassword({ email, password });
      btn.disabled = false;
      if (r.error) return toast(/confirm/i.test(r.error.message) ? "Please confirm your email first: check your inbox." : /invalid login/i.test(r.error.message) ? "Wrong email or password." : r.error.message);
      close(ov);
      if (mode === "signup" && !r.data.session) { modal(`<span class="eyebrow">Almost there</span><h2>Check your email</h2><p>We sent a confirmation link to <b>${esc(email)}</b>. Open it, and you’ll come back here signed in to pick your username.</p>`); return; }
      toast("Signed in");
    };
  }
  function newPassword() {
    const ov = modal(`<form><span class="eyebrow">Reset your password</span><h2>Choose a new password</h2><div class="field"><label for="qaN">New password</label><input id="qaN" name="password" type="password" minlength="8" required autocomplete="new-password"></div><button class="btn y" type="submit">Save password</button></form>`);
    ov.querySelector("form").onsubmit = async e => { e.preventDefault(); if (await rw(sb.auth.updateUser({ password: new FormData(e.target).get("password") }))) { close(ov); toast("Password updated. You’re signed in."); } };
  }
  function notifPanel() {
    const ov = modal(`<span class="eyebrow">Notifications</span><h2>What’s new for you</h2>${(C.notifs || []).length ? `<ul class="qc-act">${C.notifs.map(n => `<li class="${n.read ? "" : "qc-unread"}"><button type="button" class="linkish" data-link="${esc(n.link || "")}">${esc(n.text)}</button><span class="muted">${ago(n.at)}</span></li>`).join("")}</ul>` : `<p class="muted">Nothing yet. Replies, mentions and updates on things you follow show here.</p>`}`);
    ov.addEventListener("click", e => { const b = e.target.closest("[data-link]"); if (!b) return; close(ov); const [k, id] = b.dataset.link.split(":"); if (id) { sub = { t: k, id, sec: "overview" }; render(); window.scrollTo({ top: 0 }); } });
    const unread = (C.notifs || []).filter(n => !n.read).map(n => n.id);
    if (unread.length) sb.from("notifications").update({ read: true }).in("id", unread).then(() => { C.notifs.forEach(n => n.read = true); render(); });
  }
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
  const need = fn => { if (me()) return fn(); pendingAfterJoin = fn; if (remote && !uidNow) return authModal("signup"); onboarding(); };
  const log = (i, what) => { i.history.unshift({ at: now(), by: me().name, what }); };
  const follow = id => { const f = new Set(C.follows); f.has(id) ? f.delete(id) : f.add(id); C.follows = [...f]; save(); render(); toast(f.has(id) ? "Following. Updates show in Your activity." : "Unfollowed"); };

  /* ---------- page frame ---------- */
  const NAV = [["home", "Home"], ["investigations", "Investigations"], ["discussions", "Discussions"], ["missing", "Missing Stories"], ["members", "Members"], ["events", "Events"]];
  function frame(body) {
    return `<div class="wrap qc">
      <header class="qc-hero"><div><span class="eyebrow">The Red Thread · Community</span><h1>The Questioners’ Club</h1><p>Don’t take our word for it. Pull the thread. A place to question, investigate, discuss and publish, together.</p></div>
        <div class="qc-heroacts">${me() ? `${remote ? `<button type="button" class="qc-bell" data-act="notifs" aria-label="Notifications">🔔${(C.notifs || []).filter(n => !n.read).length ? `<b class="qc-count">${C.notifs.filter(n => !n.read).length}</b>` : ""}</button>` : ""}<button type="button" class="qc-mechip" data-act="member" data-id="${esc(me().name)}">@${esc(me().name)}${isTeam() ? ` · ${role()}` : ""}</button>` : remote && !uidNow ? `<button class="btn" type="button" data-act="signin">Sign in</button><button class="btn" type="button" data-act="join">Join the club</button>` : `<button class="btn" type="button" data-act="join">Join the club</button>`}<button class="btn y" type="button" data-act="create">+ Create</button></div></header>
      <p class="qc-proto">${remote ? "Live beta: everything posted here is public and shared with every member. Challenge claims, not people, and cite your sources." : "Prototype: your profile and contributions are saved in this browser only, and the people and posts already here are illustrative samples. Shared accounts come with the community backend."}</p>
      <nav class="qc-nav" aria-label="Club">${NAV.map(([k, n]) => `<button type="button" data-tab="${k}" aria-current="${tab === k ? "page" : "false"}">${n}</button>`).join("")}${isTeam() ? `<button type="button" data-tab="mod" aria-current="${tab === "mod" ? "page" : "false"}">Moderation${C.reports.filter(r => r.status === "open").length ? ` <b class="qc-count">${C.reports.filter(r => r.status === "open").length}</b>` : ""}</button>` : ""}</nav>
      <div class="qc-body">${body}</div></div>`;
  }
  function render() {
    if (!el) return;
    const body = sub && sub.t === "inv" ? invRoom(inv(sub.id)) : sub && sub.t === "disc" ? discPage(disc(sub.id)) : sub && sub.t === "member" ? profile(sub.id)
      : tab === "investigations" ? invList() : tab === "discussions" ? discList() : tab === "missing" ? missingPage() : tab === "members" ? membersPage() : tab === "events" ? eventsPage() : tab === "mod" ? modPage() : home();
    el.innerHTML = frame(body);
    const hash = "#club-" + (sub ? sub.t + ":" + sub.id : tab);
    if (!el.hidden && location.hash !== hash) history.replaceState(null, "", hash);
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
      ${remote && !loaded ? `<p class="muted">Loading the club…</p>` : ""}
      ${featured.length ? `<section><h2 class="qc-h">Featured investigations</h2><div class="qc-grid2">${featured.map(invCard).join("")}</div></section>` : `<section class="qc-empty"><h2 class="qc-h">The club is just getting started</h2><p class="muted">No investigations yet. Be the first: pick a question you’ve always wanted answered, or open any news story and press “Investigate it with the Club”.</p><div class="qc-row"><button class="btn y" type="button" data-act="new-inv">Start an investigation</button><button class="btn" type="button" data-act="new-disc">Ask a question</button></div></section>`}
      <section><div class="qc-feedhead"><h2 class="qc-h">Happening now</h2><div class="tabs">${[["foryou", "For you"], ["latest", "Latest"], ["popular", "Popular"]].map(([k, n]) => `<button type="button" data-sort="${k}" aria-pressed="${sort === k}">${n}</button>`).join("")}</div></div>
        <p class="muted qc-small">${sort === "popular" ? "Popular means meaningful contributions (sources, evidence, replies), not likes. Outrage doesn’t win here." : sort === "foryou" ? (mine.length ? "Your interests first, then everything else." : "Join and pick your interests to tailor this.") : "Everything, newest first."}</p>
        <div class="qc-list">${list.slice(0, 10).map(e => e.k === "inv" ? invCard(e.x) : discCard(e.x)).join("")}</div></section>
      ${me() ? `<section><h2 class="qc-h">Your activity</h2>${act.length ? `<ul class="qc-act">${act.map(a => `<li><span>${a.text}</span><span class="muted">${ago(a.at)}</span></li>`).join("")}</ul>` : `<p class="muted">Follow an investigation or start a discussion: replies and updates show here.</p>`}</section>` : ""}
      ${tryNext()}`;
  }
  function tryNext() {
    const open = [...C.invs].sort((a, b) => contributors(a).length - contributors(b).length)[0], q = C.discs.find(d => !d.replies.length) || C.discs[0];
    return `<section><h2 class="qc-h">Try one thing today</h2><div class="qc-grid3">
      ${open ? `<button type="button" class="qc-try" data-act="inv" data-id="${open.id}"><b>Join an investigation</b><span>${esc(open.title)}</span></button>` : `<button type="button" class="qc-try" data-act="new-inv"><b>Start the first investigation</b><span>A question worth digging into, with others.</span></button>`}
      ${q ? `<button type="button" class="qc-try" data-act="disc" data-id="${q.id}"><b>Answer a question</b><span>${esc(q.title)}</span></button>` : `<button type="button" class="qc-try" data-act="new-disc"><b>Ask the first question</b><span>Start a discussion in seconds.</span></button>`}
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
      <form class="qc-form" data-form="source"><h4>Add a source</h4><div class="qc-f2"><input name="title" required maxlength="300" placeholder="Title of the report, article or document"><input name="url" type="url" placeholder="Link (https://…)"></div><div class="qc-f3"><input name="publisher" placeholder="Publisher or author"><input name="date" placeholder="Date published"><select name="type">${["News report", "Government report", "Research paper", "Court record", "Data set", "Analysis", "Social media (unverified)", "Other"].map(o => `<option>${o}</option>`).join("")}</select></div><button class="btn y sm" type="submit">Add source</button></form>`;
    else if (sec === "claims") body = `<p class="muted qc-small">Challenge specific claims, not people. Each claim carries its own evidence status.</p>${i.claims.map(c => claimBox(i, c)).join("") || `<p class="muted">No claims yet.</p>`}
      <form class="qc-form" data-form="claim"><h4>Add a claim to examine</h4><input name="text" required maxlength="400" placeholder="One specific, checkable statement"><button class="btn y sm" type="submit">Add claim</button></form>`;
    else if (sec === "perspectives") body = `${i.perspectives.map(p => `<div class="qc-persp"><b>${esc(p.who)}</b><p>${esc(p.view)}</p><span class="muted">added by @${esc(p.by)}</span></div>`).join("") || `<p class="muted">No perspectives yet. Who sees this differently, and why?</p>`}
      <form class="qc-form" data-form="persp"><h4>Add a perspective</h4><div class="qc-f2"><input name="who" required placeholder="Whose view (a group, not a person to attack)"><input name="view" required maxlength="1000" placeholder="Their strongest argument, fairly put"></div><button class="btn y sm" type="submit">Add perspective</button></form>`;
    else if (sec === "discussion") body = thread(i.comments, "inv:" + i.id);
    else if (sec === "questions") body = `<ul class="qc-qs">${i.questions.map((q, k) => `<li class="${q.resolved ? "done" : ""}">${esc(q.text)} <span class="muted">· @${esc(q.by)}</span>${q.resolved ? " <b>answered</b>" : me() ? ` <button class="linkish" type="button" data-act="resolve" data-k="${k}">Mark answered</button>` : ""}</li>`).join("") || `<li class="muted">Nothing open yet.</li>`}</ul>
      <form class="qc-form" data-form="question"><input name="text" required maxlength="400" placeholder="What remains unanswered?"><button class="btn y sm" type="submit">Add question</button></form>`;
    else if (sec === "findings") body = (i.findings ? `<div class="qc-find">${tag(i.findings.verified ? "verified" : "community")}<p>${esc(i.findings.text).replace(/\n/g, "<br>")}</p><span class="muted">Summary by @${esc(i.findings.by)} · ${ago(i.findings.at)}${i.findings.published ? " · published to Publications" : ""}</span>
        <div class="qc-row">${!i.findings.published && canEdit ? `<button class="btn y sm" type="button" data-act="publish-findings">Publish to Publications</button>` : ""}${isTeam() && role() === "editor" && !i.findings.verified ? `<button class="btn sm" type="button" data-act="verify-findings">Mark editorially verified</button>` : ""}</div></div>`
      : `<p class="muted">No findings yet. When the evidence is in, summarise what you found, what you didn’t, and what remains open.</p>`) + `
      ${canEdit || !i.findings ? `<form class="qc-form" data-form="findings"><h4>${i.findings ? "Revise the findings" : "Write the findings"}</h4><textarea name="text" required rows="5" maxlength="20000" placeholder="What the evidence shows, what it doesn’t, and what is still open. Cite sources by name.">${i.findings ? esc(i.findings.text) : ""}</textarea><button class="btn y sm" type="submit">Save findings</button></form>` : ""}`;
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
      <form class="qc-form qc-respform" data-form="resp" data-claim="${c.id}"><div class="qc-f3"><select name="kind">${Object.entries(RESP).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select><select name="src"><option value="">No source</option>${i.sources.map(s => `<option value="${s.id}">${esc(s.title.slice(0, 50))}</option>`).join("")}</select><input name="text" required maxlength="2000" placeholder="Your evidence or point"></div><button class="btn sm" type="submit">Respond to this claim</button>${isTeam() ? ` <select class="qc-setstatus" data-claim="${c.id}" aria-label="Set claim status">${Object.keys(LABEL).filter(k => k !== "community" && (k !== "verified" || role() === "editor")).map(k => `<option value="${k}" ${c.status === k ? "selected" : ""}>${LABEL[k][0]}</option>`).join("")}</select>` : ""}</form></div>`;
  }

  /* ---------- threaded comments (investigations + discussions) ---------- */
  function thread(list, ctx) {
    return `<div class="qc-thread">${list.map(k => hidden(k.id) ? `<div class="qc-hiddenmsg">A reply is hidden pending moderator review.</div>` : `<div class="qc-cmt"><div class="qc-cmthead">${who(k.by)}<span class="muted">${ago(k.at)}</span>${rep("cmt", ctx + "/" + k.id)}</div><p>${esc(k.text)}</p>${C.notes[k.id] ? `<p class="qc-note"><b>Moderator context:</b> ${esc(C.notes[k.id])}</p>` : ""}
        ${(k.replies || []).map(r => hidden(r.id) ? "" : `<div class="qc-cmt qc-reply"><div class="qc-cmthead">${who(r.by)}<span class="muted">${ago(r.at)}</span></div><p>${esc(r.text)}</p></div>`).join("")}
        <form class="qc-form qc-replyform" data-form="reply" data-ctx="${ctx}" data-parent="${k.id}"><input name="text" required maxlength="3000" placeholder="Reply…"><button class="btn sm" type="submit">Reply</button></form></div>`).join("") || `<p class="muted">No comments yet.</p>`}
      <form class="qc-form" data-form="comment" data-ctx="${ctx}"><textarea name="text" required rows="2" maxlength="3000" placeholder="Add a comment, question or challenge. Use @name to mention someone."></textarea><button class="btn y sm" type="submit">Comment</button></form></div>`;
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
        <form class="qc-form qc-replyform" data-form="msnote" data-id="${m.id}"><input name="text" required maxlength="2000" placeholder="Add what you know or found"><button class="btn sm" type="submit">Add</button></form>
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
        <div class="qc-row">${m.self ? `<button class="btn sm" type="button" data-act="join">Edit profile</button>${remote ? `<button class="btn sm" type="button" data-act="signout">Sign out</button>` : ""}` : `<button class="btn sm" type="button" data-act="follow" data-id="@${esc(m.name)}">${C.follows.includes("@" + m.name) ? "Following" : "Follow"}</button>${rep("user", m.name)}`}</div></header>
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
    ov.querySelector("form").onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target);
      if (remote) { if (await rw(sb.from("reports").insert({ target_type: kind, target_id: String(id), reason: f.get("reason"), detail: String(f.get("detail") || "").trim() || null, created_by: uidNow || null }))) { close(ov); toast("Report sent. A moderator will review it."); reload(); } return; }
      C.reports.unshift({ id: uid("rp"), kind, target: id, reason: f.get("reason"), detail: f.get("detail"), by: me() ? me().name : "guest", at: now(), status: "open" }); save(); close(ov); toast("Report sent. A moderator will review it."); render(); };
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
  async function moderate(action, id) {
    const r = C.reports.find(x => x.id === id); if (!r) return;
    let note = "";
    if (remote) {
      const target = hideId(r), table = REP_TABLE[r.kind], label = { none: "no action needed", note: "a context note was added", hide: "hidden pending review", remove: "removed" }[action];
      if (action === "note") { note = prompt("Context note shown under the content:"); if (!note) return; if (!await rw(sb.from("context_notes").insert({ target_type: r.kind, target_id: target, note }))) return; }
      if (action === "hide") { if (table) { if (!await rw(sb.from(table).update({ hidden: true }).eq("id", target))) return; } else if (r.kind === "user") { const p = await sb.from("profiles").select("id").eq("username", target).single(); if (p.data && !await rw(sb.from("profiles").update({ suspended_until: new Date(now() + 7 * D).toISOString() }).eq("id", p.data.id))) return; } }
      if (action === "remove" && table) { if (!confirm("Remove this permanently? This can't be undone.")) return; if (!await rw(sb.from(table).delete().eq("id", target))) return; }
      if (!await rw(sb.from("reports").update({ status: "actioned", action: label, handled_by: uidNow, handled_at: new Date().toISOString() }).eq("id", r.id))) return;
      await logMod(`${label}${r.kind === "user" && action === "hide" ? " (posting paused for 7 days)" : ""} · ${r.kind} report (“${r.reason}”)`, r.kind, target, note);
      await reload(); return toast("Done. Logged in the audit log.");
    }
    if (action === "note") { note = prompt("Context note shown under the content:"); if (!note) return; C.notes[hideId(r)] = note; }
    if (action === "hide" || action === "remove") C.hidden.push(hideId(r));
    r.status = "actioned"; r.doneAt = now(); r.action = { none: "no action needed", note: "a context note was added", hide: "hidden pending review", remove: "removed" }[action];
    C.audit.unshift({ at: now(), by: me().name, what: `${r.action} · ${r.kind} report (“${r.reason}”)${note ? ": " + note : ""}` }); save(); render(); toast("Done. Logged in the audit log.");
  }

  /* ---------- modals: onboarding + create ---------- */
  function modal(html) { const ov = document.createElement("div"); ov.className = "qc-modal"; ov.setAttribute("role", "dialog"); ov.innerHTML = `<div class="qc-modalin"><button type="button" class="qc-x" aria-label="Close">×</button>${html}</div>`; document.body.append(ov); ov.querySelector(".qc-x").onclick = () => close(ov); ov.addEventListener("click", e => { if (e.target === ov) close(ov); }); return ov; }
  const close = ov => ov.remove();
  document.addEventListener("input", e => {
    const t = e.target; if (!t.closest || !t.closest(".qc-modal, .qc") || !t.maxLength || t.maxLength < 200) return;
    let c = t.nextElementSibling; if (!c || !c.classList.contains("qc-cnt")) { c = document.createElement("span"); c.className = "qc-cnt"; t.after(c); }
    c.textContent = t.value.length + " / " + t.maxLength; c.classList.toggle("near", t.value.length > t.maxLength * .9);
  });
  function onboarding() {
    const m = me() || { name: "", bio: "", interests: [] };
    const ov = modal(`<form data-form="join"><span class="eyebrow">${me() ? "Your profile" : "Join The Questioners’ Club"}</span><h2>${me() ? "Edit your profile" : "What makes you curious?"}</h2>
      <div class="field"><label for="qcN">Username</label><input id="qcN" name="name" required pattern="[A-Za-z0-9._]{3,20}" title="3–20 letters, numbers, dots or underscores" value="${esc(m.name)}" ${me() ? "readonly" : ""} placeholder="e.g. curious_kiran"></div>
      <div class="field"><label for="qcB">Short bio (optional)</label><input id="qcB" name="bio" maxlength="120" value="${esc(m.bio)}" placeholder="What do you like digging into?"></div>
      <label class="cs-lab">Choose the subjects you enjoy exploring. You can change these any time.</label>
      <div class="qc-topics">${TOPICS.map(t => `<label><input type="checkbox" name="interests" value="${esc(t)}" ${m.interests.includes(t) ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}</div>
      <label class="chk"><input type="checkbox" name="adult" required ${me() ? "checked" : ""}> I’m 18 or older and agree to the community rules: challenge claims, not people.</label>
      ${me() && !remote ? `<div class="field"><label for="qcRole">Prototype role (to try the team tools)</label><select id="qcRole" name="role">${ROLES.map(r => `<option value="${r}" ${role() === r ? "selected" : ""}>${r[0].toUpperCase() + r.slice(1)}</option>`).join("")}</select></div>` : ""}
      <p class="muted qc-small"><span data-cnt>${m.interests.length}</span> interests selected · Saved in this browser (prototype).</p><button class="btn y" type="submit">${me() ? "Save" : "Continue"}</button></form>`);
    const f = ov.querySelector("form");
    f.addEventListener("change", () => { ov.querySelector("[data-cnt]").textContent = f.querySelectorAll("[name=interests]:checked").length; });
    f.onsubmit = async e => {
      e.preventDefault(); const d = new FormData(f), name = String(d.get("name")).trim();
      if (remote) {
        const row = { username: name, bio: String(d.get("bio") || "").trim() || null, interests: d.getAll("interests"), is_adult: true };
        const ok = me() ? await rw(sb.from("profiles").update({ bio: row.bio, interests: row.interests }).eq("id", uidNow)) : await rw(sb.from("profiles").insert({ id: uidNow, ...row }));
        if (!ok) return;
        const wasNew = !me(); close(ov); await reload();
        if (wasNew) { toast(`Welcome, @${name}. Make your first contribution below.`); tab = "home"; sub = null; render(); }
        if (pendingAfterJoin) { const fn = pendingAfterJoin; pendingAfterJoin = null; fn(); }
        return;
      }
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
        <div class="field"><label for="qiT">Title</label><input id="qiT" name="title" required minlength="5" maxlength="160" value="${esc(s.title || "")}"></div>
        <div class="field"><label for="qiQ">The central question</label><input id="qiQ" name="question" required maxlength="300" value="${esc(s.question || "")}" placeholder="What exactly are you trying to find out?"></div>
        <div class="field"><label for="qiW">Why it matters</label><textarea id="qiW" name="why" rows="2" maxlength="1000">${esc(s.why || "")}</textarea></div>
        <div class="field"><label for="qiS">Sub-questions (one per line)</label><textarea id="qiS" name="subqs" rows="3" maxlength="1500"></textarea></div>
        <div class="field"><label for="qiP">Topic</label><select id="qiP" name="topic">${TOPICS.map(t => `<option ${t === (s.topic || (me().interests[0])) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
        ${s.sources && s.sources.length ? `<p class="muted qc-small">${s.sources.length} sources from the story will be attached.</p>` : ""}<button class="btn y" type="submit">Create investigation</button></form>`);
      ov.querySelector("form").onsubmit = async e => {
        e.preventDefault(); const d = new FormData(e.target);
        if (remote) {
          const r = await rw(sb.from("investigations").insert({ title: d.get("title").trim(), question: d.get("question").trim(), why: d.get("why").trim() || null, subqs: String(d.get("subqs")).split("\n").map(x => x.trim()).filter(Boolean), topic: d.get("topic"), story_id: s.story || null }).select("id").single());
          if (!r) return;
          const id = r.data.id;
          if (s.sources && s.sources.length) await rw(sb.from("sources").insert(s.sources.map(x => ({ investigation_id: id, title: String(x.title).slice(0, 300), url: /^https?:\/\//.test(x.url || "") ? x.url : null, publisher: x.publisher || null, published: x.date || null, type: x.type || "News report" }))));
          await sb.from("follows").insert({ target_type: "investigation", target_id: id });
          close(ov); await reload(); sub = { t: "inv", id, sec: "overview" }; render(); window.scrollTo({ top: 0 });
          return toast("Investigation created. Copy its link to invite others.");
        }
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
        <div class="field"><label for="qdT">Your question</label><input id="qdT" name="title" required minlength="5" maxlength="200"></div>
        <div class="field"><label for="qdW">Why am I asking this?</label><input id="qdW" name="why" required maxlength="200" placeholder="A line of context helps people give useful answers"></div>
        <div class="field"><label for="qdB">More detail (optional)</label><textarea id="qdB" name="body" rows="3" maxlength="5000"></textarea></div>
        <div class="field"><label for="qdL">Link (optional)</label><input id="qdL" name="link" type="url" placeholder="https://…"></div>
        <div class="field"><label for="qdP">Topic</label><select id="qdP" name="topic">${TOPICS.map(t => `<option ${t === me().interests[0] ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div><button class="btn y" type="submit">Post</button></form>`);
      ov.querySelector("form").onsubmit = async e => { e.preventDefault(); const d = new FormData(e.target);
        if (remote) {
          const r = await rw(sb.from("discussions").insert({ title: d.get("title").trim(), why: d.get("why").trim(), body: d.get("body").trim() || null, link: d.get("link").trim() || null, topic: d.get("topic") }).select("id").single());
          if (!r) return;
          await sb.from("follows").insert({ target_type: "discussion", target_id: r.data.id });
          close(ov); await reload(); sub = { t: "disc", id: r.data.id }; render(); return toast("Posted.");
        }
        const x = { id: uid("d"), title: d.get("title").trim(), why: d.get("why").trim(), body: d.get("body").trim(), link: d.get("link").trim(), topic: d.get("topic"), by: me().name, at: now(), react: {}, replies: [] }; C.discs.unshift(x); C.follows.push(x.id); save(); close(ov); sub = { t: "disc", id: x.id }; render(); toast("Posted."); };
    });
  }
  function newMissing() {
    need(() => {
      const ov = modal(`<form data-form="ms"><span class="eyebrow">Missing story</span><h2>What isn’t the news covering?</h2>
        <div class="qc-f2"><div class="field"><label for="qmH">Headline</label><input id="qmH" name="headline" required minlength="5" maxlength="160"></div><div class="field"><label for="qmP">Location</label><input id="qmP" name="place" required maxlength="80"></div></div>
        <div class="field"><label for="qmW">What happened?</label><textarea id="qmW" name="what" required rows="2"></textarea></div>
        <div class="field"><label for="qmY">Why does it matter?</label><textarea id="qmY" name="why" required rows="2"></textarea></div>
        <div class="field"><label for="qmS">Supporting sources (links or descriptions)</label><textarea id="qmS" name="sources" rows="2"></textarea></div>
        <div class="field"><label for="qmN">What needs further investigation?</label><input id="qmN" name="next"></div>
        <p class="muted qc-small">Don’t post private people’s personal details. Submissions go to Community research, then Editorial review.</p><button class="btn y" type="submit">Submit</button></form>`);
      ov.querySelector("form").onsubmit = async e => { e.preventDefault(); const d = new FormData(e.target);
        if (remote) {
          const v = k => String(d.get(k) || "").trim();
          if (!await rw(sb.from("missing_stories").insert({ headline: v("headline"), place: v("place"), what: v("what"), why: v("why"), sources: v("sources") || null, next: v("next") || null }))) return;
          close(ov); await reload(); tab = "missing"; sub = null; render(); return toast("Submitted. The community can now add to it.");
        }
        C.missing.unshift({ id: uid("m"), ...Object.fromEntries(["headline", "place", "what", "why", "sources", "next"].map(k => [k, String(d.get(k) || "").trim()])), by: me().name, at: now(), status: "submitted", notes: [] }); save(); close(ov); tab = "missing"; sub = null; render(); toast("Submitted. The community can now add to it."); };
    });
  }

  /* ---------- actions ---------- */
  function act(a, b) {
    const id = b && b.dataset.id;
    if (remote) {
      if (a === "join") return uidNow ? onboarding() : authModal("signup");
      if (a === "signin") return authModal("signin");
      if (a === "signout") return sb.auth.signOut().then(() => { toast("Signed out"); tab = "home"; sub = null; });
      if (a === "notifs") return notifPanel();
      const after = async q => { if (await rw(q)) await reload(); };
      if (a === "follow") return need(() => { const type = id.startsWith("@") ? "member" : inv(id) ? "investigation" : "discussion", tid = id.replace(/^@/, "");
        return C.follows.includes(id) ? after(sb.from("follows").delete().match({ user_id: uidNow, target_type: type, target_id: tid })).then(() => toast("Unfollowed")) : after(sb.from("follows").upsert({ user_id: uidNow, target_type: type, target_id: tid })).then(() => toast("Following. Updates show in your notifications.")); });
      if (a === "save") return need(() => after(sb.from("follows").upsert({ user_id: uidNow, target_type: "discussion", target_id: id, saved: !C.saved.includes(id) })));
      if (a === "rsvp") return need(() => (C.rsvp || []).includes(id) ? after(sb.from("event_interest").delete().match({ event_id: id, user_id: uidNow })) : after(sb.from("event_interest").insert({ event_id: id })));
      if (a === "react") return need(() => (C.myReacts || []).includes("r:" + sub.id + ":" + b.dataset.k) ? toast("You already marked this") : after(sb.from("reactions").insert({ discussion_id: sub.id, kind: b.dataset.k })));
      if (a === "resolve") return need(() => after(sb.from("open_questions").update({ resolved: true }).eq("id", inv(sub.id).questions[+b.dataset.k].id)));
      if (a === "verify-findings") return (async () => { if (await rw(sb.from("findings").update({ verified: true }).eq("investigation_id", sub.id))) { await logMod("verified findings", "inv", sub.id); await reload(); } })();
    }
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
    if (remote) { if (await rw(sb.from("findings").update({ published: true }).eq("investigation_id", i.id))) await reload(); }
    else { i.findings.published = true; log(i, "published the findings"); save(); render(); } toast("Published to Publications as community research.", "View", () => RS.show("post", p.id));
  }
  async function submitRemote(form, d, k, i, txt) {
    const v = n => String(d.get(n) || "").trim(), btn = form.querySelector("[type=submit]");
    let q = null;
    if (k === "source") q = sb.from("sources").insert({ investigation_id: i.id, title: v("title"), url: /^https?:\/\//.test(v("url")) ? v("url") : null, publisher: v("publisher") || null, published: v("date") || null, type: v("type") });
    else if (k === "claim") q = sb.from("claims").insert({ investigation_id: i.id, body: txt });
    else if (k === "resp") q = sb.from("claim_responses").insert({ claim_id: form.dataset.claim, kind: v("kind"), body: txt, source_id: v("src") || null });
    else if (k === "persp") q = sb.from("perspectives").insert({ investigation_id: i.id, who: v("who"), view: v("view") });
    else if (k === "question") q = sb.from("open_questions").insert({ investigation_id: i.id, body: txt });
    else if (k === "findings") q = i.findings ? sb.from("findings").update({ body: txt, updated_at: new Date().toISOString() }).eq("investigation_id", i.id) : sb.from("findings").insert({ investigation_id: i.id, body: txt });
    else if (k === "msnote") q = sb.from("missing_notes").insert({ story_id: form.dataset.id, body: txt });
    else if (k === "comment" || k === "reply") { const [t, x] = form.dataset.ctx.split(":"); q = sb.from("comments").insert({ [t === "inv" ? "investigation_id" : "discussion_id"]: x, parent_id: k === "reply" ? form.dataset.parent : null, body: txt }); }
    if (!q) return;
    if (btn) btn.disabled = true;
    const ok = await rw(q);
    if (btn) btn.disabled = false;
    if (ok) await reload();
  }
  function submit(form) {
    const d = new FormData(form), k = form.dataset.form, i = sub && sub.t === "inv" ? inv(sub.id) : null, txt = String(d.get("text") || "").trim();
    if (remote) return submitRemote(form, d, k, i, txt);
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
        if (remote) {
          const c2 = e.target.closest(".qc-setstatus"), m2 = e.target.closest(".qc-msstatus");
          if (c2) rw(sb.from("claims").update({ status: c2.value }).eq("id", c2.dataset.claim)).then(r => r && logMod(`claim status → ${LABEL[c2.value][0]}`, "claim", c2.dataset.claim)).then(reload);
          if (m2) rw(sb.from("missing_stories").update({ status: m2.value }).eq("id", m2.dataset.id)).then(r => r && logMod(`missing story → ${PIPE.find(p => p[0] === m2.value)[1]}`, "ms", m2.dataset.id)).then(reload);
          return;
        }
        const c = e.target.closest(".qc-setstatus"); if (c) { const i = inv(sub.id), cl = i.claims.find(x => x.id === c.dataset.claim); cl.status = c.value; log(i, `set a claim to “${LABEL[c.value][0]}”`); C.audit.unshift({ at: now(), by: me().name, what: `claim status → ${LABEL[c.value][0]} · ${cl.text.slice(0, 60)}` }); save(); render(); return; }
        const ms = e.target.closest(".qc-msstatus"); if (ms) { const x = C.missing.find(y => y.id === ms.dataset.id); x.status = ms.value; C.audit.unshift({ at: now(), by: me().name, what: `missing story → ${PIPE.find(p => p[0] === ms.value)[1]} · ${x.headline.slice(0, 60)}` }); save(); render(); }
      });
    },
    // arg: "inv:<id>", "disc:<id>", "member:<name>", a tab name, or "new:<storyId>" to start an investigation from a news story
    show(arg, root) { this.open(arg, root); },
    async open(arg, root) {
      el = root || el;
      if (!boot) {
        if (CFG.supabaseUrl) el.innerHTML = `<div class="wrap qc"><p class="muted">Opening The Questioners’ Club…</p></div>`;
        boot = connect().then(ok => ok ? reload() : null);
      }
      await boot;
      if (!remote) C = store.get(KEY, null) || C;
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
  // arriving from a confirmation or password-reset email: open the Club so the sign-in can finish
  if (/access_token=|error_description=/.test(location.hash)) addEventListener("load", () => RS.show("club"));
})();
