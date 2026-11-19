import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 3000;
const CSV = join(here, "btcinr_1min.csv");

let fx = { rate: null, at: 0 };
async function usdInr() {
  if (Date.now() - fx.at < 5 * 60_000) return fx.rate;
  try {
    const j = await (await fetch("https://open.er-api.com/v6/latest/USD")).json();
    fx = { rate: j?.rates?.INR ?? null, at: Date.now() };
  } catch {}
  return fx.rate;
}

function loadRows() {
  if (!existsSync(CSV)) return [];
  return readFileSync(CSV, "utf8").trim().split("\n").slice(1)
    .map(l => { const [t, m] = l.split(","); return { t, p: Number(m) }; })
    .filter(r => Number.isFinite(r.p) && r.p > 0);
}

function stats(rows, horizon) {
  const rets = [];
  for (let i = 1; i < rows.length; i++) rets.push(Math.log(rows[i].p / rows[i - 1].p));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1));
  const prices = rows.map(r => r.p);
  const last = prices.at(-1);
  const sh = sd * Math.sqrt(horizon);
  return {
    rows: rows.length, last_time: rows.at(-1).t, last_inr: last,
    high: Math.max(...prices), low: Math.min(...prices),
    sigma_min: sd, horizon,
    band_low: last * Math.exp(-sh), band_high: last * Math.exp(sh),
  };
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/data") {
    const horizon = Number(url.searchParams.get("h") ?? 60);
    const rows = loadRows();
    const body = rows.length >= 3 ? stats(rows, horizon) : { error: "Not enough data yet, keep the logger running" };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ...body, usd_inr: await usdInr(), fetched_at: new Date().toISOString() }));
    return;
  }
  if (url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(readFileSync(join(here, "index.html")));
    return;
  }
  res.writeHead(404); res.end();
}).listen(PORT, () => console.log(`web app on port ${PORT}`));
