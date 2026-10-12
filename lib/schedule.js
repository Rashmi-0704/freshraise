// Time rules shared by the page, the pipeline and the morning email.
// Ages always come from the article's publish date (startups.announced_at), never from when we scraped it.

export const NEW_HOURS = 24; // "New today": announced in the last 24 hours
export const ARCHIVE_DAYS = Number(process.env.ARCHIVE_AFTER_DAYS || 7); // older drafts leave the folder
export const CRON_IST = '6:00 am'; // vercel.json: "30 0 * * *" UTC = 6:00 am IST

const IST_OFFSET_MS = 5.5 * 3600 * 1000;

export const isNew = (announcedAt, now = Date.now()) =>
  Boolean(announcedAt) && now - new Date(announcedAt).getTime() <= NEW_HOURS * 3600 * 1000;

// "today" if it's before 6 am IST right now, otherwise "tomorrow"
export function nextCheckLabel(now = Date.now()) {
  const ist = new Date(now + IST_OFFSET_MS);
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return `${minutes < 6 * 60 ? 'today' : 'tomorrow'}, around ${CRON_IST} IST`;
}
