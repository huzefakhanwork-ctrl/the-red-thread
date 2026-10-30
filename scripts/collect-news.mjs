// THE RED THREAD — live news collector.
// Pulls Indian outlets' public RSS feeds (plus, optionally, GDELT's index of Indian news pages), keeps only
// headline + short snippet + link + photo (never full articles), groups headlines about the same event into
// stories, finds the place and topic, counts coverage by each outlet's (provisional) lean — one outlet, one
// vote — and writes live/news.json and live/news.js for the site.
// Run: node scripts/collect-news.mjs   (Node 18+, no packages needed)
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const T0 = Date.now();
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "live");
const cfg = JSON.parse(await readFile(path.join(here, "outlets.json"), "utf8"));
const UA = "Mozilla/5.0 (compatible; RedThreadNewsBot/0.1; headlines and links only)";
const WINDOW_H = 48, SNIP = 220, GDELT_H = 24, GDELT_BUDGET_MS = 75000;

/* ---------- fetching and parsing ---------- */
async function get(url) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try { const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" }, signal: ctl.signal, redirect: "follow" }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.text(); }
  finally { clearTimeout(t); }
}
// run fn over items, at most n at a time (polite to the outlets, and keeps memory flat)
async function mapLimit(arr, n, fn) { const out = new Array(arr.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, arr.length) }, async () => { while (i < arr.length) { const k = i++; out[k] = await fn(arr[k], k); } })); return out; }
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", rupee: "₹" };
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
// one key per article page, whatever tracking, amp or mobile variant a feed links to
const normUrl = u => String(u || "").toLowerCase().replace(/^https?:\/\/(www\.|m\.|amp\.)?/, "").split(/[?#]/)[0].replace(/amp_articleshow/, "articleshow").replace(/\/amp\/?$/, "").replace(/\/+$/, "");
const hostOf = u => { try { return new URL(u).hostname.toLowerCase().replace(/^(www\d?|m|amp)\./, ""); } catch { return ""; } };
const isHindi = s => /[ऀ-ॿ]/.test(s);

/* ---------- words, places, topics ---------- */
const STOP = new Set(("a an the of in on at to for from by with and or but as is are was were be been being has have had it its this that these those after before over under into about amid against says said say will would can could may might not no new news india indian also more than up out who what when where why how all any one two three four five first last year years day days week today live updates update latest report reports video watch photos read here his her their they them our we you he she him off top big key via per vs just now get gets know check full list details explained explainer opinion exclusive breaking ahead set make makes made take takes come comes back like amid during while near since still yet very much many most such only own other some each every next".split(" ")));
const STOP_HI = new Set("के का की को में है हैं और से पर ने भी यह इस एक था थे थी लिए कि तो ही नहीं अब तक साथ बाद कर करने किया गया गई गए होगा हुआ हुई हो रहा रही रहे वाले वाला वाली दिया लेकर बीच बड़ा बड़ी अपने अपनी उनके उन्होंने जब तब क्या कैसे क्यों कौन कहा बोले लाइव खबर ख़बर न्यूज़ न्यूज आज वो वह ये या हर सकते सकता जा जाएगा जाएगी पहले बार दो तीन".split(" "));
const stem = w => /[ऀ-ॿ]/.test(w) ? w : w.length > 4 && w.endsWith("ies") ? w.slice(0, -3) + "y" : (w.length > 4 && w.endsWith("s") && !w.endsWith("ss")) ? w.slice(0, -1) : w;
// tokens of a text; `proper` marks capitalised words / acronyms / numbers (distinctive names) unless the whole headline is in Title Case
const SYN = [[/\bSupreme Court\b/gi, "SC"], [/\bHigh Court\b/gi, "HC"], [/\b(choppers?|copters?|helicopters?)\b/gi, "helicopter"], [/\bgovt\.?/gi, "government"], [/\boppn\b/gi, "opposition"], [/\bU\.P\.|\bUttar Pradesh\b/g, "UP"], [/\bElection Commission( of India)?\b|\bECI\b/gi, "EC"], [/\bPrime Minister\b/gi, "PM"], [/\bChief Minister\b/gi, "CM"], [/\bIsro\b/g, "ISRO"], [/\bRs\.?\s?|₹/g, ""], [/हेलीकॉप्टर|हेलिकॉप्टर/g, "हेलिकॉप्टर"], [/बदरीनाथ/g, "बद्रीनाथ"]];
function tokens(s) {
  SYN.forEach(([re, to]) => { s = String(s || "").replace(re, to); });
  const raw = String(s || "").replace(/[’']s\b/g, "").split(/[^A-Za-z0-9ऀ-ॿ]+/).filter(Boolean);
  const caps = raw.filter(w => /^[A-Z]/.test(w)).length, titleCase = raw.length > 3 && caps / raw.length > .6;
  const out = [];
  raw.forEach((w, i) => {
    const lw = w.toLowerCase(); const hi = /[ऀ-ॿ]/.test(w);
    if (hi ? (w.length < 2 || STOP_HI.has(w)) : (lw.length < 3 && !/^\d{2,}$/.test(lw) && !/^[A-Z]{2}$/.test(w)) || STOP.has(lw)) return;
    const proper = !hi && (/^[A-Z]{2,}$/.test(w) || /\d/.test(w) || (!titleCase && i > 0 && /^[A-Z]/.test(w)));
    out.push([stem(lw), proper]);
  });
  return out;
}
const STATE_OF = { "New Delhi": "Delhi", Noida: "Uttar Pradesh", Gurugram: "Haryana", Mumbai: "Maharashtra", Pune: "Maharashtra", Nagpur: "Maharashtra", Kolkata: "West Bengal", Bengal: "West Bengal", Chennai: "Tamil Nadu", Bengaluru: "Karnataka", Bangalore: "Karnataka", Hyderabad: "Telangana", Ahmedabad: "Gujarat", Surat: "Gujarat", Jaipur: "Rajasthan", Lucknow: "Uttar Pradesh", Varanasi: "Uttar Pradesh", Ayodhya: "Uttar Pradesh", Kanpur: "Uttar Pradesh", Agra: "Uttar Pradesh", Patna: "Bihar", Bhopal: "Madhya Pradesh", Indore: "Madhya Pradesh", Srinagar: "Kashmir", Jammu: "Kashmir", Leh: "Ladakh", Guwahati: "Assam", Imphal: "Manipur", Thiruvananthapuram: "Kerala", Kochi: "Kerala", Bhubaneswar: "Odisha", Ranchi: "Jharkhand", Raipur: "Chhattisgarh", Dehradun: "Uttarakhand", Shimla: "Himachal", Panaji: "Goa", Visakhapatnam: "Andhra Pradesh", Vijayawada: "Andhra Pradesh", Amritsar: "Punjab", Chandigarh: "Punjab" };
const PLACES = [
  ["New Delhi", 28.61, 77.21], ["Delhi", 28.61, 77.21, "दिल्ली"], ["Mumbai", 19.08, 72.88, "मुंबई"], ["Kolkata", 22.57, 88.36, "कोलकाता"], ["Chennai", 13.08, 80.27, "चेन्नई"], ["Bengaluru", 12.97, 77.59, "बेंगलुरु"], ["Bangalore", 12.97, 77.59],
  ["Hyderabad", 17.39, 78.49, "हैदराबाद"], ["Ahmedabad", 23.02, 72.57, "अहमदाबाद"], ["Pune", 18.52, 73.86, "पुणे"], ["Jaipur", 26.91, 75.79, "जयपुर"], ["Lucknow", 26.85, 80.95, "लखनऊ"], ["Patna", 25.59, 85.14, "पटना"], ["Bhopal", 23.26, 77.41, "भोपाल"],
  ["Chandigarh", 30.73, 76.78], ["Srinagar", 34.08, 74.8], ["Jammu", 32.73, 74.86], ["Guwahati", 26.14, 91.74], ["Imphal", 24.81, 93.94], ["Thiruvananthapuram", 8.52, 76.94], ["Kochi", 9.93, 76.27],
  ["Bhubaneswar", 20.3, 85.82], ["Ranchi", 23.34, 85.31], ["Raipur", 21.25, 81.63], ["Dehradun", 30.32, 78.03], ["Shimla", 31.1, 77.17], ["Panaji", 15.49, 73.83], ["Visakhapatnam", 17.69, 83.22],
  ["Vijayawada", 16.51, 80.65], ["Noida", 28.54, 77.39], ["Gurugram", 28.46, 77.03], ["Varanasi", 25.32, 82.97], ["Ayodhya", 26.8, 82.2], ["Indore", 22.72, 75.86], ["Nagpur", 21.15, 79.09],
  ["Surat", 21.17, 72.83], ["Kanpur", 26.45, 80.33], ["Agra", 27.18, 78.01], ["Amritsar", 31.63, 74.87], ["Ladakh", 34.15, 77.58], ["Leh", 34.15, 77.58], ["Kashmir", 34.08, 74.8, "कश्मीर"],
  ["Manipur", 24.66, 93.91, "मणिपुर"], ["Assam", 26.2, 92.94, "असम"], ["Kerala", 10.85, 76.27, "केरल"], ["Tamil Nadu", 11.13, 78.66, "तमिलनाडु"], ["Karnataka", 15.32, 75.71, "कर्नाटक"], ["Maharashtra", 19.75, 75.71, "महाराष्ट्र"], ["Gujarat", 22.26, 71.19, "गुजरात"],
  ["Rajasthan", 27.02, 74.22, "राजस्थान"], ["Uttar Pradesh", 26.85, 80.91, "उत्तर प्रदेश"], ["Bihar", 25.1, 85.31, "बिहार"], ["West Bengal", 22.99, 87.85], ["Bengal", 22.99, 87.85, "बंगाल"], ["Odisha", 20.95, 85.1, "ओडिशा"], ["Jharkhand", 23.61, 85.28, "झारखंड"],
  ["Chhattisgarh", 21.28, 81.87, "छत्तीसगढ़"], ["Madhya Pradesh", 23.47, 77.95, "मध्य प्रदेश"], ["Punjab", 31.15, 75.34, "पंजाब"], ["Haryana", 29.06, 76.09, "हरियाणा"], ["Himachal", 31.1, 77.17, "हिमाचल"], ["Uttarakhand", 30.07, 79.02, "उत्तराखंड"], ["Telangana", 18.11, 79.02, "तेलंगाना"],
  ["Andhra Pradesh", 15.91, 79.74], ["Sikkim", 27.53, 88.51], ["Arunachal", 28.22, 94.73], ["Meghalaya", 25.47, 91.37], ["Mizoram", 23.16, 92.94], ["Nagaland", 26.16, 94.56], ["Tripura", 23.94, 91.99],
  ["Puducherry", 11.94, 79.81], ["Goa", 15.49, 73.83], ["Andaman", 11.62, 92.73]
].map(([n, lat, lon, hi]) => { const re = new RegExp(`\\b${n.replace(/ /g, "\\s+")}\\b${hi ? "|" + hi : ""}`, "i"), cs = n === "Uttar Pradesh" ? /\bUP\b|\bU\.P\./ : null; return { n, lat, lon, st: STATE_OF[n] || n, re: cs ? { test: t => re.test(t) || cs.test(t) } : re }; });
// topics: each signal has a weight; the story's topic is the best-scoring one, ties going to the more specific topic
// (a helicopter crash with a CM's condolences is a Disaster; a rally postponed by rain is Politics)
const MARKET = /\b(Sensex|Nifty|stocks?|shares?|markets?|rupee|crypto|bitcoin|prices?|IPO)\b/i;
const CASEWORD = /\b(bail|verdict|plea|petition|hearing|acquit\w*|convict\w*|sentenc\w*|PIL|contempt|judgment|judgement|quash\w*|stays?|order(s|ed)?|case|bench|CJI|notice)\b/i;
const TOPICS = [
  ["Disaster", [[/\b(crash(es|ed)?|accident|collision|collapsed?|derail\w*|stampede|drown\w*|landslides?|earthquake|tremors?|cyclone|cloudburst|floods?|flooding|tsunami|avalanche|explosion|blaze|caught fire|fire broke out|gutted|NDRF|SDRF|rescue op\w*|mishap|tragedy)\b|हादसा|हादसे|दुर्घटना|क्रैश|बाढ़|भूकंप|भूस्खलन|चक्रवात|भीषण आग/i, 3], [/\b(heavy rain\w*|rainfall|downpour|waterlogging|monsoon|IMD|heatwave|cold wave|fire|killed|dead|deaths?)\b|बारिश|आग/i, 1]]],
  ["Sports", [[/\b(cricket|IPL|BCCI|Test match|ODI|T20I?|World Cup|football|hockey|Olympics?|chess|kabaddi|badminton|tennis|wrestl\w*|boxing|medal|ICC|ISL|FIFA)\b|क्रिकेट|टी20|विश्व कप/i, 3]]],
  ["Health", [[/\b(hospitals?|health|disease|dengue|malaria|covid|doctors?|medical|AIIMS|vaccines?|cancer|outbreak|virus|drugs? regulator|pharma)\b|अस्पताल|स्वास्थ्य|डॉक्टर/i, 2]]],
  ["Education", [[/\b(exams?|NEET|JEE|students?|universit(y|ies)|schools?|CBSE|UGC|colleges?|teachers?|NTA|syllabus)\b|परीक्षा|छात्र|स्कूल/i, 2]]],
  ["Tech", [[/\b(AI(?! Express| \d)|tech|technology|smartphones?|apps?|cyber|ISRO|satellites?|space|NavIC|rocket|startup|semiconductor|5G|data centre)\b|इसरो|सैटेलाइट/i, 2]]],
  ["Environment", [[/\b(pollution|AQI|air quality|climate|forests?|wildlife|tigers?|cheetahs?|leopards?|smog|emissions?|green crackers|stubble)\b|प्रदूषण/i, 2]]],
  ["Economy", [[/\b(RBI|GDP|inflation|Sensex|Nifty|markets?|tax|GST|rupee|budget|banks?|stocks?|shares?|economy|jobs|IPO|exports?|imports?|tariffs?|profit|revenue|earnings|Q[1-4]|investors?|FDI|fiscal)\b|शेयर|बाजार|सेंसेक्स|महंगाई/i, 2]]],
  ["Justice", [[/\b((?<!traffic )police|arrest(s|ed)?|murder\w*|rape\w*|assault\w*|FIR|CBI|ED|NIA|bail|accused|chargesheet|custody|gang|fraud|scam|lynch\w*|kill(s|ed|ing)? by)\b|गिरफ्तार|हत्या|पुलिस|अदालत|कोर्ट/i, 2], [/\b(Supreme Court|High Court|HC|SC|court|judges?|probe|investigation)\b/i, 1]]],
  ["World", [[/\b(Pakistan|China|US|USA|Trump|Russia|Ukraine|Israel|Israeli|Gaza|Iran|Bangladesh|Nepal|Sri Lanka|UN|Hormuz|Taliban|Afghanistan|Netanyahu|Putin|Saudi|G20|NATO)\b|पाकिस्तान|चीन|अमेरिका|ट्रंप/i, 3]]],
  ["Politics", [[/\b(BJP|Congress|AAP|TMC|DMK|AIADMK|TVK|SP|BSP|JDU|RJD|NDA|INDIA bloc|elections?|polls?|bypolls?|voters?|votes?|voting|electoral|SIR|EC|Election Commission|rally|roadshow|campaign\w*|manifesto|MLAs?|MPs?|Lok Sabha|Rajya Sabha|assembly|opposition|Parliament)\b|चुनाव|भाजपा|कांग्रेस|मतदाता|विधानसभा|रैली/i, 2], [/\b(minister|chief minister|CM|Modi|PM|Rahul Gandhi|party|government)\b|मोदी|मंत्री|सरकार/i, 1]]]
];
const ACRONYM = /^(US|UN|ED|SC|HC|EC|SP|PM|CM|AI|IMD|ICC|ISL|NTA|NIA|CBI|FIR|GST|RBI|GDP|FDI|IPO|ISRO|SIR|AAP|TMC|DMK|BJP|BSP|RJD|JDU|NDA|TVK|AIIMS|NEET|JEE|CBSE|UGC|PIL|CJI|NDRF|SDRF|AQI|IPL|BCCI|ODI|FIFA|EC)$/;
function topicScores(t) {
  const sc = {};
  for (const [name, rules] of TOPICS) {
    let s = 0;
    for (const [re, w] of rules) {
      const m = t.match(new RegExp(re.source, "gi")) || [];
      // acronyms only count in capitals ("us" / "ed" / "sc" are ordinary words)
      const hits = m.filter(x => !ACRONYM.test(x.toUpperCase()) || x === x.toUpperCase() || /[ऀ-ॿ]/.test(x));
      if (!hits.length) continue;
      if (name === "Disaster" && w === 3 && MARKET.test(t) && hits.every(x => /^crash/i.test(x))) continue; // "Sensex crashes" is Economy
      if (name === "Justice" && w === 1 && /court|HC|SC|judge/i.test(hits.join(" ")) && CASEWORD.test(t)) s += 2; // a court ruling on a case
      s += w;
    }
    sc[name] = s;
  }
  return sc;
}
function topicOf(titles) {
  const tot = {}; titles.forEach((t, i) => { const sc = topicScores(t); for (const k in sc) tot[k] = (tot[k] || 0) + sc[k] * (i === 0 ? 2 : 1) / (i === 0 ? 1 : Math.max(1, titles.length - 1)); });
  let best = "India", bv = 0; for (const [name] of TOPICS) if ((tot[name] || 0) > bv + 1e-9) { best = name; bv = tot[name]; }
  return bv >= 1.5 ? best : "India"; // a stray weak word in one related headline is not enough
}
const placeOf = texts => { const score = new Map(); texts.forEach((t, i) => PLACES.forEach(p => { if (p.re.test(t)) score.set(p, (score.get(p) || 0) + (i === 0 ? 3 : 1)); })); let best = null; score.forEach((v, p) => { if (!best || v > best[1]) best = [p, v]; }); return best && best[0]; };
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(36); };

/* ---------- outlets ---------- */
const outletById = Object.fromEntries(cfg.outlets.map(o => [o.id, { ...o }]));
const domainToOutlet = new Map();
for (const o of cfg.outlets) {
  const ds = o.domain !== undefined ? [].concat(o.domain).filter(Boolean) : [hostOf(o.feed)].filter(h => h && !/feedburner|bbci|feeds\./.test(h));
  ds.forEach(d => domainToOutlet.set(d.replace(/^www\./, ""), o.id));
}
// other Indian news sites GDELT may see (counted as unrated outlets under these names)
const KNOWN_IN = { "deccanchronicle.com": "Deccan Chronicle", "telegraphindia.com": "The Telegraph", "tribuneindia.com": "The Tribune", "business-standard.com": "Business Standard", "moneycontrol.com": "Moneycontrol", "financialexpress.com": "Financial Express", "news18.com": "News18", "firstpost.com": "Firstpost", "thewire.in": "The Wire", "thestatesman.com": "The Statesman", "dailypioneer.com": "The Pioneer", "wionews.com": "WION", "navbharattimes.indiatimes.com": "Navbharat Times", "livehindustan.com": "Live Hindustan", "jansatta.com": "Jansatta", "lokmattimes.com": "Lokmat Times", "lokmat.com": "Lokmat", "thehansindia.com": "The Hans India", "telanganatoday.com": "Telangana Today", "sentinelassam.com": "The Sentinel", "assamtribune.com": "The Assam Tribune", "newkerala.com": "NewKerala", "devdiscourse.com": "Devdiscourse", "india.com": "India.com", "theweek.in": "The Week", "dailyexcelsior.com": "Daily Excelsior", "orissapost.com": "Orissa Post", "uniindia.com": "UNI", "ptinews.com": "PTI", "aninews.in": "ANI", "mid-day.com": "Mid-day", "thefederal.com": "The Federal", "caravanmagazine.in": "The Caravan", "newsclick.in": "Newsclick", "millenniumpost.in": "Millennium Post", "mumbaimirror.indiatimes.com": "Mumbai Mirror", "punemirror.com": "Pune Mirror", "bangaloremirror.indiatimes.com": "Bangalore Mirror", "ahmedabadmirror.com": "Ahmedabad Mirror", "english.jagran.com": "Jagran English", "hindi.news18.com": "News18 Hindi", "ndtvprofit.com": "NDTV Profit", "indiatimes.com": "Indiatimes", "maharashtratimes.com": "Maharashtra Times", "eisamay.com": "Ei Samay", "anandabazar.com": "Anandabazar Patrika", "manoramaonline.com": "Malayala Manorama", "dinamalar.com": "Dinamalar", "dailythanthi.com": "Daily Thanthi", "eenadu.net": "Eenadu", "sakshi.com": "Sakshi", "prajavani.net": "Prajavani", "gujaratsamachar.com": "Gujarat Samachar", "divyabhaskar.co.in": "Divya Bhaskar", "sandesh.com": "Sandesh", "patrika.com": "Patrika", "prabhatkhabar.com": "Prabhat Khabar", "naidunia.com": "Naidunia", "khaleejtimes.com": "", "theshillongtimes.com": "The Shillong Times", "arunachaltimes.in": "Arunachal Times", "ommcom.com": "OmmCom News", "odishatv.in": "OdishaTV", "kashmirlife.net": "Kashmir Life", "risingkashmir.com": "Rising Kashmir", "babushahi.com": "Babushahi", "yespunjab.com": "Yes Punjab", "goachronicle.com": "Goa Chronicle", "heraldgoa.in": "Herald Goa", "bizzbuzz.news": "BizzBuzz", "newsdrum.in": "NewsDrum", "republicbharat.com": "Republic Bharat", "zeebiz.com": "Zee Business", "ummid.com": "Ummid", "muslimmirror.com": "Muslim Mirror", "clarionindia.net": "Clarion India", "thecommunemag.com": "The Commune", "thedailyguardian.com": "The Daily Guardian", "newsx.com": "NewsX", "inkhabar.com": "InKhabar", "jantaserishta.com": "Janta Se Rishta", "freepressjournal.in": "Free Press Journal", "thequint.com": "The Quint", "businessworld.in": "BusinessWorld" };
delete KNOWN_IN["khaleejtimes.com"];
const WORDS = "the deccan chronicle times news daily india indian express herald post tribune today live hindu star sentinel assam kashmir observer pioneer statesman mail age asian national new bharat samachar hans telangana mirror free press journal business world line money control financial standard guardian sunday week network media report reporter voice odisha bihar punjab kesari lokmat mid day goa first print wire scroll online hub plus khabar patrika prabhat jagran nation now views bulletin current affairs gazette leader story stories digital tv channel radio point view chronicle bureau dispatch insider north east south west central".split(" ").sort((a, b) => b.length - a.length);
// "deccanchronicle.com" → "Deccan Chronicle" (best effort: split the name into known words)
function nameFromDomain(d) {
  if (KNOWN_IN[d]) return KNOWN_IN[d];
  let s = d.replace(/\.(co\.in|org\.in|net\.in|gov\.in|com|in|net|org|news|info|co)$/, "").split(".").pop(), out = [];
  while (s.length) { const w = WORDS.find(w => s.startsWith(w)); if (w) { out.push(w); s = s.slice(w.length); } else { const last = out.length && !WORDS.includes(out[out.length - 1]) ? out.pop() : ""; out.push(last + s[0]); s = s.slice(1); } }
  return out.map(w => w[0].toUpperCase() + w.slice(1)).join(" ").replace(/\bIndia Com\b/, "India.com") || d;
}
const isIndianHost = h => /\.(in|co\.in)$/.test(h) || domainToOutlet.has(h) || !!KNOWN_IN[h] || [...domainToOutlet.keys(), ...Object.keys(KNOWN_IN)].some(d => h.endsWith("." + d));
const outletForHost = h => { for (let x = h; x.includes("."); x = x.slice(x.indexOf(".") + 1)) { if (domainToOutlet.has(x)) return domainToOutlet.get(x); if (KNOWN_IN[x]) return "g-" + x; } return null; };

/* ---------- collect RSS ---------- */
const since = Date.now() - WINDOW_H * 3600e3, report = [];
const clampTime = t => !t ? Date.now() : t > Date.now() + 15 * 60e3 ? Date.now() : t; // a few feeds stamp IST as GMT (dates in the future)
const pull = async (src, isFc, feed = src.feed) => {
  try { const items = parse(await get(feed)).map(a => ({ ...a, time: clampTime(a.time) })).filter(a => a.time >= since).slice(0, 60).map(a => ({ ...a, outlet: src.id, lang: src.lang || (isHindi(a.title) ? "hi" : "en"), src: "rss" })); return { items }; }
  catch (e) { return { items: [], err: e.message }; }
};
const jobs = [...cfg.outlets.flatMap(o => [o.feed, ...(o.extraFeeds || [])].map(f => [o, false, f])), ...cfg.factcheckers.map(f => [f, true, f.feed])];
const got = await mapLimit(jobs, 12, ([o, fc, f]) => pull(o, fc, f));
const perSrc = new Map();
jobs.forEach(([o, fc], i) => { const k = (fc ? "fact-check" : "outlet") + "  " + o.name; const p = perSrc.get(k) || { n: 0, err: [] }; p.n += got[i].items.length; if (got[i].err) p.err.push(got[i].err); perSrc.set(k, p); });
perSrc.forEach((p, k) => report.push(`${k}: ${p.n}${p.err.length ? ` (failed: ${p.err.join(", ")})` : ""}`));
const rssArticles = jobs.flatMap(([, fc], i) => fc ? [] : got[i].items), fcRaw = jobs.flatMap(([, fc], i) => fc ? got[i].items : []);
const seen = new Set();
const articles = rssArticles.filter(a => { const k = normUrl(a.link); if (seen.has(k)) return false; seen.add(k); return true; });
const rssCount = articles.length, rssOutlets = new Set(articles.map(a => a.outlet)).size;
console.log(`RSS: ${rssCount} articles from ${rssOutlets} outlets in ${((Date.now() - T0) / 1000).toFixed(1)}s`);

/* ---------- GDELT (optional supplement: never breaks the run) ---------- */
const gdeltInfo = { doc: "not tried", gkg: [], added: 0, cached: 0 };
const JUNK_URL = /\/(astrology|horoscope|web-?stories?|photos?|videos?|gallery|photogallery|videogallery|entertainment|lifestyle|life-and-style|recipes?|religion|spirituality|trends?|viral|tv|web-series|movies?|bollywood|hollywood|technology\/gadgets|auto)\//i;
const cleanTitle = (t, host) => {
  t = decode(decode(t)).replace(/\s+/g, " ").trim();
  for (let k = 0; k < 2; k++) { const m = t.match(/^(.{25,}?)\s+[|–—-]\s+([^|–—-]{2,45})$/); if (m && (/\|/.test(t.slice(m[1].length, m[1].length + 3)) || /news|times|express|today|india|herald|hindu|tribune|chronicle|standard|mint|post|live|\.com|\.in/i.test(m[2]) || m[2].toLowerCase().replace(/\W/g, "").includes(host.split(".")[0]))) t = m[1].trim(); else break; }
  return t;
};
let gcache = { files: [], items: [] };
try { gcache = { files: [], items: [], ...JSON.parse(await readFile(path.join(OUT, "gdelt-cache.json"), "utf8")) }; } catch {}
const gSince = Date.now() - GDELT_H * 3600e3, gDeadline = Date.now() + GDELT_BUDGET_MS;
const gItems = new Map(gcache.items.filter(x => x.time >= gSince).map(x => [normUrl(x.url), x]));
const gAdd = (url, title, domain, time, image) => {
  const host = hostOf(url); if (!host || !isIndianHost(host) || JUNK_URL.test(url)) return;
  title = cleanTitle(title || "", host); if (title.length < 20 || title.split(" ").length < 4) return;
  const k = normUrl(url); if (gItems.has(k) || !(time >= gSince)) return;
  gItems.set(k, { url, title, domain: host, time: Math.min(time, Date.now()), image: /^https:\/\//.test(image || "") ? image : "" }); gdeltInfo.added++;
};
// (a) the DOC API: one request; when it's busy it answers with a plain-text "Please limit requests…" — a soft failure
try {
  const r = await fetch("https://api.gdeltproject.org/api/v2/doc/doc?query=sourcecountry:india&mode=artlist&maxrecords=250&format=json&timespan=6h&sort=datedesc", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch {}
  if (!r.ok) gdeltInfo.doc = "HTTP " + r.status;
  else if (!j) gdeltInfo.doc = "soft failure: " + txt.slice(0, 60).replace(/\s+/g, " ");
  else { const arts = j.articles || []; arts.forEach(a => { const m = String(a.seendate || "").match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/); gAdd(a.url, a.title, a.domain, m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : Date.now(), a.socialimage); }); gdeltInfo.doc = `ok (${arts.length} articles)`; }
} catch (e) { gdeltInfo.doc = "failed: " + e.message; }
// (b) GKG files (every 15 min, UTC). The newest usually 404 for a while, so step back until files exist; take up to 4.
function unzipOne(buf) {
  let e = buf.length - 22; while (e > 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e <= 0) throw new Error("not a zip");
  const cd = buf.readUInt32LE(e + 16); if (buf.readUInt32LE(cd) !== 0x02014b50) throw new Error("bad zip directory");
  const method = buf.readUInt16LE(cd + 10), csize = buf.readUInt32LE(cd + 20), lho = buf.readUInt32LE(cd + 42);
  if (buf.readUInt32LE(lho) !== 0x04034b50) throw new Error("bad zip header");
  const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28), data = buf.subarray(start, start + csize);
  return method === 8 ? inflateRawSync(data) : data;
}
try {
  const slot = 15 * 60e3, now = Math.floor(Date.now() / slot) * slot;
  const stamp = t => new Date(t).toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const cands = Array.from({ length: 16 }, (_, i) => stamp(now - i * slot));
  const heads = await mapLimit(cands, 8, async s => { try { const r = await fetch(`https://data.gdeltproject.org/gdeltv2/${s}.gkg.csv.zip`, { method: "HEAD", signal: AbortSignal.timeout(10000) }); return r.ok; } catch { return false; } });
  const avail = cands.filter((_, i) => heads[i]).slice(0, 4), todo = avail.filter(s => !gcache.files.includes(s));
  gdeltInfo.gkg.push(`available ${avail.join(",") || "none"}; new ${todo.length}`);
  for (const s of todo) {
    if (Date.now() > gDeadline) { gdeltInfo.gkg.push("time budget used up"); break; }
    try {
      const r = await fetch(`https://data.gdeltproject.org/gdeltv2/${s}.gkg.csv.zip`, { signal: AbortSignal.timeout(Math.max(5000, gDeadline - Date.now())) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const txt = unzipOne(Buffer.from(await r.arrayBuffer())).toString("utf8");
      let n = 0, pos = 0;
      while (pos < txt.length) {
        let end = txt.indexOf("\n", pos); if (end < 0) end = txt.length;
        const line = txt.slice(pos, end); pos = end + 1;
        const c = line.split("\t"); if (c.length < 27) continue;
        const host = hostOf(c[4]); if (!host || !isIndianHost(host)) continue;
        const title = (c[26].match(/<PAGE_TITLE>([\s\S]*?)<\/PAGE_TITLE>/) || [])[1]; if (!title) continue;
        const m = c[1].match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/); const before = gdeltInfo.added;
        gAdd(c[4], title, c[3], m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : Date.now(), c[18]);
        if (gdeltInfo.added > before) n++;
      }
      gcache.files.push(s); gdeltInfo.gkg.push(`${s}: ${n} new Indian articles`);
    } catch (e) { gdeltInfo.gkg.push(`${s}: failed (${e.message})`); }
  }
} catch (e) { gdeltInfo.gkg.push("failed: " + e.message); }
// rolling 24-hour cache (url, title, domain, time, image only)
const gList = [...gItems.values()].filter(x => x.time >= gSince).sort((a, b) => b.time - a.time).slice(0, 4000);
try { await mkdir(OUT, { recursive: true }); await writeFile(path.join(OUT, "gdelt-cache.json"), JSON.stringify({ updated: new Date().toISOString(), files: gcache.files.slice(-40), items: gList })); } catch (e) { console.log("gdelt cache not saved:", e.message); }
gdeltInfo.cached = gList.length;
// GDELT articles join the pool unless RSS already has that page (or the same outlet's same headline)
const rssTitles = new Set(articles.map(a => a.outlet + "|" + a.title.toLowerCase().replace(/\W+/g, "")));
const gOutlets = {};
let gdeltCount = 0;
for (const g of gList) {
  if (seen.has(normUrl(g.url))) continue;
  const oid = outletForHost(g.domain) || "g-" + g.domain;
  if (rssTitles.has(oid + "|" + g.title.toLowerCase().replace(/\W+/g, ""))) continue;
  if (!outletById[oid]) { gOutlets[oid] = gOutlets[oid] || { id: oid, name: nameFromDomain(oid.slice(2)), lean: "U", lang: "", domain: oid.slice(2), gdelt: true }; }
  seen.add(normUrl(g.url));
  articles.push({ title: g.title, link: g.url, image: g.image, time: g.time, snippet: "", outlet: oid, lang: isHindi(g.title) ? "hi" : "en", src: "gdelt" }); gdeltCount++;
}
Object.assign(outletById, gOutlets);
console.log(`GDELT: DOC API ${gdeltInfo.doc}; GKG ${gdeltInfo.gkg.join("; ")}; cache ${gdeltInfo.cached}; ${gdeltCount} articles added (not already in RSS), ${((Date.now() - T0) / 1000).toFixed(1)}s`);
articles.sort((a, b) => b.time - a.time);

/* ---------- group into stories (same event, different outlets) ---------- */
// news digests mention several events at once and would chain them together, so they stay on their own
const ROUNDUP = /^(rush hour|evening (news )?brief|morning (brief|digest)|news wrap|top (news|stories|headlines)|news headlines|today'?s (top|big)|news updates?|breaking news today)\b|\band more top stories\b|\btop stories\b|\bnews (brief|digest|wrap)\b|\bLIVE updates?:? .*\|/i;
// TF-IDF vectors from headline (+ a little of the snippet); distinctive names count extra
const df = new Map();
articles.forEach(a => {
  a.tt = tokens(a.title); a.st = tokens(a.snippet).slice(0, 30);
  a.pl = new Set(PLACES.filter(p => p.re.test(a.title)).map(p => p.st)); a.pp = new Set(a.tt.filter(x => x[1]).map(x => x[0]));
  a.roundup = ROUNDUP.test(a.title);
  new Set([...a.tt, ...a.st].map(x => x[0])).forEach(w => df.set(w, (df.get(w) || 0) + 1));
});
const N = articles.length, idf = w => Math.log((N + 1) / ((df.get(w) || 0) + 1));
articles.forEach((a, i) => {
  const v = new Map();
  a.tt.forEach(([w, p]) => v.set(w, Math.max(v.get(w) || 0, idf(w) * (p ? 1.6 : 1))));
  a.st.forEach(([w, p]) => v.set(w, Math.max(v.get(w) || 0, idf(w) * (p ? 1.6 : 1) * .35)));
  let n = 0; v.forEach(x => { n += x * x; }); n = Math.sqrt(n) || 1; v.forEach((x, k) => v.set(k, x / n));
  a.v = v; a.tw = new Set(a.tt.map(x => x[0])); a.i = i;
});
const cos = (A, B) => { if (A.size > B.size) [A, B] = [B, A]; let s = 0; A.forEach((x, k) => { const y = B.get(k); if (y) s += x * y; }); return s; };
// candidate pairs share at least one reasonably distinctive headline word
const inv = new Map(), MINIDF = Math.log(N / 60);
articles.forEach(a => a.tw.forEach(w => { if (idf(w) >= MINIDF) { if (!inv.has(w)) inv.set(w, []); inv.get(w).push(a.i); } }));
const placeClash = (a, b) => a.pl.size && b.pl.size && ![...a.pl].some(p => b.pl.has(p)) && !(a.pl.size === 1 && a.pl.has("Delhi")) && !(b.pl.size === 1 && b.pl.has("Delhi"));
const simMap = new Map(), edges = [];
const pairKey = (i, j) => i < j ? i * 100000 + j : j * 100000 + i;
articles.forEach(a => {
  const cand = new Set(); a.tw.forEach(w => (inv.get(w) || []).forEach(j => { if (j > a.i) cand.add(j); }));
  cand.forEach(j => {
    const b = articles[j]; if (Math.abs(a.time - b.time) > 36 * 3600e3 || a.roundup || b.roundup) return;
    let s = cos(a.v, b.v); if (s < .12) return;
    // headlines naming only different states are probably different events (Delhi alone is just the dateline of national news)
    if (placeClash(a, b)) s *= .6;
    let shared = 0, sharedW = 0, sharedNP = 0; a.tw.forEach(w => { if (b.tw.has(w)) { shared++; sharedW += idf(w); if (!a.pp.has(w) && !b.pp.has(w)) sharedNP++; } });
    simMap.set(pairKey(a.i, j), s);
    // join only on real overlap: two+ shared headline words with a good score, or one very rare name and a high score
    // join only on real overlap: three+ shared headline words, or two with a high score (a shared name alone isn't an event)
    if ((shared >= 3 && s >= .3 && sharedW >= 3 * MINIDF) || (shared >= 2 && sharedNP >= 1 && s >= .42 && sharedW >= 2 * MINIDF) || (s >= .6 && sharedW >= 1.5 * MINIDF)) edges.push([s, a.i, j]);
  });
});
edges.sort((x, y) => y[0] - x[0]);
// average-link merging: two groups join only if, on average, their headlines are alike (stops A~B~C chains of unrelated items)
const groupOf = articles.map((_, i) => i), members = new Map(articles.map((_, i) => [i, [i]]));
const find = i => { while (groupOf[i] !== i) i = groupOf[i] = groupOf[groupOf[i]]; return i; };
// average similarity across the two groups; weakly-alike headlines from different states count against (one UP + one Maharashtra poll story aren't one event)
const avgSim = (A, B, places = true) => { let s = 0, clash = 0; for (const i of A) for (const j of B) { const x = simMap.get(pairKey(i, j)) || 0; s += x; if (x < .25 && placeClash(articles[i], articles[j])) clash++; } return places && clash / (A.length * B.length) > .15 ? -1 : s / (A.length * B.length); };
const MAXC = 40;
for (const [s, i, j] of edges) {
  const a = find(i), b = find(j); if (a === b) continue;
  const A = members.get(a), B = members.get(b); if (A.length + B.length > MAXC) continue;
  const need = A.length + B.length <= 2 ? 0 : A.length + B.length <= 4 ? .28 : .22;
  if (avgSim(A, B) < need) continue;
  groupOf[b] = a; members.set(a, A.concat(B)); members.delete(b);
}
// second pass: groups about the same event that ended up split (e.g. one crash reported 4 ways) merge on centroid similarity
let groups = [...members.values()].map(ix => ix.map(i => articles[i]));
// the states a group names (Delhi aside); two groups naming only different states stay apart
const statesOf = g => new Set(g.flatMap(a => [...a.pl]).filter(p => p !== "Delhi"));
const centroid = g => { const v = new Map(); g.forEach(a => a.v.forEach((x, k) => v.set(k, (v.get(k) || 0) + x))); let n = 0; v.forEach(x => { n += x * x; }); n = Math.sqrt(n) || 1; v.forEach((x, k) => v.set(k, x / n)); return v; };
for (let pass = 0; pass < 2; pass++) {
  const multiG = groups.filter(g => g.length >= 2), cents = multiG.map(centroid), merged = new Set();
  for (let x = 0; x < multiG.length; x++) {
    if (merged.has(x)) continue;
    for (let y = x + 1; y < multiG.length; y++) {
      if (merged.has(y) || multiG[x].length + multiG[y].length > MAXC) continue;
      if (Math.abs(Math.max(...multiG[x].map(a => a.time)) - Math.max(...multiG[y].map(a => a.time))) > 36 * 3600e3) continue;
      const sx = statesOf(multiG[x]), sy = statesOf(multiG[y]);
      if (sx.size && sy.size && ![...sx].some(p => sy.has(p))) continue;
      if (cos(cents[x], cents[y]) >= .42 && avgSim(multiG[x].map(a => a.i), multiG[y].map(a => a.i), false) >= .12) { multiG[x].push(...multiG[y]); cents[x] = centroid(multiG[x]); merged.add(y); }
    }
  }
  groups = groups.filter(g => g.length < 2).concat(multiG.filter((_, k) => !merged.has(k)));
}
const clusters = groups.map(g => g.sort((a, b) => b.time - a.time));

/* ---------- stories ---------- */
const LEANS = ["L", "LL", "C", "LR", "R", "U"];
const leanOf = id => (outletById[id] || {}).lean || "U", nameOf = id => (outletById[id] || {}).name || id;
const stories = clusters.map(c => {
  const outlets = [...new Set(c.map(a => a.outlet))];
  // the lead: the most central headline (preferring English, since the site is in English)
  const cen = a => c.reduce((s, m) => s + (m === a ? 0 : simMap.get(pairKey(a.i, m.i)) || 0), 0) + (a.lang === "en" ? 10 : 0) + (a.src === "rss" ? .5 : 0);
  const lead = c.slice().sort((x, y) => cen(y) - cen(x) || y.time - x.time)[0];
  // one article per outlet first (each outlet's best), then the rest
  const byOutlet = new Map(); c.slice().sort((x, y) => cen(x) - cen(y)).forEach(a => byOutlet.set(a.outlet, a)); // best last wins
  const best = [...byOutlet.values()];
  const ordered = [...best.sort((x, y) => (x === lead ? -1 : y === lead ? 1 : y.time - x.time)), ...c.filter(a => !best.includes(a))];
  const cov = Object.fromEntries(LEANS.map(k => [k, 0])); outlets.forEach(id => cov[LEANS.includes(leanOf(id)) ? leanOf(id) : "U"]++);
  const byLean = ls => best.filter(a => ls.includes(leanOf(a.outlet)));
  const p = placeOf([lead.title, ...c.map(a => a.title), ...c.map(a => a.snippet)]);
  const L = byLean(["L", "LL"]), R = byLean(["R", "LR"]), C = byLean(["C"]);
  const pic = lead.image ? lead : ordered.find(a => a.image) || {};
  return {
    id: "live-" + hash(lead.link), live: true, title: lead.title, image: pic.image || "", imageBy: pic.outlet || "", cat: topicOf([lead.title, ...c.filter(a => a !== lead).map(a => a.title)]),
    place: p ? p.n : "India", lat: p ? p.lat : null, lon: p ? p.lon : null,
    firstSeen: Math.min(...c.map(a => a.time)), lastSeen: Math.max(...c.map(a => a.time)), outletCount: outlets.length, articleCount: c.length,
    sum: (c.length > 1 ? ordered.filter((a, k, arr) => arr.findIndex(b => b.outlet === a.outlet) === k).slice(0, 3).map(a => `${nameOf(a.outlet)}: ${a.title}`) : [lead.snippet || lead.title]).filter(Boolean),
    L: L.slice(0, 2).map(a => `${nameOf(a.outlet)}: “${a.title}”`), R: R.slice(0, 2).map(a => `${nameOf(a.outlet)}: “${a.title}”`),
    hl: { L: L[0] ? L[0].title : "", C: (C[0] || lead).title, R: R[0] ? R[0].title : "" }, cov,
    articles: ordered.slice(0, 40).map(({ title, link, time, snippet, outlet, image, lang, src }) => ({ outlet, title, link, time, snippet, image, lang, src }))
  };
}).sort((a, b) => b.outletCount - a.outletCount || b.articleCount - a.articleCount || b.lastSeen - a.lastSeen);
const multi = stories.filter(s => s.outletCount >= 2), single = stories.filter(s => s.outletCount < 2);
const keep = [...multi.slice(0, 80), ...single.filter(s => s.articles[0].src === "rss").slice(0, Math.max(0, 120 - Math.min(80, multi.length)))];
const factchecks = fcRaw.sort((a, b) => b.time - a.time).slice(0, 15).map(({ title, link, time, snippet, outlet }) => ({ outlet, name: (cfg.factcheckers.find(f => f.id === outlet) || {}).name, title, link, time, snippet }));

// the biggest story (most outlets, with a known place) gets a satellite close-up for the home page's final zoom
// (Sentinel-2 cloudless 2016 by EOX IT Services GmbH, CC BY 4.0). Only refetched when the place changes.
let city = null;
const top = keep.find(x => x.lat != null);
if (top) {
  const W = 2000, H = 1314, dLon = 0.14, dLat = dLon * H / W * Math.cos(top.lat * Math.PI / 180);
  const box = { id: top.id, place: top.place, lat: top.lat, lon: top.lon, w: W, h: H, lon0: +(top.lon - dLon / 2).toFixed(4), lon1: +(top.lon + dLon / 2).toFixed(4), lat0: +(top.lat + dLat / 2).toFixed(4), lat1: +(top.lat - dLat / 2).toFixed(4) };
  let prev = null; try { prev = JSON.parse(await readFile(path.join(OUT, "news.json"), "utf8")).city; } catch {}
  let have = false; try { await readFile(path.join(OUT, "city.jpg")); have = true; } catch {}
  if (have && prev && prev.lat === box.lat && prev.lon === box.lon) city = { ...box, file: prev.file };
  else {
    try {
      const url = `https://tiles.maps.eox.at/wms?service=WMS&request=GetMap&version=1.1.1&layers=s2cloudless&styles=&srs=EPSG:4326&bbox=${box.lon0},${box.lat1},${box.lon1},${box.lat0}&width=${W}&height=${H}&format=image/jpeg`;
      const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (r.ok && /jpeg/.test(r.headers.get("content-type") || "")) { await mkdir(OUT, { recursive: true }); await writeFile(path.join(OUT, "city.jpg"), Buffer.from(await r.arrayBuffer())); city = { ...box, file: "live/city.jpg?v=" + Date.now().toString(36) }; }
    } catch (e) { console.log("city image failed:", e.message); }
  }
}

// outlets list: every configured outlet, plus the GDELT-only sites that appear in a kept story
const usedG = new Set(keep.flatMap(s => s.articles.map(a => a.outlet)).filter(id => id.startsWith("g-")));
const outList = [...cfg.outlets.map(({ id, name, lean, lang }) => ({ id, name, lean, lang: lang || "" })), ...Object.values(gOutlets).filter(o => usedG.has(o.id)).map(({ id, name, lean, domain }) => ({ id, name, lean, lang: "", via: "gdelt", domain }))];
const reporting = new Set(articles.map(a => a.outlet));
const out = { city, updated: new Date().toISOString(), windowHours: WINDOW_H, note: cfg._note, outlets: outList, counts: { articles: articles.length, rss: rssCount, gdelt: gdeltCount, outlets: reporting.size, stories: keep.length, multiOutlet: multi.length }, stories: keep, factchecks };
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "news.json"), JSON.stringify(out));
await writeFile(path.join(OUT, "news.js"), "window.LIVE = " + JSON.stringify(out).replace(/</g, "\\u003c") + ";\n");
console.log(report.join("\n"));
console.log(`Photos: ${articles.filter(a => a.image).length} of ${articles.length} headlines, ${keep.filter(s => s.image).length} of ${keep.length} stories.`);
console.log(`\n${articles.length} articles (RSS ${rssCount} from ${rssOutlets} outlets, GDELT ${gdeltCount}) from ${reporting.size} outlets → ${stories.length} stories (${multi.length} covered by 2+ outlets). Kept ${keep.length}. Fact-checks: ${factchecks.length}. ${((Date.now() - T0) / 1000).toFixed(1)}s`);
console.log("Top stories:\n" + multi.slice(0, 10).map(s => `  [${s.outletCount} outlets · ${s.articleCount} articles] ${s.place} · ${s.cat} · ${s.title}`).join("\n"));
