/* THE REAL SCROLL — demo data.
   Everything here is ILLUSTRATIVE: hypothetical events, invented outlets, invented documents.
   Nothing in this file describes a real news event, publisher or person. */

window.BRAND = { name: "The Red Thread", short: "Red Thread", ai: "Dhaga", tagline: "Pull the thread. Find the story." };

window.CASE = {
  id: "genz",
  title: "The Delhi Gen Z Protest",
  kicker: "Illustrative case study",
  dek: "Students marched to Jantar Mantar after a national entrance exam paper allegedly leaked. What is established, what is disputed, and what nobody knows yet.",
  updated: "24 Oct 2026",
  status: "Developing",
  happened: "Two days after the (hypothetical) National Common Entrance Test on 12 September, screenshots claiming to show its questions spread on Telegram. Police later arrested four people at two exam centres. Students rallied at Jantar Mantar demanding a full re-test; the testing agency says the breach was limited to two centres.",
  matters: "About 1.8 million candidates took the exam. Whether it is re-held decides admissions timelines, costs for families, and how much young people trust national exams.",
  established: [
    ["Four people were arrested at two exam centres.", ["S4"]],
    ["A court has ordered the agency to report on the alleged leak.", ["S7"]],
    ["The ministry set up a seven-member expert committee.", ["S10"]]
  ],
  uncertain: [
    ["How far the leaked questions spread before the exam.", ["S3", "S8"]],
    ["The protest's size: organisers say 5,000, police say 1,200.", ["S5"]],
    ["Whether a full re-test is fairer than a targeted one.", []]
  ],
  next: ["Read the agency's status report summary (S8) against the screenshots (S3).", "Compare how four outlets framed the same week.", "Follow the 4 November court hearing."],
  background: [
    "Exam paper leaks are a recurring complaint in India's recruitment and entrance tests. A research note compiling news reports counts dozens of reported incidents in state exams between 2019 and 2024, though its method depends on what got reported in the first place [S9].",
    "The hypothetical NCET moved to sealed digital-lock boxes in 2026, which were meant to make early access to papers impossible [S1]. Whether those locks failed, or were bypassed at specific centres, is central to this story."
  ],
  timeline: [
    { d: "2019–24", rep: "", t: "Repeated paper-leak reports across state exams", st: "context", src: ["S9"] },
    { d: "12 Sep", rep: "12 Sep", t: "NCET held for 1.8 million candidates", st: "verified", src: ["S1"] },
    { d: "14 Sep", rep: "14 Sep", t: "Screenshots said to show 18 exam questions circulate on Telegram", st: "unverified", src: ["S3"] },
    { d: "16 Sep", rep: "16 Sep", t: "Agency says there is no evidence of a systemic leak", st: "statement", src: ["S2"] },
    { d: "19 Sep", rep: "19 Sep", t: "Police arrest four people at two exam centres", st: "verified", src: ["S4"] },
    { d: "21 Sep", rep: "21 Sep", t: "Students gather at Jantar Mantar; crowd size disputed", st: "disputed", src: ["S5"] },
    { d: "Dec 2019", rep: "25 Sep", t: "Old lathi-charge video goes viral as if from this protest", st: "misleading", src: ["S6"] },
    { d: "30 Sep", rep: "30 Sep", t: "Court orders agency to file a status report", st: "verified", src: ["S7"] },
    { d: "8 Oct", rep: "8 Oct", t: "Ministry forms a seven-member expert committee", st: "verified", src: ["S10"] },
    { d: "20 Oct", rep: "21 Oct", t: "Agency report: breach at two centres, about 2,400 candidates", st: "partial", src: ["S8"] },
    { d: "24 Oct", rep: "24 Oct", t: "Students repeat demand for full re-test; hearing on 4 Nov", st: "developing", src: ["S5"] }
  ],
  people: [
    { n: "Exam Nyay Manch", role: "Student collective that organised the protest", pos: "Wants a full re-test for all candidates", infl: "Public pressure, petition in court", src: ["S5"] },
    { n: "The testing agency", role: "Runs the NCET", pos: "Targeted re-test only at affected centres", infl: "Controls the exam process", src: ["S2", "S8"] },
    { n: "Education ministry", role: "Oversees the agency", pos: "Waiting for its committee's report", infl: "Final call on any re-test", src: ["S10"] },
    { n: "District police", role: "Investigating the arrests", pos: "Four arrests; inquiry ongoing", infl: "Evidence from seized phones", src: ["S4"] },
    { n: "The court", role: "Hearing the students' petition", pos: "Asked for a status report", infl: "Can order a re-test", src: ["S7"] },
    { n: "Candidates who scored well", role: "Affected group", pos: "Worried a re-test will cost them their rank", infl: "Parents' associations", src: ["S5"] }
  ],
  claims: [
    { id: "C1", text: "The paper leaked nationwide before the exam.", who: "Exam Nyay Manch", when: "15 Sep", src: ["S3"], ev: "Screenshots show 18 questions, said to be timestamped two hours before the exam.", counter: "Timestamps are not independently verified; agency audit found a breach at two centres.", counterSrc: ["S8"], st: "unverified", kind: "Factual claim" },
    { id: "C2", text: "The breach was limited to two centres.", who: "Testing agency", when: "20 Oct", src: ["S8"], ev: "The agency's own audit of digital-lock logs.", counter: "No independent audit yet; where the Telegram screenshots came from is still unknown.", counterSrc: ["S3"], st: "partial", kind: "Factual claim" },
    { id: "C3", text: "A viral video shows police beating protesters at Jantar Mantar.", who: "Social media accounts", when: "25 Sep", src: [], ev: "The video was shared widely with this caption.", counter: "A reverse image search found the same footage published in December 2019.", counterSrc: ["S6"], st: "misleading", kind: "Factual claim" },
    { id: "C4", text: "5,000 students joined the protest.", who: "Organisers (police said 1,200)", when: "21 Sep", src: ["S5"], ev: "Organisers' estimate.", counter: "Police estimate of 1,200; the reporter on the ground wrote 'several thousand'.", counterSrc: ["S5"], st: "disputed", kind: "Factual claim" },
    { id: "C5", text: "Four people were arrested at two exam centres.", who: "District police", when: "19 Sep", src: ["S4"], ev: "FIR and police press note name the centres and charges.", counter: "None found.", counterSrc: [], st: "verified", kind: "Factual claim" },
    { id: "C6", text: "A full re-test would delay admissions by two months.", who: "Ministry official", when: "22 Oct", src: ["S10"], ev: "Based on the 2026 admissions calendar.", counter: "Depends on how fast a re-test can be scheduled; no plan published.", counterSrc: [], st: "prediction", kind: "Prediction" }
  ],
  contradictions: [["C1", "C2"], ["C3", "S6"]],
  coverage: [
    { outlet: "Channel Alpha", type: "TV", lang: "Hindi", date: "21 Sep", hl: "Students' fury: was the whole paper leaked?", emph: "Protest visuals and student interviews", cites: ["S3"], has: "The four arrests", lacks: "The agency's position that the breach was limited", note: "Headline repeats claim C1 as a question without the agency's response." },
    { outlet: "The Beta Bulletin", type: "Print", lang: "English", date: "21 Oct", hl: "Leak confined to two centres, says agency; students unconvinced", emph: "The agency's status report", cites: ["S8", "S4", "S5"], has: "Both sides' positions and the court timeline", lacks: "How the Telegram screenshots were (or weren't) verified", note: "Attributes the two-centre finding to the agency rather than stating it as fact." },
    { outlet: "Gamma Digital", type: "Digital", lang: "English / Hindi", date: "26 Sep", hl: "We traced the viral protest video. It's from 2019.", emph: "Verification of viral material", cites: ["S3", "S6"], has: "Methods used to check the video and screenshots", lacks: "The ministry's expert committee", note: "Focuses on verification rather than the policy question." },
    { outlet: "Delta Samachar", type: "Print", lang: "Marathi", date: "23 Oct", hl: "Rural candidates fear the cost of a re-test", emph: "Travel and coaching costs for rural families", cites: [], has: "Interviews with candidates from three districts", lacks: "The court timeline", note: "The only outlet in this sample centred on rural candidates." }
  ],
  questions: [
    "How many candidates saw leaked questions before the exam?",
    "Who took the photographs, and how did they reach Telegram?",
    "Why didn't the digital-lock boxes prevent early access?",
    "Would a full re-test be fairer for rural candidates, or less fair?",
    "Will the expert committee's report be made public?"
  ],
  sources: {
    S1: { title: "NCET 2026 information bulletin", type: "Primary document", date: "2 Jun 2026", by: "Testing agency", ex: "Exam on 12 September. 1.8 million registered candidates. Papers delivered in sealed digital-lock boxes that open 30 minutes before the exam." },
    S2: { title: "Agency press statement", type: "Official statement", date: "16 Sep 2026", by: "Testing agency", ex: "There is no evidence of a systemic leak. Isolated incidents reported on social media are being examined." },
    S3: { title: "Archive of Telegram screenshots", type: "Social media (unverified)", date: "14 Sep 2026", by: "Collected by Gamma Digital", ex: "Images showing 18 questions. Embedded timestamps suggest two hours before the exam; the timestamps have not been independently verified." },
    S4: { title: "District police FIR and press note", type: "Primary record", date: "19 Sep 2026", by: "District police", ex: "Four persons arrested at two exam centres for possessing photographs of the question paper." },
    S5: { title: "Ground report from Jantar Mantar", type: "On-the-ground reporting", date: "21 Sep 2026", by: "The Beta Bulletin", ex: "Reporter's estimate: several thousand. Organisers said 5,000; police said 1,200. Updated 24 Oct with the renewed re-test demand." },
    S6: { title: "Fact-check: viral protest video", type: "Independent fact-check", date: "26 Sep 2026", by: "Gamma Digital verification desk", ex: "Reverse image search matches footage first published in December 2019 at an unrelated protest." },
    S7: { title: "Court order on the students' petition", type: "Court record", date: "30 Sep 2026", by: "The court", ex: "The agency is directed to file a status report on the alleged leak within three weeks. Next hearing: 4 November." },
    S8: { title: "Agency status report (summary)", type: "Official document", date: "20 Oct 2026", by: "Testing agency", ex: "Unauthorised access confirmed at two centres, affecting about 2,400 candidates. Targeted re-test proposed for those centres." },
    S9: { title: "Paper leaks in India, 2019–2024 (research note)", type: "Research", date: "Mar 2025", by: "Sample policy research group", ex: "Compiles reported leak incidents across state exams. Limitation: relies on incidents that were covered by the press." },
    S10: { title: "Ministry notification: expert committee", type: "Primary document", date: "8 Oct 2026", by: "Education ministry", ex: "Seven-member committee to review exam security. Report due within 60 days." }
  },
  quiz: [
    { q: "\"Four people were arrested at two exam centres.\" What is this?", a: ["A verified fact", "An allegation", "An opinion"], ok: 0, why: "It's backed by a primary police record (S4)." },
    { q: "\"The paper leaked nationwide.\" What is this, right now?", a: ["A verified fact", "An unverified claim", "A prediction"], ok: 1, why: "It rests on screenshots whose timestamps haven't been checked (S3), and the agency's audit points the other way (S8)." },
    { q: "The viral lathi-charge video is…", a: ["From this protest", "Real footage, wrong context", "Computer-generated"], ok: 1, why: "The footage is real but from a 2019 protest (S6). That makes it misleading without context." },
    { q: "Why are there two crowd numbers?", a: ["One is a typo", "Organisers and police counted differently", "The protest happened twice"], ok: 1, why: "Organisers said 5,000, police said 1,200 (S5). It's disputed, not settled." },
    { q: "\"A re-test would delay admissions by two months\" is…", a: ["A prediction", "A verified fact", "A court finding"], ok: 0, why: "It's a forecast from a ministry official, not something that has happened." }
  ]
};

