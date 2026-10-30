/* THE RED THREAD — motion layer: intro video, satellite home, today's map, thread page transitions, Dhaga dock. Runs before RS.boot(). */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = RS.esc;
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasG = !!window.gsap && !!window.ScrollTrigger;
  if (hasG) gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;

  /* ---------- intro: full-screen video → split along the red seam → thread knot → the map ---------- */
  const SPLIT_AT = 37.2; // the red thread lies straight across the middle, logo settled
  const iv = $("#introVideo"), introEl = $("#intro");
  let introDone = false, outro = null, focusId = null;
  root.classList.add("intro"); root.style.overflow = "hidden";
  const unlock = () => { root.classList.remove("intro"); if (!focusId) root.style.overflow = ""; setTimeout(() => hideUnderBars(), 600); };
  function snapshotHalves() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    const vw = iv.videoWidth || 1920, vh = iv.videoHeight || 1080, sc = Math.max(w / vw, h / vh), dw = vw * sc, dh = vh * sc, dx = (w - dw) / 2, dy = (h - dh) / 2;
    [["#halfTop", 0], ["#halfBot", h / 2]].forEach(([sel, oy]) => {
      const c = $(sel); c.width = w * dpr; c.height = h / 2 * dpr; const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.fillStyle = "#000"; x.fillRect(0, 0, w, h / 2);
      try { x.drawImage(iv, dx, dy - oy, dw, dh); } catch {}
    });
  }
  const kv = $("#knot"), kx = kv.getContext("2d"), KN = 520, KW = kv.width, KC = KW / 2, kPts = [], lPts = [];
  for (let i = 0; i < KN; i++) { const t = i / (KN - 1) * Math.PI * 2; kPts.push([KC + (Math.sin(t) + 2 * Math.sin(2 * t)) * 120, KC + (Math.cos(t) - 2 * Math.cos(2 * t)) * 120]); lPts.push([KC - 520 + 1040 * i / (KN - 1), KC]); }
  const kease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function drawKnot(draw, un) {
    kx.clearRect(0, 0, KW, KW); const n = Math.max(2, Math.floor(KN * draw)); kx.beginPath();
    for (let i = 0; i < n; i++) { const l = kease(Math.min(1, Math.max(0, un * 1.5 - (1 - i / KN) * .5))); const x = kPts[i][0] + (lPts[i][0] - kPts[i][0]) * l, y = kPts[i][1] + (lPts[i][1] - kPts[i][1]) * l; i ? kx.lineTo(x, y) : kx.moveTo(x, y); }
    kx.strokeStyle = "#FB7185"; kx.lineWidth = 7; kx.lineCap = "round"; kx.lineJoin = "round"; kx.shadowColor = "rgba(251,113,133,.7)"; kx.shadowBlur = 22; kx.stroke();
  }
  function endIntro() {
    if (introDone) return; introDone = true;
    try { iv.pause(); } catch {}
    if (!hasG || RM) { unlock(); introEl.remove(); return; }
    snapshotHalves(); $("#halves").hidden = false; $("#iknot").hidden = false; iv.style.visibility = "hidden"; introEl.style.background = "transparent"; $("#soundBtn").hidden = true;
    const ks = { d: 0, u: 0 }, dk = () => drawKnot(ks.d, ks.u); dk();
    gsap.set("#mstage", { scale: 1.18, transformOrigin: "50% 50%" });
    outro = gsap.timeline({ onComplete: () => { introEl.remove(); gsap.set("#mstage", { clearProps: "transform" }); ScrollTrigger.refresh(); } })
      .to(".ibar", { opacity: 0, duration: .25 }, 0)
      .fromTo("#seam", { scaleX: 0 }, { scaleX: 1, duration: .35, ease: "power2.out" }, 0)
      .to("#halfTop", { yPercent: -100, duration: 1.1, ease: "power4.inOut" }, .3)
      .to("#halfBot", { yPercent: 100, duration: 1.1, ease: "power4.inOut" }, .3)
      .to("#seam", { opacity: 0, scaleY: 6, duration: .4 }, .35)
      .from("#knotLbl", { opacity: 0, y: 12, duration: .5 }, .8)
      .to(ks, { d: 1, duration: 1.4, ease: "power1.inOut", onUpdate: dk }, .7)
      .to(ks, { u: 1, duration: 1.1, ease: "power2.inOut", onUpdate: dk }, 2.2)
      .to("#introUi, #knotLbl", { opacity: 0, duration: .3 }, 3.2)
      .to("#knot", { scaleX: 2.4, opacity: 0, duration: .45, ease: "power2.in" }, 3.35)
      .call(unlock, null, 3.55)
      .to("#iknot", { opacity: 0, duration: .6 }, 3.55)
      .to("#mstage", { scale: 1, duration: 1.4, ease: "power3.out" }, 3.55)
      .from("#headline > *", { y: 40, opacity: 0, stagger: .12, duration: .9, ease: "power3.out" }, 3.9);
  }
  // only the home page gets the intro; a deep link (#story-…, #chat) skips it
  let seenIntro = false; try { seenIntro = localStorage.getItem("rtIntroSeen") === "1"; localStorage.setItem("rtIntroSeen", "1"); } catch {}
  if ((location.hash || "").length > 1 || seenIntro) { introDone = true; unlock(); introEl.remove(); }
  else {
    iv.addEventListener("timeupdate", () => {
      if (iv.duration && $("#ibar")) $("#ibar").style.width = Math.min(100, iv.currentTime / SPLIT_AT * 100) + "%";
      if (iv.currentTime >= SPLIT_AT) endIntro();
    });
    iv.addEventListener("ended", endIntro);
    iv.addEventListener("error", endIntro);
    $("#skipBtn").onclick = () => { if (!introDone) endIntro(); if (outro) outro.progress(1); };
    $("#soundBtn").onclick = e => { iv.muted = !iv.muted; e.currentTarget.setAttribute("aria-pressed", !iv.muted); e.currentTarget.textContent = iv.muted ? "SOUND ON" : "SOUND OFF"; if (iv.paused && !introDone) iv.play().catch(() => {}); };
    if (RM) endIntro();
    else iv.play().catch(() => { $("#soundBtn").textContent = "PLAY INTRO"; });
    setTimeout(() => { if (!introDone && iv.readyState < 2) endIntro(); }, 15000); // never trap anyone behind a stalled video
  }

  /* ---------- geometry: images are equirectangular crops ---------- */
  const IND = { w: 2200, h: 2200, lon0: 66, lon1: 99, lat0: 38, lat1: 5 };
  const DEL = { w: 2000, h: 1314, lon0: 77.150, lon1: 77.290, lat0: 28.672, lat1: 28.580 };
  const toPx = (g, lat, lon) => [(lon - g.lon0) / (g.lon1 - g.lon0) * g.w, (g.lat0 - lat) / (g.lat0 - g.lat1) * g.h];
  /* the five stories the scroll walks through, with their headline numbers */
  const FEAT = [
    { id: "floods", k: "Assam · Floods", t: "60,000 displaced across four districts", num: "2.8%", unit: "PRIME TIME", rows: [["Relief camps", "312"], ["Villages cut off", "140"]] },
    { id: "sand", k: "Bihar · Sand mining", t: "Three villages report dry wells", num: "6/48", unit: "OUTLETS", rows: [["Blindspot", "Right"], ["Groundwater data", "None"]] },
    { id: "riders", k: "Telangana · Gig work", t: "Heat-stroke cases rise among riders", num: "41", unit: "VISITS", rows: [["Peak temperature", "46°C"], ["Official count", "None"]] },
    { id: "eggs", k: "Karnataka · School meals", t: "Egg days cut from six to two", num: "-4", unit: "DAYS", neg: true, rows: [["Announced", "No"], ["Coverage", "7/48"]] },
    { id: "genz", k: "Delhi · Exam leak", t: "Students rally at Jantar Mantar", num: "88", unit: "SOURCES", hot: true, rows: [["Left · Centre · Right", "38 · 40 · 22"], ["Status", "Developing"]] }
  ];
  // live news: the scroll visits every live story on the map, north to south, and ends on the biggest one,
  // where it dives down to a satellite close-up of that place
  const LIVE_ON = STORIES.some(x => x.live);
  const byCover = STORIES.filter(x => x.live && GEO[x.id]).sort((a, b) => b.outletCount - a.outletCount || b.lastSeen - a.lastSeen);
  const CITY = LIVE_ON && window.LIVE && LIVE.city && GEO[LIVE.city.id] ? LIVE.city : null;
  const DS = LIVE_ON ? (CITY ? STORIES.find(x => x.id === CITY.id) : byCover.find(x => /delhi/i.test(x.place))) || null : null;
  if (CITY) Object.assign(DEL, { w: CITY.w, h: CITY.h, lon0: CITY.lon0, lon1: CITY.lon1, lat0: CITY.lat0, lat1: CITY.lat1 });
  const featOf = x => { const p = RS.share(x); return { id: x.id, k: x.place + " · " + x.cat, t: x.title.length > 92 ? x.title.slice(0, 89) + "…" : x.title, num: String(x.outletCount), unit: x.outletCount === 1 ? "OUTLET" : "OUTLETS", rows: [["Left · Centre · Right", x.outletCount < 2 ? "1 outlet so far" : p.l + " · " + p.c + " · " + p.r], ["Latest report", x.time]] }; };
  if (LIVE_ON && byCover.length) FEAT.splice(0, FEAT.length, ...[...byCover.filter(x => x !== DS).sort((a, b) => GEO[b.id][0] - GEO[a.id][0]), ...(DS ? [DS] : [])].map(featOf));
  const FEAT_IDS = LIVE_ON ? [] : FEAT.map(f => f.id);
  const MAP = STORIES.filter(x => GEO[x.id] && (!LIVE_ON || x.live));
  const JM = CITY ? { lat: CITY.lat, lon: CITY.lon } : { lat: 28.6271, lon: 77.2166 };
  const ZOOM_AT = DS && GEO[DS.id] ? GEO[DS.id] : [28.62, 77.21]; // where the final zoom dives in
  if (CITY) {
    $("#delhiBox img").src = CITY.file;
    const ro = $(".readout"); if (ro) { ro.querySelector("b").textContent = CITY.place; }
  }
  let IB = null;

  function layoutBox(el, g, mode) {
    const W = innerWidth, H = innerHeight;
    let s, x, y;
    if (mode === "india") { s = Math.max(H * 1.1 / g.h, W * 1.04 / g.w); const [cx, cy] = toPx(g, 22, 81); x = W * (W > 1000 ? .54 : .5) - cx * s; y = H * .5 - cy * s; x = Math.min(0, Math.max(W - g.w * s, x)); y = Math.min(0, Math.max(H - g.h * s, y)); }
    else { s = Math.max(W / g.w, H / g.h) * 1.05; const [jx, jy] = toPx(g, JM.lat, JM.lon); x = W * .5 - jx * s; y = H * .55 - jy * s; }
    el.style.width = g.w * s + "px"; el.style.height = g.h * s + "px"; el.style.left = x + "px"; el.style.top = y + "px";
    return { s, x, y };
  }
  // pins under the top bar or the dock stay hidden until the scroll slides them into view
  function hideUnderBars() {
    const pins = $$("#iPins .pin");
    if (focusId || !IB || root.classList.contains("intro") || prog > TOUR_P) { pins.forEach(p => p.classList.remove("offv")); return; }
    const top = $(".top").getBoundingClientRect().bottom + 6, bot = $(".dock").getBoundingClientRect().top - 6;
    pins.forEach(p => { const r = p.getBoundingClientRect(), y = r.top + r.height / 2; p.classList.toggle("offv", y < top || y > bot); });
  }
  // the walk through the stories: T0 + i*TU is story i; D is how much longer than the old five-story walk it is
  const TU = .045, T0 = .06; let PAN = [], SC = [], D = 0, TOT = 1, TOUR_P = .3;
  function tourPlan() {
    const n = FEAT.length; D = Math.max(0, T0 + n * TU + .01 - .3); TOT = 1 + D; TOUR_P = (.3 + D) / TOT;
    const H = innerHeight, h = IND.h * IB.s, cy = IB.y + h / 2;
    const top = $(".top").getBoundingClientRect().bottom + 70, bot = $(".dock").getBoundingClientRect().top - 70;
    let pan = 0;
    SC = FEAT.map((f, i) => 1 + .08 * (T0 + i * TU) / (.3 + D));
    PAN = FEAT.map((f, i) => {
      const sc = SC[i], [, py] = toPx(IND, GEO[f.id][0], GEO[f.id][1]), y0 = cy + (IB.y + py * IB.s - cy) * sc;
      if (i === n - 1 && DS) pan = H * .5 - y0; // the last (biggest) story is centred before the dive
      else if (y0 + pan < top) pan = top - y0; else if (y0 + pan > bot) pan = bot - y0;
      return pan = Math.max(H - (cy + h / 2 * sc), Math.min(-(cy - h / 2 * sc), pan));
    });
  }
  function placePins() {
    $("#iPins").innerHTML = MAP.map(st => {
      const [lat, lon, nm] = GEO[st.id], [px, py] = toPx(IND, lat, lon), f = FEAT_IDS.includes(st.id);
      return `<span class="pin${f ? " feat" : ""}${st.id === (DS ? DS.id : "genz") ? " hot" : ""}" role="button" tabindex="0" data-id="${st.id}" aria-label="${esc(nm + ": " + st.title)}" style="left:${px / IND.w * 100}%;top:${py / IND.h * 100}%"><span class="mnm">${esc(nm)}</span></span>`;
    }).join("");
    const [jx, jy] = toPx(DEL, JM.lat, JM.lon);
    const rg = $("#rings"); rg.style.left = jx / DEL.w * 100 + "%"; rg.style.top = jy / DEL.h * 100 + "%";
    $("#dPins").innerHTML = `<span class="pin hot" style="left:${jx / DEL.w * 100}%;top:${jy / DEL.h * 100}%"><span class="mnm">${DS ? esc(DS.place.toUpperCase()) + " · LIVE" : "JANTAR MANTAR"}</span></span>`;
    $("#todayN").textContent = MAP.length;
    $("#todayList").innerHTML = MAP.map(st => `<button type="button" data-focus="${st.id}"><span>${esc(GEO[st.id][2].split(" · ")[0])} · ${esc(st.cat)}</span><b>${esc(st.title)}</b></button>`).join("");
  }
  // the Delhi zoom scene for a live story: what it is, how it's covered, what's reported, the latest report, and what to do next
  function cityCards(x) {
    const p = RS.share(x), LO = window.LIVE_OUTLETS || {}, latest = (x.articles || []).slice().sort((a, b) => b.time - a.time)[0];
    const short = t => esc(t.length > 120 ? t.slice(0, 117) + "…" : t);
    return `<div class="card" data-city="1" style="left:max(16px, 5vw);top:22vh"><span class="lbl">${esc(x.place)} · ${esc(x.cat)} · live</span><h3>${short(x.title)}</h3><span class="mnum">${x.outletCount}<small>${x.outletCount === 1 ? "OUTLET" : "OUTLETS"} COVERING IT</small></span></div>` +
      `<div class="card" data-city="2" style="right:max(16px, 5vw);top:38vh"><span class="lbl">Coverage · ${p.total} articles</span><h3>How each side covers it</h3><div class="bar"><i style="flex:${p.l || .001};background:var(--rose)"></i><i style="flex:${p.c || .001};background:rgba(255,255,255,.35)"></i><i style="flex:${p.r || .001};background:var(--teal-3)"></i></div><div class="mrow"><span>Left</span><b>${p.l}%</b></div><div class="mrow"><span>Centre</span><b>${p.c}%</b></div><div class="mrow"><span>Right</span><b>${p.r}%</b></div></div>` +
      `<div class="card" data-city="3" style="left:max(16px, 6vw);top:30vh"><span class="lbl">What's being reported</span>${x.sum.slice(0, 3).map(t => `<div class="mrow" style="display:block;font-weight:600;line-height:1.35">${short(t)}</div>`).join("")}</div>` +
      `<div class="card" data-city="4" style="right:max(16px, 6vw);top:20vh"><span class="lbl">Latest report</span><h3>${esc(latest ? ((LO[latest.outlet] || {}).name || latest.outlet) : "")}</h3><span class="mnum">${esc(x.time)}</span><div class="mrow"><span>Left/right labels</span><b>Provisional</b></div></div>` +
      `<div class="card" data-city="5" style="left:calc(50% - min(210px, 50vw - 16px));bottom:120px;width:min(420px, calc(100vw - 32px))"><span class="lbl">Pull this thread</span><h3>Investigate it yourself</h3><div class="macts"><button class="mbtn mt" type="button" data-go="story" data-arg="${x.id}">READ ALL SIDES</button><button class="mbtn mg" type="button" data-go="investigate" data-arg="${x.id}|map">OPEN MIND MAP</button><button class="mbtn mg" type="button" data-go="board">WHITEBOARD</button></div></div>`;
  }
  function fitCards() {
    const lo = $(".top").getBoundingClientRect().bottom + 12, hi = $(".dock").getBoundingClientRect().top - 16;
    $$("#cards .card[data-pin]").forEach(c => { if (!c.offsetHeight || hi < 200) return; c.style.top = Math.max(lo, Math.min(hi - c.offsetHeight, parseFloat(c.style.top))) + "px"; });
  }
  function buildCards() {
    const W = innerWidth, H = innerHeight; tourPlan();
    $("#cards").innerHTML = FEAT.map((f, i) => {
      const [lat, lon] = GEO[f.id], [px, py] = toPx(IND, lat, lon), w = IND.w * IB.s, h = IND.h * IB.s, cx = IB.x + w / 2, cy = IB.y + h / 2;
      const sx = cx + (IB.x + px * IB.s - cx) * SC[i], sy = cy + (IB.y + py * IB.s - cy) * SC[i] + PAN[i];
      const left = sx > W * .55 ? sx - 330 : sx + 60, top = Math.min(H - 330, Math.max(90, sy - 120));
      return `<div class="card" data-pin="${i}" data-id="${f.id}" style="left:${Math.max(16, Math.min(W - 290, left))}px;top:${top}px"><span class="lbl">${f.k}</span><h3>${f.t}</h3><span class="mnum${f.neg ? " neg" : ""}">${f.num}<small>${f.unit}</small></span>${f.rows.map(r => `<div class="mrow"><span>${r[0]}</span><b class="${r[1] === "None" || r[1] === "No" ? "" : "mt"}">${r[1]}</b></div>`).join("")}<div class="macts"><button class="mbtn mg" type="button" data-focus="${f.id}">ZOOM IN</button></div></div>`;
    }).join("") +
      (DS ? cityCards(DS) : (
      `<div class="card" data-city="1" style="left:max(16px, 5vw);top:22vh"><span class="lbl">Jantar Mantar · Crowd size</span><h3>How many came?</h3><span class="mnum">5,000<small>ORGANISERS</small></span><span class="mnum" style="color:var(--teal-3)">1,200<small style="color:var(--ink-3)">POLICE</small></span><div class="mrow"><span>Status</span><b style="color:var(--amber)">Disputed</b></div></div>` +
      `<div class="card" data-city="2" style="right:max(16px, 5vw);top:38vh"><span class="lbl">Coverage · 88 sources</span><h3>Same protest, three framings</h3><div class="bar"><i style="flex:38;background:var(--rose)"></i><i style="flex:40;background:rgba(255,255,255,.35)"></i><i style="flex:22;background:var(--teal-3)"></i></div><div class="mrow"><span>Left</span><b>38%</b></div><div class="mrow"><span>Centre</span><b>40%</b></div><div class="mrow"><span>Right</span><b>22%</b></div></div>` +
      `<div class="card" data-city="3" style="left:max(16px, 6vw);top:30vh"><span class="lbl">Ground report</span><h3>What's established</h3><div class="mrow"><span>Arrests</span><b class="mt">4</b></div><div class="mrow"><span>Centres breached</span><b class="mt">2</b></div><div class="mrow"><span>Nationwide leak</span><b style="color:var(--amber)">Unverified</b></div></div>` +
      `<div class="card" data-city="4" style="right:max(16px, 6vw);top:20vh"><span class="lbl">Next</span><h3>Court hearing</h3><span class="mnum">4 NOV<small>2026</small></span><div class="mrow"><span>Committee report</span><b>Due in 60 days</b></div></div>` +
      `<div class="card" data-city="5" style="left:calc(50% - min(210px, 50vw - 16px));bottom:120px;width:min(420px, calc(100vw - 32px))"><span class="lbl">Pull this thread</span><h3>Investigate it yourself</h3><div class="macts"><button class="mbtn mt" type="button" data-go="inv" data-arg="genz">OPEN INVESTIGATION</button><button class="mbtn mg" type="button" data-go="board">OPEN WHITEBOARD</button></div></div>`
      ));
  }

  /* ---------- clouds: fractal noise, drifting left to right ---------- */
  function cloudTex(cv, seed, w, h) {
    cv.width = w; cv.height = h; const c = cv.getContext("2d"), img = c.createImageData(w, h);
    let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const G = 64, grid = Array.from({ length: (G + 1) * (G + 1) }, rnd);
    const val = (x, y, f) => { const gx = x * f, gy = y * f, x0 = Math.floor(gx) % G, y0 = Math.floor(gy) % G, tx = gx - Math.floor(gx), ty = gy - Math.floor(gy), sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), g = (a, b) => grid[(b % G) * (G + 1) + (a % G)];
      const a = g(x0, y0), b = g(x0 + 1, y0), cc = g(x0, y0 + 1), d = g(x0 + 1, y0 + 1); return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 0, amp = .5, f = 4 / w; for (let o = 0; o < 5; o++) { v += val(x, y, f) * amp; amp *= .5; f *= 2; }
      const a = Math.max(0, (v - .48) * 3.2), i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.min(255, a * 255 * (1 - Math.abs(y / h - .5) * 1.4));
    }
    c.putImageData(img, 0, 0);
  }
  cloudTex($("#cl1"), 11, 512, 256); cloudTex($("#cl2"), 77, 512, 256); cloudTex($("#st"), 5, 256, 128);
  if (!RM && hasG) { gsap.fromTo("#cl1", { x: "-35%" }, { x: "10%", duration: 70, repeat: -1, ease: "none" }); gsap.fromTo("#cl2", { x: "-20%" }, { x: "15%", duration: 95, repeat: -1, ease: "none" }); }

  /* ---------- connector lines from pins to cards ---------- */
  function drawLinks() {
    const out = [];
    $$("#cards .card[data-pin]").forEach(card => {
      const op = +getComputedStyle(card).opacity; if (op < .05) return;
      const pin = $(`#iPins .pin[data-id="${card.dataset.id}"]`); if (!pin) return;
      const p = pin.getBoundingClientRect(), c = card.getBoundingClientRect();
      const x1 = p.left + p.width / 2, y1 = p.top + p.height / 2, x2 = c.left > x1 ? c.left : c.right, y2 = c.top + 40;
      out.push(`<path d="M${x1} ${y1} L${(x1 + x2) / 2} ${y1} L${(x1 + x2) / 2} ${y2} L${x2} ${y2}" stroke="#2DD4BF" stroke-width="1" fill="none" opacity="${op * .8}"/><circle cx="${x2}" cy="${y2}" r="3" fill="#2DD4BF" opacity="${op}"/>`);
    });
    $("#links").innerHTML = out.join("");
  }

  /* ---------- the scroll camera ---------- */
  const STEP = [[0, "01", "SATELLITE VIEW"], [.38, "02", "CITY VIEW"], [.7, "03", "INVESTIGATION VIEW"]];
  const MARKS = [0, .32, .42, .62, .76, .995];
  let tl = null, prog = 0;
  function setupDive() {
    if (tl) { tl.revert(); tl = null; }
    IB = layoutBox($("#indiaBox"), IND, "india"); layoutBox($("#delhiBox"), DEL, "delhi");
    placePins(); buildCards(); fitCards(); drawLinks(); requestAnimationFrame(() => { hideUnderBars(); drawLinks(); });
    $("#dive").style.height = Math.round(620 * TOT * 1.15) + "vh"; // more stories, a longer scroll
    if (!hasG || RM) { $("#imgNight").style.opacity = 1; $$("#cards .card[data-city]").forEach(c => c.style.display = "none"); drawLinks(); return; }
    const [jx, jy] = toPx(IND, ZOOM_AT[0], ZOOM_AT[1]), oIndia = `${jx / IND.w * 100}% ${jy / IND.h * 100}%`;
    const [dx, dy] = toPx(DEL, JM.lat, JM.lon), oDelhi = `${dx / DEL.w * 100}% ${dy / DEL.h * 100}%`;
    gsap.set("#cards .card", { autoAlpha: 0, y: 30 }); gsap.set("#dPins .pin", { scale: 0 });
    const main = gsap.timeline({ defaults: { ease: "power2.out" } });
    main.to("#indiaBox", { scale: 1.08, duration: .3 + D, ease: "none", transformOrigin: "50% 50%" }, 0)
      .to("#imgNight", { opacity: 1, duration: .07, ease: "none" }, .02)
      .to("#headline", { opacity: 0, y: -50, duration: .05 }, .05)
      .to("#today", { opacity: 0, duration: .03 }, .27 + D);
    FEAT.forEach((f, i) => {
      const at = T0 + i * TU;
      main.to("#indiaBox", { y: PAN[i], duration: TU * .7, ease: "power2.inOut" }, Math.max(0, at - TU * .5));
      main.fromTo(`#iPins .pin[data-id="${f.id}"]`, { scale: 1 }, { scale: 1.9, duration: .012, yoyo: true, repeat: 1, ease: "power2.out" }, at)
        .to(`#cards .card[data-pin="${i}"]`, { autoAlpha: 1, y: 0, duration: .025 }, at + .005);
      if (i < FEAT.length - 1) main.to(`#cards .card[data-pin="${i}"]`, { autoAlpha: 0, y: -20, duration: .015 }, at + .04);
    });
    // the dive and city scene, D later than before (added straight to main: a nested timeline would replay its start values while you scroll back through the tour)
    const after = { to(t, v, p) { main.to(t, v, p + D); return after; }, set(t, v, p) { main.set(t, v, p + D); return after; }, fromTo(t, a, b, p) { main.fromTo(t, a, b, p + D); return after; } };
    after.to(`#cards .card[data-pin="${FEAT.length - 1}"]`, { autoAlpha: 0, duration: .02 }, .3)
      .to("#credit", { opacity: 0, duration: .02 }, .3)
      .to("#indiaBox", { scale: 14, transformOrigin: oIndia, duration: .08, ease: "power3.in" }, .3)
      .to("#streak", { opacity: 1, duration: .03 }, .34)
      .to("#clouds", { opacity: 0, duration: .03 }, .34)
      .set("#lIndia", { opacity: 0 }, .38)
      .set("#lDelhi", { opacity: 1 }, .38)
      .fromTo("#delhiBox", { scale: 3, transformOrigin: oDelhi }, { scale: 1, duration: .08, ease: "power3.out" }, .38)
      .to("#streak", { opacity: 0, duration: .04 }, .39)
      .to("#dPins .pin", { scale: 1, duration: .02, ease: "back.out(3)" }, .45)
      .to("#rings", { opacity: 1, duration: .04 }, .46)
      .to(`#cards .card[data-city="1"]`, { autoAlpha: 1, y: 0, duration: .03 }, .5)
      .to(`#cards .card[data-city="2"]`, { autoAlpha: 1, y: 0, duration: .03 }, .55)
      .to(`#cards .card[data-city="1"], #cards .card[data-city="2"]`, { autoAlpha: 0, y: -20, duration: .03 }, .64)
      .to("#delhiBox", { scale: 1.2, transformOrigin: oDelhi, duration: .1, ease: "power2.inOut" }, .66)
      .to("#hud", { opacity: 1, duration: .06 }, .7)
      .fromTo("#scan", { top: "-10%" }, { top: "110%", duration: .14, ease: "none" }, .7)
      .to(`#cards .card[data-city="3"]`, { autoAlpha: 1, y: 0, duration: .03 }, .8)
      .to(`#cards .card[data-city="4"]`, { autoAlpha: 1, y: 0, duration: .03 }, .86)
      .to(`#cards .card[data-city="5"]`, { autoAlpha: 1, y: 0, duration: .03 }, .9)
      .to({}, { duration: .04 }, .96);
    tl = gsap.timeline({ defaults: { ease: "power2.out" }, onUpdate: () => { if (prog < TOUR_P) hideUnderBars(); drawLinks(); }, scrollTrigger: { trigger: "#dive", start: "top top", end: "bottom bottom", scrub: .8,
      onUpdate: s => { prog = s.progress; $("#progBar").style.width = prog * 100 + "%"; $("#stepName").innerHTML = stepLabel(); $("#prev").disabled = prog < .01; $("#next").disabled = prog > .97; $("#iPins").classList.toggle("off", prog > TOUR_P); if (prog < TOUR_P) { fitCards(); hideUnderBars(); } drawLinks(); } } });
    tl.add(main, 0);
    if (introDone) ScrollTrigger.refresh();
  }
  function stepLabel() {
    const t = prog * TOT, n = FEAT.length;
    if (t >= T0 && t < .3 + D) return `<b>01</b>STORY ${Math.max(0, Math.min(n - 1, Math.floor((t - T0) / TU))) + 1} OF ${n}`;
    const st = [...STEP].reverse().find(x => (t < .3 + D ? t : t - D) >= x[0] - .001); return `<b>${st[1]}</b>${st[2]}`;
  }
  function jump(dir) {
    const st = tl && tl.scrollTrigger; if (!st) return;
    const marks = [0, ...FEAT.map((f, i) => (T0 + i * TU + .02) / TOT), ...MARKS.slice(1).map(x => (x + D) / TOT)];
    const m = dir > 0 ? marks.find(x => x > prog + .004) : [...marks].reverse().find(x => x < prog - .004);
    if (m == null) return; window.scrollTo({ top: st.start + (st.end - st.start) * m, behavior: "smooth" });
  }
  $("#prev").onclick = () => jump(-1); $("#next").onclick = () => jump(1);
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (!$("#v-home").hidden && !focusId) { setupDive(); if (hasG) ScrollTrigger.refresh(); } }, 200); });

  /* ---------- today's map: click any story to zoom into it ---------- */
  function focusStory(id) {
    const s = RS.story(id), pin = $(`#iPins .pin[data-id="${id}"]`); if (!s || !pin) return;
    if (prog > TOUR_P) { const st = tl && tl.scrollTrigger; if (st) { window.scrollTo(0, st.start); tl.progress(0); ScrollTrigger.update(); } }
    focusId = id; hideUnderBars(); root.style.overflow = "hidden"; document.body.classList.add("focusing"); $("#today").open = false;
    $$("#iPins .pin").forEach(p => p.classList.toggle("dim", p !== pin)); pin.classList.add("on");
    const r = pin.getBoundingClientRect(), W = innerWidth, H = innerHeight, mob = W < 760, k = mob ? 2.2 : 2.6;
    const lr = $("#lIndia").getBoundingClientRect(), cur = hasG ? gsap.getProperty("#lIndia", "scale") : 1;
    const px = (r.left + r.width / 2 - lr.left) / cur, py = (r.top + r.height / 2 - lr.top) / cur;
    const cx = mob ? W * .5 : W * .34, cy = mob ? H * .3 : H * .52;
    const p = RS.share(s), [, , nm] = GEO[id];
    $("#focus").innerHTML = `<button class="fx" type="button" data-unfocus aria-label="Back to the map">×</button>
      ${s.live && s.image ? `<span class="livephoto-wrap focusphoto"><img class="livephoto" src="${esc(s.image)}" alt="" referrerpolicy="no-referrer"><span class="photocredit">Photo: ${esc(((window.LIVE_OUTLETS || {})[s.imageBy] || {}).name || "the outlet")}</span></span>` : ""}<span class="lbl">${esc(nm)} · ${esc(s.cat)} · ${esc(s.time)}</span><h3>${esc(s.title)}</h3>
      <ul>${s.sum.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      ${s.live && s.outletCount < 2 ? `<span class="lbl">Only 1 outlet so far · nothing to compare yet</span>` : `<div class="bar"><i style="flex:${p.l};background:var(--rose)"></i><i style="flex:${p.c};background:rgba(255,255,255,.35)"></i><i style="flex:${p.r};background:var(--teal-3)"></i></div>
      <span class="lbl">L ${p.l}% · C ${p.c}% · R ${p.r}% · ${Object.values(s.cov).reduce((a, b) => a + b, 0)} articles</span>`}
      <div class="macts"><button class="mbtn mt" type="button" data-go="story" data-arg="${id}">READ ALL SIDES</button>${s.dossier ? `<button class="mbtn" type="button" data-go="inv" data-arg="${id}">INVESTIGATE</button>` : ""}<button class="mbtn mg" type="button" data-ask="${id}">ASK DHAGA</button></div>
      ${s.live ? "" : `<span class="lbl" style="color:var(--ink-4)">Illustrative story for this prototype</span>`}`;
    $("#focus").hidden = false;
    if (!hasG || RM) { $("#mui").style.opacity = 0; return; }
    gsap.to("#lIndia", { x: cx - px * k, y: cy - py * k, scale: k, transformOrigin: "0 0", duration: 1.1, ease: "power3.inOut" });
    gsap.to("#mui", { opacity: 0, duration: .3 });
    gsap.fromTo("#focus", { x: mob ? 0 : 40, y: mob ? 40 : 0, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .6, delay: .55, ease: "power3.out" });
  }
  function unfocus(now) {
    if (!focusId) return; focusId = null; document.body.classList.remove("focusing"); setTimeout(hideUnderBars, 1000);
    $$("#iPins .pin").forEach(p => p.classList.remove("dim", "on"));
    $("#focus").hidden = true; if (!root.classList.contains("intro")) root.style.overflow = "";
    if (!hasG || RM || now) { if (hasG) gsap.set("#lIndia", { x: 0, y: 0, scale: 1 }); $("#mui").style.opacity = 1; return; }
    gsap.to("#lIndia", { x: 0, y: 0, scale: 1, duration: .9, ease: "power3.inOut" });
    gsap.to("#mui", { opacity: 1, duration: .4, delay: .5 });
  }
  document.addEventListener("click", e => {
    const f = e.target.closest("[data-focus]"); if (f) { e.preventDefault(); focusStory(f.dataset.focus); return; }
    const pin = e.target.closest("#iPins .pin"); if (pin) { focusStory(pin.dataset.id); return; }
    if (e.target.closest("[data-unfocus]")) { unfocus(); return; }
    const a = e.target.closest("[data-ask]"); if (a) { openDhaga(a.dataset.ask); }
  });
  $("#iPins").addEventListener("keydown", e => { const pin = e.target.closest(".pin"); if (pin && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); focusStory(pin.dataset.id); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { if (focusId) unfocus(); else if (!$("#dpanel").hidden) closeDhaga(); } });

  /* ---------- pages sit below the fixed top bar, whatever height it wraps to ---------- */
  const setTopH = () => root.style.setProperty("--topH", Math.round($(".top").getBoundingClientRect().height) + "px");
  if (window.ResizeObserver) new ResizeObserver(setTopH).observe($(".top")); setTopH();

  /* ---------- home is the satellite page; every other page comes from the app ---------- */
  RS.V.home = { mount() {}, show() { requestAnimationFrame(() => { setupDive(); if (hasG) ScrollTrigger.refresh(); }); } };

  /* ---------- thread page transition ---------- */
  const NAMES = { home: "Home", discover: "Discover", story: "The story", investigate: "Investigate", inv: "Investigate", lab: "Investigate", board: "Whiteboard", shame: "Shameboard", publications: "Publications", reels: "Reels", write: "Write", post: "Publications", chat: "Chat", clip: "Clip maker", studio: "Creator Studio", magazine: "Magazine", kids: "Kids", mastery: "News Mastery", library: "My Library" };
  let cur = null, busy = false;
  window.RT_SHOWN = name => {
    if (name !== "home") unfocus(true);
    cur = name; $("#stepper").hidden = name !== "home";
    document.body.classList.toggle("in-lab", name === "investigate");
    document.body.classList.toggle("in-reels", name === "reels"); if (name !== "reels" && RS.reelsLeave) RS.reelsLeave();
    $("#tmore").open = false;
    if (hasG) requestAnimationFrame(() => ScrollTrigger.refresh());
    if (name === "story" || name === "investigate") dCtx = (location.hash.match(/story-(.+)$/) || [])[1] || dCtx;
  };
  window.RT_GO = (name, arg, from) => {
    if (busy) return;
    if (name === "story" && arg) dCtx = arg; else if (name === "inv" && arg) dCtx = arg;
    if ((name === cur && !arg) || !hasG || RM || !from) { RS.show(name, arg); return; }
    busy = true;
    const r = from.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.bottom, W = innerWidth, H = innerHeight, path = $("#txPath");
    path.setAttribute("d", `M${x0} ${y0} C ${x0} ${y0 + H * .45}, ${W * .2} ${H * .9}, ${W * .45} ${H * .62} S ${W * .75} ${H * .1}, ${W + 60} ${H * .4}`);
    // the red thread shoots out of what you clicked; the next page opens under it while it is still moving, then it pulls away
    const len = path.getTotalLength(); gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
    let shown = false; const safety = setTimeout(() => { if (shown) return; shown = true; busy = false; gsap.set(path, { opacity: 0 }); try { RS.show(name, arg); } catch (err) { console.error(err); } }, 700);
    gsap.timeline({ onComplete: () => busy = false })
      .to(path, { strokeDashoffset: 0, duration: .42, ease: "power2.in" })
      .add(() => { if (shown) return; shown = true; clearTimeout(safety); try { RS.show(name, arg); } catch (err) { console.error(err); } if (cur !== "home") gsap.fromTo(`#v-${cur}`, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .45, ease: "power3.out", clearProps: "transform,opacity" }); }, .26)
      .to(path, { strokeDashoffset: -len, duration: .4, ease: "power2.out" }, .42)
      .to(path, { opacity: 0, duration: .2 }, .62);
  };

  /* ---------- Dhaga AI: the dock chat, available on every page ---------- */
  let dCtx = "genz", dBusy = false, dAbort = null; const dHist = [];
  const SUGG = {
    genz: ["Was the exam paper really leaked nationwide?", "What is each side leaving out?", "Explain this in simple Hinglish"],
    _: ["What do we actually know so far?", "How did left and right outlets frame this?", "What questions are still open?"]
  };
  function setStatus() {
    const ai = RS.ai(), ready = RS.aiReady();
    $("#aiState").textContent = ai ? "ONLINE" : ready ? "OPEN IN CLAUDE" : "CONNECTING";
    $("#dStatus").textContent = ai ? "Live · cites sources" : ready ? "Open on claude.ai" : "Connecting…";
  }
  RS.onAi(setStatus);
  function renderCtx() {
    const s = RS.story(dCtx) || RS.story("genz");
    $("#dCtx").innerHTML = `<span class="lbl">Reading</span> ${esc(s.title)}${dCtx === "genz" ? ` <span class="lbl" style="color:var(--teal-3)">· full case file</span>` : ""}`;
    $("#dSug").innerHTML = (SUGG[dCtx] || SUGG._).map(q => `<button class="q" type="button">${esc(q)}</button>`).join("");
  }
  function openDhaga(ctx) {
    if (ctx && RS.story(ctx) && ctx !== dCtx) { dCtx = ctx; dHist.length = 0; $("#dlog").innerHTML = `<p class="dm">${esc(RS.AI)} has read this story. Ask anything: you'll get the evidence and the gaps, and the conclusion stays yours.</p>`; }
    renderCtx(); setStatus();
    $("#dpanel").hidden = false; $("#aiBtn").setAttribute("aria-expanded", "true");
    if (hasG && !RM) gsap.fromTo("#dpanel", { marginBottom: -16, opacity: 0 }, { marginBottom: 0, opacity: 1, duration: .35, ease: "power3.out" });
    setTimeout(() => $("#dIn").focus(), 50);
  }
  function closeDhaga() { $("#dpanel").hidden = true; $("#aiBtn").setAttribute("aria-expanded", "false"); }
  $("#aiBtn").onclick = () => $("#dpanel").hidden ? openDhaga(focusId) : closeDhaga();
  $("#ctaAsk").onclick = () => openDhaga(focusId);
  $("#dX").onclick = closeDhaga;
  $("#dSug").addEventListener("click", e => { const q = e.target.closest(".q"); if (q) ask(q.textContent); });
  $("#dForm").addEventListener("submit", e => { e.preventDefault(); const v = $("#dIn").value; $("#dIn").value = ""; ask(v); });
  async function ask(q) {
    q = (q || "").trim(); if (!q || dBusy) return;
    const log = $("#dlog"), me = document.createElement("p"); me.className = "me"; me.textContent = q; log.append(me);
    const a = document.createElement("div"); a.className = "dm"; log.append(a); log.scrollTop = 1e9;
    const ai = RS.ai();
    if (!ai) { a.textContent = RS.aiReady() ? `${RS.AI} runs on Claude. Open this page on claude.ai (signed in) and allow Claude access when asked, then try again.` : "Still connecting to Claude. Try again in a moment."; return; }
    dBusy = true; a.textContent = "Thinking…"; $("#dGo").disabled = true;
    dAbort = new AbortController();
    const prompt = `You are ${RS.AI}, a neutral research companion inside The Red Thread, a news app for young Indians. Answer in under 150 words, plain English (use Hinglish only if asked). End with one short question back to the reader.
${RS.EVIDENCE_RULES}

Case file (JSON):
${RS.caseContext(dCtx)}
${dHist.length ? "\nConversation so far:\n" + dHist.slice(-6).map(m => (m.r === "u" ? "Reader: " : RS.AI + ": ") + m.t).join("\n") + "\n" : ""}
Reader's question: ${q}`;
    try {
      const { text } = await ai(prompt, { cache: false, signal: dAbort.signal, onText: ({ text }) => { a.innerHTML = RS.md(text); log.scrollTop = 1e9; } });
      a.innerHTML = RS.md(text); dHist.push({ r: "u", t: q }, { r: "a", t: text });
    } catch (e) {
      a.textContent = RS.aiErr(e && e.code); if (e && RS.aiFatal(e.code)) RS.killAi();
    }
    dBusy = false; $("#dGo").disabled = false; log.scrollTop = 1e9;
  }
  renderCtx();
})();
