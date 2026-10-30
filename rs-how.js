/* THE RED THREAD — "How it works": where the news comes from, how stories are grouped, how left / centre / right is
   decided and what that can't tell you. Also registers the "Take action" page (its markup is in body.html, rs-act fills it). */
(function () {
  const { esc } = RS, L = window.LIVE;
  const GROUPS = [["L", "Left"], ["LL", "Leans left"], ["C", "Centre"], ["LR", "Leans right"], ["R", "Right"]];
  const COL = { L: "#FB7185", LL: "#FDA4AF", C: "#94A3B8", LR: "#93C5FD", R: "#60A5FA" };

  function page() {
    const outlets = L ? L.outlets : [], checkers = L && L.factchecks ? [...new Set(L.factchecks.map(f => f.name))] : [];
    const leans = GROUPS.map(([k, label]) => { const os = outlets.filter(o => o.lean === k); return os.length ? `<div class="lean"><b style="color:${COL[k]}">${label}</b>${os.map(o => `<span>${esc(o.name)}</span>`).join("")}</div>` : ""; }).join("");
    return `<div class="how">
      <div><span class="eyebrow">How it works</span><h1>Every side of today's news, and how we work it out</h1></div>
      <p>The Red Thread collects today's headlines from Indian news outlets, groups the reports that are about the same event, and shows you which outlets covered it and how. The point is to see the whole picture, not to tell you what to think.</p>

      <section><h2>Where the news comes from</h2>
        <p>${L ? `Every 30 minutes a small program reads the public news feeds (RSS) of ${outlets.length} Indian outlets. The last update was ${esc(window.LIVE_UPDATED || "")}.` : "In this copy the news is a fixed sample; the live version reads Indian outlets' public news feeds every 30 minutes."} Each headline links to the outlet's own article; we show the headline, a short summary and the outlet's photo with credit, and send you to the outlet to read the rest.</p>
        ${checkers.length ? `<p>Fact-checks come from ${checkers.map(esc).join(", ")}.</p>` : ""}
      </section>

      <section><h2>How a "story" is made</h2>
        <p>Reports from different outlets that share the same key words, published around the same time, are grouped into one story. The place on the map comes from the place names in the headlines. This is automatic, so sometimes two different events get grouped, or one event is split in two.</p>
      </section>

      <section><h2>How left, centre and right are decided</h2>
        <p>Each <b>outlet</b> has one label. A story's split is simply which outlets covered it: if two centre outlets and three left-leaning outlets reported it, it shows 40% centre and 60% left. A "blindspot" is a story covered by one side and not the other.</p>
        ${leans ? `<div class="leans">${leans}</div>` : ""}
        <p class="note"><b>These labels are provisional.</b> They are our estimate of how each outlet is commonly described in public discussion of Indian media (ownership, editorial line, and how critical or supportive it usually is of the government). They have not been reviewed by an independent panel yet. If you think one is wrong, tell us.</p>
      </section>

      <section><h2>What this can't tell you</h2>
        <ul>
          <li>One label per outlet is rough: an outlet's news desk and opinion pages differ, and a single article can break from its outlet's usual line.</li>
          <li>It counts <i>who</i> covered a story, not <i>how</i>. Two outlets can report the same event with opposite slants.</li>
          <li>When only one outlet has covered a story, there is nothing to compare yet, so we don't show a split.</li>
          <li>"Left" and "right" in India often mean "critical of" or "supportive of" the government of the day, and that shifts over time.</li>
        </ul>
      </section>

      <section><h2>What else is here</h2>
        <ul>
          <li><b>Investigate</b> and the <b>Research board</b>: tools to map a story out yourself.</li>
          <li><b>Media watch</b>: live fact-checks, and a sample of how outlets' corrections could be tracked.</li>
          <li><b>Ask AI</b> (Dhaga): an assistant that answers from the stories on this site and shows its sources.</li>
          <li><b>Take action</b>: example fundraisers and petitions, kept separate from the news.</li>
        </ul>
        <p class="muted" style="font-size:13px">The Red Thread is an independent prototype.</p>
      </section>
      <div><button class="mbtn mt" type="button" data-go="discover">SEE TODAY'S HEADLINES →</button></div>
    </div>`;
  }
  RS.V.how = { mount() {}, show(arg, el) { (el || document.getElementById("v-how")).innerHTML = page(); } };
  RS.V.act = { mount() {}, show() {} };
})();
