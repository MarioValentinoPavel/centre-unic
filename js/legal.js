/* Pàgines legals: títols per idioma i mostrar només el text de l'idioma triat */
(function () {
  const page = document.body.dataset.page;
  const T = {
    avis: ['Avís legal', 'Aviso legal', 'Legal notice'],
    priv: ['Política de privacitat', 'Política de privacidad', 'Privacy policy'],
    cook: ['Política de cookies', 'Política de cookies', 'Cookie policy']
  };
  const D = (i, desc, back, links) => ({
    'meta.title': T[page][i] + ' · Centre Únic', 'meta.desc': desc, 'lg.back': back,
    'l.avis': links[0], 'l.priv': links[1], 'l.cook': links[2]
  });
  window.DICT = {
    ca: D(0, 'Informació legal de Centre Únic, centre fisiològic de la pell a Blanes.', '← Tornar a la web', ['Avís legal', 'Privacitat', 'Cookies']),
    es: D(1, 'Información legal de Centre Únic, centro fisiológico de la piel en Blanes.', '← Volver a la web', ['Aviso legal', 'Privacidad', 'Cookies']),
    en: D(2, 'Legal information for Centre Únic, skin physiology centre in Blanes.', '← Back to the website', ['Legal notice', 'Privacy', 'Cookies'])
  };
  document.addEventListener('langchange', e => {
    document.querySelectorAll('[data-l]').forEach(a => { a.hidden = a.dataset.l !== e.detail; });
  });
})();
