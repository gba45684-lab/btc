# btc: BTCINR market data logger

Read-only logger for Shark Exchange BTCINR market data. It streams the mark price over websocket and saves a 24h ticker snapshot every minute.

- Public endpoints only. No API keys are needed or used.
- Places no orders and calls no authenticated endpoints.
- Prices are in INR, as quoted on the exchange.

## Run

```bash
git pull
npm install
npm start
```

Requires Node.js 20 or newer. Stop with Ctrl+C, or use `timeout 300 npm start` for a fixed run.

## Output files

- `btcinr_markprice.csv`: one row per mark-price update (about one per second). Columns: `time_utc, mark_inr, index_inr, funding_rate, next_funding_ms`.
- `btcinr_live.csv`: 24h ticker snapshots (every 60 seconds) and raw trade events.
- `btcinr_1min.csv`: not written by the logger. Make it from the mark-price file with the one-line `awk` command in the workbench notes, keeping the last row of each minute.

Output files are git-ignored, so they stay local.

## Endpoints used

- REST: `https://api.sharkexchange.in/v1/market/ticker24Hr/BTCINR`
- Websocket: `https://fawss.sharkexchange.in/`, using the websocket transport only. Subscribes to `btcinr@markPrice` and `btcinr@aggTrade`.

Mark-price field meanings were confirmed from live output: `p` mark (INR), `i` index (INR), `r` funding rate, `T` next funding time (ms), `E` event time (ms).

## Notes

- The websocket transport is forced because the polling fallback returned HTTP 400 in testing.
- These endpoints come from the Shark Exchange documentation and SDK examples. Check them against the current docs before relying on them.
- Keep API keys out of this repo. Add a `.env` file to `.gitignore` if you ever use one.
