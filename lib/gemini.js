import { sleep } from './util';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Free tier allows only a few requests per minute, so calls are spaced out instead of fired in a burst.
const RPM = Number(process.env.GEMINI_RPM || 10);
const GAP_MS = Math.ceil(60000 / Math.max(1, RPM));
let nextSlot = 0;

async function waitForSlot() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + GAP_MS;
  if (at > now) await sleep(at - now);
}

// How long Gemini asked us to wait after a 429, e.g. "retryDelay": "31s"
function retryDelayMs(text) {
  const m = text.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
  return m ? Math.ceil(Number(m[1]) * 1000) : 0;
}

// One small wrapper for every AI task. Calls the REST API directly, so there's no SDK to keep updated.
// `deadline` is a timestamp (ms): the call gives up instead of running past it.
export async function gemini({ prompt, system, json = true, search = false, fast = false, temperature = 0.4, deadline }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const end = deadline || Date.now() + 45000;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  // JSON mode can't be combined with Google Search, so search calls parse JSON out of plain text.
  if (json && !search) body.generationConfig.responseMimeType = 'application/json';
  if (search) body.tools = [{ google_search: {} }];
  // Keep "thinking" short on quick classification calls to save time.
  if (fast) {
    body.generationConfig.thinkingConfig = model.includes('2.5') ? { thinkingBudget: 0 } : { thinkingLevel: 'low' };
  }

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    await waitForSlot();
    const timeLeft = end - Date.now();
    if (timeLeft < 3000) throw lastError || new Error('Ran out of time before Gemini could answer.');

    let res;
    try {
      res = await fetch(`${BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(timeLeft), // never hang the whole run on one slow request
      });
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') throw new Error('Gemini took too long to answer.');
      throw err;
    }

    if (res.ok) {
      const data = await res.json();
      const out = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
      if (!out) throw new Error('Gemini returned an empty response.');
      return json ? parseJson(out) : out;
    }

    const text = await res.text();
    lastError = new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);

    // Some models don't accept the thinking setting. Drop it and try again.
    if (res.status === 400 && body.generationConfig.thinkingConfig && /thinking/i.test(text)) {
      delete body.generationConfig.thinkingConfig;
      continue;
    }
    if (res.status === 429 || res.status === 503) {
      // Daily quota used up: retrying won't help until tomorrow.
      if (/PerDay/i.test(text)) throw new Error('Gemini free-tier daily limit reached. It resets tomorrow.');
      const wait = Math.max(retryDelayMs(text), 4000 * (attempt + 1));
      if (Date.now() + wait > end - 5000) break; // not enough time to wait it out; the next run picks it up
      await sleep(wait);
      continue;
    }
    break;
  }
  throw lastError;
}

export function parseJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Could not read JSON from the Gemini response.');
  }
}
