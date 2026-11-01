/* THE RED THREAD — Creator Studio (the old research-brief Studio and the Clip maker, merged into one flow).
   Step 1, Research & notes: research on the left (a live story's facts and every outlet's headline, your Research Board
   cards, your published articles), a Notion-style notes doc on the right where each pointer is one block (what shows on
   screen) with talking notes under it (only you see those). Step 2, Record: you on camera with the news-clip pop-ups on
   top; the pointers advance when YOU press Next (button, → key, Space or a presenter clicker), and a prompter beside the
   preview shows the current pointer and your notes, editable while you talk. Docs are saved in this browser. */
(function () {
  const { $, $$, esc, store, toast, AI } = RS;
  const STYLES = { breaking: "Breaking", explainer: "Explainer", myth: "Myth vs fact" };
  const uid = () => "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const nameOf = id => ((window.LIVE_OUTLETS || {})[id] || {}).name || id;
  let docs = store.get("sdocs", []), cur = store.get("sdocCur", null), step = 1, tab = "story", storyId = null, saveT = 0;
  const doc = () => docs.find(d => d.id === cur) || newDoc();
  function newDoc(seed = {}) {
    const d = { id: uid(), title: "Untitled video", hook: "", outro: "Follow for the full story, with sources.", style: "breaking", handle: (RS.myPub && RS.myPub().handle) || "@genzdispatch", dur: 4, points: [], updated: Date.now(), ...seed };
    docs.unshift(d); cur = d.id; persist(); return d;
  }
  function persist() { store.set("sdocs", docs.slice(0, 30)); store.set("sdocCur", cur); }
  const touch = () => { doc().updated = Date.now(); clearTimeout(saveT); saveT = setTimeout(persist, 300); };
  const addPoint = (p, quiet) => { const d = doc(); d.points.push({ line: "", note: "", src: "", link: "", ...p }); touch(); if (step === 1) renderDoc(); if (!quiet) toast("Added to your notes"); };
  // add pointers to the open Creator Studio doc from anywhere (mind map, Research Board, notes)
  RS.studioAdd = (pts, from) => {
    const d = docs.find(x => x.id === cur) || newDoc();
    pts.filter(p => p && p.line).forEach(p => d.points.push({ line: String(p.line).slice(0, 220), note: p.note || "", src: p.src || "", link: p.link || "" }));
    touch(); persist(); if (step === 1 && !$("#v-studio").hidden) renderDoc();
    toast(`${pts.length > 1 ? pts.length + " pointers" : "Pointer"} added to Creator Studio${from ? " from your " + from : ""}`, "Open Studio", () => RS.show("studio"));
  };
  const liveStories = () => STORIES.filter(s => (s.articles || []).length || s.sum).sort((a, b) => (b.outletCount || 0) - (a.outletCount || 0)).slice(0, 60);

  /* ---------- step 1: research ---------- */
  function research() {
    const box = $("#csRes"); if (!box) return;
    const tabs = [["story", "News stories"], ["board", "My Research Board"], ["notes", "Mind map & notes"], ["posts", "My articles"]];
    let body = "";
    if (tab === "story") {
      const list = liveStories(), s = list.find(x => x.id === storyId) || list[0];
      if (!s) body = `<p class="muted">Stories are still loading.</p>`;
      else {
        storyId = s.id;
        const seen = new Set(), heads = (s.articles || []).filter(a => !seen.has(a.outlet) && seen.add(a.outlet)).slice(0, 14);
        body = `<div class="field"><label for="csStory">Pick a story</label><select id="csStory">${list.map(x => `<option value="${esc(x.id)}" ${x.id === s.id ? "selected" : ""}>${esc(x.title.slice(0, 90))}${x.outletCount ? ` · ${x.outletCount} outlets` : ""}</option>`).join("")}</select></div>
          <h3 class="cs-h">What’s being reported</h3>
          ${(s.sum || []).map(t => `<div class="cs-item"><p>${esc(t)}</p><button class="btn sm" type="button" data-addp="${esc(JSON.stringify({ line: t }))}">+ Pointer</button></div>`).join("") || `<p class="muted">No summary for this story.</p>`}
          <h3 class="cs-h">How each outlet put it</h3>
          ${heads.map(a => `<div class="cs-item"><p><b>${esc(nameOf(a.outlet))}</b> <a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a></p><button class="btn sm" type="button" data-addp="${esc(JSON.stringify({ line: a.title, src: nameOf(a.outlet), link: a.link }))}">+ Pointer</button></div>`).join("")}
          <div class="cs-row"><button class="btn sm" type="button" data-go="story" data-arg="${esc(s.id)}">Open the full story</button><button class="btn sm" type="button" id="csTitle">Use as my video title</button></div>`;
      }
    } else if (tab === "board") {
      const B = store.get("board", null), cards = ((B && B.objs) || []).filter(o => o.title && !["zone", "heading"].includes(o.type));
      body = `<p class="muted">Everything you’ve pinned on your Research Board. Add any card to your notes.</p>
        ${cards.length ? cards.slice(0, 40).map(o => `<div class="cs-item"><p><b>${esc(o.title)}</b>${o.text ? `<br><span class="muted">${esc(String(o.text).slice(0, 160))}</span>` : ""}</p><button class="btn sm" type="button" data-addp="${esc(JSON.stringify({ line: o.title, note: o.text || "" }))}">+ Pointer</button></div>`).join("") : `<p class="muted">Your board is empty.</p>`}
        <div class="cs-row"><button class="btn sm y" type="button" data-go="board">Open my Research Board</button></div>`;
    } else if (tab === "notes") {
      const all = [...STORIES, ...(window.SAMPLE_STORIES || [])].flatMap(x => store.get("notes:" + x.id, []).map(n => ({ ...n, story: x.title })));
      body = `<p class="muted">Notes you saved in Investigate, including thoughts pinned to a mind map.</p>
        ${all.length ? all.slice().reverse().slice(0, 50).map(n => `<div class="cs-item"><p>${esc(n.text)}<br><span class="muted">${esc(n.story.slice(0, 70))}</span></p><button class="btn sm" type="button" data-addp="${esc(JSON.stringify({ line: n.text }))}">+ Pointer</button></div>`).join("") : `<p class="muted">No notes yet. In Investigate, use “+ note” or “Add to my notes”.</p>`}
        <div class="cs-row"><button class="btn sm y" type="button" data-go="investigate" data-arg="|map">Open the mind map</button></div>`;
    } else {
      const posts = RS.allPosts().filter(p => p.mine);
      body = posts.length ? posts.map(p => `<div class="cs-item"><p><b>${esc(p.title)}</b><br><span class="muted">${esc(p.dek || "")}</span></p><button class="btn sm" type="button" data-imp="${esc(p.id)}">Use its points</button></div>`).join("")
        : `<p class="muted">You haven’t published an article yet. <button class="footlink" type="button" data-go="publications">Write one</button></p>`;
    }
    box.innerHTML = `<div class="tabs cs-rtabs">${tabs.map(([k, n]) => `<button type="button" data-rt="${k}" aria-pressed="${k === tab}">${n}</button>`).join("")}</div><div class="cs-rbody">${body}</div>`;
    $$("[data-rt]", box).forEach(b => b.onclick = () => { tab = b.dataset.rt; research(); });
    $$("[data-addp]", box).forEach(b => b.onclick = () => { const d = doc(), s = tab === "story" && STORIES.find(x => x.id === storyId); if (s && d.title === "Untitled video" && !d.points.length) { d.title = s.title; d.hook = d.hook || s.title; d.story = s.id; } addPoint(JSON.parse(b.dataset.addp)); });
    $$("[data-imp]", box).forEach(b => b.onclick = () => importPost(b.dataset.imp));
    const sel = $("#csStory"); if (sel) sel.onchange = () => { storyId = sel.value; research(); };
    const t = $("#csTitle"); if (t) t.onclick = () => { const s = STORIES.find(x => x.id === storyId); if (!s) return; const d = doc(); d.title = s.title; if (!d.hook) d.hook = s.title; d.story = s.id; touch(); renderDoc(); toast("Title set"); };
  }
  function importPost(id) {
    const p = RS.allPosts().find(x => x.id === id); if (!p) return null;
    const c = RS.clipFromPost(p);
    let d = docs.find(x => x.postId === p.id);
    if (!d) d = newDoc({ title: p.title, hook: c.hook, postId: p.id, points: c.scenes.map(s => ({ line: s.line, note: "", src: s.tag || "", link: "" })) });
    cur = d.id; persist(); if (step === 1) renderDoc(); toast("Your article’s points are in the notes"); return d;
  }

  /* ---------- step 1: notes doc ---------- */
  function renderDoc() {
    const box = $("#csDoc"); if (!box) return;
    const d = doc();
    box.innerHTML = `<div class="cs-dochead"><select id="csDocs" aria-label="Your notes docs">${docs.map(x => `<option value="${x.id}" ${x.id === d.id ? "selected" : ""}>${esc(x.title || "Untitled")}</option>`).join("")}</select>
        <button class="btn sm" type="button" id="csNew">+ New doc</button><button class="btn sm" type="button" id="csDel" title="Delete this doc">Delete</button></div>
      <input class="cs-title" id="csT" value="${esc(d.title)}" placeholder="Video title" aria-label="Video title">
      <label class="cs-lab" for="csHook">Opening line (on screen first)</label><input class="cs-in" id="csHook" value="${esc(d.hook)}" placeholder="The hook: why should anyone keep watching?">
      <div class="cs-lab">Pointers <span class="muted">· each one pops up on screen; your talking notes stay private</span></div>
      <ol class="cs-points" id="csPts">${d.points.map((p, i) => `<li class="cs-pt" draggable="true" data-i="${i}">
          <span class="cs-grip" title="Drag to reorder" aria-hidden="true">⋮⋮</span><span class="cs-num">${i + 1}</span>
          <div class="cs-ptbody"><textarea class="cs-line" data-f="line" rows="1" placeholder="Pointer (shown on screen)" aria-label="Pointer ${i + 1}">${esc(p.line)}</textarea>
            <textarea class="cs-note" data-f="note" rows="2" placeholder="What you’ll say (only you see this)" aria-label="Talking notes for pointer ${i + 1}">${esc(p.note)}</textarea>
            ${p.src ? `<span class="cs-src">Source: ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(p.src)}</a>` : esc(p.src)} <button type="button" class="footlink" data-unsrc>remove</button></span>` : ""}</div>
          <span class="cs-ptacts"><button type="button" data-mv="-1" aria-label="Move up">↑</button><button type="button" data-mv="1" aria-label="Move down">↓</button><button type="button" data-rm aria-label="Delete pointer">✕</button></span></li>`).join("")}</ol>
      <button class="cs-add" type="button" id="csAdd">+ Add a pointer</button>
      <label class="cs-lab" for="csOut">Closing line</label><input class="cs-in" id="csOut" value="${esc(d.outro)}">
      <div class="cs-row cs-docfoot">${RS.ai() ? `<button class="btn" type="button" id="csAI">✦ Draft pointers with ${AI}</button>` : ""}<span class="muted" id="csAIs"></span>
        <button class="btn y cs-next" type="button" id="csGo" ${d.points.some(p => p.line.trim()) ? "" : "disabled"}>Next: record →</button></div>`;
    const bind = (id, k) => $("#" + id).oninput = e => { d[k] = e.target.value; touch(); if (k === "title") { const o = $(`#csDocs option[value="${d.id}"]`); if (o) o.textContent = d.title || "Untitled"; } };
    bind("csT", "title"); bind("csHook", "hook"); bind("csOut", "outro");
    $("#csDocs").onchange = e => { cur = e.target.value; persist(); renderDoc(); };
    $("#csNew").onclick = () => { newDoc(); renderDoc(); $("#csT").select(); };
    $("#csDel").onclick = () => { if (!confirm(`Delete “${d.title || "Untitled"}”?`)) return; docs = docs.filter(x => x !== d); cur = docs[0] ? docs[0].id : null; persist(); renderDoc(); };
    $("#csAdd").onclick = () => { addPoint({}, true); $$("#csPts .cs-line").pop().focus(); };
    $("#csGo").onclick = () => go(2);
    const grow = t => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; };
    $$("#csPts textarea").forEach(grow);
    const pts = $("#csPts"), refreshGo = () => { $("#csGo").disabled = !d.points.some(p => p.line.trim()); };
    pts.addEventListener("input", e => { if (e.target.tagName === "TEXTAREA") grow(e.target); const li = e.target.closest(".cs-pt"), f = e.target.dataset.f; if (!li || !f) return; d.points[+li.dataset.i][f] = e.target.value; touch(); refreshGo(); });
    pts.addEventListener("keydown", e => {
      const li = e.target.closest(".cs-pt"); if (!li || !e.target.classList.contains("cs-line")) return; const i = +li.dataset.i;
      if (e.key === "Enter") { e.preventDefault(); d.points.splice(i + 1, 0, { line: "", note: "", src: "", link: "" }); touch(); renderDoc(); $$("#csPts .cs-line")[i + 1].focus(); }
      else if (e.key === "Backspace" && !e.target.value && !d.points[i].note) { e.preventDefault(); d.points.splice(i, 1); touch(); renderDoc(); const l = $$("#csPts .cs-line"); (l[Math.max(0, i - 1)] || $("#csAdd")).focus(); }
    });
    pts.addEventListener("click", e => {
      const li = e.target.closest(".cs-pt"); if (!li) return; const i = +li.dataset.i;
      if (e.target.closest("[data-rm]")) { d.points.splice(i, 1); touch(); renderDoc(); }
      else if (e.target.closest("[data-mv]")) { const j = i + +e.target.closest("[data-mv]").dataset.mv; if (j < 0 || j >= d.points.length) return; [d.points[i], d.points[j]] = [d.points[j], d.points[i]]; touch(); renderDoc(); }
      else if (e.target.closest("[data-unsrc]")) { d.points[i].src = ""; d.points[i].link = ""; touch(); renderDoc(); }
    });
    let from = -1;
    pts.addEventListener("dragstart", e => { const li = e.target.closest(".cs-pt"); if (!li || e.target.closest("input,textarea")) { e.preventDefault(); return; } from = +li.dataset.i; li.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; });
    pts.addEventListener("dragover", e => { if (from < 0) return; e.preventDefault(); });
    pts.addEventListener("drop", e => { const li = e.target.closest(".cs-pt"); if (from < 0 || !li) return; e.preventDefault(); const to = +li.dataset.i, [m] = d.points.splice(from, 1); d.points.splice(to, 0, m); from = -1; touch(); renderDoc(); });
    pts.addEventListener("dragend", () => { from = -1; $$(".cs-pt.drag").forEach(x => x.classList.remove("drag")); });
    const ai = $("#csAI"); if (ai) ai.onclick = async () => {
      const s = STORIES.find(x => x.id === storyId); if (!s) { $("#csAIs").textContent = "Pick a story on the left first."; return; }
      ai.disabled = true; $("#csAIs").textContent = "Drafting…";
      try {
        const heads = (s.articles || []).slice(0, 12).map(a => `- ${nameOf(a.outlet)}: ${a.title}`).join("\n");
        const r = await RS.ai().json(`You help an Indian news creator plan a 60–90 second vertical video. Story: "${s.title}".\nFacts reported: ${(s.sum || []).join(" ")}\nHeadlines by outlet:\n${heads}\nWrite 5 short on-screen pointers (max 14 words each) that tell the story and show how different outlets framed it, each with 1–2 sentences of talking notes. Use only facts above; never invent. Reply with only JSON: {"hook":"","points":[{"line":"","note":""}]}`, { modelTier: "quick", cache: false });
        if (!r || !Array.isArray(r.points)) throw { code: "invalid_json" };
        if (r.hook && !d.hook) d.hook = r.hook;
        r.points.slice(0, 8).forEach(p => d.points.push({ line: String(p.line || ""), note: String(p.note || ""), src: "", link: "" }));
        touch(); renderDoc(); toast("Draft added. Check every line against the sources.");
      } catch (e) { $("#csAIs").textContent = RS.aiErr ? RS.aiErr(e.code) : "That didn’t work."; ai.disabled = false; }
    };
  }

  /* ---------- step 2: record ---------- */
  let rafId = 0, cam = null, camStream = null, rec = null, recording = false, mode = "tap", idx = 0, at = 0, t0 = 0, ac = null;
  const scenes = d => [{ hook: true }, ...d.points.filter(p => p.line.trim()), { outro: true }];
  const clipOf = d => ({ style: d.style, hook: d.hook || d.title, scenes: d.points.filter(p => p.line.trim()).map(p => ({ line: p.line, tag: "", src: p.src })), outro: d.outro, handle: d.handle, dur: d.dur });
  const curT = (d, now) => Math.max(0, mode === "tap" ? idx * d.dur + Math.max(0, Math.min(d.dur * .98, (now - at) / 1000)) : (now - t0) / 1000);
  function loop(now) {
    const v = $("#v-studio"); if (!v || v.hidden || step !== 2) { rafId = 0; if (v && v.hidden && !recording) stopCam(); return; }
    const d = doc(), cv = $("#csCv"); if (!cv) { rafId = 0; return; }
    const cl = clipOf(d), n = scenes(d).length, t = curT(d, now);
    if (mode === "auto") { const i = Math.min(n - 1, Math.floor(t / d.dur)); if (i !== idx) { idx = i; prompter(); } }
    const total = RS.drawClip(cv.getContext("2d"), mode === "auto" && !recording && !cam ? t % (n * d.dur) : Math.min(t, n * d.dur - .01), cam, cl);
    if (mode === "auto" && recording && t >= total && !cam?.uploaded) stopRec();
    rafId = requestAnimationFrame(loop);
  }
  const kick = () => { if (!rafId) rafId = requestAnimationFrame(loop); };
  function setIdx(i) { const n = scenes(doc()).length; idx = Math.max(0, Math.min(n - 1, i)); at = performance.now(); t0 = at - idx * doc().dur * 1000; prompter(); }
  function prompter() {
    const d = doc(), sc = scenes(d), s = sc[idx], nx = sc[idx + 1], box = $("#csPrompt"); if (!box) return;
    const n = sc.length - 2, label = s.hook ? "Opening line" : s.outro ? "Closing line" : `Pointer ${idx} of ${n}`;
    const text = s.hook ? (d.hook || d.title) : s.outro ? d.outro : s.line, pi = s.hook || s.outro ? -1 : d.points.indexOf(s);
    box.innerHTML = `<span class="eyebrow">${label}</span><p class="cs-now">${esc(text)}</p>
      ${pi >= 0 ? `<label class="cs-lab" for="csPNote">Your notes (change them any time)</label><textarea id="csPNote" class="cs-pnote" rows="4" placeholder="What you’ll say here">${esc(s.note)}</textarea>` : ""}
      <p class="cs-upnext">${nx ? `Up next: <b>${esc(nx.hook ? d.hook : nx.outro ? d.outro : nx.line)}</b>` : "That’s the end. Press Stop."}</p>
      <div class="cs-dots">${sc.map((_, k) => `<i class="${k === idx ? "on" : k < idx ? "done" : ""}"></i>`).join("")}</div>`;
    const ta = $("#csPNote"); if (ta) ta.oninput = () => { s.note = ta.value; touch(); };
    $("#csPrev").disabled = idx === 0; $("#csNextP").disabled = idx >= sc.length - 1;
  }
  const pickMime = () => ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
  const msg = t => { const m = $("#csMsg"); if (m) m.textContent = t; };
  function stopCam() { if (camStream) camStream.getTracks().forEach(t => t.stop()); camStream = null; if (cam) { cam.pause(); cam.srcObject = null; } cam = null; try { ac && ac.close(); } catch { } ac = null; }
  async function camOn() {
    if (!navigator.mediaDevices?.getUserMedia) { msg("This browser can’t use the camera here. Upload a video you shot instead."); return; }
    msg("Asking for your camera and microphone…");
    try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { msg(RS.camHelp(e)); return; }
    cam = document.createElement("video"); cam.muted = true; cam.playsInline = true; cam.mirror = true; cam.srcObject = camStream; await cam.play().catch(() => { });
    $("#csCam").hidden = true; $("#csCamOff").hidden = false; msg("You’re on. Press Start, talk through your pointers, and press Next each time you move on."); kick();
  }
  async function startRec() {
    const cv = $("#csCv"); if (!cv.captureStream || !window.MediaRecorder) { msg("This browser can’t record video. Try Chrome or Edge."); return; }
    let audio = [];
    if (cam && cam.uploaded) { try { ac = new AudioContext(); const s = ac.createMediaElementSource(cam), dst = ac.createMediaStreamDestination(); s.connect(dst); s.connect(ac.destination); audio = dst.stream.getAudioTracks(); } catch { } }
    else if (camStream) audio = camStream.getAudioTracks();
    setBusy(true);
    for (const n of [3, 2, 1]) { msg("Recording in " + n + "…"); $("#csCount").textContent = n; $("#csCount").hidden = false; await new Promise(r => setTimeout(r, 1000)); }
    $("#csCount").hidden = true;
    const mime = pickMime(), chunks = [];
    rec = new MediaRecorder(new MediaStream([...cv.captureStream(30).getVideoTracks(), ...audio]), mime ? { mimeType: mime, videoBitsPerSecond: 5e6 } : undefined);
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { recording = false; setBusy(false); done(new Blob(chunks, { type: (rec.mimeType || mime || "video/webm").split(";")[0] })); };
    rec.start(250); recording = true; setIdx(0);
    if (cam && cam.uploaded) { cam.currentTime = 0; await cam.play().catch(() => { }); cam.onended = stopRec; }
    $("#csRec").textContent = "■ Stop";
    msg(mode === "tap" ? "Recording. Press Next (or →, Space) when you move to the next pointer. Press Stop when you finish." : "Recording. Pointers move on their own.");
    kick();
  }
  function stopRec() { if (rec && rec.state === "recording") rec.stop(); $("#csRec").textContent = "● Start recording"; if (cam && cam.uploaded) { cam.pause(); } }
  function setBusy(on) { $$("#csSet input, #csSet button, #csBack, #csCamOff, #csUpl").forEach(b => b.disabled = on); }
  function done(blob) {
    const d = doc(), clips = store.get("clips", []); clips.unshift({ postId: d.postId || "", at: new Date().toLocaleDateString("en-IN"), style: d.style, kind: cam ? "camera" : "clip" }); store.set("clips", clips.slice(0, 50));
    msg("Done. Trim it, then download it or post it."); setIdx(0);
    const p = d.postId && RS.allPosts().find(x => x.id === d.postId && x.mine);
    RS.openVideoEditor(blob, { name: "red-thread-" + (d.title || "video").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40), aspect: "9:16", ...(p ? { useLabel: "📲 Post to Reels with my article", onUse: async b => { if (await RS.attachReel(p, b)) RS.show("reels", p.id); } } : {}) });
  }
  function recordView() {
    const d = doc(), el = $("#csBody");
    el.innerHTML = `<div class="cs-rec">
      <div class="cs-stage"><div class="cs-cvw"><canvas id="csCv" width="720" height="1280" aria-label="Video preview"></canvas><b class="cs-count" id="csCount" hidden></b></div>
        <div class="cs-ctl"><button class="btn" type="button" id="csCam">◉ Turn on camera</button><button class="btn" type="button" id="csCamOff" hidden>Camera off</button>
          <label class="btn" for="csUpl">⇪ Use a video I shot</label><input type="file" id="csUpl" accept="video/*" hidden><button class="btn r" type="button" id="csRec">● Start recording</button></div>
        <p class="mono muted cs-msg" id="csMsg" aria-live="polite"></p></div>
      <div class="cs-side">
        <div class="cs-prompt" id="csPrompt" aria-live="polite"></div>
        <div class="cs-nav"><button class="btn" type="button" id="csPrev">← Back</button><button class="btn y cs-big" type="button" id="csNextP">Next pointer →</button></div>
        <p class="muted cs-tip">Tip: press → or Space, or use a presentation clicker.</p>
        <div class="cs-set" id="csSet">
          <div class="field"><label>Pointers move</label><div class="tabs"><button type="button" data-mode="tap" aria-pressed="${mode === "tap"}">When I press Next</button><button type="button" data-mode="auto" aria-pressed="${mode === "auto"}">On their own</button></div></div>
          <div class="field" data-durw ${mode === "tap" ? "hidden" : ""}><label for="csDur">Seconds per pointer</label><input id="csDur" type="number" min="2" max="15" step=".5" value="${d.dur}"></div>
          <div class="field"><label>Look</label><div class="tabs">${Object.entries(STYLES).map(([k, n]) => `<button type="button" data-st="${k}" aria-pressed="${k === d.style}">${n}</button>`).join("")}</div></div>
          <div class="field"><label for="csHandle">Your handle</label><input id="csHandle" value="${esc(d.handle)}"></div>
        </div>
        <button class="btn" type="button" id="csBack">← Edit my notes</button>
      </div></div>`;
    $("#csCam").onclick = camOn;
    $("#csCamOff").onclick = () => { stopCam(); $("#csCam").hidden = false; $("#csCamOff").hidden = true; msg(""); };
    $("#csUpl").onchange = async e => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return; stopCam();
      const v = document.createElement("video"); v.playsInline = true; v.src = URL.createObjectURL(f); v.preload = "auto";
      try { await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; }); } catch { msg("That video couldn’t be opened. Try an MP4 or WebM."); return; }
      cam = v; cam.mirror = false; cam.uploaded = true; $("#csCam").hidden = true; $("#csCamOff").hidden = false;
      msg("Video loaded. Press Start: it plays with your pointers on top, and you press Next as you reach each one."); kick();
    };
    $("#csRec").onclick = () => recording ? stopRec() : startRec();
    $("#csNextP").onclick = () => setIdx(idx + 1); $("#csPrev").onclick = () => setIdx(idx - 1);
    $$("[data-mode]").forEach(b => b.onclick = () => { mode = b.dataset.mode; $$("[data-mode]").forEach(x => x.setAttribute("aria-pressed", x === b)); $("[data-durw]").hidden = mode === "tap"; setIdx(0); });
    $$("[data-st]").forEach(b => b.onclick = () => { d.style = b.dataset.st; $$("[data-st]").forEach(x => x.setAttribute("aria-pressed", x === b)); touch(); });
    $("#csDur").oninput = e => { d.dur = Math.max(2, Math.min(15, +e.target.value || 4)); touch(); };
    $("#csHandle").oninput = e => { d.handle = e.target.value; touch(); };
    $("#csBack").onclick = () => go(1);
    setIdx(0); kick();
  }
  document.addEventListener("keydown", e => {
    if (step !== 2 || $("#v-studio").hidden || (e.target.closest && e.target.closest("input, textarea, select, [contenteditable=true]")) || document.querySelector(".ved, .rstudio")) return;
    if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); setIdx(idx + 1); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); setIdx(idx - 1); }
  });

  /* ---------- the page ---------- */
  function go(n) {
    if (recording) return;
    step = n; if (n === 1) { stopCam(); cancelAnimationFrame(rafId); rafId = 0; }
    $$("[data-step]").forEach(b => b.setAttribute("aria-current", +b.dataset.step === n ? "step" : "false"));
    if (n === 1) { $("#csBody").innerHTML = `<div class="cs-split"><section class="cs-res" id="csRes" aria-label="Research"></section><section class="cs-doc" id="csDoc" aria-label="Your notes"></section></div>`; research(); renderDoc(); }
    else { persist(); recordView(); }
    window.scrollTo({ top: 0 });
  }
  RS.V.studio = {
    mount(el) {
      el.innerHTML = `<div class="wrap cs"><div class="page-head"><span class="eyebrow">Creator Studio</span><h1>Research it. Note it. Record it.</h1><p>Pull facts and headlines from any story or your Research Board into your notes, then record yourself while your pointers pop up on screen, one press of Next at a time.</p></div>
        <ol class="cs-steps"><li><button type="button" data-step="1">1 · Research &amp; notes</button></li><li><button type="button" data-step="2">2 · Record</button></li></ol>
        <div id="csBody"></div></div>`;
      $$("[data-step]", el).forEach(b => b.onclick = () => { if (+b.dataset.step === 2 && !doc().points.some(p => p.line.trim())) { toast("Add at least one pointer first"); return; } go(+b.dataset.step); });
    },
    // arg: "post:<id>" opens a published article's points straight in Record; "story:<id>" opens research on that story
    show(arg) {
      const [k, id] = String(arg || "").split(/:(.+)/);
      if (k === "post" && id && importPost(id)) return go(2);
      if (k === "story" && id) { storyId = id; tab = "story"; }
      if (!docs.length) newDoc();
      go(step === 2 && doc().points.some(p => p.line.trim()) ? 2 : 1);
    }
  };
})();
