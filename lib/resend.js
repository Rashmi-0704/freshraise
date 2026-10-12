export function testRecipient() {
  return process.env.RESEND_TEST_TO || '';
}

export async function sendEmail({ to, subject, text, idempotencyKey }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set.');
  const from = process.env.RESEND_FROM || 'FreshRaise <onboarding@resend.dev>';
  const testTo = testRecipient();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      from,
      to: [testTo || to],
      subject: testTo ? `[Test, meant for ${to || 'founder'}] ${subject}` : subject,
      text,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Resend returned ${res.status}`);
  return data.id;
}
