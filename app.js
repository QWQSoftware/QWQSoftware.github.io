(function () {
  'use strict';
  const copy = window.QWQ_TRANSLATIONS;
  const preferenceKey = 'qwqsoft-language';
  const select = document.getElementById('language');
  const themeToggle = document.getElementById('theme-toggle');
  function syncThemeButton() {
    const dark = window.QWQ_THEME.current === 'dark';
    const text = copy[document.documentElement.lang] || copy.en;
    const label = dark ? text.themeLight : text.themeDark;
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
    themeToggle.querySelector('img').src = 'assets/icons/carbon-' + (dark ? 'sun' : 'moon') + '.svg';
    document.querySelector('.wordmark.symbol').src = dark ? 'assets/brand/qwq_white.svg' : 'assets/brand/qwq.svg';
  }
  themeToggle.addEventListener('click', () => window.QWQ_THEME.toggle());
  window.addEventListener('qwq-theme-change', syncThemeButton);
  const toggle = document.getElementById('language-toggle');
  const panel = document.getElementById('language-panel');
  const current = document.getElementById('language-current');
  const optionButtons = Array.from(select.options, option => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ui-button language-option';
    button.dataset.language = option.value;
    if (option.lang) button.lang = option.lang;
    panel.append(button);
    return button;
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let panelAnimation;
  function animatePanel(open) {
    const start = { opacity: getComputedStyle(panel).opacity, transform: getComputedStyle(panel).transform, clipPath: getComputedStyle(panel).clipPath };
    if (panelAnimation) panelAnimation.cancel();
    if (reducedMotion.matches || !panel.animate) {
      panel.hidden = !open;
      return;
    }
    const collapsed = { opacity: 0, transform: 'translateY(-6px)', clipPath: 'inset(0 0 100% 0)' };
    const expanded = { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0% 0)' };
    const animation = panel.animate([open ? collapsed : start, open ? expanded : collapsed], { duration: 180, easing: open ? 'ease-out' : 'ease-in', fill: 'both' });
    panelAnimation = animation;
    animation.onfinish = () => {
      if (panelAnimation !== animation) return;
      panel.hidden = !open;
      animation.cancel();
      panelAnimation = null;
    };
  }
  function closePanel(returnFocus = false) {
    if (toggle.getAttribute('aria-expanded') === 'false') return;
    toggle.setAttribute('aria-expanded', 'false');
    panel.inert = true;
    animatePanel(false);
    if (returnFocus) toggle.focus();
  }
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches || !panelAnimation) return;
    panelAnimation.cancel();
    panelAnimation = null;
    panel.hidden = toggle.getAttribute('aria-expanded') !== 'true';
  });

  // Explicit script tags take precedence over region: zh-Hans-TW stays simplified.
  function matchLanguage(tag) {
    const parts = String(tag).toLowerCase().replace(/_/g, '-').split('-');
    if (parts[0] === 'zh') {
      if (parts.includes('hant')) return 'zh-Hant';
      if (parts.includes('hans')) return 'zh-Hans';
      return parts.some(part => ['tw', 'hk', 'mo'].includes(part)) ? 'zh-Hant' : 'zh-Hans';
    }
    return ['en', 'fr', 'ja', 'ko'].includes(parts[0]) ? parts[0] : null;
  }
  function detectLanguage(languages) {
    for (const tag of languages) {
      const match = matchLanguage(tag);
      if (match) return match;
    }
    return 'en';
  }
  function readPreference() {
    try { return localStorage.getItem(preferenceKey); } catch (_) { return null; }
  }
  let preference = readPreference();
  if (!Object.hasOwn(copy, preference)) preference = 'auto';

  function applyLanguage(language) {
    const text = copy[language];
    document.documentElement.lang = language;
    document.title = text.title;
    document.querySelector('meta[name="description"]').content = text.description;
    document.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = text[element.dataset.i18n];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
      element.setAttribute('aria-label', text[element.dataset.i18nAria]);
    });
    select.value = preference;
    syncThemeButton();
    current.textContent = preference === 'auto' ? text.auto : select.selectedOptions[0].textContent;
    toggle.setAttribute('aria-label', text.language + ': ' + current.textContent);
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', text.language);
    optionButtons.forEach((button, index) => {
      button.textContent = select.options[index].textContent;
      button.setAttribute('aria-pressed', String(button.dataset.language === preference));
    });
  }
  function refresh() {
    applyLanguage(preference === 'auto'
      ? detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language])
      : preference);
  }
  select.addEventListener('change', () => {
    preference = select.value;
    try {
      if (preference === 'auto') localStorage.removeItem(preferenceKey);
      else localStorage.setItem(preferenceKey, preference);
    } catch (_) { /* Device storage is optional; keep the choice for this page. */ }
    refresh();
  });
  window.addEventListener('languagechange', () => {
    if (preference === 'auto') refresh();
  });
  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') return closePanel();
    panel.hidden = false;
    panel.inert = false;
    toggle.setAttribute('aria-expanded', 'true');
    animatePanel(true);
    optionButtons.find(button => button.dataset.language === preference).focus();
  });
  optionButtons.forEach(button => button.addEventListener('click', () => {
    select.value = button.dataset.language;
    select.dispatchEvent(new Event('change'));
    closePanel(true);
  }));
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.language-control')) closePanel();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      closePanel(true);
    }
  });
  document.querySelector('.language-control').addEventListener('focusout', event => {
    // Safari doesn't focus buttons on click, so relatedTarget is null when clicking an option;
    // outside clicks are handled by the pointerdown listener above.
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) closePanel();
  });
  refresh();
  select.hidden = true;
  document.querySelector('.language-label').hidden = true;
  toggle.hidden = false;
  themeToggle.hidden = false;
  // Use the actual primary visibility, matching its container query exactly.
  const brandStage = document.querySelector('.brand-stage');
  const primary = document.querySelector('.wordmark.primary');
  const footerLogo = document.querySelector('.corner-wordmark');
  function syncFooterLogo() {
    const fullWordmark = getComputedStyle(primary).display !== 'none';
    document.body.classList.toggle('primary-visible', fullWordmark);
    const asset = fullWordmark ? 'qwq_white.svg' : 'qwqsoft_compact_white.svg';
    const src = 'assets/brand/' + asset;
    if (footerLogo.getAttribute('src') !== src) {
      footerLogo.src = src;
      footerLogo.width = fullWordmark ? 638 : 985;
      footerLogo.height = fullWordmark ? 247 : 131;
    }
  }
  new ResizeObserver(syncFooterLogo).observe(brandStage);
  syncFooterLogo();

  const credits = document.querySelector('.footer-credits');
  const creditsSummary = credits.querySelector('summary');
  const creditsContent = credits.querySelector('.footer-credits-content');
  let creditsAnimation;
  let creditsExpanded = credits.open;
  function finishCredits() {
    if (creditsAnimation) creditsAnimation.cancel();
    creditsAnimation = null;
    credits.open = creditsExpanded;
    creditsContent.inert = !creditsExpanded;
    creditsSummary.setAttribute('aria-expanded', String(creditsExpanded));
  }
  creditsSummary.addEventListener('click', event => {
    if (!creditsContent.animate) return;
    event.preventDefault();
    const height = credits.open ? creditsContent.getBoundingClientRect().height : 0;
    const opacity = credits.open ? getComputedStyle(creditsContent).opacity : 0;
    creditsExpanded = !creditsExpanded;
    if (creditsAnimation) creditsAnimation.cancel();
    creditsSummary.setAttribute('aria-expanded', String(creditsExpanded));
    creditsContent.inert = !creditsExpanded;
    if (reducedMotion.matches) { finishCredits(); return; }
    credits.open = true;
    const animation = creditsContent.animate([
      { height: height + 'px', opacity },
      { height: (creditsExpanded ? creditsContent.scrollHeight : 0) + 'px', opacity: creditsExpanded ? 1 : 0 }
    ], { duration: 220, easing: 'ease-in-out', fill: 'both' });
    creditsAnimation = animation;
    animation.onfinish = () => {
      if (creditsAnimation === animation) finishCredits();
    };
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && creditsAnimation) finishCredits();
  });

  const projectButton = document.querySelector('.project-button');
  const iconMotion = projectButton.querySelector('.project-icon-motion');
  const projectIcon = projectButton.querySelector('.project-icon');
  let iconActive = false, iconAnimations = [];
  let projectHovered = false;
  function syncProjectAnimation() {
    const active = !reducedMotion.matches && (projectHovered || projectButton.matches(':focus-visible'));
    if (active === iconActive) return;
    iconActive = active;
    const position = getComputedStyle(iconMotion).transform;
    const scale = getComputedStyle(projectIcon).transform;
    iconAnimations.forEach(animation => animation.cancel());
    iconAnimations = [];
    if (!active) {
      if (!reducedMotion.matches) {
        iconAnimations.push(iconMotion.animate([{transform: position}, {transform: 'translate(0, 0)'}], {duration: 180, easing: 'ease-out'}));
        iconAnimations.push(projectIcon.animate([{transform: scale}, {transform: 'scale(1)'}], {duration: 180, easing: 'ease-out'}));
      }
      return;
    }
    iconAnimations.push(projectIcon.animate([
      {transform: 'scale(1)', offset: 0},
      {transform: 'scale(1.25)', offset: .25},
      {transform: 'scale(1)', offset: 1}
    ], {duration: 240, easing: 'ease-out'}));
    const horizontalFrames = Array.from({length: 61}, (_, index) => {
      const offset = index / 60;
      const x = 3 * (1 - Math.cos(2 * Math.PI * offset));
      return {transform: `translate(${x}px, 0)`, offset};
    });
    iconAnimations.push(iconMotion.animate(horizontalFrames,
      {duration: 900, delay: 240, iterations: Infinity, easing: 'linear'}));
  }
  projectButton.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    projectHovered = true;
    syncProjectAnimation();
  });
  projectButton.addEventListener('pointerleave', () => {
    projectHovered = false;
    syncProjectAnimation();
  });
  projectButton.addEventListener('focus', syncProjectAnimation);
  projectButton.addEventListener('blur', syncProjectAnimation);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      iconAnimations.forEach(animation => animation.cancel());
      iconAnimations = [];
      iconActive = false;
    } else syncProjectAnimation();
  });
})();
