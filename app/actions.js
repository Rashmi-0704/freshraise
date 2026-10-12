'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sql, ensureSchema } from '@/lib/db';
import { runPipeline } from '@/lib/pipeline';
import { sendEmail, testRecipient } from '@/lib/resend';

export async function runNow() {
  try {
    const result = await runPipeline('manual');
    revalidatePath('/');
    return result;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function sendDraft(id, { to, subject, body }) {
  to = (to || '').trim();
  if (!subject?.trim() || !body?.trim()) return { ok: false, error: 'Subject and message can’t be empty.' };
  if (!testRecipient() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: 'Add the founder’s email address before sending.' };
  }

  // Lock the draft first so a double click can never send twice.
  // A lock older than 5 minutes means a send crashed half-way, so it can be retried.
  const locked = await sql`
    UPDATE drafts SET status = 'sending', sending_at = now(), to_email = ${to}, subject = ${subject}, body = ${body}
    WHERE id = ${id}
      AND (status = 'draft' OR (status = 'sending' AND sending_at < now() - interval '5 minutes'))
    RETURNING startup_id`;
  if (!locked.length) return { ok: false, error: 'This draft was already sent or skipped.' };

  try {
    // Same key on a retry, so Resend never delivers the same draft twice
    const resendId = await sendEmail({ to, subject, text: body, idempotencyKey: `freshraise-draft-${id}` });
    await sql`UPDATE drafts SET status = 'sent', sent_at = now(), resend_id = ${resendId} WHERE id = ${id}`;
    await sql`UPDATE startups SET status = 'sent' WHERE id = ${locked[0].startup_id}`;
    return { ok: true, to: testRecipient() || to };
  } catch (err) {
    await sql`UPDATE drafts SET status = 'draft' WHERE id = ${id}`;
    return { ok: false, error: `Resend couldn’t send it: ${err.message}` };
  }
}

export async function skipDraft(id) {
  const rows = await sql`UPDATE drafts SET status = 'skipped' WHERE id = ${id} AND status = 'draft' RETURNING startup_id`;
  if (rows.length) await sql`UPDATE startups SET status = 'skipped' WHERE id = ${rows[0].startup_id}`;
  return { ok: true };
}

export async function saveThesis(formData) {
  await ensureSchema();
  const f = (k) => String(formData.get(k) || '').trim();
  const minScore = Math.max(0, Math.min(100, parseInt(f('min_fit_score'), 10) || 65));
  await sql`
    UPDATE thesis SET
      accelerator_name = ${f('accelerator_name')}, sender_name = ${f('sender_name')}, sender_title = ${f('sender_title')},
      sectors = ${f('sectors')}, stages = ${f('stages')}, geography = ${f('geography')}, round_size = ${f('round_size')},
      exclusions = ${f('exclusions')}, program_pitch = ${f('program_pitch')}, min_fit_score = ${minScore},
      updated_at = now()
    WHERE id = 1`;
  revalidatePath('/thesis');
  redirect('/thesis?saved=1');
}
