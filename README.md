# The Red Thread

India's news, uncovered: every side of every story, mapped from orbit.

## Live news

`scripts/collect-news.mjs` reads Indian news outlets' public RSS feeds (headline, short snippet and link only, never full
articles), groups headlines about the same event into stories, finds the place and topic, and counts coverage by each
outlet's lean. It writes `live/news.json` and `live/news.js`, which the site loads.

- Outlets, feeds and lean ratings: `scripts/outlets.json`. Lean ratings are **provisional** until reviewed; edit them there.
- Run it by hand: `node scripts/collect-news.mjs` (Node 18 or newer, no packages needed).
- Automatic updates: `.github/workflows/update-news.yml` runs it every 30 minutes on GitHub and commits the new
  headlines. If Netlify is connected to this repository, every commit redeploys the site.

## Never put API keys in this repository

Everything here is public. If a news API or the Claude API is added later, its key goes in the repository's
Settings → Secrets and variables → Actions (or Netlify's environment variables), never in the code.
