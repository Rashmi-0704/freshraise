// Hand-drawn startup doodles, all inline SVG so there are no image files to load.
// Strokes use the ink colour; fills use the dawn palette from globals.css.

const ink = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

/* ---------- Sky scene (Horizon) ---------- */

export function Rocket({ className }) {
  return (
    <svg className={className} viewBox="0 0 60 120" aria-hidden="true" {...ink}>
      <g className="puffs" fill="var(--paper)">
        <circle cx="30" cy="106" r="8" />
        <circle cx="17" cy="112" r="6" />
        <circle cx="43" cy="112" r="6.5" />
      </g>
      <path className="flame" d="M23 80 Q30 104 37 80 Q30 87 23 80Z" fill="var(--sun)" />
      <path d="M21 58 L9 78 L21 76Z M39 58 L51 78 L39 76Z" fill="var(--dusk)" />
      <path d="M30 6 C43 19 45 42 40 78 L20 78 C15 42 17 19 30 6Z" fill="var(--paper)" />
      <path d="M22 20 Q30 24 38 20" />
      <circle cx="30" cy="40" r="6.5" fill="var(--sky-high)" />
      <path d="M30 78 V88" />
    </svg>
  );
}

export function PaperPlane({ className }) {
  return (
    <svg className={className} viewBox="0 0 130 60" aria-hidden="true" {...ink}>
      <path className="trail" d="M2 52 C22 54 26 22 46 30 C60 36 50 50 41 43 C31 34 62 22 86 24" strokeDasharray="2 6" />
      <path d="M88 22 L126 8 L106 42 L98 30Z" fill="var(--paper)" />
      <path d="M98 30 L126 8" />
      <path d="M98 30 L100 40 L106 42" />
    </svg>
  );
}

export function Cloud({ className }) {
  return (
    <svg className={className} viewBox="0 0 80 36" aria-hidden="true" {...ink} strokeWidth="1.5">
      <path d="M8 32 Q2 32 4 25 Q6 18 15 20 Q18 8 32 10 Q42 2 52 10 Q62 8 64 18 Q76 18 75 27 Q74 32 66 32 Z" fill="var(--paper)" opacity=".92" />
    </svg>
  );
}

// The funding journey as a garden: idea, pre-seed, seed, then a Series A money tree.
export function Garden({ className }) {
  return (
    <svg className={className} viewBox="0 0 300 100" aria-hidden="true" {...ink}>
      {/* idea: a seed in the soil */}
      <ellipse cx="30" cy="96" rx="8" ry="5" fill="var(--sun-deep)" />
      <path d="M30 78 V85 M21 82 L25 86 M39 82 L35 86" strokeWidth="1.4" />
      <text x="30" y="68">idea</text>

      {/* pre-seed: first sprout */}
      <path d="M100 100 V80" />
      <path d="M100 87 C92 87 86 81 87 74 C94 74 100 79 100 87Z" fill="var(--leaf)" />
      <path d="M100 83 C106 81 112 75 111 68 C104 68 100 74 100 83Z" fill="var(--leaf)" />
      <text x="100" y="58" className="focus">pre-seed</text>

      {/* seed: a small plant */}
      <path d="M175 100 C173 86 177 72 175 56" />
      <path d="M175 90 C166 90 160 84 161 77 C168 77 174 82 175 90Z" fill="var(--leaf)" />
      <path d="M175 78 C183 77 189 71 188 64 C181 64 176 70 175 78Z" fill="var(--leaf)" />
      <path d="M175 66 C168 65 164 59 165 53 C171 54 175 59 175 66Z" fill="var(--leaf)" />
      <text x="175" y="42" className="focus">seed</text>

      {/* Series A: the money tree */}
      <path d="M262 100 V62" strokeWidth="3" />
      <circle cx="262" cy="46" r="24" fill="var(--leaf)" />
      <circle cx="252" cy="42" r="4.5" fill="var(--sun)" strokeWidth="1.3" />
      <circle cx="270" cy="35" r="4.5" fill="var(--sun)" strokeWidth="1.3" />
      <circle cx="268" cy="55" r="4.5" fill="var(--sun)" strokeWidth="1.3" />
      <text x="262" y="13">Series A</text>
    </svg>
  );
}

/* ---------- Small icons ---------- */

export function RocketIcon() {
  return (
    <svg className="icon icon-rocket" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...ink} strokeWidth="1.7">
      <path d="M12 2 C17 6 17 12 15.5 17 L8.5 17 C7 12 7 6 12 2Z" />
      <circle cx="12" cy="9" r="2" />
      <path d="M8.5 13 L5 17 L8.5 17 M15.5 13 L19 17 L15.5 17" />
      <path className="icon-flame" d="M10 19.5 Q12 23 14 19.5" />
    </svg>
  );
}

export function PlaneIcon() {
  return (
    <svg className="icon icon-plane" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...ink} strokeWidth="1.7">
      <path d="M3 11 L21 3 L15 21 L11 13Z" />
      <path d="M11 13 L21 3" />
    </svg>
  );
}

