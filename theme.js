(function () {
  'use strict';
  let current = 'light';
  try { if (localStorage.getItem('qwqsoft-theme') === 'dark') current = 'dark'; } catch (_) {}
  function apply(theme, persist = false) {
    current = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = current;
    document.querySelector('meta[name="theme-color"]').content = current === 'dark' ? '#333333' : '#ffffff';
    if (persist) {
      try { localStorage.setItem('qwqsoft-theme', current); } catch (_) {}
    }
    window.dispatchEvent(new Event('qwq-theme-change'));
  }
  let switching = false;
  async function toggle() {
    if (switching) return;
    const next = current === 'dark' ? 'light' : 'dark';
    const button = document.getElementById('theme-toggle');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    switching = true;
    // aria-disabled preserves focus while preventing repeated activation.
    button.setAttribute('aria-disabled', 'true');
    let applied = false, transition;
    function update() {
      if (applied) return;
      applied = true;
      apply(next, true);
    }
    try {
      if (reduced) { update(); return; }
      if (typeof document.startViewTransition !== 'function') {
        const fadeOut = document.body.animate([{opacity: 1}, {opacity: 0}], {duration: 150, easing: 'ease-in', fill: 'forwards'});
        await fadeOut.finished;
        update();
        fadeOut.cancel();
        await document.body.animate([{opacity: 0}, {opacity: 1}], {duration: 150, easing: 'ease-out'}).finished;
        return;
      }
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth-x), Math.max(y, innerHeight-y));
      transition = document.startViewTransition(update);
      await transition.ready;
      await document.documentElement.animate([
        {clipPath: `circle(0px at ${x}px ${y}px)`},
        {clipPath: `circle(${radius}px at ${x}px ${y}px)`}
      ], {duration: 450, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)'}).finished;
      await transition.finished;
    } catch (_) {
      if (transition) transition.skipTransition();
      document.body.getAnimations().forEach(animation => animation.cancel());
      update();
    } finally {
      switching = false;
      button.removeAttribute('aria-disabled');
    }
  }
  window.QWQ_THEME = { get current() { return current; }, toggle };
  apply(current);
})();
