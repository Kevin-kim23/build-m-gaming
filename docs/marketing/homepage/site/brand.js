// Dongramco 사이트 효과: 헤더 축소, 진행 막대, 등장 효과, 히어로 마우스 반응
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.header');
  const bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    header?.classList.toggle('is-scrolled', scrollY > 40);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // 등장 효과: 표시 대상에 자동으로 붙이고, 같은 묶음 안에서는 순서대로 지연
  const groups = ['.section-label', 'main h2', '.about-body p', '.section-heading>p', '.focus-card', '.principles details',
    '.product-row', '.contact-fields>div', '.company-list>div', '.g-row .g-copy', '.g-row .g-visual', '.kit-grid a', '.g-links a', '.service-card', '.stats div', '.reel figure'];
  const items = [];
  for (const sel of groups) document.querySelectorAll(sel).forEach((el, i, all) => {
    if (el.closest('.hero') || el.closest('.g-hero')) return;
    el.classList.add('reveal'); el.style.setProperty('--delay', `${Math.min(i, 6) * (all.length > 1 ? 0.08 : 0)}s`); items.push(el);
  });
  const watch = [...items, ...document.querySelectorAll('.contact, .reveal-cut')];
  if (reduce || !('IntersectionObserver' in window)) { watch.forEach(el => el.classList.add('is-in')); }
  else {
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    watch.forEach(el => io.observe(el));
  }

  // 히어로: 마우스 위치에 따라 엠블럼·격자·후광이 서로 다른 깊이로 움직임
  const stage = document.querySelector('.launch');
  if (stage && !reduce) {
    let raf = 0, tx = 0, ty = 0;
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width * 2 - 1; ty = (e.clientY - r.top) / r.height * 2 - 1;
      if (!raf) raf = requestAnimationFrame(() => { stage.style.setProperty('--mx', tx.toFixed(3)); stage.style.setProperty('--my', ty.toFixed(3)); raf = 0; });
    });
    stage.addEventListener('pointerleave', () => { stage.style.setProperty('--mx', 0); stage.style.setProperty('--my', 0); });
  }
})();
