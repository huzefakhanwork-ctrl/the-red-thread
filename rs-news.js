/* THE RED THREAD — news feed demo data. ILLUSTRATIVE ONLY: invented outlets, invented stories, invented numbers. */

/* bias: L = left, LL = lean left, C = centre, LR = lean right, R = right, U = untracked */
window.OUTLETS = [
  { id: "peacock", name: "The Peacock Post", b: "L", c: "#FF5C7A", t: "Digital", lang: "English", own: "Reader-funded (illustrative)", fact: "High" },
  { id: "herald", name: "Workers' Herald", b: "L", c: "#E2445C", t: "Print", lang: "Hindi", own: "Union-run trust (illustrative)", fact: "Mixed" },
  { id: "lalit", name: "Lalit Express", b: "L", c: "#C2185B", t: "TV", lang: "Hindi", own: "Lalit Media Pvt (illustrative)", fact: "Mixed" },
  { id: "dhoop", name: "The Daily Dhoop", b: "LL", c: "#FF8A65", t: "Digital", lang: "English", own: "Independent (illustrative)", fact: "High" },
  { id: "mirror", name: "Metro Mirror", b: "LL", c: "#F06292", t: "Print", lang: "English", own: "Mirror Group (illustrative)", fact: "High" },
  { id: "sahyadri", name: "Sahyadri Vartha", b: "LL", c: "#BA68C8", t: "Print", lang: "Kannada", own: "Family-owned (illustrative)", fact: "High" },
  { id: "ledger", name: "Morning Ledger", b: "C", c: "#455A64", t: "Print", lang: "English", own: "Ledger Trust (illustrative)", fact: "Very high" },
  { id: "samachar", name: "Samachar Today", b: "C", c: "#607D8B", t: "TV", lang: "Hindi", own: "Listed company (illustrative)", fact: "High" },
  { id: "factline", name: "Factline", b: "C", c: "#26A69A", t: "Digital", lang: "English / Hindi", own: "Non-profit (illustrative)", fact: "Very high" },
  { id: "kural", name: "Kural Daily", b: "C", c: "#8D6E63", t: "Print", lang: "Tamil", own: "Family-owned (illustrative)", fact: "High" },
  { id: "bdw", name: "Bharat Daily Wire", b: "LR", c: "#5C6BC0", t: "Digital", lang: "English", own: "BDW Media (illustrative)", fact: "Mixed" },
  { id: "mantra", name: "Market Mantra", b: "LR", c: "#3D5AFE", t: "Digital", lang: "English", own: "Business group (illustrative)", fact: "High" },
  { id: "pratah", name: "Pratah Kaal", b: "LR", c: "#1E88E5", t: "Print", lang: "Marathi", own: "Family-owned (illustrative)", fact: "High" },
  { id: "rashtra", name: "Rashtra Live", b: "R", c: "#283593", t: "TV", lang: "Hindi", own: "Rashtra Broadcast (illustrative)", fact: "Low" },
  { id: "alpha", name: "Channel Alpha", b: "R", c: "#1A237E", t: "TV", lang: "Hindi", own: "Alpha Media Holdings (illustrative)", fact: "Low" },
  { id: "gamma", name: "Gamma Digital", b: "U", c: "#00897B", t: "Digital", lang: "English", own: "Reader-funded (illustrative)", fact: "—" },
  { id: "delta", name: "Delta Samachar", b: "U", c: "#6D4C41", t: "Print", lang: "Marathi", own: "Family-owned (illustrative)", fact: "—" },
  { id: "nelive", name: "NE Live", b: "U", c: "#43A047", t: "Digital", lang: "Assamese", own: "Independent (illustrative)", fact: "—" },
  { id: "tiranga", name: "Tiranga Tak", b: "U", c: "#F9A825", t: "YouTube", lang: "Hindi", own: "Creator-run (illustrative)", fact: "—" }
];
window.BIAS = { L: ["Left", "#FF4D6D"], LL: ["Lean left", "#FF8FA3"], C: ["Centre", "#77705F"], LR: ["Lean right", "#7B93FF"], R: ["Right", "#3D5AFE"], U: ["Untracked", "#8B8578"] };

