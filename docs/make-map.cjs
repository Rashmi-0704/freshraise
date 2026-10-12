// Builds the SIMPLE FreshRaise components map (same swimlane layout as the Aangan reference).
// The full version with every detail is docs/make-map-detailed.cjs.
// Usage: node make-map.cjs <output.svg>
const fs = require('fs');

const X0 = 24, ACTOR_W = 235, COL_W = 290, HEAD_Y = 94, HEAD_H = 70, ROW_H = 130;
const COLS = ['Trigger', 'Input', 'Context', 'Processing', 'AI', 'Output'];
const ROWS = [
  { name: 'Scheduler', sub: ['(Vercel Cron)'], bg: '#eef0fb', fill: '#e3e5fb', stroke: '#5b5bd6' },
  { name: 'Rohit', sub: ['(Recruitment lead)'], bg: '#fdf1ec', fill: '#ffe1d5', stroke: '#e8743b' },
  { name: 'News', sub: ['(10 RSS feeds)'], bg: '#eef4ff', fill: '#ffffff', stroke: '#5b8def' },
  { name: 'FreshRaise', sub: ['(app on Vercel)'], bg: '#fff8e6', fill: '#fff1c2', stroke: '#d9a400' },
  { name: 'AI', sub: ['(Gemini Flash)'], bg: '#e9f7ee', fill: '#d6f3e0', stroke: '#2fa35a' },
  { name: 'Database', sub: ['(Neon)'], bg: '#e8f5f8', fill: '#d3eef3', stroke: '#1c97ad' },
  { name: 'Email', sub: ['(Resend)'], bg: '#fcebf2', fill: '#fbd5e5', stroke: '#d6457f' },
];

const ROW_Y0 = HEAD_Y + HEAD_H;
const W = X0 + ACTOR_W + COL_W * COLS.length + X0;
const H = ROW_Y0 + ROW_H * ROWS.length + 70;
const cx = (c) => X0 + ACTOR_W + (c - 1) * COL_W + COL_W / 2;
const cy = (r) => ROW_Y0 + (r - 1) * ROW_H + ROW_H / 2;
const BW = 240, BH = 96;
const L = (c) => cx(c) - BW / 2, R = (c) => cx(c) + BW / 2;
const T = (r) => cy(r) - BH / 2, B = (r) => cy(r) + BH / 2;

// [row, col, lines, extra]
// [row, col, lines, extra]: short words only, at most 3 lines
const BOXES = [
  [1, 1, ['Runs every day', 'at 6:00 am IST']],
  [2, 1, ['Clicks “Check for', 'new rounds”']],
  [3, 2, ['Live startup', 'funding news']],
  [6, 3, ['Thesis set by Rohit', '+ memory, so no one', 'is contacted twice']],
  [4, 4, ['Keeps new seed', 'rounds from the', 'last 24 hours']],
  [5, 5, ['Scores the fit,', 'researches founders,', 'writes the email']],
  [4, 6, ['Draft folder', '+ Pulse page']],
  [2, 6, ['Reviews the draft', 'and clicks Send'], { bold: true }],
  [7, 6, ['Sends the email', 'to the founder']],
];

// Orthogonal dashed arrows as point lists: one clear path from news to founder
const ARROWS = [
  [[R(1), cy(1)], [cx(4), cy(1)], [cx(4), T(4)]], // daily run -> app
  [[cx(1), B(2)], [cx(1), cy(4) + 20], [L(4), cy(4) + 20]], // Rohit's check -> app
  [[cx(2), B(3)], [cx(2), cy(4) - 20], [L(4), cy(4) - 20]], // news -> app
  [[cx(4), B(4)], [cx(4), cy(5)], [L(5), cy(5)]], // app -> AI
  [[R(3), cy(6)], [cx(5), cy(6)], [cx(5), B(5)]], // thesis + memory -> AI
  [[cx(5), T(5)], [cx(5), cy(4)], [L(6), cy(4)]], // AI -> draft folder
  [[cx(6), T(4)], [cx(6), B(2)]], // draft folder -> Rohit
  [[R(6), cy(2)], [R(6) + 13, cy(2)], [R(6) + 13, cy(7)], [R(6) + 2, cy(7)]], // Rohit sends -> email
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
  const step = 27; // bigger, easier-to-read text in the simple map
  const first = cy(r) - ((lines.length - 1) * step) / 2 + 6;
  lines.forEach((t, k) => out.push(`<text x="${cx(c)}" y="${first + k * step}" text-anchor="middle" font-size="20" fill="#1e2a47">${esc(t)}</text>`));
  if (extra.bold) {
    // Label sits in the empty cell to the left, clear of the arrows
    out.push(`<text x="${L(c) - 16}" y="${cy(r) - 4}" text-anchor="end" font-size="16" font-weight="800" fill="${row.stroke}">HUMAN</text>`);
    out.push(`<text x="${L(c) - 16}" y="${cy(r) + 16}" text-anchor="end" font-size="16" font-weight="800" fill="${row.stroke}">BOUNDARY →</text>`);
  }
});

// Footer
const fy = ROW_Y0 + ROW_H * ROWS.length + 42;
out.push(`<text x="${W / 2}" y="${fy}" text-anchor="middle" font-size="17" fill="#5e6688">Dashed arrows show the flow · Nothing is sent without Rohit · freshraise.vercel.app</text>`);
out.push(`</svg>`);
fs.writeFileSync(process.argv[2], out.join('\n'));
console.log(`wrote ${process.argv[2]} (${W}x${H})`);