window.BRIEFS = [
  { id: "upi", title: "Draft fee on large UPI payments", cat: "Economy", kicker: "Illustrative brief", dek: "A draft paper suggests a small charge on UPI transfers above ₹2,000 to fund fraud checks. Comments close 30 November.", status: "Brief", updated: "22 Oct 2026" },
  { id: "glacier", title: "Himalayan water stress by 2050", cat: "Environment", kicker: "Illustrative brief", dek: "A study of 200 glaciers finds faster melting than expected, with river flows likely to drop after mid-century.", status: "Brief", updated: "19 Oct 2026" },
  { id: "lang", title: "Board exams in 12 regional languages", cat: "Education", kicker: "Illustrative brief", dek: "Students can write answers in any of 12 listed languages from 2027. Who grades them, and how?", status: "Brief", updated: "17 Oct 2026" }
];

window.PUBS = [
  { id: "lens", name: "Bengaluru Local Lens", by: "Sample author: Ananya R.", desc: "Ward-level stories from Bengaluru, with the documents attached.", color: "#2D4BD8", topics: ["Local", "Civic"] },
  { id: "court", name: "The Courtroom Explainer", by: "Sample author: Faraz K.", desc: "What court orders actually say, in plain language.", color: "#7A64B8", topics: ["Law"] },
  { id: "climate", name: "India's Climate Notebook", by: "Sample author: Meera S.", desc: "Climate policy, one dataset at a time.", color: "#3E8E5A", topics: ["Environment"] }
];

