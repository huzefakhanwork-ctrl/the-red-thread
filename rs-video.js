/* THE RED THREAD — video editor: a timeline with trim handles, crop (aspect, zoom, position), mute, then export and download.
   RS.openVideoEditor(blob, { name }) opens it full screen over any page. Everything runs in the browser; nothing is uploaded. */
(function () {
  const { $, esc, toast } = RS;
  const ASPECTS = [["orig", "Original"], ["9:16", "9:16 Reel"], ["4:5", "4:5 Post"], ["1:1", "1:1 Square"], ["16:9", "16:9 YouTube"]];
  const fmt = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, "0")}`; };
  const pickMime = () => ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
  const once = (el, ev) => new Promise(r => el.addEventListener(ev, r, { once: true }));
  // MediaRecorder WebM files carry no duration; seeking far ahead makes the browser work it out.
  async function ensureDuration(v) {
    if (v.readyState < 1) await once(v, "loadedmetadata");
    if (isFinite(v.duration) && v.duration > 0) return v.duration;
    v.currentTime = 1e101; await Promise.race([once(v, "durationchange"), new Promise(r => setTimeout(r, 1500))]);
    const d = isFinite(v.duration) ? v.duration : 0; v.currentTime = 0; await Promise.race([once(v, "seeked"), new Promise(r => setTimeout(r, 400))]);
    return d;
  }
  async function saveBlob(blob, filename) {
    const dl = await window.claude?.use?.("downloads");
    if (dl) { try { await dl.save({ filename, data: blob }); toast("Video saved"); } catch (e) { toast(e.code === "declined" ? "Save cancelled" : e.code === "rejected_extension" ? "This video format can't be saved here." : "Couldn't save the video. Try again."); } return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.append(a); a.click(); a.remove(); toast("Download started");
  }
  RS.saveBlob = saveBlob;

  RS.openVideoEditor = async (blob, opt = {}) => {
    const name = (opt.name || "red-thread-video").replace(/[^\w-]+/g, "-");
    const srcUrl = URL.createObjectURL(blob), ext0 = (blob.type || "").includes("mp4") ? "mp4" : "webm";
    const ov = document.createElement("div"); ov.className = "ved"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Video editor");
    ov.innerHTML = `<div class="ved-in">
      <header class="ved-h"><div><span class="eyebrow">Video editor</span><h2>Trim, crop, download</h2></div><button class="btn sm" type="button" data-x>✕ Close</button></header>
      <div class="ved-body">
        <div class="ved-stage"><canvas class="ved-cv" width="720" height="1280" aria-label="Edited preview"></canvas>
          <div class="ved-ctl"><button class="btn sm y" type="button" data-play>▶ Play</button><span class="mono ved-time">0:00.0 / 0:00.0</span></div></div>
        <aside class="ved-side">
          <div class="field"><label>Crop to</label><div class="ved-asp">${ASPECTS.map(([k, l]) => `<button type="button" data-asp="${k}" aria-pressed="${k === (opt.aspect || "orig")}">${l}</button>`).join("")}</div></div>
          <div class="field"><label for="vZoom">Zoom <span class="mono" data-zv>1.00×</span></label><input id="vZoom" type="range" min="1" max="2.5" step=".01" value="1"></div>
          <div class="field"><label for="vX">Move left / right</label><input id="vX" type="range" min="-1" max="1" step=".01" value="0"></div>
          <div class="field"><label for="vY">Move up / down</label><input id="vY" type="range" min="-1" max="1" step=".01" value="0"></div>
          <label class="chk"><input type="checkbox" data-mute> Remove sound</label>
          <div class="ved-acts"><button class="btn y" type="button" data-export>⬇ Export &amp; download</button><button class="btn sm" type="button" data-orig>Download original</button></div>
          <p class="mono muted ved-msg" aria-live="polite"></p>
        </aside>
      </div>
      <div class="ved-tl"><div class="ved-strip"></div><div class="ved-sel"><i class="ved-hd" data-h="a" role="slider" tabindex="0" aria-label="Trim start"></i><i class="ved-hd" data-h="b" role="slider" tabindex="0" aria-label="Trim end"></i></div><div class="ved-ph"></div></div>
      <div class="ved-tlinfo mono muted"><span data-ta>Start 0:00.0</span><span>Drag the handles to trim · click the strip to jump</span><span data-tb>End 0:00.0</span></div>
    </div>`;
    document.body.append(ov); document.documentElement.style.overflow = "hidden";
    const q = s => ov.querySelector(s), cv = q(".ved-cv"), ctx = cv.getContext("2d");
    const v = document.createElement("video"); v.src = srcUrl; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous";
    const st = { a: 0, b: 0, dur: 0, asp: opt.aspect || "orig", zoom: 1, x: 0, y: 0, mute: false, exporting: false };
    let raf = 0, ac = null, aDest = null, aGain = null;
    function audio() { // one WebAudio graph per element: preview to the speakers, export to a recordable stream
      if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); const s = ac.createMediaElementSource(v); aGain = ac.createGain(); aDest = ac.createMediaStreamDestination(); s.connect(aGain); aGain.connect(ac.destination); aGain.connect(aDest); } catch { ac = null; }
    }
    const outSize = () => {
      const vw = v.videoWidth || 720, vh = v.videoHeight || 1280;
      if (st.asp === "orig") { const s = Math.min(1, 1280 / Math.max(vw, vh)); return [Math.round(vw * s / 2) * 2, Math.round(vh * s / 2) * 2]; }
      const [aw, ah] = st.asp.split(":").map(Number), long = 1280; return aw >= ah ? [long, Math.round(long * ah / aw / 2) * 2] : [Math.round(long * aw / ah / 2) * 2, long];
    };
    function draw(c, cx) {
      const vw = v.videoWidth, vh = v.videoHeight; if (!vw) return;
      const W = c.width, H = c.height, s = Math.max(W / vw, H / vh) * st.zoom, dw = vw * s, dh = vh * s;
      const x = (W - dw) / 2 + st.x * (dw - W) / 2, y = (H - dh) / 2 + st.y * (dh - H) / 2;
      cx.fillStyle = "#000"; cx.fillRect(0, 0, W, H); cx.drawImage(v, x, y, dw, dh);
    }
    function sizeStage() { const [w, h] = outSize(); cv.width = w; cv.height = h; draw(cv, ctx); }
    function ui() {
      const pct = t => st.dur ? t / st.dur * 100 : 0;
      q(".ved-sel").style.left = pct(st.a) + "%"; q(".ved-sel").style.width = (pct(st.b) - pct(st.a)) + "%";
      q(".ved-ph").style.left = pct(v.currentTime) + "%";
      q("[data-ta]").textContent = "Start " + fmt(st.a); q("[data-tb]").textContent = "End " + fmt(st.b);
      q(".ved-time").textContent = `${fmt(v.currentTime - st.a)} / ${fmt(st.b - st.a)}`;
      q("[data-zv]").textContent = st.zoom.toFixed(2) + "×";
      ov.querySelectorAll("[data-asp]").forEach(b => b.setAttribute("aria-pressed", b.dataset.asp === st.asp));
    }
    const loop = () => { draw(cv, ctx); if (!v.paused && v.currentTime >= st.b - .03 && !st.exporting) { v.pause(); v.currentTime = st.a; q("[data-play]").textContent = "▶ Play"; } ui(); raf = requestAnimationFrame(loop); };
    const close = () => { if (st.exporting) return; cancelAnimationFrame(raf); v.pause(); try { ac && ac.close(); } catch { } URL.revokeObjectURL(srcUrl); ov.remove(); document.documentElement.style.overflow = ""; document.removeEventListener("keydown", onKey); };
    const onKey = e => { if (e.key === "Escape") close(); else if (e.key === " " && e.target === document.body) { e.preventDefault(); q("[data-play]").click(); } };
    document.addEventListener("keydown", onKey);
    q("[data-x]").onclick = close;
    q(".ved-msg").textContent = "Loading video…";
    st.dur = await ensureDuration(v) || opt.duration || 0; st.b = st.dur;
    q(".ved-msg").textContent = ""; sizeStage(); raf = requestAnimationFrame(loop);
    // thumbnails along the timeline, from a second copy of the video so the preview isn't disturbed
    (async () => {
      const tv = document.createElement("video"); tv.src = srcUrl; tv.muted = true; tv.preload = "auto"; await ensureDuration(tv);
      const N = Math.max(6, Math.min(14, Math.round(q(".ved-strip").clientWidth / 90))), strip = q(".ved-strip");
      for (let i = 0; i < N && ov.isConnected; i++) {
        tv.currentTime = Math.min(st.dur - .05, (i + .5) / N * st.dur); await Promise.race([once(tv, "seeked"), new Promise(r => setTimeout(r, 900))]);
        const c = document.createElement("canvas"); c.width = 96; c.height = 96; const cc = c.getContext("2d"); const s = Math.max(96 / tv.videoWidth, 96 / tv.videoHeight);
        cc.drawImage(tv, (96 - tv.videoWidth * s) / 2, (96 - tv.videoHeight * s) / 2, tv.videoWidth * s, tv.videoHeight * s); strip.append(c);
      }
    })();
    q("[data-play]").onclick = async () => {
      audio(); if (ac && ac.state === "suspended") await ac.resume();
      if (v.paused) { if (v.currentTime < st.a || v.currentTime >= st.b - .05) v.currentTime = st.a; await v.play().catch(() => { }); q("[data-play]").textContent = "❚❚ Pause"; }
      else { v.pause(); q("[data-play]").textContent = "▶ Play"; }
    };
    ov.querySelectorAll("[data-asp]").forEach(b => b.onclick = () => { st.asp = b.dataset.asp; sizeStage(); });
    q("#vZoom").oninput = e => { st.zoom = +e.target.value; }; q("#vX").oninput = e => { st.x = +e.target.value; }; q("#vY").oninput = e => { st.y = +e.target.value; };
    q("[data-mute]").onchange = e => { st.mute = e.target.checked; v.muted = st.mute; };
    // trim handles + click-to-seek
    const tl = q(".ved-tl"), tAt = cx => { const r = tl.getBoundingClientRect(); return Math.max(0, Math.min(1, (cx - r.left) / r.width)) * st.dur; };
    let drag = null;
    tl.addEventListener("pointerdown", e => {
      const h = e.target.closest(".ved-hd"); if (h) { drag = h.dataset.h; tl.setPointerCapture(e.pointerId); return; }
      const t = tAt(e.clientX); v.currentTime = Math.max(st.a, Math.min(st.b, t));
    });
    tl.addEventListener("pointermove", e => { if (!drag) return; const t = tAt(e.clientX); if (drag === "a") st.a = Math.min(t, st.b - .5); else st.b = Math.max(t, st.a + .5); v.currentTime = drag === "a" ? st.a : Math.max(st.a, st.b - .1); });
    tl.addEventListener("pointerup", () => { drag = null; });
    ov.querySelectorAll(".ved-hd").forEach(h => h.addEventListener("keydown", e => { const d = e.key === "ArrowLeft" ? -.1 : e.key === "ArrowRight" ? .1 : 0; if (!d) return; e.preventDefault(); if (h.dataset.h === "a") st.a = Math.max(0, Math.min(st.b - .5, st.a + d)); else st.b = Math.min(st.dur, Math.max(st.a + .5, st.b + d)); }));
    q("[data-orig]").onclick = () => saveBlob(blob, `${name}-original.${ext0}`);
    q("[data-export]").onclick = async () => { const r = await doExport(); if (r) saveBlob(r.blob, `${name}-${st.asp.replace(":", "x")}.${r.ext}`); };
    if (opt.onUse) {
      const b = document.createElement("button"); b.className = "btn y"; b.type = "button"; b.textContent = opt.useLabel || "Use this video"; q(".ved-acts").prepend(b);
      q("[data-export]").className = "btn";
      b.onclick = async () => { const untouched = st.a < .05 && st.b > st.dur - .05 && st.asp === "orig" && /^video\/(mp4|webm)/.test(blob.type) && st.zoom === 1 && !st.x && !st.y && !st.mute;
        const r = untouched ? { blob, ext: ext0 } : await doExport(); if (!r) return;
        if (r.blob.size > 20 * 1024 * 1024) { q(".ved-msg").textContent = `That's ${(r.blob.size / 1048576).toFixed(1)} MB; reels can be up to 20 MB. Trim it shorter and try again.`; return; }
        st.exporting = false; close(); opt.onUse(r.blob); };
    }
    async function doExport() {
      if (!cv.captureStream || !window.MediaRecorder) { q(".ved-msg").textContent = "This browser can't export video. Try Chrome or Edge on a computer."; return null; }
      if (st.b - st.a < .5) { q(".ved-msg").textContent = "Keep at least half a second."; return null; }
      audio(); if (ac && ac.state === "suspended") await ac.resume();
      st.exporting = true; v.pause(); ov.classList.add("busy");
      const out = document.createElement("canvas"); [out.width, out.height] = outSize(); const oc = out.getContext("2d");
      const mime = pickMime(), tracks = [...out.captureStream(30).getVideoTracks(), ...(!st.mute && aDest ? aDest.stream.getAudioTracks() : [])];
      const rec = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : undefined), chunks = [];
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      const done = new Promise(r => rec.onstop = r);
      if (aGain) aGain.disconnect(ac.destination); // export silently
      v.currentTime = st.a; await Promise.race([once(v, "seeked"), new Promise(r => setTimeout(r, 800))]);
      rec.start(250); await v.play().catch(() => { });
      // draw on every decoded frame (requestVideoFrameCallback), with a timer as backup, so the export keeps every frame
      await new Promise(res => { let fin = false; const step = () => { if (fin) return; draw(out, oc); const p = (v.currentTime - st.a) / (st.b - st.a); q(".ved-msg").textContent = `Exporting… ${Math.min(99, Math.round(p * 100))}%`; if (v.currentTime >= st.b || v.ended || v.paused) { fin = true; return res(); } if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(step); }; if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(step); const tick = () => { if (fin) return; step(); setTimeout(tick, 1000 / 30); }; tick(); });
      v.pause(); rec.stop(); await done; if (aGain) aGain.connect(ac.destination);
      st.exporting = false; ov.classList.remove("busy");
      const type = rec.mimeType || mime || "video/webm", ext = type.includes("mp4") ? "mp4" : "webm", outBlob = new Blob(chunks, { type });
      ov.dataset.outSize = outBlob.size; q(".ved-msg").textContent = `Exported ${(outBlob.size / 1e6).toFixed(1)} MB ${ext.toUpperCase()} · ${fmt(st.b - st.a)}`;
      v.currentTime = st.a; return { blob: outBlob, ext };
    }
  };
})();