/* cov: counts of articles by bias group {L,LL,C,LR,R,U}. hide: why it's on the "didn't show you" carpet (coverage, not intent). */
window.STORIES = [
  { id: "genz", cat: "Education", place: "Delhi", time: "2h ago", title: "Students rally at Jantar Mantar over exam paper leak",
    sum: ["Screenshots said to show questions from a national entrance exam spread on Telegram two days after the test.", "Police arrested four people at two centres; the testing agency says the breach was limited to those centres.", "Students want a full re-test; a court has asked the agency for a status report, with a hearing on 4 November."],
    L: ["Frames the protest as a breakdown of trust in national exams.", "Leads with student voices and police action."], R: ["Frames a full re-test as unfair to candidates who scored well.", "Leads with the agency's two-centre finding."],
    hl: { L: "Students' fury: was the whole paper leaked?", C: "Agency says breach limited to two centres; students demand re-test", R: "Re-test demand threatens 1.8 million results" },
    cov: { L: 14, LL: 9, C: 22, LR: 7, R: 5, U: 31 }, dossier: true },
  { id: "sand", cat: "Environment", place: "Bihar", time: "5h ago", title: "Three villages report dry wells after months of river sand mining",
    sum: ["Residents of three villages say hand pumps went dry after mechanised sand extraction upstream.", "A district order capped mining at 3 metres depth; villagers say pits are far deeper.", "No state agency has published a groundwater reading for the area this year."],
    L: ["Focuses on villagers and alleged illegal mining."], R: ["Focuses on construction demand and legal permits."],
    hl: { L: "Sand mafia drains a river, and three villages with it", C: "Villagers link dry wells to sand mining; district to inspect", R: "Construction boom drives demand for river sand" },
    cov: { L: 3, LL: 2, C: 1, LR: 0, R: 0, U: 9 }, hide: "Covered by 6 of 48 tracked outlets", blind: "right" },
  { id: "riders", cat: "Labour", place: "Hyderabad", time: "7h ago", title: "Heat-stroke cases among delivery riders rise through summer",
    sum: ["A riders' union logged 41 heat-related hospital visits between April and June.", "Two platforms added water stops; riders say delivery timers still penalise breaks.", "There is no official count of heat illness among gig workers."],
    L: ["Calls for heat-break rules for gig work."], R: ["Highlights platforms' new rest stops."],
    hl: { L: "Riding in 46°C: gig workers pay for 10-minute delivery", C: "Union logs 41 heat-related hospital visits among riders", R: "Platforms roll out water stops for summer riders" },
    cov: { L: 4, LL: 3, C: 2, LR: 1, R: 0, U: 6 }, hide: "Covered by 10 of 48 tracked outlets" },
  { id: "oxygen", cat: "Health", place: "Madhya Pradesh", time: "9h ago", title: "Audit finds 4 in 10 hospital oxygen plants not working",
    sum: ["An internal audit of 120 district hospitals found 48 oxygen plants out of service.", "Most failures were blamed on missing maintenance contracts.", "The health department says repairs are under way; no deadline was given."],
    L: ["Ties the audit to pandemic-era spending."], R: ["Notes plants were installed fast in an emergency."],
    hl: { L: "Pandemic oxygen plants left to rust, audit shows", C: "Audit: 48 of 120 district hospital oxygen plants not working", R: "State orders repair of emergency-era oxygen plants" },
    cov: { L: 2, LL: 2, C: 2, LR: 1, R: 0, U: 4 }, hide: "Covered by 7 of 48 tracked outlets" },
  { id: "floods", cat: "Disaster", place: "Assam", time: "11h ago", title: "Floods displace 60,000 across four districts",
    sum: ["Officials report 60,000 people in relief camps across four districts.", "Two embankments breached overnight; road links to 140 villages are cut.", "National TV gave the story under 3% of prime-time airtime this week, by our count."],
    L: ["Focuses on embankment maintenance."], R: ["Focuses on relief operations."],
    hl: { L: "Embankments failed again. Who checked them?", C: "Assam floods: 60,000 in relief camps, 140 villages cut off", R: "Army, NDRF step up flood relief in Assam" },
    cov: { L: 2, LL: 1, C: 3, LR: 1, R: 1, U: 12 }, hide: "Under 3% of prime-time TV airtime" },
  { id: "eggs", cat: "Children", place: "Karnataka", time: "1d ago", title: "School meal scheme quietly cuts egg days from six to two",
    sum: ["A revised menu circular reduces eggs in school meals from six days a week to two.", "The department cites budget; nutrition groups cite child anaemia data.", "The circular was not announced publicly."],
    L: ["Focuses on child nutrition."], R: ["Focuses on budget and dietary choice."],
    hl: { L: "Fewer eggs for poor kids, without a word", C: "Revised meal menu cuts eggs to two days a week", R: "State revises school menu to manage costs" },
    cov: { L: 4, LL: 2, C: 1, LR: 0, R: 0, U: 3 }, hide: "Covered by 7 of 48 tracked outlets", blind: "right" },
  { id: "fishing", cat: "Livelihoods", place: "Kerala", time: "1d ago", title: "Extended fishing ban leaves small boats without income",
    sum: ["The monsoon fishing ban was extended by 15 days.", "Small-boat owners say the relief payment hasn't arrived for last season.", "Trawler associations back the extension to protect fish stocks."],
    L: ["Focuses on unpaid relief."], R: ["Focuses on stock conservation."],
    hl: { L: "No catch, no cash: fishers wait on last year's relief", C: "Fishing ban extended by 15 days; relief payments pending", R: "Longer ban to help fish stocks recover, says department" },
    cov: { L: 2, LL: 1, C: 2, LR: 1, R: 0, U: 5 }, hide: "Covered by 6 of 48 tracked outlets" },
  { id: "upi", cat: "Economy", place: "India", time: "4h ago", title: "Draft proposes fee on UPI payments above ₹2,000",
    sum: ["A draft paper suggests a 0.3% fee on UPI transfers above ₹2,000 to fund fraud checks.", "It is a consultation draft, not a final rule.", "Public comments close on 30 November."],
    L: ["Frames it as a tax on small vendors."], R: ["Frames it as a safety investment."],
    hl: { L: "UPI fee would tax the poor's only cheap way to pay", C: "Draft proposes 0.3% fee on UPI payments above ₹2,000", R: "Fraud-check fund could make UPI safer, say bankers" },
    cov: { L: 11, LL: 13, C: 15, LR: 4, R: 1, U: 8 }, blind: "right" },
  { id: "lang", cat: "Education", place: "India", time: "8h ago", title: "Board exams to accept answers in 12 regional languages",
    sum: ["Students can write answers in any of 12 listed languages from 2027.", "Question papers will still be set in English and Hindi.", "Boards haven't said how grading will be standardised."],
    L: ["Asks who will grade fairly."], R: ["Celebrates mother-tongue learning."],
    hl: { L: "Language win, but who grades 12 scripts fairly?", C: "Board exams to allow 12 regional languages from 2027", R: "Mother tongue gets its due in classrooms" },
    cov: { L: 1, LL: 3, C: 11, LR: 9, R: 12, U: 4 }, blind: "left" },
  { id: "rbi", cat: "Economy", place: "Mumbai", time: "6h ago", title: "RBI holds repo rate at 6.25% for a third meeting",
    sum: ["The central bank kept the repo rate at 6.25%.", "It cited food inflation as the main risk.", "Most economists had expected no change."],
    L: ["Leads with borrowers' EMIs."], R: ["Leads with stability and growth."],
    hl: { L: "No relief for borrowers as EMIs stay high", C: "RBI keeps repo at 6.25%, flags food prices", R: "Steady hand: RBI keeps growth story on track" },
    cov: { L: 6, LL: 9, C: 31, LR: 10, R: 6, U: 14 } },
  { id: "glacier", cat: "Climate", place: "Himalaya", time: "10h ago", title: "Study of 200 glaciers warns of water stress after 2050",
    sum: ["A peer-reviewed study of 200 glaciers finds faster melting than earlier estimates.", "River flows are projected to fall after about 2050.", "Projections come with wide ranges."],
    L: ["Frames it as a climate emergency."], R: ["Frames it as a planning challenge."],
    hl: { L: "Climate clock is ticking for 240 million people", C: "200-glacier study finds faster-than-expected melt", R: "Dams and storage key to water security, says study" },
    cov: { L: 12, LL: 7, C: 14, LR: 2, R: 1, U: 6 }, blind: "right" },
  { id: "cricket", cat: "Sports", place: "India", time: "12h ago", title: "Women's cricket league expands to eight teams",
    sum: ["Two new franchises were approved for next season.", "The player auction is set for February.", "Player pay will be reviewed alongside the expansion."],
    L: ["Leads with the pay gap."], R: ["Leads with record bids."],
    hl: { L: "Expansion is great, now fix the pay gap", C: "Women's league adds two teams; auction in February", R: "Record bids show women's cricket is big business" },
    cov: { L: 5, LL: 6, C: 20, LR: 6, R: 4, U: 11 } }
];

