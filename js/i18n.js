/* Idiomes CA · ES · EN
   Ordre: ?lang= → l'última tria → idioma del navegador (els cercadors veuen el català).
   Textos: data-i18n="clau" (innerHTML) i data-i18n-attr="atribut:clau;atribut:clau". */
(function () {
  const D = window.DICT, LANGS = ['ca', 'es', 'en'], KEY = 'centreunic-lang';
  const bot = /bot|crawl|spider|slurp|lighthouse|preview/i.test(navigator.userAgent);
  function detect() {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
    try { const s = localStorage.getItem(KEY); if (LANGS.includes(s)) return s; } catch (_) {}
    if (bot) return 'ca';
    for (const l of navigator.languages || [navigator.language || '']) {
      const c = String(l).slice(0, 2).toLowerCase();
      if (c === 'ca') return 'ca';
      if (c === 'es' || c === 'gl' || c === 'eu') return 'es';
      if (c === 'en') return 'en';
    }
    return navigator.language ? 'en' : 'ca';
  }
  const I = window.I18N = { lang: 'ca' };
  const t = I.t = window.t = (k, v) => {
    let s = D[I.lang][k]; if (s == null) s = D.ca[k]; if (s == null) return k;
    if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]);
    return s;
  };
  I.apply = function (lang, save) {
    I.lang = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const s = D[lang][el.dataset.i18n]; if (s != null) el.innerHTML = s; });
    document.querySelectorAll('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(';').forEach(p => {
      const [a, k] = p.split(':'); const s = D[lang][k]; if (s != null) el.setAttribute(a, s);
    }));
    document.title = t('meta.title');
    const meta = (sel, v) => { const m = document.querySelector(sel); m && m.setAttribute('content', v); };
    meta('meta[name="description"]', t('meta.desc'));
    meta('meta[property="og:title"]', t('meta.title'));
    meta('meta[property="og:description"]', t('meta.desc'));
    meta('meta[property="og:locale"]', { ca: 'ca_ES', es: 'es_ES', en: 'en_GB' }[lang]);
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
    if (save) {
      try { localStorage.setItem(KEY, lang); } catch (_) {}
      const u = new URL(location.href);
      lang === 'ca' ? u.searchParams.delete('lang') : u.searchParams.set('lang', lang);
      history.replaceState(history.state, '', u);
    }
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  };
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { if (b.dataset.lang !== I.lang) I.apply(b.dataset.lang, true); }));
  I.apply(detect(), false);
})();
