(function () {
  'use strict';
  const field = document.querySelector('.particle-field');
  const shapes = window.QWQ_PARTICLE_SHAPES;
  if (!field || !shapes) return;
  const ns = 'http://www.w3.org/2000/svg';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const definitions = document.createElementNS(ns, 'svg');
  definitions.classList.add('particle-definitions');
  const defs = document.createElementNS(ns, 'defs');
  for (const [name, shape] of Object.entries(shapes)) {
    const path = document.createElementNS(ns, 'path');
    path.id = `particle-shape-${name}`;
    path.setAttribute('d', shape.path);
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    defs.append(path);
  }
  definitions.append(defs);
  field.append(definitions);

  const depths = [
    {name: 'distant', min: 35, max: 90, color: '#E6E6E6', speed: 7, parallax: 6, stroke: 1.333333},
    {name: 'far', min: 110, max: 240, color: '#D9D9D9', speed: 16, parallax: 18, stroke: 1.333333},
    {name: 'middle', min: 280, max: 520, color: '#CCCCCC', speed: 32, parallax: 42, stroke: 1.333333},
    {name: 'near', min: 720, max: 1280, color: '#B3B3B3', speed: 62, parallax: 80, stroke: 2.666667},
  ];
  let particles = [], fieldWidth = 0, fieldHeight = 0, frame = 0, layoutFrame = 0;
  let lastTime = 0, clock = 0, seed = 731;
  const targetPointer = {x: 0, y: 0}, smoothPointer = {x: 0, y: 0};
  function resetPointer() { targetPointer.x = targetPointer.y = 0; }
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function paint(p) {
    p.node.style.transform = `translate3d(${p.x-p.width/2-smoothPointer.x*p.parallax}px, ${p.y-p.height/2-smoothPointer.y*p.parallax}px, 0) rotate(${p.angle}deg)`;
  }
  function makeParticle(index, total, width) {
    const depth = depths[Math.floor(index / (total / depths.length)) % depths.length];
    const names = ['o', 's', 'qwq'];
    const name = names[index % names.length];
    const shape = shapes[name];
    const viewBox = shape.viewBox.split(' ').map(Number);
    const ratio = viewBox[3] / viewBox[2];
    const angle = [0, 45, -45, 90][index % 4];
    const radians = angle * Math.PI / 180;
    const rotatedWidth = Math.abs(Math.cos(radians)) + ratio*Math.abs(Math.sin(radians));
    const rotatedHeight = Math.abs(Math.sin(radians)) + ratio*Math.abs(Math.cos(radians));
    const preferred = (depth.min + random()*(depth.max-depth.min)) * (width < 600 ? .62 : 1);
    // Near-plane glyphs may exceed the viewport; the scene clips at the screen edge.
    const size = Math.min(preferred, Math.max(fieldWidth, fieldHeight)*1.35);
    const node = document.createElement('div');
    node.className = 'particle';
    node.dataset.depth = depth.name;
    node.style.width = `${size}px`;
    node.style.height = `${size*ratio}px`;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', shape.viewBox);
    // The fill is always crisp opaque white. Only the outline softens in the distance.
    for (const outline of [false, true]) {
      const use = document.createElementNS(ns, 'use');
      use.setAttribute('href', `#particle-shape-${name}`);
      use.setAttribute('fill', outline ? 'none' : '#FFFFFF');
      use.setAttribute('stroke', outline ? depth.color : 'none');
      use.setAttribute('stroke-width', String(depth.stroke));
      if (outline) use.classList.add('particle-outline');
      svg.append(use);
    }
    node.append(svg);
    const p = {node, depth: depth.name, width: size, height: size*ratio, angle,
      rx: size*rotatedWidth/2+5, ry: size*rotatedHeight/2+5,
      vx: depth.speed*(random() > .5 ? 1 : -1), vy: depth.speed*(.4+random()*.35)*(random() > .5 ? 1 : -1),
      phase: random()*Math.PI*2, parallax: depth.parallax};
    p.x = random()*fieldWidth;
    p.y = random()*fieldHeight;
    // Big defocused shapes start at the periphery while smaller shapes fill the scene.
    if (depth.name === 'near') {
      if (index%2) p.x = index%4 === 1 ? -p.rx*.3 : fieldWidth+p.rx*.3;
      else p.y = index%4 === 0 ? -p.ry*.3 : fieldHeight+p.ry*.3;
    }
    field.append(node);
    paint(p);
    return p;
  }
  function layout() {
    fieldWidth = field.clientWidth;
    fieldHeight = field.clientHeight;
    particles.forEach(p => p.node.remove());
    particles = [];
    seed = 731;
    const total = fieldWidth < 600 ? 36 : 64;
    for (let i = 0; i < total; i++) {
      const particle = makeParticle(i, total, fieldWidth);
      if (particle) particles.push(particle);
    }
    lastTime = 0;
  }
  function scheduleLayout() {
    // Hide during reflow; no stale particle positions can cross a newly moved boundary.
    field.style.visibility = 'hidden';
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      layout();
      field.style.visibility = 'visible';
    });
  }
  function tick(time) {
    if (motion.matches || document.hidden) {
      lastTime = 0;
      return;
    }
    const elapsed = lastTime ? Math.min((time-lastTime)/1000, .05) : 0;
    lastTime = time;
    clock += elapsed;
    const follow = 1-Math.exp(-elapsed/.18);
    smoothPointer.x += (targetPointer.x-smoothPointer.x)*follow;
    smoothPointer.y += (targetPointer.y-smoothPointer.y)*follow;
    for (const p of particles) {
      p.x += p.vx*elapsed;
      p.y += (p.vy + Math.sin(clock*.6+p.phase)*3)*elapsed;
      // Wrap only after the entire rotated glyph and its blur have left the screen.
      // The replacement is also completely offscreen, so there is no visible teleport.
      const bleed = 40+p.parallax;
      if (p.x-p.rx > fieldWidth+bleed) p.x = -p.rx-bleed;
      else if (p.x+p.rx < -bleed) p.x = fieldWidth+p.rx+bleed;
      if (p.y-p.ry > fieldHeight+bleed) p.y = -p.ry-bleed;
      else if (p.y+p.ry < -bleed) p.y = fieldHeight+p.ry+bleed;
      paint(p);
    }
    frame = requestAnimationFrame(tick);
  }
  function syncMotion() {
    cancelAnimationFrame(frame);
    lastTime = 0;
    if (motion.matches || document.hidden) {
      resetPointer();
      smoothPointer.x = smoothPointer.y = 0;
      particles.forEach(paint);
    }
    if (!motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
  }
  window.addEventListener('resize', scheduleLayout);
  document.getElementById('language').addEventListener('change', scheduleLayout);
  window.addEventListener('languagechange', scheduleLayout);
  document.addEventListener('pointermove', event => {
    if (motion.matches || event.pointerType !== 'mouse') return;
    targetPointer.x = Math.max(-1, Math.min(1, event.clientX/innerWidth*2-1));
    targetPointer.y = Math.max(-1, Math.min(1, event.clientY/innerHeight*2-1));
  }, {passive: true});
  document.documentElement.addEventListener('pointerleave', resetPointer);
  window.addEventListener('blur', resetPointer);
  document.addEventListener('visibilitychange', syncMotion);
  motion.addEventListener('change', syncMotion);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleLayout);
    ['main', '.welcome', '.site-footer', '.site-header'].forEach(selector => observer.observe(document.querySelector(selector)));
  }
  document.fonts.ready.then(scheduleLayout);
  document.fonts.addEventListener('loadingdone', scheduleLayout);
  scheduleLayout();
  syncMotion();
})();
