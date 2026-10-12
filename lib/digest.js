import { sql } from './db';
import { sendEmail } from './resend';
import { getUsdInr, inrLabel } from './money';

// Where the Morning Brief lives, for the link in the email
function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}

// After the 6 am run: tell Rohit what's waiting, or that the run hit a problem.
// A quiet morning with nothing waiting sends nothing, so the email never becomes noise.
// Returns 'sent', 'skipped (...)' or 'failed: ...'; never throws, so it can't break the run.
export async function sendMorningDigest(stats, error) {
  try {
    const to = process.env.DIGEST_TO || process.env.RESEND_TEST_TO;
    if (!to) return 'skipped (no DIGEST_TO)';

    const [waiting, [thesis], usdInr] = await Promise.all([
      sql`
        SELECT s.name, s.round_type, s.amount, s.fit_score
        FROM drafts d JOIN startups s ON s.id = d.startup_id
        WHERE d.status = 'draft'
        ORDER BY s.fit_score DESC NULLS LAST, s.announced_at DESC`,
      sql`SELECT sender_name FROM thesis WHERE id = 1`,
      getUsdInr(),
    ]);
    if (!waiting.length && !error) return 'skipped (quiet morning)';

    const name = thesis?.sender_name || 'Rohit';
    const n = waiting.length;
    const subject = error
      ? 'FreshRaise: this morning’s check hit a problem'
      : `${n} ${n === 1 ? 'founder' : 'founders'} just raised and fit your thesis`;

    const lines = [`Good morning ${name},`, ''];
    if (n) {
      lines.push(`${n} ${n === 1 ? 'draft is' : 'drafts are'} researched and waiting for you:`);
      for (const w of waiting.slice(0, 10)) {
        const amount = inrLabel(w.amount, usdInr);
        lines.push(`• ${w.name}: ${[w.round_type, amount].filter(Boolean).join(', ')} · fit ${w.fit_score}`);
      }
      if (n > 10) lines.push(`…and ${n - 10} more.`);
      lines.push('');
    }
    lines.push(`Open your Morning Brief: ${appUrl()}`, '');
    lines.push(
      `This morning’s check read ${stats.articles_scanned} articles and found ${stats.fundings_found} new seed ` +
        `${stats.fundings_found === 1 ? 'round' : 'rounds'}.`
    );
    if (error) {
      lines.push(`It hit a problem: ${error}`);
      lines.push('FreshRaise tries again tomorrow at 6:00 am. You can also click “Check for new rounds” now.');
    }
    lines.push('', 'FreshRaise');

    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // 2026-10-13
    await sendEmail({
      to,
      subject,
      text: lines.join('\n'),
      direct: true,
      idempotencyKey: `freshraise-digest-${day}${error ? '-problem' : ''}`, // at most one per morning
    });
    return 'sent';
  } catch (err) {
    return `failed: ${err.message}`;
  }
}
