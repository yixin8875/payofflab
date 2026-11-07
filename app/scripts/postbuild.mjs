import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Static copy of the app shell for every route, so /calculator and friends
// resolve on any plain static file server.
const routes = [
  "calculator",
  "options-chain",
  "strategies",
  "tools/option-finder",
  "tools",
  "tools/black-scholes",
  "tools/greeks-calculator",
  "tools/iv-calculator",
  "tools/breakeven-calculator",
  "methodology",
  "trades",
  "watchlist",
  "scan",
  "terms",
  "privacy",
  "changelog",
];

const dist = join(process.cwd(), "dist");
const index = join(dist, "index.html");
const html = readFileSync(index, "utf8");

for (const route of routes) {
  const out = join(dist, route, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
}

// Symbol and strategy deep links are rendered client-side; copy a shell for the
// handful the footer and landing page point at.
const deepLinks = [
  "options-chain/spy",
  "options-chain/qqq",
  "options-chain/aapl",
  "options-chain/tsla",
  "options-chain/nvda",
  "strategies/covered-call",
  "strategies/cash-secured-put",
  "strategies/bull-call-spread",
  "strategies/iron-condor",
  "strategies/long-straddle",
  "strategies/calendar-spread",
];

for (const route of deepLinks) {
  const out = join(dist, route, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
}

// A 404 page that also boots the app so unknown paths still show the shell.
if (existsSync(index)) {
  writeFileSync(join(dist, "404.html"), html);
}

console.log(`static shells written for ${routes.length + deepLinks.length} routes`);
