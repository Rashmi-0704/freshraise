// "Krishi Labs Pvt. Ltd.", "Krishi Technologies" and "krishi" become the same key, which powers duplicate protection.
export function nameKey(name = '') {
  const words = /\b(private|pvt|limited|ltd|inc|llc|corp|corporation|co|technologies|technology|tech|labs|ai|hq|app|india)\b\.?/g;
  const base = String(name).toLowerCase();
  const key = base.replace(words, '').replace(/[^a-z0-9]/g, '');
  return key || base.replace(/[^a-z0-9]/g, ''); // a name made only of those words keeps them
}

// "https://www.KrishiLabs.in/about" becomes "krishilabs.in"
export function domainKey(url = '') {
  const host = String(url || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#:]/)[0];
  return host.replace(/^www\./, '').includes('.') ? host.replace(/^www\./, '') : '';
}

export function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))) // &#038; -> &, &#8217; -> ’
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&') // last, so "&amp;lt;" stays as the text "&lt;"
    .replace(/\s+/g, ' ')
    .trim();
}

// Runs async work with limited parallelism (keeps us inside Gemini's free rate limits).
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function iso(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