/* Shameboard leaderboard metrics (sample outlets only). rate = misleading or false findings per 100 checked claims. */
window.LEADER = [
  { org: "alpha", name: "Channel Alpha", t: "TV · Hindi", checked: 120, findings: 22, corrected: 18, trend: +3 },
  { org: "rashtra", name: "Rashtra Live", t: "TV · Hindi", checked: 96, findings: 16, corrected: 6, trend: +1 },
  { org: "lalit", name: "Lalit Express", t: "TV · Hindi", checked: 88, findings: 13, corrected: 23, trend: -2 },
  { org: "bdw", name: "Bharat Daily Wire", t: "Digital · English", checked: 70, findings: 7, corrected: 43, trend: 0 },
  { org: "herald", name: "Workers' Herald", t: "Print · Hindi", checked: 54, findings: 5, corrected: 40, trend: -1 },
  { org: "mirror", name: "Metro Mirror", t: "Print · English", checked: 61, findings: 3, corrected: 100, trend: 0 },
  { org: "beta", name: "The Beta Bulletin", t: "Print · English", checked: 40, findings: 1, corrected: 100, trend: -1 },
  { org: "ledger", name: "Morning Ledger", t: "Print · English", checked: 75, findings: 1, corrected: 100, trend: 0 }
].map(x => ({ ...x, rate: Math.round(x.findings / x.checked * 1000) / 10 })).sort((a, b) => b.rate - a.rate);

window.FRIENDS_CHANNELS = [
  { id: "general", name: "general", desc: "Anything on your mind" },
  { id: "genz", name: "exam-leak-protest", desc: "The Delhi Gen Z protest" },
  { id: "hidden", name: "what-media-missed", desc: "Stories that got buried" },
  { id: "clips", name: "my-clips", desc: "Share the clips you made" }
];
