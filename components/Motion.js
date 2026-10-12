'use client';

import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const exists = (selector) => document.querySelector(selector) !== null;

// Page-load motion for every page, built with GSAP. It tells the product's story: the sun rises,
// the startup rocket launches, outreach emails fly out as paper planes, and the funding garden grows
// stage by stage. Everything is skipped for people who prefer reduced motion.
export default function Motion() {
  const path = usePathname();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // ---- Sky banner: a little sunrise story ----
        if (exists('.horizon')) {
          const sky = gsap.timeline({ defaults: { ease: 'power3.out' } });
          sky
            .from('.sun', { y: 90, scale: 0.6, autoAlpha: 0, duration: 1.4 })
            .from('.d-cloud', { x: -40, autoAlpha: 0, duration: 1, stagger: 0.2 }, 0.2)
            .from('.d-rocket', { y: 130, autoAlpha: 0, duration: 1.1, ease: 'back.out(1.5)' }, 0.3)
            .from('.d-plane', { x: -170, y: 30, rotation: -14, autoAlpha: 0, duration: 1.2, stagger: 0.25 }, 0.5)
            .from('.g-stage', { scale: 0, transformOrigin: '50% 100%', duration: 0.6, stagger: 0.22, ease: 'back.out(2)' }, 0.7)
            .from('.g-coins circle', { scale: 0, transformOrigin: '50% 50%', duration: 0.35, stagger: 0.1, ease: 'back.out(3)' }, '>-0.1');

          // Gentle idle movement once everything is in place
          gsap.to('.d-rocket', { y: -7, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.5 });
          gsap.to('.d-plane-1', { x: 10, y: -6, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.8 });
          gsap.to('.d-plane-2', { x: -8, y: 5, duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 });
          gsap.to('.d-cloud-1', { x: 26, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });
          gsap.to('.d-cloud-2', { x: -20, duration: 18, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        }

        // ---- Headline: words rise in, then the highlighter sweeps across ----
        gsap.from('main .hello, main h1, main .lede', { y: 22, autoAlpha: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.15 });
        gsap.from('main h1 .mark', { backgroundSize: '0% 100%', duration: 0.9, ease: 'power2.inOut', delay: 0.75 });

        // ---- Status line and tiles; tile numbers count up from 0 ----
        if (exists('.status')) gsap.from('.status > *', { y: 12, autoAlpha: 0, duration: 0.5, stagger: 0.08, delay: 0.35 });
        if (exists('.tile')) {
          gsap.from('.tile', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.45 });
          document.querySelectorAll('.tile strong[data-count]').forEach((el) => {
            const end = Number(el.dataset.count) || 0;
            const n = { v: 0 };
            gsap.to(n, { v: end, duration: 1.2, delay: 0.6, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(n.v)) });
          });
        }

        // ---- Draft folder: cards slide in one after another ----
        if (exists('.folder')) {
          gsap.from('.folder-title, .folder-group, .folder-empty, .folder-note', { autoAlpha: 0, y: 8, duration: 0.5, stagger: 0.06, delay: 0.5 });
          gsap.from('.card-summary', { x: -26, autoAlpha: 0, duration: 0.55, stagger: 0.09, ease: 'power3.out', delay: 0.6 });
        }
        if (exists('.sent li')) gsap.from('.sent li', { y: 10, autoAlpha: 0, duration: 0.45, stagger: 0.06, delay: 0.7 });

        // ---- Pulse page ----
        if (exists('.pulse-today')) {
          gsap.from('.pulse-today', { y: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out', delay: 0.3 });
          gsap.from('.pulse-today li', { x: -14, autoAlpha: 0, duration: 0.5, stagger: 0.12, delay: 0.6 });
          gsap.from('.pulse-card', { y: 26, autoAlpha: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out', delay: 0.7 });
          gsap.from('.news li', { autoAlpha: 0, y: 6, duration: 0.35, stagger: 0.04, delay: 0.9 });
        }

        // ---- Thesis page: the arrow shoots into the bullseye ----
        if (exists('.thesis-art')) {
          gsap.from('.thesis-art', { scale: 0.7, autoAlpha: 0, rotation: -12, duration: 0.7, ease: 'back.out(1.7)', delay: 0.2 });
          gsap
            .timeline({ delay: 0.8 })
            .from('.t-arrow', { x: 60, y: -60, autoAlpha: 0, duration: 0.45, ease: 'power4.in' })
            .to('.thesis-art', { rotation: 3, duration: 0.08, yoyo: true, repeat: 3, ease: 'none' });
          gsap.from('.tform fieldset, .rescore', { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.4 });
        }
      });
      return () => mm.revert();
    },
    { dependencies: [path], revertOnUpdate: true }
  );

  return null;
}
