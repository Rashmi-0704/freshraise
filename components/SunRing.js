// A ring that starts full when a round is announced and drains over the outreach window
// (the days until the draft leaves the folder). Age comes from the article's publish date.
export default function SunRing({ announcedAt, now, windowDays = 7 }) {
  const hours = announcedAt ? Math.max(0, (now - new Date(announcedAt).getTime()) / 3.6e6) : null;
  const remaining = hours == null ? 1 : Math.max(0, 1 - hours / (windowDays * 24));
  const tone = hours == null ? 'unknown' : hours < 24 ? 'fresh' : hours < 72 ? 'warm' : hours < windowDays * 24 * 0.75 ? 'cool' : 'late';
  const label = hours == null ? 'new' : hours < 1 ? '<1h' : hours < 48 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d`;
  const hoursLeft = hours == null ? windowDays * 24 : Math.max(0, windowDays * 24 - hours);
  const left = hoursLeft < 48 ? `${Math.ceil(hoursLeft)} hours` : `${Math.ceil(hoursLeft / 24)} days`;
  const r = 23;
  const c = 2 * Math.PI * r;
  const title =
    hours == null
      ? 'Announcement time unknown'
      : `Announced ${label === '<1h' ? 'under an hour' : label.replace('h', ' hours').replace('d', ' days')} ago. ${left} left before it leaves your folder.`;

  return (
    <div className={`ring ring-${tone}`} title={title} role="img" aria-label={title}>
      <svg viewBox="0 0 56 56" width="56" height="56">
        <circle cx="28" cy="28" r={r} className="ring-track" />
        <circle
          cx="28"
          cy="28"
          r={r}
          className="ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - remaining)}
          transform="rotate(-90 28 28)"
        />
      </svg>
      <span>{label}</span>
    </div>
  );
}
