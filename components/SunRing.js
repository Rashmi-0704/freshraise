const WINDOW_DAYS = 60;

// A ring that starts full when a round is announced and drains over the 60-day outreach window.
export default function SunRing({ announcedAt, now }) {
  const hours = announcedAt ? Math.max(0, (now - new Date(announcedAt).getTime()) / 3.6e6) : null;
  const remaining = hours == null ? 1 : Math.max(0, 1 - hours / (WINDOW_DAYS * 24));
  const tone = hours == null ? 'unknown' : hours < 24 ? 'fresh' : hours < 72 ? 'warm' : hours < 30 * 24 ? 'cool' : 'late';
  const label = hours == null ? 'new' : hours < 1 ? '<1h' : hours < 48 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d`;
  const daysLeft = hours == null ? WINDOW_DAYS : Math.max(0, Math.ceil(WINDOW_DAYS - hours / 24));
  const r = 23;
  const c = 2 * Math.PI * r;
  const title =
    hours == null
      ? 'Announcement time unknown'
      : `Announced ${label === '<1h' ? 'under an hour' : label.replace('h', ' hours').replace('d', ' days')} ago. ${daysLeft} days left in the outreach window.`;

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
