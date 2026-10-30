/* THE RED THREAD — Publications (Substack-style), editor, post reader, chat, clip maker, Studio, Shameboard, Mastery, Kids, Magazine, Library. */
(function () {
  const { $, $$, esc, store, st, cite, cites, toast, sig, show, AI } = RS;
  const C = CASE;
  // Inside claude.ai the page runs in an embedded frame that browsers don't give cameras to, whatever the site settings say.
  RS.camEmbedded = () => { try { const p = document.permissionsPolicy || document.featurePolicy; if (p && p.allowsFeature) return !p.allowsFeature("camera"); } catch { } return window.top !== window; };
  RS.camHelp = e => e && e.name === "NotFoundError" ? "No camera found on this device."
    : RS.camEmbedded() ? "Your camera is allowed, but claude.ai doesn't let embedded pages use it. Use “Record on my phone” below, or open the site directly (localhost or its own web address) to record here."
    : "Camera access is blocked. Allow camera and microphone for this site (the camera icon in the address bar), then try again.";
  const ct = s => esc(s).replace(/\[(S\d{1,2})\]/g, (m, id) => C.sources[id] ? cite(id) : "");
  const today = () => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const MORE_PUBS = [{ id: "kisan", name: "Kisan Ledger", by: "Sample author: Gurpreet B.", desc: "Farm economics without the shouting.", color: "#FF8A3D", topics: ["Economy"] }, { id: "nefiles", name: "North-East Files", by: "Sample author: Lalremruati", desc: "Stories from the region national TV skips.", color: "#2FD3A6", topics: ["Local"] }];
  const ALL_PUBS = () => [...PUBS, ...MORE_PUBS];
  const follows = () => new Set(store.get("follows", []));
  function toggleFollow(id) { const f = follows(); f.has(id) ? f.delete(id) : f.add(id); store.set("follows", [...f]); toast(f.has(id) ? "Subscribed" : "Unsubscribed"); return f.has(id); }
  const base = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 9973; return h; };

  /* ================= PUBLICATIONS (Substack-style) ================= */
  const SS_NAV = [["home", "Home", "⌂"], ["subs", "Subscriptions", "▤"], ["chat", "Chat", "◌"], ["activity", "Activity", "♢"], ["explore", "Explore", "⌕"], ["profile", "Your publication", "◉"]];
  RS.V.publications = {
    tab: "home",
    show(arg, el) {
      if (arg === "chat") return show("chat");
      if (arg) this.tab = arg;
      if (this.tab === "chat") this.tab = "home";
      const me = RS.myPub(), f = follows();
      el.innerHTML = `<div class="ss">
        <aside class="ss-nav">${SS_NAV.map(([k, n, i]) => `<button type="button" data-ss="${k}" aria-current="${k === this.tab ? "page" : "false"}"><span aria-hidden="true">${i}</span>${n}</button>`).join("")}
          <button class="btn r" type="button" id="ssCreate" style="margin-top:10px">+ Create</button>
          <div class="ss-create" id="ssMenu" hidden><button type="button" data-go="write" data-arg="new">New article</button><button type="button" data-go="investigate" data-arg="|notes">From my research notes</button><button type="button" data-go="board">From my whiteboard</button></div></aside>
        <main class="ss-main" id="ssMain"></main>
        <aside class="ss-side"><h3>Subscriptions</h3><div class="subgrid">${[...f].map(id => ALL_PUBS().find(p => p.id === id)).filter(Boolean).map(p => `<button type="button" title="${esc(p.name)}" data-pubv="${p.id}">${RS.logo({ name: p.name, c: p.color }, "lg")}<span>${esc(p.name)}</span></button>`).join("") || `<p class="muted" style="font-size:13.5px">Subscribe to publications to see them here.</p>`}</div>
          <h3 style="margin-top:18px">Rising on ${esc(BRAND.short)}</h3><ol class="rising">${ALL_PUBS().map((p, i) => `<li><span class="rk">${i + 1}</span>${RS.logo({ name: p.name, c: p.color })}<span class="nm"><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></span><button type="button" class="subbtn ${f.has(p.id) ? "on" : ""}" data-sub="${p.id}">${f.has(p.id) ? "Subscribed" : "Subscribe"}</button></li>`).join("")}</ol></aside></div>`;
      $$("[data-ss]", el).forEach(b => b.onclick = () => { if (b.dataset.ss === "chat") return show("chat"); this.tab = b.dataset.ss; this.show(null, el); });
      $("#ssCreate").onclick = () => { $("#ssMenu").hidden = !$("#ssMenu").hidden; };
      $$("[data-sub]", el).forEach(b => b.onclick = () => { toggleFollow(b.dataset.sub); this.show(null, el); });
      $$("[data-pubv]", el).forEach(b => b.onclick = () => { this.tab = "pub:" + b.dataset.pubv; this.show(null, el); });
      const m = $("#ssMain"), posts = RS.allPosts();
      if (this.tab === "home") m.innerHTML = `<h2 class="ss-h">For you</h2>${posts.map(postCard).join("")}`;
      else if (this.tab === "subs") { const ps = posts.filter(p => f.has(p.pub) || p.mine); m.innerHTML = `<h2 class="ss-h">From your subscriptions</h2>${ps.map(postCard).join("") || `<div class="empty">Subscribe to a publication on the right to fill this feed.</div>`}`; }
      else if (this.tab === "activity") { const likes = store.get("likes", {}), cm = store.get("comments", {}); m.innerHTML = `<h2 class="ss-h">Activity</h2><div class="post-list">${Object.keys(likes).filter(k => likes[k]).map(id => `<div class="post-row"><span>♥ You liked <b>${esc(posts.find(p => p.id === id)?.title || "a post")}</b></span></div>`).join("")}${Object.entries(cm).flatMap(([id, a]) => a.map(c => `<div class="post-row"><span>You commented (${esc(c.t)}) on <b>${esc(posts.find(p => p.id === id)?.title || "a post")}</b>: “${esc(c.x)}”</span></div>`)).join("") || `<div class="empty">Likes, comments and new subscribers show up here.</div>`}</div>`; }
      else if (this.tab === "explore") m.innerHTML = `<h2 class="ss-h">Explore publications</h2><div class="explore">${ALL_PUBS().map(p => `<div class="excard" style="--c:${p.color}"><div class="exc-top">${RS.logo({ name: p.name, c: p.color }, "lg")}<button type="button" class="subbtn ${f.has(p.id) ? "on" : ""}" data-sub2="${p.id}">${f.has(p.id) ? "Subscribed" : "Subscribe"}</button></div><b>${esc(p.name)}</b><span class="muted">${esc(p.by)}</span><p>${esc(p.desc)}</p></div>`).join("")}</div>`;
      else if (this.tab === "profile") {
        const mine = posts.filter(p => p.mine);
        m.innerHTML = `<div class="pubcover" style="--c:${me.color}"><span class="pn">${esc(me.name)}</span></div>
          <div class="field" style="margin-top:14px"><label for="pmName">Publication name</label><input id="pmName" value="${esc(me.name)}"></div>
          <div class="field"><label for="pmDesc">One-line description</label><input id="pmDesc" value="${esc(me.desc)}"></div>
          <div class="field"><label for="pmHandle">Instagram handle (used on your clips)</label><input id="pmHandle" value="${esc(me.handle || "@genzdispatch")}"></div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="mono muted">Colour</span>${["#FF4D6D", "#3D5AFE", "#2FD3A6", "#B69CFF", "#FF8A3D", "#171717"].map(c => `<button type="button" data-col="${c}" aria-label="Colour ${c}" class="swatch ${c === me.color ? "on" : ""}" style="background:${c}"></button>`).join("")}<button class="btn sm" type="button" id="pmSave" style="margin-left:auto">Save</button></div>
          <div class="statrow"><div><b>${mine.length}</b><span>posts</span></div><div><b>${mine.reduce((a, p) => a + (store.get("likes", {})[p.id] ? 1 : 0), 0)}</b><span>likes</span></div><div><b>${store.get("clips", []).length}</b><span>clips made</span></div></div>
          <h2 class="ss-h">Your posts</h2>${mine.map(postCard).join("") || `<div class="empty">Nothing published yet. Use + Create, or “Write my article” in Investigate.</div>`}`;
        let col = me.color;
        $$("[data-col]", m).forEach(b => b.onclick = () => { col = b.dataset.col; $$("[data-col]", m).forEach(x => x.classList.toggle("on", x === b)); });
        $("#pmSave").onclick = () => { store.set("mypub", { ...me, name: $("#pmName").value.trim() || me.name, desc: $("#pmDesc").value.trim(), handle: $("#pmHandle").value.trim(), color: col }); toast("Publication saved"); this.show(null, el); };
      } else if (this.tab.startsWith("pub:")) {
        const p = ALL_PUBS().find(x => x.id === this.tab.slice(4));
        m.innerHTML = `<div class="pubcover" style="--c:${p.color}"><span class="pn">${esc(p.name)}</span></div><p style="margin:12px 0">${esc(p.desc)} <span class="muted">${esc(p.by)}</span></p><button type="button" class="subbtn ${f.has(p.id) ? "on" : ""}" data-sub2="${p.id}">${f.has(p.id) ? "Subscribed" : "Subscribe"}</button>${posts.filter(x => x.pub === p.id).map(postCard).join("") || `<div class="empty" style="margin-top:14px">No posts from this sample publication yet.</div>`}`;
      }
      $$("[data-sub2]", m).forEach(b => b.onclick = () => { toggleFollow(b.dataset.sub2); this.show(null, el); });
      wireActions(m, () => this.show(null, el));
    }
  };
  function counts(p) { const likes = store.get("likes", {}), rs = store.get("restacks", {}), cm = (store.get("comments", {})[p.id] || []).length; const b = p.mine ? 0 : base(p.id);
    return { like: (p.mine ? 0 : 40 + b % 900) + (likes[p.id] ? 1 : 0), liked: !!likes[p.id], rs: (p.mine ? 0 : 3 + b % 60) + (rs[p.id] ? 1 : 0), rsd: !!rs[p.id], cm: (p.mine ? 0 : 1 + b % 40) + cm }; }
  const actionBar = p => { const c = counts(p); return `<div class="actbar"><button type="button" data-like="${p.id}" aria-pressed="${c.liked}">♥ ${c.like}</button><button type="button" data-go="post" data-arg="${p.id}">💬 ${c.cm}</button><button type="button" data-rs="${p.id}" aria-pressed="${c.rsd}">↻ ${c.rs}</button><button type="button" data-shr="${p.id}">Share</button></div>`; };
  function postCard(p) {
    const pub = RS.pubOf(p) || { name: "?", color: "#999" };
    return `<article class="pcard"><div class="pc-by">${RS.logo({ name: pub.name, c: pub.color })}<b>${esc(pub.name)}</b><span class="muted">· ${esc(p.date)}</span>${p.mine ? `<span class="youtag">You</span>` : ""}</div>
      <button type="button" class="pc-body" data-go="post" data-arg="${p.id}">${RS.art(p.storyId || p.id, 100)}<span class="pc-t">${esc(p.title)}</span><span class="pc-s">${esc(p.dek)}</span><span class="mono muted" style="font-size:11px">${esc(p.format)} · ${p.srcCount} sources${p.mastery ? " · author is " + esc(p.mastery) : ""}</span></button>${actionBar(p)}</article>`;
  }
  function wireActions(root, rerender) {
    $$("[data-like]", root).forEach(b => b.onclick = () => { const l = store.get("likes", {}); l[b.dataset.like] = !l[b.dataset.like]; store.set("likes", l); rerender(); });
    $$("[data-rs]", root).forEach(b => b.onclick = () => { const l = store.get("restacks", {}); l[b.dataset.rs] = !l[b.dataset.rs]; store.set("restacks", l); toast(l[b.dataset.rs] ? "Restacked to your feed" : "Restack removed"); rerender(); });
    $$("[data-shr]", root).forEach(b => b.onclick = () => { const p = RS.allPosts().find(x => x.id === b.dataset.shr); RS.shareToChat({ kind: "post", id: p.id, title: p.title }); });
  }

  /* ================= EDITOR ================= */
  let draft = store.get("draft", null), dT;
  RS.openEditor = d => { draft = { title: d.title || "", subtitle: d.subtitle || "", html: d.html || "", storyId: d.storyId || "", aiDraft: !!d.aiDraft, editing: d.editing || null }; store.set("draft", draft); show("write"); };
  RS.V.write = {
    show(arg, el) {
      if (arg === "new" || !draft) { draft = { title: "", subtitle: "", html: "<p></p>", storyId: "" }; store.set("draft", draft); }
      const me = RS.myPub();
      el.innerHTML = `<div class="ed-top"><div class="wrap ed-top-in"><button class="linkish" type="button" data-go="publications">← ${esc(me.name)}</button><span class="mono muted" id="edSaved">Draft · saved</span>
          <span style="margin-left:auto;display:flex;gap:8px"><button class="btn sm" type="button" id="edPrev">Preview</button><button class="btn r sm" type="button" id="edCont">Continue →</button></span></div></div>
        <div class="ed-wrap">${draft.aiDraft ? `<div class="aidraft">✦ Drafted by ${AI} from your notes. Read it closely: change anything that doesn't sound like you, and fix every “needs a source”.</div>` : ""}
          <div class="ed-tools" role="toolbar" aria-label="Formatting">${[["bold", "B"], ["italic", "<i>I</i>"], ["h2", "H"], ["quote", "❝"], ["ul", "• List"]].map(([k, l]) => `<button type="button" data-fmt="${k}">${l}</button>`).join("")}<select id="edCite" aria-label="Insert a source"><option value="">+ Source</option>${Object.entries(C.sources).map(([k, s]) => `<option value="${k}">${k} · ${esc(s.title)}</option>`).join("")}</select></div>
          <h1 class="ed-title" contenteditable="true" data-ph="Title" id="edTitle">${esc(draft.title)}</h1>
          <p class="ed-sub" contenteditable="true" data-ph="Add a subtitle…" id="edSub">${esc(draft.subtitle)}</p>
          <div class="ed-by">${RS.logo({ name: me.name, c: me.color })}<b>You</b><span class="muted">· ${esc(me.name)}</span></div>
          <div class="ed-body" contenteditable="true" data-ph="Start writing…" id="edBody">${draft.html}</div></div>
        <div class="pubpanel" id="pubPanel" hidden></div>`;
      const save = () => { clearTimeout(dT); $("#edSaved").textContent = "Saving…"; dT = setTimeout(() => { draft = { ...draft, title: $("#edTitle").innerText.trim(), subtitle: $("#edSub").innerText.trim(), html: $("#edBody").innerHTML }; store.set("draft", draft); $("#edSaved").textContent = "Draft · saved"; }, 400); };
      ["#edTitle", "#edSub", "#edBody"].forEach(s => $(s).addEventListener("input", save));
      $$("[data-fmt]", el).forEach(b => b.onmousedown = e => { e.preventDefault(); const k = b.dataset.fmt;
        if (k === "bold" || k === "italic") document.execCommand(k); if (k === "h2") document.execCommand("formatBlock", false, "h2"); if (k === "quote") document.execCommand("formatBlock", false, "blockquote"); if (k === "ul") document.execCommand("insertUnorderedList"); save(); });
      $("#edCite").onchange = e => { const k = e.target.value; e.target.value = ""; if (!k) return; $("#edBody").focus(); document.execCommand("insertHTML", false, ` <button type="button" class="cite" data-src="${k}" contenteditable="false">${k}</button> `); save(); };
      $("#edPrev").onclick = () => { el.classList.toggle("preview"); $$("[contenteditable]", el).forEach(x => x.contentEditable = el.classList.contains("preview") ? "false" : "true"); $("#edPrev").textContent = el.classList.contains("preview") ? "Edit" : "Preview"; };
      $("#edCont").onclick = () => this.panel(el);
    },
    panel(el) {
      const title = $("#edTitle").innerText.trim(), body = $("#edBody").innerText.trim();
      if (!title || body.length < 40) { toast("Add a title and a few sentences before publishing"); return; }
      const needs = $$("#edBody .needsrc").length, srcs = [...new Set($$("#edBody .cite").map(c => c.dataset.src))];
      const p = $("#pubPanel"); p.hidden = false; $("#scrim").hidden = false;
      p.innerHTML = `<h2 class="display" style="font-size:34px">Ready to publish?</h2>
        <div class="method"><span>${srcs.length ? "✓" : "!"} ${srcs.length} sources cited</span><span>${needs ? "! " + needs + " line(s) still marked “needs a source”" : "✓ Nothing marked “needs a source”"}</span><span>✓ Your opinions are written as yours</span></div>
        <div class="field"><label>Audience</label><div class="tabs"><button type="button" aria-pressed="true">Everyone</button></div></div>
        <label class="chk"><input type="checkbox" id="ppEmail" checked> Email it to my subscribers (demo: nothing is sent)</label>
        <div class="field ppreel"><label>Add a reel <span class="muted" style="font-weight:500">(optional)</span></label>
          <p class="muted" style="font-size:13px;margin:0">Turn what you wrote into a news-style reel: use the animation, record yourself with the pop-ups on screen, or add them to a video you shot. It shows up in Reels with a button to read the full story.</p>
          <div class="ppvid" id="ppVidBtns"><button class="btn y" type="button" id="ppStudio">🎬 Open the reel studio</button></div>
          <div id="ppVidPrev"></div></div>
        <label class="chk"><input type="checkbox" id="ppClip"> Open the news clip maker straight after</label>
        <div style="display:flex;gap:8px"><button class="btn" type="button" id="ppBack">Keep editing</button><button class="btn r" type="button" id="ppGo">Publish now</button></div>`;
      let reel = null;
      const showReel = () => { const box = $("#ppVidPrev"); if (!reel) { box.innerHTML = ""; $("#ppVidBtns").hidden = false; $("#ppGo").textContent = "Publish now"; return; }
        box.innerHTML = `<div class="ppvidprev"><video src="${URL.createObjectURL(reel)}" muted playsinline loop autoplay></video><div><b>Reel attached</b><span class="muted">${(reel.size / 1048576).toFixed(1)} MB</span><button class="linkish" type="button" id="ppVidX">Remove</button></div></div>`;
        $("#ppVidBtns").hidden = true; $("#ppGo").textContent = "Publish article + reel"; $("#ppVidX").onclick = () => { reel = null; showReel(); }; };
      $("#ppStudio").onclick = () => RS.reelStudio({ title, dek: $("#edSub").innerText.trim(), html: $("#edBody").innerHTML.replace(/ contenteditable="(true|false)"/g, ""), onDone: b => { reel = b; showReel(); } });
      const close = () => { p.hidden = true; $("#scrim").hidden = true; };
      $("#ppBack").onclick = close;
      $("#ppGo").onclick = async () => {
        close(); const L = RS.level();
        const html = $("#edBody").innerHTML.replace(/ contenteditable="(true|false)"/g, "");
        const post = { id: draft.editing || "u" + Date.now().toString(36), pub: "mine", title, dek: $("#edSub").innerText.trim(), date: today(), format: "Article", srcCount: srcs.length, sources: srcs, mastery: L.lvl ? RS.LEVELS[L.lvl - 1] : "", body: html, storyId: draft.storyId };
        let posts = store.get("posts", []).filter(x => x.id !== post.id); posts.unshift(post); store.set("posts", posts); store.set("published", true);
        draft = null; store.set("draft", null);
        const clipNext = $("#ppClip").checked;
        await RS.publishShared(post);
        if (reel) await RS.attachReel(post, reel);
        RS.published(post, clipNext);
      };
    }
  };

  /* ================= POST READER ================= */
  const CTYPES = ["Comment", "Additional evidence", "Counterargument", "Clarification", "Correction request", "Relevant context", "Unanswered question", "Suggest a source"];
  const SAMPLE_COMMENTS = { p1: [{ t: "Clarification", by: "Sample reader", x: "So the 4 Nov hearing could still end without any decision on a re-test?" }], p2: [{ t: "Additional evidence", by: "Sample reader", x: "Two Bengaluru centres published seating plans; worth checking against the agency list." }] };
  RS.V.post = {
    show(id, el) {
      const p = RS.allPosts().find(x => x.id === id);
      if (!p && !postsReady) { el.innerHTML = `<div class="wrap section"><div class="empty">Loading the story…</div></div>`; return; }
      if (!p) { el.innerHTML = `<div class="wrap section"><div class="empty">That post isn't available in this browser's demo data. <button class="linkish" type="button" data-go="publications">Back to publications</button></div></div>`; return; }
      const pub = RS.pubOf(p), f = follows(), cm = [...(SAMPLE_COMMENTS[p.id] || []), ...(store.get("comments", {})[p.id] || [])];
      const render = () => this.show(id, el);
      el.innerHTML = `<div class="rd-top"><div class="rd-top-in">${RS.logo({ name: pub.name, c: pub.color })}<b>${esc(pub.name)}</b><span style="margin-left:auto;display:flex;gap:8px">${p.mine ? `<button class="btn sm" type="button" id="pShareMine">🔗 Share</button><button class="btn sm" type="button" id="pEdit">Edit</button><button class="btn y sm" type="button" data-go="clip" data-arg="${p.id}">▶ Make a news clip</button>` : `<button type="button" class="subbtn ${f.has(p.pub) ? "on" : ""}" id="pSub">${f.has(p.pub) ? "Subscribed" : "Subscribe"}</button>`}</span></div></div>
        <article class="reader"><span class="eyebrow">${esc(pub.name)}</span><h1>${esc(p.title)}</h1><p class="rd-sub">${esc(p.dek)}</p><p class="mono muted">${esc(p.date)} · ${p.mine ? "by you" : esc(pub.by || "")}${p.mastery ? ` · author's mastery on this story: ${esc(p.mastery)} (a signal, not proof)` : ""}</p>
          <div class="rd-art">${RS.art(p.storyId || p.id, 110)}</div>${actionBar(p)}
          <div class="rd-body">${p.mine ? p.body : p.body.replace(/\[(S\d{1,2})\]/g, (m, s) => cite(s))}</div>
          ${p.sources?.length ? `<div class="method"><b>Sources in this post</b>${p.sources.map(s => `<span>${cite(s)} ${esc(C.sources[s]?.title || "")}</span>`).join("")}</div>` : ""}
          ${actionBar(p)}
          <section class="comments"><h2 class="display" style="font-size:30px">Discussion</h2>
            ${cm.length ? cm.map(c => `<div class="cmt"><span class="ct">${esc(c.t)}</span><b>${esc(c.by)}</b><p>${esc(c.x)}</p></div>`).join("") : `<div class="empty">No comments yet. Add evidence, a counterargument or a question.</div>`}
            <form class="cmt-form" id="cmtForm"><label class="sr" for="cmtType">Type</label><select id="cmtType">${CTYPES.map(t => `<option>${t}</option>`).join("")}</select><label class="sr" for="cmtText">Comment</label><textarea id="cmtText" placeholder="Be specific. If you're adding evidence, say where it's from."></textarea><div><button class="btn sm" type="submit">Post</button> <span class="mono muted">Saved in this browser (demo).</span></div></form></section></article>`;
      wireActions(el, render);
      if ($("#pSub")) $("#pSub").onclick = () => { toggleFollow(p.pub); render(); };
      if ($("#pShareMine")) $("#pShareMine").onclick = () => RS.published(p, false);
      if ($("#pEdit")) $("#pEdit").onclick = () => RS.openEditor({ title: p.title, subtitle: p.dek, html: p.body, storyId: p.storyId, editing: p.id });
      $("#cmtForm").addEventListener("submit", e => { e.preventDefault(); const x = $("#cmtText").value.trim(); if (!x) return toast("Write something first"); const all = store.get("comments", {}); (all[p.id] = all[p.id] || []).push({ t: $("#cmtType").value, by: "You", x }); store.set("comments", all); render(); toast("Comment posted"); });
    }
  };

  /* ================= CHAT: friends (DMs) + group chats ================= */
  // Messages live in the shared "chat" collection. A DM's ch is "dm:<idA>|<idB>" (ids sorted) and it carries members [idA, idB];
  // your friend list is private to you at data/users/<you>/friends. Offline (no Claude), demo friends keep messages in this browser.
  let db = null, user = null, uid = null, chatReady = false, unsub = null, unsubDm = null, ch = "general", pendingAtt = null, msgs = [], dmLast = {}, friendIds = [], adding = false;
  const DEMO = [
    { id: "demo-aarav", name: "Aarav", c: "#2DD4BF", seed: [["them", "did you see the sand mining one? 3 villages lost their water"], ["me", "only 6 outlets covered it. pulling the thread now"], ["them", "send me your article when it's done 👀"]] },
    { id: "demo-meera", name: "Meera", c: "#A78BFA", seed: [["them", "is the exam leak actually nationwide or is that just twitter"], ["me", "agency says two centres. police FIR says four arrests. still checking"]] }
  ];
  const isDm = c => c.startsWith("dm:");
  const dmId = other => "dm:" + [uid || "me", other].sort().join("|");
  const otherOf = c => { const p = c.slice(3).split("|"); return p[0] === (uid || "me") ? p[1] : p[0]; };
  const fmtT = at => { const d = new Date(at), now = new Date(); return d.toDateString() === now.toDateString() ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
  async function people(ids) { if (!user || !ids.length) return {}; try { return await user.profiles(ids); } catch { return {}; } }
  (async () => {
    try { [db, user] = await Promise.all([window.claude?.use?.("db"), window.claude?.use?.("user")]); uid = user ? await user.id() : null; } catch { db = null; }
    if (!uid) db = null;
    if (db) {
      ch = "general";
      db.collection("data/users/" + uid).doc("friends").onSnapshot(s => { friendIds = (s.exists && s.data().ids) || []; if (!$("#v-chat")?.hidden) RS.V.chat.list(); }, () => {});
      unsubDm = db.collection("chat").where("members", "array-contains", uid).orderBy("at", "desc").limit(300).onSnapshot(snap => {
        dmLast = {}; snap.docs.forEach(d => { const m = d.data(); if (!dmLast[m.ch]) dmLast[m.ch] = m; });
        if (!$("#v-chat")?.hidden) RS.V.chat.list();
      }, () => {});
    } else ch = dmId("demo-aarav");
    RS._db = db; RS._uid = uid; chatReady = true; if (!$("#v-chat")?.hidden) RS.V.chat.show();
  })();
  function localAll() {
    let all = store.get("localchat2", null);
    if (!all) { all = []; let t = Date.now() - 36e5; DEMO.forEach(f => f.seed.forEach(([who, text]) => all.push({ ch: dmId(f.id), text, at: (t += 6e4), from: who === "me" ? "me" : f.id }))); store.set("localchat2", all); }
    return all;
  }
  RS.shareToChat = att => { pendingAtt = att; show("chat"); toast("Pick a friend or group and send"); };

  /* ---- shared posts: what you publish is readable by everyone the page is shared with ---- */
  const SHARE_BASE = "https://claude.ai/artifact/3bUQpKdqMiNa4wJE2NokfL";
  RS.shareLink = id => (window.top === window && /^https?:$/.test(location.protocol) ? location.origin + location.pathname : SHARE_BASE) + "#post-" + id;
  const SAFE = new Set(["P", "H2", "H3", "UL", "OL", "LI", "B", "STRONG", "I", "EM", "BLOCKQUOTE", "BR", "SPAN"]);
  function clean(html) { // other people's posts are untrusted: keep plain text formatting and citation chips only
    const doc = new DOMParser().parseFromString("<div>" + String(html || "") + "</div>", "text/html"), root = doc.body.firstChild;
    (function walk(n) { [...n.childNodes].forEach(c => { if (c.nodeType === 3) return; if (c.nodeType !== 1 || !SAFE.has(c.tagName)) { if (c.nodeType === 1 && !["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(c.tagName)) { walk(c); c.replaceWith(...c.childNodes); } else c.remove(); return; }
      const src = c.getAttribute("data-src"); [...c.attributes].forEach(a => c.removeAttribute(a.name)); if (c.tagName === "SPAN" && /^S\d{1,2}$/.test(src || "")) { c.className = "cite"; c.dataset.src = src; } walk(c); }); })(root);
    return root.innerHTML;
  }
  let postsReady = false;
  (async () => {
    for (let i = 0; i < 40 && !chatReady; i++) await new Promise(r => setTimeout(r, 250));
    if (!db) { postsReady = true; return; }
    db.collection("posts").orderBy("at", "desc").limit(200).onSnapshot(snap => {
      RS.sharedPosts = snap.docs.map(d => d.data()).filter(p => p && p.id && p.uid !== uid).map(p => ({ ...p, mine: false, pub: "friend", body: clean(p.body), video: /^[0-9a-f]{32}$/.test(p.video || "") ? p.video : "", title: String(p.title || "").slice(0, 200), dek: String(p.dek || "").slice(0, 400) }));
      postsReady = true;
      const want = (location.hash.match(/^#post-(.+)$/) || [])[1];
      if (want && !$("#v-post").hidden) RS.show("post", want); else if (!$("#v-publications").hidden) RS.show("publications");
    }, () => { postsReady = true; });
  })();
  RS.publishShared = async post => {
    if (!db) return false;
    const pub = RS.myPub();
    try { await db.collection("posts").doc(post.id).set({ id: post.id, uid, at: Date.now(), title: post.title, dek: post.dek, date: post.date, format: post.format, srcCount: post.srcCount, sources: post.sources, body: post.body, storyId: post.storyId || "", pubName: pub.name, pubColor: pub.color, video: /^[0-9a-f]{32}$/.test(post.video || "") ? post.video : "", videoAt: post.videoAt || 0 }); return true; }
    catch { toast("Published here, but it couldn't be shared with friends. Try publishing again."); return false; }
  };
  RS.published = (post, clipNext) => {
    const pub = RS.myPub(), link = RS.shareLink(post.id), live = !!db, p = $("#pubOk") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "pubpanel", id: "pubOk", role: "dialog" }));
    p.hidden = false; $("#scrim").hidden = false;
    p.innerHTML = `<button class="pubx" type="button" id="ppX" aria-label="Close">×</button><div class="pubok"><span class="pubok-i" aria-hidden="true">✓</span><h2 class="display" style="font-size:32px">Your story is live</h2>
      <p>Published to <b>${esc(pub.name)}</b> · ${esc(post.date)}. ${live ? "Everyone you share this page with can read it in Publications." : "It's saved in this browser. To share it with friends, open this page on claude.ai."}</p>
      <div class="field"><label for="ppLink">Share link</label><div class="pplink"><input id="ppLink" readonly value="${esc(link)}"><button class="btn sm y" type="button" id="ppCopy">Copy</button></div>
      <p class="muted" style="font-size:12.5px;margin:6px 0 0">Friends need access to the page (Share menu → anyone with the link). If the link opens the home page, they'll find your story in Publications.</p></div>
      <div class="pubok-acts"><button class="btn y" type="button" data-go="post" data-arg="${esc(post.id)}" id="ppView">View my story</button><button class="btn" type="button" id="ppChat">Send to a friend</button>${post.video ? `<button class="btn" type="button" data-go="reels" data-arg="${esc(post.id)}" id="ppReelGo">▶ Watch in Reels</button>` : `<button class="btn" type="button" data-go="clip" data-arg="${esc(post.id)}" id="ppClipGo">▶ Make a video</button>`}${navigator.share ? `<button class="btn" type="button" id="ppNative">Share…</button>` : ""}</div></div>`;
    const onKey = e => { if (e.key === "Escape") close(); };
    const close = () => { p.hidden = true; $("#scrim").hidden = true; document.removeEventListener("keydown", onKey); };
    document.addEventListener("keydown", onKey);
    $("#ppX").onclick = close;
    $("#ppCopy").onclick = () => { const i = $("#ppLink"); i.select(); navigator.clipboard.writeText(link).then(() => toast("Link copied"), () => { document.execCommand && document.execCommand("copy"); toast("Link selected: copy it"); }); };
    $("#ppChat").onclick = () => { close(); RS.shareToChat({ kind: "post", id: post.id, title: post.title }); };
    if ($("#ppNative")) $("#ppNative").onclick = () => navigator.share({ title: post.title, text: post.dek || post.title, url: link }).catch(() => { });
    ["#ppView", "#ppClipGo", "#ppReelGo"].forEach(s => $(s) && $(s).addEventListener("click", close));
    $("#scrim").addEventListener("click", close, { once: true });
    show(clipNext ? "clip" : "post", post.id);
    sig("published");
  };
  RS.V.chat = {
    mount(el) {
      el.innerHTML = `<div class="chat"><aside class="ch-list">
          <div class="ch-top"><h3>Messages</h3><button class="btn sm y" type="button" id="addFr">+ Add friend</button></div>
          <div class="addbox" id="addBox" hidden><input id="frQ" placeholder="Search people by name" autocomplete="off" aria-label="Search people"><div id="frHits" class="frhits"></div><p class="muted" style="font-size:12px;margin:0">You can add anyone this page is shared with. To bring a new friend, share the page with them from its Share menu, then add them here.</p></div>
          <span class="eyebrow ch-sec">Friends</span><div id="dmList" class="dmlist"></div>
          <span class="eyebrow ch-sec">Group chats</span>${FRIENDS_CHANNELS.map(c => `<button type="button" class="grp" data-ch="${c.id}"><b># ${esc(c.name)}</b><small>${esc(c.desc)}</small></button>`).join("")}
          <div class="method ch-mode" id="chMode"></div></aside>
        <section class="ch-main"><header class="ch-head" id="chHead"></header><div class="ch-msgs" id="chMsgs" aria-live="polite"></div>
          <form class="ch-form" id="chForm"><div id="chAtt"></div><div class="row"><select id="chPick" aria-label="Attach a story or post"><option value="">+ Attach</option><optgroup label="Stories">${STORIES.map(s => `<option value="story:${s.id}">${esc(s.title)}</option>`).join("")}</optgroup><optgroup label="Posts" id="chPosts"></optgroup></select>
            <input id="chIn" placeholder="Message" aria-label="Message" autocomplete="off"><button class="btn y sm" type="submit">Send</button></div></form></section></div>`;
      el.addEventListener("click", e => {
        const b = e.target.closest("[data-ch]"); if (b) { ch = b.dataset.ch; this.show(); return; }
        const h = e.target.closest("[data-addfr]"); if (h) this.addFriend(h.dataset.addfr);
      });
      $("#addFr").onclick = () => { adding = !adding; $("#addBox").hidden = !adding; if (adding) { $("#frQ").value = ""; this.search(""); $("#frQ").focus(); } };
      $("#frQ").addEventListener("input", e => this.search(e.target.value));
      $("#chPick").onchange = e => { const [k, id] = e.target.value.split(":"); e.target.value = ""; if (!k) return; const t = k === "story" ? RS.story(id).title : RS.allPosts().find(p => p.id === id)?.title; pendingAtt = { kind: k, id, title: t }; this.att(); };
      $("#chForm").addEventListener("submit", e => { e.preventDefault(); this.send(); });
    },
    async search(q) {
      const box = $("#frHits");
      if (!db || !user) { box.innerHTML = `<p class="muted" style="font-size:13px;margin:0">Adding real friends works when this page is opened on claude.ai. For now, try the demo friends below.</p>`; return; }
      const hits = (await user.search(q)).filter(p => !p.isMe);
      if (!hits.length) { box.innerHTML = `<p class="muted" style="font-size:13px;margin:0">${q ? "No one by that name has access to this page yet." : "Type a name to search."}</p>`; return; }
      box.innerHTML = ""; hits.forEach(p => { const b = document.createElement("button"); b.type = "button"; b.dataset.addfr = p.id; b.innerHTML = `<img alt="" src="${esc(p.avatarUrl)}"><span></span><em>${friendIds.includes(p.id) ? "Friend" : "+ Add"}</em>`; b.querySelector("span").textContent = p.name; box.append(b); });
    },
    async addFriend(id) {
      if (!friendIds.includes(id)) { friendIds = [...friendIds, id]; try { await db.collection("data/users/" + uid).doc("friends").set({ ids: friendIds }); toast("Friend added"); } catch { toast("Couldn't save your friend list. Try again."); } }
      adding = false; $("#addBox").hidden = true; ch = dmId(id); this.show();
    },
    async list() {
      const box = $("#dmList"); if (!box) return;
      if (!db) {
        const all = localAll();
        box.innerHTML = DEMO.map(f => { const c = dmId(f.id), last = all.filter(m => m.ch === c).pop(); return `<button type="button" class="dm" data-ch="${c}" aria-current="${c === ch ? "page" : "false"}">${RS.logo({ name: f.name, c: f.c })}<span><b>${esc(f.name)}</b><small>${last ? esc((last.from === "me" ? "You: " : "") + (last.text || last.att?.title || "")) : "Say hi"}</small></span>${last ? `<time>${fmtT(last.at)}</time>` : ""}</button>`; }).join("");
        return;
      }
      const partners = [...new Set([...friendIds, ...Object.keys(dmLast).map(otherOf)])].filter(x => x && x !== uid);
      const ps = await people(partners);
      partners.sort((a, b) => (dmLast[dmId(b)]?.at || 0) - (dmLast[dmId(a)]?.at || 0));
      box.innerHTML = partners.length ? "" : `<p class="muted" style="font-size:13px;margin:4px 10px">No friends yet. Tap “+ Add friend”.</p>`;
      partners.forEach(p => {
        const c = dmId(p), last = dmLast[c], b = document.createElement("button");
        b.type = "button"; b.className = "dm"; b.dataset.ch = c; b.setAttribute("aria-current", c === ch ? "page" : "false");
        b.innerHTML = `<img alt="" src="${esc(ps[p]?.avatarUrl || "")}"><span><b></b><small></small></span>${last ? `<time>${fmtT(last.at)}</time>` : ""}`;
        b.querySelector("b").textContent = ps[p]?.name || "Someone";
        b.querySelector("small").textContent = last ? (last.uid === uid ? "You: " : "") + (last.text || last.att?.title || "") : "Say hi";
        box.append(b);
      });
    },
    async show() {
      if (!$("#chHead")) return;
      $$("#v-chat .grp").forEach(b => b.setAttribute("aria-current", b.dataset.ch === ch ? "page" : "false"));
      this.list();
      if (isDm(ch)) {
        const o = otherOf(ch), demo = DEMO.find(f => f.id === o);
        const p = demo ? null : (await people([o]))[o];
        const nm = demo ? demo.name : p?.name || "Someone";
        $("#chHead").innerHTML = `${demo ? RS.logo({ name: demo.name, c: demo.c }) : `<img class="hav" alt="" src="${esc(p?.avatarUrl || "")}">`}<b></b><span class="muted">Direct message${demo ? " · demo friend" : ""}</span>`;
        $("#chHead b").textContent = nm; $("#chIn").placeholder = `Message ${nm}`;
      } else {
        const c = FRIENDS_CHANNELS.find(x => x.id === ch) || FRIENDS_CHANNELS[0]; ch = c.id;
        $("#chHead").innerHTML = `<b># ${esc(c.name)}</b><span class="muted">${esc(c.desc)} · group chat</span>`;
        $("#chIn").placeholder = `Message #${c.name}`;
      }
      $("#chPosts").innerHTML = RS.allPosts().map(p => `<option value="post:${p.id}">${esc(p.title)}</option>`).join("");
      $("#chMode").innerHTML = !chatReady ? "Connecting…" : db ? `<b>Live</b><span>Friends you add can message you here. Messages are stored in this page's shared space, so anyone the page is shared with could read them: don't send anything private.</span>` : `<b>Demo mode</b><span>Chatting with real friends works when this page is opened on claude.ai and shared with them. Right now messages stay in this browser.</span>`;
      this.att(); this.listen();
    },
    att() { $("#chAtt").innerHTML = pendingAtt ? `<div class="attpill">Attaching: <b>${esc(pendingAtt.title)}</b> <button type="button" class="linkish" id="attX">remove</button></div>` : ""; if ($("#attX")) $("#attX").onclick = () => { pendingAtt = null; this.att(); }; },
    listen() {
      if (unsub) { unsub(); unsub = null; }
      if (!db) { msgs = localAll().filter(m => m.ch === ch); this.render(); return; }
      $("#chMsgs").innerHTML = `<div class="muted" style="padding:16px">Loading messages…</div>`;
      unsub = db.collection("chat").where("ch", "==", ch).orderBy("at").limit(300).onSnapshot(snap => { msgs = snap.docs.map(d => d.data()); this.render(); },
        e => { $("#chMsgs").innerHTML = `<div class="empty" style="margin:16px">Couldn't load this chat (${esc(e.code)}). Reload to try again.</div>`; });
    },
    async render() {
      const box = $("#chMsgs"); if (!box) return;
      const ps = await people([...new Set(msgs.map(m => m.uid).filter(Boolean))]);
      const nameOf = m => { if (!db) { if (m.from === "me") return "You"; return DEMO.find(f => f.id === m.from)?.name || "Friend"; } return m.uid === uid ? "You" : ps[m.uid]?.name || "Someone"; };
      box.innerHTML = "";
      if (!msgs.length) { box.innerHTML = `<div class="empty" style="margin:16px">${isDm(ch) ? "No messages yet. Say hi, or attach a story you want them to read." : "No messages in this group yet. Say hi, or attach a story."}</div>`; return; }
      msgs.forEach(m => {
        const me = db ? m.uid === uid : m.from === "me", d = document.createElement("div"); d.className = "chmsg" + (me ? " me" : "");
        const a = m.att ? `<button type="button" class="chcard" data-go="${esc(m.att.kind)}" data-arg="${esc(m.att.id)}"><span class="eyebrow">${m.att.kind === "story" ? "Story" : m.att.kind === "clip" ? "Clip" : "Post"}</span><b>${esc(m.att.title)}</b></button>` : "";
        d.innerHTML = `<div class="bub"><span class="chn"><b></b> <span class="muted">${fmtT(m.at)}</span></span>${m.text ? `<p></p>` : ""}${a}</div>`;
        d.querySelector(".chn b").textContent = nameOf(m); if (m.text) d.querySelector("p").textContent = m.text;
        box.append(d);
      });
      box.scrollTop = 1e9;
    },
    async send() {
      const text = $("#chIn").value.trim(); if (!text && !pendingAtt) return;
      const m = { ch, text: text.slice(0, 1000), at: Date.now(), ...(pendingAtt ? { att: pendingAtt } : {}) };
      if (isDm(ch) && db) m.members = [uid, otherOf(ch)];
      $("#chIn").value = ""; pendingAtt = null; this.att();
      if (!db) { const all = localAll(); all.push({ ...m, from: "me" }); store.set("localchat2", all.slice(-500)); msgs = all.filter(x => x.ch === ch); this.render(); this.list(); return; }
      try { await db.collection("chat").add({ ...m, uid }); if (isDm(ch) && !friendIds.includes(otherOf(ch))) this.addFriend(otherOf(ch)); }
      catch (e) { toast(e.code === "invalid_argument" || e.code === "permission_denied" ? "You can read this chat but not post. Ask the owner for Contributor access." : e.code === "quota_exceeded" ? "The chat is full. Old messages need clearing first." : "Message didn't send. Try again."); $("#chIn").value = text; }
    }
  };

  /* ================= NEWS CLIP MAKER ================= */
  const CLIP_STYLES = { breaking: ["Breaking", "#FF2D55"], explainer: ["Explainer", "#3D5AFE"], myth: ["Myth vs fact", "#F5E500"] };
  let clip = null, raf = null, playing = false, t0 = 0, rec = null;
  function clipFromPost(p) {
    const tmp = document.createElement("div"); tmp.innerHTML = p.body;
    const lines = $$("li, p", tmp).map(x => ({ line: x.innerText.replace(/\s*S\d{1,2}\s*/g, " ").replace(/needs a source/g, "").trim(), tag: [...x.querySelectorAll(".cite")].map(c => c.dataset.src)[0] || "" })).filter(x => x.line.length > 20).slice(0, 4)
      .map(x => ({ line: x.line.length > 120 ? x.line.slice(0, 117) + "…" : x.line, tag: x.tag }));
    return { postId: p.id, style: "breaking", hook: p.title, scenes: lines.length ? lines : [{ line: p.dek || p.title, tag: "" }], outro: "What would change your mind? Read the full story.", handle: RS.myPub().handle || "@genzdispatch", dur: 3.5, caption: `${p.title}\n\n${p.dek}\n\nFull story, with sources, on ${BRAND.name}. #news #india #genz #factcheck` };
  }
  function wrapCanvas(ctx, text, maxW) { const words = String(text).split(/\s+/), out = []; let line = ""; words.forEach(w => { const test = line ? line + " " + w : w; if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test; }); if (line) out.push(line); return out; }
  function drawClip(ctx, t, cam, cl) {
    const W = 720, H = 1280, c = cl || clip, acc = CLIP_STYLES[c.style][1], scenes = [{ hook: true, line: c.hook }, ...c.scenes, { outro: true, line: c.outro }], d = c.dur || 3, total = scenes.length * d;
    const i = Math.min(scenes.length - 1, Math.floor(t / d)), lt = (t - i * d) / d, sc = scenes[i];
    if (cam && cam.readyState >= 2 && cam.videoWidth) {
      const vw = cam.videoWidth, vh = cam.videoHeight, s = Math.max(W / vw, H / vh), dw = vw * s, dh = vh * s;
      ctx.save(); if (cam.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); } ctx.drawImage(cam, (W - dw) / 2, (H - dh) / 2, dw, dh); ctx.restore();
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(.2, "rgba(0,0,0,0)"); g.addColorStop(.55, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.75)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else {
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = .9; ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(600 + Math.sin(t) * 40, 260, 260, 0, 7); ctx.fill(); ctx.fillStyle = "#3D5AFE"; ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(80, 900 + Math.cos(t * .8) * 40, 300, 0, 7); ctx.fill(); ctx.restore();
    ctx.save(); ctx.strokeStyle = "#ffffff10"; ctx.lineWidth = 18; for (let k = -10; k < 20; k++) { ctx.beginPath(); ctx.moveTo(k * 80 + (t * 60 % 80), 0); ctx.lineTo(k * 80 - 600 + (t * 60 % 80), H); ctx.stroke(); } ctx.restore();
    }
    ctx.strokeStyle = "#FF2D55"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 200); ctx.bezierCurveTo(240, 120 + Math.sin(t * 2) * 30, 480, 320, 720, 180); ctx.stroke();
    ctx.fillStyle = "#ffffff30"; ctx.fillRect(0, 0, W, 10); ctx.fillStyle = acc; ctx.fillRect(0, 0, W * Math.min(1, t / total), 10);
    ctx.fillStyle = "#F5F1E8"; ctx.fillRect(36, 44, 300, 64); ctx.fillStyle = "#111"; ctx.font = "italic 38px 'Instrument Serif', Georgia, serif"; ctx.fillText(BRAND.name, 52, 89);
    const blink = c.style === "breaking" ? (Math.floor(t * 2) % 2 ? 1 : .75) : 1; ctx.globalAlpha = blink; ctx.fillStyle = acc; ctx.fillRect(360, 44, 230, 64); ctx.globalAlpha = 1; ctx.fillStyle = c.style === "myth" ? "#111" : "#fff"; ctx.font = "800 30px 'Hanken Grotesk', Arial, sans-serif"; ctx.fillText(CLIP_STYLES[c.style][0].toUpperCase(), 380, 88);
    const ease = x => 1 - Math.pow(1 - Math.min(1, x), 3), a = ease(lt * 4);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 60);
    if (cam) {
      ctx.font = sc.hook ? "800 50px Inter, Arial, sans-serif" : "700 42px Inter, Arial, sans-serif";
      const ls = wrapCanvas(ctx, sc.line, 590).slice(0, 4), bh = ls.length * 54 + 50, y0 = 1036 - bh;
      ctx.fillStyle = "rgba(0,0,0,.74)"; ctx.fillRect(30, y0, 660, bh); ctx.fillStyle = acc; ctx.fillRect(30, y0, 10, bh);
      ctx.fillStyle = sc.outro ? "#F5E500" : "#fff"; ls.forEach((l, k) => ctx.fillText(l, 62, y0 + 54 + k * 54));
      if (!sc.hook && !sc.outro) { ctx.fillStyle = acc; ctx.font = "800 30px Inter, Arial, sans-serif"; ctx.fillText(String(i).padStart(2, "0") + " / " + String(scenes.length - 2).padStart(2, "0"), 40, y0 - 16); }
      if (sc.tag && C.sources[sc.tag]) { ctx.fillStyle = "#F5E500"; ctx.fillRect(470, y0 - 52, 220, 40); ctx.fillStyle = "#111"; ctx.font = "700 20px Inter, Arial, sans-serif"; ctx.fillText("SOURCE " + sc.tag, 486, y0 - 25); }
      if (sc.outro) { ctx.fillStyle = "#fff"; ctx.font = "700 34px Inter, Arial, sans-serif"; ctx.fillText(c.handle, 40, y0 - 18); }
    }
    else if (sc.hook) { ctx.fillStyle = "#fff"; ctx.font = "400 92px 'Instrument Serif', Georgia, serif"; const ls = wrapCanvas(ctx, sc.line, 640).slice(0, 6); ls.forEach((l, k) => ctx.fillText(l, 40, 420 + k * 96)); }
    else if (sc.outro) { ctx.fillStyle = "#F5E500"; ctx.font = "400 80px 'Instrument Serif', Georgia, serif"; wrapCanvas(ctx, sc.line, 640).slice(0, 5).forEach((l, k) => ctx.fillText(l, 40, 440 + k * 86)); ctx.fillStyle = "#fff"; ctx.font = "700 44px 'Hanken Grotesk', Arial, sans-serif"; ctx.fillText(c.handle, 40, 940); }
    else { ctx.fillStyle = acc; ctx.font = "800 120px 'Hanken Grotesk', Arial, sans-serif"; ctx.fillText(String(i).padStart(2, "0"), 40, 400); ctx.fillStyle = "#fff"; ctx.font = "700 56px 'Hanken Grotesk', Arial, sans-serif"; const ls = wrapCanvas(ctx, sc.line, 640).slice(0, 7); ls.forEach((l, k) => ctx.fillText(l, 40, 500 + k * 66));
      if (sc.tag && C.sources[sc.tag]) { const y = 520 + ls.length * 66; ctx.fillStyle = "#F5E500"; ctx.fillRect(40, y, 620, 54); ctx.fillStyle = "#111"; ctx.font = "600 24px 'IBM Plex Mono', monospace"; ctx.fillText(("SOURCE " + sc.tag + " · " + C.sources[sc.tag].title).slice(0, 44), 54, y + 36); } }
    ctx.restore();
    ctx.fillStyle = "#F5F1E8"; ctx.fillRect(0, 1060, W, 92); ctx.fillStyle = acc; ctx.fillRect(0, 1060, 18, 92); ctx.fillStyle = "#111"; ctx.font = "700 30px 'Hanken Grotesk', Arial, sans-serif"; ctx.fillText((c.hook.length > 40 ? c.hook.slice(0, 39) + "…" : c.hook), 40, 1117);
    ctx.fillStyle = "#FF2D55"; ctx.fillRect(0, 1152, W, 70); ctx.fillStyle = "#fff"; ctx.font = "600 28px 'IBM Plex Mono', monospace";
    const tick = "  ●  " + [c.hook, ...c.scenes.map(s => s.line)].join("  ●  "); const tw = ctx.measureText(tick).width; const off = (t * 140) % tw; ctx.fillText(tick + tick, -off, 1198);
    ctx.fillStyle = "#111"; ctx.fillRect(0, 1222, W, 58); ctx.fillStyle = "#aaa"; ctx.font = "500 22px 'IBM Plex Mono', monospace"; ctx.fillText(`${c.handle} · made with ${BRAND.name} · sources in caption`, 40, 1258);
    return total;
  }
  RS.V.clip = {
    show(id, el) {
      const p = RS.allPosts().find(x => x.id === id) || RS.allPosts().find(x => x.mine);
      if (!p) { el.innerHTML = `<div class="wrap section"><div class="empty">Publish an article first, then make a clip from it. <button class="linkish" type="button" data-go="investigate" data-arg="|notes">Go to your notes</button></div></div>`; return; }
      if (!clip || clip.postId !== p.id) clip = clipFromPost(p);
      el.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">News clip maker · from “${esc(p.title)}”</span><h1>Turn your article into a news clip</h1><p>A vertical 9:16 clip in news-channel style: breaking banner, lower-third, ticker and a source tag on every claim. Save it, then post it as a Reel.</p></div>
        <div class="clipgrid"><aside class="clipset">
          <div class="field"><label>Style</label><div class="tabs" id="cStyle">${Object.entries(CLIP_STYLES).map(([k, [n]]) => `<button type="button" data-cs="${k}" aria-pressed="${k === clip.style}">${n}</button>`).join("")}</div></div>
          <div class="field"><label for="cHook">Headline</label><input id="cHook" value="${esc(clip.hook)}"></div>
          ${clip.scenes.map((s, i) => `<div class="field"><label for="cS${i}">Scene ${i + 1} ${s.tag ? `<span class="mono muted">source ${s.tag}</span>` : `<span class="mono" style="color:var(--pink)">no source tag</span>`}</label><textarea id="cS${i}" data-sc="${i}">${esc(s.line)}</textarea></div>`).join("")}
          <div class="field"><label for="cOut">Closing line</label><input id="cOut" value="${esc(clip.outro)}"></div>
          <div class="grid2"><div class="field"><label for="cHandle">Your handle</label><input id="cHandle" value="${esc(clip.handle)}"></div><div class="field"><label for="cDur">Seconds per scene</label><input id="cDur" type="number" min="2" max="6" step=".5" value="${clip.dur}"></div></div>
          <button class="btn y" type="button" id="cAI">✦ Punch it up with ${AI}</button><p class="status muted" id="cAIs" style="font-size:13px"></p></aside>
        <div class="clipstage"><canvas id="clipCv" width="720" height="1280" aria-label="Clip preview"></canvas>
          <div class="cbtns" id="cBtns"><button class="btn" type="button" id="cPlay">▶ Play preview</button><button class="btn r" type="button" id="cRec">● Record video</button></div>
          <button class="btn y camgo" type="button" id="cCam">◉ Record with camera</button>
          <div class="cbtns" id="cCamBar" hidden><button class="btn r" type="button" id="cCamRec">● Start recording</button><button class="btn" type="button" id="cNext" hidden>Next pop-up →</button><button class="btn" type="button" id="cCamX">✕ Close camera</button></div>
          <label class="chk camopt" id="cTapW" hidden><input type="checkbox" id="cTap"> I'll move the pop-ups myself (tap “Next pop-up” or press →)</label>
          <div class="camupl" id="cUplW" hidden><label class="btn sm" for="cUpl">⇪ Upload a selfie video instead</label><input type="file" id="cUpl" accept="video/*" hidden></div>
          <p class="mono muted" id="cRecS" style="text-align:center;font-size:12px"></p><div id="cOutBox"></div></div>
        <aside class="clipset"><div class="field"><label for="cCap">Instagram caption</label><textarea id="cCap" style="min-height:180px">${esc(clip.caption)}</textarea></div>
          <button class="btn" type="button" id="cCopy">Copy caption</button>
          <div class="method"><b>Posting to Instagram</b><span>1. Record and save the video.</span><span>2. In Instagram, tap + then Reel and pick the saved video.</span><span>3. Paste the caption. Keep the sources line in.</span><span class="muted">Instagram doesn't let other apps post for you, so the last step is yours.</span></div></aside></div></div>`;
      const cv = $("#clipCv"), ctx = cv.getContext("2d");
      const sync = () => { clip.hook = $("#cHook").value; clip.outro = $("#cOut").value; clip.handle = $("#cHandle").value; clip.dur = Math.max(2, Math.min(6, +$("#cDur").value || 3.5)); clip.caption = $("#cCap").value; $$("[data-sc]").forEach(x => clip.scenes[+x.dataset.sc].line = x.value); if (!playing) drawClip(ctx, 0.6); };
      $$("input,textarea", el).forEach(x => x.addEventListener("input", sync));
      $$("[data-cs]").forEach(b => b.onclick = () => { clip.style = b.dataset.cs; $$("[data-cs]").forEach(x => x.setAttribute("aria-pressed", x === b)); sync(); });
      document.fonts?.ready.then(() => drawClip(ctx, .6)); drawClip(ctx, .6);
      let cam = null, camStream = null, liveRaf = 0, tap = { on: false, i: 0, at: 0 }, untilStop = false;
      const nScenes = () => clip.scenes.length + 2;
      const tAt = now => tap.on ? tap.i * clip.dur + Math.min(clip.dur * .98, (now - tap.at) / 1000) : (now - t0) / 1000;
      const play = (onEnd) => { cancelAnimationFrame(raf); cancelAnimationFrame(liveRaf); playing = true; t0 = performance.now(); tap.i = 0; tap.at = t0;
        const loop = now => { const t = tAt(now), total = drawClip(ctx, t, cam); if (t < total || untilStop) raf = requestAnimationFrame(loop); else { playing = false; onEnd && onEnd(); } }; raf = requestAnimationFrame(loop); };
      const live = () => { if (!cam || playing) return; drawClip(ctx, .6, cam); liveRaf = requestAnimationFrame(live); };
      const pickMime = () => ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "";
      const record = (audioTracks, onStop) => { const mime = pickMime(), chunks = [], r = new MediaRecorder(new MediaStream([...cv.captureStream(30).getVideoTracks(), ...audioTracks]), mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined);
        r.ondataavailable = e => e.data.size && chunks.push(e.data); r.onstop = () => onStop(new Blob(chunks, { type: r.mimeType || mime || "video/webm" })); r.start(250); return r; };
      const toEditor = (blob, kind) => { const clips = store.get("clips", []); clips.unshift({ postId: p.id, at: today(), style: clip.style, kind }); store.set("clips", clips.slice(0, 50)); $("#cRecS").textContent = "Done. Trim and crop it in the editor, then download."; RS.openVideoEditor(blob, { name: "red-thread-" + kind + "-" + p.id, aspect: "9:16", ...(p.mine ? { useLabel: "📲 Post to Reels with this story", onUse: async b => { if (await RS.attachReel(p, b)) show("reels", p.id); } } : {}) }); };
      const stopCam = () => { cancelAnimationFrame(liveRaf); if (camStream) camStream.getTracks().forEach(tr => tr.stop()); camStream = null; if (cam) { cam.pause(); cam.removeAttribute("src"); cam.srcObject = null; } cam = null;
        $("#cCamBar").hidden = true; $("#cTapW").hidden = true; $("#cCam").hidden = false; $("#cBtns").hidden = false; drawClip(ctx, .6); };
      const camMode = () => { $("#cCam").hidden = true; $("#cBtns").hidden = true; $("#cCamBar").hidden = false; $("#cTapW").hidden = false; $("#cUplW").hidden = true; live(); };
      $("#cCam").onclick = async () => {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { $("#cRecS").textContent = "This browser can't use the camera here. Upload a selfie video instead."; $("#cUplW").hidden = false; return; }
        $("#cRecS").textContent = "Asking for your camera and microphone…";
        try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } }); }
        catch (e) { $("#cRecS").textContent = RS.camHelp(e) + " Or upload a selfie video."; $("#cUplW").hidden = false; return; }
        cam = document.createElement("video"); cam.muted = true; cam.playsInline = true; cam.mirror = true; cam.srcObject = camStream; await cam.play().catch(() => { });
        $("#cRecS").textContent = "You're on. The pop-ups will appear over you, just like the preview. Read the story, then stop."; camMode();
      };
      $("#cUpl").onchange = async e => {
        const file = e.target.files[0]; e.target.value = ""; if (!file) return;
        cam = document.createElement("video"); cam.playsInline = true; cam.mirror = false; cam.src = URL.createObjectURL(file); cam.preload = "auto";
        await new Promise(r => cam.addEventListener("loadeddata", r, { once: true })); cam.uploaded = true;
        $("#cRecS").textContent = "Video loaded. Press Start: it plays once with the pop-ups on top and records the result."; camMode();
      };
      $("#cTap").onchange = e => { tap.on = e.target.checked; $("#cNext").hidden = !tap.on; };
      const next = () => { if (tap.on && playing) { tap.i = Math.min(nScenes() - 1, tap.i + 1); tap.at = performance.now(); } };
      $("#cNext").onclick = next; el.addEventListener("keydown", e => { if (e.key === "ArrowRight" && playing && tap.on) { e.preventDefault(); next(); } });
      $("#cCamX").onclick = () => { if (rec && rec.state === "recording") return; stopCam(); $("#cRecS").textContent = ""; };
      $("#cCamRec").onclick = async () => {
        if (rec && rec.state === "recording") { untilStop = false; rec.stop(); return; }
        if (!cam) return;
        let audioTracks = [];
        if (cam.uploaded) { try { const ac = new AudioContext(), src = ac.createMediaElementSource(cam), dest = ac.createMediaStreamDestination(); src.connect(dest); src.connect(ac.destination); audioTracks = dest.stream.getAudioTracks(); cam._ac = ac; } catch { } }
        else audioTracks = camStream.getAudioTracks();
        $("#cCamX").disabled = true;
        for (const n of [3, 2, 1]) { drawClip(ctx, .6, cam); ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, 720, 1280); ctx.fillStyle = "#fff"; ctx.font = "800 260px Inter, Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText(n, 360, 720); ctx.textAlign = "start"; $("#cRecS").textContent = "Recording in " + n + "…"; await new Promise(r => setTimeout(r, 1000)); }
        cancelAnimationFrame(liveRaf);
        rec = record(audioTracks, blob => { $("#cCamRec").textContent = "● Start recording"; $("#cCamX").disabled = false; playing = false; cancelAnimationFrame(raf); if (cam && cam.uploaded) { cam.pause(); cam.currentTime = 0; } live(); toEditor(blob, "camera"); });
        $("#cCamRec").textContent = "■ Stop recording";
        if (cam.uploaded) { cam.currentTime = 0; await cam.play().catch(() => { }); untilStop = true; cam.onended = () => { untilStop = false; if (rec.state === "recording") rec.stop(); }; $("#cRecS").textContent = "Recording your video with the pop-ups…"; }
        else { untilStop = true; $("#cRecS").textContent = "Recording. Pop-ups run on their own" + (tap.on ? " when you tap Next" : "") + "; press Stop when you've finished the story."; }
        play();
      };
      $("#cPlay").onclick = () => play();
      $("#cCopy").onclick = () => navigator.clipboard.writeText($("#cCap").value).then(() => toast("Caption copied"), () => toast("Your browser blocked copying"));
      $("#cRec").onclick = () => {
        if (!cv.captureStream || !window.MediaRecorder) { $("#cRecS").textContent = "This browser can't record video. Try Chrome or Edge on a computer."; return; }
        rec = record([], blob => { $("#cRec").disabled = false; toEditor(blob, "clip"); });
        $("#cRec").disabled = true; $("#cRecS").textContent = "Recording… let it play to the end."; play(() => setTimeout(() => rec.state !== "inactive" && rec.stop(), 150));
      };
      $("#cAI").disabled = !RS.ai(); if (!RS.ai()) $("#cAIs").textContent = `${AI} is off here (works when opened in Claude).`;
      $("#cAI").onclick = async () => {
        const ai = RS.ai(); if (!ai) return; $("#cAI").disabled = true; $("#cAIs").textContent = "Writing punchier lines…";
        try { const r = await ai.json(`Rewrite this article into a ${clip.scenes.length + 2}-scene vertical news clip script. Style: ${CLIP_STYLES[clip.style][0]}. Hook max 10 words; each scene line max 18 words; closing line max 12 words. Keep every claim accurate to the article; never add facts. Keep each scene's source tag exactly.
Article title: ${p.title}\nScenes: ${JSON.stringify(clip.scenes)}\nAlso write an Instagram caption (max 60 words, plain, with 4 hashtags, ending with "Sources on ${BRAND.name}").
Reply with only JSON: {"hook":"","scenes":[{"line":"","tag":""}],"outro":"","caption":""}`, { modelTier: "quick", cache: false });
          if (r?.hook && Array.isArray(r.scenes)) { clip.hook = r.hook; clip.scenes = r.scenes.slice(0, 5).map((s, i) => ({ line: String(s.line || ""), tag: clip.scenes[i]?.tag || (C.sources[s.tag] ? s.tag : "") })); clip.outro = r.outro || clip.outro; clip.caption = r.caption || clip.caption; this.show(p.id, el); toast("Script updated. Check it before recording."); }
          else throw { code: "invalid_json" };
        } catch (e) { $("#cAIs").textContent = RS.aiErr(e.code); $("#cAI").disabled = !RS.ai(); }
      };
    }
  };

  RS.drawClip = drawClip; RS.clipFromPost = clipFromPost;

  /* ---- Reel studio: the news-clip look built from whatever you've written, three ways to make the reel ---- */
  RS.reelStudio = ({ title = "", dek = "", html = "", onDone } = {}) => {
    const cl = clipFromPost({ id: "draft", title: title || "My story", dek, body: html || `<p>${esc(dek || title)}</p>` });
    const ov = document.createElement("div"); ov.className = "rstudio"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Reel studio");
    ov.innerHTML = `<div class="rst-in">
      <header class="ved-h"><div><span class="eyebrow">Reel studio · built from your article</span><h2></h2></div><button class="btn sm" type="button" data-x>✕ Close</button></header>
      <div class="rst-body">
        <div class="rst-stage"><canvas width="720" height="1280" aria-label="Reel preview"></canvas><p class="mono muted rst-msg" data-msg aria-live="polite"></p></div>
        <aside class="rst-side">
          <div class="field"><label>Look</label><div class="ved-asp">${Object.entries(CLIP_STYLES).map(([k, [n]]) => `<button type="button" data-st="${k}" aria-pressed="${k === cl.style}">${n}</button>`).join("")}</div></div>
          <div class="field"><label for="rstHook">Headline on screen</label><input id="rstHook"></div>
          <div class="field"><label for="rstDur">Seconds per pop-up</label><input id="rstDur" type="number" min="2" max="8" step=".5"></div>
          <div class="rst-quick"><span class="eyebrow">Make your reel</span>
            <button class="btn y" type="button" data-q="anim">✦ Use the animation</button>
            <button class="btn y" type="button" data-q="cam">◉ Record with my camera</button>
            <label class="btn y" for="rstUp">⇪ Upload a video</label>
            <button class="btn" type="button" data-preview>▶ Play preview</button></div>
          <div class="rst-opt"><b>1 · Use the animation</b><span>Your headline, key points and sources as a news-style clip, ready in one tap.</span><button class="btn y" type="button" data-anim>✦ Make my reel from the animation</button></div>
          <div class="rst-opt"><b>2 · Record yourself with the pop-ups</b><span>You on camera, with the banner, pop-ups, sources and ticker on top. Read your story; the points pop up as you talk.</span>
            <button class="btn y" type="button" data-cam>◉ Turn on my camera</button>
            <div class="rst-camctl" data-camctl hidden><button class="btn r" type="button" data-rec>● Start recording</button><button class="btn" type="button" data-next hidden>Next pop-up →</button><button class="btn sm" type="button" data-camoff>Camera off</button>
              <label class="chk"><input type="checkbox" data-tap> I'll move the pop-ups myself</label></div></div>
          <div class="rst-opt"><b>3 · Use a video you already shot</b><span>We play it under the same pop-ups and record the result.</span>
            <div class="cbtns" style="justify-content:flex-start"><label class="btn sm rst-phone" for="rstCap">📱 Record on my phone</label><input type="file" id="rstCap" accept="video/*" capture="user" hidden><label class="btn sm" for="rstUp">⇪ Upload &amp; add pop-ups</label><input type="file" id="rstUp" accept="video/*" hidden><label class="btn sm" for="rstPlain">Attach as-is</label><input type="file" id="rstPlain" accept="video/mp4,video/webm,video/*" hidden></div></div>
        </aside></div></div>`;
    document.body.append(ov); document.documentElement.style.overflow = "hidden";
    const q = s => ov.querySelector(s), cv = q("canvas"), ctx = cv.getContext("2d"), msg = t => q("[data-msg]").textContent = t;
    q("h2").textContent = title || "Your story";
    q("#rstHook").value = cl.hook; q("#rstDur").value = cl.dur;
    let raf = 0, cam = null, camStream = null, rec = null, busy = false, untilStop = false, tap = { on: false, i: 0, at: 0 }, t0 = 0, ac = null;
    const draw = t => drawClip(ctx, t, cam, cl);
    const still = () => { cancelAnimationFrame(raf); const loop = () => { if (busy) return; draw(.6); raf = requestAnimationFrame(loop); }; cam ? loop() : draw(.6); };
    const tNow = now => tap.on ? tap.i * cl.dur + Math.min(cl.dur * .98, (now - tap.at) / 1000) : (now - t0) / 1000;
    const run = onEnd => { cancelAnimationFrame(raf); t0 = performance.now(); tap.i = 0; tap.at = t0; const loop = now => { const t = tNow(now), total = draw(t); if (t < total || untilStop) raf = requestAnimationFrame(loop); else onEnd && onEnd(); }; raf = requestAnimationFrame(loop); };
    const pickMime = () => ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
    const record = (audio, done) => { const mime = pickMime(), chunks = [], r = new MediaRecorder(new MediaStream([...cv.captureStream(30).getVideoTracks(), ...audio]), mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : undefined);
      r.ondataavailable = e => e.data.size && chunks.push(e.data); r.onstop = () => done(new Blob(chunks, { type: (r.mimeType || mime || "video/webm").split(";")[0] })); r.start(250); return r; };
    const stopCam = () => { if (camStream) camStream.getTracks().forEach(t => t.stop()); camStream = null; if (cam) { cam.pause(); cam.srcObject = null; } cam = null; q("[data-camctl]").hidden = true; q("[data-cam]").hidden = false; };
    const close = () => { if (rec && rec.state === "recording") return; cancelAnimationFrame(raf); stopCam(); try { ac && ac.close(); } catch { } ov.remove(); document.documentElement.style.overflow = ""; document.removeEventListener("keydown", onKey); };
    const finish = (blob, label) => { busy = false; untilStop = false; msg("Done. Trim or crop it, then use it as your reel."); still();
      RS.openVideoEditor(blob, { name: "my-reel", useLabel: "✓ Use this as my reel", onUse: b => { close(); onDone && onDone(b, label); } }); };
    const setBusy = on => { busy = on; ov.querySelectorAll("[data-anim],[data-cam],[data-preview],#rstUp,#rstPlain").forEach(b => b.disabled = on); q(".rst-side").classList.toggle("busy", on); };
    const onKey = e => { if (e.key === "Escape") close(); else if (e.key === "ArrowRight" && tap.on && busy) { e.preventDefault(); next(); } };
    document.addEventListener("keydown", onKey);
    const next = () => { if (tap.on && busy) { tap.i = Math.min(cl.scenes.length + 1, tap.i + 1); tap.at = performance.now(); } };
    const countdown = async () => { for (const n of [3, 2, 1]) { draw(.6); ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, 720, 1280); ctx.fillStyle = "#fff"; ctx.font = "800 260px Inter, Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText(n, 360, 720); ctx.textAlign = "start"; msg("Recording in " + n + "…"); await new Promise(r => setTimeout(r, 1000)); } };

    q("[data-x]").onclick = close;
    ov.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { const t = b.dataset.q === "anim" ? q("[data-anim]") : q("[data-cam]"); t.closest(".rst-opt").scrollIntoView({ behavior: "smooth", block: "center" }); t.click(); });
    ov.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { cl.style = b.dataset.st; ov.querySelectorAll("[data-st]").forEach(x => x.setAttribute("aria-pressed", x === b)); if (!busy) still(); });
    q("#rstHook").oninput = e => { cl.hook = e.target.value; if (!busy) still(); };
    q("#rstDur").oninput = e => { cl.dur = Math.max(2, Math.min(8, +e.target.value || 3.5)); };
    q("[data-preview]").onclick = () => { if (busy) return; msg("Playing the preview…"); run(() => { msg(""); still(); }); };
    q("[data-anim]").onclick = async () => {
      if (!cv.captureStream || !window.MediaRecorder) { msg("This browser can't record video. Try Chrome or Edge on a computer."); return; }
      const wasCam = cam; if (wasCam) stopCam();
      setBusy(true); msg("Making your reel from the animation… let it play to the end.");
      rec = record([], blob => { setBusy(false); finish(blob, "animation"); });
      run(() => setTimeout(() => rec.state !== "inactive" && rec.stop(), 150));
    };
    q("[data-cam]").onclick = async () => {
      if (!navigator.mediaDevices?.getUserMedia) { msg("This browser can't use the camera here. Try option 3 with a video from your phone."); return; }
      msg("Asking for your camera and microphone…");
      try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { msg(RS.camHelp(e)); const ph = ov.querySelector(".rst-phone"); ph.classList.add("hl"); ph.closest(".rst-opt").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      cam = document.createElement("video"); cam.muted = true; cam.playsInline = true; cam.mirror = true; cam.srcObject = camStream; await cam.play().catch(() => { });
      q("[data-cam]").hidden = true; q("[data-camctl]").hidden = false; msg("You're on. The pop-ups sit over you just like this. Press Start, read your story, press Stop."); still();
    };
    q("[data-camoff]").onclick = () => { if (busy) return; stopCam(); msg(""); still(); };
    q("[data-tap]").onchange = e => { tap.on = e.target.checked; q("[data-next]").hidden = !tap.on; };
    q("[data-next]").onclick = next;
    q("[data-rec]").onclick = async () => {
      if (rec && rec.state === "recording") { untilStop = false; rec.stop(); return; }
      if (!cam) return;
      setBusy(true); q("[data-camoff]").disabled = true; cancelAnimationFrame(raf); await countdown();
      rec = record(camStream.getAudioTracks(), blob => { q("[data-rec]").textContent = "● Start recording"; q("[data-camoff]").disabled = false; setBusy(false); finish(blob, "camera"); });
      q("[data-rec]").textContent = "■ Stop recording"; untilStop = true; busy = true;
      msg("Recording. " + (tap.on ? "Tap Next pop-up (or →) as you reach each point. " : "Pop-ups move on their own. ") + "Press Stop when you're done.");
      run();
    };
    q("#rstCap").onchange = e => q("#rstUp").onchange(e);
    q("#rstUp").onchange = async e => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      if (cam) stopCam();
      const v = document.createElement("video"); v.playsInline = true; v.src = URL.createObjectURL(f); v.preload = "auto";
      try { await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; }); } catch { msg("That video couldn't be opened. Try an MP4 or WebM."); return; }
      cam = v; cam.mirror = false; let audio = [];
      try { ac = new AudioContext(); const s = ac.createMediaElementSource(v), d = ac.createMediaStreamDestination(); s.connect(d); s.connect(ac.destination); audio = d.stream.getAudioTracks(); } catch { }
      setBusy(true); msg("Adding the pop-ups over your video…");
      rec = record(audio, blob => { cam = null; setBusy(false); finish(blob, "upload"); });
      v.currentTime = 0; await v.play().catch(() => { }); untilStop = true; v.onended = () => { untilStop = false; if (rec.state === "recording") rec.stop(); };
      run();
    };
    q("#rstPlain").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) finish(f, "upload"); };
    still(); document.fonts?.ready.then(() => { if (!busy) still(); });
  };


  /* ================= CREATOR STUDIO ================= */
  const DEMO_BRIEF = {
    title: "The exam leak protest, explained without the noise", question: "Did the NCET paper leak widely enough to justify a full re-test?",
    why: "1.8 million candidates are waiting on one decision, and viral clips are filling the gap faster than facts [S1].",
    overview: "Screenshots said to show exam questions spread two days after the exam [S3]. Police arrested four people at two centres [S4]. The agency says only two centres were breached [S8]; students want a full re-test.",
    timeline: [["12 Sep", "Exam held [S1]"], ["14 Sep", "Telegram screenshots circulate (unverified) [S3]"], ["19 Sep", "Four arrests at two centres [S4]"], ["21 Sep", "Jantar Mantar protest; crowd size disputed [S5]"], ["30 Sep", "Court asks for a status report [S7]"], ["20 Oct", "Agency: two centres, ~2,400 candidates [S8]"]],
    stakeholders: [["Exam Nyay Manch", "Full re-test [S5]"], ["Testing agency", "Targeted re-test [S8]"], ["High scorers", "Keep current results [S5]"]],
    stats: [["1.8 million candidates", "Registered, not necessarily appeared [S1]"], ["~2,400 affected", "The agency's own count; not independently audited [S8]"], ["5,000 vs 1,200 protesters", "Organisers vs police [S5]"]],
    perspectives: [["Students", "Screenshots suggest early access beyond two centres.", "Screenshots [S3]", "Timestamps unverified"], ["Agency", "Lock logs show breach at two centres only.", "Status report [S8]", "Self-audit"]],
    uncertain: ["How far the questions spread before the exam", "Who took the photographs", "What the expert committee will recommend [S10]"],
    misconceptions: ["The viral lathi-charge video is from 2019, not this protest [S6]", "The court hasn't ruled on a re-test; it asked for a report [S7]"],
    angles: ["Rural candidates and the cost of a re-test", "How digital-lock boxes are supposed to work [S1]", "Challenge your assumption: what if the two-centre finding holds up?"],
    hooks: ["\"1.8 million students. Two exam centres. One question nobody can answer yet.\"", "\"This viral video isn't what you think it is.\"", "\"Should everyone retake an exam because of a leak at two centres?\""],
    structure: [["0:00", "Hook + the question"], ["0:45", "What happened, in 6 dates"], ["3:00", "The two biggest claims, side by side"], ["6:00", "The viral video, debunked [S6]"], ["7:30", "What the court actually ordered [S7]"], ["9:00", "Who pays for a re-test?"], ["10:30", "What's still unknown"], ["11:30", "Ask viewers: what would convince you?"]],
    visuals: ["Animated timeline of the 6 dates", "Side-by-side: screenshots claim vs agency report", "Screen-record of a reverse image search"],
    interview: ["Ask the agency how the other centres were cleared", "Ask organisers what evidence they have beyond the screenshots", "Ask a rural candidate about the cost of a re-test"],
    verify: ["Screenshot timestamps [S3]", "The ~2,400 figure: is there an independent check? [S8]", "Any quote you use from social media"]
  };
  const ANGLES = ["Historical explanation", "Policy breakdown", "Economic impact", "Human impact", "Myth vs evidence", "Timeline of events", "How it's being covered", "Unanswered questions"];
  let brief = store.get("brief", null), briefKind = store.get("briefKind", "demo"), angle = "Myth vs evidence";
  RS.V.studio = {
    mount(el) {
      el.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">Creator Studio</span><h1>From investigation to production brief</h1><p>Pick a format and an angle. ${AI} builds a brief from the story file, with every factual line linked to its source and a list of what to verify. You stay the editor.</p></div>
        <div class="studio"><aside class="side">
          <div class="field"><label for="stTopic">What are you making?</label><textarea id="stTopic">A 12-minute Hindi YouTube video explaining the Delhi Gen Z protest and the exam-leak dispute</textarea></div>
          <div class="field"><label for="stFmt">Format</label><select id="stFmt"><option>YouTube video (8–15 min)</option><option>Instagram reel (30–60 s)</option><option>Instagram carousel</option><option>Podcast episode</option><option>Written article</option></select></div>
          <div class="field"><label>Angle (a direction, not a conclusion)</label><div class="tabs" id="stAngles"></div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn y" type="button" id="stGen">Generate with ${AI}</button><button class="btn" type="button" id="stDemo">Load demo brief</button></div>
          <p class="status muted" id="stStatus" style="font-size:13.5px"></p></aside><div id="stOut"></div></div></div>`;
      const angles = () => { $("#stAngles").innerHTML = ANGLES.map(a => `<button type="button" aria-pressed="${a === angle}">${a}</button>`).join(""); $$("#stAngles button").forEach(b => b.onclick = () => { angle = b.textContent; angles(); }); };
      angles();
      $("#stDemo").onclick = () => { brief = DEMO_BRIEF; briefKind = "demo"; persist(); renderBrief(); };
      $("#stGen").onclick = gen;
      RS.onAi(() => { $("#stGen").disabled = !RS.ai(); $("#stStatus").textContent = !RS.aiReady() ? "Connecting to Claude…" : RS.ai() ? "" : `${AI} works when this page is opened in Claude. The demo brief shows the format.`; });
    },
    show() { if (!brief) { brief = DEMO_BRIEF; briefKind = "demo"; } renderBrief(); }
  };
  function persist() { store.set("brief", brief); store.set("briefKind", briefKind); store.set("briefDone", true); }
  async function gen() {
    const ai = RS.ai(); if (!ai) return; $("#stGen").disabled = true; $("#stStatus").textContent = "Building your brief… this can take a minute.";
    try {
      const r = await ai.json(`You are a research producer for Indian news creators. Build a production research brief.
Request: "${$("#stTopic").value.trim()}". Format: ${$("#stFmt").value}. Angle: ${angle} (a direction, not a conclusion).
${RS.EVIDENCE_RULES}
Case file: ${RS.caseContext()}
Reply with only JSON: {"title":"","question":"","why":"","overview":"","timeline":[["date","event [S#]"]],"stakeholders":[["name","position [S#]"]],"stats":[["figure","limitation [S#]"]],"perspectives":[["who","argument","strongest evidence","weakness"]],"uncertain":[""],"misconceptions":[""],"angles":["include one that challenges the creator's assumption"],"hooks":["3 hooks"],"structure":[["timestamp","segment"]],"visuals":[""],"interview":[""],"verify":[""]}
Keep each string under 30 words.`, { modelTier: "default" });
      if (!r || !r.title) throw { code: "invalid_json" };
      const arr = v => Array.isArray(v) ? v : [];
      brief = { ...r, ...Object.fromEntries(["timeline", "stakeholders", "stats", "perspectives", "uncertain", "misconceptions", "angles", "hooks", "structure", "visuals", "interview", "verify"].map(k => [k, arr(r[k])])) };
      briefKind = "ai"; persist(); renderBrief(); $("#stStatus").textContent = "Done. Every line is editable.";
    } catch (e) { $("#stStatus").textContent = RS.aiErr(e.code); if (RS.aiFatal(e.code)) RS.killAi(); }
    $("#stGen").disabled = !RS.ai();
  }
  function renderBrief() {
    const b = brief, li = a => (a || []).map(x => `<li>${ct(Array.isArray(x) ? x.join(": ") : x)}</li>`).join("");
    $("#stOut").innerHTML = `<div class="brief" id="briefDoc"><div class="brief-head"><span class="demo-tag">${briefKind === "ai" ? "AI-generated draft · verify every claim" : "Demo brief · written for this prototype"}</span><h2 contenteditable="true">${esc(b.title)}</h2><p contenteditable="true"><b>Central question:</b> ${ct(b.question)}</p></div>
      ${[["Why it matters", `<p contenteditable="true">${ct(b.why)}</p>`], ["Overview", `<p contenteditable="true">${ct(b.overview)}</p>`], ["Timeline", `<ul contenteditable="true">${li(b.timeline)}</ul>`], ["Stakeholders", `<ul contenteditable="true">${li(b.stakeholders)}</ul>`], ["Key figures and their limits", `<ul contenteditable="true">${li(b.stats)}</ul>`],
        ["Perspectives", `<div class="compare" style="border-width:1.5px"><table style="min-width:600px"><thead><tr><th>Who</th><th>Argument</th><th>Strongest evidence</th><th>Weakness</th></tr></thead><tbody>${(b.perspectives || []).map(p => `<tr>${[0, 1, 2, 3].map(i => `<td contenteditable="true">${ct(p[i] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`],
        ["Still uncertain", `<ul contenteditable="true">${li(b.uncertain)}</ul>`], ["Misconceptions to avoid", `<ul contenteditable="true">${li(b.misconceptions)}</ul>`], ["Underexplored angles", `<ul contenteditable="true">${li(b.angles)}</ul>`], ["Hook options", `<ul contenteditable="true">${li(b.hooks)}</ul>`],
        ["Structure", `<div class="chapters" contenteditable="true">${(b.structure || []).map(s => `<div><span class="mono">${esc(s[0])}</span><span>${ct(s[1] || "")}</span></div>`).join("")}</div>`], ["Visuals", `<ul contenteditable="true">${li(b.visuals)}</ul>`], ["Interview questions", `<ul contenteditable="true">${li(b.interview)}</ul>`]].map(([h, x]) => `<div class="bsec"><h3>${h}</h3>${x}</div>`).join("")}
      <div class="verify"><h3 class="mono" style="font-size:12px;letter-spacing:.12em;text-transform:uppercase">Verify before you publish</h3><ul contenteditable="true">${li(b.verify)}</ul></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn" type="button" id="bCopy">Copy brief as text</button><button class="btn" type="button" data-go="investigate" data-arg="genz||ask">Ask ${AI} follow-ups</button></div>`;
    store.set("briefDone", true);
    $("#bCopy").onclick = () => navigator.clipboard.writeText($("#briefDoc").innerText).then(() => toast("Brief copied"), () => toast("Your browser blocked copying"));
  }

  /* ================= SHAMEBOARD ================= */
  let org = "alpha", fOut = "";
  const baseVotes = id => { const h = base(id) % 97; return { verify: 20 + h, support: 4 + h % 13, contra: 9 + h % 29, corrected: h % 7, review: 2 + h % 5 }; };
  const VOTE_L = { verify: "Needs verification", support: "I found supporting evidence", contra: "I found contradicting evidence", corrected: "Publisher corrected this", review: "Needs another review" };
  RS.V.shame = {
    mount(el) {
      el.innerHTML = `<div class="shame-hero dark"><div class="wrap" id="shLb"></div></div><div class="wrap"><div class="two-sys" style="margin-top:22px;border-color:var(--ink)"><div><strong style="color:var(--pink)">System 1 · Evidence assessment</strong><span>Claim-by-claim findings, reviewed by two people, with right of reply and appeals. This is what the ranking uses.</span></div><div><strong style="color:var(--blue)">System 2 · Community concern</strong><span>Votes and flags decide what gets checked next. They never decide what's true.</span></div></div>
        <div class="toolbar"><span class="eyebrow">Records</span><select id="shOut" class="search" style="width:auto" aria-label="Filter by outcome"><option value="">All outcomes</option>${Object.entries(OUTCOMES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
        <div class="profile" id="profile"></div><div class="section" id="submitSec"></div></div>`;
      this.submitForm();
    },
    show(arg) {
      $("#shLb").innerHTML = RS.leaderboardHTML(false).replace('data-go="shame" data-arg="flag"', 'id="lbFlag"');
      if (arg && arg !== "flag") org = arg;
      $("#shOut").value = fOut; $("#shOut").onchange = e => { fOut = e.target.value; this.profile(); };
      this.profile();
      if ($("#lbFlag")) $("#lbFlag").onclick = () => $("#submitSec").scrollIntoView({ behavior: "smooth" });
      if (arg === "flag") { setTimeout(() => $("#submitSec").scrollIntoView(), 50); return true; }
      if (arg) { setTimeout(() => $("#profile").scrollIntoView(), 50); return true; }
    },
    profile() {
      const lb = LEADER.find(x => x.org === org), o = ORGS.find(x => x.id === org) || { id: org, name: lb?.name || org, own: RS.outlet(org)?.own || "", status: "Summary only", reviewed: lb?.checked || 0, subst: lb?.findings || 0, unresolved: 0, corrected: 0, concern: 20 + base(org) % 300, records: [] };
      const votes = store.get("votes", {}), subs = store.get("subs", []).filter(s => s.org === org);
      const recs = [...subs.map(s => ({ id: s.id, claim: s.claim, date: s.date || "—", outcome: "review", sev: "—", evidence: [], response: "Not yet contacted.", reviewer: "—", rdate: "—", mine: true, why: s.why })), ...o.records].filter(r => !fOut || r.outcome === fOut);
      $("#profile").innerHTML = `<div><div class="sec-head"><h2>${esc(o.name)}</h2><span class="mono muted">${esc(o.own)}</span></div>
        ${recs.length ? recs.map(r => { const v = baseVotes(r.id), mv = votes[r.id];
          return `<div class="record"><div class="rh"><div class="metaline"><span>${r.id}${r.mine ? " · your flag (saved in this demo only)" : ""}</span><span>Aired/published ${esc(r.date)}</span><span>Severity: ${esc(r.sev)}</span></div><h4>“${esc(r.claim)}”</h4><div>${st(r.outcome).replace(/>[^<]*<\/span>$/, `>${OUTCOMES[r.outcome]}</span>`)}</div></div>
            <div class="rd"><div><span class="eyebrow">Evidence used</span> ${r.evidence.length ? cites(r.evidence) : `<span class="muted">${r.mine ? esc(r.why || "") : "None attached yet"}</span>`}</div><div><span class="eyebrow">Publisher's response</span> ${esc(r.response)}</div>
              <div class="mono muted">Reviewer: ${esc(r.reviewer)} · reviewed ${esc(r.rdate)} · flagged → evidence attached → publisher contacted → ${r.outcome === "review" ? "awaiting review" : "assessed"}</div>
              <div><span class="eyebrow">Community feedback (doesn't change the outcome)</span><div class="votes" style="margin-top:6px">${Object.entries(VOTE_L).map(([k, l]) => `<button type="button" data-vote="${r.id}:${k}" aria-pressed="${mv === k}">${l} · ${v[k] + (mv === k ? 1 : 0)}</button>`).join("")}</div></div></div></div>`; }).join("")
          : `<div class="empty">${lb ? `${lb.findings} findings from ${lb.checked} checked claims are counted for this sample outlet. Its individual records aren't written out in this demo; open Channel Alpha or The Beta Bulletin to see full records.` : "Insufficient assessed evidence."}</div>`}</div>
        <aside style="display:grid;gap:14px;align-content:start">
          <div class="concern"><span class="eyebrow">Assessment</span><b style="font-size:20px">${lb ? lb.rate + " per 100 checked claims" : esc(o.status)}</b><span class="mono">${lb ? `${lb.checked} checked · ${lb.findings} findings · ${lb.corrected}% corrected` : ""}</span></div>
          <div class="concern" style="background:var(--paper)"><span class="eyebrow">Community concern (separate)</span><span class="big">${o.concern}</span><span style="font-size:14px">readers asked for a check. Wanting a check isn't proof of anything.</span></div>
          <details class="concern" style="background:#FBF8F0"><summary style="cursor:pointer;font-weight:700">Methodology</summary><ul style="margin:8px 0 0;padding-left:18px;font-size:14px;display:grid;gap:4px"><li>Only specific, checkable claims are assessed, never opinions.</li><li>Primary documents first, then independent reporting, then fact-checks.</li><li>Publishers are contacted before an outcome is published; their reply is shown.</li><li>Two human reviewers for every finding; AI only prepares the dossier.</li><li>Corrections are credited; appeals reopen the record.</li><li>No standing can be bought.</li></ul></details>
          <div class="leaderpick">${LEADER.map(x => `<button type="button" data-org="${x.org}" aria-pressed="${x.org === org}">${esc(x.name)}</button>`).join("")}</div></aside>`;
      $$("#profile [data-vote]").forEach(b => b.onclick = () => { const [id, k] = b.dataset.vote.split(":"); const v = store.get("votes", {}); v[id] = v[id] === k ? undefined : k; store.set("votes", v); this.profile(); });
      $$("#profile [data-org]").forEach(b => b.onclick = () => { org = b.dataset.org; this.profile(); });
    },
    submitForm() {
      $("#submitSec").innerHTML = `<div class="sec-head"><h2>Flag a claim for review</h2><span class="eyebrow">Demo: saved in your browser only</span></div>
        <form class="submit" id="subForm" novalidate><div class="grid2"><div class="field"><label for="subOrg">Publisher</label><select id="subOrg">${LEADER.map(o => `<option value="${o.org}">${esc(o.name)}</option>`).join("")}</select></div><div class="field"><label for="subDate">Approximate date</label><input id="subDate" placeholder="e.g. 21 Sep 2026"></div></div>
          <div class="field"><label for="subClaim">The exact claim *</label><textarea id="subClaim" placeholder="Quote it as closely as you can"></textarea></div>
          <div class="grid2"><div class="field"><label for="subUrl">Link or broadcast reference</label><input id="subUrl" placeholder="URL, or programme and time"></div><div class="field"><label for="subWhy">Why you think it's wrong *</label><input id="subWhy" placeholder="What evidence contradicts it?"></div></div>
          <label class="chk"><input type="checkbox" id="subAnon" checked> Don't show my identity publicly</label><p class="status" id="subMsg" style="font-weight:700"></p><div><button class="btn r" type="submit">Submit for review</button></div></form>`;
      $("#subForm").addEventListener("submit", e => { e.preventDefault(); const claim = $("#subClaim").value.trim(), why = $("#subWhy").value.trim();
        if (!claim || !why) { $("#subMsg").textContent = "Add the exact claim and why you think it's wrong. A reviewer needs both."; return; }
        const subs = store.get("subs", []); if (subs.some(s => s.claim.toLowerCase() === claim.toLowerCase())) { $("#subMsg").textContent = "You've already flagged this claim."; return; }
        subs.unshift({ id: "U" + (subs.length + 1), org: $("#subOrg").value, claim, why, url: $("#subUrl").value.trim(), date: $("#subDate").value.trim(), at: today() }); store.set("subs", subs); store.set("subEvidence", true);
        org = $("#subOrg").value; this.profile(); $("#subForm").reset(); $("#subMsg").textContent = "Saved to the review queue in this demo. A reviewer would check it before anything is published."; toast("Claim flagged for review"); });
    }
  };

  /* ================= MASTERY ================= */
  const PATH = [["Identify a factual claim", "Spot what can be checked", () => store.get("quizTaken", false), ["mastery", "quiz"]], ["Facts vs opinions", "Score 3+ on the knowledge check", () => store.get("quizBest", 0) >= 3, ["mastery", "quiz"]], ["Find an original source", "Open a primary document", () => RS.signals().has("primary"), ["investigate", "genz|dossier|sources"]], ["Compare coverage", "See how left, centre and right framed it", () => RS.signals().has("coverage"), ["story", "genz"]], ["Identify missing context", "Open the fact-check on the viral video", () => store.get("opened", []).includes("S6"), ["investigate", "genz|dossier|claims"]], ["Evaluate conflicting evidence", "Turn on contradictions in the map", () => store.get("contraSeen", false), ["investigate", "genz|map|contra"]], ["Build your timeline", "Add your own event to a timeline", () => STORIES.some(s => RS.storyNotes(s.id).some(n => n.kind === "event")), ["investigate", "genz|timeline"]], ["Take notes", "Collect 5 notes on a story", () => RS.signals().has("board"), ["investigate", "genz|notes"]], ["Write your article", "Publish from your notes", () => store.get("published", false), ["investigate", "genz|notes"]], ["Make a news clip", "Turn your article into a clip", () => store.get("clips", []).length > 0, ["publications", "profile"]]];
  const BADGES = [["Source Detective", "Found the original document", () => RS.signals().has("primary")], ["Context Unlocked", "Read the history behind the story", () => store.get("opened", []).includes("S9")], ["Mind Mapper", "Pinned your thought to the map", () => store.get("mapNote", false)], ["Evidence Over Ego", "Refreshed your knowledge after an update", () => !!store.get("refreshed", null)], ["Byline", "Published your first article", () => store.get("published", false)], ["Correction Champion", "Flagged a claim with reasoning", () => store.get("subEvidence", false)]];
  let qi = 0, qScore = 0, qDone = false, qAns = null;
  RS.V.mastery = {
    show(arg, el) {
      const L = RS.level(), s = RS.signals(); if (L.lvl && !store.get("cardEarned", null)) store.set("cardEarned", today());
      el.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">News Mastery · ${esc(C.title)}</span><h1>Curious → Story Master</h1><p>Mastery comes from what you explore and what you can show you understand, not from time on the page.</p></div>
        <div class="mastery"><div style="display:grid;gap:30px"><div class="levels">${RS.LEVELS.map((l, i) => `<div class="${L.lvl > i ? "on" : ""}">${i + 1}. ${l}</div>`).join("")}</div>
          <div><div class="sec-head" style="margin-bottom:8px"><h2 style="font-size:32px">What counts toward this card</h2></div><ul class="signals">${RS.SIGNALS.map(([k, l]) => { const ok = s.has(k), go = { overview: ["investigate", "genz|dossier"], timeline: ["investigate", "genz|timeline"], sources: ["investigate", "genz|dossier|sources"], primary: ["investigate", "genz|dossier|sources"], coverage: ["story", "genz"], map: ["investigate", "genz|map"], ai: ["investigate", "genz||ask"], board: ["investigate", "genz|notes"], quiz: ["mastery", "quiz"] }[k]; return `<li class="${ok ? "ok" : ""}"><span class="box">${ok ? "✓" : ""}</span><span>${l}</span>${ok ? `<span class="mono muted">done</span>` : `<button class="linkish" type="button" data-go="${go[0]}" data-arg="${go[1]}">Go</button>`}</li>`; }).join("")}</ul></div>
          <div id="quizBox"></div>
          <div><h2 class="display" style="font-size:32px;margin-bottom:8px">Learning path</h2><div class="path">${PATH.map((p, i) => { const done = p[2](), cur = !done && PATH.slice(0, i).every(q => q[2]()); return `<div class="pnode ${done ? "done" : cur ? "cur" : ""}"><button class="pdot" type="button" data-go="${p[3][0]}" data-arg="${p[3][1]}" aria-label="${esc(p[0])}">${done ? "✓" : i + 1}</button><div><h4>${esc(p[0])}</h4><p>${esc(p[1])}</p></div></div>`; }).join("")}</div></div>
          <div><h2 class="display" style="font-size:32px;margin-bottom:10px">Achievements</h2><div class="badges">${BADGES.map(([n, d, f]) => { const on = f(); return `<div class="badge ${on ? "" : "off"}"><svg viewBox="0 0 44 44" aria-hidden="true"><path d="M22 3l5 6 8-1 1 8 6 5-5 6 1 8-8 1-5 6-5-6-8-1 1-8-6-5 6-5-1-8 8 1z" fill="${on ? "#F5E500" : "none"}" stroke="#171717" stroke-width="2"/><text x="22" y="27" text-anchor="middle" font-family="Instrument Serif" font-size="16" fill="#171717">${n.split(" ").map(w => w[0]).join("")}</text></svg><b>${n}</b><span class="muted">${d}</span></div>`; }).join("")}</div></div></div>
        <aside style="display:grid;gap:18px;align-content:start" id="cardSide"></aside></div></div>`;
      this.card(); this.quiz(); if (arg === "quiz") { setTimeout(() => $("#quizBox").scrollIntoView(), 30); return true; }
    },
    card() {
      const L = RS.level(), s = RS.signals(), earned = store.get("cardEarned", null), refreshed = store.get("refreshed", null), reviewed = store.get("reviewedAt", null);
      const explored = [["Timeline", s.has("timeline")], ["Primary documents", s.has("primary")], ["Coverage comparison", s.has("coverage")], ["Mind map", s.has("map")], ["Competing claims", store.get("contraSeen", false)], ["Own notes", s.has("board")], ["Knowledge check", s.has("quiz")]].filter(x => x[1]).map(x => x[0]);
      $("#cardSide").innerHTML = `<div class="mcard ${L.lvl ? "" : "locked"}"><div class="art"><svg viewBox="0 0 320 200" aria-hidden="true"><rect width="320" height="200" fill="#FF4D6D"/><circle cx="242" cy="62" r="34" fill="#F5E500"/><path d="M40 170L110 60L180 170Z" fill="#F5F1E8" stroke="#171717" stroke-width="3"/><path d="M110 60V170M75 115h70" stroke="#171717" stroke-width="3"/><path d="M200 170a40 40 0 0 1 80 0" fill="#3D5AFE" stroke="#171717" stroke-width="3"/>${Array.from({ length: 26 }, (_, i) => `<circle cx="${14 + i * 12}" cy="${186 - (i % 3) * 4}" r="5" fill="#171717"/>`).join("")}<path d="M0 40Q160 0 320 60" stroke="#171717" stroke-width="4" fill="none"/></svg></div>
        <div class="mb"><span class="lvl">${L.lvl ? `Level ${L.lvl} · ${RS.LEVELS[L.lvl - 1]}` : "Locked · explore the story to start"}</span><h3>${esc(C.title)}</h3>${explored.length ? `<ul>${explored.map(e => `<li>${e}</li>`).join("")}</ul>` : ""}
          <span class="mono" style="color:var(--lab-mute)">${earned ? "Earned " + earned : "Not earned yet"}${reviewed ? " · reviewed " + reviewed : ""}${refreshed ? " · refreshed " + refreshed : ""}</span><p class="fine">Shows what you explored and what you showed you understood on one illustrative story. It isn't a certificate of expertise, and it can't be bought.</p></div></div>
        ${L.lvl ? `<button class="btn" type="button" id="cardShare">Copy share text</button>` : `<button class="btn k" type="button" data-go="investigate" data-arg="genz|dossier">Start investigating</button>`}
        ${s.has("quiz") && !refreshed ? `<div class="concern"><span class="eyebrow">Story updated · 24 Oct</span><b>Students repeated their demand for a full re-test; hearing on 4 Nov.</b><span style="font-size:14px">Has the court decided on a re-test yet?</span><div class="votes"><button type="button" data-r="no">No, it only asked for a status report</button><button type="button" data-r="yes">Yes, it ordered one</button></div><span id="rMsg" style="font-size:14px"></span></div>` : ""}`;
      if ($("#cardShare")) $("#cardShare").onclick = () => navigator.clipboard.writeText(`I didn't just scroll past "${C.title}". I investigated it. ${RS.LEVELS[L.lvl - 1]} (level ${L.lvl}/5) on ${BRAND.name}.`).then(() => toast("Share text copied"), () => toast("Your browser blocked copying"));
      $$("#cardSide [data-r]").forEach(b => b.onclick = () => { if (b.dataset.r === "no") { store.set("refreshed", today()); toast("Knowledge refreshed. Badge: Evidence Over Ego"); RS.V.mastery.show("", $("#v-mastery")); } else $("#rMsg").textContent = "Not yet: the court only asked for a status report (S7)."; });
    },
    quiz() {
      const box = $("#quizBox"), Q = C.quiz;
      if (qDone) { box.innerHTML = `<div class="quiz"><span class="eyebrow">Knowledge check · result</span><h2 class="display" style="font-size:40px">${qScore} / ${Q.length}</h2><p>${qScore >= 4 ? "Passed. That counts toward Analyst and Story Master." : "You need 4 to pass. The explanations make the next try a review, not a guess."}</p><div><button class="btn" type="button" id="qAgain">Take it again</button></div></div>`; $("#qAgain").onclick = () => { qi = 0; qScore = 0; qDone = false; qAns = null; this.quiz(); }; return; }
      const q = Q[qi];
      box.innerHTML = `<div class="quiz" id="quiz"><div style="display:flex;justify-content:space-between"><span class="eyebrow">Knowledge check · ${qi + 1} of ${Q.length}</span><span class="mono">best: ${store.get("quizBest", 0)}/5</span></div><div class="qbar"><span style="width:${qi / Q.length * 100}%"></span></div><h3 class="display" style="font-size:28px">${esc(q.q)}</h3>
        <div class="opts">${q.a.map((a, i) => `<button type="button" data-a="${i}" ${qAns !== null ? "disabled" : ""} class="${qAns === null ? "" : i === q.ok ? "right" : i === qAns ? "wrong" : ""}">${esc(a)}</button>`).join("")}</div>
        ${qAns !== null ? `<p><b>${qAns === q.ok ? "Right." : "Not quite."}</b> ${ct(q.why.replace(/\((S\d+)\)/g, "[$1]"))}</p><div><button class="btn k" type="button" id="qNext">${qi === Q.length - 1 ? "See result" : "Next"}</button></div>` : ""}</div>`;
      $$("#quiz [data-a]").forEach(b => b.onclick = () => { qAns = +b.dataset.a; if (qAns === q.ok) qScore++; store.set("quizTaken", true); this.quiz(); });
      if ($("#qNext")) $("#qNext").onclick = () => { qAns = null; if (qi === Q.length - 1) { qDone = true; if (qScore > store.get("quizBest", 0)) store.set("quizBest", qScore); if (qScore >= 4) { store.set("reviewedAt", today()); sig("quiz"); } RS.renderChip(); RS.V.mastery.show("quiz", $("#v-mastery")); return; } qi++; this.quiz(); };
    }
  };

  /* ================= KIDS: comic pager + gated quiz + goodies ================= */
  const fig = (x, gy, o = {}) => { const h = gy - 62; return `<circle class="c-head" cx="${x}" cy="${h}" r="10"/><path class="c-ink" d="M${x} ${h + 10}V${gy - 22}M${x} ${gy - 22}L${x - 9} ${gy}M${x} ${gy - 22}L${x + 9} ${gy}"/>` + (o.arms || `<path class="c-ink" d="M${x - 12} ${h + 30}L${x} ${h + 18}L${x + 12} ${h + 30}"/>`); };
  const bubble = (x, y, w, h, tx, ty, lines) => `<path class="c-bubble" d="M${x} ${y}h${w}v${h}H${tx + 10}L${tx} ${ty}L${tx - 4} ${y + h}H${x}z"/>` + lines.map((l, i) => `<text class="c-text" x="${x + w / 2}" y="${y + 20 + i * 17}" text-anchor="middle">${l}</text>`).join("");
  const ground = `<path class="c-ink" d="M0 186H300"/>`;
  const PANELS = [
    [ground + [[10, 110, 40], [55, 90, 36], [96, 120, 44], [150, 80, 40], [196, 104, 36], [240, 95, 50]].map(([x, y, w]) => `<rect class="c-bldg" x="${x}" y="${y}" width="${w}" height="${186 - y}"/>`).join("") + `<circle class="c-sun" cx="230" cy="40" r="22"/><circle class="c-smog" cx="150" cy="50" r="34"/><circle class="c-smog" cx="196" cy="46" r="30"/><circle class="c-smog" cx="110" cy="58" r="26"/><circle class="c-smog" cx="230" cy="58" r="22"/><circle class="c-solid" cx="160" cy="46" r="3"/><circle class="c-solid" cx="182" cy="46" r="3"/><path class="c-thin" d="M162 64q9-7 18 0"/>` + fig(40, 186), "Meera can't see the sun today. A grey cloud called Smoggy is sitting on the city."],
    [ground + `<circle class="c-smog" cx="170" cy="56" r="34"/><circle class="c-smog" cx="214" cy="52" r="28"/><circle class="c-smog" cx="130" cy="62" r="24"/><circle class="c-solid" cx="160" cy="48" r="3"/><circle class="c-solid" cx="186" cy="48" r="3"/><ellipse class="c-solid" cx="173" cy="66" rx="8" ry="6"/>` + bubble(8, 14, 108, 40, 100, 60, ["I'm made of", "smoke &amp; dust!"]) + [[40, "c-red"], [150, "c-blue"]].map(([x, c]) => `<rect class="${c}" x="${x}" y="150" width="70" height="24" rx="6"/><circle class="c-head" cx="${x + 16}" cy="178" r="8"/><circle class="c-head" cx="${x + 54}" cy="178" r="8"/>`).join(""), "Smoggy grows from car exhaust, building dust and smoke from far-away crop fires."],
    [ground + `<rect x="0" y="0" width="300" height="70" fill="#9AA0A8" opacity=".5"/><path class="c-ink" d="M20 40h260" stroke-dasharray="8 8"/><text class="c-text" x="150" y="30" text-anchor="middle">warm air lid</text>` + fig(80, 186) + fig(140, 186) + `<circle class="c-smog" cx="210" cy="120" r="26"/><circle class="c-smog" cx="240" cy="110" r="20"/>`, "On cold, still nights a warm layer of air acts like a lid. Smoggy gets stuck near the ground."],
    [ground + `<circle class="c-sun" cx="80" cy="64" r="34"/>` + [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = a * Math.PI / 180; return `<path class="c-ink" d="M${80 + Math.cos(r) * 42} ${64 + Math.sin(r) * 42}L${80 + Math.cos(r) * 54} ${64 + Math.sin(r) * 54}"/>`; }).join("") + `<circle class="c-head" cx="210" cy="50" r="18"/><circle class="c-head" cx="232" cy="46" r="16"/><circle class="c-solid" cx="212" cy="48" r="2.5"/><circle class="c-solid" cx="226" cy="48" r="2.5"/><path class="c-thin" d="M213 56q6 5 12 0"/><rect class="c-bldg" x="262" y="146" width="10" height="40"/><circle class="c-tree" cx="267" cy="128" r="26"/>` + fig(150, 186, { arms: `<path class="c-ink" d="M138 136L130 118M162 136L170 118"/>` }), "Wind, rain, fewer fires and cleaner transport help Smoggy shrink. Hello, sun!"]
  ];
  const KQ = [{ q: "What does AQI measure?", a: ["How hot it is", "How polluted the air is", "How fast the wind blows"], ok: 1 }, { q: "Why is the air often worse in winter?", a: ["A warm-air lid traps smoke near the ground", "There are more clouds", "People breathe more"], ok: 0 }, { q: "Which is NOT a usual cause of Delhi's smog?", a: ["Vehicle exhaust", "Crop stubble burning", "Ocean waves"], ok: 2 }, { q: "What are PM2.5 particles?", a: ["Tiny dust specks that get deep into lungs", "A kind of rain", "A pollution app"], ok: 0 }, { q: "Which of these helps Smoggy shrink?", a: ["More honking", "Wind and rain", "Burning leaves"], ok: 1 }];
  let page = 0, seen = new Set(store.get("kidsSeen", [])), kAns = {};
  RS.V.kids = {
    show(arg, el) {
      seen.add(page); store.set("kidsSeen", [...seen]);
      const unlocked = seen.size >= PANELS.length, done = Object.keys(kAns).length === KQ.length, score = KQ.filter((q, i) => kAns[i] === q.ok).length;
      const code = store.get("goodieCode", null);
      el.innerHTML = `<div class="kids-head"><div class="wrap"><span class="eyebrow" style="color:var(--ink)">${esc(AI)} Kids · this week's comic · ages 12+</span><h1>Why is Delhi's air so bad in winter?</h1><p style="font-size:18px">Read the comic, then take the quiz. Score 4 or more and we'll pack goodies with your next magazine delivery.</p></div></div>
        <div class="wrap"><div class="kgrid"><div>
          <div class="pager"><figure class="cpanel big">${`<svg viewBox="0 0 300 200" role="img" aria-label="${esc(PANELS[page][1])}">${PANELS[page][0]}</svg>`}<figcaption>${esc(PANELS[page][1])}</figcaption></figure>
            <div class="pager-ctl"><button class="btn" type="button" id="pgPrev" ${page ? "" : "disabled"}>← Back</button><span class="mono">Page ${page + 1} of ${PANELS.length}</span><button class="btn k" type="button" id="pgNext">${page === PANELS.length - 1 ? "Finish comic" : "Next →"}</button></div>
            <div class="dots">${PANELS.map((_, i) => `<span class="${i === page ? "on" : seen.has(i) ? "seen" : ""}"></span>`).join("")}</div></div>
          <div class="section"><h2 class="display" style="font-size:34px">Quiz ${unlocked ? "" : "🔒"}</h2>
            ${!unlocked ? `<div class="locked-q"><b>Read the whole comic to unlock the quiz.</b><span>${seen.size} of ${PANELS.length} pages read.</span></div>`
              : `<div style="display:grid;gap:14px;margin-top:10px">${KQ.map((q, i) => `<div class="quiz"><b>${i + 1}. ${esc(q.q)}</b><div class="opts">${q.a.map((a, j) => `<button type="button" data-kq="${i}:${j}" ${kAns[i] !== undefined ? "disabled" : ""} class="${kAns[i] === undefined ? "" : j === q.ok ? "right" : j === kAns[i] ? "wrong" : ""}">${esc(a)}</button>`).join("")}</div></div>`).join("")}</div>
              ${done ? (score >= 4 ? `<div class="goodies"><span class="eyebrow">You scored ${score}/${KQ.length}!</span><h3 class="display" style="font-size:40px">Goodies unlocked 🎁</h3><p>Show this code to a grown-up. They add it to your family's weekly subscription, and we pack a sticker sheet and a ${esc(AI)} badge with your next delivery.</p><div class="code">${esc(code || "")}</div><button class="btn r" type="button" data-go="magazine" data-arg="goodies">Add it to our subscription</button><p class="mono" style="font-size:11.5px">We don't collect any details from kids here.</p></div>`
                : `<div class="locked-q"><b>You got ${score}/${KQ.length}.</b><span>Score 4 or more for goodies. Flip back through the comic and try again!</span><button class="btn sm" type="button" id="kRetry">Try again</button></div>`) : ""}`}</div></div>
          <aside style="display:grid;gap:20px;align-content:start">
            <div class="rule-top"><h2 class="display" style="font-size:30px">The facts</h2><ul style="padding-left:18px;display:grid;gap:6px;margin:8px 0 0"><li>AQI (Air Quality Index) is a number for how polluted the air is. Above 400 is called “severe”.</li><li>Delhi's air is often worst in November and December.</li><li>Smoke comes from vehicles, factories, construction dust and crop stubble burned in nearby states.</li><li>In winter, cold air sits low and still, so pollution can't drift away.</li></ul></div>
            <div class="rule-top"><h2 class="display" style="font-size:30px">New words</h2><div class="vocab" style="margin-top:8px"><div><b>AQI</b> · a score for air pollution</div><div><b>PM2.5</b> · dust specks small enough to get deep into lungs</div><div><b>Stubble burning</b> · burning leftover crop stalks to clear fields</div><div><b>Inversion</b> · a warm air layer that traps cold air (and smoke) below</div></div></div>
            <div class="method"><b>Think about it</b><span>If you ran Delhi for one winter, what would you try first, and who might it be hard for?</span></div>
            <p class="mono muted">No public profiles or chats for under-18s. Quiz answers stay on this device.</p></aside></div></div>`;
      $("#pgPrev").onclick = () => { page = Math.max(0, page - 1); this.show(arg, el); };
      $("#pgNext").onclick = () => { if (page < PANELS.length - 1) { page++; this.show(arg, el); } else { seen.add(page); store.set("kidsSeen", [...seen]); toast("Comic finished. Quiz unlocked!"); this.show(arg, el); setTimeout(() => $(".section .display")?.scrollIntoView({ behavior: "smooth" }), 50); } };
      $$("[data-kq]", el).forEach(b => b.onclick = () => { const [i, j] = b.dataset.kq.split(":").map(Number); kAns[i] = j;
        if (Object.keys(kAns).length === KQ.length && KQ.filter((q, k) => kAns[k] === q.ok).length >= 4 && !store.get("goodieCode", null)) store.set("goodieCode", "RT-KIDS-" + Math.random().toString(36).slice(2, 6).toUpperCase());
        this.show(arg, el); return; });
      if ($("#kRetry")) $("#kRetry").onclick = () => { kAns = {}; page = 0; this.show(arg, el); };
      return arg === "keep";
    }
  };

  /* ================= MAGAZINE: page flip + weekly subscription ================= */
  const PLANS = [{ id: "mag", name: "The Red Thread Weekly", price: 49, desc: "The weekly magazine: one long read, the Shameboard, community picks." }, { id: "kids", name: `${BRAND.ai} Kids Comic`, price: 29, desc: "A news comic for ages 12+, with the quiz and goodies." }, { id: "combo", name: "Family combo", price: 69, desc: "Both, in one envelope. Best value.", best: true }];
  let slide = 0, plan = "combo";
  function magPage(i) {
    if (i === 0) return `<div class="mpage cover"><svg viewBox="0 0 300 400" aria-hidden="true">${Array.from({ length: 12 * 16 }, (_, k) => { const x = (k % 12) * 25, y = Math.floor(k / 12) * 25, cols = ["#171717", "#F5E500", "#FF4D6D", "#3D5AFE", "#B69CFF", "#2FD3A6", "#FF8A3D", "#171717"]; return (x < 25 || x > 250 || y < 25 || y > 350) ? `<rect x="${x + 1}" y="${y + 1}" width="23" height="23" fill="${cols[(k * 7) % 8]}"/>` : ""; }).join("")}<rect x="25" y="25" width="250" height="350" fill="#F5F1E8"/><circle cx="150" cy="210" r="70" fill="#FF4D6D"/><path d="M95 210q55-50 110 0q-55 50-110 0z" fill="#F5F1E8" stroke="#171717" stroke-width="4"/><circle cx="150" cy="210" r="20" fill="#3D5AFE" stroke="#171717" stroke-width="4"/><circle cx="150" cy="210" r="7" fill="#171717"/><path d="M30 120C110 80 190 330 270 280" stroke="#C8102E" stroke-width="5" fill="none"/><rect x="200" y="290" width="60" height="40" fill="#F5E500" stroke="#171717" stroke-width="2" transform="rotate(8 230 310)"/></svg>
      <div class="mc-mast">THE RED THREAD<small>WEEKLY · ISSUE 01 · ₹49</small></div><div class="mc-lines"><b>What media didn't show you</b><span>8 buried stories</span><b>The Exam Hall Problem</b><span>Who decides what counts as proof?</span></div></div>`;
    if (i === 1) return `<div class="mpage spread"><span class="eyebrow">Feature · Issue 01</span><h3>The Exam Hall Problem</h3><p class="drop">Two days after the entrance exam, screenshots began moving through Telegram groups. They appeared to show 18 of its questions. Nobody has yet shown those timestamps are real. Nobody has shown they're fake either.</p><div class="pull">“Which evidence would change your mind?”</div><p>Police arrested four people at two centres. The agency's audit found a breach at those same two. For students, that sounded like an agency marking its own homework; for high scorers, a re-test sounded like punishment. Neither is settled by the evidence so far.</p><svg viewBox="0 0 300 80" aria-hidden="true"><rect width="300" height="80" fill="#171717"/>${Array.from({ length: 12 }, (_, k) => `<rect x="${k * 25 + 2}" y="${10 + (k % 3) * 12}" width="20" height="${40 - (k % 3) * 12}" fill="${["#FF4D6D", "#F5E500", "#3D5AFE", "#2FD3A6"][k % 4]}"/>`).join("")}</svg></div>`;
    return `<div class="mpage comicp"><span class="eyebrow">${esc(BRAND.ai)} Kids · page 1</span><h3>Smoggy the Cloud</h3><div class="mini-panels">${PANELS.map(p => `<svg viewBox="0 0 300 200" aria-hidden="true">${p[0]}</svg>`).join("")}</div><p class="mono" style="font-size:11px">Read it, take the quiz, win goodies.</p></div>`;
  }
  RS.V.magazine = {
    show(arg, el) {
      const code = arg === "goodies" ? store.get("goodieCode", "") : "";
      el.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">Print · weekly delivery</span><h1>Flip through this week's issue</h1><p>One envelope a week: the magazine for you, the comic for younger readers. Here are three pages from Issue 01.</p></div>
        <div class="flip"><button class="flipnav" type="button" id="fPrev" aria-label="Previous page">‹</button><div class="flipstage" id="flipStage" tabindex="0" aria-roledescription="carousel" aria-label="Magazine pages">${[0, 1, 2].map(i => `<div class="fslide ${i === slide ? "on" : ""}" aria-hidden="${i !== slide}">${magPage(i)}</div>`).join("")}</div><button class="flipnav" type="button" id="fNext" aria-label="Next page">›</button></div>
        <div class="dots" style="justify-content:center">${[0, 1, 2].map(i => `<button type="button" class="${i === slide ? "on" : ""}" data-sl="${i}" aria-label="Page ${i + 1}"></button>`).join("")}</div>
        <p class="mono muted" style="text-align:center;font-size:12px">${["Cover", "Feature spread", "Kids comic"][slide]} · page ${slide + 1} of 3 · illustrated for this prototype</p>
        <div class="section" id="subscribe"><div class="sec-head"><h2>Get it at home, every week</h2><span class="eyebrow">Prices are illustrative</span></div>
          <div class="plans">${PLANS.map(p => `<button type="button" class="plan ${p.id === plan ? "on" : ""}" data-plan="${p.id}">${p.best ? `<span class="best">Best value</span>` : ""}<b>${esc(p.name)}</b><span class="price">₹${p.price}<small>/week</small></span><span class="muted">${esc(p.desc)}</span><span class="mono">≈ ₹${p.price * 4}/month · cancel anytime</span></button>`).join("")}</div>
          <form class="submit" id="orderForm" novalidate style="margin-top:18px"><div class="grid2"><div class="field"><label for="oName">Full name *</label><input id="oName" autocomplete="name"></div><div class="field"><label for="oPhone">Phone *</label><input id="oPhone" inputmode="tel" autocomplete="tel" placeholder="10-digit mobile"></div></div>
            <div class="field"><label for="oAddr">Delivery address *</label><textarea id="oAddr" autocomplete="street-address" style="min-height:60px"></textarea></div>
            <div class="grid3"><div class="field"><label for="oCity">City *</label><input id="oCity" autocomplete="address-level2"></div><div class="field"><label for="oPin">PIN code *</label><input id="oPin" inputmode="numeric" maxlength="6" autocomplete="postal-code"></div><div class="field"><label for="oDay">Delivery day</label><select id="oDay"><option>Sunday</option><option>Saturday</option><option>Friday</option></select></div></div>
            <div class="field"><label for="oCode">Kids goodies code (optional)</label><input id="oCode" value="${esc(code)}" placeholder="RT-KIDS-XXXX"></div>
            <p class="status" id="oMsg" style="font-weight:700"></p><div><button class="btn r" type="submit">Place order</button> <span class="mono muted">Demo: no order is placed, no payment taken, nothing is sent.</span></div></form><div id="oDone"></div></div></div>`;
      const go = n => { slide = (n + 3) % 3; this.show(arg === "goodies" ? "keep" : arg, el); };
      $("#fPrev").onclick = () => go(slide - 1); $("#fNext").onclick = () => go(slide + 1);
      $$("[data-sl]", el).forEach(b => b.onclick = () => go(+b.dataset.sl));
      $("#flipStage").onkeydown = e => { if (e.key === "ArrowRight") go(slide + 1); if (e.key === "ArrowLeft") go(slide - 1); };
      let sx = null; $("#flipStage").onpointerdown = e => sx = e.clientX; $("#flipStage").onpointerup = e => { if (sx != null && Math.abs(e.clientX - sx) > 40) go(slide + (e.clientX < sx ? 1 : -1)); sx = null; };
      $$("[data-plan]", el).forEach(b => b.onclick = () => { plan = b.dataset.plan; $$("[data-plan]", el).forEach(x => x.classList.toggle("on", x === b)); });
      $("#orderForm").addEventListener("submit", e => { e.preventDefault();
        const v = id => $("#" + id).value.trim(); const miss = [["oName", "name"], ["oPhone", "phone"], ["oAddr", "address"], ["oCity", "city"], ["oPin", "PIN code"]].filter(([id]) => !v(id)).map(x => x[1]);
        if (miss.length) { $("#oMsg").textContent = "Please add your " + miss.join(", ") + "."; return; }
        if (!/^\d{10}$/.test(v("oPhone").replace(/\D/g, "").slice(-10))) { $("#oMsg").textContent = "Enter a 10-digit mobile number."; return; }
        if (!/^\d{6}$/.test(v("oPin"))) { $("#oMsg").textContent = "PIN codes have 6 digits."; return; }
        const P = PLANS.find(p => p.id === plan); $("#orderForm").hidden = true;
        $("#oDone").innerHTML = `<div class="goodies"><span class="eyebrow">Order preview · demo</span><h3 class="display" style="font-size:36px">${esc(P.name)}, every ${esc(v("oDay"))}</h3><p>₹${P.price}/week to ${esc(v("oCity"))} ${esc(v("oPin"))}${v("oCode") ? ` · goodies code ${esc(v("oCode"))} added` : ""}.</p><p class="mono" style="font-size:12px">This is a prototype: no order was placed, no payment was taken and your details weren't sent anywhere.</p></div>`;
      });
      if (arg === "goodies") { setTimeout(() => $("#subscribe").scrollIntoView(), 40); return true; }
      return arg === "keep";
    }
  };

  /* ================= LIBRARY ================= */
  let clearArm = false;
  RS.V.library = {
    show(arg, el) {
      const sv = RS.saved(), B = store.get("board", { objs: [] }), L = RS.level(), posts = store.get("posts", []), f = [...follows()], subs = store.get("subs", []), clips = store.get("clips", []);
      const notesBy = STORIES.map(s => [s, RS.storyNotes(s.id).length]).filter(x => x[1]);
      const list = (arr, fn, empty) => arr.length ? `<ul>${arr.map(fn).join("")}</ul>` : `<div class="empty">${empty}</div>`;
      el.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">My Library · private to you</span><h1>Your research, kept</h1><p>Everything you save, note and publish in this demo lives in this browser. In the real product it syncs to your account and you can export it.</p></div>
        <div class="lib">
          <section><h3>Research notes</h3>${list(notesBy, ([s, n]) => `<li><button class="linkish" type="button" data-go="investigate" data-arg="${s.id}|notes">${esc(s.title)}</button><span class="mono muted">${n}</span></li>`, "Add notes in Investigate.")}</section>
          <section><h3>Saved stories</h3>${list(sv.filter(s => s.k === "story" || s.k === "inv"), s => `<li><button class="linkish" type="button" data-go="story" data-arg="${s.id}">${esc(s.title)}</button></li>`, "Press Save on any story.")}</section>
          <section><h3>Saved sources</h3>${list(sv.filter(s => s.k === "src"), s => `<li><span>${cite(s.id)} ${esc(s.title)}</span></li>`, "Open a source and press Save.")}</section>
          <section><h3>Your articles</h3>${list(posts, p => `<li><button class="linkish" type="button" data-go="post" data-arg="${p.id}">${esc(p.title)}</button></li>`, "Nothing published yet.")}</section>
          <section><h3>Clips</h3><p>${clips.length} made</p>${posts[0] ? `<div><button class="btn sm" type="button" data-go="clip" data-arg="${posts[0].id}">Make a clip</button></div>` : ""}</section>
          <section><h3>Mastery</h3><p>${L.lvl ? `Level ${L.lvl} · ${RS.LEVELS[L.lvl - 1]}` : "Not started"}</p><div><button class="btn sm" type="button" data-go="mastery">View card</button></div></section>
          <section><h3>Whiteboard</h3><p>${B.objs.length} items · private</p><div><button class="btn sm" type="button" data-go="board">Open board</button></div></section>
          <section><h3>Subscriptions</h3>${list(f, id => `<li>${esc(ALL_PUBS().find(p => p.id === id)?.name || id)}</li>`, "Subscribe to a publication.")}</section>
          <section><h3>Shameboard flags</h3>${list(subs, s => `<li><span>${esc(s.claim.slice(0, 60))}</span><span class="mono muted">under review</span></li>`, "No claims flagged.")}</section>
        </div><div class="section"><button class="btn ${clearArm ? "r" : ""}" type="button" id="clearAll">${clearArm ? "Press again to erase all demo data" : "Erase my demo data"}</button></div></div>`;
      $("#clearAll").onclick = () => { if (!clearArm) { clearArm = true; this.show(arg, el); setTimeout(() => { clearArm = false; }, 6000); return; } try { Object.keys(localStorage).filter(k => k.startsWith("rs:")).forEach(k => localStorage.removeItem(k)); } catch { } toast("Demo data erased. Reloading…"); setTimeout(() => location.reload(), 900); };
    }
  };
})();
