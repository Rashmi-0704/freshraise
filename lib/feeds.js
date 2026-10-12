import { XMLParser } from 'fast-xml-parser';
import { stripHtml } from './util';

const googleNews = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:1d`)}&hl=en-IN&gl=IN&ceid=IN:en`;

// Free, keyless, live sources. Google News searches cover hundreds of publications at once.
export const FEEDS = [
  { name: 'Google News', url: googleNews('startup raises seed round India') },
  { name: 'Google News', url: googleNews('pre-seed funding Indian startup') },
  { name: 'Google News', url: googleNews('startup bags angel funding') },
  { name: 'Google News', url: googleNews('Indian-origin founders raise seed funding') },
  { name: 'Google News', url: googleNews('Indian founders startup seed round US') },
  { name: 'Inc42', url: 'https://inc42.com/feed/' },
  { name: 'Entrackr', url: 'https://entrackr.com/rss' },
  { name: 'ET Startups', url: 'https://economictimes.indiatimes.com/tech/startups/rssfeeds/78570550.cms' },
  { name: 'YourStory', url: 'https://yourstory.com/feed' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const text = (v) => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === 'object') return text(v['#text'] ?? v['@_href'] ?? '');
  return '';
};

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FreshRaiseBot/1.0)' },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${feed.name} returned ${res.status}`);
  const doc = parser.parse(await res.text());
  const raw = [].concat(doc?.rss?.channel?.item || doc?.feed?.entry || []);

  return raw
    .map((item) => {
      let title = stripHtml(text(item.title));
      const source = text(item.source) || feed.name;
      // Google News appends " - Publisher" to titles
      if (feed.name === 'Google News' && source && title.endsWith(` - ${source}`)) {
        title = title.slice(0, -(source.length + 3));
      }
      const date = new Date(text(item.pubDate || item.published || item.updated || item['dc:date']));
      return {
        title,
        url: text(item.link) || text(item.guid),
        snippet: stripHtml(text(item.description || item.summary || item['content:encoded'])).slice(0, 400),
        source,
        publishedAt: Number.isNaN(date.getTime()) ? null : date,
      };
    })
    .filter((a) => a.title && a.url);
}

export async function fetchAllFeeds() {
  const settled = await Promise.allSettled(FEEDS.map(fetchFeed));
  const items = [];
  const ok = new Set();
  const failed = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      items.push(...r.value);
      ok.add(FEEDS[i].name);
    } else {
      failed.push(FEEDS[i].name);
    }
  });
  return { items, sourcesOk: [...ok], failed };
}
