/* THE RED THREAD — first-visit guided tour. After the intro, a first-time visitor is walked through the real features:
   each step opens the page itself (including the ones tucked under More, like Creator Studio and Media Watch) and
   puts a spotlight on the thing to use there, with one line on what it does. Shown once (remembered in this browser);
   "Take the tour" under More replays it. If a step's target isn't on screen, the card just sits in the middle. */
(function () {
  const { $, $$ } = RS;
  const KEY = "rtTourDone";
  // the best-covered live story, for the steps that open a story
  const top = () => (STORIES.filter(s => s.live && s.outletCount > 2).sort((a, b) => b.outletCount - a.outletCount)[0] || STORIES[0] || {}).id;
  const btn = (view, re) => () => $$(`#v-${view} button`).find(b => re.test(b.textContent) && b.getBoundingClientRect().width > 0);
  const STEPS = [
    { view: "home", title: "Welcome to The Red Thread", text: "A news platform and a social network for news. Read today's stories from 16 Indian outlets and see how left, centre and right each cover them, then research them yourself, write and publish your own articles and reels, and discuss them with friends." },
    { view: "home", sel: "#today summary", title: "Every pin is a live story", text: "The map shows today's stories where they happened. Tap a pin, or open this list, to read one." },
    { view: "home", sel: "#stepper", title: "Scroll through the day", text: "Scroll, or use these arrows, to go story by story across India. It ends by zooming into today's biggest story." },
    { view: "daily", sel: ".daily-story", title: "The Red Thread Daily", text: "One big story every day: how the left, centre and right covered it, and what each side left out. Read it in two minutes and share it on WhatsApp." },
    { view: "discover", sel: ".gn-feat", title: "Discover", text: "Today's stories as a feed. Each one shows how much of its coverage came from the left, centre and right, and Blindspot shows what one side is ignoring." },
    { view: "story", arg: top, sel: "#cmpBtn", title: "Read all sides", text: "Every story page lists each outlet's own headline with a link to it. Bias comparison puts the left, centre and right versions next to each other." },
    { view: "investigate", arg: () => top() + "|map", sel: ".inv-bar-in", title: "Investigate", text: "Pick any story from this list and open it as a mind map: who said what, the timeline, and what's still missing. Add your own notes." },
    { view: "board", sel: "#wbStory", title: "Research board", text: "Inside Investigate, next to Dossier and My notes. Choose a story here and it lays the whole thing out on a whiteboard for you: what each side says, open questions, sources. Or paste any news link." },
    { view: "board", sel: "#wbPublish", title: "Turn your board into an article", text: "Add your own notes, evidence and connections to the board, then press \"Publish as a story\". Dhaga turns the board into an article draft you can edit and publish to Publications for others to read." },
    { view: "shame", sel: ".fcfeed", title: "Media watch", text: "Under More: live fact-checks from India's fact-checkers, and how outlets handle their corrections." },
    { view: "reels", sel: ".reel-frame", title: "Reels", text: "Short news videos you swipe through. Every reel links to the full article behind it." },
    { view: "publications", sel: ".pc-body", title: "Publications", text: "Articles by independent writers. Hit \"New article\" to write your own: Dhaga can draft it with you from the sources, and you can record a reel to go with it." },
    { view: "studio", sel: ".cs-steps", title: "Creator Studio", text: "Made for creators. Step 1: pull facts and headlines from any story or your Research Board into a notes doc of pointers. Step 2: record yourself while each pointer pops up on screen when you press Next." },
    { view: "home", sel: "#aiBtn", title: "Ask AI", text: "Ask Dhaga, our AI assistant, anything about a story, on any page. It answers from the sources and shows them." },
    { view: "home", sel: "#tmore summary", title: "Find it all under More", text: "How it works (our sources, and how left and right are decided), Media Watch, How it works, My Library and more. Enjoy exploring." }
  ];
  let i = 0, open = false, el = null, busy = false;
  const target = s => { const t = s.find ? s.find() : s.sel ? $(`#v-${s.view} ${s.sel}`) || $(s.sel) : null; if (!t) return null; const r = t.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? t : null; };
  function build() {
    el = document.createElement("div"); el.className = "tour"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Guided tour");
    el.innerHTML = `<div class="tour-spot" aria-hidden="true"></div><div class="tour-card"><span class="tour-n"></span><h3></h3><p></p><div class="tour-dots" aria-hidden="true"></div>
      <div class="tour-acts"><button type="button" class="tour-skip">Skip tour</button><span></span><button type="button" class="mbtn mg tour-back">Back</button><button type="button" class="mbtn mt tour-next">Next</button></div></div>`;
    document.body.appendChild(el);
    el.querySelector(".tour-skip").onclick = () => close(true);
    el.querySelector(".tour-back").onclick = () => go(-1);
    el.querySelector(".tour-next").onclick = () => go(1);
    el.addEventListener("click", e => { if (e.target === el) go(1); });
    document.addEventListener("keydown", e => { if (!open) return; if (e.key === "Escape") close(true); else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); });
    addEventListener("resize", () => open && place());
  }
  // open the step's page, bring its target into view, then place the spotlight and card
  async function show() {
    const s = STEPS[i]; busy = true;
    const cur = Object.keys(RS.V).find(k => { const v = $("#v-" + k); return v && !v.hidden; });
    if (s.view !== cur || s.arg) { try { RS.show(s.view, typeof s.arg === "function" ? s.arg() : s.arg); } catch (e) { console.error(e); } await new Promise(r => setTimeout(r, 500)); }
    if (s.view === "home") window.scrollTo(0, 0);
    const t = target(s);
    if (t) { const r = t.getBoundingClientRect(); if (r.top < 80 || r.bottom > innerHeight - 120) { t.scrollIntoView({ block: "center" }); await new Promise(r => setTimeout(r, 250)); } }
    busy = false; place();
  }
  function place() {
    const s = STEPS[i], spot = el.querySelector(".tour-spot"), card = el.querySelector(".tour-card");
    el.querySelector(".tour-n").textContent = `${i + 1} of ${STEPS.length}`;
    el.querySelector("h3").textContent = s.title; el.querySelector("p").textContent = s.text;
    el.querySelector(".tour-dots").innerHTML = STEPS.map((_, k) => `<i class="${k === i ? "on" : k < i ? "done" : ""}"></i>`).join("");
    el.querySelector(".tour-back").hidden = i === 0;
    el.querySelector(".tour-next").textContent = i === STEPS.length - 1 ? "Start exploring" : "Next";
    const W = innerWidth, H = innerHeight, cw = Math.min(380, W - 32), t = target(s);
    card.style.width = cw + "px";
    if (!t) { spot.style.cssText = `left:${W / 2}px;top:${H / 2}px;width:0;height:0`; card.style.left = (W - cw) / 2 + "px"; card.style.top = Math.max(16, H / 2 - 120) + "px"; return; }
    const r = t.getBoundingClientRect(), pad = 8, ch = card.offsetHeight || 210;
    const sx = Math.max(4, r.left - pad), sy = Math.max(4, r.top - pad), sw = Math.min(W - 8, r.width + pad * 2), sh = Math.min(H - 8 - sy, r.height + pad * 2);
    spot.style.cssText = `left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px`;
    const below = sy + sh + 14, above = sy - 14 - ch;
    // below or above the target; for a tall target (a reel, a big panel) beside it, so the card never covers it
    if (below + ch < H - 8) { card.style.top = below + "px"; card.style.left = Math.max(16, Math.min(W - cw - 16, r.left + r.width / 2 - cw / 2)) + "px"; }
    else if (above > 8) { card.style.top = above + "px"; card.style.left = Math.max(16, Math.min(W - cw - 16, r.left + r.width / 2 - cw / 2)) + "px"; }
    else { const right = sx + sw + 16, left = sx - 16 - cw, mid = Math.max(16, Math.min(H - ch - 16, r.top + r.height / 2 - ch / 2));
      if (right + cw < W - 8) { card.style.left = right + "px"; card.style.top = mid + "px"; }
      else if (left > 8) { card.style.left = left + "px"; card.style.top = mid + "px"; }
      else { card.style.left = (W - cw) / 2 + "px"; card.style.top = Math.max(8, H - ch - 16) + "px"; } }
  }
  function go(d) { if (busy) return; i += d; if (i < 0) i = 0; if (i >= STEPS.length) { close(true); return; } show(); }
  function start() {
    if (open) return; if (!el) build();
    $("#tmore") && ($("#tmore").open = false);
    i = 0; open = true; el.hidden = false; document.documentElement.classList.add("touring"); show();
    el.querySelector(".tour-next").focus({ preventScroll: true });
  }
  function close(done) {
    open = false; if (el) el.hidden = true; document.documentElement.classList.remove("touring");
    if (done) try { localStorage.setItem(KEY, "1"); } catch {}
  }
  let seen = false; try { seen = localStorage.getItem(KEY) === "1"; } catch {}
  window.RT_TOUR = {
    start,
    // after the intro: first-time visitors on the home page get the tour
    auto() { if (seen || open) return; const home = $("#v-home"); if (!home || home.hidden || window.scrollY > 40) return; start(); }
  };
  document.addEventListener("click", e => { if (e.target.closest("[data-tour]")) { e.preventDefault(); $("#tmore") && ($("#tmore").open = false); start(); } });
})();
