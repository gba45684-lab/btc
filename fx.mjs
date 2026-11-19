const res = await fetch("https://open.er-api.com/v6/latest/USD");
const data = await res.json();
const inr = data?.rates?.INR;
if (!inr) { console.error("No INR rate in response"); process.exit(1); }
console.log(inr.toFixed(2));
