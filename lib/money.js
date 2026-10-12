// Funding news reports amounts many ways ("$1.1M", "USD 2 million", "Rs 6 Cr", "₹80 lakh").
// FreshRaise shows every amount in rupees, in crore / lakh.

const FALLBACK_RATE = Number(process.env.USD_INR || 96);
const DAY_MS = 12 * 3600 * 1000;
let cached = { rate: 0, at: 0 };

// Today's USD to INR rate from Frankfurter (free, no key, European Central Bank data).
// Kept for 12 hours per server instance; falls back to USD_INR if the service is down.
export async function getUsdInr() {
  if (cached.rate && Date.now() - cached.at < DAY_MS) return cached.rate;
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    const rate = (await res.json())?.rates?.INR;
    if (rate > 0) {
      cached = { rate, at: Date.now() };
      return rate;
    }
  } catch {
    // fall through to the fallback rate
  }
  return FALLBACK_RATE;
}

const MULTIPLIERS = [
  [/^(crore|cr)\b/, 1e7],
  [/^(lakh|lac|l)\b/, 1e5],
  [/^(billion|bn|b)\b/, 1e9],
  [/^(million|mn|m)\b/, 1e6],
  [/^(thousand|k)\b/, 1e3],
];

// "$1.1M" at 88 -> 96800000. Returns null when the amount or its currency can't be read.
export function amountToInr(amount, usdInr) {
  const s = String(amount || '').toLowerCase().replace(/,/g, '');
  const m = s.match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const rupees = /₹|\brs\.?|\binr\b|rupee|crore|\bcr\b|lakh/.test(s);
  const dollars = /\$|\busd\b|dollar/.test(s);
  if (!rupees && !dollars) return null; // another currency: leave it as reported

  const unit = s.slice(m.index + m[0].length).trim();
  const mult = MULTIPLIERS.find(([re]) => re.test(unit))?.[1] || 1;
  const value = Number(m[0]) * mult;
  return rupees ? value : value * usdInr;
}

// 96800000 -> "₹9.7 crore", 8000000 -> "₹80 lakh"
export function formatInr(n) {
  const short = (x) => (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10).toLocaleString('en-IN');
  if (n >= 1e7) return `₹${short(n / 1e7)} crore`;
  if (n >= 1e5) return `₹${short(n / 1e5)} lakh`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

// Safety net for Gemini's free text: "raised $1.1M from" -> "raised ₹10.6 crore from"
const DOLLAR_AMOUNT = /(?:US\s?)?\$\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|mn|billion|bn|thousand|[mkb])\b)?/gi;
export function rupeesInText(text, usdInr) {
  return String(text || '').replace(DOLLAR_AMOUNT, (match) => inrLabel(match, usdInr));
}

// What the app shows: the amount in rupees, or the original text if it can't be converted
export function inrLabel(amount, usdInr) {
  const n = amountToInr(amount, usdInr);
  return n ? formatInr(n) : String(amount || '');
}
