import { readFileSync } from "fs";

const FILE = "btcinr_1min.csv";
const usdInr = Number(process.argv[2] ?? 93.44);   // pass your USD/INR rate as arg 1
const horizon = Number(process.argv[3] ?? 60);     // horizon in minutes for the band, arg 2

const rows = readFileSync(FILE, "utf8").trim().split("\n").slice(1)
  .map(l => { const [t, mark] = l.split(","); return { t, p: Number(mark) }; })
  .filter(r => Number.isFinite(r.p) && r.p > 0);

if (rows.length < 5) { console.log(`Need at least 5 rows, found ${rows.length}`); process.exit(1); }

const rets = [];
for (let i = 1; i < rows.length; i++) rets.push(Math.log(rows[i].p / rows[i - 1].p));
const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1));
const sigmaH = sd * Math.sqrt(horizon);

const prices = rows.map(r => r.p);
const last = prices.at(-1);
const hi = Math.max(...prices), lo = Math.min(...prices);
const spanMin = (Date.parse(rows.at(-1).t) - Date.parse(rows[0].t)) / 60000;
const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
const usd = n => "$" + Math.round(n / usdInr).toLocaleString("en-US");
const pct = x => (x * 100).toFixed(3) + "%";

console.log("BTCINR 1-minute analysis");
console.log("------------------------");
console.log(`Rows:              ${rows.length} (${rows[0].t} → ${rows.at(-1).t})`);
console.log(`Span:              ${spanMin.toFixed(0)} min (gaps mean fewer rows than minutes)`);
console.log(`Last mark:         ${inr(last)}  (${usd(last)} @ ${usdInr})`);
console.log(`High / Low:        ${inr(hi)} / ${inr(lo)}`);
console.log(`Sigma per minute:  ${pct(sd)}`);
console.log(`Horizon:           ${horizon} min, 1σ move ±${pct(sigmaH)}`);
console.log(`1σ band INR:       ${inr(last * Math.exp(-sigmaH))} to ${inr(last * Math.exp(sigmaH))}`);
console.log(`1σ band USD:       ${usd(last * Math.exp(-sigmaH))} to ${usd(last * Math.exp(sigmaH))}`);
console.log("\nDescriptive only: not a signal or a price prediction.");
