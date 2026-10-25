/* Avís de cookies: acceptar, rebutjar o configurar. L'elecció es desa 12 mesos.
   Categories: essencials (sempre actives) i mapes/continguts externs (Google Maps).
   Qualsevol element amb [data-cc-open] torna a obrir la configuració.
   Els mapes (.cc-map[data-src]) només es carreguen si s'accepten els continguts externs. */
(function () {
  const KEY = 'centreunic-consent', MAX = 365 * 864e5;
  const TX = {
    ca: {
      label: 'Avís de cookies', title: 'Cookies i privacitat',
      text: "Fem servir només l'essencial perquè la web funcioni, com recordar l'idioma. Si ho acceptes, també carregarem el mapa de Google Maps, que pot fer servir les seves pròpies cookies.",
      accept: 'Acceptar totes', reject: 'Rebutjar', config: 'Configurar', save: 'Desar la selecció', policy: 'Política de cookies',
      cfg: 'Configuració de cookies',
      ess: 'Essencials', essD: "Necessàries perquè la web funcioni: recorden l'idioma i la teva elecció sobre les cookies. No es poden desactivar.", always: 'Sempre actives',
      ext: 'Mapes i continguts externs', extD: 'Mostren el mapa de Google Maps a la secció de visita. Google pot instal·lar les seves pròpies cookies.',
      mapT: 'Per veure el mapa cal acceptar els continguts de Google Maps.', mapB: 'Mostrar el mapa', mapTitle: 'Mapa de Centre Únic a Blanes'
    },
    es: {
      label: 'Aviso de cookies', title: 'Cookies y privacidad',
      text: 'Usamos solo lo esencial para que la web funcione, como recordar el idioma. Si lo aceptas, también cargaremos el mapa de Google Maps, que puede usar sus propias cookies.',
      accept: 'Aceptar todas', reject: 'Rechazar', config: 'Configurar', save: 'Guardar selección', policy: 'Política de cookies',
      cfg: 'Configuración de cookies',
      ess: 'Esenciales', essD: 'Necesarias para que la web funcione: recuerdan el idioma y tu elección sobre las cookies. No se pueden desactivar.', always: 'Siempre activas',
      ext: 'Mapas y contenidos externos', extD: 'Muestran el mapa de Google Maps en la sección de visita. Google puede instalar sus propias cookies.',
      mapT: 'Para ver el mapa hay que aceptar los contenidos de Google Maps.', mapB: 'Mostrar el mapa', mapTitle: 'Mapa de Centre Únic en Blanes'
    },
    en: {
      label: 'Cookie notice', title: 'Cookies and privacy',
      text: 'We only use what is essential for the website to work, such as remembering your language. If you accept, we will also load the Google Maps map, which may use its own cookies.',
      accept: 'Accept all', reject: 'Reject', config: 'Settings', save: 'Save selection', policy: 'Cookie policy',
      cfg: 'Cookie settings',
      ess: 'Essential', essD: 'Needed for the website to work: they remember your language and your cookie choice. They cannot be turned off.', always: 'Always on',
      ext: 'Maps and external content', extD: 'Show the Google Maps map in the visit section. Google may set its own cookies.',
      mapT: 'To see the map, please accept Google Maps content.', mapB: 'Show the map', mapTitle: 'Map of Centre Únic in Blanes'
    }
  };
  const lang = () => (window.I18N && TX[window.I18N.lang]) ? window.I18N.lang : 'ca';
  const T = k => TX[lang()][k];
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && Date.now() - v.t < MAX) return v; } catch (_) {} return null; };
  let state = read();

  /* ---- avís ---- */
  const box = document.createElement('section');
  box.className = 'cc'; box.hidden = true; box.setAttribute('role', 'region');
  box.innerHTML = `
    <div class="cc__view" data-v="main">
      <p class="cc__t" data-k="title"></p>
      <p class="cc__p" data-k="text"></p>
      <div class="cc__btns">
        <button type="button" class="cc__b cc__b--pri" data-a="accept" data-k="accept"></button>
        <button type="button" class="cc__b cc__b--pri" data-a="reject" data-k="reject"></button>
        <button type="button" class="cc__b" data-a="config" data-k="config"></button>
      </div>
      <a class="cc__pol" href="cookies.html" data-k="policy"></a>
    </div>
    <div class="cc__view" data-v="cfg" hidden>
      <p class="cc__t" data-k="cfg"></p>
      <div class="cc__cat"><div><b data-k="ess"></b><p data-k="essD"></p></div><span class="cc__always" data-k="always"></span></div>
      <div class="cc__cat"><div><b data-k="ext"></b><p data-k="extD"></p></div><label class="cc__sw"><input type="checkbox" id="ccExt"><i aria-hidden="true"></i><span class="cc__sr" data-k="ext"></span></label></div>
      <div class="cc__btns">
        <button type="button" class="cc__b cc__b--pri" data-a="save" data-k="save"></button>
        <button type="button" class="cc__b cc__b--pri" data-a="accept" data-k="accept"></button>
      </div>
      <a class="cc__pol" href="cookies.html" data-k="policy"></a>
    </div>`;
  document.body.appendChild(box);
  const views = [...box.querySelectorAll('.cc__view')], chk = box.querySelector('#ccExt');
  function texts() {
    box.setAttribute('aria-label', T('label'));
    box.querySelectorAll('[data-k]').forEach(el => { el.textContent = T(el.dataset.k); });
    document.querySelectorAll('.cc-map').forEach(renderMap);
  }
  function show(view) {
    views.forEach(v => { v.hidden = v.dataset.v !== view; });
    if (view === 'cfg') chk.checked = !!(state && state.ext);
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('is-on'));
  }
  function hide() { box.classList.remove('is-on'); box.hidden = true; }
  function save(ext) {
    state = { v: 1, ext: !!ext, t: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
    hide();
    document.querySelectorAll('.cc-map').forEach(renderMap);
    document.dispatchEvent(new CustomEvent('consentchange', { detail: state }));
  }
  box.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    ({ accept: () => save(true), reject: () => save(false), config: () => show('cfg'), save: () => save(chk.checked) })[a.dataset.a]();
  });
  document.addEventListener('click', e => { const o = e.target.closest('[data-cc-open]'); if (o) { e.preventDefault(); show('cfg'); } });

  /* ---- mapes amb consentiment ---- */
  function renderMap(m) {
    const ok = state && state.ext;
    const frame = m.querySelector('iframe');
    if (ok && !frame) {
      m.innerHTML = '';
      const f = document.createElement('iframe');
      f.src = m.dataset.src; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.title = T('mapTitle');
      m.appendChild(f); m.classList.add('is-on');
    } else if (ok && frame) {
      frame.title = T('mapTitle');
    } else if (!ok) {
      m.classList.remove('is-on');
      m.innerHTML = `<div class="cc-map__ph"><p>${T('mapT')}</p><button type="button" class="cc__b cc__b--pri" data-map-ok>${T('mapB')}</button></div>`;
    }
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-map-ok]')) save(true); });

  document.addEventListener('langchange', texts);
  texts();
  if (!state) show('main');
})();
