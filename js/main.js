/* Centre Únic — una empremta real que neix del soroll, canvia amb cada secció i es regenera quan la toques */
gsap.registerPlugin(ScrollTrigger);
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => innerWidth <= 900;
const DPR = () => Math.min(2, devicePixelRatio || 1);
const IPF = innerWidth > 900 ? 2 : 1; // passos de simulació per fotograma
const GL = Print.supported;
const SAND = [.937, .902, .847], EUCA = [.18, .29, .247];
if (!GL) document.documentElement.classList.add('no-gl');

/* ---------- l'empremta de cada secció ---------- */
const SPECS = { hero: ['whorl', 3], manifest: ['loopR', 5], method: ['loopL', 9], case: ['twin', 4], treat: ['whorl', 12], onco: ['tent', 6], team: ['loopR', 21], gen: ['loopL', 55], voices: ['arch', 8], visit: ['twin', 14] };
const specFor = (key) => { const [cls, n] = SPECS[key] || SPECS.hero; return Print.spec(n * 7919, cls); };

/* ---------- una empremta viva sobre un canvas ---------- */
function Live(canvas, opts) {
  let eng;
  try { eng = Print.Engine(canvas, opts); } catch (e) { return null; }
  const L = { eng, k: 1, from: null, to: null, budget: 0, dirty: true, on: true, settled: true, onSettle: null };
  L.size = () => {
    const r = canvas.getBoundingClientRect();
    eng.resize(Math.max(2, Math.round(r.width * DPR())), Math.max(2, Math.round(r.height * DPR())));
    L.dirty = true;
  };
  L.redraw = () => { L.dirty = true; };
  // neix: soroll que s'ordena mentre la tinta s'escampa des del centre
  L.grow = (spec, dur = 2.4) => {
    gsap.killTweensOf(L); gsap.killTweensOf(eng.st, 'press'); L.to = null; L.k = 1;
    eng.reset(spec); L.budget = 120; L.settled = false;
    if (RM) { eng.step(120); L.budget = 0; eng.st.press = 1; L.dirty = true; L.settle(); return; }
    gsap.fromTo(eng.st, { press: 0 }, { press: 1, duration: dur, ease: 'power2.out', onUpdate: L.redraw });
  };
  // canvia: els nuclis i els deltes es desplacen i les crestes es reorganitzen
  L.morph = (spec, dur = 1.9) => {
    if (RM) return;
    gsap.killTweensOf(L);
    L.from = { ...eng.spec }; L.to = spec; L.k = 0; L.settled = false;
    gsap.to(L, { k: 1, duration: dur, ease: 'power2.inOut' });
    L.budget = Math.max(L.budget, 50);
  };
  L.settle = () => { L.settled = true; L.onSettle && L.onSettle(); };
  L.tick = () => {
    if (!L.on) return;
    if (L.to) {
      if (L.k < 1) eng.setSpec(Print.mix(L.from, L.to, L.k));
      else { eng.setSpec(L.to); L.to = null; L.budget = Math.max(L.budget, 45); }
    }
    if (L.to || L.budget > 0) {
      const n = L.slow ? 1 : IPF;
      eng.step(n); eng.st.brush = [0, 0, 0];
      L.budget = Math.max(0, L.budget - n); L.dirty = true;
      if (!L.to && L.budget === 0 && !L.settled) L.settle();
    }
    if (L.dirty) { eng.draw(); L.dirty = false; }
  };
  // tocar-la: la pell es desordena on la toques i es regenera sola
  L.touch = (cx, cy, r = .11) => {
    if (RM) return;
    const [x, y] = eng.toPrint(cx, cy);
    if (Math.abs(x) > 1.1 || Math.abs(y) > 1.35) return;
    eng.st.brush = [x, y, r]; L.budget = Math.max(L.budget, 48);
  };
  L.size();
  return L;
}
const lives = [];
gsap.ticker.add(() => lives.forEach((l) => l && l.tick()));

