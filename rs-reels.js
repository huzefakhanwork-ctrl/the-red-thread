/* THE RED THREAD — Reels: an Instagram-style vertical feed of videos people post with their articles, each linking to the full story.
   Also: record yourself (camera + teleprompter) and attach a reel to a post. Videos go to the artifact's asset store when available
   (so friends can watch), and a copy stays in this browser (IndexedDB) so your own reels always play. */
(function () {
  const { $, $$, esc, store, toast, show } = RS;
  const HEX = /^[0-9a-f]{32}$/, MAX = 20 * 1024 * 1024;

  /* ---- this browser's copy of your videos ---- */
  const idb = (() => {
    let dbp; const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open("rt-reels", 1); r.onupgradeneeded = () => r.result.createObjectStore("v"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
    return {
      async put(k, b) { try { const d = await open(); await new Promise((res, rej) => { const t = d.transaction("v", "readwrite"); t.objectStore("v").put(b, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; } catch { return false; } },
      async get(k) { try { const d = await open(); return await new Promise(res => { const r = d.transaction("v").objectStore("v").get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); } catch { return null; } }
    };
  })();
  const ASSET_ERR = { too_large: "That video is over 20 MB. Trim it shorter in the editor.", unsupported_type: "Reels take MP4 or WebM video.", quota_or_state: "The site's video storage is full right now.", rate_limited: "Too many uploads at once. Try again in a minute.", upstream_auth: "Sign in to Claude again, then retry.", not_granted: "Video upload wasn't allowed for this page." };

  /* attach a video to one of your posts: upload for friends when possible, always keep a local copy */
  RS.attachReel = async (post, blob) => {
    if (!blob || !post) return false;
    if (blob.size > MAX) { toast("Reels can be up to 20 MB. Trim it shorter in the editor."); return false; }
    const type = /mp4/.test(blob.type) ? "video/mp4" : "video/webm";
    let ref = "local", shared = false;
    await idb.put(post.id, blob);
    const assets = await window.claude?.use?.("assets");
    if (assets && RS._db) {
      toast("Uploading your reel…");
      try { const r = await assets.upload(blob, { type }); ref = r.id; shared = true; }
      catch (e) { toast((ASSET_ERR[e && e.code] || "Couldn't upload the video for friends.") + " It's saved in this browser."); }
    }
    const posts = store.get("posts", []), i = posts.findIndex(x => x.id === post.id);
    post.video = ref; post.videoAt = Date.now();
    if (i >= 0) { posts[i] = { ...posts[i], video: ref, videoAt: post.videoAt }; store.set("posts", posts); }
    if (shared) await RS.publishShared({ ...(i >= 0 ? posts[i] : post) });
    RS.sig && RS.sig("reel");
    toast(shared ? "Reel posted. Friends can watch it in Reels." : "Reel saved. Open the site on claude.ai to share reels with friends.");
    return true;
  };
  async function srcFor(p) {
    if (p.mine) { const b = await idb.get(p.id); if (b) return URL.createObjectURL(b); }
    return HEX.test(p.video || "") ? "/_blob/" + p.video : null;
  }

  /* ---- record yourself: camera + mic, mirrored preview, optional teleprompter of your article ---- */
  RS.recordSelf = ({ script = "", title = "" } = {}) => new Promise(resolve => {
    const ov = document.createElement("div"); ov.className = "rself"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Record yourself");
    ov.innerHTML = `<div class="rself-in">
      <header class="ved-h"><div><span class="eyebrow">Record your reel</span><h2>${esc(title || "Tell the story in your words")}</h2></div><button class="btn sm" type="button" data-x>✕ Close</button></header>
      <div class="rself-stage"><video playsinline muted></video><div class="rself-prompt" data-prompt hidden><div>${esc(script).replace(/\n+/g, "<br><br>")}</div></div><b class="rself-count" data-count></b><span class="rself-rec" data-recdot hidden>● REC <i data-time>0:00</i></span></div>
      <div class="rself-ctl"><button class="btn r" type="button" data-rec disabled>● Start recording</button>${script ? `<label class="chk"><input type="checkbox" data-tp checked> Teleprompter (your article scrolls on screen; it isn't recorded)</label>` : ""}</div>
      <p class="mono muted" data-msg aria-live="polite">Asking for your camera and microphone…</p>
      <div data-upl hidden><label class="btn sm" for="rsUpl">⇪ Upload a video instead</label><input type="file" id="rsUpl" accept="video/mp4,video/webm,video/*" hidden></div></div>`;
    document.body.append(ov); document.documentElement.style.overflow = "hidden";
    const q = s => ov.querySelector(s), v = q("video");
    let stream = null, rec = null, chunks = [], t0 = 0, tick = 0, scrollRaf = 0, done = false;
    const finish = blob => { if (done) return; done = true; cancelAnimationFrame(scrollRaf); clearInterval(tick); if (stream) stream.getTracks().forEach(t => t.stop()); ov.remove(); document.documentElement.style.overflow = ""; resolve(blob || null); };
    q("[data-x]").onclick = () => { if (rec && rec.state === "recording") { rec.onstop = () => finish(null); rec.stop(); } else finish(null); };
    q("#rsUpl").onchange = e => { const f = e.target.files[0]; if (f) finish(f); };
    const tp = () => q("[data-tp]")?.checked;
    (async () => {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { q("[data-msg]").textContent = e && e.name === "NotFoundError" ? "No camera found on this device." : "Camera access is blocked. Allow camera and microphone for this site in your browser, or upload a video you recorded on your phone."; q("[data-upl]").hidden = false; return; }
      v.srcObject = stream; await v.play().catch(() => { });
      q("[data-msg]").textContent = "Frame yourself in the middle. The reel is cropped to 9:16 afterwards, and you can trim it."; q("[data-rec]").disabled = false;
      q("[data-prompt]").hidden = !tp(); if (q("[data-tp]")) q("[data-tp]").onchange = () => { q("[data-prompt]").hidden = !tp(); };
    })();
    q("[data-rec]").onclick = async () => {
      const b = q("[data-rec]");
      if (rec && rec.state === "recording") { rec.stop(); return; }
      b.disabled = true;
      for (const n of [3, 2, 1]) { q("[data-count]").textContent = n; await new Promise(r => setTimeout(r, 900)); }
      q("[data-count]").textContent = "";
      const mime = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "";
      chunks = []; rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 3.5e6 } : undefined);
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => finish(new Blob(chunks, { type: (rec.mimeType || mime || "video/webm").split(";")[0] }));
      rec.start(250); t0 = performance.now(); b.disabled = false; b.textContent = "■ Stop recording"; q("[data-recdot]").hidden = false;
      tick = setInterval(() => { const s = Math.floor((performance.now() - t0) / 1000); q("[data-time]").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; if (s >= 90) rec.stop(); }, 250);
      const pr = q("[data-prompt]"); pr.scrollTop = 0; let last = performance.now();
      const roll = now => { if (!tp()) { last = now; } else { pr.scrollTop += (now - last) / 1000 * 26; last = now; } scrollRaf = requestAnimationFrame(roll); }; scrollRaf = requestAnimationFrame(roll);
      q("[data-msg]").textContent = "Recording (up to 90 seconds). Press Stop when you're done.";
    };
  });

  /* ---- the feed ---- */
  let io = null, active = null, muted = true, canvasRaf = 0;
  const likes = () => new Set(store.get("reelLikes", []));
  function stopAll() { cancelAnimationFrame(canvasRaf); $$("#reelsBox video").forEach(v => v.pause()); }
  function activate(sec) {
    if (active === sec) return; active = sec; stopAll();
    const v = sec.querySelector("video");
    if (v) { v.muted = muted; if (v.src) v.play().catch(() => { }); return; }
    const cv = sec.querySelector("canvas"); if (!cv || !RS.drawClip) return;
    const p = RS.allPosts().find(x => x.id === sec.dataset.id), cl = p && RS.clipFromPost(p); if (!cl) return;
    const ctx = cv.getContext("2d"), t0 = performance.now(), total = RS.drawClip(ctx, 0, null, cl);
    const loop = now => { RS.drawClip(ctx, Math.max(0, (now - t0) / 1000) % total, null, cl); canvasRaf = requestAnimationFrame(loop); };
    canvasRaf = requestAnimationFrame(loop);
  }
  RS.V.reels = {
    mount(el) {
      el.innerHTML = `<div class="reels" id="reelsBox" tabindex="-1"></div><div class="reels-top"><button class="btn y sm" type="button" data-go="write" data-arg="new">+ Create a reel</button><button class="btn sm" type="button" id="reelMute" aria-pressed="true">🔇 Sound off</button></div>`;
      $("#reelMute").onclick = () => { muted = !muted; $("#reelMute").textContent = muted ? "🔇 Sound off" : "🔊 Sound on"; $("#reelMute").setAttribute("aria-pressed", muted); $$("#reelsBox video").forEach(v => v.muted = muted); if (active && !muted) active.querySelector("video")?.play().catch(() => { }); };
      el.addEventListener("click", e => {
        const lk = e.target.closest("[data-like]"); if (lk) { const s = likes(), id = lk.dataset.like; s.has(id) ? s.delete(id) : s.add(id); store.set("reelLikes", [...s]); lk.setAttribute("aria-pressed", s.has(id)); lk.querySelector("b").textContent = s.has(id) ? "Liked" : "Like"; return; }
        const sh = e.target.closest("[data-rshare]"); if (sh) { const link = RS.shareLink(sh.dataset.rshare); navigator.clipboard.writeText(link).then(() => toast("Link to this story copied"), () => toast(link)); return; }
        const fr = e.target.closest(".reel-frame"); if (fr && !e.target.closest("button")) { const v = fr.querySelector("video"); if (v) v.paused ? v.play().catch(() => { }) : v.pause(); }
      });
      el.addEventListener("keydown", e => { if (!["ArrowDown", "ArrowUp"].includes(e.key)) return; e.preventDefault(); const box = $("#reelsBox"); box.scrollBy({ top: (e.key === "ArrowDown" ? 1 : -1) * box.clientHeight, behavior: "smooth" }); });
    },
    async show(arg) {
      const box = $("#reelsBox"); stopAll(); active = null; if (io) io.disconnect();
      const posts = RS.allPosts();
      let list = [...posts.filter(p => p.video).sort((a, b) => (b.videoAt || 0) - (a.videoAt || 0)), ...posts.filter(p => !p.video && !p.mine && p.pub !== "friend")];
      if (arg) { const i = list.findIndex(p => p.id === arg); if (i > 0) list.unshift(list.splice(i, 1)[0]); }
      const L = likes();
      box.innerHTML = list.length ? list.map(p => { const pub = RS.pubOf(p), real = !!p.video;
        return `<section class="reel${real ? " baked" : ""}" data-id="${esc(p.id)}"><div class="reel-frame">${real ? `<video playsinline loop preload="metadata" muted></video><div class="reel-miss" hidden>This video isn't available to you here.</div>` : `<canvas width="720" height="1280" aria-label="Animated news clip"></canvas>`}</div>
          <div class="reel-over"><div class="reel-by">${RS.logo({ name: pub.name, c: pub.color || "#2DD4BF" })}<b>${esc(pub.name)}</b>${real ? "" : `<span class="reel-tag">Sample clip</span>`}${p.mine ? `<span class="reel-tag">You</span>` : ""}</div>
            <h3>${esc(p.title)}</h3>${p.dek ? `<p>${esc(p.dek)}</p>` : ""}
            <button class="btn y reel-read" type="button" data-go="post" data-arg="${esc(p.id)}">Read the full article →</button></div>
          <div class="reel-rail"><button type="button" data-like="${esc(p.id)}" aria-pressed="${L.has(p.id)}"><span>♥</span><b>${L.has(p.id) ? "Liked" : "Like"}</b></button><button type="button" data-go="post" data-arg="${esc(p.id)}"><span>💬</span><b>Discuss</b></button><button type="button" data-rshare="${esc(p.id)}"><span>↗</span><b>Share</b></button></div></section>`; }).join("")
        : `<div class="empty" style="margin:40px auto;max-width:420px">No reels yet. Publish an article with a video and it shows up here.</div>`;
      // load sources, then play whichever reel is on screen
      for (const sec of $$(".reel", box)) {
        const v = sec.querySelector("video"); if (!v) continue;
        const p = list.find(x => x.id === sec.dataset.id), src = await srcFor(p);
        if (!src) { sec.querySelector(".reel-miss").hidden = false; continue; }
        v.src = src; v.muted = muted; v.onerror = () => { sec.querySelector(".reel-miss").hidden = false; };
      }
      io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.intersectionRatio > .6) activate(e.target); }), { root: box, threshold: [.6] });
      $$(".reel", box).forEach(s => io.observe(s));
      box.scrollTop = 0; const first = $(".reel", box); if (first) activate(first);
      box.focus({ preventScroll: true });
    }
  };
  // leaving Reels pauses everything (called from the page router)
  RS.reelsLeave = () => { stopAll(); active = null; };
})();
