// Builds the FreshRaise swimlane components map (same layout as the Aangan reference).
// Usage: node make-map.cjs <output.svg>
const fs = require('fs');

const X0 = 24, ACTOR_W = 235, COL_W = 290, HEAD_Y = 94, HEAD_H = 70, ROW_H = 140;
const COLS = ['Trigger', 'Input', 'Context', 'Processing', 'AI', 'Output'];
const ROWS = [
  { name: 'Scheduler', sub: ['(Vercel Cron)'], bg: '#eef0fb', fill: '#e3e5fb', stroke: '#5b5bd6' },
  { name: 'News & Rates', sub: ['(RSS feeds,', 'Frankfurter)'], bg: '#eef4ff', fill: '#ffffff', stroke: '#5b8def' },
  { name: 'System', sub: ['(FreshRaise on Vercel)'], bg: '#fff8e6', fill: '#fff1c2', stroke: '#d9a400' },
  { name: 'AI Model', sub: ['(Gemini Flash)'], bg: '#e9f7ee', fill: '#d6f3e0', stroke: '#2fa35a' },
  { name: 'Database', sub: ['(Neon Postgres)'], bg: '#e8f5f8', fill: '#d3eef3', stroke: '#1c97ad' },
  { name: 'Rohit', sub: ['(Recruitment lead)'], bg: '#fdf1ec', fill: '#ffe1d5', stroke: '#e8743b' },
  { name: 'Email', sub: ['(Resend)'], bg: '#fcebf2', fill: '#fbd5e5', stroke: '#d6457f' },
  { name: 'Founder', sub: ['(Freshly funded startup)'], bg: '#eaf1fd', fill: '#fde3dc', stroke: '#e0533d' },
];

const ROW_Y0 = HEAD_Y + HEAD_H;
const W = X0 + ACTOR_W + COL_W * COLS.length + X0;
const H = ROW_Y0 + ROW_H * ROWS.length + 70;
const cx = (c) => X0 + ACTOR_W + (c - 1) * COL_W + COL_W / 2;
const cy = (r) => ROW_Y0 + (r - 1) * ROW_H + ROW_H / 2;
const BW = 240, BH = 104;
const L = (c) => cx(c) - BW / 2, R = (c) => cx(c) + BW / 2;
const T = (r) => cy(r) - BH / 2, B = (r) => cy(r) + BH / 2;

// [row, col, lines, extra]
const BOXES = [
  [1, 1, ['Vercel Cron fires', 'every day at 6:00 am', 'IST, with a secret']],
  [6, 1, ['Clicks “Check for', 'new rounds” at', 'any time']],
  [2, 2, ['10 live RSS feeds:', 'Google News, Inc42,', 'Entrackr, ET Startups,', 'YourStory, TechCrunch']],
  [2, 3, ['Frankfurter: today’s', 'USD → INR rate, so', 'every amount is in ₹']],
  [5, 3, ['Thesis row, plus', 'memory of every seen', 'URL and past startup']],
  [6, 3, ['Sets the thesis', '(₹ round size, min score)', 'and re-scores the', 'startups waiting']],
  [3, 4, ['Keeps last 24h,', 'funding news, unseen', 'URLs; blocks repeat', 'names + websites']],
  [4, 5, ['Screens seed rounds,', 'scores fit vs thesis,', 'researches founders,', 'drafts the email']],
  [3, 6, ['Morning Brief: ₹ amount,', 'fit score, background,', 'founders + draft']],
  [6, 6, ['Reviews, edits, Send', 'or Skip; marks replies.', 'Nothing sends', 'without him'], { bold: true }],
  [7, 6, ['6 am summary to Rohit;', 'sends each approved', 'email; startup never', 'drafted again']],
  [8, 6, ['Gets a personal', 'email right after', 'the raise']],
];