/* ---------- la columna fixa ---------- */
const printEl = $('#print'), printCv = $('#printCanvas');
const P = GL ? Live(printCv, { simW: narrow() ? 256 : 320, style: { ink: SAND, thick: .42, scale: narrow() ? .9 : .8, offY: narrow() ? .03 : .045 } }) : null;
if (P) lives.push(P); else document.documentElement.classList.add('no-gl');
let active = $('.block'), activeKey = 'hero';
const typeLabel = (spec, n) => t('type.' + spec.cls) + (n > 2 ? ' · ' + t('print.ridges', { n }) : '');
function caption(fade) {
  $('#printCap').textContent = t(active.dataset.cap);
  if (fade && !RM) gsap.fromTo('#printCap', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .7, ease: 'power2.out' });
}
function readout() {
  if (!P) return;
  const s = P.eng.spec, n = activeKey === 'gen' && genSpec && G.n ? G.n : P.eng.ridgeCount();
  $('#printType').textContent = typeLabel(s, n);
  if (!RM) gsap.fromTo('#printType', { opacity: 0 }, { opacity: .78, duration: .6 });
}
if (P) {
  P.onSettle = readout;
  P.grow(specFor('hero'), 2.8);
  new IntersectionObserver((es) => es.forEach((e) => { P.on = e.isIntersecting; if (P.on) P.dirty = true; })).observe(printEl);
  // tocar o passar el ratolí per sobre
  const onPtr = (e) => { if (e.pointerType === 'mouse' || e.buttons || e.type === 'pointerdown') { P.touch(e.clientX, e.clientY); printEl.classList.add('is-touched'); } };
  printCv.addEventListener('pointermove', onPtr);
  printCv.addEventListener('pointerdown', onPtr);
}
caption(false);

let genSpec = null;
function activate(b) {
  if (b === active) return;
  active = b; activeKey = b.dataset.print;
  caption(true);
  if (!P || narrow()) return;
  $('#printType').textContent = ' ';
  P.morph(activeKey === 'gen' && genSpec ? genSpec : specFor(activeKey));
}
$$('.block').forEach((b) => ScrollTrigger.create({ trigger: b, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && activate(b) }));

/* ---------- el mètode, a l'empremta: llegir, equilibrar, cuidar, regenerar ---------- */
const STEP = {
  study() { // una llum que llegeix la pell de dalt a baix
    gsap.fromTo(P.eng.st, { scanY: 1.4, scan: 0 }, { scanY: -1.4, duration: 2.6, ease: 'sine.inOut', onUpdate: P.redraw });
    gsap.fromTo(P.eng.st, { scan: 0 }, { scan: 1, duration: .5, yoyo: true, repeat: 1, repeatDelay: 1.6, onUpdate: P.redraw });
  },
  balance() { // desordre que torna a l'equilibri
    P.eng.st.chaos = .9; P.budget = Math.max(P.budget, 30);
    gsap.to(P.eng.st, { chaos: 0, duration: 2.8, delay: .55, ease: 'power2.inOut' });
    P.budget = Math.max(P.budget, Math.round(4.2 * 60 * IPF)); P.settled = false;
  },
  home() { // crestes més plenes, com una pell hidratada
    gsap.to(P.eng.st, { thick: .26, duration: 1.1, yoyo: true, repeat: 1, ease: 'sine.inOut', onUpdate: P.redraw });
  },
  regen() { // es desordena en uns quants punts i es regenera sola, a poc a poc
    P.slow = true; setTimeout(() => { P.slow = false; }, 3600);
    for (let i = 0; i < 7; i++) setTimeout(() => {
      const a = i * 2.4 + Math.random(), r = .2 + Math.random() * .45;
      P.eng.st.brush = [Math.cos(a) * r * .9, Math.sin(a) * r * 1.1, .17]; P.budget = Math.max(P.budget, 90); P.settled = false;
    }, i * 300);
  }
};
if (P && !RM) $$('.step').forEach((s) => ScrollTrigger.create({
  trigger: s, start: 'top 62%', end: 'bottom 38%',
  onToggle: (st) => { if (st.isActive && !narrow() && activeKey === 'method') STEP[s.dataset.step](); }
}));