window.SAMPLE_POSTS = [
  { id: "p1", pub: "court", title: "What a 'status report' order actually means", dek: "The court didn't rule on the leak. It asked for information. Here's why that matters for the 4 November hearing.", date: "1 Oct 2026", format: "Article", srcCount: 2, mastery: "Analyst", sources: ["S7"], body: "<p>When a court orders a status report, it is asking one side to put its facts on record. It is not a finding that anything happened.</p><p>In this case the agency had three weeks [S7]. The real test is whether the report is shared with the petitioners.</p>" },
  { id: "p2", pub: "lens", title: "Bengaluru's NCET centres: what we checked", dek: "None of the city's 41 centres appear in the agency's breach list. We asked how that was determined.", date: "22 Oct 2026", format: "Research brief", srcCount: 1, mastery: "Researcher", sources: ["S8"], body: "<p>The agency's summary names two centres [S8]. We wrote to ask how the other centres were cleared. No reply yet.</p>" },
  { id: "p3", pub: "climate", title: "Reading a glacier study without panicking", dek: "Three numbers worth understanding before you share that chart.", date: "20 Oct 2026", format: "Visual story", srcCount: 0, mastery: "Informed", sources: [], body: "<p>Illustrative post. Glacier projections come with ranges, not single numbers.</p>" }
];

