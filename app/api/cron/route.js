import { runPipeline } from '@/lib/pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Hobby's limit with Fluid Compute (on by default)

// Vercel calls this every morning (see vercel.json) with the CRON_SECRET as a bearer token.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  // No secret set means the endpoint stays locked, so strangers can never use up the Gemini quota
  if (!secret) return Response.json({ error: 'CRON_SECRET is not set.' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runPipeline('cron');
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
