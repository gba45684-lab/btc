// btcinr_live.mjs: public market data only. No keys, no orders. Node 20+.
import { io } from "socket.io-client";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";

const REST = "https://api.sharkexchange.in";
const WS_URL = "https://fawss.sharkexchange.in/";
const PAIR = "BTCINR";
const FILE = "btcinr_live.csv";
const SNAPSHOT_MS = 60_000;

if (!existsSync(FILE)) writeFileSync(FILE, "time_utc,source,payload\n");

const log = (source, payload) => {
  const line = `${new Date().toISOString()},${source},${JSON.stringify(payload).replaceAll('"', "'")}`;
  appendFileSync(FILE, line + "\n");
};

// 1) Live mark-price and trade stream (websocket).
// Forced to the websocket transport (the polling fallback failed in testing) with
// backoff, so a failing endpoint logs a few lines instead of a flood.
const socket = io(WS_URL, {
  transports: ["websocket"],
  reconnectionDelay: 5_000,
  reconnectionDelayMax: 60_000,
  timeout: 10_000,
});
let wsErrors = 0;
socket.on("connect", () => {
  wsErrors = 0;
  console.log("websocket connected");
  socket.emit("subscribe", { params: [`${PAIR.toLowerCase()}@markPrice`, `${PAIR.toLowerCase()}@aggTrade`] });
});
socket.on("markPriceUpdate", (d) => { log("markPrice", d); console.log("markPrice", JSON.stringify(d)); });
socket.on("aggTrade", (d) => log("aggTrade", d));
socket.on("disconnect", (reason) => console.log("websocket disconnected:", reason));
socket.on("connect_error", (e) => {
  wsErrors += 1;
  if (wsErrors <= 3 || wsErrors % 20 === 0) console.error(`websocket error #${wsErrors}:`, e.message);
});

// 2) 24h ticker snapshot every minute (REST)
async function snapshot() {
  try {
    const r = await fetch(`${REST}/v1/market/ticker24Hr/${PAIR}`, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const t = await r.json();
    const d = t.data ?? t;
    const row = { last: d.c, high: d.h, low: d.l, volume: d.v, change_pct: d.P };
    log("ticker", row);
    console.log("ticker", JSON.stringify(row));
  } catch (e) {
    console.error("snapshot failed:", e.message);
  }
}
snapshot();
setInterval(snapshot, SNAPSHOT_MS);