window.ORGS = [
  { id: "alpha", name: "Channel Alpha", type: "TV", lang: "Hindi", own: "Sample parent: Alpha Media Holdings (illustrative)", status: "Findings on record", reviewed: 6, subst: 2, unresolved: 1, corrected: 1, concern: 412,
    records: [
      { id: "R1", claim: "Aired the 2019 lathi-charge video as footage from Jantar Mantar.", date: "25 Sep 2026", outcome: "corrected", sev: "Medium", evidence: ["S6"], response: "On-air correction issued on 27 Sep.", reviewer: "Sample reviewer 2", rdate: "28 Sep 2026" },
      { id: "R2", claim: "Said the 'entire paper leaked in 20 states'.", date: "15 Sep 2026", outcome: "unsupported", sev: "High", evidence: ["S8", "S3"], response: "\"We reported what students told us.\" No correction.", reviewer: "Sample reviewer 1", rdate: "22 Oct 2026" },
      { id: "R3", claim: "Reported that the testing agency's chief had resigned.", date: "18 Sep 2026", outcome: "review", sev: "Medium", evidence: [], response: "Awaiting publisher response.", reviewer: "—", rdate: "—" }
    ] },
  { id: "beta", name: "The Beta Bulletin", type: "Print", lang: "English", own: "Sample parent: Beta Publishing Trust (illustrative)", status: "No substantiated findings", reviewed: 4, subst: 0, unresolved: 1, corrected: 0, concern: 96,
    records: [
      { id: "R4", claim: "Headline stated 'Leak confined to two centres' as settled fact in an early web version.", date: "20 Oct 2026", outcome: "partial", sev: "Low", evidence: ["S8"], response: "Headline updated to attribute the claim to the agency.", reviewer: "Sample reviewer 3", rdate: "23 Oct 2026" }
    ] },
  { id: "gamma", name: "Gamma Digital", type: "Digital", lang: "English / Hindi", own: "Reader-funded (illustrative)", status: "Insufficient assessed evidence", reviewed: 1, subst: 0, unresolved: 1, corrected: 0, concern: 58,
    records: [
      { id: "R5", claim: "Community report: screenshot archive includes an image from a different exam.", date: "16 Sep 2026", outcome: "review", sev: "Low", evidence: ["S3"], response: "Publisher says it is re-checking the archive.", reviewer: "—", rdate: "—" }
    ] },
  { id: "delta", name: "Delta Samachar", type: "Print", lang: "Marathi", own: "Sample family-owned group (illustrative)", status: "Insufficient assessed evidence", reviewed: 0, subst: 0, unresolved: 0, corrected: 0, concern: 12, records: [] }
];

window.OUTCOMES = {
  substantiated: "Substantiated", partial: "Partially substantiated", misleading: "Misleading without important context", unsupported: "Unsupported",
  contradicted: "Contradicted by strong evidence", inconclusive: "Inconclusive", corrected: "Corrected by publisher", review: "Under review"
};
