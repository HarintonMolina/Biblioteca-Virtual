(() => {
  'use strict';
  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];
  const normalizar = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const rootUrl = new URL(document.documentElement.dataset.base || '/', location.href);
  const url = path => new URL(path.replace(/^\//, ''), rootUrl).href;
  window.Museo = { url, normalizar };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menu = $('.menu-toggle');
  const nav = $('#navegacion');
  const closeMenu = () => { menu?.setAttribute('aria-expanded', 'false'); nav?.classList.remove('is-open'); };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav?.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); } });
  $$('a', nav || document.createElement('nav')).forEach(a => a.addEventListener('click', closeMenu));
  const currentPath = location.pathname.replace(rootUrl.pathname, '').replace(/\/$/, '');
  $$('[data-nav]').forEach(link => {
    if (currentPath.startsWith(link.dataset.nav)) link.setAttribute('aria-current', 'page');
  });
  const progress = $('.reading-progress span');
  let scheduled = false;
  const updateProgress = () => {
    scheduled = false;
    const total = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${total > 0 ? Math.min(1, scrollY / total) : 0})`;
  };
  addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -25px 0px', threshold: 0.04 });
    $$('.reveal').forEach(element => { element.classList.add('reveal-pending'); observer.observe(element); });
  }
  $$('[data-filter-list]').forEach(container => {
    let active = 'all';
    const query = $('[data-filter-query]', container);
    const items = $$('[data-item]', container);
    const filter = () => {
      let count = 0;
      const term = normalizar(query?.value);
      items.forEach(item => {
        const visible = (active === 'all' || item.dataset.category === active) && (!term || normalizar(item.dataset.text || item.textContent).includes(term));
        item.hidden = !visible;
        if (visible) { count++; item.classList.add('is-visible'); }
      });
      const countEl = $('[data-count]', container);
      if (countEl) { countEl.textContent = `${count} ${count === 1 ? 'resultado' : 'resultados'}`; countEl.setAttribute('role', 'status'); }
      const empty = $('[data-empty]', container);
      if (empty) empty.hidden = count !== 0;
    };
    $$('[data-filter]', container).forEach(button => button.addEventListener('click', () => {
      active = button.dataset.filter;
      $$('[data-filter]', container).forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      filter();
    }));
    query?.addEventListener('input', filter);
  });
  const map = $('.tactical-map');
  if (map) {
    const labels = ['La defensa', 'Los ataques', 'La retaguardia', 'El desenlace'];
    const descriptions = ['La defensa de la casa y los corrales.', 'El ataque filibustero presiona las posiciones.', 'Una maniobra de flanqueo llega por la retaguardia.', 'La caballada contribuye al desconcierto y a la retirada.'];
    let phase = -1;
    const setPhase = index => {
      if (index === phase) return;
      phase = index; map.dataset.phase = String(index);
      $('[data-phase-label]').textContent = `0${index + 1} · ${labels[index]}`;
      $('[data-map-status]').textContent = `Etapa ${index + 1}. ${descriptions[index]}`;
      $$('[data-phase-target]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.phaseTarget) === index)));
    };
    setPhase(0);
    $$('[data-phase-target]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.phaseTarget);
      setPhase(index);
      $(`[data-battle-step="${index}"]`).scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
    }));
    if ('IntersectionObserver' in window) {
      const visible = new Map();
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => visible.set(entry.target, entry.intersectionRatio));
        const best = [...visible.entries()].filter(([, ratio]) => ratio > 0).sort((a, b) => b[1] - a[1])[0];
        if (best) setPhase(Number(best[0].dataset.battleStep));
      }, { threshold: [0, .15, .3, .5, .7], rootMargin: matchMedia('(max-width: 640px)').matches ? '-360px 0px -5% 0px' : '-100px 0px -10% 0px' });
      $$('[data-battle-step]').forEach(element => observer.observe(element));
    }
  }
  $$('[data-copy-citation]').forEach(button => button.addEventListener('click', async () => {
    const citation = $('[data-citation]');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(citation.textContent.trim());
      $('[data-copy-status]').textContent = 'Referencia copiada.';
    } catch {
      const range = document.createRange(); range.selectNodeContents(citation);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      $('[data-copy-status]').textContent = 'Referencia seleccionada. Podés copiarla con las opciones de tu dispositivo.';
    }
  }));
  const listen = $('[data-listen]');
  if (listen && 'speechSynthesis' in window) {
    listen.hidden = false;
    const state = $('[data-listen-status]');
    listen.addEventListener('click', () => {
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); listen.textContent = 'Escuchar este relato ♫'; state.textContent = 'Lectura detenida.'; return; }
      const text = $$('p', $('[data-narration]')).filter(p => !p.matches('[data-listen-status]')).map(p => p.textContent).join('\n');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-NI'; utterance.rate = .93;
      utterance.voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('es')) || null;
      utterance.onend = () => { listen.textContent = 'Escuchar este relato ♫'; state.textContent = 'Lectura finalizada.'; };
      utterance.onerror = () => { listen.textContent = 'Escuchar este relato ♫'; state.textContent = 'La voz no está disponible en este navegador.'; };
      speechSynthesis.speak(utterance); listen.textContent = 'Detener lectura ■'; state.textContent = 'Escuchando el relato.';
    });
    addEventListener('pagehide', () => speechSynthesis.cancel());
  }
  $$('[data-confirm]').forEach(form => form.addEventListener('submit', event => {
    if (!confirm(form.dataset.confirm)) event.preventDefault();
  }));
  $('[data-clear-progress]')?.addEventListener('click', () => {
    try { localStorage.removeItem('sanjacintovive.mejor'); $('[data-clear-status]').textContent = 'Tu puntuación fue borrada de este dispositivo.'; }
    catch { $('[data-clear-status]').textContent = 'El navegador no permite acceder al almacenamiento local.'; }
  });
  const search = $('[data-search]');
  if (search) {
    const form = $('form', search);
    const input = $('input[name=q]', search);
    const status = $('[data-search-status]', search);
    const results = $('[data-search-results]', search);
    let catalogPromise;
    let sequence = 0;
    const run = async (term, push = false) => {
      const requestId = ++sequence;
      input.value = term;
      if (push) { const next = new URL(location.href); next.search = ''; if (term) next.searchParams.set('q', term); history.pushState({}, '', next); }
      results.replaceChildren();
      if (!term) { status.textContent = 'Explorá los acontecimientos, protagonistas y fuentes del archivo.'; return; }
      status.textContent = 'Buscando en el archivo…';
      try {
        catalogPromise ||= fetch(url(search.dataset.catalogUrl), { credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error('Catalog unavailable'); return r.json(); }).catch(error => { catalogPromise = null; throw error; });
        const catalog = await catalogPromise;
        if (requestId !== sequence) return;
        const matching = catalog.filter(item => normalizar(`${item.texto} ${item.titulo} ${item.resumen}`).includes(normalizar(term)));
        status.textContent = matching.length ? `${matching.length} resultados para «${term}».` : `No encontramos «${term}». Probá otro nombre o palabra.`;
        matching.forEach(item => {
          const link = document.createElement('a'); link.className = 'search-result'; link.href = url(item.enlace);
          const type = document.createElement('span'); type.className = 'eyebrow'; type.textContent = item.tipo;
          const title = document.createElement('h2'); title.textContent = item.titulo + ' ↗';
          const description = document.createElement('p'); description.textContent = item.resumen;
          link.append(type, title, description); results.append(link);
        });
      } catch { if (requestId === sequence) status.textContent = 'No pudimos consultar el archivo. Intentá nuevamente o explorá las salas del museo.'; }
    };
    form.addEventListener('submit', event => { event.preventDefault(); run(input.value.trim().slice(0, 120), true); });
    const initial = new URL(location.href).searchParams.get('q');
    if (initial) run(initial.slice(0, 120));
    addEventListener('popstate', () => run(new URL(location.href).searchParams.get('q') || ''));
  }
})();
