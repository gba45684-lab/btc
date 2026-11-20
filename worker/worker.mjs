// worker.mjs: always-on recorder. Streams the BTCINR mark price from the Shark Exchange
// websocket and writes every update into Postgres (table mark_ticks). Public data only.
// Run it on a host that stays on (Railway, Fly.io, a VPS or your PC): `npm run worker`.
import { io } from "socket.io-client";
import pg from "pg";

const WS_URL = process.env.SHARK_WS ?? "https://fawss.sharkexchange.in/";
const PAIR = "BTCINR";
const FLUSH_MS = 1000;

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set"); process.exit(1); }
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

await pool.query(`
  create table if not exists mark_ticks (
    ts timestamptz not null,
    price double precision not null,
    index_price double precision,
    funding_rate double precision,
    next_funding_ms bigint,
    primary key (ts, price)
  )`);
await pool.query("create index if not exists mark_ticks_ts on mark_ticks (ts)");

// Buffer ticks and insert them in batches, so one row per update does not hammer the database.
let buf = [];
async function flush() {
  if (!buf.length) return;
  const rows = buf; buf = [];
  const vals = [], params = [];
  rows.forEach((r, i) => {
    const o = i * 5;
    vals.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5})`);
    params.push(r.ts, r.p, r.i, r.r, r.T);
  });
  try {
    await pool.query(`insert into mark_ticks (ts, price, index_price, funding_rate, next_funding_ms) values ${vals.join(",")} on conflict do nothing`, params);
  } catch (e) {
    console.error("insert failed, will retry later:", e.message);
    buf = rows.concat(buf);
  }
}
setInterval(flush, FLUSH_MS);

const sock = io(WS_URL, { transports: ["websocket"], reconnectionDelay: 5000, reconnectionDelayMax: 60000, timeout: 10000 });
let wsErrors = 0;
sock.on("connect", () => {
  wsErrors = 0;
  console.log("websocket connected");
  sock.emit("subscribe", { params: [`${PAIR.toLowerCase()}@markPrice`, `${PAIR.toLowerCase()}@aggTrade`] });
});
sock.on("disconnect", r => console.log("websocket disconnected:", r));
sock.on("connect_error", e => {
  wsErrors += 1;
  if (wsErrors <= 3 || wsErrors % 20 === 0) console.error(`websocket error #${wsErrors}:`, e.message);
});
// Mark-price fields (confirmed by the btc repo): p mark INR, i index INR, r funding rate, T next funding ms, E event ms.
sock.on("markPriceUpdate", d => {
  const p = Number(d.p);
  if (!(p > 0)) return;
  buf.push({ ts: new Date(Number(d.E) || Date.now()), p, i: Number(d.i), r: Number(d.r), T: Number(d.T) });
});

process.on("SIGTERM", async () => { await flush(); await pool.end(); process.exit(0); });
console.log("worker started");
