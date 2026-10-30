/* THE RED THREAD — live news. Reads window.LIVE (written by scripts/collect-news.mjs into live/news.js), turns real
   stories into the app's story format so Discover, story pages, the map and Dhaga use them, and labels the old
   sample stories as samples. Runs after the app modules and before rt-motion (which builds the map). */
(function () {
  const L = window.LIVE; if (!L || !Array.isArray(L.stories)) return;
  const { $, esc } = RS;
  const COL = { L: "#FB7185", LL: "#FDA4AF", C: "#94A3B8", LR: "#93C5FD", R: "#60A5FA", U: "#64748B" };
  window.LIVE_OUTLETS = Object.fromEntries(L.outlets.map(o => [o.id, { id: o.id, name: o.name, b: o.lean || "U", c: COL[o.lean] || COL.U, lang: "", t: "", fact: "Not rated" }]));
  const upd = new Date(L.updated);
  window.LIVE_UPDATED = upd.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const ago = t => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + " min ago" : m < 2880 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago"; };
  const nm = id => (window.LIVE_OUTLETS[id] || {}).name || id;

  // the sample stories stay (they power the demo flows) but say what they are
  STORIES.forEach(s => { if (!s.live && !/sample/i.test(s.time)) s.time = s.time + " · sample story"; });
  // real stories, in the shape every page expects
  const live = L.stories.map(s => ({
    ...s, image: s.imageLocal || s.image, time: ago(s.lastSeen),
    sum: s.sum.length ? s.sum : [s.title],
    L: s.L.length ? s.L : ["None of the left-leaning outlets we track have covered this yet."],
    R: s.R.length ? s.R : ["None of the right-leaning outlets we track have covered this yet."],
    hl: { L: s.hl.L || "Not covered by left-leaning outlets we track", C: s.hl.C || s.title, R: s.hl.R || "Not covered by right-leaning outlets we track" }
  }));
  STORIES.unshift(...live);
  // map pins: the best-covered real stories with a known place, spread out a little so pins in one city don't stack
  const ring = [[0, 0], [.55, .35], [-.5, .4], [.1, -.6], [-.6, -.3], [.65, -.35], [0, .75], [-.75, .1]];
  const perPlace = {};
  live.filter(s => s.lat != null).sort((a, b) => b.outletCount - a.outletCount || b.lastSeen - a.lastSeen).slice(0, 40).forEach(s => {
    const k = s.place, i = perPlace[k] = (perPlace[k] || 0) + 1, [dy, dx] = ring[(i - 1) % ring.length];
    GEO[s.id] = [s.lat + dy, s.lon + dx, s.place.toUpperCase() + " · LIVE"];
  });

  // a photo that won't load (blocked hotlink, removed image) quietly falls back to the drawn art underneath
  document.addEventListener("error", e => { const t = e.target; if (t && t.classList && t.classList.contains("livephoto")) { t.closest(".livephoto-wrap")?.querySelector(".photocredit")?.remove(); t.remove(); } }, true);
  const banner = extra => `<div class="livebar"><span class="livedot" aria-hidden="true"></span><b>LIVE</b><span>Real headlines from ${L.outlets.length} Indian outlets · ${L.counts.articles} articles · updated ${esc(window.LIVE_UPDATED)}</span>${extra || ""}<span class="livenote">Left/centre/right labels are provisional</span></div>`;
  // Discover: say it's live, and how fresh
  const disc = RS.V.discover, dShow = disc.show.bind(disc);
  disc.show = (arg, el) => { const r = dShow(arg, el); el = el || $("#v-discover"); el.querySelector(".livebar")?.remove(); el.insertAdjacentHTML("afterbegin", `<div class="wrap">${banner()}</div>`); return r; };
  // story pages: live banner + where it comes from
  const st = RS.V.story, sShow = st.show.bind(st);
  st.show = (id, el) => { const r = sShow(id, el); const s = RS.story(id); el = el || $("#v-story"); if (s && s.live) el.insertAdjacentHTML("afterbegin", `<div class="wrap">${banner(`<span>${s.outletCount} ${s.outletCount === 1 ? "outlet" : "outlets"} on this story</span>`)}</div>`); return r; };
  // Shameboard: the real inputs it will be built from
  const sh = RS.V.shame;
  if (sh && L.factchecks && L.factchecks.length) {
    const hShow = sh.show ? sh.show.bind(sh) : null;
    sh.show = (arg, el) => { const r = hShow ? hShow(arg, el) : undefined; el = el || $("#v-shame"); el.querySelector(".fcfeed")?.remove();
      el.insertAdjacentHTML("afterbegin", `<div class="wrap fcfeed"><div class="fchead"><span class="livedot" aria-hidden="true"></span><b>Live fact-checks</b><span class="muted">From ${[...new Set(L.factchecks.map(f => f.name))].map(esc).join(", ")} · updated ${esc(window.LIVE_UPDATED)}</span></div>
        <div class="fclist">${L.factchecks.slice(0, 8).map(f => `<a href="${esc(f.link)}" target="_blank" rel="noopener noreferrer"><span class="eyebrow">${esc(f.name)} · ${ago(f.time)}</span><b>${esc(f.title)}</b></a>`).join("")}</div>
        <p class="mono muted" style="font-size:12px">These are the raw inputs. A finding only goes on the board after a reviewer matches it to the outlet that published the claim and the outlet has a chance to respond. The rankings below are still sample data.</p></div>`);
      return r; };
  }
})();
