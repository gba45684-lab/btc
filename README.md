# btc: BTCINR market data logger

Read-only logger for Shark Exchange BTCINR market data. It streams the mark price and trades over websocket and saves a 24h ticker snapshot every minute to `btcinr_live.csv`.

- Public endpoints only. No API keys are needed or used.
- Places no orders and calls no authenticated endpoints.
- Prices are in INR, as quoted on the exchange.

## Run

```bash
npm install
npm start
```

Requires Node.js 20 or newer. Output goes to the console and to `btcinr_live.csv`.

## Endpoints used

- REST: `https://api.sharkexchange.in/v1/market/ticker24Hr/BTCINR`
- Websocket: `https://fawss.sharkexchange.in/`, subscribing to `btcinr@markPrice` and `btcinr@aggTrade`

The field names in the websocket payloads are not yet confirmed against live output. Check the first lines of `btcinr_live.csv` before relying on them.

## Notes

- These endpoints come from the Shark Exchange documentation and SDK examples. Check them against the current docs before use.
- Keep API keys out of this repo. Add a `.env` file to `.gitignore` if you ever use one.
