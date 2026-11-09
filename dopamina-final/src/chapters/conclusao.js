/* Capitulo 6: conclusao. Aprendizados em profundidade, linha do tempo e frase final. */
import { $, $$ } from '../core/dom.js';
import { reduce } from '../core/env.js';
import { gsap, SplitText } from '../core/gsap.js';
import { registerFx } from '../core/nav.js';
import { revealLines } from '../core/fx.js';

export function initConclusao() {
  const el = $('#conclusao');
  const items = $$('.take li', el);
  const line = $('.tl-line', el);
  const steps = $$('.timeline li', el);
  const closing = $('.closing', el);

  registerFx(mode => {
    revealLines($('h2', el), { trigger: el, start: 'top 72%' });
    if (reduce) return;
    const trigger = { trigger: el, start: mode === 'pin' ? 'top 45%' : 'top 70%', once: true };

    gsap.from(items, {
      z: -560, rotationX: -14, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.24,
      scrollTrigger: trigger
    });

    const tl = gsap.timeline({ scrollTrigger: { ...trigger, trigger: $('.next', el), start: mode === 'pin' ? 'top 62%' : 'top 78%' } });
    tl.from($('.next', el), { autoAlpha: 0, x: 50, duration: 0.7, ease: 'power3.out' })
      .from(line, { scaleY: 0, transformOrigin: '50% 0%', duration: 1.2, ease: 'power2.inOut' }, 0.2)
      .from(steps, { autoAlpha: 0, x: -18, duration: 0.45, ease: 'power2.out', stagger: 0.2 }, 0.3);

    SplitText.create(closing, {
      type: 'words,chars', autoSplit: false, aria: 'auto',
      onSplit(self) {
        const accent = self.chars.filter(c => c.closest('em'));
        const t = gsap.timeline({ scrollTrigger: { trigger: closing, start: mode === 'pin' ? 'top 92%' : 'top 85%', once: true } });
        t.from(self.chars, { yPercent: 70, rotationX: -80, autoAlpha: 0, transformOrigin: '50% 100%', duration: 0.5, ease: 'back.out(1.8)', stagger: 0.012 })
          .fromTo(accent, { color: '#e9eef8' }, { color: '#ff8a3d', duration: 0.3, stagger: 0.03 }, '-=0.1')
          .fromTo($('em', closing), { '--sw': 0 }, { '--sw': 1, duration: 0.7, ease: 'power3.inOut' }, '-=0.3');
        return t;
      }
    });
  });
}