/* ---------- fotos que apareixen a través de les crestes ---------- */
// les fotos només s'amaguen (per revelar-les) si aquest codi ha arribat fins aquí
document.documentElement.classList.add('js');
const RV = GL && !RM ? Print.Reveal('assets/img/ridges.webp?v=5') : null;
const vids = $$('figure video');
function syncVideo(v) {
  const fig = v.closest('figure');
  if (v._vis && !v._paused && fig.classList.contains('is-in')) v.play().catch(() => {}); else v.pause();
}
const revealIO = new IntersectionObserver((es) => es.forEach((en) => {
  if (!en.isIntersecting) return;
  revealIO.unobserve(en.target);
  const fig = en.target, el = $('img, video', fig);
  const done = () => { const v = $('video', fig); v && syncVideo(v); };
  if (!RV) { fig.classList.add('is-fade', 'is-in'); return done(); }
  const im = new Image();
  im.src = el.tagName === 'VIDEO' ? el.poster : (el.currentSrc || el.src);
  im.decode().then(() => RV.run(fig, el, im)).then(done, () => { fig.classList.add('is-fade', 'is-in'); done(); });
}), { threshold: .3 });
$$('[data-reveal]').forEach((f) => revealIO.observe(f));

/* ---------- vídeos: només quan es veuen, amb botó de pausa ---------- */
const videoIO = new IntersectionObserver((es) => es.forEach((e) => { e.target._vis = e.isIntersecting; syncVideo(e.target); }), { threshold: .35 });
function ppLabel(v) {
  const b = $('.media__pp', v.closest('figure'));
  b.classList.toggle('is-paused', !!v._paused);
  b.setAttribute('aria-label', t(v._paused ? 'vid.play' : 'vid.pause'));
}
vids.forEach((v) => {
  v._paused = RM; ppLabel(v); videoIO.observe(v);
  $('.media__pp', v.closest('figure')).addEventListener('click', () => { v._paused = !v._paused; ppLabel(v); if (v._paused) v.pause(); else { v._vis = true; syncVideo(v); } });
});

/* ---------- la teva empremta ---------- */
const G = { cv: $('#genCanvas'), input: $('#genName'), out: $('#genOut'), read: $('#genRead'), cta: $('#genCta'), save: $('#genSave'), name: '', n: 0, spec: null };
G.live = GL ? Live(G.cv, { simW: narrow() ? 256 : 320, style: { ink: EUCA, thick: .34, scale: .9, edge: .14 } }) : null;
if (G.live) {
  lives.push(G.live); G.live.on = false;
  let grown = false;
  new IntersectionObserver((es) => es.forEach((e) => {
    G.live.on = e.isIntersecting;
    if (e.isIntersecting && !grown) { grown = true; G.spec = specFor('gen'); G.live.grow(G.spec, 2); }
  }), { rootMargin: '120px' }).observe(G.cv);
  G.live.onSettle = () => { G.n = G.live.eng.ridgeCount(); genTexts(); };
}
function genTexts() {
  const name = G.name;
  const s = G.live ? G.live.eng.spec : null;
  G.read.textContent = s ? (G.n > 2 ? t('g.read', { type: t('type.' + s.cls), n: G.n }) : t('g.read0', { type: t('type.' + s.cls) })) : ' ';
  if (name) {
    G.out.textContent = t('g.out', { name });
    G.cta.href = 'https://wa.me/34635857503?text=' + encodeURIComponent(t('g.msg', { name }));
    G.cta.firstElementChild.textContent = t('g.cta', { name });
    G.save.hidden = !G.live;
  } else {
    G.out.textContent = t('g.out0');
    G.cta.href = 'https://appcentreunic.viday.es';
    G.cta.firstElementChild.textContent = t('g.cta0');
    G.save.hidden = true;
  }
}
let genTimer;
G.input.addEventListener('input', () => {
  clearTimeout(genTimer);
  genTimer = setTimeout(() => {
    const name = G.input.value.trim().replace(/\s+/g, ' ');
    if (name === G.name) return;
    G.name = name;
    G.spec = name ? Print.spec(Print.hash(name.toLowerCase())) : specFor('gen');
    genSpec = name ? G.spec : null;
    if (G.live) { G.n = 0; G.live.on = true; G.live.grow(G.spec, 1.8); }
    if (P && !narrow() && activeKey === 'gen') { $('#printType').textContent = ' '; P.grow(G.spec, 1.8); }
    genTexts();
  }, 260);
});
// la imatge per desar: l'empremta, el nom i el logotipe
const MARK = ['M487.8 290A218 218 0 1 1 481 245', 'M316 290V325A26 26 0 0 0 368 325M368 290V355', 'M394 290V355M394 320A26 26 0 0 1 446 320V355', 'M567.7 300A31 31 0 1 0 567.7 346'];
G.save.addEventListener('click', async () => {
  if (!G.live || !G.name) return;
  await document.fonts.load('70px Castoro');
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), e = G.live.eng, ow = G.cv.width, oh = G.cv.height;
  g.fillStyle = '#efe6d8'; g.fillRect(0, 0, W, H);
  e.resize(800, 1000); e.draw(); g.drawImage(G.cv, 140, 40, 800, 1000); e.resize(ow, oh); G.live.dirty = true;
  g.fillStyle = '#2e4a3f'; g.textAlign = 'center';
  g.font = '400 64px Castoro, Georgia, serif'; g.fillText(t('g.card', { name: G.name }), W / 2, 1120);
  g.font = 'italic 400 30px Castoro, Georgia, serif'; g.fillText(G.read.textContent, W / 2, 1170);
  g.font = '500 24px "Instrument Sans", system-ui, sans-serif';
  const label = 'Centre Únic · Blanes', lw = g.measureText(label).width, x0 = (W - (85 + 18 + lw)) / 2;
  g.save(); g.translate(x0, 1228); g.scale(.155, .155); g.translate(-44, -74);
  g.strokeStyle = '#2e4a3f'; g.lineWidth = 16; g.lineCap = 'round'; MARK.forEach((d) => g.stroke(new Path2D(d)));
  g.beginPath(); g.arc(486.3, 271.5, 11, 0, 6.3); g.fill(); g.restore();
  g.textAlign = 'left'; g.fillText(label, x0 + 85 + 18, 1272);
  c.toBlob((b) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = 'empremta-' + G.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
});

