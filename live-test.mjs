// Live end-to-end check of a DEPLOYED Worker. Needs no key on your machine:
// the key stays inside Cloudflare. Run after `wrangler secret put` + `wrangler deploy`.
//
//   WORKER_URL=https://mom-sindy-api.<subdomain>.workers.dev ORIGIN=https://your-site node scripts/live-test.mjs
//
// ORIGIN must be one of the ALLOWED_ORIGINS in wrangler.toml.

const base = (process.env.WORKER_URL || "").replace(/\/+$/, "");
const origin = process.env.ORIGIN || "";
if (!base) { console.error("Set WORKER_URL to your deployed Worker address."); process.exit(2); }

const headers = { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) };
const context = {
  recipe: "Pap & chakalaka", stepIndex: 4,
  steps: ["Get your kitchen ready", "Prepare the vegetables", "Start the chakalaka", "Simmer the chakalaka", "Cook the pap", "Check, serve and enjoy"],
  stepText: "Bring the water and a pinch of salt to a boil in a separate pot. Sprinkle in the maize meal gradually while stirring firmly.",
  stepTip: "Steam can burn. Keep your face and hands away from the pot opening.",
  servings: 4, kitchen: "Gas stove", ingredients: ["2 cups maize meal", "6 cups water for soft pap", "2 onions, chopped"],
};

let failed = false;
const check = (name, pass, extra = "") => { console.log((pass ? "  ok  " : "FAIL  ") + name + (extra ? "  " + extra : "")); if (!pass) failed = true; };

const h = await fetch(base + "/health", { headers }).then(r => r.json()).catch(e => ({ error: String(e) }));
check("health reachable", h && h.ok === true, JSON.stringify(h));
check("key configured on the Worker", h && h.configured === true, h && h.configured === false ? "run: npx wrangler secret put OPENROUTER_API_KEY" : "");

const history = [];
async function ask(message) {
  const r = await fetch(base + "/chat", { method: "POST", headers, body: JSON.stringify({ message, context, history }) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

const a = await ask("My pap is getting lumpy, what do I do?");
check("real AI answer received", a.status === 200 && a.j.ok && a.j.reply && a.j.reply.length > 20, a.j.ok ? `model=${a.j.model}` : `status=${a.status} error=${a.j.error}`);
if (a.j.ok) {
  console.log("  Sindy: " + a.j.reply);
  history.push({ role: "user", content: "My pap is getting lumpy, what do I do?" }, { role: "assistant", content: a.j.reply });
  const b = await ask("And how long should I keep stirring?");
  check("follow-up uses conversation memory", b.status === 200 && b.j.ok, b.j.ok ? "" : `error=${b.j.error}`);
  if (b.j.ok) console.log("  Sindy: " + b.j.reply);
}
console.log(failed ? "\nLIVE TEST FAILED" : "\nLIVE TEST PASSED");
process.exit(failed ? 1 : 0);
