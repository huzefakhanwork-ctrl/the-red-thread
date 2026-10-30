/* THE RED THREAD — first-visit guided tour. After the intro, a first-time visitor gets a short step-by-step tour:
   a spotlight on each part of the page with one line on what it does. Shown once (remembered in this browser);
   "Take the tour" under More replays it. Steps whose target isn't on screen (e.g. on a phone) are skipped. */
(function () {
  const { $ } = RS;
  const KEY = "rtTourDone";
  const STEPS = [
    { title: "Welcome to The Red Thread", text: "Today's Indian news from 16 outlets in one place, and how left, centre and right each cover it. Here's a 30-second tour." },
    { sel: "#today summary", title: "Every pin is a live story", text: "The map shows today's stories where they happened. Tap a pin, or open this list, to read one." },
    { sel: "#stepper", title: "Scroll through the day", text: "Scroll, or use these arrows, to go story by story across India. It ends by zooming into today's biggest story." },
    { sel: '.tnav [data-go="discover"]', title: "Discover", text: "All of today's headlines as a list, each with its left / centre / right split and blindspots." },
    { sel: '.tnav [data-go="investigate"]', title: "Investigate", text: "Open any story as a mind map: who said what, the timeline, and what's still missing." },
    { sel: '.tnav [data-go="board"]', title: "Research board", text: "Lay a story out yourself on a whiteboard, or paste any news link to build one." },
    { sel: '.tnav [data-go="shame"]', title: "Media watch", text: "Live fact-checks from Alt News, Factly and Newschecker, and how outlets handle corrections." },
    { sel: '.tnav [data-go="reels"]', title: "Reels", text: "Short videos on the news, each linked to the full article." },
    { sel: '.tnav [data-go="publications"]', title: "Publications", text: "Read articles from independent writers, or write and publish your own, with a reel to go with it." },
    { sel: "#aiBtn", title: "Ask AI", text: "Ask Dhaga, our AI assistant, anything about a story. It answers from the sources and shows them." },
    { sel: "#tmore summary", title: "More", text: "How it works (our sources, and how left and right are decided), creator tools, publications and chat." }
  ];
  let i = 0, open = false, el = null;
  const visible = s => { if (!s.sel) return true; const t = $(s.sel); if (!t) return false; const r = t.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && getComputedStyle(t).visibility !== "hidden"; };
  function build() {
    el = document.createElement("div"); el.className = "tour"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Guided tour");
    el.innerHTML = `<div class="tour-spot" aria-hidden="true"></div><div class="tour-card"><span class="tour-n"></span><h3></h3><p></p>
      <div class="tour-acts"><button type="button" class="tour-skip">Skip tour</button><span></span><button type="button" class="mbtn mg tour-back">Back</button><button type="button" class="mbtn mt tour-next">Next</button></div></div>`;
    document.body.appendChild(el);
    el.querySelector(".tour-skip").onclick = () => close(true);
    el.querySelector(".tour-back").onclick = () => go(-1);
    el.querySelector(".tour-next").onclick = () => go(1);
    el.addEventListener("click", e => { if (e.target === el) go(1); });
    document.addEventListener("keydown", e => { if (!open) return; if (e.key === "Escape") close(true); else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); });
    addEventListener("resize", () => open && place());
  }
  const steps = () => STEPS.filter(visible);
  function place() {
    const list = steps(), s = list[i], spot = el.querySelector(".tour-spot"), card = el.querySelector(".tour-card");
    el.querySelector(".tour-n").textContent = `${i + 1} of ${list.length}`;
    el.querySelector("h3").textContent = s.title; el.querySelector("p").textContent = s.text;
    el.querySelector(".tour-back").hidden = i === 0;
    el.querySelector(".tour-next").textContent = i === list.length - 1 ? "Start exploring" : "Next";
    const W = innerWidth, H = innerHeight, cw = Math.min(360, W - 32);
    card.style.width = cw + "px";
    if (!s.sel) { spot.style.cssText = `left:${W / 2}px;top:${H / 2}px;width:0;height:0`; card.style.left = (W - cw) / 2 + "px"; card.style.top = Math.max(16, H / 2 - 110) + "px"; return; }
    const r = $(s.sel).getBoundingClientRect(), pad = 8;
    spot.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
    const ch = card.offsetHeight || 190, below = r.bottom + pad + 14, above = r.top - pad - 14 - ch;
    card.style.top = (below + ch < H - 8 ? below : Math.max(8, above)) + "px";
    card.style.left = Math.max(16, Math.min(W - cw - 16, r.left + r.width / 2 - cw / 2)) + "px";
  }
  function go(d) { const n = steps().length; i += d; if (i < 0) i = 0; if (i >= n) { close(true); return; } place(); }
  function start() {
    if (open) return; if (!el) build();
    $("#tmore") && ($("#tmore").open = false);
    i = 0; open = true; el.hidden = false; document.documentElement.classList.add("touring"); place();
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
  document.addEventListener("click", e => { if (e.target.closest("[data-tour]")) { e.preventDefault(); if (window.RT_GO && !$("#v-home").hidden) start(); else { RS.show("home"); setTimeout(start, 900); } } });
})();
