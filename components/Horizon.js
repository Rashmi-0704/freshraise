import { Rocket, PaperPlane, Cloud, Garden } from './Doodles';

// The sky band at the top of the brief. The sun sits where it is in Rohit's sky right now (IST).
// Around it, the startup story: a rocket lifting off, outreach emails flying out as paper planes,
// and the funding journey growing along the horizon.
export default function Horizon({ hour }) {
  const t = Math.min(1, Math.max(0, (hour - 5) / 14)); // 5am to 7pm across the band
  const left = 6 + t * 88; // percent across
  const lift = Math.sin(t * Math.PI); // 0 at the horizon, 1 at noon
  return (
    <div className="horizon" aria-hidden="true" style={{ '--sun-x': `${left}%`, '--sun-lift': lift }}>
      <Cloud className="d-cloud d-cloud-1" />
      <Cloud className="d-cloud d-cloud-2" />
      <div className="sun" />
      <PaperPlane className="d-plane d-plane-1" />
      <PaperPlane className="d-plane d-plane-2" />
      <Rocket className="d-rocket" />
      <Garden className="d-garden" />
    </div>
  );
}
