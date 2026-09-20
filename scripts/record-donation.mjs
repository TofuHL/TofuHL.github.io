// Adds one real donation to the live totals in src/data/fundraising.json.
// This is the ONLY code path that is allowed to change totalRaised /
// donorCount — never edit those two fields by hand to "look better", and
// never fake an increment client-side (e.g. in localStorage). The number
// on the site must always equal the number a payment processor actually
// received.
//
// Usage:
//   DONATION_AMOUNT=250 node scripts/record-donation.mjs
//   node scripts/record-donation.mjs 250
//
// In production this is run by .github/workflows/record-donation.yml,
// triggered by a `repository_dispatch` call from a payment webhook — see
// the "Live fundraising counter" section of the README for the full
// Stripe → GitHub wiring.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const file = path.join(root, 'src/data/fundraising.json');

const amount = Number(process.env.DONATION_AMOUNT ?? process.argv[2]);

if (!Number.isFinite(amount) || amount <= 0) {
  console.error('Usage: DONATION_AMOUNT=<positive number> node scripts/record-donation.mjs');
  console.error('Received:', process.env.DONATION_AMOUNT ?? process.argv[2]);
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, 'utf8'));

data.totalRaised = Math.round((data.totalRaised ?? 0) + amount);
data.donorCount = (data.donorCount ?? 0) + 1;
data.asOf = new Date().toISOString().slice(0, 10);

writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

console.log(
  `Recorded a ${amount} ${data.currency} donation. ` +
    `New total: ${data.totalRaised} ${data.currency} from ${data.donorCount} donor(s).`,
);
