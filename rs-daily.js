/* THE RED THREAD — "The Red Thread Daily": one big story a day, how the left, centre and right covered it, and what
   each side left out (Tangle-style). Picks today's best-covered story that more than one side reported, groups every
   outlet's own headline by its (provisional) lean, names the blindspot, and makes the page easy to share.
   An editor's note shows when live/daily-take.js sets window.DAILY_TAKE = { story: "<story id or empty>", by: "Name", text: "..." }.
   A sign-up button shows when window.DAILY_SIGNUP_URL is set (e.g. a free newsletter page). */
(function () {
  const { $, esc } = RS;
  const SIDES = [["left", "Left-leaning", ["L", "LL"]], ["centre", "Centre", ["C"]], ["right", "Right-leaning", ["LR", "R"]]];
  const leanOf = id => ((window.LIVE_OUTLETS || {})[id] || {}).b || "U";
  const nameOf = id => ((window.LIVE_OUTLETS || {})[id] || {}).name || id;
  // one entry per outlet (its first headline), grouped by side
  function sides(s) {
    const seen = new Set(), out = { left: [], centre: [], right: [], unrated: [] };
    (s.articles || []).forEach(a => {
      if (seen.has(a.outlet)) return; seen.add(a.outlet);
      const b = leanOf(a.outlet), side = (SIDES.find(x => x[2].includes(b)) || ["unrated"])[0];
      out[side].push(a);
    });
    return out;
  }
  // today's pick: the best-covered live story that at least two sides reported (else simply the best-covered)
  function pick() {
    const live = STORIES.filter(s => s.live && (s.articles || []).length);
    const scored = live.map(s => { const g = sides(s); return { s, n: ["left", "centre", "right"].filter(k => g[k].length).length }; });
    scored.sort((a, b) => (b.n >= 2) - (a.n >= 2) || b.s.outletCount - a.s.outletCount || b.s.lastSeen - a.s.lastSeen);
    return scored.length ? scored[0].s : null;
  }
  function blindspot(g) {
    const missing = SIDES.filter(([k]) => !g[k].length).map(([, label]) => label.toLowerCase());
    if (!missing.length) return `Every side covered this story. Compare the headlines below: notice which words, people and numbers each side chose to lead with.`;
    return `${missing.map(m => m[0].toUpperCase() + m.slice(1)).join(" and ")} outlets we track have not covered this story. That is today’s blindspot: readers who follow only them may not know it happened.`;
  }
  const headline = a => `<li><a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer"><b>${esc(nameOf(a.outlet))}</b><span>${esc(a.title)}</span></a></li>`;
  function page() {
    const s = pick();
    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (!s) return `<div class="wrap daily"><span class="eyebrow">The Red Thread Daily</span><h1>Today’s story is on its way</h1><p class="muted">The news hasn’t loaded yet. Try again in a few minutes.</p></div>`;
    const g = sides(s), others = STORIES.filter(x => x.live && x !== s && x.outletCount > 2).sort((a, b) => b.outletCount - a.outletCount).slice(0, 3);
    const take = window.DAILY_TAKE && window.DAILY_TAKE.text && (!window.DAILY_TAKE.story || window.DAILY_TAKE.story === s.id) ? window.DAILY_TAKE : null;
    const url = location.href.split("#")[0] + "#daily";
    const shareText = `Today on The Red Thread Daily: ${s.title}. How the left, centre and right covered it, and what each side left out.`;
    return `<div class="wrap daily">
      <header class="daily-head"><span class="eyebrow">The Red Thread Daily · ${esc(today)}</span><h1>One story. Every side.</h1><p class="muted">Each day we pick the biggest story in India and show how outlets on the left, in the centre and on the right reported it, and what each side left out.</p></header>
      <article class="daily-story">
        <span class="eyebrow">${esc(s.place)} · ${esc(s.cat)} · ${s.outletCount} outlets · ${(s.articles || []).length} articles · updated ${esc(s.time)}</span>
        <h2>${esc(s.title)}</h2>
        ${s.image ? `<span class="livephoto-wrap daily-photo"><img class="livephoto" src="${esc(s.image)}" alt="" referrerpolicy="no-referrer"><span class="photocredit">Photo: ${esc(nameOf(s.imageBy))}</span></span>` : ""}
        <section><h3>What’s being reported</h3><ul class="daily-facts">${(s.sum || []).slice(0, 4).map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>
        <section><h3>How each side covered it</h3>${RS.biasBar ? RS.biasBar(s, true) : ""}
          <div class="daily-sides">${SIDES.map(([k, label]) => `<div class="daily-side daily-${k}"><h4>${label}</h4>${g[k].length ? `<ul>${g[k].slice(0, 5).map(headline).join("")}</ul>${g[k].length > 5 ? `<button type="button" class="footlink" data-go="story" data-arg="${esc(s.id)}">+ ${g[k].length - 5} more ${label.toLowerCase()} outlets</button>` : ""}` : `<p class="muted">No ${label.toLowerCase()} outlet we track has covered this yet.</p>`}</div>`).join("")}</div>
          ${g.unrated.length ? `<p class="muted daily-unrated">Also reporting (not yet rated): ${g.unrated.map(a => esc(nameOf(a.outlet))).join(", ")}</p>` : ""}
        </section>
        <section class="daily-blind"><h3>What each side left out</h3><p>${esc(blindspot(g))}</p></section>
        ${take ? `<section class="daily-take"><h3>Our take</h3><p>${esc(take.text)}</p><span class="muted">— ${esc(take.by || "The Red Thread editor")}</span></section>` : ""}
        <div class="daily-acts">
          <button class="mbtn mt" type="button" data-go="story" data-arg="${esc(s.id)}">READ THE FULL STORY</button>
          <a class="mbtn mg" href="https://wa.me/?text=${encodeURIComponent(shareText + " " + url)}" target="_blank" rel="noopener noreferrer">SHARE ON WHATSAPP</a>
          <button class="mbtn mg" type="button" id="dailyCopy" data-url="${esc(url)}">COPY LINK</button>
          ${window.DAILY_SIGNUP_URL ? `<a class="mbtn mt" href="${esc(window.DAILY_SIGNUP_URL)}" target="_blank" rel="noopener noreferrer">GET IT FREE EVERY MORNING</a>` : ""}
        </div>
      </article>
      ${others.length ? `<section class="daily-more"><h3>Also today</h3><div class="daily-more-list">${others.map(x => `<button type="button" data-go="story" data-arg="${esc(x.id)}"><span class="eyebrow">${esc(x.place)} · ${x.outletCount} outlets</span><b>${esc(x.title)}</b></button>`).join("")}</div></section>` : ""}
      <p class="muted daily-note">Left / centre / right labels are provisional and apply to outlets, not individual articles. <button type="button" class="footlink" data-go="how">How we decide</button></p>
    </div>`;
  }
  RS.V.daily = { mount() {}, show(arg, el) { el = el || $("#v-daily"); el.innerHTML = page(); } };
  document.addEventListener("click", e => {
    const c = e.target.closest("#dailyCopy"); if (!c) return;
    navigator.clipboard.writeText(c.dataset.url).then(() => RS.toast("Link copied"), () => RS.toast(c.dataset.url));
  });
})();