const roundIcons = {
  // Pre-seed: a seed with a tiny shoot
  'pre-seed': (
    <>
      <ellipse cx="12" cy="17" rx="5" ry="3.5" />
      <path d="M12 13.5 V9 M12 10 C10 9 9 7.5 9.5 6 C11 6 12 7.5 12 10" />
    </>
  ),
  // Seed: a two-leaf sprout
  seed: (
    <>
      <path d="M12 21 V11" />
      <path d="M12 14 C8 14 5 11 5.5 7 C9 7 12 10 12 14Z M12 12 C15 11 18.5 8.5 18 4.5 C14.5 4.5 12 8 12 12Z" />
    </>
  ),
  // Angel: wings
  angel: (
    <>
      <path d="M12 14 C9 8 5 7 2 8 C3 12 7 15 12 14Z M12 14 C15 8 19 7 22 8 C21 12 17 15 12 14Z" />
      <ellipse cx="12" cy="5" rx="4" ry="1.5" />
    </>
  ),
};

export function RoundIcon({ round = '' }) {
  const key = round.toLowerCase().includes('pre') ? 'pre-seed' : round.toLowerCase().includes('angel') ? 'angel' : 'seed';
  return (
    <svg className="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...ink} strokeWidth="1.7">
      {roundIcons[key]}
    </svg>
  );
}

export function PenIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...ink}>
      <path d="M12 3 L18 10 L12 21 L6 10Z" fill="var(--glow)" />
      <path d="M12 21 V13" />
      <circle cx="12" cy="11.5" r="1.5" />
    </svg>
  );
}

export function TargetIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...ink}>
      <circle cx="11" cy="13" r="8" />
      <circle cx="11" cy="13" r="4" fill="var(--sun)" />
      <path d="M11 13 L20 4 M17 3.5 L20 4 L20.5 7" />
    </svg>
  );
}

export function GiftIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...ink}>
      <rect x="4" y="10" width="16" height="11" rx="1.5" fill="var(--glow)" />
      <path d="M3 7 H21 V10 H3Z M12 7 V21" />
      <path d="M12 7 C10 3 6 4 7.5 7 M12 7 C14 3 18 4 16.5 7" />
    </svg>
  );
}

export function BuildingIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...ink}>
      <path d="M4 21 V8 L12 4 L20 8 V21Z" fill="var(--sky-low)" />
      <path d="M2 21 H22 M10 21 V16 H14 V21 M8 10 H9 M15 10 H16 M8 13 H9 M15 13 H16" />
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...ink}>
      <circle cx="9" cy="8" r="3.2" fill="var(--glow)" />
      <path d="M3 20 C3 15.5 5.7 13.5 9 13.5 C12.3 13.5 15 15.5 15 20" fill="var(--glow)" />
      <circle cx="16.5" cy="9" r="2.6" />
      <path d="M16 13.6 C19 13.4 21 15.4 21 19" />
    </svg>
  );
}

/* ---------- Larger illustrations ---------- */

// Empty state: coffee and the morning paper, nothing new yet
export function QuietMorning({ className }) {
  return (
    <svg className={className} viewBox="0 0 220 130" aria-hidden="true" {...ink}>
      <path d="M18 122 H202" />
      <path d="M26 46 L126 38 L132 120 L32 122Z" fill="var(--paper)" />
      <path d="M40 54 L84 51" strokeWidth="4" />
      <path d="M40 64 L116 58 M41 72 L76 70 M42 80 L76 78 M43 88 L76 86 M44 96 L77 95 M45 104 L78 103" strokeWidth="1.3" />
      <rect x="86" y="66" width="32" height="34" rx="2" fill="var(--sky-low)" strokeWidth="1.3" />
      <path d="M92 94 L100 84 L106 90 L114 76" strokeWidth="1.3" />
      <path d="M148 70 H186 L182 118 Q181 122 177 122 H157 Q153 122 152 118Z" fill="var(--sun)" />
      <path d="M185 80 Q198 80 196 92 Q194 102 183 102" />
      <path className="steam" d="M158 60 Q153 52 158 45 Q163 38 158 30 M168 60 Q163 52 168 45 Q173 38 168 30 M178 60 Q173 52 178 45 Q183 38 178 30" strokeWidth="1.5" />
    </svg>
  );
}

// Thesis page: the bullseye you're aiming for, with a sprout growing out of it
export function ThesisTarget({ className }) {
  return (
    <svg className={className} viewBox="0 0 130 120" aria-hidden="true" {...ink}>
      <circle cx="60" cy="66" r="48" fill="var(--paper)" />
      <circle cx="60" cy="66" r="32" fill="var(--glow)" />
      <circle cx="60" cy="66" r="15" fill="var(--sun)" />
      <path d="M60 66 L112 14" strokeWidth="2.2" />
      <path d="M104 8 L112 14 L118 22 M108 4 L112 14 M114 18 L124 20" />
      <path d="M60 66 C58 58 60 50 60 44" />
      <path d="M60 52 C53 52 49 47 50 41 C56 41 60 45 60 52Z" fill="var(--leaf)" />
    </svg>
  );
}