// Orthogonal dashed arrows as point lists
const ARROWS = [
  [[cx(1) - 40, B(1)], [cx(1) - 40, cy(3)], [L(4), cy(3)]], // cron -> system
  [[cx(2), B(2)], [cx(2), cy(3) - 32], [L(4), cy(3) - 32]], // feeds -> system
  [[cx(1) + 40, T(6)], [cx(1) + 40, cy(3) + 32], [L(4), cy(3) + 32]], // button -> system
  [[R(3), cy(2)], [cx(5) - 50, cy(2)], [cx(5) - 50, T(4)]], // rate -> gemini
  [[cx(4) + 50, B(3)], [cx(4) + 50, cy(4)], [L(5), cy(4)]], // system -> gemini
  [[cx(3), T(5)], [cx(3), cy(4) + 22], [cx(4) - 50, cy(4) + 22], [cx(4) - 50, B(3)]], // memory -> system
  [[R(3), cy(5)], [cx(5), cy(5)], [cx(5), B(4)]], // thesis -> gemini
  [[cx(3), T(6)], [cx(3), B(5)]], // rohit edits thesis
  [[cx(5) + 50, T(4)], [cx(5) + 50, cy(3)], [L(6), cy(3)]], // gemini -> brief
  [[cx(6), B(3)], [cx(6), T(6)]], // brief -> rohit
  [[cx(6), B(6)], [cx(6), T(7)]], // rohit -> resend
  [[cx(6), B(7)], [cx(6), T(8)]], // resend -> founder
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif">`);
out.push(`<defs><marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#1e2a47"/></marker></defs>`);
out.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
out.push(`<text x="${W / 2}" y="60" text-anchor="middle" font-size="34" font-weight="700" fill="#1e2a47">FreshRaise · Funding Outreach — Components Map</text>`);

// Row bands and actor cells
ROWS.forEach((row, i) => {
  const y = ROW_Y0 + i * ROW_H;
  out.push(`<rect x="${X0 + ACTOR_W}" y="${y}" width="${COL_W * COLS.length}" height="${ROW_H}" fill="${row.bg}"/>`);
  out.push(`<rect x="${X0}" y="${y}" width="${ACTOR_W}" height="${ROW_H}" fill="#1e2a47"/>`);
  if (i > 0) out.push(`<line x1="${X0}" y1="${y}" x2="${X0 + ACTOR_W}" y2="${y}" stroke="#34405f" stroke-width="1"/>`);
  const lines = 1 + row.sub.length;
  const top = y + ROW_H / 2 - (lines - 1) * 13 + 2;
  out.push(`<text x="${X0 + ACTOR_W / 2}" y="${top}" text-anchor="middle" font-size="23" font-weight="700" fill="#ffffff">${esc(row.name)}</text>`);
  row.sub.forEach((s, k) => out.push(`<text x="${X0 + ACTOR_W / 2}" y="${top + 28 + k * 22}" text-anchor="middle" font-size="16.5" fill="#c9d0e3">${esc(s)}</text>`));
});

// Column grid lines and header
COLS.forEach((_, c) => {
  const x = X0 + ACTOR_W + c * COL_W;
  if (c > 0) out.push(`<line x1="${x}" y1="${HEAD_Y}" x2="${x}" y2="${ROW_Y0 + ROW_H * ROWS.length}" stroke="#d5dae6" stroke-width="1.2"/>`);
});
out.push(`<path d="M${X0 + 12} ${HEAD_Y} H${W - X0 - 12} Q${W - X0} ${HEAD_Y} ${W - X0} ${HEAD_Y + 12} V${HEAD_Y + HEAD_H} H${X0} V${HEAD_Y + 12} Q${X0} ${HEAD_Y} ${X0 + 12} ${HEAD_Y}Z" fill="#1e2a47"/>`);
out.push(`<text x="${X0 + ACTOR_W / 2}" y="${HEAD_Y + 43}" text-anchor="middle" font-size="23" font-weight="600" fill="#ffffff">Actor</text>`);
COLS.forEach((name, c) => {
  const x = X0 + ACTOR_W + c * COL_W;
  out.push(`<line x1="${x}" y1="${HEAD_Y}" x2="${x}" y2="${HEAD_Y + HEAD_H}" stroke="#34405f" stroke-width="1"/>`);
  out.push(`<text x="${x + COL_W / 2}" y="${HEAD_Y + 43}" text-anchor="middle" font-size="23" font-weight="600" fill="#ffffff">${name}</text>`);
});

// Arrows (under the boxes)
ARROWS.forEach((pts) => {
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${Math.round(x)} ${Math.round(y)}`).join(' ');
  out.push(`<path d="${d}" fill="none" stroke="#1e2a47" stroke-width="2.4" stroke-dasharray="8 6" marker-end="url(#head)"/>`);
});

// Boxes
BOXES.forEach(([r, c, lines, extra = {}]) => {
  const row = ROWS[r - 1];
  const x = L(c), y = T(r);
  out.push(`<rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="12" fill="${row.fill}" stroke="${row.stroke}" stroke-width="${extra.bold ? 3.4 : 2.2}"/>`);
  const first = cy(r) - ((lines.length - 1) * 25) / 2 + 6;
  lines.forEach((t, k) => out.push(`<text x="${cx(c)}" y="${first + k * 25}" text-anchor="middle" font-size="17.5" fill="#1e2a47">${esc(t)}</text>`));
  if (extra.bold) {
    // Label sits in the empty cell to the left, clear of the arrows
    out.push(`<text x="${L(c) - 16}" y="${cy(r) - 4}" text-anchor="end" font-size="16" font-weight="800" fill="${row.stroke}">HUMAN</text>`);
    out.push(`<text x="${L(c) - 16}" y="${cy(r) + 16}" text-anchor="end" font-size="16" font-weight="800" fill="${row.stroke}">BOUNDARY →</text>`);
  }
});

// Footer
const fy = ROW_Y0 + ROW_H * ROWS.length + 42;
out.push(`<text x="${W / 2}" y="${fy}" text-anchor="middle" font-size="17" fill="#5e6688">Dashed arrows show the flow of data. Every tool runs on a free tier: total cost ₹0. Live at freshraise.vercel.app</text>`);
out.push(`</svg>`);
fs.writeFileSync(process.argv[2], out.join('\n'));
console.log(`wrote ${process.argv[2]} (${W}x${H})`);