/* ---------- el peu: el logotipe amb una empremta a dins ---------- */
const F = GL ? Live($('#footPrint'), { simW: 256, style: { ink: SAND, alpha: .26, thick: .4, scale: 1.25, press: 2.2, edge: .3 } }) : null;
if (F) {
  lives.push(F); F.on = false;
  let grown = false;
  new IntersectionObserver((es) => es.forEach((e) => {
    F.on = e.isIntersecting;
    if (e.isIntersecting && !grown) { grown = true; F.grow(Print.spec(17 * 7919, 'whorl'), 2.6); gsap.killTweensOf(F.eng.st); F.eng.st.press = 2.2; }
  }), { rootMargin: '80px' }).observe($('#footPrint'));
}

/* ---------- tractaments: obrir i tancar amb suavitat ---------- */
$$('.acc details').forEach((d) => {
  const body = $('.acc__body', d);
  $('summary', d).addEventListener('click', (e) => {
    if (RM) return;
    e.preventDefault();
    gsap.killTweensOf(body);
    if (d.open && !d.classList.contains('is-closing')) {
      d.classList.add('is-closing');
      gsap.to(body, { height: 0, duration: .42, ease: 'power2.inOut', onComplete: () => { d.open = false; d.classList.remove('is-closing'); gsap.set(body, { clearProps: 'height' }); ScrollTrigger.refresh(); } });
    } else {
      d.classList.remove('is-closing'); d.open = true;
      gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: .55, ease: 'power3.out', clearProps: 'height', onComplete: () => ScrollTrigger.refresh() });
    }
  });
});
function asks() {
  $$('.acc details').forEach((d) => { $('[data-ask]', d).href = 'https://wa.me/34635857503?text=' + encodeURIComponent(t('tr.msg', { t: t(d.dataset.t) })); });
}

