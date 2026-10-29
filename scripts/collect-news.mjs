// THE RED THREAD — live news collector.
// Pulls Indian outlets' public RSS feeds, keeps only headline + short snippet + link (never full articles),
// groups headlines about the same event into stories, finds the place and topic, counts coverage by each
// outlet's (provisional) lean, and writes live/news.json and live/news.js for the site.
// Run: node scripts/collect-news.mjs   (Node 18+, no packages needed)
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "live");
const cfg = JSON.parse(await readFile(path.join(here, "outlets.json"), "utf8"));
const UA = "Mozilla/5.0 (compatible; RedThreadNewsBot/0.1; headlines and links only)";
const WINDOW_H = 48, SNIP = 220;

/* ---------- fetching and parsing ---------- */
async function get(url) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try { const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" }, signal: ctl.signal, redirect: "follow" }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.text(); }
  finally { clearTimeout(t); }
}
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
const decode = s => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const strip = s => decode(decode(s)).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const tag = (block, name) => { const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i")); return m ? m[1] : ""; };
// the photo the outlet itself attached to the item: media:content / media:thumbnail / enclosure / first <img>
function imageOf(b) {
  const cands = [];
  for (const m of b.matchAll(/<media:(?:content|thumbnail)\b([^>]*)>/gi)) { const u = (m[1].match(/url="([^"]+)"/i) || [])[1], w = +((m[1].match(/width="(\d+)"/i) || [])[1] || 0), t = (m[1].match(/(?:type|medium)="([^"]+)"/i) || [])[1] || "image"; if (u && /image/i.test(t)) cands.push([decode(u), w]); }
  for (const m of b.matchAll(/<enclosure\b([^>]*)>/gi)) { const u = (m[1].match(/url="([^"]+)"/i) || [])[1], t = (m[1].match(/type="([^"]+)"/i) || [])[1] || ""; if (u && (/image/i.test(t) || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u) || /toiimg|imgsize/i.test(u))) cands.push([decode(u), 0]); }
  const html = decode(decode(b)); const im = html.match(/<img[^>]+src=["']([^"']+)["']/i); if (im) cands.push([im[1], 0]);
  const ok = cands.filter(([u]) => /^https:\/\//i.test(u) && !/(pixel|tracking|feedburner|1x1|spacer|logo)/i.test(u));
  if (!ok.length) return "";
  ok.sort((a, b) => b[1] - a[1]); return ok[0][0].replace(/&amp;/g, "&");
}
function parse(xml) {
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(m => m[0]);
  const entries = items.length ? [] : [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map(m => m[0]);
  return [...items, ...entries].map(b => {
    let link = strip(tag(b, "link"));
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ""; }
    if (!/^https?:\/\//.test(link)) { const g = strip(tag(b, "guid")); if (/^https?:\/\//.test(g)) link = g; }
    const when = strip(tag(b, "pubDate") || tag(b, "dc:date") || tag(b, "published") || tag(b, "updated"));
    const snip = strip(tag(b, "description") || tag(b, "summary") || tag(b, "content:encoded") || tag(b, "content"));
    return { title: strip(tag(b, "title")), link: link.trim(), image: imageOf(b), time: Date.parse(when) || 0, snippet: snip.length > SNIP ? snip.slice(0, SNIP).replace(/\s+\S*$/, "") + "…" : snip };
  }).filter(a => a.title && /^https?:\/\//.test(a.link));
}

/* ---------- words, places, topics ---------- */
const STOP = new Set(("a an the of in on at to for from by with and or but as is are was were be been being has have had it its this that these those after before over under into about amid against says said say will would can could may might not no new news india indian also more than up out who what when where why how all any one two three four five first last year years day days week today live updates update latest report reports video watch photos read here his her their they them our we you he she him over off top big key amid via per vs".split(" ")));
const words = s => s.toLowerCase().replace(/[’']s\b/g, "").replace(/[^a-z0-9ऀ-ॿ ]+/g, " ").split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w)).map(w => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss")) ? w.slice(0, -1) : w);
const PLACES = [
  ["New Delhi", 28.61, 77.21], ["Delhi", 28.61, 77.21], ["Mumbai", 19.08, 72.88], ["Kolkata", 22.57, 88.36], ["Chennai", 13.08, 80.27], ["Bengaluru", 12.97, 77.59], ["Bangalore", 12.97, 77.59],
  ["Hyderabad", 17.39, 78.49], ["Ahmedabad", 23.02, 72.57], ["Pune", 18.52, 73.86], ["Jaipur", 26.91, 75.79], ["Lucknow", 26.85, 80.95], ["Patna", 25.59, 85.14], ["Bhopal", 23.26, 77.41],
  ["Chandigarh", 30.73, 76.78], ["Srinagar", 34.08, 74.8], ["Jammu", 32.73, 74.86], ["Guwahati", 26.14, 91.74], ["Imphal", 24.81, 93.94], ["Thiruvananthapuram", 8.52, 76.94], ["Kochi", 9.93, 76.27],
  ["Bhubaneswar", 20.3, 85.82], ["Ranchi", 23.34, 85.31], ["Raipur", 21.25, 81.63], ["Dehradun", 30.32, 78.03], ["Shimla", 31.1, 77.17], ["Panaji", 15.49, 73.83], ["Visakhapatnam", 17.69, 83.22],
  ["Vijayawada", 16.51, 80.65], ["Noida", 28.54, 77.39], ["Gurugram", 28.46, 77.03], ["Varanasi", 25.32, 82.97], ["Ayodhya", 26.8, 82.2], ["Indore", 22.72, 75.86], ["Nagpur", 21.15, 79.09],
  ["Surat", 21.17, 72.83], ["Kanpur", 26.45, 80.33], ["Agra", 27.18, 78.01], ["Amritsar", 31.63, 74.87], ["Ladakh", 34.15, 77.58], ["Leh", 34.15, 77.58], ["Kashmir", 34.08, 74.8],
  ["Manipur", 24.66, 93.91], ["Assam", 26.2, 92.94], ["Kerala", 10.85, 76.27], ["Tamil Nadu", 11.13, 78.66], ["Karnataka", 15.32, 75.71], ["Maharashtra", 19.75, 75.71], ["Gujarat", 22.26, 71.19],
  ["Rajasthan", 27.02, 74.22], ["Uttar Pradesh", 26.85, 80.91], ["Bihar", 25.1, 85.31], ["West Bengal", 22.99, 87.85], ["Bengal", 22.99, 87.85], ["Odisha", 20.95, 85.1], ["Jharkhand", 23.61, 85.28],
  ["Chhattisgarh", 21.28, 81.87], ["Madhya Pradesh", 23.47, 77.95], ["Punjab", 31.15, 75.34], ["Haryana", 29.06, 76.09], ["Himachal", 31.1, 77.17], ["Uttarakhand", 30.07, 79.02], ["Telangana", 18.11, 79.02],
  ["Andhra Pradesh", 15.91, 79.74], ["Sikkim", 27.53, 88.51], ["Arunachal", 28.22, 94.73], ["Meghalaya", 25.47, 91.37], ["Mizoram", 23.16, 92.94], ["Nagaland", 26.16, 94.56], ["Tripura", 23.94, 91.99],
  ["Puducherry", 11.94, 79.81], ["Goa", 15.49, 73.83], ["Andaman", 11.62, 92.73]
].map(([n, lat, lon]) => ({ n, lat, lon, re: new RegExp(`\\b${n.replace(/ /g, "\\s+")}\\b`, "i") }));
const TOPICS = [
  ["Politics", /\b(BJP|Congress|AAP|TMC|DMK|election|polls?|minister|Modi|Rahul Gandhi|Lok Sabha|Rajya Sabha|assembly|party|opposition|chief minister|CM)\b/i],
  ["Justice", /\b(police|arrest(ed)?|court|Supreme Court|High Court|HC|SC|murder|rape|assault|FIR|CBI|ED|bail|verdict|accused|probe)\b/i],
  ["Disaster", /\b(flood|floods|cyclone|landslide|earthquake|cloudburst|rain|monsoon|IMD|heatwave|fire)\b/i],
  ["Environment", /\b(pollution|AQI|air quality|climate|forest|wildlife|river|smog)\b/i],
  ["Economy", /\b(RBI|GDP|inflation|Sensex|Nifty|market|tax|GST|rupee|budget|bank|stocks?|economy|jobs|startup)\b/i],
  ["Health", /\b(hospital|health|disease|dengue|malaria|covid|doctor|medical|AIIMS|vaccine)\b/i],
  ["Education", /\b(exam|NEET|JEE|students?|university|school|CBSE|UGC|college|teachers?)\b/i],
  ["World", /\b(Pakistan|China|US|USA|Trump|Russia|Ukraine|Israel|Gaza|Bangladesh|Nepal|Sri Lanka|UN)\b/i],
  ["Sports", /\b(cricket|IPL|BCCI|Test match|ODI|T20|football|hockey|Olympic|chess)\b/i],
  ["Tech", /\b(AI|tech|technology|smartphone|app|cyber|ISRO|satellite|space)\b/i]
];
const topicOf = t => (TOPICS.find(([, re]) => re.test(t)) || ["India"])[0];
const placeOf = texts => { const score = new Map(); texts.forEach((t, i) => PLACES.forEach(p => { if (p.re.test(t)) score.set(p, (score.get(p) || 0) + (i === 0 ? 3 : 1)); })); let best = null; score.forEach((v, p) => { if (!best || v > best[1]) best = [p, v]; }); return best && best[0]; };
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(36); };

/* ---------- collect ---------- */
const since = Date.now() - WINDOW_H * 3600e3, report = [];
const outletById = Object.fromEntries(cfg.outlets.map(o => [o.id, o]));
const pull = async (src, isFc) => {
  try { const items = parse(await get(src.feed)).filter(a => !a.time || a.time >= since).slice(0, 60).map(a => ({ ...a, outlet: src.id, time: a.time || Date.now() })); report.push(`${isFc ? "fact-check" : "outlet"}  ${src.name}: ${items.length}`); return items; }
  catch (e) { report.push(`${isFc ? "fact-check" : "outlet"}  ${src.name}: failed (${e.message})`); return []; }
};
const [articlesRaw, fcRaw] = await Promise.all([Promise.all(cfg.outlets.map(o => pull(o))), Promise.all(cfg.factcheckers.map(f => pull(f, true)))]);
const seen = new Set();
const articles = articlesRaw.flat().filter(a => { const k = a.link.split("?")[0]; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => b.time - a.time);
articles.forEach(a => { a.kw = new Set(words(a.title)); });

/* ---------- group into stories (same event, different outlets) ---------- */
const sim = (A, B) => { let s = 0; A.forEach(w => { if (B.has(w)) s++; }); return [s, s / Math.max(1, Math.min(A.size, B.size))]; };
const clusters = [];
for (const a of articles) {
  let best = null;
  for (const c of clusters) for (const m of c) { const [s, r] = sim(a.kw, m.kw); if ((s >= 3 && r >= .4) || (s >= 2 && r >= .6)) { if (!best || r > best[1]) best = [c, r]; } }
  if (best) best[0].push(a); else clusters.push([a]);
}
const LEANS = ["L", "LL", "C", "LR", "R", "U"];
const stories = clusters.map(c => {
  const outlets = [...new Set(c.map(a => a.outlet))];
  const lead = c.slice().sort((x, y) => c.reduce((s, m) => s + sim(y.kw, m.kw)[0], 0) - c.reduce((s, m) => s + sim(x.kw, m.kw)[0], 0) || y.time - x.time)[0];
  const cov = Object.fromEntries(LEANS.map(k => [k, 0])); c.forEach(a => cov[(outletById[a.outlet] || {}).lean || "U"]++);
  const byLean = ls => c.filter(a => ls.includes((outletById[a.outlet] || {}).lean));
  const p = placeOf([lead.title, ...c.map(a => a.title), ...c.map(a => a.snippet)]);
  const L = byLean(["L", "LL"]), R = byLean(["R", "LR"]), C = byLean(["C"]);
  return {
    id: "live-" + hash(lead.link), live: true, title: lead.title, image: (lead.image ? lead : c.find(a => a.image) || {}).image || "", imageBy: (lead.image ? lead : c.find(a => a.image) || {}).outlet || "", cat: topicOf(c.map(a => a.title).join(" ")),
    place: p ? p.n : "India", lat: p ? p.lat : null, lon: p ? p.lon : null,
    firstSeen: Math.min(...c.map(a => a.time)), lastSeen: Math.max(...c.map(a => a.time)), outletCount: outlets.length,
    sum: (c.length > 1 ? [...new Map(c.map(a => [a.outlet, a])).values()].slice(0, 3).map(a => `${outletById[a.outlet].name}: ${a.title}`) : [lead.snippet || lead.title]).filter(Boolean),
    L: L.slice(0, 2).map(a => `${outletById[a.outlet].name}: “${a.title}”`), R: R.slice(0, 2).map(a => `${outletById[a.outlet].name}: “${a.title}”`),
    hl: { L: L[0] ? L[0].title : "", C: (C[0] || lead).title, R: R[0] ? R[0].title : "" }, cov,
    articles: c.slice(0, 12).map(({ title, link, time, snippet, outlet, image }) => ({ outlet, title, link, time, snippet, image }))
  };
}).sort((a, b) => b.outletCount - a.outletCount || b.lastSeen - a.lastSeen);
const multi = stories.filter(s => s.outletCount >= 2), single = stories.filter(s => s.outletCount < 2);
const keep = [...multi.slice(0, 60), ...single.slice(0, Math.max(0, 80 - Math.min(60, multi.length)))];
const factchecks = fcRaw.flat().sort((a, b) => b.time - a.time).slice(0, 15).map(({ title, link, time, snippet, outlet }) => ({ outlet, name: (cfg.factcheckers.find(f => f.id === outlet) || {}).name, title, link, time, snippet }));

const out = { updated: new Date().toISOString(), windowHours: WINDOW_H, note: cfg._note, outlets: cfg.outlets.map(({ id, name, lean }) => ({ id, name, lean })), counts: { articles: articles.length, stories: keep.length, multiOutlet: multi.length }, stories: keep, factchecks };
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "news.json"), JSON.stringify(out));
await writeFile(path.join(OUT, "news.js"), "window.LIVE = " + JSON.stringify(out).replace(/</g, "\\u003c") + ";\n");
console.log(report.join("\n"));
console.log(`Photos: ${articles.filter(a => a.image).length} of ${articles.length} headlines, ${keep.filter(s => s.image).length} of ${keep.length} stories.`);
console.log(`\n${articles.length} articles → ${stories.length} stories (${multi.length} covered by 2+ outlets). Kept ${keep.length}. Fact-checks: ${factchecks.length}.`);
console.log("Top stories:\n" + multi.slice(0, 8).map(s => `  [${s.outletCount} outlets] ${s.place} · ${s.cat} · ${s.title}`).join("\n"));
