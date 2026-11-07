(() => {
  'use strict';
  const root = document.querySelector('[data-anim]');
  if (!root) return;
  const section = root.closest('.anim');
  const $ = (q, r = root) => r.querySelector(q);
  const $$ = (q, r = root) => [...r.querySelectorAll(q)];
  const stage = $('[data-anim-stage]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* Guion: cada <li> es una escena y cada <p> una frase narrada. */
  const guion = $$('[data-guion] > li', section).map(li => ({
    titulo: li.querySelector('h3').textContent.trim(),
    hora: li.dataset.hora || '',
    frases: [...li.querySelectorAll('p')].map(p => p.textContent.replace(/\s+/g, ' ').trim())
  }));

  /* Estado visual de cada escena. Cada frase (beat) suma o quita capas, mueve tropas o la cámara.
     cam: [x, y, zoom] en coordenadas del mapa de 1600 × 900. */
  const R = 'region', F = 'field';
  const CAMPO = ['f-base', 'd-estrada', 'd-cisne', 'd-aviles', 'd-sacasa'];
  const ATAQUE = ['a-cole', 'a-oneal', 'a-watkins'];
  const FLECHAS = ['f-arr-cole', 'f-arr-oneal', 'f-arr-watkins'];
  const FRENTE = { cole: [1010, 720], oneal: [790, 560], watkins: [1210, 680] };
  const ESCENAS = [
    { view: R, cam: [800, 450, 1], on: ['r-base', 'o-title'], beats: [{}, { off: ['o-title'], on: ['r-sj'], cam: [840, 470, 1.15] }, { on: ['o-title'], cam: [800, 450, 1] }] },
    { view: R, cam: [770, 600, 1.3], on: ['r-base', 'r-sj', 'r-walker'], beats: [{}, { on: ['r-ganado'], cam: [840, 520, 1.3] }, { on: ['r-pacto'], cam: [560, 450, 1.05] }] },
    { view: R, cam: [900, 330, 1.4], on: ['r-base', 'r-sj', 'r-walker'], beats: [{ on: ['r-estrada'] }, { cam: [860, 410, 1.7] }, { on: ['r-mcdonald'], cam: [820, 540, 1.4] }, { on: ['r-mcdonald-out'] }] },
    { view: R, cam: [900, 320, 1.4], on: ['r-base', 'r-sj', 'r-walker', 'r-estrada'], pos: { token: [770, 712] }, beats: [{ on: ['r-flecheros'] }, { on: ['r-cole', 'r-token'], follow: { token: ['ap-p-cole', 4.5] }, cam: [760, 560, 1.3] }, { on: ['r-camp'], cam: [780, 470, 1.5] }] },
    { view: F, cam: [800, 450, 1], on: ['f-base', 'd-estrada'], beats: [{}, { on: ['d-cisne'], cam: [580, 430, 1.3] }, { on: ['d-aviles'], cam: [800, 400, 1.3] }, { on: ['d-sacasa'], cam: [1030, 540, 1.3] }, { on: ['d-orden'], cam: [800, 450, 1] }] },
    { view: F, cam: [640, 600, 1.2], on: [...CAMPO, 'o-night', 'o-fog'], pos: { cole: [-140, 980], oneal: [-220, 1010], watkins: [-60, 1020] },
      beats: [{}, { on: ['f-salmeron', ...ATAQUE], pos: { cole: [300, 800], oneal: [190, 840], watkins: [410, 850] } }, { off: ['o-night'], pos: { cole: [470, 760], oneal: [350, 800], watkins: [580, 800] }, cam: [700, 560, 1.15] }] },
    { view: F, cam: [860, 600, 1.1], on: [...CAMPO, ...ATAQUE], pos: { cole: [470, 760], oneal: [350, 800], watkins: [580, 800] },
      beats: [{ pos: { cole: [920, 830], oneal: [700, 800], watkins: [1310, 830] } }, { on: ['f-arr-cole'], pos: { cole: FRENTE.cole } }, { on: ['f-arr-oneal'], pos: { oneal: FRENTE.oneal } }, { on: ['f-arr-watkins'], pos: { watkins: FRENTE.watkins } }, { on: ['fx-fire', 'fx-smoke'] }] },
    { view: F, cam: [1150, 560, 1.7], on: [...CAMPO, ...ATAQUE, ...FLECHAS, 'fx-fire', 'fx-smoke', 'o-castro'], pos: FRENTE, beats: [{}, { on: ['o-castro-tiro'] }, {}] },
    { view: F, cam: [900, 560, 1.15], on: [...CAMPO, ...ATAQUE, 'fx-fire', 'fx-smoke'], pos: FRENTE,
      beats: [{ on: ['f-breach'], pos: { cole: [1020, 620], watkins: [1170, 640] } }, { on: ['d-refuerzo'] }, { off: ['fx-fire'], pos: { cole: [960, 730], oneal: [790, 690], watkins: [1130, 730] } }] },
    { view: F, cam: [800, 450, 1], on: [...CAMPO, ...ATAQUE, 'f-breach', 'd-refuerzo', 'fx-smoke'], pos: { cole: [960, 730], oneal: [790, 690], watkins: [1130, 730], flank: [820, 316], horses: [1400, 150] },
      beats: [{ on: ['f-flank'] }, { on: ['a-flank'], follow: { flank: ['ap-p-flank', 5] } }, { on: ['f-viva', 'fx-fire'] }, { on: ['f-horses', 'a-horses'], follow: { horses: ['ap-p-horses', 3.4] } }] },
    { view: F, cam: [800, 450, 1], on: [...CAMPO, ...ATAQUE, 'a-flank', 'a-horses', 'f-breach'], pos: { cole: [960, 730], oneal: [790, 690], watkins: [1130, 730], flank: [1030, 826], horses: [1214, 742] },
      beats: [{ on: ['f-huida'], pos: { cole: [400, 790], oneal: [250, 812], watkins: [560, 800], horses: [820, 790] } }, { on: ['f-persec'], pos: { flank: [560, 800] } }, { on: ['f-cole-fin'], off: ATAQUE }, { on: ['f-botin'] }] },
    { view: F, cam: [800, 450, 1], on: [...CAMPO, 'o-dim', 'o-debate'], beats: [{}, { on: ['deb-1'] }, { on: ['deb-2'] }, { on: ['deb-3'] }, { on: ['deb-4'] }] }
  ];
  if (guion.length !== ESCENAS.length) return;

  /* Referencias del SVG */
  const grupos = new Map();
  $$('[data-a]', stage).forEach(el => {
    const name = el.dataset.a;
    if (!grupos.has(name)) grupos.set(name, []);
    grupos.get(name).push(el);
  });
  const actores = Object.fromEntries($$('[data-actor]', stage).map(el => [el.dataset.actor, el]));
  const camaras = { region: $('[data-cam="region"]', stage), field: $('[data-cam="field"]', stage) };
  const ui = {
    cover: $('[data-anim-cover]'), start: $('[data-anim-start]'), fin: $('[data-anim-fin]'),
    play: $('[data-anim-play]'), prev: $('[data-anim-prev]'), next: $('[data-anim-next]'),
    voz: $('[data-anim-voice]'), full: $('[data-anim-full]'), timeline: $('[data-anim-timeline]'),
    texto: $('[data-anim-texto]'), hora: $('[data-anim-hora]'), nombre: $('[data-anim-nombre]'),
    chapter: $('[data-anim-chapter]'), status: $('[data-anim-status]')
  };

  section.classList.add('is-ready');
  const guionDetalle = $('[data-anim-guion]', section);
  if (guionDetalle) guionDetalle.open = false;
  stage.classList.toggle('rm', reduce.matches);
  reduce.addEventListener?.('change', () => stage.classList.toggle('rm', reduce.matches));

  /* Duración de los trazos y puntas de flecha calculadas a partir de cada trazo. */
  $$('.draw', stage).forEach(el => el.style.setProperty('--dur', `${el.dataset.dur || 2}s`));
  $$('[data-head]', stage).forEach(path => {
    const name = path.closest('[data-a]')?.dataset.a;
    const mascara = name ? $(`mask [data-a="${name}"]`, stage) : null;
    const dur = Number(path.dataset.dur || mascara?.dataset.dur || 2);
    const largo = path.getTotalLength();
    const fin = path.getPointAtLength(largo);
    const antes = path.getPointAtLength(Math.max(0, largo - 8));
    const angulo = Math.atan2(fin.y - antes.y, fin.x - antes.x) * 180 / Math.PI;
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    head.setAttribute('d', 'M6 0-16-11-11 0-16 11Z');
    head.setAttribute('fill', 'currentColor');
    head.setAttribute('transform', `translate(${fin.x.toFixed(1)} ${fin.y.toFixed(1)}) rotate(${angulo.toFixed(1)})`);
    head.classList.add('head');
    head.style.setProperty('--d', `${Math.max(0, dur - .2)}s`);
    path.after(head);
  });

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const finDe = id => { const p = document.getElementById(id); const pt = p.getPointAtLength(p.getTotalLength()); return [pt.x, pt.y]; };
  const mover = (el, [x, y]) => { el.style.transform = `translate(${x}px, ${y}px)`; };
  const flush = () => stage.getBoundingClientRect();

  const camara = (el, [cx, cy, k], visible) => {
    if (k >= 1) { cx = clamp(cx, 800 / k, 1600 - 800 / k); cy = clamp(cy, 450 / k, 900 - 450 / k); }
    el.style.transform = `translate(${800 - k * cx}px, ${450 - k * cy}px) scale(${k})`;
    el.classList.toggle('off', !visible);
  };

  const tweens = new Map();
  const seguir = (name, pathId, dur, animar) => {
    const el = actores[name]; const path = document.getElementById(pathId);
    if (!el || !path) return;
    cancelAnimationFrame(tweens.get(name));
    const largo = path.getTotalLength();
    el.classList.add('no-tr');
    if (!animar || reduce.matches) {
      const p = path.getPointAtLength(largo); mover(el, [p.x, p.y]); flush(); el.classList.remove('no-tr'); return;
    }
    const t0 = performance.now();
    const paso = t => {
      const k = Math.min(1, (t - t0) / (dur * 1000));
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const p = path.getPointAtLength(largo * e); mover(el, [p.x, p.y]);
      if (k < 1) tweens.set(name, requestAnimationFrame(paso));
      else { tweens.delete(name); el.classList.remove('no-tr'); }
    };
    tweens.set(name, requestAnimationFrame(paso));
  };

  const estado = (i, j) => {
    const e = ESCENAS[i];
    const on = new Set(e.on); const pos = { ...(e.pos || {}) }; let cam = e.cam; let follow = null;
    for (let b = 0; b <= j; b++) {
      const beat = e.beats?.[b]; if (!beat) continue;
      beat.on?.forEach(n => on.add(n)); beat.off?.forEach(n => on.delete(n));
      Object.assign(pos, beat.pos || {}); if (beat.cam) cam = beat.cam;
      if (beat.follow) {
        if (b < j) Object.entries(beat.follow).forEach(([a, [id]]) => { pos[a] = finDe(id); });
        else follow = beat.follow;
      }
    }
    return { view: e.view, cam, on, pos, follow };
  };

  const aplicar = (st, animar) => {
    if (!animar) stage.classList.add('instant');
    grupos.forEach((els, name) => {
      const on = st.on.has(name);
      els.forEach(el => {
        el.classList.toggle('on', on);
        if (el.classList.contains('draw')) el.classList.toggle('drawn', on);
        el.querySelectorAll('.draw').forEach(d => d.classList.toggle('drawn', on));
      });
    });
    if (st.view === R) { camara(camaras.region, st.cam, true); camara(camaras.field, [800, 450, .22], false); }
    else { camara(camaras.region, [858, 404, 6], false); camara(camaras.field, st.cam, true); }
    Object.entries(st.pos).forEach(([name, p]) => {
      if (!actores[name] || st.follow?.[name]) return;
      cancelAnimationFrame(tweens.get(name)); tweens.delete(name); actores[name].classList.remove('no-tr');
      mover(actores[name], p);
    });
    if (st.follow) Object.entries(st.follow).forEach(([name, [id, dur]]) => seguir(name, id, dur, animar));
    if (!animar) { flush(); stage.classList.remove('instant'); }
  };

  /* Línea de tiempo con un segmento por escena */
  const segmentos = guion.map((esc, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'anim-seg';
    b.setAttribute('aria-label', `Escena ${i + 1}: ${esc.titulo}`); b.title = `${i + 1}. ${esc.titulo}`;
    b.addEventListener('click', () => saltar(i));
    li.append(b); ui.timeline.append(li); return b;
  });

  /* Voz del navegador */
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let voz = null;
  let vozActiva = true;
  try { vozActiva = localStorage.getItem('sanjacintovive.voz') !== 'no'; } catch { /* sin almacenamiento */ }
  const elegirVoz = () => {
    if (!synth) return;
    const voces = synth.getVoices().filter(v => /^es(-|_|$)/i.test(v.lang));
    const puntos = v => (/natural|online|neural/i.test(v.name) ? 8 : 0) + (/google/i.test(v.name) ? 4 : 0) + (/es[-_](MX|US|419|NI|CR|CO)/i.test(v.lang) ? 3 : 0) + (/es[-_]ES/i.test(v.lang) ? 1 : 0) + (v.localService ? 0 : 1);
    voz = voces.sort((a, b) => puntos(b) - puntos(a))[0] || null;
    ui.voz.hidden = !voz;
    ui.voz.setAttribute('aria-pressed', String(vozActiva && !!voz));
  };
  if (synth) { elegirVoz(); synth.addEventListener?.('voiceschanged', elegirVoz); }
  const conVoz = () => !!(synth && voz && vozActiva);

  const esperar = ms => new Promise(res => setTimeout(res, ms));
  const palabras = t => t.split(/\s+/).length;
  const narrar = texto => {
    if (!conVoz()) return esperar(Math.max(2800, palabras(texto) * 400));
    return new Promise(res => {
      let listo = false;
      const fin = () => { if (!listo) { listo = true; clearTimeout(guardia); res(); } };
      const u = new SpeechSynthesisUtterance(texto);
      u.voice = voz; u.lang = voz.lang; u.rate = .98; u.pitch = .95;
      u.onend = fin; u.onerror = fin;
      const guardia = setTimeout(fin, palabras(texto) * 700 + 4000);
      if (synth.speaking || synth.pending) { synth.cancel(); setTimeout(() => synth.speak(u), 80); }
      else synth.speak(u);
    });
  };

  /* Reproducción */
  let escena = 0, frase = 0, playing = false, gen = 0, iniciado = false, iniciadoVisual = false;

  const actualizarUI = () => {
    const esc = guion[escena];
    ui.texto.textContent = esc.frases[frase];
    ui.texto.classList.remove('in'); void ui.texto.offsetWidth; ui.texto.classList.add('in');
    segmentos.forEach((b, i) => {
      b.style.setProperty('--p', i < escena ? 1 : i === escena ? (frase + 1) / guion[i].frases.length : 0);
      b.toggleAttribute('aria-current', i === escena);
    });
    ui.prev.disabled = escena === 0; ui.next.disabled = escena === guion.length - 1;
  };
  const anunciarEscena = () => {
    const esc = guion[escena];
    ui.hora.textContent = esc.hora; ui.nombre.textContent = esc.titulo;
    ui.chapter.classList.remove('in'); void ui.chapter.offsetWidth; ui.chapter.classList.add('in');
    ui.status.textContent = `Escena ${escena + 1} de ${guion.length}: ${esc.titulo}.`;
  };
  const mostrar = (i, j, animar) => {
    const cambio = i !== escena || !iniciadoVisual;
    escena = i; frase = j; iniciadoVisual = true;
    aplicar(estado(i, j), animar); actualizarUI();
    if (cambio) anunciarEscena();
    root.classList.toggle('sin-capitulo', i === guion.length - 1);
  };

  const setPlaying = value => {
    playing = value;
    root.classList.toggle('is-playing', value); stage.classList.toggle('is-paused', !value);
    ui.play.setAttribute('aria-label', value ? 'Pausar' : 'Reproducir');
    if (!value) { gen++; synth?.cancel(); }
  };

  const minimo = (i, j) => {
    const f = ESCENAS[i].beats?.[j]?.follow;
    return f ? Math.max(...Object.values(f).map(([, d]) => d * 1000)) + 300 : 1800;
  };

  const correr = async () => {
    const g = ++gen;
    while (playing && g === gen) {
      const t0 = performance.now();
      await narrar(guion[escena].frases[frase]);
      if (g !== gen || !playing) return;
      const resto = minimo(escena, frase) - (performance.now() - t0);
      if (resto > 0) await esperar(resto);
      if (g !== gen || !playing) return;
      await esperar(conVoz() ? 450 : 250);
      if (g !== gen || !playing) return;
      if (frase + 1 < guion[escena].frases.length) mostrar(escena, frase + 1, true);
      else if (escena + 1 < guion.length) { await esperar(500); if (g !== gen || !playing) return; mostrar(escena + 1, 0, true); }
      else { terminar(); return; }
    }
  };

  const terminar = () => {
    setPlaying(false);
    ui.cover.hidden = false; root.classList.add('is-ended');
    ui.start.querySelector('strong').textContent = 'Ver de nuevo';
    ui.fin.hidden = false;
  };

  const ocultarPortada = () => { ui.cover.hidden = true; root.classList.remove('is-ended'); iniciado = true; };

  const saltar = i => {
    i = clamp(i, 0, guion.length - 1);
    ocultarPortada();
    if (i > 0) { const p = i - 1; aplicar(estado(p, guion[p].frases.length - 1), false); }
    else aplicar(estado(0, 0), false);
    flush(); mostrar(i, 0, true);
    if (playing) correr(); else synth?.cancel();
  };

  const reproducir = () => {
    if (!iniciado || root.classList.contains('is-ended')) { ocultarPortada(); setPlaying(true); saltar(0); return; }
    setPlaying(true); correr();
  };
  const alternar = () => (playing ? setPlaying(false) : reproducir());

  ui.start.addEventListener('click', reproducir);
  ui.play.addEventListener('click', alternar);
  ui.prev.addEventListener('click', () => saltar(escena - 1));
  ui.next.addEventListener('click', () => saltar(escena + 1));
  ui.voz.addEventListener('click', () => {
    vozActiva = !vozActiva;
    ui.voz.setAttribute('aria-pressed', String(vozActiva));
    try { localStorage.setItem('sanjacintovive.voz', vozActiva ? 'si' : 'no'); } catch { /* sin almacenamiento */ }
    if (playing) { synth?.cancel(); correr(); }
  });

  if (document.fullscreenEnabled && root.requestFullscreen) {
    ui.full.hidden = false;
    ui.full.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen()).catch(() => {}));
    document.addEventListener('fullscreenchange', () => {
      const activo = document.fullscreenElement === root;
      root.classList.toggle('is-full', activo);
      ui.full.setAttribute('aria-label', activo ? 'Salir de pantalla completa' : 'Pantalla completa');
    });
  }

  root.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const enBoton = event.target.closest('button');
    if ((event.key === ' ' || event.key === 'k') && !enBoton) { event.preventDefault(); alternar(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); saltar(escena + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); saltar(escena - 1); }
    else if (event.key === 'f' && !ui.full.hidden) { event.preventDefault(); ui.full.click(); }
  });
  stage.addEventListener('click', event => { if (iniciado && !event.target.closest('button, a')) { alternar(); root.focus({ preventScroll: true }); } });

  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) setPlaying(false); });
  addEventListener('pagehide', () => synth?.cancel());

  setPlaying(false);
  mostrar(0, 0, false);
})();