/* ---------- obert ara ---------- */
const HOURS = { 2: [[540, 780], [900, 1200]], 3: [[540, 780], [900, 1200]], 4: [[540, 780], [900, 1200]], 5: [[540, 780], [900, 1200]], 6: [[540, 780]] };
const hm = (m) => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
function status() {
  const el = $('#status');
  let wd, mins;
  try {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.find((x) => x.type === 'weekday').value);
    mins = +p.find((x) => x.type === 'hour').value * 60 + +p.find((x) => x.type === 'minute').value;
  } catch (_) { return; }
  if (wd < 0) return;
  const now = (HOURS[wd] || []).find(([a, b]) => mins >= a && mins < b);
  let text;
  if (now) text = t('vi.open', { t: hm(now[1]) });
  else {
    const later = (HOURS[wd] || []).find(([a]) => a > mins);
    if (later) text = t('vi.closedNow', { d: t('vi.today'), t: hm(later[0]) });
    else for (let i = 1; i <= 7; i++) {
      const d = (wd + i) % 7;
      if (HOURS[d]) { text = t('vi.closedNow', { d: i === 1 ? t('vi.tomorrow') : t('day' + d), t: hm(HOURS[d][0][0]) }); break; }
    }
  }
  el.classList.toggle('is-open', !!now);
  $('span', el).textContent = text;
  el.hidden = false;
  $$('.hours [data-days]').forEach((r) => r.classList.toggle('is-today', r.dataset.days.split(' ').includes(String(wd))));
}
status(); setInterval(status, 60000);

/* ---------- navegació ---------- */
const nav = $('#nav');
const onScroll = () => nav.classList.toggle('is-scrolled', narrow() ? scrollY > printEl.offsetHeight - 64 : scrollY > 40);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
ScrollTrigger.create({ trigger: '.foot', start: 'top 60px', onEnter: () => nav.classList.add('is-dark'), onLeaveBack: () => nav.classList.remove('is-dark') });
$$('.nav__links a').forEach((a) => {
  const sec = $(a.getAttribute('href'));
  sec && ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => a.setAttribute('aria-current', s.isActive ? 'true' : 'false') });
});
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'), el = id === '#top' ? document.body : $(id);
  if (!el) return;
  e.preventDefault();
  scrollTo({ top: id === '#top' ? 0 : el.getBoundingClientRect().top + scrollY, behavior: RM ? 'auto' : 'smooth' });
  if (id !== '#top') { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
});

/* ---------- entrades ---------- */
if (!RM) {
  gsap.from('.hero__word', { yPercent: 108, duration: 1.5, ease: 'expo.out', delay: .3 });
  gsap.from(['.hero__sub', '.hero__lead', '.hero__row'], { y: 26, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .09, delay: .5, clearProps: 'transform,opacity' });
  gsap.from('.print__meta', { opacity: 0, duration: 1.4, delay: 1.6 });
  const parts = $$('.block:not(.hero) > h2, .block:not(.hero) > p, .steps > li, .facts > div, .acc > *, .ticks > li, .quote, .review, .gen__grid, .hours, .actions, .block > .link, .badge, .status');
  gsap.set(parts, { opacity: 0, y: 24 });
  ScrollTrigger.batch(parts, { start: 'top 90%', onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .07, overwrite: true }) });
}

/* ---------- idioma, mida i fonts ---------- */
// «Únic.», «Única.» o «Unique.»: la paraula gran sempre cap a la columna, sigui quin sigui l'idioma
function fitHero() {
  const w = $('.hero__word'), box = $('.hero').clientWidth;
  w.style.fontSize = '100px';
  const r = document.createRange(); r.selectNodeContents(w);
  const tw = r.getBoundingClientRect().width;
  if (tw) w.style.fontSize = Math.min(200, Math.max(56, 100 * box * .97 / tw)) + 'px';
}
function texts() {
  fitHero(); caption(false); genTexts(); asks(); status(); vids.forEach(ppLabel);
  if (P && P.settled) readout();
}
texts();
document.addEventListener('langchange', () => { texts(); requestAnimationFrame(() => ScrollTrigger.refresh()); });
let rsz;
addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => { fitHero(); lives.forEach((l) => l && l.size()); ScrollTrigger.refresh(); }, 150); });
document.fonts && document.fonts.ready.then(() => { fitHero(); ScrollTrigger.refresh(); });
