// make-1min.mjs: keep the last mark-price row of each minute.
// Reads btcinr_markprice.csv, writes btcinr_1min.csv. No network, no keys.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const IN = "btcinr_markprice.csv";
const OUT = "btcinr_1min.csv";

if (!existsSync(IN)) {
  console.error(`${IN} not found. Run the logger first.`);
  process.exit(1);
}

const lines = readFileSync(IN, "utf8").trim().split("\n");
const header = lines[0];
const perMinute = new Map();
for (const line of lines.slice(1)) {
  const minute = line.slice(0, 16); // YYYY-MM-DDTHH:MM
  perMinute.set(minute, line);      // later rows overwrite earlier ones in the same minute
}
const rows = [...perMinute.keys()].sort().map((k) => perMinute.get(k));
writeFileSync(OUT, [header, ...rows].join("\n") + "\n");
console.log(`wrote ${rows.length} minute rows to ${OUT}`);
